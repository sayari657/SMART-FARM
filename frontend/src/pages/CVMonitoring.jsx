import React, { useEffect, useState, useCallback } from 'react';
import {
  Eye, Search, X, Camera, LayoutGrid, List,
  AlertOctagon, AlertTriangle, Info, Activity,
  RefreshCw, TrendingUp, Clock, Trash2, CheckSquare,
  Square, ShieldAlert,
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
const SCAN_ALERT_KEY = 'farm_scan_alerts';

function loadScanAlerts() {
  try { return JSON.parse(localStorage.getItem(SCAN_ALERT_KEY) || '[]'); }
  catch { return []; }
}

export default function CVMonitoring() {
  const { t, i18n } = useTranslation();
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sevFilter, setSev]       = useState('all');
  const [search, setSearch]       = useState('');
  const [viewMode, setViewMode]   = useState('cards');
  const [selected, setSelected]     = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [showNoPreview, setShowNoPreview] = useState(false);

  const load = async (spin = false) => {
    if (spin) setRefreshing(true);
    try {
      const r = await cvAPI.recent(200);
      const dbEvents = r.data;
      const scanAlerts = loadScanAlerts();

      const enriched = dbEvents.map(ev => {
        if (ev.thumbnail_url || ev.frame_metadata?.thumbnail_b64) return ev;
        const evTime = new Date(ev.timestamp).getTime();
        const match = scanAlerts.find(sa => {
          const saTime = new Date(sa.timestamp).getTime();
          return Math.abs(evTime - saTime) < 30_000 &&
                 (sa.category === ev.camera_id || ev.camera_id === 'fire');
        });
        return match ? { ...ev, thumbnail_url: match.imageUrl } : ev;
      });

      const localOnly = scanAlerts
        .filter(sa => {
          const saTime = new Date(sa.timestamp).getTime();
          return !enriched.some(ev => Math.abs(new Date(ev.timestamp).getTime() - saTime) < 30_000);
        })
        .map(sa => ({
          id: `ls_${sa.id}`,
          timestamp: sa.timestamp,
          object_class: sa.detections?.[0]?.label || sa.category,
          confidence: sa.detections?.[0]?.confidence || 0,
          severity: 'critical',
          thumbnail_url: sa.imageUrl,
          frame_metadata: null,
          camera_id: sa.category,
          unit_name: 'Scanner IA',
          unit_id: null,
        }));

      setEvents([...enriched, ...localOnly].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } finally { setLoading(false); if (spin) setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = events.filter(e => {
    const hasImg   = !!(e.thumbnail_url || e.frame_metadata?.thumbnail_b64);
    if (!showNoPreview && !hasImg) return false;
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

  // ── Delete helpers ────────────────────────────────────────────────────────
  const removeLocal = (ids) => {
    const localIds = ids.filter(id => String(id).startsWith('ls_'));
    if (!localIds.length) return;
    const numericIds = new Set(localIds.map(id => Number(String(id).replace('ls_', ''))));
    const alerts = loadScanAlerts().filter(sa => !numericIds.has(sa.id));
    try { localStorage.setItem(SCAN_ALERT_KEY, JSON.stringify(alerts)); } catch {}
  };

  const deleteOne = async (ev) => {
    const id = ev.id;
    setEvents(prev => prev.filter(e => e.id !== id));
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
    if (String(id).startsWith('ls_')) {
      removeLocal([id]);
    } else {
      try { await cvAPI.deleteEvent(id); } catch {
        // re-add on failure
        setEvents(prev => [...prev, ev].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    }
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    setDeleting(true);
    const ids = [...selected];
    const dbIds = ids.filter(id => !String(id).startsWith('ls_'));
    const lsIds = ids.filter(id => String(id).startsWith('ls_'));

    setEvents(prev => prev.filter(e => !selected.has(e.id)));
    setSelected(new Set());
    setSelectMode(false);
    removeLocal(lsIds);
    if (dbIds.length) await cvAPI.purgeEvents(dbIds).catch(() => {});
    setDeleting(false);
  };

  const purgeNoPreview = async () => {
    setDeleting(true);
    const noPreview = events.filter(e =>
      !e.thumbnail_url && !e.frame_metadata?.thumbnail_b64
    );
    const dbIds = noPreview.map(e => e.id).filter(id => !String(id).startsWith('ls_'));
    const lsIds = noPreview.map(e => e.id).filter(id => String(id).startsWith('ls_'));

    setEvents(prev => prev.filter(e => e.thumbnail_url || e.frame_metadata?.thumbnail_b64));
    removeLocal(lsIds);
    if (dbIds.length) await cvAPI.purgeEvents(dbIds).catch(() => {});
    setDeleting(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(e => e.id)));
    }
  };

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  return (
    <>
      <Navbar
        title={t('cv.title', 'CV Intelligence Monitor')}
        subtitle={t('cv.subtitle', 'Détection YOLO v8 temps réel')}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {selectMode ? (
              <>
                <button className="farms-hero-btn" onClick={toggleSelectAll} style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {selected.size === filtered.length
                    ? <><CheckSquare size={13} /> Tout désélectionner</>
                    : <><Square size={13} /> Tout sélectionner ({filtered.length})</>}
                </button>
                {selected.size > 0 && (
                  <button className="farms-hero-btn" onClick={deleteSelected} disabled={deleting}
                    style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                    <Trash2 size={13} /> Supprimer ({selected.size})
                  </button>
                )}
                <button className="farms-hero-btn" onClick={exitSelectMode} style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <X size={13} /> Annuler
                </button>
              </>
            ) : (
              <>
                <button className="farms-hero-btn" onClick={() => setSelectMode(true)} style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <CheckSquare size={13} /> Sélectionner
                </button>
                <button className="farms-hero-btn" onClick={() => load(true)} disabled={refreshing}>
                  <RefreshCw size={14} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} />
                  Actualiser
                </button>
              </>
            )}
          </div>
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
            <p className="cv-hero-sub">
              Détection d'objets temps réel · {events.length} événements capturés · YOLO v8 haute précision
            </p>
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
              { val: events.length,   label: 'Événements', color: '#4ade80', icon: Activity },
              { val: counts.critical, label: 'Critiques',  color: '#f87171', icon: AlertOctagon },
              { val: counts.warning,  label: 'Warnings',   color: '#fbbf24', icon: AlertTriangle },
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
          <button
            onClick={() => setShowNoPreview(v => !v)}
            className={`farms-filter-pill ${showNoPreview ? 'active' : ''}`}
            style={showNoPreview ? { background: '#64748b', borderColor: '#64748b', color: '#fff' } : { color: '#94a3b8' }}
            title="Afficher aussi les événements sans image">
            <Eye size={11} /> Sans aperçu
          </button>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {selectMode && selected.size > 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '4px 10px', borderRadius: 8, border: '1px solid #fecaca' }}>
                {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
              </div>
            )}
            <div className="farms-count"><TrendingUp size={13} /> {filtered.length} résultats</div>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 3, gap: 2 }}>
              <button onClick={() => setViewMode('cards')} title="Vue cartes" style={{ padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'cards' ? '#fff' : 'transparent', boxShadow: viewMode === 'cards' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' }}>
                <LayoutGrid size={14} color={viewMode === 'cards' ? '#3b82f6' : '#94a3b8'} />
              </button>
              <button onClick={() => setViewMode('table')} title="Vue tableau" style={{ padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'table' ? '#fff' : 'transparent', boxShadow: viewMode === 'table' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none' }}>
                <List size={14} color={viewMode === 'table' ? '#3b82f6' : '#94a3b8'} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="al-empty">
            <Eye size={48} color="#94a3b8" />
            <h3>{t('common.no_data')}</h3>
            <p>Aucun événement CV correspondant aux filtres sélectionnés.</p>
          </div>
        ) : viewMode === 'cards' ? (

          /* ── Cards Grid ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
            {filtered.map(ev => {
              const cfg = SEV_CFG[ev.severity] || SEV_CFG.info;
              const SevIcon = cfg.icon;
              const conf = Math.round((ev.confidence || 0) * 100);
              const confColor = conf >= 80 ? '#22c55e' : conf >= 60 ? '#f59e0b' : '#ef4444';
              const imgSrc = ev.thumbnail_url || ev.frame_metadata?.thumbnail_b64 || null;
              const isSelected = selected.has(ev.id);

              return (
                <div key={ev.id}
                  onClick={selectMode ? () => toggleSelect(ev.id) : undefined}
                  style={{
                    background: '#fff', borderRadius: 14,
                    border: `1.5px solid ${isSelected ? '#3b82f6' : cfg.border}`,
                    overflow: 'hidden',
                    boxShadow: isSelected
                      ? '0 0 0 3px rgba(59,130,246,0.25)'
                      : `0 4px 16px ${ev.severity === 'critical' ? 'rgba(239,68,68,0.10)' : 'rgba(0,0,0,0.06)'}`,
                    position: 'relative',
                    cursor: selectMode ? 'pointer' : 'default',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                  }}>

                  {/* Select checkbox */}
                  {selectMode && (
                    <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, border: `2px solid ${isSelected ? '#3b82f6' : '#fff'}`,
                        background: isSelected ? '#3b82f6' : 'rgba(0,0,0,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <X size={10} color="#fff" strokeWidth={3} />}
                      </div>
                    </div>
                  )}

                  {/* Image */}
                  <div style={{ height: 160, background: '#0f0f0f', position: 'relative', overflow: 'hidden' }}>
                    {imgSrc
                      ? <img src={imgSrc} alt={ev.object_class}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={e => { e.target.style.display = 'none'; }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <span style={{ fontSize: 36 }}>{CLASS_EMOJI[ev.object_class?.toLowerCase()] || '🎥'}</span>
                          <span style={{ fontSize: 10, color: '#666' }}>Pas d'aperçu</span>
                        </div>
                    }
                    {/* Severity badge */}
                    {!selectMode && (
                      <div style={{ position: 'absolute', top: 10, left: 10, background: cfg.color, color: '#fff', padding: '3px 8px', borderRadius: 20, fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <SevIcon size={9} /> {cfg.label.toUpperCase()}
                      </div>
                    )}
                    {/* Confidence badge */}
                    <div style={{ position: 'absolute', top: 10, right: !selectMode ? 10 : 10, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '3px 8px', borderRadius: 20, fontSize: 9, fontWeight: 900 }}>
                      {conf}%
                    </div>
                    {/* Delete button (hover) */}
                    {!selectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteOne(ev); }}
                        title="Supprimer"
                        style={{
                          position: 'absolute', bottom: 8, right: 8,
                          background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: 8,
                          color: '#fff', cursor: 'pointer', padding: '5px 7px',
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 10, fontWeight: 700,
                          backdropFilter: 'blur(4px)',
                        }}>
                        <Trash2 size={11} /> Supprimer
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{CLASS_EMOJI[ev.object_class?.toLowerCase()] || '📷'}</span>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.object_class}</span>
                    </div>

                    {/* Confidence bar */}
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b', marginBottom: 2 }}>
                        <span>Confiance</span>
                        <span style={{ fontWeight: 800, color: confColor }}>{conf}%</span>
                      </div>
                      <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${conf}%`, background: confColor, borderRadius: 2 }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#94a3b8' }}>
                      <span><Clock size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{new Date(ev.timestamp).toLocaleString('fr-FR')}</span>
                      <span style={{ fontSize: 9, background: '#f8fafc', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.unit_name || `Unité ${ev.unit_id}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ── Table ── */
          <div className="cv-table-card">
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    {selectMode && (
                      <th style={{ width: 36 }}>
                        <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          {selected.size === filtered.length
                            ? <CheckSquare size={14} color="#3b82f6" />
                            : <Square size={14} color="#94a3b8" />}
                        </button>
                      </th>
                    )}
                    <th>Horodatage</th>
                    <th>Unité</th>
                    <th>Objet détecté</th>
                    <th>Confiance</th>
                    <th>Sévérité</th>
                    {!selectMode && <th style={{ width: 60 }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ev => {
                    const cfg = SEV_CFG[ev.severity] || SEV_CFG.info;
                    const Icon = cfg.icon;
                    const conf = (ev.confidence || 0) * 100;
                    const confColor = conf >= 80 ? '#22c55e' : conf >= 60 ? '#f59e0b' : '#ef4444';
                    const isSelected = selected.has(ev.id);
                    return (
                      <tr key={ev.id} className="cv-tr"
                        onClick={selectMode ? () => toggleSelect(ev.id) : undefined}
                        style={{ cursor: selectMode ? 'pointer' : 'default', background: isSelected ? '#eff6ff' : undefined }}>
                        {selectMode && (
                          <td style={{ textAlign: 'center' }}>
                            {isSelected
                              ? <CheckSquare size={14} color="#3b82f6" />
                              : <Square size={14} color="#94a3b8" />}
                          </td>
                        )}
                        <td className="cv-td-ts">{new Date(ev.timestamp).toLocaleString('fr-FR')}</td>
                        <td className="cv-td-unit">{ev.unit_name || `Unité ${ev.unit_id}`}</td>
                        <td>
                          <div className="cv-class-cell">
                            <span className="cv-class-emoji">{CLASS_EMOJI[ev.object_class] || '📷'}</span>
                            <code className="cv-class-code">{ev.object_class}</code>
                          </div>
                        </td>
                        <td>
                          <div className="cv-conf-cell">
                            <div className="cv-conf-bar-track">
                              <div className="cv-conf-bar-fill" style={{ width: `${conf}%`, background: confColor }} />
                            </div>
                            <span className="cv-conf-pct" style={{ color: confColor }}>{conf.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className="cv-sev-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                            <Icon size={10} /> {cfg.label}
                          </span>
                        </td>
                        {!selectMode && (
                          <td>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteOne(ev); }}
                              title="Supprimer"
                              style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#ef4444', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700 }}>
                              <Trash2 size={11} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
