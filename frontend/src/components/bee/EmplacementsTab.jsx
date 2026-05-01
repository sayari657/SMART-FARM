import { MapPin, Plus, Navigation, X, Trash2, LayoutGrid } from 'lucide-react';
import { COLORS } from './BeeConstants';
import { useState } from 'react';

export default function EmplacementsTab({ emplacements = [], onAction, handleAddEmp, onDelete, modalActive, setModalActive, onSelectSite }) {
  const [empForm, setEmpForm] = useState({
    name: '',
    region: '',
    season: 'Printemps',
    flower_type: '',
    latitude: '',
    longitude: ''
  });

  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setEmpForm({ ...empForm, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) });
      });
    }
  };

  const submitEmp = () => {
    const payload = {
       ...empForm,
       latitude: empForm.latitude === '' ? null : parseFloat(empForm.latitude),
       longitude: empForm.longitude === '' ? null : parseFloat(empForm.longitude)
    };
    handleAddEmp(payload);
    setModalActive(null);
    setEmpForm({ name: '', region: '', season: 'Printemps', flower_type: '', latitude: '', longitude: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h1 style={{ fontSize: 32, fontWeight: 800, color: COLORS.text }}>Sites & Emplacements</h1>
           <p style={{ color: COLORS.textMuted }}>Gérez vos parcs apicoles géolocalisés</p>
        </div>
        <button
          onClick={() => setModalActive('emplacement')}
          style={{ padding: '12px 28px', background: COLORS.accent, border: 'none', borderRadius: 16, color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 14px 0 rgba(217,119,6,0.3)', cursor: 'pointer' }}
        >
          <Plus size={20} /> Nouveau Site
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {emplacements.length === 0 ? (
           <div style={{ gridColumn: '1/-1', padding: 60, textAlign: 'center', background: COLORS.surface, borderRadius: 32, border: `1px dashed ${COLORS.border}` }}>
              <MapPin size={48} color={COLORS.textMuted} style={{ marginBottom: 16, opacity: 0.5 }} />
              <div style={{ color: COLORS.textMuted }}>Aucun site enregistré pour le moment.</div>
           </div>
        ) : emplacements.map(e => (
          <div
            key={e.id}
            onClick={() => onSelectSite ? onSelectSite(e) : onAction('ruches', 'filterHives', e)}
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 28, padding: 24, transition: 'all 0.3s', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={(e) => {
               e.currentTarget.style.transform = 'translateY(-6px)';
               e.currentTarget.style.borderColor = COLORS.accent;
            }}
            onMouseLeave={(e) => {
               e.currentTarget.style.transform = 'translateY(0)';
               e.currentTarget.style.borderColor = COLORS.border;
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: COLORS.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={24} color={COLORS.accent} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ background: COLORS.info + '15', padding: '6px 14px', borderRadius: 10, color: COLORS.info, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                  {e.season || e.saison}
                </div>
                <button
                  onClick={(event) => { event.stopPropagation(); onDelete(e.id); }}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '8px', borderRadius: 10, color: COLORS.error, cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.text, marginBottom: 6 }}>{e.name || e.nom}</div>
            <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
               <Navigation size={14} color={COLORS.accent} /> {e.latitude || e.lat}, {e.longitude || e.lng}
            </div>
            
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>Floraison</span>
                 <span style={{ color: COLORS.text, fontWeight: 700, fontSize: 14 }}>{e.flower_type || e.typeFleur}</span>
              </div>
              <div style={{ padding: '8px 12px', background: COLORS.accentGlow, border: `1px solid ${COLORS.border}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                 <LayoutGrid size={14} color={COLORS.accent} />
                 <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 13 }}>Accéder aux ruches</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalActive === 'emplacement' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: COLORS.surface, width: 500, borderRadius: 32, border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: COLORS.text, fontSize: 22, fontWeight: 900 }}>Configuration du Site</h2>
              <button onClick={() => setModalActive(null)} style={{ background: COLORS.bg2, border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, cursor: 'pointer', width: 40, height: 40, borderRadius: '50%' }}><X size={20} /></button>
            </div>

            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
                 <div>
                    <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 800, marginBottom: 8, display: 'block' }}>NOM DU SITE</label>
                    <input value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} placeholder="ex: Parc Nord" style={{ width: '100%', height: 50, background: '#FEFCF7', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: COLORS.text, fontSize: 15 }} />
                 </div>
                 <div>
                    <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 800, marginBottom: 8, display: 'block' }}>SAISON</label>
                    <select value={empForm.season} onChange={(e) => setEmpForm({ ...empForm, season: e.target.value })} style={{ width: '100%', height: 50, background: '#FEFCF7', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: COLORS.text }}>
                       <option>Printemps</option><option>Eté</option><option>Automne</option><option>Hiver</option>
                    </select>
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                 <div>
                    <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 800, marginBottom: 8, display: 'block' }}>RÉGION / GOUVERNORAT</label>
                    <input value={empForm.region} onChange={(e) => setEmpForm({ ...empForm, region: e.target.value })} placeholder="ex: Bizerte" style={{ width: '100%', height: 50, background: '#FEFCF7', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: COLORS.text, fontSize: 15 }} />
                 </div>
                 <div>
                    <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 800, marginBottom: 8, display: 'block' }}>TYPE DE FLORAISON</label>
                    <input value={empForm.flower_type} onChange={(e) => setEmpForm({ ...empForm, flower_type: e.target.value })} placeholder="ex: Oranger, Thym..." style={{ width: '100%', height: 50, background: '#FEFCF7', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: COLORS.text }} />
                 </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 800 }}>GÉOLOCALISATION</label>
                  <button onClick={captureGPS} style={{ background: 'none', border: 'none', color: COLORS.accent, fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>CAPTURER GPS</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <input value={empForm.latitude} onChange={(e) => setEmpForm({ ...empForm, latitude: e.target.value })} placeholder="Lat" style={{ height: 50, background: '#FEFCF7', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: COLORS.text }} />
                  <input value={empForm.longitude} onChange={(e) => setEmpForm({ ...empForm, longitude: e.target.value })} placeholder="Lng" style={{ height: 50, background: '#FEFCF7', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: COLORS.text }} />
                </div>
              </div>

              <button onClick={submitEmp} style={{ height: 60, background: COLORS.accent, border: 'none', borderRadius: 16, color: 'white', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(217,119,6,0.3)', marginTop: 12 }}>
                 ENREGISTRER LE SITE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
