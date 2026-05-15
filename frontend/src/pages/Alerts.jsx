import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, AlertTriangle, AlertOctagon, CheckCircle2,
  Clock, Search, X, RefreshCw, Bell, Filter,
  ChevronRight, Info, Zap, Eye,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { alertsAPI } from '../services/api';

const SEV_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', icon: AlertOctagon, label: 'Critique' },
  WARNING:  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', icon: AlertTriangle, label: 'Avertissement' },
  INFO:     { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6', icon: Info, label: 'Info' },
};

const PRIO_CONFIG = {
  HIGH:   { color: '#dc2626', bg: '#fee2e2' },
  MEDIUM: { color: '#d97706', bg: '#fef3c7' },
  LOW:    { color: '#16a34a', bg: '#dcfce7' },
};

export default function Alerts() {
  const { t, i18n } = useTranslation();
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [sevFilter, setSev]       = useState('all');
  const [expanded, setExpanded]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    try {
      const res = await alertsAPI.critical();
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch { setAlerts([]); }
    finally { setLoading(false); if (showSpin) setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = alerts.filter(a => {
    const matchSev    = sevFilter === 'all' || a.alert_type === sevFilter;
    const matchSearch = !search ||
      (a.message || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.root_cause || '').toLowerCase().includes(search.toLowerCase());
    return matchSev && matchSearch;
  });

  const counts = {
    CRITICAL: alerts.filter(a => a.alert_type === 'CRITICAL').length,
    WARNING:  alerts.filter(a => a.alert_type === 'WARNING').length,
    resolved: alerts.filter(a => a.is_resolved).length,
  };

  const rtl = i18n.language === 'ar';

  return (
    <>
      <Navbar
        title="Alert Intelligence Center"
        subtitle="Surveillance en temps réel · Analyse IA des anomalies"
        actions={
          <button className="farms-hero-btn" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} />
            Actualiser
          </button>
        }
      />
      <div className="page-content" style={{ direction: rtl ? 'rtl' : 'ltr' }}>

        {/* ── Hero ── */}
        <div className="al-hero">
          <div className="al-hero-left">
            <div className="al-hero-eyebrow">
              <span className="al-pulse" style={{ background: counts.CRITICAL > 0 ? '#ef4444' : '#22c55e' }} />
              {counts.CRITICAL > 0 ? 'ALERTES ACTIVES DÉTECTÉES' : 'SYSTÈME NOMINAL'}
            </div>
            <h1 className="al-hero-title">Alert Intelligence Center</h1>
            <p className="al-hero-sub">Analyse IA des anomalies · Priorisation automatique · Actions correctives suggérées</p>
          </div>
          <div className="al-kpi-strip">
            {[
              { val: alerts.length,    label: 'Total',     color: '#94a3b8', icon: Bell },
              { val: counts.CRITICAL,  label: 'Critiques', color: '#ef4444', icon: AlertOctagon },
              { val: counts.WARNING,   label: 'Warnings',  color: '#f59e0b', icon: AlertTriangle },
              { val: counts.resolved,  label: 'Résolus',   color: '#22c55e', icon: CheckCircle2 },
            ].map(({ val, label, color, icon: Icon }) => (
              <div key={label} className="al-kpi">
                <Icon size={16} color={color} />
                <span className="al-kpi-val" style={{ color }}>{val}</span>
                <span className="al-kpi-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="al-toolbar">
          <div className="farms-search-wrap" style={{ maxWidth: 320 }}>
            <Search size={14} className="farms-search-icon" />
            <input className="farms-search-input" placeholder="Rechercher une alerte…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="farms-search-clear" onClick={() => setSearch('')}><X size={12} /></button>}
          </div>
          <div className="farms-filter-pills">
            {['all', 'CRITICAL', 'WARNING'].map(s => (
              <button key={s} className={`farms-filter-pill ${sevFilter === s ? 'active' : ''}`}
                onClick={() => setSev(s)}
                style={sevFilter === s && s !== 'all' ? { background: SEV_CONFIG[s]?.color, borderColor: SEV_CONFIG[s]?.color } : {}}>
                {s === 'all' ? 'Tous' : SEV_CONFIG[s]?.label}
                {s !== 'all' && ` (${counts[s] || 0})`}
              </button>
            ))}
          </div>
          <div className="farms-count">
            <Filter size={13} /> {filtered.length} alerte{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Alert list ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="al-empty">
            <CheckCircle2 size={48} color="#22c55e" />
            <h3>Aucune alerte active</h3>
            <p>Le système est nominal. Toutes les anomalies ont été résolues.</p>
          </div>
        ) : (
          <div className="al-list">
            {filtered.map((a, i) => {
              const cfg  = SEV_CONFIG[a.alert_type] || SEV_CONFIG.INFO;
              const pCfg = PRIO_CONFIG[a.priority]  || PRIO_CONFIG.LOW;
              const Icon = cfg.icon;
              const open = expanded === i;
              return (
                <div
                  key={i}
                  className={`al-card ${open ? 'open' : ''}`}
                  style={{ borderLeftColor: cfg.color }}
                  onClick={() => setExpanded(open ? null : i)}
                >
                  {/* Main row */}
                  <div className="al-card-row">
                    <div className="al-card-icon" style={{ background: cfg.bg, color: cfg.color }}>
                      <Icon size={16} />
                    </div>

                    <div className="al-card-main">
                      <div className="al-card-title">{a.message || 'Alerte système'}</div>
                      <div className="al-card-meta">
                        <Clock size={11} />
                        {a.timestamp ? new Date(a.timestamp).toLocaleString('fr-FR') : 'Maintenant'}
                      </div>
                    </div>

                    <div className="al-card-badges">
                      <span className="al-badge-sev" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                        <span className="al-pulse-sm" style={{ background: cfg.dot }} />
                        {cfg.label}
                      </span>
                      <span className="al-badge-prio" style={{ background: pCfg.bg, color: pCfg.color }}>
                        {a.priority || 'LOW'}
                      </span>
                    </div>

                    <ChevronRight size={16} color="#94a3b8"
                      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
                  </div>

                  {/* Expanded panel */}
                  {open && (
                    <div className="al-card-expanded">
                      {a.root_cause && (
                        <div className="al-detail-row">
                          <span className="al-detail-label">Cause racine</span>
                          <span className="al-detail-val">{a.root_cause}</span>
                        </div>
                      )}
                      {a.suggested_action && (
                        <div className="al-detail-row">
                          <span className="al-detail-label">Action suggérée</span>
                          <span className="al-detail-val green">{a.suggested_action}</span>
                        </div>
                      )}
                      <div className="al-detail-row">
                        <span className="al-detail-label">Statut</span>
                        <span className="al-detail-val">
                          {a.is_resolved
                            ? <span style={{ color: '#22c55e', fontWeight: 700 }}><CheckCircle2 size={12} style={{ marginRight: 4 }} />Résolu</span>
                            : <span style={{ color: '#ef4444', fontWeight: 700 }}><Zap size={12} style={{ marginRight: 4 }} />En cours</span>}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
