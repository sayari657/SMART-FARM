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
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
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

class CheckoutRequest(BaseModel):
    plan: str                           # pro | enterprise
    success_url: str = "http://localhost:5173/settings?payment=success"
    cancel_url: str  = "http://localhost:5173/settings?payment=cancel"

class PortalRequest(BaseModel):
    return_url: str = "http://localhost:5173/settings"


# ── Endpoints ─────────────────────────────────────────────────────────────────

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


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook receiver.
    Events handled:
      - checkout.session.completed → upgrade plan
      - customer.subscription.deleted → downgrade to free
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(503, "STRIPE_WEBHOOK_SECRET non configuré")

    stripe = _stripe()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = int(session.get("metadata", {}).get("user_id", 0))
        plan    = session.get("metadata", {}).get("plan", "pro")
        customer_id = session.get("customer")

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.plan = plan
            # Store stripe customer id if column exists
            try:
                db.execute(
                    __import__("sqlalchemy").text(
                        "UPDATE users SET stripe_customer_id=:c WHERE id=:id"
                    ),
                    {"c": customer_id, "id": user_id},
                )
            except Exception:
                pass
            db.commit()
            logger.info("Plan upgraded: user=%s plan=%s", user_id, plan)

    elif event["type"] == "customer.subscription.deleted":
        customer_id = event["data"]["object"]["customer"]
        try:
            db.execute(
                __import__("sqlalchemy").text(
                    "UPDATE users SET plan='free' WHERE stripe_customer_id=:c"
                ),
                {"c": customer_id},
            )
            db.commit()
        except Exception:
            pass
        logger.info("Subscription cancelled for customer=%s → downgraded to free", customer_id)

    return {"received": True}
