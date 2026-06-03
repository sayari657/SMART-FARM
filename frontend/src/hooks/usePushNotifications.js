/**
 * usePushNotifications — Web Push API hook
 * Works for all 3 roles: owner, worker, superadmin
 * - Guards against missing / failed SW registration
 * - Times out serviceWorker.ready after 5 s (dev mode / SW crash)
 */
import { useState, useEffect } from 'react';
import api from '../services/api';

const VAPID_PUBLIC_KEY = 'BMIhtRO-3hwA1lq1ldCBniDypQzPbbv97OG32P82dbMxVWpqiemRlU5-GZ5x8yGdvXHPBhBywh8wqaw0RWbUJXc';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/* ── serviceWorker.ready with a 5-second timeout ─────────
   Without this, the promise hangs forever when the SW is
   not registered (dev mode, SW evaluation failure, etc.)   */
function swReady(timeoutMs = 5000) {
  if (!('serviceWorker' in navigator)) {
    return Promise.reject(new Error('ServiceWorker not supported'));
  }
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SW not ready — timeout')), timeoutMs)
    ),
  ]);
}

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  /* Check if already subscribed — with timeout guard */
  useEffect(() => {
    if (!isSupported) return;
    swReady()
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setSubscribed(!!sub))
      .catch(() => { /* SW not available — push won't work in dev */ });
  }, []); // eslint-disable-line

  const subscribe = async () => {
    if (!isSupported) {
      setError('Notifications push non supportées sur ce navigateur/appareil');
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      /* 1. Permission */
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setError('Permission refusée'); return false; }

      /* 2. SW registration — timeout after 5 s */
      const reg = await swReady();

      /* 3. Subscribe */
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      /* 4. Send token to backend */
      await api.post('/auth/push-token', {
        token:    JSON.stringify(subscription),
        platform: 'web-push',
      });

      setSubscribed(true);
      return true;
    } catch (err) {
      setError(err.message || 'Erreur abonnement push');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await swReady();
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await sub.unsubscribe(); setSubscribed(false); }
    } catch (err) {
      setError(err.message);
    }
  };

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker'  in navigator &&
    'PushManager'    in window    &&
    'Notification'   in window;

  return { permission, subscribed, loading, error, isSupported, subscribe, unsubscribe };
}
