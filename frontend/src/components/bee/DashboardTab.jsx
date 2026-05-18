import { useState, useEffect } from 'react';
import {
  Hexagon, Droplets, Heart, AlertCircle,
  ClipboardCheck as VisitIcon, MapPin, RefreshCw,
  TrendingUp, ArrowUpRight, Sparkles,
  CalendarClock, CheckCircle, Clock, AlertOctagon,
  PackageSearch, ChevronDown, ChevronUp, Bell, Play
} from 'lucide-react';
import { COLORS } from './BeeConstants';

import { beeApi } from '../../services/beeApi';

/* ── Circular health ring ── */
const HealthRing = ({ value = 0, max = 10, size = 80, stroke = 6, color }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / max) * c;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.overlay10} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${color}60)` }} />
    </svg>
  );
};

/* ── Planning / Missions summary widget ── */
function PlanningWidget() {
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    beeApi.getPlanning()
      .then(r => r.ok ? r.json() : [])
      .then(data => setMissions(Array.isArray(data) ? data : []))
      .catch(() => { });
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const overdue = missions.filter(m => m.status !== 'done' && m.scheduled_date < today);
  const upcoming = missions
    .filter(m => m.status !== 'done' && m.scheduled_date >= today)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 4);

  return (
    <div style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: COLORS.accent + '18', border: `1px solid ${COLORS.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CalendarClock size={16} color={COLORS.accent} />
        </div>
        <div>
          <div style={{ fontWeight: 800, color: COLORS.text, fontSize: 13 }}>Missions Planifiées</div>
          <div style={{ fontSize: 10, color: COLORS.textMuted }}>{missions.length} mission(s) · {overdue.length} en retard</div>
        </div>
        {overdue.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: COLORS.error + '18', border: `1px solid ${COLORS.error}30` }}>
            <AlertOctagon size={12} color={COLORS.error} />
            <span style={{ fontSize: 11, color: COLORS.error, fontWeight: 800 }}>{overdue.length} EN RETARD</span>
          </div>
        )}
      </div>

      {overdue.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 900, color: COLORS.error, letterSpacing: '1.5px', textTransform: 'uppercase' }}>En retard</div>
          {overdue.slice(0, 2).map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 11, background: COLORS.error + '08', border: `1px solid ${COLORS.error}25` }}>
              <AlertCircle size={13} color={COLORS.error} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 12 }}>{m.action_type || 'Mission'}</div>
                <div style={{ color: COLORS.error, fontSize: 10 }}>{m.scheduled_date}</div>
              </div>
              <span style={{ fontSize: 10, color: COLORS.textMuted, flexShrink: 0 }}>{(m.tasks || []).length} tâche(s)</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {upcoming.length > 0
          ? <>
            <div style={{ fontSize: 9, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1.5px', textTransform: 'uppercase' }}>À venir</div>
            {upcoming.map(m => {
              const done = (m.tasks || []).filter(t => t.status === 'done').length;
              const total = (m.tasks || []).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 11, background: COLORS.overlay03, border: `1px solid ${COLORS.border}` }}>
                  {pct === 100 ? <CheckCircle size={13} color={COLORS.success} style={{ flexShrink: 0 }} /> : <Clock size={13} color={COLORS.honey} style={{ flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 12 }}>{m.action_type || 'Mission'}</div>
                    <div style={{ color: COLORS.textMuted, fontSize: 10 }}>{m.scheduled_date}</div>
                  </div>
                  {total > 0 && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: pct === 100 ? COLORS.success : COLORS.honey, fontSize: 11, fontWeight: 800 }}>{done}/{total}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
          : (
            <div style={{ height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: COLORS.textMuted }}>
              <CalendarClock size={26} strokeWidth={1} style={{ opacity: 0.4 }} />
              <div style={{ fontSize: 11, fontWeight: 600 }}>Aucune mission planifiée</div>
            </div>
          )
        }
      </div>
    </div>
  );
}

/* ── Colony hive grid (mini heatmap) ── */
const ColonyHeatmap = ({ ruches }) => {
  const gradeColor = s => s >= 8 ? COLORS.gradeA : s >= 6 ? COLORS.gradeB : s >= 4 ? COLORS.gradeC : COLORS.gradeD;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 0' }}>
      {ruches.slice(0, 30).map(r => {
        const c = gradeColor(r.health_score ?? 7);
        return (
          <div key={r.id} title={`${r.identifier} — ${r.health_score?.toFixed(1) || '?'}/10`}
            style={{
              width: 28, height: 28, borderRadius: 8, background: c + '22', border: `1px solid ${c}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default',
              boxShadow: `0 0 8px ${c}18`, transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ width: 8, height: 8, borderRadius: 3, background: c, boxShadow: `0 0 4px ${c}` }} />
          </div>
        );
      })}
      {ruches.length === 0 && <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Aucune ruche enregistrée</span>}
    </div>
  );
};

/* ── Logistics preview widget ── */
function LogisticsWidget({ emplacements = [] }) {
  const [apiary, setApiary] = useState('');
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const run = async () => {
    if (!apiary) return;
    setLoading(true);
    try {
      const res = await beeApi.getLogisticsPreview(apiary, date);
      if (res.ok) setResult(await res.json());
    } finally { setLoading(false); }
  };

  const iSt = { height: 40, background: COLORS.overlay04, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '0 12px', color: COLORS.text, outline: 'none', fontSize: 13, width: '100%' };

  return (
    <div style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: COLORS.info + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PackageSearch size={16} color={COLORS.info} />
        </div>
        <div>
          <div style={{ fontWeight: 800, color: COLORS.text, fontSize: 13 }}>Prévision Logistique</div>
          <div style={{ fontSize: 10, color: COLORS.textMuted }}>Besoins matériels avant visite</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
        <select value={apiary} onChange={e => setApiary(e.target.value)} style={iSt}>
          <option value="">Emplacement…</option>
          {emplacements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={iSt} />
        <button onClick={run} disabled={!apiary || loading}
          style={{ height: 40, padding: '0 16px', borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, border: 'none', color: 'white', fontWeight: 800, cursor: apiary ? 'pointer' : 'not-allowed', opacity: apiary ? 1 : 0.6, fontSize: 13, whiteSpace: 'nowrap' }}>
          {loading ? '…' : 'Calculer'}
        </button>
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700 }}>
            {result.apiary_name} · {result.hive_count} ruche(s) active(s)
            {result.season && ` · Saison: ${result.season}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Sirop', value: `${result.totals.sirop_L}L`, manque: result.manques.sirop_L, stock: result.stock_disponible.sirop },
              { label: 'Pâte', value: `${result.totals.pate_kg}kg`, manque: result.manques.pate_kg, stock: result.stock_disponible.pate },
              { label: 'Trait.', value: result.totals.traitement, manque: result.manques.traitement, stock: result.stock_disponible.traitement },
              { label: 'Cadres', value: result.totals.cadres, manque: result.manques.cadres, stock: result.stock_disponible.cadres },
            ].map(m => {
              const ok = m.manque === 0;
              return (
                <div key={m.label} style={{ background: ok ? COLORS.gradeA + '10' : COLORS.error + '10', border: `1px solid ${ok ? COLORS.gradeA + '30' : COLORS.error + '30'}`, borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 800, letterSpacing: '0.5px', marginBottom: 4 }}>{m.label}</div>
                  <div style={{ color: ok ? COLORS.gradeA : COLORS.error, fontWeight: 900, fontSize: 16 }}>{m.value}</div>
                  <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2 }}>dispo: {m.stock}</div>
                  {m.manque > 0 && <div style={{ fontSize: 9, color: COLORS.error, fontWeight: 800, marginTop: 2 }}>−{m.manque} manque</div>}
                </div>
              );
            })}
          </div>
          <button onClick={() => setExpanded(e => !e)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: 0 }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Masquer' : 'Voir par ruche'} ({result.hive_count})
          </button>
          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
              {result.per_hive.map(h => (
                <div key={h.hive_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: COLORS.overlay03, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.text }}>{h.identifier}</div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: COLORS.textMuted }}>
                    <span>{h.sirop_L}L</span><span>{h.pate_kg}kg</span><span>{h.traitement} dose(s)</span>{h.cadres > 0 && <span>{h.cadres} cadres</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardTab({ ruches = [], emplacements = [], isProcessing, onAction, stats, onSync }) {
  const activeRuches = ruches.filter(r => r.is_active !== false);
  const avgHealth = ruches.length ? ruches.reduce((s, r) => s + (r.health_score || 0), 0) / ruches.length : 0;
  const [simpleMode, setSimpleMode] = useState(() => localStorage.getItem('bee_simple_mode') !== 'false');
  const toggleSimple = () => { const n = !simpleMode; setSimpleMode(n); localStorage.setItem('bee_simple_mode', String(n)); };
  const alertCount = parseInt(stats?.alertes) || 0;

  const kpis = [
    { label: 'Ruches Actives', icon: Hexagon, color: COLORS.accent, val: activeRuches.length, sub: `/ ${ruches.length} total`, ring: activeRuches.length, ringMax: Math.max(ruches.length, 1), trend: '+2%' },
    { label: 'Récolte Totale', icon: Droplets, color: COLORS.info, val: stats?.totalMiel || '0 kg', sub: 'Cette saison', ring: null, trend: '+15%' },
    { label: 'Santé Globale', icon: Heart, color: COLORS.success, val: avgHealth.toFixed(1) + '/10', sub: 'Indice COLOSS', ring: avgHealth, ringMax: 10, trend: 'Stable' },
    { label: 'Alertes', icon: AlertCircle, color: COLORS.error, val: stats?.alertes || '0', sub: 'Ruches critiques', ring: null, trend: parseInt(stats?.alertes) > 0 ? '⚠ Urgent' : 'RAS' },
  ];

  const quickActions = [
    { label: 'Nouvelle Inspection', icon: VisitIcon, tab: 'visites', subAction: 'addVisit', color: COLORS.accent, desc: 'Enregistrer une visite' },
    { label: 'Ajouter Ruche', icon: Hexagon, tab: 'ruches', subAction: 'addRuche', color: COLORS.purple, desc: 'Créer une nouvelle ruche' },
    { label: 'Nouveau Site', icon: MapPin, tab: 'emplacements', subAction: 'addEmp', color: COLORS.info, desc: 'Ajouter un emplacement' },
    { label: 'Synchroniser', icon: RefreshCw, tab: 'sync', subAction: 'sync', color: COLORS.success, desc: 'Mettre à jour les données' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        @keyframes spinIcon { to{transform:rotate(360deg)} }
        @keyframes glow { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>

      {/* Toggle vue simple / complète */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={toggleSimple} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 800,
          background: simpleMode ? COLORS.accent + '18' : COLORS.bg2,
          border: `1.5px solid ${simpleMode ? COLORS.accent : COLORS.border}`,
          color: simpleMode ? COLORS.accent : COLORS.textMuted, transition: 'all 0.2s',
        }}>
          {simpleMode ? '👁 Vue Simple' : '📊 Vue Complète'}
          <span style={{ width: 28, height: 16, borderRadius: 8, background: simpleMode ? COLORS.accent : COLORS.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 2, left: simpleMode ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </span>
        </button>
      </div>

      {/* ══ VUE SIMPLIFIÉE ══ */}
      {simpleMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            borderRadius: 24, padding: '28px 32px',
            background: alertCount > 0 ? COLORS.error + '12' : COLORS.success + '10',
            border: `2px solid ${alertCount > 0 ? COLORS.error + '40' : COLORS.success + '40'}`,
            display: 'flex', alignItems: 'center', gap: 24,
          }}>
            <Bell size={48} color={alertCount > 0 ? COLORS.error : COLORS.success} style={{ flexShrink: 0, animation: alertCount > 0 ? 'glow 1.5s infinite' : 'none' }} />
            <div>
              <div style={{ fontSize: 56, fontWeight: 900, color: alertCount > 0 ? COLORS.error : COLORS.success, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{alertCount}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: alertCount > 0 ? COLORS.error : COLORS.success, marginTop: 4 }}>
                {alertCount === 0 ? 'Toutes les ruches sont saines' : `ruche${alertCount > 1 ? 's' : ''} à visiter`}
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 24, padding: '24px 32px', background: COLORS.accent + '10', border: `2px solid ${COLORS.accent}30`, display: 'flex', alignItems: 'center', gap: 24 }}>
            <span style={{ fontSize: 48, flexShrink: 0 }}>🍯</span>
            <div>
              <div style={{ fontSize: 48, fontWeight: 900, color: COLORS.accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{stats?.totalMiel || '0 kg'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.accentDark, marginTop: 4 }}>récoltés cette saison</div>
            </div>
          </div>

          <button onClick={() => onAction?.('inventaire')}
            style={{ height: 72, borderRadius: 22, background: `linear-gradient(135deg, ${COLORS.success}, #166534)`, border: 'none', color: 'white', fontWeight: 900, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, boxShadow: `0 8px 28px ${COLORS.success}40` }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={22} fill="white" color="white" />
            </span>
            COMMENCER INSPECTION
          </button>

          <div style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`, padding: 24 }}>
            <div style={{ fontWeight: 800, color: COLORS.text, fontSize: 14, marginBottom: 16 }}>État des colonies</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ruches.map(r => {
                const sc = r.health_score ?? 7;
                const c = sc >= 8 ? COLORS.gradeA : sc >= 6 ? COLORS.gradeB : sc >= 4 ? COLORS.gradeC : COLORS.gradeD;
                return (
                  <div key={r.id} title={`${r.identifier} — Santé: ${sc.toFixed(1)}/10`}
                    style={{ width: 40, height: 40, borderRadius: 10, background: c + '28', border: `2px solid ${c}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', transition: 'transform 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: c, boxShadow: `0 0 6px ${c}` }} />
                  </div>
                );
              })}
              {ruches.length === 0 && <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Aucune ruche enregistrée</span>}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 14 }}>
              {[['Excellente', COLORS.gradeA], ['Bonne', COLORS.gradeB], ['Attention', COLORS.gradeC], ['Urgente', COLORS.gradeD]].map(([lbl, c]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
                  <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700 }}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ VUE COMPLÈTE ══ */}
      {!simpleMode && <>

      {/* KPI bento row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
        {kpis.map((k, idx) => (
          <div key={idx} style={{ position: 'relative', background: COLORS.surface, borderRadius: 24, padding: '22px 24px', border: `1px solid ${COLORS.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: k.color + '08', filter: 'blur(30px)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: k.color + '18', border: `1px solid ${k.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.icon size={20} color={k.color} />
              </div>
              {k.ring !== null ? (
                <div style={{ position: 'relative', width: 44, height: 44 }}>
                  <HealthRing value={k.ring} max={k.ringMax} size={44} stroke={4} color={k.color} />
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: k.color }}>
                    {Math.round((k.ring / k.ringMax) * 100)}%
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 800, color: k.color, background: k.color + '15', padding: '4px 10px', borderRadius: 8 }}>{k.trend}</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.text, letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{k.val}</div>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4 }}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Planning summary + Colony map */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <PlanningWidget />

        <div style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: COLORS.accentGlow, border: `1px solid ${COLORS.accentDark}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Hexagon size={16} color={COLORS.accent} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: COLORS.text, fontSize: 13 }}>Carte Santé Colonies</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted }}>{ruches.length} ruches · {activeRuches.length} actives</div>
              </div>
            </div>
            <ColonyHeatmap ruches={ruches} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {[['A', COLORS.gradeA, '≥8'], ['B', COLORS.gradeB, '6-8'], ['C', COLORS.gradeC, '4-6'], ['D', COLORS.gradeD, '<4']].map(([g, c, r]) => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 700 }}>Grade {g} {r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logistics preview */}
      <LogisticsWidget emplacements={emplacements} />

      {/* Quick actions */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14 }}>Actions Rapides</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
          {quickActions.map(act => (
            <button key={act.label}
              onClick={() => act.tab === 'sync' ? onSync?.() : onAction?.(act.tab, act.subAction)}
              disabled={act.tab === 'sync' && isProcessing}
              style={{ background: `linear-gradient(145deg, ${act.color}18, ${act.color}08)`, border: `1px solid ${act.color}30`, borderRadius: 20, padding: '20px 18px', color: COLORS.text, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = act.color + '70'; e.currentTarget.style.boxShadow = `0 12px 30px -8px ${act.color}30`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = act.color + '30'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 13, background: act.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${act.color}30` }}>
                <act.icon size={20} color={act.color} style={{ animation: act.tab === 'sync' && isProcessing ? 'spinIcon 1s linear infinite' : 'none' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{isProcessing && act.tab === 'sync' ? 'Synchronisation…' : act.label}</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 3 }}>{act.desc}</div>
              </div>
              <ArrowUpRight size={14} style={{ position: 'absolute', top: 16, right: 16, color: act.color, opacity: 0.5 }} />
            </button>
          ))}
        </div>
      </div>

      {/* System health strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        {[
          { label: 'Moyenne Force Colonies', value: ruches.length ? (ruches.reduce((s, r) => s + (r.force_level || 5), 0) / ruches.length).toFixed(1) : '—', unit: '/10', color: COLORS.success, icon: TrendingUp },
          { label: 'Niveau Miel Moyen', value: ruches.length ? (ruches.reduce((s, r) => s + (r.honey_level || 5), 0) / ruches.length).toFixed(1) : '—', unit: '/10', color: COLORS.accent, icon: Droplets },
          { label: 'Score Santé Moyen', value: avgHealth.toFixed(1), unit: '/10', color: COLORS.info, icon: Sparkles },
        ].map(m => (
          <div key={m.label} style={{ background: COLORS.surface, borderRadius: 18, border: `1px solid ${COLORS.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <m.icon size={17} color={m.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{m.label}</div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ color: m.color, fontWeight: 900, fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{m.value}</span>
                <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{m.unit}</span>
              </div>
              <div style={{ marginTop: 6, height: 3, borderRadius: 3, background: COLORS.overlay08 }}>
                <div style={{ height: '100%', width: `${Math.min(((parseFloat(m.value) || 0) / 10) * 100, 100)}%`, borderRadius: 3, background: `linear-gradient(90deg, ${m.color}, ${m.color}80)`, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      </>}
    </div>
  );
}
