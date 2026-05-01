import React, { useState, useRef } from 'react';
import { Camera, Send, X, CheckCircle, WifiOff, ImageIcon } from 'lucide-react';
import offlineDB from '../../db/offlineDB';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import api from '../../services/api';

const INCIDENT_TYPES = [
  { id: 'disease',   label: 'Maladie / Ravageur',   icon: '🐛', color: '#16a34a' },
  { id: 'water',     label: 'Problème d\'eau',       icon: '💧', color: '#0284c7' },
  { id: 'fence',     label: 'Clôture / Intrusion',   icon: '🚧', color: '#d97706' },
  { id: 'equipment', label: 'Panne matériel',        icon: '⚙️', color: '#7c3aed' },
  { id: 'other',     label: 'Autre',                 icon: '❓', color: '#64748b' },
];

function WorkerReport() {
  const { isOnline } = useNetworkSync();
  const [type, setType]               = useState('disease');
  const [note, setNote]               = useState('');
  const [photo, setPhoto]             = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let photoBase64 = null;
      if (photo) { const b64 = await toBase64(photo); photoBase64 = b64.split(',')[1]; }
      const reportData = { type, notes: note, photo_b64: photoBase64, created_at: new Date().toISOString() };
      if (isOnline) {
        try { await api.post('/worker/reports', reportData); }
        catch { await offlineDB.pendingReports.add({ ...reportData, synced: 0 }); }
      } else {
        await offlineDB.pendingReports.add({ ...reportData, synced: 0 });
      }
      setSuccess(true);
      setNote(''); setPhoto(null); setPhotoPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const activeCat = INCIDENT_TYPES.find(t => t.id === type);

  /* ── Success screen ── */
  if (success) {
    return (
      <div style={{
        background: '#f8fafc', minHeight: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center', padding: '40px 24px',
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: '#dcfce7', border: '2px solid #86efac',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
          <CheckCircle size={44} color="#16a34a" />
        </div>
        <h2 style={{ color: '#0f172a', fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>
          {isOnline ? 'Rapport envoyé !' : 'Rapport enregistré !'}
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
          {isOnline
            ? 'Signalement transmis au propriétaire avec succès.'
            : 'Stocké hors-ligne. Il sera envoyé automatiquement dès le retour du réseau.'}
        </p>
        {!isOnline && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
            background: '#fefce8', border: '1px solid #fef08a',
            borderRadius: 99, padding: '6px 14px',
            color: '#854d0e', fontSize: 12, fontWeight: 600,
          }}>
            <WifiOff size={13} color="#ca8a04" /> Mode hors-ligne actif
          </div>
        )}
        <button
          onClick={() => setSuccess(false)}
          style={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            border: 'none', borderRadius: 14, padding: '14px 32px',
            color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(22,163,74,.3)',
          }}
        >
          Nouveau rapport
        </button>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', paddingBottom: 20 }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 18px 12px' }}>
        <h1 style={{ color: '#0f172a', fontSize: 20, fontWeight: 800, margin: 0 }}>Signaler</h1>
        <p style={{ color: '#94a3b8', fontSize: 12, margin: '2px 0 0' }}>
          Alertez le propriétaire d'une anomalie sur le terrain
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Type selector */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 14px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 10 }}>
            Type d'incident
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {INCIDENT_TYPES.map(t => {
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  style={{
                    flexShrink: 0, padding: '8px 14px', borderRadius: 99,
                    background: active ? `${t.color}15` : '#f8fafc',
                    border: `1.5px solid ${active ? t.color : '#e2e8f0'}`,
                    color: active ? t.color : '#64748b',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.18s',
                    boxShadow: active ? `0 2px 8px ${t.color}20` : 'none',
                  }}
                >
                  <span>{t.icon}</span>
                  <span style={{ whiteSpace: 'nowrap' }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Note textarea */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 10 }}>
            Notes et détails
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Décrivez ce que vous observez sur le terrain..."
            required
            style={{
              width: '100%', height: 110, padding: '10px 12px', borderRadius: 10,
              background: '#f8fafc', border: '1px solid #e2e8f0',
              color: '#0f172a', fontSize: 14, outline: 'none', resize: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5,
              transition: 'border-color .2s',
            }}
            onFocus={e => e.target.style.borderColor = '#16a34a'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* Photo upload */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px', overflow: 'hidden' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 10 }}>
            Photo du terrain
          </div>
          <input
            type="file" accept="image/*" capture="environment"
            ref={fileInputRef} onChange={handlePhotoChange} style={{ display: 'none' }}
          />
          {photoPreview ? (
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
              <img src={photoPreview} alt="Preview" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
              <button
                type="button"
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(0,0,0,.45)', border: 'none',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              style={{
                width: '100%', height: 90, borderRadius: 10,
                background: '#f8fafc', border: '2px dashed #e2e8f0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 6, cursor: 'pointer', color: '#94a3b8', transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.color = '#16a34a'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <Camera size={26} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Prendre une photo</span>
            </button>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '16px', borderRadius: 14,
            background: submitting ? '#e2e8f0' : 'linear-gradient(135deg, #16a34a, #15803d)',
            border: 'none', color: submitting ? '#94a3b8' : 'white',
            fontWeight: 800, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: submitting ? 'none' : '0 4px 16px rgba(22,163,74,.3)',
            transition: 'all .2s',
          }}
        >
          {submitting ? 'Envoi en cours…' : <><Send size={17} /> Envoyer le rapport</>}
        </button>

      </form>
    </div>
  );
}

export default WorkerReport;
