import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online',  on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  const retry = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      if (navigator.onLine) setOffline(false);
    }, 1200);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 10000,
        /* Safe area for notch phones in standalone mode */
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: '#1e293b',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 'max(10px, env(safe-area-inset-top, 0px)) 20px 10px',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.1,
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        animation: 'slideDown .25s ease',
      }}
    >
      <WifiOff size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, textAlign: 'center' }}>
        Hors ligne — données en cache
      </span>
      <button
        onClick={retry}
        style={{
          background: 'rgba(255,255,255,.12)',
          border: '1px solid rgba(255,255,255,.2)',
          borderRadius: 7,
          color: '#f8fafc',
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0,
          minHeight: 30,
          touchAction: 'manipulation',
        }}
      >
        <RefreshCw size={11} style={{ animation: retrying ? 'spin .8s linear infinite' : 'none' }} />
        Réessayer
      </button>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
