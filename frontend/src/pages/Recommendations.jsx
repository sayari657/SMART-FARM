import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Lightbulb, Sprout, AlertOctagon, AlertTriangle,
  CheckCircle2, TrendingUp, Zap, Brain, Leaf,
  Search, X, Filter, RefreshCw, ChevronRight, Wifi, WifiOff,
  CheckCircle, Clock, Info, Activity, Play, Star,
  Download, Eye, BarChart2, MessageCircle, Wind,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { recsAPI, farmsAPI } from '../services/api';

/* ─── Config ────────────────────────────────────────────────────────────── */
const POLL_INTERVAL_MS = 30_000;
const WS_BASE = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000');
const URGENCY_LEVELS = ['all', 'critical', 'high', 'medium', 'low'];

const URGENCY_CFG = {
  critical: { color: '#ef4444', bg: '#fef2f2', label: 'Critique',  icon: AlertOctagon },
  high:     { color: '#f59e0b', bg: '#fffbeb', label: 'Haute',     icon: AlertTriangle },
  medium:   { color: '#3b82f6', bg: '#eff6ff', label: 'Moyenne',   icon: Info },
  low:      { color: '#22c55e', bg: '#f0fdf4', label: 'Basse',     icon: Lightbulb },
};

const TYPE_COLORS = {
  weather:       '#0ea5e9',
  sovereign_rag: '#8b5cf6',
  operational:   '#22c55e',
  ai_analysis:   '#f59e0b',
  default:       '#6366f1',
};

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffMin < 1440) return `il y a ${Math.floor(diffMin / 60)}h`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ─── Recommendation Card ────────────────────────────────────────────────── */
function RecCard({ rec, onAction }) {
  const [actioning, setActioning] = useState(false);
  const u = URGENCY_CFG[rec.urgency_level] || URGENCY_CFG.medium;
  const Icon = u.icon;

  const handleAction = async () => {
    setActioning(true);
    try { await onAction(rec.id); } finally { setActioning(false); }
  };

  return (
    <div style={{
      background: rec.is_actioned ? 'var(--color-surface-2)' : u.bg,
      border: `1px solid ${rec.is_actioned ? 'var(--color-border)' : u.color + '35'}`,
      borderLeft: `4px solid ${rec.is_actioned ? 'var(--color-border)' : u.color}`,
      borderRadius: 12, padding: '16px 20px', marginBottom: 12,
      opacity: rec.is_actioned ? 0.7 : 1,
      transition: 'all .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0, marginTop: 2,
          background: rec.is_actioned ? 'var(--color-border)' : `${u.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} style={{ color: rec.is_actioned ? 'var(--color-text-3)' : u.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`badge badge-${rec.urgency_level === 'critical' ? 'danger' : rec.urgency_level === 'high' ? 'warning' : rec.urgency_level === 'low' ? 'success' : 'info'}`}
                style={{ fontSize: 10, padding: '2px 8px' }}>
                {u.label.toUpperCase()}
              </span>
              {rec.unit_name && (
                <span style={{ fontSize: 11, color: 'var(--color-text-2)', fontWeight: 600, background: 'var(--color-surface)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                  {rec.unit_name}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {rec.confidence_score != null && (
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BarChart2 size={11} />
                  Confiance: <strong style={{ color: rec.confidence_score >= 80 ? '#22c55e' : rec.confidence_score >= 60 ? '#f59e0b' : '#ef4444' }}>
                    {rec.confidence_score.toFixed(0)}%
                  </strong>
                </div>
              )}
              <span style={{ fontSize: 11, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> {fmtTime(rec.timestamp)}
              </span>
            </div>
          </div>

          {/* Cause */}
          {rec.probable_cause && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Cause probable
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6, margin: 0 }}>
                {rec.probable_cause}
              </p>
            </div>
          )}

          {/* Recommendation */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Action recommandée
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text)', whiteSpace: 'pre-line', lineHeight: 1.7, fontWeight: 500 }}>
              {rec.recommendation_text}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            {rec.is_actioned ? (
              <span style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                <CheckCircle size={13} /> Traité
              </span>
            ) : (
              <button
                onClick={handleAction}
                disabled={actioning}
                style={{
                  padding: '5px 14px', borderRadius: 8, border: 'none',
                  background: u.color, color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  opacity: actioning ? 0.7 : 1, transition: 'opacity .2s',
                }}
              >
                {actioning ? <><span className="farms-spinner" style={{ width: 10, height: 10 }} /> Traitement…</> : <><CheckCircle2 size={13} /> Marquer traité</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── AI Generated Card ──────────────────────────────────────────────────── */
function AiRecCard({ rec, idx }) {
  const color = TYPE_COLORS[rec.type] || TYPE_COLORS.default;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${color}30`,
      borderRadius: 12, padding: 16,
      borderTop: `3px solid ${color}`,
      boxShadow: '0 2px 8px rgba(0,0,0,.05)',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 8, padding: '2px 8px',
        background: `${color}15`, borderRadius: 99,
      }}>
        <Zap size={10} /> {rec.type?.replace('_', ' ')} Layer
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--color-text)' }}>
        {rec.title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.65, marginBottom: 8 }}>
        <strong style={{ color: 'var(--color-text)' }}>Action :</strong> {rec.action}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic', lineHeight: 1.5 }}>
        <em>Raison :</em> {rec.reason}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function Recommendations() {
  const [recs, setRecs]             = useState([]);
  const [aiRecs, setAiRecs]         = useState(null);    // from advanced endpoint
  const [farms, setFarms]           = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [selectedPlant, setSelectedPlant]   = useState('grass');
  const [loading, setLoading]       = useState(true);
  const [aiLoading, setAiLoading]   = useState(false);
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [showActioned, setShowActioned] = useState(false);
  const [wsStatus, setWsStatus]     = useState('connecting'); // 'connected' | 'disconnected' | 'connecting'
  const [lastRefresh, setLastRefresh] = useState(null);
  const wsRef = useRef(null);
  const pollRef = useRef(null);

  /* ── Fetch DB recommendations ─────────────────────────────────── */
  const fetchRecs = useCallback(async () => {
    try {
      const r = await recsAPI.list(showActioned);
      setRecs(r.data);
      setLastRefresh(new Date());
    } catch {}
  }, [showActioned]);

  /* ── Load farms ───────────────────────────────────────────────── */
  useEffect(() => {
    farmsAPI.list().then(res => {
      setFarms(res.data || []);
      if (res.data?.length > 0) setSelectedFarmId(res.data[0].id);
    }).catch(() => {});
  }, []);

  /* ── Initial load ─────────────────────────────────────────────── */
  useEffect(() => {
    fetchRecs().finally(() => setLoading(false));
  }, [fetchRecs]);

  /* ── Auto-polling every 30s ──────────────────────────────────── */
  useEffect(() => {
    pollRef.current = setInterval(fetchRecs, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [fetchRecs]);

  /* ── WebSocket for real-time push ────────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setWsStatus('disconnected'); return; }

    let ws;
    let reconnectTimer;

    const connect = () => {
      setWsStatus('connecting');
      try {
        ws = new WebSocket(`${WS_BASE}/ws/events?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => setWsStatus('connected');

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            // Trigger a refresh when any event comes in (recommendation or alert)
            if (msg.type === 'recommendation' || msg.type === 'alert' || msg.type === 'anomaly') {
              fetchRecs();
            }
          } catch {}
        };

        ws.onerror = () => setWsStatus('disconnected');
        ws.onclose = () => {
          setWsStatus('disconnected');
          // Auto-reconnect after 5s
          reconnectTimer = setTimeout(connect, 5000);
        };
      } catch {
        setWsStatus('disconnected');
      }
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [fetchRecs]);

  /* ── Generate AI recommendations on-demand ─────────────────── */
  const generateAI = useCallback(async () => {
    if (!selectedFarmId) return;
    setAiLoading(true);
    try {
      const res = await recsAPI.generate(selectedFarmId, selectedPlant);
      setAiRecs(res.data);
    } catch {
      setAiRecs(null);
    } finally { setAiLoading(false); }
  }, [selectedFarmId, selectedPlant]);

  /* ── Auto-generate when farm selected ───────────────────────── */
  useEffect(() => {
    if (selectedFarmId) generateAI();
  }, [selectedFarmId]); // eslint-disable-line

  /* ── Mark as actioned ────────────────────────────────────────── */
  const handleAction = useCallback(async (recId) => {
    await recsAPI.action(recId);
    setRecs(prev => prev.map(r => r.id === recId ? { ...r, is_actioned: true } : r));
  }, []);

  /* ── Filter logic ────────────────────────────────────────────── */
  const counts = Object.fromEntries(
    URGENCY_LEVELS.filter(l => l !== 'all').map(l => [l, recs.filter(r => r.urgency_level === l).length])
  );

  const filtered = recs.filter(r => {
    if (!showActioned && r.is_actioned) return false;
    const matchFilter = filter === 'all' || r.urgency_level === filter;
    const matchSearch = !search || (r.probable_cause + ' ' + r.recommendation_text + ' ' + (r.unit_name || '')).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  /* ── Export ──────────────────────────────────────────────────── */
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ recs, aiRecs, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `recommendations_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  /* ─── Render ───────────────────────────────────────────────── */
  return (
    <>
      <Navbar
        title="Recommandations IA"
        subtitle="Moteur d'optimisation · Temps réel · Agronomie intelligente"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* WS Status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              background: wsStatus === 'connected' ? '#f0fdf4' : wsStatus === 'connecting' ? '#fffbeb' : '#fef2f2',
              color: wsStatus === 'connected' ? '#16a34a' : wsStatus === 'connecting' ? '#92400e' : '#dc2626',
              border: `1px solid ${wsStatus === 'connected' ? '#bbf7d0' : wsStatus === 'connecting' ? '#fde68a' : '#fecaca'}`,
            }}>
              {wsStatus === 'connected'
                ? <><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} /> LIVE</>
                : wsStatus === 'connecting'
                  ? <><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> Connexion…</>
                  : <><WifiOff size={11} /> Hors-ligne</>}
            </div>

            <button className="farms-hero-btn"
              onClick={fetchRecs}
              style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', padding: '6px 12px' }}>
              <RefreshCw size={13} />
            </button>

            <button className="farms-hero-btn" onClick={exportJSON}
              style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-2)' }}>
              <Download size={13} /> Export
            </button>
          </div>
        }
      />

      <div className="page-content">

        {/* ── Hero KPI strip ──────────────────────────────────────────── */}
        <div className="rc-hero">
          <div className="rc-hero-left">
            <div className="rc-hero-eyebrow">
              <Brain size={11} /> AI RECOMMENDATIONS · MOTEUR TEMPS RÉEL
            </div>
            <h1 className="rc-hero-title">Recommandations Intelligentes</h1>
            <p className="rc-hero-sub">
              Analyse IA continue · WebSocket + Polling {POLL_INTERVAL_MS/1000}s · {farms.length} ferme{farms.length !== 1 ? 's' : ''}
              {lastRefresh && <span style={{ marginLeft: 8, color: 'var(--color-text-3)' }}>· Màj {fmtTime(lastRefresh)}</span>}
            </p>
          </div>
          <div className="rc-kpi-strip">
            {[
              { val: recs.length,                                label: 'Total',     color: '#60a5fa', icon: Lightbulb },
              { val: counts.critical || 0,                       label: 'Critiques', color: '#f87171', icon: AlertOctagon },
              { val: counts.high || 0,                           label: 'Priorité',  color: '#fbbf24', icon: AlertTriangle },
              { val: recs.filter(r => r.is_actioned).length,     label: 'Traités',   color: '#4ade80', icon: CheckCircle2 },
            ].map(({ val, label, color, icon: Icon }) => (
              <div key={label} className="rc-kpi">
                <Icon size={18} color={color} />
                <div className="rc-kpi-val" style={{ color }}>{val}</div>
                <div className="rc-kpi-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Generation Panel ─────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16, padding: 24, marginBottom: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={20} color="#a78bfa" />
            </div>
            <div>
              <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: 15 }}>Moteur IA Souverain</div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>Ollama → Groq · RAG UTAP/AVFA · Météo Open-Meteo</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: 'rgba(139,92,246,.2)', color: '#a78bfa',
                border: '1px solid rgba(139,92,246,.3)',
              }}>SOUVERAIN</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Farm selector */}
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>FERME</label>
              <select
                value={selectedFarmId || ''}
                onChange={e => setSelectedFarmId(+e.target.value)}
                style={{
                  background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)',
                  color: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 13,
                  cursor: 'pointer', minWidth: 160,
                }}
              >
                {farms.map(f => (
                  <option key={f.id} value={f.id} style={{ background: '#1e293b' }}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Plant type */}
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>CULTURE</label>
              <select
                value={selectedPlant}
                onChange={e => setSelectedPlant(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)',
                  color: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {['grass', 'wheat', 'barley', 'alfalfa', 'clover', 'maize', 'sunflower', 'sorghum'].map(p => (
                  <option key={p} value={p} style={{ background: '#1e293b' }}>{p}</option>
                ))}
              </select>
            </div>

            {/* Generate button */}
            <button
              onClick={generateAI}
              disabled={aiLoading || !selectedFarmId}
              style={{
                padding: '9px 24px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: aiLoading ? 'rgba(139,92,246,.3)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff', fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(124,58,237,.4)',
                transition: 'all .2s',
              }}
            >
              {aiLoading
                ? <><span className="farms-spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Analyse IA…</>
                : <><Play size={13} /> Générer Recommandations</>}
            </button>
          </div>

          {/* AI Results */}
          {aiRecs && (
            <div style={{ marginTop: 20 }}>
              {/* Status bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: aiRecs.overall_status === 'Nominal' ? '#22c55e' : '#f59e0b', display: 'inline-block' }} />
                  <span style={{ color: '#94a3b8' }}>État :</span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{aiRecs.overall_status}</span>
                </div>
                {aiRecs.output_derja && (
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    <MessageCircle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Traduction Darija disponible
                  </div>
                )}
              </div>

              {/* Derja summary */}
              {aiRecs.output_derja && aiRecs.output_derja !== 'Khidma Ola' && (
                <div style={{
                  background: 'rgba(255,255,255,.05)', borderRadius: 10,
                  padding: '12px 16px', marginBottom: 16,
                  border: '1px solid rgba(255,255,255,.08)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    <MessageCircle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} /> ملخص بالدارجة التونسية
                  </div>
                  <div style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.7, direction: 'rtl', fontFamily: 'inherit' }}>
                    {aiRecs.output_derja}
                  </div>
                </div>
              )}

              {/* AI recommendation cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {aiRecs.recommendations?.map((ar, idx) => (
                  <AiRecCard key={idx} rec={ar} idx={idx} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div className="farms-search-wrap">
            <Search size={14} className="farms-search-icon" />
            <input className="farms-search-input" placeholder="Rechercher…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="farms-search-clear" onClick={() => setSearch('')}><X size={12} /></button>}
          </div>

          <div className="farms-filter-pills">
            {URGENCY_LEVELS.map(l => {
              const cfg = URGENCY_CFG[l];
              return (
                <button key={l}
                  className={`farms-filter-pill ${filter === l ? 'active' : ''}`}
                  onClick={() => setFilter(l)}
                  style={filter === l && l !== 'all' ? { background: cfg?.color, borderColor: cfg?.color, color: '#fff' } : {}}>
                  {l === 'all' ? 'Toutes' : cfg?.label}{l !== 'all' ? ` (${counts[l] || 0})` : ''}
                </button>
              );
            })}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-2)', cursor: 'pointer', marginLeft: 'auto' }}>
            <input type="checkbox" checked={showActioned} onChange={e => setShowActioned(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
            Afficher les traités
          </label>

          <div className="farms-count" style={{ flexShrink: 0 }}>
            <Activity size={13} /> {filtered.length} recommandation{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Priority Urgency Bar ─────────────────────────────────────── */}
        {recs.length > 0 && (
          <div style={{
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: '14px 20px', marginBottom: 20,
            display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Distribution des urgences
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 0, borderRadius: 99, overflow: 'hidden', height: 10, minWidth: 200 }}>
              {Object.entries(counts).map(([level, count]) => {
                const pct = recs.length > 0 ? (count / recs.length) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div key={level} title={`${URGENCY_CFG[level]?.label}: ${count}`}
                    style={{ width: `${pct}%`, background: URGENCY_CFG[level]?.color, transition: 'width .4s' }} />
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {Object.entries(counts).map(([level, count]) => (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-2)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: URGENCY_CFG[level]?.color, display: 'inline-block' }} />
                  {URGENCY_CFG[level]?.label}: <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recommendations list ─────────────────────────────────────── */}
        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>}

        {!loading && filtered.length === 0 && (
          <div className="al-empty">
            <Lightbulb size={48} color="#94a3b8" />
            <h3>Aucune recommandation</h3>
            <p>
              {recs.length === 0
                ? 'Le système n\'a pas généré de recommandations. Utilisez le bouton "Générer Recommandations" ci-dessus pour lancer l\'analyse IA.'
                : 'Aucune recommandation ne correspond aux filtres sélectionnés.'}
            </p>
          </div>
        )}

        <div className="rc-list">
          {filtered.map(r => (
            <RecCard key={r.id} rec={r} onAction={handleAction} />
          ))}
        </div>

      </div>

      {/* Pulse animation for live indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .6; transform: scale(1.3); }
        }
      `}</style>
    </>
  );
}
