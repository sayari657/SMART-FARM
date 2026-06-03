/**
 * PushNotificationSetup — demande la permission push une fois connecté.
 * Affiche une invite non-intrusive 3s après le premier login.
 * Se souvient du choix via localStorage.
 */
import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../context/AuthContext';

export default function PushNotificationSetup() {
  const { user }    = useAuth() || {};
  const { isSupported, permission, subscribed, loading, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || !isSupported) return;
    if (permission === 'granted') return;     // already granted
    if (permission === 'denied') return;      // user blocked it
    if (localStorage.getItem('push-prompt-dismissed')) return;

    const timer = setTimeout(() => setVisible(true), 3500);
    return () => clearTimeout(timer);
  }, [user, isSupported, permission]);

  const handleAccept = async () => {
    const ok = await subscribe();
    setVisible(false);
    if (ok) localStorage.setItem('push-prompt-dismissed', '1');
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('push-prompt-dismissed', '1');
  };

  if (!visible || subscribed) return null;

  /* Role-specific message */
  const msg = user?.role === 'worker'
    ? 'Recevez vos tâches et alertes terrain instantanément.'
    : user?.role === 'superadmin'
    ? 'Recevez les alertes critiques de la plateforme.'
    : 'Recevez les alertes santé de vos animaux en temps réel.';

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(76px + env(safe-area-inset-bottom))',
      left: 12, right: 12,
      zIndex: 8000,
      maxWidth: 400, margin: '0 auto',
      background: '#fff',
      borderRadius: 16,
      padding: '16px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,.14)',
      border: '1.5px solid #e2e8f0',
      display: 'flex', gap: 14, alignItems: 'flex-start',
      animation: 'slideUp .25s ease',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg,#16a34a,#15803d)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Bell size={18} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>
          Activer les notifications
        </div>
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 12 }}>
          {msg}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleAccept}
            disabled={loading}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 9, border: 'none',
              background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, minHeight: 36, touchAction: 'manipulation',
            }}
          >
            <Bell size={12} /> {loading ? '…' : 'Activer'}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: '8px 14px', borderRadius: 9,
              border: '1px solid #e2e8f0', background: '#f8fafc',
              color: '#64748b', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              minHeight: 36, touchAction: 'manipulation',
            }}
          >
            <BellOff size={12} /> Plus tard
          </button>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2, flexShrink: 0, display: 'flex', minHeight: 28, minWidth: 28, alignItems: 'center', justifyContent: 'center' }}
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  );
}
