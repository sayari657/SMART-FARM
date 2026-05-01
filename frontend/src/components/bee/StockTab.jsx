import { useMemo, useState, useCallback } from 'react';
import {
  Package, AlertTriangle, ShoppingCart,
  Beaker, Sprout, ShieldAlert, Clock, Activity,
  Search, ExternalLink, X, Tag, RefreshCw,
  ChevronRight, Store, Star, TrendingUp, Zap, Grid3X3,
  Box, Layers, Award, ShoppingBag
} from 'lucide-react';
import { COLORS } from './BeeConstants';

// Icônes par catégorie
const CATEGORY_ICONS = {
  "bois": Box,
  "tenues de travail": ShoppingBag,
  "cire d'abeille": Star,
  "nourisseurs et nourissement": Beaker,
  "enfumoirs": Zap,
  "lève cadres, brosses et herses": Layers,
  "extracteurs, maturateurs et tamis": TrendingUp,
  "matériel d'élevage": Award,
  "grilles à reine, grilles à propolis et trappes à pollen": Grid3X3,
  "fil de fer, portières et robinets": Package,
  "anti-varroa et charmes d'abeilles": ShieldAlert,
  "produits divers": Store,
  "produits de la ruche et emballages": Box,
  "matériel en promo": Tag,
};

// Placeholder SVG pour produits sans image
const BeeProductPlaceholder = ({ color = COLORS.accent }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="120" height="120" fill={color + '08'} />
    {/* Honeycomb pattern */}
    {[0,1,2,3,4,5].map(i => (
      <polygon
        key={i}
        points="60,20 80,30 80,50 60,60 40,50 40,30"
        fill="none"
        stroke={color + '25'}
        strokeWidth="1.5"
        transform={`translate(${(i % 3) * 30 - 30}, ${Math.floor(i / 3) * 35 + 15})`}
      />
    ))}
    <circle cx="60" cy="55" r="22" fill={color + '15'} />
    <text x="60" y="62" textAnchor="middle" fontSize="22" fill={color + '60'}>🍯</text>
  </svg>
);

// Carte squelette pendant le chargement
const SkeletonCard = () => (
  <div style={{
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 24,
    overflow: 'hidden',
    animation: 'pulse 1.8s ease-in-out infinite',
  }}>
    <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.45 } }`}</style>
    <div style={{ height: 160, background: 'rgba(255,255,255,0.04)' }} />
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: '80%' }} />
      <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.04)', width: '60%' }} />
      <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.03)', width: '90%' }} />
      <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.03)', width: '70%' }} />
      <div style={{ height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.05)', marginTop: 8 }} />
    </div>
  </div>
);

// Carte produit
const ProductCard = ({ result }) => {
  const [imgError, setImgError] = useState(false);
  const hasImage = result.image && !imgError;
  const hasPrice = result.price && result.price !== 'Prix sur demande' && result.price !== 'Voir prix';

  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 24,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = COLORS.accent + '50';
        e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.4)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = COLORS.border;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Image */}
      <div style={{
        height: 160,
        background: `linear-gradient(135deg, ${COLORS.accent}10, rgba(255,255,255,0.02))`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {hasImage ? (
          <img
            src={result.image}
            alt={result.title}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: 80, height: 80 }}>
            <BeeProductPlaceholder />
          </div>
        )}

        {/* Badges */}
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <span style={{
            background: COLORS.accent,
            color: 'white',
            fontSize: 9,
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 20,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}>HADDAD TN</span>
        </div>

        {hasPrice && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            color: COLORS.success || '#22c55e',
            fontSize: 13,
            fontWeight: 900,
            padding: '6px 14px',
            borderRadius: 20,
            border: `1px solid rgba(34,197,94,0.3)`,
          }}>{result.price}</div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ padding: '20px 20px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Catégorie */}
        {result.category && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: COLORS.accent,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            <Tag size={10} />
            {result.category}
          </div>
        )}

        {/* Titre */}
        <h3 style={{
          color: 'white',
          fontSize: 15,
          fontWeight: 700,
          lineHeight: '1.45',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          margin: 0,
        }}>{result.title}</h3>

        {/* Snippet */}
        {result.snippet && (
          <p style={{
            color: COLORS.textMuted,
            fontSize: 12,
            lineHeight: '1.6',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: 0,
          }}>{result.snippet}</p>
        )}

        {/* Prix si pas dans l'image */}
        {!hasPrice && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: COLORS.textMuted,
            fontSize: 12,
            fontStyle: 'italic',
          }}>
            <ShoppingCart size={12} /> Prix disponible sur le site
          </div>
        )}
      </div>

      {/* Bouton */}
      <div style={{ padding: 20, marginTop: 'auto' }}>
        <a
          href={result.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '12px 0',
            borderRadius: 14,
            background: `linear-gradient(135deg, ${COLORS.accent}, #b45309)`,
            color: 'white',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 800,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Commander <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

export default function StockTab({ stock, visites = [], ruches = [], onUpdate }) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [allCategoriesInfo, setAllCategoriesInfo] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Analyse prédictive du stock
  const analytics = useMemo(() => {
    const stats = {
      sirop: { total: 0, avg: 0, autonomy: 0 },
      pate: { total: 0, avg: 0, autonomy: 0 },
      traitement: { total: 0, avg: 0, autonomy: 0 },
      cadres: { total: 0, avg: 0, autonomy: 0 },
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

  const fetchCategory = useCallback(async (query) => {
    setIsSearching(true);
    setActiveCategory(query);
    setSearchResults([]);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/bee/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setAllCategories(data.all_categories || []);
      setAllCategoriesInfo(data.all_categories_info || {});
      setActiveCategory(data.category || query);
      setCategoryLabel(data.category_label || query);
    } catch (err) {
      console.error("Catalog fetch error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const openCatalog = useCallback((query) => {
    setCatalogOpen(true);
    setSearchQuery("");
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

  const stockCategories = [
    { id: 'sirop', label: 'Sirop Énergétique', unit: 'L', icon: Beaker, color: COLORS.accent, limit: 50, desc: 'Nourrissement de stimulation.' },
    { id: 'pate', label: 'Pâte Protéinée', unit: 'kg', icon: Sprout, color: COLORS.info, limit: 20, desc: 'Soutien du couvain.' },
    { id: 'traitement', label: 'Traitements Bio', unit: 'doses', icon: ShieldAlert, color: COLORS.error, limit: 10, desc: 'Lutte contre le Varroa.' },
    { id: 'cadres', label: 'Cadres Neufs', unit: 'unités', icon: Package, color: COLORS.success, limit: 30, desc: 'Renouvellement des gaufres.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white', margin: 0 }}>Stock & Logistique</h1>
          <p style={{ color: COLORS.textMuted, marginTop: 6, fontSize: 14 }}>Catalogue Apiculture Haddad intégré</p>
        </div>
        <button
          onClick={() => openCatalog("matériel apicole")}
          style={{
            background: 'white',
            color: '#0f172a',
            border: 'none',
            padding: '14px 28px',
            borderRadius: 16,
            fontWeight: 800,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <ShoppingCart size={18} /> Catalogue Haddad (Tunisie)
        </button>
      </div>

      {/* Grille stock */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
        {stockCategories.map(cat => {
          const isLow = stock[cat.id] < cat.limit;
          const stat = analytics[cat.id];
          return (
            <div
              key={cat.id}
              style={{
                background: COLORS.surface,
                borderRadius: 28,
                border: `1px solid ${isLow ? cat.color + '60' : COLORS.border}`,
                padding: 32,
                position: 'relative',
              }}
            >
              {isLow && (
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  background: cat.color, color: 'white',
                  padding: '4px 16px', fontSize: 10, fontWeight: 900,
                  borderRadius: '0 0 0 16px',
                }}>ALERTE STOCK BAS</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 18,
                    background: `${cat.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <cat.icon size={28} color={cat.color} />
                  </div>
                  <div>
                    <h3 style={{ color: 'white', fontSize: 18, fontWeight: 800, margin: 0 }}>{cat.label}</h3>
                    <p style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>{cat.desc}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>{stock[cat.id]}</span>
                  <span style={{ fontSize: 16, color: COLORS.textMuted, marginLeft: 6 }}>{cat.unit}</span>
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 18, padding: 20, marginBottom: 24,
                border: `1px solid ${COLORS.border}`,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                    <Activity size={13} color={cat.color} /> Conso/Sem
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>{stat.avg}</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>{cat.unit}</span>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                    <Clock size={13} color={COLORS.info} /> Autonomie
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: stat.autonomy < 7 ? COLORS.error : 'white' }}>{stat.autonomy}</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>Jours</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onUpdate(cat.id, -1)}
                    style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}
                  >−</button>
                  <button
                    onClick={() => onUpdate(cat.id, 1)}
                    style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, color: 'white', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}
                  >+</button>
                </div>
                <button
                  onClick={() => openCatalog(cat.id)}
                  style={{
                    background: cat.color + '20',
                    color: cat.color,
                    border: `1px solid ${cat.color}30`,
                    padding: '10px 20px', borderRadius: 12,
                    fontSize: 12, fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <ShoppingCart size={14} /> Voir chez Haddad
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== CATALOGUE PLEIN ÉCRAN ===== */}
      {catalogOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(24px)',
          zIndex: 3000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <style>{`
            @keyframes catalogIn {
              from { opacity: 0; transform: translateY(24px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* ── Barre supérieure ── */}
          <div style={{
            height: 72,
            background: 'rgba(15,23,42,0.98)',
            borderBottom: `1px solid ${COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
            gap: 24,
            flexShrink: 0,
          }}>
            {/* Logo + titre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: COLORS.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Store size={22} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 900, fontSize: 15, letterSpacing: 0.2 }}>APICULTURE HADDAD</div>
                <div style={{ color: COLORS.accent, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {categoryLabel || activeCategory}
                </div>
              </div>
            </div>

            {/* Barre de recherche */}
            <div style={{ flex: 1, position: 'relative', maxWidth: 520 }}>
              <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filtrer les produits..."
                style={{
                  width: '100%',
                  height: 44,
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  paddingLeft: 44,
                  paddingRight: 16,
                  color: 'white',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Nombre de résultats */}
            <div style={{ color: COLORS.textMuted, fontSize: 13, whiteSpace: 'nowrap' }}>
              {isSearching ? 'Chargement...' : `${filteredResults.length} produit${filteredResults.length !== 1 ? 's' : ''}`}
            </div>

            {/* Bouton fermer */}
            <button
              onClick={() => { setCatalogOpen(false); setSearchResults([]); setSearchQuery(""); }}
              style={{
                marginLeft: 'auto',
                width: 44, height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${COLORS.border}`,
                color: 'white',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* ── Corps principal ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Sidebar catégories */}
            <div style={{
              width: 280,
              borderRight: `1px solid ${COLORS.border}`,
              overflowY: 'auto',
              padding: '24px 16px',
              background: 'rgba(15,23,42,0.6)',
              flexShrink: 0,
            }}>
              <p style={{
                color: COLORS.textMuted,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 16,
                paddingLeft: 12,
              }}>Catégories</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {allCategories.map(catKey => {
                  const isActive = activeCategory === catKey;
                  const CatIcon = CATEGORY_ICONS[catKey] || Package;
                  const label = allCategoriesInfo[catKey] || catKey;
                  return (
                    <button
                      key={catKey}
                      onClick={() => { setSearchQuery(""); fetchCategory(catKey); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 14px',
                        borderRadius: 14,
                        border: 'none',
                        background: isActive ? `${COLORS.accent}20` : 'transparent',
                        color: isActive ? COLORS.accent : COLORS.textMuted,
                        fontWeight: isActive ? 700 : 400,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 13,
                        transition: 'background 0.15s, color 0.15s',
                        width: '100%',
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 9,
                        background: isActive ? `${COLORS.accent}25` : 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <CatIcon size={15} color={isActive ? COLORS.accent : COLORS.textMuted} />
                      </div>
                      <span style={{ flex: 1, lineHeight: '1.35' }}>{label}</span>
                      {isActive && <ChevronRight size={14} />}
                    </button>
                  );
                })}
              </div>

              {/* Lien site officiel */}
              <div style={{ marginTop: 32, padding: '0 4px' }}>
                <a
                  href="https://apiculture-haddad.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    color: COLORS.accent, fontSize: 12, fontWeight: 700,
                    textDecoration: 'none', padding: '10px 12px',
                    borderRadius: 12,
                    border: `1px solid ${COLORS.accent}30`,
                    background: `${COLORS.accent}08`,
                  }}
                >
                  <ExternalLink size={13} /> Visiter le site officiel
                </a>
              </div>
            </div>

            {/* Zone produits */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: 32,
              background: 'rgba(255,255,255,0.01)',
            }}>

              {isSearching ? (
                /* Squelettes de chargement */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 24,
                  animation: 'catalogIn 0.3s ease-out',
                }}>
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filteredResults.length === 0 ? (
                /* État vide */
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 20,
                  animation: 'catalogIn 0.3s ease-out',
                }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: 24,
                    background: 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AlertTriangle size={36} color={COLORS.textMuted} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: 0 }}>
                      {searchQuery ? 'Aucun produit correspond à votre recherche' : 'Aucun produit trouvé dans cette catégorie'}
                    </p>
                    <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 8 }}>
                      Le site Haddad peut être temporairement inaccessible.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        style={{
                          background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`,
                          color: 'white', padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 600,
                        }}
                      >Effacer la recherche</button>
                    )}
                    <button
                      onClick={() => fetchCategory(activeCategory)}
                      style={{
                        background: COLORS.accent, border: 'none',
                        color: 'white', padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <RefreshCw size={14} /> Réessayer
                    </button>
                  </div>
                </div>
              ) : (
                /* Grille produits */
                <div style={{ animation: 'catalogIn 0.35s ease-out' }}>
                  {/* En-tête de section */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 28,
                  }}>
                    <div>
                      <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>
                        {categoryLabel || activeCategory}
                      </h2>
                      <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>
                        {filteredResults.length} produit{filteredResults.length !== 1 ? 's' : ''} disponible{filteredResults.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => fetchCategory(activeCategory)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'transparent',
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.textMuted,
                        padding: '8px 16px', borderRadius: 10,
                        fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      <RefreshCw size={13} /> Actualiser
                    </button>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 24,
                  }}>
                    {filteredResults.map((res, i) => (
                      <ProductCard key={i} result={res} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Pied de page ── */}
          <div style={{
            height: 52,
            background: 'rgba(15,23,42,0.98)',
            borderTop: `1px solid ${COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            flexShrink: 0,
          }}>
            <p style={{ color: COLORS.textMuted, fontSize: 11, margin: 0 }}>
              © 2026 Smart Bee ERP — Partenaire technologique des apiculteurs tunisiens
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textMuted, fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.success || '#22c55e' }} />
              Données en temps réel · Apiculture Haddad, Grombalia
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
