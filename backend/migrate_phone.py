"""One-time migration: add phone_number column to users table."""
import sqlite3, os

db_path = "smart_farm.db"
conn = sqlite3.connect(db_path, timeout=10)
cursor = conn.cursor()

# Check if column already exists
cols = [row[1] for row in cursor.execute("PRAGMA table_info(users)").fetchall()]
if "phone_number" in cols:
    print("✅ Column 'phone_number' already exists — nothing to do.")
else:
    cursor.execute("ALTER TABLE users ADD COLUMN phone_number VARCHAR(20)")
    conn.commit()
    print("✅ Migration successful: 'phone_number' column added to users table.")

# Also update med9 with a test phone number for demo
cursor.execute("UPDATE users SET phone_number='+21655000001' WHERE username='med9'")
conn.commit()
print("📱 Demo phone number set for 'med9': +21655000001")

conn.close()
