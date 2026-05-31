"""Tests for worker tasks and worker reports endpoints."""
import pytest


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture()
def farm_id(client, auth_headers):
    r = client.post("/api/v1/farms", json={"name": "Worker Farm", "location": "Tunis"}, headers=auth_headers)
    assert r.status_code in (200, 201)
    return r.json()["id"]


@pytest.fixture()
def task(client, auth_headers, owner_headers, farm_id):
    r = client.post("/api/v1/worker-tasks", json={
        "farm_id": farm_id,
        "title": "Nettoyage poulailler",
        "category": "cleaning",
        "priority": "normal",
    }, headers=owner_headers)
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture()
def owner_headers(client):
    """Create an owner user and return auth headers."""
    client.post("/api/v1/auth/register", json={
        "username": "owner_tasks",
        "password": "Owner1234!",
        "email": "owner_tasks@farm.ai",
        "full_name": "Owner Tasks",
        "role": "owner",
    })
    r = client.post("/api/v1/auth/login", json={
        "username": "owner_tasks",
        "password": "Owner1234!",
    })
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ── Worker Tasks ──────────────────────────────────────────────────────────────

class TestWorkerTasks:
    def test_list_tasks_requires_auth(self, client):
        r = client.get("/api/v1/worker-tasks")
        assert r.status_code == 401

    def test_list_tasks(self, client, auth_headers):
        r = client.get("/api/v1/worker-tasks", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_task_owner_only(self, client, auth_headers, farm_id):
        """Non-owner (admin) cannot create tasks."""
        r = client.post("/api/v1/worker-tasks", json={
            "farm_id": farm_id,
            "title": "Feeding",
            "category": "feeding",
        }, headers=auth_headers)
        assert r.status_code == 403

    def test_create_task_as_owner(self, client, owner_headers, farm_id):
        r = client.post("/api/v1/worker-tasks", json={
            "farm_id": farm_id,
            "title": "Alimentation matinale",
            "category": "feeding",
            "priority": "high",
        }, headers=owner_headers)
        assert r.status_code == 201
        data = r.json()
        assert data["title"] == "Alimentation matinale"
        assert data["category"] == "feeding"
        assert data["priority"] == "high"
        assert data["farm_id"] == farm_id
        assert data["status"] in ("pending", "todo", "open")

    def test_list_farm_tasks(self, client, owner_headers, farm_id, task):
        r = client.get(f"/api/v1/worker-tasks/farm/{farm_id}", headers=owner_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert any(t["id"] == task["id"] for t in r.json())

    def test_update_task_status(self, client, owner_headers, task):
        r = client.put(f"/api/v1/worker-tasks/{task['id']}", json={
            "status": "done",
        }, headers=owner_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "done"
        assert data["id"] == task["id"]

    def test_update_nonexistent_task(self, client, owner_headers):
        r = client.put("/api/v1/worker-tasks/999999", json={"status": "done"}, headers=owner_headers)
        assert r.status_code == 404

    def test_delete_task_owner_only(self, client, auth_headers, owner_headers, farm_id):
        r = client.post("/api/v1/worker-tasks", json={
            "farm_id": farm_id, "title": "Del task", "category": "other",
        }, headers=owner_headers)
        task_id = r.json()["id"]

        # admin (non-owner) cannot delete
        r = client.delete(f"/api/v1/worker-tasks/{task_id}", headers=auth_headers)
        assert r.status_code == 403

    def test_delete_task(self, client, owner_headers, farm_id):
        r = client.post("/api/v1/worker-tasks", json={
            "farm_id": farm_id, "title": "To delete", "category": "other",
        }, headers=owner_headers)
        task_id = r.json()["id"]
        r = client.delete(f"/api/v1/worker-tasks/{task_id}", headers=owner_headers)
        assert r.status_code == 204

    def test_delete_nonexistent_task(self, client, owner_headers):
        r = client.delete("/api/v1/worker-tasks/999999", headers=owner_headers)
        assert r.status_code == 404


# ── Worker Reports ────────────────────────────────────────────────────────────

class TestWorkerReports:
    def test_list_reports_requires_auth(self, client):
        r = client.get("/api/v1/worker/reports")
        assert r.status_code == 401

    def test_create_report(self, client, auth_headers):
        r = client.post("/api/v1/worker/reports", json={
            "type": "health",
            "notes": "Poulet boiteux observé en lot B",
        }, headers=auth_headers)
        assert r.status_code == 201
        data = r.json()
        assert data["type"] == "health"
        assert data["notes"] == "Poulet boiteux observé en lot B"
        assert "id" in data
        assert "created_at" in data

    def test_create_report_default_type(self, client, auth_headers):
        r = client.post("/api/v1/worker/reports", json={}, headers=auth_headers)
        assert r.status_code == 201
        assert r.json()["type"] == "other"

    def test_list_reports(self, client, auth_headers):
        client.post("/api/v1/worker/reports", json={"type": "feeding", "notes": "RAS"}, headers=auth_headers)
        r = client.get("/api/v1/worker/reports", headers=auth_headers)
        assert r.status_code == 200
        reports = r.json()
        assert isinstance(reports, list)
        assert len(reports) >= 1
        assert all("id" in rep and "type" in rep and "created_at" in rep for rep in reports)
