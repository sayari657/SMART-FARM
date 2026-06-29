"""
Weather alert service — météo-driven farm alerts (+ email).

For every farm with GPS coordinates this service:
  1. pulls live weather (current + today's forecast) from Open-Meteo,
  2. evaluates a set of agronomic risk rules (heat, frost, storm, heavy
     rain, extreme UV),
  3. persists a `WeatherAlert` row for each newly-triggered risk,
  4. dispatches it to the farm owner + assigned workers — by EMAIL (and the
     other channels) through the existing `notify_farm_alert`,
  5. auto-resolves alerts whose condition has cleared.

No API key required (Open-Meteo is free). Deduplicates so the same risk is
not re-emailed within `DEDUP_HOURS`.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.domain import Farm, WeatherAlert
from app.services.alert_notify_service import notify_farm_alert

logger = logging.getLogger(__name__)

# Don't re-create / re-email the same alert type for a farm within this window.
DEDUP_HOURS = 12

_DEFAULT_LAT = 36.8065
_DEFAULT_LON = 10.1815


# ── Rule definitions ─────────────────────────────────────────────────────────
# Each rule reads the weather context and returns (severity, value, threshold)
# when triggered, or None. Severity escalates: warning → critical.

def _rule_heat(ctx):
    v = ctx.get("tmax")
    if v is None:
        return None
    if v >= 42:
        return ("critical", v, 42)
    if v >= 38:
        return ("warning", v, 38)
    return None


def _rule_frost(ctx):
    v = ctx.get("tmin")
    if v is None:
        return None
    if v <= 0:
        return ("critical", v, 0)
    if v <= 3:
        return ("warning", v, 3)
    return None


def _rule_storm(ctx):
    v = ctx.get("wind_max")
    if v is None:
        return None
    if v >= 60:
        return ("critical", v, 60)
    if v >= 45:
        return ("warning", v, 45)
    return None


def _rule_rain(ctx):
    v = ctx.get("precip_sum")
    if v is None:
        return None
    if v >= 40:
        return ("critical", v, 40)
    if v >= 20:
        return ("warning", v, 20)
    return None


def _rule_uv(ctx):
    v = ctx.get("uv_max")
    if v is None:
        return None
    if v >= 11:
        return ("critical", v, 11)
    if v >= 8:
        return ("warning", v, 8)
    return None


# alert_type → (emoji, unit, metric, rule_fn, title_fn, message_fn)
def _t_heat(v, thr):
    return (f"🔥 Canicule prévue — {v:.0f}°C",
            f"Température maximale de {v:.0f}°C attendue aujourd'hui (seuil {thr:.0f}°C). "
            f"Risque de stress thermique pour les cultures et le bétail. "
            f"Augmentez l'abreuvement, ombragez les animaux et irriguez en soirée.")


def _t_frost(v, thr):
    return (f"❄️ Risque de gel — {v:.0f}°C",
            f"Température minimale de {v:.0f}°C attendue cette nuit (seuil {thr:.0f}°C). "
            f"Protégez les cultures sensibles (voiles d'hivernage) et abritez le bétail vulnérable.")


def _t_storm(v, thr):
    return (f"💨 Vent fort / tempête — {v:.0f} km/h",
            f"Rafales jusqu'à {v:.0f} km/h prévues (seuil {thr:.0f} km/h). "
            f"Sécurisez serres, ruches, filets et structures légères.")


def _t_rain(v, thr):
    return (f"🌧️ Fortes pluies — {v:.0f} mm",
            f"Cumul de {v:.0f} mm attendu aujourd'hui (seuil {thr:.0f} mm). "
            f"Risque d'inondation et de ruissellement : vérifiez le drainage et reportez les traitements.")


def _t_uv(v, thr):
    return (f"🔆 Indice UV extrême — {v:.0f}",
            f"Indice UV de {v:.0f} prévu (seuil {thr:.0f}). "
            f"Limitez l'exposition des ouvriers aux heures de pointe (11h–16h).")


RULES = [
    {"type": "heat",  "emoji": "🔥", "unit": "°C",   "metric": "temperature_2m_max", "fn": _rule_heat,  "tpl": _t_heat},
    {"type": "frost", "emoji": "❄️", "unit": "°C",   "metric": "temperature_2m_min", "fn": _rule_frost, "tpl": _t_frost},
    {"type": "storm", "emoji": "💨", "unit": "km/h", "metric": "wind_speed_10m_max", "fn": _rule_storm, "tpl": _t_storm},
    {"type": "rain",  "emoji": "🌧️", "unit": "mm",   "metric": "precipitation_sum",  "fn": _rule_rain,  "tpl": _t_rain},
    {"type": "uv",    "emoji": "🔆", "unit": "UV",   "metric": "uv_index_max",       "fn": _rule_uv,    "tpl": _t_uv},
]


def get_rules() -> List[Dict]:
    """Public, serialisable description of the thresholds (for the UI)."""
    return [
        {"type": "heat",  "emoji": "🔥", "label": "Canicule",      "warning": 38, "critical": 42, "unit": "°C"},
        {"type": "frost", "emoji": "❄️", "label": "Gel",            "warning": 3,  "critical": 0,  "unit": "°C"},
        {"type": "storm", "emoji": "💨", "label": "Vent / tempête", "warning": 45, "critical": 60, "unit": "km/h"},
        {"type": "rain",  "emoji": "🌧️", "label": "Fortes pluies",  "warning": 20, "critical": 40, "unit": "mm"},
        {"type": "uv",    "emoji": "🔆", "label": "UV extrême",     "warning": 8,  "critical": 11, "unit": "UV"},
    ]


# ── Weather fetch (sync, runs fine inside the scheduler thread) ───────────────

def _fetch_weather(lat: float, lon: float) -> Optional[Dict]:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,wind_speed_10m,precipitation,weather_code",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,"
                 "wind_speed_10m_max,uv_index_max,weather_code",
        "timezone": "auto",
        "forecast_days": 1,
    }
    try:
        resp = httpx.get(settings.WEATHER_API_URL, params=params, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:                                   # network / API error
        logger.warning("Weather fetch failed for (%.4f,%.4f): %s", lat, lon, exc)
        return None

    daily = data.get("daily", {})
    cur = data.get("current", {})

    def first(key):
        arr = daily.get(key)
        return arr[0] if isinstance(arr, list) and arr else None

    return {
        "tmax": first("temperature_2m_max"),
        "tmin": first("temperature_2m_min"),
        "precip_sum": first("precipitation_sum"),
        "wind_max": first("wind_speed_10m_max"),
        "uv_max": first("uv_index_max"),
        "cur_temp": cur.get("temperature_2m"),
        "cur_wind": cur.get("wind_speed_10m"),
        "cur_precip": cur.get("precipitation"),
    }


def evaluate(ctx: Dict) -> List[Dict]:
    """Return the list of triggered alerts (one per rule that fires)."""
    triggered = []
    for rule in RULES:
        res = rule["fn"](ctx)
        if not res:
            continue
        severity, value, threshold = res
        title, message = rule["tpl"](value, threshold)
        triggered.append({
            "type": rule["type"], "emoji": rule["emoji"], "unit": rule["unit"],
            "metric": rule["metric"], "severity": severity,
            "value": round(float(value), 1), "threshold": float(threshold),
            "title": title, "message": message,
        })
    return triggered


# ── Per-farm check ───────────────────────────────────────────────────────────

def check_farm_weather_alerts(db: Session, farm: Farm, notify: bool = True) -> List[Dict]:
    """Evaluate one farm, persist + dispatch new alerts, auto-resolve cleared ones."""
    lat = float(farm.latitude or _DEFAULT_LAT)
    lon = float(farm.longitude or _DEFAULT_LON)

    ctx = _fetch_weather(lat, lon)
    if ctx is None:
        return []

    triggered = evaluate(ctx)
    triggered_types = {t["type"] for t in triggered}
    now = datetime.utcnow()
    created: List[Dict] = []

    # Auto-resolve unresolved alerts whose risk has cleared
    resolve_q = db.query(WeatherAlert).filter(
        WeatherAlert.farm_id == farm.id,
        WeatherAlert.is_resolved == False,                              # noqa: E712
    )
    if triggered_types:
        resolve_q = resolve_q.filter(~WeatherAlert.alert_type.in_(list(triggered_types)))
    for a in resolve_q.all():
        a.is_resolved = True
        a.resolved_at = now

    for t in triggered:
        # Dedup: skip if an unresolved same-type alert was raised recently
        recent = (
            db.query(WeatherAlert)
            .filter(WeatherAlert.farm_id == farm.id,
                    WeatherAlert.alert_type == t["type"],
                    WeatherAlert.is_resolved == False,                  # noqa: E712
                    WeatherAlert.created_at >= now - timedelta(hours=DEDUP_HOURS))
            .first()
        )
        if recent:
            continue

        alert = WeatherAlert(
            farm_id=farm.id, alert_type=t["type"], severity=t["severity"],
            title=t["title"], message=t["message"], emoji=t["emoji"],
            metric=t["metric"], value=t["value"], threshold=t["threshold"],
            unit=t["unit"], created_at=now,
        )
        db.add(alert)
        db.flush()                                             # get alert.id

        # Dispatch — email + WhatsApp + push + Telegram (best effort)
        if notify:
            try:
                res = notify_farm_alert(
                    db, farm.id, title=t["title"], message=t["message"],
                    target="all", sent_by="weather",
                )
                alert.email_sent = (res.get("email_sent", 0) or 0) > 0
                alert.notified_count = res.get("recipients", 0) or 0
            except Exception as exc:
                logger.warning("Weather alert dispatch failed (farm %s): %s", farm.id, exc)

        created.append({
            "id": alert.id, "farm_id": farm.id, "farm_name": farm.name,
            "type": t["type"], "severity": t["severity"], "title": t["title"],
            "message": t["message"], "emoji": t["emoji"], "value": t["value"],
            "threshold": t["threshold"], "unit": t["unit"],
            "email_sent": bool(alert.email_sent), "notified_count": alert.notified_count,
        })

    db.commit()
    return created


def run_weather_alert_check(db: Session, owner_id: Optional[int] = None, notify: bool = True) -> Dict:
    """Check every (optionally owner-scoped) farm with GPS coordinates."""
    q = db.query(Farm).filter(Farm.latitude.isnot(None), Farm.longitude.isnot(None))
    if owner_id is not None:
        q = q.filter(Farm.owner_id == owner_id)
    farms = q.all()

    all_created: List[Dict] = []
    for farm in farms:
        try:
            all_created.extend(check_farm_weather_alerts(db, farm, notify=notify))
        except Exception as exc:
            logger.warning("Weather alert check failed for farm %s: %s", farm.id, exc)
            db.rollback()

    emailed = sum(1 for a in all_created if a["email_sent"])
    logger.info("Weather alert check: %d farm(s), %d new alert(s), %d emailed",
                len(farms), len(all_created), emailed)
    return {
        "farms_checked": len(farms),
        "alerts_created": len(all_created),
        "emails_sent": emailed,
        "alerts": all_created,
    }
