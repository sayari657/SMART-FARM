import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Send, X, CheckCircle, MapPin } from 'lucide-react';
import api from '../../services/api';
import offlineDB from '../../db/offlineDB';
import { useNetworkSync } from '../../hooks/useNetworkSync';

/**
 * OwnerReportCard — a quick "send a report to the farm owner" zone.
 * Description + photo + farm selector → POST /worker/reports (notifies owner).
 */
export default function OwnerReportCard() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkSync();
  const [farms, setFarms]       = useState([]);
  const [farmId, setFarmId]     = useState('');
  const [note, setNote]         = useState('');
  const [photo, setPhoto]       = useState(null);
  const [preview, setPreview]   = useState(null);
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/worker/reports/farms')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setFarms(list);
        if (list.length) setFarmId(String(list[0].id));
      })
      .catch(() => {});
  }, []);

  const onPhoto = (e) => {
    const f = e.target.files[0];
    if (f) { setPhoto(f); setPreview(URL.createObjectURL(f)); }
  };
  const toB64 = (file) => new Promise((res, rej) => {
    const r = new FileReader(); r.readAsDataURL(file);
    r.onload = () => res(r.result); r.onerror = rej;
  });

  const submit = async () => {
    if (!note.trim()) return;
    setSending(true);
    try {
      let photo_b64 = null;
      if (photo) photo_b64 = (await toB64(photo)).split(',')[1];
      const payload = {
        type: 'message', notes: note, photo_b64,
        farm_id: farmId ? Number(farmId) : null,
        created_at: new Date().toISOString(),
      };
      if (isOnline) {
        try { await api.post('/worker/reports', payload); }
        catch { await offlineDB.pendingReports.add({ ...payload, synced: 0 }); }
      } else {
        await offlineDB.pendingReports.add({ ...payload, synced: 0 });
      }
      setSent(true); setNote(''); setPhoto(null); setPreview(null);
      setTimeout(() => setSent(false), 3500);
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const LBL = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 8 };

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16,
      boxShadow: '0 1px 3px rgba(15,23,42,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>📨</span>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
          {t('worker.owner_report.title', 'Rapport au propriétaire')}
        </div>
      </div>

      {sent ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#dcfce7',
          border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 16px', color: '#15803d', fontWeight: 700 }}>
          <CheckCircle size={20} /> {t('worker.owner_report.sent', 'Envoyé au propriétaire ✓')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Farm selector */}
          {farms.length > 0 && (
            <div>
              <div style={LBL}>{t('worker.owner_report.farm', 'Ferme concernée')}</div>
              <div style={{ position: 'relative' }}>
                <MapPin size={15} color="#16a34a" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <select value={farmId} onChange={e => setFarmId(e.target.value)}
                  style={{ width: '100%', padding: '11px 12px 11px 36px', borderRadius: 10,
                    border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 14, color: '#0f172a',
                    outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                  {farms.map(f => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <div style={LBL}>{t('worker.owner_report.description', 'Description')}</div>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder={t('worker.owner_report.placeholder', 'Décrivez la situation à transmettre au propriétaire…')}
              style={{ width: '100%', height: 96, padding: '10px 12px', borderRadius: 10, background: '#f8fafc',
                border: '1.5px solid #e2e8f0', color: '#0f172a', fontSize: 14, outline: 'none', resize: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = '#16a34a'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
          </div>

          {/* Photo */}
          <div>
            <div style={LBL}>{t('worker.owner_report.photo', 'Photo (optionnel)')}</div>
            <input type="file" accept="image/*" capture="environment" ref={fileRef} onChange={onPhoto} style={{ display: 'none' }} />
            {preview ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                <img src={preview} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                <button onClick={() => { setPhoto(null); setPreview(null); }}
                  style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%',
                    background: 'rgba(0,0,0,.5)', border: 'none', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                style={{ width: '100%', minHeight: 72, borderRadius: 10, background: '#f8fafc',
                  border: '2px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 5, cursor: 'pointer', color: '#94a3b8' }}>
                <Camera size={24} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{t('worker.owner_report.add_photo', 'Ajouter une photo')}</span>
              </button>
            )}
          </div>

          <button onClick={submit} disabled={sending || !note.trim()}
            style={{ padding: 14, borderRadius: 12, border: 'none',
              background: (sending || !note.trim()) ? '#e2e8f0' : 'linear-gradient(135deg,#16a34a,#15803d)',
              color: (sending || !note.trim()) ? '#94a3b8' : '#fff', fontWeight: 800, fontSize: 14,
              cursor: (sending || !note.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {sending ? t('worker.owner_report.sending', 'Envoi…') : <><Send size={16} /> {t('worker.owner_report.send', 'Envoyer au propriétaire')}</>}
          </button>
        </div>
      )}
    </div>
  );
}
