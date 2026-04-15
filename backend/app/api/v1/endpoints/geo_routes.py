from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.core.database import get_db
from app.models.domain import Farm, Veterinary
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

# --- Endpoints ---

@router.get("/vets", response_model=GeoJSONFeatureCollection)
def get_veterinarians(db: Session = Depends(get_db)):
    """Return all veterinarians in GeoJSON format."""
    vets = db.query(Veterinary, ST_AsGeoJSON(Veterinary.geom).label("geojson")).filter(Veterinary.is_active == True).all()
    
    features = []
    for vet, geojson_str in vets:
        if geojson_str:
            geom = json.loads(geojson_str)
            features.append(GeoJSONFeature(
                geometry=GeoJSONGeometry(type=geom["type"], coordinates=geom["coordinates"]),
                properties={
                    "id": vet.id,
                    "name": vet.name,
                    "specialty": vet.specialty,
                    "phone": vet.phone,
                    "address": vet.address
                }
            ))
    
    return GeoJSONFeatureCollection(features=features)

@router.get("/farms", response_model=GeoJSONFeatureCollection)
def get_farms_geojson(db: Session = Depends(get_db)):
    """Return all farms in GeoJSON format."""
    # Note: Optimization would filter by user_id if needed
    farms = db.query(Farm, ST_AsGeoJSON(Farm.geom).label("geojson")).all()
    
    features = []
    for farm, geojson_str in farms:
        if geojson_str:
            geom = json.loads(geojson_str)
            features.append(GeoJSONFeature(
                geometry=GeoJSONGeometry(type=geom["type"], coordinates=geom["coordinates"]),
                properties={
                    "id": farm.id,
                    "name": farm.name,
                    "status": farm.status
                }
            ))
            
    return GeoJSONFeatureCollection(features=features)

@router.get("/nearby-vets", response_model=List[dict])
def find_nearby_vets(lat: float, lon: float, radius_km: float = 20, db: Session = Depends(get_db)):
    """Find veterinarians within a radius from a point."""
    point = f'POINT({lon} {lat})'
    # ST_DWithin uses meters for Geography type
    radius_meters = radius_km * 1000
    
    nearby = db.query(Veterinary).filter(
        ST_DWithin(Veterinary.geom, func.ST_GeogFromText(f"SRID=4326;{point}"), radius_meters)
    ).all()
    
    return [{"id": v.id, "name": v.name, "distance_km": "Calculated by client or server"} for v in nearby]
