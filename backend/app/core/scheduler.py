"""
APScheduler — tâches automatiques de la plateforme.
Lancé dans le lifespan de main.py.

Jobs :
  1. check_drift_and_retrain   — toutes les 6h  : détection drift PSI → ré-entraînement si nécessaire
  2. cleanup_audit_logs         — tous les jours : purge logs > 90 jours
  3. expire_plans               — toutes les heures : désactiver plans expirés
  4. send_daily_health_push     — chaque matin 7h : push récap santé aux owners actifs
  5. send_crop_calendar_alerts  — chaque matin 6h : alertes calendrier agricole tunisien
                                  (gel critique quotidien + digest mensuel le 1er du mois)
  6. scan_telemetry_anomalies   — toutes les heures : IsolationForest sur la télémétrie
                                  → lignes Anomaly (+ notification si critique)
  7. snapshot_market_prices     — chaque jour 5h : snapshot des prix agricoles
                                  → historique réel pour la prévision SARIMA
"""
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

_scheduler = None


def get_scheduler():
    global _scheduler
    if _scheduler is None:
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            _scheduler = BackgroundScheduler(timezone="UTC", daemon=True)
        except ImportError:
            logger.warning("apscheduler not installed — scheduled jobs disabled")
    return _scheduler


# ── Job 1 : Drift check + auto-retrain ───────────────────────────────────────

def check_drift_and_retrain():
    """Check PSI drift for each farm and trigger retraining when threshold exceeded."""
    try:
        from app.core.config import settings
        from app.core.database import SessionLocal
        from app.models.domain import Farm
        from app.services.drift_detection_service import compute_psi

        db = SessionLocal()
        try:
            farms = db.query(Farm).filter(Farm.status == "active").all()
            for farm in farms:
                try:
                    result = compute_psi(db, farm.id)
                    if result and result.get("psi", 0) > settings.PSI_CRITICAL:
                        logger.warning(
                            "Farm %s drift PSI=%.3f > %.3f — triggering retrain",
                            farm.id, result["psi"], settings.PSI_CRITICAL,
                        )
                        _trigger_retrain(farm.id)
                except Exception as e:
                    logger.debug("Drift check farm %s: %s", farm.id, e)
        finally:
            db.close()
    except Exception as e:
        logger.error("check_drift_and_retrain error: %s", e)


def _trigger_retrain(farm_id: int):
    """Log a retrain trigger — hook for future pipeline (DVC/MLflow run)."""
    logger.info("RETRAIN TRIGGERED for farm_id=%s at %s", farm_id, datetime.now(timezone.utc).isoformat())


# ── Job 2 : Cleanup audit logs > 90 days ─────────────────────────────────────

def cleanup_audit_logs():
    try:
        from app.core.database import SessionLocal
        from app.models.domain import AuditLog

        cutoff = datetime.now(timezone.utc) - timedelta(days=90)
        db = SessionLocal()
        try:
            deleted = db.query(AuditLog).filter(AuditLog.created_at < cutoff).delete()
            db.commit()
            if deleted:
                logger.info("Audit cleanup: deleted %d logs older than 90 days", deleted)
        finally:
            db.close()
    except Exception as e:
        logger.error("cleanup_audit_logs error: %s", e)


# ── Job 3 : Expire plans ──────────────────────────────────────────────────────

def expire_plans():
    try:
        from app.core.database import SessionLocal
        from app.models.domain import User

        now = datetime.now(timezone.utc)
        db = SessionLocal()
        try:
            expired = db.query(User).filter(
                User.plan_expires_at.isnot(None),
                User.plan_expires_at < now,
                User.plan != "free",
            ).all()
            for u in expired:
                logger.info("Plan expired for user %s (%s → free)", u.username, u.plan)
                u.plan = "free"
                u.plan_expires_at = None
            if expired:
                db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.error("expire_plans error: %s", e)


# ── Job 4 : Daily health push (7h UTC) ───────────────────────────────────────

def send_daily_health_push():
    try:
        from app.core.database import SessionLocal
        from app.models.domain import User
        from app.services.push_service import send_to_user

        db = SessionLocal()
        try:
            owners = db.query(User).filter(User.role == "owner", User.is_active.is_(True)).all()
            for owner in owners:
                send_to_user(
                    db, owner.id,
                    "Smart Farm AI — Récap du jour",
                    "Consultez l'état de vos fermes et alertes du matin.",
                    {"action": "open_dashboard"},
                )
        finally:
            db.close()
    except Exception as e:
        logger.error("send_daily_health_push error: %s", e)


# ── Job 5 : Crop calendar alerts (6h UTC) ────────────────────────────────────

_MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
              "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]


def _zone_from_latitude(lat: float) -> str:
    """Même découpage agroclimatique que /calendar/alerts/{farm_id}."""
    if lat > 36.5:
        return "nord"
    if lat > 34.5:
        return "centre"
    if lat > 33.0:
        return "cotier"
    return "sud"


def _current_temperature(lat: float, lon: float):
    """Température actuelle Open-Meteo (None si indisponible)."""
    try:
        import httpx
        resp = httpx.get(
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m&timezone=Africa%2FTunis",
            timeout=5,
        )
        return resp.json().get("current", {}).get("temperature_2m")
    except Exception:
        return None


def send_crop_calendar_alerts():
    """Notifie chaque ferme active (owner + ouvriers, WhatsApp + push) :
    - alertes gel tardif critiques → tous les jours
    - risques maladie météo-pilotés critiques → tous les jours (élevés → le lundi)
    - digest mensuel des actions/traitements du calendrier → le 1er du mois
    """
    try:
        import asyncio

        from app.core.database import SessionLocal
        from app.models.domain import Farm
        from app.services.agro_climate_service import get_farm_disease_risks
        from app.services.alert_notify_service import notify_farm_alert
        from app.services.crop_calendar_service import get_phenological_alerts

        today = datetime.now(timezone.utc)
        is_month_start = today.day == 1
        is_monday = today.weekday() == 0

        db = SessionLocal()
        try:
            farms = db.query(Farm).filter(Farm.status == "active", Farm.owner_id != None).all()  # noqa: E711
            for farm in farms:
                try:
                    lat = float(farm.latitude or 36.8)
                    lon = float(farm.longitude or 10.1)
                    zone = _zone_from_latitude(lat)
                    temperature = _current_temperature(lat, lon)
                    alerts = get_phenological_alerts(zone=zone, lat=lat, temperature=temperature)

                    # 1) Gel tardif — envoi immédiat tous les jours
                    criticals = [a for a in alerts if a.get("severity") == "critical"]
                    for a in criticals:
                        notify_farm_alert(
                            db, farm.id,
                            title=f"Gel tardif — {a['culture'].title()}",
                            message=f"{a['message']}\n⚡ {a.get('action_immediate', '')}",
                            target="all", sent_by="crop_calendar",
                        )

                    # 2) Risques maladie météo-pilotés (règle 3-10, DJ mouche olive…)
                    try:
                        risk_data = asyncio.run(get_farm_disease_risks(lat, lon))
                        for r in risk_data.get("risks", []):
                            urgent = r["niveau"] == "critical" or (r["niveau"] == "high" and is_monday)
                            if urgent:
                                notify_farm_alert(
                                    db, farm.id,
                                    title=f"Risque {r['maladie']} — {r['score']}%",
                                    message=f"{r['justification']}\n💊 {r['recommandation']}",
                                    target="all", sent_by="disease_risk",
                                )
                    except Exception as e:
                        logger.debug("Disease risk farm %s: %s", farm.id, e)

                    # 3) Digest mensuel — le 1er du mois uniquement
                    if is_month_start:
                        infos = [a for a in alerts if a.get("severity") == "info"]
                        if infos:
                            lines = []
                            for a in infos[:10]:
                                line = f"• {a['message']}"
                                for tr in a.get("traitements", []):
                                    line += f"\n   💊 {tr['traitement']} → {tr['cible']}"
                                lines.append(line)
                            notify_farm_alert(
                                db, farm.id,
                                title=f"Calendrier agricole — {_MONTHS_FR[today.month - 1]} (zone {zone})",
                                message="\n".join(lines),
                                target="all", sent_by="crop_calendar",
                            )
                except Exception as e:
                    logger.warning("Crop calendar alerts farm %s: %s", farm.id, e)
        finally:
            db.close()
    except Exception as e:
        logger.error("send_crop_calendar_alerts error: %s", e)


# ── Job 6 : IsolationForest sur la télémétrie (toutes les heures) ────────────

def scan_telemetry_anomalies():
    """Scan IsolationForest de la télémétrie récente de chaque unité.
    Les anomalies créées alimentent /anomalies/recent et le Moniteur Souverain ;
    les critiques déclenchent une notification ferme (WhatsApp + push)."""
    try:
        from app.core.database import SessionLocal
        from app.models.domain import AnimalUnit
        from app.services.alert_notify_service import notify_farm_alert
        from app.services.anomaly_ml_service import scan_all_units

        db = SessionLocal()
        try:
            found = scan_all_units(db)
            for a in found:
                if a["severity"] != "critical":
                    continue
                unit = db.query(AnimalUnit).filter(AnimalUnit.id == a["unit_id"]).first()
                if not unit or not unit.farm_id:
                    continue
                top = ", ".join(f"{k} (z={v})" for k, v in list(a["top_features"].items())[:3])
                notify_farm_alert(
                    db, unit.farm_id,
                    title=f"Anomalie capteurs — {unit.name or f'unité {unit.id}'}",
                    message=f"Profil télémétrique anormal détecté (Isolation Forest, "
                            f"score {a['isolation_score']}).\nMétriques déviantes : {top}",
                    target="all", sent_by="isolation_forest",
                )
            if found:
                logger.info("IsolationForest scan: %d anomalie(s) détectée(s)", len(found))
        finally:
            db.close()
    except Exception as e:
        logger.error("scan_telemetry_anomalies error: %s", e)


# ── Job 7 : Snapshot quotidien des prix agricoles (5h UTC) ──────────────────

def snapshot_market_prices():
    """Alimente l'historique de prix réel (price_history.json) — la prévision
    SARIMA s'active automatiquement après 14 snapshots."""
    try:
        from app.services.price_history_service import snapshot_daily_prices
        snapshot_daily_prices()
    except Exception as e:
        logger.error("snapshot_market_prices error: %s", e)


# ── Start / Stop ──────────────────────────────────────────────────────────────

def start_scheduler():
    sched = get_scheduler()
    if sched is None:
        return

    try:
        from apscheduler.triggers.cron import CronTrigger
        from apscheduler.triggers.interval import IntervalTrigger

        sched.add_job(check_drift_and_retrain, IntervalTrigger(hours=6),  id="drift_check",   replace_existing=True)
        sched.add_job(cleanup_audit_logs,      CronTrigger(hour=3, minute=0), id="audit_cleanup", replace_existing=True)
        sched.add_job(expire_plans,            IntervalTrigger(hours=1),  id="expire_plans",  replace_existing=True)
        sched.add_job(send_daily_health_push,  CronTrigger(hour=7, minute=0), id="daily_push",    replace_existing=True)
        sched.add_job(send_crop_calendar_alerts, CronTrigger(hour=6, minute=0), id="crop_calendar_alerts", replace_existing=True)
        sched.add_job(scan_telemetry_anomalies,  IntervalTrigger(hours=1), id="anomaly_if_scan", replace_existing=True)
        sched.add_job(snapshot_market_prices,    CronTrigger(hour=5, minute=0), id="price_snapshot", replace_existing=True)

        sched.start()
        logger.info("APScheduler started — 7 jobs registered")
    except Exception as e:
        logger.error("Scheduler start failed: %s", e)


def stop_scheduler():
    sched = get_scheduler()
    if sched and sched.running:
        sched.shutdown(wait=False)
        logger.info("APScheduler stopped")
