"""
Test Stripe Webhook Locally (sans ngrok)
==========================================
Usage :
  1. Mode simulation (dev, sans Stripe) :
     python test_stripe_webhook_local.py --user-id 1 --plan pro

  2. Mode Stripe CLI (prod/staging) :
     stripe listen --forward-to localhost:8000/api/v1/billing/webhook
     stripe trigger checkout.session.completed

Run from backend/ directory.
"""
import sys
import argparse
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"


def get_superadmin_token():
    r = requests.post(f"{BASE_URL}/auth/login", json={"username": "superadmin", "password": "SuperAdmin2026!"})
    if r.status_code != 200:
        print(f"Login failed: {r.text}")
        sys.exit(1)
    return r.json()["access_token"]


def simulate_checkout(user_id: int, plan: str, token: str):
    r = requests.post(
        f"{BASE_URL}/billing/webhook/test",
        params={"event_type": "checkout.session.completed", "user_id": user_id, "plan": plan},
        headers={"Authorization": f"Bearer {token}"},
    )
    print(f"checkout.session.completed → {r.status_code}")
    print(json.dumps(r.json(), indent=2))


def simulate_cancel(user_id: int, token: str):
    r = requests.post(
        f"{BASE_URL}/billing/webhook/test",
        params={"event_type": "customer.subscription.deleted", "user_id": user_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    print(f"customer.subscription.deleted → {r.status_code}")
    print(json.dumps(r.json(), indent=2))


def check_subscription(user_id: int, token: str):
    from app.core.database import SessionLocal
    from app.models.domain import User
    db = SessionLocal()
    u = db.query(User).filter(User.id == user_id).first()
    db.close()
    if u:
        print(f"\nUser #{user_id} ({u.username}) plan = '{u.plan}'")
    else:
        print(f"User #{user_id} not found")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Stripe webhook locally")
    parser.add_argument("--user-id", type=int, default=1)
    parser.add_argument("--plan",    type=str, default="pro", choices=["free", "pro", "enterprise"])
    parser.add_argument("--cancel",  action="store_true", help="Simulate subscription cancellation")
    args = parser.parse_args()

    print("Logging in as superadmin...")
    token = get_superadmin_token()

    import sys; sys.path.insert(0, ".")
    check_subscription(args.user_id, token)

    if args.cancel:
        print(f"\nSimulating subscription cancellation for user #{args.user_id}...")
        simulate_cancel(args.user_id, token)
    else:
        print(f"\nSimulating checkout.session.completed → plan={args.plan} for user #{args.user_id}...")
        simulate_checkout(args.user_id, args.plan, token)

    check_subscription(args.user_id, token)
    print("\nDone. Run with --cancel to test subscription cancellation.")
