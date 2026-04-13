import React, { useState, useMemo } from 'react';
import { 
  Plus, Hexagon, MapPin, Activity, Droplets, Thermometer, 
  ShieldCheck, AlertCircle, ChevronRight, LayoutGrid, List,
  Zap, Info, Minus, Clock, FileText, X, ArrowUpRight, Calendar, Sprout, Package, Trash2
} from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function RuchesTab({ 
  ruches, emplacements, visites = [], productions = [], modalActive, setModalActive,
  rucheForm, setRucheForm, handleAddRuche, onUpdateStat, onDelete 
}) {
  const [reportRuche, setReportRuche] = useState(null);

  // LOGIQUE DU RAPPORT GÉNÉRÉ À LA VOLÉE
  const hiveStats = useMemo(() => {
    if (!reportRuche) return null;
    
    const hiveVisits = visites.filter(v => v.rucheId === reportRuche.name);
    const hiveProds = productions.filter(p => ruches.find(r => r.id === p.id)?.name === reportRuche.name);

    return {
      visits: hiveVisits,
      totalMiel: hiveVisits.reduce((acc, v) => acc + (v.recolteKgs || 0), 0),
      totalPollen: hiveVisits.reduce((acc, v) => acc + (v.pollenKgs || 0), 0),
      consumables: hiveVisits.reduce((acc, v) => {
        acc.sirop += (v.needs?.sirop || 0);
        acc.pate += (v.needs?.pate || 0);
        acc.traitement += (v.needs?.traitement || 0);
        return acc;
      }, { sirop: 0, pate: 0, traitement: 0 })
    };
  }, [reportRuche, visites, productions, ruches]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>Inventaire des Ruches</h1>
            <p style={{ color: COLORS.textMuted, marginTop: 4 }}>Suivi en temps réel de votre colonie</p>
          </div>
          <button 
            onClick={() => setModalActive('ruche')} 
            style={{ background: COLORS.accent, color: 'white', border: 'none', padding: '12px 28px', borderRadius: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 14px 0 rgba(217,119,6,0.39)', cursor: 'pointer' }}
          >
            <Plus size={20}/> Nouvelle Ruche
          </button>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
          {ruches.length === 0 ? (
            <div style={{ gridColumn: '1/-1', height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, color: COLORS.textMuted, background: COLORS.surface, borderRadius: 32, border: `2px dashed ${COLORS.border}` }}>
               <Hexagon size={60} strokeWidth={1} />
               <p style={{ fontWeight: 600 }}>Aucune ruche enregistrée. Commencez par en ajouter une.</p>
            </div>
          ) : (
            ruches.map(r => {
              const site = emplacements.find(e => Number(e.id) === Number(r.empId));
              return (
                <div key={r.id} style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`, overflow: 'hidden', transition: '0.3s' }}>
                  <div style={{ padding: 24, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: COLORS.accent + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <Hexagon size={22} color={COLORS.accent} />
                        </div>
                        <div>
                           <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{r.name}</div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontSize: 11 }}>
                              <MapPin size={12} /> {site?.nom || 'Sans site'}
                           </div>
                        </div>
                     </div>
                     <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.sante > 7 ? COLORS.success : r.sante > 4 ? '#fbbf24' : COLORS.error }} />
                        <button 
                           onClick={() => onDelete(r.id)}
                           style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '6px', borderRadius: 8, color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                           <Trash2 size={14} />
                        </button>
                     </div>
                  </div>

                  <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                     {[
                        { id: 'sante', label: 'Santé', icon: ShieldCheck, color: COLORS.success, value: r.sante || 5 },
                        { id: 'miel', label: 'Miel', icon: Droplets, color: COLORS.accent, value: r.miel || 5 },
                        { id: 'temp', label: 'Temp', icon: Thermometer, color: '#fbbf24', value: r.temp || 32, unit: '°C' },
                        { id: 'force', label: 'Force', icon: Zap, color: '#8b5cf6', value: r.force || 5 }
                     ].map(metric => (
                        <div key={metric.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 12px', borderRadius: 20, border: `1px solid ${COLORS.border}` }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                              <metric.icon size={16} color={metric.color} />
                              <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.textMuted, textTransform: 'uppercase' }}>{metric.label}</span>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <button 
                                onClick={() => onUpdateStat(r.id, metric.id, -1)}
                                style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer' }}
                              >
                                <Minus size={14} />
                              </button>
                              <span style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>{metric.value}{metric.unit || ''}</span>
                              <button 
                                onClick={() => onUpdateStat(r.id, metric.id, 1)}
                                style={{ width: 30, height: 30, borderRadius: 8, background: `${metric.color}15`, border: 'none', color: metric.color, cursor: 'pointer' }}
                              >
                                <Plus size={14} />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>

                  <div style={{ padding: '0 24px 20px' }}>
                    <button 
                      onClick={() => setReportRuche(r)}
                      style={{ width: '100%', padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.border}`, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                       Voir rapport détaillé <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
       </div>

       {/* MODAL RAPPORT DÉTAILLÉ */}
       {reportRuche && (
         <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(15px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div style={{ background: COLORS.bg, width: '100%', maxWidth: 1000, height: '90vh', borderRadius: 40, border: `1px solid ${COLORS.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
               <div style={{ padding: '32px 40px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                     <div style={{ width: 64, height: 64, borderRadius: 20, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={32} color="white" />
                     </div>
                     <div>
                        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 800 }}>Rapport Individuel : {reportRuche.name}</h2>
                        <p style={{ color: COLORS.textMuted }}>Historique complet des interventions et de la production</p>
                     </div>
                  </div>
                  <button onClick={() => setReportRuche(null)} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <X size={24} />
                  </button>
               </div>

               <div style={{ flex: 1, overflowY: 'auto', padding: 40, display: 'flex', flexDirection: 'column', gap: 40 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
                     {[
                        { label: 'Récolte Miel', val: hiveStats.totalMiel + ' kg', icon: Droplets, color: COLORS.accent },
                        { label: 'Récolte Pollen', val: hiveStats.totalPollen + ' kg', icon: Sprout, color: COLORS.info },
                        { label: 'Visites totales', val: hiveStats.visits.length, icon: Calendar, color: '#8b5cf6' },
                        { label: 'Indice Santé', val: reportRuche.sante + '/10', icon: ShieldCheck, color: COLORS.success }
                     ].map((s, i) => (
                        <div key={i} style={{ background: COLORS.surface, padding: 24, borderRadius: 24, border: `1px solid ${COLORS.border}` }}>
                           <s.icon size={20} color={s.color} style={{ marginBottom: 12 }} />
                           <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700 }}>{s.label}</div>
                           <div style={{ color: 'white', fontSize: 24, fontWeight: 800, marginTop: 4 }}>{s.val}</div>
                        </div>
                     ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 40 }}>
                     <div>
                        <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                           <Clock size={20} color={COLORS.accent} /> Journal des Interventions
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                           {hiveStats.visits.length === 0 ? (
                              <p style={{ color: COLORS.textMuted }}>Aucune visite enregistrée pour le moment.</p>
                           ) : (
                              hiveStats.visits.map(v => (
                                 <div key={v.id} style={{ background: COLORS.surface, padding: 20, borderRadius: 20, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                       <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{v.date}</div>
                                       <div style={{ color: COLORS.textMuted, fontSize: 12 }}>État: {v.etat}</div>
                                       {v.notes && <div style={{ color: COLORS.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>"{v.notes}"</div>}
                                    </div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                       {v.recolteKgs > 0 && <span style={{ background: COLORS.accent + '20', color: COLORS.accent, px: 8, py: 4, borderRadius: 6, fontSize: 10, fontWeight: 800 }}>+{v.recolteKgs}kg Miel</span>}
                                       {v.photo && <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden' }}><img src={v.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                                    </div>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>

                     <div>
                        <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                           <Package size={20} color={COLORS.info} /> Consommation Logistique
                        </h3>
                        <div style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                           {[
                              { label: 'Sirop consommé', val: hiveStats.consumables.sirop + ' L' },
                              { label: 'Pâte protéinée', val: hiveStats.consumables.pate + ' kg' },
                              { label: 'Traitements administrés', val: hiveStats.consumables.traitement + ' doses' }
                           ].map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < 2 ? `1px solid ${COLORS.border}` : 'none', paddingBottom: i < 2 ? 16 : 0 }}>
                                 <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{item.label}</span>
                                 <span style={{ color: 'white', fontWeight: 800 }}>{item.val}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               <div style={{ padding: 32, background: 'rgba(255,255,255,0.01)', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setReportRuche(null)} style={{ background: 'white', color: 'black', px: 32, py: 14, borderRadius: 14, fontWeight: 800, cursor: 'pointer', border: 'none' }}>Fermer le rapport</button>
               </div>
            </div>
         </div>
       )}

       {modalActive === 'ruche' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: COLORS.surface, width: 450, borderRadius: 32, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
               <div style={{ padding: '24px 32px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>Nouvelle Ruche</h2>
                <button onClick={() => setModalActive(null)} style={{ background: 'none', border: 'none', color: COLORS.textMuted }}><Plus style={{ transform: 'rotate(45deg)' }} size={24}/></button>
              </div>
              <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <label style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Identifiant / QR Code</label>
                  <input type="text" value={rucheForm.qr} onChange={(e)=>setRucheForm({...rucheForm, qr: e.target.value})} style={{ width: '100%', height: 50, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white' }} />
                </div>
                <div>
                  <label style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Emplacement</label>
                  <select value={rucheForm.empId} onChange={(e)=>setRucheForm({...rucheForm, empId: e.target.value})} style={{ width: '100%', height: 50, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white' }}>
                    <option value="">Sélectionner un site</option>
                    {emplacements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                   <input type="checkbox" checked={rucheForm.active} onChange={(e)=>setRucheForm({...rucheForm, active: e.target.checked})} style={{ width: 20, height: 20 }} />
                   <span style={{ color: 'white', fontWeight: 600 }}>Ruche active</span>
                </div>
                <button onClick={handleAddRuche} style={{ height: 60, background: COLORS.accent, borderRadius: 16, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(217,119,6,0.3)' }}>Finaliser l'enregistrement</button>
              </div>
            </div>
          </div>
       )}
    </div>
  );
}
