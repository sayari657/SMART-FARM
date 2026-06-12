import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudRain, Sun, Wind, Cloud, Building2, PawPrint, AlertTriangle, AlertOctagon,
  Heart, Eye, Cpu, Zap, Flame, ShieldAlert, ShieldCheck, X,
  Activity, Droplets, Thermometer, ArrowRight, Hexagon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import KPIBox from '../components/KPIBox';
import AlertCard from '../components/AlertCard';
import TelemetryChart from '../components/TelemetryChart';
import api, { dashboardAPI, alertsAPI, telemetryAPI, cvAPI, animalsAPI, externalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AIScanner       = lazy(() => import('../components/AIScanner'));
import PriceForecastCard from '../components/PriceForecastCard';
const ExpertAssistant = lazy(() => import('../components/expert/ExpertAssistant'));
import beeIconImg     from '../assets/bee/bee-icon.png';
import cowIconImg     from '../assets/cow/cow-icon.png';
import sheepIconImg   from '../assets/sheep/sheep-icon.png';
import goatIconImg    from '../assets/goat/goat-icon.png';
import poultryIconImg from '../assets/poultry/poultry-icon.png';
import rabbitIconImg  from '../assets/rabbit/rabbit-icon.png';
import dashHeroImg    from '../assets/dashboard-hero.jpg';
import agLeavesImg   from '../assets/agronomie/leaves.jpg';
import agLemonImg    from '../assets/agronomie/lemon.jpg';
import agOrangeImg   from '../assets/agronomie/orange.jpg';
import agOliveImg    from '../assets/agronomie/olive.jpg';
import agInsectsImg  from '../assets/agronomie/insects.jpg';

const SPECIES_IMG = {
  bee: beeIconImg, cow: cowIconImg, sheep: sheepIconImg,
  goat: goatIconImg, poultry: poultryIconImg, rabbit: rabbitIconImg,
};

const SPECIES_ROUTES = {
  bee:     '/aboutbee',
  cow:     '/aboutcow',
  poultry: '/aboutpoultry',
  sheep:   '/aboutsheep',
  goat:    '/aboutgoat',
  rabbit:  '/aboutrabbit',
};

/* ── Inline SVG ring gauge ─────────────────────────────────────────── */
function RingGauge({ value, max = 100, color = '#16a34a', size = 86, stroke = 7, label, unit = '', statusLabel, statusColor }) {
  const pct   = Math.min(Math.max((value || 0) / max, 0), 1);
  const r     = (size - stroke) / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = pct * circ;
  return (
    <div className="ring-gauge-wrap">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
            {value}{unit}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>
        {label}
      </div>
      {statusLabel && (
        <div style={{ fontSize: 9, fontWeight: 700, color: statusColor || color, textAlign: 'center' }}>
          {statusLabel}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { farmId } = useAuth();
  const [stats, setStats]         = useState(null);
  const [alerts, setAlerts]       = useState([]);
  const [cvEvents, setCvEvents]   = useState([]);
  const [recentTelemetry, setRT]  = useState([]);
  const [weather, setWeather]     = useState(null);
  const [loading, setLoading]     = useState(true);
  // BUG#9 FIXED: null = not yet loaded (shows spinner), 'error' = sensors offline
  const [iotData, setIotData]     = useState(null);
  const [iotError, setIotError]   = useState(false);
  const [fireAlert, setFireAlert] = useState(null);
  // IA Souveraine — dynamic Darija insight
  const [aiInsight, setAiInsight]   = useState(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const navigate = useNavigate();

  /* ── Fire detection handler ──────────────────────────────────────── */
  const handleFireDetection = useCallback(({ detections, imageUrl }) => {
    if (!detections?.length) return;
    const fireLabels = detections.filter(d =>
      d.label?.toLowerCase().includes('fire') ||
      d.label?.toLowerCase().includes('smoke') ||
      ['0', '1', '2', '3', '4'].includes(d.label)
    );
    if (!fireLabels.length) return;
    const isFire  = fireLabels.some(d => d.label?.toLowerCase().includes('fire') || ['0', '1', '2', '3', '4'].includes(d.label));
    const isSmoke = fireLabels.some(d => d.label?.toLowerCase().includes('smoke'));
    const maxConf = Math.round(Math.max(...fireLabels.map(d => d.confidence)) * 100);
    setFireAlert({ isFire, isSmoke, imageUrl, confidence: maxConf, timestamp: new Date() });
  }, []);

  /* ── IoT polling — BUG#9 FIXED: null initial state, UI error feedback ── */
  useEffect(() => {
    let cancelled = false;
    const fetchIot = () => {
      api.get('/iot/latest', { timeout: 5000 })
        .then(res => {
          if (cancelled) return;
          if (res.data?.nodeA && res.data?.nodeB) {
            setIotData(res.data);
            setIotError(false);
          } else {
            setIotError(true);
          }
        })
        .catch(() => {
          if (!cancelled) setIotError(true);
        });
    };
    fetchIot();
    const interval = setInterval(fetchIot, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  /* ── Main data load — all calls in parallel, non-blocking render ── */
  useEffect(() => {
    if (!farmId) { setLoading(false); return; }
    setLoading(true);

    // Priority 1 — critical path: stats + alerts (unblock hero/KPIs fast)
    dashboardAPI.stats(farmId)
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));   // hide spinner as soon as stats arrive

    alertsAPI.list(farmId)
      .then(r => setAlerts((Array.isArray(r.data) ? r.data : []).slice(0, 5)))
      .catch(() => {});

    // Priority 2 — secondary (non-blocking, each independent)
    cvAPI.recent(10, farmId)
      .then(r => setCvEvents((Array.isArray(r.data) ? r.data : []).slice(0, 6)))
      .catch(() => {});

    animalsAPI.list({ farm_id: farmId })
      .then(r => {
        const units = Array.isArray(r.data) ? r.data : [];
        if (units.length > 0) {
          telemetryAPI.history(units[0].id, 48)
            .then(tr => setRT(tr.data))
            .catch(() => {});
        }
      })
      .catch(() => {});

    // Priority 3 — external weather (slowest, fully independent)
    externalAPI.weather.current(farmId)
      .then(r => setWeather(r.data))
      .catch(() => {});
    externalAPI.weather.forecast(farmId)
      .then(r => setWeather(prev => prev ? { ...prev, forecast: r.data } : null))
      .catch(() => {});
  }, [farmId]);

  /* ── IA Souveraine — manual only, not auto-loaded on mount ── */
  const loadAiInsight = useCallback(() => {
    if (!farmId) return;
    setAiLoading(true);
    dashboardAPI.aiInsight(farmId)
      .then(res => setAiInsight(res.data))
      .catch(() => setAiInsight(null))
      .finally(() => setAiLoading(false));
  }, [farmId]);

  const SPECIES_COLORS = { bee: '#d97706', cow: '#7c3aed', poultry: '#0891b2', sheep: '#059669', goat: '#dc2626', rabbit: '#16a34a' };
  const SPECIES_EMOJI  = { bee: '🐝', cow: '🐄', poultry: '🐔', sheep: '🐑', goat: '🐐', rabbit: '🐰' };

  // No full-page block — page renders immediately with skeletons per section

  const today            = new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const activeAlertsCount = alerts.filter(a => !a.is_resolved).length;
  const allOk             = activeAlertsCount === 0 && (stats?.critical_alerts || 0) === 0;

  /* ── IoT helpers — BUG#9 FIXED: guard against null iotData ──────── */
  const broodOk = iotData ? (iotData.nodeB.broodTemp >= 34 && iotData.nodeB.broodTemp <= 36) : null;

  return (
    <>
      <Navbar title={t('dashboard.title')} subtitle={`${t('dashboard.subtitle')} • ${today}`} />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>

        {/* ═══════════════════════════════════════════════════════════
            HERO BANNER — new premium section
        ═══════════════════════════════════════════════════════════ */}
        <div className="dash-hero">
          {/* Watercolor hero image */}
          <img src={dashHeroImg} alt="" style={{
            position:'absolute', inset:0, width:'100%', height:'100%',
            objectFit:'cover', objectPosition:'center',
            pointerEvents:'none',
          }}/>
          {/* Overlay for legibility */}
          <div style={{
            position:'absolute', inset:0, pointerEvents:'none',
            background:'linear-gradient(120deg, rgba(8,40,16,.80) 0%, rgba(15,70,30,.65) 55%, rgba(20,100,45,.35) 100%)',
          }}/>
          <div className="dash-hero-row" style={{ position:'relative', zIndex:2, width:'100%' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>🌱</span>
                <h1 className="dash-hero-title">{t('dashboard.title', 'SmartFarm AI Dashboard')}</h1>
              </div>
              <p className="dash-hero-date">{today}</p>
              <div className="dash-hero-pills">
                <span className="dash-hero-pill">
                  <span className={`pulse-dot ${allOk ? 'green' : 'red'}`} />
                  {allOk ? t('dashboard.systems_ok', 'Systèmes OK') : t('dashboard.systems_alert', 'Alertes actives')}
                </span>
                {stats?.total_farms > 0 && (
                  <span className="dash-hero-pill">
                    <Building2 size={11} /> {stats.total_farms} {t('dashboard.kpi.total_farms', 'Fermes')}
                  </span>
                )}
                {stats?.total_units > 0 && (
                  <span className="dash-hero-pill">
                    <PawPrint size={11} /> {stats.total_units} {t('dashboard.kpi.animal_units', 'Animaux')}
                  </span>
                )}
                {stats?.avg_health_score !== undefined && (
                  <span className="dash-hero-pill">
                    <Heart size={11} /> {stats.avg_health_score}% {t('dashboard.kpi.health_score', 'Santé')}
                  </span>
                )}
                {activeAlertsCount > 0 && (
                  <span className="dash-hero-pill" style={{ background: 'rgba(239,68,68,.22)', borderColor: 'rgba(239,68,68,.4)' }}>
                    <AlertTriangle size={11} /> {activeAlertsCount} {t('dashboard.kpi.active_alerts', 'Alertes')}
                  </span>
                )}
              </div>
            </div>

            {weather && (
              <div className="dash-hero-weather">
                <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color: 'white' }}>{weather.temperature}°C</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 4 }}>
                  {weather.humidity}% · {weather.wind_speed} km/h
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>
                  {t('dashboard.weather_local', 'Météo Ferme')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            WEATHER WIDGET (existing)
        ═══════════════════════════════════════════════════════════ */}
        {weather && (
          <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, var(--color-accent-light) 0%, #bae6fd 100%)', border: '1px solid rgba(14,165,233,.2)' }}>
            <div className="weather-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <CloudRain size={40} color="var(--color-accent)" />
                <div>
                  <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0369a1', margin: 0 }}>{weather.temperature}°C</h3>
                  <p style={{ color: 'var(--color-accent)', margin: 0, fontWeight: 500 }}>{t('dashboard.weather_local', 'Local Farm Weather')}</p>
                </div>
              </div>
              <div className="weather-metrics">
                <div style={{ textAlign: 'center' }}>
                  <Cloud size={20} color="var(--color-accent)" style={{ margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{weather.humidity}% Hum</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Wind size={20} color="var(--color-accent)" style={{ margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{weather.wind_speed} km/h</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <CloudRain size={20} color="var(--color-accent)" style={{ margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{weather.precipitation !== undefined ? weather.precipitation : 0} mm</div>
                </div>
                <div style={{ textAlign: 'center', paddingLeft: 16, borderLeft: '1px solid rgba(14,165,233,.25)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase' }}>{t('dashboard.risk_score', 'Risk Score')}</div>
                  {(() => {
                    // BUG#13 FIXED: weighted risk score based on alert severity and active conditions
                    const risks = weather.risks || {};
                    let score = 0;
                    if (risks.heat_stress)  score += 30;
                    if (risks.storm_risk)   score += 40;
                    if (risks.drought_risk) score += 20;
                    if (risks.frost_risk)   score += 25;
                    // Cap at 100 and add base from active alerts
                    const alertBonus = Math.min(activeAlertsCount * 5, 20);
                    score = Math.min(score + alertBonus, 100);
                    return (
                      <div style={{ fontSize: 20, fontWeight: 800, color: score > 50 ? 'var(--color-critical)' : score > 25 ? '#f59e0b' : 'var(--color-accent)' }}>
                        {score}/100
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {(weather.risks?.heat_stress || weather.risks?.storm_risk) && (
              <div style={{ background: 'var(--color-critical-bg)', padding: '12px 24px', borderTop: '1px solid #fecaca', display: 'flex', gap: 12 }}>
                {weather.risks.heat_stress && <span className="badge badge-danger"><Sun size={14} style={{ marginRight: 4 }} /> Heat Stress Warning</span>}
                {weather.risks.storm_risk  && <span className="badge badge-danger"><CloudRain size={14} style={{ marginRight: 4 }} /> Storm Incoming</span>}
              </div>
            )}
          </div>
        )}

        {/* Today Forecast Widget (existing) */}
        {weather?.forecast?.hourly && (
          <div className="card" style={{ marginBottom: 28, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, ...(i18n.language === 'ar' ? { flexDirection: 'row-reverse', justifyContent: 'flex-start' } : {}) }}>
              <Wind size={16} /> {t('dashboard.forecast', 'Today Forecast (24h)')}
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {[8, 12, 16, 20, 23].map(hour => {
                const temp  = weather.forecast.hourly.temperature_2m[hour];
                const pluie = weather.forecast.hourly.precipitation[hour];
                return (
                  <div key={hour} style={{ flex: '0 0 auto', background: 'var(--color-bg)', padding: '10px 16px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 4 }}>{hour}:00</div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{temp}°C</div>
                    {pluie > 0 && <div style={{ fontSize: 10, color: 'var(--color-accent)', marginTop: 2 }}>{pluie} mm</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            KPI ROW (existing)
        ═══════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                height: 88, borderRadius: 14,
                background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
              }}/>
            ))}
          </div>
        ) : (
          <div className="kpi-grid" style={{ marginBottom: 24 }}>
            <KPIBox icon={Building2}     value={stats?.total_farms}                    label={t('dashboard.kpi.total_farms')}     colorClass="green" />
            <KPIBox icon={Hexagon}       value={stats?.units_by_species?.bee ?? 0}    label="Ruches"                             colorClass="yellow" />
            <KPIBox icon={PawPrint}      value={stats?.total_units}                   label={t('dashboard.kpi.animal_units')}    colorClass="blue" />
            <KPIBox icon={AlertTriangle} value={stats?.active_alerts}                 label={t('dashboard.kpi.active_alerts')}   colorClass="yellow" />
            <KPIBox icon={Heart}         value={stats?.avg_health_score}              label={t('dashboard.kpi.health_score')}    colorClass="green" unit="%" />
            <KPIBox icon={Cpu}           value={stats?.recent_anomalies}              label={t('dashboard.kpi.anomalies')}       colorClass="teal" />
          </div>
        )}
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

        {/* ═══════════════════════════════════════════════════════════
            SOVEREIGN AI WIDGET (existing)
        ═══════════════════════════════════════════════════════════ */}
        {/* IA Souveraine — dynamic Darija insight based on real farm data */}
        <div className="card" style={{ marginBottom: 28, background: 'var(--sidebar-bg)', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, padding: 12, opacity: 0.06 }}>
            <Cpu size={120} />
          </div>
          <div style={{ padding: '24px 32px', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'var(--color-info)', padding: 8, borderRadius: 8 }}>
                <Zap size={20} color="white" />
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('dashboard.sovereign_ai', 'IA Souveraine — Darija Tunisien')}</h3>
              <span className="badge badge-info" style={{ background: 'rgba(59,130,246,.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,.3)' }}>
                MLLM Local Actif
              </span>
              <button
                onClick={loadAiInsight}
                disabled={aiLoading}
                title="Régénérer l'analyse IA"
                style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, color: 'white', cursor: aiLoading ? 'wait' : 'pointer', padding: '5px 12px', fontSize: 12, fontWeight: 600 }}
              >
                {aiLoading ? '...' : '↻ Actualiser'}
              </button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.08)', minHeight: 70 }}>
              {aiLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,.6)' }}>
                  <div className="spinner" style={{ width: 16, height: 16, borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white' }} />
                  <span style={{ fontSize: 14 }}>Analyse de tes données en cours...</span>
                </div>
              ) : aiInsight?.text ? (
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, lineHeight: 1.7, textAlign: 'right', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif', color: 'white' }}>
                  {aiInsight.text}
                </p>
              ) : (
                <p style={{ fontSize: 14, margin: 0, color: 'rgba(255,255,255,.5)', fontStyle: 'italic' }}>
                  Clique sur Actualiser pour générer une analyse IA de ta ferme.
                </p>
              )}
            </div>

            <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,.5)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>Source: {aiInsight?.source || 'Groq / Labess-7B'}</span>
              <span>•</span>
              <span>
                {stats ? `${stats.total_units} animaux · ${stats.active_alerts} alertes · Santé ${stats.avg_health_score}%` : 'Données ferme chargées'}
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SUIVI DES ESPÈCES — v2 (redesign tendance)
        ═══════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 24 }}>
          <div className="species-section-header">
            <span className="species-section-title">
              {t('dashboard.species_monitor', 'Suivi des Espèces')}
            </span>
            <span className="species-section-count">
              <span className="pulse-dot green" />
              {Object.values(stats?.units_by_species || {}).reduce((a, b) => a + b, 0)} {t('dashboard.kpi.animal_units', 'unités actives')}
            </span>
          </div>

          <div className="species-grid-v2">
            {[
              { sp: 'bee',     label: 'Abeilles',  color: '#d97706', shadow: 'rgba(217,119,6,.35)'  },
              { sp: 'cow',     label: 'Bovins',    color: '#7c3aed', shadow: 'rgba(124,58,237,.35)' },
              { sp: 'poultry', label: 'Volailles', color: '#0891b2', shadow: 'rgba(8,145,178,.35)'  },
              { sp: 'sheep',   label: 'Ovins',     color: '#059669', shadow: 'rgba(5,150,105,.35)'  },
              { sp: 'goat',    label: 'Caprins',   color: '#dc2626', shadow: 'rgba(220,38,38,.35)'  },
              { sp: 'rabbit',  label: 'Lapins',    color: '#16a34a', shadow: 'rgba(22,163,74,.35)'  },
            ].map(({ sp, label, color, shadow }) => {
              const count      = stats?.units_by_species?.[sp] || 0;
              const speciesImg = SPECIES_IMG[sp];
              return (
                <div
                  key={sp}
                  onClick={() => navigate(SPECIES_ROUTES[sp])}
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    boxShadow: `0 8px 28px ${shadow}`,
                    minHeight: 176,
                    transition: 'transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s',
                    userSelect: 'none',
                    background: '#1a1a2e',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-7px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 20px 44px ${shadow}`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = `0 8px 28px ${shadow}`; }}
                >
                  {/* ── Full watercolor image banner ── */}
                  <div style={{ position: 'absolute', inset: 0 }}>
                    {speciesImg && (
                      <img
                        src={speciesImg}
                        alt={label}
                        style={{
                          width: '100%', height: '100%',
                          objectFit: 'cover', objectPosition: 'center',
                          display: 'block',
                        }}
                      />
                    )}
                    {/* dark gradient overlay — bottom-to-top for text readability */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `linear-gradient(
                        to bottom,
                        rgba(0,0,0,.08) 0%,
                        rgba(0,0,0,.10) 50%,
                        rgba(0,0,0,.72) 100%
                      )`,
                    }}/>
                    {/* colored accent glow at bottom edge */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
                      background: color,
                    }}/>
                  </div>

                  {/* ── Overlaid content ── */}
                  {/* ONLINE badge — top right */}
                  <div style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 2,
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,.25)',
                    borderRadius: 99, padding: '3px 9px',
                    fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: .6,
                    textTransform: 'uppercase',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80',
                      boxShadow: '0 0 6px #4ade80', display: 'inline-block' }}/>
                    LIVE
                  </div>

                  {/* Bottom info */}
                  <div style={{
                    position: 'absolute', bottom: 14, left: 14, right: 14, zIndex: 2,
                  }}>
                    {/* Count */}
                    <div style={{
                      fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1,
                      letterSpacing: -1, fontVariantNumeric: 'tabular-nums',
                      textShadow: '0 2px 8px rgba(0,0,0,.4)',
                    }}>{count}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,.65)', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: .8, marginTop: 1 }}>
                      {sp === 'bee' ? 'ruches' : 'unités'}
                    </div>

                    {/* Species name + color chip */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: 8, paddingTop: 8,
                      borderTop: '1px solid rgba(255,255,255,.2)' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#fff',
                        textTransform: 'uppercase', letterSpacing: .8 }}>{label}</span>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color,
                        boxShadow: `0 0 8px ${color}`, display: 'inline-block' }}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            PHYTO INTELLIGENCE — 5 diagnostic cards
        ═══════════════════════════════════════════════════════════ */}
        <div className="phyto-section">
          {/* Header */}
          <div className="phyto-section-header">
            <div>
              <div className="phyto-section-title">
                <span style={{ fontSize: 18 }}>🌿</span>
                Phyto Intelligence — Diagnostic Maladies
              </div>
              <div className="phyto-section-sub">
                YOLO v8 · Détection IA des pathologies et ravageurs agricoles
              </div>
            </div>
            <span className="phyto-badge">YOLO v8 · LIVE</span>
          </div>

          {/* 5 Cards */}
          <div className="phyto-cards-grid">
            {[
              {
                img: agLeavesImg,
                name: 'Maladies des Feuilles',
                desc: 'Haricot · Fraise · Tomate',
                color: '#16a34a',
                bg: '#dcfce7',
              },
              {
                img: agLemonImg,
                name: 'Maladies Citronnier',
                desc: 'Pathologies feuilles citron',
                color: '#ca8a04',
                bg: '#fef9c3',
              },
              {
                img: agOrangeImg,
                name: "Maladies Oranger",
                desc: 'Pathologies feuilles orange',
                color: '#ea580c',
                bg: '#ffedd5',
              },
              {
                img: agOliveImg,
                name: "Maladies de l'Olivier",
                desc: "Œil de paon · Anthracnose · Psylle",
                color: '#d97706',
                bg: '#fef3c7',
              },
              {
                img: agInsectsImg,
                name: 'Insectes & Ravageurs',
                desc: 'Légionnaire · Criocère · Riziculture',
                color: '#dc2626',
                bg: '#fee2e2',
              },
            ].map(({ img, name, desc, color, bg }) => (
              <div
                key={name}
                className="phyto-card-item"
                onClick={() => navigate('/trees')}
                style={{ '--phyto-accent': color }}
              >
                <div className="phyto-card-icon" style={{ background: bg, overflow:'hidden', padding:0 }}>
                  <img src={img} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
                </div>
                <div>
                  <div className="phyto-card-name">{name}</div>
                  <div className="phyto-card-desc">{desc}</div>
                </div>
                <button
                  className="phyto-card-action"
                  style={{ background: bg, color }}
                  onClick={e => { e.stopPropagation(); navigate('/trees'); }}
                >
                  Scanner
                  <ArrowRight size={9} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            IoT RING GAUGES — new visual layer
        ═══════════════════════════════════════════════════════════ */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={15} color="var(--color-accent)" />
                {t('dashboard.iot_trend', 'Télémesure IoT')} — Gauges
              </div>
              <div className="card-subtitle">{t('dashboard.iot_subtitle', 'Vue circulaire en temps réel')}</div>
            </div>
            <span className="live-badge">
              <span className="pulse-dot green" />
              LIVE
            </span>
          </div>

          {/* BUG#9 FIXED: show real states — loading / offline / live data */}
          {iotData === null && !iotError ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-3)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13 }}>Connexion aux capteurs IoT…</p>
            </div>
          ) : iotError && !iotData ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-3)' }}>
              <Activity size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>⚠️ Capteurs hors ligne — aucune donnée IoT disponible</p>
              <p style={{ fontSize: 11 }}>Vérifiez la connexion ESP32 / MQTT</p>
            </div>
          ) : iotData ? (
          <div className="iot-dual-layout">
            {/* Node A — Sol & Irrigation */}
            <div>
              <div className="node-label node-a">
                <Droplets size={13} />
                {t('dashboard.node_a', 'Node A — Sol & Irrigation')}
              </div>
              <div className="iot-gauges-row">
                <RingGauge
                  value={iotData.nodeA.soil} max={100} color="#0ea5e9"
                  label={t('dashboard.soil_humidity', 'Humidité Sol')} unit="%"
                  statusLabel={iotData.nodeA.soil < 35 ? t('dashboard.too_dry', 'Trop sec') : t('dashboard.normal', 'Normal')}
                  statusColor={iotData.nodeA.soil < 35 ? 'var(--color-critical)' : 'var(--color-success)'}
                />
                <RingGauge
                  value={iotData.nodeA.pressure} max={1.5} color="#6366f1"
                  label={t('dashboard.network_pressure', 'Pression')} unit=" MPa"
                  statusLabel={t('dashboard.nominal', 'Nominal')} statusColor="var(--color-success)"
                />
                <RingGauge
                  value={iotData.nodeA.flow} max={30} color="#22c55e"
                  label={t('dashboard.current_flow', 'Débit')} unit=" L/m"
                  statusLabel={iotData.nodeA.flow > 0 ? t('dashboard.irrigation_ok', 'Irrigation OK') : t('dashboard.standby', 'Veille')}
                  statusColor={iotData.nodeA.flow > 0 ? 'var(--color-success)' : 'var(--color-text-3)'}
                />
                <RingGauge
                  value={iotData.nodeA.temp} max={50} color="#f59e0b"
                  label={t('dashboard.soil_temp', 'Temp Sol')} unit="°C"
                  statusLabel={t('dashboard.ideal_roots', 'Racines OK')} statusColor="var(--color-success)"
                />
              </div>
            </div>

            {/* Node B — Ruche & Météo */}
            <div>
              <div className="node-label node-b">
                <Thermometer size={13} />
                {t('dashboard.node_b', 'Node B — Ruche & Météo')}
              </div>
              <div className="iot-gauges-row">
                <RingGauge
                  value={iotData.nodeB.weight} max={80} color="#d97706"
                  label={t('dashboard.hive_weight', 'Poids Ruche')} unit=" kg"
                  statusLabel={t('dashboard.stable', 'Stable')} statusColor="var(--color-success)"
                />
                <RingGauge
                  value={iotData.nodeB.broodTemp} max={45}
                  color={broodOk ? '#16a34a' : '#ef4444'}
                  label={t('dashboard.brood_temp', 'Temp Couvain')} unit="°C"
                  statusLabel={broodOk ? t('dashboard.optimal', 'Optimal') : t('dashboard.deregulation', 'Hors plage')}
                  statusColor={broodOk ? 'var(--color-success)' : 'var(--color-critical)'}
                />
                <RingGauge
                  value={iotData.nodeB.extTemp} max={50} color="#f97316"
                  label={t('dashboard.ext_temp', 'Temp Ext')} unit="°C"
                  statusLabel={t('dashboard.local_weather', 'Météo locale')} statusColor="var(--color-success)"
                />
                <RingGauge
                  value={iotData.nodeB.extHum} max={100} color="#0891b2"
                  label={t('dashboard.ext_hum', 'Hum Ext')} unit="%"
                  statusLabel={t('dashboard.optimal', 'Optimal')} statusColor="var(--color-success)"
                />
              </div>
            </div>
          </div>
          ) : null}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            PRIX MARCHÉ + PRÉVISION (historique réel, job quotidien)
        ═══════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 28 }}>
          <PriceForecastCard />
        </div>

        {/* ═══════════════════════════════════════════════════════════
            AI SCANNER + SAFETY PROTOCOL (existing)
        ═══════════════════════════════════════════════════════════ */}
        <div className="grid-2-1" style={{ marginBottom: 28, gap: 24 }}>
          <Suspense fallback={<div className="card" style={{ minHeight: 200, display:'flex', alignItems:'center', justifyContent:'center' }}><div className="spinner"/></div>}>
            <AIScanner
              category="fire"
              title={t('dashboard.sovereign_emergency_monitor')}
              color="#ef4444"
              onAnalysisComplete={handleFireDetection}
            />
          </Suspense>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={16} color="#ef4444" />
                <div className="card-title">{t('dashboard.safety_protocol', 'Protocole de Sécurité')}</div>
              </div>
              {fireAlert && (
                <button onClick={() => setFireAlert(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 4 }}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {fireAlert ? (
                <>
                  {/* Detection card */}
                  <div style={{
                    borderRadius: 12, overflow: 'hidden',
                    border: `2px solid ${fireAlert.isFire ? '#ef4444' : '#eab308'}`,
                    boxShadow: `0 6px 20px ${fireAlert.isFire ? 'rgba(239,68,68,0.18)' : 'rgba(234,179,8,0.18)'}`,
                    position: 'relative',
                  }}>
                    {/* Badge */}
                    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, background: fireAlert.isFire ? '#ef4444' : '#eab308', color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 900 }}>
                      {fireAlert.isFire ? 'INCENDIE' : 'FUMÉE'}
                    </div>
                    {/* Confidence badge */}
                    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 900 }}>
                      {fireAlert.confidence}%
                    </div>
                    {/* Image */}
                    {fireAlert.imageUrl
                      ? <img src={fireAlert.imageUrl} alt="Détection" style={{ width: '100%', height: 'clamp(140px,28vw,200px)', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ height: 140, background: 'linear-gradient(135deg,#000,#450a0a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Flame color="#ef4444" size={48} /></div>
                    }
                    {/* Info bar */}
                    <div style={{ padding: '10px 14px', background: fireAlert.isFire ? '#fef2f2' : '#fefce8' }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: fireAlert.isFire ? '#991b1b' : '#92400e' }}>
                        {fireAlert.isFire ? "🔥 Risque d'incendie détecté" : '💨 Présence de fumée'}
                      </div>
                      {/* Score bar */}
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', marginBottom: 3 }}>
                          <span>Score de confiance</span>
                          <span style={{ fontWeight: 800, color: fireAlert.isFire ? '#ef4444' : '#d97706' }}>{fireAlert.confidence}%</span>
                        </div>
                        <div style={{ height: 4, background: '#e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${fireAlert.confidence}%`, background: fireAlert.isFire ? '#ef4444' : '#eab308', borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                        {fireAlert.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-sm" onClick={() => setTimeout(() => navigate('/alerts'), 300)} style={{ background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 12 }}>
                    <AlertTriangle size={13} style={{ marginRight: 6 }} /> Voir le Centre d'Alertes
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--color-success)' }}>
                    <ShieldCheck size={16} />
                    {t('dashboard.fire_risk_low', 'Aucune menace détectée')}
                  </div>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--color-surface-2)', fontSize: 11, color: 'var(--color-text-3)', border: '1px solid var(--color-border-light)', lineHeight: 1.6 }}>
                    {t('dashboard.scanner_desc', "Analysez une image via le scanner à gauche. En cas de détection de feu ou de fumée, une alerte s'affichera ici avec l'image capturée.")}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            RECENT CV EVENTS (existing)
        ═══════════════════════════════════════════════════════════ */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{t('dashboard.recent_cv_detections')}</div>
                <div className="card-subtitle">{t('dashboard.latest_cv_events')}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/cv')}>{t('dashboard.view_all')}</button>
            </div>
            {cvEvents.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('dashboard.unit')}</th>
                      <th>{t('dashboard.class')}</th>
                      <th>{t('dashboard.confidence')}</th>
                      <th>{t('dashboard.severity')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cvEvents.map(ev => (
                      <tr key={ev.id}>
                        <td style={{ fontWeight: 600 }}>{ev.unit_name || `Unit ${ev.unit_id}`}</td>
                        <td><code style={{ background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{ev.object_class}</code></td>
                        <td>{(ev.confidence * 100).toFixed(0)}%</td>
                        <td>
                          <span className={`badge badge-${ev.severity === 'critical' ? 'danger' : ev.severity === 'warning' ? 'warning' : 'info'}`}>
                            {ev.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <Eye size={28} />
                <p>{t('dashboard.no_cv_events')}</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TELEMETRY TREND (existing)
        ═══════════════════════════════════════════════════════════ */}
        {recentTelemetry.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
              <div>
                <div className="card-title">{t('dashboard.telemetry_trend', 'Telemetry Trend (Last 48h)')}</div>
                <div className="card-subtitle">{t('dashboard.telemetry_subtitle', 'First monitored animal unit')}</div>
              </div>
            </div>
            <TelemetryChart records={recentTelemetry} height={220} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            ACTIVE ALERTS (existing)
        ═══════════════════════════════════════════════════════════ */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t('dashboard.active_alerts_title')}</div>
              <div className="card-subtitle">
                {alerts.filter(a => !a.is_resolved).length} {t('dashboard.requiring_attention')}
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/alerts')}>{t('dashboard.view_all')}</button>
          </div>
          {alerts.filter(a => !a.is_resolved).length > 0
            ? alerts.filter(a => !a.is_resolved).map(a => <AlertCard key={a.id} alert={a} />)
            : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <span style={{ fontSize: 32 }}>✅</span>
                <h3>{t('dashboard.no_active_alerts')}</h3>
                <p>{t('dashboard.all_clear')}</p>
              </div>
            )
          }
        </div>

      </div>
      <Suspense fallback={null}>
        <ExpertAssistant species="fire" color="#ef4444" />
      </Suspense>
    </>
  );
}
