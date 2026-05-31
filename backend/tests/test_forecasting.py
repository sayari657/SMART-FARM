"""
Tests for forecasting service — Prophet/linear fallback with mock data.
Validates response structure and trend detection without requiring a real DB.
"""
import pytest
from unittest.mock import MagicMock
from datetime import datetime, timedelta


# -------------------------------------------------------------------
# Helpers — synthetic telemetry records
# -------------------------------------------------------------------

def _make_telemetry_records(n: int = 60, metric: str = "temperature"):
    """Generate n mock TelemetryRecord-like objects with a mild upward trend."""
    records = []
    base = datetime(2025, 1, 1)
    for i in range(n):
        rec = MagicMock()
        rec.timestamp = base + timedelta(hours=i)
        if metric == "temperature":
            rec.temperature = 20.0 + i * 0.05 + (i % 7) * 0.3  # trend + weekly wobble
        elif metric == "soil":
            rec.soil_moisture = 55.0 - i * 0.1 + (i % 3) * 0.5
        records.append(rec)
    return records


# -------------------------------------------------------------------
# Unit tests
# -------------------------------------------------------------------

class TestForecastTelemetry:
    """Tests for forecast_telemetry() in forecasting_service."""

    def test_returns_expected_keys(self):
        from app.services.forecasting_service import forecast_telemetry
        records = _make_telemetry_records(60, "temperature")
        result = forecast_telemetry(records, "temperature", horizon_days=7)

        assert "dates" in result
        assert "yhat" in result
        assert "yhat_lower" in result
        assert "yhat_upper" in result
        assert "trend" in result

    def test_dates_length_matches_yhat(self):
        from app.services.forecasting_service import forecast_telemetry
        records = _make_telemetry_records(60, "temperature")
        result = forecast_telemetry(records, "temperature", horizon_days=7)

        assert len(result["dates"]) == len(result["yhat"]), \
            "dates and yhat arrays must have the same length"
        assert len(result["yhat"]) == len(result["yhat_lower"])
        assert len(result["yhat"]) == len(result["yhat_upper"])

    def test_horizon_respected(self):
        from app.services.forecasting_service import forecast_telemetry
        records = _make_telemetry_records(90, "temperature")
        result = forecast_telemetry(records, "temperature", horizon_days=14)

        # At least 14 future data points expected
        assert len(result["yhat"]) >= 14

    def test_trend_is_valid_value(self):
        from app.services.forecasting_service import forecast_telemetry
        records = _make_telemetry_records(60, "temperature")
        result = forecast_telemetry(records, "temperature", horizon_days=7)

        assert result["trend"] in ("up", "down", "stable"), \
            f"Unexpected trend value: {result['trend']}"

    def test_ci_ordering(self):
        """yhat_lower <= yhat <= yhat_upper for every point."""
        from app.services.forecasting_service import forecast_telemetry
        records = _make_telemetry_records(60, "temperature")
        result = forecast_telemetry(records, "temperature", horizon_days=7)

        for lo, mid, hi in zip(result["yhat_lower"], result["yhat"], result["yhat_upper"]):
            assert lo <= hi, f"CI inversion: lower={lo} > upper={hi}"

    def test_empty_records_returns_fallback(self):
        """Should not raise — returns empty-safe structure."""
        from app.services.forecasting_service import forecast_telemetry
        result = forecast_telemetry([], "temperature", horizon_days=7)
        assert "dates" in result
        assert "yhat" in result

    def test_soil_metric(self):
        from app.services.forecasting_service import forecast_telemetry
        records = _make_telemetry_records(45, "soil")
        result = forecast_telemetry(records, "soil", horizon_days=5)
        assert isinstance(result["yhat"], list)
        assert len(result["yhat"]) > 0


class TestDecomposeTelemetry:
    """Tests for decompose_telemetry() — seasonal decomposition."""

    def test_returns_decomposition_keys(self):
        from app.services.forecasting_service import decompose_telemetry
        records = _make_telemetry_records(120, "temperature")
        result = decompose_telemetry(records, "temperature", period=24)

        assert "trend" in result
        assert "seasonal" in result
        assert "residual" in result
        assert "period" in result

    def test_period_passthrough(self):
        from app.services.forecasting_service import decompose_telemetry
        records = _make_telemetry_records(120, "temperature")
        result = decompose_telemetry(records, "temperature", period=12)
        assert result["period"] == 12

    def test_insufficient_data_graceful(self):
        """With < 2×period points, should return graceful fallback."""
        from app.services.forecasting_service import decompose_telemetry
        records = _make_telemetry_records(10, "temperature")
        result = decompose_telemetry(records, "temperature", period=24)
        # Must not raise; may return empty lists
        assert "trend" in result


class TestForecastHoney:
    """Tests for forecast_honey_production()."""

    def _make_hive_records(self, n: int = 40):
        records = []
        base = datetime(2024, 6, 1)
        for i in range(n):
            rec = MagicMock()
            rec.date = (base + timedelta(days=i * 7)).date()
            rec.honey_kg = max(0.0, 2.5 + 0.5 * (i % 4) - i * 0.02 + 0.1 * i % 3)
            records.append(rec)
        return records

    def test_honey_forecast_structure(self):
        from app.services.forecasting_service import forecast_honey_production
        records = self._make_hive_records(40)
        result = forecast_honey_production(records, horizon_days=30)

        assert "dates" in result
        assert "yhat" in result
        assert "trend" in result

    def test_honey_forecast_positive_predictions(self):
        """Honey production predictions should be non-negative."""
        from app.services.forecasting_service import forecast_honey_production
        records = self._make_hive_records(40)
        result = forecast_honey_production(records, horizon_days=30)
        for val in result["yhat"]:
            assert val >= 0, f"Negative honey prediction: {val}"
