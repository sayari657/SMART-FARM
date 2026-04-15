import React, { useMemo, useState } from 'react';
import { 
  Package, Plus, Minus, AlertTriangle, TrendingDown, 
  ShoppingCart, Info, Beaker, Sprout, ShieldAlert, Clock, Activity, Zap,
  Search, ExternalLink, X, Loader2, ChevronRight, Tag, Bookmark
} from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function StockTab({ stock, visites = [], ruches = [], onUpdate }) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [usedKeywords, setUsedKeywords] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [availableCategories, setAvailableCategories] = useState([]);

  // LOGIQUE PRÉDICTIVE
  const analytics = useMemo(() => {
    const stats = {
      sirop: { total: 0, avg: 0, autonomy: 0 },
      pate: { total: 0, avg: 0, autonomy: 0 },
      traitement: { total: 0, avg: 0, autonomy: 0 },
      cadres: { total: 0, avg: 0, autonomy: 0 }
    };
    visites.forEach(v => {
      if (!v.needs) return;
      Object.keys(v.needs).forEach(item => {
        if (stats[item]) stats[item].total += v.needs[item];
      });
    });
    Object.keys(stats).forEach(item => {
      const baseRate = item === 'sirop' ? 0.2 : item === 'pate' ? 0.05 : 0.01;
      const dailyEstimate = stats[item].total > 0 
        ? (stats[item].total / Math.max(1, visites.length)) * (ruches.length / 5) 
        : ruches.length * baseRate;
      stats[item].avg = (dailyEstimate * 7).toFixed(1);
      stats[item].autonomy = dailyEstimate > 0 ? Math.floor(stock[item] / dailyEstimate) : 999;
    });
    return stats;
  }, [visites, stock, ruches]);

  const handlePurchaseSearch = async (query) => {
    setIsSearching(true);
    setSearchModalOpen(true);
    setUsedKeywords(query);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/bee/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
      setAvailableCategories(data.all_categories || []);
      setActiveCategory(data.category || "");
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const categories = [
    { id: 'sirop', label: 'Sirop Énergétique', unit: 'L', icon: Beaker, color: COLORS.accent, limit: 50, desc: 'Nourrissement de stimulation.' },
    { id: 'pate', label: 'Pâte Protéinée', unit: 'kg', icon: Sprout, color: COLORS.info, limit: 20, desc: 'Soutien du couvain.' },
    { id: 'traitement', label: 'Traitements Bio', unit: 'doses', icon: ShieldAlert, color: COLORS.error, limit: 10, desc: 'Lutte contre le Varroa.' },
    { id: 'cadres', label: 'Cadres Neufs', unit: 'unités', icon: Package, color: COLORS.success, limit: 30, desc: 'Renouvellement des gaufres.' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>Stock & Logistique</h1>
            <p style={{ color: COLORS.textMuted, marginTop: 4 }}>Catalogue Apiculture Haddad intégré</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
             <button 
               onClick={() => handlePurchaseSearch("matériel apicole")}
               style={{ background: 'white', color: 'black', border: 'none', padding: '12px 24px', borderRadius: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
             >
               <ShoppingCart size={20} /> Catalogue Haddad (Tunisie)
             </button>
          </div>
       </div>

       <div style={{ gridTemplateColumns: 'repeat(2, 1fr)', display: 'grid', gap: 24 }}>
         {categories.map(cat => {
           const isLow = stock[cat.id] < cat.limit;
           const stat = analytics[cat.id];
           return (
             <div key={cat.id} style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${isLow ? cat.color + '60' : COLORS.border}`, padding: 32, position: 'relative' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 20, marginBottom: 24, border: `1px solid ${COLORS.border}` }}>
                   <div style={{ borderRight: `1px solid ${COLORS.border}`, pr: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textMuted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                         <Activity size={14} color={cat.color} /> Conso/Sem
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                         <span style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>{stat.avg}</span>
                         <span style={{ fontSize: 12, color: COLORS.textMuted }}>{cat.unit}</span>
                      </div>
                   </div>
                   <div style={{ pl: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textMuted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                         <Clock size={14} color={COLORS.info} /> Autonomie
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                         <span style={{ fontSize: 20, fontWeight: 800, color: stat.autonomy < 7 ? COLORS.error : 'white' }}>{stat.autonomy}</span>
                         <span style={{ fontSize: 12, color: COLORS.textMuted }}>Jours</span>
                      </div>
                   </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => onUpdate(cat.id, -1)} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer' }}>-</button>
                      <button onClick={() => onUpdate(cat.id, 1)} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer' }}>+</button>
                   </div>
                   <button 
                     onClick={() => handlePurchaseSearch(cat.id)}
                     style={{ background: cat.color + '20', color: cat.color, border: 'none', padding: '10px 20px', borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                   >
                     <ShoppingCart size={14} /> Voir chez Haddad
                   </button>
                </div>
             </div>
           );
         })}
       </div>

       {/* MODALE CATALOGUE HADDAD */}
       {searchModalOpen && (
         <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(30px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div style={{ background: COLORS.bg, width: '100%', maxWidth: 1200, height: '90vh', borderRadius: 48, border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.7)' }}>
               
               {/* Header Header */}
               <div style={{ padding: '32px 48px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 22, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Package size={32} color="white" />
                    </div>
                    <div>
                      <h2 style={{ color: 'white', fontSize: 26, fontWeight: 900 }}>Catalogue : APICULTURE HADDAD</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>
                         <Tag size={14} color={COLORS.accent} /> Catégorie active : <span style={{ color: 'white', fontWeight: 800, textTransform: 'capitalize' }}>{activeCategory}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSearchModalOpen(false)} style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={28} />
                  </button>
               </div>

               <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  {/* Sidebar Catégories */}
                  <div style={{ width: 320, borderRight: `1px solid ${COLORS.border}`, padding: 32, overflowY: 'auto', background: 'rgba(0,0,0,0.1)' }}>
                     <p style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 20, textTransform: 'uppercase' }}>Toutes les catégories</p>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {availableCategories.map(cat => (
                          <button 
                            key={cat} 
                            onClick={() => handlePurchaseSearch(cat)}
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 16, border: 'none', 
                              background: activeCategory === cat ? COLORS.accent + '20' : 'transparent',
                              color: activeCategory === cat ? COLORS.accent : 'white',
                              fontWeight: activeCategory === cat ? 800 : 500,
                              textAlign: 'left', cursor: 'pointer', transition: '0.2s', fontSize: 13
                            }}
                          >
                             <Bookmark size={14} opacity={activeCategory === cat ? 1 : 0.4} />
                             {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                     </div>
                  </div>

                  {/* Zone de résultats (Grille de Cards) */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: 48, background: 'rgba(255,255,255,0.01)' }}>
                     {isSearching ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                           <Loader2 size={48} color={COLORS.accent} className="animate-spin" />
                           <p style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>Consultation du stock Haddad...</p>
                        </div>
                     ) : searchResults.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: 100 }}>
                           <AlertTriangle size={64} color={COLORS.textMuted} style={{ marginBottom: 24, opacity: 0.3 }} />
                           <p style={{ color: COLORS.textMuted, fontSize: 18 }}>Aucun produit trouvé dans cette catégorie pour le moment.</p>
                           <button onClick={() => handlePurchaseSearch("bois")} style={{ marginTop: 20, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, color: 'white', padding: '12px 24px', borderRadius: 12, cursor: 'pointer' }}>Rafraîchir</button>
                        </div>
                     ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 32 }}>
                           {searchResults.map((res, i) => (
                             <div key={i} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 32, padding: 32, display: 'flex', flexDirection: 'column', gap: 20, transition: '0.3s', cursor: 'default' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                   <div style={{ background: COLORS.accent + '15', color: COLORS.accent, fontSize: 10, fontWeight: 900, padding: '6px 14px', borderRadius: 10, textTransform: 'uppercase' }}>HADDAD TN</div>
                                   <div style={{ color: COLORS.textMuted, fontSize: 10 }}>ID#{i+100}</div>
                                </div>
                                
                                <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800, lineHeight: '1.4', height: 50, overflow: 'hidden' }}>{res.title}</h3>
                                <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: '1.6', height: 80, overflow: 'hidden' }}>{res.snippet}</p>
                                
                                <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 20, marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                   <div style={{ color: COLORS.success, fontSize: 18, fontWeight: 900 }}>En Stock</div>
                                   <a 
                                     href={res.link} 
                                     target="_blank" 
                                     rel="noopener noreferrer" 
                                     style={{ background: 'white', color: 'black', textDecoration: 'none', padding: '12px 20px', borderRadius: 14, fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}
                                   >
                                      Commander <ExternalLink size={14} />
                                   </a>
                                </div>
                             </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>

               <div style={{ padding: '24px 48px', borderTop: `1px solid ${COLORS.border}`, background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: COLORS.textMuted, fontSize: 12 }}>© 2026 Smart Bee ERP — Partenaire technologique des apiculteurs tunisiens</p>
                  <a href="https://apiculture-haddad.com/" target="_blank" style={{ color: COLORS.accent, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Visiter le site officiel →</a>
               </div>
            </div>
         </div>
       )}
    </div>
  );
}
