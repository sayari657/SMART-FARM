import { useState, useMemo } from 'react';
import {
  Plus, Hexagon, MapPin, Activity, Droplets,
  ShieldCheck, AlertCircle, ChevronRight, X,
  Zap, Info, Minus, Calendar, Trash2,
  Wallet, LayoutGrid, ClipboardCheck as VisitIcon, Clock,
  TrendingUp, Star
} from 'lucide-react';
import { COLORS } from './BeeConstants';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/bee/history`;

const token = () => localStorage.getItem('token');
const authFetch = (url) => fetch(url, { headers: token() ? { Authorization: `Bearer ${token()}` } : {} });

const healthColor = (score) => score >= 7 ? COLORS.success : score >= 4 ? '#fbbf24' : COLORS.error;

export default function RuchesTab({
  ruches = [], emplacements = [], modalActive, setModalActive,
  rucheForm, setRucheForm, handleAddRuche, onUpdateStat, onDelete,
  filterEmpId, setFilterEmpId
}) {
  const [reportRuche,       setReportRuche]       = useState(null);
  const [hiveDetails,       setHiveDetails]        = useState(null);
  const [activeManagerTab,  setActiveManagerTab]   = useState('overview');
  const [loadingDetails,    setLoadingDetails]     = useState(false);

  const openConsole = async (hive) => {
    setReportRuche(hive);
    setActiveManagerTab('overview');
    setHiveDetails(null);
    setLoadingDetails(true);
    try {
      const res = await authFetch(`${API_BASE}/hives/${hive.id}`);
      if (res.ok) setHiveDetails(await res.json());
    } catch (err) {
      console.error('Error fetching hive details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredRuches = useMemo(() => {
    if (!filterEmpId) return ruches;
    return ruches.filter(r => String(r.apiary_id) === String(filterEmpId));
  }, [ruches, filterEmpId]);

  /* ── safe accessors ── */
  const safeProduction = hiveDetails?.production ?? [];
  const safePlanning   = hiveDetails?.planning   ?? [];
  const safeExpenses   = hiveDetails?.expenses   ?? [];
  const safeVisits     = hiveDetails?.visits      ?? [];
  const safeStock      = hiveDetails?.stock       ?? { sirop: 0, pate: 0, traitement: 0, cadres: 0, hausse: 0 };

  const inputStyle = {
    width: '100%', height: 50,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12, padding: '0 16px',
    color: 'white', outline: 'none', fontSize: 14
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0 }}>
              {filterEmpId
                ? `Ruches — ${emplacements.find(e => String(e.id) === String(filterEmpId))?.name || 'Site'}`
                : 'Inventaire des Ruches'}
            </h1>
            <p style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 13 }}>
              {filteredRuches.length} ruche(s) · {filteredRuches.filter(r => r.is_active).length} active(s)
            </p>
          </div>
          {filterEmpId && (
            <button onClick={() => setFilterEmpId(null)} style={{ background: `${COLORS.accent}15`, border: `1px solid ${COLORS.accent}40`, color: COLORS.accent, padding: '7px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              ✕ Réinitialiser le filtre
            </button>
          )}
        </div>
        <button
          onClick={() => setModalActive('ruche')}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, color: 'white', border: 'none', padding: '12px 28px', borderRadius: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 4px 20px ${COLORS.accent}40`, cursor: 'pointer' }}
        >
          <Plus size={20} /> Nouvelle Ruche
        </button>
      </div>

      {/* ── KPI summary row ── */}
      {ruches.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
          {[
            { label: 'Total Ruches',  val: filteredRuches.length,                                      color: COLORS.accent,  icon: Hexagon },
            { label: 'Actives',       val: filteredRuches.filter(r => r.is_active).length,             color: COLORS.success, icon: TrendingUp },
            { label: 'Santé moy.',    val: filteredRuches.length ? (filteredRuches.reduce((a,r) => a+(r.health_score||0),0)/filteredRuches.length).toFixed(1)+'/10' : '—', color: COLORS.info, icon: ShieldCheck },
            { label: 'En alerte',     val: filteredRuches.filter(r => (r.health_score||10) < 4).length, color: COLORS.error,   icon: AlertCircle }
          ].map((k, i) => (
            <div key={i} style={{ background: COLORS.surface, borderRadius: 18, padding: '18px 20px', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <k.icon size={20} color={k.color} />
              </div>
              <div>
                <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700 }}>{k.label}</div>
                <div style={{ color: 'white', fontSize: 20, fontWeight: 900 }}>{k.val}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Hive cards grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {filteredRuches.length === 0 ? (
          <div style={{ gridColumn: '1/-1', padding: '80px 0', textAlign: 'center', background: COLORS.surface, borderRadius: 32, border: `2px dashed ${COLORS.border}` }}>
            <Hexagon size={48} color={COLORS.textMuted} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ color: COLORS.textMuted, fontSize: 16, fontWeight: 600 }}>Aucune ruche trouvée.</p>
            <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>Cliquez sur "Nouvelle Ruche" pour commencer</p>
          </div>
        ) : filteredRuches.map(r => {
          const site = emplacements.find(e => String(e.id) === String(r.apiary_id));
          const hScore = r.health_score ?? 10;
          const hColor = healthColor(hScore);

          return (
            <div key={r.id} style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`, overflow: 'hidden', transition: 'transform 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = COLORS.accent + '50'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = COLORS.border; }}
            >
              {/* Card header */}
              <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: r.is_active ? `${COLORS.success}18` : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <Hexagon size={24} color={r.is_active ? COLORS.success : COLORS.textMuted} />
                    {r.is_active && <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: COLORS.success, boxShadow: `0 0 6px ${COLORS.success}` }} />}
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{r.identifier}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <MapPin size={11} color={COLORS.textMuted} />
                      <span style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600 }}>{site?.name || 'Site non défini'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: r.is_active ? COLORS.success : COLORS.textMuted, background: r.is_active ? `${COLORS.success}15` : 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => onDelete(r.id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { id: 'health_score', label: 'Santé',  val: r.health_score ?? 10, color: hColor,         icon: ShieldCheck },
                  { id: 'honey_level',  label: 'Miel',   val: r.honey_level  ?? 5,  color: COLORS.accent,  icon: Droplets },
                  { id: 'force_level',  label: 'Force',  val: r.force_level  ?? 5,  color: '#8b5cf6',      icon: Activity }
                ].map(metric => (
                  <div key={metric.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <metric.icon size={14} color={metric.color} />
                      <span style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600 }}>{metric.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Progress bar */}
                      <div style={{ width: 60, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(metric.val / 10) * 100}%`, background: metric.color, borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <button onClick={() => onUpdateStat(r.id, metric.id, -1)} style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={12} />
                      </button>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{metric.val}</span>
                      <button onClick={() => onUpdateStat(r.id, metric.id, 1)} style={{ width: 26, height: 26, borderRadius: 7, background: `${metric.color}20`, border: `1px solid ${metric.color}40`, color: metric.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700 }}>TYPE</div>
                    <div style={{ fontSize: 12, color: 'white', fontWeight: 700, marginTop: 2 }}>{r.hive_type || 'Standard'}</div>
                  </div>
                  <div style={{ flex: 1, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700 }}>REINE</div>
                    <div style={{ fontSize: 12, color: 'white', fontWeight: 700, marginTop: 2 }}>{r.queen_year || '—'}</div>
                  </div>
                  <button
                    onClick={() => openConsole(r)}
                    style={{ flex: 2, padding: '8px 12px', borderRadius: 10, background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}30`, color: COLORS.accent, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    Console <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════ CONSOLE MODAL ═══════ */}
      {reportRuche && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ background: COLORS.bg, width: '100%', maxWidth: 1080, height: '90vh', borderRadius: 36, border: `1px solid ${COLORS.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>

            {/* Console header */}
            <div style={{ padding: '28px 36px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.surface, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px ${COLORS.accent}40` }}>
                  <Hexagon size={30} color="white" />
                </div>
                <div>
                  <h2 style={{ color: 'white', fontSize: 26, fontWeight: 900, margin: 0 }}>{reportRuche.identifier}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.textMuted, fontSize: 12 }}>
                      <MapPin size={12} /> {emplacements.find(e => String(e.id) === String(reportRuche.apiary_id))?.name || 'Site ?'}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: COLORS.border }} />
                    <span style={{ color: reportRuche.is_active ? COLORS.success : COLORS.error, fontSize: 11, fontWeight: 800 }}>
                      {reportRuche.is_active ? '● ACTIVE' : '○ INACTIVE'}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: COLORS.border }} />
                    <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{reportRuche.hive_type}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setReportRuche(null)} style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={22} />
              </button>
            </div>

            {/* Console tabs */}
            <div style={{ padding: '0 36px', background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: 4, flexShrink: 0 }}>
              {[
                { id: 'overview',    label: "Vue d'ensemble", icon: LayoutGrid },
                { id: 'visites',     label: 'Visites',        icon: VisitIcon },
                { id: 'planning',    label: 'Planification',  icon: Calendar },
                { id: 'production',  label: 'Production',     icon: Droplets },
                { id: 'depenses',    label: 'Dépenses',       icon: Wallet }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveManagerTab(tab.id)} style={{
                  padding: '18px 20px', background: 'none', border: 'none',
                  borderBottom: activeManagerTab === tab.id ? `3px solid ${COLORS.accent}` : '3px solid transparent',
                  color: activeManagerTab === tab.id ? 'white' : COLORS.textMuted,
                  fontWeight: activeManagerTab === tab.id ? 800 : 500,
                  fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: '0.15s'
                }}>
                  <tab.icon size={16} color={activeManagerTab === tab.id ? COLORS.accent : COLORS.textMuted} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Console content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 36 }}>
              {loadingDetails ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <div style={{ width: 36, height: 36, border: `3px solid ${COLORS.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ color: COLORS.textMuted, fontWeight: 600 }}>Chargement des données opérationnelles...</span>
                </div>
              ) : !hiveDetails ? (
                <div style={{ textAlign: 'center', color: COLORS.textMuted, padding: '60px 0' }}>
                  <AlertCircle size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                  <p>Impossible de charger les détails.</p>
                </div>
              ) : (
                <>
                  {/* ─ Overview ─ */}
                  {activeManagerTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 20 }}>
                        {[
                          { label: 'Miel Total',     val: safeProduction.reduce((a,p)=>a+(p.honey_kg||0),0).toFixed(1)+' kg', icon: Droplets,   color: COLORS.accent },
                          { label: 'Vitalité Reine', val: (reportRuche.force_level??5)+'/10',                                  icon: Star,       color: '#f59e0b' },
                          { label: 'Santé',          val: (reportRuche.health_score??10)+'/10',                                icon: ShieldCheck, color: COLORS.success },
                          { label: 'Tâches',         val: safePlanning.filter(p=>p.status==='pending').length+' en attente',   icon: Calendar,   color: COLORS.info }
                        ].map((s,i) => (
                          <div key={i} style={{ background: COLORS.surface, padding: 22, borderRadius: 22, border: `1px solid ${COLORS.border}` }}>
                            <s.icon size={20} color={s.color} style={{ marginBottom: 12 }} />
                            <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                            <div style={{ color: 'white', fontSize: 22, fontWeight: 900, marginTop: 4 }}>{s.val}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
                        <div style={{ background: COLORS.surface, borderRadius: 28, padding: 28, border: `1px solid ${COLORS.border}` }}>
                          <h3 style={{ color: 'white', fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Informations Ruche</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                            {[
                              { icon: Info,        label: 'Année Reine', val: reportRuche.queen_year || 'N/A' },
                              { icon: Zap,         label: 'Type',         val: reportRuche.hive_type || 'Standard' },
                              { icon: ShieldCheck, label: 'Santé',        val: (reportRuche.health_score??10)+'/10' },
                              { icon: Activity,    label: 'Force',        val: (reportRuche.force_level??5)+'/10' }
                            ].map((item,i) => (
                              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: 18, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
                                <item.icon size={18} color={COLORS.accent} />
                                <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700, marginTop: 8, textTransform: 'uppercase' }}>{item.label}</div>
                                <div style={{ color: 'white', fontSize: 18, fontWeight: 800, marginTop: 4 }}>{item.val}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ background: COLORS.surface, borderRadius: 28, padding: 28, border: `1px solid ${COLORS.border}` }}>
                          <h3 style={{ color: 'white', fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Inventaire Interne</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                              { label: 'Sirop',    val: safeStock.sirop+' L',  color: COLORS.info },
                              { label: 'Pâte',     val: safeStock.pate+' kg',  color: COLORS.success },
                              { label: 'Cadres',   val: safeStock.cadres,       color: COLORS.accent },
                              { label: 'Hausses',  val: safeStock.hausse,       color: '#8b5cf6' }
                            ].map((s,i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}` }}>
                                <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{s.label}</span>
                                <span style={{ color: s.color, fontWeight: 800, fontSize: 14 }}>{s.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─ Visites ─ */}
                  {activeManagerTab === 'visites' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>Historique des Visites ({safeVisits.length})</h3>
                      {safeVisits.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted }}>Aucune visite enregistrée.</div>
                      ) : safeVisits.map(v => (
                        <div key={v.id} style={{ background: COLORS.surface, padding: 20, borderRadius: 20, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.accent }}>
                              <Calendar size={22} />
                            </div>
                            <div>
                              <div style={{ color: 'white', fontWeight: 800 }}>{v.visit_date || v.date}</div>
                              <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{v.notes || 'Inspection standard'}</div>
                            </div>
                          </div>
                          <span style={{
                            background: v.health_state === 'health' ? COLORS.success+'20' : COLORS.error+'20',
                            color: v.health_state === 'health' ? COLORS.success : COLORS.error,
                            padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase'
                          }}>
                            {v.health_state || 'health'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ─ Planning ─ */}
                  {activeManagerTab === 'planning' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>Planification des Tâches</h3>
                      {safePlanning.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted }}>Aucune tâche planifiée.</div>
                      ) : safePlanning.map(p => (
                        <div key={p.id} style={{ background: COLORS.surface, padding: 20, borderRadius: 20, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.info }}>
                              <Clock size={22} />
                            </div>
                            <div>
                              <div style={{ color: 'white', fontWeight: 800 }}>{p.planned_date}</div>
                              <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{p.action_type}</div>
                            </div>
                          </div>
                          <span style={{ color: p.status === 'done' ? COLORS.success : COLORS.accent, fontWeight: 800, fontSize: 12 }}>
                            {(p.status || '').toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ─ Production ─ */}
                  {activeManagerTab === 'production' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>Production de Miel ({safeProduction.length} récoltes)</h3>
                      <div style={{ background: COLORS.surface, borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                              {['DATE', 'QUANTITÉ (KG)', 'POLLEN (KG)', 'QUALITÉ'].map(h => (
                                <th key={h} style={{ padding: '14px 20px', textAlign: 'left', color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {safeProduction.length === 0 ? (
                              <tr><td colSpan="4" style={{ padding: '40px 0', textAlign: 'center', color: COLORS.textMuted }}>Aucune production enregistrée.</td></tr>
                            ) : safeProduction.map(p => (
                              <tr key={p.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                                <td style={{ padding: '14px 20px', color: 'white', fontWeight: 600 }}>{p.production_date}</td>
                                <td style={{ padding: '14px 20px', color: COLORS.accent, fontWeight: 900 }}>{p.honey_kg} kg</td>
                                <td style={{ padding: '14px 20px', color: COLORS.success, fontWeight: 700 }}>{p.pollen_kg || 0} kg</td>
                                <td style={{ padding: '14px 20px', color: 'white' }}>{p.quality_notes || 'Premium'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ─ Dépenses ─ */}
                  {activeManagerTab === 'depenses' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>Gestion Financière</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20 }}>
                        {[
                          { label: 'Alimentation', type: 'food',        color: COLORS.accent },
                          { label: 'Traitements',  type: 'treatment',   color: COLORS.error },
                          { label: 'Maintenance',  type: 'maintenance', color: COLORS.info }
                        ].map((d,i) => {
                          const total = safeExpenses.filter(e => e.expense_type === d.type).reduce((acc,e) => acc+(e.amount||0), 0);
                          return (
                            <div key={i} style={{ background: COLORS.surface, padding: 22, borderRadius: 22, border: `1px solid ${COLORS.border}` }}>
                              <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{d.label}</div>
                              <div style={{ color: d.color, fontSize: 24, fontWeight: 900 }}>{total.toFixed(2)} DT</div>
                            </div>
                          );
                        })}
                      </div>
                      {safeExpenses.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: COLORS.textMuted }}>Aucune dépense enregistrée pour cette ruche.</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 36px', background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setReportRuche(null)} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', padding: '12px 28px', borderRadius: 14, fontWeight: 700, cursor: 'pointer', border: `1px solid ${COLORS.border}` }}>
                Fermer la console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL NOUVELLE RUCHE ═══════ */}
      {modalActive === 'ruche' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: COLORS.surface, width: 460, borderRadius: 32, border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${COLORS.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hexagon size={20} color={COLORS.accent} />
                </div>
                <h2 style={{ color: 'white', fontSize: 18, fontWeight: 900, margin: 0 }}>Nouvelle Ruche</h2>
              </div>
              <button onClick={() => setModalActive(null)} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>IDENTIFIANT (QR)</label>
                <input type="text" value={rucheForm.identifier} onChange={e => setRucheForm({...rucheForm, identifier: e.target.value})} style={inputStyle} placeholder="ex: HIVE-2024-A1" />
              </div>
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>EMPLACEMENT</label>
                <select value={rucheForm.apiary_id} onChange={e => setRucheForm({...rucheForm, apiary_id: e.target.value})} style={inputStyle}>
                  <option value="">Sélectionner un site...</option>
                  {emplacements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>TYPE</label>
                  <select value={rucheForm.hive_type} onChange={e => setRucheForm({...rucheForm, hive_type: e.target.value})} style={{ ...inputStyle, height: 44 }}>
                    {['Langstroth', 'Dadant', 'Warré', 'TBH', 'Autre'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>ANNÉE REINE</label>
                  <input type="number" value={rucheForm.queen_year} onChange={e => setRucheForm({...rucheForm, queen_year: e.target.value})} style={{ ...inputStyle, height: 44 }} placeholder={new Date().getFullYear()} />
                </div>
              </div>
              <div>
                <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8, display: 'block' }}>NOTES</label>
                <textarea value={rucheForm.notes || ''} onChange={e => setRucheForm({...rucheForm, notes: e.target.value})} placeholder="Observations initiales..." style={{ width: '100%', height: 80, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '12px 16px', color: 'white', resize: 'none', outline: 'none', fontSize: 13 }} />
              </div>
              <button
                onClick={() => handleAddRuche(rucheForm)}
                style={{ height: 58, background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, borderRadius: 16, border: 'none', color: 'white', fontWeight: 900, cursor: 'pointer', fontSize: 15, boxShadow: `0 8px 24px ${COLORS.accent}40`, transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Enregistrer la Ruche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
