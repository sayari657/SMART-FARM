"""
Smart Farm AI - Pydantic Schemas
Complete request/response schemas for all API endpoints.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ===========================================================================
# Auth
# ===========================================================================

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str


# ===========================================================================
# Users
# ===========================================================================

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "operator"

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===========================================================================
# Farms
# ===========================================================================

class FarmBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    location: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "active"
    total_area_ha: Optional[float] = None

class FarmCreate(FarmBase):
    pass

class FarmUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    total_area_ha: Optional[float] = None

class FarmResponse(FarmBase):
    id: int
    owner_id: Optional[int] = None
    created_at: datetime
    unit_count: Optional[int] = 0
    active_alerts: Optional[int] = 0
    avg_health_score: Optional[float] = None

    class Config:
        from_attributes = True


# ===========================================================================
# Animal Types
# ===========================================================================

class AnimalTypeBase(BaseModel):
    species: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    telemetry_schema: Optional[Dict[str, Any]] = None
    cv_classes: Optional[List[str]] = None

class AnimalTypeCreate(AnimalTypeBase):
    pass

class AnimalTypeResponse(AnimalTypeBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===========================================================================
# Animal Units
# ===========================================================================

class AnimalUnitBase(BaseModel):
    farm_id: int
    type_id: int
    name: str = Field(..., min_length=1, max_length=100)
    identifier: Optional[str] = None
    status: str = "healthy"
    health_score: float = Field(default=100.0, ge=0.0, le=100.0)
    notes: Optional[str] = None

class AnimalUnitCreate(AnimalUnitBase):
    pass

class AnimalUnitUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    health_score: Optional[float] = None
    notes: Optional[str] = None

class AnimalUnitResponse(AnimalUnitBase):
    id: int
    created_at: datetime
    species: Optional[str] = None       # from joined animal_type
    farm_name: Optional[str] = None     # from joined farm

    class Config:
        from_attributes = True


# ===========================================================================
# Sensors
# ===========================================================================

class SensorBase(BaseModel):
    unit_id: int
    sensor_type: str
    sensor_id: Optional[str] = None
    is_active: bool = True

class SensorCreate(SensorBase):
    pass

class SensorResponse(SensorBase):
    id: int
    last_seen: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===========================================================================
# Telemetry
# ===========================================================================

class TelemetryCreate(BaseModel):
    unit_id: int
    timestamp: Optional[datetime] = None
    metrics: Dict[str, Any]
    source: str = "mqtt"

class TelemetryResponse(BaseModel):
    id: int
    unit_id: int
    timestamp: datetime
    metrics: Dict[str, Any]
    source: str

    class Config:
        from_attributes = True

class TelemetryLatest(BaseModel):
    unit_id: int
    unit_name: str
    species: str
    timestamp: Optional[datetime] = None
    metrics: Dict[str, Any] = {}


# ===========================================================================
# CV Events
# ===========================================================================

class CVEventCreate(BaseModel):
    unit_id: int
    timestamp: Optional[datetime] = None
    object_class: str
    confidence: Optional[float] = None
    severity: str = "info"
    thumbnail_url: Optional[str] = None
    frame_metadata: Optional[Dict[str, Any]] = None
    camera_id: Optional[str] = None

class CVEventResponse(BaseModel):
    id: int
    unit_id: int
    timestamp: datetime
    object_class: str
    confidence: Optional[float] = None
    severity: str
    thumbnail_url: Optional[str] = None
    frame_metadata: Optional[Dict[str, Any]] = None
    camera_id: Optional[str] = None
    unit_name: Optional[str] = None

    class Config:
        from_attributes = True


# ===========================================================================
# Anomalies
# ===========================================================================

class AnomalyResponse(BaseModel):
    id: int
    unit_id: int
    timestamp: datetime
    anomaly_type: str
    description: Optional[str] = None
    severity: str
    isolation_score: Optional[float] = None
    rules_triggered: Optional[List[str]] = None
    feature_contributions: Optional[Dict[str, Any]] = None
    is_acknowledged: bool

    class Config:
        from_attributes = True


# ===========================================================================
# Alerts
# ===========================================================================

class AlertCreate(BaseModel):
    unit_id: int
    alert_type: str
    message: str
    severity: str = "warning"

class AlertResponse(BaseModel):
    id: int
    unit_id: int
    timestamp: datetime
    alert_type: str
    message: str
    severity: str
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    unit_name: Optional[str] = None
    farm_name: Optional[str] = None

    class Config:
        from_attributes = True

class AlertResolve(BaseModel):
    resolved_by: Optional[str] = "system"


# ===========================================================================
# Recommendations
# ===========================================================================

class RecommendationCreate(BaseModel):
    unit_id: Optional[int] = None
    alert_id: Optional[int] = None
    probable_cause: str
    recommendation_text: str
    urgency_level: str = "medium"
    confidence_score: float = 90.0

class RecommendationResponse(BaseModel):
    id: int
    unit_id: Optional[int] = None
    alert_id: Optional[int] = None
    timestamp: datetime
    probable_cause: str
    recommendation_text: str
    urgency_level: str
    confidence_score: float
    is_actioned: bool
    unit_name: Optional[str] = None

    class Config:
        from_attributes = True


# ===========================================================================
# Reports
# ===========================================================================

class ReportGenerateRequest(BaseModel):
    farm_id: int
    report_type: str = "daily"   # daily | weekly | monthly
    period_start: datetime
    period_end: datetime
    generated_by: Optional[str] = "system"

class ReportResponse(BaseModel):
    id: int
    farm_id: int
    report_type: str
    title: Optional[str] = None
    period_start: datetime
    period_end: datetime
    summary: Optional[Dict[str, Any]] = None
    file_url: Optional[str] = None
    generated_by: Optional[str] = None
    created_at: datetime
    farm_name: Optional[str] = None

    class Config:
        from_attributes = True


# ===========================================================================
# Settings
# ===========================================================================

class SettingCreate(BaseModel):
    farm_id: Optional[int] = None
    animal_type_id: Optional[int] = None
    key: str
    value: Any
    description: Optional[str] = None

class SettingUpdate(BaseModel):
    value: Any
    description: Optional[str] = None

class SettingResponse(BaseModel):
    id: int
    farm_id: Optional[int] = None
    animal_type_id: Optional[int] = None
    key: str
    value: Any
    description: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True


# ===========================================================================
# Dashboard summary
# ===========================================================================

class DashboardStats(BaseModel):
    total_farms: int
    total_units: int
    active_alerts: int
    critical_alerts: int
    avg_health_score: float
    units_by_species: Dict[str, int]
    recent_anomalies: int
