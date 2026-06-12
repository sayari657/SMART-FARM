import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { getLabelEntry } from '../utils/labelTranslations';

/**
 * Badge ℹ️ cliquable placé sous chaque modèle YOLO : un clic ouvre la liste
 * des classes détectables (traduites FR / EN / AR), un second clic la ferme.
 *
 * @param {string[]} classes  - noms bruts des classes du modèle
 * @param {string}   accent   - couleur d'accent du panneau parent
 * @param {Object}   palette  - optionnel : {label_lowercase: couleur} pour les puces
 */
export default function ModelClassesInfo({ classes = [], accent = '#16a34a', palette = {} }) {
  const [open, setOpen] = useState(false);
  if (!classes.length) return null;

  const dotColor = (label) =>
    palette[String(label).toLowerCase().replace(/\s+/g, '_')] ||
    palette[String(label).toLowerCase()] || accent;

  return (
    <div style={{ borderTop: '1px solid #f1f5f9' }}>
      {/* ── Bouton toggle ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={open ? 'Fermer la liste des classes' : 'Voir les classes du modèle'}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', background: open ? `${accent}0d` : 'transparent',
          border: 'none', cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${accent}14`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = open ? `${accent}0d` : 'transparent'; }}
      >
        <span style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          background: `${accent}1a`, border: `1px solid ${accent}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Info size={11} color={accent} />
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: 0.3 }}>
          {classes.length} classes détectables · فئات قابلة للكشف
        </span>
        <span style={{ marginLeft: 'auto', color: accent, lineHeight: 0 }}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {/* ── Liste des classes (FR / EN / AR) ── */}
      {open && (
        <div style={{
          maxHeight: 240, overflowY: 'auto', padding: '4px 10px 10px',
          background: '#fbfdfc',
        }}>
          {/* En-tête colonnes */}
          <div style={{
            display: 'grid', gridTemplateColumns: '14px 1fr 1fr 1fr', gap: 8,
            padding: '4px 6px', position: 'sticky', top: 0, background: '#fbfdfc',
            fontSize: 8, fontWeight: 900, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: 0.8,
            borderBottom: '1px solid #e2e8f0',
          }}>
            <span />
            <span>Français</span>
            <span>English</span>
            <span style={{ textAlign: 'right' }}>العربية</span>
          </div>
          {classes.map((cls) => {
            const t = getLabelEntry(cls);
            return (
              <div key={cls} title={cls} style={{
                display: 'grid', gridTemplateColumns: '14px 1fr 1fr 1fr', gap: 8,
                alignItems: 'center', padding: '5px 6px',
                borderBottom: '1px solid #f1f5f9',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: dotColor(cls), flexShrink: 0,
                }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#334155', lineHeight: 1.3 }}>{t.fr}</span>
                <span style={{ fontSize: 10, color: '#64748b', lineHeight: 1.3 }}>{t.en}</span>
                <span dir="rtl" style={{ fontSize: 10.5, color: '#334155', textAlign: 'right', lineHeight: 1.4 }}>{t.ar}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
