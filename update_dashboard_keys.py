import json

def update_file(file_path, data):
    with open(file_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    if "dashboard" not in existing:
        existing["dashboard"] = {}

    for key, value in data.items():
        existing["dashboard"][key] = value

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

fr_updates = {
    "sovereign_ai": "IA Souveraine (Darija Tunisien)",
    "local_mllm_active": "MLLM Local Actif",
    "analyzing_data": "Analyse des données en cours...",
    "derja_message": "Ya fellah, les ruches sont trop chaudes, 39 degrés. D'après le guide UTAP, il faut ombrager et donner de l'eau pour ne pas perdre le miel.",
    "sovereign_emergency_monitor": "Moniteur d'Urgence Souverain",
    "safety_protocol": "Protocole de Sécurité",
    "fire_risk_low": "Risque d'Incendie : FAIBLE",
    "scanner_desc": "Utilisez ce scanner pour vérifier les panaches de fumée ou signatures thermiques.",
    "recent_cv_detections": "Détections CV Récentes",
    "latest_cv_events": "Derniers événements de vision par ordinateur",
    "view_all": "Voir tout",
    "unit": "Unité",
    "class": "Classe",
    "confidence": "Confiance",
    "severity": "Sévérité",
    "no_cv_events": "Aucun événement CV",
    "iot_trend": "Tendance Télémesure IoT (En Temps Réel)",
    "iot_subtitle": "Données des capteurs de la Ferme Connectée (Actualisé toutes les 10s)",
    "node_a": "Nœud A — Local Pompe & Sol",
    "soil_humidity": "Humidité Sol",
    "too_dry": "Trop Sec",
    "normal": "Normal",
    "network_pressure": "Pression Réseau",
    "nominal": "Nominal",
    "current_flow": "Débit Actuel",
    "irrigation_ok": "Irrigation OK",
    "standby": "En Veille",
    "soil_temp": "Température Sol",
    "ideal_roots": "Idéal Racines",
    "node_b": "Nœud B — Rucher & Extérieur",
    "hive_weight": "Poids Ruche",
    "stable": "Stable",
    "brood_temp": "Temp Couvain",
    "deregulation": "Dérégulation",
    "optimal": "Optimal",
    "ext_temp": "Temp Extérieure",
    "local_weather": "Météo locale",
    "ext_hum": "Humidité Ext",
    "active_alerts_title": "Alertes Actives",
    "requiring_attention": "nécessitant une attention",
    "no_active_alerts": "Aucune alerte active",
    "all_clear": "Tout va bien — la santé de la ferme est optimale."
}

en_updates = {
    "sovereign_ai": "Sovereign AI (Tunisian Derja)",
    "local_mllm_active": "Local MLLM Active",
    "analyzing_data": "Analyzing data...",
    "derja_message": "Farmer, the beehives are too hot, reaching 39 degrees. According to the UTAP guide, you need to provide shade and water to avoid losing honey.",
    "sovereign_emergency_monitor": "Sovereign Emergency Monitor",
    "safety_protocol": "Safety Protocol",
    "fire_risk_low": "Fire Risk: LOW",
    "scanner_desc": "Use this scanner to verify smoke plumes or heat signatures across fields.",
    "recent_cv_detections": "Recent CV Detections",
    "latest_cv_events": "Latest computer vision events",
    "view_all": "View all",
    "unit": "Unit",
    "class": "Class",
    "confidence": "Confidence",
    "severity": "Severity",
    "no_cv_events": "No CV events yet",
    "iot_trend": "IoT Telemetry Trend (Real-time)",
    "iot_subtitle": "Connected Farm sensor data (Updated every 10s)",
    "node_a": "Node A — Pump & Soil Room",
    "soil_humidity": "Soil Humidity",
    "too_dry": "Too Dry",
    "normal": "Normal",
    "network_pressure": "Network Pressure",
    "nominal": "Nominal",
    "current_flow": "Current Flow",
    "irrigation_ok": "Irrigation OK",
    "standby": "Standby",
    "soil_temp": "Soil Temp",
    "ideal_roots": "Ideal for Roots",
    "node_b": "Node B — Apiary & Outdoor",
    "hive_weight": "Hive Weight",
    "stable": "Stable",
    "brood_temp": "Brood Temp",
    "deregulation": "Deregulation",
    "optimal": "Optimal",
    "ext_temp": "Outdoor Temp",
    "local_weather": "Local Weather",
    "ext_hum": "Outdoor Humidity",
    "active_alerts_title": "Active Alerts",
    "requiring_attention": "requiring attention",
    "no_active_alerts": "No active alerts",
    "all_clear": "All clear — farm health is nominal."
}

ar_updates = {
    "sovereign_ai": "الذكاء الاصطناعي السيادي (الدارجة التونسية)",
    "local_mllm_active": "نموذج محلي نشط",
    "analyzing_data": "جاري تحليل البيانات...",
    "derja_message": "يا فلاح، البيوت متاع النحل سخنت برشة، وصلت لـ 39 درجة. حسب دليل تربية النحل في تونس، لازمك تظلل عليهم وتوفر الماء باش ما تخسرش العسل.",
    "sovereign_emergency_monitor": "مراقب الطوارئ السيادي",
    "safety_protocol": "بروتوكول السلامة",
    "fire_risk_low": "خطر الحريق: منخفض",
    "scanner_desc": "استخدم هذا الماسح للتحقق من أعمدة الدخان أو البصمات الحرارية في الحقول.",
    "recent_cv_detections": "اكتشافات الرؤية الحاسوبية الأخيرة",
    "latest_cv_events": "أحدث أحداث الرؤية الحاسوبية",
    "view_all": "عرض الكل",
    "unit": "الوحدة",
    "class": "الفئة",
    "confidence": "الثقة",
    "severity": "الخطورة",
    "no_cv_events": "لا توجد أحداث بعد",
    "iot_trend": "اتجاه القياس عن بعد (الوقت الفعلي)",
    "iot_subtitle": "بيانات مستشعرات المزرعة المتصلة (تحديث كل 10 ثوانٍ)",
    "node_a": "العقدة أ — المضخة والتربة",
    "soil_humidity": "رطوبة التربة",
    "too_dry": "جاف جداً",
    "normal": "طبيعي",
    "network_pressure": "ضغط الشبكة",
    "nominal": "اسمي",
    "current_flow": "التدفق الحالي",
    "irrigation_ok": "الري جيد",
    "standby": "وضع الاستعداد",
    "soil_temp": "حرارة التربة",
    "ideal_roots": "مثالي للجذور",
    "node_b": "العقدة ب — المنحل والخارج",
    "hive_weight": "وزن الخلية",
    "stable": "مستقر",
    "brood_temp": "حرارة الحضنة",
    "deregulation": "اختلال",
    "optimal": "مثالي",
    "ext_temp": "الحرارة الخارجية",
    "local_weather": "الطقس المحلي",
    "ext_hum": "الرطوبة الخارجية",
    "active_alerts_title": "التنبيهات النشطة",
    "requiring_attention": "تتطلب الانتباه",
    "no_active_alerts": "لا توجد تنبيهات نشطة",
    "all_clear": "كل شيء على ما يرام — صحة المزرعة ممتازة."
}

update_file('frontend/src/locales/fr.json', fr_updates)
update_file('frontend/src/locales/en.json', en_updates)
update_file('frontend/src/locales/ar.json', ar_updates)

print("Dashboard keys added.")
