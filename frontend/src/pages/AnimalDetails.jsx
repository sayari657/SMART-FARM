import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Activity, MapPin, Shield, AlertTriangle,
  Eye, Lightbulb, Cpu, Clock,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import TelemetryChart from '../components/TelemetryChart';
import RiskGauge from '../components/RiskGauge';
import AlertCard from '../components/AlertCard';
import RecommendationPanel from '../components/RecommendationPanel';
import { animalsAPI, telemetryAPI, alertsAPI, anomalyAPI, recsAPI, cvAPI } from '../services/api';

const SPECIES_EMOJI  = { bee: '🐝', cow: '🐄', poultry: '🐔', sheep: '🐑', goat: '🐐', rabbit: '🐰' };
const SPECIES_COLORS = { bee: '#d97706', cow: '#7c3aed', poultry: '#0891b2', sheep: '#059669', goat: '#dc2626', rabbit: '#16a34a' };
const SPECIES_DARK   = { bee: '#92400e', cow: '#5b21b6', poultry: '#075985', sheep: '#166534', goat: '#991b1b', rabbit: '#14532d' };
const SPECIES_METRICS = {
  bee:     ['temperature', 'humidity', 'hive_weight', 'sound_level'],
  cow:     ['body_temperature', 'activity', 'rumination', 'milk_yield'],
  poultry: ['coop_temperature', 'humidity', 'ammonia', 'sound_level', 'bird_count'],
  sheep:   ['body_temperature', 'activity', 'respiratory_rate'],
  goat:    ['body_temperature', 'activity', 'milk_yield'],
};
const CLASS_EMOJI = {
  feuille_saine: '🍃', mildiou: '🍂', alternaria: '🍁', anthracnose: '🔴',
  citronnier_sain: '🍋', olivier_sain: '🫒', oranger_sain: '🍊',
  insecte: '🦗', acarien: '🕷', cochenille: '🔴',
};

export default function AnimalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [unit, setUnit]           = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [latest, setLatest]       = useState(null);
  const [alerts, setAlerts]       = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [recs, setRecs]           = useState([]);
  const [cvEvents, setCvEvents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('telemetry');

  useEffect(() => {
    Promise.all([
      animalsAPI.get(id),
      telemetryAPI.history(id, 100),
      telemetryAPI.latest(id),
      alertsAPI.list(),
      anomalyAPI.byUnit(id),
      recsAPI.byUnit(id),
      cvAPI.byUnit(id, 20),
    ]).then(([uRes, tRes, lRes, aRes, anRes, rRes, cvRes]) => {
      setUnit(uRes.data);
      setTelemetry(tRes.data);
      setLatest(lRes.data);
      setAlerts(aRes.data.filter(a => a.unit_id === +id));
      setAnomalies(anRes.data);
      setRecs(rRes.data);
      setCvEvents(cvRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
      <div className="spinner" />
    </div>
  );
  if (!unit) return <div className="page-content"><p>Animal introuvable.</p></div>;

  const species = unit.species || 'bee';
  const metrics = SPECIES_METRICS[species] || [];
  const emoji   = SPECIES_EMOJI[species] || '🐾';
  const spColor = SPECIES_COLORS[species] || '#16a34a';
  const spDark  = SPECIES_DARK[species] || '#166534';

  const activeAlerts = alerts.filter(a => !a.is_resolved);

  const TABS = [
    { id: 'telemetry', label: 'Télémesure',         icon: Activity,      count: null },
    { id: 'anomalies', label: 'Anomalies',           icon: AlertTriangle, count: anomalies.length },
    { id: 'cv',        label: 'Vision Ordinateur',   icon: Eye,           count: cvEvents.length },
    { id: 'alerts',    label: 'Alertes actives',     icon: Shield,        count: activeAlerts.length },
    { id: 'recs',      label: 'Recommandations',     icon: Lightbulb,     count: recs.length },
  ];

  return (
    <>
      <Navbar
        title={`${emoji} ${unit.name}`}
        subtitle={`${unit.species_display || species} · ${unit.farm_name}`}
        actions={
          <button className="farms-hero-btn" onClick={() => navigate('/animals')}
            style={{ background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(8px)' }}>
            <ArrowLeft size={13} /> Retour
          </button>
        }
      />
      <div className="page-content">

        {/* ── Hero ── */}
        <div className="ad-hero" style={{ background: `linear-gradient(135deg, ${spDark}, ${spColor}, ${spColor}cc)` }}>
          <div className="ad-hero-left">
            <div className="ad-hero-eyebrow" style={{ color: 'rgba(255,255,255,.75)' }}>
              <Cpu size={11} /> DOSSIER ANIMAL · MONITORING TEMPS RÉEL
            </div>
            <div className="ad-hero-name">
              <span style={{ fontSize: 42, lineHeight: 1 }}>{emoji}</span>
              <div>
                <h1 className="ad-hero-title">{unit.name}</h1>
                <p className="ad-hero-sub">{unit.species_display || species} · Ferme : {unit.farm_name}</p>
              </div>
            </div>
          </div>
          <div className="ad-hero-right">
            <RiskGauge score={unit.health_score || 0} label="Santé" size={110} />
          </div>
        </div>

        {/* ── KPI strip ── */}
        <div className="ad-kpi-strip">
          {[
            { val: unit.identifier || '—', label: 'Identifiant', color: spColor },
            { val: unit.status || '—',     label: 'Statut',      color: unit.status === 'healthy' ? '#15803d' : unit.status === 'critical' ? '#dc2626' : '#d97706' },
            { val: unit.farm_name || '—',  label: 'Ferme',       color: '#374151' },
            { val: activeAlerts.length,    label: 'Alertes',     color: '#dc2626' },
            { val: anomalies.length,       label: 'Anomalies',   color: '#d97706' },
          ].map(({ val, label, color }) => (
            <div key={label} className="ad-kpi">
              <div className="ad-kpi-val" style={{ color }}>{val}</div>
              <div className="ad-kpi-label">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Latest sensor readings ── */}
        {latest?.metrics && Object.keys(latest.metrics).length > 0 && (
          <div className="ad-metrics-card">
            <div className="ad-metrics-header">
              <Activity size={14} color={spColor} />
              <span>Dernières mesures capteurs</span>
              {latest.timestamp && (
                <span className="ad-metrics-ts">
                  <Clock size={10} /> {new Date(latest.timestamp).toLocaleString()}
                </span>
              )}
            </div>
            <div className="ad-metrics-grid">
              {Object.entries(latest.metrics).map(([k, v]) => (
                <div key={k} className="ad-metric-tile">
                  <div className="ad-metric-key">{k.replace(/_/g, ' ')}</div>
                  <div className="ad-metric-val" style={{ color: spColor }}>
                    {typeof v === 'number' ? v.toFixed(1) : v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="ad-tabs">
          {TABS.map(t => (
            <button key={t.id}
              className={`ad-tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
              style={tab === t.id ? { color: spColor, borderBottomColor: spColor } : {}}>
              <t.icon size={13} />
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className="ad-tab-count" style={{ background: spColor }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Telemetry ── */}
        {tab === 'telemetry' && (
          <div className="ad-panel-card">
            <div className="ad-panel-title">Historique capteurs</div>
            <TelemetryChart records={telemetry} metrics={metrics} height={300}
              anomalyPoints={anomalies.map(a => ({ timestamp: a.timestamp }))} />
          </div>
        )}

        {/* ── Anomalies ── */}
        {tab === 'anomalies' && (
          anomalies.length > 0 ? (
            <div className="ad-panel-card">
              <div className="ad-panel-title">Anomalies détectées</div>
              <div className="cv-table-wrap">
                <table className="cv-table">
                  <thead>
                    <tr>
                      <th>Horodatage</th><th>Type</th><th>Sévérité</th>
                      <th>Score</th><th>Règles déclenchées</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map(a => (
                      <tr key={a.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{new Date(a.timestamp).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{a.anomaly_type.replace(/_/g, ' ')}</td>
                        <td>
                          <span className={`badge badge-${a.severity === 'critical' ? 'danger' : 'warning'}`}>{a.severity}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.isolation_score?.toFixed(3)}</td>
                        <td>
                          <div className="tag-list">
                            {(a.rules_triggered || []).map(r => <span key={r} className="tag">{r}</span>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="al-empty">
              <span style={{ fontSize: 40 }}>🔍</span>
              <h3>Aucune anomalie détectée</h3>
            </div>
          )
        )}

        {/* ── CV Events ── */}
        {tab === 'cv' && (
          cvEvents.length > 0 ? (
            <div className="ad-panel-card">
              <div className="ad-panel-title">Événements Vision par Ordinateur</div>
              <div className="cv-table-wrap">
                <table className="cv-table">
                  <thead>
                    <tr>
                      <th>Horodatage</th><th>Classe détectée</th><th>Confiance</th>
                      <th>Sévérité</th><th>Caméra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cvEvents.map(ev => (
                      <tr key={ev.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{new Date(ev.timestamp).toLocaleString()}</td>
                        <td>
                          <span className="cv-class-chip" style={{ background: 'rgba(14,165,233,.08)', color: '#0369a1' }}>
                            {CLASS_EMOJI[ev.object_class] || '🔍'} {ev.object_class}
                          </span>
                        </td>
                        <td>{(ev.confidence * 100).toFixed(0)}%</td>
                        <td>
                          <span className={`badge badge-${ev.severity === 'critical' ? 'danger' : ev.severity === 'warning' ? 'warning' : 'info'}`}>
                            {ev.severity}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text-3)', fontSize: 12 }}>{ev.camera_id || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="al-empty"><span style={{ fontSize: 40 }}>📷</span><h3>Aucun événement CV</h3></div>
          )
        )}

        {/* ── Alerts ── */}
        {tab === 'alerts' && (
          activeAlerts.length > 0
            ? activeAlerts.map(a => <AlertCard key={a.id} alert={a} />)
            : <div className="al-empty"><span style={{ fontSize: 32 }}>✅</span><h3>Aucune alerte active</h3></div>
        )}

        {/* ── Recommendations ── */}
        {tab === 'recs' && (
          recs.length > 0
            ? recs.map(r => <RecommendationPanel key={r.id} rec={r} />)
            : <div className="al-empty"><span style={{ fontSize: 32 }}>💡</span><h3>Aucune recommandation</h3></div>
        )}

      </div>
    </>
  );
}
