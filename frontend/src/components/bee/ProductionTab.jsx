import React, { useMemo } from 'react';
import { 
  Droplets, Plus, MapPin, ChevronDown, Package, Activity, Info, 
  Sparkles, Flower2, TrendingUp
} from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function ProductionTab({ 
  productions, emplacements, modalActive, setModalActive,
  prodForm, setProdForm, handleAddProd 
}) {
  // Calcul des statistiques par emplacement
  const statsParSite = useMemo(() => {
    return emplacements.map(emp => {
      const siteProds = productions.filter(p => Number(p.empId) === Number(emp.id));
      const totalMiel = siteProds.reduce((sum, p) => sum + parseFloat(p.miel || 0), 0);
      const totalPollen = siteProds.reduce((sum, p) => sum + parseFloat(p.pollen || 0), 0);
      return { ...emp, totalMiel, totalPollen, totalRecoltes: siteProds.length };
    });
  }, [productions, emplacements]);

  // NOUVEAU : Calcul par Type de Fleur
  const statsParFleur = useMemo(() => {
    const fleurs = {};
    productions.forEach(p => {
      const emp = emplacements.find(e => Number(e.id) === Number(p.empId));
      const fleur = emp?.typeFleur || 'Inconnu';
      if (!fleurs[fleur]) fleurs[fleur] = { honey: 0, pollen: 0 };
      fleurs[fleur].honey += parseFloat(p.miel || 0);
      fleurs[fleur].pollen += parseFloat(p.pollen || 0);
    });
    return Object.entries(fleurs).map(([name, data]) => ({ name, ...data }));
  }, [productions, emplacements]);

  const totalGlobal = useMemo(() => productions.reduce((acc, p) => acc + parseFloat(p.miel || 0), 0), [productions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>Production & Récoltes</h1>
            <p style={{ color: COLORS.textMuted, marginTop: 4 }}>Analytique des rendements par terroir et floraison</p>
          </div>
          <button 
            onClick={() => setModalActive('production')} 
            style={{ background: COLORS.accent, color: 'white', border: 'none', padding: '12px 28px', borderRadius: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 14px 0 rgba(217,119,6,0.39)', cursor: 'pointer' }}
          >
            <Plus size={20}/> Ajouter Récolte
          </button>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <div style={{ background: COLORS.surface, borderRadius: 24, padding: 24, border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 20 }}>
             <div style={{ width: 56, height: 56, borderRadius: 16, background: COLORS.accent + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={28} color={COLORS.accent} /></div>
             <div><div style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>{totalGlobal} kg</div><div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>PRODUCTION TOTALE</div></div>
          </div>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {/* Par Emplacement */}
          <div style={{ background: COLORS.surface, borderRadius: 32, border: `1px solid ${COLORS.border}`, padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}><MapPin size={20} color={COLORS.info} /><h3 style={{ color: 'white', fontWeight: 800 }}>Rendement par Emplacement</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               {statsParSite.map(s => (
                 <div key={s.id} style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontWeight: 800, color: 'white' }}>{s.nom}</div><div style={{ fontSize: 11, color: COLORS.textMuted }}>{s.totalRecoltes} récoltes</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ color: COLORS.accent, fontWeight: 900, fontSize: 18 }}>{s.totalMiel} kg</div><div style={{ fontSize: 10, color: COLORS.textMuted }}>MIEL RÉCOLTÉ</div></div>
                 </div>
               ))}
            </div>
          </div>

          {/* Par Type de Fleur */}
          <div style={{ background: COLORS.surface, borderRadius: 32, border: `1px solid ${COLORS.border}`, padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}><Flower2 size={20} color={COLORS.success} /><h3 style={{ color: 'white', fontWeight: 800 }}>Rendement par Floraison</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               {statsParFleur.map(f => (
                 <div key={f.name} style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       <div style={{ width: 10, height: 10, borderRadius: '2', background: COLORS.success }} />
                       <span style={{ fontWeight: 800, color: 'white' }}>Miel de {f.name}</span>
                    </div>
                    <div style={{ color: COLORS.success, fontWeight: 900, fontSize: 18 }}>{f.honey} kg</div>
                 </div>
               ))}
            </div>
          </div>
       </div>

       {modalActive === 'production' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: COLORS.surface, width: 450, borderRadius: 28, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '24px 32px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>Nouvelle Récolte</h2>
                <button onClick={() => setModalActive(null)} style={{ background: 'none', border: 'none', color: COLORS.textMuted }}><Plus style={{ transform: 'rotate(45deg)' }} size={24}/></button>
              </div>
              <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div><label style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>Emplacement</label>
                  <select value={prodForm.empId} onChange={(e)=>setProdForm({...prodForm, empId: e.target.value})} style={{ width: '100%', height: 50, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white' }}>
                    <option value="">Sélectionner un site</option>{emplacements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div><label style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>Miel (kg)</label>
                    <input type="number" value={prodForm.miel} onChange={(e)=>setProdForm({...prodForm, miel: e.target.value})} style={{ width: '100%', height: 50, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white' }} />
                  </div>
                  <div><label style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>Pollen (kg)</label>
                    <input type="number" value={prodForm.pollen} onChange={(e)=>setProdForm({...prodForm, pollen: e.target.value})} style={{ width: '100%', height: 50, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white' }} />
                  </div>
                </div>
                <button onClick={handleAddProd} style={{ height: 60, background: COLORS.accent, borderRadius: 16, border: 'none', color: 'white', fontWeight: 800 }}>Enregistrer la production</button>
              </div>
            </div>
          </div>
       )}
    </div>
  );
}
