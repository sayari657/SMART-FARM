import sqlite3

conn = sqlite3.connect('smart_farm.db')
c = conn.cursor()

def add_column(table, column, type):
    try:
        c.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type}")
        print(f"Added {column} to {table}")
    except sqlite3.OperationalError:
        print(f"Column {column} already exists in {table}")

# AnimalUnit updates
add_column("animal_units", "tag_id", "TEXT")
add_column("animal_units", "lifecycle_status", "TEXT DEFAULT 'production'")
add_column("animal_units", "entry_date", "DATETIME")

# WorkerTask updates
add_column("worker_tasks", "animal_id", "INTEGER")
add_column("worker_tasks", "category", "TEXT DEFAULT 'other'")

# Create AnimalLog
try:
    c.execute("""
    CREATE TABLE IF NOT EXISTS animal_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        value REAL,
        unit TEXT,
        notes TEXT,
        recorded_by INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animal_units (id)
    )
    """)
    print("Table animal_logs checked/created")
except Exception as e:
    print(f"Error creating animal_logs: {e}")

conn.commit()
conn.close()
