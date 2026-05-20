"""
Tests for CV events, alerts, anomalies, recommendations, and dashboard endpoints.
"""


# ── CV Events ──────────────────────────────────────────────────────────────────

class TestCVEvents:
    def _unit_id(self, client, auth_headers):
        """Create farm + animal type + animal unit, return unit_id."""
        r = client.post("/api/v1/farms", json={"name": "TestFarm-CV", "location": "Tunis"}, headers=auth_headers)
        assert r.status_code in (200, 201)
        farm_id = r.json()["id"]

        r = client.post("/api/v1/animals/types", json={"species": "bee", "display_name": "Bee"}, headers=auth_headers)
        assert r.status_code in (200, 201)
        type_id = r.json()["id"]

        r = client.post("/api/v1/animals", json={
            "farm_id": farm_id, "type_id": type_id, "name": "Unit-CV",
        }, headers=auth_headers)
        assert r.status_code in (200, 201), r.text
        return r.json()["id"]

    def test_ingest_cv_event(self, client, auth_headers):
        uid = self._unit_id(client, auth_headers)
        r = client.post("/api/v1/cv/events", json={
            "unit_id": uid,
            "object_class": "fire",
            "confidence": 0.92,
            "severity": "critical",
            "camera_id": "fire",
        }, headers=auth_headers)
        assert r.status_code == 201
        data = r.json()
        assert data["object_class"] == "fire"
        assert data["unit_id"] == uid

    def test_get_recent_cv_events(self, client, auth_headers):
        r = client.get("/api/v1/cv/events?limit=10", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_cv_events_by_unit(self, client, auth_headers):
        uid = self._unit_id(client, auth_headers)
        r = client.get(f"/api/v1/cv/events/{uid}", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_delete_cv_event(self, client, auth_headers):
        uid = self._unit_id(client, auth_headers)
        r = client.post("/api/v1/cv/events", json={
            "unit_id": uid, "object_class": "smoke",
            "confidence": 0.75, "severity": "warning", "camera_id": "fire",
        }, headers=auth_headers)
        assert r.status_code == 201
        event_id = r.json()["id"]

        r = client.delete(f"/api/v1/cv/events/{event_id}", headers=auth_headers)
        assert r.status_code == 204

    def test_purge_cv_events_by_ids(self, client, auth_headers):
        uid = self._unit_id(client, auth_headers)
        ids = []
        for cls in ["bee", "predator"]:
            r = client.post("/api/v1/cv/events", json={
                "unit_id": uid, "object_class": cls,
                "confidence": 0.6, "severity": "info", "camera_id": "bee",
            }, headers=auth_headers)
            assert r.status_code == 201
            ids.append(str(r.json()["id"]))

        r = client.delete(f"/api/v1/cv/events?ids={','.join(ids)}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["deleted"] >= 2

    def test_cv_models_health(self, client, auth_headers):
        r = client.get("/api/v1/cv/models/health", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "status" in data
        assert "models" in data
        assert data["status"] in ("ready", "degraded")

    def test_plant_stats(self, client, auth_headers):
        r = client.get("/api/v1/cv/stats/plants", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "total_detections" in data
        assert "disease_alerts_7d" in data
        assert "avg_confidence_pct" in data

    def test_drift_stats_empty(self, client, auth_headers):
        r = client.get("/api/v1/cv/stats/drift?days=7", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "overall_status" in data
        assert "categories" in data
        assert "window_days" in data
        assert data["window_days"] == 7

    def test_drift_stats_with_data(self, client, auth_headers):
        uid = self._unit_id(client, auth_headers)
        for conf in [0.80, 0.75, 0.90, 0.60, 0.85]:
            client.post("/api/v1/cv/events", json={
                "unit_id": uid, "object_class": "fire",
                "confidence": conf, "severity": "critical", "camera_id": "fire",
            }, headers=auth_headers)

        r = client.get("/api/v1/cv/stats/drift?days=7", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "fire" in data["categories"]
        fire = data["categories"]["fire"]
        assert "drift_detected" in fire
        assert "current_window" in fire
        assert fire["current_window"]["count"] >= 5


# ── Alerts ─────────────────────────────────────────────────────────────────────

class TestAlerts:
    def _unit_id(self, client, auth_headers):
        r = client.post("/api/v1/farms", json={"name": "AlertFarm", "location": "Sfax"}, headers=auth_headers)
        assert r.status_code in (200, 201)
        farm_id = r.json()["id"]
        r = client.post("/api/v1/animals/types", json={"species": "goat", "display_name": "Goat"}, headers=auth_headers)
        assert r.status_code in (200, 201)
        type_id = r.json()["id"]
        r = client.post("/api/v1/animals", json={
            "farm_id": farm_id, "type_id": type_id, "name": "Unit-Alert",
        }, headers=auth_headers)
        assert r.status_code in (200, 201), r.text
        return r.json()["id"]

    def test_create_alert(self, client, auth_headers):
        uid = self._unit_id(client, auth_headers)
        r = client.post("/api/v1/alerts", json={
            "unit_id": uid,
            "alert_type": "temperature",
            "message": "High temperature detected",
            "severity": "warning",
        }, headers=auth_headers)
        assert r.status_code == 201
        data = r.json()
        assert data["alert_type"] == "temperature"
        assert data["severity"] == "warning"
        assert data["is_resolved"] is False

    def test_list_alerts(self, client, auth_headers):
        r = client.get("/api/v1/alerts", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_resolve_alert(self, client, auth_headers):
        uid = self._unit_id(client, auth_headers)
        r = client.post("/api/v1/alerts", json={
            "unit_id": uid, "alert_type": "humidity",
            "message": "Low humidity", "severity": "info",
        }, headers=auth_headers)
        assert r.status_code == 201
        alert_id = r.json()["id"]

        r = client.put(f"/api/v1/alerts/{alert_id}/resolve",
                       json={"resolved_by": "test_admin"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["is_resolved"] is True

    def test_delete_alert(self, client, auth_headers):
        uid = self._unit_id(client, auth_headers)
        r = client.post("/api/v1/alerts", json={
            "unit_id": uid, "alert_type": "weight",
            "message": "Weight anomaly", "severity": "critical",
        }, headers=auth_headers)
        assert r.status_code == 201
        alert_id = r.json()["id"]

        r = client.delete(f"/api/v1/alerts/{alert_id}", headers=auth_headers)
        assert r.status_code == 204

    def test_critical_alerts(self, client, auth_headers):
        r = client.get("/api/v1/alerts/critical", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ── Anomalies ──────────────────────────────────────────────────────────────────

class TestAnomalies:
    def test_recent_anomalies(self, client, auth_headers):
        r = client.get("/api/v1/anomalies/recent?limit=10", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_anomalies_by_unit(self, client, auth_headers):
        r = client.get("/api/v1/anomalies/1", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ── Dashboard ──────────────────────────────────────────────────────────────────

class TestDashboard:
    def test_dashboard_stats(self, client, auth_headers):
        r = client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "total_farms" in data or "farms" in data or isinstance(data, dict)

    def test_dashboard_analytics(self, client, auth_headers):
        r = client.get("/api/v1/dashboard/analytics?days=7", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "timeline" in data
        assert "alert_severity_distribution" in data


# ── Emergency Monitor ──────────────────────────────────────────────────────────

class TestEmergency:
    def test_emergency_monitor(self, client, auth_headers):
        r = client.get("/api/v1/alerts/emergency", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "critical_alerts" in data
        assert "fire_events" in data
        assert "system_status" in data
        assert data["system_status"] in ("emergency", "stable")
