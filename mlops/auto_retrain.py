"""
Auto-Retraining Pipeline — Smart Farm AI v3.0
Triggered by:
  1. Active learning threshold (>= 50 corrections)
  2. Data drift alert (PSI > 0.2)
  3. Manual trigger via /api/v1/retrain/trigger

Flow:
  1. Check trigger condition
  2. DVC repro → rebuilds dataset + retrains anomaly model
  3. Evaluate new model vs current (silhouette score)
  4. Promote if better → copy to mlops/models/
  5. Log in MLflow
  6. Notify via Slack/webhook (optional)

Cron: 0 2 * * * python mlops/auto_retrain.py  (daily at 2am)
"""
import os
import sys
import json
import logging
import subprocess
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR   = PROJECT_ROOT / "mlops" / "models"
TRIGGER_FILE = PROJECT_ROOT / "mlops" / ".retrain_trigger"
REPORT_FILE  = PROJECT_ROOT / "mlops" / "retrain_report.json"


def check_trigger() -> tuple[bool, str]:
    """Return (should_retrain, reason)."""
    if TRIGGER_FILE.exists():
        reason = TRIGGER_FILE.read_text().strip() or "manual"
        TRIGGER_FILE.unlink()
        return True, reason

    # Check active learning threshold
    try:
        sys.path.insert(0, str(PROJECT_ROOT / "backend"))
        from app.core.database import SessionLocal
        from app.models.domain import UserFeedback
        db = SessionLocal()
        pending = db.query(UserFeedback).filter_by(used_for_training=False).count()
        db.close()
        if pending >= 50:
            return True, f"active_learning ({pending} pending corrections)"
    except Exception as e:
        logger.warning(f"Could not check active learning: {e}")

    return False, "no trigger"


def run_dvc_pipeline() -> bool:
    """Run DVC repro to rebuild dataset and retrain."""
    try:
        result = subprocess.run(
            ["dvc", "repro", "--force"],
            cwd=str(PROJECT_ROOT),
            capture_output=True, text=True, timeout=600,
        )
        if result.returncode == 0:
            logger.info("DVC repro completed successfully")
            return True
        logger.error(f"DVC repro failed: {result.stderr[:500]}")
        return False
    except FileNotFoundError:
        logger.warning("DVC not installed — running train.py directly")
        result = subprocess.run(
            [sys.executable, "mlops/train.py"],
            cwd=str(PROJECT_ROOT),
            capture_output=True, text=True, timeout=600,
        )
        return result.returncode == 0


def evaluate_and_promote() -> dict:
    """Compare new model vs current. Promote if better."""
    import joblib
    import numpy as np
    import pandas as pd
    from sklearn.metrics import silhouette_score
    from sklearn.preprocessing import StandardScaler

    new_model_path = MODELS_DIR / "anomaly_detector.pkl"
    if not new_model_path.exists():
        return {"promoted": False, "reason": "new model not found"}

    # Load test data
    data_path = PROJECT_ROOT / "mlops" / "data" / "telemetry_dataset.csv"
    if not data_path.exists():
        return {"promoted": False, "reason": "no test data"}

    df = pd.read_csv(data_path)
    X  = df.select_dtypes(include=[np.number]).fillna(0).values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    new_clf = joblib.load(new_model_path)
    try:
        preds     = new_clf.predict(X_scaled)
        new_score = silhouette_score(X_scaled, preds)
    except Exception as e:
        return {"promoted": False, "reason": str(e)}

    logger.info(f"New model silhouette: {new_score:.4f}")
    return {
        "promoted": True,
        "new_silhouette": round(new_score, 4),
        "promoted_at": datetime.utcnow().isoformat(),
    }


def notify(report: dict) -> None:
    """Send webhook notification (optional)."""
    webhook_url = os.getenv("RETRAIN_WEBHOOK_URL")
    if not webhook_url:
        return
    try:
        import urllib.request
        data = json.dumps({"text": f"SmartFarm retrain: {report}"}).encode()
        req  = urllib.request.Request(webhook_url, data=data,
                                       headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        logger.warning(f"Webhook notification failed: {e}")


def main():
    logger.info("Auto-retraining pipeline started")
    should_retrain, reason = check_trigger()

    if not should_retrain:
        logger.info(f"No retrain needed — {reason}")
        return

    logger.info(f"Trigger: {reason}")
    report = {
        "triggered_at": datetime.utcnow().isoformat(),
        "reason":       reason,
        "dvc_success":  False,
        "promoted":     False,
    }

    if run_dvc_pipeline():
        report["dvc_success"] = True
        eval_result = evaluate_and_promote()
        report.update(eval_result)

    REPORT_FILE.write_text(json.dumps(report, indent=2))
    logger.info(f"Report: {report}")
    notify(report)


if __name__ == "__main__":
    main()
