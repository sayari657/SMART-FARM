import json

def update_file(file_path, data):
    with open(file_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    if "login" not in existing:
        existing["login"] = {}

    for key, value in data.items():
        existing["login"][key] = value

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

fr_updates = {
    "welcome_back": "Ravi de vous revoir",
    "sign_in_to": "Connectez-vous à votre compte Smart Farm AI",
    "username": "Nom d'utilisateur",
    "password": "Mot de passe",
    "enter_username": "Entrez votre nom d'utilisateur",
    "enter_password": "Entrez votre mot de passe",
    "forgot_password": "Mot de passe oublié ?",
    "sign_in": "Se connecter",
    "dont_have_account": "Vous n'avez pas de compte ?",
    "create_one": "Créer un compte",
    "worker_access": "Accès Ouvrier (Code PIN)",
    "back": "Retour",
    "recover_access": "Récupérer l'accès",
    "choose_how_to_receive": "Choisissez comment recevoir votre code de vérification",
    "by_email": "Par E-mail",
    "email_desc": "Code envoyé à votre adresse email enregistrée",
    "free_email": "100% Gratuit — Gmail SMTP",
    "via_whatsapp": "Via WhatsApp",
    "whatsapp_desc": "Code OTP sur votre numéro WhatsApp enregistré",
    "free_whatsapp": "Gratuit (Meta Cloud API)",
    "verification_email": "Vérification par E-mail",
    "verification_whatsapp": "Vérification WhatsApp",
    "enter_registered": "Entrez votre {channel} enregistré",
    "receive_code": "Recevoir le code {channel}",
    "enter_code": "Entrez votre code",
    "otp_received": "Code OTP reçu {channel}",
    "new_password": "Nouveau mot de passe",
    "confirm_reset": "Confirmer la réinitialisation",
    "password_reset": "Mot de passe réinitialisé !",
    "password_updated": "Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.",
    "back_to_login": "Retour à la connexion",
    "hero_title": "Surveillance intelligente à grande échelle",
    "hero_desc": "Surveillez abeilles, vaches, volailles avec télémesure IoT, vision par ordinateur et IA.",
    "feat_iot": "Télémesure IoT temps réel",
    "feat_cv": "Détection par vision par ordinateur",
    "feat_ai": "Moteur d'anomalies IA",
    "feat_alerts": "Alertes multi-espèces",
    "connecting": "Connexion...",
    "sending": "Envoi en cours...",
    "verifying": "Vérification..."
}

en_updates = {
    "welcome_back": "Welcome back",
    "sign_in_to": "Sign in to your Smart Farm AI account",
    "username": "Username",
    "password": "Password",
    "enter_username": "Enter your username",
    "enter_password": "Enter your password",
    "forgot_password": "Forgot password?",
    "sign_in": "Sign In",
    "dont_have_account": "Don't have an account?",
    "create_one": "Create one",
    "worker_access": "Worker Access (PIN Code)",
    "back": "Back",
    "recover_access": "Recover access",
    "choose_how_to_receive": "Choose how to receive your verification code",
    "by_email": "By Email",
    "email_desc": "Code sent to your registered email address",
    "free_email": "100% Free — Gmail SMTP",
    "via_whatsapp": "Via WhatsApp",
    "whatsapp_desc": "OTP code on your registered WhatsApp number",
    "free_whatsapp": "Free (Meta Cloud API)",
    "verification_email": "Email Verification",
    "verification_whatsapp": "WhatsApp Verification",
    "enter_registered": "Enter your registered {channel}",
    "receive_code": "Receive code {channel}",
    "enter_code": "Enter your code",
    "otp_received": "OTP code received {channel}",
    "new_password": "New password",
    "confirm_reset": "Confirm reset",
    "password_reset": "Password reset!",
    "password_updated": "Your password has been successfully updated. You can now log in.",
    "back_to_login": "Back to login",
    "hero_title": "Intelligent Farm Monitoring at Scale",
    "hero_desc": "Monitor bees, cows, poultry with IoT telemetry, computer vision, and AI anomaly detection.",
    "feat_iot": "Real-time IoT telemetry",
    "feat_cv": "Computer vision detection",
    "feat_ai": "AI anomaly engine",
    "feat_alerts": "Multi-species alerts",
    "connecting": "Connecting...",
    "sending": "Sending...",
    "verifying": "Verifying..."
}

ar_updates = {
    "welcome_back": "مرحباً بعودتك",
    "sign_in_to": "تسجيل الدخول إلى حساب Smart Farm AI الخاص بك",
    "username": "اسم المستخدم",
    "password": "كلمة المرور",
    "enter_username": "أدخل اسم المستخدم الخاص بك",
    "enter_password": "أدخل كلمة المرور الخاصة بك",
    "forgot_password": "هل نسيت كلمة المرور؟",
    "sign_in": "تسجيل الدخول",
    "dont_have_account": "ليس لديك حساب؟",
    "create_one": "إنشاء حساب",
    "worker_access": "وصول العامل (رمز PIN)",
    "back": "رجوع",
    "recover_access": "استعادة الوصول",
    "choose_how_to_receive": "اختر كيفية استلام رمز التحقق الخاص بك",
    "by_email": "عبر البريد الإلكتروني",
    "email_desc": "تم إرسال الرمز إلى عنوان بريدك الإلكتروني المسجل",
    "free_email": "مجاني 100٪ — Gmail SMTP",
    "via_whatsapp": "عبر واتساب",
    "whatsapp_desc": "رمز OTP على رقم واتساب المسجل الخاص بك",
    "free_whatsapp": "مجاني (Meta Cloud API)",
    "verification_email": "التحقق عبر البريد الإلكتروني",
    "verification_whatsapp": "التحقق عبر واتساب",
    "enter_registered": "أدخل {channel} المسجل الخاص بك",
    "receive_code": "استلام الرمز {channel}",
    "enter_code": "أدخل الرمز الخاص بك",
    "otp_received": "تم استلام رمز OTP {channel}",
    "new_password": "كلمة مرور جديدة",
    "confirm_reset": "تأكيد إعادة التعيين",
    "password_reset": "تم إعادة تعيين كلمة المرور!",
    "password_updated": "تم تحديث كلمة المرور الخاصة بك بنجاح. يمكنك الآن تسجيل الدخول.",
    "back_to_login": "العودة إلى تسجيل الدخول",
    "hero_title": "مراقبة المزرعة الذكية على نطاق واسع",
    "hero_desc": "راقب النحل والأبقار والدواجن باستخدام قياس إنترنت الأشياء، والرؤية الحاسوبية، والذكاء الاصطناعي.",
    "feat_iot": "قياس إنترنت الأشياء في الوقت الفعلي",
    "feat_cv": "اكتشاف الرؤية الحاسوبية",
    "feat_ai": "محرك الشذوذ بالذكاء الاصطناعي",
    "feat_alerts": "تنبيهات متعددة الأنواع",
    "connecting": "جاري الاتصال...",
    "sending": "جاري الإرسال...",
    "verifying": "جاري التحقق..."
}

update_file('frontend/src/locales/fr.json', fr_updates)
update_file('frontend/src/locales/en.json', en_updates)
update_file('frontend/src/locales/ar.json', ar_updates)

print("Login keys added.")
