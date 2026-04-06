import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import TelemetryChart from '../components/TelemetryChart';
import RiskGauge from '../components/RiskGauge';
import AlertCard from '../components/AlertCard';
import RecommendationPanel from '../components/RecommendationPanel';
import { animalsAPI, telemetryAPI, alertsAPI, anomalyAPI, recsAPI, cvAPI } from '../services/api';

const SPECIES_EMOJI = { bee:'🐝', cow:'🐄', poultry:'🐔', sheep:'🐑', goat:'🐐' };
const SPECIES_METRICS = {
  bee:     ['temperature','humidity','hive_weight','sound_level'],
  cow:     ['body_temperature','activity','rumination','milk_yield'],
  poultry: ['coop_temperature','humidity','ammonia','sound_level','bird_count'],
  sheep:   ['body_temperature','activity','respiratory_rate'],
  goat:    ['body_temperature','activity','milk_yield'],
};

export default function AnimalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [unit, setUnit]         = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [latest, setLatest]     = useState(null);
  const [alerts, setAlerts]     = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [recs, setRecs]         = useState([]);
  const [cvEvents, setCvEvents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('telemetry');

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

  if (loading) return <div className="page-content"><div className="spinner" /></div>;
  if (!unit)   return <div className="page-content"><p>Unit not found</p></div>;

  const species  = unit.species || 'bee';
  const metrics  = SPECIES_METRICS[species] || [];
  const emoji    = SPECIES_EMOJI[species] || '🐾';

  const TABS = [
    { id:'telemetry', label:'Telemetry' },
    { id:'anomalies', label:`Anomalies (${anomalies.length})` },
    { id:'cv',        label:`CV Events (${cvEvents.length})` },
    { id:'alerts',    label:`Alerts (${alerts.filter(a=>!a.is_resolved).length})` },
    { id:'recs',      label:`Recommendations (${recs.length})` },
  ];

  return (
    <>
      <Navbar
        title={`${emoji} ${unit.name}`}
        subtitle={`${unit.species_display || species} · ${unit.farm_name}`}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/animals')}>
            <ArrowLeft size={13} /> Back
          </button>
        }
      />
      <div className="page-content">

        {/* Header row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:24, marginBottom:24, alignItems:'start' }}>
          <div className="grid-3">
            {[
              { label:'Status',    value: <span className={`badge badge-${unit.status==='healthy'?'success':unit.status==='warning'?'warning':'danger'}`}>{unit.status}</span> },
              { label:'Identifier', value: unit.identifier || '—' },
              { label:'Farm',      value: unit.farm_name || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="card" style={{ padding:'14px 16px' }}>
                <div style={{ fontSize:11, color:'var(--color-text-3)', fontWeight:600, marginBottom:6 }}>{label}</div>
                <div style={{ fontWeight:700, fontSize:13 }}>{value}</div>
              </div>
            ))}
          </div>
          <RiskGauge score={unit.health_score || 0} label="Health Score" size={130} />
        </div>

        {/* Latest metrics */}
        {latest?.metrics && Object.keys(latest.metrics).length > 0 && (
          <div className="card" style={{ marginBottom:24 }}>
            <div className="card-title" style={{ marginBottom:16 }}>Latest Readings</div>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {Object.entries(latest.metrics).map(([k,v]) => (
                <div key={k} style={{ background:'var(--color-bg)', padding:'10px 16px', borderRadius:'var(--radius)', minWidth:120 }}>
                  <div style={{ fontSize:11, color:'var(--color-text-3)', marginBottom:4 }}>{k.replace(/_/g,' ')}</div>
                  <div style={{ fontWeight:700, fontSize:18 }}>{typeof v === 'number' ? v.toFixed(1) : v}</div>
                </div>
              ))}
            </div>
            {latest.timestamp && <div style={{ fontSize:11, color:'var(--color-text-3)', marginTop:10 }}>Last updated: {new Date(latest.timestamp).toLocaleString()}</div>}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:2, marginBottom:20, borderBottom:'1px solid var(--color-border)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background:'none', border:'none', padding:'10px 14px', cursor:'pointer', fontSize:13,
                fontWeight: tab===t.id ? 700 : 500,
                color: tab===t.id ? 'var(--color-primary)' : 'var(--color-text-2)',
                borderBottom: tab===t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {tab === 'telemetry' && (
          <div className="card">
            <div className="card-title" style={{ marginBottom:16 }}>Sensor History</div>
            <TelemetryChart records={telemetry} metrics={metrics} height={300}
              anomalyPoints={anomalies.map(a => ({ timestamp: a.timestamp }))} />
          </div>
        )}

        {tab === 'anomalies' && (
          anomalies.length > 0 ? (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Type</th><th>Severity</th><th>Score</th><th>Rules Triggered</th></tr></thead>
                  <tbody>
                    {anomalies.map(a => (
                      <tr key={a.id}>
                        <td style={{ whiteSpace:'nowrap' }}>{new Date(a.timestamp).toLocaleString()}</td>
                        <td style={{ fontWeight:600 }}>{a.anomaly_type.replace(/_/g,' ')}</td>
                        <td><span className={`badge badge-${a.severity==='critical'?'danger':'warning'}`}>{a.severity}</span></td>
                        <td style={{ fontFamily:'monospace' }}>{a.isolation_score?.toFixed(3)}</td>
                        <td>
                          <div className="tag-list">
                            {(a.rules_triggered||[]).map(r => <span key={r} className="tag">{r}</span>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <div className="empty-state"><span style={{fontSize:40}}>🔍</span><h3>No anomalies detected</h3></div>
        )}

        {tab === 'cv' && (
          cvEvents.length > 0 ? (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Detected Class</th><th>Confidence</th><th>Severity</th><th>Camera</th></tr></thead>
                  <tbody>
                    {cvEvents.map(ev => (
                      <tr key={ev.id}>
                        <td style={{ whiteSpace:'nowrap' }}>{new Date(ev.timestamp).toLocaleString()}</td>
                        <td><code style={{ background:'var(--color-bg)', padding:'2px 7px', borderRadius:4, fontSize:11 }}>{ev.object_class}</code></td>
                        <td>{(ev.confidence*100).toFixed(0)}%</td>
                        <td><span className={`badge badge-${ev.severity==='critical'?'danger':ev.severity==='warning'?'warning':'info'}`}>{ev.severity}</span></td>
                        <td style={{ color:'var(--color-text-3)', fontSize:12 }}>{ev.camera_id || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <div className="empty-state"><span style={{fontSize:40}}>📷</span><h3>No CV events</h3></div>
        )}

        {tab === 'alerts' && (
          alerts.filter(a=>!a.is_resolved).length > 0
            ? alerts.filter(a=>!a.is_resolved).map(a => <AlertCard key={a.id} alert={a} />)
            : <div className="empty-state"><span style={{fontSize:32}}>✅</span><h3>No active alerts</h3></div>
        )}

        {tab === 'recs' && (
          recs.length > 0
            ? recs.map(r => <RecommendationPanel key={r.id} rec={r} />)
            : <div className="empty-state"><span style={{fontSize:32}}>💡</span><h3>No recommendations</h3></div>
        )}
      </div>
    </>
  );
}
