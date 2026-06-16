import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Send, X, CheckCircle, WifiOff, ImageIcon } from 'lucide-react';
import offlineDB from '../../db/offlineDB';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import api from '../../services/api';
import { PageHeader } from './workerUI';

function WorkerReport() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkSync();
  const [type, setType]               = useState('disease');
  const [note, setNote]               = useState('');
  const [photo, setPhoto]             = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState(false);
  const fileInputRef = useRef(null);

  const INCIDENT_TYPES = [
    { id: 'disease',   label: t('worker.report.incident.disease'),   icon: '🐛', color: '#16a34a' },
    { id: 'water',     label: t('worker.report.incident.water'),     icon: '💧', color: '#0284c7' },
    { id: 'fence',     label: t('worker.report.incident.fence'),     icon: '🚧', color: '#d97706' },
    { id: 'equipment', label: t('worker.report.incident.equipment'), icon: '⚙️', color: '#7c3aed' },
    { id: 'other',     label: t('worker.report.incident.other'),     icon: '❓', color: '#64748b' },
  ];

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
          {isOnline ? t('worker.report.sent_title') : t('worker.report.saved_title')}
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
          {isOnline ? t('worker.report.sent_desc') : t('worker.report.saved_desc')}
        </p>
        {!isOnline && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
            background: '#fefce8', border: '1px solid #fef08a',
            borderRadius: 99, padding: '6px 14px',
            color: '#854d0e', fontSize: 12, fontWeight: 600,
          }}>
            <WifiOff size={13} color="#ca8a04" /> {t('worker.report.offline_badge')}
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
          {t('worker.report.new_report')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', paddingBottom: 20 }}>

      <PageHeader title={t('worker.report.title')} subtitle={t('worker.report.subtitle')} icon="🚨" />

      <form onSubmit={handleSubmit} style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Type selector */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 14px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 10 }}>
            {t('worker.report.incident_type')}
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {INCIDENT_TYPES.map(inc => {
              const active = type === inc.id;
              return (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => setType(inc.id)}
                  style={{
                    flexShrink: 0, padding: '8px 14px', borderRadius: 99,
                    background: active ? `${inc.color}15` : '#f8fafc',
                    border: `1.5px solid ${active ? inc.color : '#e2e8f0'}`,
                    color: active ? inc.color : '#64748b',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.18s',
                    boxShadow: active ? `0 2px 8px ${inc.color}20` : 'none',
                  }}
                >
                  <span>{inc.icon}</span>
                  <span style={{ whiteSpace: 'nowrap' }}>{inc.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Note textarea */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 10 }}>
            {t('worker.report.notes_label')}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t('worker.report.notes_ph')}
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
            {t('worker.report.photo_label')}
          </div>
          <input
            type="file" accept="image/*" capture="environment"
            ref={fileInputRef} onChange={handlePhotoChange} style={{ display: 'none' }}
          />
          {photoPreview ? (
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
              <img src={photoPreview} alt="Preview" style={{ width: '100%', height: 'clamp(140px, 40vw, 220px)', objectFit: 'cover', display: 'block' }} />
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
                width: '100%', minHeight: 80, borderRadius: 10,
                background: '#f8fafc', border: '2px dashed #e2e8f0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 6, cursor: 'pointer', color: '#94a3b8', transition: 'all .2s',
                touchAction: 'manipulation',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.color = '#16a34a'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <Camera size={26} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{t('worker.report.take_photo')}</span>
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
          {submitting ? t('worker.report.sending') : <><Send size={17} /> {t('worker.report.send_btn')}</>}
        </button>

      </form>
    </div>
  );
}

export default WorkerReport;
