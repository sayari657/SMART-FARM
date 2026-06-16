"""
Smart Farm AI — SuperAdmin API  (niveau maximum)
==================================================
Couverture complète :
  - Stats & Revenue (mensuel, cohortes)
  - Tenant management complet (view/edit/impersonate)
  - User CRUD complet (create/update/delete/reset-password)
  - Plans & limites
  - Feature Flags
  - AI Models (depuis mlruns.db)
  - Broadcast messages
  - Audit Log
  - System health + DB backup
  - PWA version control

Tous les endpoints nécessitent role=superadmin.
"""

import json
import os
import shutil
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import tempfile

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import func, text, extract
from sqlalchemy.orm import Session

from app.core.database import get_db, engine
from app.core.security import require_superadmin, hash_password, create_access_token
from app.models.domain import AnimalUnit, AuditLog, Broadcast, Farm, User

router = APIRouter(prefix="/superadmin", tags=["SuperAdmin"])

# ── Paths ─────────────────────────────────────────────────────────────────────
_BASE     = os.path.dirname(__file__)
_ROOT     = os.path.normpath(os.path.join(_BASE, *[".."] * 5))
_VER_FILE = os.path.join(_ROOT, "frontend", "public", "version.json")
_FLAGS_FILE = os.path.join(_ROOT, "backend", "feature_flags.json")
_DB_PATH  = os.path.join(_ROOT, "backend", "smart_farm.db")

PLAN_LIMITS = {
    "free":       {"max_animals": 50,  "max_workers": 1,  "max_farms": 1,  "price_eur": 0,  "ai_access": False},
    "pro":        {"max_animals": -1,  "max_workers": 5,  "max_farms": 3,  "price_eur": 29, "ai_access": True},
    "enterprise": {"max_animals": -1,  "max_workers": -1, "max_farms": -1, "price_eur": 0,  "ai_access": True},
}

DEFAULT_FLAGS = {
    "cv_monitoring":       True,
    "ai_recommendations":  True,
    "telemetry_realtime":  True,
    "pwa_worker_app":      True,
    "bee_module":          True,
    "poultry_module":      True,
    "plantation_module":   True,
    "export_pdf":          True,
    "export_excel":        True,
    "sovereign_assistant": True,
    "map_center":          True,
    "maintenance_mode":    False,
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class PlanUpdate(BaseModel):
    plan: str
    expires_days: Optional[int] = None

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: str = "owner"
    plan: str = "free"

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    plan: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class PasswordReset(BaseModel):
    new_password: str

class PWAVersionUpdate(BaseModel):
    version: str
    changelog: Optional[str] = None
    force: bool = False

class FlagUpdate(BaseModel):
    flags: dict

class BroadcastCreate(BaseModel):
    title: str
    body: str
    target: str = "all"   # all | owner | worker


# ── Audit helper ──────────────────────────────────────────────────────────────

def _audit(db: Session, admin: User, action: str, target_id: Optional[int] = None,
           detail: Optional[dict] = None, request: Optional[Request] = None):
    ip = None
    if request:
        ip = request.client.host if request.client else None
    log = AuditLog(
        admin_id=admin.id,
        action=action,
        target_id=target_id,
        detail=json.dumps(detail or {}),
        ip_address=ip,
    )
    db.add(log)
    db.commit()


# ── Version / Flags helpers ───────────────────────────────────────────────────

def _read_version() -> dict:
    if os.path.exists(_VER_FILE):
        with open(_VER_FILE) as f:
            return json.load(f)
    return {"version": "3.0.0", "force": False, "changelog": "", "updated_at": ""}

def _write_version(data: dict):
    os.makedirs(os.path.dirname(_VER_FILE), exist_ok=True)
    with open(_VER_FILE, "w") as f:
        json.dump(data, f, indent=2)

def _read_flags() -> dict:
    if os.path.exists(_FLAGS_FILE):
        with open(_FLAGS_FILE) as f:
            return json.load(f)
    return DEFAULT_FLAGS.copy()

def _write_flags(data: dict):
    with open(_FLAGS_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ══════════════════════════════════════════════════════════════════════════════
# 1. STATS & REVENUE
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/stats")
def platform_stats(db: Session = Depends(get_db), _: User = Depends(require_superadmin)):
    from app.core.cache import cache_get, cache_set
    hit = cache_get("superadmin:stats")
    if hit is not None:
        return hit
    total_owners  = db.query(func.count(User.id)).filter(User.role == "owner").scalar() or 0
    total_workers = db.query(func.count(User.id)).filter(User.role == "worker").scalar() or 0
    total_farms   = db.query(func.count(Farm.id)).scalar() or 0
    total_animals = db.query(func.count(AnimalUnit.id)).scalar() or 0
    active_users  = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    inactive      = db.query(func.count(User.id)).filter(User.is_active == False).scalar() or 0

    plans = db.query(User.plan, func.count(User.id)).filter(User.role == "owner").group_by(User.plan).all()
    plan_dist = {p or "free": c for p, c in plans}

    mrr = (plan_dist.get("pro", 0) * 29)
    arr = mrr * 12

    cutoff_30  = datetime.now(timezone.utc) - timedelta(days=30)
    cutoff_7   = datetime.now(timezone.utc) - timedelta(days=7)
    new_month  = db.query(func.count(User.id)).filter(User.role == "owner", User.created_at >= cutoff_30).scalar() or 0
    new_week   = db.query(func.count(User.id)).filter(User.role == "owner", User.created_at >= cutoff_7).scalar() or 0

    stats_result = {
        "owners": total_owners, "workers": total_workers,
        "farms": total_farms, "animals": total_animals,
        "active_users": active_users, "inactive_users": inactive,
        "plan_dist": plan_dist,
        "mrr_eur": mrr, "arr_eur": arr,
        "new_this_month": new_month, "new_this_week": new_week,
        "pwa_version": _read_version().get("version", "3.0.0"),
        "maintenance_mode": _read_flags().get("maintenance_mode", False),
    }
    cache_set("superadmin:stats", stats_result, ttl=120)  # 2 min
    return stats_result


@router.get("/stats/growth")
def growth_stats(db: Session = Depends(get_db), _: User = Depends(require_superadmin)):
    """Monthly user growth for last 12 months."""
    months = []
    for i in range(11, -1, -1):
        d = datetime.now(timezone.utc) - timedelta(days=i * 30)
        label = d.strftime("%b %Y")
        count = db.query(func.count(User.id)).filter(
            User.role == "owner",
            User.created_at <= d,
        ).scalar() or 0
        months.append({"month": label, "cumulative": count})
    return months


@router.get("/stats/revenue")
def revenue_stats(db: Session = Depends(get_db), _: User = Depends(require_superadmin)):
    """Monthly MRR for last 12 months (based on pro plan count)."""
    months = []
    for i in range(11, -1, -1):
        d = datetime.now(timezone.utc) - timedelta(days=i * 30)
        label = d.strftime("%b %Y")
        pro_count = db.query(func.count(User.id)).filter(
            User.role == "owner",
            User.plan == "pro",
            User.created_at <= d,
        ).scalar() or 0
        months.append({"month": label, "mrr": pro_count * 29, "pro_tenants": pro_count})
    return months


# ══════════════════════════════════════════════════════════════════════════════
# 2. TENANT MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/tenants")
def list_tenants(
    skip: int = Query(0, ge=0), limit: int = Query(50, le=200),
    plan: Optional[str] = None, search: Optional[str] = None,
    db: Session = Depends(get_db), _: User = Depends(require_superadmin),
):
    q = db.query(User).filter(User.role == "owner")
    if plan:
        q = q.filter(User.plan == plan)
    if search:
        q = q.filter(
            User.username.ilike(f"%{search}%") |
            User.email.ilike(f"%{search}%") |
            User.full_name.ilike(f"%{search}%")
        )
    owners = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for u in owners:
        farms = db.query(Farm).filter(Farm.owner_id == u.id).all()
        farm_ids = [f.id for f in farms]
        animal_count = 0
        if farm_ids:
            animal_count = db.query(func.count(AnimalUnit.id)).filter(
                AnimalUnit.farm_id.in_(farm_ids)
            ).scalar() or 0
        result.append({
            "id": u.id, "username": u.username,
            "full_name": u.full_name, "email": u.email,
            "phone_number": u.phone_number,
            "plan": u.plan or "free",
            "plan_expires_at": u.plan_expires_at.isoformat() if u.plan_expires_at else None,
            "is_active": u.is_active,
            "farms": [{"id": f.id, "name": f.name, "status": f.status, "location": f.location} for f in farms],
            "farm_count": len(farms), "animal_count": animal_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "limits": PLAN_LIMITS.get(u.plan or "free", PLAN_LIMITS["free"]),
        })
    return result


@router.get("/tenants/{user_id}")
def get_tenant(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_superadmin)):
    u = db.query(User).filter(User.id == user_id, User.role == "owner").first()
    if not u:
        raise HTTPException(404, "Owner not found")
    farms = db.query(Farm).filter(Farm.owner_id == u.id).all()
    farm_ids = [f.id for f in farms]
    animal_count = 0
    if farm_ids:
        animal_count = db.query(func.count(AnimalUnit.id)).filter(AnimalUnit.farm_id.in_(farm_ids)).scalar() or 0
    audit_count = db.query(func.count(AuditLog.id)).filter(AuditLog.target_id == user_id).scalar() or 0
    return {
        "id": u.id, "username": u.username, "full_name": u.full_name,
        "email": u.email, "phone_number": u.phone_number,
        "plan": u.plan or "free",
        "plan_expires_at": u.plan_expires_at.isoformat() if u.plan_expires_at else None,
        "is_active": u.is_active, "role": u.role,
        "farms": [{"id": f.id, "name": f.name, "status": f.status, "location": f.location,
                   "total_area_ha": f.total_area_ha, "created_at": f.created_at.isoformat() if f.created_at else None}
                  for f in farms],
        "farm_count": len(farms), "animal_count": animal_count,
        "audit_actions": audit_count,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "limits": PLAN_LIMITS.get(u.plan or "free", PLAN_LIMITS["free"]),
    }


@router.patch("/tenants/{user_id}/plan")
def update_tenant_plan(
    user_id: int, body: PlanUpdate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    if body.plan not in PLAN_LIMITS:
        raise HTTPException(400, f"Plan invalide. Choisir: {list(PLAN_LIMITS.keys())}")
    u = db.query(User).filter(User.id == user_id, User.role == "owner").first()
    if not u:
        raise HTTPException(404, "Owner not found")
    old_plan = u.plan
    u.plan = body.plan
    u.plan_expires_at = (datetime.now(timezone.utc) + timedelta(days=body.expires_days) if body.expires_days else None)
    db.commit()
    _audit(db, admin, "plan_update", user_id, {"old": old_plan, "new": body.plan}, request)
    from app.core.cache import cache_delete
    cache_delete("superadmin:stats")  # invalidate after plan change
    return {"ok": True, "user_id": user_id, "plan": body.plan}


@router.post("/tenants/{user_id}/impersonate")
def impersonate_tenant(
    user_id: int, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    """Generate a short-lived (1h) token to login as any owner for debugging."""
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    if u.role == "superadmin":
        raise HTTPException(400, "Cannot impersonate another superadmin")
    token = create_access_token(
        {"sub": u.username, "role": u.role, "impersonated_by": admin.username},
        expires_delta=timedelta(hours=1),
    )
    _audit(db, admin, "impersonate", user_id, {"target_username": u.username}, request)
    return {"access_token": token, "token_type": "bearer", "expires_in": 3600,
            "target_user": u.username, "target_role": u.role}


# ══════════════════════════════════════════════════════════════════════════════
# 3. USER CRUD COMPLET
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/users")
def list_all_users(
    skip: int = Query(0, ge=0), limit: int = Query(100, le=500),
    role: Optional[str] = None, search: Optional[str] = None,
    db: Session = Depends(get_db), _: User = Depends(require_superadmin),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if search:
        q = q.filter(User.username.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    users = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(func.count(User.id)).scalar() or 0
    return {
        "total": total,
        "users": [{"id": u.id, "username": u.username, "full_name": u.full_name,
                   "email": u.email, "phone_number": u.phone_number,
                   "role": u.role, "plan": u.plan, "is_active": u.is_active,
                   "created_at": u.created_at.isoformat() if u.created_at else None}
                  for u in users],
    }


@router.post("/users")
def create_user(
    body: UserCreate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "Username déjà utilisé")
    u = User(
        username=body.username,
        email=body.email,
        full_name=body.full_name,
        phone_number=body.phone_number,
        password_hash=hash_password(body.password),
        role=body.role,
        plan=body.plan,
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    _audit(db, admin, "user_create", u.id, {"username": u.username, "role": u.role}, request)
    return {"ok": True, "id": u.id, "username": u.username}


@router.put("/users/{user_id}")
def update_user(
    user_id: int, body: UserUpdate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    changes = {}
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(u, field, val)
        changes[field] = val
    db.commit()
    _audit(db, admin, "user_update", user_id, changes, request)
    return {"ok": True, "user_id": user_id, "changes": changes}


@router.patch("/users/{user_id}/reset-password")
def reset_password(
    user_id: int, body: PasswordReset, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    u.password_hash = hash_password(body.new_password)
    db.commit()
    _audit(db, admin, "password_reset", user_id, {}, request)
    return {"ok": True}


@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: int, body: UserStatusUpdate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    if user_id == admin.id:
        raise HTTPException(400, "Cannot deactivate your own account")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    u.is_active = body.is_active
    db.commit()
    _audit(db, admin, "user_status_toggle", user_id, {"is_active": body.is_active}, request)
    return {"ok": True, "user_id": user_id, "is_active": body.is_active}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete your own account")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    username = u.username
    db.delete(u)
    db.commit()
    _audit(db, admin, "user_delete", user_id, {"username": username}, request)
    return {"ok": True, "deleted_user_id": user_id}


# ══════════════════════════════════════════════════════════════════════════════
# 4. FEATURE FLAGS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/flags")
def get_flags(_: User = Depends(require_superadmin)):
    return _read_flags()


@router.put("/flags")
def update_flags(
    body: FlagUpdate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    current = _read_flags()
    current.update(body.flags)
    _write_flags(current)
    _audit(db, admin, "flags_update", None, body.flags, request)
    return {"ok": True, "flags": current}


# ══════════════════════════════════════════════════════════════════════════════
# 5. AI MODELS (depuis mlruns.db)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/ai-models")
def list_ai_models(_: User = Depends(require_superadmin)):
    """List registered models from MLflow's mlruns.db."""
    mlruns_db = os.path.join(_ROOT, "mlruns.db")
    if not os.path.exists(mlruns_db):
        return {"models": [], "experiments": []}
    try:
        conn = sqlite3.connect(mlruns_db)
        cur = conn.cursor()
        cur.execute("""
            SELECT rm.name, mv.version, mv.current_stage, mv.run_id, mv.creation_timestamp
            FROM registered_models rm
            LEFT JOIN model_versions mv ON rm.name = mv.name
            ORDER BY mv.current_stage, rm.name
        """)
        rows = cur.fetchall()

        cur.execute("SELECT experiment_id, name, lifecycle_stage FROM experiments ORDER BY experiment_id")
        exps = cur.fetchall()

        cur.execute("SELECT run_uuid, experiment_id, name, status FROM runs ORDER BY start_time DESC LIMIT 50")
        runs = cur.fetchall()
        conn.close()

        return {
            "models": [{"name": r[0], "version": r[1], "stage": r[2], "run_id": r[3],
                        "created_at": datetime.fromtimestamp(r[4] / 1000).isoformat() if r[4] else None}
                       for r in rows],
            "experiments": [{"id": e[0], "name": e[1], "status": e[2]} for e in exps],
            "recent_runs": [{"id": r[0], "experiment_id": r[1], "name": r[2], "status": r[3]} for r in runs],
            "total_models": len(set(r[0] for r in rows)),
            "total_experiments": len(exps),
        }
    except Exception as e:
        return {"models": [], "experiments": [], "error": str(e)}


# ══════════════════════════════════════════════════════════════════════════════
# 6. BROADCAST MESSAGES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/broadcasts")
def list_broadcasts(
    skip: int = Query(0, ge=0), limit: int = Query(20, le=100),
    db: Session = Depends(get_db), _: User = Depends(require_superadmin),
):
    items = db.query(Broadcast).order_by(Broadcast.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(func.count(Broadcast.id)).scalar() or 0
    return {
        "total": total,
        "items": [{"id": b.id, "title": b.title, "body": b.body, "target": b.target,
                   "created_at": b.created_at.isoformat() if b.created_at else None}
                  for b in items],
    }


@router.post("/broadcasts")
def create_broadcast(
    body: BroadcastCreate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    b = Broadcast(title=body.title, body=body.body, target=body.target, sent_by_id=admin.id)
    db.add(b)
    db.commit()
    db.refresh(b)
    _audit(db, admin, "broadcast_sent", b.id, {"title": body.title, "target": body.target}, request)
    return {"ok": True, "id": b.id}


@router.delete("/broadcasts/{bid}")
def delete_broadcast(
    bid: int, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    b = db.query(Broadcast).filter(Broadcast.id == bid).first()
    if not b:
        raise HTTPException(404, "Broadcast not found")
    db.delete(b)
    db.commit()
    _audit(db, admin, "broadcast_delete", bid, {}, request)
    return {"ok": True}


# Public endpoint — no auth — workers/owners poll this
@router.get("/broadcasts/public/{target}", include_in_schema=False)
def public_broadcasts(target: str, db: Session = Depends(get_db)):
    items = db.query(Broadcast).filter(
        (Broadcast.target == "all") | (Broadcast.target == target)
    ).order_by(Broadcast.created_at.desc()).limit(5).all()
    return [{"id": b.id, "title": b.title, "body": b.body,
             "created_at": b.created_at.isoformat() if b.created_at else None}
            for b in items]


# ══════════════════════════════════════════════════════════════════════════════
# 7. AUDIT LOG
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/audit")
def get_audit_log(
    skip: int = Query(0, ge=0), limit: int = Query(50, le=200),
    action: Optional[str] = None,
    db: Session = Depends(get_db), _: User = Depends(require_superadmin),
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    logs = q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(func.count(AuditLog.id)).scalar() or 0

    result = []
    for log in logs:
        admin_name = None
        if log.admin_id:
            adm = db.query(User).filter(User.id == log.admin_id).first()
            admin_name = adm.username if adm else None
        result.append({
            "id": log.id, "action": log.action,
            "admin": admin_name, "target_id": log.target_id,
            "detail": json.loads(log.detail) if log.detail else {},
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })
    return {"total": total, "logs": result}


# ══════════════════════════════════════════════════════════════════════════════
# 8. PWA VERSION CONTROL
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/pwa/version")
def get_pwa_version(_: User = Depends(require_superadmin)):
    return _read_version()


@router.post("/pwa/version")
def push_pwa_version(
    body: PWAVersionUpdate, request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    data = {"version": body.version, "force": body.force,
            "changelog": body.changelog or "", "updated_at": datetime.now(timezone.utc).isoformat()}
    _write_version(data)
    _audit(db, admin, "pwa_version_push", None, data, request)
    return {"ok": True, **data}


# ══════════════════════════════════════════════════════════════════════════════
# 9. SYSTEM HEALTH + DB BACKUP
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/system/health")
def system_health(db: Session = Depends(get_db), _: User = Depends(require_superadmin)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    db_size_mb = 0
    for candidate in [_DB_PATH, os.path.join(_ROOT, "mlruns.db")]:
        if os.path.exists(candidate):
            db_size_mb += round(os.path.getsize(candidate) / 1_048_576, 2)

    flags = _read_flags()
    return {
        "database":         "ok" if db_ok else "error",
        "api":              "ok",
        "pwa_version":      _read_version().get("version"),
        "maintenance_mode": flags.get("maintenance_mode", False),
        "db_size_mb":       db_size_mb,
        "server_time":      datetime.now(timezone.utc).isoformat(),
        "mlflow_url":       "http://localhost:5000",
        "total_audit_logs": db.query(func.count(AuditLog.id)).scalar() or 0,
    }


@router.post("/system/backup")
def backup_database(
    request: Request,
    db: Session = Depends(get_db), admin: User = Depends(require_superadmin),
):
    """Create a SQLite backup and return it as a downloadable file."""
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"smartfarm_backup_{stamp}.db"
    backup_path = os.path.join(tempfile.gettempdir(), backup_name)

    # Find the app DB
    candidate = _DB_PATH
    if not os.path.exists(candidate):
        # try to find via engine URL
        url = str(engine.url)
        if url.startswith("sqlite:///"):
            candidate = url.replace("sqlite:///", "")

    if not os.path.exists(candidate):
        raise HTTPException(500, "Database file not found for backup")

    src = sqlite3.connect(candidate)
    dst = sqlite3.connect(backup_path)
    src.backup(dst)
    src.close()
    dst.close()

    _audit(db, admin, "db_backup", None, {"file": backup_name}, request)
    return FileResponse(backup_path, filename=backup_name, media_type="application/octet-stream")
