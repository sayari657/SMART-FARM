import {
  Hexagon, MapPin, X, LayoutGrid,
  ClipboardCheck as VisitIcon, Calendar, Droplets, Wallet,
  Info, Zap, ShieldCheck, Activity, Star, Clock, AlertCircle
} from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function HiveConsoleModal({
  hive, emplacements = [], hiveDetails, loadingDetails,
  activeTab, setActiveTab, onClose,
}) {
  const safeProduction = hiveDetails?.production ?? [];
  const safePlanning   = hiveDetails?.planning   ?? [];
  const safeExpenses   = hiveDetails?.expenses   ?? [];
  const safeVisits     = hiveDetails?.visits      ?? [];
  const safeStock      = hiveDetails?.stock       ?? { sirop: 0, pate: 0, traitement: 0, cadres: 0, hausse: 0 };

  const TABS = [
    { id: 'overview',   label: "Vue d'ensemble", icon: LayoutGrid },
    { id: 'visites',    label: 'Visites',        icon: VisitIcon },
    { id: 'planning',   label: 'Planification',  icon: Calendar },
    { id: 'production', label: 'Production',     icon: Droplets },
    { id: 'depenses',   label: 'Dépenses',       icon: Wallet },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ background: COLORS.bg, width: '100%', maxWidth: 1080, height: '90vh', borderRadius: 36, border: `1px solid ${COLORS.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ padding: '28px 36px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.surface, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px ${COLORS.accent}40` }}>
              <Hexagon size={30} color="white" />
            </div>
            <div>
              <h2 style={{ color: 'white', fontSize: 26, fontWeight: 900, margin: 0 }}>{hive.identifier}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: COLORS.textMuted, fontSize: 12 }}>
                  <MapPin size={12} /> {emplacements.find(e => String(e.id) === String(hive.apiary_id))?.name || 'Site ?'}
                </span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: COLORS.border }} />
                <span style={{ color: hive.is_active ? COLORS.success : COLORS.error, fontSize: 11, fontWeight: 800 }}>
                  {hive.is_active ? '● ACTIVE' : '○ INACTIVE'}
                </span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: COLORS.border }} />
                <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{hive.hive_type}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 44, height: 44, borderRadius: 14, background: COLORS.overlay06, border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={22} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ padding: '0 36px', background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: 4, flexShrink: 0 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '18px 20px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? `3px solid ${COLORS.accent}` : '3px solid transparent',
              color: activeTab === tab.id ? 'white' : COLORS.textMuted,
              fontWeight: activeTab === tab.id ? 800 : 500,
              fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: '0.15s',
            }}>
              <tab.icon size={16} color={activeTab === tab.id ? COLORS.accent : COLORS.textMuted} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
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
              {/* Overview */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 20 }}>
                    {[
                      { label: 'Miel Total',     val: safeProduction.reduce((a, p) => a + (p.honey_kg || 0), 0).toFixed(1) + ' kg', icon: Droplets,   color: COLORS.accent },
                      { label: 'Vitalité Reine', val: (hive.force_level ?? 5) + '/10',                                               icon: Star,       color: '#f59e0b' },
                      { label: 'Santé',          val: (hive.health_score ?? 10) + '/10',                                             icon: ShieldCheck, color: COLORS.success },
                      { label: 'Tâches',         val: safePlanning.filter(p => p.status === 'pending').length + ' en attente',       icon: Calendar,   color: COLORS.info },
                    ].map((s, i) => (
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
                          { icon: Info,        label: 'Année Reine', val: hive.queen_year || 'N/A' },
                          { icon: Zap,         label: 'Type',         val: hive.hive_type || 'Standard' },
                          { icon: ShieldCheck, label: 'Santé',        val: (hive.health_score ?? 10) + '/10' },
                          { icon: Activity,    label: 'Force',        val: (hive.force_level ?? 5) + '/10' },
                        ].map((item, i) => (
                          <div key={i} style={{ background: COLORS.overlay03, padding: 18, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
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
                          { label: 'Sirop',   val: safeStock.sirop + ' L',  color: COLORS.info },
                          { label: 'Pâte',    val: safeStock.pate + ' kg',  color: COLORS.success },
                          { label: 'Cadres',  val: safeStock.cadres,         color: COLORS.accent },
                          { label: 'Hausses', val: safeStock.hausse,         color: '#8b5cf6' },
                        ].map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: COLORS.overlay03, border: `1px solid ${COLORS.border}` }}>
                            <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{s.label}</span>
                            <span style={{ color: s.color, fontWeight: 800, fontSize: 14 }}>{s.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Visites */}
              {activeTab === 'visites' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>Historique des Visites ({safeVisits.length})</h3>
                  {safeVisits.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted }}>Aucune visite enregistrée.</div>
                  ) : safeVisits.map(v => (
                    <div key={v.id} style={{ background: COLORS.surface, padding: 20, borderRadius: 20, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.overlay04, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.accent }}>
                          <Calendar size={22} />
                        </div>
                        <div>
                          <div style={{ color: 'white', fontWeight: 800 }}>{v.visit_date || v.date}</div>
                          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{v.notes || 'Inspection standard'}</div>
                        </div>
                      </div>
                      <span style={{
                        background: v.health_state === 'health' ? COLORS.success + '20' : COLORS.error + '20',
                        color: v.health_state === 'health' ? COLORS.success : COLORS.error,
                        padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                      }}>
                        {v.health_state || 'health'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Planning */}
              {activeTab === 'planning' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>Planification des Tâches</h3>
                  {safePlanning.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: COLORS.textMuted }}>Aucune tâche planifiée.</div>
                  ) : safePlanning.map(p => (
                    <div key={p.id} style={{ background: COLORS.surface, padding: 20, borderRadius: 20, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.overlay04, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.info }}>
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

              {/* Production */}
              {activeTab === 'production' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>Production de Miel ({safeProduction.length} récoltes)</h3>
                  <div style={{ background: COLORS.surface, borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: COLORS.overlay03 }}>
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

              {/* Dépenses */}
              {activeTab === 'depenses' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>Gestion Financière</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20 }}>
                    {[
                      { label: 'Alimentation', type: 'food',        color: COLORS.accent },
                      { label: 'Traitements',  type: 'treatment',   color: COLORS.error },
                      { label: 'Maintenance',  type: 'maintenance', color: COLORS.info },
                    ].map((d, i) => {
                      const total = safeExpenses.filter(e => e.expense_type === d.type).reduce((acc, e) => acc + (e.amount || 0), 0);
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
          <button onClick={onClose} style={{ background: COLORS.overlay08, color: 'white', padding: '12px 28px', borderRadius: 14, fontWeight: 700, cursor: 'pointer', border: `1px solid ${COLORS.border}` }}>
            Fermer la console
          </button>
        </div>
      </div>
    </div>
  );
}
