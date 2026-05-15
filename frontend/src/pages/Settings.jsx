import React, { useEffect, useState } from 'react';
import {
  Save, Settings2, Bell, Cpu, Building2, CheckCircle2,
  Thermometer, Droplets, Wind, Activity, Clock, MapPin,
  ChevronRight, AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { settingsAPI, farmsAPI } from '../services/api';

const DEFAULT_SETTINGS = [
  { key: 'bee_temp_max',             value: 36.0, description: 'Temp. max ruche (°C)',          icon: Thermometer, color: '#f59e0b', section: 'bee' },
  { key: 'bee_humidity_min',         value: 45.0, description: 'Humidité min ruche (%)',         icon: Droplets,    color: '#0ea5e9', section: 'bee' },
  { key: 'bee_weight_drop_alert',    value: 1.5,  description: 'Seuil chute poids ruche (kg/24h)',icon: Activity,   color: '#dc2626', section: 'bee' },
  { key: 'cow_temp_max',             value: 39.5, description: 'Temp. max vache (°C)',           icon: Thermometer, color: '#7c3aed', section: 'cow' },
  { key: 'poultry_ammonia_max',      value: 25.0, description: 'Ammoniac max poulailler (ppm)',  icon: Wind,        color: '#0891b2', section: 'poultry' },
  { key: 'poultry_temp_max',         value: 28.0, description: 'Temp. max poulailler (°C)',      icon: Thermometer, color: '#0891b2', section: 'poultry' },
  { key: 'alert_check_interval_sec', value: 60,   description: 'Intervalle vérification (sec)',  icon: Clock,       color: '#6366f1', section: 'system' },
];

const SECTIONS = [
  { id: 'bee',     label: 'Abeilles',   emoji: '🐝', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'cow',     label: 'Bovins',     emoji: '🐄', color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'poultry', label: 'Volailles',  emoji: '🐔', color: '#0891b2', bg: '#e0f2fe' },
  { id: 'system',  label: 'Système',    emoji: '⚙️', color: '#6366f1', bg: '#eef2ff' },
];

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState({});
  const [farms, setFarms]       = useState([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [loading, setLoading]   = useState(true);
  const [activeSection, setActiveSection] = useState('bee');

  useEffect(() => {
    Promise.all([settingsAPI.list(), farmsAPI.list()]).then(([s, f]) => {
      const map = {};
      DEFAULT_SETTINGS.forEach(d => { map[d.key] = d.value; });
      s.data.forEach(item => { map[item.key] = item.value; });
      setSettings(map);
      setFarms(f.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(settings).map(([key, value]) =>
          settingsAPI.upsert({ key, value, description: DEFAULT_SETTINGS.find(d => d.key === key)?.description || '' })
        )
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const set = key => e => {
    const val = e.target.type === 'number' ? +e.target.value : e.target.value;
    setSettings(p => ({ ...p, [key]: val }));
  };

  if (loading) return <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><div className="spinner" /></div>;

  const rtl = i18n.language === 'ar';
  const sectionDefs = DEFAULT_SETTINGS.filter(d => d.section === activeSection);

  return (
    <>
      <Navbar
        title={t('settings.title', 'Paramètres')}
        subtitle={t('settings.notifications', 'Configuration des seuils et alertes')}
        actions={
          <button
            className="farms-hero-btn"
            onClick={handleSave}
            disabled={saving}
            style={saved ? { background: 'linear-gradient(135deg,#16a34a,#15803d)' } : {}}
          >
            {saved
              ? <><CheckCircle2 size={14} /> Enregistré !</>
              : saving
                ? <><span className="farms-spinner" /> Enregistrement…</>
                : <><Save size={14} /> {t('common.save', 'Enregistrer')}</>}
          </button>
        }
      />
      <div className="page-content" style={{ direction: rtl ? 'rtl' : 'ltr' }}>

        {/* ── Hero ── */}
        <div className="st-hero">
          <div className="st-hero-left">
            <div className="st-hero-eyebrow"><Settings2 size={11} /> CONFIGURATION SYSTÈME</div>
            <h1 className="st-hero-title">{t('settings.title', 'Paramètres & Seuils')}</h1>
            <p className="st-hero-sub">Calibration des capteurs · Alertes · {farms.length} ferme{farms.length !== 1 ? 's' : ''} connectée{farms.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="st-hero-kpis">
            {[
              { val: DEFAULT_SETTINGS.length, label: 'Seuils config.', color: '#4ade80',  icon: Settings2 },
              { val: farms.length,            label: 'Fermes',         color: '#60a5fa',  icon: Building2 },
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

        {saved && (
          <div className="st-saved-banner">
            <CheckCircle2 size={16} color="#16a34a" />
            Paramètres enregistrés avec succès !
          </div>
        )}

        {/* ── Layout ── */}
        <div className="st-layout">

          {/* Sidebar */}
          <div className="st-sidebar">
            {SECTIONS.map(s => (
              <button key={s.id}
                className={`st-nav-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => setActiveSection(s.id)}>
                <span className="st-nav-emoji" style={{ background: s.bg }}>{s.emoji}</span>
                <div className="st-nav-text">
                  <span className="st-nav-label" style={activeSection === s.id ? { color: s.color } : {}}>{s.label}</span>
                  <span className="st-nav-count">{DEFAULT_SETTINGS.filter(d => d.section === s.id).length} paramètres</span>
                </div>
                <ChevronRight size={14} color={activeSection === s.id ? s.color : '#cbd5e1'} />
              </button>
            ))}

            {/* Farms quick view */}
            <div className="st-sidebar-section-label">Fermes enregistrées</div>
            {farms.slice(0, 4).map(f => (
              <div key={f.id} className="st-farm-row">
                <span className="st-farm-dot"
                  style={{ background: f.status === 'active' ? '#22c55e' : f.status === 'maintenance' ? '#f59e0b' : '#94a3b8' }} />
                <span className="st-farm-name">{f.name}</span>
              </div>
            ))}
            {farms.length > 4 && (
              <div className="st-farm-more">+{farms.length - 4} autres</div>
            )}
          </div>

          {/* Main settings panel */}
          <div className="st-main">
            {(() => {
              const sec = SECTIONS.find(s => s.id === activeSection);
              return (
                <>
                  <div className="st-panel-header">
                    <div className="st-panel-icon" style={{ background: sec.bg, color: sec.color }}>
                      {sec.emoji}
                    </div>
                    <div>
                      <div className="st-panel-title">Seuils — {sec.label}</div>
                      <div className="st-panel-sub">{sectionDefs.length} paramètre{sectionDefs.length !== 1 ? 's' : ''} configurables</div>
                    </div>
                  </div>

                  <div className="st-fields">
                    {sectionDefs.map(def => {
                      const Icon = def.icon;
                      const currentVal = settings[def.key] ?? def.value;
                      const changed = currentVal !== def.value;
                      return (
                        <div key={def.key} className={`st-field ${changed ? 'modified' : ''}`}>
                          <div className="st-field-icon" style={{ background: `${def.color}15`, color: def.color }}>
                            <Icon size={16} />
                          </div>
                          <div className="st-field-body">
                            <label className="st-field-label">{def.description}</label>
                            <div className="st-field-key">{def.key.replace(/_/g, ' ')}</div>
                          </div>
                          <div className="st-field-right">
                            {changed && <span className="st-modified-dot" title="Valeur modifiée" />}
                            <input
                              className="st-field-input"
                              type="number"
                              step="0.1"
                              value={currentVal}
                              onChange={set(def.key)}
                              style={{ borderColor: changed ? def.color : undefined }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            {/* Farms table */}
            {activeSection === 'system' && farms.length > 0 && (
              <div className="st-farms-table-wrap">
                <div className="st-panel-header" style={{ marginTop: 32 }}>
                  <div className="st-panel-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div className="st-panel-title">{t('farms.title', 'Fermes enregistrées')}</div>
                    <div className="st-panel-sub">{farms.length} ferme{farms.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <table className="st-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>{t('farms.farm_name', 'Nom')}</th>
                      <th>{t('farms.location', 'Localisation')}</th>
                      <th>{t('common.status', 'Statut')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farms.map(f => (
                      <tr key={f.id}>
                        <td className="st-td-id">#{f.id}</td>
                        <td className="st-td-name">{f.name}</td>
                        <td className="st-td-loc">
                          <MapPin size={11} style={{ marginRight: 4 }} />
                          {f.location || '—'}
                        </td>
                        <td>
                          <span className={`badge badge-${f.status === 'active' ? 'success' : 'neutral'}`}>
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
