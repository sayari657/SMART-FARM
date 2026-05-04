const fs = require('fs');

const file = 'frontend/src/pages/Login.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';\nimport { useTranslation } from 'react-i18next';");
content = content.replace("const { login, loading } = useAuth();", "const { login, loading } = useAuth();\n  const { t, i18n } = useTranslation();");

content = content.replace(/>Intelligent Farm<br \/>Monitoring at Scale</, ' dangerouslySetInnerHTML={{ __html: t("login.hero_title") }}><');
content = content.replace(/>\s*Monitor bees, cows, poultry with IoT telemetry, computer vision, and AI anomaly detection.\s*</, ">{t('login.hero_desc')}<");
content = content.replace(/'Real-time IoT telemetry'/, "t('login.feat_iot')");
content = content.replace(/'Computer vision detection'/, "t('login.feat_cv')");
content = content.replace(/'AI anomaly engine'/, "t('login.feat_ai')");
content = content.replace(/'Multi-species alerts'/, "t('login.feat_alerts')");

content = content.replace(/>Welcome back</, ">{t('login.welcome_back')}<");
content = content.replace(/>Sign in to your Smart Farm AI account</, ">{t('login.sign_in_to')}<");
content = content.replace(/>Username</, ">{t('login.username')}<");
content = content.replace(/>Password</, ">{t('login.password')}<");
content = content.replace(/placeholder="Enter your username"/g, 'placeholder={t("login.enter_username")}');
content = content.replace(/placeholder="Enter your password"/g, 'placeholder={t("login.enter_password")}');
content = content.replace(/>\s*Mot de passe oublié \?\s*</, ">{t('login.forgot_password')}<");
content = content.replace(/'Connexion\.\.\.' \: 'Sign In'/, "t('login.connecting') : t('login.sign_in')");
content = content.replace(/>Don't have an account\? /, ">{t('login.dont_have_account')} ");
content = content.replace(/>Create one</, ">{t('login.create_one')}<");
content = content.replace(/>\s*Accès Ouvrier \(Code PIN\)\s*</, "> {t('login.worker_access')}<");

content = content.replace(/> Retour</g, "> {t('login.back')}<");
content = content.replace(/>Récupérer l'accès</, ">{t('login.recover_access')}<");
content = content.replace(/>Choisissez comment recevoir votre code de vérification</, ">{t('login.choose_how_to_receive')}<");

content = content.replace(/>📧 Par E-mail</, ">📧 {t('login.by_email')}<");
content = content.replace(/>Code envoyé à votre adresse email enregistrée</, ">{t('login.email_desc')}<");
content = content.replace(/>✅ 100% Gratuit — Gmail SMTP</, ">✅ {t('login.free_email')}<");

content = content.replace(/>💬 Via WhatsApp</, ">💬 {t('login.via_whatsapp')}<");
content = content.replace(/>Code OTP sur votre numéro WhatsApp enregistré</, ">{t('login.whatsapp_desc')}<");
content = content.replace(/>✅ Gratuit \(Meta Cloud API\)</, ">✅ {t('login.free_whatsapp')}<");

content = content.replace(/>Vérification par E-mail</, ">{t('login.verification_email')}<");
content = content.replace(/>Vérification WhatsApp</, ">{t('login.verification_whatsapp')}<");
content = content.replace(/Entrez votre \{channel === 'email' \? 'adresse e-mail' : 'numéro de téléphone'\} enregistré/, "{t('login.enter_registered').replace('{channel}', channel === 'email' ? 'e-mail' : 'WhatsApp')}");

content = content.replace(/>\{channel === 'email' \? 'Adresse E-mail' : 'Numéro WhatsApp'\}</, ">{channel === 'email' ? t('login.by_email') : t('login.via_whatsapp')}<");
content = content.replace(/'Envoi en cours\.\.\.' \: `Recevoir le code \$\{channel === 'email' \? 'par Email' \: 'via WhatsApp'\}`/, "t('login.sending') : t('login.receive_code').replace('{channel}', channel === 'email' ? 'Email' : 'WhatsApp')");

content = content.replace(/>Entrez votre code</, ">{t('login.enter_code')}<");
content = content.replace(/>Code OTP reçu \{channel === 'email' \? 'par email' : 'sur WhatsApp'\}</, ">{t('login.otp_received').replace('{channel}', channel === 'email' ? 'email' : 'WhatsApp')}<");
content = content.replace(/>Nouveau mot de passe</, ">{t('login.new_password')}<");
content = content.replace(/'Vérification\.\.\.' \: '✅ Confirmer la réinitialisation'/, "t('login.verifying') : `✅ ${t('login.confirm_reset')}`");

content = content.replace(/>Mot de passe réinitialisé !</, ">{t('login.password_reset')}<");
content = content.replace(/>Votre mot de passe a été mis à jour avec succès\. Vous pouvez maintenant vous connecter\.</, ">{t('login.password_updated')}<");
content = content.replace(/>\s*Retour à la connexion\s*</, ">{t('login.back_to_login')}<");

content = content.replace('<div className="auth-page">', '<div className="auth-page" style={{ direction: i18n.language === \'ar\' ? \'rtl\' : \'ltr\' }}>');


fs.writeFileSync(file, content, 'utf8');
console.log('done');
