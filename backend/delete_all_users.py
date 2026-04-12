import sqlite3
db = sqlite3.connect('smart_farm.db', timeout=30)
db.execute("DELETE FROM users")
db.commit()
n = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
print(f"✅ Tous les comptes supprimés. Utilisateurs restants: {n}")
db.close()
