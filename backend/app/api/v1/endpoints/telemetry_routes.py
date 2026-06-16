"""Smart Farm AI - Telemetry Routes"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.farm_guard import get_user_farm_ids
from app.models.domain import TelemetryRecord, AnimalUnit, AnimalType
from app.services.data_service import TelemetryService
from app.services import iot_dataset
from app.schemas.domain import TelemetryCreate

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

def _serialize(r):
    return {"id": r.id, "unit_id": r.unit_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "metrics": r.metrics, "source": r.source}


def _real_rows(db: Session, farm_ids: List[int], farm_id: Optional[int], limit: int = 100000):
    """Real telemetry joined with unit + species, scoped to the user's farms."""
    q = (db.query(TelemetryRecord, AnimalUnit, AnimalType)
           .join(AnimalUnit, TelemetryRecord.unit_id == AnimalUnit.id)
           .join(AnimalType, AnimalUnit.type_id == AnimalType.id))
    if farm_id and (not farm_ids or farm_id in farm_ids):
        q = q.filter(AnimalUnit.farm_id == farm_id)
    elif farm_ids:
        q = q.filter(AnimalUnit.farm_id.in_(farm_ids))
    q = q.order_by(TelemetryRecord.timestamp.desc()).limit(limit)
    rows = []
    for tr, u, t in q.all():
        rows.append({
            "timestamp": tr.timestamp.isoformat() if tr.timestamp else "",
            "unit_id": tr.unit_id,
            "unit_name": u.name,
            "unit_type": t.display_name or t.species or "",
            "source": tr.source,
            "metrics": tr.metrics,
        })
    return rows

@router.get("/{unit_id}")
def get_history(
    unit_id: int,
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    records = TelemetryService(db).get_history(unit_id, limit=limit)
    return [_serialize(r) for r in records]

@router.get("/{unit_id}/latest")
def get_latest(unit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return TelemetryService(db).get_latest(unit_id)

@router.post("", status_code=201)
def ingest(data: TelemetryCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    r = TelemetryService(db).ingest(data)
    return _serialize(r)


# ── Dataset export (fine-tuning) ──────────────────────────────────────────────

@router.get("/export/info")
def export_info(
    farm_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    """How many examples the fine-tuning export would contain (real + rules)."""
    rows = _real_rows(db, farm_ids, farm_id)
    total = len(iot_dataset.build_jsonl_examples(rows))
    return {
        "real_records": len(rows),
        "rule_examples": total - len(rows),
        "total_examples": total,
        "formats": ["jsonl", "csv"],
    }


@router.get("/export/dataset")
def export_dataset(
    format: str = Query("jsonl", pattern="^(jsonl|csv)$"),
    farm_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    """Download the IoT dataset for fine-tuning Smart Farm AI.

    - ``jsonl`` → chat instruction dataset (documented irrigation / safety /
      beehive rules + any real telemetry) — ready for LLM fine-tuning.
    - ``csv``   → flat raw telemetry table — for classic ML (anomaly / forecast).
    """
    rows = _real_rows(db, farm_ids, farm_id)
    if format == "csv":
        content = iot_dataset.telemetry_to_csv(rows)
        filename, media = "smartfarm_telemetry.csv", "text/csv; charset=utf-8"
        count = len(rows)
    else:
        examples = iot_dataset.build_jsonl_examples(rows)
        content = iot_dataset.to_jsonl(examples)
        filename, media = "smartfarm_finetune.jsonl", "application/x-ndjson; charset=utf-8"
        count = len(examples)
    return Response(
        content=content.encode("utf-8"),
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Example-Count": str(count),
        },
    )
