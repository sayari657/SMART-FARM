import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, MapPin, Hexagon, Bell, RefreshCw,
  Plus, Search, ChevronRight,
  CheckCircle, XCircle, AlertTriangle, Sparkles,
  ArrowLeft, Droplets, Shield, X
} from 'lucide-react';
import { COLORS } from '../components/bee/BeeConstants';
import DashboardTab    from '../components/bee/DashboardTab';
import EmplacementsTab from '../components/bee/EmplacementsTab';
import HiveDetailView  from '../components/bee/HiveDetailView';
import ExpertAssistant from '../components/expert/ExpertAssistant';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/bee/history`;

/* ────────────────────────────────────────── */
/*  Global styles + animations                */
/* ────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    *, *::before, *::after { box-sizing: border-box; margin: 0; }
    select option { background: #0b1022 !important; color: #f1f5f9 !important; }
    input::placeholder, textarea::placeholder { color: #475569 !important; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.25); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(245,158,11,0.5); }

    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes fadeUp  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes orb1    { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,30px) scale(1.08)} }
    @keyframes orb2    { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,20px) scale(1.05)} }
    @keyframes pulse   { 0%,100%{opacity:0.5} 50%{opacity:1} }
    @keyframes badge   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }

    .page-enter  { animation: fadeUp 0.22s ease both; }
    .slide-in    { animation: slideIn 0.2s ease both; }
    .nav-pill:hover  { background: rgba(245,158,11,0.08) !important; color: #f1f5f9 !important; }
    .hive-card:hover { transform: translateY(-4px); }
    .hive-card { transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
    .action-btn:hover { transform: translateY(-2px); }
    .action-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  `}</style>
);

/* ────────────────────────────────────────── */
/*  Ambient Background                        */
/* ────────────────────────────────────────── */
const AmbientBg = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
    {/* Orb 1 - amber */}
    <div style={{ position: 'absolute', top: '8%', left: '18%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'orb1 18s ease-in-out infinite' }} />
    {/* Orb 2 - purple */}
    <div style={{ position: 'absolute', bottom: '12%', right: '14%', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'orb2 22s ease-in-out infinite' }} />
    {/* Orb 3 - blue */}
    <div style={{ position: 'absolute', top: '55%', left: '55%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)', filter: 'blur(50px)' }} />
    {/* Hex dot grid */}
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.025 }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hex" x="0" y="0" width="40" height="46" patternUnits="userSpaceOnUse">
          <polygon points="20,2 38,12 38,34 20,44 2,34 2,12" fill="none" stroke="#f59e0b" strokeWidth="0.8"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
    </svg>
  </div>
);

/* ────────────────────────────────────────── */
/*  Toast                                      */
/* ────────────────────────────────────────── */
const TOAST_MAP = { success: [CheckCircle, COLORS.success], error: [XCircle, COLORS.error], warning: [AlertTriangle, '#fb923c'] };

function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => {
        const [Icon, color] = TOAST_MAP[t.type] || TOAST_MAP.success;
        return (
          <div key={t.id} className="slide-in" style={{ background: 'rgba(13,19,42,0.97)', backdropFilter: 'blur(20px)', border: `1px solid ${color}35`, borderLeft: `3px solid ${color}`, borderRadius: 14, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`, minWidth: 280, maxWidth: 380 }}>
            <Icon size={16} color={color} />
            <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, flex: 1 }}>{t.msg}</span>
            <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Helpers                                    */
/* ────────────────────────────────────────── */
const gradeColor = s => s >= 8 ? COLORS.gradeA : s >= 6 ? COLORS.gradeB : s >= 4 ? COLORS.gradeC : COLORS.gradeD;
const gradeLabel = s => s >= 8 ? 'A' : s >= 6 ? 'B' : s >= 4 ? 'C' : 'D';

/* ────────────────────────────────────────── */
/*  Inventaire Ruches                         */
/* ────────────────────────────────────────── */
function InventaireRuches({ ruches, emplacements, onSelectHive, onAddRuche, toast }) {
  const [search, setSearch]       = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({
    identifier: '', apiary_id: '', hive_type: 'Langstroth',
    queen_year: new Date().getFullYear(), health_score: 10, honey_level: 5, force_level: 5
  });

  const filtered = ruches.filter(r => {
    const ms = !search     || r.identifier?.toLowerCase().includes(search.toLowerCase());
    const mi = !filterSite || String(r.apiary_id) === filterSite;
    const mg = !filterGrade || gradeLabel(r.health_score ?? 7) === filterGrade;
    return ms && mi && mg;
  });

  const active  = ruches.filter(r => r.is_active !== false).length;
  const alerts  = ruches.filter(r => (r.health_score ?? 10) < 4).length;
  const avgH    = ruches.length ? ruches.reduce((s, r) => s + (r.health_score || 0), 0) / ruches.length : 0;
  const grades  = { A: 0, B: 0, C: 0, D: 0 };
  ruches.forEach(r => { grades[gradeLabel(r.health_score ?? 7)]++; });

  const iSt = {
    height: 44, background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)',
    border: `1px solid ${COLORS.border}`, borderRadius: 12,
    padding: '0 14px', color: '#f1f5f9', outline: 'none', fontSize: 13, width: '100%'
  };

  const handleSubmit = () => {
    if (!form.identifier || !form.apiary_id) { toast('Identifiant et site requis.', 'warning'); return; }
    onAddRuche({ ...form, apiary_id: Number(form.apiary_id) });
    setForm({ identifier: '', apiary_id: '', hive_type: 'Langstroth', queen_year: new Date().getFullYear(), health_score: 10, honey_level: 5, force_level: 5 });
    setShowForm(false);
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: COLORS.accent, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 8 }}>Gestion Apicole · Enterprise</div>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1 }}>Inventaire Ruches</h1>
          <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 8 }}>{ruches.length} ruches enregistrées · {active} actives</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="action-btn"
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, border: 'none', color: 'white', padding: '13px 26px', borderRadius: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 8px 24px -4px ${COLORS.accent}50`, fontSize: 14 }}>
          <Plus size={18} /> Nouvelle Ruche
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr) 2fr', gap: 12 }}>
        {[
          { label: 'ACTIVES', value: `${active}`, sub: `/ ${ruches.length}`, color: COLORS.gradeA },
          { label: 'ALERTES', value: `${alerts}`, sub: 'Critiques', color: alerts > 0 ? COLORS.gradeD : COLORS.gradeA },
          { label: 'SANTÉ MOY.', value: avgH.toFixed(1), sub: '/10 COLOSS', color: gradeColor(avgH) },
          { label: 'SITES', value: emplacements.length, sub: 'Emplacements', color: COLORS.info },
        ].map(k => (
          <div key={k.label} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: '16px 20px' }}>
            <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 800, letterSpacing: '1px' }}>{k.label}</div>
            <div style={{ color: k.color, fontWeight: 900, fontSize: 26, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginTop: 4 }}>{k.value}</div>
            <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
        {/* Grade distribution */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: '16px 20px' }}>
          <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 800, letterSpacing: '1px', marginBottom: 10 }}>DISTRIBUTION GRADES</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(grades).map(([g, n]) => (
              <div key={g} style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: gradeColor(g === 'A' ? 9 : g === 'B' ? 7 : g === 'C' ? 5 : 2), fontSize: 11, fontWeight: 800 }}>G{g}</span>
                  <span style={{ color: '#f1f5f9', fontSize: 11, fontWeight: 700 }}>{n}</span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ height: '100%', width: ruches.length ? `${(n / ruches.length) * 100}%` : '0%', borderRadius: 4, background: gradeColor(g === 'A' ? 9 : g === 'B' ? 7 : g === 'C' ? 5 : 2) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="page-enter" style={{ background: COLORS.surface, backdropFilter: 'blur(12px)', border: `1px solid ${COLORS.borderHigh}`, borderRadius: 22, padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <span style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 16 }}>Nouvelle Ruche</span>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>IDENTIFIANT *</label>
              <input placeholder="HIVE-0042" value={form.identifier} onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))} style={iSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>SITE *</label>
              <select value={form.apiary_id} onChange={e => setForm(f => ({ ...f, apiary_id: e.target.value }))} style={iSt}>
                <option value="">Sélectionner…</option>
                {emplacements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>TYPE</label>
              <select value={form.hive_type} onChange={e => setForm(f => ({ ...f, hive_type: e.target.value }))} style={iSt}>
                {['Langstroth', 'Dadant', 'Warré', 'Kenyane', 'Traditionnel'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>ANNÉE REINE</label>
              <input type="number" min="2015" max="2030" value={form.queen_year} onChange={e => setForm(f => ({ ...f, queen_year: parseInt(e.target.value) }))} style={iSt} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSubmit} style={{ flex: 1, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Créer</button>
              <button onClick={() => setShowForm(false)} style={{ height: 44, padding: '0 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une ruche…"
            style={{ ...iSt, paddingLeft: 38, width: '100%' }} />
        </div>
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)} style={{ ...iSt, width: 'auto', paddingRight: 36 }}>
          <option value="">Tous les sites</option>
          {emplacements.map(e => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
        </select>
        {['', 'A', 'B', 'C', 'D'].map(g => (
          <button key={g} onClick={() => setFilterGrade(g)}
            style={{ height: 44, padding: '0 16px', borderRadius: 12, background: filterGrade === g ? (g ? gradeColor(g === 'A' ? 9 : g === 'B' ? 7 : g === 'C' ? 5 : 2) + '25' : COLORS.accentGlow) : 'rgba(255,255,255,0.03)', border: `1px solid ${filterGrade === g ? (g ? gradeColor(g === 'A' ? 9 : g === 'B' ? 7 : g === 'C' ? 5 : 2) + '50' : COLORS.borderHigh) : COLORS.border}`, color: filterGrade === g ? '#f1f5f9' : COLORS.textMuted, cursor: 'pointer', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
            {g ? `Grade ${g}` : 'Tous'}
          </button>
        ))}
      </div>

      {/* Hive grid */}
      {filtered.length === 0 ? (
        <div style={{ height: 300, background: 'rgba(255,255,255,0.015)', border: `2px dashed rgba(255,255,255,0.06)`, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: COLORS.textMuted }}>
          <Hexagon size={52} strokeWidth={1} style={{ opacity: 0.2 }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>{ruches.length === 0 ? 'Aucune ruche enregistrée' : 'Aucun résultat'}</div>
          <div style={{ fontSize: 12 }}>{ruches.length === 0 ? 'Créez votre première ruche.' : 'Modifiez vos filtres.'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
          {filtered.map(r => {
            const site = emplacements.find(e => e.id === r.apiary_id);
            const sc   = r.health_score ?? 7;
            const gc   = gradeColor(sc);
            const gl   = gradeLabel(sc);
            const isActive = r.is_active !== false;
            return (
              <button key={r.id} onClick={() => onSelectHive(r)} className="hive-card"
                style={{ background: COLORS.surface, borderRadius: 22, border: `1px solid ${COLORS.border}`, padding: 0, cursor: 'pointer', textAlign: 'left', overflow: 'hidden', position: 'relative', width: '100%' }}>

                {/* Gradient top bar */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${gc}, ${gc}50, transparent)` }} />

                {/* Ambient glow behind card */}
                <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${gc}10 0%, transparent 70%)`, pointerEvents: 'none' }} />

                <div style={{ padding: '20px 22px' }}>
                  {/* Row 1 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: `${gc}18`, border: `1px solid ${gc}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Hexagon size={22} color={gc} />
                      </div>
                      <div>
                        <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 17, letterSpacing: '-0.01em' }}>{r.identifier}</div>
                        <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={10} /> {site?.name || 'Site ?'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                      <span style={{ padding: '4px 11px', borderRadius: 9, background: `${gc}20`, color: gc, fontSize: 14, fontWeight: 900, letterSpacing: '0.5px' }}>G{gl}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? COLORS.gradeA : COLORS.textMuted, display: 'inline-block', boxShadow: isActive ? `0 0 6px ${COLORS.gradeA}` : 'none', animation: isActive ? 'pulse 2s infinite' : 'none' }} />
                        <span style={{ color: isActive ? COLORS.gradeA : COLORS.textMuted }}>{isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Metric bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {[
                      { label: 'Santé', value: sc, color: gc },
                      { label: 'Miel', value: r.honey_level ?? 5, color: COLORS.accent },
                      { label: 'Force', value: r.force_level ?? 5, color: COLORS.gradeA },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}>{m.label}</span>
                          <span style={{ color: m.color, fontSize: 10, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{m.value?.toFixed(1)}<span style={{ color: COLORS.textMuted }}>/10</span></span>
                        </div>
                        <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
                          <div style={{ height: '100%', width: `${(m.value / 10) * 100}%`, borderRadius: 3, background: `linear-gradient(90deg, ${m.color}, ${m.color}70)`, boxShadow: `0 0 6px ${m.color}40`, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>
                      {r.hive_type || 'Ruche'}{r.queen_year ? ` · ♛ ${r.queen_year}` : ''}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: gc, fontSize: 12, fontWeight: 700 }}>
                      Ouvrir <ChevronRight size={13} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────── */
/*  Nav tabs config                           */
/* ────────────────────────────────────────── */
const NAV_TABS = [
  { id: 'dashboard',  label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'sites',      label: 'Sites GIS',       icon: MapPin },
  { id: 'inventaire', label: 'Inventaire',       icon: Hexagon },
];

/* ────────────────────────────────────────── */
/*  Main component                            */
/* ────────────────────────────────────────── */
export default function AboutBee() {
  const [activePage, setActivePage]     = useState('dashboard');
  const [selectedHive, setSelectedHive] = useState(null);
  const [modalActive, setModalActive]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [syncing, setSyncing]           = useState(false);
  const [toasts, setToasts]             = useState([]);

  const [emplacements, setEmplacements] = useState([]);
  const [ruches,       setRuches]       = useState([]);
  const [visites,      setVisites]      = useState([]);
  const [productions,  setProductions]  = useState([]);
  const [depenses,     setDepenses]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('bee_depenses') || '[]'); } catch { return []; }
  });
  const [previsions, setPrevisions] = useState([]);
  const [stats, setStats] = useState({ totalMiel: '0 kg', sante: '100%', alertes: '0' });

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const apiFetch = async (path, opts = {}) => {
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) };
    return fetch(`${API}${path}`, { ...opts, headers: h });
  };

  const fetchData = useCallback(async (showSpin = true) => {
    if (showSpin) setSyncing(true);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const h = token ? { Authorization: `Bearer ${token}` } : {};
      const [r1, r2, r3, r4] = await Promise.all([
        fetch(`${API}/apiaries`,    { headers: h }),
        fetch(`${API}/hives`,       { headers: h }),
        fetch(`${API}/visits`,      { headers: h }),
        fetch(`${API}/productions`, { headers: h }),
      ]);
      const emp  = r1.ok ? await r1.json() : [];
      const hiv  = r2.ok ? await r2.json() : [];
      const vis  = r3.ok ? await r3.json() : [];
      const prd  = r4.ok ? await r4.json() : [];
      setEmplacements(emp); setRuches(hiv); setVisites(vis); setProductions(prd);
      if (selectedHive) setSelectedHive(h2 => hiv.find(h => h.id === h2?.id) || h2);
      const honey = prd.reduce((a, p) => a + (parseFloat(p.honey_kg) || 0), 0);
      const avgH  = hiv.length ? (hiv.reduce((a, r) => a + (r.health_score || 0), 0) / hiv.length) * 10 : 100;
      const alrts = hiv.filter(r => (r.health_score || 10) < 4).length;
      setStats({ totalMiel: `${honey.toFixed(1)} kg`, sante: `${Math.round(avgH)}%`, alertes: alrts.toString() });
    } catch { toast('Erreur de connexion au serveur', 'error'); }
    finally { setLoading(false); setSyncing(false); }
  }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { localStorage.setItem('bee_depenses', JSON.stringify(depenses)); }, [depenses]);

  /* ── CRUD ── */
  const handleAddRuche    = async fd => { const res = await apiFetch('/hives',       { method: 'POST', body: JSON.stringify({ ...fd, apiary_id: Number(fd.apiary_id) }) }); res.ok ? (fetchData(), toast('Ruche créée')) : toast((await res.json().catch(()=>({}))).detail || 'Erreur', 'error'); };
  const handleAddApiary   = async fd => { const res = await apiFetch('/apiaries',    { method: 'POST', body: JSON.stringify({ ...fd, latitude: fd.latitude ? parseFloat(fd.latitude) : null, longitude: fd.longitude ? parseFloat(fd.longitude) : null }) }); res.ok ? (setModalActive(null), fetchData(), toast('Site créé')) : toast('Erreur', 'error'); };
  const handleDeleteApiary= async id => { if (!confirm('Supprimer ce site et ses ruches ?')) return; await apiFetch(`/apiaries/${id}`, { method: 'DELETE' }); fetchData(); toast('Site supprimé', 'warning'); };
  const handleDeleteRuche = async id => { if (!confirm('Supprimer cette ruche ?')) return; await apiFetch(`/hives/${id}`, { method: 'DELETE' }); fetchData(); toast('Ruche supprimée', 'warning'); };

  const handleAddVisite = async fd => {
    if (!fd.hive_id) { toast('Sélectionnez une ruche.', 'warning'); return; }
    const payload = { hive_id: Number(fd.hive_id)||null, apiary_id: Number(fd.apiary_id)||null, visit_date: fd.visit_date||new Date().toISOString().split('T')[0], health_state: fd.health_state||'health', temperature: fd.temperature?parseFloat(fd.temperature):null, honey_level: fd.honey_level||'Moyen', needs_sirop: Number(fd.needs_sirop)||0, needs_pate: Number(fd.needs_pate)||0, needs_traitement: Number(fd.needs_traitement)||0, harvest_kg: parseFloat(fd.harvest_kg)||0, pollen_kg: parseFloat(fd.pollen_kg)||0, notes: fd.notes||'', photo_url: fd.photo_url||'', gps_coords: fd.gps_coords||'' };
    const res = await apiFetch('/visits', { method: 'POST', body: JSON.stringify(payload) });
    res.ok ? (fetchData(), toast('Inspection enregistrée')) : toast('Erreur', 'error');
  };
  const handleDeleteVisite = async id => { await apiFetch(`/visits/${id}`, { method: 'DELETE' }); fetchData(); toast('Supprimée', 'warning'); };
  const handleAddProd      = async fd => { const res = await apiFetch('/productions', { method: 'POST', body: JSON.stringify({ ...fd, apiary_id: Number(fd.apiary_id)||null }) }); res.ok ? (fetchData(), toast('Récolte enregistrée')) : toast('Erreur', 'error'); };
  const handleDeleteProd   = async id => { await apiFetch(`/productions/${id}`, { method: 'DELETE' }); fetchData(); toast('Supprimée', 'warning'); };
  const handleAddDepense   = data => { setDepenses(p => [{ ...data, id: Date.now() }, ...p]); toast('Dépense enregistrée'); };
  const handleDeleteDepense = id => { setDepenses(p => p.filter(d => d.id !== id)); toast('Supprimée', 'warning'); };
  const handleAddPrevision = data => { setPrevisions(p => [...p, { ...data, id: Date.now(), tasks: (data.tasks||[]).map((t,i) => ({ id: i, text: t, status: 'todo' })) }]); toast('Mission créée'); };
  const handleUpdateTask   = (pId, tId, st) => setPrevisions(p => p.map(pr => pr.id === pId ? { ...pr, tasks: pr.tasks.map(t => t.id === tId ? { ...t, status: st } : t) } : pr));
  const handleAction       = (tab, sub) => { if (tab === 'sync') { fetchData(); return; } setActivePage(tab === 'emplacements' || tab === 'sites' ? 'sites' : tab === 'ruches' ? 'inventaire' : 'dashboard'); if (sub === 'addEmp') setModalActive('emplacement'); };

  const alertCount = parseInt(stats.alertes) || 0;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: COLORS.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", overflow: 'hidden', position: 'relative', color: '#f1f5f9' }}>
      <GlobalStyles />
      <AmbientBg />
      <ToastContainer toasts={toasts} onRemove={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* ──────────────── TOP NAV BAR ──────────────── */}
      <header style={{ flexShrink: 0, height: 62, background: 'rgba(6,9,26,0.92)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 0, zIndex: 200, position: 'relative' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentDark} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${COLORS.accent}40` }}>
            <Sparkles size={16} color="white" />
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 14, letterSpacing: '0.5px', lineHeight: 1 }}>APICRAFT</div>
            <div style={{ color: COLORS.accent, fontSize: 8, letterSpacing: '2.5px', fontWeight: 800, lineHeight: 1, marginTop: 2 }}>ENTERPRISE · AI</div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 28, background: COLORS.border, marginRight: 24, flexShrink: 0 }} />

        {/* Nav pills */}
        <nav style={{ display: 'flex', height: '100%', gap: 2, flex: 1 }}>
          {NAV_TABS.map(tab => {
            const active = activePage === tab.id && !selectedHive;
            return (
              <button key={tab.id} onClick={() => { setActivePage(tab.id); setSelectedHive(null); }}
                className="nav-pill"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px', background: active ? `${COLORS.accentGlow}` : 'transparent', border: active ? `1px solid ${COLORS.borderHigh}` : '1px solid transparent', borderRadius: 10, color: active ? COLORS.accent : COLORS.textMuted, cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: 13, transition: 'all 0.15s', whiteSpace: 'nowrap', margin: 'auto 0' }}>
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}

          {/* Breadcrumb when hive selected */}
          {selectedHive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 13, color: COLORS.textMuted }}>
              <button onClick={() => setSelectedHive(null)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={13} /> Inventaire
              </button>
              <ChevronRight size={12} />
              <span style={{ color: COLORS.accent, fontWeight: 700 }}>{selectedHive.identifier}</span>
            </div>
          )}
        </nav>

        {/* Right cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Stats chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ height: 32, padding: '0 12px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Droplets size={12} color={COLORS.accent} />
              <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 12 }}>{stats.totalMiel}</span>
            </div>
            <div style={{ height: 32, padding: '0 12px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={12} color={COLORS.gradeA} />
              <span style={{ color: COLORS.gradeA, fontWeight: 800, fontSize: 12 }}>{ruches.length} ruches</span>
            </div>
          </div>

          {/* Alert badge */}
          {alertCount > 0 && (
            <div style={{ height: 32, padding: '0 12px', borderRadius: 9, background: `${COLORS.error}14`, border: `1px solid ${COLORS.error}35`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={12} color={COLORS.error} style={{ animation: 'badge 2s ease-in-out infinite' }} />
              <span style={{ color: COLORS.error, fontSize: 12, fontWeight: 800 }}>{alertCount}</span>
            </div>
          )}

          {/* Sync button */}
          <button onClick={() => fetchData()} disabled={syncing}
            style={{ height: 32, padding: '0 14px', borderRadius: 9, background: syncing ? COLORS.accentGlow : 'rgba(255,255,255,0.04)', border: `1px solid ${syncing ? COLORS.borderHigh : COLORS.border}`, color: syncing ? COLORS.accent : COLORS.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
            <RefreshCw size={12} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />
            {syncing ? 'Sync…' : 'Sync'}
          </button>

          {/* Avatar */}
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 11, boxShadow: `0 0 14px ${COLORS.accent}40` }}>BE</div>
        </div>
      </header>

      {/* ──────────────── MAIN CONTENT ──────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', position: 'relative', zIndex: 1 }}>

        {loading && !syncing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 18 }}>
            <div style={{ position: 'relative', width: 56, height: 56 }}>
              <div style={{ width: 56, height: 56, border: `3px solid ${COLORS.accentGlow}`, borderTop: `3px solid ${COLORS.accent}`, borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
              <Hexagon size={22} color={COLORS.accent} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.8 }} />
            </div>
            <div style={{ color: COLORS.textMuted, fontWeight: 600, fontSize: 14 }}>Chargement des données apicoles…</div>
          </div>
        ) : selectedHive ? (
          <div className="page-enter">
            <HiveDetailView
              hive={selectedHive} emplacements={emplacements}
              visites={visites} productions={productions}
              depenses={depenses} previsions={previsions}
              onBack={() => setSelectedHive(null)}
              onAddVisit={handleAddVisite}   onDeleteVisit={handleDeleteVisite}
              onAddProd={handleAddProd}      onDeleteProd={handleDeleteProd}
              onAddDepense={handleAddDepense} onDeleteDepense={handleDeleteDepense}
              onAddPrevision={handleAddPrevision} onUpdateTask={handleUpdateTask}
            />
          </div>
        ) : (
          <div className="page-enter">
            {activePage === 'dashboard' && (
              <DashboardTab ruches={ruches} stats={stats} onAction={handleAction} onSync={fetchData} isProcessing={syncing} />
            )}
            {activePage === 'sites' && (
              <EmplacementsTab emplacements={emplacements} onAction={handleAction} handleAddEmp={handleAddApiary} onDelete={handleDeleteApiary} modalActive={modalActive} setModalActive={setModalActive} />
            )}
            {activePage === 'inventaire' && (
              <InventaireRuches ruches={ruches} emplacements={emplacements}
                onSelectHive={h => { setSelectedHive(h); setActivePage('inventaire'); }}
                onAddRuche={handleAddRuche} toast={toast} />
            )}
          </div>
        )}
      </main>

      <ExpertAssistant species="bee" color={COLORS.accent} />
    </div>
  );
}
