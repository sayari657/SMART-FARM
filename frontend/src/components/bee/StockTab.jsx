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

const DEFAULT_THRESHOLDS = { sirop: 20, pate: 8, traitement: 5, cadres: 10, hausse: 3, equipement: 2 };

export default function StockTab({ stock, visites = [], ruches = [], onUpdate }) {
  const [isSearching, setIsSearching]         = useState(false);
  const [searchResults, setSearchResults]     = useState([]);
  const [catalogOpen, setCatalogOpen]         = useState(false);
  const [activeCategory, setActiveCategory]   = useState('');
  const [categoryLabel, setCategoryLabel]     = useState('');
  const [allCategories, setAllCategories]     = useState([]);
  const [allCategoriesInfo, setAllCategoriesInfo] = useState({});
  const [searchQuery, setSearchQuery]         = useState('');
  const [thresholds, setThresholds] = useState(() => {
    try { return { ...DEFAULT_THRESHOLDS, ...JSON.parse(localStorage.getItem('bee_stock_thresholds') || '{}') }; }
    catch { return DEFAULT_THRESHOLDS; }
  });
  const [editingThreshold, setEditingThreshold] = useState(null);

  const saveThreshold = (id, val) => {
    const next = { ...thresholds, [id]: Math.max(0, Number(val) || 0) };
    setThresholds(next);
    localStorage.setItem('bee_stock_thresholds', JSON.stringify(next));
    setEditingThreshold(null);
  };

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

      {/* Low-stock global alert banner */}
      {stockCategories.some(c => (stock[c.id] ?? 0) === 0) && (
        <div style={{ padding: '14px 20px', borderRadius: 16, background: `${COLORS.error}10`,
          border: `2px solid ${COLORS.error}40`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 900, color: COLORS.error, fontSize: 14 }}>Rupture de stock critique !</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
              {stockCategories.filter(c => (stock[c.id] ?? 0) === 0).map(c => c.label).join(' · ')} — Réapprovisionnement urgent
            </div>
          </div>
        </div>
      )}

      {/* Stock grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
        {stockCategories.map(cat => {
          const qty       = stock[cat.id] ?? 0;
          const threshold = thresholds[cat.id] ?? cat.limit;
          const isCritical = qty === 0;
          const isLow      = qty < threshold && qty > 0;
          const stat       = analytics[cat.id];
          const pct        = threshold > 0 ? Math.min(1, qty / (threshold * 2)) : 1;
          const barColor   = isCritical ? COLORS.error : isLow ? COLORS.warning : COLORS.success;

          return (
            <div key={cat.id} style={{
              background: COLORS.surface, borderRadius: 18,
              border: `2px solid ${isCritical ? COLORS.error + '60' : isLow ? cat.color + '40' : COLORS.border}`,
              padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14,
              boxShadow: isCritical ? `0 4px 20px ${COLORS.error}15` : isLow ? `0 2px 12px ${cat.color}10` : 'none',
              animation: isCritical ? 'stockPulse 2s ease-in-out infinite' : 'none',
            }}>
              <style>{`@keyframes stockPulse{0%,100%{border-color:${COLORS.error}60}50%{border-color:${COLORS.error}CC}}`}</style>

              {/* Icon + name + badges */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${cat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <cat.icon size={22} color={cat.color}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <h3 style={{ color: COLORS.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{cat.label}</h3>
                    {isCritical && <span style={{ fontSize: 9, fontWeight: 900, color: '#fff',
                      background: COLORS.error, padding: '2px 8px', borderRadius: 6, letterSpacing: .5 }}>🚨 RUPTURE</span>}
                    {isLow && <span style={{ fontSize: 9, fontWeight: 800, color: cat.color,
                      background: `${cat.color}15`, border: `1px solid ${cat.color}35`,
                      padding: '2px 7px', borderRadius: 6 }}>⚠ STOCK BAS</span>}
                  </div>
                  <p style={{ color: COLORS.textMuted, fontSize: 12, margin: '3px 0 0', lineHeight: 1.4 }}>{cat.desc}</p>
                </div>
                {/* Quantity */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: 28, fontWeight: 900,
                    color: isCritical ? COLORS.error : isLow ? COLORS.warning : COLORS.text,
                    lineHeight: 1 }}>{qty}</span>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{cat.unit}</div>
                </div>
              </div>

              {/* Level bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: COLORS.textMuted, marginBottom: 5 }}>
                  <span>Niveau stock</span>
                  <span style={{ color: barColor, fontWeight: 700 }}>Seuil: {threshold} {cat.unit}</span>
                </div>
                <div style={{ height: 7, background: COLORS.bg2, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct * 100}%`, background: barColor,
                    borderRadius: 4, transition: 'width .5s ease, background .3s' }}/>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 0, background: COLORS.bg2,
                borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
                <div style={{ flex: 1, padding: '10px 14px', borderRight: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>
                    Conso/Sem
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: COLORS.text }}>{stat.avg}</span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>{cat.unit}</span>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '10px 14px' }}>
                  <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>
                    Autonomie
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 800,
                      color: stat.autonomy < 7 ? COLORS.error : stat.autonomy < 14 ? COLORS.warning : COLORS.text }}>
                      {stat.autonomy}
                    </span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>Jours</span>
                  </div>
                </div>
              </div>

              {/* Quick buttons +10 / -10 / +1 / -1 */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { delta: -10, label: '−10', danger: true },
                  { delta: -1,  label: '−1',  danger: false },
                  { delta: +1,  label: '+1',  danger: false },
                  { delta: +10, label: '+10', danger: false },
                ].map(btn => (
                  <button key={btn.delta}
                    onClick={() => onUpdate(cat.id, btn.delta)}
                    style={{ flex: 1, height: 38, borderRadius: 9, cursor: 'pointer',
                      background: btn.delta > 0 ? `${COLORS.success}12` : COLORS.bg2,
                      border: `1px solid ${btn.delta > 0 ? COLORS.success + '40' : COLORS.border}`,
                      color: btn.delta > 0 ? COLORS.success : btn.danger ? COLORS.error : COLORS.text,
                      fontWeight: 800, fontSize: 13, transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >{btn.label}</button>
                ))}
              </div>

              {/* Threshold config + catalog */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingThreshold === cat.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700 }}>Seuil :</span>
                    <input type="number" min="0" defaultValue={threshold}
                      autoFocus
                      onBlur={e => saveThreshold(cat.id, e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveThreshold(cat.id, e.target.value)}
                      style={{ width: 60, height: 32, background: COLORS.bg2,
                        border: `1px solid ${COLORS.accent}`, borderRadius: 8,
                        padding: '0 8px', color: COLORS.text, fontSize: 13, fontWeight: 700, outline: 'none' }}/>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>{cat.unit}</span>
                  </div>
                ) : (
                  <button onClick={() => setEditingThreshold(cat.id)}
                    style={{ fontSize: 11, color: COLORS.textMuted, background: 'none', border: 'none',
                      cursor: 'pointer', padding: '0 4px', fontWeight: 600, flex: 1, textAlign: 'left' }}>
                    ⚙ Seuil: {threshold} {cat.unit}
                  </button>
                )}
                <button onClick={() => openCatalog(cat.id)}
                  style={{ padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
                    background: COLORS.surface, color: cat.color,
                    border: `1px solid ${cat.color}30`, fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShoppingCart size={13}/> Haddad
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
