import json

def update_file(file_path, data):
    with open(file_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    for key, value in data.items():
        existing[key] = value

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

fr_updates = {
  "landing": {
    "welcome": "Bienvenue sur Smart Farm AI",
    "description": "L'avenir de l'agriculture intelligente",
    "get_started": "Commencer",
    "features": "Fonctionnalités"
  },
  "register": {
    "title": "Créer un compte",
    "name": "Nom complet",
    "email": "Adresse Email",
    "password": "Mot de passe",
    "sign_up": "S'inscrire",
    "already_have_account": "Vous avez déjà un compte ?"
  },
  "worker_login": {
    "title": "Portail Ouvrier",
    "access_code": "Code d'accès",
    "login": "Connexion"
  },
  "cv_monitoring": {
    "title": "Surveillance Vidéo AI",
    "live_feed": "Flux en direct",
    "detections": "Détections",
    "camera_status": "Statut des caméras"
  },
  "recommendations": {
    "title": "Conseils AI",
    "daily_tip": "Conseil du jour",
    "ai_analysis": "Analyse de l'IA"
  },
  "hives": {
    "title": "Gestion des Ruches",
    "health": "Santé de la ruche",
    "honey_production": "Production de miel"
  },
  "livestock_details": {
    "health_history": "Historique de santé",
    "vaccines": "Vaccins",
    "location_tracking": "Suivi de localisation"
  },
  "telemetry_analysis": {
    "title": "Analyse Avancée des Capteurs",
    "graphs": "Graphiques"
  }
}

en_updates = {
  "landing": {
    "welcome": "Welcome to Smart Farm AI",
    "description": "The future of smart agriculture",
    "get_started": "Get Started",
    "features": "Features"
  },
  "register": {
    "title": "Create an Account",
    "name": "Full Name",
    "email": "Email Address",
    "password": "Password",
    "sign_up": "Sign Up",
    "already_have_account": "Already have an account?"
  },
  "worker_login": {
    "title": "Worker Portal",
    "access_code": "Access Code",
    "login": "Login"
  },
  "cv_monitoring": {
    "title": "AI Video Monitoring",
    "live_feed": "Live Feed",
    "detections": "Detections",
    "camera_status": "Camera Status"
  },
  "recommendations": {
    "title": "AI Recommendations",
    "daily_tip": "Daily Tip",
    "ai_analysis": "AI Analysis"
  },
  "hives": {
    "title": "Hive Management",
    "health": "Hive Health",
    "honey_production": "Honey Production"
  },
  "livestock_details": {
    "health_history": "Health History",
    "vaccines": "Vaccines",
    "location_tracking": "Location Tracking"
  },
  "telemetry_analysis": {
    "title": "Advanced Sensor Analysis",
    "graphs": "Graphs"
  }
}

ar_updates = {
  "landing": {
    "welcome": "مرحباً بكم في Smart Farm AI",
    "description": "مستقبل الزراعة الذكية",
    "get_started": "ابدأ الآن",
    "features": "المميزات"
  },
  "register": {
    "title": "إنشاء حساب",
    "name": "الاسم الكامل",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "sign_up": "تسجيل",
    "already_have_account": "لديك حساب بالفعل؟"
  },
  "worker_login": {
    "title": "بوابة العمال",
    "access_code": "رمز الدخول",
    "login": "تسجيل الدخول"
  },
  "cv_monitoring": {
    "title": "المراقبة الذكية بالفيديو",
    "live_feed": "بث مباشر",
    "detections": "الاكتشافات",
    "camera_status": "حالة الكاميرا"
  },
  "recommendations": {
    "title": "نصائح الذكاء الاصطناعي",
    "daily_tip": "نصيحة اليوم",
    "ai_analysis": "تحليل الذكاء الاصطناعي"
  },
  "hives": {
    "title": "إدارة الخلايا",
    "health": "صحة الخلية",
    "honey_production": "إنتاج العسل"
  },
  "livestock_details": {
    "health_history": "التاريخ الصحي",
    "vaccines": "التلاقيح",
    "location_tracking": "تتبع الموقع"
  },
  "telemetry_analysis": {
    "title": "تحليل متقدم للمستشعرات",
    "graphs": "رسوم بيانية"
  }
}

update_file('frontend/src/locales/fr.json', fr_updates)
update_file('frontend/src/locales/en.json', en_updates)
update_file('frontend/src/locales/ar.json', ar_updates)

print("JSON files updated part 2.")
