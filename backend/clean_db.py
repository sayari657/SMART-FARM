import sqlite3

conn = sqlite3.connect('smart_farm.db')
c = conn.cursor()

c.execute("DELETE FROM bee_hives")
conn.commit()
print("All fake bee_hives deleted.")
