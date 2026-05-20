"""
Comprehensive bee management API tests.
Covers: auth, apiary CRUD, hive CRUD, visit creation + health scoring,
        production, stock, stats, hive details, analytics dashboard.
"""
import pytest


# ─── Auth ─────────────────────────────────────────────────────────────────────

class TestAuth:
    def test_login_bad_credentials(self, client):
        resp = client.post("/api/v1/auth/login", json={"username": "nobody", "password": "wrong"})
        assert resp.status_code in (400, 401, 404)

    def test_login_success(self, client, auth_headers):
        assert "Authorization" in auth_headers
        assert auth_headers["Authorization"].startswith("Bearer ")


# ─── Apiary CRUD ──────────────────────────────────────────────────────────────

class TestApiaries:
    def _create(self, client, auth_headers, name="Test Site"):
        return client.post("/api/v1/bee/history/apiaries", json={
            "name": name,
            "latitude": 36.8,
            "longitude": 10.1,
            "flower_type": "Oranger",
            "season": "Printemps",
            "region": "Nabeul",
        }, headers=auth_headers)

    def test_list_empty(self, client, auth_headers):
        resp = client.get("/api/v1/bee/history/apiaries", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_create_apiary(self, client, auth_headers):
        resp = self._create(client, auth_headers)
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Test Site"
        assert body["id"] > 0

    def test_update_apiary(self, client, auth_headers):
        created = self._create(client, auth_headers, "Update Me").json()
        resp = client.put(f"/api/v1/bee/history/apiaries/{created['id']}", json={
            "name": "Updated Site",
            "flower_type": "Thym",
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Site"

    def test_delete_apiary(self, client, auth_headers):
        created = self._create(client, auth_headers, "Delete Me").json()
        resp = client.delete(f"/api/v1/bee/history/apiaries/{created['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"

    def test_update_nonexistent(self, client, auth_headers):
        resp = client.put("/api/v1/bee/history/apiaries/99999", json={"name": "X"}, headers=auth_headers)
        assert resp.status_code == 404


# ─── Hive CRUD ────────────────────────────────────────────────────────────────

class TestHives:
    @pytest.fixture()
    def apiary_id(self, client, auth_headers):
        resp = client.post("/api/v1/bee/history/apiaries", json={"name": "Hive Site"}, headers=auth_headers)
        return resp.json()["id"]

    def _create(self, client, auth_headers, apiary_id, identifier="HIVE-TEST-01"):
        return client.post("/api/v1/bee/history/hives", json={
            "apiary_id": apiary_id,
            "identifier": identifier,
            "is_active": True,
            "health_score": 8.5,
            "honey_level": 6.0,
            "force_level": 7.0,
            "hive_type": "Langstroth",
            "queen_year": 2023,
        }, headers=auth_headers)

    def test_create_hive(self, client, auth_headers, apiary_id):
        resp = self._create(client, auth_headers, apiary_id)
        assert resp.status_code == 201
        body = resp.json()
        assert body["identifier"] == "HIVE-TEST-01"
        assert body["apiary_id"] == apiary_id

    def test_duplicate_identifier_rejected(self, client, auth_headers, apiary_id):
        self._create(client, auth_headers, apiary_id, "HIVE-DUP")
        resp = self._create(client, auth_headers, apiary_id, "HIVE-DUP")
        assert resp.status_code == 409

    def test_list_hives_filtered(self, client, auth_headers, apiary_id):
        self._create(client, auth_headers, apiary_id, "HIVE-FILT-01")
        resp = client.get(f"/api/v1/bee/history/hives?apiary_id={apiary_id}", headers=auth_headers)
        assert resp.status_code == 200
        ids = [h["identifier"] for h in resp.json()]
        assert "HIVE-FILT-01" in ids

    def test_update_hive(self, client, auth_headers, apiary_id):
        hive = self._create(client, auth_headers, apiary_id, "HIVE-UPD").json()
        resp = client.put(f"/api/v1/bee/history/hives/{hive['id']}", json={
            "apiary_id": apiary_id,
            "identifier": "HIVE-UPD",
            "is_active": False,
            "health_score": 4.0,
            "honey_level": 3.0,
            "force_level": 2.0,
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_delete_hive(self, client, auth_headers, apiary_id):
        hive = self._create(client, auth_headers, apiary_id, "HIVE-DEL").json()
        resp = client.delete(f"/api/v1/bee/history/hives/{hive['id']}", headers=auth_headers)
        assert resp.status_code == 200

    def test_hive_details_structure(self, client, auth_headers, apiary_id):
        hive = self._create(client, auth_headers, apiary_id, "HIVE-DET").json()
        resp = client.get(f"/api/v1/bee/history/hives/{hive['id']}", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "visits" in body
        assert "production" in body
        assert "summary" in body
        assert "stock" in body
        assert isinstance(body["visits"], list)
        assert isinstance(body["stock"], dict)

    def test_hive_details_not_found(self, client, auth_headers):
        resp = client.get("/api/v1/bee/history/hives/99999", headers=auth_headers)
        assert resp.status_code == 404


# ─── Visit + Health Score ──────────────────────────────────────────────────────

class TestVisits:
    @pytest.fixture()
    def hive(self, client, auth_headers):
        apiary = client.post("/api/v1/bee/history/apiaries", json={"name": "Visit Apiary"},
                             headers=auth_headers).json()
        return client.post("/api/v1/bee/history/hives", json={
            "apiary_id": apiary["id"],
            "identifier": "HIVE-VIS-01",
            "health_score": 8.0,
        }, headers=auth_headers).json()

    def test_create_visit_healthy(self, client, auth_headers, hive):
        resp = client.post("/api/v1/bee/history/visits", json={
            "hive_id": hive["id"],
            "apiary_id": hive["apiary_id"],
            "visit_date": "2025-05-15",
            "health_state": "health",
            "honey_level": "Abondant",
            "harvest_kg": 4.5,
            "pollen_kg": 0.8,
            "temperature": 34.2,
            "notes": "Colonie forte, reine active",
        }, headers=auth_headers)
        assert resp.status_code == 201
        body = resp.json()
        assert body["health_state"] == "health"
        assert body["harvest_kg"] == 4.5

    def test_health_score_updated_after_visit(self, client, auth_headers, hive):
        visit = client.post("/api/v1/bee/history/visits", json={
            "hive_id": hive["id"],
            "apiary_id": hive["apiary_id"],
            "visit_date": "2025-06-01",
            "health_state": "urgent",
        }, headers=auth_headers).json()
        client.post(f"/api/v1/bee/history/visits/{visit['id']}/apply", headers=auth_headers)
        updated_hive = client.get(f"/api/v1/bee/history/hives/{hive['id']}", headers=auth_headers).json()
        assert updated_hive["health_score"] < 8.0

    def test_health_score_blended_not_binary(self, client, auth_headers, hive):
        client.post("/api/v1/bee/history/visits", json={
            "hive_id": hive["id"],
            "visit_date": "2025-06-02",
            "health_state": "urgent",
        }, headers=auth_headers)
        updated_hive = client.get(f"/api/v1/bee/history/hives/{hive['id']}", headers=auth_headers).json()
        assert updated_hive["health_score"] != 2.0

    def test_create_visit_with_feeding_needs(self, client, auth_headers, hive):
        resp = client.post("/api/v1/bee/history/visits", json={
            "hive_id": hive["id"],
            "visit_date": "2025-07-01",
            "health_state": "warning",
            "needs_sirop": 5.0,
            "needs_pate": 1.0,
            "needs_traitement": 1,
        }, headers=auth_headers)
        assert resp.status_code == 201
        body = resp.json()
        assert body["needs_sirop"] == 5.0
        assert body["needs_pate"] == 1.0

    def test_delete_visit(self, client, auth_headers, hive):
        visit = client.post("/api/v1/bee/history/visits", json={
            "hive_id": hive["id"],
            "visit_date": "2025-08-01",
            "health_state": "health",
        }, headers=auth_headers).json()
        resp = client.delete(f"/api/v1/bee/history/visits/{visit['id']}", headers=auth_headers)
        assert resp.status_code == 200

    def test_list_visits_by_apiary(self, client, auth_headers, hive):
        client.post("/api/v1/bee/history/visits", json={
            "hive_id": hive["id"],
            "apiary_id": hive["apiary_id"],
            "visit_date": "2025-09-01",
            "health_state": "health",
        }, headers=auth_headers)
        resp = client.get(f"/api/v1/bee/history/visits?apiary_id={hive['apiary_id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_hive_details_includes_visits(self, client, auth_headers, hive):
        client.post("/api/v1/bee/history/visits", json={
            "hive_id": hive["id"],
            "visit_date": "2025-10-01",
            "health_state": "health",
            "harvest_kg": 3.0,
        }, headers=auth_headers)
        details = client.get(f"/api/v1/bee/history/hives/{hive['id']}", headers=auth_headers).json()
        assert details["summary"]["total_visits"] >= 1
        assert details["summary"]["total_harvest_kg"] >= 3.0


# ─── Productions ──────────────────────────────────────────────────────────────

class TestProductions:
    @pytest.fixture()
    def apiary_id(self, client, auth_headers):
        return client.post("/api/v1/bee/history/apiaries", json={"name": "Prod Apiary"},
                           headers=auth_headers).json()["id"]

    def test_create_production(self, client, auth_headers, apiary_id):
        resp = client.post("/api/v1/bee/history/productions", json={
            "apiary_id": apiary_id,
            "production_date": "2025-07-15",
            "honey_kg": 22.5,
            "pollen_kg": 1.2,
            "quality_notes": "Miel de fleurs d'oranger",
        }, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json()["honey_kg"] == 22.5

    def test_list_productions(self, client, auth_headers, apiary_id):
        client.post("/api/v1/bee/history/productions", json={
            "apiary_id": apiary_id,
            "production_date": "2025-08-01",
            "honey_kg": 10.0,
        }, headers=auth_headers)
        resp = client.get(f"/api/v1/bee/history/productions?apiary_id={apiary_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_delete_production(self, client, auth_headers, apiary_id):
        prod = client.post("/api/v1/bee/history/productions", json={
            "apiary_id": apiary_id,
            "production_date": "2025-09-01",
            "honey_kg": 5.0,
        }, headers=auth_headers).json()
        resp = client.delete(f"/api/v1/bee/history/productions/{prod['id']}", headers=auth_headers)
        assert resp.status_code == 200


# ─── Stock ────────────────────────────────────────────────────────────────────

class TestStock:
    def test_log_stock(self, client, auth_headers):
        resp = client.post("/api/v1/bee/history/stock", json={
            "log_date": "2025-10-01",
            "sirop": 50.0,
            "pate": 10.0,
            "traitement": 5,
            "cadres": 30,
            "hausse": 8,
            "equipement": 3,
        }, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json()["sirop"] == 50.0

    def test_list_stock(self, client, auth_headers):
        resp = client.get("/api/v1/bee/history/stock", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ─── Stats endpoint ───────────────────────────────────────────────────────────

class TestStats:
    def test_stats_structure(self, client, auth_headers):
        resp = client.get("/api/v1/bee/history/stats", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "total_honey_kg" in body
        assert "total_hives" in body
        assert "active_hives" in body
        assert "by_apiary" in body
        assert "monthly_series" in body
        assert isinstance(body["by_apiary"], list)

    def test_stats_counts_active_hives(self, client, auth_headers):
        apiary = client.post("/api/v1/bee/history/apiaries", json={"name": "Stats Site"},
                             headers=auth_headers).json()
        client.post("/api/v1/bee/history/hives", json={
            "apiary_id": apiary["id"], "identifier": "HIVE-STATS-A", "is_active": True
        }, headers=auth_headers)
        client.post("/api/v1/bee/history/hives", json={
            "apiary_id": apiary["id"], "identifier": "HIVE-STATS-B", "is_active": False
        }, headers=auth_headers)
        resp = client.get("/api/v1/bee/history/stats", headers=auth_headers)
        body = resp.json()
        assert body["total_hives"] >= 2
        assert body["active_hives"] >= 1


# ─── Bulk Sync ────────────────────────────────────────────────────────────────

class TestBulkSync:
    def test_sync_creates_records(self, client, auth_headers):
        resp = client.post("/api/v1/bee/history/sync", json={
            "emplacements": [{"id": "sync-1", "nom": "Sync Apiary", "lat": 36.5, "lng": 10.2}],
            "ruches": [{"id": "sync-r1", "empId": "sync-1", "name": "HIVE-SYNC-01"}],
            "visites": [],
            "productions": [],
        }, headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "synced"
        assert body["created"]["apiaries"] >= 1

    def test_sync_idempotent(self, client, auth_headers):
        payload = {
            "emplacements": [{"id": "idem-1", "nom": "Idempotent Site"}],
            "ruches": [{"id": "idem-r1", "empId": "idem-1", "name": "HIVE-IDEM-01"}],
            "visites": [],
            "productions": [],
        }
        client.post("/api/v1/bee/history/sync", json=payload, headers=auth_headers)
        resp2 = client.post("/api/v1/bee/history/sync", json=payload, headers=auth_headers)
        assert resp2.status_code == 200
        assert resp2.json()["created"]["apiaries"] == 0
        assert resp2.json()["created"]["hives"] == 0


# ─── Analytics endpoints ──────────────────────────────────────────────────────

class TestAnalytics:
    @pytest.fixture()
    def seeded(self, client, auth_headers):
        apiary = client.post("/api/v1/bee/history/apiaries", json={
            "name": "Analytics Apiary", "season": "Printemps"
        }, headers=auth_headers).json()
        hive = client.post("/api/v1/bee/history/hives", json={
            "apiary_id": apiary["id"],
            "identifier": "HIVE-ANA-01",
            "health_score": 7.0,
            "honey_level": 6.0,
            "force_level": 6.0,
            "queen_year": 2023,
        }, headers=auth_headers).json()
        client.post("/api/v1/bee/history/visits", json={
            "hive_id": hive["id"],
            "apiary_id": apiary["id"],
            "visit_date": "2025-05-01",
            "health_state": "health",
            "harvest_kg": 5.0,
        }, headers=auth_headers)
        return {"apiary": apiary, "hive": hive}

    def test_analytics_dashboard_ok(self, client, auth_headers, seeded):
        resp = client.get("/api/v1/bee/analytics/dashboard", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "hive_reports" in body
        assert "global" in body
        assert "alerts" in body

    def test_analytics_dashboard_global_stats(self, client, auth_headers, seeded):
        resp = client.get("/api/v1/bee/analytics/dashboard", headers=auth_headers)
        gs = resp.json()["global"]
        assert "total_hives" in gs
        assert "avg_health_index" in gs
        assert gs["total_hives"] >= 1

    def test_analytics_hive_report(self, client, auth_headers, seeded):
        hive_id = seeded["hive"]["id"]
        resp = client.get(f"/api/v1/bee/analytics/hive/{hive_id}/report", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "health" in body
        health = body["health"]
        assert "health_index" in health
        assert "grade" in health
        assert health["grade"] in ("A", "B", "C", "D")
        assert 0.0 <= health["health_index"] <= 10.0

    def test_analytics_hive_report_not_found(self, client, auth_headers):
        resp = client.get("/api/v1/bee/analytics/hive/99999/report", headers=auth_headers)
        assert resp.status_code == 404

    def test_analytics_colony_strength(self, client, auth_headers, seeded):
        resp = client.get("/api/v1/bee/analytics/colony-strength", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "distribution" in body
        assert isinstance(body["distribution"], dict)

    def test_hive_report_grade_degrades_on_urgent(self, client, auth_headers):
        apiary = client.post("/api/v1/bee/history/apiaries", json={"name": "Urgent Apiary"},
                             headers=auth_headers).json()
        hive = client.post("/api/v1/bee/history/hives", json={
            "apiary_id": apiary["id"],
            "identifier": "HIVE-URGENT-01",
            "health_score": 2.0,
            "honey_level": 1.0,
            "force_level": 2.0,
        }, headers=auth_headers).json()
        client.post("/api/v1/bee/history/visits", json={
            "hive_id": hive["id"],
            "apiary_id": apiary["id"],
            "visit_date": "2025-01-01",
            "health_state": "urgent",
        }, headers=auth_headers)
        resp = client.get(f"/api/v1/bee/analytics/hive/{hive['id']}/report", headers=auth_headers)
        grade = resp.json()["health"]["grade"]
        assert grade in ("C", "D")

    def test_hive_report_grade_high_on_healthy(self, client, auth_headers):
        import datetime
        apiary = client.post("/api/v1/bee/history/apiaries", json={"name": "Healthy Apiary"},
                             headers=auth_headers).json()
        hive = client.post("/api/v1/bee/history/hives", json={
            "apiary_id": apiary["id"],
            "identifier": "HIVE-HEALTH-01",
            "health_score": 9.5,
            "honey_level": 9.0,
            "force_level": 8.0,
            "queen_year": datetime.date.today().year - 1,
        }, headers=auth_headers).json()
        today = datetime.date.today().isoformat()
        client.post("/api/v1/bee/history/visits", json={
            "hive_id": hive["id"],
            "apiary_id": apiary["id"],
            "visit_date": today,
            "health_state": "health",
            "harvest_kg": 8.0,
        }, headers=auth_headers)
        resp = client.get(f"/api/v1/bee/analytics/hive/{hive['id']}/report", headers=auth_headers)
        grade = resp.json()["health"]["grade"]
        assert grade in ("A", "B")
