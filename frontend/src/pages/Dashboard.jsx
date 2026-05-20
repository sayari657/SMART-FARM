import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudRain, Sun, Wind, Cloud, Building2, PawPrint, AlertTriangle, AlertOctagon,
  Heart, Eye, Cpu, Zap, Flame, ShieldAlert, ShieldCheck, X,
  Activity, Droplets, Thermometer, ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import KPIBox from '../components/KPIBox';
import AlertCard from '../components/AlertCard';
import TelemetryChart from '../components/TelemetryChart';
import api, { dashboardAPI, alertsAPI, telemetryAPI, cvAPI, animalsAPI, farmsAPI, externalAPI } from '../services/api';
import AIScanner from '../components/AIScanner';
import ExpertAssistant from '../components/expert/ExpertAssistant';

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
  const [stats, setStats]         = useState(null);
  const [alerts, setAlerts]       = useState([]);
  const [cvEvents, setCvEvents]   = useState([]);
  const [recentTelemetry, setRT]  = useState([]);
  const [weather, setWeather]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [iotData, setIotData]     = useState({
    nodeA: { soil: 45.2, pressure: 0.5, flow: 12.8, temp: 23.4 },
    nodeB: { weight: 46.5, broodTemp: 34.8, extTemp: 28.2, extHum: 58.9 }
  });
  const [fireAlert, setFireAlert] = useState(null);
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

  /* ── IoT polling (unchanged) ─────────────────────────────────────── */
  useEffect(() => {
    const fetchIot = () => {
      api.get('/iot/latest')
        .then(res => { if (res.data?.nodeA && res.data?.nodeB) setIotData(res.data); })
        .catch(err => console.error('IoT fetch error:', err));
    };
    fetchIot();
    const interval = setInterval(fetchIot, 10000);
    return () => clearInterval(interval);
  }, []);

  /* ── Main data load (unchanged) ─────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      dashboardAPI.stats(),
      alertsAPI.list(),
      cvAPI.recent(10),
      animalsAPI.list(),
      farmsAPI.list()
    ]).then(([statsRes, alertsRes, cvRes, unitsRes, farmsRes]) => {
      setStats(statsRes.data);
      setAlerts((Array.isArray(alertsRes.data) ? alertsRes.data : []).slice(0, 5));
      setCvEvents((Array.isArray(cvRes.data) ? cvRes.data : []).slice(0, 6));
      const units = Array.isArray(unitsRes.data) ? unitsRes.data : [];
      if (units.length > 0) {
        telemetryAPI.history(units[0].id, 48).then(r => setRT(r.data));
      }
      const farmsList = Array.isArray(farmsRes.data) ? farmsRes.data : [];
      if (farmsList.length > 0) {
        externalAPI.weather.current(farmsList[0].id)
          .then(res => setWeather(res.data))
          .catch(err => console.log('Weather fetch error:', err));
        externalAPI.weather.forecast(farmsList[0].id)
          .then(res => { setWeather(prev => prev ? { ...prev, forecast: res.data } : null); })
          .catch(err => console.log('Forecast error:', err));
      }
    }).finally(() => setLoading(false));
  }, []);

  const SPECIES_COLORS = { bee: '#d97706', cow: '#7c3aed', poultry: '#0891b2', sheep: '#059669', goat: '#dc2626', rabbit: '#16a34a' };
  const SPECIES_EMOJI  = { bee: '🐝', cow: '🐄', poultry: '🐔', sheep: '🐑', goat: '🐐', rabbit: '🐰' };

  if (loading) return <div className="page-content"><div className="spinner" /></div>;

  const today            = new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const activeAlertsCount = alerts.filter(a => !a.is_resolved).length;
  const allOk             = activeAlertsCount === 0 && (stats?.critical_alerts || 0) === 0;

  /* ── IoT helpers ─────────────────────────────────────────────────── */
  const broodOk = iotData.nodeB.broodTemp >= 34 && iotData.nodeB.broodTemp <= 36;

  return (
    <>
      <Navbar title={t('dashboard.title')} subtitle={`${t('dashboard.subtitle')} • ${today}`} />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>

        {/* ═══════════════════════════════════════════════════════════
            HERO BANNER — new premium section
        ═══════════════════════════════════════════════════════════ */}
        <div className="dash-hero">
          <div className="dash-hero-row">
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
                    const activeRisks = [weather.risks?.heat_stress, weather.risks?.storm_risk, weather.risks?.drought_risk, weather.risks?.frost_risk].filter(Boolean).length;
                    const score = activeRisks === 0 ? 12 : activeRisks === 1 ? 52 : activeRisks === 2 ? 74 : 90;
                    return (
                      <div style={{ fontSize: 20, fontWeight: 800, color: score > 50 ? 'var(--color-critical)' : 'var(--color-accent)' }}>
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
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <KPIBox icon={Building2}     value={stats?.total_farms}     label={t('dashboard.kpi.total_farms')}     colorClass="green" />
          <KPIBox icon={PawPrint}      value={stats?.total_units}     label={t('dashboard.kpi.animal_units')}    colorClass="blue" />
          <KPIBox icon={AlertTriangle} value={stats?.active_alerts}   label={t('dashboard.kpi.active_alerts')}   colorClass="yellow" />
          <KPIBox icon={AlertOctagon}  value={stats?.critical_alerts} label={t('dashboard.kpi.critical_alerts')} colorClass="red" />
          <KPIBox icon={Heart}         value={stats?.avg_health_score} label={t('dashboard.kpi.health_score')}   colorClass="green" unit="%" />
          <KPIBox icon={Cpu}           value={stats?.recent_anomalies} label={t('dashboard.kpi.anomalies')}      colorClass="teal" />
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SOVEREIGN AI WIDGET (existing)
        ═══════════════════════════════════════════════════════════ */}
        {weather && (
          <div className="card" style={{ marginBottom: 28, background: 'var(--sidebar-bg)', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: 12, opacity: 0.06 }}>
              <Cpu size={120} />
            </div>
            <div style={{ padding: '24px 32px', position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--color-info)', padding: 8, borderRadius: 8 }}>
                  <Zap size={20} color="white" />
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('dashboard.sovereign_ai')}</h3>
                <span className="badge badge-info" style={{ background: 'rgba(59,130,246,.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,.3)' }}>
                  {t('dashboard.local_mllm_active')}
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 18, fontWeight: 600, margin: 0, lineHeight: 1.6, textAlign: 'right', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {loading ? t('dashboard.analyzing_data') : t('dashboard.derja_message')}
                </p>
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--sidebar-text)', display: 'flex', gap: 12 }}>
                <span>Source: RAG + Labess-7B</span>
                <span>•</span>
                <span>Context: UTAP Tunisian Beekeeping Guide</span>
              </div>
            </div>
          </div>
        )}

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
              { sp: 'bee',     label: 'Abeilles',  shadow: 'rgba(217,119,6,.45)',   grad: 'linear-gradient(145deg,#d97706,#b45309)' },
              { sp: 'cow',     label: 'Bovins',    shadow: 'rgba(124,58,237,.45)',  grad: 'linear-gradient(145deg,#7c3aed,#5b21b6)' },
              { sp: 'poultry', label: 'Volailles', shadow: 'rgba(8,145,178,.45)',   grad: 'linear-gradient(145deg,#0891b2,#0369a1)' },
              { sp: 'sheep',   label: 'Ovins',     shadow: 'rgba(5,150,105,.45)',   grad: 'linear-gradient(145deg,#059669,#047857)' },
              { sp: 'goat',    label: 'Caprins',   shadow: 'rgba(220,38,38,.45)',   grad: 'linear-gradient(145deg,#dc2626,#b91c1c)' },
              { sp: 'rabbit',  label: 'Lapins',    shadow: 'rgba(22,163,74,.45)',   grad: 'linear-gradient(145deg,#16a34a,#15803d)' },
            ].map(({ sp, label, shadow, grad }) => {
              const count = stats?.units_by_species?.[sp] || 0;
              const emoji = SPECIES_EMOJI[sp] || '🐾';
              return (
                <div
                  key={sp}
                  className="species-card-v2"
                  data-emoji={emoji}
                  onClick={() => navigate(SPECIES_ROUTES[sp])}
                  style={{ background: grad, boxShadow: `0 8px 28px ${shadow}` }}
                >
                  <div className="sv2-status">
                    <span className="sv2-dot" />
                    ONLINE
                  </div>
                  <div className="sv2-emoji">{emoji}</div>
                  <div className="sv2-count">{count}</div>
                  <div className="sv2-unit">unités</div>
                  <div className="sv2-name">{label}</div>
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
                emoji: '🍃',
                name: 'Maladies des Feuilles',
                desc: 'Haricot · Fraise · Tomate',
                color: '#16a34a',
                bg: '#dcfce7',
              },
              {
                emoji: '🍋',
                name: 'Maladies Citronnier',
                desc: 'Pathologies feuilles citron',
                color: '#ca8a04',
                bg: '#fef9c3',
              },
              {
                emoji: '🍊',
                name: "Maladies Oranger",
                desc: 'Pathologies feuilles orange',
                color: '#ea580c',
                bg: '#ffedd5',
              },
              {
                emoji: '🫒',
                name: "Maladies de l'Olivier",
                desc: "Œil de paon · Anthracnose · Psylle",
                color: '#d97706',
                bg: '#fef3c7',
              },
              {
                emoji: '🐛',
                name: 'Insectes & Ravageurs',
                desc: 'Légionnaire · Criocère · Riziculture',
                color: '#dc2626',
                bg: '#fee2e2',
              },
            ].map(({ emoji, name, desc, color, bg }) => (
              <div
                key={name}
                className="phyto-card-item"
                onClick={() => navigate('/trees')}
                style={{ '--phyto-accent': color }}
              >
                <div className="phyto-card-icon" style={{ background: bg }}>
                  {emoji}
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
        </div>

        {/* ═══════════════════════════════════════════════════════════
            AI SCANNER + SAFETY PROTOCOL (existing)
        ═══════════════════════════════════════════════════════════ */}
        <div className="grid-2-1" style={{ marginBottom: 28, gap: 24 }}>
          <AIScanner
            category="fire"
            title={t('dashboard.sovereign_emergency_monitor')}
            color="#ef4444"
            onAnalysisComplete={handleFireDetection}
          />

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
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/telemetry')}>{t('common.actions', 'Analysis')}</button>
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
      <ExpertAssistant species="fire" color="#ef4444" />
    </>
  );
}
