import React, { useRef, useState } from 'react';
import { 
  ArrowLeft, QrCode, Map as MapIcon, Calendar, Navigation, PenLine, 
  ThumbsUp, AlertTriangle, AlertCircle, Sun, Droplets, Camera, CheckCircle,
  Plus, MapPin, ChevronDown, FileText, Image as ImageIcon, Trash2,
  Package, Zap, Info, Play, X, Upload, ShieldPlus
} from 'lucide-react';
import { COLORS } from './BeeConstants';

export default function VisitesTab({ 
  visites = [], ruches = [], isAddingVisit, setIsAddingVisit, 
  visiteForm = {}, setVisiteForm, captureGPS, handleAddVisite 
}) {
  const photoInputRef = useRef(null);
  const videoRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  // Sécurités pour éviter les crashs si visiteForm est incomplet
  const safeNeeds = visiteForm?.needs || { sirop: 0, pate: 0, traitement: 0 };
  const safePollen = visiteForm?.pollenKgs || 0;
  const safeRecolte = visiteForm?.recolteKgs || 0;

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVisiteForm({ ...visiteForm, photo: reader.result });
        setPhotoMenuOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setShowCamera(true);
      setPhotoMenuOpen(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Erreur d'accès à la caméra. Vérifiez les permissions.");
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const photo = canvas.toDataURL('image/jpeg');
    setVisiteForm({ ...visiteForm, photo });
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const removePhoto = (e) => {
    e.stopPropagation();
    setVisiteForm({ ...visiteForm, photo: null });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {isAddingVisit ? (
        <div style={{ background: COLORS.surface, borderRadius: 32, border: `1px solid ${COLORS.border}`, overflow: 'hidden', minHeight: '80vh' }}>
          <div style={{ padding: '32px 40px', borderBottom: `1px solid ${COLORS.border}` }}>
            <button 
              onClick={() => setIsAddingVisit(false)} 
              style={{ background: 'none', border: 'none', color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 16, fontWeight: 600, marginBottom: 24 }}
            >
              <ArrowLeft size={20}/> Retour à l'historique
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 64, height: 60, borderRadius: 16, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={30} color={COLORS.accent}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                   <select 
                     value={visiteForm?.rucheId || ''} 
                     onChange={(e) => setVisiteForm({ ...visiteForm, rucheId: e.target.value })} 
                     style={{ background: 'rgba(255,255,255,0.02)', border: 'none', color: 'white', fontSize: 24, fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                   >
                     <option value="">Sélectionner une ruche...</option>
                     {ruches.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                   </select>
                   <span style={{ color: COLORS.textMuted, fontSize: 13 }}>(QR Code optionnel)</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 40, marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: COLORS.accentLight, fontWeight: 700 }}><Calendar size={20}/> {visiteForm?.date || 'Aujourd\'hui'}</div>
              <button 
                onClick={() => captureGPS()} 
                style={{ display: 'flex', alignItems: 'center', gap: 12, color: COLORS.textMuted, background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                <Navigation size={20} color={COLORS.accent}/> {visiteForm?.gps || 'GPS (Optionnel)'}
              </button>
            </div>
          </div>

          <div style={{ padding: '40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32 }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <div style={{ background: COLORS.bg, borderRadius: 24, padding: '32px', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <PenLine size={20} color={COLORS.textMuted}/> 
                      <span style={{ fontSize: 12, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1px' }}>BILAN DE SANTÉ</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                      {[
                        { label: 'En bonne santé', icon: ThumbsUp, color: COLORS.success, id: 'health' },
                        { label: 'À surveiller', icon: AlertTriangle, color: '#fbbf24', id: 'warning' },
                        { label: 'Urgent', icon: AlertCircle, color: COLORS.error, id: 'urgent' },
                        { label: 'Traitement requis', icon: ShieldPlus, color: COLORS.info, id: 'treatment' }
                      ].map(st => (
                        <button 
                          key={st.id} 
                          onClick={() => setVisiteForm({ ...visiteForm, etat: st.id })} 
                          style={{ padding: '16px', borderRadius: 16, border: visiteForm?.etat === st.id ? `2px solid ${st.color}` : `1px solid ${COLORS.border}`, background: visiteForm?.etat === st.id ? `${st.color}15` : 'rgba(255,255,255,0.02)', color: 'white', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                        >
                          <st.icon size={20} color={st.color}/>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{st.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: COLORS.bg, borderRadius: 24, padding: '32px', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <Package size={20} color={COLORS.textMuted}/> 
                      <span style={{ fontSize: 12, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1px' }}>FOURNITURES UTILISÉES</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                       {['sirop', 'pate', 'traitement'].map(item => (
                         <div key={item} style={{ padding: '12px 16px', borderRadius: 16, border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.textMuted, textTransform: 'uppercase' }}>{item}</span>
                            <input 
                              type="number" 
                              value={safeNeeds[item] || 0}
                              onChange={(e) => setVisiteForm({ ...visiteForm, needs: { ...safeNeeds, [item]: parseInt(e.target.value) || 0 } })}
                              style={{ background: 'none', border: 'none', color: 'white', fontSize: 16, fontWeight: 800, outline: 'none' }}
                            />
                         </div>
                       ))}
                    </div>
                  </div>

                  <div style={{ background: COLORS.bg, borderRadius: 24, padding: '32px', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <Droplets size={20} color={COLORS.accent}/> 
                      <span style={{ fontSize: 12, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1px' }}>RÉCOLTE (KG)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                       <input type="number" placeholder="Miel" value={safeRecolte} onChange={(e)=>setVisiteForm({...visiteForm, recolteKgs: parseFloat(e.target.value) || 0})} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12, color: 'white', fontWeight: 800 }} />
                       <input type="number" placeholder="Pollen" value={safePollen} onChange={(e)=>setVisiteForm({...visiteForm, pollenKgs: parseFloat(e.target.value) || 0})} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12, color: 'white', fontWeight: 800 }} />
                    </div>
                  </div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <div style={{ background: COLORS.bg, borderRadius: 24, padding: '32px', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <Camera size={20} color={COLORS.textMuted}/> 
                      <span style={{ fontSize: 12, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1px' }}>CONSTAT VISUEL</span>
                    </div>
                    
                    <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />

                    {showCamera ? (
                      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', height: 260, background: 'black' }}>
                         <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
                            <button onClick={takePhoto} style={{ width: 44, height: 44, borderRadius: '50%', background: 'white', cursor: 'pointer' }} />
                            <button onClick={stopCamera} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
                         </div>
                      </div>
                    ) : visiteForm?.photo ? (
                      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', height: 200, border: `1px solid ${COLORS.border}` }}>
                        <img src={visiteForm.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={removePhoto} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: COLORS.error, color: 'white', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <button 
                          onClick={() => setPhotoMenuOpen(!photoMenuOpen)}
                          style={{ width: '100%', height: 120, border: `2px dashed ${COLORS.border}`, borderRadius: 20, background: 'rgba(255,255,255,0.01)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                           <Camera size={24} />
                           <span style={{ fontWeight: 700, fontSize: 13 }}>Ajouter une photo</span>
                        </button>
                        
                        {photoMenuOpen && (
                          <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 8, zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                            <button onClick={startCamera} style={{ width: '100%', padding: '12px', textAlign: 'left', background: 'none', border: 'none', color: 'white', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}><Camera size={16} /> Prendre une photo</button>
                            <button onClick={() => photoInputRef.current.click()} style={{ width: '100%', padding: '12px', textAlign: 'left', background: 'none', border: 'none', color: 'white', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}><Upload size={16} /> Télécharger (Galerie)</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ background: COLORS.bg, borderRadius: 24, padding: '32px', border: `1px solid ${COLORS.border}` }}>
                     <label style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 900, display: 'block', marginBottom: 16 }}>NOTES</label>
                     <textarea value={visiteForm?.notes || ''} onChange={(e)=>setVisiteForm({...visiteForm, notes: e.target.value})} placeholder="Observations..." style={{ width: '100%', minHeight: 100, background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, color: 'white', resize: 'none' }} />
                  </div>
               </div>
            </div>

            <button onClick={handleAddVisite} style={{ width: '100%', height: 64, borderRadius: 20, background: COLORS.accent, border: 'none', color: 'white', fontSize: 18, fontWeight: 800, marginTop: 32, cursor: 'pointer' }}>
              Valider la visite & Mettre à jour l'écosystème
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>Inspections</h1>
            <button onClick={() => setIsAddingVisit(true)} style={{ background: COLORS.accent, color: 'white', border: 'none', padding: '12px 28px', borderRadius: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Plus size={20}/> Nouvelle Inspect.
            </button>
          </div>
          
          <div style={{ background: COLORS.surface, borderRadius: 28, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: 24, textAlign: 'left', color: COLORS.textMuted, fontSize: 13 }}>DATE</th>
                    <th style={{ padding: 24, textAlign: 'left', color: COLORS.textMuted, fontSize: 13 }}>RUCHE</th>
                    <th style={{ padding: 24, textAlign: 'left', color: COLORS.textMuted, fontSize: 13 }}>SANTÉ</th>
                  </tr>
                </thead>
                <tbody>
                  {visites.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: 40, textAlign: 'center', color: COLORS.textMuted }}>Aucun historique.</td></tr>
                  ) : (
                    visites.map(v => (
                      <tr key={v.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        <td style={{ padding: 24, color: 'white' }}>{v.date}</td>
                        <td style={{ padding: 24, color: 'white', fontWeight: 700 }}>{v.rucheId}</td>
                        <td style={{ padding: 24 }}>
                           <span style={{ color: v.etat === 'health' ? COLORS.success : COLORS.error, fontWeight: 800 }}>{v.etat}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
          </div>
        </>
      )}
    </div>
  );
}
