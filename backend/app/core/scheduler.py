"""
APScheduler — tâches automatiques de la plateforme.
Lancé dans le lifespan de main.py.

Jobs :
  1. check_drift_and_retrain   — toutes les 6h  : détection drift PSI → ré-entraînement si nécessaire
  2. cleanup_audit_logs         — tous les jours : purge logs > 90 jours
  3. expire_plans               — toutes les heures : désactiver plans expirés
  4. send_daily_health_push     — chaque matin 7h : push récap santé aux owners actifs
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
        from app.core.database import SessionLocal
        from app.core.config import settings
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
                User.plan_expires_at != None,
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
            owners = db.query(User).filter(User.role == "owner", User.is_active == True).all()
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

        sched.start()
        logger.info("APScheduler started — 4 jobs registered")
    except Exception as e:
        logger.error("Scheduler start failed: %s", e)


def stop_scheduler():
    sched = get_scheduler()
    if sched and sched.running:
        sched.shutdown(wait=False)
        logger.info("APScheduler stopped")
