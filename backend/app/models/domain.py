"""
Smart Farm AI - SQLAlchemy Domain Models
Full enterprise schema supporting multi-species farm monitoring.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    ForeignKey, DateTime, Text, JSON, Enum, Index
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


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
    status = Column(String(50), default="active")
    total_area_ha = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="farms")
    units = relationship("AnimalUnit", back_populates="farm", cascade="all, delete-orphan")
    settings = relationship("Settings", back_populates="farm", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="farm", cascade="all, delete-orphan")


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
