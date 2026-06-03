/**
 * Polls /version.json every 10 minutes.
 * If a new version is detected:
 *   - force=true  → auto-reload
 *   - force=false → show banner asking user to refresh
 */
import { useEffect, useRef, useState } from 'react';

const POLL_MS = 10 * 60 * 1000; // 10 min

export function usePWAVersion() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState(null);
  const currentRef = useRef(null);

  const check = async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!currentRef.current) {
        currentRef.current = data.version;
        return;
      }
      if (data.version !== currentRef.current) {
        if (data.force) {
          window.location.reload();
          return;
        }
        setUpdateAvailable(true);
        setNewVersion(data.version);
      }
    } catch {
      // Network error — ignore silently
    }
  };

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const dismiss = () => setUpdateAvailable(false);
  const applyUpdate = () => window.location.reload();

  return { updateAvailable, newVersion, dismiss, applyUpdate };
}
