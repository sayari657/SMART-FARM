/**
 * HiveWizardForm — 6-Step Sliding Wizard
 *
 * Columns covered (exact structure):
 *   Date | Numero_Ruche | Type_Ruche | Reine | Oeufs | Couvain |
 *   Population | Miel | Pollen | Nb_Cadres | Action_Observation
 *
 * Step 1 → Site apicole
 * Step 2 → Date + Identifiant (Numero_Ruche) + Type_Ruche
 * Step 3 → Reine · Oeufs · Couvain · Pente
 * Step 4 → Population · Miel · Pollen  (Faible / Moyen / Fort)
 * Step 5 → Nb_Cadres + Action_Observation
 * Step 6 → Diagnostic de santé (auto-computed) + création
 */
import { useState } from 'react';
import QRCodeLib from 'qrcode';
import {
  MapPin, X, Check, ArrowLeft, ArrowRight,
  Hash, Calendar, Hexagon, AlertTriangle, ShieldCheck, Info,
  QrCode, Download, Printer,
} from 'lucide-react';
import { COLORS } from './BeeConstants';

/* ── Palette shorthand ── */
const C = COLORS;

/* ── Hive types ── */
const HIVE_TYPES = [
  { label: 'Langstroth',   emoji: '📦', desc: 'Standard mondial'    },
  { label: 'Dadant',       emoji: '🟫', desc: 'Format français'     },
  { label: 'Warré',        emoji: '🏺', desc: 'Conduite naturelle'  },
  { label: 'Kenyane',      emoji: '🎋', desc: 'Horizontale KTBH'   },
  { label: 'Traditionnel', emoji: '🪵', desc: 'Tronc / paille'     },
  { label: 'queen_bank',   emoji: '👑', desc: 'Banque de Reines', display: 'Banque Reines' },
];

/* ── Trilevel options ── */
const TRILEVEL = [
  { val: 'Faible', label: 'Faible', emoji: '🔴', color: '#ef4444' },
  { val: 'Moyen',  label: 'Moyen',  emoji: '🟡', color: '#f59e0b' },
  { val: 'Fort',   label: 'Fort',   emoji: '🟢', color: '#059669' },
];

/* ── Step metadata ── */
const STEPS = [
  { id: 1, emoji: '📍', title: 'Site apicole',          sub: 'Choisir l\'emplacement' },
  { id: 2, emoji: '🔖', title: 'Identité',              sub: 'Date · Numéro · Type'  },
  { id: 3, emoji: '👑', title: 'Reine & Couvain',       sub: 'Reine · Œufs · Couvain · Pente' },
  { id: 4, emoji: '🍯', title: 'Ressources',            sub: 'Population · Miel · Pollen' },
  { id: 5, emoji: '📋', title: 'Cadres & Observations', sub: 'Nb. Cadres · Notes'     },
  { id: 6, emoji: '🩺', title: 'Diagnostic Santé',      sub: 'Évaluation automatique' },
  { id: 7, emoji: '✅', title: 'Ruche Créée',           sub: 'QR Code généré'         },
];

/* ── Health diagnostic engine ── */
function computeDiagnostic(form) {
  const checks = [
    {
      key: 'reine',
      label: 'Reine présente',
      ok: form.has_queen,
      critical: true,
      ok_desc: 'Colonie orpheline — ponte active confirmée',
      ko_desc: '⚠ Absence de reine — orpheliné détecté, intervention urgente',
    },
    {
      key: 'oeufs',
      label: 'Œufs présents',
      ok: form.has_eggs,
      critical: false,
      ok_desc: 'Ponte récente visible — reine active dans les 3 derniers jours',
      ko_desc: 'Aucun œuf observé — surveiller la reine',
    },
    {
      key: 'couvain',
      label: 'Couvain présent',
      ok: form.has_brood,
      critical: true,
      ok_desc: 'Développement larvaire normal — cycle reproductif sain',
      ko_desc: '⚠ Absence de couvain — colonie en déclin ou jeune essaim',
    },
    {
      key: 'pente',
      label: 'Pente en règle',
      ok: form.pente_ok,
      critical: false,
      ok_desc: 'Inclinaison correcte (3–5°) — bon drainage naturel',
      ko_desc: 'Vérifier l\'inclinaison — risque de stagnation d\'eau',
    },
    {
      key: 'population',
      label: 'Population suffisante',
      ok: form.population !== 'Faible',
      critical: false,
      ok_desc: form.population === 'Fort'
        ? 'Population forte — colonie en pleine expansion'
        : 'Population moyenne — effectif correct à surveiller',
      ko_desc: 'Population faible — risque d\'effondrement, nourrissement conseillé',
    },
    {
      key: 'miel',
      label: 'Réserves de miel',
      ok: form.honey_str !== 'Faible',
      critical: false,
      ok_desc: form.honey_str === 'Fort'
        ? 'Réserves abondantes — colonie autosuffisante'
        : 'Réserves correctes — surveiller en période de disette',
      ko_desc: 'Réserves insuffisantes — nourrissement sucre nécessaire',
    },
    {
      key: 'cadres',
      label: 'Cadres en règle',
      ok: form.nb_cadres >= 5,
      critical: false,
      ok_desc: form.nb_cadres >= 8
        ? `${form.nb_cadres} cadres — nombre optimal`
        : `${form.nb_cadres} cadres — acceptable`,
      ko_desc: `${form.nb_cadres} cadre(s) — insuffisant, ajouter des cadres`,
    },
  ];

  const passed   = checks.filter(c => c.ok).length;
  const critical = checks.filter(c => c.critical && !c.ok).length;
  const total    = checks.length;
  const pct      = Math.round((passed / total) * 100);

  let status, statusColor, statusEmoji, statusBg;
  if (critical > 0 || passed < 3) {
    status = 'Santé préoccupante'; statusColor = '#ef4444';
    statusEmoji = '🔴'; statusBg = '#fef2f2';
  } else if (passed < 5) {
    status = 'Santé correcte — à surveiller'; statusColor = '#f59e0b';
    statusEmoji = '🟡'; statusBg = '#fffbeb';
  } else {
    status = 'Bonne santé — colonie saine'; statusColor = '#059669';
    statusEmoji = '🟢'; statusBg = '#f0fdf4';
  }

  /* Map form fields → API payload */
  const toLvl = (str) => str === 'Fort' ? 10 : str === 'Moyen' ? 6 : 2;
  const health_score = critical > 0 ? 3 : Math.round(2 + (passed / total) * 8);

  return { checks, passed, total, pct, status, statusColor, statusEmoji, statusBg, health_score, toLvl };
}

/* ── Step progress bar ── */
function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%' }}>
      {STEPS.map((s, i) => {
        const done  = s.id < current;
        const activ = s.id === current;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: done ? C.success : activ ? C.accent : C.bg2,
                border: `2px solid ${done ? C.success : activ ? C.accent : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: done || activ ? '#fff' : C.textMuted,
                fontWeight: 900, fontSize: done ? 14 : 12,
                transition: 'all .3s', boxShadow: activ ? `0 0 14px ${C.accent}40` : 'none',
              }}>
                {done ? <Check size={14}/> : activ && s.id === 7 ? <QrCode size={14}/> : <span style={{ fontSize: 11 }}>{s.emoji}</span>}
              </div>
              <span style={{
                fontSize: 8, fontWeight: 700, marginTop: 4,
                color: activ ? C.accent : done ? C.success : C.textMuted,
                whiteSpace: 'nowrap', maxWidth: 40, textAlign: 'center', lineHeight: 1.2,
              }}>
                {s.title.split(' ')[0]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                height: 2, flex: 1, maxWidth: 32,
                background: done ? C.success : C.border,
                transition: 'background .3s', margin: '0 2px', marginBottom: 20,
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Yes/No toggle ── */
function YesNoToggle({ label, value, onChange, yesIcon = '✓', noIcon = '✗', yesColor = C.success, noColor = '#ef4444', description }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { val: true,  l: 'Oui', icon: yesIcon, color: yesColor },
          { val: false, l: 'Non', icon: noIcon,  color: noColor  },
        ].map(opt => (
          <button key={String(opt.val)} onClick={() => onChange(opt.val)}
            style={{
              flex: 1, padding: '14px 10px', borderRadius: 16, cursor: 'pointer',
              border: `${value === opt.val ? 3 : 2}px solid ${value === opt.val ? opt.color : C.border}`,
              background: value === opt.val ? `${opt.color}15` : C.bg2,
              color: value === opt.val ? opt.color : C.textMuted,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              transition: 'all .18s', fontWeight: 900,
              boxShadow: value === opt.val ? `0 0 16px ${opt.color}20` : 'none',
            }}>
            <span style={{ fontSize: 24 }}>{opt.icon}</span>
            <span style={{ fontSize: 15 }}>{opt.l}</span>
          </button>
        ))}
      </div>
      {description && (
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, paddingLeft: 4 }}>
          {description}
        </div>
      )}
    </div>
  );
}

/* ── Trilevel selector (Faible / Moyen / Fort) ── */
function TrilevelSelector({ label, emoji, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted,
        textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{emoji}</span> {label}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {TRILEVEL.map(opt => {
          const sel = value === opt.val;
          return (
            <button key={opt.val} onClick={() => onChange(opt.val)}
              style={{
                flex: 1, padding: '12px 6px', borderRadius: 14, cursor: 'pointer',
                border: `${sel ? 2.5 : 1.5}px solid ${sel ? opt.color : C.border}`,
                background: sel ? `${opt.color}15` : C.bg2,
                color: sel ? opt.color : C.textMuted,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'all .18s', fontWeight: sel ? 900 : 600,
                boxShadow: sel ? `0 4px 16px ${opt.color}25` : 'none',
              }}>
              <span style={{ fontSize: 20 }}>{opt.emoji}</span>
              <span style={{ fontSize: 12 }}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN WIZARD
═══════════════════════════════════════════════════════════════════ */
export default function HiveWizardForm({
  emplacements, form, setForm,
  wizardStep, setWizardStep,
  onSubmit, onClose, toast,
}) {
  const [slideDir,     setSlideDir]     = useState('right');
  const [animKey,      setAnimKey]      = useState(0);
  const [createdHive,  setCreatedHive]  = useState(null);
  const [qrDataUrl,    setQrDataUrl]    = useState(null);
  const [qrLoading,    setQrLoading]    = useState(false);

  /* Input base style */
  const iSt = {
    height: 48, background: C.bg2,
    border: `1px solid ${C.border}`, borderRadius: 14,
    padding: '0 16px', color: C.text, outline: 'none', fontSize: 14, width: '100%',
    boxSizing: 'border-box', transition: 'border-color .2s',
  };

  const slide = (dir) => { setSlideDir(dir); setAnimKey(k => k + 1); };
  const next  = () => { slide('right'); setWizardStep(v => v + 1); };
  const prev  = () => { slide('left');  setWizardStep(v => v - 1); };

  const handleSubmit = async () => {
    const diag = computeDiagnostic(form);
    const { toLvl } = diag;
    const finalForm = {
      ...form,
      health_score: diag.health_score,
      honey_level:  toLvl(form.honey_str),
      force_level:  toLvl(form.population),
    };
    setForm(finalForm);
    const newHive = await onSubmit(finalForm);
    if (!newHive) return; /* creation failed — stay on step 6 */

    setCreatedHive(newHive);
    slide('right');
    setWizardStep(7);

    /* Generate QR code entirely client-side — instant, offline-capable */
    generateQR(newHive);
  };

  /* Client-side QR generation — encodes the direct inspection URL */
  const generateQR = async (hive) => {
    setQrLoading(true);
    try {
      /* URL that opens directly the inspection + history page when scanned */
      const inspectUrl = `${window.location.origin}/hive/${hive.id}`;

      const dataUrl = await QRCodeLib.toDataURL(inspectUrl, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark:  '#92400E',   /* amber-800 — honey brand color */
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation failed:', err);
    } finally {
      setQrLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    /* Reset local state */
    setCreatedHive(null);
    setQrDataUrl(null);
    setQrLoading(false);
    setAnimKey(0);
  };

  const step       = STEPS[wizardStep - 1];
  const diagnostic = wizardStep === 6 ? computeDiagnostic(form) : null;
  const emplName   = emplacements.find(e => String(e.id) === String(form.apiary_id))?.name || '?';

  return (
    <div style={{
      background: C.surface, borderRadius: 24,
      border: `1px solid ${C.borderHigh}`,
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
      maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(55px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-55px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        padding: '20px 26px 18px', borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(135deg, ${C.accent}0a, transparent)`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900,
              color: wizardStep === 7 ? C.success : C.accent,
              letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 4 }}>
              {wizardStep === 7
                ? 'APICRAFT · RUCHE CRÉÉE'
                : `APICRAFT · NOUVELLE RUCHE · ÉTAPE ${wizardStep}/${STEPS.length - 1}`}
            </div>
            <h2 style={{ color: C.text, fontSize: 18, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{step.emoji}</span> {step.title}
            </h2>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{step.sub}</div>
          </div>
          <button onClick={handleClose}
            style={{ background: C.bg2, border: `1px solid ${C.border}`,
              color: C.textMuted, cursor: 'pointer', width: 34, height: 34,
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0 }}>
            <X size={16}/>
          </button>
        </div>
        {wizardStep < 7 && <StepBar current={wizardStep} />}
      </div>

      {/* ── Step content (animated) ── */}
      <div style={{ padding: '24px 26px 22px', overflowY: 'auto', flex: 1 }}>
        <div
          key={animKey}
          style={{
            animation: `${slideDir === 'right' ? 'slideInRight' : 'slideInLeft'} 0.32s cubic-bezier(0.25,0.46,0.45,0.94)`,
            display: 'flex', flexDirection: 'column', gap: 20,
          }}
        >

          {/* ════ STEP 1 — SITE ════ */}
          {wizardStep === 1 && (
            <>
              {emplacements.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: C.textMuted,
                  background: C.bg2, borderRadius: 18, border: `2px dashed ${C.border}` }}>
                  <MapPin size={36} style={{ opacity: .3, display: 'block', margin: '0 auto 12px' }}/>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Aucun site créé</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Créez d'abord un emplacement dans l'onglet «&nbsp;Sites GIS&nbsp;».
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
                  {emplacements.map(e => {
                    const sel = String(form.apiary_id) === String(e.id);
                    return (
                      <button key={e.id} onClick={() => setForm(f => ({ ...f, apiary_id: e.id }))}
                        style={{
                          padding: '18px 12px', borderRadius: 18, cursor: 'pointer',
                          border: `2px solid ${sel ? C.accent : C.border}`,
                          background: sel ? `${C.accent}12` : C.bg2,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                          transition: 'all .18s', boxShadow: sel ? `0 0 20px ${C.accent}20` : 'none',
                          position: 'relative',
                        }}>
                        {sel && (
                          <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20,
                            borderRadius: '50%', background: C.accent,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={11} color="#fff"/>
                          </div>
                        )}
                        <div style={{ width: 44, height: 44, borderRadius: 12,
                          background: sel ? `${C.accent}20` : C.border + '40',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                          📍
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 12, color: sel ? C.accent : C.text,
                          textAlign: 'center', lineHeight: 1.3 }}>{e.name}</div>
                        {e.latitude && (
                          <div style={{ fontSize: 9, color: C.textMuted, textAlign: 'center' }}>GPS ✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <NavRow
                onNext={() => { if (!form.apiary_id) { toast('Choisissez un site', 'warning'); return; } next(); }}
                nextDisabled={!form.apiary_id}
              />
            </>
          )}

          {/* ════ STEP 2 — IDENTITÉ ════ */}
          {wizardStep === 2 && (
            <>
              {/* Date */}
              <div>
                <FieldLabel icon={<Calendar size={13} color={C.accent}/>} label="Date d'enregistrement" />
                <input type="date"
                  value={form.date || new Date().toISOString().slice(0, 10)}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={iSt}
                />
              </div>

              {/* Numéro Ruche */}
              <div>
                <FieldLabel icon={<Hash size={13} color={C.accent}/>} label="Numéro Ruche (identifiant) *" />
                <input
                  autoFocus
                  placeholder="Ex : R-01, Ruche Grombalia, A3…"
                  value={form.identifier || ''}
                  onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                  style={iSt}
                />
                <Hint>Identifiant unique dans votre rucher</Hint>
              </div>

              {/* Type Ruche */}
              <div>
                <FieldLabel icon={<Hexagon size={13} color={C.accent}/>} label="Type de ruche" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8 }}>
                  {HIVE_TYPES.map(ht => {
                    const sel = form.hive_type === ht.label;
                    return (
                      <button key={ht.label}
                        onClick={() => setForm(f => ({ ...f, hive_type: ht.label,
                          has_queen: ht.label === 'queen_bank' ? true : f.has_queen }))}
                        style={{
                          padding: '10px 6px', borderRadius: 12, cursor: 'pointer',
                          border: `2px solid ${sel ? C.accent : C.border}`,
                          background: sel ? `${C.accent}12` : C.bg2,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                          transition: 'all .15s', position: 'relative',
                          boxShadow: sel ? `0 0 14px ${C.accent}20` : 'none',
                        }}>
                        {sel && (
                          <div style={{ position: 'absolute', top: 5, right: 5, width: 14, height: 14,
                            borderRadius: '50%', background: C.accent,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={8} color="#fff"/>
                          </div>
                        )}
                        <span style={{ fontSize: 22 }}>{ht.emoji}</span>
                        <span style={{ fontWeight: 800, fontSize: 9, color: sel ? C.accent : C.text,
                          textAlign: 'center', lineHeight: 1.2 }}>{ht.display || ht.label}</span>
                        <span style={{ fontSize: 8, color: C.textMuted, textAlign: 'center' }}>{ht.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <NavRow onPrev={prev} onNext={() => {
                if (!form.identifier?.trim()) { toast('Numéro de ruche requis', 'warning'); return; }
                next();
              }} />
            </>
          )}

          {/* ════ STEP 3 — REINE & COUVAIN ════ */}
          {wizardStep === 3 && (
            <>
              {form.hive_type === 'queen_bank' ? (
                /* Queen bank — just count */
                <div style={{ textAlign: 'center', padding: '24px 16px',
                  background: `${C.accent}08`, borderRadius: 20, border: `1px solid ${C.accent}25` }}>
                  <span style={{ fontSize: 52, display: 'block', marginBottom: 12 }}>👑</span>
                  <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 6 }}>
                    Stock initial de reines
                  </div>
                  <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
                    Nombre de reines dans la banque
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <StepBtn onClick={() => setForm(f => ({ ...f, queen_count: Math.max(0, (f.queen_count||0) - 1) }))} label="−" />
                    <div style={{ fontSize: 52, fontWeight: 900, color: C.accent, minWidth: 70, textAlign: 'center' }}>
                      {form.queen_count || 0}
                    </div>
                    <StepBtn onClick={() => setForm(f => ({ ...f, queen_count: Math.min(99, (f.queen_count||0) + 1) }))} label="+" />
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10 }}>reines disponibles</div>
                </div>
              ) : (
                <>
                  {/* Reine */}
                  <YesNoToggle
                    label="👑 Reine (Oui / Non)"
                    value={form.has_queen}
                    onChange={v => setForm(f => ({ ...f, has_queen: v }))}
                    yesIcon="👑" noIcon="✗"
                    description="La présence d'une reine active est le critère de santé le plus important."
                  />

                  {form.has_queen && (
                    <div>
                      <FieldLabel label="Année d'introduction de la reine" />
                      <input type="number" min="2018" max={new Date().getFullYear()}
                        value={form.queen_year || new Date().getFullYear()}
                        onChange={e => setForm(f => ({ ...f, queen_year: parseInt(e.target.value) || f.queen_year }))}
                        style={iSt}/>
                      <Hint>
                        Âge : {new Date().getFullYear() - (form.queen_year || new Date().getFullYear())} an(s)
                        {(new Date().getFullYear() - (form.queen_year || new Date().getFullYear())) >= 3 &&
                          ' · ⚠ Remplacement recommandé (>3 ans)'}
                      </Hint>
                    </div>
                  )}

                  {/* Oeufs */}
                  <YesNoToggle
                    label="🥚 Oeufs (Oui / Non)"
                    value={form.has_eggs}
                    onChange={v => setForm(f => ({ ...f, has_eggs: v }))}
                    yesIcon="🥚" noIcon="—"
                    description="La présence d'œufs prouve une ponte active dans les 3 derniers jours."
                  />

                  {/* Couvain */}
                  <YesNoToggle
                    label="🐛 Couvain (Oui / Non)"
                    value={form.has_brood}
                    onChange={v => setForm(f => ({ ...f, has_brood: v }))}
                    yesIcon="🐛" noIcon="—"
                    yesColor="#d97706"
                    description="Couvain operculé ou larvaire — indique un cycle reproductif sain."
                  />

                  {/* Pente */}
                  <YesNoToggle
                    label="📐 Pente en règle (3–5° vers l'entrée)"
                    value={form.pente_ok}
                    onChange={v => setForm(f => ({ ...f, pente_ok: v }))}
                    yesIcon="✓" noIcon="✗"
                    description="Une légère inclinaison vers l'entrée assure le drainage de l'eau et l'évacuation des abeilles mortes."
                  />
                </>
              )}

              <NavRow onPrev={prev} onNext={next} />
            </>
          )}

          {/* ════ STEP 4 — RESSOURCES ════ */}
          {wizardStep === 4 && (
            <>
              <div style={{ padding: '12px 16px', borderRadius: 12,
                background: `${C.accent}08`, border: `1px solid ${C.accent}20`,
                fontSize: 12, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={14} color={C.accent}/>
                Évaluez chaque ressource sur une échelle Faible / Moyen / Fort
              </div>

              <TrilevelSelector
                label="Population" emoji="🐝"
                value={form.population || 'Moyen'}
                onChange={v => setForm(f => ({ ...f, population: v }))}
              />

              <TrilevelSelector
                label="Miel" emoji="🍯"
                value={form.honey_str || 'Moyen'}
                onChange={v => setForm(f => ({ ...f, honey_str: v }))}
              />

              <TrilevelSelector
                label="Pollen" emoji="🌸"
                value={form.pollen || 'Moyen'}
                onChange={v => setForm(f => ({ ...f, pollen: v }))}
              />

              <NavRow onPrev={prev} onNext={next} />
            </>
          )}

          {/* ════ STEP 5 — CADRES & OBSERVATIONS ════ */}
          {wizardStep === 5 && (
            <>
              {/* Nb_Cadres */}
              <div>
                <FieldLabel label="🖼️ Nombre de cadres (Nb_Cadres)" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <StepBtn onClick={() => setForm(f => ({ ...f, nb_cadres: Math.max(0, (f.nb_cadres ?? 10) - 1) }))} label="−" />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: C.accent,
                      lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {form.nb_cadres ?? 10}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                      cadres
                      {(form.nb_cadres ?? 10) >= 8 ? ' · 🟢 Optimal' :
                       (form.nb_cadres ?? 10) >= 5 ? ' · 🟡 Correct' : ' · 🔴 Insuffisant'}
                    </div>
                  </div>
                  <StepBtn onClick={() => setForm(f => ({ ...f, nb_cadres: Math.min(30, (f.nb_cadres ?? 10) + 1) }))} label="+" />
                </div>

                {/* Quick presets */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {[5, 8, 10, 12, 15, 20].map(n => (
                    <button key={n} onClick={() => setForm(f => ({ ...f, nb_cadres: n }))}
                      style={{
                        padding: '5px 14px', borderRadius: 99,
                        border: `1.5px solid ${(form.nb_cadres ?? 10) === n ? C.accent : C.border}`,
                        background: (form.nb_cadres ?? 10) === n ? `${C.accent}15` : C.bg2,
                        color: (form.nb_cadres ?? 10) === n ? C.accent : C.textMuted,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                      }}>{n}</button>
                  ))}
                </div>
              </div>

              {/* Action_Observation */}
              <div>
                <FieldLabel label="📝 Action / Observation" />
                <textarea
                  value={form.action_observation || ''}
                  onChange={e => setForm(f => ({ ...f, action_observation: e.target.value }))}
                  placeholder="Ex : Traitement Apivar posé · Nourrissement sucre · Reine marquée bleue · Couvain sain · Essaimage suspect…"
                  rows={5}
                  style={{
                    ...iSt, height: 'auto', padding: '12px 16px',
                    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
                  }}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                <Hint>Actions effectuées, observations, anomalies — traçabilité COLOSS</Hint>
              </div>

              <NavRow onPrev={prev} onNext={next} />
            </>
          )}

          {/* ════ STEP 6 — DIAGNOSTIC SANTÉ ════ */}
          {wizardStep === 6 && diagnostic && (
            <>
              {/* Global score banner */}
              <div style={{
                padding: '20px 22px', borderRadius: 20,
                background: diagnostic.statusBg,
                border: `2px solid ${diagnostic.statusColor}40`,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{diagnostic.statusEmoji}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: diagnostic.statusColor }}>
                  {diagnostic.status}
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 12,
                    background: 'rgba(255,255,255,0.7)', borderRadius: 50, padding: '6px 18px',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: diagnostic.statusColor }}>
                      {diagnostic.passed}<span style={{ fontSize: 14, color: C.textMuted }}>/{diagnostic.total}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>critères validés</div>
                    {/* Score bar */}
                    <div style={{ width: 80, height: 8, borderRadius: 99, background: `${diagnostic.statusColor}20`, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${diagnostic.pct}%`,
                        background: diagnostic.statusColor, borderRadius: 99,
                        transition: 'width .6s ease',
                      }}/>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: diagnostic.statusColor }}>{diagnostic.pct}%</div>
                  </div>
                </div>
              </div>

              {/* Criteria checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {diagnostic.checks.map(c => (
                  <div key={c.key} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 14px', borderRadius: 14,
                    background: c.ok ? '#f0fdf4' : c.critical ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${c.ok ? '#bbf7d0' : c.critical ? '#fecaca' : '#fde68a'}`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: c.ok ? '#059669' : c.critical ? '#ef4444' : '#f59e0b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                    }}>
                      {c.ok
                        ? <Check size={14} color="#fff"/>
                        : c.critical
                          ? <AlertTriangle size={12} color="#fff"/>
                          : <span style={{ fontSize: 11, color: '#fff', fontWeight: 900 }}>!</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800,
                        color: c.ok ? '#059669' : c.critical ? '#dc2626' : '#d97706' }}>
                        {c.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>
                        {c.ok ? c.ok_desc : c.ko_desc}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                      background: c.ok ? '#dcfce7' : c.critical ? '#fee2e2' : '#fef3c7',
                      color: c.ok ? '#059669' : c.critical ? '#dc2626' : '#d97706',
                      flexShrink: 0,
                    }}>
                      {c.ok ? '✓' : c.critical ? 'CRITIQUE' : 'AVERT.'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div style={{ padding: '14px 18px', borderRadius: 16,
                background: C.bg2, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted,
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={12} color={C.accent}/> Récapitulatif
                </div>
                <SummaryGrid form={form} emplName={emplName} diagnostic={diagnostic}/>
              </div>

              {/* Nav + create */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={prev}
                  style={{ height: 54, padding: '0 20px', borderRadius: 16, cursor: 'pointer',
                    border: `1px solid ${C.border}`, background: C.bg2,
                    color: C.textMuted, fontWeight: 700, fontSize: 14,
                    display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowLeft size={15}/> Retour
                </button>
                <button onClick={handleSubmit}
                  style={{ flex: 1, height: 54, borderRadius: 16, cursor: 'pointer',
                    background: `linear-gradient(135deg, ${C.success}, #065F46)`,
                    border: 'none', color: 'white', fontWeight: 900, fontSize: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: `0 8px 28px ${C.success}30` }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#fff"/>
                  </div>
                  {form.hive_type === 'queen_bank' ? '✓ Créer la Banque de Reines' : '✓ Créer la Ruche'}
                </button>
              </div>
            </>
          )}

          {/* ════ STEP 7 — SUCCÈS + QR CODE ════ */}
          {wizardStep === 7 && (
            <>
              {/* Success banner */}
              <div style={{
                padding: '24px 20px', borderRadius: 20, textAlign: 'center',
                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                border: '2px solid #86efac',
              }}>
                <div style={{ fontSize: 52, marginBottom: 10 }}>🎉</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#059669', marginBottom: 6 }}>
                  Ruche créée avec succès !
                </div>
                <div style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                  {createdHive?.identifier || form.identifier}
                  {' · '}{HIVE_TYPES.find(t => t.label === form.hive_type)?.display || form.hive_type}
                </div>
              </div>

              {/* QR Code block */}
              <div style={{
                borderRadius: 20, border: `2px solid ${C.borderHigh}`,
                overflow: 'hidden', background: C.surface,
              }}>
                {/* Header */}
                <div style={{
                  padding: '14px 18px', borderBottom: `1px solid ${C.border}`,
                  background: `linear-gradient(135deg, ${C.accent}0d, transparent)`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${C.accent}20`, border: `1px solid ${C.accent}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <QrCode size={18} color={C.accent}/>
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: C.text }}>
                      QR Code unique — Ruche {createdHive?.identifier || form.identifier}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                      Scannez pour accéder à la fiche · ID #{createdHive?.id}
                    </div>
                  </div>
                </div>

                {/* QR Image */}
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  {qrLoading ? (
                    <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 48, height: 48, border: `4px solid ${C.accent}30`,
                        borderTopColor: C.accent, borderRadius: '50%',
                        animation: 'qrspin .7s linear infinite',
                      }}/>
                      <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>
                        Génération du QR code…
                      </div>
                      <style>{`@keyframes qrspin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                  ) : qrDataUrl ? (
                    <>
                      <div style={{
                        display: 'inline-block', padding: 12,
                        background: '#fff', borderRadius: 16,
                        border: `2px solid ${C.border}`,
                        boxShadow: `0 8px 32px ${C.accent}15`,
                        marginBottom: 14,
                      }}>
                        <img
                          src={qrDataUrl}
                          alt={`QR Code ${createdHive?.identifier}`}
                          style={{ width: 200, height: 200, display: 'block' }}
                        />
                      </div>
                      {/* Hive label below QR */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '6px 16px', borderRadius: 99,
                        background: `${C.accent}12`, border: `1px solid ${C.accent}30`,
                      }}>
                        <span style={{ fontSize: 14 }}>🐝</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.accent, letterSpacing: '1px' }}>
                          {createdHive?.identifier || form.identifier}
                        </span>
                        <span style={{ fontSize: 11, color: C.textMuted }}>
                          · {HIVE_TYPES.find(t => t.label === form.hive_type)?.display || form.hive_type}
                        </span>
                      </div>

                      {/* Usage tip */}
                      <div style={{
                        marginTop: 14, padding: '10px 14px', borderRadius: 12,
                        background: `${C.accent}08`, border: `1px solid ${C.accent}20`,
                        fontSize: 11, color: C.textMuted, lineHeight: 1.5,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <Info size={13} color={C.accent} style={{ flexShrink: 0 }}/>
                        Collez ce QR sur la ruche · Scannez sur le terrain pour accéder à la fiche en mode offline
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '30px 0', color: C.textMuted, fontSize: 13 }}>
                      QR code non disponible — consultez la liste des ruches.
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {qrDataUrl && (
                  <div style={{
                    padding: '0 16px 16px', display: 'flex', gap: 10, flexWrap: 'wrap',
                  }}>
                    <a
                      href={qrDataUrl}
                      download={`QR-${createdHive?.identifier || form.identifier}.png`}
                      style={{
                        flex: 1, height: 46, borderRadius: 14,
                        background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
                        color: 'white', fontWeight: 800, fontSize: 14, textDecoration: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: `0 4px 16px ${C.accent}30`,
                      }}
                    >
                      <Download size={16}/> Télécharger PNG
                    </a>
                    <button
                      onClick={() => {
                        const hiveLabel  = createdHive?.identifier || form.identifier;
                        const hiveTypeLbl = HIVE_TYPES.find(t => t.label === form.hive_type)?.display || form.hive_type;
                        const html = `<!DOCTYPE html><html><head><title>QR ${hiveLabel}</title>
                          <style>
                            body{margin:0;display:flex;flex-direction:column;align-items:center;
                              justify-content:center;min-height:100vh;font-family:sans-serif;background:#fefefe;}
                            h2{color:#d97706;margin-bottom:8px;font-size:18px;}
                            p{color:#6b7280;font-size:13px;margin:4px 0;}
                          </style>
                        </head><body>
                          <img src="${qrDataUrl}" style="width:240px;height:240px;border:2px solid #e5e7eb;border-radius:12px;padding:8px;" />
                          <h2 style="margin-top:16px;">${hiveLabel}</h2>
                          <p>${hiveTypeLbl} · Smart Farm AI</p>
                          <p style="font-size:11px;color:#9ca3af;">ID #${createdHive?.id}</p>
                        </body></html>`;
                        const blob = new Blob([html], { type: 'text/html' });
                        const url  = URL.createObjectURL(blob);
                        const w    = window.open(url, '_blank');
                        w?.addEventListener('load', () => { w.print(); URL.revokeObjectURL(url); });
                      }}
                      style={{
                        height: 46, padding: '0 18px', borderRadius: 14,
                        border: `1.5px solid ${C.border}`, background: C.bg2,
                        color: C.textMuted, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 7,
                      }}
                    >
                      <Printer size={15}/> Imprimer
                    </button>
                  </div>
                )}
              </div>

              {/* Close */}
              <button
                onClick={handleClose}
                style={{
                  width: '100%', height: 52, borderRadius: 16, cursor: 'pointer',
                  border: `1.5px solid ${C.border}`, background: C.bg2,
                  color: C.textMuted, fontWeight: 700, fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <X size={16}/> Fermer et retourner à l'inventaire
              </button>
            </>
          )}

        </div>{/* animated div */}
      </div>{/* scrollable body */}
    </div>
  );
}

/* ── Shared small components ── */
function FieldLabel({ icon, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8,
      fontSize: 11, fontWeight: 800, color: COLORS.textMuted,
      textTransform: 'uppercase', letterSpacing: 1 }}>
      {icon}<span>{label}</span>
    </label>
  );
}

function Hint({ children }) {
  return (
    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 5, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function StepBtn({ onClick, label }) {
  return (
    <button onClick={onClick}
      style={{ width: 44, height: 44, borderRadius: '50%',
        border: `1px solid ${COLORS.border}`, background: COLORS.bg2,
        cursor: 'pointer', fontWeight: 900, fontSize: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: COLORS.accent, transition: 'all .15s', touchAction: 'manipulation',
      }}>
      {label}
    </button>
  );
}

function NavRow({ onPrev, onNext, nextDisabled = false }) {
  return (
    <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
      {onPrev && (
        <button onClick={onPrev}
          style={{ height: 50, padding: '0 20px', borderRadius: 14, cursor: 'pointer',
            border: `1px solid ${COLORS.border}`, background: COLORS.bg2,
            color: COLORS.textMuted, fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={15}/> Retour
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        style={{ flex: 1, height: 50, borderRadius: 14,
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          background: nextDisabled
            ? COLORS.border
            : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
          border: 'none',
          color: nextDisabled ? COLORS.textMuted : 'white',
          fontWeight: 800, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        Suivant <ArrowRight size={15}/>
      </button>
    </div>
  );
}

function SummaryGrid({ form, emplName, diagnostic }) {
  const rows = [
    { l: 'Date',        v: form.date || '—' },
    { l: 'N° Ruche',    v: form.identifier || '—' },
    { l: 'Type',        v: HIVE_TYPES.find(t => t.label === form.hive_type)?.display || form.hive_type },
    { l: 'Site',        v: emplName },
    { l: 'Reine',       v: form.has_queen ? 'Oui' : 'Non',
      c: form.has_queen ? COLORS.success : '#ef4444' },
    { l: 'Œufs',        v: form.has_eggs  ? 'Oui' : 'Non' },
    { l: 'Couvain',     v: form.has_brood ? 'Oui' : 'Non' },
    { l: 'Population',  v: form.population || '—' },
    { l: 'Miel',        v: form.honey_str  || '—' },
    { l: 'Pollen',      v: form.pollen     || '—' },
    { l: 'Nb. Cadres',  v: String(form.nb_cadres ?? 10) },
    { l: 'Santé (calc.)', v: `${diagnostic.health_score}/10`,
      c: diagnostic.statusColor },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
      {rows.map(row => (
        <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between',
          padding: '5px 0', borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{row.l}</span>
          <span style={{ fontWeight: 700, fontSize: 12, color: row.c || COLORS.text }}>{row.v}</span>
        </div>
      ))}
    </div>
  );
}
