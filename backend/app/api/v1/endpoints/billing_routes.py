"""
Stripe Billing API
==================
Endpoints :
  GET  /billing/plans          → liste des plans avec prix Stripe
  POST /billing/checkout       → crée une Stripe Checkout Session
  POST /billing/portal         → ouvre le portail client Stripe (gérer abonnement)
  POST /billing/webhook        → reçoit les webhooks Stripe (paiement confirmé, annulé)
  GET  /billing/subscription   → statut abonnement actuel
"""
import logging
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, require_roles, require_superadmin
from app.models.domain import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["Billing"])


# ── Stripe import (optional) ──────────────────────────────────────────────────

def _stripe():
    try:
        import stripe as _s
        _s.api_key = settings.STRIPE_SECRET_KEY
        return _s
    except ImportError:
        raise HTTPException(500, "stripe not installed. Run: pip install stripe")


# ── Plan catalog ──────────────────────────────────────────────────────────────

PLANS = [
    {
        "key": "free",
        "name": "Initiation",
        "price_eur": 0,
        "stripe_price_id": None,
        "features": ["50 animaux", "1 utilisateur", "Historique 14 jours"],
        "limits": {"max_animals": 50, "max_workers": 1},
    },
    {
        "key": "pro",
        "name": "Professionnel",
        "price_eur": 29,
        "stripe_price_id": settings.STRIPE_PRICE_PRO or None,
        "features": ["Illimité", "5 équipes", "IA prédictive", "Export PDF/Excel", "Support prioritaire"],
        "limits": {"max_animals": -1, "max_workers": 5},
        "popular": True,
    },
    {
        "key": "enterprise",
        "name": "Entreprise",
        "price_eur": None,
        "stripe_price_id": settings.STRIPE_PRICE_ENTERPRISE or None,
        "features": ["Acteurs illimités", "CV Custom", "API Webhooks", "Account Manager"],
        "limits": {"max_animals": -1, "max_workers": -1},
    },
]


# ── Schemas ───────────────────────────────────────────────────────────────────

def _allowed_redirect_origins() -> set[str]:
    """Trusted origins for Stripe redirect URLs — same allowlist as CORS."""
    return {o.strip().rstrip("/") for o in settings.CORS_ORIGINS.split(",") if o.strip()}


class CheckoutRequest(BaseModel):
    plan: Literal["pro", "enterprise"]
    success_url: str = "http://localhost:5173/settings?payment=success"
    cancel_url: str  = "http://localhost:5173/settings?payment=cancel"

    @field_validator("success_url", "cancel_url")
    @classmethod
    def _must_be_trusted_url(cls, v: str) -> str:
        from urllib.parse import urlparse
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("URL must be an absolute http(s) URL")
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if origin not in _allowed_redirect_origins():
            raise ValueError("URL host is not in the allowed redirect origins (CORS_ORIGINS)")
        return v

class PortalRequest(BaseModel):
    return_url: str = "http://localhost:5173/settings"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/config")
def stripe_config():
    """Public — returns Stripe publishable key and plan catalog for the frontend."""
    return {
        "publishable_key": settings.STRIPE_PUBLISHABLE_KEY or None,
        "stripe_enabled":  bool(settings.STRIPE_SECRET_KEY),
        "plans": PLANS,
    }


@router.get("/admin/overview")
def admin_billing_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("superadmin")),
):
    """
    SuperAdmin only — live Stripe + DB billing overview.
    Returns: Stripe config status, product info, real subscriber list.
    """
    from sqlalchemy import func as sqlfunc

    # ── DB counts ──────────────────────────────────────────────────────────
    plan_rows = (
        db.query(User.plan, sqlfunc.count(User.id))
        .filter(User.role == "owner")
        .group_by(User.plan)
        .all()
    )
    plan_dist = {p or "free": c for p, c in plan_rows}
    mrr = plan_dist.get("pro", 0) * 29

    # ── Stripe live data (optional — graceful fallback) ────────────────────
    stripe_product = None
    stripe_price   = None
    stripe_ok      = bool(settings.STRIPE_SECRET_KEY)

    if stripe_ok:
        try:
            s = _stripe()
            if settings.STRIPE_PRICE_PRO:
                price   = s.Price.retrieve(settings.STRIPE_PRICE_PRO)
                product = s.Product.retrieve(price.product)
                stripe_price   = {
                    "id":       price.id,
                    "amount":   price.unit_amount / 100,
                    "currency": price.currency.upper(),
                    "interval": price.recurring.interval if price.recurring else None,
                    "active":   price.active,
                }
                stripe_product = {
                    "id":     product.id,
                    "name":   product.name,
                    "active": product.active,
                    "url":    f"https://dashboard.stripe.com/test/products/{product.id}",
                }
        except Exception as e:
            logger.warning("Stripe fetch in admin overview failed: %s", e)

    # ── Pro subscribers with stripe_customer_id ────────────────────────────
    pro_users = (
        db.query(User.id, User.email, User.full_name, User.plan,
                 User.plan_expires_at, User.stripe_customer_id)
        .filter(User.role == "owner", User.plan.in_(["pro", "enterprise"]))
        .order_by(User.id.desc())
        .limit(50)
        .all()
    )

    return {
        "stripe_enabled":     stripe_ok,
        "stripe_configured":  bool(settings.STRIPE_PRICE_PRO),
        "webhook_configured": bool(settings.STRIPE_WEBHOOK_SECRET),
        "plan_dist":          plan_dist,
        "mrr_eur":            mrr,
        "arr_eur":            mrr * 12,
        "stripe_product":     stripe_product,
        "stripe_price":       stripe_price,
        "dashboard_url":      "https://dashboard.stripe.com/test",
        "subscribers": [
            {
                "id":                  u.id,
                "email":               u.email,
                "full_name":           u.full_name,
                "plan":                u.plan,
                "plan_expires_at":     u.plan_expires_at.isoformat() if u.plan_expires_at else None,
                "stripe_customer_id":  u.stripe_customer_id,
                "stripe_url": (
                    f"https://dashboard.stripe.com/test/customers/{u.stripe_customer_id}"
                    if u.stripe_customer_id else None
                ),
            }
            for u in pro_users
        ],
    }


@router.get("/plans")
def list_plans():
    """Public — returns plan catalog."""
    return PLANS


@router.get("/subscription")
def get_subscription(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("owner", "superadmin")),
):
    """Current user's subscription status."""
    return {
        "plan": user.plan or "free",
        "plan_expires_at": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
        "stripe_customer_id": getattr(user, "stripe_customer_id", None),
    }


@router.post("/checkout")
def create_checkout(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("owner")),
):
    """Create a Stripe Checkout Session for plan upgrade."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(503, "Stripe non configuré — contactez support@smartfarm.ai")

    plan_obj = next((p for p in PLANS if p["key"] == body.plan), None)
    if not plan_obj:
        raise HTTPException(400, "Plan invalide")
    if not plan_obj.get("stripe_price_id"):
        raise HTTPException(400, f"STRIPE_PRICE_{body.plan.upper()} non configuré")

    stripe = _stripe()
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": plan_obj["stripe_price_id"], "quantity": 1}],
            customer_email=user.email,
            metadata={"user_id": str(user.id), "plan": body.plan},
            success_url=body.success_url + "&session_id={CHECKOUT_SESSION_ID}",
            cancel_url=body.cancel_url,
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        logger.error("Stripe checkout error: %s", e)
        raise HTTPException(500, str(e))


@router.post("/portal")
def customer_portal(
    body: PortalRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("owner")),
):
    """Create Stripe Customer Portal session (manage/cancel subscription)."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(503, "Stripe non configuré")

    customer_id = getattr(user, "stripe_customer_id", None)
    if not customer_id:
        raise HTTPException(400, "Aucun abonnement Stripe actif trouvé")

    stripe = _stripe()
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=body.return_url,
        )
        return {"portal_url": session.url}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/webhook/test")
async def stripe_webhook_test(
    event_type: str = "checkout.session.completed",
    user_id: int = 1,
    plan: str = "pro",
    db: Session = Depends(get_db),
    _: "User" = Depends(require_superadmin),
):
    """
    DEV ONLY — Simulate a Stripe webhook event without ngrok.
    Only available when STRIPE_SECRET_KEY is NOT set (dev mode).
    Production: use `stripe listen --forward-to localhost:8000/api/v1/billing/webhook`
    """
    if settings.STRIPE_SECRET_KEY:
        raise HTTPException(400, "Use real Stripe CLI in production. Unset STRIPE_SECRET_KEY to use this endpoint.")

    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")

    if event_type == "checkout.session.completed":
        u.plan = plan
        db.commit()
        return {"simulated": True, "event": event_type, "user_id": user_id, "plan": plan}
    elif event_type == "customer.subscription.deleted":
        u.plan = "free"
        db.commit()
        return {"simulated": True, "event": event_type, "user_id": user_id, "plan": "free"}
    else:
        raise HTTPException(400, f"Unsupported test event: {event_type}")


def _subscription_period_end(stripe, subscription_id: Optional[str]):
    """Fetch the subscription's current_period_end as an aware-naive UTC datetime."""
    from datetime import datetime, timedelta
    if subscription_id:
        try:
            sub = stripe.Subscription.retrieve(subscription_id)
            if sub.get("current_period_end"):
                return datetime.utcfromtimestamp(sub["current_period_end"])
        except Exception as e:
            logger.warning("Could not fetch subscription %s: %s", subscription_id, e)
    # Fallback: monthly billing + 4 days of grace (renewal webhook will extend it)
    return datetime.utcnow() + timedelta(days=35)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook receiver.
    Events handled:
      - checkout.session.completed     → upgrade plan + set expiry
      - invoice.paid                   → renewal: extend plan expiry
      - invoice.payment_failed         → log (Stripe retries; subscription.deleted downgrades)
      - customer.subscription.deleted  → downgrade to free
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(503, "STRIPE_WEBHOOK_SECRET non configuré")

    stripe = _stripe()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        meta = session.get("metadata") or {}
        try:
            user_id = int(meta.get("user_id", 0))
        except (TypeError, ValueError):
            user_id = 0
        plan = meta.get("plan", "pro")
        if plan not in ("pro", "enterprise"):
            logger.warning("Webhook checkout with unknown plan '%s' — ignored", plan)
            return {"received": True}
        customer_id = session.get("customer")

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.plan = plan
            user.stripe_customer_id = customer_id
            user.plan_expires_at = _subscription_period_end(stripe, session.get("subscription"))
            db.commit()
            logger.info("Plan upgraded: user=%s plan=%s customer=%s expires=%s",
                        user_id, plan, customer_id, user.plan_expires_at)
        else:
            logger.warning("Webhook checkout for unknown user_id=%s — no action", user_id)

    elif event["type"] == "invoice.paid":
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user and user.plan in ("pro", "enterprise"):
            user.plan_expires_at = _subscription_period_end(stripe, invoice.get("subscription"))
            db.commit()
            logger.info("Renewal: user=%s plan extended to %s", user.id, user.plan_expires_at)

    elif event["type"] == "invoice.payment_failed":
        customer_id = event["data"]["object"].get("customer")
        logger.warning("Payment failed for customer=%s — Stripe will retry; "
                       "subscription.deleted will downgrade if all retries fail", customer_id)

    elif event["type"] == "customer.subscription.deleted":
        customer_id = event["data"]["object"]["customer"]
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.plan = "free"
            user.plan_expires_at = None
            db.commit()
        logger.info("Subscription cancelled for customer=%s → downgraded to free", customer_id)

    return {"received": True}
