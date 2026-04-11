import sqlite3
import os

db_path = "smart_farm.db"
if not os.path.exists(db_path):
    print(f"ERROR: Database file '{db_path}' not found at {os.getcwd()}")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Test 1: Fetch tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"✅ CONNECTION SUCCESS!")
        print(f"📦 Found {len(tables)} tables: {[t[0] for t in tables]}")
        
        # Test 2: Check Farm data
        cursor.execute("SELECT id, name FROM farms LIMIT 1;")
        farm = cursor.fetchone()
        if farm:
            print(f"🌾 Farm tested '{farm[1]}' loaded correctly (ID: {farm[0]})")
        
        conn.close()
    except Exception as e:
        print(f"❌ DATABASE ERROR: {str(e)}")
