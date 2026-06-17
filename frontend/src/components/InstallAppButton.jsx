import { useEffect, useState } from 'react';
import { Download, X, Share, Plus, CheckCircle } from 'lucide-react';

/* Platform detection */
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios|opios/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

/**
 * Explicit "Install the app" button (always available, not just an auto-popup).
 * - Android / Chrome / Edge → fires the native install prompt.
 * - iOS Safari / browsers without the event → opens a step-by-step guide.
 * - Hides itself once the app is installed (standalone display mode).
 */
export default function InstallAppButton({ style = {}, label = "Installer l'application" }) {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); setHelp(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferred(null);
    } else {
      setHelp(true); // iOS or a browser that didn't fire the event → manual guide
    }
  };

  return (
    <>
      <button onClick={onClick} type="button" style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '11px 16px', borderRadius: 12, cursor: 'pointer',
        border: '1.5px solid #16a34a', background: 'rgba(22,163,74,.08)', color: '#15803d',
        fontSize: 13.5, fontWeight: 800, touchAction: 'manipulation', ...style,
      }}>
        <Download size={16} /> {label}
      </button>
      {help && <InstallGuide onClose={() => setHelp(false)} />}
    </>
  );
}

/* Cross-platform manual install guide (modal) */
function InstallGuide({ onClose }) {
  const ios = isIOS();
  const android = isAndroid();
  const steps = ios
    ? [
        { n: '1', text: 'Appuyez sur', bold: 'Partager', Icon: Share },
        { n: '2', text: "Faites défiler puis", bold: "Sur l'écran d'accueil", Icon: Plus },
        { n: '3', text: 'Confirmez avec', bold: 'Ajouter', Icon: null },
      ]
    : android
    ? [
        { n: '1', text: 'Ouvrez le menu', bold: '⋮ (en haut à droite)', Icon: null },
        { n: '2', text: 'Appuyez sur', bold: "Installer l'application", Icon: null },
        { n: '3', text: 'Confirmez avec', bold: 'Installer', Icon: null },
      ]
    : [
        { n: '1', text: 'Dans la barre d’adresse, cliquez sur', bold: "l'icône ⊕ / Installer", Icon: null },
        { n: '2', text: 'Confirmez avec', bold: 'Installer', Icon: null },
      ];

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(2,6,23,.6)',
      backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, background: '#0f172a', borderRadius: '20px 20px 0 0',
        padding: '20px 18px calc(20px + env(safe-area-inset-bottom))', border: '1px solid rgba(255,255,255,.1)',
        animation: 'slideUp .25s ease',
      }}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌿</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#f8fafc' }}>Installer Smart Farm AI</div>
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{ios ? 'Safari iOS 16.4+' : android ? 'Chrome Android' : 'Chrome / Edge'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: 8, padding: 6, color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        {steps.map(({ n, text, bold, Icon }) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{n}</span>
            <span style={{ fontSize: 13.5, color: '#cbd5e1' }}>
              {text}{' '}
              <strong style={{ color: '#f8fafc', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{bold}{Icon && <Icon size={14} />}</strong>
            </span>
          </div>
        ))}
        <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)', fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={13} color="#16a34a" /> Une fois installée, l'app s'ouvre en plein écran et marche hors-ligne.
        </div>
      </div>
    </div>
  );
}
