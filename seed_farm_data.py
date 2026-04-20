import sqlite3
import json
from datetime import datetime

# Database path
DB_PATH = 'smart_farm.db'

def hash_password_local(password: str) -> str:
    import bcrypt
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

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
    ''', ('bee', 'Honey Bee (Apis mellifera)', json.dumps(telemetry_schema), datetime.now().isoformat()))
    
    type_id = cursor.execute('SELECT id FROM animal_types WHERE species="bee"').fetchone()[0]

    # 2. Create a Farm if missing
    res = cursor.execute('SELECT id FROM farms WHERE name="Smart Bee Farm Alpha"').fetchone()
    if res:
        farm_id = res[0]
    else:
        cursor.execute('''
            INSERT INTO farms (name, status, latitude, longitude, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', ('Smart Bee Farm Alpha', 'active', 36.8065, 10.1815, datetime.now().isoformat()))
        farm_id = cursor.lastrowid

    # 3. Create a Bee Unit (Hive)
    res_unit = cursor.execute('SELECT id FROM animal_units WHERE identifier="IOT-BEE-001"').fetchone()
    if res_unit:
        unit_id = res_unit[0]
    else:
        cursor.execute('''
            INSERT INTO animal_units (farm_id, type_id, name, identifier, health_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (farm_id, type_id, 'HIVE_01', 'IOT-BEE-001', 94.5, datetime.now().isoformat()))
        unit_id = cursor.lastrowid


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
    ''', (unit_id, json.dumps(metrics), datetime.now().isoformat(), 'sensor_hub'))

    # 5. Ensure persistent user 'MED' exists with forced password reset
    res_user = cursor.execute('SELECT id FROM users WHERE username="MED"').fetchone()
    pwd_hash = hash_password_local('password')
    if not res_user:
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, role, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('MED', 'med@smartfarm.ai', pwd_hash, 'admin', 1, datetime.now().isoformat()))
        print("[AUTH] Created user 'MED' with password 'password'")
    else:
        cursor.execute('UPDATE users SET password_hash = ? WHERE username = "MED"', (pwd_hash,))
        print("[AUTH] Reset password for existing user 'MED' to 'password'")

    conn.commit()
    print(f"Successfully seeded database with Bee Unit (ID: {unit_id}) and real telemetry.")
    conn.close()

if __name__ == "__main__":
    seed()
