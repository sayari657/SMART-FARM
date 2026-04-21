"""
Smart Farm AI - Enterprise Seed Script
Populates the database with realistic Tunisian agricultural data.
Run: python seed_enterprise.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.core.database import engine, Base, SessionLocal
from app.models.domain import (
    User, Farm, AnimalType, AnimalUnit, Sensor, TelemetryRecord,
    CVEvent, Anomaly, Alert, Recommendation, Report, Settings,
    Veterinary, Market
)
from app.core.config import settings as cfg
from app.core.security import hash_password as _hash

def clear_db(db: Session):
    for model in [Recommendation, Alert, Anomaly, CVEvent, TelemetryRecord,
                  Sensor, Settings, Report, AnimalUnit, Farm,
                  Veterinary, Market, AnimalType, User]:
        db.query(model).delete()
    db.commit()
    print("[CLEAR] All tables emptied.")

def seed_users(db: Session):
    users = [
        User(username="admin",    email="admin@smartfarm.tn",      phone_number="+21698000001", full_name="Mohamed Sayari",      password_hash=_hash("admin123"),    role="admin"),
        User(username="manager1", email="manager@ferme-beja.tn",   phone_number="+21698000002", full_name="Karim Ben Salah",     password_hash=_hash("manager123"),  role="farm_manager"),
        User(username="vet1",     email="vet@clinique-sfax.tn",    phone_number="+21698000003", full_name="Dr. Leila Trabelsi",  password_hash=_hash("vet123"),      role="vet"),
    ]
    db.add_all(users)
    db.flush()
    print(f"[USERS] Seeded {len(users)} users.")
    return {u.username: u for u in users}

def seed_animal_types(db: Session):
    types = [
        AnimalType(species="bee",     display_name="Abeilles",  description="Ruches apicoles Tunisiennes",
                   telemetry_schema={"temperature": "°C", "humidity": "%", "weight": "kg", "sound_level": "dB", "pollen_rate": "%", "honey_yield": "kg", "days_to_harvest": "days"},
                   cv_classes=["bee", "varroa", "predator", "queen", "worker", "drone"]),
        AnimalType(species="cow",     display_name="Bovins",    description="Bovins laitiers et viande",
                   telemetry_schema={"temperature": "°C", "heart_rate": "bpm", "weight": "kg", "milk_yield": "L/day", "activity": "steps"},
                   cv_classes=["cow", "limping", "normal", "feeding", "resting"]),
        AnimalType(species="poultry", display_name="Volailles", description="Poulets et dindes",
                   telemetry_schema={"temperature": "°C", "humidity": "%", "nh3_level": "ppm", "co2_level": "ppm", "weight": "kg", "mortality_rate": "%"},
                   cv_classes=["chicken", "dead", "pecking", "crowding", "normal"]),
        AnimalType(species="sheep",   display_name="Ovins",     description="Moutons et agneaux",
                   telemetry_schema={"temperature": "°C", "weight": "kg", "heart_rate": "bpm", "lambing_status": "bool", "activity": "steps"},
                   cv_classes=["sheep", "limping", "normal", "sick", "feeding"]),
        AnimalType(species="goat",    display_name="Caprins",   description="Chèvres laitières",
                   telemetry_schema={"temperature": "°C", "milk_yield": "L/day", "weight": "kg", "activity": "steps"},
                   cv_classes=["goat", "normal", "sick", "feeding", "fighting"]),
        AnimalType(species="rabbit",  display_name="Lapins",    description="Cuniculture",
                   telemetry_schema={"temperature": "°C", "humidity": "%", "weight": "kg", "feed_rate": "g/day"},
                   cv_classes=["rabbit", "normal", "sick", "feeding"]),
    ]
    db.add_all(types)
    db.flush()
    print(f"[ANIMAL_TYPES] Seeded {len(types)} types.")
    return {t.species: t for t in types}

def seed_farms(db: Session, users):
    farms = [
        Farm(owner_id=users["admin"].id,    name="Ferme Apicole Atlas",       location="Beja, Tunisie",          latitude=36.7256, longitude=9.1817,  status="active", total_area_ha=12.5,  description="Rucher de montagne, 60 ruches Langstroth"),
        Farm(owner_id=users["manager1"].id, name="Élevage Sidi Bou Ali",      location="Sousse, Tunisie",        latitude=35.9850, longitude=10.5150, status="active", total_area_ha=45.0,  description="Élevage bovin et ovin intégré"),
        Farm(owner_id=users["admin"].id,    name="Oliveraie El Abassia",       location="Sfax, Tunisie",          latitude=34.7405, longitude=10.7603, status="active", total_area_ha=78.0,  description="Oliveraie centenaire Chetoui/Zarazi"),
        Farm(owner_id=users["manager1"].id, name="Ferme Avicole Nabeul",       location="Nabeul, Tunisie",        latitude=36.4513, longitude=10.7357, status="active", total_area_ha=8.0,   description="Élevage poulets de chair Label Rouge"),
        Farm(owner_id=users["admin"].id,    name="Cuniculture Ben Arous",      location="Ben Arous, Tunisie",     latitude=36.7533, longitude=10.2278, status="active", total_area_ha=3.2,   description="Cuniculture semi-intensive 800 lapins"),
    ]
    db.add_all(farms)
    db.flush()
    print(f"[FARMS] Seeded {len(farms)} farms.")
    return farms

def seed_units(db: Session, farms, atypes):
    units = []
    # Farm 0: Apicole (bees)
    for i in range(1, 9):
        u = AnimalUnit(farm_id=farms[0].id, type_id=atypes["bee"].id,
                       name=f"HIVE_{i:02d}", identifier=f"BEE-{farms[0].id}-{i:03d}",
                       status=random.choice(["healthy","healthy","healthy","warning"]),
                       health_score=round(random.uniform(78, 98), 1),
                       notes=f"Ruche Langstroth numéro {i}")
        units.append(u)

    # Farm 1: Bovin + Ovin
    for i in range(1, 6):
        u = AnimalUnit(farm_id=farms[1].id, type_id=atypes["cow"].id,
                       name=f"BOVIN_{i:02d}", identifier=f"COW-{farms[1].id}-{i:03d}",
                       status=random.choice(["healthy","healthy","warning"]),
                       health_score=round(random.uniform(75, 95), 1))
        units.append(u)
    for i in range(1, 5):
        u = AnimalUnit(farm_id=farms[1].id, type_id=atypes["sheep"].id,
                       name=f"TROUPEAU_OVIN_{i:02d}", identifier=f"SHP-{farms[1].id}-{i:03d}",
                       status=random.choice(["healthy","healthy","warning"]),
                       health_score=round(random.uniform(80, 97), 1))
        units.append(u)

    # Farm 2: Oliveraie (no livestock, but keep a placeholder bee colony)
    u = AnimalUnit(farm_id=farms[2].id, type_id=atypes["bee"].id,
                   name="HIVE_OLIVERAIE_01", identifier="BEE-OLV-001",
                   status="healthy", health_score=91.5)
    units.append(u)

    # Farm 3: Avicole
    for i in range(1, 5):
        u = AnimalUnit(farm_id=farms[3].id, type_id=atypes["poultry"].id,
                       name=f"BATIMENT_P{i}", identifier=f"PTR-{farms[3].id}-{i:03d}",
                       status=random.choice(["healthy","healthy","warning","critical"]),
                       health_score=round(random.uniform(68, 95), 1))
        units.append(u)

    # Farm 4: Cuniculture
    for i in range(1, 4):
        u = AnimalUnit(farm_id=farms[4].id, type_id=atypes["rabbit"].id,
                       name=f"CAGE_BLOC_{i}", identifier=f"RBT-{farms[4].id}-{i:03d}",
                       status="healthy", health_score=round(random.uniform(85, 97), 1))
        units.append(u)

    # Add some goats on farm 1
    for i in range(1, 4):
        u = AnimalUnit(farm_id=farms[1].id, type_id=atypes["goat"].id,
                       name=f"CHEVRE_{i:02d}", identifier=f"GT-{farms[1].id}-{i:03d}",
                       status="healthy", health_score=round(random.uniform(82, 96), 1))
        units.append(u)

    db.add_all(units)
    db.flush()
    print(f"[UNITS] Seeded {len(units)} animal units.")
    return units

def _bee_metrics(hour_offset=0):
    base_temp = 34.5 + random.gauss(0, 0.8)
    if 10 <= (hour_offset % 24) <= 16:
        base_temp += random.uniform(0.5, 2.0)
    return {
        "temperature": round(base_temp, 2),
        "humidity":    round(random.uniform(55, 70), 2),
        "weight":      round(random.uniform(38, 46), 2),
        "sound_level": round(random.uniform(48, 68), 2),
        "pollen_rate": round(random.uniform(6.0, 14.0), 1),
        "honey_yield": round(random.uniform(12, 22), 1),
        "days_to_harvest": random.randint(8, 21),
    }

def _cow_metrics():
    return {
        "temperature": round(random.uniform(38.0, 39.5), 2),
        "heart_rate":  round(random.uniform(50, 80), 1),
        "weight":      round(random.uniform(380, 620), 1),
        "milk_yield":  round(random.uniform(8.0, 32.0), 1),
        "activity":    random.randint(1500, 8000),
    }

def _poultry_metrics():
    return {
        "temperature":    round(random.uniform(21.0, 26.0), 2),
        "humidity":       round(random.uniform(55, 72), 2),
        "nh3_level":      round(random.uniform(8, 25), 1),
        "co2_level":      round(random.uniform(800, 2500), 0),
        "weight":         round(random.uniform(1.2, 2.8), 2),
        "mortality_rate": round(random.uniform(0.0, 2.5), 2),
    }

def _sheep_metrics():
    return {
        "temperature":    round(random.uniform(38.5, 39.8), 2),
        "weight":         round(random.uniform(35, 75), 1),
        "heart_rate":     round(random.uniform(70, 90), 1),
        "lambing_status": random.choice([0, 0, 0, 1]),
        "activity":       random.randint(2000, 10000),
    }

def _goat_metrics():
    return {
        "temperature": round(random.uniform(38.5, 39.8), 2),
        "milk_yield":  round(random.uniform(0.8, 4.5), 2),
        "weight":      round(random.uniform(28, 60), 1),
        "activity":    random.randint(1800, 9000),
    }

def _rabbit_metrics():
    return {
        "temperature": round(random.uniform(18.0, 22.0), 2),
        "humidity":    round(random.uniform(55, 70), 2),
        "weight":      round(random.uniform(2.2, 4.8), 2),
        "feed_rate":   round(random.uniform(120, 200), 1),
    }

METRICS_FN = {
    "bee": _bee_metrics, "cow": _cow_metrics, "poultry": _poultry_metrics,
    "sheep": _sheep_metrics, "goat": _goat_metrics, "rabbit": _rabbit_metrics,
}

def seed_telemetry(db: Session, units, atypes):
    records = []
    # Last 8 days, every 30 minutes
    now = datetime.utcnow()
    species_map = {u.id: u.animal_type.species for u in units if u.animal_type}

    # Rebuild map from unit objects (animal_type lazy-loaded)
    type_id_to_species = {v.id: k for k, v in atypes.items()}

    for u in units:
        sp = type_id_to_species.get(u.type_id, "bee")
        fn = METRICS_FN.get(sp, _bee_metrics)
        intervals = 8 * 24 * 2  # 8 days × 48 per day
        for i in range(intervals):
            ts = now - timedelta(minutes=30 * (intervals - i))
            hour_offset = ts.hour
            m = fn(hour_offset) if sp == "bee" else fn()
            records.append(TelemetryRecord(unit_id=u.id, timestamp=ts, metrics=m, source="iot"))
        if len(records) >= 5000:
            db.add_all(records)
            db.flush()
            records = []
            print(f"  [TELEMETRY] Batch flushed...")

    if records:
        db.add_all(records)
        db.flush()
    total = sum(8 * 48 for _ in units)
    print(f"[TELEMETRY] Seeded ~{total} records across {len(units)} units.")

def seed_cv_events(db: Session, units, atypes):
    type_id_to_species = {v.id: k for k, v in atypes.items()}
    events = []
    now = datetime.utcnow()

    PLANT_CLASSES = {
        "leaves":  [("Angular_Leaf_Spot", "warning"), ("Bean_Rust", "warning"), ("Healthy_Bean", "info"),
                    ("Tomato_Blight", "critical"), ("Tomato_Bacterial_Spot", "warning"), ("Strawberry_Leaf_Scorch", "warning")],
        "olive":   [("OlivePeacockSpot", "warning"), ("Anthracnose", "critical"), ("BlackScale", "warning"),
                    ("Psyllid", "warning"), ("Tuberculosis", "critical"), ("Healthy_Olive", "info")],
        "insects": [("Army_Worm", "critical"), ("Legume_Beetle", "warning"), ("Rice_Gall_Midge", "warning"),
                    ("Red_Spider", "warning"), ("Aphid", "info"), ("Thrips", "warning")],
    }
    ANIMAL_CLASSES = {
        "bee":     [("varroa", "warning"), ("queen", "info"), ("worker", "info"), ("predator", "critical")],
        "cow":     [("limping", "critical"), ("normal", "info"), ("feeding", "info")],
        "poultry": [("dead", "critical"), ("crowding", "warning"), ("normal", "info"), ("pecking", "warning")],
        "sheep":   [("limping", "critical"), ("sick", "warning"), ("normal", "info")],
        "goat":    [("sick", "warning"), ("normal", "info"), ("fighting", "warning")],
    }

    # Plant CV events — simulate 90 days of scans across plant-oriented farms
    plant_farm_units = [u for u in units if type_id_to_species.get(u.type_id) in ("bee", "cow") and u.farm_id in [1, 3]]
    # Use first bee unit as anchor for plant detections (camera_id = category)
    anchor_unit = next((u for u in units if type_id_to_species.get(u.type_id) == "bee"), units[0])

    for cat, classes in PLANT_CLASSES.items():
        for day_offset in range(60):
            n_events = random.randint(1, 6)
            for _ in range(n_events):
                obj_cls, severity = random.choice(classes)
                ts = now - timedelta(days=day_offset, hours=random.randint(0, 23), minutes=random.randint(0, 59))
                events.append(CVEvent(
                    unit_id=anchor_unit.id,
                    timestamp=ts,
                    object_class=obj_cls,
                    confidence=round(random.uniform(0.72, 0.99), 3),
                    severity=severity,
                    camera_id=cat,
                    frame_metadata={"model": cat, "count": random.randint(1, 5)},
                ))

    # Animal CV events
    for u in units:
        sp = type_id_to_species.get(u.type_id, "bee")
        cls_list = ANIMAL_CLASSES.get(sp)
        if not cls_list:
            continue
        for day_offset in range(30):
            if random.random() < 0.6:
                obj_cls, severity = random.choice(cls_list)
                ts = now - timedelta(days=day_offset, hours=random.randint(8, 18))
                events.append(CVEvent(
                    unit_id=u.id,
                    timestamp=ts,
                    object_class=obj_cls,
                    confidence=round(random.uniform(0.70, 0.98), 3),
                    severity=severity,
                    camera_id=sp,
                    frame_metadata={"model": sp},
                ))

    db.add_all(events)
    db.flush()
    print(f"[CV_EVENTS] Seeded {len(events)} CV events.")

def seed_anomalies_alerts(db: Session, units, atypes):
    type_id_to_species = {v.id: k for k, v in atypes.items()}
    anomalies, alerts, recs = [], [], []
    now = datetime.utcnow()

    ANOMALY_TEMPLATES = {
        "bee":     [("heat_stress", "Température > 38°C détectée dans la ruche", "critical", 0.87),
                    ("low_weight", "Poids de ruche anormalement bas", "warning", 0.72),
                    ("swarm_risk", "Activité sonore élevée — risque d'essaimage", "warning", 0.65)],
        "cow":     [("fever", "Température corporelle élevée (39.8°C)", "critical", 0.91),
                    ("low_milk", "Production laitière en chute de 30%", "warning", 0.78)],
        "poultry": [("high_nh3", "Taux NH3 > 20ppm — ventilation insuffisante", "critical", 0.88),
                    ("mortality", "Taux de mortalité anormal > 2%", "critical", 0.92)],
        "sheep":   [("lameness", "Boiterie détectée par vision", "warning", 0.75)],
        "goat":    [("low_milk", "Baisse production laitière", "warning", 0.68)],
        "rabbit":  [("heat_stress", "Température > 25°C — stress thermique lapins", "warning", 0.71)],
    }
    REC_TEMPLATES = {
        "heat_stress":  ("Stress thermique détecté",    "Installer ombrage supplémentaire et assurer accès à l'eau fraîche immédiatement.",         "high"),
        "low_weight":   ("Poids anormal",               "Vérifier disponibilité des ressources florales et traiter contre varroa si nécessaire.",   "medium"),
        "swarm_risk":   ("Risque d'essaimage",          "Inspecter la ruche dans les 48h, ajouter une hausse si remplie à 80%+.",                    "high"),
        "fever":        ("Fièvre bovine",               "Isoler l'animal et contacter le vétérinaire Dr. Leila Trabelsi (+216 98 000 003).",         "critical"),
        "low_milk":     ("Baisse production",           "Analyser la ration alimentaire et vérifier stress thermique ou pathologie mammaire.",       "medium"),
        "high_nh3":     ("Pollution NH3",               "Augmenter débit ventilation et nettoyer litière. Intervenir sous 4h.",                     "critical"),
        "mortality":    ("Mortalité élevée",            "Audit sanitaire immédiat, prélèvements pour analyse grippeaviaire, alerter la DGAV.",       "critical"),
        "lameness":     ("Boiterie ovine",              "Examen podal et parage des sabots. Traitement antibiotique si infection confirmée.",        "medium"),
    }

    for u in units:
        sp = type_id_to_species.get(u.type_id, "bee")
        templates = ANOMALY_TEMPLATES.get(sp, [])
        for tmpl in templates:
            atype, desc, sev, score = tmpl
            n = random.randint(1, 4)
            for j in range(n):
                ts = now - timedelta(days=random.randint(0, 14), hours=random.randint(0, 23))
                a = Anomaly(unit_id=u.id, timestamp=ts, anomaly_type=atype,
                            description=desc, severity=sev, isolation_score=score,
                            rules_triggered=[f"rule_{atype}"], is_acknowledged=(j > 1))
                anomalies.append(a)

                # Create matching alert for first occurrence
                if j == 0:
                    alrt = Alert(unit_id=u.id, timestamp=ts, alert_type=atype,
                                 message=f"[{u.name}] {desc}",
                                 severity=sev, is_resolved=(random.random() < 0.3))
                    alerts.append(alrt)

    db.add_all(anomalies)
    db.add_all(alerts)
    db.flush()

    # Recommendations for unresolved alerts
    for alrt in alerts:
        if not alrt.is_resolved:
            cause, rec_text, urgency = REC_TEMPLATES.get(alrt.alert_type, ("Cause inconnue", "Surveiller.", "medium"))
            recs.append(Recommendation(
                unit_id=alrt.unit_id,
                alert_id=alrt.id,
                probable_cause=cause,
                recommendation_text=rec_text,
                urgency_level=urgency,
                confidence_score=round(random.uniform(78, 97), 1),
            ))

    db.add_all(recs)
    db.flush()
    print(f"[ANOMALIES] {len(anomalies)} anomalies | [ALERTS] {len(alerts)} alerts | [RECS] {len(recs)} recommendations.")

def seed_gis(db: Session):
    vets = [
        Veterinary(name="Dr. Leila Trabelsi",    specialty="Bovins & Ovins", phone="+21698000003", email="l.trabelsi@clinique-sfax.tn", address="Rue Ibn Khaldoun, Sfax",        latitude=34.7398, longitude=10.7601, is_active=True),
        Veterinary(name="Dr. Ahmed Gharbi",      specialty="Apiculture",     phone="+21623456789", email="a.gharbi@vetbeja.tn",         address="Avenue Habib Bourguiba, Béja",  latitude=36.7260, longitude=9.1820,  is_active=True),
        Veterinary(name="Dr. Sonia Khelifi",     specialty="Volailles",      phone="+21671234567", email="s.khelifi@avivets.tn",        address="Zone Industrielle, Nabeul",     latitude=36.4520, longitude=10.7360, is_active=True),
        Veterinary(name="Dr. Mondher Ben Amor",  specialty="Généraliste",    phone="+21698111222", email="m.benamor@vetcenter.tn",      address="Cité Olympique, Tunis",         latitude=36.8320, longitude=10.1560, is_active=True),
        Veterinary(name="Dr. Faiza Oueslati",    specialty="Cuniculture",    phone="+21698222333", email="f.oueslati@vetbenarous.tn",   address="Ben Arous, Grand Tunis",        latitude=36.7530, longitude=10.2280, is_active=True),
    ]
    markets = [
        Market(name="Marché Apicole de Béja",          market_type="bee_market",  phone="+21698300001", address="Souk El Assel, Béja",           latitude=36.7270, longitude=9.1830,  is_active=True),
        Market(name="Coopérative Laitière Sousse",      market_type="feed_market", phone="+21698300002", address="Route de Tunis, Sousse",         latitude=35.9860, longitude=10.5160, is_active=True),
        Market(name="Marché de Bestiaux Sfax",          market_type="bee_market",  phone="+21698300003", address="Route Mharza, Sfax",             latitude=34.7410, longitude=10.7610, is_active=True),
        Market(name="Fournisseur Aliments Nabeul",      market_type="feed_market", phone="+21698300004", address="Zone Commerciale, Nabeul",       latitude=36.4530, longitude=10.7370, is_active=True),
        Market(name="Haddad Apiculture Tunis",          market_type="bee_market",  phone="+21698300005", address="Rue de la Liberté, Tunis",       latitude=36.8190, longitude=10.1690, is_active=True),
    ]
    db.add_all(vets + markets)
    db.flush()
    print(f"[GIS] {len(vets)} vets | {len(markets)} markets seeded.")

def main():
    print("=" * 60)
    print("  Smart Farm AI — Enterprise Seed")
    print("=" * 60)

    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # clear_db(db) # Commented out to prevent data loss of new accounts
        users   = seed_users(db)
        atypes  = seed_animal_types(db)
        farms   = seed_farms(db, users)
        units   = seed_units(db, farms, atypes)

        # Attach animal_type to units for metric generation
        type_map = {v.id: v for v in atypes.values()}
        for u in units:
            u.animal_type = type_map.get(u.type_id)

        seed_telemetry(db, units, atypes)
        seed_cv_events(db, units, atypes)
        seed_anomalies_alerts(db, units, atypes)
        seed_gis(db)

        db.commit()
        print("=" * 60)
        print("  ✓ Enterprise seed complete!")
        print(f"  Users:        admin/admin123 | manager1/manager123")
        print(f"  Farms:        {len(farms)}")
        print(f"  Animal Units: {len(units)}")
        print("=" * 60)
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        import traceback; traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
