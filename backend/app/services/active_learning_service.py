"""
Active Learning Service — Smart Farm AI v3.0
=============================================
Collecte les corrections des utilisateurs sur les détections YOLO,
déclenche le ré-entraînement quand suffisamment de corrections sont accumulées.

Pipeline :
  1. Utilisateur corrige un label → POST /cv/feedback
  2. Correction sauvée dans MLFeedback (used_for_training=False)
  3. Quand ≥ RETRAIN_THRESHOLD corrections non utilisées → trigger DVC repro
  4. Notification WebSocket + MLFeedback.used_for_training = True
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import subprocess
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Seuil de corrections avant déclenchement retrain — configurable via env
RETRAIN_THRESHOLD = int(os.getenv("RETRAIN_THRESHOLD", "50"))

# Chemin racine du projet — compatible local et Docker (/app/app/services/...)
# Remonte jusqu'à trouver dvc.yaml (marker du projet root)
def _find_project_root() -> Path:
    p = Path(__file__).resolve()
    for parent in p.parents:
        if (parent / "dvc.yaml").exists():
            return parent
    # Fallback: 3 niveaux au-dessus de services/ (fonctionne en Docker /app)
    return p.parents[min(3, len(p.parents) - 1)]

PROJECT_ROOT = _find_project_root()


def get_pending_count(db) -> int:
    """Retourne le nombre de corrections non encore utilisées pour l'entraînement."""
    from app.models.domain import MLFeedback
    return db.query(MLFeedback).filter(MLFeedback.used_for_training == False).count()  # noqa: E712


def get_feedback_stats(db) -> dict[str, Any]:
    """Statistiques globales des corrections soumises."""
    from app.models.domain import MLFeedback

    total = db.query(MLFeedback).count()
    pending = db.query(MLFeedback).filter(MLFeedback.used_for_training == False).count()  # noqa: E712
    used = total - pending

    # Distribution par classe corrigée
    rows = db.query(MLFeedback.corrected_label).all()
    label_distribution = dict(Counter(r[0] for r in rows))

    # Distribution par catégorie
    cat_rows = db.query(MLFeedback.category).all()
    category_distribution = dict(Counter(r[0] for r in cat_rows if r[0]))

    # Corrections récentes (7 dernières)
    recent = (
        db.query(MLFeedback)
        .order_by(MLFeedback.timestamp.desc())
        .limit(7)
        .all()
    )
    recent_list = [
        {
            "id": f.id,
            "original_label": f.original_label,
            "corrected_label": f.corrected_label,
            "category": f.category,
            "timestamp": f.timestamp.isoformat() if f.timestamp else None,
        }
        for f in recent
    ]

    return {
        "total_corrections": total,
        "pending": pending,
        "pending_for_training": pending,
        "used_for_training": used,
        "retrain_threshold": RETRAIN_THRESHOLD,
        "retrain_ready": pending >= RETRAIN_THRESHOLD,
        "distribution": label_distribution,
        "label_distribution": label_distribution,
        "category_distribution": category_distribution,
        "recent_corrections": recent_list,
    }


def submit_feedback(
    db,
    cv_event_id: int | None,
    original_label: str,
    corrected_label: str,
    user_id: int | None = None,
    category: str | None = None,
    confidence_original: float | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    """Sauvegarde une correction et vérifie si le seuil de retrain est atteint."""
    from app.models.domain import MLFeedback

    feedback = MLFeedback(
        cv_event_id=cv_event_id,
        original_label=original_label,
        corrected_label=corrected_label,
        user_id=user_id,
        category=category,
        confidence_original=confidence_original,
        notes=notes,
        timestamp=datetime.utcnow(),
        used_for_training=False,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    pending = get_pending_count(db)
    return {
        "id": feedback.id,
        "status": "accepted",
        "feedback_id": feedback.id,
        "pending_for_training": pending,
        "retrain_threshold": RETRAIN_THRESHOLD,
        "retrain_ready": pending >= RETRAIN_THRESHOLD,
        "message": (
            f"Correction enregistrée. {pending}/{RETRAIN_THRESHOLD} corrections en attente."
            if pending < RETRAIN_THRESHOLD
            else "Seuil atteint — retrain disponible !"
        ),
    }


async def trigger_retrain(db, socket_manager=None) -> dict[str, Any]:
    """
    Déclenche DVC repro en arrière-plan si le seuil est atteint.
    Notifie via WebSocket.
    """
    from app.models.domain import MLFeedback

    pending = get_pending_count(db)
    if pending < RETRAIN_THRESHOLD:
        return {
            "status": "skipped",
            "reason": f"Seuil non atteint ({pending}/{RETRAIN_THRESHOLD})",
        }

    # Marquer toutes les corrections en attente comme utilisées
    db.query(MLFeedback).filter(
        MLFeedback.used_for_training == False  # noqa: E712
    ).update({"used_for_training": True})
    db.commit()

    # Notifier via WebSocket
    if socket_manager:
        try:
            await socket_manager.broadcast_global({
                "type": "retrain_started",
                "message": f"Ré-entraînement déclenché avec {pending} nouvelles corrections",
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception:
            pass

    # Lancer DVC en background (non-bloquant)
    asyncio.create_task(_run_dvc_repro())

    return {
        "status": "triggered",
        "corrections_used": pending,
        "message": "Ré-entraînement DVC lancé en arrière-plan",
        "timestamp": datetime.utcnow().isoformat(),
    }


async def _run_dvc_repro():
    """Lance dvc repro de façon asynchrone et persiste le résultat."""
    report: dict[str, Any] = {"started_at": datetime.utcnow().isoformat(), "success": False}
    try:
        logger.info("Starting DVC repro pipeline...")
        proc = await asyncio.create_subprocess_exec(
            "dvc", "repro",
            cwd=str(PROJECT_ROOT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            logger.info("DVC repro completed successfully")
            report["success"] = True
        else:
            err = stderr.decode()
            logger.error("DVC repro failed: %s", err)
            report["error"] = err[:500]
    except Exception as exc:
        logger.error("DVC retrain trigger failed: %s", exc)
        report["error"] = str(exc)
    finally:
        report["finished_at"] = datetime.utcnow().isoformat()
        try:
            report_file = PROJECT_ROOT / "mlops" / "retrain_report.json"
            report_file.parent.mkdir(parents=True, exist_ok=True)
            report_file.write_text(json.dumps(report, indent=2))
        except Exception:
            pass
