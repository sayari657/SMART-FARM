"""
Bee Management — CRUD API pour la persistance historique
Apiaries · Hives · Visits · Productions · Stock logs
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from app.core.database import get_db
from app.models.domain import (
    BeeApiary, BeeHive, BeeVisit, BeeProduction, BeeStockLog
)

router = APIRouter(prefix="/bee/history", tags=["Bee History"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ApiaryIn(BaseModel):
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    flower_type: Optional[str] = None
    season: Optional[str] = None
    notes: Optional[str] = None

class ApiaryOut(ApiaryIn):
    id: int
    created_at: datetime
    class Config: from_attributes = True


class HiveIn(BaseModel):
    apiary_id: int
    identifier: str
    is_active: bool = True
    health_score: float = 10.0
    honey_level: float = 5.0
    force_level: float = 5.0
    notes: Optional[str] = None

class HiveOut(HiveIn):
    id: int
    created_at: datetime
    class Config: from_attributes = True


class VisitIn(BaseModel):
    hive_id: Optional[int] = None
    apiary_id: Optional[int] = None
    visit_date: str
    gps_coords: Optional[str] = None
    health_state: str = "health"
    temperature: Optional[float] = None
    honey_level: str = "Moyen"
    needs_sirop: float = 0
    needs_pate: float = 0
    needs_traitement: float = 0
    harvest_kg: float = 0
    pollen_kg: float = 0
    notes: Optional[str] = None
    photo_url: Optional[str] = None

class VisitOut(VisitIn):
    id: int
    created_at: datetime
    class Config: from_attributes = True


class ProductionIn(BaseModel):
    apiary_id: Optional[int] = None
    production_date: str
    honey_kg: float = 0.0
    pollen_kg: float = 0.0
    quality_notes: Optional[str] = None

class ProductionOut(ProductionIn):
    id: int
    created_at: datetime
    class Config: from_attributes = True


class StockIn(BaseModel):
    log_date: str
    sirop: float = 0
    pate: float = 0
    traitement: float = 0
    cadres: int = 0
    hausse: int = 0
    equipement: int = 0

class StockOut(StockIn):
    id: int
    created_at: datetime
    class Config: from_attributes = True


# ─── Apiaries ────────────────────────────────────────────────────────────────

@router.get("/apiaries", response_model=List[ApiaryOut])
def list_apiaries(db: Session = Depends(get_db)):
    return db.query(BeeApiary).order_by(BeeApiary.created_at).all()


@router.post("/apiaries", response_model=ApiaryOut, status_code=201)
def create_apiary(body: ApiaryIn, db: Session = Depends(get_db)):
    obj = BeeApiary(**body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/apiaries/{apiary_id}", response_model=ApiaryOut)
def update_apiary(apiary_id: int, body: ApiaryIn, db: Session = Depends(get_db)):
    obj = db.query(BeeApiary).filter(BeeApiary.id == apiary_id).first()
    if not obj:
        raise HTTPException(404, "Apiary not found")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/apiaries/{apiary_id}")
def delete_apiary(apiary_id: int, db: Session = Depends(get_db)):
    obj = db.query(BeeApiary).filter(BeeApiary.id == apiary_id).first()
    if not obj:
        raise HTTPException(404, "Apiary not found")
    db.delete(obj)
    db.commit()
    return {"status": "deleted", "id": apiary_id}


# ─── Hives ───────────────────────────────────────────────────────────────────

@router.get("/hives", response_model=List[HiveOut])
def list_hives(apiary_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(BeeHive)
    if apiary_id:
        q = q.filter(BeeHive.apiary_id == apiary_id)
    return q.order_by(BeeHive.created_at).all()


@router.post("/hives", response_model=HiveOut, status_code=201)
def create_hive(body: HiveIn, db: Session = Depends(get_db)):
    # Vérifier unicité de l'identifiant
    existing = db.query(BeeHive).filter(BeeHive.identifier == body.identifier).first()
    if existing:
        raise HTTPException(409, f"Identifier '{body.identifier}' already exists")
    obj = BeeHive(**body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/hives/{hive_id}", response_model=HiveOut)
def update_hive(hive_id: int, body: HiveIn, db: Session = Depends(get_db)):
    obj = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
    if not obj:
        raise HTTPException(404, "Hive not found")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/hives/{hive_id}")
def delete_hive(hive_id: int, db: Session = Depends(get_db)):
    obj = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
    if not obj:
        raise HTTPException(404, "Hive not found")
    db.delete(obj)
    db.commit()
    return {"status": "deleted", "id": hive_id}


# ─── Visits ──────────────────────────────────────────────────────────────────

@router.get("/visits", response_model=List[VisitOut])
def list_visits(
    apiary_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(BeeVisit)
    if apiary_id:
        q = q.filter(BeeVisit.apiary_id == apiary_id)
    return q.order_by(desc(BeeVisit.created_at)).limit(limit).all()


@router.post("/visits", response_model=VisitOut, status_code=201)
def create_visit(body: VisitIn, db: Session = Depends(get_db)):
    obj = BeeVisit(**body.model_dump())
    db.add(obj)
    # Mettre à jour la date de dernière visite de la ruche
    if body.hive_id:
        hive = db.query(BeeHive).filter(BeeHive.id == body.hive_id).first()
        if hive:
            hive.health_score = 10 if body.health_state == "health" else (2 if body.health_state == "urgent" else 5)
            hive.last_visit_date = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/visits/{visit_id}")
def delete_visit(visit_id: int, db: Session = Depends(get_db)):
    obj = db.query(BeeVisit).filter(BeeVisit.id == visit_id).first()
    if not obj:
        raise HTTPException(404, "Visit not found")
    db.delete(obj)
    db.commit()
    return {"status": "deleted", "id": visit_id}


# ─── Productions ─────────────────────────────────────────────────────────────

@router.get("/productions", response_model=List[ProductionOut])
def list_productions(
    apiary_id: Optional[int] = None,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    q = db.query(BeeProduction)
    if apiary_id:
        q = q.filter(BeeProduction.apiary_id == apiary_id)
    return q.order_by(desc(BeeProduction.production_date)).limit(limit).all()


@router.post("/productions", response_model=ProductionOut, status_code=201)
def create_production(body: ProductionIn, db: Session = Depends(get_db)):
    obj = BeeProduction(**body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/productions/{prod_id}")
def delete_production(prod_id: int, db: Session = Depends(get_db)):
    obj = db.query(BeeProduction).filter(BeeProduction.id == prod_id).first()
    if not obj:
        raise HTTPException(404, "Production not found")
    db.delete(obj)
    db.commit()
    return {"status": "deleted", "id": prod_id}


# ─── Stock Logs ──────────────────────────────────────────────────────────────

@router.get("/stock", response_model=List[StockOut])
def list_stock_logs(limit: int = 30, db: Session = Depends(get_db)):
    return db.query(BeeStockLog).order_by(desc(BeeStockLog.log_date)).limit(limit).all()


@router.post("/stock", response_model=StockOut, status_code=201)
def log_stock(body: StockIn, db: Session = Depends(get_db)):
    obj = BeeStockLog(**body.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ─── Stats agrégées ──────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Statistiques globales pour le dashboard apicole."""
    total_honey = db.query(func.sum(BeeProduction.honey_kg)).scalar() or 0
    total_pollen = db.query(func.sum(BeeProduction.pollen_kg)).scalar() or 0
    total_hives = db.query(func.count(BeeHive.id)).scalar() or 0
    active_hives = db.query(func.count(BeeHive.id)).filter(BeeHive.is_active == True).scalar() or 0
    total_visits = db.query(func.count(BeeVisit.id)).scalar() or 0
    urgent_visits = db.query(func.count(BeeVisit.id)).filter(BeeVisit.health_state == "urgent").scalar() or 0

    # Productions par site
    by_apiary = (
        db.query(
            BeeApiary.name,
            func.sum(BeeProduction.honey_kg).label("honey"),
            func.sum(BeeProduction.pollen_kg).label("pollen"),
            func.count(BeeProduction.id).label("harvests"),
        )
        .outerjoin(BeeProduction, BeeProduction.apiary_id == BeeApiary.id)
        .group_by(BeeApiary.id, BeeApiary.name)
        .all()
    )

    # Productions mensuelles (30 derniers enregistrements)
    monthly = (
        db.query(BeeProduction.production_date, func.sum(BeeProduction.honey_kg).label("honey"))
        .group_by(BeeProduction.production_date)
        .order_by(BeeProduction.production_date)
        .limit(30)
        .all()
    )

    return {
        "total_honey_kg": round(total_honey, 2),
        "total_pollen_kg": round(total_pollen, 2),
        "total_hives": total_hives,
        "active_hives": active_hives,
        "total_visits": total_visits,
        "urgent_visits": urgent_visits,
        "by_apiary": [
            {"name": r.name, "honey": round(r.honey or 0, 2), "pollen": round(r.pollen or 0, 2), "harvests": r.harvests}
            for r in by_apiary
        ],
        "monthly_series": [
            {"date": r.production_date, "honey": round(r.honey or 0, 2)}
            for r in monthly
        ],
    }


# ─── Sync bulk (localStorage → DB) ──────────────────────────────────────────

class BulkSyncIn(BaseModel):
    emplacements: List[dict] = []
    ruches: List[dict] = []
    visites: List[dict] = []
    productions: List[dict] = []
    stock: Optional[dict] = None


@router.post("/sync")
def bulk_sync(body: BulkSyncIn, db: Session = Depends(get_db)):
    """Synchronise les données localStorage vers la base de données.
    Insère uniquement les enregistrements qui n'existent pas encore (par identifiant unique).
    """
    created = {"apiaries": 0, "hives": 0, "visits": 0, "productions": 0, "stock_logs": 0}

    # Emplacements → BeeApiary
    apiary_id_map: dict = {}  # local_id → db_id
    for emp in body.emplacements:
        existing = db.query(BeeApiary).filter(BeeApiary.name == emp.get("nom", "")).first()
        if not existing:
            obj = BeeApiary(
                name=emp.get("nom", ""),
                latitude=emp.get("lat"),
                longitude=emp.get("lng"),
                flower_type=emp.get("typeFleur"),
                season=emp.get("saison"),
            )
            db.add(obj)
            db.flush()
            apiary_id_map[str(emp.get("id"))] = obj.id
            created["apiaries"] += 1
        else:
            apiary_id_map[str(emp.get("id"))] = existing.id

    # Ruches → BeeHive
    hive_id_map: dict = {}
    for ruche in body.ruches:
        identifier = ruche.get("name") or ruche.get("qr") or f"HIVE-{ruche.get('id')}"
        existing = db.query(BeeHive).filter(BeeHive.identifier == identifier).first()
        local_apiary = str(ruche.get("empId", ""))
        db_apiary_id = apiary_id_map.get(local_apiary)
        if not existing and db_apiary_id:
            obj = BeeHive(
                apiary_id=db_apiary_id,
                identifier=identifier,
                is_active=ruche.get("active", True),
                health_score=float(ruche.get("sante", 10)),
                honey_level=float(ruche.get("miel", 5)),
                force_level=float(ruche.get("force", 5)),
            )
            db.add(obj)
            db.flush()
            hive_id_map[str(ruche.get("id"))] = obj.id
            created["hives"] += 1
        elif existing:
            hive_id_map[str(ruche.get("id"))] = existing.id

    # Visites → BeeVisit
    for v in body.visites:
        db_hive_id = hive_id_map.get(str(v.get("rucheId")))
        # Déduplication basique : même date + même ruche
        dup = db.query(BeeVisit).filter(
            BeeVisit.visit_date == v.get("date", ""),
            BeeVisit.hive_id == db_hive_id
        ).first()
        if not dup:
            needs = v.get("needs", {})
            obj = BeeVisit(
                hive_id=db_hive_id,
                visit_date=v.get("date", ""),
                gps_coords=v.get("gps"),
                health_state=v.get("etat", "health"),
                temperature=v.get("temp"),
                honey_level=v.get("miel", "Moyen"),
                needs_sirop=needs.get("sirop", 0),
                needs_pate=needs.get("pate", 0),
                needs_traitement=needs.get("traitement", 0),
                harvest_kg=v.get("recolteKgs", 0),
                pollen_kg=v.get("pollenKgs", 0),
                notes=v.get("notes"),
            )
            db.add(obj)
            created["visits"] += 1

    # Productions → BeeProduction
    for p in body.productions:
        db_apiary_id = apiary_id_map.get(str(p.get("empId")))
        dup = db.query(BeeProduction).filter(
            BeeProduction.production_date == p.get("date", ""),
            BeeProduction.apiary_id == db_apiary_id
        ).first()
        if not dup:
            obj = BeeProduction(
                apiary_id=db_apiary_id,
                production_date=p.get("date", ""),
                honey_kg=float(p.get("miel", 0)),
                pollen_kg=float(p.get("pollen", 0)),
            )
            db.add(obj)
            created["productions"] += 1

    # Stock snapshot
    if body.stock:
        today = date.today().isoformat()
        existing_log = db.query(BeeStockLog).filter(BeeStockLog.log_date == today).first()
        if not existing_log:
            obj = BeeStockLog(
                log_date=today,
                sirop=body.stock.get("sirop", 0),
                pate=body.stock.get("pate", 0),
                traitement=body.stock.get("traitement", 0),
                cadres=body.stock.get("cadres", 0),
                hausse=body.stock.get("hausse", 0),
                equipement=body.stock.get("equipement", 0),
            )
            db.add(obj)
            created["stock_logs"] += 1

    db.commit()
    return {"status": "synced", "created": created}
