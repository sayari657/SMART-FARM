"""Smart Farm AI — Orchard Planigramme.

Per-tree spatial tracking on a row × column grid: place trees, mark a detected
disease, log treatments. Farm-scoped so the owner and assigned workers share the
exact same live plan (same rows in the DB).
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.farm_guard import get_user_farm_ids, get_scoped_farm_ids
from app.models.domain import OrchardTree, OrchardTreeEvent

router = APIRouter(prefix="/orchard", tags=["Orchard Planigramme"])

VALID_STATUS = {"healthy", "watch", "diseased", "treated"}
VALID_EVENT  = {"disease", "treatment", "observation", "note"}


# ── serializers ───────────────────────────────────────────────────────────────

def _ser_event(e: OrchardTreeEvent) -> dict:
    return {
        "id":         e.id,
        "type":       e.type,
        "label":      e.label,
        "note":       e.note,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


def _ser_tree(t: OrchardTree, with_events: bool = False) -> dict:
    d = {
        "id":                t.id,
        "farm_id":           t.farm_id,
        "row":               t.row,
        "col":               t.col,
        "lat":               t.lat,
        "lng":               t.lng,
        "source":            t.source,
        "species":           t.species,
        "label":             t.label,
        "status":            t.status,
        "disease":           t.disease,
        "notes":             t.notes,
        "last_treatment_at": t.last_treatment_at.isoformat() if t.last_treatment_at else None,
        "last_event_at":     t.last_event_at.isoformat() if t.last_event_at else None,
        "created_at":        t.created_at.isoformat() if t.created_at else None,
        "updated_at":        t.updated_at.isoformat() if t.updated_at else None,
    }
    if with_events:
        d["events"] = [
            _ser_event(e)
            for e in sorted(t.events, key=lambda x: x.created_at or datetime.min, reverse=True)
        ]
    return d


def _get_owned_tree(tree_id: int, db: Session, farm_ids: List[int]) -> OrchardTree:
    t = db.query(OrchardTree).filter(OrchardTree.id == tree_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Arbre introuvable")
    if t.farm_id and farm_ids and t.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Accès non autorisé à cet arbre.")
    return t


# ── Trees ───────────────────────────────────────────────────────────────────

@router.get("/trees")
def list_trees(
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_scoped_farm_ids),
):
    """All trees of the selected farm (or every farm the user can access)."""
    q = db.query(OrchardTree)
    if farm_ids:
        q = q.filter(OrchardTree.farm_id.in_(farm_ids))
    trees = q.order_by(OrchardTree.row, OrchardTree.col).all()
    return [_ser_tree(t) for t in trees]


@router.get("/trees/{tree_id}")
def get_tree(
    tree_id: int,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    return _ser_tree(_get_owned_tree(tree_id, db, farm_ids), with_events=True)


@router.post("/trees", status_code=201)
def create_tree(
    data: dict,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    farm_id = data.get("farm_id")
    if farm_id and int(farm_id) not in farm_ids:
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette ferme.")
    if not farm_id and farm_ids:
        farm_id = farm_ids[0]

    status = data.get("status", "healthy")
    if status not in VALID_STATUS:
        status = "healthy"

    def _coord(v):
        try:
            return float(v) if v is not None else None
        except (TypeError, ValueError):
            return None

    tree = OrchardTree(
        farm_id=farm_id,
        row=int(data.get("row", 0)),
        col=int(data.get("col", 0)),
        lat=_coord(data.get("lat")),
        lng=_coord(data.get("lng")),
        source=(data.get("source") or ("gps" if data.get("lat") is not None else "manual")),
        species=(data.get("species") or None),
        label=(data.get("label") or None),
        status=status,
        disease=(data.get("disease") or None),
        notes=(data.get("notes") or None),
    )
    db.add(tree)
    db.commit()
    db.refresh(tree)
    return _ser_tree(tree, with_events=True)


@router.put("/trees/{tree_id}")
def update_tree(
    tree_id: int,
    data: dict,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    tree = _get_owned_tree(tree_id, db, farm_ids)
    for field in ("species", "label", "disease", "notes"):
        if field in data:
            setattr(tree, field, data[field] or None)
    if data.get("status") in VALID_STATUS:
        tree.status = data["status"]
    if "row" in data:
        tree.row = int(data["row"])
    if "col" in data:
        tree.col = int(data["col"])
    for coord in ("lat", "lng"):
        if coord in data:
            try:
                setattr(tree, coord, float(data[coord]) if data[coord] is not None else None)
            except (TypeError, ValueError):
                pass
    tree.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tree)
    return _ser_tree(tree, with_events=True)


@router.delete("/trees/{tree_id}", status_code=204)
def delete_tree(
    tree_id: int,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    tree = _get_owned_tree(tree_id, db, farm_ids)
    db.delete(tree)
    db.commit()


# ── Events (timeline) ─────────────────────────────────────────────────────────

@router.post("/trees/{tree_id}/events", status_code=201)
def add_event(
    tree_id: int,
    data: dict,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    tree = _get_owned_tree(tree_id, db, farm_ids)
    etype = data.get("type", "note")
    if etype not in VALID_EVENT:
        raise HTTPException(status_code=422, detail="Type d'événement invalide")

    ev = OrchardTreeEvent(
        tree_id=tree.id,
        type=etype,
        label=(data.get("label") or None),
        note=(data.get("note") or None),
    )
    db.add(ev)

    now = datetime.now(timezone.utc)
    tree.last_event_at = now
    # Derive tree status from the event
    if etype == "disease":
        tree.status = "diseased"
        if data.get("label"):
            tree.disease = data["label"]
    elif etype == "treatment":
        tree.status = "treated"
        tree.last_treatment_at = now
    elif etype == "observation" and tree.status == "healthy":
        tree.status = "watch"
    tree.updated_at = now

    db.commit()
    db.refresh(tree)
    return _ser_tree(tree, with_events=True)


@router.delete("/events/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    ev = db.query(OrchardTreeEvent).filter(OrchardTreeEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Événement introuvable")
    tree = db.query(OrchardTree).filter(OrchardTree.id == ev.tree_id).first()
    if tree and tree.farm_id and farm_ids and tree.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    db.delete(ev)
    db.commit()
