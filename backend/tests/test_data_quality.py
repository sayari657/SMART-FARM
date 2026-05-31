"""
Tests for data quality service — range checks, spike detection, quality scoring.
"""
import pytest


class TestMetricRangeChecks:
    """check_metric_range() — physical bound validation."""

    def test_valid_temperature(self):
        from app.services.data_quality_service import check_metric_range
        ok, msg = check_metric_range("temperature", 25.0)
        assert ok is True
        assert msg is None

    def test_temperature_too_high(self):
        from app.services.data_quality_service import check_metric_range
        ok, msg = check_metric_range("temperature", 999.0)
        assert ok is False
        assert msg is not None

    def test_temperature_too_low(self):
        from app.services.data_quality_service import check_metric_range
        ok, msg = check_metric_range("temperature", -50.0)
        assert ok is False

    def test_valid_hive_temp(self):
        from app.services.data_quality_service import check_metric_range
        ok, _ = check_metric_range("hive_temp", 34.5)
        assert ok is True

    def test_hive_temp_out_of_range(self):
        from app.services.data_quality_service import check_metric_range
        ok, _ = check_metric_range("hive_temp", 70.0)
        assert ok is False

    def test_valid_soil_moisture(self):
        from app.services.data_quality_service import check_metric_range
        ok, _ = check_metric_range("soil_moisture", 55.0)
        assert ok is True

    def test_soil_moisture_negative(self):
        from app.services.data_quality_service import check_metric_range
        ok, _ = check_metric_range("soil_moisture", -5.0)
        assert ok is False

    def test_unknown_metric_passes(self):
        """Unknown metrics should not be rejected (no rule = no constraint)."""
        from app.services.data_quality_service import check_metric_range
        ok, _ = check_metric_range("some_unknown_metric", 42.0)
        assert ok is True


class TestSpikeDetection:
    """check_spike() — z-score based spike detection."""

    def _normal_history(self, mean=20.0, std=2.0, n=50):
        import numpy as np
        rng = np.random.default_rng(0)
        return list(rng.normal(mean, std, n))

    def test_normal_value_not_spike(self):
        from app.services.data_quality_service import check_spike
        history = self._normal_history(20.0, 2.0, 50)
        is_spike, _ = check_spike("temperature", 21.0, history)
        assert is_spike is False

    def test_extreme_value_is_spike(self):
        from app.services.data_quality_service import check_spike
        history = self._normal_history(20.0, 1.0, 50)
        # Value 10σ above mean — definitely a spike
        is_spike, _ = check_spike("temperature", 30.0, history)
        assert is_spike is True

    def test_empty_history_no_spike(self):
        """Without history, cannot detect spikes — should return False."""
        from app.services.data_quality_service import check_spike
        is_spike, _ = check_spike("temperature", 100.0, [])
        assert is_spike is False

    def test_short_history_no_spike(self):
        """Fewer than 5 history points — insufficient for z-score, no spike raised."""
        from app.services.data_quality_service import check_spike
        is_spike, _ = check_spike("temperature", 99.9, [20.0, 21.0])
        assert is_spike is False

    def test_negative_spike(self):
        """Large negative deviation also detected."""
        from app.services.data_quality_service import check_spike
        history = self._normal_history(30.0, 1.0, 50)
        is_spike, _ = check_spike("temperature", 10.0, history)
        assert is_spike is True


class TestCheckTelemetryQuality:
    """check_telemetry_quality() — composite quality scoring."""

    def test_perfect_metrics_score_100(self):
        from app.services.data_quality_service import check_telemetry_quality
        metrics = {"temperature": 23.0, "soil_moisture": 55.0, "hive_temp": 34.5}
        history = {k: [v] * 20 for k, v in metrics.items()}
        result = check_telemetry_quality(metrics, history)
        assert result["quality_score"] == 100
        assert result["issues"] == []

    def test_out_of_range_reduces_score(self):
        from app.services.data_quality_service import check_telemetry_quality
        metrics = {"temperature": 999.0}  # physically impossible
        result = check_telemetry_quality(metrics, {})
        assert result["quality_score"] < 100
        assert len(result["issues"]) > 0

    def test_spike_reduces_score(self):
        from app.services.data_quality_service import check_telemetry_quality
        import numpy as np
        history = {"temperature": list(np.random.normal(20, 1, 50))}
        metrics = {"temperature": 60.0}  # spike
        result = check_telemetry_quality(metrics, history)
        assert result["quality_score"] < 100

    def test_empty_metrics_returns_zero(self):
        from app.services.data_quality_service import check_telemetry_quality
        result = check_telemetry_quality({}, {})
        assert "quality_score" in result

    def test_result_structure(self):
        from app.services.data_quality_service import check_telemetry_quality
        metrics = {"temperature": 25.0}
        result = check_telemetry_quality(metrics, {})
        assert "quality_score" in result
        assert "issues" in result
        assert 0 <= result["quality_score"] <= 100


class TestGetQualityReport:
    """get_quality_report() — DB-backed quality report endpoint."""

    def test_report_structure(self, db):
        from app.services.data_quality_service import get_quality_report
        # unit_id=9999 — no data exists, should return graceful default
        result = get_quality_report(db, unit_id=9999, days=7)
        assert "completeness" in result
        assert "outliers_detected" in result
        assert "quality_score" in result

    def test_completeness_between_0_and_1(self, db):
        from app.services.data_quality_service import get_quality_report
        result = get_quality_report(db, unit_id=9999, days=7)
        assert 0.0 <= result["completeness"] <= 1.0

    def test_quality_score_range(self, db):
        from app.services.data_quality_service import get_quality_report
        result = get_quality_report(db, unit_id=9999, days=7)
        assert 0 <= result["quality_score"] <= 100
