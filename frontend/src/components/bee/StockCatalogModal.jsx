import {
  Package, AlertTriangle, ShoppingCart,
  Beaker, Sprout, ShieldAlert,
  Search, ExternalLink, X, Tag, RefreshCw,
  ChevronRight, Store, Star, TrendingUp, Zap, Grid3X3,
  Box, Layers, Award, ShoppingBag
} from 'lucide-react';
import { COLORS } from './BeeConstants';
import { SkeletonCard, ProductCard } from './StockProductCard.jsx';

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

export default function StockCatalogModal({
  isSearching, filteredResults,
  activeCategory, categoryLabel,
  allCategories, allCategoriesInfo,
  searchQuery, setSearchQuery,
  onFetchCategory, onClose,
}) {
  return (
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

      {/* ── Top bar ── */}
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

        <div style={{ color: COLORS.textMuted, fontSize: 13, whiteSpace: 'nowrap' }}>
          {isSearching ? 'Chargement...' : `${filteredResults.length} produit${filteredResults.length !== 1 ? 's' : ''}`}
        </div>

        <button
          onClick={onClose}
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

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
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
                  onClick={() => { setSearchQuery(''); onFetchCategory(catKey); }}
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

        {/* Products area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 32,
          background: 'rgba(255,255,255,0.01)',
        }}>
          {isSearching ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 24,
              animation: 'catalogIn 0.3s ease-out',
            }}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredResults.length === 0 ? (
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
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border}`,
                      color: 'white', padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 600,
                    }}
                  >Effacer la recherche</button>
                )}
                <button
                  onClick={() => onFetchCategory(activeCategory)}
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
            <div style={{ animation: 'catalogIn 0.35s ease-out' }}>
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
                  onClick={() => onFetchCategory(activeCategory)}
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

      {/* ── Footer ── */}
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
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.success }} />
          Données en temps réel · Apiculture Haddad, Grombalia
        </div>
      </div>
    </div>
  );
}
