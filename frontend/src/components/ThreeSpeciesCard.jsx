import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import beeImg     from '../assets/bee/bee-sketch.png';
import cowImg     from '../assets/cow/cow-hero.png';
import sheepImg   from '../assets/sheep/sheep-hero.png';
import goatImg    from '../assets/goat/goat-hero.png';
import poultryImg from '../assets/poultry/poultry-hero.png';
import rabbitImg  from '../assets/rabbit/rabbit-hero.png';

import beeIconImg     from '../assets/bee/bee-icon.png';
import cowIconImg     from '../assets/cow/cow-icon.png';
import sheepIconImg   from '../assets/sheep/sheep-icon.png';
import goatIconImg    from '../assets/goat/goat-icon.png';
import poultryIconImg from '../assets/poultry/poultry-icon.png';
import rabbitIconImg  from '../assets/rabbit/rabbit-icon.png';

const HERO_IMG = {
  bee: beeImg, cow: cowImg, sheep: sheepImg,
  goat: goatImg, poultry: poultryImg, rabbit: rabbitImg,
};

const ICON_IMG = {
  bee: beeIconImg, cow: cowIconImg, sheep: sheepIconImg,
  goat: goatIconImg, poultry: poultryIconImg, rabbit: rabbitIconImg,
};

const SPECIES_META = {
  bee:     { color: '#d97706' },
  cow:     { color: '#7c3aed' },
  goat:    { color: '#dc2626' },
  poultry: { color: '#0891b2' },
  rabbit:  { color: '#db2777' },
  sheep:   { color: '#059669' },
};

const ThreeSpeciesCard = ({ sp, count, color, isActive, onClick }) => {
  const { t } = useTranslation();
  const [hov, setHov] = useState(false);

  const meta = SPECIES_META[sp] || { color: '#6b7280' };
  const c = meta.color;

  // All text from i18n
  const label       = t(`animals.species_labels.${sp}`, sp);
  const description = t(`species_card.desc.${sp}`, '');
  const learnMore   = t('species_card.learn_more', 'En savoir plus');
  const liveLabel   = t('species_card.live', 'LIVE');
  const animalWord  = count === 1
    ? t('species_card.animal_singular', 'animal')
    : t('species_card.animal_plural', 'animaux');

  return (
    <div
      className={`summary-card ${isActive ? 'active' : ''}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        height: 'auto',
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
        border: isActive ? `2px solid ${c}` : `1px solid ${hov ? c + '50' : '#e2e8f0'}`,
        borderRadius: 16,
        background: '#ffffff',
        boxShadow: hov || isActive
          ? `0 12px 32px ${c}18`
          : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transform: hov && !isActive ? 'translateY(-4px)' : 'none',
      }}
    >
      {/* Image area */}
      <div style={{
        width: '100%',
        height: 200,
        background: 'linear-gradient(180deg, #f8f9fc 0%, #f1f5f9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <img
          src={HERO_IMG[sp]}
          alt={label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            display: 'block',
            transition: 'transform 0.35s ease',
            transform: hov || isActive ? 'scale(1.07)' : 'scale(1)',
            padding: '12px',
          }}
        />
        {isActive && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at center, ${c}20 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Info area */}
      <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Species name row + LIVE badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: c, display: 'inline-block', flexShrink: 0,
            }} />
            <img
              src={ICON_IMG[sp]}
              alt=""
              style={{ width: 22, height: 22, objectFit: 'contain' }}
            />
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              {label}
            </span>
          </div>

          {/* LIVE badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 99,
            border: `1px solid ${c}40`,
            background: `${c}10`,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: c, display: 'inline-block',
              animation: 'livePulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: c, letterSpacing: 0.5 }}>
              {liveLabel}
            </span>
          </div>
        </div>

        {/* Description — fully translated */}
        <p style={{
          fontSize: 12,
          color: '#64748b',
          lineHeight: 1.65,
          margin: '0 0 14px',
          flex: 1,
        }}>
          {description}
        </p>

        {/* Footer: animal count + button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: c,
            background: `${c}12`, border: `1px solid ${c}25`,
            padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap',
          }}>
            {count} {animalWord}
          </span>

          <button
            onClick={e => { e.stopPropagation(); onClick?.(); }}
            style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8,
              border: `1px solid ${c}35`,
              background: `${c}0d`,
              color: c, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${c}1a`;
              e.currentTarget.style.transform = 'translateX(2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${c}0d`;
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            {learnMore} <ArrowRight size={11} />
          </button>
        </div>
      </div>

      {/* Bottom color accent stripe */}
      <div className="summary-card-accent" style={{ background: c }} />

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default ThreeSpeciesCard;
