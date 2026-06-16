/**
 * Worker PWA — shared enterprise design system
 * --------------------------------------------------------------
 * Single source of truth for the worker (field-ops) mobile app.
 * Every worker page imports these tokens + primitives so the look
 * stays pixel-consistent and new screens are cheap to build.
 *
 * Hard rule baked in here: the worker app renders inside a 480px
 * phone frame (see WorkerLayout). Anything `position:fixed` MUST be
 * centred + clamped to that frame, or it spills "out of cadre" on
 * tablet/desktop. Use <FloatingCTA> — never raw left/right:0 fixed.
 */
import React from 'react';

/* ── Design tokens ─────────────────────────────────────────── */
export const WT = {
  // surfaces
  bg:        '#f8fafc',
  surface:   '#ffffff',
  border:    '#e2e8f0',
  // text
  ink:       '#0f172a',
  body:      '#475569',
  muted:     '#94a3b8',
  faint:     '#cbd5e1',
  // brand
  brand:     '#16a34a',
  brandDark: '#15803d',
  brandGrad: 'linear-gradient(135deg, #16a34a, #15803d)',
  // status
  blue:      '#2563eb',
  amber:     '#d97706',
  red:       '#ef4444',
  // radii / shadows
  r:    { sm: 10, md: 14, lg: 16, pill: 99 },
  sh:   { card: '0 1px 4px rgba(0,0,0,.06)', float: '0 10px 28px rgba(15,23,42,.18)' },
  // the phone frame width — keep in sync with WorkerLayout
  frame: 480,
  // bottom nav height (without safe-area) — keep in sync with WorkerLayout
  navH: 72,
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/* ── PageHeader — the unified sticky top of every worker screen ─ */
export function PageHeader({ title, subtitle, icon, gradient, onBack, right }) {
  const dark = !!gradient;
  return (
    <div
      style={{
        background: gradient || WT.surface,
        borderBottom: dark ? 'none' : `1px solid ${WT.border}`,
        padding: '14px 18px 14px',
        position: 'sticky', top: 0, zIndex: 20,
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Retour"
          style={{
            background: dark ? 'rgba(255,255,255,.18)' : WT.bg,
            border: dark ? 'none' : `1px solid ${WT.border}`,
            borderRadius: WT.r.sm, padding: '6px 10px', marginBottom: 12,
            cursor: 'pointer', color: dark ? '#fff' : WT.body,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 700, minHeight: 36,
          }}
        >
          ← Retour
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: dark ? 'rgba(255,255,255,.2)' : `${WT.brand}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{
            margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px',
            color: dark ? '#fff' : WT.ink,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              margin: '2px 0 0', fontSize: 12,
              color: dark ? 'rgba(255,255,255,.8)' : WT.muted,
            }}>
              {subtitle}
            </p>
          )}
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
    </div>
  );
}

/* ── SectionLabel — the small uppercase group caption ──────────── */
export function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '.06em', color: WT.muted, marginBottom: 10, ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Card — the standard white container ───────────────────────── */
export function Card({ children, style, onClick, ...rest }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: WT.surface, border: `1px solid ${WT.border}`,
        borderRadius: WT.r.md, padding: 14,
        cursor: onClick ? 'pointer' : 'default', ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ── Skeleton — shimmer placeholder for loading states ─────────── */
export function Skeleton({ height = 16, width = '100%', radius = 8, style }) {
  return (
    <div
      style={{
        height, width, borderRadius: radius,
        background: 'linear-gradient(90deg,#eef2f7 25%,#e2e8f0 37%,#eef2f7 63%)',
        backgroundSize: '400% 100%',
        animation: 'wkShimmer 1.3s ease infinite',
        ...style,
      }}
    />
  );
}

/* ── EmptyState — friendly zero-data block ─────────────────────── */
export function EmptyState({ emoji = '📭', title, desc, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 52, marginBottom: 14, lineHeight: 1 }}>{emoji}</div>
      <h2 style={{ color: WT.ink, fontWeight: 800, fontSize: 18, margin: '0 0 6px' }}>{title}</h2>
      {desc && <p style={{ color: WT.muted, fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{desc}</p>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

/* ── Segmented — iOS-style filter control ──────────────────────── */
export function Segmented({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4,
      background: WT.surface, border: `1px solid ${WT.border}`,
      borderRadius: WT.r.sm,
    }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            style={{
              flex: 1, minHeight: 36, border: 'none', borderRadius: 7,
              background: active ? WT.brand : 'transparent',
              color: active ? '#fff' : WT.body,
              fontWeight: active ? 700 : 600, fontSize: 13, cursor: 'pointer',
              transition: 'all .18s', boxShadow: active ? `0 2px 8px ${WT.brand}40` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            {opt.label}
            {opt.count != null && (
              <span style={{
                fontSize: 11, fontWeight: 800, borderRadius: WT.r.pill, padding: '0 6px',
                background: active ? 'rgba(255,255,255,.25)' : WT.bg,
                color: active ? '#fff' : WT.muted, minWidth: 18, lineHeight: '18px',
              }}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── ProgressRing — circular completion indicator ──────────────── */
export function ProgressRing({ value = 0, max = 0, size = 56, stroke = 6, color = WT.brand }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={WT.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, color: WT.ink, lineHeight: 1,
      }}>
        {Math.round(pct * 100)}<span style={{ fontSize: 8, color: WT.muted }}>%</span>
      </div>
    </div>
  );
}

/* ── FloatingCTA — sticky bottom action, CLAMPED to the frame ───
   This is the fix for the "out of cadre" bug: instead of
   left/right:0 against the viewport, we centre at 50% and clamp to
   the 480px frame, sitting just above the bottom nav.            */
export function FloatingCTA({ children, onClick, color = WT.amber, icon, sub }) {
  return (
    <div style={{
      position: 'fixed',
      left: '50%', transform: 'translateX(-50%)',
      bottom: `calc(${WT.navH}px + env(safe-area-inset-bottom) + 14px)`,
      width: '100%', maxWidth: WT.frame,
      padding: '0 16px', boxSizing: 'border-box',
      zIndex: 45, pointerEvents: 'none',
    }}>
      <button
        onClick={onClick}
        style={{
          pointerEvents: 'auto',
          width: '100%', minHeight: 54, padding: '12px 18px',
          background: color, border: 'none', borderRadius: WT.r.md,
          color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: WT.sh.float, touchAction: 'manipulation', fontFamily: FONT,
        }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {icon}
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
          {children}
          {sub && <span style={{ fontSize: 11, fontWeight: 500, opacity: .85 }}>{sub}</span>}
        </span>
      </button>
    </div>
  );
}

/* ── Page shell — consistent background + bottom spacing ───────── */
export function WorkerPage({ children, style }) {
  return (
    <div style={{ background: WT.bg, minHeight: '100%', ...style }}>
      {children}
    </div>
  );
}

/* ── Shared keyframes (mount once per page) ────────────────────── */
export function WorkerStyles() {
  return (
    <style>{`
      @keyframes wkShimmer { 0% { background-position: 100% 0 } 100% { background-position: -100% 0 } }
      @keyframes wkSpin { to { transform: rotate(360deg) } }
      @keyframes wkRise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
    `}</style>
  );
}
