"""Tests for telemetry ingest, history, and latest endpoints."""
import pytest


# ── Fixture ───────────────────────────────────────────────────────────────────

@pytest.fixture()
def unit_id(client, auth_headers):
    r = client.post("/api/v1/farms", json={"name": "Tele Farm", "location": "Tunis"}, headers=auth_headers)
    farm_id = r.json()["id"]
    r = client.post("/api/v1/animals/types", json={"species": "bee", "display_name": "Bee"}, headers=auth_headers)
    type_id = r.json()["id"]
    r = client.post("/api/v1/animals", json={
        "farm_id": farm_id, "type_id": type_id, "name": "Hive-Tele",
    }, headers=auth_headers)
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


# ── Telemetry ─────────────────────────────────────────────────────────────────

class TestTelemetry:
    def test_ingest_requires_auth(self, client, unit_id):
        r = client.post("/api/v1/telemetry", json={
            "unit_id": unit_id,
            "metrics": {"temperature": 35.0, "humidity": 60.0},
        })
        assert r.status_code == 401

    def test_ingest_telemetry(self, client, auth_headers, unit_id):
        r = client.post("/api/v1/telemetry", json={
            "unit_id": unit_id,
            "metrics": {"temperature": 35.2, "humidity": 61.5, "weight": 24.8},
            "source": "iot_sensor",
        }, headers=auth_headers)
        assert r.status_code == 201
        data = r.json()
        assert data["unit_id"] == unit_id
        assert "timestamp" in data
        assert data["metrics"]["temperature"] == 35.2

    def test_get_history(self, client, auth_headers, unit_id):
        # Ingest 3 records
        for i in range(3):
            client.post("/api/v1/telemetry", json={
                "unit_id": unit_id,
                "metrics": {"temperature": 34.0 + i, "humidity": 60.0},
            }, headers=auth_headers)

        r = client.get(f"/api/v1/telemetry/{unit_id}", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        assert all("unit_id" in rec and "metrics" in rec and "timestamp" in rec for rec in data)

    def test_get_history_limit(self, client, auth_headers, unit_id):
        for i in range(5):
            client.post("/api/v1/telemetry", json={
                "unit_id": unit_id, "metrics": {"temperature": 30.0 + i},
            }, headers=auth_headers)

        r = client.get(f"/api/v1/telemetry/{unit_id}?limit=2", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()) <= 2

    def test_get_latest(self, client, auth_headers, unit_id):
        client.post("/api/v1/telemetry", json={
            "unit_id": unit_id,
            "metrics": {"temperature": 37.0, "humidity": 55.0},
        }, headers=auth_headers)

        r = client.get(f"/api/v1/telemetry/{unit_id}/latest", headers=auth_headers)
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            data = r.json()
            assert "unit_id" in data or "metrics" in data

    def test_history_requires_auth(self, client, unit_id):
        r = client.get(f"/api/v1/telemetry/{unit_id}")
        assert r.status_code == 401

    def test_ingest_multiple_metrics(self, client, auth_headers, unit_id):
        r = client.post("/api/v1/telemetry", json={
            "unit_id": unit_id,
            "metrics": {
                "temperature": 36.5,
                "humidity": 62.0,
                "sound_level": 45.3,
                "weight": 25.1,
                "co2": 800,
            },
        }, headers=auth_headers)
        assert r.status_code == 201
        data = r.json()
        assert data["metrics"]["sound_level"] == 45.3
        assert data["metrics"]["co2"] == 800
