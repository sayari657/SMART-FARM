import { useEffect, useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';

/* Detect iOS Safari */
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !/crios|fxios|opios|mercury/i.test(navigator.userAgent);

/* Already installed as standalone? */
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

/* Role-aware labels */
function getRoleLabel(role) {
  if (role === 'worker')     return { title: 'Smart Farm — Terrain', sub: 'Tâches hors-ligne · Scanner IA' };
  if (role === 'superadmin') return null;  // superadmin = desktop-first, skip prompt
  return { title: 'Smart Farm AI', sub: 'Supervision ferme · IA prédictive' };
}

export default function PWAInstallPrompt() {
  const [prompt, setPrompt]         = useState(null);   // Android deferred prompt
  const [visible, setVisible]       = useState(false);
  const [showIOS, setShowIOS]       = useState(false);  // iOS manual guide
  const [dismissed, setDismissed]   = useState(false);

  /* Read role from token stored in localStorage */
  const roleLabel = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return getRoleLabel(null);
      const payload = JSON.parse(atob(token.split('.')[1]));
      return getRoleLabel(payload?.role);
    } catch { return getRoleLabel(null); }
  })();

  useEffect(() => {
    if (dismissed || isStandalone()) return;
    if (!roleLabel) return;  // superadmin → skip
    if (sessionStorage.getItem('pwa-prompt-dismissed')) return;

    // Android / Chrome — native prompt
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS — show manual guide after 3s if not installed
    let iosTimer;
    if (isIOS()) {
      iosTimer = setTimeout(() => {
        if (!sessionStorage.getItem('pwa-prompt-dismissed')) {
          setShowIOS(true);
          setVisible(true);
        }
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(iosTimer);
    };
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
    setShowIOS(false);
    sessionStorage.setItem('pwa-prompt-dismissed', '1');
  };

  if (!visible) return null;

  /* ── iOS guide ─────────────────────────────────────────────── */
  if (showIOS) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        left: 12, right: 12,
        zIndex: 9999,
        maxWidth: 420, margin: '0 auto',
        background: '#0f172a',
        borderRadius: 20,
        padding: '18px 18px 14px',
        boxShadow: '0 8px 40px rgba(0,0,0,.35)',
        border: '1px solid rgba(255,255,255,.1)',
        animation: 'slideUp .25s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌿</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>Installer {roleLabel?.title}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{roleLabel?.sub}</div>
            </div>
          </div>
          <button onClick={dismiss} style={{ background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 8, padding: 6, color: '#94a3b8', cursor: 'pointer', display: 'flex', minHeight: 32, minWidth: 32, alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {/* Steps */}
        {[
          { icon: '1', text: 'Appuyez sur', bold: 'Partager', Icon: Share },
          { icon: '2', text: 'Faites défiler et appuyez sur', bold: 'Sur l\'écran d\'accueil', Icon: Plus },
          { icon: '3', text: 'Appuyez sur', bold: 'Ajouter', Icon: null },
        ].map(({ icon, text, bold, Icon }) => (
          <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 13, color: '#cbd5e1' }}>
              {text}{' '}
              <strong style={{ color: '#f8fafc', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {bold} {Icon && <Icon size={13} style={{ verticalAlign: 'middle' }} />}
              </strong>
            </span>
          </div>
        ))}

        <div style={{ marginTop: 4, fontSize: 11, color: '#475569', borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 10 }}>
          Fonctionne sur Safari iOS 16.4+
        </div>
      </div>
    );
  }

  /* ── Android / Chrome prompt ──────────────────────────────── */
  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(16px + env(safe-area-inset-bottom))',
      left: 12, right: 12,
      zIndex: 9999,
      maxWidth: 420, margin: '0 auto',
      background: '#0f172a',
      borderRadius: 16,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,.28)',
      border: '1px solid rgba(255,255,255,.08)',
      animation: 'slideUp .25s ease',
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🌿</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 1 }}>Installer {roleLabel?.title}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{roleLabel?.sub}</div>
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
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
        aria-label="Fermer"
      >
        <X size={15} />
      </button>
    </div>
  );
}
