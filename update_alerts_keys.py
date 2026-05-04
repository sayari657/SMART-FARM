import json

def update_file(file_path, data):
    with open(file_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    if "alerts" not in existing:
        existing["alerts"] = {}
    if "common" not in existing:
        existing["common"] = {}

    for key, value in data["alerts"].items():
        existing["alerts"][key] = value
        
    for key, value in data["common"].items():
        existing["common"][key] = value

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

fr_updates = {
    "alerts": {
        "center_title": "Centre d'Alertes",
        "center_subtitle": "Surveiller et résoudre les alertes de la ferme",
        "active_alerts": "Alertes Actives",
        "critical_alerts": "Alertes Critiques",
        "warning_alerts": "Avertissements",
        "resolved_today": "Résolus Aujourd'hui",
        "global_weather": "Risques météorologiques globaux détectés",
        "heat_stress": "Stress Thermique",
        "heat_stress_desc": "implique des températures dangereuses pour le bétail.",
        "storm_warning": "Alerte Tempête/Vent",
        "storm_warning_desc": "implique un risque élevé pour les installations extérieures.",
        "cold_stress": "Alerte Stress Froid",
        "cold_stress_desc": "détectée pour les jeunes animaux.",
        "filter_active": "Actives",
        "filter_critical": "Critiques",
        "filter_resolved": "Résolues",
        "filter_all": "Toutes",
        "no_resolved": "Aucune alerte résolue",
        "no_active": "Aucune alerte active",
        "all_good": "Tout va bien !"
    },
    "common": {
        "system": "Système",
        "unit": "Unité"
    }
}

en_updates = {
    "alerts": {
        "center_title": "Alerts Center",
        "center_subtitle": "Monitor and resolve farm alerts",
        "active_alerts": "Active Alerts",
        "critical_alerts": "Critical Alerts",
        "warning_alerts": "Warning Alerts",
        "resolved_today": "Resolved Today",
        "global_weather": "Global Weather Hazards Detected",
        "heat_stress": "Heat Stress",
        "heat_stress_desc": "implies dangerous temperatures for livestock operations.",
        "storm_warning": "Storm/Wind Warning",
        "storm_warning_desc": "implies high risk for outdoor units.",
        "cold_stress": "Cold Stress Warning",
        "cold_stress_desc": "detected for young animals.",
        "filter_active": "Active",
        "filter_critical": "Critical",
        "filter_resolved": "Resolved",
        "filter_all": "All",
        "no_resolved": "No resolved alerts",
        "no_active": "No active alerts",
        "all_good": "Everything looks good!"
    },
    "common": {
        "system": "System",
        "unit": "Unit"
    }
}

ar_updates = {
    "alerts": {
        "center_title": "مركز التنبيهات",
        "center_subtitle": "مراقبة وحل تنبيهات المزرعة",
        "active_alerts": "تنبيهات نشطة",
        "critical_alerts": "تنبيهات حرجة",
        "warning_alerts": "تنبيهات تحذيرية",
        "resolved_today": "تم حلها اليوم",
        "global_weather": "تم اكتشاف مخاطر جوية عامة",
        "heat_stress": "إجهاد حراري",
        "heat_stress_desc": "يعني درجات حرارة خطيرة لعمليات الماشية.",
        "storm_warning": "تحذير عاصفة/رياح",
        "storm_warning_desc": "يعني خطراً كبيراً للوحدات الخارجية.",
        "cold_stress": "تحذير إجهاد برد",
        "cold_stress_desc": "تم اكتشافه للحيوانات الصغيرة.",
        "filter_active": "نشط",
        "filter_critical": "حرج",
        "filter_resolved": "محلول",
        "filter_all": "الكل",
        "no_resolved": "لا توجد تنبيهات محلولة",
        "no_active": "لا توجد تنبيهات نشطة",
        "all_good": "كل شيء يبدو جيداً!"
    },
    "common": {
        "system": "نظام",
        "unit": "وحدة"
    }
}

update_file('frontend/src/locales/fr.json', fr_updates)
update_file('frontend/src/locales/en.json', en_updates)
update_file('frontend/src/locales/ar.json', ar_updates)

print("Alerts keys added.")
