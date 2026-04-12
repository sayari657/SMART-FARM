"""Clean and re-seed the users table with a single clean admin account."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sqlite3
import bcrypt

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

db = sqlite3.connect('smart_farm.db', timeout=15)
cursor = db.cursor()

# 1. Delete ALL users
cursor.execute("DELETE FROM users")
print("\U0001f5d1\ufe0f  All old users deleted.")

# 2. Insert the single clean admin account (your real credentials)
cursor.execute("""
    INSERT INTO users (username, email, phone_number, full_name, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
""", (
    'med9',
    'medsayari2001@gmail.com',
    '+21621952358',
    'Mohamed Sayari',
    hash_password('password123'),
    'admin',
    1
))

print("\u2705 Admin account created:")
print("   Username  : med9")
print("   Email     : medsayari2001@gmail.com")
print("   Phone     : +21621952358")
print("   Password  : password123")

db.commit()
db.close()
print("\n\U0001f389 Database is clean and ready!")
