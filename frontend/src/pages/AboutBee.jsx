import { useState, useEffect } from 'react';
import { useToast }   from '../hooks/useToast';
import { useBeeNav }  from '../hooks/useBeeNav';
import { useBeeData } from '../hooks/useBeeData';
import {
  LayoutDashboard, MapPin, Hexagon, Bell, RefreshCw,
  ChevronRight, CheckCircle, XCircle, AlertTriangle, ArrowLeft,
  Droplets, Package, CalendarClock,
} from 'lucide-react';
import { COLORS } from '../components/bee/BeeConstants';
import DashboardTab    from '../components/bee/DashboardTab';
import EmplacementsTab from '../components/bee/EmplacementsTab';
import HiveDetailView  from '../components/bee/HiveDetailView';
import InventaireTab   from '../components/bee/InventaireTab';
import ProductionTab   from '../components/bee/ProductionTab';
import StockTab        from '../components/bee/StockTab';
import PrevisionsTab   from '../components/bee/PrevisionsTab';
import ExpertAssistant from '../components/expert/ExpertAssistant';

/* ── Global styles + animations ── */
const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; }
    select option { background: #F9FAFB !important; color: #111827 !important; }
    input::placeholder, textarea::placeholder { color: #9CA3AF !important; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: rgba(229,231,235,0.4); border-radius: 10px; }
    ::-webkit-scrollbar-thumb { background: rgba(217,119,6,0.28); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(217,119,6,0.50); }
    @keyframes spin     { to { transform: rotate(360deg); } }
    @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideIn  { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:translateX(0); } }
    @keyframes pulse    { 0%,100%{opacity:0.45} 50%{opacity:1} }
    @keyframes badge    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
    .page-enter { animation: fadeUp 0.24s cubic-bezier(.22,1,.36,1) both; }
    .slide-in   { animation: slideIn 0.2s ease both; }
    .nav-pill:hover {
      background: rgba(255,255,255,0.22) !important;
      color: #ffffff !important;
      border-color: rgba(255,255,255,0.40) !important;
    }
    .hive-card { transition: transform 0.22s cubic-bezier(.22,1,.36,1), border-color 0.2s, box-shadow 0.22s; }
    .hive-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 18px 44px rgba(217,119,6,0.14), 0 4px 12px rgba(0,0,0,0.08) !important;
    }
    .action-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(217,119,6,0.25) !important;
    }
  `}</style>
);

/* ── Toast ── */
const TOAST_MAP = {
  success: [CheckCircle,   COLORS.success],
  error:   [XCircle,       COLORS.error],
  warning: [AlertTriangle, COLORS.warning],
};

function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => {
        const [Icon, color] = TOAST_MAP[t.type] || TOAST_MAP.success;
        return (
          <div key={t.id} className="slide-in"
            style={{ background: COLORS.surface, border: `1px solid ${color}35`,
              borderLeft: `3px solid ${color}`, borderRadius: 14,
              padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 12px 40px rgba(0,0,0,0.10)', minWidth: 280, maxWidth: 380 }}>
            <Icon size={16} color={color} />
            <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, flex: 1 }}>{t.msg}</span>
            <button onClick={() => onRemove(t.id)}
              style={{ background: 'none', border: 'none', color: COLORS.textMuted,
                cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

/* ── Nav tabs ── */
const NAV_TABS = [
  { id: 'dashboard',  label: "Vue d'ensemble", icon: LayoutDashboard, short: 'APERÇU'   },
  { id: 'sites',      label: 'Sites GIS',       icon: MapPin,          short: 'SITES'    },
  { id: 'inventaire', label: 'Inventaire',       icon: Hexagon,         short: 'RUCHES'   },
  { id: 'production', label: 'Production',       icon: Droplets,        short: 'RÉCOLTE'  },
  { id: 'stock',      label: 'Stock',            icon: Package,         short: 'STOCK'    },
  { id: 'previsions', label: 'Missions',         icon: CalendarClock,   short: 'MISSIONS' },
];

/* ════════════════════════════════════════════════════════════ */
export default function AboutBee() {
  const [modalActive,  setModalActive] = useState(null);
  const [filterApiary, setFilterApiary] = useState('');
  const [prodForm,     setProdForm]    = useState({ production_date: '', apiary_id: '', honey_kg: '', pollen_kg: '' });
  const [stock,        setStock]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('bee_stock') || '{}'); } catch { return {}; }
  });
  const [previsions, setPrevisions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bee_previsions') || '[]'); } catch { return []; }
  });

  const { toasts, toast, dismiss }                    = useToast();
  const { activePage, setActivePage,
          selectedHive, setSelectedHive,
          openHive, closeHive }                       = useBeeNav();
  const { emplacements, ruches, productions, visites,
          loading, syncing, stats, refresh,
          addApiary, removeApiary, addProduction }    = useBeeData(toast);

  useEffect(() => {
    if (selectedHive) {
      const updated = ruches.find(r => r.id === selectedHive.id);
      if (updated) setSelectedHive(updated);
    }
  }, [ruches]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddApiary = async fd => { const ok = await addApiary(fd); if (ok) setModalActive(null); };
  const handleDeleteApiary = async id => { if (!confirm('Supprimer ce site et ses ruches ?')) return; await removeApiary(id); };
  const handleAction = (tab, sub) => {
    if (tab === 'sync') { refresh(); return; }
    if (['production', 'stock', 'previsions'].includes(tab)) { setActivePage(tab); return; }
    setActivePage(tab === 'emplacements' || tab === 'sites' ? 'sites' : (tab === 'ruches' || tab === 'inventaire') ? 'inventaire' : 'dashboard');
    if (sub === 'addEmp') setModalActive('emplacement');
  };
  const handleAddProd = async () => {
    const ok = await addProduction(prodForm);
    if (ok) { setProdForm({ production_date: '', apiary_id: '', honey_kg: '', pollen_kg: '' }); setModalActive(null); }
  };
  const handleStockUpdate = (id, delta) => {
    setStock(prev => {
      const updated = { ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) };
      localStorage.setItem('bee_stock', JSON.stringify(updated));
      return updated;
    });
  };
  const handleAddPrevision = p => {
    const next = [...previsions, { ...p, id: Date.now(), tasks: p.tasks.map((t, i) => ({ id: i, text: t, status: 'todo' })) }];
    setPrevisions(next);
    localStorage.setItem('bee_previsions', JSON.stringify(next));
  };
  const handleUpdateTask = (prevId, taskId, status) => {
    const next = previsions.map(p => p.id === prevId
      ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, status } : t) }
      : p);
    setPrevisions(next);
    localStorage.setItem('bee_previsions', JSON.stringify(next));
  };

  const alertCount = parseInt(stats.alertes) || 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
      background: COLORS.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden', position: 'relative', color: COLORS.text }}>
      <GlobalStyles />
      <ToastContainer toasts={toasts} onRemove={dismiss} />

      {/* ── Header nav ── */}
      <header style={{
        flexShrink: 0, height: 72,
        background: 'linear-gradient(135deg, #92400e 0%, #b45309 28%, #d97706 62%, #f59e0b 100%)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 0,
        zIndex: 200, position: 'relative',
        boxShadow: '0 4px 28px rgba(146,64,14,0.40), 0 1px 0 rgba(245,158,11,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginRight: 22, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(255,255,255,.18)',
            border: '1.5px solid rgba(255,255,255,.40)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 20, lineHeight: 1 }}>🐝</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: '0.5px', lineHeight: 1 }}>APICRAFT</div>
            <div style={{ color: 'rgba(255,255,255,.70)', fontSize: 8, letterSpacing: '2.8px', fontWeight: 800, lineHeight: 1, marginTop: 3 }}>ENTERPRISE · IA</div>
          </div>
        </div>
        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,.25)', marginRight: 18, flexShrink: 0 }} />

        <nav style={{ display: 'flex', height: '100%', gap: 5, flex: 1, alignItems: 'center', overflowX: 'auto', paddingBottom: 2 }}>
          {NAV_TABS.map(tab => {
            const isActive  = activePage === tab.id && !selectedHive;
            const showAlert = tab.id === 'dashboard' && alertCount > 0;
            return (
              <button key={tab.id} onClick={() => { setActivePage(tab.id); closeHive(); }}
                className="nav-pill" title={tab.label}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4, width: 70, height: 54,
                  background: isActive ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.10)',
                  border: isActive ? '2px solid rgba(255,255,255,.85)' : '2px solid rgba(255,255,255,.18)',
                  borderRadius: 14, color: isActive ? '#92400e' : 'rgba(255,255,255,.82)',
                  cursor: 'pointer', transition: 'all 0.18s cubic-bezier(.22,1,.36,1)', flexShrink: 0,
                  boxShadow: isActive ? '0 4px 18px rgba(0,0,0,.15)' : 'none' }}>
                <tab.icon size={20} />
                <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.8px', lineHeight: 1, textTransform: 'uppercase' }}>{tab.short}</span>
                {showAlert && (
                  <span style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                    borderRadius: '50%', background: COLORS.error, color: '#fff',
                    fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', animation: 'badge 1.5s ease-in-out infinite',
                    border: '2px solid #fff' }}>{alertCount}</span>
                )}
              </button>
            );
          })}
          {selectedHive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 13 }}>
              <button onClick={closeHive}
                style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)',
                  borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '5px 10px',
                  fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                <ArrowLeft size={13} /> Inventaire
              </button>
              <ChevronRight size={12} color="rgba(255,255,255,.6)" />
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 13 }}>{selectedHive.identifier}</span>
              {selectedHive.hive_type === 'queen_bank' && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.8)',
                  background: 'rgba(255,255,255,.15)', padding: '2px 8px', borderRadius: 6 }}>👑 Banque</span>
              )}
            </div>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ height: 34, padding: '0 12px', borderRadius: 10,
            background: 'rgba(255,255,255,.92)', border: '1px solid rgba(255,255,255,.7)',
            display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,.10)' }}>
            <span style={{ fontSize: 14 }}>🍯</span>
            <span style={{ color: '#92400e', fontWeight: 800, fontSize: 12 }}>{stats.totalMiel}</span>
          </div>
          {alertCount > 0 && (
            <div style={{ height: 34, padding: '0 12px', borderRadius: 10, background: COLORS.error,
              display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(239,68,68,.35)' }}>
              <Bell size={12} color="#fff" style={{ animation: 'badge 2s ease-in-out infinite' }} />
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>{alertCount}</span>
            </div>
          )}
          <button onClick={() => refresh()} disabled={syncing}
            style={{ height: 34, padding: '0 14px', borderRadius: 10,
              background: 'rgba(255,255,255,.92)', border: '1px solid rgba(255,255,255,.7)',
              color: '#92400e', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
            <RefreshCw size={12} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />
            {syncing ? '…' : 'Sync'}
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: 'auto',
        padding: 'clamp(12px, 3vw, 28px) clamp(12px, 3vw, 32px)',
        position: 'relative', zIndex: 1, background: COLORS.bg }}>

        {loading && !syncing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '60vh', gap: 18 }}>
            <div style={{ position: 'relative', width: 56, height: 56 }}>
              <div style={{ width: 56, height: 56, border: `3px solid ${COLORS.accentGlow}`,
                borderTop: `3px solid ${COLORS.accent}`, borderRadius: '50%',
                animation: 'spin 0.9s linear infinite' }} />
              <Hexagon size={22} color={COLORS.accent} style={{ position: 'absolute',
                top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.8 }} />
            </div>
            <div style={{ color: COLORS.textMuted, fontWeight: 600, fontSize: 14 }}>
              Chargement des données apicoles…
            </div>
          </div>

        ) : selectedHive ? (
          <div className="page-enter">
            <HiveDetailView hive={selectedHive} emplacements={emplacements}
              onBack={() => setSelectedHive(null)} toast={toast} />
          </div>

        ) : (
          <div className="page-enter">

            {/* Hero — dashboard only */}
            {activePage === 'dashboard' && (
              <div className="bee-hero" style={{ marginBottom: 28 }}>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                  opacity: 0.06, pointerEvents: 'none', borderRadius: 20 }}
                  xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="hc"  x="0"  y="0"  width="44" height="50" patternUnits="userSpaceOnUse">
                      <polygon points="22,2 40,12 40,38 22,48 4,38 4,12" fill="none" stroke="#fff" strokeWidth="1.2"/>
                    </pattern>
                    <pattern id="hc2" x="22" y="25" width="44" height="50" patternUnits="userSpaceOnUse">
                      <polygon points="22,2 40,12 40,38 22,48 4,38 4,12" fill="none" stroke="#fff" strokeWidth="1.2"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#hc)" />
                  <rect width="100%" height="100%" fill="url(#hc2)" />
                </svg>
                <div className="bee-hero-left">
                  <div className="bee-hero-eyebrow">🐝 APICRAFT · APICULTURE INTELLIGENTE</div>
                  <h1 className="bee-hero-title">Gestion Apicole IA</h1>
                  <p className="bee-hero-sub">
                    {emplacements.length} site{emplacements.length !== 1 ? 's' : ''} · {ruches.length} ruche{ruches.length !== 1 ? 's' : ''} · Prévisions COLOSS
                  </p>
                </div>
                <div className="bee-hero-stats">
                  {[
                    { val: stats.totalMiel,     label: 'Miel récolté', icon: '🍯' },
                    { val: stats.sante,         label: 'Santé moy.',   icon: '💚' },
                    { val: ruches.length,       label: 'Ruches',       icon: '🏠' },
                    { val: emplacements.length, label: 'Sites',        icon: '📍' },
                  ].map(({ val, label, icon }) => (
                    <div key={label} className="bee-hero-stat">
                      <span className="bee-hero-stat-icon">{icon}</span>
                      <div className="bee-hero-stat-val">{val}</div>
                      <div className="bee-hero-stat-label">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slim header — other tabs */}
            {activePage !== 'dashboard' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}` }}>
                <div>
                  <div style={{ fontSize: 10, color: COLORS.accent, fontWeight: 800,
                    letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>
                    APICRAFT · {NAV_TABS.find(t => t.id === activePage)?.short}
                  </div>
                  <h2 style={{ fontSize: 26, fontWeight: 900, color: COLORS.text, margin: 0, letterSpacing: '-0.02em' }}>
                    {NAV_TABS.find(t => t.id === activePage)?.label}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ padding: '6px 14px', borderRadius: 10,
                    background: COLORS.accentGlow, border: `1px solid ${COLORS.borderHigh}` }}>
                    <span style={{ fontSize: 12 }}>🍯</span>
                    <span style={{ color: COLORS.accentDark, fontWeight: 800, fontSize: 12, marginLeft: 6 }}>{stats.totalMiel}</span>
                  </div>
                  {alertCount > 0 && (
                    <div style={{ padding: '6px 14px', borderRadius: 10,
                      background: COLORS.error + '12', border: `1px solid ${COLORS.error}40` }}>
                      <span style={{ color: COLORS.error, fontWeight: 800, fontSize: 12 }}>
                        ⚠ {alertCount} alerte{alertCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activePage === 'dashboard' && (
              <DashboardTab ruches={ruches} emplacements={emplacements} stats={stats}
                onAction={handleAction} onSync={refresh} isProcessing={syncing} />
            )}
            {activePage === 'sites' && (
              <EmplacementsTab emplacements={emplacements} onAction={handleAction}
                handleAddEmp={handleAddApiary} onDelete={handleDeleteApiary}
                modalActive={modalActive} setModalActive={setModalActive}
                onSelectSite={site => { setFilterApiary(String(site.id)); setActivePage('inventaire'); }} />
            )}
            {activePage === 'inventaire' && (
              <InventaireTab ruches={ruches} emplacements={emplacements}
                filterApiary={filterApiary} onClearFilter={() => setFilterApiary('')}
                onSelectHive={h => { openHive(h); setActivePage('inventaire'); }}
                onAddRuche={refresh} toast={toast} />
            )}
            {activePage === 'production' && (
              <ProductionTab productions={productions} emplacements={emplacements}
                ruches={ruches} visites={visites} stock={stock}
                modalActive={modalActive} setModalActive={setModalActive}
                prodForm={prodForm} setProdForm={setProdForm}
                handleAddProd={handleAddProd} onSync={refresh} syncing={syncing} />
            )}
            {activePage === 'stock' && (
              <StockTab stock={stock} visites={visites} ruches={ruches} onUpdate={handleStockUpdate} />
            )}
            {activePage === 'previsions' && (
              <PrevisionsTab emplacements={emplacements} ruches={ruches}
                previsions={previsions} onAdd={handleAddPrevision} onUpdateTask={handleUpdateTask} />
            )}
          </div>
        )}
      </main>

      <ExpertAssistant species="bee" color={COLORS.accent} />
    </div>
  );
}
