import json

def update_file(file_path, data):
    with open(file_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    if "telemetry" not in existing:
        existing["telemetry"] = {}

    for key, value in data.items():
        existing["telemetry"][key] = value

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

fr_updates = {
    "page_title": "Télémétrie IoT",
    "page_subtitle": "Supervision temps réel — Wokwi ESP32 · Noeuds A & B",
    "connecting": "Connexion...",
    "connected": "Serveur IoT connecté",
    "offline": "Backend IoT hors-ligne (démonstration)",
    "updated": "Màj",
    "refresh": "Actualiser",
    "node_a_title": "Node A — Irrigation",
    "node_b_title": "Node B — Ruche Connectée",
    "pump": "Pompe",
    "valve": "Vanne",
    "fault": "Défaut",
    "soil_humidity": "Humidité Sol",
    "pressure": "Pression",
    "flow": "Débit",
    "soil_temp": "Temp Sol",
    "temp_ok": "Température OK",
    "hum_ok": "Humidité OK",
    "hive_weight": "Poids Ruche",
    "internal_temp": "Temp Interne",
    "external_temp": "Temp Externe",
    "external_hum": "Humidité Ext",
    "live_history": "Historique live",
    "pts": "pts",
    "waiting_wokwi": "En attente des données Wokwi…",
    "wokwi_sim": "Simulation Wokwi :",
    "wokwi_desc": "ouvrez iot/node_a_pompe et iot/node_b_rucher dans VS Code avec l'extension Wokwi.",
    "unit_select": "Unité :",
    "internal_iot": "IoT interne",
    "external_meteo": "Open-Meteo extérieur",
    "abnormal_gap": "Écart anormal détecté",
    "real_time": "Temps réel",
    "history_200": "Historique 200 derniers relevés",
    "records": "enregistrements",
    "data_table": "Tableau de données",
    "timestamp": "Horodatage",
    "tab_iot": "📡 Noeuds IoT",
    "tab_iot_sub": "Node A · Node B · Wokwi",
    "tab_units": "🐾 Analyse Unités",
    "tab_units_sub": "Capteurs par unité animale"
}

en_updates = {
    "page_title": "IoT Telemetry",
    "page_subtitle": "Real-time supervision — Wokwi ESP32 · Nodes A & B",
    "connecting": "Connecting...",
    "connected": "IoT Server connected",
    "offline": "IoT Backend offline (demo)",
    "updated": "Upd",
    "refresh": "Refresh",
    "node_a_title": "Node A — Irrigation",
    "node_b_title": "Node B — Connected Hive",
    "pump": "Pump",
    "valve": "Valve",
    "fault": "Fault",
    "soil_humidity": "Soil Humidity",
    "pressure": "Pressure",
    "flow": "Flow",
    "soil_temp": "Soil Temp",
    "temp_ok": "Temp OK",
    "hum_ok": "Hum OK",
    "hive_weight": "Hive Weight",
    "internal_temp": "Internal Temp",
    "external_temp": "External Temp",
    "external_hum": "External Hum",
    "live_history": "Live History",
    "pts": "pts",
    "waiting_wokwi": "Waiting for Wokwi data…",
    "wokwi_sim": "Wokwi Simulation:",
    "wokwi_desc": "open iot/node_a_pump and iot/node_b_hive in VS Code with Wokwi extension.",
    "unit_select": "Unit:",
    "internal_iot": "Internal IoT",
    "external_meteo": "External Open-Meteo",
    "abnormal_gap": "Abnormal gap detected",
    "real_time": "Real time",
    "history_200": "History of last 200 readings",
    "records": "records",
    "data_table": "Data Table",
    "timestamp": "Timestamp",
    "tab_iot": "📡 IoT Nodes",
    "tab_iot_sub": "Node A · Node B · Wokwi",
    "tab_units": "🐾 Units Analysis",
    "tab_units_sub": "Sensors per animal unit"
}

ar_updates = {
    "page_title": "قياس إنترنت الأشياء",
    "page_subtitle": "إشراف في الوقت الحقيقي — Wokwi ESP32 · العقد أ و ب",
    "connecting": "جاري الاتصال...",
    "connected": "خادم إنترنت الأشياء متصل",
    "offline": "خادم إنترنت الأشياء غير متصل (نسخة تجريبية)",
    "updated": "تحديث",
    "refresh": "تحديث",
    "node_a_title": "العقدة أ — الري",
    "node_b_title": "العقدة ب — خلية متصلة",
    "pump": "مضخة",
    "valve": "صمام",
    "fault": "خطأ",
    "soil_humidity": "رطوبة التربة",
    "pressure": "ضغط",
    "flow": "تدفق",
    "soil_temp": "حرارة التربة",
    "temp_ok": "الحرارة جيدة",
    "hum_ok": "الرطوبة جيدة",
    "hive_weight": "وزن الخلية",
    "internal_temp": "حرارة داخلية",
    "external_temp": "حرارة خارجية",
    "external_hum": "رطوبة خارجية",
    "live_history": "تاريخ مباشر",
    "pts": "نقاط",
    "waiting_wokwi": "في انتظار بيانات Wokwi…",
    "wokwi_sim": "محاكاة Wokwi:",
    "wokwi_desc": "افتح iot/node_a_pompe و iot/node_b_rucher في VS Code مع إضافة Wokwi.",
    "unit_select": "الوحدة:",
    "internal_iot": "إنترنت الأشياء الداخلي",
    "external_meteo": "Open-Meteo الخارجي",
    "abnormal_gap": "تم اكتشاف فجوة غير طبيعية",
    "real_time": "الوقت الحقيقي",
    "history_200": "تاريخ آخر 200 قراءة",
    "records": "سجلات",
    "data_table": "جدول البيانات",
    "timestamp": "الطابع الزمني",
    "tab_iot": "📡 عقد إنترنت الأشياء",
    "tab_iot_sub": "العقدة أ · العقدة ب · Wokwi",
    "tab_units": "🐾 تحليل الوحدات",
    "tab_units_sub": "مستشعرات لكل وحدة حيوانية"
}

update_file('frontend/src/locales/fr.json', fr_updates)
update_file('frontend/src/locales/en.json', en_updates)
update_file('frontend/src/locales/ar.json', ar_updates)

print("Telemetry keys added.")
