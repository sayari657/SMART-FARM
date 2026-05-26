"""
Bee Management — Module Stock à deux niveaux
  Niveau 1 : Stock global entrepôt (singleton)
  Niveau 2 : Stock par ruche individuelle
Déductions · Alertes niveaux bas · Réapprovisionnement
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import BeeGlobalStock, BeeHiveStock, BeeHive

router = APIRouter(prefix="/bee/stock", tags=["Bee Stock"], dependencies=[Depends(get_current_user)])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class GlobalStockIn(BaseModel):
    sirop: float = 0
    pate: float = 0
    traitement: int = 0
    cadres: int = 0
    hausse: int = 0
    equipement: int = 0
    sirop_min: float = 50
    pate_min: float = 20
    traitement_min: int = 10
    cadres_min: int = 20

class GlobalStockOut(GlobalStockIn):
    id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class HiveStockIn(BaseModel):
    sirop: float = 0
    pate: float = 0
    traitement: int = 0
    cadres: int = 0
    sirop_min: float = 2
    pate_min: float = 1
    traitement_min: int = 1

class HiveStockOut(HiveStockIn):
    id: int
    hive_id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DeductIn(BaseModel):
    sirop: float = 0
    pate: float = 0
    traitement: int = 0
    cadres: int = 0
    sync_global: bool = False   # Si True, déduit aussi du stock global


# ─── Global Stock ─────────────────────────────────────────────────────────────

def _get_or_create_global(db: Session) -> BeeGlobalStock:
    obj = db.query(BeeGlobalStock).first()
    if not obj:
        obj = BeeGlobalStock()
        db.add(obj)
        db.commit()
        db.refresh(obj)
    return obj


@router.get("/global", response_model=GlobalStockOut)
def get_global_stock(db: Session = Depends(get_db)):
    return _get_or_create_global(db)


@router.put("/global", response_model=GlobalStockOut)
def update_global_stock(body: GlobalStockIn, db: Session = Depends(get_db)):
    obj = _get_or_create_global(db)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/global/restock")
def restock_global(body: GlobalStockIn, db: Session = Depends(get_db)):
    """Ajoute des quantités au stock global (livraison fournisseur)."""
    obj = _get_or_create_global(db)
    obj.sirop      += body.sirop
    obj.pate       += body.pate
    obj.traitement += body.traitement
    obj.cadres     += body.cadres
    obj.hausse     += body.hausse
    obj.equipement += body.equipement
    db.commit()
    db.refresh(obj)
    alerts = _global_stock_alerts(obj)
    return {"updated": True, "stock": GlobalStockOut.model_validate(obj), "alerts": alerts}


# ─── Hive Stock ───────────────────────────────────────────────────────────────

def _get_or_create_hive_stock(hive_id: int, db: Session) -> BeeHiveStock:
    obj = db.query(BeeHiveStock).filter(BeeHiveStock.hive_id == hive_id).first()
    if not obj:
        obj = BeeHiveStock(hive_id=hive_id)
        db.add(obj)
        db.commit()
        db.refresh(obj)
    return obj


@router.get("/hive/{hive_id}", response_model=HiveStockOut)
def get_hive_stock(hive_id: int, db: Session = Depends(get_db)):
    hive = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
    if not hive:
        raise HTTPException(404, "Hive not found")
    return _get_or_create_hive_stock(hive_id, db)


@router.put("/hive/{hive_id}", response_model=HiveStockOut)
def update_hive_stock(hive_id: int, body: HiveStockIn, db: Session = Depends(get_db)):
    hive = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
    if not hive:
        raise HTTPException(404, "Hive not found")
    obj = _get_or_create_hive_stock(hive_id, db)
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/hive/{hive_id}/deduct")
def deduct_hive_stock(hive_id: int, body: DeductIn, db: Session = Depends(get_db)):
    """
    Déduit des ressources du stock ruche.
    Si sync_global=True, déduit aussi du stock global entrepôt.
    Retourne les alertes de stock bas.
    """
    hive = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
    if not hive:
        raise HTTPException(404, "Hive not found")

    stock = _get_or_create_hive_stock(hive_id, db)
    alerts: List[str] = []

    if body.sirop > 0:
        stock.sirop = max(0.0, (stock.sirop or 0) - body.sirop)
        if stock.sirop < stock.sirop_min:
            alerts.append(f"⚠ Sirop ruche bas : {stock.sirop:.1f}L (seuil {stock.sirop_min}L)")
    if body.pate > 0:
        stock.pate = max(0.0, (stock.pate or 0) - body.pate)
        if stock.pate < stock.pate_min:
            alerts.append(f"⚠ Pâte ruche basse : {stock.pate:.1f}kg (seuil {stock.pate_min}kg)")
    if body.traitement > 0:
        stock.traitement = max(0, (stock.traitement or 0) - body.traitement)
        if stock.traitement < stock.traitement_min:
            alerts.append(f"⚠ Traitement ruche bas : {stock.traitement} dose(s) (seuil {stock.traitement_min})")
    if body.cadres > 0:
        stock.cadres = max(0, (stock.cadres or 0) - body.cadres)

    # Synchronisation optionnelle stock global
    global_alerts: List[str] = []
    if body.sync_global:
        gstock = _get_or_create_global(db)
        if body.sirop > 0:
            gstock.sirop = max(0.0, (gstock.sirop or 0) - body.sirop)
        if body.pate > 0:
            gstock.pate = max(0.0, (gstock.pate or 0) - body.pate)
        if body.traitement > 0:
            gstock.traitement = max(0, (gstock.traitement or 0) - body.traitement)
        global_alerts = _global_stock_alerts(gstock)

    db.commit()
    return {
        "hive_id": hive_id,
        "deducted": body.model_dump(exclude={"sync_global"}),
        "hive_stock": HiveStockOut.model_validate(stock),
        "hive_alerts": alerts,
        "global_alerts": global_alerts,
    }


@router.post("/hive/{hive_id}/replenish")
def replenish_hive_stock(hive_id: int, body: HiveStockIn, db: Session = Depends(get_db)):
    """
    Réapprovisionne le stock d'une ruche (transfert depuis l'entrepôt).
    Déduit automatiquement du stock global.
    """
    hive = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
    if not hive:
        raise HTTPException(404, "Hive not found")

    hstock = _get_or_create_hive_stock(hive_id, db)
    gstock = _get_or_create_global(db)

    if body.sirop > 0:
        if (gstock.sirop or 0) < body.sirop:
            raise HTTPException(400, f"Stock global insuffisant: {gstock.sirop:.1f}L disponibles, {body.sirop}L demandés")
        gstock.sirop  -= body.sirop
        hstock.sirop   = (hstock.sirop or 0) + body.sirop

    if body.pate > 0:
        if (gstock.pate or 0) < body.pate:
            raise HTTPException(400, f"Stock pâte global insuffisant: {gstock.pate:.1f}kg disponibles")
        gstock.pate  -= body.pate
        hstock.pate   = (hstock.pate or 0) + body.pate

    if body.traitement > 0:
        if (gstock.traitement or 0) < body.traitement:
            raise HTTPException(400, f"Stock traitement global insuffisant: {gstock.traitement} disponibles")
        gstock.traitement  -= body.traitement
        hstock.traitement   = (hstock.traitement or 0) + body.traitement

    if body.cadres > 0:
        gstock.cadres  = max(0, (gstock.cadres or 0) - body.cadres)
        hstock.cadres  = (hstock.cadres or 0) + body.cadres

    db.commit()
    db.refresh(hstock)
    return {
        "hive_id": hive_id,
        "hive_stock": HiveStockOut.model_validate(hstock),
        "global_alerts": _global_stock_alerts(gstock),
    }


# ─── Alertes stock ────────────────────────────────────────────────────────────

def _global_stock_alerts(obj: BeeGlobalStock) -> List[str]:
    alerts = []
    if (obj.sirop or 0) < obj.sirop_min:
        alerts.append(f"⚠ Stock global sirop bas : {obj.sirop:.1f}L (seuil {obj.sirop_min}L)")
    if (obj.pate or 0) < obj.pate_min:
        alerts.append(f"⚠ Stock global pâte bas : {obj.pate:.1f}kg (seuil {obj.pate_min}kg)")
    if (obj.traitement or 0) < obj.traitement_min:
        alerts.append(f"⚠ Stock global traitement bas : {obj.traitement} doses (seuil {obj.traitement_min})")
    if (obj.cadres or 0) < obj.cadres_min:
        alerts.append(f"⚠ Stock global cadres bas : {obj.cadres} (seuil {obj.cadres_min})")
    return alerts


@router.get("/alerts")
def all_stock_alerts(db: Session = Depends(get_db)):
    """Agrège toutes les alertes de stock (global + toutes ruches)."""
    alerts: List[dict] = []

    # Global
    gstock = db.query(BeeGlobalStock).first()
    if gstock:
        for msg in _global_stock_alerts(gstock):
            alerts.append({"level": "global", "hive_id": None, "message": msg})

    # Ruches
    hive_stocks = db.query(BeeHiveStock).all()
    for hs in hive_stocks:
        hive = db.query(BeeHive).filter(BeeHive.id == hs.hive_id).first()
        label = hive.identifier if hive else f"Ruche #{hs.hive_id}"
        if (hs.sirop or 0) < hs.sirop_min:
            alerts.append({"level": "hive", "hive_id": hs.hive_id,
                           "message": f"⚠ [{label}] Sirop bas : {hs.sirop:.1f}L"})
        if (hs.pate or 0) < hs.pate_min:
            alerts.append({"level": "hive", "hive_id": hs.hive_id,
                           "message": f"⚠ [{label}] Pâte basse : {hs.pate:.1f}kg"})
        if (hs.traitement or 0) < hs.traitement_min:
            alerts.append({"level": "hive", "hive_id": hs.hive_id,
                           "message": f"⚠ [{label}] Traitement bas : {hs.traitement} dose(s)"})

    return {"total_alerts": len(alerts), "alerts": alerts}
