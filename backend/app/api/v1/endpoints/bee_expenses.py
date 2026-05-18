"""
Bee Management — Module Dépenses
Suivi comptable par ruche / site · Analyse coût/profit
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import BeeExpense, BeeHive, BeeApiary, BeeProduction

router = APIRouter(prefix="/bee/expenses", tags=["Bee Expenses"], dependencies=[Depends(get_current_user)])

VALID_CATEGORIES = [
    "Alimentation", "Traitement", "Équipement",
    "Transport", "Main-d'œuvre", "Autre"
]


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ExpenseIn(BaseModel):
    hive_id: Optional[int] = None
    apiary_id: Optional[int] = None
    visit_id: Optional[int] = None
    expense_date: str
    amount: float                           # Montant réel dépensé
    amount_planned: Optional[float] = None  # Montant prévisionnel
    category: str
    description: Optional[str] = None

class ExpenseOut(ExpenseIn):
    id: int
    created_at: datetime
    class Config: from_attributes = True


# ─── CRUD ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ExpenseOut])
def list_expenses(
    hive_id: Optional[int] = None,
    apiary_id: Optional[int] = None,
    category: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    q = db.query(BeeExpense)
    if hive_id:
        q = q.filter(BeeExpense.hive_id == hive_id)
    if apiary_id:
        q = q.filter(BeeExpense.apiary_id == apiary_id)
    if category:
        q = q.filter(BeeExpense.category == category)
    return q.order_by(desc(BeeExpense.expense_date)).limit(limit).all()


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(body: ExpenseIn, db: Session = Depends(get_db)):
    if body.category not in VALID_CATEGORIES:
        raise HTTPException(400, f"Catégorie invalide. Valeurs: {VALID_CATEGORIES}")
    if body.amount <= 0:
        raise HTTPException(400, "Le montant doit être positif")

    data = body.model_dump()
    # Auto-fill apiary_id from hive
    if not data.get("apiary_id") and data.get("hive_id"):
        hive = db.query(BeeHive).filter(BeeHive.id == data["hive_id"]).first()
        if hive:
            data["apiary_id"] = hive.apiary_id

    obj = BeeExpense(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, body: ExpenseIn, db: Session = Depends(get_db)):
    obj = db.query(BeeExpense).filter(BeeExpense.id == expense_id).first()
    if not obj:
        raise HTTPException(404, "Expense not found")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    obj = db.query(BeeExpense).filter(BeeExpense.id == expense_id).first()
    if not obj:
        raise HTTPException(404, "Expense not found")
    db.delete(obj)
    db.commit()
    return {"status": "deleted", "id": expense_id}


# ─── Analyse financière ──────────────────────────────────────────────────────

@router.get("/summary")
def financial_summary(
    hive_id: Optional[int] = None,
    apiary_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Analyse financière complète :
    - Total dépenses par catégorie
    - Coût par ruche
    - Coût par ferme
    - Chiffre d'affaires estimé (production × prix moyen miel)
    - Profit estimé
    """
    HONEY_PRICE_PER_KG = 25.0   # TND/kg — ajustable

    q_exp = db.query(BeeExpense)
    q_prod = db.query(BeeProduction)

    if hive_id:
        q_exp  = q_exp.filter(BeeExpense.hive_id == hive_id)
        q_prod = q_prod.filter(BeeProduction.hive_id == hive_id)
    elif apiary_id:
        q_exp  = q_exp.filter(BeeExpense.apiary_id == apiary_id)
        q_prod = q_prod.filter(BeeProduction.apiary_id == apiary_id)

    expenses  = q_exp.all()
    prods     = q_prod.all()

    total_expenses = sum(e.amount for e in expenses)
    total_planned  = sum(e.amount_planned for e in expenses if e.amount_planned is not None)
    ecart          = round(total_expenses - total_planned, 2) if total_planned else None
    total_honey_kg = sum(p.honey_kg for p in prods)
    total_revenue  = round(total_honey_kg * HONEY_PRICE_PER_KG, 2)
    profit         = round(total_revenue - total_expenses, 2)

    # Par catégorie
    by_category: dict = {}
    for e in expenses:
        by_category.setdefault(e.category, 0.0)
        by_category[e.category] += e.amount

    # Par ruche
    by_hive_raw: dict = {}
    for e in expenses:
        if e.hive_id:
            by_hive_raw.setdefault(e.hive_id, 0.0)
            by_hive_raw[e.hive_id] += e.amount

    hive_ids = list(by_hive_raw.keys())
    hives = db.query(BeeHive).filter(BeeHive.id.in_(hive_ids)).all() if hive_ids else []
    hive_map = {h.id: h.identifier for h in hives}

    by_hive = [
        {"hive_id": hid, "identifier": hive_map.get(hid, f"#{hid}"),
         "total": round(v, 2)}
        for hid, v in by_hive_raw.items()
    ]
    by_hive.sort(key=lambda x: -x["total"])

    # Par site
    by_apiary_raw: dict = {}
    for e in expenses:
        if e.apiary_id:
            by_apiary_raw.setdefault(e.apiary_id, 0.0)
            by_apiary_raw[e.apiary_id] += e.amount

    apiary_ids = list(by_apiary_raw.keys())
    apiaries = db.query(BeeApiary).filter(BeeApiary.id.in_(apiary_ids)).all() if apiary_ids else []
    apiary_map = {a.id: a.name for a in apiaries}

    by_apiary = [
        {"apiary_id": aid, "name": apiary_map.get(aid, f"#{aid}"),
         "total": round(v, 2)}
        for aid, v in by_apiary_raw.items()
    ]

    return {
        "total_expenses":    round(total_expenses, 2),
        "total_planned":     round(total_planned, 2),
        "ecart":             ecart,
        "total_honey_kg":    round(total_honey_kg, 2),
        "total_revenue_tnd": total_revenue,
        "profit_tnd":        profit,
        "honey_price_kg":    HONEY_PRICE_PER_KG,
        "by_category":  {k: round(v, 2) for k, v in by_category.items()},
        "by_hive":      by_hive,
        "by_apiary":    by_apiary,
    }
