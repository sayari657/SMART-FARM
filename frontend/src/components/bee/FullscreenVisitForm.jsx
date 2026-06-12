/**
 * FullscreenVisitForm
 * One field per screen, slide animation, arrow navigation.
 * Architecture: GESTION RUCHER FINAL.xlsx
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft, ArrowRight, Check, Camera, Upload,
  Trash2, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { COLORS } from './BeeConstants';

/* ─── inject slide keyframes once ─────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('__visitSlide')) {
  const s = document.createElement('style');
  s.id = '__visitSlide';
  s.textContent = `
    @keyframes slideFromRight { from { transform:translateX(100%); opacity:0 } to { transform:translateX(0); opacity:1 } }
    @keyframes slideFromLeft  { from { transform:translateX(-100%); opacity:0 } to { transform:translateX(0); opacity:1 } }
    @keyframes slideToLeft    { from { transform:translateX(0); opacity:1 } to { transform:translateX(-100%); opacity:0 } }
    @keyframes slideToRight   { from { transform:translateX(0); opacity:1 } to { transform:translateX(100%); opacity:0 } }
    @keyframes popIn { from { transform:scale(.85); opacity:0 } to { transform:scale(1); opacity:1 } }
    @keyframes visitSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  `;
  document.head.appendChild(s);
}

/* ─── step definitions ─────────────────────────────────────────── */
const STEPS = [
  {
    id: 'type_ruche', emoji: '🏠',
    question: 'Type de ruche',
    subtitle: 'Quelle est la nature de cette ruche ?',
    type: 'choice',
    options: [
      { id: 'MERE',    label: 'Mère',    emoji: '👑', color: COLORS.accent },
      { id: 'POUSSIN', label: 'Poussin', emoji: '🐣', color: COLORS.info },
      { id: 'VIDE',    label: 'Vide',    emoji: '⬜', color: COLORS.textMuted },
      { id: 'MORTE',   label: 'Morte',   emoji: '💀', color: COLORS.error },
    ],
  },
  {
    id: 'reine', emoji: '👑',
    question: 'Reine présente ?',
    subtitle: 'Avez-vous observé la reine dans la ruche ?',
    type: 'yesno',
  },
  {
    id: 'oeufs', emoji: '🥚',
    question: 'Œufs présents ?',
    subtitle: 'Présence d\'œufs dans les cadres ?',
    type: 'yesno',
  },
  {
    id: 'couvain', emoji: '🐛',
    question: 'Couvain présent ?',
    subtitle: 'Couvain operculé ou non operculé visible ?',
    type: 'yesno',
  },
  {
    id: 'nb_cadres', emoji: '🪵',
    question: 'Nombre de cadres',
    subtitle: 'Cadres occupés par les abeilles',
    type: 'number',
    placeholder: '7',
    hint: 'ex: 7, 7+2 CIRE, 10 C',
  },
  {
    id: 'population', emoji: '🐝',
    question: 'Population',
    subtitle: 'Densité de la colonie observée',
    type: 'level',
  },
  {
    id: 'honey_level', emoji: '🍯',
    question: 'Niveau de miel',
    subtitle: 'Réserves de miel dans les cadres',
    type: 'level',
  },
  {
    id: 'pollen_level', emoji: '🌼',
    question: 'Niveau de pollen',
    subtitle: 'Présence de pollen dans les cadres',
    type: 'level',
  },
  {
    id: 'health_state', emoji: '❤️',
    question: 'État de santé',
    subtitle: 'Évaluation globale de la colonie',
    type: 'health',
    options: [
      { id: 'health',    label: 'Bonne santé',     emoji: '💚', color: COLORS.success },
      { id: 'warning',   label: 'À surveiller',    emoji: '🟡', color: COLORS.honey },
      { id: 'urgent',    label: 'Urgent',           emoji: '🔴', color: COLORS.error },
      { id: 'treatment', label: 'Traitement requis',emoji: '💊', color: COLORS.info },
    ],
  },
  {
    id: 'notes', emoji: '📝',
    question: 'Observations & Actions',
    subtitle: 'RAS · Division · Blocs reines · Hausse · Traitement varroa…',
    type: 'notes_photo',
  },
];

const LEVELS = [
  { id: 'FAIBLE', emoji: '🔴', label: 'Faible', color: '#ef4444' },
  { id: 'MOYEN',  emoji: '🟡', label: 'Moyen',  color: '#f59e0b' },
  { id: 'FORT',   emoji: '🟢', label: 'Fort',   color: '#22c55e' },
];

const EMPTY = () => ({
  visit_date:   new Date().toISOString().split('T')[0],
  type_ruche:   null,
  reine:        null,
  oeufs:        null,
  couvain:      null,
  nb_cadres:    null,
  population:   null,
  honey_level:  'Moyen',
  pollen_level: null,
  health_state: 'health',
  notes:        null,
  photo_url:    null,
  gps_coords:   null,
  needs_sirop: 0, needs_pate: 0, needs_traitement: 0,
  harvest_kg: 0,  pollen_kg: 0,  temperature: null,
});

/* ─── StepSlide wrapper ──────────────────────────────────────────── */
function StepSlide({ stepKey, dir, children }) {
  const anim = dir === 'forward' ? 'slideFromRight' : 'slideFromLeft';
  return (
    <div key={stepKey} style={{
      animation: `${anim} 0.32s cubic-bezier(.4,0,.2,1) both`,
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  );
}

/* ─── Visitor field ─────────────────────────────────────────────── */
function VisitorField({ name, role, onNameChange, onRoleChange }) {
  const roles = [
    { id: 'owner',   label: 'Propriétaire', emoji: '🧑‍🌾', color: COLORS.accent },
    { id: 'ouvrier', label: 'Ouvrier',       emoji: '👷',   color: COLORS.info },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%', maxWidth: 480 }}>
      {/* Name input */}
      <div style={{ width: '100%' }}>
        <input
          autoFocus
          value={name || ''}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Prénom et nom…"
          style={{
            width: '100%', height: 60, borderRadius: 18,
            border: `2px solid ${name ? COLORS.accent : COLORS.border}`,
            background: COLORS.surface, color: COLORS.text,
            fontSize: 20, fontWeight: 700, textAlign: 'center',
            outline: 'none', padding: '0 20px',
            transition: 'border-color .2s',
          }}
        />
      </div>
      {/* Role buttons */}
      <div style={{ display: 'flex', gap: 16, width: '100%' }}>
        {roles.map(r => {
          const sel = role === r.id;
          return (
            <button key={r.id} onClick={() => onRoleChange(r.id)}
              style={{
                flex: 1, padding: '24px 16px', borderRadius: 20, cursor: 'pointer',
                border: sel ? `3px solid ${r.color}` : `2px solid ${COLORS.border}`,
                background: sel ? r.color + '18' : COLORS.surface,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                transition: 'all .15s',
                boxShadow: sel ? `0 0 28px ${r.color}30` : '0 2px 8px rgba(0,0,0,.06)',
                animation: sel ? 'popIn .18s ease both' : 'none',
              }}>
              <span style={{ fontSize: 36, lineHeight: 1 }}>{r.emoji}</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: sel ? r.color : COLORS.text }}>
                {r.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Choice field (type_ruche, health_state) ─────────────────── */
function ChoiceField({ options, value, onChange }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(options.length, 2)}, 1fr)`,
      gap: 16, width: '100%', maxWidth: 520,
    }}>
      {options.map(opt => {
        const sel = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)}
            style={{
              padding: '28px 20px', borderRadius: 22, cursor: 'pointer',
              border: sel ? `3px solid ${opt.color}` : `2px solid ${COLORS.border}`,
              background: sel ? opt.color + '18' : COLORS.surface,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              transition: 'all .15s',
              boxShadow: sel ? `0 0 32px ${opt.color}30` : '0 2px 8px rgba(0,0,0,.06)',
              animation: sel ? 'popIn .18s ease both' : 'none',
            }}>
            <span style={{ fontSize: 42, lineHeight: 1 }}>{opt.emoji}</span>
            <span style={{
              fontSize: 15, fontWeight: 900, letterSpacing: '.3px',
              color: sel ? opt.color : COLORS.text,
            }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Yes / No field ─────────────────────────────────────────────── */
function YesNoField({ value, onChange }) {
  const opts = [
    { v: true,  label: 'OUI', emoji: '✅', color: COLORS.success },
    { v: false, label: 'NON', emoji: '❌', color: COLORS.error },
  ];
  return (
    <div style={{ display: 'flex', gap: 24, width: '100%', maxWidth: 480 }}>
      {opts.map(o => {
        const sel = value === o.v;
        return (
          <button key={String(o.v)} onClick={() => onChange(o.v)}
            style={{
              flex: 1, padding: '36px 20px', borderRadius: 24, cursor: 'pointer',
              border: sel ? `3px solid ${o.color}` : `2px solid ${COLORS.border}`,
              background: sel ? o.color + '18' : COLORS.surface,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              transition: 'all .15s',
              boxShadow: sel ? `0 0 40px ${o.color}30` : '0 2px 8px rgba(0,0,0,.06)',
              animation: sel ? 'popIn .18s ease both' : 'none',
            }}>
            <span style={{ fontSize: 52, lineHeight: 1 }}>{o.emoji}</span>
            <span style={{
              fontSize: 22, fontWeight: 900,
              color: sel ? o.color : COLORS.text,
            }}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Level field (FAIBLE / MOYEN / FORT) ───────────────────────── */
function LevelField({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 480 }}>
      {LEVELS.map(lvl => {
        const sel = value === lvl.id;
        return (
          <button key={lvl.id} onClick={() => onChange(lvl.id)}
            style={{
              height: 72, borderRadius: 18, cursor: 'pointer',
              border: sel ? `3px solid ${lvl.color}` : `2px solid ${COLORS.border}`,
              background: sel ? lvl.color + '18' : COLORS.surface,
              display: 'flex', alignItems: 'center', gap: 20, padding: '0 28px',
              transition: 'all .15s',
              boxShadow: sel ? `0 0 32px ${lvl.color}30` : '0 2px 8px rgba(0,0,0,.06)',
              animation: sel ? 'popIn .18s ease both' : 'none',
            }}>
            <span style={{ fontSize: 32, lineHeight: 1 }}>{lvl.emoji}</span>
            <span style={{
              fontSize: 20, fontWeight: 900, letterSpacing: '.5px',
              color: sel ? lvl.color : COLORS.text,
            }}>{lvl.label.toUpperCase()}</span>
            {sel && <Check size={22} color={lvl.color} style={{ marginLeft: 'auto' }} />}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Number field (nb_cadres) ──────────────────────────────────── */
function NumberField({ value, onChange, placeholder, hint }) {
  const n = parseInt(value) || 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%', maxWidth: 360 }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button onClick={() => onChange(String(Math.max(0, n - 1)))}
          style={{
            width: 60, height: 60, borderRadius: 18,
            border: `2px solid ${COLORS.border}`, background: COLORS.surface,
            cursor: 'pointer', fontSize: 28, fontWeight: 900, color: COLORS.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,.06)',
          }}>−</button>
        <div style={{
          width: 120, height: 80, borderRadius: 20,
          border: `2px solid ${COLORS.accent}`,
          background: COLORS.accent + '0a',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: COLORS.accent }}>
            {value || '0'}
          </span>
        </div>
        <button onClick={() => onChange(String(n + 1))}
          style={{
            width: 60, height: 60, borderRadius: 18,
            border: `2px solid ${COLORS.border}`, background: COLORS.surface,
            cursor: 'pointer', fontSize: 28, fontWeight: 900, color: COLORS.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,.06)',
          }}>+</button>
      </div>
      {/* Free text input (for "7+2 CIRE", "10 C" etc.) */}
      <input
        value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', height: 52, borderRadius: 14,
          border: `2px solid ${COLORS.border}`,
          background: COLORS.surface, color: COLORS.text,
          textAlign: 'center', fontSize: 18, fontWeight: 700,
          outline: 'none', padding: '0 16px',
        }}
      />
      {hint && (
        <span style={{ fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' }}>{hint}</span>
      )}
    </div>
  );
}

/* ─── Notes + Photo field ──────────────────────────────────────── */
function NotesPhotoField({ notes, photoUrl, onNotesChange, onPhotoChange }) {
  const fileRef   = useRef(null);
  const nativRef  = useRef(null);
  const videoRef  = useRef(null);
  const [cam, setCam] = useState(false);

  const startCam = async () => {
    setCam(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { setCam(false); }
  };
  const snap = () => {
    const c = document.createElement('canvas');
    c.width  = videoRef.current.videoWidth;
    c.height = videoRef.current.videoHeight;
    c.getContext('2d').drawImage(videoRef.current, 0, 0);
    onPhotoChange(c.toDataURL('image/jpeg'));
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    setCam(false);
  };
  const stopCam = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    setCam(false);
  };
  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onloadend = () => onPhotoChange(r.result);
    r.readAsDataURL(f);
  };

  return (
    <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Textarea */}
      <textarea
        autoFocus
        value={notes} onChange={e => onNotesChange(e.target.value)}
        placeholder="RAS · Division · Blocs reines · Hausse · Traitement varroa…"
        style={{
          width: '100%', minHeight: 130,
          background: COLORS.surface,
          border: `2px solid ${notes ? COLORS.accent : COLORS.border}`,
          borderRadius: 18, padding: '16px 18px',
          color: COLORS.text, resize: 'none',
          lineHeight: 1.65, outline: 'none', fontSize: 15,
          fontFamily: 'inherit', transition: 'border-color .2s',
        }}
      />

      {/* Photo */}
      <input ref={fileRef}  type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      <input ref={nativRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />

      {cam ? (
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', height: 200, background: '#000' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 14 }}>
            <button onClick={snap} style={{ width: 56, height: 56, borderRadius: '50%', background: 'white', border: '4px solid rgba(255,255,255,.3)', cursor: 'pointer' }} />
            <button onClick={stopCam} style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(0,0,0,.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
          </div>
        </div>
      ) : photoUrl ? (
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', height: 180, border: `2px solid ${COLORS.border}` }}>
          <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button onClick={() => onPhotoChange('')} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: COLORS.error, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: '📷 Caméra',  action: () => nativRef.current?.click(), color: COLORS.accent },
            { label: '🎥 Webcam',  action: startCam,                         color: COLORS.info },
            { label: '🖼 Galerie', action: () => fileRef.current?.click(),   color: COLORS.success },
          ].map(b => (
            <button key={b.label} onClick={b.action}
              style={{
                flex: 1, height: 52, borderRadius: 14, cursor: 'pointer',
                border: `2px dashed ${b.color}40`,
                background: b.color + '08', color: b.color,
                fontWeight: 700, fontSize: 12,
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = b.color + '18'; e.currentTarget.style.borderColor = b.color; }}
              onMouseLeave={e => { e.currentTarget.style.background = b.color + '08'; e.currentTarget.style.borderColor = b.color + '40'; }}>
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function FullscreenVisitForm({ hive, apiary, onSubmit, onCancel }) {
  const { user } = useAuth();
  const [step,    setStep]    = useState(0);
  const [dir,     setDir]     = useState('forward');
  const [form,    setForm]    = useState(EMPTY());
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);
  const touchStartX = useRef(null);

  const total   = STEPS.length;
  const current = STEPS[step];
  const pct     = ((step) / (total - 1)) * 100;

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  /* navigation */
  const goTo = useCallback((nextStep, direction) => {
    if (nextStep < 0 || nextStep >= total) return;
    setDir(direction);
    setStep(nextStep);
  }, [total]);

  const next = useCallback(() => goTo(step + 1, 'forward'),  [step, goTo]);
  const prev = useCallback(() => goTo(step - 1, 'backward'), [step, goTo]);

  /* keyboard arrows */
  useEffect(() => {
    const handler = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev();
      if (e.key === 'Enter' && step === total - 1) handleSubmit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, next, prev]); // eslint-disable-line

  /* touch swipe */
  const onTouchStart = e => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = e => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) next();
    if (dx >  50) prev();
    touchStartX.current = null;
  };

  /* auto-advance after selection for radio-type fields */
  const autoAdvance = (field, val) => {
    set(field, val);
    if (step < total - 1) setTimeout(() => goTo(step + 1, 'forward'), 320);
  };

  /* submit */
  const handleSubmit = async () => {
    setSaving(true);
    const payload = {
      ...form,
      hive_id:      hive.id,
      apiary_id:    hive.apiary_id,
      health_state: form.health_state || 'health',
      nb_cadres:    form.nb_cadres    || null,
      notes:        form.notes        || null,
      photo_url:    form.photo_url    || null,
      gps_coords:   form.gps_coords   || null,
      temperature:  form.temperature  ? parseFloat(form.temperature) : null,
      visited_by:   user?.full_name || user?.username || null,
      visitor_role: user?.role === 'worker' ? 'ouvrier' : user?.role || null,
    };
    const ok = await onSubmit(payload);
    setSaving(false);
    if (!ok) return;
    setDone(true);
    setForm(EMPTY());
    setTimeout(() => { setDone(false); setStep(0); }, 2000);
  };

  const isLast = step === total - 1;

  /* ── render current step content ── */
  const renderField = () => {
    const { id, type, options, placeholder, hint } = current;

    if (type === 'choice')
      return <ChoiceField options={options} value={form[id]} onChange={v => autoAdvance(id, v)} />;

    if (type === 'yesno')
      return <YesNoField value={form[id]} onChange={v => autoAdvance(id, v)} />;

    if (type === 'level')
      return <LevelField value={form[id]} onChange={v => autoAdvance(id, v)} />;

    if (type === 'health')
      return <ChoiceField options={options} value={form[id]} onChange={v => autoAdvance(id, v)} />;

    if (type === 'number')
      return <NumberField value={form[id]} onChange={v => set(id, v)} placeholder={placeholder} hint={hint} />;

    if (type === 'notes_photo')
      return (
        <NotesPhotoField
          notes={form.notes}
          photoUrl={form.photo_url}
          onNotesChange={v => set('notes', v)}
          onPhotoChange={v => set('photo_url', v)}
        />
      );

    return null;
  };

  /* ── done flash ── */
  if (done) return (
    <div style={{
      width: '100%', minHeight: 480,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: COLORS.surface, borderRadius: 24, gap: 20,
      animation: 'popIn .3s ease both',
    }}>
      <div style={{ fontSize: 72 }}>✅</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.success }}>Visite enregistrée !</div>
      <div style={{ fontSize: 14, color: COLORS.textMuted }}>{hive.identifier}</div>
    </div>
  );

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        width: '100%',
        background: COLORS.surface,
        border: `1px solid ${COLORS.borderHigh}`,
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(0,0,0,.10)',
        userSelect: 'none',
      }}
    >
      {/* ═══ TOP BAR ════════════════════════════════════════════════ */}
      <div style={{
        padding: '16px 24px',
        background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Hive ID */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🐝</div>
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{hive.identifier}</div>
            {apiary && <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11 }}>📍 {apiary.name}</div>}
          </div>
        </div>
        {/* Step counter + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="date" value={form.visit_date}
            onChange={e => set('visit_date', e.target.value)}
            style={{
              background: 'rgba(255,255,255,.15)', border: 'none',
              borderRadius: 8, padding: '5px 10px',
              color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', outline: 'none',
            }} />
          <span style={{
            background: 'rgba(255,255,255,.2)', borderRadius: 8,
            padding: '5px 12px', color: 'white', fontWeight: 800, fontSize: 13,
          }}>
            {step + 1} / {total}
          </span>
          {onCancel && (
            <button onClick={onCancel} style={{
              background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ═══ PROGRESS BAR ══════════════════════════════════════════ */}
      <div style={{ height: 4, background: COLORS.border, position: 'relative' }}>
        <div style={{
          height: '100%', background: COLORS.accent,
          width: `${pct}%`,
          transition: 'width .35s cubic-bezier(.4,0,.2,1)',
        }} />
        {/* Step dots */}
        <div style={{
          position: 'absolute', top: '50%', transform: 'translateY(-50%)',
          left: 0, right: 0, display: 'flex', justifyContent: 'space-between',
          padding: '0 12px',
        }}>
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => goTo(i, i > step ? 'forward' : 'backward')}
              style={{
                width: i === step ? 20 : 8,
                height: 8, borderRadius: 4,
                background: i <= step ? COLORS.accent : COLORS.border,
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all .3s', flexShrink: 0,
              }} />
          ))}
        </div>
      </div>

      {/* ═══ STEP CONTENT ══════════════════════════════════════════ */}
      <div style={{
        minHeight: 420, padding: '40px 28px 28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        <StepSlide stepKey={`step-${step}`} dir={dir}>
          {/* Question header */}
          <div style={{ textAlign: 'center', marginBottom: 36, width: '100%' }}>
            <div style={{ fontSize: 48, marginBottom: 12, lineHeight: 1 }}>{current.emoji}</div>
            <h2 style={{
              fontSize: 26, fontWeight: 900, color: COLORS.text,
              margin: '0 0 10px', letterSpacing: '-.3px',
            }}>{current.question}</h2>
            <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>
              {current.subtitle}
            </p>
          </div>

          {/* Field */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {renderField()}
          </div>
        </StepSlide>
      </div>

      {/* ═══ NAVIGATION BAR ════════════════════════════════════════ */}
      <div style={{
        padding: '20px 28px',
        borderTop: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        {/* ← Précédent */}
        <button onClick={prev} disabled={step === 0}
          style={{
            height: 52, padding: '0 24px', borderRadius: 14, cursor: step === 0 ? 'not-allowed' : 'pointer',
            border: `2px solid ${COLORS.border}`,
            background: step === 0 ? 'rgba(0,0,0,.03)' : COLORS.surface,
            color: step === 0 ? COLORS.border : COLORS.text,
            fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all .15s',
            opacity: step === 0 ? 0.4 : 1,
          }}
          onMouseEnter={e => { if (step > 0) e.currentTarget.style.borderColor = COLORS.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}>
          <ChevronLeft size={18} /> Précédent
        </button>

        {/* Step label */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 700, letterSpacing: '1px' }}>
            CHAMP {step + 1} SUR {total}
          </div>
          <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 800, marginTop: 2 }}>
            {current.question}
          </div>
        </div>

        {/* → Suivant / ✓ Enregistrer */}
        {isLast ? (
          <button onClick={handleSubmit} disabled={saving}
            style={{
              height: 52, padding: '0 28px', borderRadius: 14, cursor: 'pointer',
              background: `linear-gradient(135deg,${COLORS.success},${COLORS.success}cc)`,
              border: 'none', color: 'white',
              fontWeight: 900, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: `0 4px 20px ${COLORS.success}40`,
              opacity: saving ? 0.7 : 1,
            }}>
            {saving
              ? <span style={{ animation: 'visitSpin 1s linear infinite', display: 'inline-block', width: 18, height: 18, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
              : <Check size={18} />}
            Enregistrer
          </button>
        ) : (
          <button onClick={next}
            style={{
              height: 52, padding: '0 28px', borderRadius: 14, cursor: 'pointer',
              background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`,
              border: 'none', color: 'white',
              fontWeight: 800, fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: `0 4px 20px ${COLORS.accent}40`,
              transition: 'transform .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            Suivant <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
