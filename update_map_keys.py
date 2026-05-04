import json

def update_file(file_path, data):
    with open(file_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    if "map_center" not in existing:
        existing["map_center"] = {}

    for key, value in data.items():
        existing["map_center"][key] = value

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

fr_updates = {
    "all": "Tout",
    "hives": "Ruches",
    "vets": "Vétérinaires",
    "farms": "Fermes",
    "markets": "Marchés",
    "search_placeholder": "Rechercher villes, fermes...",
    "results": "Résultats",
    "radius_100km": "rayon 100 km",
    "exploration": "Exploration…",
    "no_results": "Aucun résultat dans ce rayon",
    "selected_hive": "Ruche sélectionnée",
    "vet_clinic": "Clinique vétérinaire",
    "farm": "Ferme",
    "website": "Site web",
    "weight": "Poids",
    "temp": "Temp",
    "humidity": "Humidité",
    "detecting": "Détection...",
    "locate": "Localiser",
    "loading_map": "Chargement de la carte…"
}

en_updates = {
    "all": "All",
    "hives": "Hives",
    "vets": "Veterinarians",
    "farms": "Farms",
    "markets": "Markets",
    "search_placeholder": "Search cities, farms...",
    "results": "Results",
    "radius_100km": "100 km radius",
    "exploration": "Exploring…",
    "no_results": "No results in this radius",
    "selected_hive": "Selected hive",
    "vet_clinic": "Veterinary clinic",
    "farm": "Farm",
    "website": "Website",
    "weight": "Weight",
    "temp": "Temp",
    "humidity": "Humidity",
    "detecting": "Detecting...",
    "locate": "Locate",
    "loading_map": "Loading map…"
}

ar_updates = {
    "all": "الكل",
    "hives": "خلايا النحل",
    "vets": "بيطريون",
    "farms": "مزارع",
    "markets": "أسواق",
    "search_placeholder": "ابحث عن مدن، مزارع...",
    "results": "النتائج",
    "radius_100km": "في محيط 100 كم",
    "exploration": "جاري الاستكشاف…",
    "no_results": "لا توجد نتائج في هذا المحيط",
    "selected_hive": "الخلية المحددة",
    "vet_clinic": "عيادة بيطرية",
    "farm": "مزرعة",
    "website": "الموقع الإلكتروني",
    "weight": "الوزن",
    "temp": "الحرارة",
    "humidity": "الرطوبة",
    "detecting": "جاري التحديد...",
    "locate": "تحديد الموقع",
    "loading_map": "جاري تحميل الخريطة…"
}

update_file('frontend/src/locales/fr.json', fr_updates)
update_file('frontend/src/locales/en.json', en_updates)
update_file('frontend/src/locales/ar.json', ar_updates)

print("Map keys added.")
