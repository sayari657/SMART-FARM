import React, { useState, useRef } from 'react';
import { Film, Loader2, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cvAPI } from '../services/api';
import { translateLabel } from '../utils/labelTranslations';

const CATEGORIES = [
  { id: 'chicken_detect', label: '🐔 Volaille' },
  { id: 'livestock',      label: '🐄 Bétail' },
  { id: 'bee',            label: '🐝 Abeilles' },
];

/**
 * Comptage d'animaux sur clip vidéo par tracking ByteTrack :
 * chaque identité de piste unique = 1 animal (pas de double comptage).
 */
export default function VideoCountCard() {
  const { t, i18n } = useTranslation();
  const [category, setCategory] = useState('chicken_detect');
  const [result, setResult]     = useState(null);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);
  const inputRef = useRef(null);
  const lang = i18n.language?.startsWith('ar') ? 'ar' : i18n.language?.startsWith('en') ? 'en' : 'fr';

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await cvAPI.trackCount(file, category);
      setResult(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || t('ai_cards.analyze_error'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0',
      borderTop: '3px solid #7c3aed', padding: '18px 20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Film size={17} color="#7c3aed" />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{t('ai_cards.vc_title')}</div>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('ai_cards.vc_sub')}</div>
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{
          fontSize: 11, fontWeight: 700, color: '#475569', background: '#f8fafc',
          border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '5px 9px', cursor: 'pointer',
        }}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      {busy ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '24px 0', color: '#7c3aed', fontSize: 12, fontWeight: 700 }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('ai_cards.vc_analyzing')}
        </div>
      ) : result ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 900, color: '#7c3aed', lineHeight: 1 }}>{result.total_unique}</span>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{t('ai_cards.vc_total')}</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>· {result.max_simultaneous} {t('ai_cards.vc_max_sim')}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {Object.entries(result.counts).map(([label, n]) => (
              <span key={label} style={{ fontSize: 10, fontWeight: 700, background: 'rgba(124,58,237,0.08)', color: '#6d28d9', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 99, padding: '3px 11px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Hash size={10} /> {translateLabel(label, lang)} : {n}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 9, color: '#94a3b8' }}>
            {result.frames_processed} frames · {result.elapsed_s}s · ByteTrack
          </div>
        </div>
      ) : (
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
          padding: '20px 0', border: '2px dashed rgba(124,58,237,0.35)', borderRadius: 12,
          cursor: 'pointer', background: 'rgba(124,58,237,0.03)',
        }}>
          <Film size={20} color="#7c3aed" style={{ opacity: 0.6 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{t('ai_cards.vc_upload')}</span>
          {error && <span style={{ fontSize: 10, color: '#dc2626' }}>{error}</span>}
          <input ref={inputRef} type="file" hidden accept="video/mp4,video/*" onChange={handleFile} />
        </label>
      )}
    </div>
  );
}
