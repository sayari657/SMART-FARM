import sqlite3
import os

def clean(db_path):
    if not os.path.exists(db_path):
        return
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("DELETE FROM farms WHERE name='Smart Bee Farm Alpha' AND id NOT IN (SELECT MIN(id) FROM farms WHERE name='Smart Bee Farm Alpha');")
    c.execute("DELETE FROM animal_units WHERE identifier='IOT-BEE-001' AND id NOT IN (SELECT MIN(id) FROM animal_units WHERE identifier='IOT-BEE-001');")
    conn.commit()
    conn.close()

clean('backend/smart_farm.db')
clean('smart_farm.db')
print("Duplicates cleaned!")
