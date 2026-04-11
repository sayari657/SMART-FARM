import sqlite3
db = sqlite3.connect('smart_farm.db', timeout=15)
db.execute("UPDATE users SET phone_number='+21621952358' WHERE username='med9'")
db.commit()
r = db.execute("SELECT username, phone_number FROM users WHERE username='med9'").fetchone()
print('✅ Updated:', r)
db.close()
