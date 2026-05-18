"""
Bee Management — Module Planning
Visites planifiées · Tâches · Intégration prédictions
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import BeePlanning, BeePlanningTask, BeeHive, BeeApiary, BeeVisit, BeeGlobalStock

router = APIRouter(prefix="/bee/planning", tags=["Bee Planning"], dependencies=[Depends(get_current_user)])

VALID_STATUSES    = ["pending", "in_progress", "done", "cancelled"]
VALID_ACTION_TYPES = ["inspection", "feeding", "treatment", "harvest", "autre"]


# ─── Schemas ─────────────────────────────────────────────────────────────────

class TaskIn(BaseModel):
    text: str
    status: str = "todo"

class TaskOut(BaseModel):
    id: int
    text: str
    status: str
    created_at: datetime
    class Config: from_attributes = True


class PlanningIn(BaseModel):
    hive_id: int
    apiary_id: Optional[int] = None
    scheduled_date: str
    action_type: Optional[str] = None
    notes: Optional[str] = None
    predicted_sirop: float = 0
    predicted_pate: float = 0
    predicted_traitement: int = 0
    predicted_cadres: int = 0
    tasks: List[str] = []

class PlanningOut(BaseModel):
    id: int
    hive_id: int
    apiary_id: Optional[int]
    scheduled_date: str
    status: str
    action_type: Optional[str]
    notes: Optional[str]
    predicted_sirop: float
    predicted_pate: float
    predicted_traitement: int
    predicted_cadres: int
    created_at: datetime
    tasks: List[TaskOut] = []
    class Config: from_attributes = True


# ─── Prévision logistique ────────────────────────────────────────────────────

@router.get("/logistics-preview")
def logistics_preview(apiary_id: int, date: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Calcule les besoins matériels totaux pour visiter tous les ruches actives
    d'un emplacement à une date donnée.
    Retourne : besoins par ruche + totaux + comparaison avec stock global.
    """
    apiary = db.query(BeeApiary).filter(BeeApiary.id == apiary_id).first()
    if not apiary:
        raise HTTPException(404, "Emplacement introuvable")

    hives = db.query(BeeHive).filter(
        BeeHive.apiary_id == apiary_id,
        BeeHive.is_active == True,
        BeeHive.hive_type != "queen_bank",
    ).all()

    # ── Multiplicateurs saisonniers (même logique que bee_analytics) ──────────
    SEASON_MULT = {
        "Printemps": {"sirop": 1.4, "pate": 1.3, "traitement": 0.8},
        "Eté":       {"sirop": 1.2, "pate": 1.0, "traitement": 0.6},
        "Automne":   {"sirop": 1.5, "pate": 1.2, "traitement": 1.2},
        "Hiver":     {"sirop": 1.8, "pate": 1.5, "traitement": 0.5},
    }
    mults = SEASON_MULT.get(apiary.season or "", {"sirop": 1.0, "pate": 1.0, "traitement": 1.0})
    flower = (apiary.flower_type or "").lower()
    if any(f in flower for f in ["oranger", "eucalyptus", "lavande", "colza"]):
        mults["sirop"] = max(0.5, mults["sirop"] - 0.3)

    today_month = datetime.utcnow().month
    hive_results = []

    for hive in hives:
        last_visits = (
            db.query(BeeVisit)
            .filter(BeeVisit.hive_id == hive.id)
            .order_by(desc(BeeVisit.visit_date))
            .limit(5)
            .all()
        )
        if last_visits:
            avg_sirop      = sum(v.needs_sirop      or 0 for v in last_visits) / len(last_visits)
            avg_pate       = sum(v.needs_pate       or 0 for v in last_visits) / len(last_visits)
            avg_traitement = sum(v.needs_traitement or 0 for v in last_visits) / len(last_visits)
        else:
            avg_sirop, avg_pate, avg_traitement = 5.0, 1.0, 0.0

        hm = dict(mults)
        if (hive.health_score or 7) < 4:
            hm["traitement"] = min(hm["traitement"] * 1.8, 3.0)
        elif (hive.health_score or 7) < 6:
            hm["traitement"] = min(hm["traitement"] * 1.3, 2.5)

        cadres = 2 if (hive.force_level or 5) >= 7 and today_month in (3, 4, 5, 6, 7) else 0

        hive_results.append({
            "hive_id":    hive.id,
            "identifier": hive.identifier,
            "health_score": hive.health_score,
            "sirop_L":      round(avg_sirop      * hm["sirop"],      1),
            "pate_kg":      round(avg_pate       * hm["pate"],       1),
            "traitement":   round(avg_traitement * hm["traitement"]),
            "cadres":       cadres,
            "visits_used":  len(last_visits),
        })

    totals = {
        "sirop_L":    round(sum(h["sirop_L"]    for h in hive_results), 1),
        "pate_kg":    round(sum(h["pate_kg"]    for h in hive_results), 1),
        "traitement": round(sum(h["traitement"] for h in hive_results)),
        "cadres":     round(sum(h["cadres"]     for h in hive_results)),
    }

    global_stock = db.query(BeeGlobalStock).first()
    stock = {
        "sirop":    global_stock.sirop      if global_stock else 0,
        "pate":     global_stock.pate       if global_stock else 0,
        "traitement": global_stock.traitement if global_stock else 0,
        "cadres":   global_stock.cadres     if global_stock else 0,
    }

    return {
        "apiary_id":   apiary_id,
        "apiary_name": apiary.name,
        "season":      apiary.season,
        "flower_type": apiary.flower_type,
        "hive_count":  len(hives),
        "visit_date":  date,
        "per_hive":    hive_results,
        "totals":      totals,
        "stock_disponible": stock,
        "manques": {
            "sirop_L":    round(max(0, totals["sirop_L"]    - stock["sirop"]),   1),
            "pate_kg":    round(max(0, totals["pate_kg"]    - stock["pate"]),    1),
            "traitement": max(0, totals["traitement"] - stock["traitement"]),
            "cadres":     max(0, totals["cadres"]     - stock["cadres"]),
        },
    }


# ─── CRUD ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[PlanningOut])
def list_planning(
    hive_id: Optional[int] = None,
    apiary_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(BeePlanning).options(joinedload(BeePlanning.tasks))
    if hive_id:
        q = q.filter(BeePlanning.hive_id == hive_id)
    if apiary_id:
        q = q.filter(BeePlanning.apiary_id == apiary_id)
    if status:
        q = q.filter(BeePlanning.status == status)
    return q.order_by(BeePlanning.scheduled_date).all()


@router.post("", response_model=PlanningOut, status_code=201)
def create_planning(body: PlanningIn, db: Session = Depends(get_db)):
    hive = db.query(BeeHive).filter(BeeHive.id == body.hive_id).first()
    if not hive:
        raise HTTPException(404, "Hive not found")

    apiary_id = body.apiary_id or hive.apiary_id

    mission = BeePlanning(
        hive_id=hive.id,
        apiary_id=apiary_id,
        scheduled_date=body.scheduled_date,
        status="pending",
        action_type=body.action_type,
        notes=body.notes,
        predicted_sirop=body.predicted_sirop,
        predicted_pate=body.predicted_pate,
        predicted_traitement=body.predicted_traitement,
        predicted_cadres=body.predicted_cadres,
    )
    db.add(mission)
    db.flush()

    for text in body.tasks:
        if text.strip():
            db.add(BeePlanningTask(planning_id=mission.id, text=text.strip()))

    db.commit()
    db.refresh(mission)
    return mission


@router.put("/{planning_id}")
def update_planning_status(
    planning_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    if status not in VALID_STATUSES:
        raise HTTPException(400, f"Statut invalide. Valeurs: {VALID_STATUSES}")
    obj = db.query(BeePlanning).filter(BeePlanning.id == planning_id).first()
    if not obj:
        raise HTTPException(404, "Planning not found")
    obj.status = status
    db.commit()
    return {"status": "updated", "id": planning_id, "new_status": status}


@router.put("/{planning_id}/tasks/{task_id}")
def update_task_status(
    planning_id: int,
    task_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    """Met à jour le statut d'une tâche (todo → doing → done)."""
    if status not in ("todo", "doing", "done"):
        raise HTTPException(400, "Statut tâche invalide: todo | doing | done")
    task = db.query(BeePlanningTask).filter(
        BeePlanningTask.id == task_id,
        BeePlanningTask.planning_id == planning_id
    ).first()
    if not task:
        raise HTTPException(404, "Task not found")
    task.status = status

    # Auto-update mission status based on tasks
    planning = db.query(BeePlanning).filter(BeePlanning.id == planning_id).first()
    if planning:
        tasks = db.query(BeePlanningTask).filter(BeePlanningTask.planning_id == planning_id).all()
        done_count = sum(1 for t in tasks if t.status == "done")
        doing_count = sum(1 for t in tasks if t.status == "doing")
        if done_count == len(tasks) and len(tasks) > 0:
            planning.status = "done"
        elif doing_count > 0 or done_count > 0:
            planning.status = "in_progress"

    db.commit()
    return {"status": "updated", "task_id": task_id, "new_status": status}


@router.post("/{planning_id}/tasks", response_model=TaskOut, status_code=201)
def add_task(planning_id: int, body: TaskIn, db: Session = Depends(get_db)):
    planning = db.query(BeePlanning).filter(BeePlanning.id == planning_id).first()
    if not planning:
        raise HTTPException(404, "Planning not found")
    task = BeePlanningTask(planning_id=planning_id, text=body.text.strip(), status=body.status)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{planning_id}")
def delete_planning(planning_id: int, db: Session = Depends(get_db)):
    obj = db.query(BeePlanning).filter(BeePlanning.id == planning_id).first()
    if not obj:
        raise HTTPException(404, "Planning not found")
    db.delete(obj)
    db.commit()
    return {"status": "deleted", "id": planning_id}


@router.delete("/{planning_id}/tasks/{task_id}")
def delete_task(planning_id: int, task_id: int, db: Session = Depends(get_db)):
    task = db.query(BeePlanningTask).filter(
        BeePlanningTask.id == task_id,
        BeePlanningTask.planning_id == planning_id
    ).first()
    if not task:
        raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()
    return {"status": "deleted", "task_id": task_id}


# ─── Résumé planning ─────────────────────────────────────────────────────────

@router.get("/summary")
def planning_summary(db: Session = Depends(get_db)):
    """Vue d'ensemble du planning : missions à venir, en cours, terminées."""
    all_missions = db.query(BeePlanning).options(joinedload(BeePlanning.tasks)).all()

    pending    = [m for m in all_missions if m.status == "pending"]
    in_prog    = [m for m in all_missions if m.status == "in_progress"]
    done       = [m for m in all_missions if m.status == "done"]
    cancelled  = [m for m in all_missions if m.status == "cancelled"]

    # Missions en retard (date passée + non terminée)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    overdue = [
        m for m in pending + in_prog
        if m.scheduled_date < today
    ]

    def serialize(m: BeePlanning) -> dict:
        tasks = m.tasks or []
        done_t = sum(1 for t in tasks if t.status == "done")
        return {
            "id": m.id,
            "hive_id": m.hive_id,
            "scheduled_date": m.scheduled_date,
            "status": m.status,
            "action_type": m.action_type,
            "task_count": len(tasks),
            "tasks_done": done_t,
            "progress_pct": round(done_t / len(tasks) * 100) if tasks else 0,
        }

    return {
        "total": len(all_missions),
        "pending": len(pending),
        "in_progress": len(in_prog),
        "done": len(done),
        "overdue": len(overdue),
        "overdue_missions": [serialize(m) for m in overdue[:5]],
        "upcoming": [serialize(m) for m in sorted(pending, key=lambda x: x.scheduled_date)[:5]],
    }
