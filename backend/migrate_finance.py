import sqlite3

conn = sqlite3.connect('smart_farm.db')
c = conn.cursor()

try:
    c.execute("""
    CREATE TABLE IF NOT EXISTS farm_finances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farm_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        notes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farm_id) REFERENCES farms (id)
    )
    """)
    print("Table farm_finances created")
except Exception as e:
    print(f"Error: {e}")

conn.commit()
conn.close()
