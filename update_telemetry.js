const fs = require('fs');

const file = 'frontend/src/pages/TelemetryAnalysis.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add useTranslation
content = content.replace("import { animalsAPI, telemetryAPI, externalAPI } from '../services/api';", "import { animalsAPI, telemetryAPI, externalAPI } from '../services/api';\nimport { useTranslation } from 'react-i18next';");

// Inside IoTTab
content = content.replace("function IoTTab() {", "function IoTTab() {\n  const { t } = useTranslation();");
content = content.replace("Connexion...", "{t('telemetry.connecting')}");
content = content.replace("Serveur IoT connecté", "{t('telemetry.connected')}");
content = content.replace("Backend IoT hors-ligne (démonstration)", "{t('telemetry.offline')}");
content = content.replace("Màj {lastTs}", "{t('telemetry.updated')} {lastTs}");
content = content.replace("Actualiser", "{t('telemetry.refresh')}");
content = content.replace('title="Node A — Irrigation"', 'title={t("telemetry.node_a_title")}');
content = content.replace('label="Pompe"', 'label={t("telemetry.pump")}');
content = content.replace('label="Vanne"', 'label={t("telemetry.valve")}');
content = content.replace('label="Défaut"', 'label={t("telemetry.fault")}');
content = content.replace('label="Humidité Sol"', 'label={t("telemetry.soil_humidity")}');
content = content.replace('label="Pression"', 'label={t("telemetry.pressure")}');
content = content.replace('label="Débit"', 'label={t("telemetry.flow")}');
content = content.replace('label="Temp Sol"', 'label={t("telemetry.soil_temp")}');
content = content.replace('title="Node B — Ruche Connectée"', 'title={t("telemetry.node_b_title")}');
content = content.replace('label="Température OK"', 'label={t("telemetry.temp_ok")}');
content = content.replace('label="Humidité OK"', 'label={t("telemetry.hum_ok")}');
content = content.replace('label="Poids Ruche"', 'label={t("telemetry.hive_weight")}');
content = content.replace('label="Temp Interne"', 'label={t("telemetry.internal_temp")}');
content = content.replace('label="Temp Externe"', 'label={t("telemetry.external_temp")}');
content = content.replace('label="Humidité Ext"', 'label={t("telemetry.external_hum")}');
content = content.replace(/>Node A — Historique live</g, ">{t('telemetry.live_history')}<");
content = content.replace(/>Node B — Historique live</g, ">{t('telemetry.live_history')}<");
content = content.replace(/{chartDataA.length} pts/g, "{chartDataA.length} {t('telemetry.pts')}");
content = content.replace(/{chartDataB.length} pts/g, "{chartDataB.length} {t('telemetry.pts')}");
content = content.replace(/>En attente des données Wokwi…</g, ">{t('telemetry.waiting_wokwi')}<");
content = content.replace(/>Simulation Wokwi :</g, ">{t('telemetry.wokwi_sim')}<");
content = content.replace(/ouvrez .* dans VS Code avec l'extension Wokwi\./, "{t('telemetry.wokwi_desc')}");

// Inside UnitTab
content = content.replace("function UnitTab() {", "function UnitTab() {\n  const { t } = useTranslation();");
content = content.replace(">Unité :<", ">{t('telemetry.unit_select')}<");
content = content.replace("🌡 IoT interne", "🌡 {t('telemetry.internal_iot')}");
content = content.replace("☁ Open-Meteo extérieur", "☁ {t('telemetry.external_meteo')}");
content = content.replace("Écart anormal détecté", "{t('telemetry.abnormal_gap')}");
content = content.replace("Temps réel", "{t('telemetry.real_time')}");
content = content.replace("Historique 200 derniers relevés", "{t('telemetry.history_200')}");
content = content.replace("enregistrements", "{t('telemetry.records')}");
content = content.replace("Tableau de données", "{t('telemetry.data_table')}");
content = content.replace("Horodatage", "{t('telemetry.timestamp')}");

// Inside TelemetryAnalysis
content = content.replace("export default function TelemetryAnalysis() {", "export default function TelemetryAnalysis() {\n  const { t, i18n } = useTranslation();");
content = content.replace('title="Télémétrie IoT"', 'title={t("telemetry.page_title")}');
content = content.replace('subtitle="Supervision temps réel — Wokwi ESP32 · Noeuds A & B"', 'subtitle={t("telemetry.page_subtitle")}');
content = content.replace('<div className="page-content">', '<div className="page-content" style={{ direction: i18n.language === \'ar\' ? \'rtl\' : \'ltr\' }}>');
content = content.replace(/const TABS = \[[\s\S]*?\];/, "const TABS = (t) => [\n  { id: 'iot',   label: t('telemetry.tab_iot'),    sub: t('telemetry.tab_iot_sub') },\n  { id: 'units', label: t('telemetry.tab_units'), sub: t('telemetry.tab_units_sub') },\n];");
content = content.replace("TABS.map", "TABS(t).map");


fs.writeFileSync(file, content, 'utf8');
console.log('done');
