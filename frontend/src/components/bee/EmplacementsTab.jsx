import { MapPin, Plus, Navigation, Sun, X, ChevronDown, Trash2 } from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function EmplacementsTab({ emplacements, onAdd, modalActive, setModalActive, empForm, setEmpForm, captureGPS, handleAddEmp, onDelete }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>Emplacements GIS</h1>
        <button 
          onClick={() => setModalActive('emplacement')} 
          style={{ 
            padding: '12px 28px', 
            background: COLORS.accent, 
            border: 'none', 
            borderRadius: 16, 
            color: 'white', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            boxShadow: '0 4px 14px 0 rgba(217,119,6,0.39)',
            cursor: 'pointer'
          }}
        >
          <Plus size={20}/> Ajouter un emplacement
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {emplacements.map(e => (
          <div 
            key={e.id} 
            style={{ 
              background: COLORS.surface, 
              border: `1px solid ${COLORS.border}`, 
              borderRadius: 24, 
              padding: 24,
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={22} color={COLORS.accent} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                 <div style={{ background: COLORS.info + '15', padding: '4px 12px', borderRadius: 8, color: COLORS.info, fontSize: 11, fontWeight: 700 }}>
                   {e.saison}
                 </div>
                 <button 
                   onClick={(event) => { event.stopPropagation(); onDelete(e.id); }}
                   style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '6px', borderRadius: 8, color: COLORS.error, cursor: 'pointer' }}
                 >
                   <Trash2 size={14} />
                 </button>
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 8 }}>{e.nom}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textMuted, fontSize: 13, marginBottom: 16 }}>
              <Navigation size={14} /> {e.lat}, {e.lng}
            </div>
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ color: COLORS.textMuted, fontSize: 12 }}>Floraison: <span style={{ color: 'white', fontWeight: 600 }}>{e.typeFleur}</span></div>
               <div style={{ color: COLORS.success, fontWeight: 800, fontSize: 14 }}>{e.production || 0} kg</div>
            </div>
          </div>
        ))}
      </div>

      {modalActive === 'emplacement' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: COLORS.surface, width: 500, borderRadius: 28, border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ padding: '24px 32px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>Ajouter un emplacement</h2>
               <button onClick={() => setModalActive(null)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer' }}><X size={20}/></button>
            </div>
            
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 600 }}>Nom de l'emplacement</label>
                  <input 
                    value={empForm.nom} 
                    onChange={(e)=>setEmpForm({...empForm, nom: e.target.value})} 
                    placeholder="ex: Grombalia Nord" 
                    style={{ width: '100%', height: 50, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', fontSize: 15, outline: 'none' }} 
                  />
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 600 }}>Saison</label>
                  <div style={{ position: 'relative' }}>
                     <Sun size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: COLORS.info }}/>
                     <select 
                        value={empForm.saison} 
                        onChange={(e)=>setEmpForm({...empForm, saison: e.target.value})} 
                        style={{ width: '100%', height: 50, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 44px', color: 'white', fontSize: 15, appearance: 'none', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="Printemps">Printemps</option>
                        <option value="Eté">Été</option>
                        <option value="Automne">Automne</option>
                        <option value="Hiver">Hiver</option>
                     </select>
                     <ChevronDown size={18} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, pointerEvents: 'none' }}/>
                  </div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 600 }}>Type de floraison</label>
                  <input 
                    value={empForm.fleur} 
                    onChange={(e)=>setEmpForm({...empForm, fleur: e.target.value})} 
                    placeholder="ex: Oranger, Thym..." 
                    style={{ width: '100%', height: 50, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', fontSize: 15, outline: 'none' }} 
                  />
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <label style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: 600 }}>Localisation (GPS)</label>
                     <button 
                        onClick={() => captureGPS()} 
                        style={{ background: 'none', border: 'none', color: COLORS.accent, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                      >
                       <Navigation size={14}/> Capturer ma position
                     </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                     <input value={empForm.lat} onChange={(e)=>setEmpForm({...empForm, lat: e.target.value})} placeholder="Latitude" style={{ height: 50, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', fontSize: 14, outline: 'none' }} />
                     <input value={empForm.lng} onChange={(e)=>setEmpForm({...empForm, lng: e.target.value})} placeholder="Longitude" style={{ height: 50, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '0 16px', color: 'white', fontSize: 14, outline: 'none' }} />
                  </div>
               </div>

               <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <button onClick={() => setModalActive(null)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, fontWeight: 700, cursor: 'pointer', padding: '12px 24px' }}>Annuler</button>
                  <button 
                    onClick={handleAddEmp} 
                    style={{ background: COLORS.accent, border: 'none', borderRadius: 14, padding: '14px 32px', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(217,119,6,0.39)' }}
                  >
                    Ajouter l'emplacement
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
