import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft, ClipboardCheck, Calendar, Trash2, Plus,
  Heart, Droplets, Package, Camera, Upload, X, Navigation,
  Thermometer, Info, ArrowRight
} from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import { HEALTH_OPTIONS, Section, StepperInput, inputSt, healthBadge } from './HiveShared.jsx';

function ApplyModal({ preview, visitId, onApply, onSkip }) {
  const [applying, setApplying] = useState(false);
  const up = preview?.hive_updates || {};
  const deduct = preview?.stock_deductions || {};
  const prod = preview?.production_entry;

  const handleApply = async () => {
    setApplying(true);
    const res = await beeApi.applyVisit(visitId);
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
                padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.04)',
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
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
              border: 'none', color: 'white', fontWeight: 800, fontSize: 14,
              opacity: applying ? 0.7 : 1 }}>
            {applying ? '…' : '✓ Appliquer'}
          </button>
          <button onClick={onSkip}
            style={{ flex: 1, height: 48, borderRadius: 14, cursor: 'pointer',
              background: 'rgba(0,0,0,0.07)', border: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted, fontWeight: 700, fontSize: 14 }}>
            Ignorer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InspectionTab({ hive, onVisitCreated, toast }) {
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
    const r = await beeApi.getVisitsByHive(hive.id, 50);
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

    const prevRes = await beeApi.previewVisit(payload);
    const prevData = prevRes.ok ? await prevRes.json() : null;

    const res = await beeApi.createVisit(payload);
    if (!res.ok) { toast('Erreur lors de l\'enregistrement', 'error'); setSubmitting(false); return; }
    const saved = await res.json();
    setSubmitting(false);
    setShowForm(false);
    setForm({ visit_date: new Date().toISOString().split('T')[0], health_state: 'health', temperature: '',
      honey_level: 'Moyen', needs_sirop: 0, needs_pate: 0, needs_traitement: 0,
      harvest_kg: 0, pollen_kg: 0, notes: '', photo_url: '', gps_coords: '' });
    load();

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
    await beeApi.deleteVisit(id);
    load(); onVisitCreated();
    toast('Inspection supprimée', 'warning');
  };

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
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: form.gps_coords ? COLORS.success + '18' : COLORS.surface,
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
                    background: form.health_state === st.id ? st.color + '18' : COLORS.surface,
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
                    background: form.honey_level === lvl ? COLORS.accent + '20' : COLORS.surface,
                    color: form.honey_level === lvl ? COLORS.accent : COLORS.textMuted }}>
                  {lvl}
                </button>
              ))}
            </div>
            <Section title="Température (°C)" icon={Thermometer} color={COLORS.honey}>
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
              <div key={f.key} style={{ padding: 14, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: 'rgba(0,0,0,0.03)' }}>
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
            style={{ width: '100%', minHeight: 90, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '12px 14px', color: COLORS.text, resize: 'vertical', outline: 'none', fontSize: 13, lineHeight: 1.6 }} />
        </Section>

        <button onClick={handleSubmit} disabled={submitting}
          style={{ height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, border: 'none', color: 'white', fontSize: 15, fontWeight: 900, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
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
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`, color: 'white', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
          <Plus size={15} /> Nouvelle Inspection
        </button>
      </div>

      {loadingV ? <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: 40 }}>Chargement…</div>
        : visites.length === 0 ? (
          <div style={{ height: 180, background: 'rgba(0,0,0,0.03)', border: `2px dashed ${COLORS.border}`, borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: COLORS.textMuted }}>
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
                    {v.temperature && <span style={{ color: COLORS.honey, fontSize: 11 }}>🌡 {v.temperature}°C</span>}
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
