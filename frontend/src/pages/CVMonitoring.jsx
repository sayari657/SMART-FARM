import React, { useEffect, useState } from 'react';
import {
  Eye, Filter, Search, X, Camera, Zap,
  AlertOctagon, AlertTriangle, Info, Activity,
  RefreshCw, TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { cvAPI } from '../services/api';

const SEV_CFG = {
  critical: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critique', icon: AlertOctagon },
  warning:  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Warning',  icon: AlertTriangle },
  info:     { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Info',     icon: Info },
};

const CLASS_EMOJI = {
  bee: '🐝', predator: '🦅', fire: '🔥', smoke: '💨',
  dead_bird: '💀', leaves: '🍃', lemon: '🍋', orange: '🍊',
  olive: '🫒', insects: '🐛',
};

const SEV_LEVELS = ['all', 'critical', 'warning', 'info'];

export default function CVMonitoring() {
  const { t, i18n } = useTranslation();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sevFilter, setSev]   = useState('all');
  const [search, setSearch]   = useState('');

  const load = async (spin = false) => {
    if (spin) setRefreshing(true);
    try {
      const r = await cvAPI.recent(200);
      setEvents(r.data);
    } finally { setLoading(false); if (spin) setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = events.filter(e => {
    const matchSev    = sevFilter === 'all' || e.severity === sevFilter;
    const matchSearch = !search ||
      (e.object_class || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.unit_name || '').toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSearch;
  });

  const counts = {
    critical: events.filter(e => e.severity === 'critical').length,
    warning:  events.filter(e => e.severity === 'warning').length,
    info:     events.filter(e => e.severity === 'info').length,
  };

  const topClasses = Object.entries(
    events.reduce((acc, e) => { acc[e.object_class] = (acc[e.object_class] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const rtl = i18n.language === 'ar';

  return (
    <>
      <Navbar
        title={t('cv.title', 'CV Intelligence Monitor')}
        subtitle={t('cv.subtitle', 'Détection YOLO v8 temps réel')}
        actions={
          <button className="farms-hero-btn" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} />
            Actualiser
          </button>
        }
      />
      <div className="page-content" style={{ direction: rtl ? 'rtl' : 'ltr' }}>

        {/* ── Hero ── */}
        <div className="cv-hero">
          <div className="cv-hero-left">
            <div className="cv-hero-eyebrow">
              <Camera size={11} /> YOLO v8 · COMPUTER VISION INTELLIGENCE
            </div>
            <h1 className="cv-hero-title">{t('cv.title', 'Surveillance Vision IA')}</h1>
            <p className="cv-hero-sub">Détection d'objets temps réel · {events.length} événements capturés · YOLO v8 haute précision</p>
            <div className="cv-hero-chips">
              {topClasses.map(([cls, cnt]) => (
                <span key={cls} className="cv-class-chip">
                  {CLASS_EMOJI[cls] || '📷'} {cls} <strong>×{cnt}</strong>
                </span>
              ))}
            </div>
          </div>
          <div className="cv-kpi-grid">
            {[
              { val: events.length,   label: 'Événements', color: '#4ade80',  icon: Activity },
              { val: counts.critical, label: 'Critiques',  color: '#f87171',  icon: AlertOctagon },
              { val: counts.warning,  label: 'Warnings',   color: '#fbbf24',  icon: AlertTriangle },
              { val: counts.info,     label: 'Info',        color: '#60a5fa', icon: Info },
            ].map(({ val, label, color, icon: Icon }) => (
              <div key={label} className="cv-kpi">
                <Icon size={18} color={color} />
                <div className="cv-kpi-val" style={{ color }}>{val}</div>
                <div className="cv-kpi-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="farms-toolbar">
          <div className="farms-search-wrap">
            <Search size={14} className="farms-search-icon" />
            <input className="farms-search-input" placeholder="Rechercher classe, unité…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="farms-search-clear" onClick={() => setSearch('')}><X size={12} /></button>}
          </div>
          <div className="farms-filter-pills">
            {SEV_LEVELS.map(s => (
              <button key={s}
                className={`farms-filter-pill ${sevFilter === s ? 'active' : ''}`}
                onClick={() => setSev(s)}
                style={sevFilter === s && s !== 'all' ? { background: SEV_CFG[s]?.color, borderColor: SEV_CFG[s]?.color } : {}}>
                {s === 'all' ? 'Tous' : SEV_CFG[s]?.label}{s !== 'all' ? ` (${counts[s] || 0})` : ''}
              </button>
            ))}
          </div>
          <div className="farms-count"><TrendingUp size={13} /> {filtered.length} résultats</div>
        </div>

        {/* ── Table ── */}
        <div className="cv-table-card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="al-empty">
              <Eye size={48} color="#94a3b8" />
              <h3>{t('common.no_data')}</h3>
              <p>Aucun événement CV correspondant aux filtres sélectionnés.</p>
            </div>
          ) : (
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    <th>Horodatage</th>
                    <th>Unité</th>
                    <th>Objet détecté</th>
                    <th>Confiance</th>
                    <th>Sévérité</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ev => {
                    const cfg = SEV_CFG[ev.severity] || SEV_CFG.info;
                    const Icon = cfg.icon;
                    const conf = ((ev.confidence || 0) * 100);
                    const confColor = conf >= 80 ? '#22c55e' : conf >= 60 ? '#f59e0b' : '#ef4444';
                    return (
                      <tr key={ev.id} className="cv-tr">
                        <td className="cv-td-ts">
                          {new Date(ev.timestamp).toLocaleString('fr-FR')}
                        </td>
                        <td className="cv-td-unit">
                          {ev.unit_name || `Unité ${ev.unit_id}`}
                        </td>
                        <td>
                          <div className="cv-class-cell">
                            <span className="cv-class-emoji">
                              {CLASS_EMOJI[ev.object_class] || '📷'}
                            </span>
                            <code className="cv-class-code">{ev.object_class}</code>
                          </div>
                        </td>
                        <td>
                          <div className="cv-conf-cell">
                            <div className="cv-conf-bar-track">
                              <div className="cv-conf-bar-fill"
                                style={{ width: `${conf}%`, background: confColor }} />
                            </div>
                            <span className="cv-conf-pct" style={{ color: confColor }}>
                              {conf.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="cv-sev-badge"
                            style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                            <Icon size={10} /> {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
