import React, { useEffect, useState } from 'react';
import {
  Wifi, WifiOff, Plus, Edit2, Trash2, RefreshCw,
  Cpu, Thermometer, Droplets, Scale, Camera, Radio,
  Signal, MapPin, Hash, Activity, X, Check,
  Zap, Shield, BarChart3, Database, Download, Brain, FileJson, FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { telemetryAPI } from '../services/api';
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
export default function IoTDevices() {
  const { farmId } = useAuth();
  const [devices, setDevices]     = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [filterType, setFilterType] = useState('');
  const [dsInfo, setDsInfo]       = useState(null);   // dataset export info
  const [dsBusy, setDsBusy]       = useState('');     // '' | 'jsonl' | 'csv'

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

  // Dataset export info (how many fine-tuning examples are available)
  useEffect(() => {
    telemetryAPI.exportInfo(farmId).then(r => setDsInfo(r.data)).catch(() => setDsInfo(null));
  }, [farmId]);

  const downloadDataset = async (format) => {
    setDsBusy(format);
    try {
      const res = await telemetryAPI.exportDataset(format, farmId);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv' ? 'smartfarm_telemetry.csv' : 'smartfarm_finetune.jsonl';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      const n = res.headers?.['x-example-count'];
      toast.success(format === 'csv'
        ? `Télémétrie exportée (${n || 0} lignes)`
        : `Dataset fine-tuning téléchargé (${n || dsInfo?.total_examples || 0} exemples)`);
    } catch { toast.error("Échec de l'export du dataset"); }
    finally { setDsBusy(''); }
  };

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

          {/* ─── Dataset export (fine-tuning) ─────────────────────────── */}
          <div style={{ marginBottom: 22, borderRadius: 18, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.white, boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'linear-gradient(135deg,#312e81,#4f46e5)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Brain size={20} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Base de données IA — Export pour fine-tuning</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', marginTop: 1 }}>
                  Téléchargez le dataset des capteurs &amp; règles métier pour entraîner Smart Farm AI
                </div>
              </div>
              {dsInfo && (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{dsInfo.total_examples}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Exemples</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{dsInfo.real_records}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Mesures réelles</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '18px 20px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
              {/* JSONL — LLM fine-tuning */}
              <div style={{ flex: '1 1 280px', border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileJson size={18} color={T.indigo} />
                  <div style={{ fontWeight: 800, color: T.dim, fontSize: 14 }}>Dataset LLM (.jsonl)</div>
                </div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, flex: 1 }}>
                  Format chat <code style={{ background: T.raised, padding: '1px 5px', borderRadius: 5 }}>messages[]</code> — encode la logique d'irrigation, les détections de sécurité et les alertes rucher + la télémétrie réelle. Prêt pour fine-tuner un modèle.
                </div>
                <button onClick={() => downloadDataset('jsonl')} disabled={dsBusy === 'jsonl'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 11, border: 'none', background: `linear-gradient(135deg,${T.indigo},${T.purple})`, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: dsBusy === 'jsonl' ? .6 : 1 }}>
                  <Download size={15} /> {dsBusy === 'jsonl' ? 'Préparation…' : 'Télécharger .jsonl'}
                </button>
              </div>

              {/* CSV — classic ML */}
              <div style={{ flex: '1 1 280px', border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileSpreadsheet size={18} color={T.green} />
                  <div style={{ fontWeight: 800, color: T.dim, fontSize: 14 }}>Télémétrie brute (.csv)</div>
                </div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, flex: 1 }}>
                  Table à plat des mesures capteurs (1 ligne / relevé, métriques en colonnes). Idéal pour le ML classique : détection d'anomalies, prévision, séries temporelles.
                </div>
                <button onClick={() => downloadDataset('csv')} disabled={dsBusy === 'csv'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 11, border: `1px solid ${T.border}`, background: T.white, color: T.dim, fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: dsBusy === 'csv' ? .6 : 1 }}>
                  <Download size={15} /> {dsBusy === 'csv' ? 'Préparation…' : 'Télécharger .csv'}
                </button>
              </div>
            </div>
            <div style={{ padding: '0 20px 16px', fontSize: 11, color: T.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Database size={12} /> Les exemples « règles » reproduisent le comportement documenté du système ; les mesures réelles s'y ajoutent au fil des relevés MQTT.
            </div>
          </div>

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
