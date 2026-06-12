import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--color-bg)', flexDirection:'column', gap:20, textAlign:'center', padding:24 }}>
      <div style={{ fontSize:80 }}>🌿</div>
      <div style={{ fontSize:72, fontWeight:900, color:'var(--color-primary)', lineHeight:1 }}>404</div>
      <h1 style={{ fontSize:24, fontWeight:800 }}>{t('not_found.title')}</h1>
      <p style={{ color:'var(--color-text-3)', maxWidth:380 }}>
        {t('not_found.desc')}
      </p>
      <div style={{ display:'flex', gap:12 }}>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          <Home size={14} /> {t('not_found.go_dashboard')}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> {t('not_found.go_back')}
        </button>
      </div>
    </div>
  );
}
