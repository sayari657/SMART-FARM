"""
IoT Device Management API
==========================
CRUD complet pour les capteurs/devices IoT par ferme.
Utilise la table `sensors` existante (id, unit_id, sensor_type, sensor_id, is_active, last_seen, metadata).
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.domain import AnimalUnit, Farm, Sensor, User
from app.core.cache import cached, cache_delete

router = APIRouter(prefix="/iot", tags=["IoT Devices"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DeviceCreate(BaseModel):
    farm_id: int
    sensor_type: str          # temperature | humidity | weight | camera | mqtt_node
    sensor_id: str            # unique hardware ID / MAC address
    label: Optional[str] = None
    location: Optional[str] = None  # e.g. "Stable Nord"
    mqtt_topic: Optional[str] = None

class DeviceUpdate(BaseModel):
    sensor_type: Optional[str] = None
    label: Optional[str] = None
    location: Optional[str] = None
    mqtt_topic: Optional[str] = None
    is_active: Optional[bool] = None

class DevicePing(BaseModel):
    sensor_id: str
    value: Optional[float] = None
    unit: Optional[str] = None


SENSOR_TYPE_ICONS = {
    "temperature": "🌡️",
    "humidity":    "💧",
    "weight":      "⚖️",
    "camera":      "📷",
    "mqtt_node":   "📡",
    "co2":         "🌫️",
    "light":       "☀️",
    "motion":      "👁️",
}


def _farm_check(farm_id: int, user: User, db: Session) -> Farm:
    """Ensure the user owns (or is superadmin for) this farm."""
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(404, "Farm not found")
    if user.role not in ("superadmin",) and farm.owner_id != user.id:
        raise HTTPException(403, "Access denied to this farm")
    return farm


def _get_owned_sensor(device_id: int, user: User, db: Session) -> Sensor:
    """Fetch a sensor and verify the requesting user owns its farm (tenant isolation)."""
    sensor = db.query(Sensor).filter(Sensor.id == device_id).first()
    if not sensor:
        raise HTTPException(404, "Device not found")
    if user.role != "superadmin":
        owns = (
            db.query(Farm.id)
            .join(AnimalUnit, AnimalUnit.farm_id == Farm.id)
            .filter(AnimalUnit.id == sensor.unit_id, Farm.owner_id == user.id)
            .first()
        )
        if not owns:
            raise HTTPException(403, "Access denied to this device")
    return sensor


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/devices")
def list_devices(
    farm_id: int = Query(...),
    sensor_type: Optional[str] = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all IoT devices/sensors for a farm."""
    _farm_check(farm_id, user, db)

    q = db.query(Sensor)
    # Filter by farms the user can access via unit_id chain — simplified: filter on metadata farm_id
    # Since sensors are linked to animal_units → farms, we join for safety
    q = q.filter(
        Sensor.unit_id.in_(
            db.execute(
                text("SELECT id FROM animal_units WHERE farm_id = :fid"),
                {"fid": farm_id},
            ).scalars().all() or [-1]
        )
    )

    if sensor_type:
        q = q.filter(Sensor.sensor_type == sensor_type)
    if active_only:
        q = q.filter(Sensor.is_active == True)

    sensors = q.all()
    return [
        {
            "id":          s.id,
            "sensor_id":   s.sensor_id,
            "sensor_type": s.sensor_type,
            "icon":        SENSOR_TYPE_ICONS.get(s.sensor_type, "🔌"),
            "is_active":   s.is_active,
            "last_seen":   s.last_seen.isoformat() if s.last_seen else None,
            "metadata":    s.metadata_,
            "label":       (s.metadata_ or {}).get("label") if isinstance(s.metadata_, dict) else None,
            "location":    (s.metadata_ or {}).get("location") if isinstance(s.metadata_, dict) else None,
            "mqtt_topic":  (s.metadata_ or {}).get("mqtt_topic") if isinstance(s.metadata_, dict) else None,
        }
        for s in sensors
    ]


@router.get("/devices/summary")
def devices_summary(
    farm_id: int = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Quick KPIs: total, active, offline, by type."""
    _farm_check(farm_id, user, db)

    # Get unit ids for this farm
    unit_ids = db.execute(
        text("SELECT id FROM animal_units WHERE farm_id = :fid"), {"fid": farm_id}
    ).scalars().all() or [-1]

    total  = db.query(func.count(Sensor.id)).filter(Sensor.unit_id.in_(unit_ids)).scalar() or 0
    active = db.query(func.count(Sensor.id)).filter(Sensor.unit_id.in_(unit_ids), Sensor.is_active == True).scalar() or 0
    types  = db.query(Sensor.sensor_type, func.count(Sensor.id)).filter(Sensor.unit_id.in_(unit_ids)).group_by(Sensor.sensor_type).all()

    return {
        "total":   total,
        "active":  active,
        "offline": total - active,
        "by_type": {t: c for t, c in types},
    }


@router.post("/devices")
def create_device(
    body: DeviceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("owner", "superadmin")),
):
    """Register a new IoT device for a farm."""
    _farm_check(body.farm_id, user, db)

    # Sensors require a unit_id — we use the first unit of the farm or create a virtual one
    unit_id = db.execute(
        text("SELECT id FROM animal_units WHERE farm_id=:fid LIMIT 1"),
        {"fid": body.farm_id},
    ).scalar()

    if not unit_id:
        raise HTTPException(400, "Aucune unité animale dans cette ferme. Créez d'abord une unité.")

    existing = db.query(Sensor).filter(Sensor.sensor_id == body.sensor_id).first()
    if existing:
        raise HTTPException(400, f"sensor_id '{body.sensor_id}' déjà enregistré")

    sensor = Sensor(
        unit_id=unit_id,
        sensor_type=body.sensor_type,
        sensor_id=body.sensor_id,
        is_active=True,
        metadata_={
            "label":      body.label or body.sensor_id,
            "location":   body.location or "",
            "mqtt_topic": body.mqtt_topic or f"smart_farm/{body.farm_id}/{body.sensor_id}",
        },
    )
    db.add(sensor)
    db.commit()
    db.refresh(sensor)
    cache_delete(f"iot:devices:{body.farm_id}:*")
    return {"ok": True, "id": sensor.id, "sensor_id": sensor.sensor_id}


@router.put("/devices/{device_id}")
def update_device(
    device_id: int,
    body: DeviceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("owner", "superadmin")),
):
    sensor = _get_owned_sensor(device_id, user, db)

    if body.sensor_type is not None:
        sensor.sensor_type = body.sensor_type
    if body.is_active is not None:
        sensor.is_active = body.is_active

    meta = dict(sensor.metadata_ or {})
    if body.label is not None:      meta["label"]      = body.label
    if body.location is not None:   meta["location"]   = body.location
    if body.mqtt_topic is not None: meta["mqtt_topic"] = body.mqtt_topic
    sensor.metadata_ = meta

    db.commit()
    return {"ok": True}


@router.delete("/devices/{device_id}")
def delete_device(
    device_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("owner", "superadmin")),
):
    sensor = _get_owned_sensor(device_id, user, db)
    db.delete(sensor)
    db.commit()
    return {"ok": True}


@router.post("/devices/ping")
def device_ping(
    body: DevicePing,
    db: Session = Depends(get_db),
):
    """Called by IoT hardware to update last_seen timestamp (no auth — device token in future)."""
    sensor = db.query(Sensor).filter(Sensor.sensor_id == body.sensor_id).first()
    if not sensor:
        raise HTTPException(404, "Unknown device")

    sensor.last_seen = datetime.utcnow()
    sensor.is_active = True
    if body.value is not None:
        meta = dict(sensor.metadata_ or {})
        meta["last_value"] = body.value
        meta["last_unit"]  = body.unit or ""
        sensor.metadata_ = meta
    db.commit()
    return {"ok": True}
