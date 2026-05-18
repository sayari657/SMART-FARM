import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PinSetup } from '../components/PinLock';
import {
  Save, Settings2, Bell, Cpu, Building2, CheckCircle2,
  Thermometer, Droplets, Wind, Activity, Clock, MapPin,
  ChevronRight, AlertTriangle, Eye, EyeOff, Wifi, WifiOff,
  Shield, Globe, Zap, Brain, Database, Lock, Mail, Phone,
  Server, Key, RefreshCw, Info, MessageCircle,
  CheckCircle, XCircle, ToggleLeft, ToggleRight, Sliders,
  AlertCircle, ChevronDown, Hash, Link2, Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { settingsAPI, farmsAPI } from '../services/api';

/* ─── Field Types ─────────────────────────────────────────────────────── */
// type: 'number' | 'text' | 'secret' | 'toggle' | 'select' | 'url' | 'email'

const SECTIONS = [
  { id: 'organisation', label: 'Organisation',    emoji: '🏢', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'ai',          label: 'IA & Intelligence',emoji: '🧠', color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'thresholds',  label: 'Seuils Animaux',   emoji: '📊', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'notifications',label: 'Notifications',   emoji: '🔔', color: '#ef4444', bg: '#fef2f2' },
  { id: 'system',      label: 'Système',           emoji: '⚙️', color: '#6366f1', bg: '#eef2ff' },
  { id: 'integrations',label: 'Intégrations',      emoji: '🔌', color: '#0891b2', bg: '#e0f2fe' },
  { id: 'security',    label: 'Sécurité',          emoji: '🔒', color: '#16a34a', bg: '#f0fdf4' },
  { id: 'farms',       label: 'Fermes',            emoji: '🌾', color: '#d97706', bg: '#fef3c7' },
];

const FIELD_DEFS = {
  organisation: [
    { key: 'org_name',           label: 'Nom de l\'organisation',  type: 'text',   icon: Building2,  default: 'FARM AI Enterprise', description: 'Nom affiché dans les rapports et alertes' },
    { key: 'org_contact_email',  label: 'Email de contact',        type: 'email',  icon: Mail,       default: '', description: 'Email principal de l\'organisation' },
    { key: 'org_phone',          label: 'Téléphone',               type: 'text',   icon: Phone,      default: '', description: 'Numéro de téléphone (avec indicatif)' },
    { key: 'org_address',        label: 'Adresse',                 type: 'text',   icon: MapPin,     default: '', description: 'Adresse physique de l\'entreprise' },
    { key: 'org_country',        label: 'Pays',                    type: 'select', icon: Globe,      default: 'TN', description: 'Pays d\'opération', options: [
      { value: 'TN', label: '🇹🇳 Tunisie' }, { value: 'MA', label: '🇲🇦 Maroc' },
      { value: 'DZ', label: '🇩🇿 Algérie' }, { value: 'FR', label: '🇫🇷 France' },
      { value: 'EG', label: '🇪🇬 Egypte' },
    ]},
    { key: 'org_timezone',       label: 'Fuseau horaire',          type: 'select', icon: Clock,      default: 'Africa/Tunis', description: 'Fuseau utilisé pour les rapports', options: [
      { value: 'Africa/Tunis', label: 'Africa/Tunis (UTC+1)' },
      { value: 'Africa/Casablanca', label: 'Africa/Casablanca (UTC+0)' },
      { value: 'Africa/Algiers', label: 'Africa/Algiers (UTC+1)' },
      { value: 'Europe/Paris', label: 'Europe/Paris (UTC+2)' },
    ]},
  ],
  ai: [
    { key: 'ollama_base_url',        label: 'URL Serveur Ollama',         type: 'url',    icon: Server,    default: 'http://localhost:11434', description: 'Endpoint du serveur IA local Ollama' },
    { key: 'groq_api_key',           label: 'Clé API Groq (cloud backup)',type: 'secret', icon: Key,       default: '', description: 'Clé Groq pour fallback cloud si Ollama indisponible' },
    { key: 'vision_model',           label: 'Modèle Vision (VLM)',         type: 'text',   icon: Brain,     default: 'llava', description: 'Modèle LLaVA pour l\'analyse d\'images' },
    { key: 'derja_model',            label: 'Modèle Darija',              type: 'text',   icon: MessageCircle, default: 'wghezaiel/labess-7b-chat', description: 'Modèle LLM pour les réponses en dialecte tunisien' },
    { key: 'ai_confidence_threshold',label: 'Seuil confiance IA (%)',      type: 'number', icon: Sliders,   default: 70, min: 0, max: 100, step: 1, description: 'Score minimum pour valider une détection IA' },
    { key: 'ai_max_retries',         label: 'Tentatives max IA',           type: 'number', icon: RefreshCw, default: 3, min: 1, max: 10, step: 1, description: 'Nombre de tentatives avant fallback Groq' },
    { key: 'rag_results_count',      label: 'Résultats RAG',              type: 'number', icon: Database,  default: 3, min: 1, max: 10, step: 1, description: 'Nombre de passages extraits de la base de connaissance' },
    { key: 'lite_mode',              label: 'Mode allégé (sans IA locale)',type: 'toggle', icon: Zap,       default: false, description: 'Désactive Ollama et ChromaDB pour serveurs légers' },
  ],
  thresholds: [
    { key: 'bee_temp_max',           label: 'Temp. max ruche (°C)',        type: 'number', icon: Thermometer, default: 36.0, min: 25, max: 50, step: 0.5, color: '#f59e0b', species: '🐝 Abeilles' },
    { key: 'bee_humidity_min',       label: 'Humidité min ruche (%)',      type: 'number', icon: Droplets,    default: 45.0, min: 20, max: 90, step: 1,   color: '#f59e0b', species: '🐝 Abeilles' },
    { key: 'bee_weight_drop_alert',  label: 'Chute poids ruche (kg/24h)', type: 'number', icon: Activity,    default: 1.5,  min: 0.1, max: 10, step: 0.1, color: '#f59e0b', species: '🐝 Abeilles' },
    { key: 'cow_temp_max',           label: 'Temp. max vache (°C)',        type: 'number', icon: Thermometer, default: 39.5, min: 35, max: 45, step: 0.1, color: '#7c3aed', species: '🐄 Bovins' },
    { key: 'cow_humidity_max',       label: 'Humidité max étable (%)',     type: 'number', icon: Droplets,    default: 80.0, min: 40, max: 100, step: 1,  color: '#7c3aed', species: '🐄 Bovins' },
    { key: 'sheep_temp_max',         label: 'Temp. max mouton (°C)',       type: 'number', icon: Thermometer, default: 40.0, min: 35, max: 45, step: 0.1, color: '#ec4899', species: '🐑 Ovins' },
    { key: 'goat_temp_max',          label: 'Temp. max chèvre (°C)',       type: 'number', icon: Thermometer, default: 40.5, min: 35, max: 45, step: 0.1, color: '#84cc16', species: '🐐 Caprins' },
    { key: 'rabbit_temp_max',        label: 'Temp. max lapin (°C)',        type: 'number', icon: Thermometer, default: 37.0, min: 30, max: 42, step: 0.1, color: '#f97316', species: '🐇 Lapins' },
    { key: 'poultry_ammonia_max',    label: 'Ammoniac max poulailler (ppm)',type: 'number',icon: Wind,        default: 25.0, min: 5, max: 100, step: 1,   color: '#0891b2', species: '🐔 Volailles' },
    { key: 'poultry_temp_max',       label: 'Temp. max poulailler (°C)',   type: 'number', icon: Thermometer, default: 28.0, min: 20, max: 40, step: 0.5, color: '#0891b2', species: '🐔 Volailles' },
    { key: 'poultry_humidity_max',   label: 'Humidité max poulailler (%)', type: 'number', icon: Droplets,    default: 70.0, min: 30, max: 100, step: 1,  color: '#0891b2', species: '🐔 Volailles' },
  ],
  notifications: [
    { key: 'smtp_email',             label: 'Email SMTP expéditeur',       type: 'email',  icon: Mail,       default: '', description: 'Adresse Gmail configurée pour les alertes' },
    { key: 'smtp_password',          label: 'Mot de passe App Gmail',      type: 'secret', icon: Lock,       default: '', description: 'Mot de passe d\'application Gmail (pas le mdp Google)' },
    { key: 'smtp_host',              label: 'Serveur SMTP',                type: 'text',   icon: Server,     default: 'smtp.gmail.com', description: 'Hôte SMTP (smtp.gmail.com par défaut)' },
    { key: 'smtp_port',              label: 'Port SMTP',                   type: 'number', icon: Hash,       default: 465, min: 25, max: 65535, step: 1, description: '465 pour SSL, 587 pour TLS' },
    { key: 'whatsapp_token',         label: 'Token WhatsApp Business',     type: 'secret', icon: MessageCircle, default: '', description: 'Token de l\'API WhatsApp Cloud (Meta)' },
    { key: 'whatsapp_phone_id',      label: 'ID Numéro WhatsApp',          type: 'text',   icon: Phone,      default: '', description: 'Phone ID de la ligne WhatsApp Business' },
    { key: 'notification_email_enabled',    label: 'Alertes par email',    type: 'toggle', icon: Mail,       default: true,  description: 'Activer l\'envoi d\'alertes par email' },
    { key: 'notification_whatsapp_enabled', label: 'Alertes WhatsApp',     type: 'toggle', icon: MessageCircle, default: false, description: 'Activer les alertes WhatsApp Business' },
    { key: 'notification_critical_only',    label: 'Critiques uniquement', type: 'toggle', icon: AlertTriangle, default: false, description: 'N\'envoyer que les alertes de sévérité critique' },
  ],
  system: [
    { key: 'alert_check_interval_sec', label: 'Intervalle vérification alertes (s)', type: 'number', icon: Clock, default: 60, min: 10, max: 3600, step: 10, description: 'Fréquence de scan des seuils télémétrie' },
    { key: 'telemetry_retention_days', label: 'Rétention télémétrie (jours)',         type: 'number', icon: Database, default: 90, min: 7, max: 365, step: 1, description: 'Nombre de jours avant purge des données brutes' },
    { key: 'rec_auto_generate',        label: 'Recommandations automatiques',         type: 'toggle', icon: Brain,  default: true, description: 'Générer des recommandations IA automatiquement' },
    { key: 'auto_reports_enabled',     label: 'Rapports automatiques',                type: 'toggle', icon: Activity, default: false, description: 'Générer des rapports périodiques automatiquement' },
    { key: 'maintenance_mode',         label: 'Mode maintenance',                     type: 'toggle', icon: Settings2, default: false, description: 'Suspendre les alertes pendant la maintenance' },
    { key: 'debug_logging',            label: 'Journalisation debug',                 type: 'toggle', icon: Server, default: false, description: 'Activer les logs verbeux pour le diagnostic' },
  ],
  integrations: [
    { key: 'mqtt_broker',           label: 'Broker MQTT',                 type: 'text',   icon: Wifi,   default: 'mosquitto', description: 'Adresse du broker MQTT pour les capteurs IoT' },
    { key: 'mqtt_port',             label: 'Port MQTT',                   type: 'number', icon: Hash,   default: 1883, min: 1, max: 65535, step: 1, description: '1883 par défaut, 8883 pour TLS' },
    { key: 'mqtt_topic_prefix',     label: 'Préfixe topic MQTT',          type: 'text',   icon: Link2,  default: 'smart_farm', description: 'Préfixe pour tous les topics MQTT de la ferme' },
    { key: 'trefle_api_token',      label: 'Token Trefle.io',             type: 'secret', icon: Key,    default: '', description: 'Token API pour les données botaniques Trefle' },
    { key: 'weather_api_url',       label: 'URL API Météo',               type: 'url',    icon: Globe,  default: 'https://api.open-meteo.com/v1/forecast', description: 'Endpoint Open-Meteo pour les prévisions' },
    { key: 'chroma_host',           label: 'Hôte ChromaDB',               type: 'text',   icon: Database, default: 'localhost', description: 'Hôte de la base vectorielle ChromaDB (RAG)' },
    { key: 'chroma_port',           label: 'Port ChromaDB',               type: 'number', icon: Hash,   default: 8001, min: 1000, max: 65535, step: 1, description: 'Port du serveur ChromaDB' },
  ],
  security: [
    { key: 'session_timeout_hours', label: 'Timeout session (heures)',    type: 'number', icon: Clock,  default: 168, min: 1, max: 720, step: 1, description: 'Durée de validité du token JWT (168h = 1 semaine)' },
    { key: 'max_failed_logins',     label: 'Tentatives de connexion max', type: 'number', icon: Shield, default: 5,   min: 1, max: 20, step: 1, description: 'Nombre d\'échecs avant verrouillage du compte' },
    { key: 'require_strong_password',label: 'Mot de passe fort obligatoire', type: 'toggle', icon: Lock, default: true, description: 'Imposer majuscule, chiffre et 8+ caractères' },
    { key: 'allow_worker_self_register', label: 'Auto-inscription ouvriers', type: 'toggle', icon: Users, default: false, description: 'Permettre aux ouvriers de créer leur propre compte' },
    { key: 'audit_log_enabled',     label: 'Journal d\'audit',            type: 'toggle', icon: Shield, default: true, description: 'Enregistrer toutes les actions sensibles' },
  ],
};

/* ─── Toggle component ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        background: checked ? 'var(--color-primary)' : '#cbd5e1',
        position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </button>
  );
}

/* ─── Secret field ─────────────────────────────────────────────────────── */
function SecretField({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        className="st-field-input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder || '••••••••'}
        style={{ flex: 1, fontFamily: show ? 'inherit' : 'monospace' }}
      />
      <button type="button" onClick={() => setShow(p => !p)} style={{
        border: 'none', background: 'transparent', color: 'var(--color-text-3)',
        cursor: 'pointer', padding: 4, borderRadius: 4,
      }}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

/* ─── Status dot ───────────────────────────────────────────────────────── */
function StatusDot({ status }) {
  const colors = { ok: '#22c55e', warning: '#f59e0b', error: '#ef4444', idle: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: colors[status] || colors.idle, marginRight: 6, flexShrink: 0,
    }} />
  );
}

/* ─── Main Component ───────────────────────────────────────────────────── */
export default function Settings() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings]         = useState({});
  const [farms, setFarms]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeSection, setActiveSection] = useState('organisation');
  const [saving, setSaving]             = useState(false);
  const [sectionStatus, setSectionStatus] = useState({}); // 'saved' | 'error' per section
  const [dirty, setDirty]               = useState({});
  const [darkMode, setDarkMode]         = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };   // { sectionId: bool }
  const origRef = useRef({});

  /* Load all settings + farms */
  useEffect(() => {
    Promise.all([settingsAPI.list(), farmsAPI.list()]).then(([s, f]) => {
      const map = {};
      // Apply all defaults first
      Object.values(FIELD_DEFS).flat().forEach(d => { map[d.key] = d.default; });
      // Overlay saved values, coercing types
      s.data.forEach(item => {
        const def = Object.values(FIELD_DEFS).flat().find(d => d.key === item.key);
        if (!def) { map[item.key] = item.value; return; }
        if (def.type === 'toggle') map[item.key] = item.value === true || item.value === 'true' || item.value === 1;
        else if (def.type === 'number') map[item.key] = Number(item.value);
        else map[item.key] = item.value;
      });
      origRef.current = { ...map };
      setSettings(map);
      setFarms(f.data);
    }).finally(() => setLoading(false));
  }, []);

  const setVal = useCallback((key, value, sectionId) => {
    setSettings(p => {
      const next = { ...p, [key]: value };
      // Check if section is dirty
      const secFields = FIELD_DEFS[sectionId] || [];
      const isDirty = secFields.some(d => next[d.key] !== origRef.current[d.key]);
      setDirty(pd => ({ ...pd, [sectionId]: isDirty }));
      return next;
    });
  }, []);

  const saveSection = async (sectionId) => {
    if (sectionId === 'farms') return;
    setSaving(true);
    const fields = FIELD_DEFS[sectionId] || [];
    try {
      await Promise.all(fields.map(def =>
        settingsAPI.upsert({
          key: def.key,
          value: settings[def.key] ?? def.default,
          description: def.description || def.label,
        })
      ));
      // Update origRef for dirty tracking
      fields.forEach(def => { origRef.current[def.key] = settings[def.key] ?? def.default; });
      setDirty(pd => ({ ...pd, [sectionId]: false }));
      setSectionStatus(p => ({ ...p, [sectionId]: 'saved' }));
      setTimeout(() => setSectionStatus(p => ({ ...p, [sectionId]: null })), 3000);
    } catch {
      setSectionStatus(p => ({ ...p, [sectionId]: 'error' }));
      setTimeout(() => setSectionStatus(p => ({ ...p, [sectionId]: null })), 4000);
    } finally { setSaving(false); }
  };

  const resetSection = (sectionId) => {
    const fields = FIELD_DEFS[sectionId] || [];
    setSettings(p => {
      const next = { ...p };
      fields.forEach(def => { next[def.key] = origRef.current[def.key] ?? def.default; });
      return next;
    });
    setDirty(pd => ({ ...pd, [sectionId]: false }));
  };

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
      <div className="spinner" />
    </div>
  );

  const rtl = i18n.language === 'ar';
  const sec = SECTIONS.find(s => s.id === activeSection);
  const fields = FIELD_DEFS[activeSection] || [];
  const isSectionDirty = dirty[activeSection];
  const sectionSaveStatus = sectionStatus[activeSection];

  // Group threshold fields by species
  const thresholdGroups = activeSection === 'thresholds'
    ? [...new Set(fields.map(f => f.species))].map(sp => ({
        species: sp,
        fields: fields.filter(f => f.species === sp),
      }))
    : null;

  return (
    <>
      <Navbar
        title="Paramètres Entreprise"
        subtitle={`${SECTIONS.length} sections · ${Object.values(FIELD_DEFS).flat().length} paramètres · ${farms.length} ferme${farms.length !== 1 ? 's' : ''}`}
        actions={
          activeSection !== 'farms' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isSectionDirty && (
                <button
                  className="farms-hero-btn"
                  onClick={() => resetSection(activeSection)}
                  style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-2)' }}
                >
                  <RefreshCw size={13} /> Réinitialiser
                </button>
              )}
              <button
                className="farms-hero-btn"
                onClick={() => saveSection(activeSection)}
                disabled={saving}
                style={
                  sectionSaveStatus === 'saved'
                    ? { background: 'linear-gradient(135deg,#16a34a,#15803d)' }
                    : sectionSaveStatus === 'error'
                      ? { background: 'linear-gradient(135deg,#ef4444,#dc2626)' }
                      : isSectionDirty
                        ? { background: 'linear-gradient(135deg,#f59e0b,#d97706)' }
                        : {}
                }
              >
                {sectionSaveStatus === 'saved'
                  ? <><CheckCircle2 size={14} /> Enregistré !</>
                  : sectionSaveStatus === 'error'
                    ? <><XCircle size={14} /> Erreur</>
                    : saving
                      ? <><span className="farms-spinner" /> Enregistrement…</>
                      : <><Save size={14} /> Enregistrer la section</>}
              </button>
            </div>
          )
        }
      />

      <div className="page-content" style={{ direction: rtl ? 'rtl' : 'ltr' }}>

        {/* ── Hero KPI strip ─────────────────────────────────────────── */}
        <div className="st-hero">
          <div className="st-hero-left">
            <div className="st-hero-eyebrow"><Settings2 size={11} /> CONFIGURATION ENTREPRISE</div>
            <h1 className="st-hero-title">Paramètres & Configuration</h1>
            <p className="st-hero-sub">Calibration IA · Seuils · Notifications · Sécurité · {farms.length} ferme{farms.length !== 1 ? 's' : ''} connectée{farms.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="st-hero-kpis">
            {/* Dark mode toggle */}
            <button onClick={toggleDark} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 14, background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>{darkMode ? '🌙' : '☀️'}</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '0.5px' }}>{darkMode ? 'Mode Sombre' : 'Mode Clair'}</div>
                <div style={{ fontSize: 9, color: 'var(--color-text-2)', marginTop: 1 }}>Cliquer pour basculer</div>
              </div>
              <div style={{ width: 34, height: 20, borderRadius: 10, background: darkMode ? '#6366f1' : 'rgba(0,0,0,0.15)', position: 'relative', transition: 'background 0.2s', marginLeft: 4 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: darkMode ? 17 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </div>
            </button>
            {[
              { val: Object.values(FIELD_DEFS).flat().length, label: 'Paramètres',  color: '#60a5fa', icon: Sliders },
              { val: SECTIONS.length,                          label: 'Sections',    color: '#a78bfa', icon: Settings2 },
              { val: farms.length,                             label: 'Fermes',      color: '#34d399', icon: Building2 },
              { val: farms.filter(f => f.status === 'active').length, label: 'Actives', color: '#fbbf24', icon: CheckCircle2 },
            ].map(({ val, label, color, icon: Icon }) => (
              <div key={label} className="st-kpi">
                <Icon size={16} color={color} />
                <div className="st-kpi-val" style={{ color }}>{val}</div>
                <div className="st-kpi-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Layout ────────────────────────────────────────────────── */}
        <div className="st-layout">

          {/* Sidebar */}
          <div className="st-sidebar">
            {SECTIONS.map(s => (
              <button key={s.id}
                className={`st-nav-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => setActiveSection(s.id)}>
                <span className="st-nav-emoji" style={{ background: s.bg }}>{s.emoji}</span>
                <div className="st-nav-text">
                  <span className="st-nav-label" style={activeSection === s.id ? { color: s.color } : {}}>
                    {s.label}
                  </span>
                  <span className="st-nav-count">
                    {s.id === 'farms' ? `${farms.length} fermes` : `${(FIELD_DEFS[s.id] || []).length} param.`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {dirty[s.id] && s.id !== 'farms' && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                  )}
                  {sectionStatus[s.id] === 'saved' && (
                    <CheckCircle size={12} color="#22c55e" />
                  )}
                  <ChevronRight size={14} color={activeSection === s.id ? s.color : '#cbd5e1'} />
                </div>
              </button>
            ))}

            {/* System status footer */}
            <div className="st-sidebar-section-label" style={{ marginTop: 16 }}>État système</div>
            {[
              { label: 'API Backend', status: 'ok' },
              { label: 'Base de données', status: 'ok' },
              { label: 'WebSocket', status: 'ok' },
            ].map(({ label, status }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '4px 12px', fontSize: 12, color: 'var(--color-text-2)' }}>
                <StatusDot status={status} />
                {label}
              </div>
            ))}
          </div>

          {/* ── Main panel ───────────────────────────────────────────── */}
          <div className="st-main">

            {/* Section header */}
            <div className="st-panel-header">
              <div className="st-panel-icon" style={{ background: sec.bg, color: sec.color, fontSize: 20 }}>
                {sec.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div className="st-panel-title">{sec.label}</div>
                <div className="st-panel-sub">
                  {activeSection === 'farms'
                    ? `${farms.length} ferme${farms.length !== 1 ? 's' : ''} enregistrée${farms.length !== 1 ? 's' : ''}`
                    : `${fields.length} paramètre${fields.length !== 1 ? 's' : ''} configurables`}
                </div>
              </div>
              {isSectionDirty && activeSection !== 'farms' && (
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 99,
                  background: '#fef3c7', color: '#92400e',
                  border: '1px solid #fde68a', fontWeight: 600,
                }}>
                  Modifications non enregistrées
                </span>
              )}
            </div>

            {/* ── Threshold section (grouped by species) ─────────────── */}
            {activeSection === 'thresholds' && thresholdGroups && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {thresholdGroups.map(group => (
                  <div key={group.species}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}>
                      {group.species}
                    </div>
                    <div className="st-fields">
                      {group.fields.map(def => {
                        const Icon = def.icon;
                        const val = settings[def.key] ?? def.default;
                        const changed = val !== (origRef.current[def.key] ?? def.default);
                        return (
                          <div key={def.key} className={`st-field ${changed ? 'modified' : ''}`}>
                            <div className="st-field-icon" style={{ background: `${def.color || sec.color}15`, color: def.color || sec.color }}>
                              <Icon size={16} />
                            </div>
                            <div className="st-field-body">
                              <label className="st-field-label">{def.label}</label>
                              <div className="st-field-key">{def.key}</div>
                            </div>
                            <div className="st-field-right">
                              {changed && <span className="st-modified-dot" />}
                              <input
                                className="st-field-input"
                                type="number"
                                step={def.step ?? 0.1}
                                min={def.min}
                                max={def.max}
                                value={val}
                                onChange={e => setVal(def.key, +e.target.value, activeSection)}
                                style={{ borderColor: changed ? def.color || sec.color : undefined, width: 90 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Generic fields ─────────────────────────────────────── */}
            {activeSection !== 'thresholds' && activeSection !== 'farms' && (
              <div className="st-fields" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {fields.map(def => {
                  const Icon = def.icon;
                  const val = settings[def.key] ?? def.default;
                  const changed = val !== (origRef.current[def.key] ?? def.default);

                  return (
                    <div key={def.key} className={`st-field ${changed ? 'modified' : ''}`}
                      style={{ alignItems: def.type === 'toggle' ? 'center' : 'flex-start', padding: '14px 16px', gap: 14 }}>

                      <div className="st-field-icon" style={{ background: `${sec.color}12`, color: sec.color, marginTop: def.type === 'toggle' ? 0 : 2 }}>
                        <Icon size={15} />
                      </div>

                      <div className="st-field-body" style={{ flex: 1, minWidth: 0 }}>
                        <label className="st-field-label">{def.label}</label>
                        {def.description && (
                          <div className="st-field-key" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{def.description}</div>
                        )}
                      </div>

                      <div className="st-field-right" style={{ flexShrink: 0, minWidth: def.type === 'toggle' ? 44 : 160 }}>
                        {changed && def.type !== 'toggle' && <span className="st-modified-dot" />}

                        {def.type === 'toggle' && (
                          <Toggle
                            checked={!!val}
                            onChange={v => setVal(def.key, v, activeSection)}
                          />
                        )}

                        {def.type === 'secret' && (
                          <SecretField
                            value={val || ''}
                            onChange={e => setVal(def.key, e.target.value, activeSection)}
                            placeholder={def.placeholder}
                          />
                        )}

                        {def.type === 'select' && (
                          <div style={{ position: 'relative' }}>
                            <select
                              className="st-field-input"
                              value={val}
                              onChange={e => setVal(def.key, e.target.value, activeSection)}
                              style={{ paddingRight: 28, appearance: 'none', borderColor: changed ? sec.color : undefined }}
                            >
                              {def.options.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-3)' }} />
                          </div>
                        )}

                        {(def.type === 'number') && (
                          <input
                            className="st-field-input"
                            type="number"
                            step={def.step ?? 1}
                            min={def.min}
                            max={def.max}
                            value={val}
                            onChange={e => setVal(def.key, +e.target.value, activeSection)}
                            style={{ borderColor: changed ? sec.color : undefined, width: 110 }}
                          />
                        )}

                        {(def.type === 'text' || def.type === 'email' || def.type === 'url') && (
                          <input
                            className="st-field-input"
                            type={def.type}
                            value={val || ''}
                            onChange={e => setVal(def.key, e.target.value, activeSection)}
                            placeholder={def.placeholder || def.default || ''}
                            style={{ borderColor: changed ? sec.color : undefined, width: 220 }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Farms section ──────────────────────────────────────── */}
            {activeSection === 'farms' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 16, marginBottom: 24 }}>
                  {farms.map(f => (
                    <div key={f.id} style={{
                      border: '1px solid var(--color-border)', borderRadius: 12,
                      padding: 16, background: 'var(--color-surface)',
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, background: sec.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                        }}>🌾</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{f.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>ID #{f.id}</div>
                        </div>
                        <span style={{ marginLeft: 'auto' }} className={`badge badge-${f.status === 'active' ? 'success' : f.status === 'maintenance' ? 'warning' : 'neutral'}`}>
                          {f.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={11} /> {f.location || 'Localisation non définie'}
                      </div>
                      {f.latitude && f.longitude && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
                          {Number(f.latitude).toFixed(4)}, {Number(f.longitude).toFixed(4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Full table */}
                <div className="st-farms-table-wrap">
                  <table className="st-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nom</th>
                        <th>Localisation</th>
                        <th>Coordonnées</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farms.map(f => (
                        <tr key={f.id}>
                          <td className="st-td-id">#{f.id}</td>
                          <td className="st-td-name">{f.name}</td>
                          <td className="st-td-loc"><MapPin size={11} style={{ marginRight: 4 }} />{f.location || '—'}</td>
                          <td style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                            {f.latitude ? `${Number(f.latitude).toFixed(3)}, ${Number(f.longitude).toFixed(3)}` : '—'}
                          </td>
                          <td>
                            <span className={`badge badge-${f.status === 'active' ? 'success' : f.status === 'maintenance' ? 'warning' : 'neutral'}`}>
                              {f.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Info banner for AI section ─────────────────────────── */}
            {activeSection === 'ai' && (
              <div style={{
                marginTop: 16, padding: '12px 16px', borderRadius: 10,
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <Info size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.6 }}>
                  <strong>Architecture souveraine :</strong> L'IA fonctionne d'abord sur Ollama (local, hors-ligne).
                  Si Ollama est indisponible, le système bascule automatiquement sur Groq (cloud).
                  Assurez-vous que le serveur Ollama est démarré et que les modèles sont téléchargés.
                </div>
              </div>
            )}

            {activeSection === 'security' && (
              <>
                <div style={{
                  marginTop: 16, padding: '12px 16px', borderRadius: 10,
                  background: '#fef2f2', border: '1px solid #fecaca',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: '#dc2626', lineHeight: 1.6 }}>
                    Les paramètres de sécurité nécessitent un redémarrage du serveur backend pour être pleinement appliqués.
                    Le timeout de session s'applique aux nouveaux tokens uniquement.
                  </div>
                </div>
                <div style={{ marginTop: 16, padding: '18px 20px', borderRadius: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <PinSetup />
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
