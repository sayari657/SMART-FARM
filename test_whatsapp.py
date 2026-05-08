import requests

# Token complet depuis le curl qui a FONCTIONNE
TOKEN    = "EAAOHtmh2CWkBRaE9oEB8UiRIWHZC34isdMKMgHUGZAECDXePdtH2dUH25MXvusBFY3KZBS8Ch5deoP0Es5t9ZBMJS94irbqb5wEJZCJce6KAr6mCeZB59Aw0U3ZA79I3GRvel54Kwa5o9FZBCzp1slJmkovx4T7I0JTaCkVRRM1anxev4f2oLxmfZBlSAwltGaWE4xdOg4VhUFI0XSnwc3rzh34a4PBgTwrbZCrozvCEy9TZBgvLoby5bAv8v0ciZCHLaSjvANc4b9qfLqyAS1uqEzpZB"
PHONE_ID = "1083347151531320"
TO       = "+21621952358"

print(f"Token length: {len(TOKEN)}")

url = f"https://graph.facebook.com/v25.0/{PHONE_ID}/messages"
headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# Test hello_world
print("Sending hello_world template...")
r = requests.post(url, headers=headers, json={
    "messaging_product": "whatsapp",
    "to": TO,
    "type": "template",
    "template": {"name": "hello_world", "language": {"code": "en_US"}}
}, timeout=30)

print(f"Status: {r.status_code}")
print(f"Response: {r.json()}")

if r.status_code in (200, 201):
    print("SUCCESS! Sending OTP text now...")
    r2 = requests.post(url, headers=headers, json={
        "messaging_product": "whatsapp",
        "to": TO,
        "type": "text",
        "text": {"body": "Smart Farm AI - Test OTP: 123456 - Valide 10 min"}
    }, timeout=30)
    print(f"OTP text status: {r2.status_code}")
    print(f"OTP text response: {r2.json()}")
