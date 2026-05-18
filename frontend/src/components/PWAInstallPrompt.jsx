import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    // Already installed as standalone → never show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('pwa-prompt-dismissed')) return;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setPrompt(null);
    }
  };

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(16px + env(safe-area-inset-bottom))',
      left: 16,
      right: 16,
      zIndex: 9999,
      maxWidth: 420,
      margin: '0 auto',
      background: '#0f172a',
      borderRadius: 16,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
      border: '1px solid rgba(255,255,255,0.08)',
      animation: 'slideUp 0.25s ease',
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg,#16a34a,#15803d)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>🌿</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 1 }}>
          Installer Smart Farm AI
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
          Accès rapide, usage hors-ligne
        </div>
      </div>

      <button
        onClick={install}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#16a34a', color: '#fff',
          border: 'none', borderRadius: 10,
          padding: '8px 14px', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', flexShrink: 0,
          minHeight: 36, touchAction: 'manipulation',
        }}
      >
        <Download size={13} /> Installer
      </button>

      <button
        onClick={dismiss}
        style={{
          background: 'none', border: 'none', color: '#64748b',
          cursor: 'pointer', padding: 6, borderRadius: 8,
          display: 'flex', alignItems: 'center',
          minWidth: 32, minHeight: 32, touchAction: 'manipulation',
        }}
        aria-label="Fermer"
      >
        <X size={15} />
      </button>
    </div>
  );
}
