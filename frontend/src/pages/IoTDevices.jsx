import React, { useEffect, useState, useRef } from 'react';
import {
  Wifi, WifiOff, Plus, Edit2, Trash2, RefreshCw,
  Cpu, Thermometer, Droplets, Scale, Camera, Radio,
  Signal, MapPin, Hash, Activity, X, Check,
  BarChart3, Gauge, Bug, AlertTriangle, Waves,
  Play, Pause, Power, RotateCcw, Battery, Volume2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { alertsAPI } from '../services/api';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

/* ── Design System ────────────────────────────────────────────────────── */
const T = {
  bg:      '#f8fafc',
  surface: '#ffffff',
  card:    '#ffffff',
  raised:  '#f1f5f9',
  border:  '#e2e8f0',
  muted:   '#94a3b8',
  dim:     '#64748b',
  sub:     '#475569',
  text:    '#0f172a',
  white:   '#ffffff',
  primary: '#4f46e5',
  green:   '#10b981',
  red:     '#ef4444',
  amber:   '#f59e0b',
  sky:     '#06b6d4',
  purple:  '#8b5cf6',
  indigo:  '#4f46e5',
};

const TYPE_META = {
  temperature: { icon: Thermometer, color: '#ef4444', label: 'Température' },
  humidity:    { icon: Droplets,    color: '#06b6d4', label: 'Humidité'    },
  weight:      { icon: Scale,       color: '#f59e0b', label: 'Poids'       },
  camera:      { icon: Camera,      color: '#8b5cf6', label: 'Caméra'      },
  mqtt_node:   { icon: Radio,       color: '#10b981', label: 'Nœud MQTT'   },
  default:     { icon: Cpu,         color: '#4f46e5', label: 'Générique'   },
};

const getType = (t) => TYPE_META[t] || TYPE_META.default;

/* ── KPI Tile ─────────────────────────────────────────────────────────── */
function KpiTile({ label, value, color, icon: Icon }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.white, borderRadius: 14, padding: '16px 18px',
        border: `1px solid ${hov ? color + '45' : T.border}`,
        boxShadow: hov ? `0 8px 24px ${color}12` : '0 1px 4px rgba(0,0,0,.05)',
        transform: hov ? 'translateY(-2px)' : 'none', transition: 'all .2s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ background: `${color}12`, borderRadius: 8, padding: 6 }}>
          <Icon size={12} color={color}/>
        </div>
        <span style={{ fontSize: 9, color: T.muted, fontWeight: 700, letterSpacing: .6, textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

/* ── Device Modal ─────────────────────────────────────────────────────── */
function DeviceModal({ device, onClose, onSave, farmId }) {
  const [form, setForm] = useState(
    device || { sensor_type: 'temperature', sensor_id: '', label: '', location: '', mqtt_topic: '', farm_id: farmId }
  );
  const [saving, setSaving] = useState(false);
  const isEdit = !!device;

  const save = async () => {
    if (!form.sensor_id) { toast.error('ID capteur requis'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/iot/devices/${device.id}`, form);
      } else {
        await api.post('/iot/devices', { ...form, farm_id: farmId });
      }
      toast.success(isEdit ? 'Capteur mis à jour' : 'Capteur ajouté');
      onSave(); onClose();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
    finally { setSaving(false); }
  };

  const inp = {
    width: '100%', padding: '9px 12px', background: T.raised,
    border: `1px solid ${T.border}`, borderRadius: 9, color: T.text,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif',
    transition: 'border-color .15s',
  };

  const Field = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 20, padding: '28px 28px 24px', width: 460, maxWidth: '94vw', boxShadow: '0 24px 64px rgba(0,0,0,.14)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0 }}>
              {isEdit ? 'Modifier le capteur' : 'Ajouter un capteur IoT'}
            </h3>
            <p style={{ fontSize: 12, color: T.muted, margin: '3px 0 0' }}>
              {isEdit ? `ID: ${device.sensor_id}` : 'Configurer un nouveau device connecté'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: T.raised, border: 'none', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: T.dim, display: 'flex', alignItems: 'center' }}>
            <X size={15}/>
          </button>
        </div>

        {/* Type selector */}
        <Field label="Type de capteur">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
            {Object.entries(TYPE_META).filter(([k]) => k !== 'default').map(([k, meta]) => {
              const Icon = meta.icon;
              const active = form.sensor_type === k;
              return (
                <button key={k} onClick={() => setForm(f => ({ ...f, sensor_type: k }))}
                  style={{
                    padding: '9px 4px', borderRadius: 10, border: `1px solid ${active ? meta.color : T.border}`,
                    background: active ? `${meta.color}12` : T.raised,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    transition: 'all .15s',
                  }}>
                  <Icon size={15} color={active ? meta.color : T.muted}/>
                  <span style={{ fontSize: 9, fontWeight: 700, color: active ? meta.color : T.muted, textTransform: 'uppercase', letterSpacing: .4 }}>
                    {k.replace('_', ' ')}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="ID Hardware *">
            <input style={inp} value={form.sensor_id || ''} placeholder="ex: NODE_A"
              onChange={e => setForm(f => ({ ...f, sensor_id: e.target.value }))}
              onFocus={e => e.target.style.borderColor = T.indigo}
              onBlur={e => e.target.style.borderColor = T.border}/>
          </Field>
          <Field label="Label affiché">
            <input style={inp} value={form.label || ''} placeholder="ex: Capteur Stable"
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              onFocus={e => e.target.style.borderColor = T.indigo}
              onBlur={e => e.target.style.borderColor = T.border}/>
          </Field>
        </div>

        <Field label="Emplacement">
          <input style={inp} value={form.location || ''} placeholder="ex: Stable Nord"
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            onFocus={e => e.target.style.borderColor = T.indigo}
            onBlur={e => e.target.style.borderColor = T.border}/>
        </Field>

        <Field label="Topic MQTT (optionnel)">
          <input style={{ ...inp, fontFamily: 'monospace' }} value={form.mqtt_topic || ''} placeholder="auto-généré si vide"
            onChange={e => setForm(f => ({ ...f, mqtt_topic: e.target.value }))}
            onFocus={e => e.target.style.borderColor = T.indigo}
            onBlur={e => e.target.style.borderColor = T.border}/>
        </Field>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', background: T.raised, border: `1px solid ${T.border}`, borderRadius: 9, color: T.dim, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Annuler
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding: '9px 22px', background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})`, border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(79,70,229,.35)' }}>
            {saving ? <RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }}/> : <Check size={13}/>}
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Device Card ──────────────────────────────────────────────────────── */
function DeviceCard({ d, onEdit, onDelete }) {
  const { icon: Icon, color, label } = getType(d.sensor_type);
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.white, borderRadius: 16,
        border: `1px solid ${hov ? color + '45' : T.border}`,
        padding: '18px 18px 14px',
        boxShadow: hov ? `0 8px 24px ${color}12` : '0 1px 4px rgba(0,0,0,.05)',
        transform: hov ? 'translateY(-2px)' : 'none',
        transition: 'all .2s', position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Color accent line top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '16px 16px 0 0' }}/>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ background: `${color}12`, borderRadius: 10, padding: 9 }}>
          <Icon size={18} color={color}/>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={() => onEdit(d)}
            style={{ padding: '5px 7px', background: `${T.indigo}10`, border: `1px solid ${T.indigo}20`, borderRadius: 7, cursor: 'pointer', color: T.indigo, display: 'flex', alignItems: 'center', transition: 'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = `${T.indigo}18`}
            onMouseLeave={e => e.currentTarget.style.background = `${T.indigo}10`}>
            <Edit2 size={11}/>
          </button>
          <button onClick={() => onDelete(d.id)}
            style={{ padding: '5px 7px', background: `${T.red}10`, border: `1px solid ${T.red}20`, borderRadius: 7, cursor: 'pointer', color: T.red, display: 'flex', alignItems: 'center', transition: 'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = `${T.red}18`}
            onMouseLeave={e => e.currentTarget.style.background = `${T.red}10`}>
            <Trash2 size={11}/>
          </button>
        </div>
      </div>

      {/* Type badge */}
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 800, color, background: `${color}12`, border: `1px solid ${color}25`, padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: .5 }}>
          {label}
        </span>
      </div>

      {/* Name */}
      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2, lineHeight: 1.3 }}>
        {d.label || d.sensor_id}
      </div>
      <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace', marginBottom: 8 }}>
        {d.sensor_id}
      </div>

      {/* Location */}
      {d.location && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.dim, marginBottom: 4 }}>
          <MapPin size={10} color={T.muted}/> {d.location}
        </div>
      )}

      {/* MQTT topic */}
      {d.mqtt_topic && (
        <div style={{ fontSize: 10, color: T.muted, fontFamily: 'monospace', background: T.raised, padding: '4px 8px', borderRadius: 6, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {d.mqtt_topic}
        </div>
      )}

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
        {d.is_active
          ? <><div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, animation: 'livePulse 2s infinite' }}/><span style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>En ligne</span></>
          : <><WifiOff size={11} color={T.red}/><span style={{ fontSize: 11, color: T.red, fontWeight: 600 }}>Hors-ligne</span></>}
        {d.last_seen && (
          <span style={{ fontSize: 10, color: T.muted, marginLeft: 'auto' }}>
            {new Date(d.last_seen).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/* ── Enterprise live control dashboard (SCADA-style) ──────────────────────── */
const SEV = { ok: '#10b981', info: '#64748b', warn: '#f59e0b', danger: '#ef4444' };
const HISTN = 50;
const fmtHour = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
const fmtNum = (v, d = 1) => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

const realHour = () => { const n = new Date(); return n.getHours() + n.getMinutes() / 60 + n.getSeconds() / 3600; };
const simInit = () => ({
  hour: realHour(), dateKey: '', timeStr: '', dateStr: '', mode: 'auto', valve: false, pump: false,
  soil: 26, soilTemp: 17, flow: 0, pressure: 0, pumpW: 0,
  leak: false, dryPump: false, leakAlerted: false, dryAlerted: false,
  weight: 38.0, soundHz: 210, sound: 'normal', soundTicks: 0, brood: 35.0, broodAlerted: false,
  battery: 12.3, battAlerted: false, lastStart: -10, mielleeTicks: 0, rainTicks: 0,
  waterToday: 0, cyclesToday: 0, mqtt: 0, ticks: 0, watering: false,
  hist: { soil: [], soilTemp: [], flow: [], pressure: [], weight: [], brood: [], soundHz: [], battery: [] },
});

function Sparkline({ data, color, w = 132, h = 34 }) {
  if (!data || data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data), max = Math.max(...data), rng = (max - min) || 1;
  const step = w / (data.length - 1);
  const y = (v) => h - ((v - min) / rng) * (h - 6) - 3;
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  const lx = (data.length - 1) * step, ly = y(data[data.length - 1]);
  const gid = 'sg' + color.replace('#', '');
  return (
    <svg width={w} height={h} style={{ display: 'block' }} preserveAspectRatio="none">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.22" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.4" fill={color} />
    </svg>
  );
}

function Metric({ icon: Icon, label, value, unit, color, data, fixed = 1 }) {
  const prev = data && data.length > 1 ? data[data.length - 2] : value;
  const d = value - prev;
  const trend = Math.abs(d) < 1e-6 ? '→' : d > 0 ? '▲' : '▼';
  const tcol = Math.abs(d) < 1e-6 ? '#64748b' : d > 0 ? '#34d399' : '#f87171';
  return (
    <div style={{ background: '#0b1220', border: '1px solid #1e293b', borderRadius: 12, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: tcol, fontWeight: 800 }}>{trend}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {fmtNum(value, fixed)}<span style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}> {unit}</span>
        </div>
        <Sparkline data={data} color={color} />
      </div>
    </div>
  );
}

function StatusPill({ on, onLabel, offLabel }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 800, background: on ? 'rgba(16,185,129,.14)' : T.raised, color: on ? T.green : T.muted,
      border: `1px solid ${on ? T.green + '55' : T.border}` }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? T.green : T.muted,
        animation: on ? 'livePulse 1.6s infinite' : 'none' }} />
      {on ? onLabel : offLabel}
    </span>
  );
}

function Chip({ label, value, color, led }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 14px', borderRight: '1px solid rgba(255,255,255,.08)' }}>
      <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 900, color: color || '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
        {led && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, animation: 'livePulse 1.6s infinite' }} />}
        {value}
      </span>
    </div>
  );
}

function IoTSimulator() {
  const { farmId } = useAuth();
  const s = useRef(simInit());
  const evRef = useRef([]);
  const wasCrit = useRef(false);
  const lastAlert = useRef(0);
  const [snap, setSnap] = useState({ ...s.current });
  const [events, setEvents] = useState([]);
  const [running, setRunning] = useState(true);
  const [alertsOn, setAlertsOn] = useState(true);

  const pushEvent = (msg, level = 'info') => {
    evRef.current = [{ id: Date.now() + Math.random(), t: new Date().toLocaleTimeString('fr-FR'), msg, level }, ...evRef.current].slice(0, 16);
  };

  const clockUpdate = (st) => {
    const now = new Date();
    st.hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    st.timeStr = now.toLocaleTimeString('fr-FR');
    st.dateStr = now.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
    const dkey = now.toDateString();
    if (st.dateKey && st.dateKey !== dkey) { st.waterToday = 0; st.cyclesToday = 0; pushEvent('Nouveau jour — compteurs réinitialisés', 'info'); }
    st.dateKey = dkey;
    return now;
  };

  const step = () => {
    const st = s.current;
    clockUpdate(st);                          // 1 tick = 1 real second
    const fav = (st.hour >= 5 && st.hour < 9) || (st.hour >= 18 && st.hour < 21);
    const midday = st.hour >= 11 && st.hour < 16;

    // Weather — occasional rain (~ once per few minutes)
    if (st.rainTicks <= 0 && Math.random() < 0.004) { st.rainTicks = 90 + Math.floor(Math.random() * 120); pushEvent('🌧 Pluie détectée — irrigation suspendue', 'info'); }
    const raining = st.rainTicks > 0; if (raining) st.rainTicks--;

    // Irrigation auto logic (dossier §5.1) — keyed on the REAL time of day
    if (st.mode === 'auto') {
      const gap = (st.hour - st.lastStart + 24) % 24;
      if (!st.valve && st.soil < 30 && fav && gap > 0.05 && !st.leak && !st.dryPump && !raining) {
        st.valve = true; st.pump = true; st.lastStart = st.hour;
        pushEvent('Cycle d’irrigation démarré (sol sec + créneau favorable)', 'ok');
      } else if (st.valve && st.soil >= 45) {
        st.valve = false; st.pump = false;
        pushEvent('Sol suffisamment humide → arrosage arrêté', 'info');
      }
    }

    // Hydraulics (per-second rates)
    const watering = st.valve && st.pump && !st.dryPump && !st.leak;
    if (watering && !st.watering) st.cyclesToday++;
    st.watering = watering;
    if (watering) {
      st.flow = 19 + Math.random() * 3;
      st.pressure = 2.1 + Math.random() * 0.3;
      st.pumpW = 1080 + Math.random() * 80;
      st.soil = Math.min(100, st.soil + 0.15);
      st.waterToday += st.flow / 60;          // L/min → L per second
    } else {
      st.flow = st.leak ? 5 + Math.random() * 2 : 0;
      st.pressure = st.dryPump && st.pump ? 3.3 + Math.random() * 0.3 : (st.leak ? 0.6 : 0);
      st.pumpW = st.dryPump && st.pump ? 1320 : 0;
      st.soil = Math.max(3, st.soil - (midday ? 0.05 : 0.02) + (raining ? 0.1 : 0));
      if (st.leak) st.waterToday += st.flow / 60;
    }

    // Safety detections (dossier §5.3)
    if (st.leak && !st.leakAlerted) { pushEvent('⚠ FUITE détectée (débit, vanne fermée) → arrêt pompe + alerte', 'danger'); st.leakAlerted = true; st.pump = false; st.valve = false; }
    if (st.dryPump && st.pump && !st.dryAlerted) { pushEvent('⚠ POMPE À SEC (rotation sans débit) → arrêt pompe + alerte', 'danger'); st.dryAlerted = true; st.pump = false; st.valve = false; }

    // Soil temperature — follows the real day cycle (smooth)
    const tgt = 13 + 15 * Math.max(0, Math.sin((st.hour - 6) / 12 * Math.PI));
    st.soilTemp += (tgt - st.soilTemp) * 0.02 + (Math.random() - 0.5) * 0.05;

    // Beehive (dossier §3.2 / §5.4) — realistic daily rhythm
    st.brood += (35 - st.brood) * 0.05 + (Math.random() - 0.5) * 0.06;
    if (st.brood < 34 || st.brood > 36) { if (!st.broodAlerted) { pushEvent('⚠ Température couvain anormale → vérifier la colonie', 'danger'); st.broodAlerted = true; } } else st.broodAlerted = false;
    if (st.mielleeTicks > 0) { st.weight += 0.02; st.mielleeTicks--; if (st.mielleeTicks === 0) pushEvent('Miellée terminée', 'info'); }
    else if (st.hour >= 7 && st.hour < 11) st.weight -= 0.0008;   // foragers leaving
    else if (st.hour >= 16 && st.hour < 20) st.weight += 0.0016;  // returning with nectar
    else st.weight -= 0.0002;
    if (st.soundTicks > 0) { st.soundTicks--; st.soundHz += (300 - st.soundHz) * 0.05; if (st.soundTicks === 0) { st.sound = 'normal'; pushEvent('Bourdonnement revenu à la normale', 'info'); } }
    else st.soundHz += (210 - st.soundHz) * 0.05 + (Math.random() - 0.5) * 3;
    const dayLight = st.hour >= 7 && st.hour < 18;
    const battTgt = dayLight ? 12.6 : 10.9;
    st.battery = Math.max(10.4, Math.min(12.7, st.battery + (battTgt - st.battery) * 0.004));
    if (st.battery < 11.3 && !st.battAlerted) { pushEvent('⚠ Batterie rucher faible → mise en veille', 'danger'); st.battAlerted = true; }
    if (st.battery > 11.8) st.battAlerted = false;

    // Telemetry packet + history
    st.mqtt++;
    const H = st.hist;
    const rec = (k, v) => { H[k].push(v); if (H[k].length > HISTN) H[k].shift(); };
    rec('soil', st.soil); rec('soilTemp', st.soilTemp); rec('flow', st.flow); rec('pressure', st.pressure);
    rec('weight', st.weight); rec('brood', st.brood); rec('soundHz', st.soundHz); rec('battery', st.battery);
  };

  useEffect(() => { clockUpdate(s.current); setSnap({ ...s.current }); }, []); // eslint-disable-line
  useEffect(() => {
    const iv = setInterval(() => {
      if (running) step();
      else clockUpdate(s.current);            // keep the clock live even on pause
      setSnap({ ...s.current });
      setEvents([...evRef.current]);
    }, 1000);                                  // synchronised to real time (1 s)
    return () => clearInterval(iv);
  }, [running]); // eslint-disable-line

  const sync = () => setSnap({ ...s.current });
  const toggleMode = () => { s.current.mode = s.current.mode === 'auto' ? 'manual' : 'auto'; pushEvent(`Mode ${s.current.mode === 'auto' ? 'AUTOMATIQUE' : 'MANUEL'} activé`, 'info'); sync(); };
  const toggleValve = () => { const st = s.current; st.valve = !st.valve; if (!st.valve) st.pump = false; pushEvent(`Vanne ${st.valve ? 'OUVERTE' : 'FERMÉE'} (manuel)`, 'info'); sync(); };
  const togglePump = () => { const st = s.current; st.pump = !st.pump; if (st.pump) st.valve = true; pushEvent(`Pompe ${st.pump ? 'DÉMARRÉE' : 'ARRÊTÉE'} (manuel)`, 'info'); sync(); };
  const injLeak = () => { s.current.leak = true; s.current.leakAlerted = false; sync(); };
  const injDry = () => { s.current.dryPump = true; s.current.dryAlerted = false; sync(); };
  const repair = () => { s.current.leak = false; s.current.dryPump = false; pushEvent('Anomalies réparées — système nominal', 'ok'); sync(); };
  const injSwarm = () => { s.current.weight -= 1.8; s.current.sound = 'rising'; s.current.soundTicks = 60; pushEvent('🐝 Chute -1.8 kg + bourdonnement ↑ → ESSAIMAGE probable', 'danger'); sync(); };
  const injMiellee = () => { s.current.mielleeTicks = 120; pushEvent('Forte prise de poids → miellée en cours', 'ok'); sync(); };
  const injBrood = () => { s.current.brood = 37.6; sync(); };
  const reset = () => { s.current = simInit(); evRef.current = []; setEvents([]); sync(); };

  const critical = snap.leak || snap.dryPump || snap.battery < 11.3 || snap.brood < 34 || snap.brood > 36 || snap.pressure > 3;
  const warning = !critical && (snap.soil < 15 || snap.sound === 'rising' || snap.rainTicks > 0);
  const sysColor = critical ? SEV.danger : warning ? SEV.warn : SEV.ok;
  const sysLabel = critical ? 'CRITIQUE' : warning ? 'ALERTE' : 'NOMINAL';

  // On a rising edge to CRITICAL → dispatch a real alert (WhatsApp + email + push)
  useEffect(() => {
    if (critical && !wasCrit.current) {
      const now = Date.now();
      if (alertsOn && farmId && now - lastAlert.current > 60000) {
        lastAlert.current = now;
        const reasons = [];
        if (snap.leak) reasons.push("fuite d'eau");
        if (snap.dryPump) reasons.push('pompe à sec');
        if (snap.pressure > 3) reasons.push('pression anormale');
        if (snap.battery < 11.3) reasons.push('batterie rucher faible');
        if (snap.brood < 34 || snap.brood > 36) reasons.push('température couvain anormale');
        const msg = `🚨 Anomalie critique détectée (${snap.dateStr} ${snap.timeStr}) : ${reasons.join(', ')}. Intervention requise sur la ferme.`;
        alertsAPI.notify(farmId, '🚨 Alerte Smart Farm AI', msg, 'all')
          .then(() => { pushEvent('🔔 Alerte critique envoyée à la ferme (WhatsApp/email/push)', 'ok'); setEvents([...evRef.current]); })
          .catch((e) => { pushEvent(`Alerte non envoyée (${e?.response?.status === 403 ? 'droits owner requis' : 'serveur hors ligne'})`, 'warn'); setEvents([...evRef.current]); });
      } else if (!alertsOn) {
        pushEvent('Cas critique détecté (alertes auto désactivées)', 'warn'); setEvents([...evRef.current]);
      }
    }
    wasCrit.current = critical;
  }, [critical]); // eslint-disable-line

  const soilColor = snap.soil < 15 ? SEV.danger : snap.soil < 30 ? SEV.warn : '#38bdf8';
  const presColor = snap.pressure > 3 ? SEV.danger : (snap.valve && snap.pump && snap.pressure < 1) ? SEV.danger : '#22d3ee';
  const broodColor = (snap.brood < 34 || snap.brood > 36) ? SEV.danger : '#34d399';
  const battColor = snap.battery < 11.3 ? SEV.danger : snap.battery < 11.8 ? SEV.warn : '#34d399';
  const ctrlBtn = (bg, fg, brd) => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: `1px solid ${brd || bg}`, background: bg, color: fg, fontSize: 12, fontWeight: 800, cursor: 'pointer' });

  return (
    <div style={{ marginBottom: 22, borderRadius: 18, overflow: 'hidden', border: '1px solid #1e293b', boxShadow: '0 10px 30px rgba(2,6,23,.18)' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'linear-gradient(135deg,#0f172a,#0b3b46)', flexWrap: 'wrap' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(56,189,248,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Activity size={20} color="#38bdf8" />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9' }}>Centre de supervision — Smart Farm AI</div>
          <div style={{ fontSize: 12, color: 'rgba(226,232,240,.65)', marginTop: 1 }}>Supervision temps réel · MQTT · pilotage à distance</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* live real-time clock */}
          <div style={{ textAlign: 'right', marginRight: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{snap.timeStr || '—'}</div>
            <div style={{ fontSize: 10, color: 'rgba(226,232,240,.6)', textTransform: 'capitalize' }}>{snap.dateStr}</div>
          </div>
          <button onClick={() => setAlertsOn(a => !a)} title={alertsOn ? 'Alertes auto activées' : 'Alertes auto désactivées'}
            style={{ ...ctrlBtn(alertsOn ? 'rgba(239,68,68,.18)' : 'rgba(255,255,255,.08)', alertsOn ? '#fca5a5' : '#94a3b8', alertsOn ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.15)'), padding: '8px 12px' }}>
            <AlertTriangle size={14} /> Alertes {alertsOn ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setRunning(r => !r)} title={running ? 'Pause' : 'Lecture'} style={{ ...ctrlBtn('#38bdf8', '#0f172a'), padding: '8px' }}>
            {running ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={reset} title="Réinitialiser" style={{ ...ctrlBtn('rgba(255,255,255,.08)', '#e2e8f0', 'rgba(255,255,255,.15)'), padding: '8px' }}>
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* status strip */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', background: '#0b1220', borderBottom: '1px solid #1e293b', padding: '4px 6px' }}>
        <Chip label="État système" value={sysLabel} color={sysColor} led />
        <Chip label="Date" value={snap.dateStr || '—'} />
        <Chip label="Débit" value={`${fmtNum(snap.flow, 1)} L/min`} color="#22d3ee" />
        <Chip label="Eau aujourd’hui" value={`${fmtNum(snap.waterToday / 1, 0)} L`} color="#38bdf8" />
        <Chip label="Cycles irrig." value={snap.cyclesToday} />
        <Chip label="Liaison MQTT" value={`${snap.mqtt} msg`} color="#34d399" led />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,.55)' }}>Mode</span>
          <div style={{ display: 'inline-flex', borderRadius: 9, overflow: 'hidden', border: '1px solid #1e293b' }}>
            {['auto', 'manual'].map(m => (
              <button key={m} onClick={() => snap.mode !== m && toggleMode()}
                style={{ padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800,
                  background: snap.mode === m ? '#38bdf8' : '#0b1220', color: snap.mode === m ? '#0f172a' : '#94a3b8' }}>
                {m === 'auto' ? '⚙ Auto' : '✋ Manuel'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* unit panels */}
      <div style={{ display: 'flex', gap: 14, padding: 16, flexWrap: 'wrap', background: '#0f172a' }}>
        {/* Unité A */}
        <div style={{ flex: '1 1 380px', background: T.white, borderRadius: 14, padding: 14, border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Droplets size={16} color={T.indigo} />
            <span style={{ fontWeight: 800, color: T.text, fontSize: 14 }}>Unité A — Irrigation</span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <StatusPill on={snap.valve} onLabel="Vanne ouverte" offLabel="Vanne fermée" />
              <StatusPill on={snap.pump} onLabel="Pompe ON" offLabel="Pompe OFF" />
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Metric icon={Droplets} label="Humidité sol" value={snap.soil} unit="%" color={soilColor} data={snap.hist?.soil} fixed={0} />
            <Metric icon={Thermometer} label="Temp. sol" value={snap.soilTemp} unit="°C" color="#fb923c" data={snap.hist?.soilTemp} />
            <Metric icon={Gauge} label="Débit" value={snap.flow} unit="L/min" color="#22d3ee" data={snap.hist?.flow} />
            <Metric icon={Activity} label="Pression" value={snap.pressure} unit="bar" color={presColor} data={snap.hist?.pressure} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={toggleValve} disabled={snap.mode !== 'manual'} style={{ ...ctrlBtn(snap.valve ? T.green : T.white, snap.valve ? '#fff' : T.dim, T.border), opacity: snap.mode !== 'manual' ? .5 : 1, flex: 1 }}>
              <Waves size={14} /> {snap.valve ? 'Fermer vanne' : 'Ouvrir vanne'}
            </button>
            <button onClick={togglePump} disabled={snap.mode !== 'manual'} style={{ ...ctrlBtn(snap.pump ? T.green : T.white, snap.pump ? '#fff' : T.dim, T.border), opacity: snap.mode !== 'manual' ? .5 : 1, flex: 1 }}>
              <Power size={14} /> {snap.pump ? 'Arrêter pompe' : 'Démarrer pompe'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button onClick={injLeak} style={{ ...ctrlBtn(`${T.red}12`, T.red, `${T.red}40`), flex: 1 }}><AlertTriangle size={13} /> Fuite</button>
            <button onClick={injDry} style={{ ...ctrlBtn(`${T.red}12`, T.red, `${T.red}40`), flex: 1 }}><AlertTriangle size={13} /> Pompe à sec</button>
            <button onClick={repair} style={{ ...ctrlBtn(`${T.green}12`, T.green, `${T.green}40`), flex: 1 }}><Check size={13} /> Réparer</button>
          </div>
        </div>

        {/* Unité B */}
        <div style={{ flex: '1 1 380px', background: T.white, borderRadius: 14, padding: 14, border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Bug size={16} color={T.amber} />
            <span style={{ fontWeight: 800, color: T.text, fontSize: 14 }}>Unité B — Rucher</span>
            <span style={{ marginLeft: 'auto' }}><StatusPill on={snap.sound === 'rising'} onLabel="Son élevé" offLabel="Son normal" /></span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Metric icon={Scale} label="Poids ruche" value={snap.weight} unit="kg" color="#fbbf24" data={snap.hist?.weight} />
            <Metric icon={Thermometer} label="Temp. couvain" value={snap.brood} unit="°C" color={broodColor} data={snap.hist?.brood} />
            <Metric icon={Volume2} label="Son colonie" value={snap.soundHz} unit="Hz" color={snap.sound === 'rising' ? SEV.danger : '#a78bfa'} data={snap.hist?.soundHz} fixed={0} />
            <Metric icon={Battery} label="Batterie" value={snap.battery} unit="V" color={battColor} data={snap.hist?.battery} fixed={2} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={injSwarm} style={{ ...ctrlBtn(`${T.red}12`, T.red, `${T.red}40`), flex: 1 }}>🐝 Essaimage</button>
            <button onClick={injMiellee} style={{ ...ctrlBtn(`${T.green}12`, T.green, `${T.green}40`), flex: 1 }}><Scale size={13} /> Miellée</button>
            <button onClick={injBrood} style={{ ...ctrlBtn(`${T.amber}14`, T.amber, `${T.amber}40`), flex: 1 }}><Thermometer size={13} /> Stress couvain</button>
          </div>
        </div>
      </div>

      {/* live event log */}
      <div style={{ padding: '0 16px 16px', background: '#0f172a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          <Signal size={13} color="#38bdf8" /> Journal des événements (live)
        </div>
        <div style={{ maxHeight: 170, overflowY: 'auto', display: 'grid', gap: 5, background: '#0b1220', border: '1px solid #1e293b', borderRadius: 12, padding: 10 }}>
          {events.length === 0 ? (
            <div style={{ fontSize: 12, color: '#475569', padding: '6px 2px' }}>En attente d'événements… (le système tourne)</div>
          ) : events.map(ev => (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: '#475569', fontWeight: 700, width: 42 }}>{ev.t}</span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV[ev.level] || SEV.info, flexShrink: 0 }} />
              <span style={{ color: ev.level === 'danger' ? '#f87171' : '#cbd5e1', fontWeight: ev.level === 'danger' ? 700 : 500 }}>{ev.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


export default function IoTDevices() {
  const { farmId } = useAuth();
  const [devices, setDevices]     = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [filterType, setFilterType] = useState('');

  const load = async () => {
    if (!farmId) return;
    setLoading(true);
    try {
      const [devRes, sumRes] = await Promise.all([
        api.get('/iot/devices', { params: { farm_id: farmId, sensor_type: filterType || undefined } }),
        api.get('/iot/devices/summary', { params: { farm_id: farmId } }),
      ]);
      setDevices(devRes.data);
      setSummary(sumRes.data);
    } catch { toast.error('Erreur chargement capteurs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [farmId, filterType]);

  const deleteDevice = async (id) => {
    if (!confirm('Supprimer ce capteur ?')) return;
    try { await api.delete(`/iot/devices/${id}`); toast.success('Capteur supprimé'); load(); }
    catch { toast.error('Erreur suppression'); }
  };

  const types = Object.keys(TYPE_META).filter(k => k !== 'default');

  const KPIS = summary ? [
    { label: 'Total capteurs', value: summary.total,   color: T.indigo, icon: Cpu     },
    { label: 'En ligne',       value: summary.active,  color: T.green,  icon: Wifi    },
    { label: 'Hors-ligne',     value: summary.offline, color: summary.offline > 0 ? T.red : T.muted, icon: WifiOff },
    { label: 'Types actifs',   value: Object.keys(summary.by_type || {}).length, color: T.sky, icon: BarChart3 },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: T.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>

      <Navbar
        title="Capteurs IoT"
        subtitle="Gestion des devices connectés à votre ferme"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={load}
              style={{ padding: '7px 10px', background: T.white, border: `1px solid ${T.border}`, borderRadius: 9, color: T.dim, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .2s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.raised}
              onMouseLeave={e => e.currentTarget.style.background = T.white}>
              <RefreshCw size={13}/>
            </button>
            <button onClick={() => setModal('add')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})`, border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(79,70,229,.3)', transition: 'all .2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <Plus size={14}/> Ajouter capteur
            </button>
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', overscrollBehaviorY: 'contain' }}>

        {/* ═══ HERO ══════════════════════════════════════════════════════ */}
        <div style={{ background: 'linear-gradient(135deg, #164e63 0%, #0e7490 45%, #0369a1 100%)', padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,.05)', pointerEvents: 'none' }}/>
          <div style={{ position: 'absolute', bottom: -60, left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }}/>

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 99, padding: '5px 13px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid rgba(255,255,255,.2)' }}>
                  <Signal size={11} color="#fff"/>
                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase' }}>IoT Network</span>
                </div>
                {summary && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.9)', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', padding: '4px 10px', borderRadius: 99 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'livePulse 2s infinite' }}/>
                    {summary.active} en ligne
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 10px', letterSpacing: -.5, lineHeight: 1.2 }}>
                Capteurs IoT
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,.72)', maxWidth: 460, lineHeight: 1.75, margin: '0 0 24px' }}>
                Gérez et supervisez tous vos devices connectés — température, humidité,<br/>
                poids, caméras et nœuds MQTT en temps réel.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setModal('add')}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,.95)', color: '#0e7490', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.22)', transition: 'all .2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <Plus size={13}/> Ajouter un capteur
                </button>
                <button onClick={load}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.1)'}>
                  <RefreshCw size={13}/> Actualiser
                </button>
              </div>
            </div>

            {/* Right: type breakdown */}
            {summary?.by_type && Object.keys(summary.by_type).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 16, padding: '16px 18px', border: '1px solid rgba(255,255,255,.18)', minWidth: 200 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .7, marginBottom: 10 }}>
                  Répartition par type
                </div>
                {Object.entries(summary.by_type).map(([type, count]) => {
                  const meta = getType(type);
                  const Icon = meta.icon;
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Icon size={11} color="rgba(255,255,255,.7)"/>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', flex: 1 }}>{meta.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ KPI BAR ══════════════════════════════════════════════════ */}
        {summary && (
          <div style={{ padding: '24px 32px', borderBottom: `1px solid ${T.border}`, background: T.bg }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {KPIS.map(item => <KpiTile key={item.label} {...item}/>)}
            </div>
          </div>
        )}

        {/* ═══ MAIN ═════════════════════════════════════════════════════ */}
        <div style={{ padding: '24px 32px' }}>

          {/* ─── Centre de supervision temps réel ─────────────────────── */}
          <IoTSimulator />

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginRight: 4 }}>Filtrer :</span>
            {[{ key: '', label: 'Tous', color: T.indigo }, ...types.map(t => ({ key: t, label: getType(t).label, color: getType(t).color }))].map(({ key, label, color }) => {
              const active = filterType === key;
              const TMeta = key ? getType(key) : null;
              const Icon = TMeta?.icon || null;
              return (
                <button key={key} onClick={() => setFilterType(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                    borderRadius: 99, border: `1px solid ${active ? color : T.border}`,
                    background: active ? `${color}10` : T.white,
                    color: active ? color : T.dim,
                    fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
                    transition: 'all .15s', boxShadow: active ? `0 0 0 3px ${color}15` : 'none',
                  }}>
                  {Icon && <Icon size={11}/>} {label}
                  {key && summary?.by_type?.[key] != null && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 99, background: active ? `${color}20` : T.raised, color: active ? color : T.muted }}>
                      {summary.by_type[key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Device grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ width: 40, height: 40, border: `3px solid ${T.border}`, borderTopColor: T.indigo, borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }}/>
              <div style={{ fontSize: 14, color: T.muted }}>Chargement des capteurs…</div>
            </div>
          ) : devices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: T.muted }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${T.indigo}10`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Cpu size={32} color={T.indigo} style={{ opacity: .5 }}/>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.dim, marginBottom: 6 }}>Aucun capteur enregistré</div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>Ajoutez votre premier device IoT pour commencer le monitoring</div>
              <button onClick={() => setModal('add')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${T.indigo}, ${T.purple})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(79,70,229,.3)' }}>
                <Plus size={13}/> Ajouter un capteur
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {devices.map(d => (
                <DeviceCard key={d.id} d={d} onEdit={setModal} onDelete={deleteDevice}/>
              ))}
            </div>
          )}
        </div>

        {/* ═══ FOOTER ═══════════════════════════════════════════════════ */}
        <footer style={{ borderTop: `1px solid ${T.border}`, padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.white }}>
          <span style={{ fontSize: 12, color: T.muted }}>Smart Farm AI — Réseau IoT · MQTT · Temps réel</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {summary && (
              <span style={{ fontSize: 12, color: T.dim }}>
                <strong style={{ color: T.green }}>{summary.active}</strong> / {summary.total} actifs
              </span>
            )}
          </div>
        </footer>
      </div>

      {modal && (
        <DeviceModal
          device={modal === 'add' ? null : modal}
          farmId={farmId}
          onClose={() => setModal(null)}
          onSave={load}
        />
      )}

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
