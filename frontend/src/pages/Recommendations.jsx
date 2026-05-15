import React, { useEffect, useState } from 'react';
import {
  Lightbulb, Sprout, AlertOctagon, AlertTriangle,
  CheckCircle2, TrendingUp, Zap, Brain, Leaf,
  Search, X, Filter, RefreshCw, ChevronRight,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import RecommendationPanel from '../components/RecommendationPanel';
import KPIBox from '../components/KPIBox';
import { recsAPI, farmsAPI, externalAPI } from '../services/api';

const URGENCY_LEVELS = ['all', 'critical', 'high', 'medium', 'low'];

const URGENCY_CFG = {
  critical: { color: '#ef4444', bg: '#fef2f2', label: 'Critique' },
  high:     { color: '#f59e0b', bg: '#fffbeb', label: 'Haute' },
  medium:   { color: '#3b82f6', bg: '#eff6ff', label: 'Moyenne' },
  low:      { color: '#22c55e', bg: '#f0fdf4', label: 'Basse' },
};

export default function Recommendations() {
  const [recs, setRecs]           = useState([]);
  const [advancedRecs, setAdv]    = useState(null);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    recsAPI.list().then(r => setRecs(r.data)).finally(() => setLoading(false));
    farmsAPI.list().then(fRes => {
      if (fRes.data.length > 0) {
        externalAPI.recommendations.getFarmAdvice(fRes.data[0].id, 'grass')
          .then(res => setAdv(res.data))
          .catch(() => {});
      }
    });
  }, []);

  const counts = Object.fromEntries(
    URGENCY_LEVELS.filter(l => l !== 'all').map(l => [l, recs.filter(r => r.urgency_level === l).length])
  );

  const filtered = recs.filter(r => {
    const matchFilter = filter === 'all' || r.urgency_level === filter;
    const matchSearch = !search || (r.title || r.message || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <>
      <Navbar title="Recommendations Engine" subtitle="Insights IA actionnables · Priorités agronomiques" />
      <div className="page-content">

        {/* ── Hero ── */}
        <div className="rc-hero">
          <div className="rc-hero-left">
            <div className="rc-hero-eyebrow">
              <Brain size={11} /> AI RECOMMENDATIONS · MOTEUR D'OPTIMISATION
            </div>
            <h1 className="rc-hero-title">Recommandations Intelligentes</h1>
            <p className="rc-hero-sub">Analyse IA continue · Priorisation automatique · Guides d'action agronomiques</p>
          </div>
          <div className="rc-kpi-strip">
            {[
              { val: recs.length,                           label: 'Total',    color: '#60a5fa', icon: Lightbulb },
              { val: counts.critical || 0,                  label: 'Critiques',color: '#f87171', icon: AlertOctagon },
              { val: counts.high || 0,                      label: 'Priorité', color: '#fbbf24', icon: AlertTriangle },
              { val: recs.filter(r => r.is_actioned).length,label: 'Actionnés',color: '#4ade80', icon: CheckCircle2 },
            ].map(({ val, label, color, icon: Icon }) => (
              <div key={label} className="rc-kpi">
                <Icon size={18} color={color} />
                <div className="rc-kpi-val" style={{ color }}>{val}</div>
                <div className="rc-kpi-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Agronomic Intel ── */}
        {advancedRecs?.recommendations?.length > 0 && (
          <div className="rc-agro-section">
            <div className="rc-agro-header">
              <div className="rc-agro-icon"><Sprout size={18} color="#16a34a" /></div>
              <div>
                <div className="rc-agro-title">Agronomic & Weather Intelligence</div>
                <div className="rc-agro-sub">Powered by Open-Meteo · Trefle.io · Analyse météo-agronomique</div>
              </div>
              <span className="rc-agro-badge">LIVE</span>
            </div>
            <div className="rc-agro-grid">
              {advancedRecs.recommendations.map((ar, idx) => (
                <div key={idx} className="rc-agro-card">
                  <div className="rc-agro-card-type">{ar.type} Layer</div>
                  <div className="rc-agro-card-title">{ar.title}</div>
                  <div className="rc-agro-card-action">{ar.action}</div>
                  <div className="rc-agro-card-reason"><em>Raison :</em> {ar.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="farms-toolbar" style={{ marginBottom: 20 }}>
          <div className="farms-search-wrap">
            <Search size={14} className="farms-search-icon" />
            <input className="farms-search-input" placeholder="Rechercher une recommandation…"
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
                  style={filter === l && l !== 'all' ? { background: cfg?.color, borderColor: cfg?.color } : {}}>
                  {l === 'all' ? 'Toutes' : cfg?.label}{l !== 'all' ? ` (${counts[l] || 0})` : ''}
                </button>
              );
            })}
          </div>
          <div className="farms-count"><TrendingUp size={13} /> {filtered.length} recommandation{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        {/* ── List ── */}
        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>}
        {!loading && filtered.length === 0 && (
          <div className="al-empty">
            <Lightbulb size={48} color="#94a3b8" />
            <h3>Aucune recommandation</h3>
            <p>Le moteur IA n'a pas de recommandations en attente pour les filtres sélectionnés.</p>
          </div>
        )}

        <div className="rc-list">
          {filtered.map(r => <RecommendationPanel key={r.id} rec={r} />)}
        </div>
      </div>
    </>
  );
}
