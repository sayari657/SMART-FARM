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


# ── AI tree detection from satellite imagery ──────────────────────────────────

def _detect_crowns(img_bgr, min_area: int, max_area: int):
    """Detect tree-crown centres (pixel coords). Uses DeepForest if installed,
    else a dependency-free OpenCV green-canopy blob detector."""
    # 1. DeepForest (best, optional — only if the user installed it)
    try:
        import importlib.util
        if importlib.util.find_spec("deepforest"):
            from deepforest import main as df_main
            import cv2
            m = df_main.deepforest(); m.use_release()
            rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            boxes = m.predict_image(image=rgb, return_plot=False)
            if boxes is not None and len(boxes):
                return [((r.xmin + r.xmax) / 2, (r.ymin + r.ymax) / 2) for _, r in boxes.iterrows()]
    except Exception:
        pass

    # 2. OpenCV fallback — green canopy blobs (no heavy deps, no torch conflict)
    import cv2
    import numpy as np
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, (25, 25, 20), (95, 255, 210))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    centres = []
    for c in cnts:
        a = cv2.contourArea(c)
        if min_area <= a <= max_area:
            M = cv2.moments(c)
            if M["m00"] > 0:
                centres.append((M["m10"] / M["m00"], M["m01"] / M["m00"]))
    return centres


@router.post("/detect")
def detect_trees(
    data: dict,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    """Auto-detect trees on the satellite image of the given map bounds and
    create geolocated OrchardTree rows (source='detected')."""
    import math
    b = data.get("bounds") or {}
    try:
        north, south = float(b["north"]), float(b["south"])
        east, west = float(b["east"]), float(b["west"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(422, "bounds {north,south,east,west} requis")

    if north <= south or east <= west:
        raise HTTPException(422, "bounds invalides")
    # Guard against detecting over a huge area (keeps it to a farm-sized extent)
    if (north - south) > 0.05 or (east - west) > 0.05:
        raise HTTPException(422, "Zone trop grande — zoomez sur le verger avant de détecter")

    farm_id = data.get("farm_id")
    if farm_id and int(farm_id) not in farm_ids:
        raise HTTPException(403, "Accès non autorisé à cette ferme.")
    if not farm_id and farm_ids:
        farm_id = farm_ids[0]

    # Image sized to the bbox aspect (lat-corrected) so pixel→geo mapping is linear.
    # High resolution (2048) so crowns are large enough for DeepForest.
    midlat = math.radians((north + south) / 2)
    W = 2048
    H = max(64, min(2048, int(W * (north - south) / ((east - west) * max(0.2, math.cos(midlat))))))
    bbox = f"{west},{south},{east},{north}"
    url = ("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/"
           f"MapServer/export?bbox={bbox}&bboxSR=4326&imageSR=4326&size={W},{H}&format=png&f=image")
    try:
        import httpx
        r = httpx.get(url, timeout=30)
        r.raise_for_status()
        img_bytes = r.content
    except Exception as exc:
        raise HTTPException(503, f"Imagerie satellite indisponible: {exc}")

    # 1. Prefer the isolated DeepForest microservice (best recall on dense canopy)
    from app.core.config import settings
    centres, iw, ih, engine = None, None, None, "opencv"
    df_url = getattr(settings, "DEEPFOREST_URL", "")
    if df_url:
        try:
            import httpx
            resp = httpx.post(f"{df_url.rstrip('/')}/detect",
                              files={"file": ("tile.png", img_bytes, "image/png")}, timeout=120)
            resp.raise_for_status()
            j = resp.json()
            iw, ih = j.get("width"), j.get("height")
            if iw and ih:
                centres = [(t["cx"], t["cy"]) for t in j.get("trees", [])]
                engine = "deepforest"
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("DeepForest service unavailable (%s) → OpenCV", exc)

    # 2. Fallback — built-in OpenCV detector
    if centres is None:
        import cv2
        import numpy as np
        img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(503, "Image satellite illisible")
        ih, iw = img.shape[:2]
        area = iw * ih
        centres = _detect_crowns(img, min_area=int(area * 0.00015), max_area=int(area * 0.02))
        engine = "deepforest-inproc" if __import__("importlib.util").util.find_spec("deepforest") else "opencv"

    # Map pixel → GPS, deduplicate near-identical points, cap
    species = (data.get("species") or None)
    created, seen = [], []
    for (cx, cy) in centres:
        lat = north - (cy / ih) * (north - south)
        lng = west + (cx / iw) * (east - west)
        if any(abs(lat - p[0]) < 2e-5 and abs(lng - p[1]) < 2e-5 for p in seen):
            continue
        seen.append((lat, lng))
        t = OrchardTree(farm_id=farm_id, lat=lat, lng=lng, source="detected",
                        status="healthy", species=species)
        db.add(t)
        created.append(t)
        if len(created) >= 2000:
            break
    db.commit()
    return {"detected": len(created), "engine": engine}


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
