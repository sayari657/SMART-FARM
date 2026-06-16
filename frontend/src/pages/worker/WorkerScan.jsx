import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AIScanner from '../../components/AIScanner';
import ExpertAssistant from '../../components/expert/ExpertAssistant';

export default function WorkerScan() {
  const { t } = useTranslation();

  // Full YOLO registry — mirrors backend cv_routes MODEL_REGISTRY / CVModelsDashboard.
  const GROUPS = [
    {
      label: t('worker.scan.group_plant'),
      emoji: '🌱',
      items: [
        { id: 'orange',   icon: '🍊', label: t('worker.scan.model.orange'),   color: '#f97316' },
        { id: 'lemon',    icon: '🍋', label: t('worker.scan.model.lemon'),    color: '#eab308' },
        { id: 'olive',    icon: '🫒', label: t('worker.scan.model.olive'),    color: '#84cc16' },
        { id: 'leaves',   icon: '🌿', label: t('worker.scan.model.leaves'),   color: '#16a34a' },
        { id: 'insects',  icon: '🐛', label: t('worker.scan.model.insects'),  color: '#059669' },
        { id: 'plantdoc', icon: '🌱', label: t('worker.scan.model.plantdoc'), color: '#22c55e' },
      ],
    },
    {
      label: t('worker.scan.group_livestock'),
      emoji: '🐾',
      items: [
        { id: 'livestock',       icon: '🐄', label: t('worker.scan.model.livestock'),       color: '#7c3aed' },
        { id: 'cow_behavior',    icon: '🐄', label: t('worker.scan.model.cow_behavior'),    color: '#0891b2' },
        { id: 'goat_disease',    icon: '🐐', label: t('worker.scan.model.goat_disease'),    color: '#dc2626' },
        { id: 'chicken_disease', icon: '🐔', label: t('worker.scan.model.poultry_disease'), color: '#d97706' },
        { id: 'chicken_detect',  icon: '🐔', label: t('worker.scan.model.poultry_detect'),  color: '#f59e0b' },
        { id: 'rabbit',          icon: '🐰', label: t('worker.scan.model.rabbit'),          color: '#db2777' },
        { id: 'bee',             icon: '🐝', label: t('worker.scan.model.bee'),             color: '#fbbf24' },
      ],
    },
    {
      label: t('worker.scan.group_security'),
      emoji: '🚨',
      items: [
        { id: 'fire', icon: '🔥', label: t('worker.scan.model.fire'), color: '#ef4444' },
      ],
    },
  ];

  const ALL_CATS = GROUPS.flatMap(g => g.items);
  const [activeId, setActiveId] = useState('orange');
  const cat = ALL_CATS.find(c => c.id === activeId) || ALL_CATS[0];

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', paddingBottom: 20 }}>

      {/* ── Page header (sticky, dynamic per-model accent) ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 18px 12px',
        position: 'sticky', top: 0, zIndex: 20,
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
              Vision IA · YOLO · {ALL_CATS.length} {t('worker.scan.models_available')}
            </div>
          </div>
        </div>
      </div>

      {/* ── Model selector by group ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
        {GROUPS.map(group => (
          <div key={group.label} style={{ padding: '10px 16px 6px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '.06em', color: '#94a3b8',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span>{group.emoji}</span>
              {group.label}
            </div>

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
          <span style={{ fontSize: 11, color: '#94a3b8' }}>— {t('worker.scan.active_model')}</span>
        </div>
      </div>

      {/* ── AIScanner ── */}
      <div style={{ padding: '0 12px 12px' }}>
        <AIScanner
          key={activeId}
          category={activeId}
          title={`${cat.icon} ${cat.label}`}
          color={cat.color}
        />
      </div>

      <ExpertAssistant species={activeId} color={cat.color} />
    </div>
  );
}
