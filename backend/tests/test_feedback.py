"""
Tests for Active Learning feedback pipeline.
POST /cv/feedback — submit correction
GET  /cv/feedback/stats — stats
POST /cv/retrain/trigger — owner-only DVC trigger
"""
import pytest


FEEDBACK_URL = "/api/v1/cv/feedback"
STATS_URL = "/api/v1/cv/feedback/stats"
RETRAIN_URL = "/api/v1/cv/retrain/trigger"


class TestSubmitFeedback:
    """POST /cv/feedback"""

    def test_submit_correction_success(self, client, auth_headers):
        payload = {
            "cv_event_id": None,           # no linked event — standalone correction
            "original_label": "bee_healthy",
            "corrected_label": "bee_varroa",
            "category": "bee",
            "confidence_original": 0.72,
            "notes": "Confirmed varroa mite visible on abdomen",
        }
        resp = client.post(FEEDBACK_URL, json=payload, headers=auth_headers)
        assert resp.status_code in (200, 201), f"Unexpected: {resp.text}"
        data = resp.json()
        assert "id" in data or "status" in data

    def test_submit_feedback_requires_auth(self, client):
        payload = {
            "original_label": "fire",
            "corrected_label": "smoke",
        }
        resp = client.post(FEEDBACK_URL, json=payload)
        assert resp.status_code == 401

    def test_submit_feedback_missing_labels(self, client, auth_headers):
        """Missing both labels should return 422 validation error."""
        resp = client.post(FEEDBACK_URL, json={}, headers=auth_headers)
        assert resp.status_code == 422

    def test_submit_feedback_corrected_label_required(self, client, auth_headers):
        payload = {
            "original_label": "bee_healthy",
            # corrected_label missing
        }
        resp = client.post(FEEDBACK_URL, json=payload, headers=auth_headers)
        assert resp.status_code == 422

    def test_submit_multiple_feedbacks(self, client, auth_headers):
        """Submit 3 corrections — each should succeed."""
        pairs = [
            ("olive_healthy", "olive_peacock_eye"),
            ("leaf_healthy", "cercospora"),
            ("no_fire", "smoke"),
        ]
        for orig, corr in pairs:
            resp = client.post(FEEDBACK_URL, json={
                "original_label": orig,
                "corrected_label": corr,
            }, headers=auth_headers)
            assert resp.status_code in (200, 201), f"Failed for {orig}→{corr}: {resp.text}"


class TestFeedbackStats:
    """GET /cv/feedback/stats"""

    def test_stats_returns_expected_fields(self, client, auth_headers):
        resp = client.get(STATS_URL, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_corrections" in data
        assert "pending" in data
        assert "distribution" in data

    def test_stats_requires_auth(self, client):
        resp = client.get(STATS_URL)
        assert resp.status_code == 401

    def test_stats_pending_is_non_negative(self, client, auth_headers):
        resp = client.get(STATS_URL, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["pending"] >= 0

    def test_stats_distribution_is_dict(self, client, auth_headers):
        resp = client.get(STATS_URL, headers=auth_headers)
        data = resp.json()
        assert isinstance(data["distribution"], dict)


class TestRetrainTrigger:
    """POST /cv/retrain/trigger — owner role required."""

    def _owner_headers(self, client):
        """Register an owner-role user and return their auth headers."""
        client.post("/api/v1/auth/register", json={
            "username": "owner_test",
            "password": "Owner1234!",
            "email": "owner@farm.ai",
            "full_name": "Farm Owner",
            "role": "owner",
        })
        resp = client.post("/api/v1/auth/login", json={
            "username": "owner_test",
            "password": "Owner1234!",
        })
        if resp.status_code != 200:
            pytest.skip("Owner login failed — skipping retrain test")
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_retrain_requires_auth(self, client):
        resp = client.post(RETRAIN_URL)
        assert resp.status_code == 401

    def test_retrain_returns_status(self, client, auth_headers):
        """Even non-owner should get a meaningful response (403 or 200 if threshold met)."""
        resp = client.post(RETRAIN_URL, headers=auth_headers)
        assert resp.status_code in (200, 202, 403, 409), \
            f"Unexpected status: {resp.status_code} — {resp.text}"

    def test_retrain_response_has_status_field(self, client, auth_headers):
        resp = client.post(RETRAIN_URL, headers=auth_headers)
        if resp.status_code in (200, 202):
            assert "status" in resp.json()
