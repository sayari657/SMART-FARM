import React, { useState } from 'react';
import AIScanner from '../../components/AIScanner';
import ExpertAssistant from '../../components/expert/ExpertAssistant';

// All models available in the backend MODEL_REGISTRY (cv_routes.py)
const GROUPS = [
  {
    label: 'Maladies Végétales',
    emoji: '🌱',
    items: [
      { id: 'orange',  icon: '🍊', label: 'Maladies Oranger',     color: '#f97316' },
      { id: 'lemon',   icon: '🍋', label: 'Maladies Citronnier',  color: '#eab308' },
      { id: 'leaves',  icon: '🌿', label: 'Maladies des Feuilles',color: '#16a34a' },
      { id: 'insects', icon: '🐛', label: 'Insectes & Ravageurs', color: '#ca8a04' },
      { id: 'olive',   icon: '🫒', label: 'Maladies de l\'Olivier',color: '#65a30d' },
    ],
  },
  {
    label: 'Élevage & Apiculture',
    emoji: '🐾',
    items: [
      { id: 'bee',      icon: '🐝', label: 'Hive Entrance',  color: '#f59e0b' },
      { id: 'livestock',icon: '🐄', label: 'Bétail',         color: '#3b82f6' },
      { id: 'sheep',    icon: '🐑', label: 'Mouton',         color: '#059669' },
      { id: 'goat',     icon: '🐐', label: 'Chèvre',         color: '#dc2626' },
    ],
  },
  {
    label: 'Sécurité',
    emoji: '🚨',
    items: [
      { id: 'fire', icon: '🔥', label: 'Détection Feu', color: '#ef4444' },
    ],
  },
];

const ALL_CATS = GROUPS.flatMap(g => g.items);

export default function WorkerScan() {
  const [activeId, setActiveId] = useState('orange');
  const cat = ALL_CATS.find(c => c.id === activeId) || ALL_CATS[0];

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', paddingBottom: 20 }}>

      {/* ── Page header ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 18px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${cat.color}18`,
            border: `1.5px solid ${cat.color}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, transition: 'all .2s',
          }}>
            {cat.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', lineHeight: 1.2 }}>
              {cat.label}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
              Vision IA · Détection YOLO · {ALL_CATS.length} modèles disponibles
            </div>
          </div>
        </div>
      </div>

      {/* ── Model selector by group ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
        {GROUPS.map(group => (
          <div key={group.label} style={{ padding: '10px 16px 6px' }}>
            {/* Group label */}
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.06em', color: '#94a3b8',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span>{group.emoji}</span>
              {group.label}
            </div>

            {/* Horizontal scroll row */}
            <div style={{
              display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4,
              scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
            }}>
              {group.items.map(c => {
                const active = activeId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    style={{
                      flex: '0 0 auto',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '8px 10px',
                      borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${active ? c.color : '#e2e8f0'}`,
                      background: active ? `${c.color}12` : '#f8fafc',
                      minWidth: 72, maxWidth: 96,
                      transition: 'all .18s',
                      boxShadow: active ? `0 2px 8px ${c.color}30` : 'none',
                    }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{c.icon}</span>
                    <span style={{
                      fontSize: 10, fontWeight: active ? 700 : 500, lineHeight: 1.2,
                      color: active ? c.color : '#64748b',
                      textAlign: 'center', wordBreak: 'break-word',
                    }}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Active model badge ── */}
      <div style={{ padding: '10px 16px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 99,
          background: `${cat.color}15`,
          border: `1px solid ${cat.color}30`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: cat.color }}>{cat.label}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>— Modèle actif</span>
        </div>
      </div>

      {/* ── AIScanner (light theme — no dark overrides needed) ── */}
      <div style={{ padding: '0 12px 12px' }}>
        <AIScanner
          key={activeId}
          category={activeId}
          title={`${cat.icon} ${cat.label}`}
          color={cat.color}
        />
      </div>

      {/* Expert assistant FAB */}
      <ExpertAssistant species={activeId} color={cat.color} />
    </div>
  );
}
