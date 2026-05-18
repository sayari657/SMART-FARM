import { useState } from 'react';
import { Tag, ShoppingCart, ExternalLink } from 'lucide-react';
import { COLORS } from './BeeConstants';

export const BeeProductPlaceholder = ({ color = COLORS.accent }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect width="120" height="120" fill={color + '08'} />
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

export const SkeletonCard = () => (
  <div style={{
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 24,
    overflow: 'hidden',
    animation: 'pulse 1.8s ease-in-out infinite',
  }}>
    <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.45 } }`}</style>
    <div style={{ height: 160, background: 'rgba(0,0,0,0.06)' }} />
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ height: 12, borderRadius: 6, background: 'rgba(0,0,0,0.08)', width: '80%' }} />
      <div style={{ height: 12, borderRadius: 6, background: 'rgba(0,0,0,0.06)', width: '60%' }} />
      <div style={{ height: 10, borderRadius: 6, background: 'rgba(0,0,0,0.05)', width: '90%' }} />
      <div style={{ height: 10, borderRadius: 6, background: 'rgba(0,0,0,0.05)', width: '70%' }} />
      <div style={{ height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.07)', marginTop: 8 }} />
    </div>
  </div>
);

export const ProductCard = ({ result }) => {
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
            color: COLORS.success,
            fontSize: 13,
            fontWeight: 900,
            padding: '6px 14px',
            borderRadius: 20,
            border: `1px solid ${COLORS.success}30`,
          }}>{result.price}</div>
        )}
      </div>

      <div style={{ padding: '20px 20px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
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

        <h3 style={{
          color: COLORS.text,
          fontSize: 15,
          fontWeight: 700,
          lineHeight: '1.45',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          margin: 0,
        }}>{result.title}</h3>

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
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
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
