"""Alert dispatch to farm owner + assigned workers."""
import uuid

from app.models.domain import User, WorkerAssignment
from app.core.security import hash_password


def _owner(client, username):
    client.post("/api/v1/auth/register", json={
        "username": username, "password": "Test1234!",
        "email": f"{username}@farm.ai", "role": "owner",
    })
    r = client.post("/api/v1/auth/login", json={"username": username, "password": "Test1234!"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _farm(client, headers, name):
    r = client.post("/api/v1/farms", json={
        "name": name, "location": "Tunis", "area_hectares": 1.0, "farm_type": "mixed",
    }, headers=headers)
    return r.json()["id"]


class TestAlertNotify:
    def test_notify_reaches_owner_and_workers(self, client, db):
        headers = _owner(client, f"own_{uuid.uuid4().hex[:8]}")
        farm_id = _farm(client, headers, f"Farm {uuid.uuid4().hex[:4]}")

        # attach a worker to the farm
        worker = User(username=f"w_{uuid.uuid4().hex[:8]}", role="worker",
                      phone_number=f"+216{uuid.uuid4().int % 90000000 + 10000000}",
                      password_hash=hash_password("x"), is_active=True)
        db.add(worker); db.flush()
        db.add(WorkerAssignment(worker_id=worker.id, farm_id=farm_id, pin_code="0000", is_active=True))
        db.commit()

        r = client.post("/api/v1/alerts/notify", json={
            "farm_id": farm_id, "title": "Temp couvain critique",
            "message": "Ruche HIVE-002 à 39°C", "target": "all",
        }, headers=headers)
        assert r.status_code == 200, r.text
        body = r.json()
        # owner + worker resolved as recipients
        assert body["recipients"] == 2
        roles = {x["role"] for x in body["results"]}
        assert {"owner", "worker"} <= roles

    def test_notify_workers_only(self, client, db):
        headers = _owner(client, f"own_{uuid.uuid4().hex[:8]}")
        farm_id = _farm(client, headers, f"Farm {uuid.uuid4().hex[:4]}")
        r = client.post("/api/v1/alerts/notify", json={
            "farm_id": farm_id, "title": "x", "message": "y", "target": "workers",
        }, headers=headers)
        assert r.status_code == 200
        assert r.json()["recipients"] == 0  # no workers attached yet

    def test_notify_requires_ownership(self, client, db):
        owner1 = _owner(client, f"o1_{uuid.uuid4().hex[:8]}")
        owner2 = _owner(client, f"o2_{uuid.uuid4().hex[:8]}")
        farm_id = _farm(client, owner1, f"Farm {uuid.uuid4().hex[:4]}")
        r = client.post("/api/v1/alerts/notify", json={
            "farm_id": farm_id, "title": "x", "message": "y",
        }, headers=owner2)
        assert r.status_code == 403

    def test_notify_validation(self, client, db):
        headers = _owner(client, f"own_{uuid.uuid4().hex[:8]}")
        farm_id = _farm(client, headers, f"Farm {uuid.uuid4().hex[:4]}")
        # empty title rejected
        r = client.post("/api/v1/alerts/notify", json={
            "farm_id": farm_id, "title": "", "message": "y",
        }, headers=headers)
        assert r.status_code == 422
