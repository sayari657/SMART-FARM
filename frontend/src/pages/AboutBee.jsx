import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, MapPin, Hexagon, Bell, RefreshCw,
  Plus, Search, ChevronRight,
  CheckCircle, XCircle, AlertTriangle,
  ArrowLeft, X
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

    /* Dropdown options — fond crème ivoire */
    select option { background: #FFF8E7 !important; color: #1C0A00 !important; }
    input::placeholder, textarea::placeholder { color: #A07848 !important; }

    /* Scrollbar — filet miel doux */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: rgba(237,224,196,0.4); border-radius: 10px; }
    ::-webkit-scrollbar-thumb { background: rgba(217,119,6,0.28); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(217,119,6,0.50); }

    /* Animations */
    @keyframes spin     { to { transform: rotate(360deg); } }
    @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideIn  { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:translateX(0); } }
    @keyframes floatHex { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-8px) rotate(3deg)} }
    @keyframes pulse    { 0%,100%{opacity:0.45} 50%{opacity:1} }
    @keyframes badge    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }

    .page-enter { animation: fadeUp 0.24s cubic-bezier(.22,1,.36,1) both; }
    .slide-in   { animation: slideIn 0.2s ease both; }

    /* Nav pill hover — chaleur miel */
    .nav-pill:hover {
      background: rgba(217,119,6,0.09) !important;
      color: #B45309 !important;
      border-color: rgba(217,119,6,0.28) !important;
    }

    /* Hive card hover — lévitation douce + glow miel */
    .hive-card { transition: transform 0.22s cubic-bezier(.22,1,.36,1), border-color 0.2s, box-shadow 0.22s; }
    .hive-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 18px 44px rgba(217,119,6,0.14), 0 4px 12px rgba(0,0,0,0.08) !important;
    }

    /* Action btn */
    .action-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(217,119,6,0.25) !important;
    }
  `}</style>
);

/* ────────────────────────────────────────── */
/*  Ambient Background                        */
/* ────────────────────────────────────────── */
const _AmbientBg = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>

    {/* Orbe 1 — Miel / ambre (grand, en haut au centre) */}
    <div style={{ position: 'absolute', top: '-5%', left: '25%', width: 680, height: 680, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(245,158,11,0.11) 0%, rgba(180,83,9,0.05) 45%, transparent 70%)',
      filter: 'blur(80px)', animation: 'orb1 20s ease-in-out infinite' }} />

    {/* Orbe 2 — Champ vert (bas gauche) → santé colonie */}
    <div style={{ position: 'absolute', bottom: '8%', left: '5%', width: 500, height: 500, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(101,163,13,0.09) 0%, rgba(101,163,13,0.03) 50%, transparent 70%)',
      filter: 'blur(70px)', animation: 'orb2 24s ease-in-out infinite' }} />

    {/* Orbe 3 — Violet lavande (droite) → reine / essaimage */}
    <div style={{ position: 'absolute', top: '30%', right: '8%', width: 420, height: 420, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, rgba(168,85,247,0.03) 50%, transparent 70%)',
      filter: 'blur(65px)', animation: 'orb3 19s ease-in-out infinite' }} />

    {/* Orbe 4 — Orange pollen (bas droite) → vigilance */}
    <div style={{ position: 'absolute', bottom: '15%', right: '18%', width: 300, height: 300, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)',
      filter: 'blur(55px)' }} />

    {/* Grille alvéolaire — motif nid d'abeilles */}
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="honeycomb" x="0" y="0" width="44" height="50" patternUnits="userSpaceOnUse">
          <polygon points="22,2 40,12 40,38 22,48 4,38 4,12"
            fill="none" stroke="#F59E0B" strokeWidth="1"/>
        </pattern>
        <pattern id="honeycomb2" x="22" y="25" width="44" height="50" patternUnits="userSpaceOnUse">
          <polygon points="22,2 40,12 40,38 22,48 4,38 4,12"
            fill="none" stroke="#F59E0B" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#honeycomb)" />
      <rect width="100%" height="100%" fill="url(#honeycomb2)" />
    </svg>

    {/* Filet de miel — ligne dorée subtile en haut */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
      background: 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.35) 30%, rgba(245,158,11,0.55) 50%, rgba(245,158,11,0.35) 70%, transparent 100%)' }} />
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
          <div key={t.id} className="slide-in" style={{ background: '#FFFFFF', backdropFilter: 'blur(20px)', border: `1px solid ${color}35`, borderLeft: `3px solid ${color}`, borderRadius: 14, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: `0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(237,224,196,0.5)`, minWidth: 280, maxWidth: 380 }}>
            <Icon size={16} color={color} />
            <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, flex: 1 }}>{t.msg}</span>
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
const HAPI = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/bee/history`;

const HIVE_TYPES = [
  { label: 'Langstroth',        value: 'Langstroth' },
  { label: 'Dadant',            value: 'Dadant' },
  { label: 'Warré',             value: 'Warré' },
  { label: 'Kenyane',           value: 'Kenyane' },
  { label: 'Traditionnel',      value: 'Traditionnel' },
  { label: '👑 Banque de Reines', value: 'queen_bank' },
];

function InventaireRuches({ ruches, emplacements, onSelectHive, onAddRuche, toast, filterApiary = '', onClearFilter }) {
  const [search, setSearch]         = useState('');
  const [filterSite, setFilterSite] = useState(filterApiary);
  const [filterGrade, setFilterGrade] = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [queenDispatch, setQueenDispatch] = useState(null); // { hiveId, hiveName, bankData }
  const [form, setForm] = useState({
    identifier: '', apiary_id: filterApiary || '', hive_type: 'Langstroth',
    queen_year: new Date().getFullYear(), health_score: 10, honey_level: 5, force_level: 5,
    has_queen: true, queen_count: 0,
  });

  // Sync external filterApiary into local state when parent navigates here from GIS
  useEffect(() => {
    if (filterApiary) setFilterSite(filterApiary);
  }, [filterApiary]);

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
    height: 44, background: COLORS.bg2,
    border: `1px solid ${COLORS.border}`, borderRadius: 12,
    padding: '0 14px', color: COLORS.text, outline: 'none', fontSize: 13, width: '100%'
  };

  const BLANK_FORM = {
    identifier: '', apiary_id: filterApiary || '', hive_type: 'Langstroth',
    queen_year: new Date().getFullYear(), health_score: 10, honey_level: 5, force_level: 5,
    has_queen: true, queen_count: 0,
  };

  const handleSubmit = async () => {
    if (!form.identifier || !form.apiary_id) { toast('Identifiant et site requis.', 'warning'); return; }
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const payload = { ...form, apiary_id: Number(form.apiary_id) };
    const res = await fetch(`${HAPI}/hives`, { method: 'POST', headers: h, body: JSON.stringify(payload) });
    if (!res.ok) {
      toast((await res.json().catch(() => ({}))).detail || 'Erreur création ruche', 'error');
      return;
    }
    const newHive = await res.json();
    toast('Ruche créée');
    setForm(BLANK_FORM);
    setShowForm(false);
    onAddRuche(); // refresh parent list

    // Queen bank check: if no queen was declared and it's not the bank itself
    if (!payload.has_queen && payload.hive_type !== 'queen_bank') {
      const qbRes = await fetch(`${HAPI}/queen-bank`, { headers: h });
      if (qbRes.ok) {
        const qbData = await qbRes.json();
        if (qbData.available) {
          setQueenDispatch({ hiveId: newHive.id, hiveName: newHive.identifier, bankData: qbData });
        } else {
          toast('Aucune reine en Banque de Reines — reine à introduire manuellement', 'warning');
        }
      }
    }
  };

  const handleDispatch = async () => {
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(`${HAPI}/queen-bank/dispatch/${queenDispatch.hiveId}`, { method: 'POST', headers: h });
    if (res.ok) {
      const data = await res.json();
      toast(`Reine envoyée vers ${queenDispatch.hiveName} · Banque restante: ${data.queen_bank_remaining}`, 'success');
      onAddRuche();
    } else {
      toast((await res.json().catch(() => ({}))).detail || 'Erreur envoi reine', 'error');
    }
    setQueenDispatch(null);
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: COLORS.accent, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 8 }}>Gestion Apicole · Enterprise</div>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: COLORS.text, letterSpacing: '-0.03em', lineHeight: 1 }}>Inventaire Ruches</h1>
          <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 8 }}>{ruches.length} ruches enregistrées · {active} actives</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="action-btn"
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, border: 'none', color: 'white', padding: '13px 26px', borderRadius: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 8px 24px -4px ${COLORS.accent}50`, fontSize: 14 }}>
          <Plus size={18} /> Nouvelle Ruche
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
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
                  <span style={{ color: COLORS.text, fontSize: 11, fontWeight: 700 }}>{n}</span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: 'rgba(28,10,0,0.08)' }}>
                  <div style={{ height: '100%', width: ruches.length ? `${(n / ruches.length) * 100}%` : '0%', borderRadius: 4, background: gradeColor(g === 'A' ? 9 : g === 'B' ? 7 : g === 'C' ? 5 : 2) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Queen Bank dispatch modal ── */}
      {queenDispatch && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderHigh}`, borderRadius: 24, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: COLORS.accent + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👑</div>
              <div>
                <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 16 }}>Banque de Reines disponible</div>
                <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>
                  {queenDispatch.bankData.queen_count} reine(s) disponible(s) · {queenDispatch.bankData.identifier}
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 14, background: COLORS.accent + '0a', border: `1px solid ${COLORS.accent}25`, marginBottom: 20, color: COLORS.textDim, fontSize: 13 }}>
              La ruche <strong style={{ color: COLORS.text }}>{queenDispatch.hiveName}</strong> n'a pas de reine.
              Voulez-vous envoyer une reine depuis la Banque de Reines ?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDispatch}
                style={{ flex: 1, height: 48, borderRadius: 14, cursor: 'pointer', background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, border: 'none', color: 'white', fontWeight: 800, fontSize: 14 }}>
                👑 Envoyer une Reine
              </button>
              <button onClick={() => setQueenDispatch(null)}
                style={{ flex: 1, height: 48, borderRadius: 14, cursor: 'pointer', background: COLORS.bg2, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontWeight: 700, fontSize: 14 }}>
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add form ── */}
      {showForm && (
        <div className="page-enter" style={{ background: COLORS.surface, backdropFilter: 'blur(12px)', border: `1px solid ${COLORS.borderHigh}`, borderRadius: 22, padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <span style={{ color: COLORS.text, fontWeight: 900, fontSize: 16 }}>
              {form.hive_type === 'queen_bank' ? '👑 Nouvelle Banque de Reines' : 'Nouvelle Ruche'}
            </span>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer' }}><X size={18} /></button>
          </div>

          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
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
              <select value={form.hive_type}
                onChange={e => setForm(f => ({ ...f, hive_type: e.target.value, has_queen: e.target.value === 'queen_bank' ? true : f.has_queen }))}
                style={iSt}>
                {HIVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>ANNÉE REINE</label>
              <input type="number" min="2015" max="2030" value={form.queen_year} onChange={e => setForm(f => ({ ...f, queen_year: parseInt(e.target.value) }))} style={iSt} />
            </div>

            {form.hive_type === 'queen_bank' ? (
              <div>
                <label style={{ color: COLORS.accent, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>REINES EN STOCK</label>
                <input type="number" min="0" max="99" value={form.queen_count}
                  onChange={e => setForm(f => ({ ...f, queen_count: parseInt(e.target.value) || 0 }))}
                  style={{ ...iSt, borderColor: COLORS.accent + '60', color: COLORS.accent, fontWeight: 800 }} />
              </div>
            ) : (
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>REINE PRÉSENTE</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ label: '♛ Oui', val: true, color: COLORS.success }, { label: '✕ Non', val: false, color: COLORS.error }].map(opt => (
                    <button key={String(opt.val)} onClick={() => setForm(f => ({ ...f, has_queen: opt.val }))}
                      style={{ flex: 1, height: 44, borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 13,
                        background: form.has_queen === opt.val ? opt.color + '22' : COLORS.bg2,
                        border: `${form.has_queen === opt.val ? 2 : 1}px solid ${form.has_queen === opt.val ? opt.color : COLORS.border}`,
                        color: form.has_queen === opt.val ? opt.color : COLORS.textMuted }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSubmit} style={{ flex: 1, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
                {form.hive_type === 'queen_bank' ? '👑 Créer Banque' : 'Créer'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ height: 44, padding: '0 14px', borderRadius: 12, background: COLORS.bg2, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, cursor: 'pointer', fontSize: 13 }}>✕</button>
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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select value={filterSite} onChange={e => { setFilterSite(e.target.value); if (!e.target.value && onClearFilter) onClearFilter(); }} style={{ ...iSt, width: 'auto', paddingRight: 36 }}>
            <option value="">Tous les sites</option>
            {emplacements.map(e => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
          </select>
          {filterSite && (
            <button onClick={() => { setFilterSite(''); if (onClearFilter) onClearFilter(); }}
              style={{ height: 44, padding: '0 12px', borderRadius: 12, background: `${COLORS.accent}18`, border: `1px solid ${COLORS.accent}40`, color: COLORS.accent, cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
              ✕ Filtre GIS
            </button>
          )}
        </div>
        {['', 'A', 'B', 'C', 'D'].map(g => (
          <button key={g} onClick={() => setFilterGrade(g)}
            style={{ height: 44, padding: '0 16px', borderRadius: 12, background: filterGrade === g ? (g ? gradeColor(g === 'A' ? 9 : g === 'B' ? 7 : g === 'C' ? 5 : 2) + '20' : COLORS.accentGlow) : COLORS.bg2, border: `1px solid ${filterGrade === g ? (g ? gradeColor(g === 'A' ? 9 : g === 'B' ? 7 : g === 'C' ? 5 : 2) + '50' : COLORS.borderHigh) : COLORS.border}`, color: filterGrade === g ? COLORS.text : COLORS.textMuted, cursor: 'pointer', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
            {g ? `Grade ${g}` : 'Tous'}
          </button>
        ))}
      </div>

      {/* Hive grid */}
      {filtered.length === 0 ? (
        <div style={{ height: 300, background: COLORS.bg2, border: `2px dashed ${COLORS.border}`, borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: COLORS.textMuted }}>
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
                        <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 17, letterSpacing: '-0.01em' }}>{r.identifier}</div>
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
                        <div style={{ height: 3, borderRadius: 3, background: 'rgba(28,10,0,0.08)' }}>
                          <div style={{ height: '100%', width: `${(m.value / 10) * 100}%`, borderRadius: 3, background: `linear-gradient(90deg, ${m.color}, ${m.color}70)`, boxShadow: `0 0 6px ${m.color}40`, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ color: COLORS.textMuted, fontSize: 11 }}>
                        {r.hive_type === 'queen_bank' ? '👑 Banque de Reines' : (r.hive_type || 'Ruche')}
                        {r.queen_year && r.hive_type !== 'queen_bank' ? ` · ${r.queen_year}` : ''}
                      </span>
                      {r.hive_type === 'queen_bank' ? (
                        <span style={{ fontSize: 10, fontWeight: 800, color: COLORS.accent, background: COLORS.accent + '18', padding: '2px 7px', borderRadius: 6 }}>
                          {r.queen_count ?? 0} reine(s)
                        </span>
                      ) : r.has_queen === false ? (
                        <span style={{ fontSize: 10, fontWeight: 800, color: COLORS.error, background: COLORS.error + '15', padding: '2px 7px', borderRadius: 6 }}>Sans reine</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.success }}>♛</span>
                      )}
                    </div>
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

  const [emplacements,  setEmplacements]  = useState([]);
  const [ruches,        setRuches]        = useState([]);
  const [filterApiary,  setFilterApiary]  = useState('');
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
      const [r1, r2, r3] = await Promise.all([
        fetch(`${API}/apiaries`,    { headers: h }),
        fetch(`${API}/hives`,       { headers: h }),
        fetch(`${API}/productions`, { headers: h }),
      ]);
      const emp  = r1.ok ? await r1.json() : [];
      const hiv  = r2.ok ? await r2.json() : [];
      const prd  = r3.ok ? await r3.json() : [];
      setEmplacements(emp); setRuches(hiv);
      if (selectedHive) setSelectedHive(h2 => hiv.find(h => h.id === h2?.id) || h2);
      const honey = prd.reduce((a, p) => a + (parseFloat(p.honey_kg) || 0), 0);
      const avgH  = hiv.length ? (hiv.reduce((a, r) => a + (r.health_score || 0), 0) / hiv.length) * 10 : 100;
      const alrts = hiv.filter(r => (r.health_score || 10) < 4).length;
      setStats({ totalMiel: `${honey.toFixed(1)} kg`, sante: `${Math.round(avgH)}%`, alertes: alrts.toString() });
    } catch { toast('Erreur de connexion au serveur', 'error'); }
    finally { setLoading(false); setSyncing(false); }
  }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── CRUD ── */
  const handleAddRuche = () => fetchData();
  const handleAddApiary   = async fd => { const res = await apiFetch('/apiaries', { method: 'POST', body: JSON.stringify({ ...fd, latitude: fd.latitude ? parseFloat(fd.latitude) : null, longitude: fd.longitude ? parseFloat(fd.longitude) : null }) }); res.ok ? (setModalActive(null), fetchData(), toast('Site créé')) : toast('Erreur', 'error'); };
  const handleDeleteApiary= async id => { if (!confirm('Supprimer ce site et ses ruches ?')) return; await apiFetch(`/apiaries/${id}`, { method: 'DELETE' }); fetchData(); toast('Site supprimé', 'warning'); };
  const handleAction      = (tab, sub) => { if (tab === 'sync') { fetchData(); return; } setActivePage(tab === 'emplacements' || tab === 'sites' ? 'sites' : tab === 'ruches' ? 'inventaire' : 'dashboard'); if (sub === 'addEmp') setModalActive('emplacement'); };

  const alertCount = parseInt(stats.alertes) || 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: COLORS.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", overflow: 'hidden', position: 'relative', color: COLORS.text }}>
      <GlobalStyles />
      <ToastContainer toasts={toasts} onRemove={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* ══════════════ BARRE DE NAVIGATION APICOLE ══════════════ */}
      <header style={{
        flexShrink: 0, height: 66,
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 0,
        zIndex: 200, position: 'relative',
        boxShadow: `0 1px 0 rgba(245,158,11,0.15), 0 2px 12px rgba(0,0,0,0.05)`,
      }}>

        {/* ── Logo apicole ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginRight: 28, flexShrink: 0 }}>
          {/* Hexagone avec emoji abeille */}
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: `linear-gradient(145deg, ${COLORS.accentDark} 0%, ${COLORS.accent} 60%, ${COLORS.accentLight} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, lineHeight: 1,
            boxShadow: `0 0 22px ${COLORS.accent}55, inset 0 1px 0 rgba(255,255,255,0.20)`,
          }}>🐝</div>
          <div>
            <div style={{ color: '#0f172a', fontWeight: 900, fontSize: 14, letterSpacing: '0.6px', lineHeight: 1 }}>
              APICRAFT
            </div>
            <div style={{ color: COLORS.accentDark, fontSize: 8, letterSpacing: '2.8px', fontWeight: 800, lineHeight: 1, marginTop: 2 }}>
              ENTERPRISE · IA
            </div>
          </div>
        </div>

        {/* Séparateur alvéolaire */}
        <div style={{ width: 1, height: 30, background: `linear-gradient(to bottom, transparent, ${COLORS.border}, transparent)`, marginRight: 22, flexShrink: 0 }} />

        {/* ── Onglets de navigation ── */}
        <nav style={{ display: 'flex', height: '100%', gap: 3, flex: 1 }}>
          {NAV_TABS.map(tab => {
            const active = activePage === tab.id && !selectedHive;
            return (
              <button key={tab.id}
                onClick={() => { setActivePage(tab.id); setSelectedHive(null); }}
                className="nav-pill"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '0 18px', margin: 'auto 0',
                  background: active
                    ? `linear-gradient(135deg, ${COLORS.accentGlow}, rgba(245,158,11,0.08))`
                    : 'transparent',
                  border: active
                    ? `1px solid ${COLORS.borderHigh}`
                    : '1px solid transparent',
                  borderRadius: 11,
                  color: active ? COLORS.accent : COLORS.textMuted,
                  cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: 13,
                  transition: 'all 0.18s cubic-bezier(.22,1,.36,1)',
                  whiteSpace: 'nowrap',
                  /* Indicateur bas actif */
                  boxShadow: active ? `0 3px 0 ${COLORS.accent}, 0 4px 14px ${COLORS.accentGlow}` : 'none',
                }}>
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}

          {/* Fil d'Ariane ruche sélectionnée */}
          {selectedHive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 13, color: COLORS.textMuted }}>
              <button onClick={() => setSelectedHive(null)}
                style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s' }}>
                <ArrowLeft size={13} /> Inventaire
              </button>
              <ChevronRight size={12} color={COLORS.textMuted} />
              <span style={{ color: COLORS.accent, fontWeight: 800 }}>{selectedHive.identifier}</span>
              {selectedHive.hive_type === 'queen_bank' && (
                <span style={{ fontSize: 11, color: COLORS.info }}>👑 Banque</span>
              )}
            </div>
          )}
        </nav>

        {/* ── Cluster droite — KPIs + actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>

          {/* Chip miel total */}
          <div style={{ height: 32, padding: '0 12px', borderRadius: 10,
            background: `rgba(245,158,11,0.10)`, border: `1px solid ${COLORS.border}`,
            display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>🍯</span>
            <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 12 }}>{stats.totalMiel}</span>
          </div>

          {/* Chip nb ruches */}
          <div style={{ height: 32, padding: '0 12px', borderRadius: 10,
            background: `rgba(101,163,13,0.10)`, border: `1px solid rgba(101,163,13,0.25)`,
            display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>🏠</span>
            <span style={{ color: COLORS.success, fontWeight: 800, fontSize: 12 }}>{ruches.length} ruches</span>
          </div>

          {/* Badge alertes critiques */}
          {alertCount > 0 && (
            <div style={{ height: 32, padding: '0 12px', borderRadius: 10,
              background: `${COLORS.error}12`, border: `1px solid ${COLORS.error}40`,
              display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={12} color={COLORS.error} style={{ animation: 'badge 2s ease-in-out infinite' }} />
              <span style={{ color: COLORS.error, fontSize: 12, fontWeight: 800 }}>{alertCount} alerte{alertCount > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Bouton synchronisation */}
          <button onClick={() => fetchData()} disabled={syncing}
            style={{ height: 32, padding: '0 14px', borderRadius: 10,
              background: syncing ? `rgba(245,158,11,0.12)` : '#f8fafc',
              border: `1px solid ${syncing ? COLORS.borderHigh : '#e2e8f0'}`,
              color: syncing ? COLORS.accent : '#64748b',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
            <RefreshCw size={12} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />
            {syncing ? 'Sync…' : 'Sync'}
          </button>

          {/* Avatar apiculteur */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%', fontSize: 16,
            background: `linear-gradient(135deg, ${COLORS.accentDark}, ${COLORS.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 16px ${COLORS.accent}45`,
          }}>🧑‍🌾</div>
        </div>
      </header>

      {/* ──────────────── MAIN CONTENT ──────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px, 3vw, 28px) clamp(12px, 3vw, 32px)', position: 'relative', zIndex: 1, background: COLORS.bg }}>

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
              onBack={() => setSelectedHive(null)}
              toast={toast}
            />
          </div>
        ) : (
          <div className="page-enter">
            {activePage === 'dashboard' && (
              <DashboardTab ruches={ruches} stats={stats} onAction={handleAction} onSync={fetchData} isProcessing={syncing} />
            )}
            {activePage === 'sites' && (
              <EmplacementsTab emplacements={emplacements} onAction={handleAction} handleAddEmp={handleAddApiary} onDelete={handleDeleteApiary} modalActive={modalActive} setModalActive={setModalActive}
                onSelectSite={site => { setFilterApiary(String(site.id)); setActivePage('inventaire'); }} />
            )}
            {activePage === 'inventaire' && (
              <InventaireRuches ruches={ruches} emplacements={emplacements}
                filterApiary={filterApiary} onClearFilter={() => setFilterApiary('')}
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
