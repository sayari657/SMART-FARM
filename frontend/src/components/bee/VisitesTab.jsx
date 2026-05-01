import { useRef, useState } from 'react';
import {
  ArrowLeft, QrCode, Calendar, Navigation,
  ThumbsUp, AlertTriangle, AlertCircle, Droplets, Camera,
  Plus, Package, X, Upload, ShieldPlus, Trash2, MapPin,
  Heart, Search, Thermometer, CheckCircle
} from 'lucide-react';
import { COLORS } from './BeeConstants';

const HEALTH_OPTIONS = [
  { id: 'health',    label: 'En bonne santé',   icon: ThumbsUp,     color: COLORS.success },
  { id: 'warning',   label: 'À surveiller',      icon: AlertTriangle, color: '#fbbf24' },
  { id: 'urgent',    label: 'Urgent',             icon: AlertCircle,   color: COLORS.error },
  { id: 'treatment', label: 'Traitement requis',  icon: ShieldPlus,    color: COLORS.info }
];

const healthBadge = (state) => {
  const opt = HEALTH_OPTIONS.find(h => h.id === state) || HEALTH_OPTIONS[0];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: opt.color + '18', color: opt.color,
      padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase'
    }}>
      <opt.icon size={12} /> {opt.label}
    </span>
  );
};

export default function VisitesTab({
  visites = [], ruches = [], emplacements = [],
  isAddingVisit, setIsAddingVisit,
  visiteForm = {}, setVisiteForm,
  handleAddVisite, onDelete
}) {
  const photoInputRef = useRef(null);
  const videoRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHealth, setFilterHealth] = useState('');

  /* ── Photo helpers ── */
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setVisiteForm({ ...visiteForm, photo_url: reader.result }); setPhotoMenuOpen(false); };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      setShowCamera(true); setPhotoMenuOpen(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setVisiteForm({ ...visiteForm, photo_url: canvas.toDataURL('image/jpeg') });
    stopCamera();
  };

  const stopCamera = () => {
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
  };

  const captureGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setVisiteForm({ ...visiteForm, gps_coords: `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}` });
    });
  };

  /* ── Filtered visits ── */
  const filteredVisites = visites.filter(v => {
    const ruche = ruches.find(r => r.id === (v.hive_id || v.rucheId));
    const matchSearch = !searchTerm || (ruche?.identifier || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchHealth = !filterHealth || v.health_state === filterHealth;
    return matchSearch && matchHealth;
  });

  const inputStyle = {
    width: '100%', height: 48, background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${COLORS.border}`, borderRadius: 12,
    padding: '0 16px', color: 'white', outline: 'none', fontSize: 14
  };

  /* ═══════════════════ ADD VISIT FORM ═══════════════════ */
  if (isAddingVisit) return (
    <div style={{ background: COLORS.surface, borderRadius: 32, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '28px 40px', borderBottom: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.02)' }}>
        <button onClick={() => setIsAddingVisit(false)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
          <ArrowLeft size={18} /> Retour à l'historique
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: COLORS.accent + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={28} color={COLORS.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: 0 }}>Nouvelle Inspection</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 12 }}>
              {/* Ruche selector */}
              <select
                value={visiteForm.hive_id || ''}
                onChange={(e) => {
                  const ruche = ruches.find(r => r.id === Number(e.target.value));
                  setVisiteForm({ ...visiteForm, hive_id: e.target.value, apiary_id: ruche?.apiary_id || '' });
                }}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 20, fontWeight: 800, cursor: 'pointer', outline: 'none' }}
              >
                <option value="">Sélectionner une ruche...</option>
                {ruches.map(r => <option key={r.id} value={r.id}>{r.identifier} ({emplacements.find(e => e.id === r.apiary_id)?.name || 'Site ?'})</option>)}
              </select>
              {/* Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.accentLight, fontWeight: 700 }}>
                <Calendar size={16} />
                <input
                  type="date"
                  value={visiteForm.visit_date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setVisiteForm({ ...visiteForm, visit_date: e.target.value })}
                  style={{ background: 'transparent', border: 'none', color: COLORS.accentLight, fontWeight: 700, cursor: 'pointer', outline: 'none' }}
                />
              </div>
              {/* GPS */}
              <button onClick={captureGPS} style={{ display: 'flex', alignItems: 'center', gap: 8, color: visiteForm.gps_coords ? COLORS.success : COLORS.textMuted, background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                <Navigation size={16} color={visiteForm.gps_coords ? COLORS.success : COLORS.accent} />
                {visiteForm.gps_coords ? '✓ GPS capturé' : 'Capturer GPS'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Bilan santé */}
            <div style={{ background: COLORS.bg, borderRadius: 24, padding: 28, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Heart size={18} color={COLORS.textMuted} />
                <span style={{ fontSize: 11, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1.5px' }}>BILAN DE SANTÉ</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {HEALTH_OPTIONS.map(st => (
                  <button
                    key={st.id}
                    onClick={() => setVisiteForm({ ...visiteForm, health_state: st.id })}
                    style={{
                      padding: '16px', borderRadius: 16, cursor: 'pointer',
                      border: visiteForm.health_state === st.id ? `2px solid ${st.color}` : `1px solid ${COLORS.border}`,
                      background: visiteForm.health_state === st.id ? `${st.color}18` : 'rgba(255,255,255,0.02)',
                      color: 'white', display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'all 0.2s'
                    }}
                  >
                    <st.icon size={20} color={st.color} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fournitures */}
            <div style={{ background: COLORS.bg, borderRadius: 24, padding: 28, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Package size={18} color={COLORS.textMuted} />
                <span style={{ fontSize: 11, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1.5px' }}>FOURNITURES UTILISÉES</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                {[
                  { key: 'needs_sirop',      label: 'Sirop (L)',   color: COLORS.info },
                  { key: 'needs_pate',       label: 'Pâte (kg)',   color: COLORS.success },
                  { key: 'needs_traitement', label: 'Traitement',  color: COLORS.error }
                ].map(item => (
                  <div key={item.key} style={{ padding: '16px', borderRadius: 16, border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: item.color, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{item.label}</span>
                    <input
                      type="number" min="0"
                      value={visiteForm[item.key] || 0}
                      onChange={(e) => setVisiteForm({ ...visiteForm, [item.key]: parseInt(e.target.value) || 0 })}
                      style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, fontWeight: 900, outline: 'none', width: '100%' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Récolte */}
            <div style={{ background: COLORS.bg, borderRadius: 24, padding: 28, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Droplets size={18} color={COLORS.accent} />
                <span style={{ fontSize: 11, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1.5px' }}>RÉCOLTE (KG)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                {[
                  { key: 'harvest_kg', label: 'Miel', color: COLORS.accent },
                  { key: 'pollen_kg',  label: 'Pollen', color: '#10b981' }
                ].map(f => (
                  <div key={f.key} style={{ padding: 16, borderRadius: 16, border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: f.color, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{f.label}</span>
                    <input
                      type="number" min="0" step="0.1"
                      placeholder="0.0"
                      value={visiteForm[f.key] || ''}
                      onChange={(e) => setVisiteForm({ ...visiteForm, [f.key]: parseFloat(e.target.value) || 0 })}
                      style={{ background: 'none', border: 'none', color: 'white', fontSize: 22, fontWeight: 900, outline: 'none', width: '100%' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Température */}
            <div style={{ background: COLORS.bg, borderRadius: 24, padding: 28, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Thermometer size={18} color="#fbbf24" />
                <span style={{ fontSize: 11, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1.5px' }}>TEMPÉRATURE AMBIANTE (°C)</span>
              </div>
              <input
                type="number" step="0.1"
                placeholder="ex: 23.5"
                value={visiteForm.temperature || ''}
                onChange={(e) => setVisiteForm({ ...visiteForm, temperature: e.target.value })}
                style={{ ...inputStyle, fontSize: 20, fontWeight: 800, height: 56 }}
              />
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Photo */}
            <div style={{ background: COLORS.bg, borderRadius: 24, padding: 28, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Camera size={18} color={COLORS.textMuted} />
                <span style={{ fontSize: 11, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1.5px' }}>CONSTAT VISUEL</span>
              </div>
              <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />

              {showCamera ? (
                <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', height: 260, background: 'black' }}>
                  <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
                    <button onClick={takePhoto} style={{ width: 56, height: 56, borderRadius: '50%', background: 'white', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer' }} />
                    <button onClick={stopCamera} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ) : visiteForm.photo_url ? (
                <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', height: 220, border: `1px solid ${COLORS.border}` }}>
                  <img src={visiteForm.photo_url} alt="Inspection" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setVisiteForm({ ...visiteForm, photo_url: '' })} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: COLORS.error, color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setPhotoMenuOpen(!photoMenuOpen)} style={{ width: '100%', height: 130, border: `2px dashed ${COLORS.border}`, borderRadius: 20, background: 'rgba(255,255,255,0.01)', color: COLORS.textMuted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'border-color 0.2s' }}>
                    <Camera size={28} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Ajouter une photo</span>
                  </button>
                  {photoMenuOpen && (
                    <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 8, zIndex: 10, boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                      <button onClick={startCamera} style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', color: 'white', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 10 }}>
                        <Camera size={16} color={COLORS.accent} /> Prendre une photo
                      </button>
                      <button onClick={() => photoInputRef.current?.click()} style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', color: 'white', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 10 }}>
                        <Upload size={16} color={COLORS.accent} /> Galerie / Fichier
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Honey level selector */}
            <div style={{ background: COLORS.bg, borderRadius: 24, padding: 28, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Droplets size={18} color={COLORS.accent} />
                <span style={{ fontSize: 11, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1.5px' }}>NIVEAU DE MIEL</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Faible', 'Moyen', 'Bon', 'Excellent'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setVisiteForm({ ...visiteForm, honey_level: lvl })}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      border: visiteForm.honey_level === lvl ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                      background: visiteForm.honey_level === lvl ? COLORS.accent + '20' : 'rgba(255,255,255,0.02)',
                      color: visiteForm.honey_level === lvl ? COLORS.accent : COLORS.textMuted,
                      transition: 'all 0.2s'
                    }}
                  >{lvl}</button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ background: COLORS.bg, borderRadius: 24, padding: 28, border: `1px solid ${COLORS.border}`, flex: 1 }}>
              <label style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 900, letterSpacing: '1.5px', display: 'block', marginBottom: 16 }}>OBSERVATIONS & NOTES</label>
              <textarea
                value={visiteForm.notes || ''}
                onChange={(e) => setVisiteForm({ ...visiteForm, notes: e.target.value })}
                placeholder="Décrivez vos observations : comportement des abeilles, état du couvain, présence de maladies..."
                style={{ width: '100%', minHeight: 140, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, color: 'white', resize: 'vertical', lineHeight: 1.6, outline: 'none', fontSize: 13 }}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={() => handleAddVisite(visiteForm)}
          style={{ width: '100%', height: 68, borderRadius: 20, background: `linear-gradient(135deg, ${COLORS.accent} 0%, #92400e 100%)`, border: 'none', color: 'white', fontSize: 17, fontWeight: 900, marginTop: 32, cursor: 'pointer', letterSpacing: '0.5px', boxShadow: `0 12px 30px -8px ${COLORS.accent}60`, transition: 'transform 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Valider l'Inspection & Mettre à jour l'Écosystème
        </button>
      </div>
    </div>
  );

  /* ═══════════════════ VISITS LIST ═══════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0 }}>Inspections</h1>
          <p style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 13 }}>{filteredVisites.length} inspection(s) enregistrée(s)</p>
        </div>
        <button
          onClick={() => setIsAddingVisit(true)}
          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #92400e)`, color: 'white', border: 'none', padding: '13px 28px', borderRadius: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 4px 20px ${COLORS.accent}40` }}
        >
          <Plus size={20} /> Nouvelle Inspection
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted }} />
          <input
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher par ruche..."
            style={{ width: '100%', height: 44, paddingLeft: 44, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, color: 'white', outline: 'none', fontSize: 13 }}
          />
        </div>
        <select
          value={filterHealth} onChange={e => setFilterHealth(e.target.value)}
          style={{ height: 44, paddingLeft: 16, paddingRight: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, color: 'white', outline: 'none', fontSize: 13 }}
        >
          <option value="">Tous les états</option>
          {HEALTH_OPTIONS.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              {['DATE', 'RUCHE', 'SITE', 'ÉTAT', 'RÉCOLTE', 'ACTIONS'].map(h => (
                <th key={h} style={{ padding: '16px 24px', textAlign: 'left', color: COLORS.textMuted, fontSize: 11, fontWeight: 800, letterSpacing: '1px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredVisites.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '60px 0', textAlign: 'center', color: COLORS.textMuted }}>
                  <CheckCircle size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune inspection enregistrée</div>
                  <div style={{ fontSize: 12, marginTop: 6 }}>Cliquez sur "Nouvelle Inspection" pour commencer</div>
                </td>
              </tr>
            ) : filteredVisites.map((v) => {
              const ruche = ruches.find(r => r.id === (v.hive_id || v.rucheId));
              const site = emplacements.find(e => e.id === (v.apiary_id || ruche?.apiary_id));
              return (
                <tr key={v.id} style={{ borderTop: `1px solid ${COLORS.border}`, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '18px 24px', color: 'white', fontWeight: 600, fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={14} color={COLORS.textMuted} />
                      {v.visit_date || v.date || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '18px 24px' }}>
                    <span style={{ color: 'white', fontWeight: 800 }}>{ruche?.identifier || v.hive_id || '—'}</span>
                  </td>
                  <td style={{ padding: '18px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: COLORS.textMuted, fontSize: 13 }}>
                      <MapPin size={12} /> {site?.name || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '18px 24px' }}>
                    {healthBadge(v.health_state || v.etat || 'health')}
                  </td>
                  <td style={{ padding: '18px 24px' }}>
                    {(v.harvest_kg > 0 || v.pollen_kg > 0) ? (
                      <div style={{ fontSize: 13 }}>
                        {v.harvest_kg > 0 && <span style={{ color: COLORS.accent, fontWeight: 700 }}>{v.harvest_kg}kg miel</span>}
                        {v.harvest_kg > 0 && v.pollen_kg > 0 && <span style={{ color: COLORS.border }}> · </span>}
                        {v.pollen_kg > 0 && <span style={{ color: COLORS.success, fontWeight: 700 }}>{v.pollen_kg}kg pollen</span>}
                      </div>
                    ) : <span style={{ color: COLORS.textMuted, fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '18px 24px' }}>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(v.id)}
                        style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: 'none', color: COLORS.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
