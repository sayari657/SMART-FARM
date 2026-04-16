"""
Smart Farm AI - Database Seed Script
Run: python -m app.utils.seed
Inserts demo data: 2 farms, hives, cows, poultry, telemetry, alerts, recommendations.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../"))

from datetime import datetime, timedelta
import random
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.domain import (
    User, Farm, AnimalType, AnimalUnit, Sensor,
    TelemetryRecord, CVEvent, Anomaly, Alert, Recommendation, Report, Settings
)


def seed():
    # Ensure tables exist (crucial for SQLite)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # ------------------------------------------------------------------
        # Users
        # ------------------------------------------------------------------
        if not db.query(User).filter(User.username == "admin").first():
            users = [
                User(username="admin", email="admin@smartfarm.ai", full_name="Farm Admin",
                     password_hash=hash_password("admin123"), role="admin"),
                User(username="manager", email="manager@smartfarm.ai", full_name="Farm Manager",
                     password_hash=hash_password("manager123"), role="farm_manager"),
                User(username="vet", email="vet@smartfarm.ai", full_name="Dr. Vet",
                     password_hash=hash_password("vet123"), role="vet"),
            ]
            db.add_all(users)
            db.commit()
            print("[OK] Users seeded")

        admin = db.query(User).filter(User.username == "admin").first()

        # ------------------------------------------------------------------
        # Animal Types
        # ------------------------------------------------------------------
        species_data = [
            {"species": "bee", "display_name": "Honeybee Hive", "description": "Apis mellifera colony monitoring",
             "telemetry_schema": {"temperature": "°C", "humidity": "%", "hive_weight": "kg", "sound_level": "dB"},
             "cv_classes": ["bee", "predator", "smoke", "fire", "varroa_mite"]},
            {"species": "cow", "display_name": "Dairy Cow", "description": "Bovine health and milk yield monitoring",
             "telemetry_schema": {"body_temperature": "°C", "activity": "steps/h", "rumination": "min/h", "milk_yield": "L/day"},
             "cv_classes": ["cow", "standing", "lying", "limping", "feeding", "estrus"]},
            {"species": "poultry", "display_name": "Poultry House", "description": "Broiler/layer flock monitoring",
             "telemetry_schema": {"coop_temperature": "°C", "humidity": "%", "ammonia": "ppm", "sound_level": "dB", "bird_count": "count"},
             "cv_classes": ["chicken", "crowding", "dead_bird", "feeder", "waterline", "pecking"]},
            {"species": "sheep", "display_name": "Sheep Group", "description": "Ovine flock monitoring",
             "telemetry_schema": {"body_temperature": "°C", "activity": "steps/h", "respiratory_rate": "breaths/min"},
             "cv_classes": ["sheep", "limping", "grazing", "isolated", "predator"]},
            {"species": "goat", "display_name": "Goat Group", "description": "Caprine herd monitoring",
             "telemetry_schema": {"body_temperature": "°C", "activity": "steps/h", "milk_yield": "L/day"},
             "cv_classes": ["goat", "feeding", "fighting", "limping", "predator"]},
        ]
        type_map = {}
        for sp in species_data:
            existing = db.query(AnimalType).filter(AnimalType.species == sp["species"]).first()
            if not existing:
                at = AnimalType(**sp)
                db.add(at)
                db.commit()
                db.refresh(at)
                type_map[sp["species"]] = at
            else:
                type_map[sp["species"]] = existing
        print("✓ Animal types seeded")

        # ------------------------------------------------------------------
        # Farms
        # ------------------------------------------------------------------
        farms = []
        farm_defs = [
            {"name": "Oasis Apiary & Livestock", "location": "Biskra, Algeria",
             "description": "Mixed farm with bee hives and livestock", "latitude": 34.85, "longitude": 5.73,
             "total_area_ha": 12.5, "status": "active"},
            {"name": "Green Valley Farm", "location": "Blida, Algeria",
             "description": "Dairy cattle and poultry operation", "latitude": 36.47, "longitude": 2.82,
             "total_area_ha": 45.0, "status": "active"},
        ]
        for fd in farm_defs:
            existing = db.query(Farm).filter(Farm.name == fd["name"]).first()
            if not existing:
                farm = Farm(**fd, owner_id=admin.id)
                db.add(farm)
                db.commit()
                db.refresh(farm)
                farms.append(farm)
            else:
                farms.append(existing)
        print("✓ Farms seeded")

        farm1, farm2 = farms[0], farms[1]

        # ------------------------------------------------------------------
        # Animal Units
        # ------------------------------------------------------------------
        units = []
        unit_defs = [
            # Farm 1 — Bee hives
            {"farm_id": farm1.id, "type_id": type_map["bee"].id, "name": "Hive Alpha",
             "identifier": "hive_01", "status": "healthy", "health_score": 92.0},
            {"farm_id": farm1.id, "type_id": type_map["bee"].id, "name": "Hive Beta",
             "identifier": "hive_02", "status": "warning", "health_score": 67.0},
            {"farm_id": farm1.id, "type_id": type_map["bee"].id, "name": "Hive Gamma",
             "identifier": "hive_03", "status": "healthy", "health_score": 88.0},
            {"farm_id": farm1.id, "type_id": type_map["sheep"].id, "name": "Sheep Group A",
             "identifier": "sheep_A", "status": "healthy", "health_score": 95.0},
            # Farm 2 — Cows + Poultry
            {"farm_id": farm2.id, "type_id": type_map["cow"].id, "name": "Cow #005",
             "identifier": "cow_05", "status": "healthy", "health_score": 91.0},
            {"farm_id": farm2.id, "type_id": type_map["cow"].id, "name": "Cow #012",
             "identifier": "cow_12", "status": "warning", "health_score": 72.0},
            {"farm_id": farm2.id, "type_id": type_map["cow"].id, "name": "Cow #018",
             "identifier": "cow_18", "status": "healthy", "health_score": 85.0},
            {"farm_id": farm2.id, "type_id": type_map["poultry"].id, "name": "Poultry House 02",
             "identifier": "poultry_house_02", "status": "critical", "health_score": 44.0},
        ]
        for ud in unit_defs:
            existing = db.query(AnimalUnit).filter(
                AnimalUnit.identifier == ud["identifier"]
            ).first()
            if not existing:
                unit = AnimalUnit(**ud)
                db.add(unit)
                db.commit()
                db.refresh(unit)
                units.append(unit)
            else:
                units.append(existing)
        print("✓ Animal units seeded")

        # ------------------------------------------------------------------
        # Sensors
        # ------------------------------------------------------------------
        for unit in units:
            if not db.query(Sensor).filter(Sensor.unit_id == unit.id).first():
                sensor_types = {
                    type_map["bee"].id: ["temperature", "humidity", "weight", "sound", "camera"],
                    type_map["cow"].id: ["temperature", "accelerometer", "rfid"],
                    type_map["poultry"].id: ["temperature", "humidity", "ammonia", "sound", "camera"],
                    type_map["sheep"].id: ["temperature", "accelerometer"],
                }
                for st in sensor_types.get(unit.type_id, ["temperature"]):
                    db.add(Sensor(unit_id=unit.id, sensor_type=st,
                                  sensor_id=f"{unit.identifier}_{st}", is_active=True,
                                  last_seen=datetime.utcnow()))
        db.commit()
        print("✓ Sensors seeded")

        # ------------------------------------------------------------------
        # Telemetry Records (48h of hourly data per unit)
        # ------------------------------------------------------------------
        bee_units = [u for u in units if u.type_id == type_map["bee"].id]
        cow_units = [u for u in units if u.type_id == type_map["cow"].id]
        poultry_units = [u for u in units if u.type_id == type_map["poultry"].id]

        if not db.query(TelemetryRecord).filter(TelemetryRecord.unit_id == units[0].id).first():
            records = []
            now = datetime.utcnow()
            for hours_ago in range(48, 0, -1):
                ts = now - timedelta(hours=hours_ago)
                noise = lambda s=1.0: random.gauss(0, s)

                for u in bee_units:
                    base_temp = 34.5 if u.identifier == "hive_01" else 33.0
                    records.append(TelemetryRecord(unit_id=u.id, timestamp=ts, source="simulator", metrics={
                        "temperature": round(base_temp + noise(0.8), 2),
                        "humidity": round(60 + noise(3), 1),
                        "hive_weight": round(28.5 + noise(0.5) - hours_ago * 0.01, 2),
                        "sound_level": round(42 + noise(4), 1),
                    }))

                for u in cow_units:
                    records.append(TelemetryRecord(unit_id=u.id, timestamp=ts, source="simulator", metrics={
                        "body_temperature": round(38.5 + noise(0.3), 2),
                        "activity": round(max(0, 120 + noise(20)), 0),
                        "rumination": round(max(0, 45 + noise(8)), 1),
                        "milk_yield": round(max(0, 22 + noise(2)), 2),
                    }))

                for u in poultry_units:
                    records.append(TelemetryRecord(unit_id=u.id, timestamp=ts, source="simulator", metrics={
                        "coop_temperature": round(21 + noise(1.5), 2),
                        "humidity": round(65 + noise(4), 1),
                        "ammonia": round(max(0, 18 + noise(5)), 1),
                        "sound_level": round(55 + noise(8), 1),
                        "bird_count": int(max(0, 480 + noise(15))),
                    }))

            db.add_all(records)
            db.commit()
            print(f"✓ Telemetry seeded ({len(records)} records)")

        # ------------------------------------------------------------------
        # CV Events
        # ------------------------------------------------------------------
        hive_alpha = next(u for u in units if u.identifier == "hive_01")
        hive_beta = next(u for u in units if u.identifier == "hive_02")
        poultry_house = next(u for u in units if u.identifier == "poultry_house_02")

        if not db.query(CVEvent).filter(CVEvent.unit_id == hive_alpha.id).first():
            cv_events = [
                CVEvent(unit_id=hive_alpha.id, timestamp=datetime.utcnow()-timedelta(hours=6),
                        object_class="bee", confidence=0.97, severity="info", camera_id="cam_hive01"),
                CVEvent(unit_id=hive_alpha.id, timestamp=datetime.utcnow()-timedelta(hours=3),
                        object_class="predator", confidence=0.89, severity="critical", camera_id="cam_hive01",
                        frame_metadata={"type": "hornet", "bbox": [120, 80, 200, 150]}),
                CVEvent(unit_id=hive_beta.id, timestamp=datetime.utcnow()-timedelta(hours=12),
                        object_class="smoke", confidence=0.92, severity="warning", camera_id="cam_hive02"),
                CVEvent(unit_id=hive_beta.id, timestamp=datetime.utcnow()-timedelta(hours=2),
                        object_class="predator", confidence=0.78, severity="warning", camera_id="cam_hive02"),
                CVEvent(unit_id=poultry_house.id, timestamp=datetime.utcnow()-timedelta(hours=8),
                        object_class="dead_bird", confidence=0.94, severity="critical", camera_id="cam_poultry02"),
                CVEvent(unit_id=poultry_house.id, timestamp=datetime.utcnow()-timedelta(hours=4),
                        object_class="crowding", confidence=0.85, severity="warning", camera_id="cam_poultry02",
                        frame_metadata={"crowding_zone": "feeder_area", "density": "high"}),
                CVEvent(unit_id=poultry_house.id, timestamp=datetime.utcnow()-timedelta(hours=1),
                        object_class="dead_bird", confidence=0.96, severity="critical", camera_id="cam_poultry02"),
            ]
            db.add_all(cv_events)
            db.commit()
            print("✓ CV events seeded")

        # ------------------------------------------------------------------
        # Anomalies
        # ------------------------------------------------------------------
        if not db.query(Anomaly).filter(Anomaly.unit_id == hive_beta.id).first():
            anomalies = [
                Anomaly(unit_id=hive_beta.id, timestamp=datetime.utcnow()-timedelta(hours=10),
                        anomaly_type="predation_risk", severity="critical",
                        description="Predator detected combined with unusual activity drop",
                        isolation_score=-0.32,
                        rules_triggered=["predator_detected", "activity_drop_30pct"],
                        feature_contributions={"sound_level": 0.45, "hive_weight": 0.30, "temperature": 0.25}),
                Anomaly(unit_id=hive_alpha.id, timestamp=datetime.utcnow()-timedelta(hours=5),
                        anomaly_type="heat_stress_risk", severity="warning",
                        description="Hive temperature above threshold with humidity drop",
                        isolation_score=-0.18,
                        rules_triggered=["high_temperature", "low_humidity"],
                        feature_contributions={"temperature": 0.65, "humidity": 0.35}),
                Anomaly(unit_id=poultry_house.id, timestamp=datetime.utcnow()-timedelta(hours=7),
                        anomaly_type="flock_health_decline", severity="critical",
                        description="Multiple dead birds detected, ammonia elevated",
                        isolation_score=-0.55,
                        rules_triggered=["dead_bird_detected", "ammonia_high"],
                        feature_contributions={"ammonia": 0.60, "sound_level": 0.25, "bird_count": 0.15}),
            ]
            db.add_all(anomalies)
            db.commit()
            print("✓ Anomalies seeded")

        # ------------------------------------------------------------------
        # Alerts
        # ------------------------------------------------------------------
        if not db.query(Alert).filter(Alert.unit_id == hive_beta.id).first():
            alerts = [
                Alert(unit_id=hive_beta.id, timestamp=datetime.utcnow()-timedelta(hours=10),
                      alert_type="predation_risk", severity="critical",
                      message="⚠️ Hornet predator detected at Hive Beta entrance. Immediate inspection required.",
                      is_resolved=False),
                Alert(unit_id=hive_alpha.id, timestamp=datetime.utcnow()-timedelta(hours=5),
                      alert_type="heat_stress", severity="warning",
                      message="Hive Alpha internal temperature reached 37.8°C — possible heat stress.",
                      is_resolved=False),
                Alert(unit_id=poultry_house.id, timestamp=datetime.utcnow()-timedelta(hours=8),
                      alert_type="flock_mortality", severity="critical",
                      message="🚨 Dead birds detected in Poultry House 02. Veterinary inspection needed urgently.",
                      is_resolved=False),
                Alert(unit_id=poultry_house.id, timestamp=datetime.utcnow()-timedelta(hours=6),
                      alert_type="ammonia_spike", severity="warning",
                      message="Ammonia level at 28 ppm — dangerously high. Ventilate immediately.",
                      is_resolved=False),
                Alert(unit_id=hive_beta.id, timestamp=datetime.utcnow()-timedelta(days=2),
                      alert_type="weight_drop", severity="warning",
                      message="Hive Beta weight dropped by 2.1 kg in 24h — possible swarming.",
                      is_resolved=True, resolved_at=datetime.utcnow()-timedelta(days=1), resolved_by="manager"),
            ]
            db.add_all(alerts)
            db.commit()
            # Get inserted alerts
            active_alerts = db.query(Alert).filter(Alert.unit_id == hive_beta.id, Alert.is_resolved == False).all()
            print("✓ Alerts seeded")

            # ------------------------------------------------------------------
            # Recommendations
            # ------------------------------------------------------------------
            recs = [
                Recommendation(unit_id=hive_beta.id,
                                alert_id=active_alerts[0].id if active_alerts else None,
                                probable_cause="Oriental hornet (Vespa orientalis) predation activity detected by CV system",
                                recommendation_text="1. Install entrance reducer immediately\n2. Set hornet traps within 5m radius\n3. Inspect frames for damaged brood\n4. Monitor entrance traffic for next 48h",
                                urgency_level="critical", confidence_score=91.0),
                Recommendation(unit_id=hive_alpha.id,
                                probable_cause="Elevated hive temperature likely caused by direct midday sun exposure",
                                recommendation_text="1. Move hive to partial shade or add shading board\n2. Ensure adequate water source nearby\n3. Check ventilation — add upper entrance if needed\n4. Monitor for brood damage",
                                urgency_level="high", confidence_score=84.0),
                Recommendation(unit_id=poultry_house.id,
                                probable_cause="High ammonia levels (28 ppm) combined with mortality events — possible Newcastle disease or Gumboro",
                                recommendation_text="1. Emergency flock inspection by veterinarian\n2. Collect tissue samples from dead birds for lab\n3. Open all ventilation panels\n4. Review vaccination records\n5. Isolate house if infectious disease suspected",
                                urgency_level="critical", confidence_score=88.0),
            ]
            db.add_all(recs)
            db.commit()
            print("✓ Recommendations seeded")

        # ------------------------------------------------------------------
        # Default Settings
        # ------------------------------------------------------------------
        defaults = [
            {"key": "bee_temp_max", "value": 36.0, "description": "Max hive temperature threshold (°C)"},
            {"key": "bee_humidity_min", "value": 45.0, "description": "Min hive humidity threshold (%)"},
            {"key": "bee_weight_drop_alert", "value": 1.5, "description": "Weight drop (kg/24h) to trigger alert"},
            {"key": "cow_temp_max", "value": 39.5, "description": "Max cow body temperature (°C)"},
            {"key": "poultry_ammonia_max", "value": 25.0, "description": "Max ammonia level (ppm)"},
            {"key": "poultry_temp_max", "value": 28.0, "description": "Max coop temperature (°C)"},
            {"key": "alert_check_interval_sec", "value": 60, "description": "Worker check interval in seconds"},
        ]
        for d in defaults:
            if not db.query(Settings).filter(Settings.key == d["key"]).first():
                db.add(Settings(**d))
        db.commit()
        print("✓ Settings seeded")

        print("\n✅ All seed data inserted successfully.")
        print("   Default credentials:")
        print("   admin / admin123    (role: admin)")
        print("   manager / manager123 (role: farm_manager)")
        print("   vet / vet123        (role: vet)")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
