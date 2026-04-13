import React from 'react';
import { 
  Wallet, Plus, Calendar, DollarSign, Tag, FileText, 
  MapPin, ChevronDown, Sprout, ShieldPlus, Wrench, 
  Truck, Users, MoreHorizontal, X, AlertCircle, TrendingUp, Info
} from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function DepensesTab({ 
  depenses, emplacements, modalActive, setModalActive,
  depenseForm, setDepenseForm, handleAddDepense 
}) {
  const categories = [
    { id: 'Alimentation', icon: Sprout, color: '#10b981' },
    { id: 'Traitement', icon: ShieldPlus, color: '#ef4444' },
    { id: 'Équipement', icon: Wrench, color: '#3b82f6' },
    { id: 'Transport', icon: Truck, color: '#f59e0b' },
    { id: 'Main-d\'œuvre', icon: Users, color: '#8b5cf6' },
    { id: 'Autre', icon: MoreHorizontal, color: '#94a3b8' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>Finances & Logistique</h1>
            <p style={{ color: COLORS.textMuted, marginTop: 4 }}>Suivi des coûts réels vs prévisionnels</p>
          </div>
          <button 
            onClick={() => setModalActive('depenses')} 
            style={{ background: COLORS.accent, color: 'white', border: 'none', padding: '12px 28px', borderRadius: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 14px 0 rgba(217,119,6,0.39)', cursor: 'pointer' }}
          >
            <Plus size={20}/> Ajouter Dépense
          </button>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
          {depenses.length === 0 ? (
            <div style={{ gridColumn: '1/-1', height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, color: COLORS.textMuted, background: COLORS.surface, borderRadius: 32, border: `2px dashed ${COLORS.border}` }}>
               <Wallet size={60} strokeWidth={1} />
               <p style={{ fontWeight: 600 }}>Aucune écriture comptable.</p>
            </div>
          ) : (
            depenses.map(d => {
              const site = (emplacements || []).find(e => Number(e.id) === Number(d.empId));
              const cat = categories.find(c => c.id === d.type) || categories[5];
              return (
                <div key={d.id} style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: 24, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <cat.icon size={20} color={cat.color}/>
                        </div>
                        <div>
                           <div style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>{d.type}</div>
                           <div style={{ color: COLORS.textMuted, fontSize: 11 }}>{site?.nom || 'Frais Généraux'}</div>
                        </div>
                     </div>
                     <span style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 700 }}>{d.date}</span>
                  </div>

                  <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                     <div style={{ padding: 16, borderRadius: 16, border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>PRÉVISIONNEL</div>
                        <div style={{ color: COLORS.info, fontWeight: 800, fontSize: 20 }}>{d.montantPrevu} DT</div>
                     </div>
                     <div style={{ padding: 16, borderRadius: 16, border: `1px solid ${COLORS.border}`, background: 'rgba(239, 68, 68, 0.05)' }}>
                        <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>RÉEL (PAYÉ)</div>
                        <div style={{ color: COLORS.error, fontWeight: 800, fontSize: 20 }}>{d.montantReel} DT</div>
                     </div>
                  </div>

                  <div style={{ padding: '0 24px 24px' }}>
                     <p style={{ color: COLORS.textMuted, fontSize: 13, minHeight: 40, lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12 }}>
                        {d.description || 'Logistique avant visite...'}
                     </p>
                  </div>
                </div>
              );
            })
          )}
       </div>

       {modalActive === 'depenses' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: COLORS.surface, width: 480, borderRadius: 32, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '24px 32px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>Nouvelle Dépense</h2>
                <button onClick={() => setModalActive(null)} style={{ background: 'none', border: 'none', color: COLORS.textMuted }}><X size={24}/></button>
              </div>
              <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'block' }}>PRÉVU (DT)</label>
                      <input type="number" value={depenseForm.montantPrevu} onChange={(e)=>setDepenseForm({...depenseForm, montantPrevu: e.target.value})} style={{ width: '100%', height: 48, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white' }} />
                    </div>
                    <div>
                      <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'block' }}>RÉEL (DT)</label>
                      <input type="number" value={depenseForm.montantReel} onChange={(e)=>setDepenseForm({...depenseForm, montantReel: e.target.value})} style={{ width: '100%', height: 48, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.error}40`, borderRadius: 12, padding: '0 16px', color: 'white' }} />
                    </div>
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700 }}>CATÉGORIE & TYPE</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      {categories.map(cat => (
                        <button key={cat.id} onClick={() => setDepenseForm({ ...depenseForm, type: cat.id })} style={{ padding: '12px 8px', borderRadius: 14, border: depenseForm.type === cat.id ? `2px solid ${cat.color}` : `1px solid ${COLORS.border}`, background: depenseForm.type === cat.id ? `${cat.color}10` : 'rgba(255,255,255,0.01)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                           <cat.icon size={18} color={depenseForm.type === cat.id ? cat.color : COLORS.textMuted} />
                           <span style={{ fontSize: 9, fontWeight: 800 }}>{cat.id}</span>
                        </button>
                      ))}
                    </div>
                 </div>

                 <button onClick={handleAddDepense} style={{ height: 60, background: COLORS.accent, borderRadius: 16, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', marginTop: 12 }}>Enregistrer dans la comptabilité</button>
              </div>
            </div>
          </div>
       )}
    </div>
  );
}
