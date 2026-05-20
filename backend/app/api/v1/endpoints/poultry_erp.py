from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import (
    PoultryBatch, PoultryFeedLog, PoultryEggLog,
    PoultryHealthLog, PoultrySale, PoultryInventory
)
from app.schemas.domain import (
    PoultryBatchCreate, PoultryBatchResponse, PoultryBatchUpdate,
    PoultryFeedLogCreate, PoultryFeedLogResponse, PoultryFeedLogUpdate,
    PoultryEggLogCreate, PoultryEggLogResponse, PoultryEggLogUpdate,
    PoultryHealthLogCreate, PoultryHealthLogResponse, PoultryHealthLogUpdate,
    PoultrySaleCreate, PoultrySaleResponse, PoultrySaleUpdate,
    PoultryInventoryCreate, PoultryInventoryResponse, PoultryInventoryUpdate,
    PoultryLogValidation
)
from datetime import datetime
from app.services.poultry_ml_service import generate_ml_insights

router = APIRouter(dependencies=[Depends(get_current_user)])

# ── BATCHES ──────────────────────────────────────────────────────────────────

@router.post("/batches", response_model=PoultryBatchResponse)
def create_batch(obj_in: PoultryBatchCreate, db: Session = Depends(get_db)):
    db_obj = PoultryBatch(**obj_in.model_dump())
    db_obj.current_quantity = obj_in.initial_quantity
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/batches", response_model=List[PoultryBatchResponse])
def get_batches(farm_id: int, db: Session = Depends(get_db)):
    return db.query(PoultryBatch).filter(PoultryBatch.farm_id == farm_id).all()

@router.patch("/batches/{batch_id}", response_model=PoultryBatchResponse)
def update_batch(batch_id: int, obj_in: PoultryBatchUpdate, db: Session = Depends(get_db)):
    batch = db.query(PoultryBatch).filter(PoultryBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    for field, value in obj_in.model_dump(exclude_unset=True).items():
        setattr(batch, field, value)
    db.commit()
    db.refresh(batch)
    return batch

# ── FEED LOGS ────────────────────────────────────────────────────────────────

@router.post("/feed-logs", response_model=PoultryFeedLogResponse)
def create_feed_log(
    obj_in: PoultryFeedLogCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_obj = PoultryFeedLog(**obj_in.model_dump())
    db_obj.created_by_id = current_user.id
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/batches/{batch_id}/feed-logs", response_model=List[PoultryFeedLogResponse])
def get_batch_feed_logs(batch_id: int, db: Session = Depends(get_db)):
    return db.query(PoultryFeedLog).filter(PoultryFeedLog.batch_id == batch_id).order_by(PoultryFeedLog.date).all()

@router.get("/batches/{batch_id}/egg-logs", response_model=List[PoultryEggLogResponse])
def get_batch_egg_logs(batch_id: int, db: Session = Depends(get_db)):
    return db.query(PoultryEggLog).filter(PoultryEggLog.batch_id == batch_id).order_by(PoultryEggLog.date).all()

@router.get("/batches/{batch_id}/health-logs", response_model=List[PoultryHealthLogResponse])
def get_batch_health_logs(batch_id: int, db: Session = Depends(get_db)):
    return db.query(PoultryHealthLog).filter(PoultryHealthLog.batch_id == batch_id).order_by(PoultryHealthLog.date).all()

@router.get("/batches/{batch_id}/sales", response_model=List[PoultrySaleResponse])
def get_batch_sales(batch_id: int, db: Session = Depends(get_db)):
    return db.query(PoultrySale).filter(PoultrySale.batch_id == batch_id).order_by(PoultrySale.date).all()

# ── EGG PRODUCTION ───────────────────────────────────────────────────────────

@router.post("/egg-logs", response_model=PoultryEggLogResponse)
def create_egg_log(
    obj_in: PoultryEggLogCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_obj = PoultryEggLog(**obj_in.model_dump())
    db_obj.created_by_id = current_user.id
    batch = db.query(PoultryBatch).filter(PoultryBatch.id == obj_in.batch_id).first()
    if batch and batch.current_quantity and batch.current_quantity > 0:
        db_obj.production_rate = (obj_in.total_eggs / batch.current_quantity) * 100
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# ── HEALTH ───────────────────────────────────────────────────────────────────

@router.post("/health-logs", response_model=PoultryHealthLogResponse)
def create_health_log(
    obj_in: PoultryHealthLogCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_obj = PoultryHealthLog(**obj_in.model_dump())
    db_obj.created_by_id = current_user.id
    if obj_in.deaths_today and obj_in.deaths_today > 0:
        batch = db.query(PoultryBatch).filter(PoultryBatch.id == obj_in.batch_id).first()
        if batch and batch.current_quantity is not None:
            if obj_in.deaths_today > batch.current_quantity:
                raise HTTPException(
                    status_code=422,
                    detail=f"Impossible: {obj_in.deaths_today} décès déclarés pour un effectif de {batch.current_quantity} animaux."
                )
            batch.current_quantity = max(0, batch.current_quantity - obj_in.deaths_today)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# ── SALES ────────────────────────────────────────────────────────────────────

@router.post("/sales", response_model=PoultrySaleResponse)
def create_sale(
    obj_in: PoultrySaleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_obj = PoultrySale(**obj_in.model_dump())
    db_obj.created_by_id = current_user.id
    if obj_in.product_type and obj_in.product_type.lower() in ["volailles vives", "live birds", "poulets"]:
        batch = db.query(PoultryBatch).filter(PoultryBatch.id == obj_in.batch_id).first()
        if batch and batch.current_quantity is not None:
            if obj_in.quantity > batch.current_quantity:
                raise HTTPException(
                    status_code=422,
                    detail=f"Vente impossible: {obj_in.quantity} demandés, effectif disponible: {batch.current_quantity}."
                )
            batch.current_quantity = max(0, batch.current_quantity - obj_in.quantity)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# ── INVENTORY ────────────────────────────────────────────────────────────────

@router.post("/inventory", response_model=PoultryInventoryResponse)
def create_inventory_item(obj_in: PoultryInventoryCreate, db: Session = Depends(get_db)):
    db_obj = PoultryInventory(**obj_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.get("/inventory", response_model=List[PoultryInventoryResponse])
def get_inventory(farm_id: int, db: Session = Depends(get_db)):
    return db.query(PoultryInventory).filter(PoultryInventory.farm_id == farm_id).all()

@router.patch("/inventory/{item_id}", response_model=PoultryInventoryResponse)
def update_inventory_item(item_id: int, obj_in: PoultryInventoryUpdate, db: Session = Depends(get_db)):
    item = db.query(PoultryInventory).filter(PoultryInventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in obj_in.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/inventory/{item_id}")
def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(PoultryInventory).filter(PoultryInventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}

# ── CRUD: DELETE & PATCH for logs/sales ─────────────────────────────────────

@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(PoultryBatch).filter(PoultryBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    db.delete(batch)
    db.commit()
    return {"ok": True}

@router.patch("/feed-logs/{log_id}", response_model=PoultryFeedLogResponse)
def update_feed_log(log_id: int, obj_in: PoultryFeedLogUpdate, db: Session = Depends(get_db)):
    log = db.query(PoultryFeedLog).filter(PoultryFeedLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Feed log not found")
    for field, value in obj_in.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log

@router.delete("/feed-logs/{log_id}")
def delete_feed_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(PoultryFeedLog).filter(PoultryFeedLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Feed log not found")
    db.delete(log)
    db.commit()
    return {"ok": True}

@router.patch("/egg-logs/{log_id}", response_model=PoultryEggLogResponse)
def update_egg_log(log_id: int, obj_in: PoultryEggLogUpdate, db: Session = Depends(get_db)):
    log = db.query(PoultryEggLog).filter(PoultryEggLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Egg log not found")
    for field, value in obj_in.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log

@router.delete("/egg-logs/{log_id}")
def delete_egg_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(PoultryEggLog).filter(PoultryEggLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Egg log not found")
    db.delete(log)
    db.commit()
    return {"ok": True}

@router.patch("/health-logs/{log_id}", response_model=PoultryHealthLogResponse)
def update_health_log(log_id: int, obj_in: PoultryHealthLogUpdate, db: Session = Depends(get_db)):
    log = db.query(PoultryHealthLog).filter(PoultryHealthLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Health log not found")
    for field, value in obj_in.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log

@router.delete("/health-logs/{log_id}")
def delete_health_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(PoultryHealthLog).filter(PoultryHealthLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Health log not found")
    if log.deaths_today and log.deaths_today > 0:
        batch = db.query(PoultryBatch).filter(PoultryBatch.id == log.batch_id).first()
        if batch:
            batch.current_quantity = (batch.current_quantity or 0) + log.deaths_today
    db.delete(log)
    db.commit()
    return {"ok": True}

@router.patch("/sales/{sale_id}", response_model=PoultrySaleResponse)
def update_sale(sale_id: int, obj_in: PoultrySaleUpdate, db: Session = Depends(get_db)):
    sale = db.query(PoultrySale).filter(PoultrySale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    for field, value in obj_in.model_dump(exclude_unset=True).items():
        setattr(sale, field, value)
    db.commit()
    db.refresh(sale)
    return sale

@router.delete("/sales/{sale_id}")
def delete_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = db.query(PoultrySale).filter(PoultrySale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if sale.product_type and sale.product_type.lower() in ["live birds", "volailles vives", "poulets"]:
        batch = db.query(PoultryBatch).filter(PoultryBatch.id == sale.batch_id).first()
        if batch:
            batch.current_quantity = (batch.current_quantity or 0) + sale.quantity
    db.delete(sale)
    db.commit()
    return {"ok": True}

# ── P&L PER BATCH ─────────────────────────────────────────────────────────────

@router.get("/batches/{batch_id}/pnl")
def get_batch_pnl(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(PoultryBatch).filter(PoultryBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    feed_logs    = db.query(PoultryFeedLog).filter(PoultryFeedLog.batch_id == batch_id).all()
    health_logs  = db.query(PoultryHealthLog).filter(PoultryHealthLog.batch_id == batch_id).all()
    sales        = db.query(PoultrySale).filter(PoultrySale.batch_id == batch_id).all()

    total_feed_cost   = sum((l.quantity_kg or 0) * (l.cost_per_kg or 0) for l in feed_logs)
    total_health_cost = sum(l.cost or 0 for l in health_logs)
    total_revenue     = sum(s.total_amount or 0 for s in sales)
    total_costs       = total_feed_cost + total_health_cost
    margin            = total_revenue - total_costs
    margin_pct        = (margin / total_revenue * 100) if total_revenue > 0 else 0.0

    total_deaths   = sum(l.deaths_today or 0 for l in health_logs)
    mortality_rate = (total_deaths / batch.initial_quantity * 100) if batch.initial_quantity else 0.0

    valid_fcr = [l.fcr_calculated for l in feed_logs if l.fcr_calculated]
    avg_fcr   = sum(valid_fcr) / len(valid_fcr) if valid_fcr else None

    return {
        "batch_id":           batch_id,
        "total_feed_cost":    round(total_feed_cost, 2),
        "total_health_cost":  round(total_health_cost, 2),
        "total_costs":        round(total_costs, 2),
        "total_revenue":      round(total_revenue, 2),
        "margin":             round(margin, 2),
        "margin_pct":         round(margin_pct, 1),
        "mortality_rate":     round(mortality_rate, 1),
        "avg_fcr":            round(avg_fcr, 2) if avg_fcr is not None else None,
    }

# ── FARM STATS ────────────────────────────────────────────────────────────────

@router.get("/stats/farm/{farm_id}")
def get_farm_poultry_stats(farm_id: int, db: Session = Depends(get_db)):
    batches   = db.query(PoultryBatch).filter(PoultryBatch.farm_id == farm_id).all()
    active    = [b for b in batches if b.status == 'active']
    batch_ids = [b.id for b in batches]

    today_str    = datetime.utcnow().strftime("%Y-%m-%d")
    egg_logs     = db.query(PoultryEggLog).filter(PoultryEggLog.batch_id.in_(batch_ids)).all()
    health_logs  = db.query(PoultryHealthLog).filter(PoultryHealthLog.batch_id.in_(batch_ids)).all()
    feed_logs    = db.query(PoultryFeedLog).filter(PoultryFeedLog.batch_id.in_(batch_ids)).all()

    total_birds   = sum(b.current_quantity or 0 for b in active)
    eggs_today    = sum(l.total_eggs for l in egg_logs if l.date and str(l.date)[:10] == today_str)
    total_deaths  = sum(l.deaths_today or 0 for l in health_logs)
    total_initial = sum(b.initial_quantity or 0 for b in batches)
    mortality_rate = round(total_deaths / total_initial * 100, 1) if total_initial > 0 else 0.0
    valid_fcr = [l.fcr_calculated for l in feed_logs if l.fcr_calculated]
    avg_fcr   = round(sum(valid_fcr) / len(valid_fcr), 2) if valid_fcr else None

    return {
        "active_batches": len(active),
        "total_birds":    total_birds,
        "eggs_today":     eggs_today,
        "mortality_rate": mortality_rate,
        "avg_fcr":        avg_fcr,
    }

# ── INTELLIGENCE LAYER ────────────────────────────────────────────────────────

def evaluate_rules(data: dict, db: Session):
    from app.models.domain import Alert
    rules = [
        {"id": "high_mortality", "condition": lambda d: d.get('mortality', 0) > 5,  "msg": "Alerte Santé : Taux de mortalité anormalement élevé (>5%)", "severity": "critical"},
        {"id": "low_efficiency", "condition": lambda d: d.get('fcr', 0) > 1.8,       "msg": "Alerte Efficacité : Indice de conversion dégradé (>1.8)",   "severity": "warning"},
    ]
    for rule in rules:
        if rule["condition"](data):
            db.add(Alert(unit_id=None, alert_type=rule["id"], message=rule["msg"], severity=rule["severity"], timestamp=datetime.utcnow()))
    db.commit()

@router.get("/predict/{batch_id}")
def predict_performance(batch_id: int, db: Session = Depends(get_db)):
    """Legacy endpoint — redirects to ml-insights."""
    return get_ml_insights(batch_id, db)


# ── REAL ML INSIGHTS ──────────────────────────────────────────────────────────

@router.get("/ml-insights/{batch_id}")
def get_ml_insights(batch_id: int, db: Session = Depends(get_db)):
    """
    Run all ML models on the batch data and return predictions:
    - FCR Forecast (Polynomial Regression)
    - Mortality Risk (Sliding-Window Classifier)
    - Egg Production Trend (Linear Regression)
    - Anomaly Detection (Z-Score)
    - Growth vs Standard Ross 308 / ISA Brown
    """
    batch = db.query(PoultryBatch).filter(PoultryBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    feed_logs   = db.query(PoultryFeedLog).filter(PoultryFeedLog.batch_id == batch_id).all()
    health_logs = db.query(PoultryHealthLog).filter(PoultryHealthLog.batch_id == batch_id).all()
    egg_logs    = db.query(PoultryEggLog).filter(PoultryEggLog.batch_id == batch_id).all()

    return generate_ml_insights(batch, feed_logs, health_logs, egg_logs)


@router.get("/ml-insights/farm/{farm_id}")
def get_farm_ml_insights(farm_id: int, db: Session = Depends(get_db)):
    """
    Run ML insights for ALL active batches of a farm.
    Returns aggregated risk summary + per-batch predictions.
    """
    batches = db.query(PoultryBatch).filter(
        PoultryBatch.farm_id == farm_id,
        PoultryBatch.status == "active"
    ).all()

    if not batches:
        return {"farm_id": farm_id, "active_batches": 0, "insights": [], "farm_health_score": 100}

    batch_ids = [b.id for b in batches]
    feed_map: dict = {}
    health_map: dict = {}
    egg_map: dict = {}
    for log in db.query(PoultryFeedLog).filter(PoultryFeedLog.batch_id.in_(batch_ids)).all():
        feed_map.setdefault(log.batch_id, []).append(log)
    for log in db.query(PoultryHealthLog).filter(PoultryHealthLog.batch_id.in_(batch_ids)).all():
        health_map.setdefault(log.batch_id, []).append(log)
    for log in db.query(PoultryEggLog).filter(PoultryEggLog.batch_id.in_(batch_ids)).all():
        egg_map.setdefault(log.batch_id, []).append(log)

    results = []
    for batch in batches:
        results.append(generate_ml_insights(
            batch,
            feed_map.get(batch.id, []),
            health_map.get(batch.id, []),
            egg_map.get(batch.id, []),
        ))

    # Farm-level aggregation
    health_scores = [r["summary"]["health_score"] for r in results]
    risk_levels = [r["summary"]["risk_level"] for r in results]
    critical_count = sum(1 for r in risk_levels if r in ["high", "critical"])
    farm_health = int(sum(health_scores) / len(health_scores)) if health_scores else 100

    return {
        "farm_id": farm_id,
        "active_batches": len(batches),
        "farm_health_score": farm_health,
        "critical_batches": critical_count,
        "insights": results,
        "computed_at": datetime.utcnow().isoformat(),
    }


# ── VALIDATION ENGINE ─────────────────────────────────────────────────────────

@router.get("/pending-logs", response_model=dict)
def get_pending_logs(farm_id: int, db: Session = Depends(get_db)):
    batches = db.query(PoultryBatch).filter(PoultryBatch.farm_id == farm_id).all()
    batch_ids = [b.id for b in batches]
    return {
        "feed":   db.query(PoultryFeedLog).filter(PoultryFeedLog.batch_id.in_(batch_ids),     PoultryFeedLog.status   == "pending").all(),
        "eggs":   db.query(PoultryEggLog).filter(PoultryEggLog.batch_id.in_(batch_ids),       PoultryEggLog.status    == "pending").all(),
        "health": db.query(PoultryHealthLog).filter(PoultryHealthLog.batch_id.in_(batch_ids), PoultryHealthLog.status == "pending").all(),
        "sales":  db.query(PoultrySale).filter(PoultrySale.batch_id.in_(batch_ids),           PoultrySale.status      == "pending").all(),
    }

@router.patch("/logs/{log_type}/{log_id}/validate")
def validate_log(
    log_type: str,
    log_id: int,
    obj_in: PoultryLogValidation,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    models_map = {"feed": PoultryFeedLog, "eggs": PoultryEggLog, "health": PoultryHealthLog, "sales": PoultrySale}
    model = models_map.get(log_type.lower())
    if not model:
        raise HTTPException(status_code=400, detail="Invalid log type")
    db_obj = db.query(model).filter(model.id == log_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Log not found")
    db_obj.status = obj_in.status
    db_obj.admin_notes = obj_in.admin_notes
    db_obj.validated_by_id = current_user.id
    db_obj.validation_timestamp = datetime.utcnow()
    db.commit()
    return {"message": f"Log {log_id} marked as {obj_in.status}"}
