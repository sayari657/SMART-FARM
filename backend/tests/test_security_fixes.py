"""
Tests for the expert-audit fixes:
  - role escalation blocked at registration
  - Stripe billing input validation
  - IoT devices: metadata persistence + tenant isolation (IDOR)
  - IoT telemetry endpoint input validation
  - /health timestamp
"""
import uuid

from app.models.domain import AnimalType, AnimalUnit, Farm, Sensor, User


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_owner(client, username):
    r = client.post("/api/v1/auth/register", json={
        "username": username,
        "password": "Test1234!",
        "email": f"{username}@farm.ai",
        "full_name": username,
        "role": "owner",
    })
    assert r.status_code in (200, 201, 400, 409), r.text
    r = client.post("/api/v1/auth/login", json={"username": username, "password": "Test1234!"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _make_farm_with_unit(db, client, headers, farm_name):
    """Create farm via API, then attach an animal unit directly in DB."""
    r = client.post("/api/v1/farms", json={
        "name": farm_name, "location": "Tunis",
        "area_hectares": 2.0, "farm_type": "mixed",
    }, headers=headers)
    assert r.status_code in (200, 201), r.text
    farm_id = r.json()["id"]

    atype = db.query(AnimalType).first()
    if not atype:
        atype = AnimalType(species=f"bee_{uuid.uuid4().hex[:6]}", display_name="Bee")
        db.add(atype)
        db.flush()

    unit = AnimalUnit(farm_id=farm_id, type_id=atype.id, name=f"unit_{uuid.uuid4().hex[:6]}")
    db.add(unit)
    db.commit()
    return farm_id, unit.id


# ── Role escalation ───────────────────────────────────────────────────────────

class TestRegistrationRoles:
    def test_superadmin_self_registration_blocked(self, client):
        r = client.post("/api/v1/auth/register", json={
            "username": "evil_admin",
            "password": "Test1234!",
            "email": "evil@farm.ai",
            "role": "superadmin",
        })
        assert r.status_code == 422

    def test_owner_registration_allowed(self, client):
        r = client.post("/api/v1/auth/register", json={
            "username": f"owner_{uuid.uuid4().hex[:8]}",
            "password": "Test1234!",
            "email": f"o{uuid.uuid4().hex[:8]}@farm.ai",
            "role": "owner",
        })
        assert r.status_code in (200, 201)


# ── Billing ───────────────────────────────────────────────────────────────────

class TestBilling:
    def test_plans_public(self, client):
        r = client.get("/api/v1/billing/plans")
        assert r.status_code == 200
        keys = [p["key"] for p in r.json()]
        assert {"free", "pro", "enterprise"} <= set(keys)

    def test_billing_config_public_no_secret_leak(self, client):
        r = client.get("/api/v1/billing/config")
        assert r.status_code == 200
        body = r.json()
        assert "publishable_key" in body
        # the secret key must never be exposed
        assert "sk_" not in str(body.get("publishable_key") or "")

    def test_checkout_requires_auth(self, client):
        r = client.post("/api/v1/billing/checkout", json={"plan": "pro"})
        assert r.status_code == 401

    def test_checkout_invalid_plan_rejected(self, client, db):
        headers = _make_owner(client, f"bill_{uuid.uuid4().hex[:8]}")
        r = client.post("/api/v1/billing/checkout",
                        json={"plan": "DROP TABLE users"}, headers=headers)
        assert r.status_code == 422

    def test_checkout_invalid_url_rejected(self, client, db):
        headers = _make_owner(client, f"bill_{uuid.uuid4().hex[:8]}")
        r = client.post("/api/v1/billing/checkout", json={
            "plan": "pro",
            "success_url": "javascript:alert(1)",
        }, headers=headers)
        assert r.status_code == 422

    def test_checkout_external_domain_rejected(self, client, db):
        headers = _make_owner(client, f"bill_{uuid.uuid4().hex[:8]}")
        r = client.post("/api/v1/billing/checkout", json={
            "plan": "pro",
            "success_url": "https://evil.example.com/steal",
        }, headers=headers)
        assert r.status_code == 422

    def test_checkout_trusted_url_passes_validation(self, client, db):
        # A trusted localhost origin must pass schema validation (then 503 since
        # Stripe is not configured in tests) — never a 422.
        headers = _make_owner(client, f"bill_{uuid.uuid4().hex[:8]}")
        r = client.post("/api/v1/billing/checkout", json={
            "plan": "pro",
            "success_url": "http://localhost:5173/settings?payment=success",
            "cancel_url": "http://localhost:5173/settings?payment=cancel",
        }, headers=headers)
        assert r.status_code != 422

    def test_subscription_requires_owner_role(self, client, auth_headers):
        # auth_headers fixture registers role 'admin' (unprivileged)
        r = client.get("/api/v1/billing/subscription", headers=auth_headers)
        assert r.status_code == 403

    def test_webhook_unsigned_rejected(self, client):
        r = client.post("/api/v1/billing/webhook", content=b"{}")
        # 503 when STRIPE_WEBHOOK_SECRET unset, 400/500 (stripe missing) otherwise — never 200
        assert r.status_code != 200


# ── IoT devices (tenant isolation + metadata persistence) ────────────────────

class TestIoTDevices:
    def test_create_and_list_device_metadata_persisted(self, client, db):
        headers = _make_owner(client, f"iot_{uuid.uuid4().hex[:8]}")
        farm_id, _unit = _make_farm_with_unit(db, client, headers, f"IoT Farm {uuid.uuid4().hex[:4]}")

        sid = f"esp32-{uuid.uuid4().hex[:8]}"
        r = client.post("/api/v1/iot/devices", json={
            "farm_id": farm_id,
            "sensor_type": "mqtt_node",
            "sensor_id": sid,
            "label": "Node A",
            "location": "Salle des pompes",
        }, headers=headers)
        assert r.status_code == 200, r.text

        r = client.get(f"/api/v1/iot/devices?farm_id={farm_id}", headers=headers)
        assert r.status_code == 200, r.text
        dev = next(d for d in r.json() if d["sensor_id"] == sid)
        assert dev["label"] == "Node A"
        assert dev["location"] == "Salle des pompes"
        assert dev["mqtt_topic"]  # auto-generated default

    def test_cross_tenant_update_and_delete_forbidden(self, client, db):
        owner1 = _make_owner(client, f"iotA_{uuid.uuid4().hex[:8]}")
        owner2 = _make_owner(client, f"iotB_{uuid.uuid4().hex[:8]}")
        farm_id, _unit = _make_farm_with_unit(db, client, owner1, f"Farm A {uuid.uuid4().hex[:4]}")

        sid = f"esp32-{uuid.uuid4().hex[:8]}"
        r = client.post("/api/v1/iot/devices", json={
            "farm_id": farm_id, "sensor_type": "weight", "sensor_id": sid,
        }, headers=owner1)
        assert r.status_code == 200, r.text
        device_id = r.json()["id"]

        # owner2 must NOT be able to touch owner1's device
        r = client.put(f"/api/v1/iot/devices/{device_id}",
                       json={"label": "hacked"}, headers=owner2)
        assert r.status_code == 403
        r = client.delete(f"/api/v1/iot/devices/{device_id}", headers=owner2)
        assert r.status_code == 403

        # owner1 can
        r = client.put(f"/api/v1/iot/devices/{device_id}",
                       json={"label": "renamed"}, headers=owner1)
        assert r.status_code == 200
        r = client.delete(f"/api/v1/iot/devices/{device_id}", headers=owner1)
        assert r.status_code == 200


# ── IoT telemetry endpoint validation ─────────────────────────────────────────

class TestIoTTelemetryValidation:
    def test_invalid_node_rejected(self, client):
        r = client.post("/api/v1/iot/telemetry", json={
            "node": "../../etc/passwd\n", "metric": "soil", "value": 42.0,
        })
        assert r.status_code == 422

    def test_out_of_range_value_rejected(self, client):
        r = client.post("/api/v1/iot/telemetry", json={
            "node": "NODE_A", "metric": "soil", "value": 1e12,
        })
        assert r.status_code == 422

    def test_history_limit_bounded(self, client):
        r = client.get("/api/v1/iot/history?limit=5000")
        assert r.status_code == 422


# ── Health ────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_has_timestamp(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "timestamp" in body
