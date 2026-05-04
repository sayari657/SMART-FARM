import json

def update_file(file_path, data):
    with open(file_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    if "animals" not in existing:
        existing["animals"] = {}
    if "common" not in existing:
        existing["common"] = {}

    for key, value in data["animals"].items():
        existing["animals"][key] = value
        
    for key, value in data["common"].items():
        existing["common"][key] = value

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

fr_updates = {
    "animals": {
        "notes_placeholder": "État de santé, âge, etc.",
        "name_placeholder": "ex: Ruche 14A",
        "id_placeholder": "ex: SN-99A"
    },
    "common": {
        "clear": "Effacer",
        "notes": "Notes",
        "id": "ID"
    }
}

en_updates = {
    "animals": {
        "notes_placeholder": "Health status, age, etc.",
        "name_placeholder": "e.g. Hive 14A",
        "id_placeholder": "e.g. SN-99A"
    },
    "common": {
        "clear": "Clear",
        "notes": "Notes",
        "id": "ID"
    }
}

ar_updates = {
    "animals": {
        "notes_placeholder": "الحالة الصحية، العمر، إلخ.",
        "name_placeholder": "مثال: خلية 14أ",
        "id_placeholder": "مثال: SN-99A"
    },
    "common": {
        "clear": "مسح",
        "notes": "ملاحظات",
        "id": "الرقم التعريفي"
    }
}

update_file('frontend/src/locales/fr.json', fr_updates)
update_file('frontend/src/locales/en.json', en_updates)
update_file('frontend/src/locales/ar.json', ar_updates)

print("Animals keys added.")
