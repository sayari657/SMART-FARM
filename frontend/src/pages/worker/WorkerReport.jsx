import React, { useState, useRef } from 'react';
import { Camera, Send, X, CheckCircle, AlertTriangle, Image as ImageIcon, WifiOff } from 'lucide-react';
import offlineDB from '../../db/offlineDB';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import api from '../../services/api';

const INCIDENT_TYPES = [
  { id: 'disease', label: 'Maladie / Ravageur', icon: '🐛' },
  { id: 'water', label: 'Problème d\'eau', icon: '💧' },
  { id: 'fence', label: 'Clôture / Intrusion', icon: '🚧' },
  { id: 'equipment', label: 'Panne matériel', icon: '⚙️' },
  { id: 'other', label: 'Autre', icon: '❓' },
];

function WorkerReport() {
  const { isOnline } = useNetworkSync();
  const [type, setType] = useState('disease');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
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
      if (photo) {
        const b64 = await toBase64(photo);
        photoBase64 = b64.split(',')[1];
      }

      const reportData = {
        type,
        notes: note,
        photo_b64: photoBase64,
        created_at: new Date().toISOString(),
      };

      if (isOnline) {
        try {
          await api.post('/worker/reports', reportData);
          // Sent directly — no IndexedDB needed
        } catch {
          // API failed despite being online — queue offline
          await offlineDB.pendingReports.add({ ...reportData, synced: 0 });
        }
      } else {
        await offlineDB.pendingReports.add({ ...reportData, synced: 0 });
      }

      setSuccess(true);
      setNote('');
      setPhoto(null);
      setPhotoPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ 
        padding: '24px 20px', background: '#0f172a', minHeight: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(34,197,94,0.1)', border: '2px solid #22c55e',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24
        }}>
          <CheckCircle size={48} color="#22c55e" />
        </div>
        <h2 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
          {isOnline ? 'Rapport envoyé !' : 'Rapport enregistré !'}
        </h2>
        <p style={{ color: '#64748b', fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>
          {isOnline
            ? 'Signalement transmis au propriétaire avec succès.'
            : 'Stocké hors-ligne. Il sera envoyé automatiquement dès le retour du réseau.'}
        </p>
        {!isOnline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontSize: 13, marginBottom: 16 }}>
            <WifiOff size={16} /> Mode hors-ligne actif
          </div>
        )}
        <button 
          onClick={() => setSuccess(false)}
          style={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            border: 'none', borderRadius: 14, padding: '16px 32px',
            color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer'
          }}
        >
          Nouveau rapport
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', background: '#0f172a', minHeight: '100%' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
          Signaler
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Alertez immédiatement le propriétaire d'une anomalie sur le terrain
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Type Selector */}
        <div>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            Type d'incident
          </label>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
            {INCIDENT_TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                style={{
                  flexShrink: 0, padding: '12px 16px', borderRadius: 16,
                  background: type === t.id ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${type === t.id ? '#22c55e' : 'rgba(255,255,255,0.06)'}`,
                  color: type === t.id ? '#4ade80' : '#64748b',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                }}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            Notes et détails
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Décrivez ce que vous observez..."
            required
            style={{
              width: '100%', height: 120, padding: 16, borderRadius: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#f1f5f9', fontSize: 15, outline: 'none', resize: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            Photo du terrain
          </label>
          <input 
            type="file" accept="image/*" capture="environment" 
            ref={fileInputRef} onChange={handlePhotoChange} style={{ display: 'none' }} 
          />
          
          {photoPreview ? (
            <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden' }}>
              <img src={photoPreview} alt="Preview" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
              <button 
                type="button"
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)', border: 'none',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              style={{
                width: '100%', height: 100, borderRadius: 20,
                background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, cursor: 'pointer', color: '#64748b'
              }}
            >
              <Camera size={32} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Prendre une photo</span>
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 10, padding: 18, borderRadius: 16,
            background: submitting ? '#1e293b' : 'linear-gradient(135deg, #16a34a, #15803d)',
            border: 'none', color: 'white', fontWeight: 800, fontSize: 16,
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            boxShadow: '0 10px 25px rgba(22,163,74,0.3)'
          }}
        >
          {submitting ? 'Envoi...' : <>Envoyer le rapport <Send size={20} /></>}
        </button>

      </form>
    </div>
  );
}

export default WorkerReport;
