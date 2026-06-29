"""
Messagerie ferme — discussion temps quasi-réel entre le PROPRIÉTAIRE et ses
OUVRIERS, avec partage d'images et de vidéos.

Stockage des pièces jointes : data-URL base64 (cohérent avec WorkerReport.photo_b64).
Temps réel : polling côté client via le paramètre `after_id`.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import (
    ChatMessage, User, Farm, FarmOwner, WorkerAssignment,
)

router = APIRouter(prefix="/chat", tags=["Chat"])

# ~26 Mo binaire en base64 (data-URL) — assez pour des photos et de courtes vidéos
MAX_ATTACHMENT_CHARS = 35_000_000


# ── Helpers d'accès ───────────────────────────────────────────────────────────
def _accessible_farm_ids(db: Session, user: User) -> set[int]:
    """Fermes où l'utilisateur peut discuter : propriétaire (owner_id/FarmOwner)
    ou ouvrier assigné (worker_assignments actif)."""
    ids: set[int] = set()
    if user.role != "worker":   # propriétaire / admin / superadmin
        for (fid,) in db.query(Farm.id).filter(Farm.owner_id == user.id).all():
            ids.add(fid)
        for (fid,) in db.query(FarmOwner.farm_id).filter(FarmOwner.owner_id == user.id).all():
            ids.add(fid)
    # un compte peut aussi être ouvrier
    for (fid,) in (
        db.query(WorkerAssignment.farm_id)
        .filter(WorkerAssignment.worker_id == user.id,
                WorkerAssignment.is_active == True)  # noqa: E712
        .all()
    ):
        ids.add(fid)
    return ids


def _farm_participants(db: Session, farm_id: int) -> tuple[list[int], list[int]]:
    """(owner_ids, worker_ids) d'une ferme — pour notifier l'autre partie."""
    owner_ids: set[int] = set()
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if farm and farm.owner_id:
        owner_ids.add(farm.owner_id)
    for (oid,) in db.query(FarmOwner.owner_id).filter(FarmOwner.farm_id == farm_id).all():
        owner_ids.add(oid)
    worker_ids = [
        wid for (wid,) in db.query(WorkerAssignment.worker_id)
        .filter(WorkerAssignment.farm_id == farm_id,
                WorkerAssignment.is_active == True)  # noqa: E712
        .all()
    ]
    return list(owner_ids), worker_ids


# ── Schémas ─────────────────────────────────────────────────────────────────
class FarmOut(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


class ChatSendIn(BaseModel):
    farm_id: int
    text: Optional[str] = None
    attachment_b64: Optional[str] = None       # data:image/...;base64,... ou data:video/...
    attachment_type: Optional[str] = None      # image | video
    attachment_name: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: int
    farm_id: int
    sender_id: Optional[int]
    sender_role: Optional[str]
    sender_name: Optional[str]
    text: Optional[str]
    attachment_b64: Optional[str]
    attachment_type: Optional[str]
    attachment_name: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/farms", response_model=List[FarmOut])
def chat_farms(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Fermes dans lesquelles l'utilisateur peut discuter (sélecteur de conversation)."""
    ids = _accessible_farm_ids(db, user)
    if not ids:
        return []
    rows = db.query(Farm.id, Farm.name).filter(Farm.id.in_(ids)).order_by(Farm.name).all()
    return [{"id": r.id, "name": r.name} for r in rows]


@router.get("/messages", response_model=List[ChatMessageOut])
def list_messages(
    farm_id: int,
    after_id: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Messages d'une ferme. `after_id` permet le polling (ne renvoie que les nouveaux)."""
    if farm_id not in _accessible_farm_ids(db, user):
        raise HTTPException(403, "Accès refusé à cette conversation.")
    q = db.query(ChatMessage).filter(ChatMessage.farm_id == farm_id)
    if after_id:
        q = q.filter(ChatMessage.id > after_id)
        rows = q.order_by(ChatMessage.id.asc()).limit(limit).all()
    else:
        # dernière page, remise dans l'ordre chronologique
        rows = q.order_by(ChatMessage.id.desc()).limit(limit).all()[::-1]
    return rows


@router.post("/messages", response_model=ChatMessageOut, status_code=201)
def send_message(
    body: ChatSendIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.farm_id not in _accessible_farm_ids(db, user):
        raise HTTPException(403, "Accès refusé à cette conversation.")
    text = (body.text or "").strip() or None
    att = body.attachment_b64
    if not text and not att:
        raise HTTPException(400, "Message vide.")
    if att:
        if len(att) > MAX_ATTACHMENT_CHARS:
            raise HTTPException(413, "Pièce jointe trop volumineuse (max ~25 Mo).")
        if body.attachment_type not in ("image", "video"):
            raise HTTPException(400, "Type de pièce jointe invalide.")

    msg = ChatMessage(
        farm_id=body.farm_id,
        sender_id=user.id,
        sender_role=user.role,
        sender_name=(user.full_name or user.username),
        text=text,
        attachment_b64=att,
        attachment_type=body.attachment_type if att else None,
        attachment_name=(body.attachment_name or None) if att else None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Notifier l'autre partie (push + e-mail propriétaire) — best-effort
    try:
        from app.services.push_service import send_to_user
        owner_ids, worker_ids = _farm_participants(db, body.farm_id)
        sender_label = msg.sender_name or "Quelqu'un"
        preview = text if text else ("📷 Image" if msg.attachment_type == "image" else "🎬 Vidéo")
        title = "Nouveau message — ferme"
        payload = {"type": "chat", "farm_id": body.farm_id}
        recipients = owner_ids if user.role == "worker" else worker_ids
        for rid in recipients:
            if rid == user.id:
                continue
            try:
                send_to_user(db, rid, title, f"{sender_label} : {preview}", payload)
            except Exception:
                pass
        # e-mail au propriétaire si c'est l'ouvrier qui écrit
        if user.role == "worker":
            from app.services.otp_service import send_email_alert
            for oid in owner_ids:
                owner = db.query(User).filter(User.id == oid).first()
                if owner and owner.email:
                    try:
                        send_email_alert(owner.email, f"Message de {sender_label}", preview)
                    except Exception:
                        pass
    except Exception:
        pass

    return msg
