from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.models.domain import Farm, Veterinary, Market
from pydantic import BaseModel
from geoalchemy2.functions import ST_AsGeoJSON, ST_DWithin
import json

router = APIRouter(prefix="/geo", tags=["GIS & Maps"])

# --- Pydantic Schemas for GeoJSON ---
class GeoJSONGeometry(BaseModel):
    type: str  # e.g. "Point"
    coordinates: List[float] # [lon, lat]

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: dict

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]

from app.core.config import settings

# --- Helper for SQLite Geo ---
def point_to_geojson(lat, lon):
    return {
        "type": "Point",
        "coordinates": [lon, lat]
    }

def haversine(lat1, lon1, lat2, lon2):
    import math
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# --- Endpoints ---

@router.get("/vets", response_model=GeoJSONFeatureCollection)
def get_veterinarians(db: Session = Depends(get_db)):
    """Return all veterinarians in GeoJSON format using PostGIS optimized queries."""
    if settings.DATABASE_URL.startswith("sqlite"):
        vets = db.query(Veterinary).filter(Veterinary.is_active == True).all()
        features = []
        for v in vets:
            features.append(GeoJSONFeature(
                geometry=GeoJSONGeometry(type="Point", coordinates=[v.longitude, v.latitude]),
                properties={
                    "id": v.id, "name": v.name, "specialty": v.specialty,
                    "phone": v.phone, "address": v.address
                }
            ))
        return GeoJSONFeatureCollection(features=features)
        
    # Sovereign PostGIS Raw Path (High Performance)
    from sqlalchemy import text
    query = text("""
        SELECT id, name, specialty, phone, address,
               ST_X(geom) as lon, ST_Y(geom) as lat
        FROM veterinarians
        WHERE is_active = true
    """)
    result = db.execute(query)
    features = []
    for row in result:
        features.append(GeoJSONFeature(
            geometry=GeoJSONGeometry(type="Point", coordinates=[row.lon, row.lat]),
            properties={
                "id": row.id, "name": row.name, "specialty": row.specialty,
                "phone": row.phone, "address": row.address
            }
        ))
    return GeoJSONFeatureCollection(features=features)

@router.get("/farms", response_model=GeoJSONFeatureCollection)
def get_farms_geojson(db: Session = Depends(get_db)):
    """Return all farms in GeoJSON format using local PostGIS."""
    if settings.DATABASE_URL.startswith("sqlite"):
        farms = db.query(Farm).all()
        features = []
        for f in farms:
            # Skip farms without GPS coordinates — avoids Pydantic crash → CORS bypass
            if f.latitude is None or f.longitude is None:
                continue
            features.append(GeoJSONFeature(
                geometry=GeoJSONGeometry(type="Point", coordinates=[f.longitude, f.latitude]),
                properties={"id": f.id, "name": f.name, "status": f.status}
            ))
        return GeoJSONFeatureCollection(features=features)

    from sqlalchemy import text
    query = text("""
        SELECT id, name, status, 
               ST_X(geom) as lon, ST_Y(geom) as lat
        FROM farms
    """)
    result = db.execute(query)
    return GeoJSONFeatureCollection(features=features)

@router.get("/markets", response_model=GeoJSONFeatureCollection)
def get_markets_geojson(db: Session = Depends(get_db)):
    """Return all agricultural markets/suppliers in GeoJSON format."""
    if settings.DATABASE_URL.startswith("sqlite"):
        markets = db.query(Market).filter(Market.is_active == True).all()
        features = []
        for m in markets:
            features.append(GeoJSONFeature(
                geometry=GeoJSONGeometry(type="Point", coordinates=[m.longitude, m.latitude]),
                properties={
                    "id": m.id, "name": m.name, "type": m.market_type,
                    "phone": m.phone, "address": m.address, "description": m.description
                }
            ))
        return GeoJSONFeatureCollection(features=features)

    from sqlalchemy import text
    query = text("""
        SELECT id, name, market_type, phone, address, description,
               ST_X(geom) as lon, ST_Y(geom) as lat
        FROM markets
        WHERE is_active = true
    """)
    result = db.execute(query)
    features = []
    for row in result:
        features.append(GeoJSONFeature(
            geometry=GeoJSONGeometry(type="Point", coordinates=[row.lon, row.lat]),
            properties={
                "id": row.id, "name": row.name, "type": row.market_type,
                "phone": row.phone, "address": row.address, "description": row.description
            }
        ))
    return GeoJSONFeatureCollection(features=features)

@router.get("/hives", response_model=GeoJSONFeatureCollection)
def get_hives_geojson(db: Session = Depends(get_db)):
    """Return all hives (bee units) joined with their latest telemetry records."""
    from app.models.domain import AnimalUnit, AnimalType, TelemetryRecord
    from sqlalchemy import desc
    
    # 1. Get the 'bee' type ID
    bee_type = db.query(AnimalType).filter(AnimalType.species == "bee").first()
    if not bee_type:
        return GeoJSONFeatureCollection(features=[])
        
    # 2. Query hives
    hives = db.query(AnimalUnit).filter(AnimalUnit.type_id == bee_type.id).all()
    
    features = []
    for h in hives:
        # Skip hives whose farm has no GPS coordinates
        if not h.farm or h.farm.latitude is None or h.farm.longitude is None:
            continue

        # Get latest telemetry for this unit
        latest = db.query(TelemetryRecord).filter(TelemetryRecord.unit_id == h.id).order_by(desc(TelemetryRecord.timestamp)).first()
        
        # Default metrics if none found
        metrics = latest.metrics if latest else {"weight": 0, "temperature": 0, "humidity": 0}
        
        lat = h.farm.latitude + (hash(h.name) % 100 / 10000)
        lon = h.farm.longitude + (hash(h.name) % 80 / 10000)
        
        features.append(GeoJSONFeature(
            geometry=GeoJSONGeometry(type="Point", coordinates=[lon, lat]),
            properties={
                "id": h.id,
                "name": h.name,
                "status": h.status,
                "metrics": metrics,
                "timestamp": latest.timestamp.isoformat() if latest else None
            }
        ))
        
    return GeoJSONFeatureCollection(features=features)

@router.get("/nearby-vets", response_model=List[dict])
def find_nearby_vets(lat: float, lon: float, radius_km: float = 100, db: Session = Depends(get_db)):
    """Find veterinarians within a radius from a point using native PostGIS radial search."""
    if settings.DATABASE_URL.startswith("sqlite"):
        vets = db.query(Veterinary).filter(Veterinary.is_active == True).all()
        nearby = []
        for v in vets:
            d = haversine(lat, lon, v.latitude, v.longitude)
            if d <= radius_km:
                nearby.append({"id": v.id, "name": v.name, "distance_km": round(d, 2)})
        return nearby

    # Golden Architecture: Native ST_DWithin Query
    from sqlalchemy import text
    radius_meters = radius_km * 1000
    query = text("""
        SELECT id, name, specialty, phone, address,
               ST_X(geom) as lon, ST_Y(geom) as lat,
               ST_Distance(geom::geography, ST_MakePoint(:lon, :lat)::geography) / 1000 as distance_km
        FROM veterinarians
        WHERE ST_DWithin(
            geom::geography,
            ST_MakePoint(:lon, :lat)::geography,
            :radius
        ) AND is_active = true
        ORDER BY distance_km ASC
    """)
    result = db.execute(query, {"lon": lon, "lat": lat, "radius": radius_meters})
    
    return [
        {
            "id": row.id, "name": row.name, "specialty": row.specialty, 
            "phone": row.phone, "address": row.address,
            "coords": [row.lat, row.lon],
            "distance_km": round(row.distance_km, 2)
        } for row in result
    ]


@router.get("/markets", response_model=GeoJSONFeatureCollection)
def get_markets_geojson(db: Session = Depends(get_db)):
    """
    Public markets overlay.
    Visible to all users.
    """
    markets = db.query(Market).filter(Market.is_active == True).all()
    features = []
    for m in markets:
        if m.latitude is None or m.longitude is None: continue
        features.append(GeoJSONFeature(
            geometry=GeoJSONGeometry(coordinates=[m.longitude, m.latitude]),
            properties={
                "id": str(m.id), 
                "name": m.name, 
                "address": m.address,
                "type": m.market_type
            }
        ))
    return GeoJSONFeatureCollection(features=features)
