import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Brain, AlertOctagon, AlertTriangle, CheckCircle2, Lightbulb,
  RefreshCw, Play, Download, Zap, Activity, Flame, Heart,
  Shield, Wind, Check, MessageCircle, Info,
  Building2, ChevronDown, ChevronUp,
  Sparkles, Target, TrendingUp, AlertCircle, Filter, X,
  Database, Bell,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { recsAPI, alertsAPI, anomalyAPI, dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* ── Design System — Neo-Minimalist Light Theme ──────────────────────── */
const T = {
  bg:       '#f8fafc',
  surface:  '#ffffff',
  card:     '#ffffff',
  raised:   '#f1f5f9',
  border:   '#e2e8f0',
  muted:    '#94a3b8',
  dim:      '#64748b',
  sub:      '#475569',
  text:     '#0f172a',
  white:    '#ffffff',
  primary:  '#4f46e5',
  green:    '#10b981',
  red:      '#ef4444',
  amber:    '#f59e0b',
  sky:      '#0ea5e9',
  purple:   '#8b5cf6',
  indigo:   '#4f46e5',
};

const URGENCY = {
  critical: { color: '#ef4444', bg: '#fef2f2', label: 'Critique', icon: AlertOctagon,  dot: '🔴' },
  high:     { color: '#f59e0b', bg: '#fffbeb', label: 'Haute',    icon: AlertTriangle, dot: '🟡' },
  medium:   { color: '#0ea5e9', bg: '#f0f9ff', label: 'Moyenne',  icon: Info,          dot: '🔵' },
  low:      { color: '#10b981', bg: '#ecfdf5', label: 'Basse',    icon: Lightbulb,     dot: '🟢' },
};

const ALERT_ICONS = {
  fire_detection: Flame,
  health: Heart,
  test: Shield,
  default: AlertTriangle,
};

const PLANTS = [
  'Herbe','Blé','Orge','Luzerne','Trèfle','Maïs',
  'Tournesol','Sorgho','Olive','Agrumes','Tomate','Pomme de terre',
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
const ago = (ts) => {
  if (!ts) return '';
  const d = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (d < 1)    return "à l'instant";
  if (d < 60)   return `${d}m`;
  if (d < 1440) return `${Math.floor(d / 60)}h`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};
const scoreColor = (v) => v >= 80 ? T.green : v >= 60 ? T.amber : T.red;

/* ── Badge ────────────────────────────────────────────────────────────── */
function Badge({ children, color, small }) {
  return (
    <span style={{
      fontSize: small ? 9 : 10, fontWeight: 700, letterSpacing: 0.5,
      color, background: `${color}18`, border: `1px solid ${color}28`,
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 99,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

/* ── Pill ─────────────────────────────────────────────────────────────── */
function Pill({ label, count, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
      borderRadius: 99, border: `1px solid ${active ? color : T.border}`,
      background: active ? `${color}10` : T.white, color: active ? color : T.dim,
      fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer',
      transition: 'all .15s', outline: 'none',
      boxShadow: active ? `0 0 0 3px ${color}18` : 'none',
    }}>
      {label}
      {count != null && (
        <span style={{
          fontSize: 10, background: active ? `${color}20` : T.raised,
          color: active ? color : T.muted, padding: '0 6px', borderRadius: 99, fontWeight: 700,
        }}>{count}</span>
      )}
    </button>
  );
}

/* ── LiveDot ──────────────────────────────────────────────────────────── */
function LiveDot({ status, light }) {
  const c = { connected: T.green, connecting: T.amber, disconnected: T.red }[status] || T.muted;
  const textColor = light ? 'rgba(255,255,255,.9)' : c;
  const bg        = light ? 'rgba(255,255,255,.15)' : `${c}12`;
  const bd        = light ? 'rgba(255,255,255,.25)' : `${c}25`;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, fontWeight: 700, color: textColor,
      background: bg, border: `1px solid ${bd}`, padding: '4px 10px', borderRadius: 99,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: light ? '#4ade80' : c,
        animation: status === 'connected' ? 'livePulse 2s infinite' : 'none',
      }} />
      {status === 'connected' ? 'LIVE' : status === 'connecting' ? 'Connexion…' : 'Hors-ligne'}
    </span>
  );
}

/* ── KPI Card ─────────────────────────────────────────────────────────── */
function KpiCard({ label, value, color, icon: Icon, pulse }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.white, borderRadius: 14, padding: '16px 18px',
        border: `1px solid ${hov ? color + '40' : T.border}`,
        boxShadow: hov ? `0 8px 24px ${color}12` : '0 1px 4px rgba(0,0,0,.05)',
        transform: hov ? 'translateY(-2px)' : 'none',
        transition: 'all .2s', position: 'relative', overflow: 'hidden',
      }}
    >
      {pulse && <span style={{ position:'absolute', top:10, right:10, width:6, height:6, borderRadius:'50%', background:color, animation:'livePulse 2s infinite' }} />}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
        <div style={{ background:`${color}12`, borderRadius:8, padding:6 }}>
          <Icon size={12} color={color} />
        </div>
        <span style={{ fontSize:9, color:T.muted, fontWeight:700, letterSpacing:0.6, textTransform:'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize:24, fontWeight:900, color, lineHeight:1 }}>{value}</div>
    </div>
  );
}

/* ── AI Recommendation Card ───────────────────────────────────────────── */
function AiRecommendationCard({ rec }) {
  const cfg = {
    weather:       { color: T.sky,    icon: Wind,     label: 'Météo' },
    sovereign_rag: { color: T.purple, icon: Brain,    label: 'RAG Souverain' },
    operational:   { color: T.green,  icon: Activity, label: 'Opérationnel' },
    ai_analysis:   { color: T.amber,  icon: Zap,      label: 'Analyse IA' },
  }[rec.type] || { color: T.indigo, icon: Lightbulb, label: rec.type || 'IA' };
  const Icon = cfg.icon;
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.white, border: `1px solid ${hov ? cfg.color + '50' : T.border}`,
        borderTop: `3px solid ${cfg.color}`, borderRadius: 14, padding: '18px 20px',
        transition: 'all .2s', cursor: 'default',
        boxShadow: hov ? `0 8px 24px ${cfg.color}14` : '0 1px 4px rgba(0,0,0,.05)',
        transform: hov ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <div style={{ background:`${cfg.color}12`, borderRadius:8, padding:'6px 7px' }}>
          <Icon size={13} color={cfg.color} />
        </div>
        <Badge color={cfg.color}>{cfg.label}</Badge>
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:8, lineHeight:1.4 }}>
        {rec.title}
      </div>
      <div style={{ fontSize:12, color:T.dim, lineHeight:1.65, marginBottom:10 }}>
        <span style={{ color:cfg.color, fontWeight:600 }}>↳ </span>{rec.action}
      </div>
      <div style={{
        fontSize:11, color:T.dim, lineHeight:1.5, padding:'8px 10px',
        background:T.raised, borderRadius:8, borderLeft:`3px solid ${cfg.color}40`,
      }}>
        {rec.reason}
      </div>
    </div>
  );
}

/* ── RecRow ───────────────────────────────────────────────────────────── */
function RecRow({ rec, onAction }) {
  const [acting, setActing] = useState(false);
  const [open, setOpen]     = useState(false);
  const u = URGENCY[rec.urgency_level] || URGENCY.medium;
  const Icon = u.icon;
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.border}`,
      borderLeft: `4px solid ${rec.is_actioned ? T.border : u.color}`,
      borderRadius: 12, marginBottom: 8, overflow: 'hidden',
      opacity: rec.is_actioned ? 0.6 : 1,
      boxShadow: '0 1px 3px rgba(0,0,0,.04)',
    }}>
      <div style={{ padding:'12px 16px', display:'flex', gap:12, alignItems:'center', cursor:'pointer' }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ background:u.bg, borderRadius:8, padding:7, flexShrink:0 }}>
          <Icon size={13} color={u.color} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:2 }}>
            <Badge color={u.color} small>{u.label}</Badge>
            {rec.unit_name && <span style={{ fontSize:10, color:T.dim }}>{rec.unit_name}</span>}
          </div>
          <div style={{
            fontSize:13, color:T.text, fontWeight:500, lineHeight:1.4,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace: open ? 'normal' : 'nowrap',
          }}>
            {rec.recommendation_text}
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
          {rec.confidence_score != null && (
            <span style={{ fontSize:11, fontWeight:700, color:scoreColor(rec.confidence_score) }}>
              {Math.round(rec.confidence_score)}%
            </span>
          )}
          <span style={{ fontSize:10, color:T.muted }}>{ago(rec.timestamp)}</span>
          {open ? <ChevronUp size={13} color={T.muted} /> : <ChevronDown size={13} color={T.muted} />}
        </div>
      </div>
      {open && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:'12px 16px', background:T.raised }}>
          {rec.probable_cause && (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>
                Cause probable
              </div>
              <p style={{ fontSize:12, color:T.dim, margin:0, lineHeight:1.6 }}>{rec.probable_cause}</p>
            </div>
          )}
          <div style={{ fontSize:13, color:T.text, lineHeight:1.65, marginBottom:12 }}>{rec.recommendation_text}</div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            {rec.is_actioned
              ? <span style={{ fontSize:11, color:T.green, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                  <Check size={11} /> Traité
                </span>
              : <button
                  onClick={async (e) => { e.stopPropagation(); setActing(true); try { await onAction(rec.id); } finally { setActing(false); } }}
                  disabled={acting}
                  style={{
                    padding:'7px 18px', borderRadius:8, border:'none',
                    background:u.color, color:'#fff', fontSize:12, fontWeight:700,
                    cursor:'pointer', display:'flex', alignItems:'center', gap:6,
                    opacity:acting ? 0.6 : 1, transition:'opacity .2s',
                  }}>
                  {acting ? 'Traitement…' : <><CheckCircle2 size={12} /> Marquer traité</>}
                </button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── AlertRow ─────────────────────────────────────────────────────────── */
function AlertRow({ alert, onResolve }) {
  const [resolving, setResolving] = useState(false);
  const sevColor = { critical: T.red, warning: T.amber, info: T.sky }[alert.severity] || T.muted;
  const sevBg    = { critical: '#fef2f2', warning: '#fffbeb', info: '#f0f9ff' }[alert.severity] || T.raised;
  const Icon     = ALERT_ICONS[alert.alert_type] || ALERT_ICONS.default;
  return (
    <div style={{
      display:'flex', gap:12, alignItems:'flex-start',
      padding:'14px 16px', background:T.white, border:`1px solid ${T.border}`,
      borderLeft:`4px solid ${alert.is_resolved ? T.border : sevColor}`,
      borderRadius:12, marginBottom:8,
      opacity:alert.is_resolved ? 0.55 : 1,
      boxShadow:'0 1px 3px rgba(0,0,0,.04)',
    }}>
      <div style={{ background:sevBg, borderRadius:8, padding:8, flexShrink:0, marginTop:1 }}>
        <Icon size={13} color={sevColor} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:5, flexWrap:'wrap' }}>
          <Badge color={sevColor} small>{alert.severity}</Badge>
          <span style={{ fontSize:10, color:T.dim, background:T.raised, padding:'1px 7px', borderRadius:6, border:`1px solid ${T.border}` }}>
            {alert.alert_type?.replace(/_/g,' ')}
          </span>
          <span style={{ fontSize:10, color:T.muted, marginLeft:'auto' }}>{ago(alert.timestamp)}</span>
        </div>
        <div style={{ fontSize:13, color:T.text, lineHeight:1.5, marginBottom:8 }}>{alert.message}</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:10, color:T.muted }}>
            {alert.farm_name}{alert.unit_name && ` · ${alert.unit_name}`}
          </span>
          {!alert.is_resolved
            ? <button
                onClick={async () => { setResolving(true); try { await onResolve(alert.id); } finally { setResolving(false); } }}
                disabled={resolving}
                style={{
                  padding:'5px 14px', borderRadius:8, border:`1px solid ${T.green}30`,
                  background:'#ecfdf5', color:T.green, fontSize:11, fontWeight:700, cursor:'pointer',
                }}>
                {resolving ? '…' : '✓ Résoudre'}
              </button>
            : <span style={{ fontSize:10, color:T.green, fontWeight:600 }}>✓ Résolu</span>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
import { useTranslation } from "react-i18next";
export default function Recommendations() {
  const { t } = useTranslation();
  const { farmId, farms: authFarms } = useAuth();

  const [tab, setTab]             = useState('ai');
  const [recs, setRecs]           = useState([]);
  const [aiResult, setAiResult]   = useState(null);
  const [alerts, setAlerts]       = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedFarm, setFarm]   = useState(farmId || null);
  const [selectedPlant, setPlant] = useState('Herbe');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [showResolved, setShowResolved]   = useState(false);
  const [wsStatus, setWsStatus]   = useState('connecting');
  const [search, setSearch]       = useState('');
  const pollRef = useRef(null);

  useEffect(() => { if (farmId) setFarm(farmId); }, [farmId]);

  const loadAll = useCallback(async () => {
    try {
      const fid = selectedFarm;
      const [r1, r2, r3, r4] = await Promise.allSettled([
        recsAPI.list(showResolved, fid),
        alertsAPI.list(fid),
        anomalyAPI.recent(50, fid),
        dashboardAPI.stats(fid),
      ]);
      if (r1.status === 'fulfilled') setRecs(r1.value.data || []);
      if (r2.status === 'fulfilled') setAlerts(r2.value.data || []);
      if (r3.status === 'fulfilled') setAnomalies(r3.value.data || []);
      if (r4.status === 'fulfilled') setDashStats(r4.value.data);
    } catch {}
  }, [selectedFarm, showResolved]);

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, [loadAll]);
  useEffect(() => {
    pollRef.current = setInterval(loadAll, 30_000);
    return () => clearInterval(pollRef.current);
  }, [loadAll]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setWsStatus('disconnected'); return; }
    let ws, timer;
    const connect = () => {
      setWsStatus('connecting');
      try {
        ws = new WebSocket(`${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/events?token=${token}`);
        ws.onopen    = () => setWsStatus('connected');
        ws.onmessage = e => { try { const m = JSON.parse(e.data); if (['recommendation','alert','anomaly'].includes(m.type)) loadAll(); } catch {} };
        ws.onerror   = () => setWsStatus('disconnected');
        ws.onclose   = () => { setWsStatus('disconnected'); timer = setTimeout(connect, 5000); };
      } catch { setWsStatus('disconnected'); }
    };
    connect();
    return () => { clearTimeout(timer); ws?.close(); };
  }, []);

  const generateAI = async () => {
    if (!selectedFarm) return;
    setAiLoading(true); setAiResult(null);
    try {
      const { data } = await recsAPI.generate(
        selectedFarm,
        selectedPlant.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      );
      setAiResult(data);
    } catch {}
    finally { setAiLoading(false); }
  };
  useEffect(() => { if (selectedFarm) generateAI(); }, [selectedFarm]);

  const handleRecAction = async (id) => {
    await recsAPI.action(id);
    setRecs(p => p.map(r => r.id === id ? { ...r, is_actioned: true } : r));
  };
  const handleResolve = async (id) => {
    await alertsAPI.resolve(id, 'owner');
    setAlerts(p => p.map(a => a.id === id ? { ...a, is_resolved: true } : a));
  };

  const unresolvedAlerts = alerts.filter(a => !a.is_resolved);
  const criticalAlerts   = alerts.filter(a => a.severity === 'critical' && !a.is_resolved);

  const filteredRecs = recs.filter(r => {
    if (!showResolved && r.is_actioned) return false;
    if (urgencyFilter !== 'all' && r.urgency_level !== urgencyFilter) return false;
    if (search) return (r.recommendation_text + (r.probable_cause || '') + (r.unit_name || '')).toLowerCase().includes(search.toLowerCase());
    return true;
  });
  const filteredAlerts = (showResolved ? alerts : unresolvedAlerts).filter(a =>
    !search || a.message?.toLowerCase().includes(search.toLowerCase())
  );

  const alertTypeData = Object.entries(
    alerts.reduce((acc, a) => { acc[a.alert_type] = (acc[a.alert_type] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  const TABS = [
    { id:'ai',        label:'IA Souveraine',   count: aiResult?.recommendations?.length,    color: T.purple },
    { id:'db',        label:'Recommandations', count: recs.filter(r=>!r.is_actioned).length, color: T.indigo },
    { id:'alerts',    label:'Alertes',         count: unresolvedAlerts.length,               color: T.red    },
    { id:'anomalies', label:'Anomalies',       count: anomalies.length,                      color: T.amber  },
    { id:'analyse',   label:'Analyse',         count: null,                                  color: T.green  },
  ];

  const handleExport = () => {
    const b = new Blob([JSON.stringify({ recs, alerts: unresolvedAlerts, ai: aiResult, ts: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `recs_${Date.now()}.json`;
    a.click();
  };

  /* ── FEATURES: 3 highlights shown in hero area ── */
  const FEATURES = [
    { icon: Sparkles, color: T.purple, title: 'IA Souveraine',       desc: 'RAG UTAP/AVFA · Ollama · Open-Meteo — analyses sans cloud externe' },
    { icon: Bell,     color: T.red,    title: 'Alertes Temps-Réel',  desc: 'WebSocket live · détection incendie · santé animale · seuils IoT' },
    { icon: TrendingUp, color: T.green, title: 'Analyse Prédictive', desc: 'Isolation Forest · scores de confiance · distribution urgences' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:T.bg, fontFamily:"'Inter', system-ui, sans-serif" }}>

      {/* ── Navbar ── */}
      <Navbar
        title={t("recs.title", "Intelligence Agronomique")}
        subtitle={t("recs.subtitle", "Recommandations · Alertes · Anomalies")}
        actions={
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <LiveDot status={wsStatus} />
            <button onClick={loadAll} title="Actualiser"
              style={{ padding:'7px 10px', background:T.white, border:`1px solid ${T.border}`, borderRadius:9, color:T.dim, cursor:'pointer', display:'flex', alignItems:'center', transition:'all .2s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.raised}
              onMouseLeave={e => e.currentTarget.style.background = T.white}>
              <RefreshCw size={13} />
            </button>
            <button onClick={handleExport}
              style={{ padding:'7px 14px', background:T.white, border:`1px solid ${T.border}`, borderRadius:9, color:T.dim, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, transition:'all .2s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.raised}
              onMouseLeave={e => e.currentTarget.style.background = T.white}>
              <Download size={12} /> Export
            </button>
          </div>
        }
      />

      <div style={{ flex:1, overflowY:'auto', overscrollBehaviorY:'contain' }}>

        {/* ═══ HERO ════════════════════════════════════════════════════════ */}
        <div style={{ background:'linear-gradient(135deg, #3730a3 0%, #4f46e5 45%, #7c3aed 100%)', padding:'36px 32px', position:'relative', overflow:'hidden' }}>
          {/* decorative blobs */}
          <div style={{ position:'absolute', top:-80, right:-60, width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-60, left:'35%', width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }} />

          <div style={{ position:'relative', zIndex:2, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:32, flexWrap:'wrap' }}>

            {/* Left: title + desc + CTAs */}
            <div style={{ flex:1, minWidth:280 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ background:'rgba(255,255,255,.15)', borderRadius:99, padding:'5px 13px', display:'flex', alignItems:'center', gap:6, border:'1px solid rgba(255,255,255,.2)' }}>
                  <Sparkles size={11} color="#fff" />
                  <span style={{ fontSize:10, color:'#fff', fontWeight:800, letterSpacing:0.8, textTransform:'uppercase' }}>IA Souveraine</span>
                </div>
                <LiveDot status={wsStatus} light />
              </div>

              <h1 style={{ fontSize:30, fontWeight:900, color:'#fff', margin:'0 0 10px', letterSpacing:-.5, lineHeight:1.2 }}>
                Intelligence Agronomique
              </h1>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.72)', maxWidth:460, lineHeight:1.75, margin:'0 0 24px' }}>
                Recommandations IA temps-réel, alertes intelligentes et analyse prédictive
                pour optimiser chaque décision de votre exploitation agricole.
              </p>

              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button onClick={generateAI} disabled={aiLoading || !selectedFarm}
                  style={{
                    display:'flex', alignItems:'center', gap:7,
                    padding:'10px 22px', borderRadius:10, border:'none',
                    background:'rgba(255,255,255,.95)', color:T.indigo,
                    fontSize:13, fontWeight:700, cursor: aiLoading || !selectedFarm ? 'not-allowed' : 'pointer',
                    boxShadow:'0 4px 14px rgba(0,0,0,.22)', opacity: aiLoading || !selectedFarm ? 0.65 : 1,
                    transition:'all .2s',
                  }}
                  onMouseEnter={e => { if (!aiLoading && selectedFarm) e.currentTarget.style.transform='translateY(-1px)'; }}
                  onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                  {aiLoading
                    ? <><RefreshCw size={13} style={{animation:'spin .8s linear infinite'}}/> Analyse en cours…</>
                    : <><Play size={13} /> Analyser la Ferme</>}
                </button>
                <button onClick={loadAll}
                  style={{
                    display:'flex', alignItems:'center', gap:7,
                    padding:'10px 22px', borderRadius:10,
                    border:'1px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.1)',
                    color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all .2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.18)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.1)'}>
                  <RefreshCw size={13} /> Actualiser
                </button>
              </div>
            </div>

            {/* Right: farm selector + status */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, minWidth:200 }}>
              <div style={{ background:'rgba(255,255,255,.12)', borderRadius:14, padding:'14px 16px', border:'1px solid rgba(255,255,255,.18)' }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.6)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.7, marginBottom:7, display:'flex', alignItems:'center', gap:4 }}>
                  <Building2 size={10} /> Exploitation
                </div>
                <select value={selectedFarm || ''} onChange={e => setFarm(+e.target.value)}
                  style={{ width:'100%', padding:'7px 10px', background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)', borderRadius:8, color:'#fff', fontSize:13, cursor:'pointer', outline:'none' }}>
                  {authFarms.map(f => <option key={f.id} value={f.id} style={{background:'#3730a3'}}>{f.name}</option>)}
                </select>
              </div>

              {aiResult?.overall_status && (
                <div style={{ background:'rgba(255,255,255,.12)', borderRadius:14, padding:'12px 16px', border:'1px solid rgba(255,255,255,.18)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background: aiResult.overall_status==='Nominal'?'#4ade80':T.amber }} />
                    <span style={{ fontSize:13, color:'#fff', fontWeight:700 }}>{aiResult.overall_status}</span>
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.55)' }}>
                    {aiResult.recommendations?.length||0} analyse(s) · Ferme #{aiResult.farm_id}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FEATURES row inside hero */}
          <div style={{ position:'relative', zIndex:2, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:28 }}>
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} style={{ background:'rgba(255,255,255,.09)', borderRadius:14, padding:'14px 16px', border:'1px solid rgba(255,255,255,.14)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <div style={{ background:'rgba(255,255,255,.15)', borderRadius:8, padding:6 }}>
                    <Icon size={13} color="#fff" />
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{title}</span>
                </div>
                <p style={{ fontSize:11, color:'rgba(255,255,255,.58)', margin:0, lineHeight:1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ KPI BAR ══════════════════════════════════════════════════════ */}
        <div style={{ padding:'24px 32px', borderBottom:`1px solid ${T.border}`, background:T.bg }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:12 }}>
            {[
              { label:'Recommandations IA', value: aiResult?.recommendations?.length ?? '—', color:T.purple, icon:Sparkles },
              { label:'Critiques',          value: criticalAlerts.length, color: criticalAlerts.length>0?T.red:T.muted, icon:AlertOctagon, pulse:criticalAlerts.length>0 },
              { label:'Non résolues',       value: unresolvedAlerts.length, color:T.amber, icon:AlertCircle },
              { label:'Traitées',           value: recs.filter(r=>r.is_actioned).length, color:T.green, icon:CheckCircle2 },
              { label:'Anomalies 24h',      value: anomalies.length, color:T.sky, icon:Activity },
              { label:'Score santé',        value: dashStats?.health_score ?? '—', color:T.indigo, icon:Target },
            ].map(item => <KpiCard key={item.label} {...item} />)}
          </div>
        </div>

        {/* ═══ MAIN CONTENT ══════════════════════════════════════════════════ */}
        <div style={{ padding:'24px 32px' }}>

          {/* Controls row */}
          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:20, flexWrap:'wrap' }}>
            <div style={{ position:'relative', flex:1, maxWidth:320 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                style={{ width:'100%', padding:'9px 12px 9px 36px', background:T.white, border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:13, outline:'none', boxSizing:'border-box', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }} />
              <Filter size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:T.muted, pointerEvents:'none' }} />
              {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.muted }}><X size={11}/></button>}
            </div>

            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <Pill label="Tout" count={recs.length} active={urgencyFilter==='all'} color={T.indigo} onClick={() => setUrgencyFilter('all')} />
              {Object.entries(URGENCY).map(([k,v]) => (
                <Pill key={k} label={v.dot+' '+v.label} count={recs.filter(r=>r.urgency_level===k).length} active={urgencyFilter===k} color={v.color} onClick={() => setUrgencyFilter(k)} />
              ))}
            </div>

            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:T.dim, cursor:'pointer', marginLeft:'auto', whiteSpace:'nowrap' }}>
              <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} style={{ accentColor:T.indigo }} />
              Afficher traités
            </label>
          </div>

          {/* Horizontal tabs */}
          <div style={{ display:'flex', gap:0, borderBottom:`2px solid ${T.border}`, marginBottom:20, overflowX:'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  padding:'10px 20px', background:'transparent', border:'none',
                  borderBottom: tab===t.id ? `2px solid ${t.color}` : '2px solid transparent',
                  marginBottom:-2, cursor:'pointer', whiteSpace:'nowrap',
                  display:'flex', alignItems:'center', gap:7,
                  fontSize:13, fontWeight: tab===t.id ? 700 : 500,
                  color: tab===t.id ? t.color : T.dim, transition:'all .15s', outline:'none',
                }}>
                {t.label}
                {t.count != null && (
                  <span style={{
                    fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99,
                    background: tab===t.id ? `${t.color}15` : T.raised,
                    color: tab===t.id ? t.color : T.muted,
                  }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Bento grid: tab content + right sidebar */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 268px', gap:20, alignItems:'start' }}>

            {/* ── LEFT: Tab content ── */}
            <div style={{ minWidth:0 }}>

              {/* TAB: IA Souveraine */}
              {tab==='ai' && (
                <div>
                  {aiLoading && (
                    <div style={{ textAlign:'center', padding:'70px 0' }}>
                      <div style={{ width:52, height:52, borderRadius:'50%', background:`${T.purple}12`, display:'inline-flex', alignItems:'center', justifyContent:'center', animation:'livePulse 1.5s infinite', marginBottom:16 }}>
                        <Brain size={24} color={T.purple} />
                      </div>
                      <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:6 }}>Analyse souveraine en cours…</div>
                      <div style={{ fontSize:12, color:T.muted }}>RAG UTAP/AVFA · Météo Open-Meteo · Ollama Llava</div>
                    </div>
                  )}
                  {!aiLoading && !aiResult && (
                    <div style={{ textAlign:'center', padding:'70px 0', color:T.muted }}>
                      <Sparkles size={40} style={{ opacity:.2, marginBottom:14, color:T.purple }} />
                      <div style={{ fontSize:16, fontWeight:700, color:T.dim }}>Lancez l'analyse souveraine</div>
                      <div style={{ fontSize:13, marginTop:6 }}>Sélectionnez une culture et cliquez sur "Analyser"</div>
                    </div>
                  )}
                  {!aiLoading && aiResult && (
                    <div>
                      {/* Status banner */}
                      <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'13px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%', background: aiResult.overall_status==='Nominal'?T.green:T.amber }} />
                          <span style={{ fontSize:14, fontWeight:700, color:T.text }}>{aiResult.overall_status}</span>
                        </div>
                        <span style={{ fontSize:12, color:T.muted }}>{aiResult.recommendations?.length||0} analyse(s) · Ferme #{aiResult.farm_id}</span>
                        {aiResult.output_derja && aiResult.output_derja!=='Khidma Ola' && (
                          <span style={{ fontSize:11, color:T.purple, display:'flex', alignItems:'center', gap:4 }}>
                            <MessageCircle size={11}/> Darija disponible
                          </span>
                        )}
                      </div>

                      {/* Darija block */}
                      {aiResult.output_derja && aiResult.output_derja!=='Khidma Ola' && (
                        <div style={{ background:`${T.purple}08`, border:`1px solid ${T.purple}25`, borderRadius:12, padding:'14px 18px', marginBottom:16 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:T.purple, textTransform:'uppercase', letterSpacing:0.7, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                            <MessageCircle size={11}/> ملخص بالدارجة التونسية
                          </div>
                          <div style={{ fontSize:14, color:T.text, lineHeight:1.8, direction:'rtl' }}>{aiResult.output_derja}</div>
                        </div>
                      )}

                      {/* AI rec grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14 }}>
                        {aiResult.recommendations?.map((r,i) => <AiRecommendationCard key={i} rec={r}/>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Recommandations DB */}
              {tab==='db' && (
                <div>
                  {loading && <div style={{ textAlign:'center', padding:60, color:T.muted }}>Chargement…</div>}
                  {!loading && filteredRecs.length===0 && (
                    <div style={{ textAlign:'center', padding:'70px 0', color:T.muted }}>
                      <Lightbulb size={40} style={{ opacity:.2, marginBottom:14 }}/>
                      <div style={{ fontSize:15, fontWeight:700, color:T.dim }}>Aucune recommandation</div>
                      <div style={{ fontSize:13, marginTop:6 }}>Les recommandations sont générées automatiquement par le monitoring</div>
                    </div>
                  )}
                  {filteredRecs.map(r => <RecRow key={r.id} rec={r} onAction={handleRecAction}/>)}
                </div>
              )}

              {/* TAB: Alertes */}
              {tab==='alerts' && (
                <div>
                  {alerts.length > 0 && (
                    <div style={{ display:'flex', gap:16, padding:'12px 16px', background:T.white, border:`1px solid ${T.border}`, borderRadius:12, marginBottom:16, flexWrap:'wrap', alignItems:'center', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                      <div style={{ display:'flex', height:6, flex:1, borderRadius:3, overflow:'hidden', minWidth:120 }}>
                        {[{s:'critical',c:T.red},{s:'warning',c:T.amber},{s:'info',c:T.sky}].map(({s,c})=>{
                          const n=alerts.filter(a=>a.severity===s).length;
                          const pct=n/alerts.length*100;
                          return pct>0&&<div key={s} style={{width:`${pct}%`,background:c}} title={`${s}: ${n}`}/>;
                        })}
                      </div>
                      {[{s:'critical',c:T.red,l:'Critique'},{s:'warning',c:T.amber,l:'Alerte'},{s:'info',c:T.sky,l:'Info'}].map(({s,c,l})=>{
                        const n=alerts.filter(a=>a.severity===s).length;
                        return n>0&&<span key={s} style={{fontSize:11,color:T.dim,display:'flex',alignItems:'center',gap:5}}>
                          <span style={{width:7,height:7,borderRadius:'50%',background:c}}/>{l}: <strong style={{color:T.text}}>{n}</strong>
                        </span>;
                      })}
                      <span style={{fontSize:11,color:T.muted,marginLeft:'auto'}}>{unresolvedAlerts.length} non résolue(s)</span>
                    </div>
                  )}
                  {filteredAlerts.length===0
                    ? <div style={{textAlign:'center',padding:'60px 0',color:T.muted}}>
                        <CheckCircle2 size={40} color={T.green} style={{opacity:.35,marginBottom:12}}/>
                        <div style={{fontSize:14,fontWeight:600,color:T.dim}}>Aucune alerte active</div>
                      </div>
                    : filteredAlerts.map(a => <AlertRow key={a.id} alert={a} onResolve={handleResolve}/>)}
                </div>
              )}

              {/* TAB: Anomalies */}
              {tab==='anomalies' && (
                <div>
                  {anomalies.length===0
                    ? <div style={{textAlign:'center',padding:'70px 0',color:T.muted}}>
                        <Shield size={40} color={T.green} style={{opacity:.3,marginBottom:14}}/>
                        <div style={{fontSize:15,fontWeight:700,color:T.dim}}>Aucune anomalie détectée</div>
                        <div style={{fontSize:13,marginTop:6}}>Le monitoring temps-réel est actif</div>
                      </div>
                    : anomalies.map(a => (
                        <div key={a.id} style={{ background:T.white, border:`1px solid ${T.border}`, borderLeft:`4px solid ${T.amber}`, borderRadius:12, padding:'13px 16px', marginBottom:8, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                            <Badge color={T.amber}>{a.anomaly_type}</Badge>
                            <span style={{fontSize:10,color:T.muted}}>{ago(a.timestamp)}</span>
                          </div>
                          <div style={{fontSize:13,color:T.text}}>{a.description}</div>
                          {a.isolation_score!=null && <div style={{fontSize:11,color:T.muted,marginTop:5}}>Score: <strong style={{color:T.amber}}>{(a.isolation_score*100).toFixed(1)}%</strong> · {a.severity}</div>}
                        </div>
                      ))}
                </div>
              )}

              {/* TAB: Analyse */}
              {tab==='analyse' && (
                <div>
                  {recs.length>0 && (
                    <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,padding:'20px 22px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                      <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:0.6,marginBottom:12}}>Distribution urgences</div>
                      <div style={{display:'flex',height:10,borderRadius:5,overflow:'hidden',marginBottom:12}}>
                        {Object.entries(URGENCY).map(([k,v])=>{
                          const n=recs.filter(r=>r.urgency_level===k).length;
                          const pct=recs.length>0?(n/recs.length)*100:0;
                          return pct>0&&<div key={k} style={{width:`${pct}%`,background:v.color}} title={`${v.label}: ${n}`}/>;
                        })}
                      </div>
                      <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                        {Object.entries(URGENCY).map(([k,v])=>{
                          const n=recs.filter(r=>r.urgency_level===k).length;
                          return <div key={k} style={{fontSize:12,color:T.dim,display:'flex',alignItems:'center',gap:7}}>
                            <span style={{width:8,height:8,borderRadius:'50%',background:v.color}}/>{v.label}: <strong style={{color:T.text}}>{n}</strong>
                          </div>;
                        })}
                      </div>
                    </div>
                  )}
                  {dashStats && (
                    <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
                      <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:0.6,marginBottom:16}}>Statistiques ferme</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                        {Object.entries(dashStats).filter(([,v])=>typeof v==='number').slice(0,9).map(([k,v])=>(
                          <div key={k} style={{background:T.raised,borderRadius:10,padding:'12px 14px',textAlign:'center',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:22,fontWeight:900,color:T.text}}>{v}</div>
                            <div style={{fontSize:9,color:T.muted,marginTop:3,textTransform:'uppercase',letterSpacing:0.4}}>{k.replace(/_/g,' ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!dashStats && recs.length===0 && (
                    <div style={{textAlign:'center',padding:'70px 0',color:T.muted}}>
                      <TrendingUp size={40} style={{opacity:.2,marginBottom:14}}/>
                      <div style={{fontSize:15,fontWeight:600,color:T.dim}}>Données insuffisantes</div>
                      <div style={{fontSize:13,marginTop:6}}>Générez des recommandations IA d'abord</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* AI Engine card */}
              <div style={{ background:'linear-gradient(160deg, #1e1b4b, #312e81)', border:'1px solid rgba(99,102,241,.3)', borderRadius:16, overflow:'hidden' }}>
                <div style={{ padding:'15px 17px', borderBottom:'1px solid rgba(99,102,241,.2)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <div style={{ background:'rgba(165,180,252,.18)', borderRadius:8, padding:7 }}>
                      <Sparkles size={14} color="#a5b4fc" />
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#e0e7ff' }}>Moteur IA Souverain</div>
                      <div style={{ fontSize:10, color:'rgba(99,102,241,.8)' }}>Ollama · RAG UTAP · Open-Meteo</div>
                    </div>
                  </div>
                  {aiResult?.overall_status && (
                    <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background: aiResult.overall_status==='Nominal'?'#4ade80':T.amber }} />
                      <span style={{ fontSize:11, color:'#c7d2fe', fontWeight:600 }}>{aiResult.overall_status}</span>
                    </div>
                  )}
                </div>
                <div style={{ padding:'13px 17px' }}>
                  <label style={{ fontSize:10, color:'#818cf8', fontWeight:700, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>
                    Culture / Espèce
                  </label>
                  <select value={selectedPlant} onChange={e => setPlant(e.target.value)}
                    style={{ width:'100%', padding:'7px 10px', marginBottom:10, background:'rgba(99,102,241,.18)', border:'1px solid rgba(99,102,241,.3)', borderRadius:7, color:'#c7d2fe', fontSize:12, cursor:'pointer', outline:'none' }}>
                    {PLANTS.map(p => <option key={p} value={p} style={{background:'#1e1b4b'}}>{p}</option>)}
                  </select>
                  <button onClick={generateAI} disabled={aiLoading || !selectedFarm}
                    style={{
                      width:'100%', padding:'9px', borderRadius:9, border:'none', cursor:'pointer',
                      background: aiLoading ? 'rgba(99,102,241,.3)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      color:'#fff', fontWeight:700, fontSize:13,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      boxShadow: aiLoading ? 'none' : '0 4px 14px rgba(79,70,229,.45)',
                      transition:'all .2s', opacity: !selectedFarm ? 0.6 : 1,
                    }}>
                    {aiLoading
                      ? <><RefreshCw size={13} style={{animation:'spin .8s linear infinite'}}/> Analyse…</>
                      : <><Play size={13}/> Analyser</>}
                  </button>
                </div>
              </div>

              {/* Alert distribution mini chart */}
              {alertTypeData.length > 0 && (
                <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:14, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:0.6, marginBottom:12 }}>Alertes par type</div>
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={alertTypeData} layout="vertical" margin={{left:0,right:0,top:0,bottom:0}}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={88} tick={{fill:T.dim,fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{background:T.white,border:`1px solid ${T.border}`,borderRadius:8,fontSize:11,color:T.text}} />
                      <Bar dataKey="value" radius={[0,4,4,0]}>
                        {alertTypeData.map((_,i) => <Cell key={i} fill={[T.red,T.amber,T.sky][i%3]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Social proof — system stats */}
              <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:14, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:0.6, marginBottom:12 }}>Système</div>
                {[
                  { label:'Recommandations totales', value: recs.length, color: T.indigo },
                  { label:'Traitées',                value: recs.filter(r=>r.is_actioned).length, color: T.green },
                  { label:'Alertes actives',         value: unresolvedAlerts.length, color: T.amber },
                  { label:'Anomalies détectées',     value: anomalies.length, color: T.sky },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:12, color:T.dim }}>{label}</span>
                    <span style={{ fontSize:14, fontWeight:800, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══════════════════════════════════════════════════════ */}
        <footer style={{ borderTop:`1px solid ${T.border}`, padding:'16px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', background:T.white }}>
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            <span style={{ fontSize:12, color:T.muted, fontWeight:500 }}>Smart Farm AI — Intelligence Agronomique</span>
            <LiveDot status={wsStatus} />
          </div>
          <button onClick={handleExport}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:9, border:`1px solid ${T.border}`, background:T.white, color:T.dim, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.background=T.raised; e.currentTarget.style.borderColor=T.indigo; e.currentTarget.style.color=T.indigo; }}
            onMouseLeave={e => { e.currentTarget.style.background=T.white; e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.dim; }}>
            <Download size={12}/> Exporter les données
          </button>
        </footer>
      </div>

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
