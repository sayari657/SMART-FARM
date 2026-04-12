import sqlite3
db = sqlite3.connect('smart_farm.db', timeout=15)
print("=== USERS TABLE ===")
for r in db.execute("SELECT id, username, email, phone_number FROM users").fetchall():
    print(r)
db.close()
