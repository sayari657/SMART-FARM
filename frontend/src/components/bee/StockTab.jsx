import { useMemo, useState, useCallback } from 'react';
import {
  Package, ShoppingCart,
  Beaker, Sprout, ShieldAlert, Clock, Activity,
  Layers, ShoppingBag
} from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import StockCatalogModal from './StockCatalogModal.jsx';

const stockCategories = [
  { id: 'sirop',      label: 'Sirop Énergétique',  unit: 'L',      icon: Beaker,      color: COLORS.accent,  limit: 50, desc: 'Nourrissement de stimulation.' },
  { id: 'pate',       label: 'Pâte Protéinée',     unit: 'kg',     icon: Sprout,      color: COLORS.info,    limit: 20, desc: 'Soutien du couvain.' },
  { id: 'traitement', label: 'Traitements Bio',     unit: 'doses',  icon: ShieldAlert, color: COLORS.error,   limit: 10, desc: 'Lutte contre le Varroa.' },
  { id: 'cadres',     label: 'Cadres Neufs',        unit: 'unités', icon: Package,     color: COLORS.success, limit: 30, desc: 'Renouvellement des gaufres.' },
  { id: 'hausse',     label: 'Hausses Disponibles', unit: 'unités', icon: Layers,      color: '#8b5cf6',      limit: 10, desc: 'Hausses pour extension miel.' },
  { id: 'equipement', label: 'Équipement Apicole',  unit: 'pièces', icon: ShoppingBag, color: '#64748b',      limit: 5,  desc: 'Combinaisons, enfumoirs, outils.' },
];

export default function StockTab({ stock, visites = [], ruches = [], onUpdate }) {
  const [isSearching, setIsSearching]         = useState(false);
  const [searchResults, setSearchResults]     = useState([]);
  const [catalogOpen, setCatalogOpen]         = useState(false);
  const [activeCategory, setActiveCategory]   = useState('');
  const [categoryLabel, setCategoryLabel]     = useState('');
  const [allCategories, setAllCategories]     = useState([]);
  const [allCategoriesInfo, setAllCategoriesInfo] = useState({});
  const [searchQuery, setSearchQuery]         = useState('');

  const analytics = useMemo(() => {
    const stats = {
      sirop: {}, pate: {}, traitement: {}, cadres: {}, hausse: {}, equipement: {},
    };
    Object.keys(stats).forEach(k => { stats[k] = { total: 0, avg: 0, autonomy: 0 }; });
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

  const fetchCategory = useCallback(async (query) => {
    setIsSearching(true);
    setActiveCategory(query);
    setSearchResults([]);
    try {
      const res = await beeApi.searchCatalog(query);
      const data = await res.json();
      setSearchResults(data.results || []);
      setAllCategories(data.all_categories || []);
      setAllCategoriesInfo(data.all_categories_info || {});
      setActiveCategory(data.category || query);
      setCategoryLabel(data.category_label || query);
    } catch (err) {
      console.error('Catalog fetch error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const openCatalog = useCallback((query) => {
    setCatalogOpen(true);
    setSearchQuery('');
    fetchCategory(query);
  }, [fetchCategory]);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return searchResults;
    const q = searchQuery.toLowerCase();
    return searchResults.filter(r =>
      r.title?.toLowerCase().includes(q) ||
      r.snippet?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q)
    );
  }, [searchResults, searchQuery]);

  const handleClose = () => { setCatalogOpen(false); setSearchResults([]); setSearchQuery(''); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: COLORS.text, margin: 0 }}>Stock & Logistique</h1>
          <p style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 13 }}>Catalogue Apiculture Haddad intégré</p>
        </div>
        <button
          onClick={() => openCatalog('matériel apicole')}
          style={{
            background: COLORS.surface,
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`,
            padding: '10px 20px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <ShoppingCart size={16} /> Catalogue Haddad (Tunisie)
        </button>
      </div>

      {/* Stock grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {stockCategories.map(cat => {
          const qty  = stock[cat.id] ?? 0;
          const isLow = qty < cat.limit;
          const stat  = analytics[cat.id];
          return (
            <div
              key={cat.id}
              style={{
                background: COLORS.surface,
                borderRadius: 18,
                border: `1px solid ${isLow ? cat.color + '40' : COLORS.border}`,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
              }}
            >
              {/* Icon + name + alert */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${cat.color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <cat.icon size={22} color={cat.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <h3 style={{ color: COLORS.text, fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{cat.label}</h3>
                    {isLow && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, color: cat.color,
                        background: `${cat.color}12`, border: `1px solid ${cat.color}30`,
                        padding: '2px 7px', borderRadius: 6, letterSpacing: '0.4px',
                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}>Stock bas</span>
                    )}
                  </div>
                  <p style={{ color: COLORS.textMuted, fontSize: 12, margin: '3px 0 0', lineHeight: 1.4 }}>{cat.desc}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: COLORS.text, lineHeight: 1 }}>{qty}</span>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{cat.unit}</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex', gap: 0,
                background: COLORS.bg2,
                borderRadius: 10,
                overflow: 'hidden',
                border: `1px solid ${COLORS.border}`,
              }}>
                <div style={{ flex: 1, padding: '10px 14px', borderRight: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: COLORS.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    <Activity size={11} color={cat.color} /> Conso/Sem
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>{stat.avg}</span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>{cat.unit}</span>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: COLORS.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    <Clock size={11} color={COLORS.info} /> Autonomie
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: stat.autonomy < 7 ? COLORS.error : COLORS.text }}>{stat.autonomy}</span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>Jours</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => onUpdate(cat.id, -1)}
                    style={{ width: 36, height: 36, borderRadius: 9, background: COLORS.bg2, border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >−</button>
                  <button
                    onClick={() => onUpdate(cat.id, 1)}
                    style={{ width: 36, height: 36, borderRadius: 9, background: COLORS.bg2, border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >+</button>
                </div>
                <button
                  onClick={() => openCatalog(cat.id)}
                  style={{
                    flex: 1,
                    background: COLORS.surface,
                    color: cat.color,
                    border: `1px solid ${cat.color}30`,
                    padding: '8px 12px', borderRadius: 9,
                    fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <ShoppingCart size={13} /> Voir chez Haddad
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Catalog fullscreen modal */}
      {catalogOpen && (
        <StockCatalogModal
          isSearching={isSearching}
          filteredResults={filteredResults}
          activeCategory={activeCategory}
          categoryLabel={categoryLabel}
          allCategories={allCategories}
          allCategoriesInfo={allCategoriesInfo}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onFetchCategory={fetchCategory}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
