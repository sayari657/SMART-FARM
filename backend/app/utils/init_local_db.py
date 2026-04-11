import sqlite3
import json
import os
from datetime import datetime

DB_PATH = 'smart_farm.db'

SPECIES_DATA = [
    ('bee', 'Honey Bee (Apis mellifera)', '{"temperature":"°C","humidity":"%","hive_weight":"kg","sound_level":"dB"}'),
    ('cow', 'Dairy Cow', '{"body_temperature":"°C","activity":"steps/h","rumination":"min/h","milk_yield":"L/day"}'),
    ('poultry', 'Poultry House', '{"coop_temperature":"°C","humidity":"%","ammonia":"ppm","sound_level":"dB","bird_count":"count"}'),
    ('sheep', 'Sheep Group', '{"body_temperature":"°C","activity":"steps/h","respiratory_rate":"breaths/min"}'),
    ('goat', 'Goat Group', '{"body_temperature":"°C","activity":"steps/h","milk_yield":"L/day"}'),
    ('rabbit', 'Rabbitry', '{"nest_temperature":"°C","humidity":"%","feed_consumption":"g/day","activity":"index"}')
]

def init_db():
    print(f"Initializing Local SQLite Database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # The tables should already be created by FastAPI/SQLAlchemy startup,
    # but we ensure animal_types are seeded.
    for species, name, schema in SPECIES_DATA:
        cursor.execute('''
            INSERT OR IGNORE INTO animal_types (species, display_name, telemetry_schema, created_at)
            VALUES (?, ?, ?, ?)
        ''', (species, name, schema, datetime.now().isoformat()))

    conn.commit()
    conn.close()
    print("Local database initialization complete.")

if __name__ == "__main__":
    init_db()
