import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--color-bg)', flexDirection:'column', gap:20, textAlign:'center', padding:24 }}>
      <div style={{ fontSize:80 }}>🌿</div>
      <div style={{ fontSize:72, fontWeight:900, color:'var(--color-primary)', lineHeight:1 }}>404</div>
      <h1 style={{ fontSize:24, fontWeight:800 }}>Page Not Found</h1>
      <p style={{ color:'var(--color-text-3)', maxWidth:380 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display:'flex', gap:12 }}>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          <Home size={14} /> Go to Dashboard
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Go Back
        </button>
      </div>
    </div>
  );
}
