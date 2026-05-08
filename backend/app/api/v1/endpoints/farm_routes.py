"""Smart Farm AI - Farm Routes (multi-owner + multi-farm workers)"""
from typing import List, Optional
import random
import string
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.farm_service import FarmService
from app.schemas.domain import FarmCreate, FarmUpdate
from app.models.domain import Farm, FarmOwner, FarmFinance, User


router = APIRouter(prefix="/farms", tags=["Farms"])

# ── Local request schemas ──────────────────────────────────────────────────────

class WorkerCreateRequest(BaseModel):
    full_name: str
    phone_number: str

class WorkerUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None

class OwnerAddRequest(BaseModel):
    identifier: str  # username OR phone number of the owner to add

class FinanceCreate(BaseModel):
    type: str # expense, revenue
    category: str
    amount: float
    notes: Optional[str] = None



# ── Helpers ────────────────────────────────────────────────────────────────────

def _worker_to_dict(assignment, user):
    return {
        "assignment_id": assignment.id,
        "worker_id": user.id,
        "full_name": user.full_name or user.username,
        "phone_number": user.phone_number,
        "username": user.username,
        "assigned_at": assignment.assigned_at.isoformat() if assignment.assigned_at else None,
    }

def _owner_to_dict(farm_owner, user):
    return {
        "farm_owner_id": farm_owner.id,
        "owner_id": user.id,
        "full_name": user.full_name or user.username,
        "username": user.username,
        "phone_number": user.phone_number,
        "email": user.email,
        "added_at": farm_owner.added_at.isoformat() if farm_owner.added_at else None,
    }


# ── Farm CRUD ──────────────────────────────────────────────────────────────────

@router.get("", response_model=List[dict])
def list_farms(db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = FarmService(db)
    results = svc.list_farms()
    out = []
    for r in results:
        f = r["farm"]
        out.append({
            "id": f.id, "name": f.name, "location": f.location,
            "description": f.description, "status": f.status,
            "latitude": f.latitude, "longitude": f.longitude,
            "total_area_ha": f.total_area_ha, "owner_id": f.owner_id,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "unit_count": r["unit_count"],
            "active_alerts": r["active_alerts"],
            "avg_health_score": r["avg_health_score"],
        })
    return out


@router.post("", status_code=201)
def create_farm(data: FarmCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from app.models.domain import FarmOwner
    farm = FarmService(db).create_farm(data, owner_id=user.id)
    # Auto-enroll the creator as the first farm owner
    existing = db.query(FarmOwner).filter(
        FarmOwner.farm_id == farm.id,
        FarmOwner.owner_id == user.id,
    ).first()
    if not existing:
        db.add(FarmOwner(farm_id=farm.id, owner_id=user.id))
        db.commit()
    return farm


@router.get("/{farm_id}")
def get_farm(farm_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    r = FarmService(db).get_farm(farm_id)
    f = r["farm"]
    return {
        "id": f.id, "name": f.name, "location": f.location,
        "description": f.description, "status": f.status,
        "latitude": f.latitude, "longitude": f.longitude,
        "total_area_ha": f.total_area_ha, "owner_id": f.owner_id,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "unit_count": r["unit_count"],
        "active_alerts": r["active_alerts"],
        "avg_health_score": r["avg_health_score"],
    }


@router.put("/{farm_id}")
def update_farm(farm_id: int, data: FarmUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return FarmService(db).update_farm(farm_id, data)


@router.delete("/{farm_id}", status_code=204)
def delete_farm(farm_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    FarmService(db).delete_farm(farm_id)


# ── Owner Management ───────────────────────────────────────────────────────────

@router.get("/{farm_id}/owners")
def list_farm_owners(farm_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List all owners of a farm. Falls back to the legacy owner_id if farm_owners is empty."""
    from app.models.domain import Farm, FarmOwner, User

    entries = (
        db.query(FarmOwner)
        .filter(FarmOwner.farm_id == farm_id)
        .all()
    )

    # Graceful backward compat: if no entries yet, seed from farm.owner_id
    if not entries:
        farm = db.query(Farm).filter(Farm.id == farm_id).first()
        if farm and farm.owner_id:
            seed = FarmOwner(farm_id=farm_id, owner_id=farm.owner_id)
            db.add(seed)
            db.commit()
            db.refresh(seed)
            entries = [seed]

    return [_owner_to_dict(e, e.owner) for e in entries]


@router.post("/{farm_id}/owners", status_code=201)
def add_farm_owner(
    farm_id: int,
    data: OwnerAddRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Add an existing owner-role user to this farm by username or phone number."""
    from sqlalchemy import or_
    from app.models.domain import Farm, FarmOwner, User

    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Ferme introuvable.")

    ident = data.identifier.strip()
    user = db.query(User).filter(
        or_(User.username == ident, User.phone_number == ident)
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Aucun compte trouvé avec cet identifiant (nom d'utilisateur ou téléphone)."
        )
    if user.role != "owner":
        raise HTTPException(
            status_code=400,
            detail=f"'{user.username}' est un ouvrier, pas un propriétaire. Seuls les propriétaires peuvent gérer une ferme."
        )

    existing = db.query(FarmOwner).filter(
        FarmOwner.farm_id == farm_id,
        FarmOwner.owner_id == user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ce propriétaire gère déjà cette ferme.")

    entry = FarmOwner(farm_id=farm_id, owner_id=user.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _owner_to_dict(entry, user)


@router.delete("/{farm_id}/owners/{owner_id}", status_code=204)
def remove_farm_owner(
    farm_id: int,
    owner_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Remove an owner from a farm. At least one owner must remain."""
    from app.models.domain import FarmOwner

    total = db.query(FarmOwner).filter(FarmOwner.farm_id == farm_id).count()
    if total <= 1:
        raise HTTPException(
            status_code=400,
            detail="Impossible de supprimer le dernier propriétaire. Une ferme doit avoir au moins un propriétaire."
        )

    entry = db.query(FarmOwner).filter(
        FarmOwner.farm_id == farm_id,
        FarmOwner.owner_id == owner_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ce propriétaire n'est pas associé à cette ferme.")

    db.delete(entry)
    db.commit()


# ── Worker Management ──────────────────────────────────────────────────────────

@router.get("/{farm_id}/workers")
def list_farm_workers(farm_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """List all active workers assigned to a farm."""
    from app.models.domain import WorkerAssignment
    assignments = (
        db.query(WorkerAssignment)
        .filter(WorkerAssignment.farm_id == farm_id, WorkerAssignment.is_active == True)
        .all()
    )
    return [_worker_to_dict(a, a.worker) for a in assignments]


@router.post("/{farm_id}/workers", status_code=201)
def add_farm_worker(
    farm_id: int,
    data: WorkerCreateRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Create a new worker account and assign to farm, or reassign an existing worker."""
    from app.models.domain import Farm, User, WorkerAssignment
    from app.core.security import hash_password

    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Ferme introuvable.")

    existing_user = db.query(User).filter(User.phone_number == data.phone_number).first()

    if existing_user:
        if existing_user.role != "worker":
            raise HTTPException(
                status_code=400,
                detail="Ce numéro appartient à un compte propriétaire — il ne peut pas être assigné comme ouvrier."
            )
        already = db.query(WorkerAssignment).filter(
            WorkerAssignment.worker_id == existing_user.id,
            WorkerAssignment.farm_id == farm_id,
            WorkerAssignment.is_active == True,
        ).first()
        if already:
            raise HTTPException(status_code=400, detail="Cet ouvrier est déjà assigné à cette ferme.")
        if data.full_name:
            existing_user.full_name = data.full_name
        assignment = WorkerAssignment(worker_id=existing_user.id, farm_id=farm_id, pin_code="", is_active=True)
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return _worker_to_dict(assignment, existing_user)

    # Brand-new worker account
    phone_digits = data.phone_number.replace("+", "").replace(" ", "")
    base_username = f"worker_{phone_digits}"
    username = base_username
    suffix = 0
    while db.query(User).filter(User.username == username).first():
        suffix += 1
        username = f"{base_username}_{suffix}"

    random_pw = "".join(random.choices(string.ascii_letters + string.digits, k=16))
    new_user = User(
        username=username,
        full_name=data.full_name,
        phone_number=data.phone_number,
        password_hash=hash_password(random_pw),
        role="worker",
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    assignment = WorkerAssignment(worker_id=new_user.id, farm_id=farm_id, pin_code="", is_active=True)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    db.refresh(new_user)
    return _worker_to_dict(assignment, new_user)


@router.put("/{farm_id}/workers/{worker_id}")
def update_farm_worker(
    farm_id: int,
    worker_id: int,
    data: WorkerUpdateRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Update a worker's name and/or phone number."""
    from app.models.domain import User, WorkerAssignment

    assignment = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == worker_id,
        WorkerAssignment.farm_id == farm_id,
        WorkerAssignment.is_active == True,
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Ouvrier non assigné à cette ferme.")

    user = db.query(User).filter(User.id == worker_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone_number is not None:
        conflict = db.query(User).filter(
            User.phone_number == data.phone_number, User.id != worker_id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Ce numéro est déjà utilisé par un autre compte.")
        user.phone_number = data.phone_number

    db.commit()
    db.refresh(user)
    return _worker_to_dict(assignment, user)


@router.delete("/{farm_id}/workers/{worker_id}", status_code=204)
def remove_farm_worker(
    farm_id: int,
    worker_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Remove a worker from this farm. Deletes the user account if they have no other assignments."""
    from app.models.domain import User, WorkerAssignment

    assignment = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == worker_id,
        WorkerAssignment.farm_id == farm_id,
    ).first()
    if assignment:
        db.delete(assignment)

    other_count = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == worker_id,
        WorkerAssignment.farm_id != farm_id,
    ).count()
    if other_count == 0:
        user = db.query(User).filter(User.id == worker_id).first()
        if user:
            db.delete(user)

    db.commit()

# ── Farm Finance (FMIS) ─────────────────────────────────────────────────────────

@router.get("/{farm_id}/finance")
def list_farm_finance(
    farm_id: int,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    query = db.query(FarmFinance).filter(FarmFinance.farm_id == farm_id)
    if type:
        query = query.filter(FarmFinance.type == type)
    finances = query.order_by(FarmFinance.timestamp.desc()).all()
    
    # Calculate summary
    expenses = sum(f.amount for f in finances if f.type == "expense")
    revenues = sum(f.amount for f in finances if f.type == "revenue")
    
    return {
        "items": [{
            "id": f.id, "type": f.type, "category": f.category,
            "amount": f.amount, "notes": f.notes, 
            "timestamp": f.timestamp.isoformat()
        } for f in finances],
        "summary": {
            "total_expenses": expenses,
            "total_revenues": revenues,
            "net_profit": revenues - expenses
        }
    }

@router.post("/{farm_id}/finance", status_code=201)
def add_farm_finance(
    farm_id: int,
    data: FinanceCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    entry = FarmFinance(
        farm_id=farm_id,
        type=data.type,
        category=data.category,
        amount=data.amount,
        notes=data.notes
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

