import { Hexagon, MapPin, X } from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function HiveWizardForm({
  emplacements, form, setForm, BLANK_FORM,
  wizardStep, setWizardStep,
  onSubmit, onClose, toast,
}) {
  const iSt = {
    height: 44, background: COLORS.bg2,
    border: `1px solid ${COLORS.border}`, borderRadius: 12,
    padding: '0 14px', color: COLORS.text, outline: 'none', fontSize: 13, width: '100%',
  };

  return (
    <div className="page-enter" style={{ background: COLORS.surface,
      border: `1px solid ${COLORS.borderHigh}`, borderRadius: 22, padding: '24px 26px' }}>

      {/* Wizard header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: s === wizardStep ? 28 : 10, height: 10, borderRadius: 5,
              background: s === wizardStep ? COLORS.accent : s < wizardStep ? COLORS.success : COLORS.border,
              transition: 'all 0.25s',
            }} />
          ))}
          <span style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700, marginLeft: 4 }}>
            Étape {wizardStep}/3
          </span>
        </div>
        <button
          onClick={() => { onClose(); setWizardStep(1); setForm(BLANK_FORM); }}
          style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Étape 1 — Site */}
      {wizardStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <MapPin size={40} color={COLORS.accent} style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 900, fontSize: 20, color: COLORS.text }}>Quel site ?</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>Choisissez l'emplacement</div>
          </div>
          {emplacements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: COLORS.textMuted, fontSize: 13 }}>
              Aucun site — créez d'abord un emplacement.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {emplacements.map(e => {
                const sel = String(form.apiary_id) === String(e.id);
                return (
                  <button key={e.id} onClick={() => setForm(f => ({ ...f, apiary_id: e.id }))}
                    style={{ padding: '14px 12px', borderRadius: 16, cursor: 'pointer',
                      border: `2px solid ${sel ? COLORS.accent : COLORS.border}`,
                      background: sel ? COLORS.accent + '12' : COLORS.bg2,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 8, transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 28 }}>📍</span>
                    <span style={{ fontWeight: 800, fontSize: 13,
                      color: sel ? COLORS.accent : COLORS.text, textAlign: 'center', lineHeight: 1.2 }}>
                      {e.name}
                    </span>
                    {sel && <span style={{ fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={() => { if (!form.apiary_id) { toast('Choisissez un site', 'warning'); return; } setWizardStep(2); }}
            style={{ height: 56, borderRadius: 16,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
              border: 'none', color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer', marginTop: 4 }}
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Étape 2 — Type */}
      {wizardStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <Hexagon size={40} color={COLORS.accent} style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 900, fontSize: 20, color: COLORS.text }}>Quel type ?</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>Type de ruche (optionnel)</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
            {[
              { label: 'Langstroth',   emoji: '📦' },
              { label: 'Dadant',       emoji: '🟫' },
              { label: 'Warré',        emoji: '🏺' },
              { label: 'Kenyane',      emoji: '🎋' },
              { label: 'Traditionnel', emoji: '🪵' },
              { label: 'queen_bank',   emoji: '👑', display: 'Banque Reines' },
            ].map(t => {
              const sel = form.hive_type === t.label;
              return (
                <button key={t.label}
                  onClick={() => setForm(f => ({ ...f, hive_type: t.label, has_queen: t.label === 'queen_bank' ? true : f.has_queen }))}
                  style={{ padding: '14px 8px', borderRadius: 16, cursor: 'pointer',
                    border: `2px solid ${sel ? COLORS.accent : COLORS.border}`,
                    background: sel ? COLORS.accent + '12' : COLORS.bg2,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6, transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 28 }}>{t.emoji}</span>
                  <span style={{ fontWeight: 800, fontSize: 11, color: sel ? COLORS.accent : COLORS.text, textAlign: 'center' }}>
                    {t.display || t.label}
                  </span>
                  {sel && <span style={{ fontSize: 14 }}>✓</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setWizardStep(1)}
              style={{ height: 48, padding: '0 20px', borderRadius: 14, cursor: 'pointer',
                border: `1px solid ${COLORS.border}`, background: COLORS.bg2,
                color: COLORS.textMuted, fontWeight: 700, fontSize: 14 }}>← Retour</button>
            <button onClick={() => setWizardStep(3)}
              style={{ flex: 1, height: 48, borderRadius: 14, cursor: 'pointer',
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
                border: 'none', color: 'white', fontWeight: 900, fontSize: 15 }}>Suivant →</button>
            <button onClick={() => setWizardStep(3)}
              style={{ height: 48, padding: '0 16px', borderRadius: 14, cursor: 'pointer',
                border: `1px solid ${COLORS.border}`, background: COLORS.bg2,
                color: COLORS.textMuted, fontWeight: 700, fontSize: 13 }}>Passer ↓</button>
          </div>
        </div>
      )}

      {/* Étape 3 — Reine */}
      {wizardStep === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 44, display: 'block', marginBottom: 8 }}>👑</span>
            <div style={{ fontWeight: 900, fontSize: 20, color: COLORS.text }}>Une reine ?</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>La ruche a-t-elle une reine ?</div>
          </div>
          {form.hive_type === 'queen_bank' ? (
            <div style={{ padding: '18px 20px', borderRadius: 16,
              background: COLORS.accent + '10', border: `1px solid ${COLORS.accent}30`, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: COLORS.accent, fontWeight: 700 }}>
                Banque de Reines — stock initial
              </div>
              <input
                type="number" min="0" max="99" value={form.queen_count}
                onChange={e => setForm(f => ({ ...f, queen_count: parseInt(e.target.value) || 0 }))}
                style={{ ...iSt, marginTop: 12, height: 52, width: 120, textAlign: 'center',
                  background: COLORS.surface, border: `2px solid ${COLORS.accent}`,
                  borderRadius: 14, color: COLORS.accent, fontWeight: 900, fontSize: 28 }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 14 }}>
              {[{ label: '👑 OUI', val: true, color: COLORS.success }, { label: '✗ NON', val: false, color: COLORS.error }].map(opt => (
                <button key={String(opt.val)} onClick={() => setForm(f => ({ ...f, has_queen: opt.val }))}
                  style={{ flex: 1, height: 80, borderRadius: 20, cursor: 'pointer', fontWeight: 900, fontSize: 18,
                    background: form.has_queen === opt.val ? opt.color + '18' : COLORS.bg2,
                    border: `${form.has_queen === opt.val ? 3 : 2}px solid ${form.has_queen === opt.val ? opt.color : COLORS.border}`,
                    color: form.has_queen === opt.val ? opt.color : COLORS.textMuted, transition: 'all 0.15s' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={() => setWizardStep(2)}
              style={{ height: 56, padding: '0 20px', borderRadius: 16, cursor: 'pointer',
                border: `1px solid ${COLORS.border}`, background: COLORS.bg2,
                color: COLORS.textMuted, fontWeight: 700, fontSize: 14 }}>← Retour</button>
            <button onClick={async () => { await onSubmit(); setWizardStep(1); }}
              style={{ flex: 1, height: 56, borderRadius: 16, cursor: 'pointer',
                background: `linear-gradient(135deg, ${COLORS.success}, #065F46)`,
                border: 'none', color: 'white', fontWeight: 900, fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18, fontWeight: 900 }}>+</span>
              {form.hive_type === 'queen_bank' ? 'Créer la Banque' : 'Créer la Ruche'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
