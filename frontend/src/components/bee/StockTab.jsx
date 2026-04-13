import React, { useMemo } from 'react';
import { 
  Package, Plus, Minus, AlertTriangle, TrendingDown, 
  ShoppingCart, Info, Beaker, Sprout, ShieldAlert, Clock, Activity, Zap
} from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function StockTab({ stock, visites = [], ruches = [], onUpdate }) {
  
  // LOGIQUE PRÉDICTIVE : Calcul de la consommation moyenne
  const analytics = useMemo(() => {
    const stats = {
      sirop: { total: 0, avg: 0, autonomy: 0 },
      pate: { total: 0, avg: 0, autonomy: 0 },
      traitement: { total: 0, avg: 0, autonomy: 0 },
      cadres: { total: 0, avg: 0, autonomy: 0 }
    };

    // Calcul du total consommé (historique complet)
    visites.forEach(v => {
      if (!v.needs) return;
      Object.keys(v.needs).forEach(item => {
        if (stats[item]) stats[item].total += v.needs[item];
      });
    });

    // Estimation journalière (basée sur une moyenne glissante ou nb de ruches)
    // Pour la démo, on simule une conso basée sur le nb de ruches s'il n'y a pas assez d'historique
    const dayCount = 30; // Fenêtre de prévision
    Object.keys(stats).forEach(item => {
      // Si pas d'historique, on estime une conso "type" pour une ruche
      const baseRate = item === 'sirop' ? 0.2 : item === 'pate' ? 0.05 : 0.01;
      const dailyEstimate = stats[item].total > 0 
        ? (stats[item].total / Math.max(1, visites.length)) * (ruches.length / 5) 
        : ruches.length * baseRate;
      
      stats[item].avg = (dailyEstimate * 7).toFixed(1); // Moyenne par semaine
      stats[item].autonomy = dailyEstimate > 0 
        ? Math.floor(stock[item] / dailyEstimate) 
        : 999;
    });

    return stats;
  }, [visites, stock, ruches]);

  const categories = [
    { 
      id: 'sirop', 
      label: 'Sirop Énergétique', 
      unit: 'L', 
      icon: Beaker, 
      color: COLORS.accent, 
      limit: 50,
      desc: 'Nourrissement de stimulation et hivernage.'
    },
    { 
      id: 'pate', 
      label: 'Pâte Protéinée', 
      unit: 'kg', 
      icon: Sprout, 
      color: COLORS.info, 
      limit: 20,
      desc: 'Soutien du couvain et développement.'
    },
    { 
      id: 'traitement', 
      label: 'Traitements Bio', 
      unit: 'doses', 
      icon: ShieldAlert, 
      color: COLORS.error, 
      limit: 10,
      desc: 'Lutte contre le Varroa et maladies.'
    },
    { 
      id: 'cadres', 
      label: 'Cadres Neufs', 
      unit: 'unités', 
      icon: Package, 
      color: COLORS.success, 
      limit: 30,
      desc: 'Renouvellement des gaufres et extension.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>Stock & Logistique</h1>
            <p style={{ color: COLORS.textMuted, marginTop: 4 }}>Gestion prédictive des approvisionnements</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
             <button style={{ background: 'white', color: 'black', border: 'none', padding: '12px 24px', borderRadius: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
               <ShoppingCart size={20} /> Bon de commande
             </button>
          </div>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
         {categories.map(cat => {
           const isLow = stock[cat.id] < cat.limit;
           const stat = analytics[cat.id];
           
           return (
             <div key={cat.id} style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${isLow ? cat.color + '60' : COLORS.border}`, padding: 32, position: 'relative', overflow: 'hidden' }}>
                {isLow && <div style={{ position: 'absolute', top: 0, right: 0, background: cat.color, color: 'white', padding: '4px 16px', fontSize: 10, fontWeight: 900, borderRadius: '0 0 0 16px' }}>ALERTE STOCK BAS</div>}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                   <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 18, background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <cat.icon size={28} color={cat.color} />
                      </div>
                      <div>
                        <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>{cat.label}</h3>
                        <p style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>{cat.desc}</p>
                      </div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 32, fontWeight: 900, color: 'white' }}>{stock[cat.id]} <span style={{ fontSize: 16, color: COLORS.textMuted }}>{cat.unit}</span></div>
                   </div>
                </div>

                {/* PRÉVISIONS - NOUVELLE SECTION */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 20, marginBottom: 24, border: `1px solid ${COLORS.border}` }}>
                   <div style={{ borderRight: `1px solid ${COLORS.border}`, pr: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textMuted, fontSize: 11, fontWeight: 800, marginBottom: 12, textTransform: 'uppercase' }}>
                         <Activity size={14} color={cat.color} /> Consommation
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                         <span style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>{stat.avg}</span>
                         <span style={{ fontSize: 12, color: COLORS.textMuted }}>{cat.unit} / semaine</span>
                      </div>
                      <div style={{ fontSize: 10, color: COLORS.success, marginTop: 4, fontWeight: 700 }}>Stable (basé sur {ruches.length} ruches)</div>
                   </div>
                   <div style={{ pl: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textMuted, fontSize: 11, fontWeight: 800, marginBottom: 12, textTransform: 'uppercase' }}>
                         <Clock size={14} color={COLORS.info} /> Autonomie
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                         <span style={{ fontSize: 20, fontWeight: 800, color: stat.autonomy < 7 ? COLORS.error : 'white' }}>{stat.autonomy}</span>
                         <span style={{ fontSize: 12, color: COLORS.textMuted }}>jours restants</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                         <div style={{ width: `${Math.min(100, (stat.autonomy / 30) * 100)}%`, height: '100%', background: stat.autonomy < 7 ? COLORS.error : COLORS.success }} />
                      </div>
                   </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => onUpdate(cat.id, -1)} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={20}/></button>
                      <button onClick={() => onUpdate(cat.id, 1)} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={20}/></button>
                   </div>
                   <button style={{ background: cat.color + '20', color: cat.color, border: 'none', padding: '10px 20px', borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Approvisionner</button>
                </div>
             </div>
           );
         })}
       </div>
    </div>
  );
}
