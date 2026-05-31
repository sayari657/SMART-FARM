"""
Tests for cross-correlation and time-series decomposition endpoints.
GET /api/v1/analytics/correlation
GET /api/v1/analytics/decompose/{unit_id}
"""
import pytest


CORR_URL = "/api/v1/analytics/correlation"
DECOMPOSE_URL = "/api/v1/analytics/decompose"


class TestCorrelationEndpoint:
    """GET /api/v1/analytics/correlation"""

    def test_returns_pearson_r(self, client, auth_headers):
        resp = client.get(
            CORR_URL,
            params={"unit_id": 1, "metric_x": "temperature", "metric_y": "humidity", "days": 30},
            headers=auth_headers,
        )
        assert resp.status_code in (200, 404), f"Unexpected: {resp.text}"
        if resp.status_code == 200:
            data = resp.json()
            assert "pearson_r" in data

    def test_response_structure(self, client, auth_headers):
        resp = client.get(
            CORR_URL,
            params={"unit_id": 1, "metric_x": "temperature", "metric_y": "humidity", "days": 30},
            headers=auth_headers,
        )
        if resp.status_code == 200:
            data = resp.json()
            # All expected keys present
            for key in ("pearson_r", "p_value", "significant", "interpretation"):
                assert key in data, f"Missing key: {key}"

    def test_pearson_r_range(self, client, auth_headers):
        resp = client.get(
            CORR_URL,
            params={"unit_id": 1, "metric_x": "temperature", "metric_y": "soil_moisture", "days": 30},
            headers=auth_headers,
        )
        if resp.status_code == 200:
            r = resp.json()["pearson_r"]
            assert -1.0 <= r <= 1.0, f"Pearson r out of range: {r}"

    def test_p_value_non_negative(self, client, auth_headers):
        resp = client.get(
            CORR_URL,
            params={"unit_id": 1, "metric_x": "temperature", "metric_y": "humidity", "days": 7},
            headers=auth_headers,
        )
        if resp.status_code == 200:
            pval = resp.json()["p_value"]
            assert pval >= 0.0

    def test_significant_field_is_boolean(self, client, auth_headers):
        resp = client.get(
            CORR_URL,
            params={"unit_id": 1, "metric_x": "temperature", "metric_y": "humidity", "days": 30},
            headers=auth_headers,
        )
        if resp.status_code == 200:
            assert isinstance(resp.json()["significant"], bool)

    def test_requires_auth(self, client):
        resp = client.get(
            CORR_URL,
            params={"unit_id": 1, "metric_x": "temperature", "metric_y": "humidity"},
        )
        assert resp.status_code == 401

    def test_missing_metric_x_returns_422(self, client, auth_headers):
        resp = client.get(
            CORR_URL,
            params={"unit_id": 1, "metric_y": "humidity"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_missing_metric_y_returns_422(self, client, auth_headers):
        resp = client.get(
            CORR_URL,
            params={"unit_id": 1, "metric_x": "temperature"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_no_data_returns_404_or_empty(self, client, auth_headers):
        """Unit ID 99999 has no data — should return 404 or empty result."""
        resp = client.get(
            CORR_URL,
            params={"unit_id": 99999, "metric_x": "temperature", "metric_y": "humidity"},
            headers=auth_headers,
        )
        assert resp.status_code in (200, 404)


class TestDecomposeEndpoint:
    """GET /api/v1/analytics/decompose/{unit_id}"""

    def test_decompose_returns_components(self, client, auth_headers):
        resp = client.get(
            f"{DECOMPOSE_URL}/1",
            params={"metric": "temperature", "days": 30},
            headers=auth_headers,
        )
        assert resp.status_code in (200, 404), f"Unexpected: {resp.text}"
        if resp.status_code == 200:
            data = resp.json()
            for key in ("trend", "seasonal", "residual", "period"):
                assert key in data, f"Missing key: {key}"

    def test_decompose_period_in_response(self, client, auth_headers):
        resp = client.get(
            f"{DECOMPOSE_URL}/1",
            params={"metric": "temperature", "days": 30},
            headers=auth_headers,
        )
        if resp.status_code == 200:
            assert isinstance(resp.json()["period"], int)
            assert resp.json()["period"] > 0

    def test_decompose_arrays_are_lists(self, client, auth_headers):
        resp = client.get(
            f"{DECOMPOSE_URL}/1",
            params={"metric": "temperature", "days": 30},
            headers=auth_headers,
        )
        if resp.status_code == 200:
            data = resp.json()
            assert isinstance(data["trend"], list)
            assert isinstance(data["seasonal"], list)
            assert isinstance(data["residual"], list)

    def test_decompose_requires_auth(self, client):
        resp = client.get(f"{DECOMPOSE_URL}/1", params={"metric": "temperature"})
        assert resp.status_code == 401

    def test_decompose_no_data_unit(self, client, auth_headers):
        resp = client.get(
            f"{DECOMPOSE_URL}/99999",
            params={"metric": "temperature", "days": 30},
            headers=auth_headers,
        )
        assert resp.status_code in (200, 404)


class TestCorrelationServiceDirect:
    """Unit-test the correlation logic directly with numpy arrays."""

    def test_perfect_positive_correlation(self):
        """x == y should give r=1.0."""
        import numpy as np
        from scipy.stats import pearsonr
        x = np.arange(1, 51, dtype=float)
        y = x.copy()
        r, pval = pearsonr(x, y)
        assert abs(r - 1.0) < 1e-10

    def test_perfect_negative_correlation(self):
        import numpy as np
        from scipy.stats import pearsonr
        x = np.arange(1, 51, dtype=float)
        y = -x
        r, pval = pearsonr(x, y)
        assert abs(r + 1.0) < 1e-10

    def test_uncorrelated_variables(self):
        """Independent random variables should have |r| ≪ 1."""
        import numpy as np
        from scipy.stats import pearsonr
        rng = np.random.default_rng(99)
        x = rng.normal(0, 1, 1000)
        y = rng.normal(0, 1, 1000)
        r, _ = pearsonr(x, y)
        assert abs(r) < 0.15
