/**
 * FieldModeTab — Mode Terrain (mobile-first)
 * Large +/- steppers, icon-only controls, one-tap quick inspection.
 * Calls /visits/preview → /visits → shows apply suggestion inline.
 */
import { useState, useCallback } from 'react';
import {
  Zap, ThumbsUp, AlertTriangle, AlertOctagon, ShieldPlus,
  Droplets, Package, Beaker, Thermometer, Heart, Hexagon,
  CheckCircle, ChevronRight, Loader
} from 'lucide-react';
import { COLORS } from './BeeConstants';

const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}`;
const H_URL = `${BASE}/bee/history`;

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function api(url, opts = {}) {
  return fetch(url, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
}

const HEALTH_OPTS = [
  { id: 'health',    label: 'Bonne',     icon: ThumbsUp,      color: COLORS.success },
  { id: 'warning',   label: 'Surveiller', icon: AlertTriangle, color: '#fbbf24' },
  { id: 'urgent',    label: 'Urgent',    icon: AlertOctagon,  color: COLORS.error },
  { id: 'treatment', label: 'Traiter',   icon: ShieldPlus,    color: COLORS.info },
];

/* Large +/- stepper tuned for fat fingers */
function BigStepper({ label, value, onChange, min = 0, max = 10, step = 0.5, unit = '', color = COLORS.accent, icon: Icon }) {
  const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(2))));
  const inc = () => onChange(max !== undefined ? Math.min(max, parseFloat((value + step).toFixed(2))) : parseFloat((value + step).toFixed(2)));

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      {Icon && <Icon size={22} color={color} />}
      <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={dec}
          style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(28,10,0,0.06)', border: `1px solid ${COLORS.border}`, color: COLORS.text, fontSize: 26, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, userSelect: 'none', WebkitUserSelect: 'none' }}>
          −
        </button>
        <div style={{ minWidth: 70, textAlign: 'center' }}>
          <div style={{ color, fontWeight: 900, fontSize: 32, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value}</div>
          {unit && <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>{unit}</div>}
        </div>
        <button onClick={inc}
          style={{ width: 52, height: 52, borderRadius: 16, background: color + '20', border: `1px solid ${color}40`, color, fontSize: 26, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, userSelect: 'none', WebkitUserSelect: 'none' }}>
          +
        </button>
      </div>
      {/* Mini bar */}
      {max !== undefined && (
        <div style={{ width: '100%', height: 4, borderRadius: 4, background: 'rgba(28,10,0,0.08)' }}>
          <div style={{ height: '100%', width: `${Math.min(100, ((value - min) / (max - min)) * 100)}%`, borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${color}70)` }} />
        </div>
      )}
    </div>
  );
}

/* Compact apply suggestion card */
function ApplySuggestion({ suggestion, visitId, hiveId, onApplied, toast }) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  if (!suggestion || applied) return null;

  const upd = suggestion.hive_updates || {};
  const ded = suggestion.stock_deductions || {};
  const hasChanges = Object.keys(upd).length > 0 || Object.keys(ded).length > 0;

  if (!hasChanges) return null;

  const apply = async () => {
    setApplying(true);
    const res = await api(`${H_URL}/visits/${visitId}/apply`, { method: 'POST' });
    if (res.ok) {
      setApplied(true);
      toast('Mise à jour appliquée', 'success');
      onApplied();
    } else {
      toast('Erreur application', 'error');
    }
    setApplying(false);
  };

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.success}40`, borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <CheckCircle size={16} color={COLORS.success} />
        <span style={{ color: COLORS.success, fontWeight: 800, fontSize: 13 }}>Visite enregistrée · Appliquer les mises à jour ?</span>
      </div>

      {Object.entries(upd).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(upd).map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(28,10,0,0.05)', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '6px 12px', fontSize: 11 }}>
              <span style={{ color: COLORS.textMuted }}>{k}: </span>
              <span style={{ color: COLORS.text, fontWeight: 700 }}>{String(v.current)} → </span>
              <span style={{ color: COLORS.accent, fontWeight: 800 }}>{String(v.proposed)}</span>
              {v.delta !== undefined && v.delta !== 0 && (
                <span style={{ color: v.delta > 0 ? COLORS.success : COLORS.error, fontSize: 10, marginLeft: 4 }}>
                  ({v.delta > 0 ? '+' : ''}{v.delta})
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {Object.entries(ded).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(ded).filter(([, v]) => v > 0).map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(245,158,11,0.06)', border: `1px solid ${COLORS.accent}25`, borderRadius: 10, padding: '5px 10px', fontSize: 11 }}>
              <span style={{ color: COLORS.accent, fontWeight: 800 }}>−{v}</span>
              <span style={{ color: COLORS.textMuted }}> {k}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={apply} disabled={applying}
          style={{ flex: 1, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${COLORS.success}, #15803d)`, border: 'none', color: 'white', fontWeight: 800, cursor: applying ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
          {applying ? <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={16} />}
          Appliquer
        </button>
        <button onClick={() => { setApplied(true); }}
          style={{ height: 48, padding: '0 18px', borderRadius: 14, background: '#FEFCF7', border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, cursor: 'pointer', fontSize: 13 }}>
          Ignorer
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function FieldModeTab({ hive, onVisitCreated, toast }) {
  const [healthState, setHealthState] = useState('health');
  const [healthScore, setHealthScore] = useState(hive.health_score ?? 7);
  const [honeyLevel,  setHoneyLevel]  = useState(hive.honey_level  ?? 5);
  const [forceLevel,  setForceLevel]  = useState(hive.force_level  ?? 5);
  const [temperature, setTemperature] = useState(35);
  const [sirop,       setSirop]       = useState(0);
  const [pate,        setPate]        = useState(0);
  const [traitement,  setTraitement]  = useState(0);
  const [harvestKg,   setHarvestKg]   = useState(0);
  const [notes,       setNotes]       = useState('');

  const [saving,      setSaving]      = useState(false);
  const [savedVisit,  setSavedVisit]  = useState(null);
  const [suggestion,  setSuggestion]  = useState(null);

  const reset = () => {
    setSirop(0); setPate(0); setTraitement(0); setHarvestKg(0); setNotes('');
    setSavedVisit(null); setSuggestion(null);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    // Map numeric honey level (0-10) to the string label the backend expects
    const honeyLabel = honeyLevel >= 8 ? 'Excellent' : honeyLevel >= 6 ? 'Bon' : honeyLevel >= 3 ? 'Moyen' : 'Faible';

    const payload = {
      hive_id: hive.id,
      apiary_id: hive.apiary_id,
      visit_date: today,
      health_state: healthState,
      health_score: healthScore,   // numeric override for COLOSS blend
      force_level: forceLevel,     // colony strength
      temperature,
      honey_level: honeyLabel,     // string label (backward compat)
      needs_sirop: sirop,
      needs_pate: pate,
      needs_traitement: traitement,
      harvest_kg: harvestKg,
      pollen_kg: 0,
      notes: notes || `[Terrain] ${HEALTH_OPTS.find(h => h.id === healthState)?.label}`,
      photo_url: '',
      gps_coords: '',
    };

    // Preview
    const rPrev = await api(`${H_URL}/visits/preview`, { method: 'POST', body: JSON.stringify(payload) });
    const prevData = rPrev.ok ? await rPrev.json() : null;

    // Save
    const rSave = await api(`${H_URL}/visits`, { method: 'POST', body: JSON.stringify(payload) });
    if (rSave.ok) {
      const saved = await rSave.json();
      setSavedVisit(saved);
      setSuggestion(prevData);
      toast('Inspection enregistrée', 'success');
    } else {
      toast('Erreur lors de la sauvegarde', 'error');
    }
    setSaving(false);
  }, [hive.id, hive.apiary_id, healthState, healthScore, honeyLevel, forceLevel, temperature, sirop, pate, traitement, harvestKg, notes, toast]);

  const gc = healthState === 'health' ? COLORS.success : healthState === 'warning' ? '#fbbf24' : healthState === 'urgent' ? COLORS.error : COLORS.info;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${COLORS.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={20} color={COLORS.accent} />
        </div>
        <div>
          <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 17 }}>Mode Terrain</div>
          <div style={{ color: COLORS.textMuted, fontSize: 11 }}>Inspection rapide · {new Date().toLocaleDateString('fr-FR')}</div>
        </div>
      </div>

      {/* Apply suggestion (shown after save) */}
      {savedVisit && suggestion && (
        <ApplySuggestion
          suggestion={suggestion}
          visitId={savedVisit.id}
          hiveId={hive.id}
          toast={toast}
          onApplied={() => { onVisitCreated(); reset(); }}
        />
      )}

      {/* Health state buttons */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: '16px 18px' }}>
        <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', marginBottom: 12 }}>ÉTAT GÉNÉRAL</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
          {HEALTH_OPTS.map(opt => {
            const active = healthState === opt.id;
            return (
              <button key={opt.id} onClick={() => setHealthState(opt.id)}
                style={{ height: 64, borderRadius: 16, background: active ? opt.color + '25' : '#FEFCF7', border: `2px solid ${active ? opt.color : COLORS.border}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s', transform: active ? 'scale(1.03)' : 'scale(1)' }}>
                <opt.icon size={20} color={active ? opt.color : COLORS.textMuted} />
                <span style={{ color: active ? opt.color : COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>{opt.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main metrics — 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <BigStepper label="Santé" value={healthScore} onChange={setHealthScore} min={0} max={10} step={0.5} unit="/10" color={gc} icon={Heart} />
        <BigStepper label="Niveau Miel" value={honeyLevel} onChange={setHoneyLevel} min={0} max={10} step={0.5} unit="/10" color={COLORS.accent} icon={Droplets} />
        <BigStepper label="Force Colonie" value={forceLevel} onChange={setForceLevel} min={0} max={10} step={0.5} unit="/10" color={COLORS.info} icon={Hexagon} />
        <BigStepper label="Température" value={temperature} onChange={setTemperature} min={20} max={50} step={0.5} unit="°C" color="#fb923c" icon={Thermometer} />
      </div>

      {/* Resource needs — 3 compact steppers */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: '16px 18px' }}>
        <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', marginBottom: 14 }}>BESOINS RESSOURCES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
          <BigStepper label="Sirop" value={sirop} onChange={setSirop} min={0} max={undefined} step={0.5} unit="L" color="#38bdf8" icon={Droplets} />
          <BigStepper label="Pâte" value={pate} onChange={setPate} min={0} max={undefined} step={0.5} unit="kg" color="#a78bfa" icon={Package} />
          <BigStepper label="Traitement" value={traitement} onChange={setTraitement} min={0} max={undefined} step={1} unit="doses" color="#f87171" icon={Beaker} />
        </div>
      </div>

      {/* Harvest */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: '16px 18px' }}>
        <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', marginBottom: 14 }}>RÉCOLTE DU JOUR</div>
        <BigStepper label="Miel récolté" value={harvestKg} onChange={setHarvestKg} min={0} max={undefined} step={0.5} unit="kg" color={COLORS.accent} icon={Droplets} />
      </div>

      {/* Notes (optional, collapsed by default) */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: '14px 18px' }}>
        <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', marginBottom: 10 }}>NOTES (OPTIONNEL)</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Observations rapides…"
          rows={2}
          style={{ width: '100%', background: '#FEFCF7', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '10px 14px', color: COLORS.text, fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
        />
      </div>

      {/* Save button */}
      <button onClick={handleSave} disabled={saving}
        style={{ height: 60, borderRadius: 18, background: saving ? 'rgba(28,10,0,0.06)' : `linear-gradient(135deg, ${gc}, ${gc}bb)`, border: `2px solid ${saving ? COLORS.border : gc + '60'}`, color: saving ? COLORS.textMuted : 'white', fontWeight: 900, fontSize: 16, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: saving ? 'none' : `0 8px 24px -4px ${gc}40`, transition: 'all 0.2s' }}>
        {saving
          ? <><Loader size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> Enregistrement…</>
          : <><CheckCircle size={20} /> Inspection Rapide · Enregistrer <ChevronRight size={18} /></>
        }
      </button>

      {/* Quick stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
        {[
          { label: 'Santé actuelle', value: `${hive.health_score?.toFixed(1) ?? '?'}/10`, color: gc },
          { label: 'Miel actuel', value: `${hive.honey_level?.toFixed(1) ?? '?'}/10`, color: COLORS.accent },
          { label: 'Force actuelle', value: `${hive.force_level?.toFixed(1) ?? '?'}/10`, color: COLORS.info },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(28,10,0,0.03)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ color: COLORS.textMuted, fontSize: 9, fontWeight: 800, letterSpacing: '0.8px', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
            <div style={{ color: s.color, fontWeight: 900, fontSize: 18 }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
