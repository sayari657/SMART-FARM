import sqlite3
import os

db_path = "smart_farm.db"

if not os.path.exists(db_path):
    print(f"Error: {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- List of Tables ---")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    for table in tables:
        print(f"Table: {table[0]}")
        
    print("\n--- Schema for diagnostic_history ---")
    try:
        cursor.execute("PRAGMA table_info(diagnostic_history);")
        columns = cursor.fetchall()
        for col in columns:
            print(f"ID: {col[0]}, Name: {col[1]}, Type: {col[2]}, NotNull: {col[3]}, Default: {col[4]}, PK: {col[5]}")
    except Exception as e:
        print(f"Error reading diagnostic_history: {e}")
        
    conn.close()
