"""
Smart Farm AI - SQLAlchemy Domain Models
Full enterprise schema supporting multi-species farm monitoring.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    ForeignKey, DateTime, Text, JSON, Enum, Index
)
try:
    from geoalchemy2 import Geometry
    HAS_GEOALCHEMY = True
except ImportError:
    HAS_GEOALCHEMY = False
    
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base
from app.core.config import settings


def get_geom_column(geometry_type='POINT', srid=4326):
    """Fallback to standard types if in Lite mode/SQLite to avoid SpatiaLite requirement"""
    if settings.DATABASE_URL.startswith("sqlite") or not HAS_GEOALCHEMY:
        return Column(String(100), nullable=True)
    return Column(Geometry(geometry_type=geometry_type, srid=srid))


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class UserRole(str, enum.Enum):
    admin = "admin"
    farm_manager = "farm_manager"
    vet = "vet"
    operator = "operator"


class FarmStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    maintenance = "maintenance"


class UnitStatus(str, enum.Enum):
    healthy = "healthy"
    warning = "warning"
    critical = "critical"
    offline = "offline"


class AlertSeverity(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class UrgencyLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ReportType(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    custom = "custom"


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True)
    phone_number = Column(String(20), unique=True, nullable=True)
    full_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="operator")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    farms = relationship("Farm", back_populates="owner")


# ---------------------------------------------------------------------------
# Farms
# ---------------------------------------------------------------------------

class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(100), nullable=False)
    location = Column(String(255))
    description = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    geom = get_geom_column('POINT', 4326)
    status = Column(String(50), default="active")
    total_area_ha = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="farms")
    units = relationship("AnimalUnit", back_populates="farm", cascade="all, delete-orphan")
    settings = relationship("Settings", back_populates="farm", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="farm", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Veterinarians (GIS Entities)
# ---------------------------------------------------------------------------

class Veterinary(Base):
    __tablename__ = "veterinarians"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    specialty = Column(String(100))
    phone = Column(String(20))
    email = Column(String(255))
    address = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    geom = get_geom_column('POINT', 4326)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Markets & Suppliers (GIS Entities)
# ---------------------------------------------------------------------------

class Market(Base):
    __tablename__ = "markets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    market_type = Column(String(50), default="bee_market") # bee_market, feed_market, equipment
    description = Column(Text)
    phone = Column(String(20))
    address = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    geom = get_geom_column('POINT', 4326)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Animal Types (species catalogue)
# ---------------------------------------------------------------------------

class AnimalType(Base):
    __tablename__ = "animal_types"

    id = Column(Integer, primary_key=True, index=True)
    species = Column(String(50), unique=True, nullable=False)  # bee, cow, poultry, sheep, goat
    display_name = Column(String(100))
    description = Column(Text)
    telemetry_schema = Column(JSON)   # expected metric keys for this species
    cv_classes = Column(JSON)         # list of expected CV detection classes
    created_at = Column(DateTime, default=datetime.utcnow)

    units = relationship("AnimalUnit", back_populates="animal_type")


# ---------------------------------------------------------------------------
# Animal Units (individual hive/cow/poultry house etc.)
# ---------------------------------------------------------------------------

class AnimalUnit(Base):
    __tablename__ = "animal_units"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    type_id = Column(Integer, ForeignKey("animal_types.id", ondelete="RESTRICT"), nullable=False)
    name = Column(String(100), nullable=False)           # e.g. hive_01, cow_05
    identifier = Column(String(50), nullable=True)       # external device/tag ID
    status = Column(String(50), default="healthy")
    health_score = Column(Float, default=100.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    farm = relationship("Farm", back_populates="units")
    animal_type = relationship("AnimalType", back_populates="units")
    sensors = relationship("Sensor", back_populates="unit", cascade="all, delete-orphan")
    telemetry = relationship("TelemetryRecord", back_populates="unit", cascade="all, delete-orphan")
    cv_events = relationship("CVEvent", back_populates="unit", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="unit", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="unit", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="unit", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_animal_units_farm_type", "farm_id", "type_id"),
    )


# ---------------------------------------------------------------------------
# Sensors
# ---------------------------------------------------------------------------

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("animal_units.id", ondelete="CASCADE"), nullable=False)
    sensor_type = Column(String(50), nullable=False)   # temperature, humidity, weight, camera
    sensor_id = Column(String(100), nullable=True)     # hardware ID / MQTT topic segment
    is_active = Column(Boolean, default=True)
    last_seen = Column(DateTime)
    metadata_ = Column("metadata", JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    unit = relationship("AnimalUnit", back_populates="sensors")


# ---------------------------------------------------------------------------
# Telemetry Records
# ---------------------------------------------------------------------------

class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("animal_units.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    metrics = Column(JSON, nullable=False)   # flexible: {temperature: 34.2, humidity: 62, ...}
    source = Column(String(50), default="mqtt")  # mqtt | simulator | manual

    unit = relationship("AnimalUnit", back_populates="telemetry")

    __table_args__ = (
        Index("ix_telemetry_unit_time", "unit_id", "timestamp"),
    )


# ---------------------------------------------------------------------------
# CV Events
# ---------------------------------------------------------------------------

class CVEvent(Base):
    __tablename__ = "cv_events"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("animal_units.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    object_class = Column(String(50), nullable=False)   # bee, predator, smoke, fire, cow, limping...
    confidence = Column(Float)
    severity = Column(String(20), default="info")
    thumbnail_url = Column(String(255))
    frame_metadata = Column(JSON)                        # bbox, count, track_id
    camera_id = Column(String(50))

    unit = relationship("AnimalUnit", back_populates="cv_events")

    __table_args__ = (
        Index("ix_cv_events_unit_time", "unit_id", "timestamp"),
    )


# ---------------------------------------------------------------------------
# Anomalies
# ---------------------------------------------------------------------------

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("animal_units.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    anomaly_type = Column(String(100), nullable=False)
    description = Column(Text)
    severity = Column(String(20), default="warning")
    isolation_score = Column(Float)
    rules_triggered = Column(JSON)
    feature_contributions = Column(JSON)   # explainability output
    is_acknowledged = Column(Boolean, default=False)

    unit = relationship("AnimalUnit", back_populates="anomalies")

    __table_args__ = (
        Index("ix_anomalies_unit_time", "unit_id", "timestamp"),
    )


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("animal_units.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    alert_type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="warning")
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolved_by = Column(String(100))

    unit = relationship("AnimalUnit", back_populates="alerts")
    recommendations = relationship("Recommendation", back_populates="alert", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_alerts_unit_severity", "unit_id", "severity"),
        Index("ix_alerts_resolved", "is_resolved"),
    )


# ---------------------------------------------------------------------------
# Recommendations
# ---------------------------------------------------------------------------

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("animal_units.id", ondelete="CASCADE"), nullable=True)
    alert_id = Column(Integer, ForeignKey("alerts.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    probable_cause = Column(Text, nullable=False)
    recommendation_text = Column(Text, nullable=False)
    urgency_level = Column(String(20), default="medium")
    confidence_score = Column(Float, default=90.0)
    is_actioned = Column(Boolean, default=False)

    unit = relationship("AnimalUnit", back_populates="recommendations")
    alert = relationship("Alert", back_populates="recommendations")

    __table_args__ = (
        Index("ix_recommendations_unit", "unit_id"),
    )


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String(50), nullable=False)   # daily, weekly, monthly
    title = Column(String(200))
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    summary = Column(JSON)          # computed stats snapshot
    file_url = Column(String(255))  # future: PDF export path
    generated_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    farm = relationship("Farm", back_populates="reports")


# ---------------------------------------------------------------------------
# Settings (configurable thresholds per farm / animal type)
# ---------------------------------------------------------------------------

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=True)
    animal_type_id = Column(Integer, ForeignKey("animal_types.id", ondelete="CASCADE"), nullable=True)
    key = Column(String(100), nullable=False)
    value = Column(JSON, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    farm = relationship("Farm", back_populates="settings")
    animal_type = relationship("AnimalType")

    __table_args__ = (
        Index("ix_settings_farm_type_key", "farm_id", "animal_type_id", "key"),
    )

# ---------------------------------------------------------------------------
# Diagnostic & Chat History
# ---------------------------------------------------------------------------

class DiagnosticHistory(Base):
    __tablename__ = "diagnostic_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    category = Column(String(50), nullable=False)        # leaves, olive, insects, fire
    image_url = Column(Text, nullable=True)              # DataURI or local path
    detections = Column(JSON, nullable=True)             # Summary of findings
    chat_log = Column(JSON, nullable=True)               # Messages in this session
    notes = Column(Text, nullable=True)

    user = relationship("User")

    __table_args__ = (
        Index("ix_diag_history_user_time", "user_id", "timestamp"),
    )


# ---------------------------------------------------------------------------
# Bee Management — Historisation complète
# ---------------------------------------------------------------------------

class BeeApiary(Base):
    """Site apicole (emplacement géolocalisé)."""
    __tablename__ = "bee_apiaries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    flower_type = Column(String(100), nullable=True)    # Oranger, Thym, etc.
    season = Column(String(50), nullable=True)          # Printemps, Eté, etc.
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hives = relationship("BeeHive", back_populates="apiary", cascade="all, delete-orphan")
    productions = relationship("BeeProduction", back_populates="apiary", cascade="all, delete-orphan")
    visits = relationship("BeeVisit", back_populates="apiary", cascade="all, delete-orphan")


class BeeHive(Base):
    """Ruche individuelle (identifiée par QR code)."""
    __tablename__ = "bee_hives"

    id = Column(Integer, primary_key=True, index=True)
    apiary_id = Column(Integer, ForeignKey("bee_apiaries.id", ondelete="CASCADE"), nullable=False)
    identifier = Column(String(50), unique=True, nullable=False)   # ex: HIVE-0001
    is_active = Column(Boolean, default=True)
    health_score = Column(Float, default=10.0)     # 1-10
    honey_level = Column(Float, default=5.0)       # 1-10
    force_level = Column(Float, default=5.0)       # 1-10
    last_visit_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    apiary = relationship("BeeApiary", back_populates="hives")
    visits = relationship("BeeVisit", back_populates="hive", cascade="all, delete-orphan")


class BeeVisit(Base):
    """Inspection / visite de ruche enregistrée par l'apiculteur."""
    __tablename__ = "bee_visits"

    id = Column(Integer, primary_key=True, index=True)
    hive_id = Column(Integer, ForeignKey("bee_hives.id", ondelete="CASCADE"), nullable=True)
    apiary_id = Column(Integer, ForeignKey("bee_apiaries.id", ondelete="CASCADE"), nullable=True)
    visit_date = Column(String(20), nullable=False)      # Date stockée telle quelle (fr-FR)
    gps_coords = Column(String(100), nullable=True)
    health_state = Column(String(20), default="health")  # health | warning | urgent
    temperature = Column(Float, nullable=True)
    honey_level = Column(String(20), default="Moyen")    # Abondant | Moyen | Faible
    needs_sirop = Column(Float, default=0)
    needs_pate = Column(Float, default=0)
    needs_traitement = Column(Float, default=0)
    harvest_kg = Column(Float, default=0)
    pollen_kg = Column(Float, default=0)
    notes = Column(Text, nullable=True)
    photo_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    hive = relationship("BeeHive", back_populates="visits")
    apiary = relationship("BeeApiary", back_populates="visits")

    __table_args__ = (
        Index("ix_bee_visits_apiary_date", "apiary_id", "visit_date"),
    )


class BeeProduction(Base):
    """Récolte de miel / pollen enregistrée."""
    __tablename__ = "bee_productions"

    id = Column(Integer, primary_key=True, index=True)
    apiary_id = Column(Integer, ForeignKey("bee_apiaries.id", ondelete="CASCADE"), nullable=True)
    production_date = Column(String(20), nullable=False)
    honey_kg = Column(Float, default=0.0)
    pollen_kg = Column(Float, default=0.0)
    quality_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    apiary = relationship("BeeApiary", back_populates="productions")

    __table_args__ = (
        Index("ix_bee_prod_apiary_date", "apiary_id", "production_date"),
    )


class BeeStockLog(Base):
    """Snapshot journalier du stock apicole — historisation des niveaux."""
    __tablename__ = "bee_stock_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_date = Column(String(20), nullable=False)
    sirop = Column(Float, default=0)
    pate = Column(Float, default=0)
    traitement = Column(Float, default=0)
    cadres = Column(Integer, default=0)
    hausse = Column(Integer, default=0)
    equipement = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_bee_stock_date", "log_date"),
    )
