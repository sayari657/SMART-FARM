import json

def update_file(file_path, data):
    with open(file_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    for key, value in data.items():
        existing[key] = value

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

fr_updates = {
  "reports_page": {
    "title": "Centre de Rapports Stratégiques",
    "subtitle": "Analyse souveraine multi-tenant · Smart Farm v3.0",
    "live_report": "Rapport Live",
    "archives": "Archives",
    "ai_ollama": "Intelligence Artificielle (Ollama)",
    "strategic_reports_based_on": "Rapports stratégiques basés sur les données du",
    "animal_report": "Rapport Animaux",
    "plant_report": "Rapport Plantes",
    "global_ai_report": "Rapport Global IA",
    "download_pdf": "Télécharger PDF",
    "integrated_report_title": "Rapport Intégré de l'Exploitation",
    "integrated_report_subtitle": "Génération en temps réel basée sur les capteurs IoT et l'Intelligence Souveraine",
    "system_operational": "Système Opérationnel",
    "global_health_score": "Score de Santé Global",
    "vs_last_week": "vs semaine dernière",
    "animal_biomass": "Biomasse Animale",
    "units": "Unités",
    "gps_tracking_active": "Suivi GPS actif",
    "plant_crops": "Cultures Végétales",
    "species": "Espèces",
    "optimized_irrigation": "Irrigation optimisée",
    "critical_alerts": "Alertes Critiques",
    "action_required": "Action requise",
    "system_stable": "Système stable",
    "zootechnical_report": "Rapport Zootechnique",
    "zootechnical_desc": "L'analyse biométrique montre une croissance stable. Le cycle de pâturage est optimisé selon la disponibilité fourragère actuelle.",
    "reproduction_rate": "Taux de reproduction",
    "water_consumption": "Consommation eau / jour",
    "vaccination_up_to_date": "Vaccination à jour",
    "download_detailed_pdf": "Télécharger PDF Détaillé",
    "agronomic_report": "Rapport Agronomique",
    "agronomic_desc": "Indice NDVI en hausse sur le secteur Nord. La maturité des olives est estimée à 75%. Récolte prévue dans 3 semaines.",
    "water_stress": "Stress hydrique",
    "estimated_yield": "Rendement estimé",
    "fertilizer_usage": "Usage engrais",
    "soil_yield_analysis": "Analyse Sols & Rendement",
    "safety_infrastructure": "Sûreté & Infrastructure",
    "perimeter_integrity": "Intégrité de la périphérie sécurisée par IA",
    "virtual_barrier_ok": "Barrière Virtuelle OK",
    "active_iot_sensors": "Capteurs IoT Actifs",
    "thermal_cameras_on": "Caméras Thermal ON",
    "last_anomaly_analysis": "Dernière analyse d'anomalie :",
    "none": "Nulle",
    "generated_reports_history": "Historique des Rapports Générés",
    "no_archived_reports": "Aucun rapport archivé",
    "report_title": "Titre du Rapport",
    "type": "Type",
    "period": "Période",
    "avg_score": "Score Moyen",
    "action": "Action",
    "strategic_ai_analysis": "Analyse IA Stratégique :"
  },
  "map_center": {
    "title": "Centre Cartographique",
    "subtitle": "Vue satellite et topologique de l'exploitation",
    "layers": "Couches de données",
    "zones": "Zones de la ferme",
    "sensors_map": "Carte des capteurs"
  },
  "login": {
    "welcome": "Bienvenue",
    "email": "Adresse Email",
    "password": "Mot de passe",
    "sign_in": "Se connecter",
    "forgot_password": "Mot de passe oublié ?"
  },
  "alerts_center": {
    "title": "Centre d'Alertes",
    "subtitle": "Gestion centralisée des événements critiques",
    "all_alerts": "Toutes les alertes",
    "resolved": "Résolues",
    "pending": "En attente"
  }
}

en_updates = {
  "reports_page": {
    "title": "Strategic Reports Center",
    "subtitle": "Multi-tenant sovereign analysis · Smart Farm v3.0",
    "live_report": "Live Report",
    "archives": "Archives",
    "ai_ollama": "Artificial Intelligence (Ollama)",
    "strategic_reports_based_on": "Strategic reports based on data from",
    "animal_report": "Animal Report",
    "plant_report": "Plant Report",
    "global_ai_report": "Global AI Report",
    "download_pdf": "Download PDF",
    "integrated_report_title": "Integrated Farm Report",
    "integrated_report_subtitle": "Real-time generation based on IoT sensors and Sovereign Intelligence",
    "system_operational": "System Operational",
    "global_health_score": "Global Health Score",
    "vs_last_week": "vs last week",
    "animal_biomass": "Animal Biomass",
    "units": "Units",
    "gps_tracking_active": "GPS tracking active",
    "plant_crops": "Plant Crops",
    "species": "Species",
    "optimized_irrigation": "Optimized irrigation",
    "critical_alerts": "Critical Alerts",
    "action_required": "Action required",
    "system_stable": "System stable",
    "zootechnical_report": "Zootechnical Report",
    "zootechnical_desc": "Biometric analysis shows stable growth. The grazing cycle is optimized according to current forage availability.",
    "reproduction_rate": "Reproduction rate",
    "water_consumption": "Water consumption / day",
    "vaccination_up_to_date": "Vaccination up to date",
    "download_detailed_pdf": "Download Detailed PDF",
    "agronomic_report": "Agronomic Report",
    "agronomic_desc": "NDVI index rising in the North sector. Olive maturity estimated at 75%. Harvest expected in 3 weeks.",
    "water_stress": "Water stress",
    "estimated_yield": "Estimated yield",
    "fertilizer_usage": "Fertilizer usage",
    "soil_yield_analysis": "Soil & Yield Analysis",
    "safety_infrastructure": "Safety & Infrastructure",
    "perimeter_integrity": "Perimeter integrity secured by AI",
    "virtual_barrier_ok": "Virtual Barrier OK",
    "active_iot_sensors": "Active IoT Sensors",
    "thermal_cameras_on": "Thermal Cameras ON",
    "last_anomaly_analysis": "Last anomaly analysis:",
    "none": "None",
    "generated_reports_history": "Generated Reports History",
    "no_archived_reports": "No archived reports",
    "report_title": "Report Title",
    "type": "Type",
    "period": "Period",
    "avg_score": "Avg Score",
    "action": "Action",
    "strategic_ai_analysis": "Strategic AI Analysis:"
  },
  "map_center": {
    "title": "Map Center",
    "subtitle": "Satellite and topological view of the farm",
    "layers": "Data layers",
    "zones": "Farm Zones",
    "sensors_map": "Sensors map"
  },
  "login": {
    "welcome": "Welcome",
    "email": "Email Address",
    "password": "Password",
    "sign_in": "Sign In",
    "forgot_password": "Forgot password?"
  },
  "alerts_center": {
    "title": "Alerts Center",
    "subtitle": "Centralized management of critical events",
    "all_alerts": "All Alerts",
    "resolved": "Resolved",
    "pending": "Pending"
  }
}

ar_updates = {
  "reports_page": {
    "title": "مركز التقارير الاستراتيجية",
    "subtitle": "تحليل سيادي متعدد المستأجرين · Smart Farm v3.0",
    "live_report": "تقرير مباشر",
    "archives": "الأرشيف",
    "ai_ollama": "الذكاء الاصطناعي (Ollama)",
    "strategic_reports_based_on": "تقارير استراتيجية مبنية على بيانات من",
    "animal_report": "تقرير الحيوانات",
    "plant_report": "تقرير النباتات",
    "global_ai_report": "تقرير الذكاء الشامل",
    "download_pdf": "تحميل PDF",
    "integrated_report_title": "تقرير المزرعة المتكامل",
    "integrated_report_subtitle": "توليد في الوقت الفعلي مبني على مستشعرات إنترنت الأشياء والذكاء السيادي",
    "system_operational": "النظام يعمل",
    "global_health_score": "معدل الصحة العام",
    "vs_last_week": "مقارنة بالأسبوع الماضي",
    "animal_biomass": "الكتلة الحيوية للحيوانات",
    "units": "وحدات",
    "gps_tracking_active": "تتبع GPS نشط",
    "plant_crops": "المحاصيل النباتية",
    "species": "أنواع",
    "optimized_irrigation": "ري محسّن",
    "critical_alerts": "تنبيهات حرجة",
    "action_required": "إجراء مطلوب",
    "system_stable": "النظام مستقر",
    "zootechnical_report": "التقرير الحيواني",
    "zootechnical_desc": "التحليل البيومتري يظهر نموًا مستقرًا. دورة الرعي مُحسَّنة وفقًا لتوفر العلف الحالي.",
    "reproduction_rate": "معدل التكاثر",
    "water_consumption": "استهلاك المياه / يوم",
    "vaccination_up_to_date": "التلقيح محدّث",
    "download_detailed_pdf": "تحميل PDF مفصل",
    "agronomic_report": "التقرير الزراعي",
    "agronomic_desc": "مؤشر NDVI يرتفع في القطاع الشمالي. نضج الزيتون مقدر بنسبة 75%. الحصاد متوقع خلال 3 أسابيع.",
    "water_stress": "الإجهاد المائي",
    "estimated_yield": "الإنتاجية المقدرة",
    "fertilizer_usage": "استخدام الأسمدة",
    "soil_yield_analysis": "تحليل التربة والإنتاجية",
    "safety_infrastructure": "السلامة والبنية التحتية",
    "perimeter_integrity": "سلامة المحيط مؤمنة بالذكاء الاصطناعي",
    "virtual_barrier_ok": "حاجز افتراضي يعمل",
    "active_iot_sensors": "مستشعرات إنترنت الأشياء نشطة",
    "thermal_cameras_on": "الكاميرات الحرارية تعمل",
    "last_anomaly_analysis": "آخر تحليل للتجاوزات:",
    "none": "لا يوجد",
    "generated_reports_history": "سجل التقارير المولدة",
    "no_archived_reports": "لا توجد تقارير مؤرشفة",
    "report_title": "عنوان التقرير",
    "type": "النوع",
    "period": "الفترة",
    "avg_score": "متوسط التقييم",
    "action": "إجراء",
    "strategic_ai_analysis": "تحليل استراتيجي للذكاء الاصطناعي:"
  },
  "map_center": {
    "title": "مركز الخرائط",
    "subtitle": "عرض الأقمار الصناعية والطوبولوجيا للمزرعة",
    "layers": "طبقات البيانات",
    "zones": "مناطق المزرعة",
    "sensors_map": "خريطة المستشعرات"
  },
  "login": {
    "welcome": "مرحباً",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "sign_in": "تسجيل الدخول",
    "forgot_password": "هل نسيت كلمة المرور؟"
  },
  "alerts_center": {
    "title": "مركز التنبيهات",
    "subtitle": "إدارة مركزية للأحداث الحرجة",
    "all_alerts": "كل التنبيهات",
    "resolved": "تم الحل",
    "pending": "قيد الانتظار"
  }
}

update_file('frontend/src/locales/fr.json', fr_updates)
update_file('frontend/src/locales/en.json', en_updates)
update_file('frontend/src/locales/ar.json', ar_updates)

print("JSON files updated.")
