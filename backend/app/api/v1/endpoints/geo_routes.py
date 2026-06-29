import math
import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import Farm, Veterinary, Market, BeeHive
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(prefix="/geo", tags=["GIS & Maps"])


class GeoJSONGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float]

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: dict

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]


def _use_sqlite() -> bool:
    # Also use the float lat/lon path in LITE_MODE: geom column is String(100), not PostGIS Geometry
    return settings.USE_SQLITE or settings.DATABASE_URL.startswith("sqlite") or settings.LITE_MODE


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.get("/vets", response_model=GeoJSONFeatureCollection)
def get_veterinarians(db: Session = Depends(get_db)):
    if _use_sqlite():
        vets = db.query(Veterinary).filter(Veterinary.is_active == True).all()
        features = []
        for v in vets:
            if v.latitude is None or v.longitude is None:
                continue
            features.append(GeoJSONFeature(
                geometry=GeoJSONGeometry(type="Point", coordinates=[v.longitude, v.latitude]),
                properties={"id": v.id, "name": v.name, "specialty": v.specialty,
                            "phone": v.phone, "address": v.address,
                            "lat": v.latitude, "lon": v.longitude}
            ))
        return GeoJSONFeatureCollection(features=features)

    from sqlalchemy import text
    query = text("""
        SELECT id, name, specialty, phone, address,
               ST_X(geom) as lon, ST_Y(geom) as lat
        FROM veterinarians WHERE is_active = true
    """)
    rows = db.execute(query).fetchall()
    features = [
        GeoJSONFeature(
            geometry=GeoJSONGeometry(type="Point", coordinates=[r.lon, r.lat]),
            properties={"id": r.id, "name": r.name, "specialty": r.specialty,
                        "phone": r.phone, "address": r.address,
                        "lat": r.lat, "lon": r.lon}
        ) for r in rows
    ]
    return GeoJSONFeatureCollection(features=features)


@router.get("/farms", response_model=GeoJSONFeatureCollection)
def get_farms_geojson(db: Session = Depends(get_db), _=Depends(get_current_user)):
    if _use_sqlite():
        farms = db.query(Farm).all()
        features = []
        for f in farms:
            if f.latitude is None or f.longitude is None:
                continue
            features.append(GeoJSONFeature(
                geometry=GeoJSONGeometry(type="Point", coordinates=[f.longitude, f.latitude]),
                properties={"id": f.id, "name": f.name, "status": f.status,
                            "address": f.location, "lat": f.latitude, "lon": f.longitude}
            ))
        return GeoJSONFeatureCollection(features=features)

    from sqlalchemy import text
    query = text("SELECT id, name, status, location, ST_X(geom) as lon, ST_Y(geom) as lat FROM farms")
    rows = db.execute(query).fetchall()
    features = [
        GeoJSONFeature(
            geometry=GeoJSONGeometry(type="Point", coordinates=[r.lon, r.lat]),
            properties={"id": r.id, "name": r.name, "status": r.status,
                        "address": r.location, "lat": r.lat, "lon": r.lon}
        ) for r in rows
    ]
    return GeoJSONFeatureCollection(features=features)


@router.get("/markets", response_model=GeoJSONFeatureCollection)
def get_markets_geojson(db: Session = Depends(get_db)):
    if _use_sqlite():
        markets = db.query(Market).filter(Market.is_active == True).all()
        features = []
        for m in markets:
            if m.latitude is None or m.longitude is None:
                continue
            features.append(GeoJSONFeature(
                geometry=GeoJSONGeometry(type="Point", coordinates=[m.longitude, m.latitude]),
                properties={"id": m.id, "name": m.name, "type": m.market_type,
                            "phone": m.phone, "address": m.address, "description": m.description,
                            "lat": m.latitude, "lon": m.longitude}
            ))
        return GeoJSONFeatureCollection(features=features)

    from sqlalchemy import text
    query = text("""
        SELECT id, name, market_type, phone, address, description,
               ST_X(geom) as lon, ST_Y(geom) as lat
        FROM markets WHERE is_active = true
    """)
    rows = db.execute(query).fetchall()
    features = [
        GeoJSONFeature(
            geometry=GeoJSONGeometry(type="Point", coordinates=[r.lon, r.lat]),
            properties={"id": r.id, "name": r.name, "type": r.market_type,
                        "phone": r.phone, "address": r.address, "description": r.description,
                        "lat": r.lat, "lon": r.lon}
        ) for r in rows
    ]
    return GeoJSONFeatureCollection(features=features)


@router.get("/hives", response_model=GeoJSONFeatureCollection)
def get_hives_geojson(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from app.models.domain import AnimalUnit, AnimalType, TelemetryRecord
    from sqlalchemy import desc

    features = []
    RING_RADIUS_DEG = 0.0003  # ~33 m — keeps hives visually distinct but near real location

    # --- AnimalUnit hives (IoT-linked) ---
    bee_type = db.query(AnimalType).filter(AnimalType.species == "bee").first()
    if bee_type:
        hives = [h for h in db.query(AnimalUnit).filter(AnimalUnit.type_id == bee_type.id).all()
                 if h.farm and h.farm.latitude is not None and h.farm.longitude is not None]

        # Group indices per farm for circular placement
        farm_idx: dict = {}
        farm_counts: dict = {}
        for h in hives:
            farm_counts[h.farm_id] = farm_counts.get(h.farm_id, 0) + 1

        for h in hives:
            latest = (db.query(TelemetryRecord)
                      .filter(TelemetryRecord.unit_id == h.id)
                      .order_by(desc(TelemetryRecord.timestamp))
                      .first())
            metrics = latest.metrics if latest else {"weight": 0, "temperature": 0, "humidity": 0}

            idx = farm_idx.get(h.farm_id, 0)
            farm_idx[h.farm_id] = idx + 1
            total = farm_counts[h.farm_id]

            if total > 1:
                angle = (idx * 2 * math.pi) / total
                lat = h.farm.latitude + RING_RADIUS_DEG * math.sin(angle)
                lon = h.farm.longitude + RING_RADIUS_DEG * math.cos(angle)
            else:
                lat, lon = h.farm.latitude, h.farm.longitude

            features.append(GeoJSONFeature(
                geometry=GeoJSONGeometry(type="Point", coordinates=[lon, lat]),
                properties={"id": f"unit_{h.id}", "name": h.name, "status": h.status,
                            "metrics": metrics,
                            "lat": lat, "lon": lon,
                            "address": h.farm.location or h.farm.name,
                            "timestamp": latest.timestamp.isoformat() if latest else None,
                            "type": "unit"}
            ))

    # --- BeeHive management hives ---
    smart_hives = [sh for sh in db.query(BeeHive).all()
                   if sh.apiary and sh.apiary.latitude is not None and sh.apiary.longitude is not None]

    apiary_idx: dict = {}
    apiary_counts: dict = {}
    for sh in smart_hives:
        apiary_counts[sh.apiary_id] = apiary_counts.get(sh.apiary_id, 0) + 1

    for sh in smart_hives:
        idx = apiary_idx.get(sh.apiary_id, 0)
        apiary_idx[sh.apiary_id] = idx + 1
        total = apiary_counts[sh.apiary_id]

        if total > 1:
            angle = (idx * 2 * math.pi) / total
            lat = sh.apiary.latitude + RING_RADIUS_DEG * math.sin(angle)
            lon = sh.apiary.longitude + RING_RADIUS_DEG * math.cos(angle)
        else:
            lat, lon = sh.apiary.latitude, sh.apiary.longitude

        region_label = sh.apiary.region or sh.apiary.flower_type or "Tunisie"
        features.append(GeoJSONFeature(
            geometry=GeoJSONGeometry(type="Point", coordinates=[lon, lat]),
            properties={"id": f"bee_{sh.id}",
                        "name": f"{sh.identifier} ({sh.apiary.name})",
                        "status": "healthy" if sh.health_score > 7 else ("warning" if sh.health_score > 4 else "critical"),
                        "metrics": {"weight": sh.honey_level, "temperature": 35.0, "humidity": 60.0},
                        "lat": lat, "lon": lon,
                        "address": f"{sh.apiary.name} — {region_label}",
                        "timestamp": sh.updated_at.isoformat() if sh.updated_at else None,
                        "type": "beehive"}
        ))

    return GeoJSONFeatureCollection(features=features)


@router.get("/nearby-vets", response_model=List[dict])
def find_nearby_vets(lat: float, lon: float, radius_km: float = 100, db: Session = Depends(get_db)):
    if _use_sqlite():
        vets = db.query(Veterinary).filter(Veterinary.is_active == True).all()
        nearby = []
        for v in vets:
            if v.latitude is None or v.longitude is None:
                continue
            d = haversine(lat, lon, v.latitude, v.longitude)
            if d <= radius_km:
                nearby.append({"id": v.id, "name": v.name, "distance_km": round(d, 2)})
        return nearby

    from sqlalchemy import text
    radius_meters = radius_km * 1000
    query = text("""
        SELECT id, name, specialty, phone, address,
               ST_X(geom) as lon, ST_Y(geom) as lat,
               ST_Distance(geom::geography, ST_MakePoint(:lon, :lat)::geography) / 1000 as distance_km
        FROM veterinarians
        WHERE ST_DWithin(geom::geography, ST_MakePoint(:lon, :lat)::geography, :radius)
          AND is_active = true
        ORDER BY distance_km ASC
    """)
    rows = db.execute(query, {"lon": lon, "lat": lat, "radius": radius_meters}).fetchall()
    return [{"id": r.id, "name": r.name, "specialty": r.specialty,
             "phone": r.phone, "address": r.address,
             "coords": [r.lat, r.lon], "distance_km": round(r.distance_km, 2)}
            for r in rows]


# ── Overpass mirrors — all tried in parallel, first success wins ──────────────
_OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
_OVERPASS_TIMEOUT = 25.0


async def _fetch_one(query: str, mirror: str) -> dict | None:
    """Attempt one Overpass mirror; return parsed JSON or None."""
    try:
        async with httpx.AsyncClient(timeout=_OVERPASS_TIMEOUT) as client:
            resp = await client.post(
                mirror,
                data={"data": query},
                headers={"User-Agent": "SmartFarmAI/3.0"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return None


@router.post("/overpass")
async def overpass_proxy(payload: dict):
    """Proxy Overpass API calls (avoids browser CORS).
    All mirrors are queried in parallel — first valid response wins."""
    query = payload.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="Missing 'query' field")

    results = await asyncio.gather(*[_fetch_one(query, m) for m in _OVERPASS_MIRRORS])
    for data in results:
        if data is not None:
            return JSONResponse(content=data)

    raise HTTPException(status_code=502, detail="All Overpass mirrors unreachable")


# ── IoT Sensors GeoJSON — farms with active sensors ────────────────────────────
@router.get("/iot-sensors", response_model=GeoJSONFeatureCollection)
def get_iot_sensors_geojson(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Return a GeoJSON FeatureCollection of farms that have IoT sensors,
    with sensor counts and statuses embedded in properties."""
    from app.models.domain import Sensor, AnimalUnit
    from sqlalchemy import func

    # Aggregate sensor stats per farm
    rows = (
        db.query(
            Farm.id,
            Farm.name,
            Farm.latitude,
            Farm.longitude,
            Farm.location,
            func.count(Sensor.id).label("total"),
            func.sum(Sensor.is_active.cast(db.bind.dialect.name == "sqlite" and "INTEGER" or "INTEGER")).label("active"),
        )
        .join(AnimalUnit, AnimalUnit.farm_id == Farm.id)
        .join(Sensor, Sensor.unit_id == AnimalUnit.id)
        .filter(Farm.latitude.isnot(None), Farm.longitude.isnot(None))
        .group_by(Farm.id, Farm.name, Farm.latitude, Farm.longitude, Farm.location)
        .all()
    )

    features = []
    for r in rows:
        total = r.total or 0
        active = int(r.active or 0)
        offline = total - active
        status = "ok" if offline == 0 else ("warning" if offline < total else "offline")
        features.append(GeoJSONFeature(
            geometry=GeoJSONGeometry(type="Point", coordinates=[r.longitude, r.latitude]),
            properties={
                "id": f"iot_{r.id}",
                "farm_id": r.id,
                "name": r.name,
                "address": r.location or "",
                "total": total,
                "active": active,
                "offline": offline,
                "status": status,
                "lat": r.latitude,
                "lon": r.longitude,
            }
        ))
    return GeoJSONFeatureCollection(features=features)


# ── Farm Alerts GeoJSON — farms with active (unresolved) alerts ─────────────────
@router.get("/farm-alerts", response_model=GeoJSONFeatureCollection)
def get_farm_alerts_geojson(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Return farms with at least one unresolved alert (weather + livestock)."""
    from app.models.domain import Alert, AnimalUnit, WeatherAlert
    from sqlalchemy import func, case

    crit_expr = func.sum(case((Alert.severity == "critical", 1), else_=0))
    wcrit_expr = func.sum(case((WeatherAlert.severity == "critical", 1), else_=0))

    # Per-farm aggregation: {farm_id: {farm, total, critical, weather, livestock}}
    agg: dict = {}

    def _bucket(farm):
        return agg.setdefault(farm.id, {
            "farm": farm, "total": 0, "critical": 0, "weather": 0, "livestock": 0,
        })

    # 1) Weather alerts (farm-scoped) ───────────────────────────────────────
    weather_rows = (
        db.query(
            Farm,
            func.count(WeatherAlert.id).label("cnt"),
            wcrit_expr.label("crit"),
        )
        .join(WeatherAlert, WeatherAlert.farm_id == Farm.id)
        .filter(
            WeatherAlert.is_resolved == False,        # noqa: E712
            Farm.latitude.isnot(None),
            Farm.longitude.isnot(None),
        )
        .group_by(Farm.id)
        .all()
    )
    for farm, cnt, crit in weather_rows:
        b = _bucket(farm)
        b["total"] += int(cnt or 0)
        b["critical"] += int(crit or 0)
        b["weather"] += int(cnt or 0)

    # 2) Livestock alerts (Alert → AnimalUnit → Farm) ───────────────────────
    livestock_rows = (
        db.query(
            Farm,
            func.count(Alert.id).label("cnt"),
            crit_expr.label("crit"),
        )
        .join(AnimalUnit, AnimalUnit.farm_id == Farm.id)
        .join(Alert, Alert.unit_id == AnimalUnit.id)
        .filter(
            Alert.is_resolved == False,               # noqa: E712
            Farm.latitude.isnot(None),
            Farm.longitude.isnot(None),
        )
        .group_by(Farm.id)
        .all()
    )
    for farm, cnt, crit in livestock_rows:
        b = _bucket(farm)
        b["total"] += int(cnt or 0)
        b["critical"] += int(crit or 0)
        b["livestock"] += int(cnt or 0)

    features = []
    for farm_id, b in agg.items():
        farm = b["farm"]
        severity = "critical" if b["critical"] > 0 else "warning"
        features.append(GeoJSONFeature(
            geometry=GeoJSONGeometry(type="Point", coordinates=[farm.longitude, farm.latitude]),
            properties={
                "id": f"alert_{farm_id}",
                "farm_id": farm_id,
                "name": farm.name,
                "address": farm.location or "",
                "total_alerts": b["total"],
                "critical_alerts": b["critical"],
                "weather_alerts": b["weather"],
                "livestock_alerts": b["livestock"],
                "severity": severity,
                "lat": farm.latitude,
                "lon": farm.longitude,
            }
        ))
    return GeoJSONFeatureCollection(features=features)
