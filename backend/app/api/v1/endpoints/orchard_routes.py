"""Smart Farm AI — Orchard Planigramme.

Per-tree spatial tracking on a row × column grid: place trees, mark a detected
disease, log treatments. Farm-scoped so the owner and assigned workers share the
exact same live plan (same rows in the DB).
"""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
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


def _fetch_satellite_mosaic(north, south, east, west, max_tiles=420):
    """Stitch Esri World Imagery XYZ tiles into one image for the bbox.
    Reliable (the same tiles the map shows) — unlike the /export op which 500s
    above ~1024 px. Keeps the HIGHEST zoom (best resolution for crown detection)
    that fits the tile budget. Returns (png_bytes, width, height)."""
    import math
    import httpx
    import cv2
    import numpy as np

    def d2t(lon, lat, z):
        n = 2.0 ** z
        x = (lon + 180.0) / 360.0 * n
        y = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n
        return x, y

    # Target z19 (~0.25 m/px → crowns ~20 px, DeepForest's sweet spot). z20 makes
    # crowns too large and the model misses them; step down only if over budget.
    z = 19
    while z > 15:
        xw, yn = d2t(west, north, z)
        xe, ys = d2t(east, south, z)
        nx = math.floor(xe) - math.floor(xw) + 1
        ny = math.floor(ys) - math.floor(yn) + 1
        if nx * ny <= max_tiles:
            break
        z -= 1

    x0i, y0i = math.floor(xw), math.floor(yn)
    x1i, y1i = math.floor(xe), math.floor(ys)
    cols, rows = x1i - x0i + 1, y1i - y0i + 1
    mosaic = np.zeros((rows * 256, cols * 256, 3), np.uint8)
    base = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile"
    with httpx.Client(timeout=20, headers={"User-Agent": "SmartFarmAI/1.0"}) as cli:
        for tx in range(x0i, x1i + 1):
            for ty in range(y0i, y1i + 1):
                try:
                    r = cli.get(f"{base}/{z}/{ty}/{tx}")
                    if r.status_code == 200:
                        tile = cv2.imdecode(np.frombuffer(r.content, np.uint8), cv2.IMREAD_COLOR)
                        if tile is not None and tile.shape[:2] == (256, 256):
                            oy, ox = (ty - y0i) * 256, (tx - x0i) * 256
                            mosaic[oy:oy + 256, ox:ox + 256] = tile
                except Exception:
                    pass

    left, top = int(round((xw - x0i) * 256)), int(round((yn - y0i) * 256))
    right, bottom = int(round((xe - x0i) * 256)), int(round((ys - y0i) * 256))
    crop = mosaic[top:max(top + 1, bottom), left:max(left + 1, right)]
    ok, buf = cv2.imencode(".png", crop)
    if not ok:
        raise RuntimeError("encode failed")
    return buf.tobytes(), crop.shape[1], crop.shape[0]


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

    # High-resolution satellite image of the bbox, stitched from XYZ tiles
    # (reliable — the /export op 500s above ~1024 px).
    try:
        img_bytes, W, H = _fetch_satellite_mosaic(north, south, east, west)
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
                              files={"file": ("tile.png", img_bytes, "image/png")}, timeout=300)
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


# ── Harvest estimation from a close-up photo ──────────────────────────────────

# Mean single-fruit weight (g) → turns a fruit count into a kg estimate.
FRUIT_AVG_G = {"olive": 4.0, "orange": 180.0, "lemon": 110.0, "other": 100.0}


def _count_fruits_cv(img_bgr, species: str) -> int:
    """Deterministic OpenCV fruit count by colour (works with no LLM). Masks the
    fruit colour for the given species, then counts round blobs; clustered blobs
    are split by area. A cross-check / offline fallback for the vision model."""
    import cv2
    import numpy as np

    h, w = img_bgr.shape[:2]
    scale = 1100.0 / max(h, w)
    if scale < 1:
        img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)))
    hsv = cv2.cvtColor(cv2.GaussianBlur(img_bgr, (5, 5), 0), cv2.COLOR_BGR2HSV)

    sp = (species or "").lower()
    masks = []
    if sp == "orange":
        masks.append(cv2.inRange(hsv, (5, 90, 90), (22, 255, 255)))      # orange skin
    elif sp == "lemon":
        masks.append(cv2.inRange(hsv, (20, 70, 110), (38, 255, 255)))    # yellow skin
    elif sp == "olive":
        masks.append(cv2.inRange(hsv, (30, 25, 20), (90, 255, 120)))     # green olives
        masks.append(cv2.inRange(hsv, (0, 0, 0), (180, 90, 70)))         # black/ripe olives
    else:  # other / unknown → any typical fruit colour
        masks.append(cv2.inRange(hsv, (5, 90, 90), (22, 255, 255)))      # orange
        masks.append(cv2.inRange(hsv, (20, 70, 110), (38, 255, 255)))    # yellow
        masks.append(cv2.inRange(hsv, (0, 110, 80), (10, 255, 255)))     # red
        masks.append(cv2.inRange(hsv, (170, 110, 80), (180, 255, 255)))  # red (wrap)

    mask = masks[0]
    for m in masks[1:]:
        mask = cv2.bitwise_or(mask, m)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    area_img = mask.shape[0] * mask.shape[1]
    lo, hi = area_img * 2e-5, area_img * 0.05
    typical = max(lo * 4, area_img * 4e-4)  # ~ one fruit's blob area
    count = 0
    for c in cnts:
        a = cv2.contourArea(c)
        if a < lo or a > hi:
            continue
        per = cv2.arcLength(c, True)
        circ = (4 * np.pi * a / (per * per)) if per > 0 else 0
        # round → 1 fruit; large irregular blob → cluster, split by area
        count += 1 if circ >= 0.45 else max(1, int(round(a / typical)))
    return count


@router.post("/harvest-estimate")
async def harvest_estimate(
    file: UploadFile = File(...),
    species: str = Form(""),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    """Estimate the harvest from a close-up photo of a tree/branch — any fruit type.
    Vision LLM (Groq Vision → LLaVA) is primary; an OpenCV colour count is the
    deterministic cross-check / offline fallback. Returns the visible fruit count
    and a rough kg estimate (mean fruit weight × count)."""
    import base64
    import json
    import re

    import cv2
    import numpy as np

    raw = await file.read()
    if not raw:
        raise HTTPException(422, "Image vide")
    img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(422, "Image illisible")

    sp = (species or "").lower().strip()

    # 1. OpenCV deterministic count (always available)
    try:
        cv_count = _count_fruits_cv(img, sp)
    except Exception:
        cv_count = 0

    # 2. Vision LLM — generalises to any fruit, returns a structured JSON
    llm_count = None
    fruit_type = sp if sp in FRUIT_AVG_G else "other"
    ripeness, confidence, notes = "mixed", 0.5, ""
    try:
        from app.services.mllm_service import mllm_service
        b64 = base64.b64encode(raw).decode()
        hint = sp if sp in FRUIT_AVG_G else "unknown"
        prompt = (
            "You are an agronomy vision system estimating a fruit harvest. "
            f"Tree type hint: {hint}. Count the visible fruits on the tree or branch "
            "in this image (estimate if many overlap). Respond ONLY with compact JSON, "
            "no prose: {\"count\": <int>, \"fruit_type\": \"<olive|orange|lemon|other>\", "
            "\"ripeness\": \"<unripe|ripe|mixed>\", \"confidence\": <0..1>, "
            "\"notes\": \"<short note in French>\"}"
        )
        txt = await mllm_service.analyze_visual(b64, prompt)
        m = re.search(r"\{.*\}", txt or "", re.S)
        if m:
            j = json.loads(m.group(0))
            c = str(j.get("count", "")).strip()
            llm_count = int(float(c)) if re.fullmatch(r"\d+(\.\d+)?", c) else None
            ft = (j.get("fruit_type") or "").lower().strip()
            if ft in FRUIT_AVG_G:
                fruit_type = ft
            ripeness = (j.get("ripeness") or ripeness)[:20]
            try:
                confidence = max(0.0, min(1.0, float(j.get("confidence", confidence))))
            except (TypeError, ValueError):
                pass
            notes = (j.get("notes") or "")[:300]
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("harvest-estimate LLM failed: %s", exc)

    # 3. Combine — LLM count primary, OpenCV as fallback
    if llm_count is not None:
        count, method = llm_count, "vision-llm"
    else:
        count, method, confidence = cv_count, "opencv", 0.4

    if fruit_type not in FRUIT_AVG_G:
        fruit_type = "other"
    avg_g = FRUIT_AVG_G[fruit_type]
    harvest_kg = round(count * avg_g / 1000.0, 2)

    return {
        "count": count,
        "cv_count": cv_count,
        "llm_count": llm_count,
        "fruit_type": fruit_type,
        "ripeness": ripeness,
        "confidence": round(confidence, 2),
        "harvest_kg": harvest_kg,
        "avg_fruit_g": avg_g,
        "method": method,
        "notes": notes,
    }


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
