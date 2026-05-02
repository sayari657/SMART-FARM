import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  RefreshCw, Wifi, WifiOff, Droplets, Gauge, Wind, Thermometer,
  Weight, AlertTriangle, CheckCircle, Activity, Cpu, ChevronDown
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import Navbar from '../components/Navbar';
import TelemetryChart from '../components/TelemetryChart';
import { animalsAPI, telemetryAPI, externalAPI } from '../services/api';

const IOT_LATEST  = '/api/v1/iot/latest';
const IOT_HISTORY = '/api/v1/iot/history?limit=60';
const POLL_MS     = 5000;
const MAX_PTS     = 40;

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n, dec = 1) { return typeof n === 'number' ? n.toFixed(dec) : '—'; }
function now_hhmm() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
}
function hist_hhmm(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return isNaN(d) ? ts.slice(11, 16) : `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
function Bar({ value, max, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .4s ease' }} />
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function Badge({ label, on, onColor = '#16a34a', offColor = '#94a3b8' }) {
  const active = on;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 10px',
      background: active ? `${onColor}18` : '#f1f5f9',
      color:      active ? onColor : offColor,
      border:     `1px solid ${active ? `${onColor}35` : '#e2e8f0'}`,
    }}>
      {active ? '● ' : '○ '}{label}
    </span>
  );
}

// ─── KPI tile inside a node card ──────────────────────────────────────────────
function KpiTile({ icon, label, value, unit, max, barColor, accent }) {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 10, padding: '12px 14px',
      border: '1px solid #e2e8f0', flex: 1, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ color: accent, display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
        {value}<span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginLeft: 3 }}>{unit}</span>
      </div>
      {max != null && <Bar value={parseFloat(value) || 0} max={max} color={barColor || accent} />}
    </div>
  );
}

// ─── Node Card ────────────────────────────────────────────────────────────────
function NodeCard({ title, emoji, accentColor, children, statusBadges, status }) {
  const statusColors = { ONLINE: '#16a34a', FALLBACK: '#d97706', OFFLINE: '#94a3b8' };
  const sc = statusColors[status] || '#94a3b8';
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
      overflow: 'hidden', flex: 1, minWidth: 0,
      boxShadow: '0 1px 6px rgba(0,0,0,.05)',
    }}>
      {/* Card header */}
      <div style={{
        background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
        borderBottom: `1px solid ${accentColor}20`,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{title}</div>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '4px 12px',
          background: `${sc}15`, color: sc, border: `1px solid ${sc}35`,
        }}>
          {status === 'ONLINE' ? '● ' : status === 'FALLBACK' ? '◑ ' : '○ '}{status || 'OFFLINE'}
        </span>
      </div>
      {/* Card body */}
      <div style={{ padding: '16px 18px' }}>
        {children}
        {statusBadges && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {statusBadges}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── IoT Nodes Tab ────────────────────────────────────────────────────────────
function IoTTab() {
  const [live, setLive]         = useState(null);
  const [histA, setHistA]       = useState([]);
  const [histB, setHistB]       = useState([]);
  const [liveHistA, setLiveA]   = useState([]);
  const [liveHistB, setLiveB]   = useState([]);
  const [lastTs, setLastTs]     = useState(null);
  const [online, setOnline]     = useState(null); // null=loading, true, false
  const [spinning, setSpinning] = useState(false);
  const timerRef = useRef(null);

  const fetchLive = useCallback(async () => {
    try {
      const res  = await fetch(IOT_LATEST);
      const data = await res.json();
      setLive(data);
      setOnline(true);
      setLastTs(now_hhmm());
      const ts = now_hhmm();
      setLiveA(prev => {
        const pt = { ts, ...data.nodeA };
        return [...prev, pt].slice(-MAX_PTS);
      });
      setLiveB(prev => {
        const pt = { ts, ...data.nodeB };
        return [...prev, pt].slice(-MAX_PTS);
      });
    } catch {
      setOnline(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res  = await fetch(IOT_HISTORY);
      const data = await res.json();
      if (data.nodeA?.length) {
        setHistA(data.nodeA.map(s => ({ ...s, ts: hist_hhmm(s.timestamp) })));
      }
      if (data.nodeB?.length) {
        setHistB(data.nodeB.map(s => ({ ...s, ts: hist_hhmm(s.timestamp) })));
      }
    } catch { /* silent */ }
  }, []);

  const refresh = useCallback(async () => {
    setSpinning(true);
    await Promise.all([fetchLive(), fetchHistory()]);
    setSpinning(false);
  }, [fetchLive, fetchHistory]);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(fetchLive, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchLive, refresh]);

  const nodeA = live?.nodeA || {};
  const nodeB = live?.nodeB || {};

  const chartDataA = liveHistA.length ? liveHistA : histA;
  const chartDataB = liveHistB.length ? liveHistB : histB;

  return (
    <div>
      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {online === null ? (
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Connexion...</span>
          ) : online ? (
            <><Wifi size={14} color="#16a34a" />
              <span style={{ color: '#15803d', fontSize: 13, fontWeight: 600 }}>Serveur IoT connecté</span></>
          ) : (
            <><WifiOff size={14} color="#94a3b8" />
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Backend IoT hors-ligne (démonstration)</span></>
          )}
          {lastTs && (
            <span style={{ fontSize: 11, color: '#cbd5e1', marginLeft: 6 }}>
              Màj {lastTs}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          style={{
            background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10,
            padding: '7px 14px', cursor: 'pointer', color: '#64748b',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
          }}
        >
          <RefreshCw size={13} style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* Node cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>

        {/* NODE A */}
        <NodeCard
          title="Node A — Irrigation"
          emoji="🌱"
          accentColor="#16a34a"
          status={nodeA.mode || 'OFFLINE'}
          statusBadges={[
            <Badge key="pump"  label="Pompe"  on={!!nodeA.pump}  onColor="#16a34a" />,
            <Badge key="valve" label="Vanne"  on={!!nodeA.valve} onColor="#2563eb" />,
            <Badge key="fault" label="Défaut" on={!!nodeA.fault} onColor="#ef4444" />,
          ]}
        >
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <KpiTile
              icon={<Droplets size={14} />}
              label="Humidité Sol"
              value={fmt(nodeA.soil)}
              unit="%"
              max={100}
              accent="#16a34a"
              barColor="#16a34a"
            />
            <KpiTile
              icon={<Gauge size={14} />}
              label="Pression"
              value={fmt(nodeA.pressure, 2)}
              unit="bar"
              max={12}
              accent="#2563eb"
              barColor="#2563eb"
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <KpiTile
              icon={<Wind size={14} />}
              label="Débit"
              value={fmt(nodeA.flow)}
              unit="L/min"
              max={30}
              accent="#0891b2"
              barColor="#0891b2"
            />
            <KpiTile
              icon={<Thermometer size={14} />}
              label="Temp Sol"
              value={fmt(nodeA.temp)}
              unit="°C"
              max={60}
              accent="#f97316"
              barColor="#f97316"
            />
          </div>
        </NodeCard>

        {/* NODE B */}
        <NodeCard
          title="Node B — Ruche Connectée"
          emoji="🐝"
          accentColor="#f59e0b"
          status="ONLINE"
          statusBadges={[
            <Badge key="therm" label="Température OK"
              on={nodeB.hive_temp >= 30 && nodeB.hive_temp <= 38}
              onColor="#16a34a" />,
            <Badge key="hum" label="Humidité OK"
              on={nodeB.ext_hum < 85}
              onColor="#2563eb" />,
          ]}
        >
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <KpiTile
              icon={<Weight size={14} />}
              label="Poids Ruche"
              value={fmt(nodeB.weight)}
              unit="kg"
              max={60}
              accent="#f59e0b"
              barColor="#f59e0b"
            />
            <KpiTile
              icon={<Thermometer size={14} />}
              label="Temp Interne"
              value={fmt(nodeB.hive_temp ?? nodeB.broodTemp)}
              unit="°C"
              max={50}
              accent="#ef4444"
              barColor={
                ((nodeB.hive_temp ?? nodeB.broodTemp) < 30 || (nodeB.hive_temp ?? nodeB.broodTemp) > 38)
                  ? '#ef4444' : '#16a34a'
              }
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <KpiTile
              icon={<Thermometer size={14} />}
              label="Temp Externe"
              value={fmt(nodeB.ext_temp ?? nodeB.extTemp)}
              unit="°C"
              max={50}
              accent="#64748b"
              barColor="#64748b"
            />
            <KpiTile
              icon={<Droplets size={14} />}
              label="Humidité Ext"
              value={fmt(nodeB.ext_hum ?? nodeB.extHum)}
              unit="%"
              max={100}
              accent="#3b82f6"
              barColor={(nodeB.ext_hum ?? nodeB.extHum) > 85 ? '#ef4444' : '#3b82f6'}
            />
          </div>
        </NodeCard>
      </div>

      {/* Live charts */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

        {/* Chart Node A */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          flex: 1, minWidth: 300, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} color="#16a34a" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Node A — Historique live</span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>{chartDataA.length} pts</span>
          </div>
          <div style={{ padding: '12px 8px 16px' }}>
            {chartDataA.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartDataA} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="ts" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="soil"     name="Sol %"      stroke="#16a34a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="pressure" name="Pression bar" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="flow"     name="Débit L/min" stroke="#0891b2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <Cpu size={32} color="#e2e8f0" />
                <span style={{ color: '#cbd5e1', fontSize: 13 }}>En attente des données Wokwi…</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart Node B */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          flex: 1, minWidth: 300, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} color="#f59e0b" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Node B — Historique live</span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>{chartDataB.length} pts</span>
          </div>
          <div style={{ padding: '12px 8px 16px' }}>
            {chartDataB.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartDataB} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="ts" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="weight"   name="Poids kg"    stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="hive_temp" name="Temp interne °C" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ext_hum"  name="Humidité ext %" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <Cpu size={32} color="#e2e8f0" />
                <span style={{ color: '#cbd5e1', fontSize: 13 }}>En attente des données Wokwi…</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info: how to use */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
        padding: '12px 16px', marginTop: 20,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.6 }}>
          <strong>Simulation Wokwi :</strong> ouvrez <code style={{ background: '#dcfce7', padding: '1px 5px', borderRadius: 4 }}>iot/node_a_pompe</code> et <code style={{ background: '#dcfce7', padding: '1px 5px', borderRadius: 4 }}>iot/node_b_rucher</code> dans VS Code avec l'extension Wokwi.
          Lancez aussi <code style={{ background: '#dcfce7', padding: '1px 5px', borderRadius: 4 }}>python iot/log_telemetry.py</code> pour collecter les données Serial → CSV → cette page.
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Unit Analysis Tab (existing logic) ───────────────────────────────────────
function UnitTab() {
  const [units, setUnits]      = useState([]);
  const [selectedId, setSelId] = useState('');
  const [records, setRecords]  = useState([]);
  const [latest, setLatest]    = useState(null);
  const [weather, setWeather]  = useState(null);
  const [loading, setLoading]  = useState(false);
  const [unit, setUnit]        = useState(null);

  useEffect(() => {
    animalsAPI.list().then(r => {
      setUnits(r.data);
      if (r.data.length > 0) setSelId(String(r.data[0].id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    const found = units.find(u => String(u.id) === selectedId);
    setUnit(found || null);
    Promise.all([telemetryAPI.history(selectedId, 200), telemetryAPI.latest(selectedId)])
      .then(([h, l]) => {
        setRecords(h.data);
        setLatest(l.data);
        if (found?.farm_id) {
          externalAPI.weather.current(found.farm_id)
            .then(wr => setWeather(wr.data))
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [selectedId, units]);

  const SPECIES_METRICS = {
    bee: ['temperature','humidity','hive_weight','sound_level'],
    cow: ['body_temperature','activity','rumination','milk_yield'],
    poultry: ['coop_temperature','humidity','ammonia','sound_level','bird_count'],
    default: [],
  };
  const metrics = SPECIES_METRICS[unit?.species] || SPECIES_METRICS.default;

  const iotTemp = latest?.metrics?.temperature ?? latest?.metrics?.body_temperature ?? latest?.metrics?.coop_temperature;
  const extTemp = weather?.temperature;
  const isAnomalous = iotTemp && extTemp && Math.abs(iotTemp - extTemp) > 15;

  return (
    <div>
      {/* Unit selector */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <label style={{ color: '#64748b', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Unité :</label>
        <select
          value={selectedId}
          onChange={e => setSelId(e.target.value)}
          style={{
            maxWidth: 320, padding: '8px 12px', borderRadius: 10,
            border: '1px solid #e2e8f0', background: '#fff',
            color: '#0f172a', fontSize: 13, outline: 'none',
          }}
        >
          {units.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.species} · {u.farm_name})</option>
          ))}
        </select>
      </div>

      {/* Climate comparison */}
      {iotTemp && extTemp && (
        <div style={{
          background: isAnomalous ? '#fef2f2' : '#fff',
          border: `1px solid ${isAnomalous ? '#fecaca' : '#e2e8f0'}`,
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
          display: 'flex', gap: 40, alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>
              🌡 IoT interne
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{iotTemp.toFixed(1)}°C</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, marginBottom: 4 }}>
              ☁ Open-Meteo extérieur
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0369a1' }}>{extTemp}°C</div>
          </div>
          {isAnomalous && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
              <AlertTriangle size={15} /> Écart anormal détecté
            </div>
          )}
        </div>
      )}

      {/* Latest metrics KPIs */}
      {unit && latest?.metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {Object.entries(latest.metrics).map(([k, v]) => (
            <div key={k} style={{
              background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'capitalize', marginBottom: 6 }}>
                {k.replace(/_/g, ' ')}
              </div>
              <div style={{ fontWeight: 800, fontSize: 22, color: '#0f172a' }}>
                {typeof v === 'number' ? v.toFixed(1) : v}
              </div>
              <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Temps réel</div>
            </div>
          ))}
        </div>
      )}

      {/* Trend chart */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Historique 200 derniers relevés</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{records.length} enregistrements</div>
          </div>
        </div>
        <div style={{ padding: '8px 0 4px' }}>
          {loading
            ? <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={20} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            : <TelemetryChart records={records} metrics={metrics} height={260} />
          }
        </div>
      </div>

      {/* Data table */}
      {records.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Tableau de données</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Horodatage</th>
                  {Object.keys(records[0]?.metrics || {}).map(k => (
                    <th key={k} style={{ padding: '10px 14px', textAlign: 'right', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textTransform: 'capitalize' }}>
                      {k.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 20).map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '9px 16px', color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {new Date(r.timestamp).toLocaleString('fr-FR')}
                    </td>
                    {Object.values(r.metrics).map((v, i) => (
                      <td key={i} style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                        {typeof v === 'number' ? v.toFixed(2) : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'iot',   label: '📡 Noeuds IoT',    sub: 'Node A · Node B · Wokwi' },
  { id: 'units', label: '🐾 Analyse Unités', sub: 'Capteurs par unité animale' },
];

export default function TelemetryAnalysis() {
  const [activeTab, setActiveTab] = useState('iot');

  return (
    <>
      <Navbar title="Télémétrie IoT" subtitle="Supervision temps réel — Wokwi ESP32 · Noeuds A & B" />

      <div className="page-content">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px', borderRadius: 12, cursor: 'pointer',
                  background: active ? '#0f172a' : '#fff',
                  border: `1px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                  color: active ? '#fff' : '#64748b',
                  fontWeight: 700, fontSize: 13,
                  transition: 'all .15s',
                }}
              >
                {tab.label}
                <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.6, marginTop: 1 }}>{tab.sub}</div>
              </button>
            );
          })}
        </div>

        {activeTab === 'iot'   && <IoTTab />}
        {activeTab === 'units' && <UnitTab />}
      </div>
    </>
  );
}
