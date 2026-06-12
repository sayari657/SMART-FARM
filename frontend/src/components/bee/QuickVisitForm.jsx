/**
 * QuickVisitForm — full-page visit form
 * Architecture mirrors GESTION RUCHER FINAL.xlsx:
 *   Date · Numero_Ruche · Type_Ruche · Reine · Oeufs · Couvain
 *   Population · Miel · Pollen · Nb_Cadres · Action_Observation (+ photo)
 */
import { useState, useRef } from 'react';
import {
  Calendar, Navigation, Camera, Upload, X, Trash2,
  CheckCircle, Loader, Hash
} from 'lucide-react';
import { COLORS } from './BeeConstants';

/* ─── constants ─────────────────────────────────────────────────── */
const LEVELS = ['FAIBLE', 'MOYEN', 'FORT'];
const LEVEL_C = { FAIBLE: '#ef4444', MOYEN: '#f59e0b', FORT: '#22c55e' };
const LEVEL_E = { FAIBLE: '🔴', MOYEN: '🟡', FORT: '🟢' };

const TYPE_RUCHE = [
  { id: 'MERE',    label: 'Mère',    emoji: '👑', color: COLORS.accent },
  { id: 'POUSSIN', label: 'Poussin', emoji: '🐣', color: COLORS.info },
  { id: 'VIDE',    label: 'Vide',    emoji: '⬜', color: COLORS.textMuted },
  { id: 'MORTE',   label: 'Morte',   emoji: '💀', color: COLORS.error },
];

const HEALTH = [
  { id: 'health',    label: 'Bonne santé',    emoji: '💚', color: COLORS.success },
  { id: 'warning',   label: 'À surveiller',   emoji: '🟡', color: COLORS.honey },
  { id: 'urgent',    label: 'Urgent',         emoji: '🔴', color: COLORS.error },
  { id: 'treatment', label: 'Traitement',     emoji: '💊', color: COLORS.info },
];

const EMPTY = () => ({
  visit_date:   new Date().toISOString().split('T')[0],
  type_ruche:   null,
  reine:        null,
  oeufs:        null,
  couvain:      null,
  nb_cadres:    '',
  population:   null,
  honey_level:  null,
  pollen_level: null,
  health_state: 'health',
  notes:        '',
  photo_url:    '',
  gps_coords:   '',
  needs_sirop:  0,
  needs_pate:   0,
  needs_traitement: 0,
  harvest_kg:   0,
  pollen_kg:    0,
  temperature:  '',
});

/* ─── tiny sub-components ────────────────────────────────────────── */

/* Section card */
function Card({ children, style }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.025)',
      border: `1px solid ${COLORS.border}`,
      borderRadius: 18, padding: '18px 22px',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 900, letterSpacing: '1.2px',
      color: COLORS.textMuted, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

/* OUI / NON toggle */
function YesNo({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '.5px' }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 5 }}>
        {[true, false].map(v => {
          const sel = value === v;
          const c   = v ? COLORS.success : COLORS.error;
          return (
            <button key={String(v)}
              onClick={() => onChange(sel ? null : v)}
              style={{
                width: 58, height: 34, borderRadius: 9, cursor: 'pointer', fontSize: 12,
                border: sel ? `2px solid ${c}` : `1px solid ${COLORS.border}`,
                background: sel ? c + '22' : 'rgba(0,0,0,0.03)',
                color: sel ? c : COLORS.textMuted,
                fontWeight: sel ? 900 : 600, transition: 'all .12s',
              }}>
              {v ? '✓ OUI' : '✗ NON'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* FAIBLE / MOYEN / FORT */
function Level3({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        width: 88, fontSize: 11, fontWeight: 800, color: COLORS.textMuted,
        letterSpacing: '.5px', flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 6, flex: 1 }}>
        {LEVELS.map(lvl => {
          const sel = value === lvl;
          const c   = LEVEL_C[lvl];
          return (
            <button key={lvl}
              onClick={() => onChange(sel ? null : lvl)}
              style={{
                flex: 1, height: 38, borderRadius: 10, cursor: 'pointer',
                border: sel ? `2px solid ${c}` : `1px solid ${COLORS.border}`,
                background: sel ? c + '1a' : 'rgba(0,0,0,0.03)',
                color: sel ? c : COLORS.textMuted,
                fontWeight: sel ? 900 : 600, fontSize: 11, transition: 'all .12s',
              }}>
              {LEVEL_E[lvl]} {lvl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Cadres stepper */
function CadresStepper({ value, onChange }) {
  const n = parseInt(value) || 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '.5px' }}>
        NB CADRES
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onChange(String(Math.max(0, n - 1)))}
          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`,
            background: 'rgba(0,0,0,0.04)', cursor: 'pointer', fontWeight: 900,
            fontSize: 16, color: COLORS.text }}>−</button>
        <input value={value || ''} onChange={e => onChange(e.target.value)}
          style={{
            width: 60, height: 30, textAlign: 'center',
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 8, color: COLORS.text, fontWeight: 900, fontSize: 15, outline: 'none',
          }}
          placeholder="0" />
        <button onClick={() => onChange(String(n + 1))}
          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`,
            background: 'rgba(0,0,0,0.04)', cursor: 'pointer', fontWeight: 900,
            fontSize: 16, color: COLORS.text }}>+</button>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────── */
export default function QuickVisitForm({ hive, apiary, onSubmit }) {
  const [form,    setForm]    = useState(EMPTY());
  const [saving,  setSaving]  = useState(false);
  const [flash,   setFlash]   = useState(false);   // green flash on save
  const [showCam, setShowCam] = useState(false);
  const videoRef     = useRef(null);
  const photoFileRef = useRef(null);
  const nativeCamRef = useRef(null);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const captureGPS = () =>
    navigator.geolocation?.getCurrentPosition(p =>
      set('gps_coords', `${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`)
    );

  /* photo helpers */
  const startCamera = async () => {
    setShowCam(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { setShowCam(false); alert("Caméra indisponible"); }
  };
  const takePhoto = () => {
    const c = document.createElement('canvas');
    c.width  = videoRef.current.videoWidth;
    c.height = videoRef.current.videoHeight;
    c.getContext('2d').drawImage(videoRef.current, 0, 0);
    set('photo_url', c.toDataURL('image/jpeg'));
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    setShowCam(false);
  };
  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    setShowCam(false);
  };
  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onloadend = () => set('photo_url', r.result);
    r.readAsDataURL(file);
  };

  /* submit */
  const handleSubmit = async () => {
    setSaving(true);
    await onSubmit({ ...form, hive_id: hive.id, apiary_id: hive.apiary_id });
    setSaving(false);
    setFlash(true);
    setForm(EMPTY());
    setTimeout(() => setFlash(false), 1800);
  };

  const accentGrad = `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`;

  return (
    <div style={{
      width: '100%',
      background: COLORS.surface,
      border: `1px solid ${COLORS.borderHigh}`,
      borderRadius: 24,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>

      {/* ═══ HEADER ════════════════════════════════════════════════ */}
      <div style={{
        padding: '18px 28px',
        background: accentGrad,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        {/* Hive info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>🐝</div>
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 18, lineHeight: 1 }}>
              {hive.identifier}
            </div>
            {apiary && (
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 }}>
                📍 {apiary.name}
              </div>
            )}
          </div>
        </div>

        {/* Date + GPS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)', borderRadius: 10,
            padding: '6px 12px',
          }}>
            <Calendar size={13} color="white" />
            <input type="date" value={form.visit_date}
              onChange={e => set('visit_date', e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: 'white',
                fontWeight: 700, cursor: 'pointer', outline: 'none', fontSize: 13,
              }} />
          </div>
          <button onClick={captureGPS} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: form.gps_coords ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: 10, padding: '6px 12px',
            color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 12,
          }}>
            <Navigation size={12} />
            {form.gps_coords ? '✓ GPS' : 'GPS'}
          </button>
        </div>
      </div>

      {/* ═══ BODY ══════════════════════════════════════════════════ */}
      <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── SECTION 1 : TYPE DE RUCHE ── */}
        <Card>
          <SLabel>TYPE DE RUCHE</SLabel>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TYPE_RUCHE.map(t => {
              const sel = form.type_ruche === t.id;
              return (
                <button key={t.id}
                  onClick={() => set('type_ruche', sel ? null : t.id)}
                  style={{
                    flex: 1, minWidth: 90, height: 52, borderRadius: 13, cursor: 'pointer',
                    border: sel ? `2.5px solid ${t.color}` : `1px solid ${COLORS.border}`,
                    background: sel ? t.color + '20' : 'rgba(0,0,0,0.03)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 3,
                    transition: 'all .13s',
                    boxShadow: sel ? `0 0 16px ${t.color}30` : 'none',
                  }}>
                  <span style={{ fontSize: 18 }}>{t.emoji}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 900, letterSpacing: '.5px',
                    color: sel ? t.color : COLORS.textMuted,
                  }}>{t.label.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── SECTION 2 : PRÉSENCE + CADRES ── */}
        <Card>
          <SLabel>PRÉSENCE & CADRES</SLabel>
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            gap: 20, alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <YesNo label="REINE"   value={form.reine}   onChange={v => set('reine',   v)} />
            <YesNo label="ŒUFS"    value={form.oeufs}   onChange={v => set('oeufs',   v)} />
            <YesNo label="COUVAIN" value={form.couvain} onChange={v => set('couvain', v)} />
            <CadresStepper value={form.nb_cadres} onChange={v => set('nb_cadres', v)} />
          </div>
        </Card>

        {/* ── SECTION 3 : NIVEAUX ── */}
        <Card>
          <SLabel>NIVEAUX</SLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Level3 label="POPULATION" value={form.population}   onChange={v => set('population',   v)} />
            <Level3 label="MIEL"       value={form.honey_level}  onChange={v => set('honey_level',  v)} />
            <Level3 label="POLLEN"     value={form.pollen_level} onChange={v => set('pollen_level', v)} />
          </div>
        </Card>

        {/* ── SECTION 4 : ÉTAT DE SANTÉ + DESCRIPTION + PHOTO ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>

          {/* État santé */}
          <Card>
            <SLabel>ÉTAT DE SANTÉ</SLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HEALTH.map(h => {
                const sel = form.health_state === h.id;
                return (
                  <button key={h.id}
                    onClick={() => set('health_state', h.id)}
                    style={{
                      height: 42, borderRadius: 11, cursor: 'pointer',
                      border: sel ? `2px solid ${h.color}` : `1px solid ${COLORS.border}`,
                      background: sel ? h.color + '1a' : 'rgba(0,0,0,0.03)',
                      display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
                      transition: 'all .12s',
                    }}>
                    <span style={{ fontSize: 16 }}>{h.emoji}</span>
                    <span style={{
                      fontSize: 12, fontWeight: sel ? 900 : 600,
                      color: sel ? h.color : COLORS.textMuted,
                    }}>{h.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Description / Observation + Photo */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SLabel>ACTION / OBSERVATION</SLabel>

            {/* Textarea */}
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="RAS · Division · Blocs reines · Hausse · Traitement varroa…"
              style={{
                width: '100%', minHeight: 90, flex: 1,
                background: 'rgba(0,0,0,0.03)',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12, padding: '10px 14px',
                color: COLORS.text, resize: 'vertical',
                lineHeight: 1.6, outline: 'none', fontSize: 13,
                fontFamily: 'inherit',
              }}
            />

            {/* Photo zone */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: COLORS.textMuted,
                letterSpacing: '.8px', marginBottom: 8 }}>PHOTO</div>

              {/* Hidden file inputs */}
              <input ref={photoFileRef} type="file" accept="image/*"
                onChange={handleFile} style={{ display: 'none' }} />
              <input ref={nativeCamRef} type="file" accept="image/*" capture="environment"
                onChange={handleFile} style={{ display: 'none' }} />

              {showCam ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden',
                  height: 160, background: '#000' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0,
                    display: 'flex', justifyContent: 'center', gap: 10 }}>
                    <button onClick={takePhoto} style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'white', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer',
                    }} />
                    <button onClick={stopCamera} style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', color: 'white',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : form.photo_url ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden',
                  height: 160, border: `1px solid ${COLORS.border}` }}>
                  <img src={form.photo_url} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => set('photo_url', '')} style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 28, height: 28, borderRadius: '50%',
                    background: COLORS.error, color: 'white',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Caméra native (mobile) */}
                  <button onClick={() => nativeCamRef.current?.click()}
                    style={{
                      flex: 1, height: 52, border: `2px dashed ${COLORS.border}`,
                      borderRadius: 12, background: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 4, color: COLORS.textMuted,
                      transition: 'border-color .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
                    onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
                    <Camera size={18} color={COLORS.accent} />
                    <span style={{ fontSize: 10, fontWeight: 700 }}>Caméra</span>
                  </button>
                  {/* Webcam in-app */}
                  <button onClick={startCamera}
                    style={{
                      flex: 1, height: 52, border: `2px dashed ${COLORS.border}`,
                      borderRadius: 12, background: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 4, color: COLORS.textMuted,
                      transition: 'border-color .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
                    onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
                    <Camera size={18} color={COLORS.info} />
                    <span style={{ fontSize: 10, fontWeight: 700 }}>Webcam</span>
                  </button>
                  {/* Galerie */}
                  <button onClick={() => photoFileRef.current?.click()}
                    style={{
                      flex: 1, height: 52, border: `2px dashed ${COLORS.border}`,
                      borderRadius: 12, background: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 4, color: COLORS.textMuted,
                      transition: 'border-color .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
                    onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
                    <Upload size={18} color={COLORS.success} />
                    <span style={{ fontSize: 10, fontWeight: 700 }}>Galerie</span>
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── SUBMIT ── */}
        <button
          onClick={handleSubmit}
          disabled={saving || flash}
          style={{
            width: '100%', height: 56, borderRadius: 16, cursor: 'pointer',
            background: flash
              ? `linear-gradient(135deg,${COLORS.success},${COLORS.success}cc)`
              : accentGrad,
            border: 'none', color: 'white',
            fontSize: 16, fontWeight: 900, letterSpacing: '.3px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background .3s, transform .15s',
            boxShadow: flash ? `0 6px 24px ${COLORS.success}50` : `0 6px 24px ${COLORS.accent}40`,
            opacity: saving ? 0.75 : 1,
          }}
          onMouseEnter={e => { if (!saving && !flash) e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
          {flash   ? <><CheckCircle size={20} /> Visite enregistrée !</>
           : saving ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Enregistrement…</>
           : '✓ Enregistrer la visite'}
        </button>

      </div>
    </div>
  );
}
