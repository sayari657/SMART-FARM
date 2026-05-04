import json

def update_file(file_path, data):
    with open(file_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    if "farms" not in existing:
        existing["farms"] = {}
    if "common" not in existing:
        existing["common"] = {}

    for key, value in data["farms"].items():
        existing["farms"][key] = value
        
    for key, value in data["common"].items():
        existing["common"][key] = value

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

fr_updates = {
    "farms": {
        "location_not_found": "Emplacement introuvable via Nominatim.",
        "geocoding_failed": "Le géocodage a échoué.",
        "error_location": "Erreur lors de l'obtention de la position : ",
        "geolocation_unsupported": "La géolocalisation n'est pas supportée par votre navigateur.",
        "reverse_geocode_failed": "Le géocodage inversé n'a pas trouvé d'adresse.",
        "reverse_geocode_error": "Le géocodage inversé a échoué.",
        "name_placeholder": "ex: Ferme Oasis",
        "locating": "Localisation...",
        "get_gps": "Obtenir GPS (Nominatim)",
        "city_country": "Ville, Pays",
        "latitude": "Latitude",
        "my_location": "🎯 Ma Position",
        "longitude": "Longitude",
        "generate_address": "Générer l'adresse (Inversé)",
        "total_area": "Superficie Totale (ha)",
        "inactive": "Inactif",
        "delete_confirm": "Êtes-vous sûr de vouloir supprimer la ferme"
    },
    "common": {
        "description": "Description",
        "description_placeholder": "Brève description...",
        "saving": "Enregistrement…",
        "are_you_sure": "Êtes-vous sûr ?",
        "no": "Non",
        "yes_delete": "Oui, supprimer",
        "delete_error": "Erreur lors de la suppression."
    }
}

en_updates = {
    "farms": {
        "location_not_found": "Location not found via Nominatim.",
        "geocoding_failed": "Geocoding failed.",
        "error_location": "Error getting location: ",
        "geolocation_unsupported": "Geolocation is not supported by your browser.",
        "reverse_geocode_failed": "Reverse Geocoding failed to find an address.",
        "reverse_geocode_error": "Reverse Geocoding failed.",
        "name_placeholder": "e.g. Oasis Farm",
        "locating": "Locating...",
        "get_gps": "Get GPS (Nominatim)",
        "city_country": "City, Country",
        "latitude": "Latitude",
        "my_location": "🎯 My Location",
        "longitude": "Longitude",
        "generate_address": "Generate Address (Reverse)",
        "total_area": "Total Area (ha)",
        "inactive": "Inactive",
        "delete_confirm": "Are you sure you want to delete the farm"
    },
    "common": {
        "description": "Description",
        "description_placeholder": "Brief description...",
        "saving": "Saving…",
        "are_you_sure": "Are you sure?",
        "no": "No",
        "yes_delete": "Yes, delete",
        "delete_error": "Error during deletion."
    }
}

ar_updates = {
    "farms": {
        "location_not_found": "لم يتم العثور على الموقع عبر Nominatim.",
        "geocoding_failed": "فشل تحديد الموقع.",
        "error_location": "خطأ في الحصول على الموقع: ",
        "geolocation_unsupported": "تحديد الموقع الجغرافي غير مدعوم في متصفحك.",
        "reverse_geocode_failed": "فشل تحديد الموقع العكسي في العثور على عنوان.",
        "reverse_geocode_error": "فشل تحديد الموقع العكسي.",
        "name_placeholder": "مثال: مزرعة الواحة",
        "locating": "جاري التحديد...",
        "get_gps": "الحصول على GPS (Nominatim)",
        "city_country": "المدينة، البلد",
        "latitude": "خط العرض",
        "my_location": "🎯 موقعي",
        "longitude": "خط الطول",
        "generate_address": "إنشاء عنوان (عكسي)",
        "total_area": "المساحة الإجمالية (هكتار)",
        "inactive": "غير نشط",
        "delete_confirm": "هل أنت متأكد أنك تريد حذف المزرعة"
    },
    "common": {
        "description": "الوصف",
        "description_placeholder": "وصف موجز...",
        "saving": "جاري الحفظ…",
        "are_you_sure": "هل أنت متأكد؟",
        "no": "لا",
        "yes_delete": "نعم، احذف",
        "delete_error": "خطأ أثناء الحذف."
    }
}

update_file('frontend/src/locales/fr.json', fr_updates)
update_file('frontend/src/locales/en.json', en_updates)
update_file('frontend/src/locales/ar.json', ar_updates)

print("Farms keys added.")
