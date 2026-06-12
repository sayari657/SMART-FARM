"""
Forecasting Service — Smart Farm AI v3.0
=========================================
Prophet + SARIMA time-series forecasting pour :
  - Télémétrie IoT (température, humidité, poids ruche…)
  - FCR poultry (Feed Conversion Ratio)
  - Production de miel (BeeProduction)

Fallback gracieux si Prophet/statsmodels non installé.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional imports with graceful fallback
# ---------------------------------------------------------------------------
try:
    from prophet import Prophet  # type: ignore
    _PROPHET_AVAILABLE = True
except ImportError:
    _PROPHET_AVAILABLE = False
    logger.warning("Prophet not installed — time-series forecasting will use linear fallback")

try:
    from statsmodels.tsa.statespace.sarimax import SARIMAX  # type: ignore
    from statsmodels.tsa.seasonal import seasonal_decompose  # type: ignore
    _STATSMODELS_AVAILABLE = True
except ImportError:
    _STATSMODELS_AVAILABLE = False
    logger.warning("statsmodels not installed — SARIMA/decomposition unavailable")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _record_value(record: Any, key: str, default: Any = None) -> Any:
    if isinstance(record, Mapping):
        return record.get(key, default)
    values = getattr(record, "__dict__", {})
    if key in values:
        return values[key]
    return getattr(record, key, default)


def _telemetry_value(record: Any, metric: str) -> Any:
    metrics = _record_value(record, "metrics")
    if isinstance(metrics, Mapping) and metric in metrics:
        return metrics.get(metric)

    aliases = {
        "soil": ("soil", "soil_moisture"),
        "soil_moisture": ("soil_moisture", "soil"),
    }
    for key in aliases.get(metric, (metric,)):
        value = _record_value(record, key)
        if value is not None:
            return value
    return None


def _linear_forecast(values: list[float], horizon: int) -> dict[str, Any]:
    """Fallback linear regression forecast when Prophet is unavailable."""
    n = len(values)
    x = np.arange(n, dtype=float)
    y = np.array(values, dtype=float)
    # Remove NaN
    mask = ~np.isnan(y)
    x, y = x[mask], y[mask]
    if len(x) < 2:
        last = float(y[-1]) if len(y) else 0.0
        dates = [(datetime.utcnow() + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, horizon + 1)]
        return {"dates": dates, "yhat": [last] * horizon, "yhat_lower": [last] * horizon,
                "yhat_upper": [last] * horizon, "trend": "stable", "method": "constant_fallback"}

    coeffs = np.polyfit(x, y, 1)
    slope, intercept = coeffs
    future_x = np.arange(n, n + horizon, dtype=float)
    yhat = slope * future_x + intercept
    std = float(np.std(y - (slope * x + intercept)))
    dates = [(datetime.utcnow() + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, horizon + 1)]
    trend = "up" if slope > 0.01 else ("down" if slope < -0.01 else "stable")
    return {
        "dates": dates,
        "yhat": [round(float(v), 4) for v in yhat],
        "yhat_lower": [round(float(v) - 1.96 * std, 4) for v in yhat],
        "yhat_upper": [round(float(v) + 1.96 * std, 4) for v in yhat],
        "trend": trend,
        "method": "linear_fallback",
    }


def _prophet_forecast(df: pd.DataFrame, horizon: int, freq: str = "D") -> dict[str, Any]:
    """
    df must have columns: ds (datetime), y (float)
    Returns forecast dict with dates, yhat, yhat_lower, yhat_upper, trend.
    """
    if not _PROPHET_AVAILABLE or len(df) < 3:
        values = df["y"].tolist() if len(df) > 0 else []
        return _linear_forecast(values, horizon)

    try:
        m = Prophet(
            daily_seasonality=(freq in ("H", "T")),
            weekly_seasonality=True,
            yearly_seasonality=(len(df) > 180),
            changepoint_prior_scale=0.05,
            interval_width=0.95,
        )
        m.fit(df[["ds", "y"]])
        future = m.make_future_dataframe(periods=horizon, freq=freq)
        forecast = m.predict(future)
        future_fc = forecast.tail(horizon)

        # Trend direction from last 7 points
        slope = np.polyfit(range(min(7, len(forecast))), forecast["trend"].tail(7).values, 1)[0]
        trend = "up" if slope > 0.01 else ("down" if slope < -0.01 else "stable")

        return {
            "dates": future_fc["ds"].dt.strftime("%Y-%m-%dT%H:%M:%S").tolist(),
            "yhat": [round(float(v), 4) for v in future_fc["yhat"]],
            "yhat_lower": [round(float(v), 4) for v in future_fc["yhat_lower"]],
            "yhat_upper": [round(float(v), 4) for v in future_fc["yhat_upper"]],
            "trend": trend,
            "method": "prophet",
        }
    except Exception as exc:
        logger.error("Prophet forecast failed: %s — falling back to linear", exc)
        return _linear_forecast(df["y"].tolist(), horizon)


def _apply_conformal(df: pd.DataFrame, result: dict, horizon: int,
                     freq: str = "D", alpha: float = 0.1) -> dict:
    """
    Prédiction conforme (split-conformal) : garantit une couverture ≥ 1-α
    des intervalles sans hypothèse sur la distribution des résidus.

    Backtest : le modèle est réajusté sur les ~80 % premiers points, les
    résidus absolus sont mesurés sur les ~20 % restants, et le quantile
    conformel q = ⌈(k+1)(1-α)⌉/k élargit les intervalles yhat ± q si les
    intervalles du modèle sont plus étroits.

    Référence : Vovk et al., "Algorithmic Learning in a Random World" (2005).
    """
    n = len(df)
    k = min(30, n // 3)
    if k < 5 or not result.get("yhat"):
        return result            # série trop courte pour calibrer

    try:
        train, calib = df.iloc[:-k], df.iloc[-k:]
        back = _prophet_forecast(train, horizon=k, freq=freq)
        preds = back.get("yhat", [])[: len(calib)]
        if len(preds) < len(calib):
            return result
        residuals = sorted(
            abs(float(y) - float(p)) for y, p in zip(calib["y"].tolist(), preds)
        )
        rank = min(int(np.ceil((k + 1) * (1 - alpha))), k) - 1
        q = residuals[rank]

        widened = 0
        lower, upper = [], []
        for yh, lo, up in zip(result["yhat"], result["yhat_lower"], result["yhat_upper"]):
            c_lo, c_up = yh - q, yh + q
            if c_lo < lo or c_up > up:
                widened += 1
            lower.append(round(min(lo, c_lo), 4))
            upper.append(round(max(up, c_up), 4))
        result["yhat_lower"], result["yhat_upper"] = lower, upper
        result["conformal"] = {
            "alpha": alpha,
            "coverage_target": f"{(1 - alpha):.0%}",
            "q": round(float(q), 4),
            "calibration_points": k,
            "intervals_widened": widened,
        }
    except Exception as exc:
        logger.warning("Calibration conforme échouée : %s", exc)
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def forecast_telemetry(
    records: list[dict],
    metric: str,
    horizon_days: int = 7,
) -> dict[str, Any]:
    """
    Forecast a telemetry metric N days ahead.

    Parameters
    ----------
    records : mappings or model-like objects containing timestamp and metric values
    metric  : key inside metrics JSON, e.g. 'temperature', 'humidity'
    horizon_days : forecast horizon in days

    Returns
    -------
    dict with keys: dates, yhat, yhat_lower, yhat_upper, trend, method, metric, data_points
    """
    rows = []
    for r in records:
        ts = _record_value(r, "timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except ValueError:
                continue
        val = _telemetry_value(r, metric)
        if val is not None:
            try:
                rows.append({"ds": pd.Timestamp(ts), "y": float(val)})
            except (TypeError, ValueError):
                pass

    if not rows:
        return {
            "dates": [], "yhat": [], "yhat_lower": [], "yhat_upper": [],
            "trend": "unknown", "method": "no_data", "metric": metric, "data_points": 0,
        }

    df = pd.DataFrame(rows).sort_values("ds").drop_duplicates("ds")
    result = _prophet_forecast(df, horizon_days, freq="D")
    result = _apply_conformal(df, result, horizon_days, freq="D")
    result["metric"] = metric
    result["data_points"] = len(df)
    return result


def forecast_fcr(
    feed_logs: list[dict],
    horizon_days: int = 14,
) -> dict[str, Any]:
    """
    Forecast Feed Conversion Ratio from historical feed log records.

    feed_logs: list of dicts with 'date' and 'fcr_calculated' keys
    """
    rows = []
    for log in feed_logs:
        date_val = log.get("date")
        fcr = log.get("fcr_calculated")
        if date_val and fcr is not None:
            try:
                if isinstance(date_val, str):
                    date_val = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
                rows.append({"ds": pd.Timestamp(date_val), "y": float(fcr)})
            except (TypeError, ValueError):
                pass

    if len(rows) < 2:
        return {
            "dates": [], "yhat": [], "yhat_lower": [], "yhat_upper": [],
            "trend": "unknown", "method": "insufficient_data", "metric": "fcr", "data_points": len(rows),
        }

    df = pd.DataFrame(rows).sort_values("ds").drop_duplicates("ds")
    result = _prophet_forecast(df, horizon_days, freq="D")
    result["metric"] = "fcr"
    result["data_points"] = len(df)
    return result


def forecast_honey_production(
    production_records: list[dict],
    horizon_days: int = 30,
) -> dict[str, Any]:
    """
    Forecast honey production using SARIMA (statsmodels) with Prophet fallback.

    production_records: list of dicts with 'production_date' and 'honey_kg' keys
    """
    rows = []
    for rec in production_records:
        date_val = _record_value(rec, "production_date") or _record_value(rec, "date")
        kg = _record_value(rec, "honey_kg")
        if date_val and kg is not None:
            try:
                if isinstance(date_val, str):
                    date_val = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
                rows.append({"ds": pd.Timestamp(date_val), "y": float(kg)})
            except (TypeError, ValueError):
                pass

    if len(rows) < 4:
        return {
            "dates": [], "yhat": [], "yhat_lower": [], "yhat_upper": [],
            "trend": "unknown", "method": "insufficient_data", "metric": "honey_kg", "data_points": len(rows),
        }

    df = pd.DataFrame(rows).sort_values("ds").drop_duplicates("ds")

    # Try SARIMA first (better for seasonal honey production)
    if _STATSMODELS_AVAILABLE and len(df) >= 12:
        try:
            series = df.set_index("ds")["y"].asfreq("D").fillna(method="ffill")
            model = SARIMAX(series, order=(1, 1, 1), seasonal_order=(1, 0, 1, 7),
                            enforce_stationarity=False, enforce_invertibility=False)
            fit = model.fit(disp=False)
            forecast_result = fit.get_forecast(steps=horizon_days)
            mean = forecast_result.predicted_mean
            ci = forecast_result.conf_int(alpha=0.05)

            dates = [d.strftime("%Y-%m-%dT%H:%M:%S") for d in mean.index]
            slope = np.polyfit(range(min(7, len(series))), series.tail(7).values, 1)[0]
            trend = "up" if slope > 0 else ("down" if slope < 0 else "stable")

            yhat = [max(0.0, round(float(v), 4)) for v in mean]
            return {
                "dates": dates,
                "yhat": yhat,
                "yhat_lower": [max(0.0, round(float(v), 4)) for v in ci.iloc[:, 0]],
                "yhat_upper": [
                    max(mid, round(float(v), 4))
                    for mid, v in zip(yhat, ci.iloc[:, 1])
                ],
                "trend": trend,
                "method": "sarima",
                "metric": "honey_kg",
                "data_points": len(df),
            }
        except Exception as exc:
            logger.warning("SARIMA failed: %s — using Prophet", exc)

    result = _prophet_forecast(df, horizon_days, freq="D")
    result["yhat"] = [max(0.0, value) for value in result["yhat"]]
    result["yhat_lower"] = [max(0.0, value) for value in result["yhat_lower"]]
    result["yhat_upper"] = [
        max(mid, high) for mid, high in zip(result["yhat"], result["yhat_upper"])
    ]
    result["metric"] = "honey_kg"
    result["data_points"] = len(df)
    return result


def decompose_telemetry(
    records: list[dict],
    metric: str,
    period: int = 24,
) -> dict[str, Any]:
    """
    Seasonal decomposition of a telemetry metric.

    Returns trend, seasonal, and residual components.
    """
    if not _STATSMODELS_AVAILABLE:
        return {
            "metric": metric, "period": period, "dates": [],
            "observed": [], "trend": [], "seasonal": [], "residual": [],
            "data_points": 0, "method": "unavailable",
        }

    rows = []
    for r in records:
        ts = _record_value(r, "timestamp")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except ValueError:
                continue
        val = _telemetry_value(r, metric)
        if val is not None:
            try:
                rows.append({"ds": pd.Timestamp(ts), "y": float(val)})
            except (TypeError, ValueError):
                pass

    if len(rows) < period * 2:
        return {
            "metric": metric, "period": period, "dates": [],
            "observed": [], "trend": [], "seasonal": [], "residual": [],
            "data_points": len(rows), "method": "insufficient_data",
        }

    df = pd.DataFrame(rows).sort_values("ds").drop_duplicates("ds")
    series = df.set_index("ds")["y"]

    try:
        result = seasonal_decompose(series, model="additive", period=period, extrapolate_trend="freq")
        dates = [str(d) for d in series.index]
        return {
            "metric": metric,
            "period": period,
            "dates": dates,
            "observed": [round(float(v), 4) if not np.isnan(v) else None for v in result.observed],
            "trend": [round(float(v), 4) if not np.isnan(v) else None for v in result.trend],
            "seasonal": [round(float(v), 4) if not np.isnan(v) else None for v in result.seasonal],
            "residual": [round(float(v), 4) if not np.isnan(v) else None for v in result.resid],
            "data_points": len(df),
        }
    except Exception as exc:
        logger.error("Decomposition failed: %s", exc)
        return {
            "metric": metric, "period": period, "dates": [],
            "observed": [], "trend": [], "seasonal": [], "residual": [],
            "data_points": len(rows), "method": "decomposition_error",
            "error": str(exc),
        }
