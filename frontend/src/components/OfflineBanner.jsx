import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;

  return (
    <div role="alert" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 10000,
      background: '#1e293b',
      color: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '10px 20px',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 0.1,
      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    }}>
      <WifiOff size={15} color="#f59e0b" />
      <span>Hors ligne — les données affichées sont en cache</span>
    </div>
  );
}
