"""
Bee Management — CRUD API pour la persistance historique
Apiaries · Hives · Visits (avec preview/apply) · Productions (ruche-level) · Stock logs
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import (
    BeeApiary, BeeHive, BeeVisit, BeeProduction, BeeStockLog,
    BeeHiveStock
)

router = APIRouter(prefix="/bee/history", tags=["Bee History"], dependencies=[Depends(get_current_user)])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ApiaryIn(BaseModel):
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    flower_type: Optional[str] = None
    season: Optional[str] = None
    region: Optional[str] = None
    notes: Optional[str] = None

class ApiaryOut(ApiaryIn):
    id: int
    created_at: datetime
    class Config: from_attributes = True


class HiveIn(BaseModel):
    apiary_id: int
    identifier: Optional[str] = None
    is_active: bool = True
    health_score: float = 10.0
    honey_level: float = 5.0
    force_level: float = 5.0
    hive_type: Optional[str] = None
    queen_year: Optional[int] = None
    has_queen: bool = True
    queen_count: int = 0
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
    health_score: Optional[float] = None   # Score numérique direct (Mode Terrain, 0-10)
    force_level: Optional[float] = None    # Force colonie observée (Mode Terrain, 0-10)
    temperature: Optional[float] = None
    honey_level: str = "Moyen"             # Abondant | Bon | Moyen | Faible
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
    hive_id: Optional[int] = None
    apiary_id: Optional[int] = None
    flower_type: Optional[str] = None
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


# ─── Queen Bank ──────────────────────────────────────────────────────────────

@router.get("/queen-bank")
def get_queen_bank(db: Session = Depends(get_db)):
    """Return the Queen Bank hive status and available queen count."""
    qb = db.query(BeeHive).filter(BeeHive.hive_type == "queen_bank").first()
    if not qb:
        return {"available": False, "queen_count": 0, "hive_id": None, "identifier": None}
    return {
        "available": (qb.queen_count or 0) > 0,
        "queen_count": qb.queen_count or 0,
        "hive_id": qb.id,
        "identifier": qb.identifier,
    }


@router.post("/queen-bank/dispatch/{target_hive_id}")
def dispatch_queen(target_hive_id: int, db: Session = Depends(get_db)):
    """Dispatch one queen from the Queen Bank to the target hive."""
    qb = db.query(BeeHive).filter(BeeHive.hive_type == "queen_bank").first()
    if not qb or (qb.queen_count or 0) <= 0:
        raise HTTPException(status_code=400, detail="Aucune reine disponible dans la Banque de Reines")
    target = db.query(BeeHive).filter(BeeHive.id == target_hive_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Ruche cible introuvable")
    qb.queen_count = (qb.queen_count or 1) - 1
    target.has_queen = True
    db.commit()
    db.refresh(target)
    return {
        "success": True,
        "queen_bank_remaining": qb.queen_count,
        "target_hive": target.identifier,
    }


# ─── Hives ───────────────────────────────────────────────────────────────────

@router.get("/hives", response_model=List[HiveOut])
def list_hives(apiary_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(BeeHive)
    if apiary_id:
        q = q.filter(BeeHive.apiary_id == apiary_id)
    return q.order_by(BeeHive.created_at).all()


@router.post("/hives", response_model=HiveOut, status_code=201)
def create_hive(body: HiveIn, db: Session = Depends(get_db)):
    identifier = body.identifier
    if not identifier:
        count = db.query(BeeHive).count()
        identifier = f"HIVE-{count + 1:04d}"
        while db.query(BeeHive).filter(BeeHive.identifier == identifier).first():
            count += 1
            identifier = f"HIVE-{count + 1:04d}"
    else:
        existing = db.query(BeeHive).filter(BeeHive.identifier == identifier).first()
        if existing:
            raise HTTPException(409, f"Identifier '{identifier}' already exists")
    data = body.model_dump()
    data['identifier'] = identifier
    obj = BeeHive(**data)
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


@router.get("/hives/{hive_id}")
def get_hive_details(hive_id: int, db: Session = Depends(get_db)):
    hive = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
    if not hive:
        raise HTTPException(404, "Hive not found")

    visits = (
        db.query(BeeVisit)
        .filter(BeeVisit.hive_id == hive_id)
        .order_by(desc(BeeVisit.visit_date))
        .all()
    )
    # Productions linked directly to this hive
    productions = (
        db.query(BeeProduction)
        .filter(BeeProduction.hive_id == hive_id)
        .order_by(desc(BeeProduction.production_date))
        .limit(50)
        .all()
    )
    hive_stock = db.query(BeeHiveStock).filter(BeeHiveStock.hive_id == hive_id).first()

    total_harvest = sum(v.harvest_kg or 0 for v in visits)
    total_pollen  = sum(v.pollen_kg  or 0 for v in visits)
    total_prod_honey  = sum(p.honey_kg  or 0 for p in productions)
    total_prod_pollen = sum(p.pollen_kg or 0 for p in productions)

    return {
        "id": hive.id,
        "identifier": hive.identifier,
        "apiary_id": hive.apiary_id,
        "is_active": hive.is_active,
        "hive_type": hive.hive_type,
        "queen_year": hive.queen_year,
        "health_score": hive.health_score,
        "honey_level": hive.honey_level,
        "force_level": hive.force_level,
        "last_visit_date": hive.last_visit_date.isoformat() if hive.last_visit_date else None,
        "visits": [
            {
                "id": v.id, "visit_date": v.visit_date, "health_state": v.health_state,
                "honey_level": v.honey_level, "temperature": v.temperature,
                "harvest_kg": v.harvest_kg, "pollen_kg": v.pollen_kg,
                "needs_sirop": v.needs_sirop, "needs_pate": v.needs_pate,
                "needs_traitement": v.needs_traitement, "notes": v.notes,
                "gps_coords": v.gps_coords,
            }
            for v in visits
        ],
        "production": [
            {
                "id": p.id, "production_date": p.production_date,
                "honey_kg": p.honey_kg, "pollen_kg": p.pollen_kg,
                "flower_type": p.flower_type, "quality_notes": p.quality_notes,
            }
            for p in productions
        ],
        "summary": {
            "total_visits": len(visits),
            "total_harvest_kg":     round(total_harvest, 2),
            "total_pollen_kg":      round(total_pollen, 2),
            "total_prod_honey_kg":  round(total_prod_honey, 2),
            "total_prod_pollen_kg": round(total_prod_pollen, 2),
        },
        "stock": {
            "sirop":      hive_stock.sirop      if hive_stock else 0,
            "pate":       hive_stock.pate       if hive_stock else 0,
            "traitement": hive_stock.traitement if hive_stock else 0,
            "cadres":     hive_stock.cadres     if hive_stock else 0,
            "sirop_min":      hive_stock.sirop_min      if hive_stock else 2,
            "pate_min":       hive_stock.pate_min       if hive_stock else 1,
            "traitement_min": hive_stock.traitement_min if hive_stock else 1,
        },
    }


@router.get("/hives/{hive_id}/qr")
def get_hive_qr(hive_id: int, db: Session = Depends(get_db)):
    """Génère un QR code PNG encodant l'identifiant de la ruche — retourné en base64."""
    hive = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
    if not hive:
        raise HTTPException(404, "Hive not found")
    try:
        import qrcode, io, base64
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(hive.identifier)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1C0A00", back_color="#FFFFFF")
        buf = io.BytesIO()
        img.save(buf)
        b64 = base64.b64encode(buf.getvalue()).decode()
        return {
            "identifier": hive.identifier,
            "data_url": f"data:image/png;base64,{b64}",
        }
    except ImportError:
        raise HTTPException(500, "qrcode library not installed — run: pip install qrcode[pil]")


# ─── Visits — preview / create / apply ───────────────────────────────────────

_VISIT_STATE_SCORES = {
    "health": 10.0, "warning": 5.5, "treatment": 4.0, "urgent": 1.5
}

_HONEY_LEVEL_SCORES = {
    "Excellent": 10.0, "Bon": 8.0, "Moyen": 5.5, "Faible": 2.5
}


def _compute_suggestions(body: VisitIn, hive: BeeHive) -> dict:
    """
    Calcule les mises à jour suggérées pour une ruche suite à une visite,
    SANS les appliquer. Retourné au frontend pour confirmation.
    Accepte soit un score numérique direct (Mode Terrain) soit un état qualitatif.
    """
    # Santé: préférer le score numérique direct (Mode Terrain) sinon mapper l'état
    if body.health_score is not None:
        visit_score = max(0.0, min(10.0, body.health_score))
    else:
        visit_score = _VISIT_STATE_SCORES.get(body.health_state, 7.0)
    new_health = round(visit_score * 0.60 + (hive.health_score or 7.0) * 0.40, 2)

    honey_score = _HONEY_LEVEL_SCORES.get(body.honey_level, 5.5)
    new_honey   = round(honey_score * 0.50 + (hive.honey_level or 5.0) * 0.50, 2)

    suggestions: dict = {
        "health_score": {"current": hive.health_score, "proposed": new_health,
                         "delta": round(new_health - (hive.health_score or 0), 2)},
        "honey_level":  {"current": hive.honey_level,  "proposed": new_honey,
                         "delta": round(new_honey  - (hive.honey_level  or 0), 2)},
    }

    # Force colonie: inclure dans les suggestions si fournie
    if body.force_level is not None:
        new_force = round(max(0.0, min(10.0, body.force_level)) * 0.60 + (hive.force_level or 5.0) * 0.40, 2)
        suggestions["force_level"] = {"current": hive.force_level, "proposed": new_force,
                                       "delta": round(new_force - (hive.force_level or 0), 2)}

    # Stock deductions
    stock_deductions: dict = {}
    if body.needs_sirop > 0:
        stock_deductions["sirop"] = body.needs_sirop
    if body.needs_pate > 0:
        stock_deductions["pate"] = body.needs_pate
    if body.needs_traitement > 0:
        stock_deductions["traitement"] = int(body.needs_traitement)

    # Auto-production: si récolte > 0, proposer une entrée de production
    production_entry = None
    if body.harvest_kg > 0 or body.pollen_kg > 0:
        production_entry = {
            "hive_id": hive.id,
            "apiary_id": hive.apiary_id,
            "honey_kg": body.harvest_kg,
            "pollen_kg": body.pollen_kg,
            "production_date": body.visit_date,
        }

    return {
        "hive_updates": suggestions,
        "stock_deductions": stock_deductions,
        "production_entry": production_entry,
    }


@router.post("/visits/preview")
def preview_visit(body: VisitIn, db: Session = Depends(get_db)):
    """
    Calcule les impacts d'une visite SANS rien persister.
    Renvoie les suggestions pour confirmation par l'apiculteur.
    """
    if not body.hive_id:
        raise HTTPException(400, "hive_id required for preview")
    hive = db.query(BeeHive).filter(BeeHive.id == body.hive_id).first()
    if not hive:
        raise HTTPException(404, "Hive not found")
    return _compute_suggestions(body, hive)


@router.get("/visits", response_model=List[VisitOut])
def list_visits(
    apiary_id: Optional[int] = None,
    hive_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(BeeVisit)
    if apiary_id:
        q = q.filter(BeeVisit.apiary_id == apiary_id)
    if hive_id:
        q = q.filter(BeeVisit.hive_id == hive_id)
    return q.order_by(desc(BeeVisit.created_at)).limit(limit).all()


@router.post("/visits", response_model=VisitOut, status_code=201)
def create_visit(body: VisitIn, db: Session = Depends(get_db)):
    """
    Enregistre la visite (observation permanente).
    NE met PAS à jour automatiquement la ruche — utilisez /visits/{id}/apply
    pour appliquer les changements après confirmation.
    Retourne la visite + suggestions calculées.
    """
    obj = BeeVisit(**body.model_dump())
    db.add(obj)
    if body.hive_id:
        hive = db.query(BeeHive).filter(BeeHive.id == body.hive_id).first()
        if hive:
            hive.last_visit_date = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/visits/{visit_id}/apply")
def apply_visit(visit_id: int, db: Session = Depends(get_db)):
    """
    Applique les changements suggérés d'une visite à la ruche :
    - Met à jour health_score et honey_level (blend 60/40)
    - Déduit les ressources du stock ruche
    - Crée une entrée de production si récolte > 0
    Nécessite confirmation explicite de l'apiculteur.
    """
    visit = db.query(BeeVisit).filter(BeeVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(404, "Visit not found")
    if not visit.hive_id:
        raise HTTPException(400, "Visit has no linked hive")

    hive = db.query(BeeHive).filter(BeeHive.id == visit.hive_id).first()
    if not hive:
        raise HTTPException(404, "Hive not found")

    applied: dict = {}

    # 1. Mise à jour santé ruche (blend scientifique COLOSS)
    # Préférer le score numérique direct (Mode Terrain) sinon mapper l'état qualitatif
    if visit.health_score is not None:
        visit_score = max(0.0, min(10.0, visit.health_score))
    else:
        visit_score = _VISIT_STATE_SCORES.get(visit.health_state, 7.0)
    new_health  = round(visit_score * 0.60 + (hive.health_score or 7.0) * 0.40, 2)
    honey_score = _HONEY_LEVEL_SCORES.get(visit.honey_level, 5.5)
    new_honey   = round(honey_score * 0.50 + (hive.honey_level or 5.0) * 0.50, 2)

    hive.health_score = new_health
    hive.honey_level  = new_honey
    applied["health_score"] = new_health
    applied["honey_level"]  = new_honey

    # Mise à jour force colonie si fournie
    if visit.force_level is not None:
        new_force = round(max(0.0, min(10.0, visit.force_level)) * 0.60 + (hive.force_level or 5.0) * 0.40, 2)
        hive.force_level = new_force
        applied["force_level"] = new_force

    # 2. Déduction stock ruche
    stock = db.query(BeeHiveStock).filter(BeeHiveStock.hive_id == hive.id).first()
    stock_alerts: list = []
    if stock:
        if visit.needs_sirop > 0:
            stock.sirop = max(0, (stock.sirop or 0) - visit.needs_sirop)
            if stock.sirop < stock.sirop_min:
                stock_alerts.append(f"Sirop ruche bas ({stock.sirop:.1f}L < seuil {stock.sirop_min}L)")
        if visit.needs_pate > 0:
            stock.pate = max(0, (stock.pate or 0) - visit.needs_pate)
            if stock.pate < stock.pate_min:
                stock_alerts.append(f"Pâte ruche basse ({stock.pate:.1f}kg < seuil {stock.pate_min}kg)")
        if visit.needs_traitement > 0:
            stock.traitement = max(0, (stock.traitement or 0) - int(visit.needs_traitement))
            if stock.traitement < stock.traitement_min:
                stock_alerts.append(f"Traitement ruche bas ({stock.traitement} < seuil {stock.traitement_min})")
        applied["stock_deducted"] = {
            "sirop": visit.needs_sirop,
            "pate": visit.needs_pate,
            "traitement": visit.needs_traitement,
        }

    # 3. Création automatique d'entrée production si récolte
    production_created = None
    if (visit.harvest_kg or 0) > 0 or (visit.pollen_kg or 0) > 0:
        apiary = db.query(BeeApiary).filter(BeeApiary.id == hive.apiary_id).first()
        prod = BeeProduction(
            hive_id=hive.id,
            apiary_id=hive.apiary_id,
            flower_type=apiary.flower_type if apiary else None,
            production_date=visit.visit_date,
            honey_kg=visit.harvest_kg or 0,
            pollen_kg=visit.pollen_kg or 0,
            quality_notes=f"Auto depuis visite #{visit.id}",
        )
        db.add(prod)
        production_created = {"honey_kg": prod.honey_kg, "pollen_kg": prod.pollen_kg}
        applied["production_created"] = production_created

    db.commit()

    return {
        "status": "applied",
        "visit_id": visit_id,
        "applied": applied,
        "stock_alerts": stock_alerts,
    }


@router.delete("/visits/{visit_id}")
def delete_visit(visit_id: int, db: Session = Depends(get_db)):
    obj = db.query(BeeVisit).filter(BeeVisit.id == visit_id).first()
    if not obj:
        raise HTTPException(404, "Visit not found")
    db.delete(obj)
    db.commit()
    return {"status": "deleted", "id": visit_id}


# ─── Productions (ruche-level) ────────────────────────────────────────────────

@router.get("/productions", response_model=List[ProductionOut])
def list_productions(
    apiary_id: Optional[int] = None,
    hive_id: Optional[int] = None,
    flower_type: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    q = db.query(BeeProduction)
    if apiary_id:
        q = q.filter(BeeProduction.apiary_id == apiary_id)
    if hive_id:
        q = q.filter(BeeProduction.hive_id == hive_id)
    if flower_type:
        q = q.filter(BeeProduction.flower_type == flower_type)
    return q.order_by(desc(BeeProduction.production_date)).limit(limit).all()


@router.post("/productions", response_model=ProductionOut, status_code=201)
def create_production(body: ProductionIn, db: Session = Depends(get_db)):
    data = body.model_dump()
    # Auto-fill flower_type from apiary if not provided
    if not data.get("flower_type") and data.get("apiary_id"):
        apiary = db.query(BeeApiary).filter(BeeApiary.id == data["apiary_id"]).first()
        if apiary:
            data["flower_type"] = apiary.flower_type
    # Auto-fill apiary_id from hive if not provided
    if not data.get("apiary_id") and data.get("hive_id"):
        hive = db.query(BeeHive).filter(BeeHive.id == data["hive_id"]).first()
        if hive:
            data["apiary_id"] = hive.apiary_id
            if not data.get("flower_type"):
                apiary = db.query(BeeApiary).filter(BeeApiary.id == hive.apiary_id).first()
                if apiary:
                    data["flower_type"] = apiary.flower_type
    obj = BeeProduction(**data)
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


@router.get("/productions/analytics")
def production_analytics(db: Session = Depends(get_db)):
    """
    Agrégation production :
    - Par ruche (performance individuelle)
    - Par site (total ferme)
    - Par type de fleur (analytics florale)
    """
    # Par ruche
    by_hive = (
        db.query(
            BeeHive.id.label("hive_id"),
            BeeHive.identifier.label("hive_name"),
            func.sum(BeeProduction.honey_kg).label("honey"),
            func.sum(BeeProduction.pollen_kg).label("pollen"),
            func.count(BeeProduction.id).label("records"),
        )
        .outerjoin(BeeProduction, BeeProduction.hive_id == BeeHive.id)
        .group_by(BeeHive.id, BeeHive.identifier)
        .all()
    )

    # Par site
    by_apiary = (
        db.query(
            BeeApiary.id.label("apiary_id"),
            BeeApiary.name.label("apiary_name"),
            func.sum(BeeProduction.honey_kg).label("honey"),
            func.sum(BeeProduction.pollen_kg).label("pollen"),
        )
        .outerjoin(BeeProduction, BeeProduction.apiary_id == BeeApiary.id)
        .group_by(BeeApiary.id, BeeApiary.name)
        .all()
    )

    # Par fleur
    by_flower = (
        db.query(
            BeeProduction.flower_type,
            func.sum(BeeProduction.honey_kg).label("honey"),
            func.sum(BeeProduction.pollen_kg).label("pollen"),
            func.count(BeeProduction.id).label("records"),
        )
        .filter(BeeProduction.flower_type.isnot(None))
        .group_by(BeeProduction.flower_type)
        .all()
    )

    return {
        "by_hive": [
            {"hive_id": r.hive_id, "hive_name": r.hive_name,
             "honey": round(r.honey or 0, 2), "pollen": round(r.pollen or 0, 2),
             "records": r.records}
            for r in by_hive
        ],
        "by_apiary": [
            {"apiary_id": r.apiary_id, "apiary_name": r.apiary_name,
             "honey": round(r.honey or 0, 2), "pollen": round(r.pollen or 0, 2)}
            for r in by_apiary
        ],
        "by_flower": [
            {"flower_type": r.flower_type,
             "honey": round(r.honey or 0, 2), "pollen": round(r.pollen or 0, 2),
             "records": r.records}
            for r in by_flower
        ],
    }


# ─── Stock Logs (legacy) ─────────────────────────────────────────────────────

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
    total_honey  = db.query(func.sum(BeeProduction.honey_kg)).scalar() or 0
    total_pollen = db.query(func.sum(BeeProduction.pollen_kg)).scalar() or 0
    total_hives  = db.query(func.count(BeeHive.id)).scalar() or 0
    active_hives = db.query(func.count(BeeHive.id)).filter(BeeHive.is_active == True).scalar() or 0
    total_visits = db.query(func.count(BeeVisit.id)).scalar() or 0
    urgent_visits = db.query(func.count(BeeVisit.id)).filter(BeeVisit.health_state == "urgent").scalar() or 0

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

    monthly = (
        db.query(BeeProduction.production_date, func.sum(BeeProduction.honey_kg).label("honey"))
        .group_by(BeeProduction.production_date)
        .order_by(BeeProduction.production_date)
        .limit(30)
        .all()
    )

    return {
        "total_honey_kg":  round(total_honey, 2),
        "total_pollen_kg": round(total_pollen, 2),
        "total_hives":     total_hives,
        "active_hives":    active_hives,
        "total_visits":    total_visits,
        "urgent_visits":   urgent_visits,
        "by_apiary": [
            {"name": r.name, "honey": round(r.honey or 0, 2),
             "pollen": round(r.pollen or 0, 2), "harvests": r.harvests}
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
    """Synchronise les données localStorage vers la base de données."""
    created = {"apiaries": 0, "hives": 0, "visits": 0, "productions": 0, "stock_logs": 0}

    apiary_id_map: dict = {}
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

    for v in body.visites:
        db_hive_id = hive_id_map.get(str(v.get("rucheId")))
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
