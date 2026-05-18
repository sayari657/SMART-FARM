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

# Worker Auth via OTP WhatsApp/SMS
class WorkerOtpRequest(BaseModel):
    phone_number: str  # E.164 format: +21655123456

class WorkerOtpVerify(BaseModel):
    phone_number: str
    otp: str

class WorkerLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    farm_id: Optional[int] = None
    worker_name: str
    phone_number: str

# Legacy (kept for compatibility)
class WorkerLoginRequest(BaseModel):
    farm_id: int
    pin_code: str

# ===========================================================================
# Users
# ===========================================================================

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[str] = None
    phone_number: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "owner"

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


# ===========================================================================
# Diagnostic History
# ===========================================================================

class DiagnosticSave(BaseModel):
    category: str
    image_url: Optional[str] = None
    detections: Optional[Dict[str, Any]] = None
    chat_log: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None

class DiagnosticRead(BaseModel):
    id: int
    timestamp: Any
    category: str
    image_url: Optional[str] = None
    detections: Optional[Any] = None
    chat_log: Optional[Any] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ===========================================================================
# Poultry ERP
# ===========================================================================

class PoultryBatchBase(BaseModel):
    name: str
    batch_type: str
    breed: Optional[str] = None
    supplier: Optional[str] = None
    arrival_date: datetime = Field(default_factory=datetime.utcnow)
    initial_quantity: int
    current_quantity: Optional[int] = None
    status: str = "active"
    notes: Optional[str] = None

class PoultryBatchCreate(PoultryBatchBase):
    farm_id: int

class PoultryBatchResponse(PoultryBatchBase):
    id: int
    farm_id: int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class PoultryBatchUpdate(BaseModel):
    current_quantity: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class PoultryFeedLogBase(BaseModel):
    date: datetime = Field(default_factory=datetime.utcnow)
    feed_type: Optional[str] = None
    quantity_kg: float
    average_weight_g: Optional[float] = None
    fcr_calculated: Optional[float] = None
    cost_per_kg: Optional[float] = None
    notes: Optional[str] = None

class PoultryFeedLogCreate(PoultryFeedLogBase):
    batch_id: int

class PoultryFeedLogResponse(PoultryFeedLogBase):
    id: int
    batch_id: int
    status: Optional[str] = "pending"
    created_by_id: Optional[int] = None
    validated_by_id: Optional[int] = None
    validation_timestamp: Optional[datetime] = None
    admin_notes: Optional[str] = None
    class Config:
        from_attributes = True

class PoultryEggLogBase(BaseModel):
    date: datetime = Field(default_factory=datetime.utcnow)
    total_eggs: int
    broken_eggs: int = 0
    grade_a_count: int = 0
    grade_b_count: int = 0
    production_rate: Optional[float] = None
    notes: Optional[str] = None

class PoultryEggLogCreate(PoultryEggLogBase):
    batch_id: int

class PoultryEggLogResponse(PoultryEggLogBase):
    id: int
    batch_id: int
    status: Optional[str] = "pending"
    created_by_id: Optional[int] = None
    validated_by_id: Optional[int] = None
    validation_timestamp: Optional[datetime] = None
    admin_notes: Optional[str] = None
    class Config:
        from_attributes = True


# ===========================================================================
# Warehouse / Entrepôt
# ===========================================================================

class WarehouseItemCreate(BaseModel):
    category_id:  int
    name_ar:      str
    name_fr:      str
    emoji:        Optional[str]   = "📦"
    description:  Optional[str]   = ""
    quantity:     float            = 0.0
    unit:         Optional[str]   = "unités"
    min_quantity: Optional[float] = 5.0
    entry_date:   Optional[datetime] = None
    expiry_date:  Optional[datetime] = None
    notes:        Optional[str]   = ""

class WarehouseItemUpdate(BaseModel):
    name_ar:      Optional[str]   = None
    name_fr:      Optional[str]   = None
    emoji:        Optional[str]   = None
    description:  Optional[str]   = None
    quantity:     Optional[float] = None
    unit:         Optional[str]   = None
    min_quantity: Optional[float] = None
    entry_date:   Optional[datetime] = None
    expiry_date:  Optional[datetime] = None
    notes:        Optional[str]   = None
    category_id:  Optional[int]   = None

class PoultryHealthLogBase(BaseModel):
    date: datetime = Field(default_factory=datetime.utcnow)
    event_type: str = "inspection"
    description: str = ""
    deaths_today: int = 0
    medicine_used: Optional[str] = None
    dosage: Optional[str] = None
    vet_name: Optional[str] = None
    cost: float = 0.0
    notes: Optional[str] = None

class PoultryHealthLogCreate(PoultryHealthLogBase):
    batch_id: int

class PoultryHealthLogResponse(PoultryHealthLogBase):
    id: int
    batch_id: int
    status: Optional[str] = "pending"
    created_by_id: Optional[int] = None
    validated_by_id: Optional[int] = None
    validation_timestamp: Optional[datetime] = None
    admin_notes: Optional[str] = None
    class Config:
        from_attributes = True

class PoultrySaleBase(BaseModel):
    date: datetime = Field(default_factory=datetime.utcnow)
    product_type: str
    quantity: int
    unit_price: float
    total_amount: float
    customer_name: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None

class PoultrySaleCreate(PoultrySaleBase):
    batch_id: int

class PoultrySaleResponse(PoultrySaleBase):
    id: int
    batch_id: int
    status: Optional[str] = "pending"
    created_by_id: Optional[int] = None
    validated_by_id: Optional[int] = None
    validation_timestamp: Optional[datetime] = None
    admin_notes: Optional[str] = None
    class Config:
        from_attributes = True

class PoultryFeedLogUpdate(BaseModel):
    feed_type: Optional[str] = None
    quantity_kg: Optional[float] = None
    average_weight_g: Optional[float] = None
    fcr_calculated: Optional[float] = None
    cost_per_kg: Optional[float] = None
    notes: Optional[str] = None

class PoultryEggLogUpdate(BaseModel):
    total_eggs: Optional[int] = None
    broken_eggs: Optional[int] = None
    grade_a_count: Optional[int] = None
    notes: Optional[str] = None

class PoultryHealthLogUpdate(BaseModel):
    event_type: Optional[str] = None
    description: Optional[str] = None
    medicine_used: Optional[str] = None
    dosage: Optional[str] = None
    vet_name: Optional[str] = None
    cost: Optional[float] = None
    notes: Optional[str] = None

class PoultrySaleUpdate(BaseModel):
    product_type: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None

class PoultryInventoryBase(BaseModel):
    item_name: str
    category: str
    quantity: float
    unit: str
    unit_price: Optional[float] = None
    min_threshold: Optional[float] = None
    supplier: Optional[str] = None

class PoultryInventoryCreate(PoultryInventoryBase):
    farm_id: int

class PoultryInventoryUpdate(BaseModel):
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    min_threshold: Optional[float] = None
    supplier: Optional[str] = None

class PoultryInventoryResponse(PoultryInventoryBase):
    id: int
    last_updated: datetime
    class Config:
        from_attributes = True

# --- NEW: Validation Contract ---
class PoultryLogValidation(BaseModel):
    status: str  # validated, rejected
    admin_notes: Optional[str] = None
