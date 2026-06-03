/**
 * HiveWizardForm — Expert 4-Step Wizard
 * Step 1 → Site selection (visual cards)
 * Step 2 → Identité : identifier + type + création year
 * Step 3 → Reine : has_queen, queen_year
 * Step 4 → État initial : santé / miel / force (1-5 stepper)
 */
import { useState } from 'react';
import {
  Hexagon, MapPin, X, Crown, Check,
  Heart, Droplets, Zap, ArrowLeft, ArrowRight,
  Hash, Calendar, Info,
} from 'lucide-react';
import { COLORS } from './BeeConstants';

/* ── Types de ruches ── */
const HIVE_TYPES = [
  { label: 'Langstroth',   emoji: '📦', desc: 'Standard mondial'       },
  { label: 'Dadant',       emoji: '🟫', desc: 'Format français'        },
  { label: 'Warré',        emoji: '🏺', desc: 'Conduite naturelle'     },
  { label: 'Kenyane',      emoji: '🎋', desc: 'Horizontale / KTBH'    },
  { label: 'Traditionnel', emoji: '🪵', desc: 'Tronc / paille'        },
  { label: 'queen_bank',   emoji: '👑', desc: 'Banque de Reines',      display: 'Banque Reines' },
];

/* ── Metric stepper for step 4 ── */
const INIT_METRICS = [
  {
    key: 'health_score', label: 'Santé', emoji: '❤️',
    scale: [
      { v:1, label:'Critique',   color:'#ef4444' },
      { v:2, label:'Mauvaise',   color:'#f97316' },
      { v:3, label:'Moyenne',    color:'#f59e0b' },
      { v:4, label:'Bonne',      color:'#84cc16' },
      { v:5, label:'Excellente', color:'#059669' },
    ],
    toStored: v => v * 2,
  },
  {
    key: 'honey_level', label: 'Miel', emoji: '🍯',
    scale: [
      { v:1, label:'Vide',   color:'#94a3b8' },
      { v:2, label:'Faible', color:'#fcd34d' },
      { v:3, label:'Moyen',  color:'#f59e0b' },
      { v:4, label:'Bon',    color:'#d97706' },
      { v:5, label:'Plein',  color:'#92400e' },
    ],
    toStored: v => v * 2,
  },
  {
    key: 'force_level', label: 'Force', emoji: '🐝',
    scale: [
      { v:1, label:'Très faible', color:'#ef4444' },
      { v:2, label:'Faible',      color:'#f97316' },
      { v:3, label:'Moyenne',     color:'#f59e0b' },
      { v:4, label:'Forte',       color:'#84cc16' },
      { v:5, label:'Très forte',  color:'#059669' },
    ],
    toStored: v => v * 2,
  },
];

/* ── Mini stepper widget ── */
function MiniStepper({ metric, value, onChange }) {
  const step = metric.scale.find(s => s.v === value) || metric.scale[2];
  return (
    <div style={{
      flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 10, padding: '16px 12px',
      background: `${step.color}10`,
      borderRadius: 18, border: `1.5px solid ${step.color}30`,
      transition: 'all .2s',
    }}>
      <span style={{ fontSize: 28 }}>{metric.emoji}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: COLORS.textMuted,
        textTransform: 'uppercase', letterSpacing: 1 }}>{metric.label}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => onChange(Math.max(1, value - 1))}
          style={{ width: 32, height: 32, borderRadius: '50%', background: COLORS.bg2,
            border: `1px solid ${COLORS.border}`, cursor: 'pointer',
            fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center',
            justifyContent: 'center', touchAction: 'manipulation' }}>−</button>
        <div style={{ textAlign: 'center', minWidth: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: step.color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 8, color: step.color + 'aa' }}>/5</div>
        </div>
        <button onClick={() => onChange(Math.min(5, value + 1))}
          style={{ width: 32, height: 32, borderRadius: '50%', background: COLORS.bg2,
            border: `1px solid ${COLORS.border}`, cursor: 'pointer',
            fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center',
            justifyContent: 'center', touchAction: 'manipulation' }}>+</button>
      </div>

      <span style={{ fontSize: 11, fontWeight: 800, color: step.color }}>{step.label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i <= value ? step.color : COLORS.border,
            transition: 'all .2s', transform: i === value ? 'scale(1.35)' : 'scale(1)',
          }}/>
        ))}
      </div>
    </div>
  );
}

/* ── Step indicator bar ── */
function StepBar({ current, total }) {
  const labels = ['Site', 'Identité', 'Reine', 'État Initial'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%' }}>
      {Array.from({ length: total }).map((_, i) => {
        const s     = i + 1;
        const done  = s < current;
        const activ = s === current;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: done ? COLORS.success : activ ? COLORS.accent : COLORS.bg2,
                border: `2px solid ${done ? COLORS.success : activ ? COLORS.accent : COLORS.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: done || activ ? '#fff' : COLORS.textMuted,
                fontWeight: 900, fontSize: 13, transition: 'all .25s',
                boxShadow: activ ? `0 0 16px ${COLORS.accent}40` : 'none',
              }}>
                {done ? <Check size={16}/> : s}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, marginTop: 5,
                color: activ ? COLORS.accent : done ? COLORS.success : COLORS.textMuted,
                whiteSpace: 'nowrap' }}>
                {labels[i]}
              </span>
            </div>
            {s < total && (
              <div style={{ height: 2, flex: 1, maxWidth: 40,
                background: done ? COLORS.success : COLORS.border,
                transition: 'background .25s', margin: '0 4px', marginBottom: 20 }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════ MAIN ══════════════════════════════════════ */
export default function HiveWizardForm({
  emplacements, form, setForm, BLANK_FORM,
  wizardStep, setWizardStep,
  onSubmit, onClose, toast,
}) {
  /* Local metric state (1-5 UI) — converted to stored (2-10) on submit */
  const [metrics, setMetrics] = useState({
    health_score: 4,
    honey_level:  3,
    force_level:  3,
  });

  const iSt = {
    height: 48, background: COLORS.bg2,
    border: `1px solid ${COLORS.border}`, borderRadius: 14,
    padding: '0 16px', color: COLORS.text, outline: 'none', fontSize: 14, width: '100%',
    transition: 'border-color .2s',
  };

  const focusStyle = { borderColor: COLORS.accent };

  const next = (val) => setWizardStep(v => v + (val ?? 1));
  const prev = ()    => setWizardStep(v => v - 1);

  const handleSubmit = async () => {
    /* Merge UI metric values (1-5) → stored (2-10) into form */
    const finalForm = {
      ...form,
      health_score: INIT_METRICS[0].toStored(metrics.health_score),
      honey_level:  INIT_METRICS[1].toStored(metrics.honey_level),
      force_level:  INIT_METRICS[2].toStored(metrics.force_level),
    };
    setForm(finalForm);
    await onSubmit(finalForm);
    setWizardStep(1);
  };

  const TOTAL = 4;

  return (
    <div className="page-enter" style={{
      background: COLORS.surface, borderRadius: 24,
      border: `1px solid ${COLORS.borderHigh}`,
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
    }}>

      {/* Top bar */}
      <div style={{
        padding: '20px 28px', borderBottom: `1px solid ${COLORS.border}`,
        background: `linear-gradient(135deg, ${COLORS.accent}08, transparent)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, color: COLORS.accent,
              letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 4 }}>
              APICRAFT · NOUVELLE RUCHE
            </div>
            <h2 style={{ color: COLORS.text, fontSize: 20, fontWeight: 900, margin: 0 }}>
              {wizardStep === 1 && '📍 Choisir le site apicole'}
              {wizardStep === 2 && '🔶 Identité de la ruche'}
              {wizardStep === 3 && '👑 Configuration reine'}
              {wizardStep === 4 && '📊 État initial de la colonie'}
            </h2>
          </div>
          <button onClick={() => { onClose(); setWizardStep(1); setForm(BLANK_FORM); }}
            style={{ background: COLORS.bg2, border: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted, cursor: 'pointer', width: 34, height: 34,
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16}/>
          </button>
        </div>
        <StepBar current={wizardStep} total={TOTAL}/>
      </div>

      <div style={{ padding: '28px 28px 24px' }}>

        {/* ════════════ STEP 1 — SITE ════════════ */}
        {wizardStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {emplacements.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: COLORS.textMuted,
                background: COLORS.bg2, borderRadius: 18, border: `2px dashed ${COLORS.border}` }}>
                <MapPin size={36} style={{ opacity: .3, display: 'block', margin: '0 auto 12px' }}/>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Aucun site créé</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Créez d'abord un emplacement dans l'onglet "Sites GIS".</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {emplacements.map(e => {
                  const sel = String(form.apiary_id) === String(e.id);
                  return (
                    <button key={e.id} onClick={() => setForm(f => ({ ...f, apiary_id: e.id }))}
                      style={{
                        padding: '18px 14px', borderRadius: 18, cursor: 'pointer',
                        border: `2px solid ${sel ? COLORS.accent : COLORS.border}`,
                        background: sel ? `${COLORS.accent}12` : COLORS.bg2,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                        transition: 'all .18s', boxShadow: sel ? `0 0 20px ${COLORS.accent}20` : 'none',
                        position: 'relative',
                      }}>
                      {sel && (
                        <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20,
                          borderRadius: '50%', background: COLORS.accent,
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={11} color="#fff"/>
                        </div>
                      )}
                      <div style={{ width: 48, height: 48, borderRadius: 14,
                        background: sel ? `${COLORS.accent}20` : COLORS.border + '40',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                        📍
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: sel ? COLORS.accent : COLORS.text,
                          textAlign: 'center', lineHeight: 1.3 }}>{e.name}</div>
                        {e.latitude && (
                          <div style={{ fontSize: 9, color: COLORS.textMuted, textAlign: 'center', marginTop: 3 }}>
                            GPS disponible
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => { if (!form.apiary_id) { toast('Choisissez un site', 'warning'); return; } next(); }}
              disabled={!form.apiary_id}
              style={{ height: 52, borderRadius: 16,
                background: form.apiary_id
                  ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`
                  : COLORS.border,
                border: 'none', color: form.apiary_id ? 'white' : COLORS.textMuted,
                fontWeight: 800, fontSize: 15, cursor: form.apiary_id ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Suivant <ArrowRight size={16}/>
            </button>
          </div>
        )}

        {/* ════════════ STEP 2 — IDENTITÉ ════════════ */}
        {wizardStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Identifier */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                fontSize: 11, fontWeight: 800, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                <Hash size={13} color={COLORS.accent}/> Identifiant de la ruche *
              </label>
              <input
                autoFocus
                placeholder="Ex : R-01, Ruche Grombalia, A3…"
                value={form.identifier || ''}
                onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
                onFocus={e => Object.assign(e.target.style, focusStyle)}
                onBlur={e => { e.target.style.borderColor = COLORS.border; }}
                style={iSt}
              />
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 5 }}>
                Nom unique pour identifier cette ruche dans votre rucher
              </div>
            </div>

            {/* Type */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                fontSize: 11, fontWeight: 800, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                <Hexagon size={13} color={COLORS.accent}/> Type de ruche
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                {HIVE_TYPES.map(t => {
                  const sel = form.hive_type === t.label;
                  return (
                    <button key={t.label}
                      onClick={() => setForm(f => ({
                        ...f, hive_type: t.label,
                        has_queen: t.label === 'queen_bank' ? true : f.has_queen,
                      }))}
                      style={{
                        padding: '12px 8px', borderRadius: 14, cursor: 'pointer',
                        border: `2px solid ${sel ? COLORS.accent : COLORS.border}`,
                        background: sel ? `${COLORS.accent}12` : COLORS.bg2,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all .15s', position: 'relative',
                        boxShadow: sel ? `0 0 16px ${COLORS.accent}20` : 'none',
                      }}>
                      {sel && (
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16,
                          borderRadius: '50%', background: COLORS.accent,
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={9} color="#fff"/>
                        </div>
                      )}
                      <span style={{ fontSize: 24 }}>{t.emoji}</span>
                      <span style={{ fontWeight: 800, fontSize: 10, color: sel ? COLORS.accent : COLORS.text,
                        textAlign: 'center', lineHeight: 1.2 }}>{t.display || t.label}</span>
                      <span style={{ fontSize: 9, color: COLORS.textMuted, textAlign: 'center' }}>{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Year */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                  fontSize: 11, fontWeight: 800, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                  <Calendar size={13} color={COLORS.accent}/> Année de création
                </label>
                <input type="number" min="2010" max={new Date().getFullYear()}
                  value={form.queen_year || new Date().getFullYear()}
                  onChange={e => setForm(f => ({ ...f, queen_year: parseInt(e.target.value) || f.queen_year }))}
                  style={iSt}/>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: 14,
                background: `${COLORS.accent}08`, border: `1px solid ${COLORS.accent}20`,
                display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Info size={13} color={COLORS.accent}/>
                  <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.accent }}>Résumé</span>
                </div>
                <div style={{ fontSize: 12, color: COLORS.text }}>
                  <span style={{ fontWeight: 700 }}>{form.identifier || '—'}</span>
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                  {HIVE_TYPES.find(t => t.label === form.hive_type)?.display || form.hive_type}
                  {' · '}{emplacements.find(e => String(e.id) === String(form.apiary_id))?.name || '?'}
                </div>
              </div>
            </div>

            {/* Nav */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={prev}
                style={{ height: 50, padding: '0 20px', borderRadius: 14, cursor: 'pointer',
                  border: `1px solid ${COLORS.border}`, background: COLORS.bg2,
                  color: COLORS.textMuted, fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowLeft size={15}/> Retour
              </button>
              <button
                onClick={() => { if (!form.identifier?.trim()) { toast('Identifiant requis', 'warning'); return; } next(); }}
                style={{ flex: 1, height: 50, borderRadius: 14, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
                  border: 'none', color: 'white', fontWeight: 800, fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Suivant <ArrowRight size={15}/>
              </button>
            </div>
          </div>
        )}

        {/* ════════════ STEP 3 — REINE ════════════ */}
        {wizardStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {form.hive_type === 'queen_bank' ? (
              <div style={{ textAlign: 'center', padding: '24px 16px',
                background: `${COLORS.accent}08`, borderRadius: 20, border: `1px solid ${COLORS.accent}25` }}>
                <span style={{ fontSize: 56, display: 'block', marginBottom: 12 }}>👑</span>
                <div style={{ fontWeight: 900, fontSize: 18, color: COLORS.text, marginBottom: 6 }}>
                  Stock initial de reines
                </div>
                <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 20 }}>
                  Combien de reines dans la banque ?
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <button onClick={() => setForm(f => ({ ...f, queen_count: Math.max(0, (f.queen_count||0) - 1) }))}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: `1px solid ${COLORS.border}`,
                      background: COLORS.bg2, cursor: 'pointer', fontWeight: 900, fontSize: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <div style={{ fontSize: 52, fontWeight: 900, color: COLORS.accent,
                    minWidth: 80, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {form.queen_count || 0}
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, queen_count: Math.min(99, (f.queen_count||0) + 1) }))}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: `1px solid ${COLORS.border}`,
                      background: COLORS.bg2, cursor: 'pointer', fontWeight: 900, fontSize: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 12 }}>reines disponibles</div>
              </div>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: COLORS.textMuted,
                    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    La colonie a-t-elle une reine ?
                  </div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    {[
                      { label: 'Oui', sub: 'Reine présente',  val: true,  color: COLORS.success, icon: '👑' },
                      { label: 'Non', sub: 'Sans reine',       val: false, color: COLORS.error,   icon: '✗'  },
                    ].map(opt => (
                      <button key={String(opt.val)} onClick={() => setForm(f => ({ ...f, has_queen: opt.val }))}
                        style={{ flex: 1, padding: '20px 14px', borderRadius: 18, cursor: 'pointer',
                          fontWeight: 900, fontSize: 15,
                          background: form.has_queen === opt.val ? `${opt.color}15` : COLORS.bg2,
                          border: `${form.has_queen === opt.val ? 3 : 2}px solid ${form.has_queen === opt.val ? opt.color : COLORS.border}`,
                          color: form.has_queen === opt.val ? opt.color : COLORS.textMuted,
                          transition: 'all .18s', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 8,
                          boxShadow: form.has_queen === opt.val ? `0 0 20px ${opt.color}20` : 'none' }}>
                        <span style={{ fontSize: 36 }}>{opt.icon}</span>
                        <span style={{ fontSize: 16 }}>{opt.label}</span>
                        <span style={{ fontSize: 11, opacity: .7, fontWeight: 600 }}>{opt.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {form.has_queen && (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                      fontSize: 11, fontWeight: 800, color: COLORS.textMuted,
                      textTransform: 'uppercase', letterSpacing: 1 }}>
                      <Crown size={13} color={COLORS.accent}/> Année d'introduction de la reine
                    </label>
                    <input type="number" min="2018" max={new Date().getFullYear()}
                      value={form.queen_year || new Date().getFullYear()}
                      onChange={e => setForm(f => ({ ...f, queen_year: parseInt(e.target.value) || f.queen_year }))}
                      style={iSt}/>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 5 }}>
                      Age reine : {new Date().getFullYear() - (form.queen_year || new Date().getFullYear())} an(s)
                      {(new Date().getFullYear() - (form.queen_year || new Date().getFullYear())) >= 3 &&
                        ' · ⚠ Remplacement recommandé (>3 ans)'}
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={prev}
                style={{ height: 50, padding: '0 20px', borderRadius: 14, cursor: 'pointer',
                  border: `1px solid ${COLORS.border}`, background: COLORS.bg2,
                  color: COLORS.textMuted, fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowLeft size={15}/> Retour
              </button>
              <button onClick={() => next()}
                style={{ flex: 1, height: 50, borderRadius: 14, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
                  border: 'none', color: 'white', fontWeight: 800, fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Suivant <ArrowRight size={15}/>
              </button>
            </div>
          </div>
        )}

        {/* ════════════ STEP 4 — ÉTAT INITIAL ════════════ */}
        {wizardStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ padding: '14px 18px', borderRadius: 14,
              background: `${COLORS.accent}08`, border: `1px solid ${COLORS.accent}20`,
              fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              <strong style={{ color: COLORS.accent }}>État initial</strong> — Ces valeurs déterminent le point de départ
              de la colonie dans le système de monitoring COLOSS.
            </div>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {INIT_METRICS.map(m => (
                <MiniStepper key={m.key} metric={m} value={metrics[m.key]}
                  onChange={v => setMetrics(prev => ({ ...prev, [m.key]: v }))}/>
              ))}
            </div>

            {/* Summary card */}
            <div style={{ padding: '16px 20px', borderRadius: 16,
              background: COLORS.bg2, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: COLORS.textMuted,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Récapitulatif de la nouvelle ruche
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                {[
                  { l: 'Identifiant', v: form.identifier || '—',  c: COLORS.text   },
                  { l: 'Site',        v: emplacements.find(e => String(e.id) === String(form.apiary_id))?.name || '?', c: COLORS.text },
                  { l: 'Type',        v: HIVE_TYPES.find(t => t.label === form.hive_type)?.display || form.hive_type, c: COLORS.text },
                  { l: 'Reine',       v: form.has_queen ? `Oui (${form.queen_year})` : 'Non', c: form.has_queen ? COLORS.success : COLORS.error },
                  { l: 'Santé init.', v: `${metrics.health_score}/5`,  c: INIT_METRICS[0].scale.find(s => s.v === metrics.health_score)?.color },
                  { l: 'Miel init.',  v: `${metrics.honey_level}/5`,   c: INIT_METRICS[1].scale.find(s => s.v === metrics.honey_level)?.color  },
                  { l: 'Force init.', v: `${metrics.force_level}/5`,   c: INIT_METRICS[2].scale.find(s => s.v === metrics.force_level)?.color  },
                ].map(row => (
                  <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between',
                    padding: '4px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                    <span style={{ color: COLORS.textMuted }}>{row.l}</span>
                    <span style={{ fontWeight: 700, color: row.c }}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={prev}
                style={{ height: 56, padding: '0 20px', borderRadius: 16, cursor: 'pointer',
                  border: `1px solid ${COLORS.border}`, background: COLORS.bg2,
                  color: COLORS.textMuted, fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowLeft size={15}/> Retour
              </button>
              <button onClick={handleSubmit}
                style={{ flex: 1, height: 56, borderRadius: 16, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${COLORS.success}, #065F46)`,
                  border: 'none', color: 'white', fontWeight: 900, fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  boxShadow: `0 8px 28px ${COLORS.success}30` }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={16} color="#fff"/>
                </div>
                {form.hive_type === 'queen_bank' ? '✓ Créer la Banque de Reines' : '✓ Créer la Ruche'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
