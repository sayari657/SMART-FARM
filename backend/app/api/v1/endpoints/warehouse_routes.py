"""Smart Farm AI — Entrepôt de la Ferme (Warehouse CRUD)"""
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import WarehouseCategory, WarehouseItem
from app.schemas.domain import WarehouseItemCreate, WarehouseItemUpdate

router = APIRouter(prefix="/warehouse", tags=["Warehouse"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _ser_item(item: WarehouseItem) -> dict:
    return {
        "id":           item.id,
        "category_id":  item.category_id,
        "name_ar":      item.name_ar,
        "name_fr":      item.name_fr,
        "emoji":        item.emoji,
        "description":  item.description,
        "quantity":     item.quantity,
        "unit":         item.unit,
        "min_quantity": item.min_quantity,
        "status":       item.status,
        "entry_date":   item.entry_date.isoformat()  if item.entry_date  else None,
        "expiry_date":  item.expiry_date.isoformat() if item.expiry_date else None,
        "notes":        item.notes,
        "created_at":   item.created_at.isoformat()  if item.created_at  else None,
        "updated_at":   item.updated_at.isoformat()  if item.updated_at  else None,
    }

def _ser_cat(cat: WarehouseCategory, items: list) -> dict:
    return {
        "id":            cat.id,
        "name_ar":       cat.name_ar,
        "name_fr":       cat.name_fr,
        "icon":          cat.icon,
        "emoji":         cat.emoji or "",
        "color":         cat.color,
        "display_order": cat.display_order,
        "items":         [_ser_item(i) for i in items],
    }


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/categories")
def list_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    cats = db.query(WarehouseCategory).order_by(WarehouseCategory.display_order).all()
    result = []
    for cat in cats:
        items = db.query(WarehouseItem).filter(
            WarehouseItem.category_id == cat.id
        ).order_by(WarehouseItem.id).all()
        result.append(_ser_cat(cat, items))
    return result


@router.put("/categories/{cat_id}")
def update_category(
    cat_id: int,
    data: dict,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    cat = db.query(WarehouseCategory).filter(WarehouseCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    for field in ("name_ar", "name_fr", "icon", "emoji", "color"):
        if field in data and data[field] is not None:
            setattr(cat, field, data[field])
    db.commit()
    db.refresh(cat)
    items = db.query(WarehouseItem).filter(WarehouseItem.category_id == cat.id).all()
    return _ser_cat(cat, items)


@router.delete("/categories/{cat_id}", status_code=204)
def delete_category(
    cat_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    cat = db.query(WarehouseCategory).filter(WarehouseCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    db.delete(cat)
    db.commit()


@router.post("/categories", status_code=201)
def create_category(
    data: dict,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Create a new warehouse category."""
    name_ar = (data.get("name_ar") or "").strip()
    name_fr = (data.get("name_fr") or "").strip()
    if not name_ar or not name_fr:
        raise HTTPException(status_code=422, detail="name_ar et name_fr requis")
    last = db.query(WarehouseCategory).order_by(WarehouseCategory.display_order.desc()).first()
    next_order = (last.display_order + 1) if last else 1
    cat = WarehouseCategory(
        name_ar=name_ar,
        name_fr=name_fr,
        icon=data.get("icon", "Package"),
        emoji=data.get("emoji") or None,
        color=data.get("color", "#16a34a"),
        display_order=next_order,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": cat.id, "name_ar": cat.name_ar, "name_fr": cat.name_fr,
            "icon": cat.icon, "color": cat.color, "display_order": cat.display_order, "items": []}


# ── Items ─────────────────────────────────────────────────────────────────────

@router.get("/items")
def list_items(
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(WarehouseItem)
    if category_id:
        q = q.filter(WarehouseItem.category_id == category_id)
    return [_ser_item(i) for i in q.order_by(WarehouseItem.id).all()]


@router.post("/items", status_code=201)
def create_item(
    data: WarehouseItemCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    cat = db.query(WarehouseCategory).filter(WarehouseCategory.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    item = WarehouseItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _ser_item(item)


@router.put("/items/{item_id}")
def update_item(
    item_id: int,
    data: WarehouseItemUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Article introuvable")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return _ser_item(item)


@router.delete("/items/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    item = db.query(WarehouseItem).filter(WarehouseItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Article introuvable")
    db.delete(item)
    db.commit()


# ── Seed (idempotent — run once to populate default categories) ───────────────

DEFAULT_CATEGORIES = [
    {"name_ar": "البذور والشتلات",   "name_fr": "Semences et Plants",           "icon": "Sprout",      "color": "#16a34a", "display_order": 1},
    {"name_ar": "الأسمدة",           "name_fr": "Engrais",                      "icon": "FlaskConical","color": "#0ea5e9", "display_order": 2},
    {"name_ar": "المبيدات والحماية", "name_fr": "Pesticides et Protection",     "icon": "ShieldAlert", "color": "#dc2626", "display_order": 3},
    {"name_ar": "أدوات الزراعة",    "name_fr": "Outils Agricoles",             "icon": "Shovel",      "color": "#d97706", "display_order": 4},
    {"name_ar": "معدات الري",        "name_fr": "Matériel d'Irrigation",        "icon": "Droplets",    "color": "#0891b2", "display_order": 5},
    {"name_ar": "الأعلاف",           "name_fr": "Alimentation Animale",         "icon": "Beef",        "color": "#7c3aed", "display_order": 6},
    {"name_ar": "المحاصيل المخزنة",  "name_fr": "Cultures Stockées",            "icon": "Package",     "color": "#ca8a04", "display_order": 7},
    {"name_ar": "مواد التعبئة",      "name_fr": "Boîtes et Emballage",          "icon": "Layers",      "color": "#059669", "display_order": 8},
    {"name_ar": "مواد الصيانة",      "name_fr": "Matériel de Maintenance",      "icon": "Wrench",      "color": "#64748b", "display_order": 9},
    {"name_ar": "معدات السلامة",     "name_fr": "Équipements de Sécurité",      "icon": "HardHat",     "color": "#ea580c", "display_order": 10},
]


@router.post("/seed", status_code=201)
def seed_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    existing = db.query(WarehouseCategory).count()
    if existing > 0:
        return {"message": f"{existing} catégories déjà présentes, seed ignoré."}
    for cat_data in DEFAULT_CATEGORIES:
        db.add(WarehouseCategory(**cat_data))
    db.commit()
    return {"message": f"{len(DEFAULT_CATEGORIES)} catégories créées avec succès."}
