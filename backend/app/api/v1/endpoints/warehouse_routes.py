"""Smart Farm AI — Entrepôt de la Ferme (Warehouse CRUD + STOKKY Assistant)"""
import logging
from typing import Optional
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import WarehouseCategory, WarehouseItem, WarehouseAlert
from app.schemas.domain import WarehouseItemCreate, WarehouseItemUpdate

logger = logging.getLogger("stokky")

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
    item.updated_at = datetime.now(timezone.utc)
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


DEFAULT_ITEMS_BY_ORDER = {
    # ── 1. Semences et Plants ─────────────────────────────────────────────────
    1: [
        {"emoji":"🌾","name_ar":"بذور القمح الصلب",      "name_fr":"Semences blé dur",               "description":"Variété Mohamed Ben Bachir — sac 100 kg","quantity":0,"unit":"sacs",    "min_quantity":5},
        {"emoji":"🌽","name_ar":"بذور الذرة الهجينة",    "name_fr":"Semences maïs hybride",          "description":"Hybride simple — sac 25 kg certifié",   "quantity":0,"unit":"sacs",    "min_quantity":3},
        {"emoji":"🍅","name_ar":"بذور الطماطم F1",        "name_fr":"Semences tomates F1",            "description":"Sachet 5 g — pour 500 plants",          "quantity":0,"unit":"sachets", "min_quantity":5},
        {"emoji":"🫑","name_ar":"بذور الفلفل الحلو",     "name_fr":"Graines poivrons doux Lamuyo",   "description":"Hybride Lamuyo F1 — sachet 5 g",        "quantity":0,"unit":"sachets", "min_quantity":5},
        {"emoji":"🧅","name_ar":"شتلات البصل",            "name_fr":"Bulbes d'oignons",               "description":"Calibre 16-18 mm — filet 10 kg",        "quantity":0,"unit":"filets",  "min_quantity":5},
        {"emoji":"🌱","name_ar":"بذور الشعير",            "name_fr":"Semences orge Arig 8",           "description":"Variété Arig 8 — sac 50 kg certifié",   "quantity":0,"unit":"sacs",    "min_quantity":5},
    ],
    # ── 2. Engrais ────────────────────────────────────────────────────────────
    2: [
        {"emoji":"♻️","name_ar":"سماد عضوي (كمبوست)",    "name_fr":"Compost organique",              "description":"Issu de fumier de bovins composté",     "quantity":0,"unit":"sacs",    "min_quantity":10},
        {"emoji":"🧪","name_ar":"سماد يوريا 46%",         "name_fr":"Urée 46%",                       "description":"Engrais azoté — sac 50 kg",             "quantity":0,"unit":"sacs",    "min_quantity":5},
        {"emoji":"⚗️","name_ar":"سماد NPK مركب",         "name_fr":"NPK 15-15-15",                   "description":"Engrais complet granulé — sac 50 kg",   "quantity":0,"unit":"sacs",    "min_quantity":5},
        {"emoji":"💎","name_ar":"سوبر فوسفات",            "name_fr":"Superphosphate 46%",             "description":"Engrais phosphaté minéral — sac 50 kg", "quantity":0,"unit":"sacs",    "min_quantity":3},
        {"emoji":"🪣","name_ar":"سماد ورقي هيدروذائب",   "name_fr":"Engrais foliaire hydrosoluble",  "description":"Seau 5 kg — dissolution totale en eau", "quantity":0,"unit":"seaux",   "min_quantity":3},
        {"emoji":"🐄","name_ar":"روث الأبقار المجفف",     "name_fr":"Fumier bovin séché",             "description":"Amendement naturel — sac 40 kg",        "quantity":0,"unit":"sacs",    "min_quantity":10},
    ],
    # ── 3. Pesticides et Protection ───────────────────────────────────────────
    3: [
        {"emoji":"🪲","name_ar":"مبيد حشري",              "name_fr":"Insecticide",                    "description":"Lambda-cyhalothrine — bidon 1 L",       "quantity":0,"unit":"bidons",  "min_quantity":3},
        {"emoji":"🍄","name_ar":"مبيد فطري",               "name_fr":"Fongicide",                      "description":"Mancozèbe 80 % WP — sachet 500 g",      "quantity":0,"unit":"sachets", "min_quantity":3},
        {"emoji":"⚠️","name_ar":"مبيد الأعشاب",            "name_fr":"Herbicide céréales",             "description":"2,4-D amine 72 % — bidon 2 L",          "quantity":0,"unit":"bidons",  "min_quantity":3},
        {"emoji":"🌿","name_ar":"مبيد حيوي (نيم)",         "name_fr":"Insecticide naturel neem",       "description":"Azadirachtine bio — flacon 500 ml",     "quantity":0,"unit":"flacons", "min_quantity":3},
        {"emoji":"🪤","name_ar":"مصائد حشرات لاصقة",      "name_fr":"Pièges collants insectes",       "description":"Jaunes et bleus — paquet 20 pièces",    "quantity":0,"unit":"paquets", "min_quantity":5},
        {"emoji":"🦺","name_ar":"معدات الوقاية (EPI)",    "name_fr":"EPI phytosanitaire",             "description":"Combinaison + gants + masque + lunettes","quantity":0,"unit":"kits",   "min_quantity":2},
    ],
    # ── 4. Outils Agricoles ───────────────────────────────────────────────────
    4: [
        {"emoji":"⛏️","name_ar":"مجرفة",                  "name_fr":"Bêche",                          "description":"Acier forgé — manche bois 130 cm",      "quantity":0,"unit":"pièces",  "min_quantity":3},
        {"emoji":"🔨","name_ar":"فأس",                    "name_fr":"Pioche",                         "description":"Manche bois 90 cm — tête 2 kg",         "quantity":0,"unit":"pièces",  "min_quantity":3},
        {"emoji":"🪓","name_ar":"المنجل",                  "name_fr":"Faucille",                       "description":"Lame acier trempé 30 cm",               "quantity":0,"unit":"pièces",  "min_quantity":5},
        {"emoji":"✂️","name_ar":"مقص التشذيب",            "name_fr":"Sécateur",                       "description":"Lame inox — ressort anti-fatigue",      "quantity":0,"unit":"pièces",  "min_quantity":4},
        {"emoji":"🪚","name_ar":"منشار التشذيب",          "name_fr":"Scie élagage à main",            "description":"Lame 35 cm — branches jusqu'à 15 cm",  "quantity":0,"unit":"pièces",  "min_quantity":3},
        {"emoji":"🧺","name_ar":"عربة يدوية",             "name_fr":"Brouette",                       "description":"Capacité 80 L — caisse galvanisée",     "quantity":0,"unit":"pièces",  "min_quantity":2},
    ],
    # ── 5. Matériel d'Irrigation ──────────────────────────────────────────────
    5: [
        {"emoji":"🚰","name_ar":"أنابيب بولي إيتيلين",    "name_fr":"Tuyaux polyéthylène PE32",       "description":"Rouleau 100 m — diamètre 32 mm",       "quantity":0,"unit":"rouleaux","min_quantity":5},
        {"emoji":"💧","name_ar":"أنابيب التنقيط",          "name_fr":"Goutteurs intégrés 2 L/h",       "description":"Rouleau 200 m — espacement 30 cm",     "quantity":0,"unit":"rouleaux","min_quantity":5},
        {"emoji":"💦","name_ar":"رشاشات دوارة",            "name_fr":"Asperseurs rotatifs",            "description":"Portée 8 m — débit 120 L/h",           "quantity":0,"unit":"pièces",  "min_quantity":10},
        {"emoji":"⚡","name_ar":"مضخة مياه كهربائية",     "name_fr":"Pompe électrique 1.5 kW",        "description":"Débit 3 m³/h — HMT 30 m",              "quantity":0,"unit":"pièces",  "min_quantity":1},
        {"emoji":"🔩","name_ar":"توصيلات وصمامات",         "name_fr":"Raccords PVC et vannes",         "description":"Assortiment 50 pièces",                "quantity":0,"unit":"kits",    "min_quantity":3},
        {"emoji":"⏱️","name_ar":"مبرمج الري التلقائي",    "name_fr":"Programmateur arrosage",         "description":"6 zones — batterie 9 V",               "quantity":0,"unit":"pièces",  "min_quantity":1},
    ],
    # ── 6. Alimentation Animale ───────────────────────────────────────────────
    6: [
        {"emoji":"🌾","name_ar":"تبن القمح",               "name_fr":"Paille de blé",                  "description":"Botte ronde 300 kg — stockage couvert","quantity":0,"unit":"bottes",  "min_quantity":10},
        {"emoji":"🌿","name_ar":"فين البرسيم",             "name_fr":"Foin de luzerne",                "description":"Botte carrée 25 kg — haute valeur énergétique","quantity":0,"unit":"bottes","min_quantity":10},
        {"emoji":"🐔","name_ar":"علف الدواجن (ناهي)",      "name_fr":"Aliment finition volailles",     "description":"Sac 25 kg — phase terminale",          "quantity":0,"unit":"sacs",    "min_quantity":10},
        {"emoji":"🐄","name_ar":"علف مركز للأبقار",        "name_fr":"Concentré laitier bovins",       "description":"Sac 50 kg — 18 % protéines",           "quantity":0,"unit":"sacs",    "min_quantity":5},
        {"emoji":"🐑","name_ar":"علف الغنم والماعز",       "name_fr":"Aliment ovins-caprins",          "description":"Sac 25 kg — engraissement",            "quantity":0,"unit":"sacs",    "min_quantity":5},
        {"emoji":"💊","name_ar":"مكملات معدنية وفيتامينية","name_fr":"Prémix vitamines-minéraux",     "description":"Sac 5 kg — pour tous animaux",         "quantity":0,"unit":"sacs",    "min_quantity":3},
    ],
    # ── 7. Cultures Stockées ──────────────────────────────────────────────────
    7: [
        {"emoji":"🌾","name_ar":"قمح صلب مخزن",           "name_fr":"Blé dur stocké",                 "description":"Sac 100 kg — silo béton ventilé",      "quantity":0,"unit":"sacs",    "min_quantity":20},
        {"emoji":"🌽","name_ar":"ذرة صفراء جافة",         "name_fr":"Maïs grain sec",                 "description":"Sac 50 kg — taux humidité < 14 %",     "quantity":0,"unit":"sacs",    "min_quantity":10},
        {"emoji":"🫙","name_ar":"شعير مخزن",               "name_fr":"Orge fourrager stocké",          "description":"Sac 50 kg — alimentation animale",     "quantity":0,"unit":"sacs",    "min_quantity":10},
        {"emoji":"🥔","name_ar":"بطاطس",                   "name_fr":"Pommes de terre",                "description":"Caisse 25 kg — chambre froide 4°C",    "quantity":0,"unit":"caisses", "min_quantity":5},
        {"emoji":"🧅","name_ar":"بصل جاف",                "name_fr":"Oignons secs",                   "description":"Filet 10 kg — stocké au sec",          "quantity":0,"unit":"filets",  "min_quantity":5},
        {"emoji":"🫒","name_ar":"زيتون",                   "name_fr":"Olives récoltées",               "description":"Caisse plastique 20 kg",               "quantity":0,"unit":"caisses", "min_quantity":5},
    ],
    # ── 8. Boîtes et Emballage ────────────────────────────────────────────────
    8: [
        {"emoji":"🗃️","name_ar":"صناديق بلاستيكية مثقبة","name_fr":"Caisses plastique ventilées",   "description":"600×400×200 mm — empilables",          "quantity":0,"unit":"pièces",  "min_quantity":20},
        {"emoji":"🛍️","name_ar":"أكياس خيش",              "name_fr":"Sacs de jute",                   "description":"50 kg — biodégradables",               "quantity":0,"unit":"pièces",  "min_quantity":50},
        {"emoji":"🎒","name_ar":"أكياس بولي بروبيلين",    "name_fr":"Sacs polypropylène 25/50 kg",    "description":"Tissés — résistants à l'humidité",     "quantity":0,"unit":"pièces",  "min_quantity":50},
        {"emoji":"📦","name_ar":"كراتين الشحن",            "name_fr":"Cartons d'expédition",           "description":"40×30×20 cm — double cannelure",       "quantity":0,"unit":"pièces",  "min_quantity":30},
        {"emoji":"🪵","name_ar":"منصات أوروبية (EPAL)",   "name_fr":"Palettes Europe EPAL",           "description":"80×120 cm — charge 1000 kg",           "quantity":0,"unit":"pièces",  "min_quantity":10},
    ],
    # ── 9. Matériel de Maintenance ────────────────────────────────────────────
    9: [
        {"emoji":"🛢️","name_ar":"زيت المحرك 15W40",       "name_fr":"Huile moteur 15W40",             "description":"Bidon 5 L — moteurs diesel",           "quantity":0,"unit":"bidons",  "min_quantity":3},
        {"emoji":"🧴","name_ar":"زيت الهيدروليك 46",       "name_fr":"Huile hydraulique 46",           "description":"Bidon 5 L — vérins et pompes",         "quantity":0,"unit":"bidons",  "min_quantity":3},
        {"emoji":"⚙️","name_ar":"شحم التزليق",             "name_fr":"Graisse lithium",                "description":"Cartouche 400 g — roulements et pivots","quantity":0,"unit":"cartouches","min_quantity":5},
        {"emoji":"🔧","name_ar":"قطع غيار مضخة",           "name_fr":"Pièces détachées pompe",         "description":"Joint torique, clapet, crépine",       "quantity":0,"unit":"kits",    "min_quantity":2},
        {"emoji":"🔋","name_ar":"بطاريات 12V",             "name_fr":"Batteries 12V",                  "description":"Pour capteurs IoT et minuteries",      "quantity":0,"unit":"pièces",  "min_quantity":10},
        {"emoji":"🪛","name_ar":"علبة أدوات الصيانة",     "name_fr":"Kit outils réparation complet",  "description":"Tournevis, clés, pinces — 42 pièces",  "quantity":0,"unit":"kits",    "min_quantity":1},
    ],
    # ── 10. Équipements de Sécurité ───────────────────────────────────────────
    10: [
        {"emoji":"🧤","name_ar":"قفازات الحماية",          "name_fr":"Gants de protection",            "description":"Anti-coupure niveau 5 — norme EN388",  "quantity":0,"unit":"paires",  "min_quantity":5},
        {"emoji":"😷","name_ar":"أقنعة FFP2",              "name_fr":"Masques FFP2",                   "description":"Boîte 20 pièces — protection chimique","quantity":0,"unit":"boîtes",  "min_quantity":3},
        {"emoji":"🥾","name_ar":"حذاء السلامة S3",         "name_fr":"Chaussures sécurité S3",         "description":"Embout acier — semelle anti-perforation","quantity":0,"unit":"paires", "min_quantity":2},
        {"emoji":"🥽","name_ar":"نظارات السلامة",          "name_fr":"Lunettes de protection",         "description":"Anti-UV et anti-projections",          "quantity":0,"unit":"pièces",  "min_quantity":5},
        {"emoji":"🧯","name_ar":"طفاية الحريق ABC",        "name_fr":"Extincteur ABC 6 kg",            "description":"Poudre polyvalente — norme NF EN 3",   "quantity":0,"unit":"pièces",  "min_quantity":2},
    ],
}


def _generate_stock_alerts(db: Session) -> int:
    """Scan all items and create unresolved stock alerts for quantity ≤ 0 or ≤ min_quantity.
    Clears existing unresolved alerts first to avoid duplicates after a reseed."""
    db.query(WarehouseAlert).filter(WarehouseAlert.is_resolved == False).delete()  # noqa: E712
    cat_map = {c.id: c.name_fr or c.name_ar for c in db.query(WarehouseCategory).all()}
    items = db.query(WarehouseItem).all()
    count = 0
    for item in items:
        name = item.name_fr or item.name_ar
        if item.quantity <= 0:
            db.add(WarehouseAlert(
                item_id=item.id, item_name=name,
                category_name=cat_map.get(item.category_id, ""),
                emoji=item.emoji or "📦", alert_type="stock_out", severity="critical",
                message=f"Rupture de stock : {name} — quantité = 0",
            ))
            count += 1
        elif item.min_quantity and item.quantity <= item.min_quantity:
            db.add(WarehouseAlert(
                item_id=item.id, item_name=name,
                category_name=cat_map.get(item.category_id, ""),
                emoji=item.emoji or "📦", alert_type="stock_low", severity="warning",
                message=f"Stock faible : {name} — {item.quantity} {item.unit or ''} restant(s)",
            ))
            count += 1
    db.commit()
    return count


@router.post("/seed-items", status_code=201)
def seed_items_only(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Seed default articles into existing categories (by display_order). Skips categories that already have items."""
    cats = db.query(WarehouseCategory).order_by(WarehouseCategory.display_order).all()
    if not cats:
        raise HTTPException(status_code=400, detail="Aucune catégorie — lancez /seed d'abord")
    total = 0
    for cat in cats:
        existing = db.query(WarehouseItem).filter(WarehouseItem.category_id == cat.id).count()
        if existing > 0:
            continue
        for item_data in DEFAULT_ITEMS_BY_ORDER.get(cat.display_order, []):
            db.add(WarehouseItem(category_id=cat.id, **item_data))
            total += 1
    db.commit()
    alerts_created = _generate_stock_alerts(db)
    return {"message": f"{total} articles créés, {alerts_created} alertes générées."}


@router.post("/seed", status_code=201)
def seed_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    existing = db.query(WarehouseCategory).count()
    if existing > 0:
        return {"message": f"{existing} catégories déjà présentes, seed ignoré."}
    created_cats = []
    for cat_data in DEFAULT_CATEGORIES:
        cat = WarehouseCategory(**cat_data)
        db.add(cat)
        created_cats.append(cat)
    db.flush()

    total_items = 0
    for cat in created_cats:
        items_data = DEFAULT_ITEMS_BY_ORDER.get(cat.display_order, [])
        for item_data in items_data:
            db.add(WarehouseItem(category_id=cat.id, **item_data))
            total_items += 1

    db.commit()
    alerts_created = _generate_stock_alerts(db)
    return {"message": f"{len(DEFAULT_CATEGORIES)} catégories, {total_items} articles, {alerts_created} alertes créées."}


@router.post("/reseed", status_code=201)
def reseed_items(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Force-delete all existing items in default categories and recreate from seed data."""
    cats = db.query(WarehouseCategory).order_by(WarehouseCategory.display_order).all()
    if not cats:
        raise HTTPException(status_code=400, detail="Aucune catégorie — lancez /seed d'abord")
    total = 0
    for cat in cats:
        items_for_order = DEFAULT_ITEMS_BY_ORDER.get(cat.display_order, [])
        if not items_for_order:
            continue
        db.query(WarehouseItem).filter(WarehouseItem.category_id == cat.id).delete()
        for item_data in items_for_order:
            db.add(WarehouseItem(category_id=cat.id, **item_data))
            total += 1
    db.commit()
    alerts_created = _generate_stock_alerts(db)
    return {"message": f"{total} articles réinitialisés, {alerts_created} alertes générées."}


# ── Warehouse Alerts ──────────────────────────────────────────────────────────

def _ser_walert(a: WarehouseAlert) -> dict:
    return {
        "id":            a.id,
        "item_id":       a.item_id,
        "item_name":     a.item_name,
        "category_name": a.category_name,
        "emoji":         a.emoji,
        "alert_type":    a.alert_type,
        "message":       a.message,
        "severity":      a.severity,
        "is_resolved":   a.is_resolved,
        "resolved_at":   a.resolved_at.isoformat() if a.resolved_at else None,
        "created_at":    a.created_at.isoformat() if a.created_at else None,
    }


@router.get("/alerts")
def list_warehouse_alerts(resolved: bool = Query(False), db: Session = Depends(get_db), _=Depends(get_current_user)):
    q = db.query(WarehouseAlert).filter(WarehouseAlert.is_resolved == resolved)  # noqa: E712
    return [_ser_walert(a) for a in q.order_by(WarehouseAlert.created_at.desc()).limit(200).all()]


@router.post("/alerts", status_code=201)
def create_warehouse_alert(data: dict, db: Session = Depends(get_db), _=Depends(get_current_user)):
    alert = WarehouseAlert(
        item_id=data.get("item_id"),
        item_name=data.get("item_name", ""),
        category_name=data.get("category_name"),
        emoji=data.get("emoji"),
        alert_type=data.get("alert_type", "stock_out"),
        message=data.get("message", ""),
        severity=data.get("severity", "critical"),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return _ser_walert(alert)


@router.put("/alerts/{alert_id}/resolve", status_code=200)
def resolve_warehouse_alert(alert_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    alert = db.query(WarehouseAlert).filter(WarehouseAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    alert.is_resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    return _ser_walert(alert)


@router.delete("/alerts/{alert_id}", status_code=204)
def delete_warehouse_alert(alert_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    db.query(WarehouseAlert).filter(WarehouseAlert.id == alert_id).delete()
    db.commit()


# ── STOKKY — Warehouse AI Assistant ──────────────────────────────────────────

class _StokkyQuery(BaseModel):
    query: str
    lang:  str = "fr"


@router.post("/assistant")
async def warehouse_assistant(
    body: _StokkyQuery,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """STOKKY — assistant IA dédié à la gestion d'entrepôt agricole."""
    cats  = db.query(WarehouseCategory).order_by(WarehouseCategory.display_order).all()
    items = db.query(WarehouseItem).order_by(WarehouseItem.category_id, WarehouseItem.id).all()

    # Build inventory snapshot grouped by category
    inventory_lines: list[str] = []
    alerts_lines:    list[str] = []
    now = datetime.now(timezone.utc)

    for cat in cats:
        cat_items = [i for i in items if i.category_id == cat.id]
        if not cat_items:
            continue
        inventory_lines.append(f"\n📂 {cat.name_fr} ({cat.name_ar}):")
        for item in cat_items:
            name  = item.name_fr or item.name_ar
            qty   = item.quantity
            unit  = item.unit or ""
            min_q = item.min_quantity or 0

            if qty <= 0:
                status_icon = "🔴 RUPTURE"
                alerts_lines.append(f"URGENT — Rupture totale : {name} (0 {unit})")
            elif min_q and qty <= min_q:
                status_icon = "🟡 FAIBLE"
                alerts_lines.append(f"IMPORTANT — Stock critique : {name} ({qty}/{min_q} {unit} min requis)")
            else:
                status_icon = "🟢 OK"

            expiry_note = ""
            if item.expiry_date:
                days_left = (item.expiry_date - now).days
                expiry_note = f" | exp: {item.expiry_date.strftime('%d/%m/%Y')}"
                if 0 < days_left <= 30:
                    alerts_lines.append(f"NORMAL — Expiration proche : {name} dans {days_left} jour(s)")
                elif days_left <= 0:
                    alerts_lines.append(f"URGENT — Expiré : {name}")

            inventory_lines.append(
                f"  {item.emoji or '📦'} {name}: {qty} {unit} [{status_icon}]{expiry_note}"
            )

    out_count  = sum(1 for i in items if i.quantity <= 0)
    low_count  = sum(1 for i in items if (i.min_quantity or 0) > 0 and 0 < i.quantity <= i.min_quantity)
    ok_count   = len(items) - out_count - low_count
    inv_text   = "\n".join(inventory_lines) or "Aucun article en stock."
    alert_text = "\n".join(alerts_lines)    or "Aucune alerte critique détectée."

    is_ar = body.lang.startswith("ar")

    if is_ar:
        system_prompt = f"""أنت STOKKY، المساعد الذكي لإدارة مخزن المزرعة.
تعرف كل مقال، الكميات الحالية، حالة المخزون وتواريخ الانتهاء.
**تجاوب دائماً بالدارجة التونسية** — مباشر، واضح، مع emojis مناسبة.
تحدد الأولويات: عاجل > مهم > عادي.
تذكر الأرقام الحقيقية من المخزون في كل إجابة.
مختصر (5–8 أسطر) لكن دقيق وعملي.

=== المخزون الحالي ({len(items)} مقال، {len(cats)} فئة) ===
{inv_text}

=== ملخص الوضع ===
• نقص كامل: {out_count} مقال
• مخزون ناقص: {low_count} مقال
• وضع جيد: {ok_count} مقال

=== أولويات التدخل ===
{alert_text}

تعليمات:
- اذكر الأرقام الحقيقية من المخزون.
- استعمل عاجل / مهم / عادي لترتيب نصائحك.
- اقترح إجراءات عملية (طلب، تزود، فحص).
- الجواب بالدارجة التونسية مع emojis."""
    else:
        system_prompt = f"""Tu es STOKKY, l'assistant intelligent de gestion d'entrepôt agricole de la ferme.
Tu connais parfaitement chaque article, ses quantités actuelles, son état de stock et ses dates d'expiration.
Tu réponds toujours en français professionnel, avec des emojis pertinents et une présentation structurée.
Tu priorises URGENT > IMPORTANT > NORMAL dans tes recommandations.
Tu cites systématiquement les chiffres réels de l'inventaire dans tes réponses.
Tu es concis (5–10 lignes max) mais précis et actionnable.

=== INVENTAIRE ACTUEL ({len(items)} articles, {len(cats)} catégories) ===
{inv_text}

=== RÉSUMÉ CRITIQUE ===
• Ruptures totales : {out_count} article(s)
• Stock faible    : {low_count} article(s)
• En ordre        : {ok_count} article(s)

=== ALERTES PRIORITAIRES ===
{alert_text}

DIRECTIVES :
- Cite toujours les quantités exactes de l'inventaire ci-dessus.
- Utilise URGENT / IMPORTANT / NORMAL pour hiérarchiser tes conseils.
- Recommande des actions concrètes (commander, réapprovisionner, vérifier).
- Réponds en français professionnel avec des emojis appropriés."""

    api_key = getattr(settings, "GROQ_API_KEY", "") or ""
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user",   "content": body.query},
                        ],
                        "max_tokens": 600,
                        "temperature": 0.35,
                    },
                )
            resp.raise_for_status()
            answer = resp.json()["choices"][0]["message"]["content"]
            return {"response": answer}
        except Exception as exc:
            logger.warning(f"[STOKKY] Groq error: {exc}")

    # Static fallback (no API key or Groq unreachable)
    if is_ar:
        if out_count > 0:
            top = "\n".join(a for a in alerts_lines if a.startswith("URGENT"))[:3] or alerts_lines[0]
            return {"response": f"🔴 **عاجل** — فمّا {out_count} مقال نقص مخزونه الكامل:\n{top}\n\n➡️ لازم تطلب تزود فوري!"}
        if low_count > 0:
            top = "\n".join(a for a in alerts_lines if a.startswith("IMPORTANT"))[:3]
            return {"response": f"🟡 **مهم** — فمّا {low_count} مقال مخزونه قليل:\n{top}\n\n➡️ خطط للطلب هذا الأسبوع."}
        return {"response": f"🟢 المخزن بخير. فمّا {len(items)} مقال تحت المراقبة — ما فماش نقص."}
    else:
        if out_count > 0:
            top = "\n".join(a for a in alerts_lines if a.startswith("URGENT"))[:3] or alerts_lines[0]
            return {"response": f"🔴 **URGENT** — {out_count} article(s) en rupture totale :\n{top}\n\n➡️ Lancer des commandes de réapprovisionnement immédiatement."}
        if low_count > 0:
            top = "\n".join(a for a in alerts_lines if a.startswith("IMPORTANT"))[:3]
            return {"response": f"🟡 **IMPORTANT** — {low_count} article(s) en stock critique :\n{top}\n\n➡️ Planifier des commandes urgentes cette semaine."}
        return {"response": f"🟢 L'entrepôt est en bon état. {len(items)} articles surveillés — aucune rupture ni stock critique."}
