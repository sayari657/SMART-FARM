import React, { useState } from 'react';
import AIScanner from '../../components/AIScanner';
import ExpertAssistant from '../../components/expert/ExpertAssistant';

const CATEGORIES = [
  { id: 'bee',       icon: '🐝', label: 'Ruche',    color: '#f59e0b' },
  { id: 'livestock', icon: '🐄', label: 'Bétail',   color: '#3b82f6' },
  { id: 'leaves',    icon: '🌿', label: 'Plante',   color: '#22c55e' },
  { id: 'fire',      icon: '🔥', label: 'Urgence',  color: '#ef4444' },
  { id: 'sheep',     icon: '🐑', label: 'Mouton',   color: '#059669' },
  { id: 'poultry',   icon: '🐓', label: 'Volaille', color: '#0891b2' },
  { id: 'goat',      icon: '🐐', label: 'Chèvre',   color: '#dc2626' },
  { id: 'rabbit',    icon: '🐰', label: 'Lapin',    color: '#16a34a' },
  { id: 'olive',     icon: '🫒', label: 'Olivier',  color: '#65a30d' },
  { id: 'insects',   icon: '🐛', label: 'Nuisible', color: '#ca8a04' },
];

// Override CSS variables so AIScanner (built for light theme) renders on the dark worker bg
const DARK_VARS = {
  '--glass-bg':          'rgba(255,255,255,0.04)',
  '--glass-border':      'rgba(255,255,255,0.09)',
  '--glass-shadow':      '0 4px 20px rgba(0,0,0,0.35)',
  '--color-bg':          '#1e293b',
  '--color-bg2':         '#111827',
  '--color-surface':     '#1e293b',
  '--color-surface-2':   '#1a2439',
  '--color-border':      'rgba(255,255,255,0.08)',
  '--color-border-light':'rgba(255,255,255,0.05)',
  '--color-text':        '#f1f5f9',
  '--color-text-2':      '#cbd5e1',
  '--color-text-3':      '#64748b',
  '--radius-lg':         '16px',
};

export default function WorkerScan() {
  const [activeId, setActiveId] = useState('bee');
  const cat = CATEGORIES.find(c => c.id === activeId);

  return (
    <div style={{ paddingBottom: 20 }}>

      {/* ── Header ── */}
      <div style={{
        padding: '18px 20px 14px',
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: '0 0 3px' }}>
          Vision IA
        </h1>
        <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
          Détection YOLO · Analyse Darija · Historique sauvegardé par catégorie
        </p>
      </div>

      {/* ── Category tabs (horizontal scroll) ── */}
      <div style={{
        overflowX: 'auto', overflowY: 'hidden',
        display: 'flex', gap: 8,
        padding: '12px 16px',
        scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map(c => {
          const active = activeId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              style={{
                flex: '0 0 auto',
                padding: '7px 14px',
                borderRadius: 20,
                border: `1.5px solid ${active ? c.color : 'rgba(255,255,255,0.09)'}`,
                background: active ? `${c.color}1a` : 'rgba(255,255,255,0.03)',
                color: active ? c.color : '#64748b',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                transition: 'all 0.18s',
              }}
            >
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ── AIScanner wrapped in dark-theme variable overrides ── */}
      <div style={{ padding: '0 12px 12px', ...DARK_VARS }}>
        <AIScanner
          key={activeId}
          category={activeId}
          title={`${cat.icon} ${cat.label} — Vision IA`}
          color={cat.color}
        />
      </div>

      {/* Expert assistant FAB — follows active category */}
      <ExpertAssistant species={activeId} color={cat.color} />
    </div>
  );
}
