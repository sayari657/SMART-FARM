import sqlite3
import json
from datetime import datetime

# Database path
DB_PATH = 'backend/smart_farm.db'

def seed():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Create Bee Animal Type
    telemetry_schema = {
        "temperature": "float",
        "humidity": "float",
        "ventilation": "string",
        "fan_speed": "integer",
        "pollen_rate": "float",
        "days_to_harvest": "integer",
        "honey_yield": "float"
    }
    
    cursor.execute('''
        INSERT OR IGNORE INTO animal_types (species, display_name, telemetry_schema, created_at)
        VALUES (?, ?, ?, ?)
    ''', ('bee', 'Honey Bee (Apis mellifera)', json.dumps(telemetry_schema), datetime.utcnow()))
    
    type_id = cursor.execute('SELECT id FROM animal_types WHERE species="bee"').fetchone()[0]

    # 2. Create a Farm if missing
    cursor.execute('''
        INSERT OR IGNORE INTO farms (name, status, created_at)
        VALUES (?, ?, ?)
    ''', ('Smart Bee Farm Alpha', 'active', datetime.utcnow()))
    farm_id = cursor.execute('SELECT id FROM farms LIMIT 1').fetchone()[0] if farm_id is None else 1

    # 3. Create a Bee Unit (Hive)
    cursor.execute('''
        INSERT OR IGNORE INTO animal_units (farm_id, type_id, name, identifier, health_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (farm_id, type_id, 'HIVE_01', 'IOT-BEE-001', 94.5, datetime.utcnow()))
    
    unit_id = cursor.execute('SELECT id FROM animal_units WHERE name="HIVE_01"').fetchone()[0]

    # 4. Create Real Telemetry for the Hive
    metrics = {
        "temperature": 34.8,
        "humidity": 61.2,
        "ventilation": "Optimal",
        "fan_speed": 48,
        "pollen_rate": 9.4,
        "days_to_harvest": 11,
        "honey_yield": 16.2,
        "noise": "Nominal",
        "activity_index": 92
    }
    
    cursor.execute('''
        INSERT INTO telemetry_records (unit_id, metrics, timestamp, source)
        VALUES (?, ?, ?, ?)
    ''', (unit_id, json.dumps(metrics), datetime.utcnow(), 'sensor_hub'))

    conn.commit()
    print(f"Successfully seeded database with Bee Unit (ID: {unit_id}) and real telemetry.")
    conn.close()

if __name__ == "__main__":
    seed()
