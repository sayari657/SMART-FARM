import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Hexagon, MapPin, ClipboardCheck, Boxes,
  CalendarClock, Droplets, Wallet, Heart, Package,
  Plus, Trash2, Calendar, ThumbsUp, AlertTriangle,
  AlertCircle, ShieldPlus, Camera, Upload, X, Navigation,
  Thermometer, CheckCircle, Circle, Clock, ArrowRight,
  Activity, TrendingUp, DollarSign, RefreshCw, Zap,
  ChevronDown, Info, AlertOctagon, ScanEye
} from 'lucide-react';
import { COLORS } from './BeeConstants';
import FieldModeTab from './FieldModeTab';
import EntranceMonitorTab from './EntranceMonitorTab';

const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}`;
const H_URL  = `${BASE}/bee/history`;
const EXP_URL = `${BASE}/bee/expenses`;
const PLAN_URL = `${BASE}/bee/planning`;
const STOCK_URL = `${BASE}/bee/stock`;
const PRED_URL  = `${BASE}/bee/analytics/predict`;

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function api(url, opts = {}) {
  return fetch(url, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
}

/* ── shared primitives ────────────────────────────────────────────────────── */
const HEALTH_OPTIONS = [
  { id: 'health',    label: 'Bonne santé',      icon: ThumbsUp,      color: COLORS.success },
  { id: 'warning',   label: 'À surveiller',      icon: AlertTriangle, color: '#fbbf24' },
  { id: 'urgent',    label: 'Urgent',            icon: AlertOctagon,  color: COLORS.error },
  { id: 'treatment', label: 'Traitement requis', icon: ShieldPlus,    color: COLORS.info },
];
const TASK_STATUS = {
  todo:  { label: 'À FAIRE',  color: COLORS.textMuted },
  doing: { label: 'EN COURS', color: '#fbbf24' },
  done:  { label: 'TERMINÉ',  color: COLORS.success },
};
const DEPENSE_TYPES = ['Alimentation', 'Traitement', 'Équipement', "Main-d'œuvre", 'Transport', 'Autre'];

function healthBadge(state) {
  const opt = HEALTH_OPTIONS.find(h => h.id === state) || HEALTH_OPTIONS[0];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      background: opt.color + '18', color: opt.color,
      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
      <opt.icon size={11} /> {opt.label}
    </span>
  );
}

function Section({ title, icon: Icon, color = COLORS.accent, children, action }) {
  return (
    <div style={{ background: COLORS.surface, borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '14px 22px', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(28,10,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={color} />
          </div>
          <span style={{ color: COLORS.text, fontWeight: 800, fontSize: 13 }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

const inputSt = {
  width: '100%', height: 44, background: '#FEFCF7',
  border: `1px solid ${COLORS.border}`, borderRadius: 12,
  padding: '0 14px', color: COLORS.text, outline: 'none', fontSize: 13,
};

function StepperInput({ label, value, onChange, min = 0, step = 1, color = COLORS.accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 12, border: `1px solid ${COLORS.border}`,
      background: 'rgba(28,10,0,0.03)' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onChange(Math.max(min, value - step))}
          style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(28,10,0,0.06)',
            border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: 'pointer', fontWeight: 900, fontSize: 16 }}>−</button>
        <span style={{ color: COLORS.text, fontWeight: 900, fontSize: 16, minWidth: 40, textAlign: 'center' }}>{value}</span>
        <button onClick={() => onChange(value + step)}
          style={{ width: 30, height: 30, borderRadius: 8, background: color + '25',
            border: `1px solid ${color}40`, color, cursor: 'pointer', fontWeight: 900, fontSize: 16 }}>+</button>
      </div>
    </div>
  );
}

/* ── Visit preview/apply modal ────────────────────────────────────────────── */
function ApplyModal({ preview, visitId, onApply, onSkip }) {
  const [applying, setApplying] = useState(false);
  const up = preview?.hive_updates || {};
  const deduct = preview?.stock_deductions || {};
  const prod = preview?.production_entry;

  const handleApply = async () => {
    setApplying(true);
    const res = await api(`${H_URL}/visits/${visitId}/apply`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setApplying(false);
    onApply(data);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderHigh}`,
        borderRadius: 24, padding: 28, maxWidth: 500, width: '100%',
        boxShadow: `0 24px 80px rgba(0,0,0,0.7)` }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: COLORS.accent + '20',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Info size={20} color={COLORS.accent} />
          </div>
          <div>
            <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 16 }}>Appliquer les changements ?</div>
            <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2 }}>
              Visite enregistrée. Confirmer les mises à jour ruche :
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {Object.entries(up).map(([key, val]) => {
            const delta = val.delta;
            const positive = delta >= 0;
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 12, background: 'rgba(28,10,0,0.04)',
                border: `1px solid ${COLORS.border}` }}>
                <span style={{ color: COLORS.textDim, fontSize: 13, fontWeight: 600 }}>
                  {key === 'health_score' ? 'Score santé' : 'Niveau miel'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{val.current?.toFixed(1)}</span>
                  <ArrowRight size={12} color={COLORS.textMuted} />
                  <span style={{ color: positive ? COLORS.success : COLORS.error, fontWeight: 900 }}>
                    {val.proposed?.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 11, color: positive ? COLORS.success : COLORS.error, fontWeight: 700 }}>
                    ({positive ? '+' : ''}{delta?.toFixed(1)})
                  </span>
                </div>
              </div>
            );
          })}

          {Object.keys(deduct).length > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: COLORS.info + '0a',
              border: `1px solid ${COLORS.info}25` }}>
              <div style={{ color: COLORS.info, fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
                DÉDUCTIONS STOCK RUCHE
              </div>
              {Object.entries(deduct).map(([k, v]) => (
                <div key={k} style={{ color: COLORS.textDim, fontSize: 12 }}>
                  {k} : −{v} {k === 'sirop' ? 'L' : k === 'pate' ? 'kg' : 'dose(s)'}
                </div>
              ))}
            </div>
          )}

          {prod && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: COLORS.accent + '0a',
              border: `1px solid ${COLORS.accent}25` }}>
              <div style={{ color: COLORS.accent, fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
                ENTRÉE PRODUCTION AUTO
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 12 }}>
                🍯 {prod.honey_kg}kg miel{prod.pollen_kg > 0 ? ` · 🌼 ${prod.pollen_kg}kg pollen` : ''}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleApply} disabled={applying}
            style={{ flex: 1, height: 48, borderRadius: 14, cursor: 'pointer',
              background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`,
              border: 'none', color: 'white', fontWeight: 800, fontSize: 14,
              opacity: applying ? 0.7 : 1 }}>
            {applying ? '…' : '✓ Appliquer'}
          </button>
          <button onClick={onSkip}
            style={{ flex: 1, height: 48, borderRadius: 14, cursor: 'pointer',
              background: 'rgba(28,10,0,0.07)', border: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted, fontWeight: 700, fontSize: 14 }}>
            Ignorer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  INSPECTION TAB                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
function InspectionTab({ hive, onVisitCreated, toast }) {
  const photoInputRef = useRef(null);
  const videoRef      = useRef(null);
  const [visites, setVisites] = useState([]);
  const [loadingV, setLoadingV] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [preview, setPreview]     = useState(null);
  const [pendingVisitId, setPendingVisitId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    health_state: 'health', temperature: '', honey_level: 'Moyen',
    needs_sirop: 0, needs_pate: 0, needs_traitement: 0,
    harvest_kg: 0, pollen_kg: 0, notes: '', photo_url: '', gps_coords: '',
  });

  const load = useCallback(async () => {
    setLoadingV(true);
    const r = await api(`${H_URL}/visits?hive_id=${hive.id}&limit=50`);
    if (r.ok) setVisites(await r.json());
    setLoadingV(false);
  }, [hive.id]);

  useEffect(() => { load(); }, [load]);

  const captureGPS = () => navigator.geolocation?.getCurrentPosition(pos =>
    setForm(f => ({ ...f, gps_coords: `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}` }))
  );

  const takePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setForm(f => ({ ...f, photo_url: canvas.toDataURL('image/jpeg') }));
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      hive_id: hive.id, apiary_id: hive.apiary_id,
      visit_date: form.visit_date, health_state: form.health_state,
      temperature: form.temperature ? parseFloat(form.temperature) : null,
      honey_level: form.honey_level,
      needs_sirop: Number(form.needs_sirop) || 0,
      needs_pate: Number(form.needs_pate) || 0,
      needs_traitement: Number(form.needs_traitement) || 0,
      harvest_kg: parseFloat(form.harvest_kg) || 0,
      pollen_kg: parseFloat(form.pollen_kg) || 0,
      notes: form.notes, photo_url: form.photo_url, gps_coords: form.gps_coords,
    };

    // 1. Fetch preview (no side-effects)
    const prevRes = await api(`${H_URL}/visits/preview`, { method: 'POST', body: JSON.stringify(payload) });
    const prevData = prevRes.ok ? await prevRes.json() : null;

    // 2. Save visit
    const res = await api(`${H_URL}/visits`, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) { toast('Erreur lors de l\'enregistrement', 'error'); setSubmitting(false); return; }
    const saved = await res.json();
    setSubmitting(false);
    setShowForm(false);
    setForm({ visit_date: new Date().toISOString().split('T')[0], health_state: 'health', temperature: '',
      honey_level: 'Moyen', needs_sirop: 0, needs_pate: 0, needs_traitement: 0,
      harvest_kg: 0, pollen_kg: 0, notes: '', photo_url: '', gps_coords: '' });
    load();

    // 3. Show apply modal if there are meaningful changes
    if (prevData && Object.keys(prevData.hive_updates || {}).length > 0) {
      setPendingVisitId(saved.id);
      setPreview(prevData);
    } else {
      toast('Inspection enregistrée');
      onVisitCreated();
    }
  };

  const handleApply = (result) => {
    setPreview(null);
    setPendingVisitId(null);
    const alerts = result?.stock_alerts || [];
    toast('Changements appliqués à la ruche', 'success');
    if (alerts.length) alerts.forEach(a => toast(a, 'warning'));
    onVisitCreated();
  };

  const handleSkip = () => {
    setPreview(null);
    setPendingVisitId(null);
    toast('Inspection enregistrée (changements non appliqués)');
    onVisitCreated();
  };

  const deleteVisit = async (id) => {
    await api(`${H_URL}/visits/${id}`, { method: 'DELETE' });
    load(); onVisitCreated();
    toast('Inspection supprimée', 'warning');
  };

  /* ── form view ── */
  if (showForm) return (
    <>
      {preview && <ApplyModal preview={preview} visitId={pendingVisitId} onApply={handleApply} onSkip={handleSkip} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setShowForm(false)}
            style={{ background: 'none', border: 'none', color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <ArrowLeft size={16} /> Retour
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
              style={{ ...inputSt, width: 160 }} />
            <button onClick={captureGPS}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: form.gps_coords ? COLORS.success + '18' : '#FEFCF7',
                border: `1px solid ${form.gps_coords ? COLORS.success + '40' : COLORS.border}`,
                color: form.gps_coords ? COLORS.success : COLORS.textMuted,
                padding: '0 14px', height: 44, borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
              <Navigation size={14} /> {form.gps_coords ? '✓ GPS' : 'GPS'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <Section title="Bilan de santé" icon={Heart}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
              {HEALTH_OPTIONS.map(st => (
                <button key={st.id} onClick={() => setForm(f => ({ ...f, health_state: st.id }))}
                  style={{ padding: '11px', borderRadius: 12, cursor: 'pointer', border: form.health_state === st.id ? `2px solid ${st.color}` : `1px solid ${COLORS.border}`,
                    background: form.health_state === st.id ? st.color + '18' : '#FEFCF7',
                    display: 'flex', alignItems: 'center', gap: 8 }}>
                  <st.icon size={15} color={st.color} />
                  <span style={{ fontWeight: 700, fontSize: 11, color: COLORS.text }}>{st.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Niveau de miel" icon={Droplets}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Faible', 'Moyen', 'Bon', 'Excellent'].map(lvl => (
                <button key={lvl} onClick={() => setForm(f => ({ ...f, honey_level: lvl }))}
                  style={{ flex: 1, minWidth: 70, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    border: form.honey_level === lvl ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                    background: form.honey_level === lvl ? COLORS.accent + '20' : '#FEFCF7',
                    color: form.honey_level === lvl ? COLORS.accent : COLORS.textMuted }}>
                  {lvl}
                </button>
              ))}
            </div>
            <Section title="Température (°C)" icon={Thermometer} color="#fbbf24">
              <input type="number" step="0.1" placeholder="ex: 23.5" value={form.temperature || ''}
                onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))}
                style={{ ...inputSt, fontSize: 18, fontWeight: 800, height: 48, marginTop: 8 }} />
            </Section>
          </Section>
        </div>

        <Section title="Ressources utilisées" icon={Package}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StepperInput label="Sirop (L)" value={form.needs_sirop} step={0.5}
              onChange={v => setForm(f => ({ ...f, needs_sirop: v }))} color={COLORS.info} />
            <StepperInput label="Pâte (kg)" value={form.needs_pate} step={0.5}
              onChange={v => setForm(f => ({ ...f, needs_pate: v }))} color={COLORS.success} />
            <StepperInput label="Traitements" value={form.needs_traitement}
              onChange={v => setForm(f => ({ ...f, needs_traitement: v }))} color={COLORS.error} />
          </div>
        </Section>

        <Section title="Récolte (kg)" icon={Droplets} color={COLORS.accent}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            {[{ key: 'harvest_kg', label: 'Miel', color: COLORS.accent }, { key: 'pollen_kg', label: 'Pollen', color: COLORS.success }].map(f => (
              <div key={f.key} style={{ padding: 14, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: 'rgba(28,10,0,0.03)' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: f.color, display: 'block', marginBottom: 6 }}>{f.label}</span>
                <input type="number" min="0" step="0.1" placeholder="0.0" value={form[f.key] || ''}
                  onChange={e => setForm(ff => ({ ...ff, [f.key]: parseFloat(e.target.value) || 0 }))}
                  style={{ background: 'none', border: 'none', color: COLORS.text, fontSize: 22, fontWeight: 900, outline: 'none', width: '100%' }} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Photo & Observations" icon={Camera}>
          <input type="file" ref={photoInputRef} onChange={e => { const r = new FileReader(); r.onloadend = () => setForm(f => ({ ...f, photo_url: r.result })); r.readAsDataURL(e.target.files[0]); }} accept="image/*" style={{ display: 'none' }} />
          {showCamera ? (
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 200 }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button onClick={takePhoto} style={{ width: 48, height: 48, borderRadius: '50%', background: 'white', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer' }} />
                <button onClick={() => { videoRef.current?.srcObject?.getTracks().forEach(t => t.stop()); setShowCamera(false); }}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : form.photo_url ? (
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 160 }}>
              <img src={form.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => setForm(f => ({ ...f, photo_url: '' }))}
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: COLORS.error, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <button onClick={() => navigator.mediaDevices?.getUserMedia({ video: true }).then(s => { setShowCamera(true); setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 50); }).catch(() => alert("Caméra indisponible"))}
                style={{ flex: 1, height: 70, border: `2px dashed ${COLORS.border}`, borderRadius: 12, background: 'none', color: COLORS.textMuted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Camera size={18} /><span style={{ fontSize: 10, fontWeight: 600 }}>Caméra</span>
              </button>
              <button onClick={() => photoInputRef.current?.click()}
                style={{ flex: 1, height: 70, border: `2px dashed ${COLORS.border}`, borderRadius: 12, background: 'none', color: COLORS.textMuted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Upload size={18} /><span style={{ fontSize: 10, fontWeight: 600 }}>Galerie</span>
              </button>
            </div>
          )}
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Comportement, état du couvain, présence de maladies…"
            style={{ width: '100%', minHeight: 90, background: '#FEFCF7', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '12px 14px', color: COLORS.text, resize: 'vertical', outline: 'none', fontSize: 13, lineHeight: 1.6 }} />
        </Section>

        <button onClick={handleSubmit} disabled={submitting}
          style={{ height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, border: 'none', color: 'white', fontSize: 15, fontWeight: 900, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? '…' : 'Enregistrer l\'inspection'}
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {preview && <ApplyModal preview={preview} visitId={pendingVisitId} onApply={handleApply} onSkip={handleSkip} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Historique Inspections</div>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>{visites.length} inspection(s)</div>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, color: 'white', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
          <Plus size={15} /> Nouvelle Inspection
        </button>
      </div>

      {loadingV ? <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>Chargement…</div>
        : visites.length === 0 ? (
          <div style={{ height: 180, background: 'rgba(28,10,0,0.03)', border: `2px dashed ${COLORS.border}`, borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: COLORS.textMuted }}>
            <ClipboardCheck size={38} strokeWidth={1} style={{ opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>Aucune inspection</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visites.map(v => (
              <div key={v.id} style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: COLORS.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={16} color={COLORS.accent} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ color: COLORS.text, fontWeight: 800 }}>{v.visit_date}</span>
                    {healthBadge(v.health_state)}
                    {v.honey_level && <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Miel: {v.honey_level}</span>}
                    {v.temperature && <span style={{ color: '#fbbf24', fontSize: 11 }}>🌡 {v.temperature}°C</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
                    {v.harvest_kg > 0 && <span style={{ fontSize: 11, color: COLORS.accent, fontWeight: 700 }}>🍯 {v.harvest_kg}kg</span>}
                    {v.needs_sirop > 0 && <span style={{ fontSize: 11, color: COLORS.info }}>Sirop: {v.needs_sirop}L</span>}
                    {v.needs_traitement > 0 && <span style={{ fontSize: 11, color: COLORS.error }}>Trait.: {v.needs_traitement}</span>}
                  </div>
                  {v.notes && <div style={{ marginTop: 4, fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' }}>{v.notes.slice(0, 100)}{v.notes.length > 100 ? '…' : ''}</div>}
                </div>
                <button onClick={() => deleteVisit(v.id)}
                  style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  LOGISTIQUE TAB — stock ruche + déduction                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function LogistiqueTab({ hive, toast }) {
  const [stock, setStock]     = useState(null);
  const [visites, setVisites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replenish, setReplenish] = useState({ sirop: 0, pate: 0, traitement: 0, cadres: 0 });
  const [showReplenish, setShowReplenish] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rs, rv] = await Promise.all([
      api(`${STOCK_URL}/hive/${hive.id}`),
      api(`${H_URL}/visits?hive_id=${hive.id}&limit=20`),
    ]);
    if (rs.ok) setStock(await rs.json());
    if (rv.ok) setVisites(await rv.json());
    setLoading(false);
  }, [hive.id]);

  useEffect(() => { load(); }, [load]);

  const handleReplenish = async () => {
    const res = await api(`${STOCK_URL}/hive/${hive.id}/replenish`, {
      method: 'POST', body: JSON.stringify(replenish),
    });
    if (res.ok) {
      const data = await res.json();
      setStock(data.hive_stock);
      if (data.global_alerts?.length) data.global_alerts.forEach(a => toast(a, 'warning'));
      toast('Stock ruche réapprovisionné', 'success');
      setShowReplenish(false);
      setReplenish({ sirop: 0, pate: 0, traitement: 0, cadres: 0 });
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.detail || 'Erreur réapprovisionnement', 'error');
    }
  };

  const totals = visites.reduce((acc, v) => ({
    sirop: acc.sirop + (v.needs_sirop || 0),
    pate:  acc.pate  + (v.needs_pate  || 0),
    traitement: acc.traitement + (v.needs_traitement || 0),
  }), { sirop: 0, pate: 0, traitement: 0 });

  const last = visites[0];

  if (loading) return <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>Chargement…</div>;

  const stockItems = [
    { key: 'sirop',      label: 'Sirop',      unit: 'L',       color: COLORS.info,    min: stock?.sirop_min || 2 },
    { key: 'pate',       label: 'Pâte',       unit: 'kg',      color: COLORS.success, min: stock?.pate_min || 1 },
    { key: 'traitement', label: 'Traitement', unit: 'dose(s)', color: COLORS.error,   min: stock?.traitement_min || 1 },
    { key: 'cadres',     label: 'Cadres',     unit: '',        color: COLORS.accent,  min: 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Stock & Logistique</div>
        <button onClick={() => setShowReplenish(s => !s)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, color: 'white', border: 'none', padding: '9px 18px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
          <RefreshCw size={13} /> Réapprovisionner
        </button>
      </div>

      {/* Stock ruche */}
      <Section title="Stock Ruche" icon={Package} color={COLORS.info}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {stockItems.map(item => {
            const val = stock?.[item.key] ?? 0;
            const low = val < item.min;
            return (
              <div key={item.key} style={{ padding: '14px 16px', borderRadius: 14,
                background: low ? COLORS.error + '0a' : 'rgba(28,10,0,0.03)',
                border: `1px solid ${low ? COLORS.error + '40' : COLORS.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: item.color, fontSize: 11, fontWeight: 800 }}>{item.label}</span>
                  {low && <span style={{ fontSize: 9, color: COLORS.error, fontWeight: 800, background: COLORS.error + '20', padding: '2px 6px', borderRadius: 6 }}>BAS</span>}
                </div>
                <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 22 }}>
                  {typeof val === 'number' ? val.toFixed(item.key === 'sirop' || item.key === 'pate' ? 1 : 0) : val}
                  <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}>{item.unit}</span>
                </div>
                {item.min > 0 && (
                  <div style={{ height: 3, borderRadius: 3, background: 'rgba(28,10,0,0.08)', marginTop: 8 }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(100, (val / (item.min * 3)) * 100)}%`,
                      background: low ? COLORS.error : item.color }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Replenish form */}
      {showReplenish && (
        <Section title="Réapprovisionnement depuis entrepôt" icon={RefreshCw} color={COLORS.success}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StepperInput label="Sirop (L)" value={replenish.sirop} step={5}
              onChange={v => setReplenish(r => ({ ...r, sirop: v }))} color={COLORS.info} />
            <StepperInput label="Pâte (kg)" value={replenish.pate} step={1}
              onChange={v => setReplenish(r => ({ ...r, pate: v }))} color={COLORS.success} />
            <StepperInput label="Traitement" value={replenish.traitement}
              onChange={v => setReplenish(r => ({ ...r, traitement: v }))} color={COLORS.error} />
            <StepperInput label="Cadres" value={replenish.cadres}
              onChange={v => setReplenish(r => ({ ...r, cadres: v }))} color={COLORS.accent} />
            <button onClick={handleReplenish}
              style={{ height: 46, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.success}, #065f46)`, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', marginTop: 4 }}>
              Transférer vers ruche
            </button>
          </div>
        </Section>
      )}

      {/* Consommation historique */}
      <Section title="Consommation cumulée (toutes visites)" icon={Activity}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {[
            { label: 'Sirop total', value: `${totals.sirop.toFixed(1)} L`, color: COLORS.info },
            { label: 'Pâte totale', value: `${totals.pate.toFixed(1)} kg`, color: COLORS.success },
            { label: 'Traitements', value: totals.traitement, color: COLORS.error },
          ].map(item => (
            <div key={item.label} style={{ padding: 14, borderRadius: 12, background: 'rgba(28,10,0,0.03)', border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
              <div style={{ color: item.color, fontWeight: 900, fontSize: 20 }}>{item.value}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700, marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Besoins actuels */}
      {last && (
        <Section title="Besoins estimés (dernière visite)" icon={Boxes}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Sirop sucré', val: last.needs_sirop, unit: 'L', color: COLORS.info },
              { label: 'Pâte protéinée', val: last.needs_pate, unit: 'kg', color: COLORS.success },
              { label: 'Traitement Varroa', val: last.needs_traitement, unit: 'app.', color: COLORS.error },
            ].map(n => (
              <div key={n.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderRadius: 11,
                background: n.val > 0 ? n.color + '0a' : 'rgba(28,10,0,0.03)',
                border: `1px solid ${n.val > 0 ? n.color + '30' : COLORS.border}` }}>
                <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 13 }}>{n.label}</span>
                <span style={{ color: n.val > 0 ? n.color : COLORS.textMuted, fontWeight: 800 }}>
                  {n.val > 0 ? `${n.val} ${n.unit} requis` : 'RAS'}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PLANNING TAB — missions + tâches persistées en DB                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function PlanningTab({ hive, toast }) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [form, setForm]   = useState({ date: '', note: '', action_type: 'inspection' });
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rm, rp] = await Promise.all([
        api(`${PLAN_URL}?hive_id=${hive.id}`),
        api(`${PRED_URL}/${hive.id}`),
      ]);
      if (rm.ok) setMissions(await rm.json());
      if (rp.ok) {
        const pred = await rp.json();
        setPrediction(pred);
        const p = pred.predictions;
        setForm(f => ({
          ...f,
          _pred_sirop: p.sirop_L, _pred_pate: p.pate_kg,
          _pred_traitement: p.traitement, _pred_cadres: p.cadres,
        }));
      }
    } catch (err) {
      console.error("Planning load error:", err);
      toast("Erreur lors du chargement du planning", "error");
    } finally {
      setLoading(false);
    }
  }, [hive.id, toast]);

  useEffect(() => { load(); }, [load]);

  const addTask = () => { if (!newTask.trim()) return; setTasks(t => [...t, newTask.trim()]); setNewTask(''); };

  const createMission = async () => {
    const finalTasks = [...tasks, ...(newTask.trim() ? [newTask.trim()] : [])];
    if (!form.date || finalTasks.length === 0) { toast('Date et au moins une tâche requis', 'warning'); return; }
    const payload = {
      hive_id: hive.id, scheduled_date: form.date,
      action_type: form.action_type, notes: form.note,
      predicted_sirop: form._pred_sirop || 0, predicted_pate: form._pred_pate || 0,
      predicted_traitement: form._pred_traitement || 0, predicted_cadres: form._pred_cadres || 0,
      tasks: finalTasks,
    };
    const res = await api(PLAN_URL, { method: 'POST', body: JSON.stringify(payload) });
    if (res.ok) {
      toast('Mission planifiée'); setTasks([]); setNewTask('');
      setForm(f => ({ ...f, date: '', note: '' }));
      load();
    } else toast('Erreur création mission', 'error');
  };

  const updateTaskStatus = async (planId, taskId, status) => {
    const res = await api(`${PLAN_URL}/${planId}/tasks/${taskId}?status=${status}`, { method: 'PUT' });
    if (res.ok) load();
  };

  const deleteMission = async (id) => {
    await api(`${PLAN_URL}/${id}`, { method: 'DELETE' });
    load(); toast('Mission supprimée', 'warning');
  };

  const totalDone  = missions.reduce((n, p) => n + (p.tasks || []).filter(t => t.status === 'done').length, 0);
  const totalTasks = missions.reduce((n, p) => n + (p.tasks || []).length, 0);

  if (loading) return <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>Chargement…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Planning d'Interventions</div>
          {totalTasks > 0 && <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>
            Tâches: <span style={{ color: COLORS.success, fontWeight: 700 }}>{totalDone}/{totalTasks}</span>
          </div>}
        </div>
      </div>

      {/* Prediction card */}
      {prediction && (
        <div style={{ background: COLORS.accent + '0a', border: `1px solid ${COLORS.accent}25`, borderRadius: 16, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Zap size={14} color={COLORS.accent} />
            <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 800 }}>
              PRÉDICTION IA — Prochaine visite
            </span>
            <span style={{ fontSize: 10, color: COLORS.textMuted, marginLeft: 'auto' }}>
              Confiance: {prediction.confidence} · {prediction.visits_analyzed} visite(s) analysée(s)
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Sirop', val: `${prediction.predictions.sirop_L}L`, color: COLORS.info },
              { label: 'Pâte', val: `${prediction.predictions.pate_kg}kg`, color: COLORS.success },
              { label: 'Traitement', val: prediction.predictions.traitement, color: COLORS.error },
              { label: 'Cadres', val: prediction.predictions.cadres, color: COLORS.accent },
            ].map(p => (
              <div key={p.label} style={{ padding: '6px 14px', borderRadius: 10, background: p.color + '15', border: `1px solid ${p.color}30` }}>
                <span style={{ color: p.color, fontWeight: 800, fontSize: 13 }}>{p.val}</span>
                <span style={{ color: COLORS.textMuted, fontSize: 10, marginLeft: 5 }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New mission form */}
      <Section title="Nouvelle Mission" icon={Plus} color={COLORS.accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>DATE *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>TYPE</label>
              <select value={form.action_type} onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))} style={inputSt}>
                {['inspection', 'feeding', 'treatment', 'harvest', 'autre'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 6 }}>TÂCHES</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Ex: Changer la hausse…" value={newTask}
                onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                style={{ ...inputSt, flex: 1 }} />
              <button onClick={addTask}
                style={{ width: 44, height: 44, borderRadius: 11, background: COLORS.accent, border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={17} />
              </button>
            </div>
            {tasks.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {tasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderRadius: 9, background: 'rgba(28,10,0,0.03)', border: `1px solid ${COLORS.border}` }}>
                    <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 600 }}>{t}</span>
                    <button onClick={() => setTasks(l => l.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: COLORS.error, cursor: 'pointer' }}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={createMission}
            style={{ height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
            Créer la Mission <ArrowRight size={13} style={{ display: 'inline', marginLeft: 5 }} />
          </button>
        </div>
      </Section>

      {/* Missions list */}
      {missions.length === 0 ? (
        <div style={{ height: 140, background: 'rgba(28,10,0,0.03)', border: `2px dashed ${COLORS.border}`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9, color: COLORS.textMuted }}>
          <CalendarClock size={34} strokeWidth={1} style={{ opacity: 0.4 }} />
          <div style={{ fontWeight: 600, fontSize: 13 }}>Aucune mission planifiée</div>
        </div>
      ) : missions.map(p => {
        const taskList = p.tasks || [];
        const done = taskList.filter(t => t.status === 'done').length;
        const progress = taskList.length > 0 ? (done / taskList.length) * 100 : 0;
        const today = new Date().toISOString().split('T')[0];
        const overdue = p.status !== 'done' && p.scheduled_date < today;
        return (
          <div key={p.id} style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${overdue ? COLORS.error + '40' : COLORS.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(28,10,0,0.03)', borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: COLORS.text, fontWeight: 800 }}>{p.scheduled_date}</span>
                {p.action_type && <span style={{ fontSize: 10, color: COLORS.textMuted, background: 'rgba(28,10,0,0.07)', padding: '2px 8px', borderRadius: 6 }}>{p.action_type}</span>}
                {overdue && <span style={{ fontSize: 10, color: COLORS.error, fontWeight: 800 }}>EN RETARD</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: progress === 100 ? COLORS.success : '#fbbf24', fontWeight: 800 }}>{done}/{taskList.length}</span>
                <button onClick={() => deleteMission(p.id)}
                  style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
            <div style={{ height: 3, background: 'rgba(28,10,0,0.07)' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? COLORS.success : COLORS.accent, transition: 'width 0.3s' }} />
            </div>
            {/* Predicted needs */}
            {(p.predicted_sirop > 0 || p.predicted_pate > 0 || p.predicted_traitement > 0) && (
              <div style={{ padding: '8px 18px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700 }}>Prévu:</span>
                {p.predicted_sirop > 0 && <span style={{ fontSize: 10, color: COLORS.info }}>Sirop {p.predicted_sirop}L</span>}
                {p.predicted_pate > 0 && <span style={{ fontSize: 10, color: COLORS.success }}>Pâte {p.predicted_pate}kg</span>}
                {p.predicted_traitement > 0 && <span style={{ fontSize: 10, color: COLORS.error }}>Trait. {p.predicted_traitement}</span>}
              </div>
            )}
            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {taskList.map(task => {
                const cfg = TASK_STATUS[task.status] || TASK_STATUS.todo;
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, background: 'rgba(28,10,0,0.03)', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {task.status === 'done' ? <CheckCircle size={14} color={COLORS.success} /> : task.status === 'doing' ? <Clock size={14} color="#fbbf24" /> : <Circle size={14} color={COLORS.textMuted} />}
                      <span style={{ color: task.status === 'done' ? COLORS.textMuted : 'white', textDecoration: task.status === 'done' ? 'line-through' : 'none', fontSize: 12, fontWeight: 600 }}>{task.text}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {['todo', 'doing', 'done'].map(st => (
                        <button key={st} onClick={() => updateTaskStatus(p.id, task.id, st)}
                          style={{ padding: '3px 7px', borderRadius: 5, fontSize: 9, fontWeight: 800,
                            background: task.status === st ? cfg.color : 'transparent',
                            color: task.status === st ? (st === 'doing' ? 'black' : 'white') : COLORS.textMuted,
                            border: `1px solid ${task.status === st ? cfg.color : COLORS.border}`, cursor: 'pointer' }}>
                          {TASK_STATUS[st].label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  RÉCOLTE TAB — production liée à la ruche                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function RecolteTab({ hive, toast }) {
  const [prods, setProds]   = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ production_date: new Date().toISOString().split('T')[0], honey_kg: 0, pollen_kg: 0, quality_notes: '', flower_type: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [rp, rv] = await Promise.all([
      api(`${H_URL}/productions?hive_id=${hive.id}`),
      api(`${H_URL}/visits?hive_id=${hive.id}&limit=100`),
    ]);
    if (rp.ok) setProds(await rp.json());
    if (rv.ok) setVisits(await rv.json());
    setLoading(false);
  }, [hive.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    const res = await api(`${H_URL}/productions`, {
      method: 'POST',
      body: JSON.stringify({ ...form, hive_id: hive.id, apiary_id: hive.apiary_id,
        honey_kg: parseFloat(form.honey_kg) || 0, pollen_kg: parseFloat(form.pollen_kg) || 0 }),
    });
    if (res.ok) {
      toast('Récolte enregistrée'); load();
      setForm({ production_date: new Date().toISOString().split('T')[0], honey_kg: 0, pollen_kg: 0, quality_notes: '', flower_type: '' });
      setShowForm(false);
    } else toast('Erreur enregistrement récolte', 'error');
  };

  const deleteProd = async (id) => {
    await api(`${H_URL}/productions/${id}`, { method: 'DELETE' });
    load(); toast('Supprimée', 'warning');
  };

  const totalHoney  = [...prods, ...visits.filter(v => v.harvest_kg > 0)].reduce((s, x) => s + (x.honey_kg || x.harvest_kg || 0), 0);
  const totalPollen = [...prods, ...visits.filter(v => v.pollen_kg > 0)].reduce((s, x) => s + (x.pollen_kg || 0), 0);
  const visitHarvest = visits.reduce((s, v) => s + (v.harvest_kg || 0), 0);

  if (loading) return <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>Chargement…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Récoltes</div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, color: 'white', border: 'none', padding: '9px 18px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
          <Plus size={14} /> Enregistrer Récolte
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'Miel total (ruche)', value: `${totalHoney.toFixed(1)} kg`, color: COLORS.accent, icon: Droplets },
          { label: 'Pollen total', value: `${totalPollen.toFixed(1)} kg`, color: COLORS.success, icon: Activity },
          { label: 'Miel inspections', value: `${visitHarvest.toFixed(1)} kg`, color: COLORS.info, icon: TrendingUp },
        ].map(k => (
          <div key={k.label} style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <k.icon size={14} color={k.color} />
              <span style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}>{k.label}</span>
            </div>
            <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 20 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <Section title="Nouvelle récolte (ruche)" icon={Droplets}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>DATE</label>
              <input type="date" value={form.production_date} onChange={e => setForm(f => ({ ...f, production_date: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>MIEL (kg)</label>
              <input type="number" min="0" step="0.1" value={form.honey_kg} onChange={e => setForm(f => ({ ...f, honey_kg: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>POLLEN (kg)</label>
              <input type="number" min="0" step="0.1" value={form.pollen_kg} onChange={e => setForm(f => ({ ...f, pollen_kg: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>FLEUR</label>
              <input type="text" placeholder="Oranger, Thym…" value={form.flower_type} onChange={e => setForm(f => ({ ...f, flower_type: e.target.value }))} style={inputSt} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <input type="text" placeholder="Notes qualité…" value={form.quality_notes} onChange={e => setForm(f => ({ ...f, quality_notes: e.target.value }))} style={{ ...inputSt, flex: 1 }} />
            <button onClick={handleSubmit}
              style={{ height: 44, padding: '0 22px', borderRadius: 12, background: COLORS.accent, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Enregistrer
            </button>
          </div>
        </Section>
      )}

      {prods.length > 0 && (
        <Section title="Productions enregistrées (ruche)" icon={TrendingUp}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {prods.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderRadius: 11, background: 'rgba(28,10,0,0.03)', border: `1px solid ${COLORS.border}` }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{p.production_date}</span>
                  {p.flower_type && <span style={{ fontSize: 10, color: COLORS.success, background: COLORS.success + '15', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{p.flower_type}</span>}
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <span style={{ color: COLORS.accent, fontWeight: 800 }}>{p.honey_kg}kg miel</span>
                  {p.pollen_kg > 0 && <span style={{ color: COLORS.success, fontWeight: 700 }}>{p.pollen_kg}kg pollen</span>}
                  <button onClick={() => deleteProd(p.id)}
                    style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {visits.filter(v => v.harvest_kg > 0).length > 0 && (
        <Section title="Récoltes par inspection" icon={Calendar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {visits.filter(v => v.harvest_kg > 0 || v.pollen_kg > 0).map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 11, background: 'rgba(28,10,0,0.03)', border: `1px solid ${COLORS.border}` }}>
                <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{v.visit_date}</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  {v.harvest_kg > 0 && <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 13 }}>🍯 {v.harvest_kg}kg</span>}
                  {v.pollen_kg > 0 && <span style={{ color: COLORS.success, fontWeight: 800, fontSize: 13 }}>🌼 {v.pollen_kg}kg</span>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  FINANCE TAB — dépenses persistées en DB                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
function FinanceTab({ hive, toast }) {
  const [depenses, setDepenses]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm] = useState({ category: 'Alimentation', amount: '', expense_date: new Date().toISOString().split('T')[0], description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rd, rs] = await Promise.all([
        api(`${EXP_URL}?hive_id=${hive.id}`),
        api(`${EXP_URL}/summary?hive_id=${hive.id}`),
      ]);
      if (rd.ok) setDepenses(await rd.json());
      if (rs.ok) setSummary(await rs.json());
    } catch (err) {
      console.error("Finance load error:", err);
      toast("Erreur lors du chargement des finances", "error");
    } finally {
      setLoading(false);
    }
  }, [hive.id, toast]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast('Montant invalide', 'warning'); return; }
    const res = await api(EXP_URL, {
      method: 'POST',
      body: JSON.stringify({ ...form, hive_id: hive.id, amount: parseFloat(form.amount) }),
    });
    if (res.ok) {
      toast('Dépense enregistrée'); load();
      setForm({ category: 'Alimentation', amount: '', expense_date: new Date().toISOString().split('T')[0], description: '' });
      setShowForm(false);
    } else toast('Erreur enregistrement', 'error');
  };

  const deleteDepense = async (id) => {
    await api(`${EXP_URL}/${id}`, { method: 'DELETE' });
    load(); toast('Supprimée', 'warning');
  };

  if (loading) return <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>Chargement…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Finance & Dépenses</div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, color: 'white', border: 'none', padding: '9px 18px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
          <Plus size={14} /> Ajouter Dépense
        </button>
      </div>

      {/* KPIs financiers */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          {[
            { label: 'DÉPENSES', value: `${summary.total_expenses.toFixed(0)} TND`, color: COLORS.error },
            { label: 'MIEL PRODUIT', value: `${summary.total_honey_kg.toFixed(1)} kg`, color: COLORS.accent },
          ].map(k => (
            <div key={k.label} style={{ background: COLORS.surface, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '14px 16px' }}>
              <div style={{ color: COLORS.textMuted, fontSize: 9, fontWeight: 800, letterSpacing: '1px' }}>{k.label}</div>
              <div style={{ color: k.color, fontWeight: 900, fontSize: 18, marginTop: 4 }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* By category */}
      {summary?.by_category && Object.keys(summary.by_category).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(summary.by_category).map(([cat, total]) => (
            <div key={cat} style={{ padding: '6px 12px', borderRadius: 10, background: COLORS.accent + '10', border: `1px solid ${COLORS.border}` }}>
              <span style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}>{cat} </span>
              <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 12 }}>{total.toFixed(0)} TND</span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Section title="Nouvelle dépense" icon={Wallet}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>CATÉGORIE</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputSt}>
                {DEPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>MONTANT (TND)</label>
              <input type="number" min="0" step="0.1" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, display: 'block', marginBottom: 6 }}>DATE</label>
              <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} style={inputSt} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="text" placeholder="Description…" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ ...inputSt, flex: 1 }} />
            <button onClick={handleSubmit}
              style={{ height: 44, padding: '0 22px', borderRadius: 12, background: COLORS.accent, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Enregistrer
            </button>
          </div>
        </Section>
      )}

      {depenses.length === 0 ? (
        <div style={{ height: 140, background: 'rgba(28,10,0,0.03)', border: `2px dashed ${COLORS.border}`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: COLORS.textMuted }}>
          <Wallet size={34} strokeWidth={1} style={{ opacity: 0.4 }} />
          <div style={{ fontWeight: 600, fontSize: 13 }}>Aucune dépense enregistrée</div>
        </div>
      ) : (
        <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(28,10,0,0.04)' }}>
                {['CATÉGORIE', 'MONTANT', 'DATE', 'DESCRIPTION', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: COLORS.textMuted, fontSize: 9, fontWeight: 800, letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depenses.map(d => (
                <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 9px', borderRadius: 7, background: COLORS.accent + '15', color: COLORS.accent, fontSize: 10, fontWeight: 800 }}>{d.category}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: COLORS.text, fontWeight: 800 }}>{d.amount.toFixed(2)} TND</td>
                  <td style={{ padding: '10px 14px', color: COLORS.textMuted, fontSize: 12 }}>{d.expense_date}</td>
                  <td style={{ padding: '10px 14px', color: COLORS.textMuted, fontSize: 12 }}>{d.description || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => deleteDepense(d.id)}
                      style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  QUEEN BANK TAB — Gestion stock reines                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
function QueenBankTab({ hive, onUpdated, toast }) {
  const [addCount, setAddCount] = useState(1);
  const [saving, setSaving]     = useState(false);
  const [dispatches, setDispatches] = useState([]);

  // Load dispatch history from bee hives (non-queen-bank hives that have has_queen=true)
  useEffect(() => {
    api(`${H_URL}/hives`)
      .then(r => r.ok ? r.json() : [])
      .then(hives => {
        const filtered = hives.filter(h => h.hive_type !== 'queen_bank');
        // Sans reine first (most urgent)
        filtered.sort((a, b) => (a.has_queen ? 1 : 0) - (b.has_queen ? 1 : 0));
        setDispatches(filtered);
      })
      .catch(() => {});
  }, []);

  const addQueens = async () => {
    if (addCount < 1) return;
    setSaving(true);
    const body = {
      apiary_id: hive.apiary_id, identifier: hive.identifier, is_active: hive.is_active,
      health_score: hive.health_score, honey_level: hive.honey_level, force_level: hive.force_level,
      hive_type: hive.hive_type, queen_year: hive.queen_year, has_queen: hive.has_queen,
      queen_count: (hive.queen_count || 0) + addCount, notes: hive.notes,
    };
    const r = await api(`${H_URL}/hives/${hive.id}`, { method: 'PUT', body: JSON.stringify(body) });
    setSaving(false);
    if (r.ok) { toast(`+${addCount} reine(s) ajoutée(s) au stock`, 'success'); onUpdated(); }
    else toast('Erreur mise à jour', 'error');
  };

  const dispatchTo = async (targetHive) => {
    const r = await api(`${H_URL}/queen-bank/dispatch/${targetHive.id}`, { method: 'POST' });
    if (r.ok) {
      const d = await r.json();
      toast(`Reine envoyée vers ${targetHive.identifier} · Stock restant: ${d.queen_bank_remaining}`, 'success');
      onUpdated();
    } else {
      const err = await r.json().catch(() => ({}));
      toast(err.detail || 'Erreur envoi', 'error');
    }
  };

  const available = hive.queen_count || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Status banner */}
      <div style={{ padding: '18px 22px', borderRadius: 20, background: COLORS.accent + '0a', border: `1px solid ${COLORS.accent}30`, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ fontSize: 40 }}>👑</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Banque de Reines</div>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>
            {hive.identifier} · Stock actuel
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: COLORS.accent, fontWeight: 900, fontSize: 40, lineHeight: 1 }}>{available}</div>
          <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px' }}>REINE(S) DISPO</div>
        </div>
      </div>

      {/* Add queens */}
      <Section title="Ajouter des reines au stock" icon={Plus} color={COLORS.success}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <StepperInput label="Nombre de reines à ajouter" value={addCount} min={1}
            onChange={setAddCount} color={COLORS.success} />
          <button onClick={addQueens} disabled={saving}
            style={{ height: 46, padding: '0 24px', borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${COLORS.success}, #065f46)`,
              border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13,
              opacity: saving ? 0.7 : 1 }}>
            {saving ? '…' : `+ Ajouter ${addCount} reine(s)`}
          </button>
        </div>
      </Section>

      {/* Dispatch to hives */}
      <Section title="Envoyer une reine vers une ruche" icon={Zap} color={COLORS.accent}>
        {available === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: COLORS.textMuted, fontSize: 13 }}>
            Aucune reine disponible — ajoutez d'abord des reines au stock
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>
              Ruches qui ont déjà une reine (pour remplacement) ou ruches sans reine :
            </div>
            {dispatches.slice(0, 12).map(h2 => {
              const needsQueen = h2.has_queen === false;
              return (
                <div key={h2.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 12, background: needsQueen ? COLORS.error + '06' : 'rgba(28,10,0,0.03)',
                  border: `1px solid ${needsQueen ? COLORS.error + '30' : COLORS.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 13 }}>{h2.identifier}</span>
                      {needsQueen
                        ? <span style={{ fontSize: 9, fontWeight: 800, color: COLORS.error, background: COLORS.error + '18', padding: '2px 6px', borderRadius: 5 }}>SANS REINE</span>
                        : <span style={{ fontSize: 10, color: COLORS.success }}>♛</span>}
                    </div>
                    <span style={{ color: COLORS.textMuted, fontSize: 11 }}>
                      Santé: {h2.health_score?.toFixed(1)}/10
                    </span>
                  </div>
                  <button onClick={() => dispatchTo(h2)}
                    style={{ height: 34, padding: '0 14px', borderRadius: 10,
                      background: needsQueen ? COLORS.error + '20' : COLORS.accent + '18',
                      border: `1px solid ${needsQueen ? COLORS.error + '40' : COLORS.accent + '30'}`,
                      color: needsQueen ? COLORS.error : COLORS.accent,
                      fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>
                    Envoyer ♛
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN HIVE DETAIL VIEW                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
const HIVE_TABS = [
  { id: 'terrain',    label: 'Terrain',     icon: Zap },
  { id: 'monitor',    label: 'Monitor IA',  icon: ScanEye },
  { id: 'inspection', label: 'Inspection',  icon: ClipboardCheck },
  { id: 'logistique', label: 'Logistique',  icon: Boxes },
  { id: 'planning',   label: 'Planning',    icon: CalendarClock },
  { id: 'recolte',    label: 'Récolte',     icon: Droplets },
  { id: 'finance',    label: 'Finance',     icon: Wallet },
];

function gradeColor(score) {
  if (score >= 8) return COLORS.success;
  if (score >= 6) return '#fbbf24';
  if (score >= 4) return '#f97316';
  return COLORS.error;
}

export default function HiveDetailView({ hive, emplacements = [], onBack, toast }) {
  const [activeTab, setActiveTab] = useState(hive.hive_type === 'queen_bank' ? 'banque' : 'terrain');
  const [currentHive, setCurrentHive] = useState(hive);

  const apiary    = emplacements.find(e => e.id === currentHive.apiary_id);
  const score     = currentHive.health_score ?? 7;
  const grade     = score >= 8 ? 'A' : score >= 6 ? 'B' : score >= 4 ? 'C' : 'D';
  const isQBBank  = currentHive.hive_type === 'queen_bank';

  // Reload hive data after apply to reflect updated scores
  const refreshHive = useCallback(async () => {
    const r = await api(`${H_URL}/hives/${hive.id}`);
    if (r.ok) setCurrentHive(await r.json());
  }, [hive.id]);

  // Queen Bank: update queen_count via PUT
  const adjustQueenCount = useCallback(async (delta) => {
    const newCount = Math.max(0, (currentHive.queen_count || 0) + delta);
    const body = {
      apiary_id: currentHive.apiary_id, identifier: currentHive.identifier,
      is_active: currentHive.is_active, health_score: currentHive.health_score,
      honey_level: currentHive.honey_level, force_level: currentHive.force_level,
      hive_type: currentHive.hive_type, queen_year: currentHive.queen_year,
      has_queen: currentHive.has_queen, queen_count: newCount, notes: currentHive.notes,
    };
    const r = await api(`${H_URL}/hives/${currentHive.id}`, { method: 'PUT', body: JSON.stringify(body) });
    if (r.ok) setCurrentHive(await r.json());
    else toast('Erreur mise à jour stock reines', 'error');
  }, [currentHive, toast]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {/* Header banner */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '20px 20px 0 0', padding: '18px 26px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ background: 'rgba(28,10,0,0.07)', border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ width: 46, height: 46, borderRadius: 13,
          background: isQBBank ? COLORS.accent + '22' : gradeColor(score) + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          border: `1px solid ${isQBBank ? COLORS.accent + '40' : gradeColor(score) + '30'}`,
          fontSize: isQBBank ? 22 : undefined }}>
          {isQBBank ? '👑' : <Hexagon size={22} color={gradeColor(score)} />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: COLORS.text, fontWeight: 900, fontSize: 20 }}>{currentHive.identifier}</span>
            {isQBBank ? (
              <span style={{ padding: '3px 10px', borderRadius: 7, background: COLORS.accent + '22', color: COLORS.accent, fontSize: 12, fontWeight: 900 }}>
                👑 Banque de Reines
              </span>
            ) : (
              <span style={{ padding: '3px 9px', borderRadius: 7, background: gradeColor(score) + '20', color: gradeColor(score), fontSize: 12, fontWeight: 900 }}>Grade {grade}</span>
            )}
            {currentHive.is_active !== false && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 7, background: COLORS.success + '15', color: COLORS.success, fontSize: 10, fontWeight: 700 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.success, display: 'inline-block' }} /> Active
              </span>
            )}
            {/* Queen status for regular hives */}
            {!isQBBank && currentHive.has_queen === false && (
              <span style={{ padding: '3px 9px', borderRadius: 7, background: COLORS.error + '18', color: COLORS.error, fontSize: 10, fontWeight: 800 }}>
                ✕ Sans reine
              </span>
            )}
            {!isQBBank && currentHive.has_queen !== false && (
              <span style={{ color: COLORS.success, fontSize: 13 }} title="Reine présente">♛</span>
            )}
            {currentHive.hive_type && !isQBBank && (
              <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{currentHive.hive_type}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {apiary && <span style={{ color: COLORS.textMuted, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} /> {apiary.name}</span>}
            {!isQBBank && currentHive.queen_year && (
              <span style={{ color: COLORS.textMuted, fontSize: 11 }}>♛ Reine {currentHive.queen_year} ({new Date().getFullYear() - currentHive.queen_year} ans)</span>
            )}
            {/* Queen Bank: inline stock stepper */}
            {isQBBank && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: COLORS.textMuted, fontSize: 11 }}>Stock reines :</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.accent + '10', border: `1px solid ${COLORS.accent}30`, borderRadius: 10, padding: '3px 8px' }}>
                  <button onClick={() => adjustQueenCount(-1)}
                    style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(28,10,0,0.08)', border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: 'pointer', fontWeight: 900, fontSize: 14, lineHeight: 1 }}>−</button>
                  <span style={{ color: COLORS.accent, fontWeight: 900, fontSize: 15, minWidth: 24, textAlign: 'center' }}>
                    {currentHive.queen_count ?? 0}
                  </span>
                  <button onClick={() => adjustQueenCount(+1)}
                    style={{ width: 22, height: 22, borderRadius: 6, background: COLORS.accent + '22', border: 'none', color: COLORS.accent, cursor: 'pointer', fontWeight: 900, fontSize: 14, lineHeight: 1 }}>+</button>
                </div>
                <span style={{ color: COLORS.textMuted, fontSize: 10 }}>reine(s) disponible(s)</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(isQBBank ? [
            { label: 'REINES',  value: `${currentHive.queen_count ?? 0}`,               color: COLORS.accent },
            { label: 'SANTÉ',   value: `${score?.toFixed(1)}`,                           color: gradeColor(score) },
            { label: 'MIEL',    value: `${currentHive.honey_level?.toFixed(0) || 5}/10`, color: '#fbbf24' },
          ] : [
            { label: 'SANTÉ', value: `${score?.toFixed(1)}`,                             color: gradeColor(score) },
            { label: 'MIEL',  value: `${currentHive.honey_level?.toFixed(0) || 5}/10`,  color: COLORS.accent },
            { label: 'FORCE', value: `${currentHive.force_level?.toFixed(0) || 5}/10`,  color: COLORS.success },
          ]).map(m => (
            <div key={m.label} style={{ padding: '7px 12px', borderRadius: 11, background: 'rgba(28,10,0,0.04)', border: `1px solid ${COLORS.border}`, textAlign: 'center', minWidth: 58 }}>
              <div style={{ color: m.color, fontWeight: 900, fontSize: 14 }}>{m.value}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 8, fontWeight: 800, letterSpacing: '0.5px', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-tab bar */}
      <div style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, borderLeft: `1px solid ${COLORS.border}`, borderRight: `1px solid ${COLORS.border}`, display: 'flex', padding: '0 14px', overflowX: 'auto' }}>
        {(isQBBank
          ? [{ id: 'banque', label: '👑 Banque', icon: Package }, ...HIVE_TABS.filter(t => t.id === 'monitor' || t.id === 'finance')]
          : HIVE_TABS
        ).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 16px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${COLORS.accent}` : '2px solid transparent',
              color: activeTab === tab.id ? COLORS.accent : COLORS.textMuted, cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 12, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 22, background: COLORS.bg, borderRadius: '0 0 20px 20px', border: `1px solid ${COLORS.border}`, borderTop: 'none' }}>
        {activeTab === 'banque'     && <QueenBankTab hive={currentHive} onUpdated={refreshHive} toast={toast} />}
        {activeTab === 'terrain'    && <FieldModeTab       hive={currentHive} onVisitCreated={refreshHive} toast={toast} />}
        {activeTab === 'monitor'    && <EntranceMonitorTab hive={currentHive} toast={toast} />}
        {activeTab === 'inspection' && <InspectionTab      hive={currentHive} onVisitCreated={refreshHive} toast={toast} />}
        {activeTab === 'logistique' && <LogistiqueTab hive={currentHive} toast={toast} />}
        {activeTab === 'planning'   && <PlanningTab   hive={currentHive} toast={toast} />}
        {activeTab === 'recolte'    && <RecolteTab    hive={currentHive} toast={toast} />}
        {activeTab === 'finance'    && <FinanceTab     hive={currentHive} toast={toast} />}
      </div>
    </div>
  );
}
