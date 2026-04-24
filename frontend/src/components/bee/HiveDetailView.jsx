import { useState, useRef } from 'react';
import {
  ArrowLeft, Hexagon, MapPin, ClipboardCheck, Boxes,
  CalendarClock, Droplets, Wallet, Heart, Package,
  Plus, Trash2, Calendar, ThumbsUp, AlertTriangle,
  AlertCircle, ShieldPlus, Camera, Upload, X, Navigation,
  Thermometer, CheckCircle, Circle, Clock, ArrowRight,
  Activity, TrendingUp, DollarSign
} from 'lucide-react';
import { COLORS } from './BeeConstants';

const HEALTH_OPTIONS = [
  { id: 'health',    label: 'Bonne santé',       icon: ThumbsUp,      color: COLORS.success },
  { id: 'warning',   label: 'À surveiller',       icon: AlertTriangle,  color: '#fbbf24' },
  { id: 'urgent',    label: 'Urgent',             icon: AlertCircle,    color: COLORS.error },
  { id: 'treatment', label: 'Traitement requis',  icon: ShieldPlus,     color: COLORS.info }
];

const TASK_STATUS = {
  todo:  { label: 'À FAIRE',  color: COLORS.textMuted },
  doing: { label: 'EN COURS', color: '#fbbf24' },
  done:  { label: 'TERMINÉ',  color: COLORS.success }
};

const DEPENSE_TYPES = ['Alimentation', 'Traitement', 'Équipement', 'Main-d\'œuvre', 'Transport', 'Autre'];

function healthBadge(state) {
  const opt = HEALTH_OPTIONS.find(h => h.id === state) || HEALTH_OPTIONS[0];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: opt.color + '18', color: opt.color,
      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800
    }}>
      <opt.icon size={11} /> {opt.label}
    </span>
  );
}

function Section({ title, icon: Icon, color = COLORS.accent, children, action }) {
  return (
    <div style={{ background: COLORS.surface, borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} color={color} />
          </div>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

const inputSt = {
  width: '100%', height: 44, background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${COLORS.border}`, borderRadius: 12,
  padding: '0 14px', color: 'white', outline: 'none', fontSize: 13
};

/* ─────────────────────────────────────────────────────────────── */
/*  INSPECTION TAB                                                  */
/* ─────────────────────────────────────────────────────────────── */
function InspectionTab({ hive, visites, emplacements, onAddVisit, onDeleteVisit }) {
  const photoInputRef = useRef(null);
  const videoRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [form, setForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    health_state: 'health', temperature: '', honey_level: 'Moyen',
    needs_sirop: 0, needs_pate: 0, needs_traitement: 0,
    harvest_kg: 0, pollen_kg: 0, notes: '', photo_url: '', gps_coords: ''
  });

  const hiveVisits = visites.filter(v => v.hive_id === hive.id || String(v.hive_id) === String(hive.id));

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

  const handleSubmit = () => {
    onAddVisit({ ...form, hive_id: hive.id, apiary_id: hive.apiary_id });
    setForm({ visit_date: new Date().toISOString().split('T')[0], health_state: 'health', temperature: '', honey_level: 'Moyen', needs_sirop: 0, needs_pate: 0, needs_traitement: 0, harvest_kg: 0, pollen_kg: 0, notes: '', photo_url: '', gps_coords: '' });
    setShowForm(false);
  };

  if (showForm) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <ArrowLeft size={16} /> Retour à l'historique
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
            style={{ ...inputSt, width: 160 }} />
          <button onClick={captureGPS} style={{ display: 'flex', alignItems: 'center', gap: 6, background: form.gps_coords ? COLORS.success + '18' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.gps_coords ? COLORS.success + '40' : COLORS.border}`, color: form.gps_coords ? COLORS.success : COLORS.textMuted, padding: '0 14px', height: 44, borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
            <Navigation size={14} /> {form.gps_coords ? '✓ GPS' : 'GPS'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Santé */}
        <Section title="Bilan de santé" icon={Heart}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {HEALTH_OPTIONS.map(st => (
              <button key={st.id} onClick={() => setForm(f => ({ ...f, health_state: st.id }))}
                style={{ padding: '12px', borderRadius: 14, cursor: 'pointer', border: form.health_state === st.id ? `2px solid ${st.color}` : `1px solid ${COLORS.border}`, background: form.health_state === st.id ? st.color + '18' : 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <st.icon size={16} color={st.color} />
                <span style={{ fontWeight: 700, fontSize: 12, color: 'white' }}>{st.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Fournitures */}
        <Section title="Fournitures utilisées" icon={Package}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[{ key: 'needs_sirop', label: 'Sirop (L)', color: COLORS.info }, { key: 'needs_pate', label: 'Pâte (kg)', color: COLORS.success }, { key: 'needs_traitement', label: 'Traitements', color: COLORS.error }].map(f => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: f.color }}>{f.label}</span>
                <input type="number" min="0" value={form[f.key]} onChange={e => setForm(ff => ({ ...ff, [f.key]: parseFloat(e.target.value) || 0 }))}
                  style={{ background: 'none', border: 'none', color: 'white', fontSize: 18, fontWeight: 900, outline: 'none', width: 60, textAlign: 'right' }} />
              </div>
            ))}
          </div>
        </Section>

        {/* Récolte */}
        <Section title="Récolte (kg)" icon={Droplets} color={COLORS.accent}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[{ key: 'harvest_kg', label: 'Miel', color: COLORS.accent }, { key: 'pollen_kg', label: 'Pollen', color: COLORS.success }].map(f => (
              <div key={f.key} style={{ padding: 14, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: f.color, display: 'block', marginBottom: 6 }}>{f.label}</span>
                <input type="number" min="0" step="0.1" placeholder="0.0" value={form[f.key] || ''} onChange={e => setForm(ff => ({ ...ff, [f.key]: parseFloat(e.target.value) || 0 }))}
                  style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, fontWeight: 900, outline: 'none', width: '100%' }} />
              </div>
            ))}
          </div>
        </Section>

        {/* Temp + Photo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Section title="Température (°C)" icon={Thermometer} color="#fbbf24">
            <input type="number" step="0.1" placeholder="ex: 23.5" value={form.temperature || ''} onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))} style={{ ...inputSt, fontSize: 20, fontWeight: 800, height: 52 }} />
          </Section>
          <Section title="Niveau de miel" icon={Droplets}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Faible', 'Moyen', 'Bon', 'Excellent'].map(lvl => (
                <button key={lvl} onClick={() => setForm(f => ({ ...f, honey_level: lvl }))}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700, border: form.honey_level === lvl ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`, background: form.honey_level === lvl ? COLORS.accent + '20' : 'rgba(255,255,255,0.02)', color: form.honey_level === lvl ? COLORS.accent : COLORS.textMuted }}>
                  {lvl}
                </button>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Constat visuel */}
      <Section title="Constat visuel & Photo" icon={Camera}>
        <input type="file" ref={photoInputRef} onChange={e => { const r = new FileReader(); r.onloadend = () => setForm(f => ({ ...f, photo_url: r.result })); r.readAsDataURL(e.target.files[0]); }} accept="image/*" style={{ display: 'none' }} />
        {showCamera ? (
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 220 }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={takePhoto} style={{ width: 52, height: 52, borderRadius: '50%', background: 'white', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer' }} />
              <button onClick={() => { videoRef.current?.srcObject?.getTracks().forEach(t => t.stop()); setShowCamera(false); }} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
          </div>
        ) : form.photo_url ? (
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 180 }}>
            <img src={form.photo_url} alt="Inspection" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button onClick={() => setForm(f => ({ ...f, photo_url: '' }))} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: COLORS.error, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigator.mediaDevices?.getUserMedia({ video: true }).then(s => { setShowCamera(true); setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 50); }).catch(() => alert("Caméra non disponible"))}
              style={{ flex: 1, height: 80, border: `2px dashed ${COLORS.border}`, borderRadius: 14, background: 'none', color: COLORS.textMuted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Camera size={20} /><span style={{ fontSize: 11, fontWeight: 600 }}>Camera</span>
            </button>
            <button onClick={() => photoInputRef.current?.click()}
              style={{ flex: 1, height: 80, border: `2px dashed ${COLORS.border}`, borderRadius: 14, background: 'none', color: COLORS.textMuted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Upload size={20} /><span style={{ fontSize: 11, fontWeight: 600 }}>Galerie</span>
            </button>
          </div>
        )}
      </Section>

      {/* Notes */}
      <Section title="Observations & Notes" icon={ClipboardCheck}>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Comportement des abeilles, état du couvain, présence de maladies..."
          style={{ width: '100%', minHeight: 100, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '12px 16px', color: 'white', resize: 'vertical', outline: 'none', fontSize: 13, lineHeight: 1.6 }} />
      </Section>

      <button onClick={handleSubmit}
        style={{ height: 60, borderRadius: 18, background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, border: 'none', color: 'white', fontSize: 16, fontWeight: 900, cursor: 'pointer', letterSpacing: '0.5px', boxShadow: `0 10px 30px -8px ${COLORS.accent}60` }}>
        Valider l'Inspection
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 20 }}>Historique des Inspections</div>
          <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>{hiveVisits.length} inspection(s)</div>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, color: 'white', border: 'none', padding: '11px 22px', borderRadius: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Plus size={16} /> Nouvelle Inspection
        </button>
      </div>

      {hiveVisits.length === 0 ? (
        <div style={{ height: 200, background: 'rgba(255,255,255,0.02)', border: `2px dashed ${COLORS.border}`, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: COLORS.textMuted }}>
          <ClipboardCheck size={40} strokeWidth={1} style={{ opacity: 0.4 }} />
          <div style={{ fontWeight: 600 }}>Aucune inspection enregistrée</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hiveVisits.map(v => (
            <div key={v.id} style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar size={18} color={COLORS.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>{v.visit_date}</span>
                  {healthBadge(v.health_state)}
                  {v.honey_level && <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Miel: {v.honey_level}</span>}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                  {v.harvest_kg > 0 && <span style={{ fontSize: 12, color: COLORS.accent, fontWeight: 700 }}>🍯 {v.harvest_kg}kg</span>}
                  {v.pollen_kg > 0 && <span style={{ fontSize: 12, color: COLORS.success, fontWeight: 700 }}>🌼 {v.pollen_kg}kg</span>}
                  {v.needs_sirop > 0 && <span style={{ fontSize: 12, color: COLORS.info }}>Sirop: {v.needs_sirop}L</span>}
                  {v.needs_traitement > 0 && <span style={{ fontSize: 12, color: COLORS.error }}>Traitement: {v.needs_traitement}</span>}
                  {v.temperature && <span style={{ fontSize: 12, color: '#fbbf24' }}>🌡 {v.temperature}°C</span>}
                </div>
                {v.notes && <div style={{ marginTop: 6, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' }}>{v.notes.slice(0, 120)}{v.notes.length > 120 ? '…' : ''}</div>}
              </div>
              <button onClick={() => onDeleteVisit(v.id)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  LOGISTIQUE TAB                                                  */
/* ─────────────────────────────────────────────────────────────── */
function LogistiqueTab({ hive, visites }) {
  const hiveVisits = visites.filter(v => v.hive_id === hive.id || String(v.hive_id) === String(hive.id));
  const totals = hiveVisits.reduce((acc, v) => ({
    sirop: acc.sirop + (v.needs_sirop || 0),
    pate:  acc.pate  + (v.needs_pate  || 0),
    traitement: acc.traitement + (v.needs_traitement || 0),
  }), { sirop: 0, pate: 0, traitement: 0 });

  const last = hiveVisits[0];

  const items = [
    { label: 'Sirop consommé total', value: `${totals.sirop.toFixed(1)} L`, color: COLORS.info, icon: Droplets },
    { label: 'Pâte consommée total', value: `${totals.pate.toFixed(1)} kg`, color: COLORS.success, icon: Package },
    { label: 'Traitements total', value: totals.traitement, color: COLORS.error, icon: ShieldPlus },
    { label: 'Dernière alimentation', value: last?.needs_sirop > 0 ? `${last.needs_sirop}L (${last.visit_date})` : '—', color: COLORS.accent, icon: Calendar },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ color: 'white', fontWeight: 900, fontSize: 20 }}>Suivi Logistique</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {items.map(item => (
          <div key={item.label} style={{ background: COLORS.surface, borderRadius: 18, border: `1px solid ${COLORS.border}`, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <item.icon size={20} color={item.color} />
            </div>
            <div>
              <div style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: 20, marginTop: 4 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Besoins actuels */}
      <Section title="Besoins actuels estimés" icon={Boxes}>
        {last ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: last.needs_sirop > 0 ? COLORS.info + '10' : 'rgba(255,255,255,0.02)', border: `1px solid ${last.needs_sirop > 0 ? COLORS.info + '30' : COLORS.border}` }}>
              <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>Sirop sucré</span>
              <span style={{ color: last.needs_sirop > 0 ? COLORS.info : COLORS.textMuted, fontWeight: 800 }}>{last.needs_sirop > 0 ? `${last.needs_sirop} L requis` : 'Non nécessaire'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: last.needs_pate > 0 ? COLORS.success + '10' : 'rgba(255,255,255,0.02)', border: `1px solid ${last.needs_pate > 0 ? COLORS.success + '30' : COLORS.border}` }}>
              <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>Pâte protéinée</span>
              <span style={{ color: last.needs_pate > 0 ? COLORS.success : COLORS.textMuted, fontWeight: 800 }}>{last.needs_pate > 0 ? `${last.needs_pate} kg requis` : 'Non nécessaire'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: last.needs_traitement > 0 ? COLORS.error + '10' : 'rgba(255,255,255,0.02)', border: `1px solid ${last.needs_traitement > 0 ? COLORS.error + '30' : COLORS.border}` }}>
              <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>Traitement Varroa</span>
              <span style={{ color: last.needs_traitement > 0 ? COLORS.error : COLORS.textMuted, fontWeight: 800 }}>{last.needs_traitement > 0 ? `${last.needs_traitement} application(s)` : 'RAS'}</span>
            </div>
          </div>
        ) : (
          <div style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Effectuez une inspection pour évaluer les besoins.</div>
        )}
      </Section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  PLANNING TAB                                                    */
/* ─────────────────────────────────────────────────────────────── */
function PlanningTab({ hive, previsions, onAddPrevision, onUpdateTask }) {
  const [form, setForm] = useState({ date: '', note: '' });
  const [newTask, setNewTask] = useState('');
  const [taskList, setTaskList] = useState([]);

  const hivePrev = previsions.filter(p => String(p.rucheId) === String(hive.identifier) || String(p.hive_id) === String(hive.id));

  const addTask = () => { if (!newTask.trim()) return; setTaskList(l => [...l, newTask.trim()]); setNewTask(''); };

  const handleCreate = () => {
    const finalTasks = [...taskList, ...(newTask.trim() ? [newTask.trim()] : [])];
    if (!form.date || finalTasks.length === 0) { alert('Date et au moins une tâche sont requis.'); return; }
    onAddPrevision({ rucheId: hive.identifier, hive_id: hive.id, empId: hive.apiary_id, ...form, tasks: finalTasks });
    setForm({ date: '', note: '' }); setTaskList([]); setNewTask('');
  };

  const totalDone = hivePrev.reduce((n, p) => n + (p.tasks || []).filter(t => t.status === 'done').length, 0);
  const totalTasks = hivePrev.reduce((n, p) => n + (p.tasks || []).length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 20 }}>Planning d'Interventions</div>
          {totalTasks > 0 && <div style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4 }}>Tâches: <span style={{ color: COLORS.success, fontWeight: 700 }}>{totalDone}/{totalTasks}</span></div>}
        </div>
      </div>

      {/* New mission form */}
      <Section title="Nouvelle Mission" icon={Plus} color={COLORS.accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputSt} />
          <div>
            <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px', display: 'block', marginBottom: 8 }}>TÂCHES</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Ex: Changer la hausse..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} style={{ ...inputSt, flex: 1 }} />
              <button onClick={addTask} style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.accent, border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={18} />
              </button>
            </div>
            {taskList.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {taskList.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.border}` }}>
                    <span style={{ fontSize: 12, color: 'white', fontWeight: 600 }}>{t}</span>
                    <button onClick={() => setTaskList(l => l.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: COLORS.error, cursor: 'pointer' }}><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleCreate} style={{ height: 46, borderRadius: 14, background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
            Créer la Mission <ArrowRight size={14} style={{ display: 'inline', marginLeft: 6 }} />
          </button>
        </div>
      </Section>

      {/* Missions list */}
      {hivePrev.length === 0 ? (
        <div style={{ height: 160, background: 'rgba(255,255,255,0.02)', border: `2px dashed ${COLORS.border}`, borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: COLORS.textMuted }}>
          <CalendarClock size={36} strokeWidth={1} style={{ opacity: 0.4 }} />
          <div style={{ fontWeight: 600, fontSize: 13 }}>Aucune mission planifiée</div>
        </div>
      ) : hivePrev.map(p => {
        const tasks = p.tasks || [];
        const done = tasks.filter(t => t.status === 'done').length;
        const progress = tasks.length > 0 ? (done / tasks.length) * 100 : 0;
        return (
          <div key={p.id} style={{ background: COLORS.surface, borderRadius: 18, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ color: 'white', fontWeight: 800 }}>{p.date}</span>
              <span style={{ fontSize: 12, color: progress === 100 ? COLORS.success : '#fbbf24', fontWeight: 800 }}>{done}/{tasks.length}</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? COLORS.success : COLORS.accent, transition: 'width 0.3s' }} />
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.map(task => {
                const cfg = TASK_STATUS[task.status] || TASK_STATUS.todo;
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {task.status === 'done' ? <CheckCircle size={15} color={COLORS.success} /> : task.status === 'doing' ? <Clock size={15} color="#fbbf24" /> : <Circle size={15} color={COLORS.textMuted} />}
                      <span style={{ color: task.status === 'done' ? COLORS.textMuted : 'white', textDecoration: task.status === 'done' ? 'line-through' : 'none', fontSize: 13, fontWeight: 600 }}>{task.text}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['todo', 'doing', 'done'].map(st => (
                        <button key={st} onClick={() => onUpdateTask(p.id, task.id, st)}
                          style={{ padding: '4px 8px', borderRadius: 6, fontSize: 9, fontWeight: 800, background: task.status === st ? TASK_STATUS[st].color : 'transparent', color: task.status === st ? (st === 'doing' ? 'black' : 'white') : COLORS.textMuted, border: `1px solid ${task.status === st ? TASK_STATUS[st].color : COLORS.border}`, cursor: 'pointer' }}>
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

/* ─────────────────────────────────────────────────────────────── */
/*  RÉCOLTE TAB                                                     */
/* ─────────────────────────────────────────────────────────────── */
function RecolteTab({ hive, visites, productions, onAddProd, onDeleteProd }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ production_date: new Date().toISOString().split('T')[0], honey_kg: 0, pollen_kg: 0, quality_notes: '' });

  const hiveVisits = visites.filter(v => v.hive_id === hive.id || String(v.hive_id) === String(hive.id));
  const hiveProd = productions.filter(p => p.apiary_id === hive.apiary_id);

  const totalHoney  = hiveVisits.reduce((s, v) => s + (v.harvest_kg || 0), 0);
  const totalPollen = hiveVisits.reduce((s, v) => s + (v.pollen_kg || 0), 0);
  const apProdHoney = hiveProd.reduce((s, p) => s + (p.honey_kg || 0), 0);

  const handleSubmit = () => {
    onAddProd({ ...form, apiary_id: hive.apiary_id });
    setForm({ production_date: new Date().toISOString().split('T')[0], honey_kg: 0, pollen_kg: 0, quality_notes: '' });
    setShowForm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20 }}>Récoltes</div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, color: 'white', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Plus size={15} /> Enregistrer Récolte
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          { label: 'Miel (inspections)', value: `${totalHoney.toFixed(1)} kg`, color: COLORS.accent, icon: Droplets },
          { label: 'Pollen (inspections)', value: `${totalPollen.toFixed(1)} kg`, color: COLORS.success, icon: TrendingUp },
          { label: 'Récoltes site', value: `${apProdHoney.toFixed(1)} kg`, color: COLORS.info, icon: Activity },
        ].map(k => (
          <div key={k.label} style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <k.icon size={16} color={k.color} />
              <span style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700 }}>{k.label}</span>
            </div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 22 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <Section title="Nouvelle récolte du site" icon={Droplets}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6 }}>DATE</label>
              <input type="date" value={form.production_date} onChange={e => setForm(f => ({ ...f, production_date: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6 }}>MIEL (kg)</label>
              <input type="number" min="0" step="0.1" value={form.honey_kg} onChange={e => setForm(f => ({ ...f, honey_kg: parseFloat(e.target.value) || 0 }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6 }}>POLLEN (kg)</label>
              <input type="number" min="0" step="0.1" value={form.pollen_kg} onChange={e => setForm(f => ({ ...f, pollen_kg: parseFloat(e.target.value) || 0 }))} style={inputSt} />
            </div>
            <button onClick={handleSubmit} style={{ height: 44, borderRadius: 12, background: COLORS.accent, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
              Enregistrer
            </button>
          </div>
          <input type="text" placeholder="Notes qualité..." value={form.quality_notes} onChange={e => setForm(f => ({ ...f, quality_notes: e.target.value }))} style={{ ...inputSt, marginTop: 12 }} />
        </Section>
      )}

      {/* Visit harvests */}
      {hiveVisits.filter(v => v.harvest_kg > 0 || v.pollen_kg > 0).length > 0 && (
        <Section title="Récoltes par inspection" icon={Calendar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hiveVisits.filter(v => v.harvest_kg > 0 || v.pollen_kg > 0).map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}` }}>
                <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{v.visit_date}</span>
                <div style={{ display: 'flex', gap: 16 }}>
                  {v.harvest_kg > 0 && <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 14 }}>🍯 {v.harvest_kg}kg</span>}
                  {v.pollen_kg > 0 && <span style={{ color: COLORS.success, fontWeight: 800, fontSize: 14 }}>🌼 {v.pollen_kg}kg</span>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Site productions */}
      {hiveProd.length > 0 && (
        <Section title="Récoltes enregistrées (site)" icon={TrendingUp}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {hiveProd.slice(0, 10).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}` }}>
                <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{p.production_date}</span>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ color: COLORS.accent, fontWeight: 800 }}>{p.honey_kg}kg miel</span>
                  {p.pollen_kg > 0 && <span style={{ color: COLORS.success, fontWeight: 700 }}>{p.pollen_kg}kg pollen</span>}
                  <button onClick={() => onDeleteProd(p.id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  FINANCE TAB                                                     */
/* ─────────────────────────────────────────────────────────────── */
function FinanceTab({ hive, depenses, onAddDepense, onDeleteDepense }) {
  const [form, setForm] = useState({ type: 'Alimentation', montantReel: '', date: new Date().toISOString().split('T')[0], description: '' });
  const [showForm, setShowForm] = useState(false);

  const hiveDepenses = depenses.filter(d => String(d.hiveId) === String(hive.id) || String(d.hiveId) === String(hive.identifier) || !d.hiveId);
  const total = hiveDepenses.reduce((s, d) => s + (parseFloat(d.montantReel) || 0), 0);
  const byType = DEPENSE_TYPES.map(t => ({ type: t, total: hiveDepenses.filter(d => d.type === t).reduce((s, d) => s + (parseFloat(d.montantReel) || 0), 0) })).filter(x => x.total > 0);

  const handleSubmit = () => {
    if (!form.montantReel) { alert('Entrez un montant.'); return; }
    onAddDepense({ ...form, id: Date.now(), hiveId: hive.id });
    setForm({ type: 'Alimentation', montantReel: '', date: new Date().toISOString().split('T')[0], description: '' });
    setShowForm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'white', fontWeight: 900, fontSize: 20 }}>Finance & Dépenses</div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, color: 'white', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Plus size={15} /> Ajouter Dépense
        </button>
      </div>

      {/* Total */}
      <div style={{ background: COLORS.surface, borderRadius: 20, border: `1px solid ${COLORS.border}`, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: COLORS.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DollarSign size={26} color={COLORS.accent} />
        </div>
        <div>
          <div style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 700 }}>TOTAL DÉPENSES</div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 32 }}>{total.toFixed(2)} <span style={{ fontSize: 16, color: COLORS.textMuted }}>TND</span></div>
        </div>
        {byType.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {byType.map(b => (
              <div key={b.type} style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}` }}>
                <span style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}>{b.type}</span>
                <span style={{ color: 'white', fontWeight: 800, marginLeft: 6 }}>{b.total.toFixed(0)} TND</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <Section title="Nouvelle dépense" icon={Wallet}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6 }}>CATÉGORIE</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputSt}>
                {DEPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6 }}>MONTANT (TND)</label>
              <input type="number" min="0" step="0.1" placeholder="0.00" value={form.montantReel} onChange={e => setForm(f => ({ ...f, montantReel: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6 }}>DATE</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputSt} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input type="text" placeholder="Description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputSt, flex: 1 }} />
            <button onClick={handleSubmit} style={{ height: 44, padding: '0 24px', borderRadius: 12, background: COLORS.accent, border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Enregistrer
            </button>
          </div>
        </Section>
      )}

      {/* List */}
      {hiveDepenses.length === 0 ? (
        <div style={{ height: 160, background: 'rgba(255,255,255,0.02)', border: `2px dashed ${COLORS.border}`, borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: COLORS.textMuted }}>
          <Wallet size={36} strokeWidth={1} style={{ opacity: 0.4 }} />
          <div style={{ fontWeight: 600, fontSize: 13 }}>Aucune dépense enregistrée</div>
        </div>
      ) : (
        <div style={{ background: COLORS.surface, borderRadius: 18, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['CATÉGORIE', 'MONTANT', 'DATE', 'DESCRIPTION', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: COLORS.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hiveDepenses.map(d => (
                <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 8, background: COLORS.accent + '15', color: COLORS.accent, fontSize: 11, fontWeight: 800 }}>{d.type}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'white', fontWeight: 800 }}>{parseFloat(d.montantReel).toFixed(2)} TND</td>
                  <td style={{ padding: '12px 16px', color: COLORS.textMuted, fontSize: 13 }}>{d.date}</td>
                  <td style={{ padding: '12px 16px', color: COLORS.textMuted, fontSize: 13 }}>{d.description || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => onDeleteDepense(d.id)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} />
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

/* ─────────────────────────────────────────────────────────────── */
/*  MAIN HIVE DETAIL VIEW                                           */
/* ─────────────────────────────────────────────────────────────── */
const HIVE_TABS = [
  { id: 'inspection', label: 'Inspection',   icon: ClipboardCheck },
  { id: 'logistique', label: 'Logistique',   icon: Boxes },
  { id: 'planning',   label: 'Planning',     icon: CalendarClock },
  { id: 'recolte',    label: 'Récolte',      icon: Droplets },
  { id: 'finance',    label: 'Finance',      icon: Wallet },
];

function gradeColor(score) {
  if (score >= 8) return COLORS.success;
  if (score >= 6) return '#fbbf24';
  if (score >= 4) return '#f97316';
  return COLORS.error;
}

export default function HiveDetailView({
  hive, emplacements = [], visites = [], productions = [],
  depenses = [], previsions = [],
  onBack, onAddVisit, onDeleteVisit,
  onAddProd, onDeleteProd,
  onAddDepense, onDeleteDepense,
  onAddPrevision, onUpdateTask,
}) {
  const [activeTab, setActiveTab] = useState('inspection');
  const apiary = emplacements.find(e => e.id === hive.apiary_id);
  const score = hive.health_score ?? 7;
  const grade = score >= 8 ? 'A' : score >= 6 ? 'B' : score >= 4 ? 'C' : 'D';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {/* Hive header banner */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '20px 20px 0 0', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={17} />
        </button>

        <div style={{ width: 48, height: 48, borderRadius: 14, background: gradeColor(score) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${gradeColor(score)}30` }}>
          <Hexagon size={24} color={gradeColor(score)} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 22 }}>{hive.identifier}</span>
            <span style={{ padding: '3px 10px', borderRadius: 8, background: gradeColor(score) + '20', color: gradeColor(score), fontSize: 13, fontWeight: 900 }}>Grade {grade}</span>
            {hive.is_active !== false && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 8, background: COLORS.success + '15', color: COLORS.success, fontSize: 11, fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.success, display: 'inline-block' }} /> Active
              </span>
            )}
            {hive.hive_type && <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{hive.hive_type}</span>}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            {apiary && <span style={{ color: COLORS.textMuted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={12} /> {apiary.name}</span>}
            {hive.queen_year && <span style={{ color: COLORS.textMuted, fontSize: 12 }}>♛ Reine {hive.queen_year} ({new Date().getFullYear() - hive.queen_year} ans)</span>}
            <span style={{ color: COLORS.textMuted, fontSize: 12 }}>Santé: <span style={{ color: gradeColor(score), fontWeight: 700 }}>{score?.toFixed(1)}/10</span></span>
          </div>
        </div>

        {/* Mini metrics */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'SANTÉ', value: `${score?.toFixed(1)}`, color: gradeColor(score) },
            { label: 'MIEL', value: `${hive.honey_level?.toFixed(0) || 5}/10`, color: COLORS.accent },
            { label: 'FORCE', value: `${hive.force_level?.toFixed(0) || 5}/10`, color: COLORS.success },
          ].map(m => (
            <div key={m.label} style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.border}`, textAlign: 'center', minWidth: 64 }}>
              <div style={{ color: m.color, fontWeight: 900, fontSize: 16 }}>{m.value}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 9, fontWeight: 800, letterSpacing: '0.5px', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-tab bar */}
      <div style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, borderLeft: `1px solid ${COLORS.border}`, borderRight: `1px solid ${COLORS.border}`, display: 'flex', padding: '0 16px' }}>
        {HIVE_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? `2px solid ${COLORS.accent}` : '2px solid transparent', color: activeTab === tab.id ? COLORS.accent : COLORS.textMuted, cursor: 'pointer', fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 13, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: COLORS.bg, borderRadius: '0 0 20px 20px', border: `1px solid ${COLORS.border}`, borderTop: 'none' }}>
        {activeTab === 'inspection' && <InspectionTab hive={hive} visites={visites} emplacements={emplacements} onAddVisit={onAddVisit} onDeleteVisit={onDeleteVisit} />}
        {activeTab === 'logistique' && <LogistiqueTab hive={hive} visites={visites} />}
        {activeTab === 'planning'   && <PlanningTab hive={hive} previsions={previsions} onAddPrevision={onAddPrevision} onUpdateTask={onUpdateTask} />}
        {activeTab === 'recolte'    && <RecolteTab hive={hive} visites={visites} productions={productions} onAddProd={onAddProd} onDeleteProd={onDeleteProd} />}
        {activeTab === 'finance'    && <FinanceTab hive={hive} depenses={depenses} onAddDepense={onAddDepense} onDeleteDepense={onDeleteDepense} />}
      </div>
    </div>
  );
}
