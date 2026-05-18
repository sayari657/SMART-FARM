import { useState, useEffect, useCallback } from 'react';
import { Lock, Delete } from 'lucide-react';

const PIN_KEY      = 'pin_hash';
const PIN_ENABLED  = 'pin_enabled';
const LAST_ACTIVE  = 'pin_last_active';
const TIMEOUT_KEY  = 'pin_timeout_min';

/* SHA-256 via Web Crypto API */
async function sha256(str) {
  const buf  = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ── PIN Lock Screen ── */
export function PinLockScreen({ onUnlock }) {
  const [digits, setDigits] = useState('');
  const [error, setError]   = useState('');
  const [shake, setShake]   = useState(false);

  const check = useCallback(async (pin) => {
    const stored = localStorage.getItem(PIN_KEY);
    const hash   = await sha256(pin);
    if (hash === stored) {
      localStorage.setItem(LAST_ACTIVE, Date.now().toString());
      onUnlock();
    } else {
      setShake(true);
      setError('PIN incorrect');
      setDigits('');
      setTimeout(() => { setShake(false); setError(''); }, 800);
    }
  }, [onUnlock]);

  const press = useCallback((d) => {
    setDigits(p => {
      const next = p + d;
      if (next.length === 4) { check(next); return ''; }
      return next;
    });
    setError('');
  }, [check]);

  const del = () => setDigits(p => p.slice(0, -1));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={28} color="#16a34a" />
        </div>
        <div style={{ color: '#f8fafc', fontWeight: 900, fontSize: 22, letterSpacing: '-0.01em' }}>Déverrouillez l'application</div>
        <div style={{ color: '#94a3b8', fontSize: 14 }}>Entrez votre code PIN à 4 chiffres</div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: 14, animation: shake ? 'pinShake 0.5s ease' : 'none' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: digits.length > i ? '#16a34a' : 'rgba(255,255,255,0.15)', border: `2px solid ${digits.length > i ? '#16a34a' : 'rgba(255,255,255,0.25)'}`, transition: 'all 0.15s' }} />
        ))}
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 700 }}>{error}</div>}

      {/* Numpad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 12 }}>
        {[1,2,3,4,5,6,7,8,9].map(d => (
          <button key={d} onClick={() => press(String(d))}
            style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f8fafc', fontSize: 24, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>
            {d}
          </button>
        ))}
        <div />
        <button onClick={() => press('0')}
          style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#f8fafc', fontSize: 24, fontWeight: 700, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>
          0
        </button>
        <button onClick={del}
          style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
          <Delete size={22} />
        </button>
      </div>

      <style>{`@keyframes pinShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }`}</style>
    </div>
  );
}

/* ── Hook: should lock? ── */
export function usePinLock() {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem(PIN_ENABLED) === 'true';
    if (!enabled) return;
    const last     = parseInt(localStorage.getItem(LAST_ACTIVE) || '0');
    const timeout  = parseInt(localStorage.getItem(TIMEOUT_KEY) || '15') * 60 * 1000;
    if (!last || Date.now() - last > timeout) setLocked(true);

    const tick = setInterval(() => {
      const l  = parseInt(localStorage.getItem(LAST_ACTIVE) || '0');
      const to = parseInt(localStorage.getItem(TIMEOUT_KEY) || '15') * 60 * 1000;
      if (Date.now() - l > to) setLocked(true);
    }, 30000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const refresh = () => localStorage.setItem(LAST_ACTIVE, Date.now().toString());
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach(e => window.addEventListener(e, refresh));
    return () => ['mousemove', 'keydown', 'click', 'touchstart'].forEach(e => window.removeEventListener(e, refresh));
  }, []);

  return { locked, unlock: () => setLocked(false) };
}

/* ── PIN Setup (used in Settings) ── */
export function PinSetup() {
  const [enabled, setEnabled] = useState(localStorage.getItem(PIN_ENABLED) === 'true');
  const [timeout, setTimeout2] = useState(localStorage.getItem(TIMEOUT_KEY) || '15');
  const [newPin, setNewPin]   = useState('');
  const [step, setStep]       = useState(''); // '' | 'enter'
  const [msg, setMsg]         = useState('');

  const savePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setMsg('PIN doit être 4 chiffres'); return; }
    const hash = await sha256(newPin);
    localStorage.setItem(PIN_KEY, hash);
    localStorage.setItem(PIN_ENABLED, 'true');
    localStorage.setItem(TIMEOUT_KEY, timeout);
    localStorage.setItem(LAST_ACTIVE, Date.now().toString());
    setEnabled(true); setStep(''); setNewPin(''); setMsg('PIN configuré ✓');
    setTimeout(() => setMsg(''), 2500);
  };

  const disablePin = () => {
    localStorage.removeItem(PIN_KEY);
    localStorage.setItem(PIN_ENABLED, 'false');
    setEnabled(false); setMsg('PIN désactivé');
    setTimeout(() => setMsg(''), 2000);
  };

  const iSt = { height: 40, background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0 12px', color: 'var(--color-text)', outline: 'none', fontSize: 14 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 14 }}>Verrouillage PIN</div>
          <div style={{ color: 'var(--color-text-2)', fontSize: 12, marginTop: 2 }}>Protection locale de l'application par code PIN à 4 chiffres</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: enabled ? '#16a34a' : '#94a3b8', fontWeight: 700 }}>{enabled ? '● Activé' : '○ Désactivé'}</span>
        </div>
      </div>

      {!enabled ? (
        <button onClick={() => setStep('enter')}
          style={{ alignSelf: 'flex-start', height: 38, padding: '0 20px', borderRadius: 10, background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
          🔒 Configurer PIN
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setStep('enter')} style={{ height: 36, padding: '0 16px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Changer PIN</button>
          <button onClick={disablePin} style={{ height: 36, padding: '0 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Désactiver</button>
        </div>
      )}

      {step === 'enter' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', padding: '14px 16px', background: 'rgba(22,163,74,0.05)', borderRadius: 14, border: '1px solid rgba(22,163,74,0.2)' }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--color-text-2)', letterSpacing: '0.5px', marginBottom: 6 }}>NOUVEAU PIN (4 chiffres)</label>
            <input type="password" maxLength={4} pattern="\d{4}" inputMode="numeric" value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={{ ...iSt, width: 120, letterSpacing: '0.4em', fontSize: 20, fontWeight: 900 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--color-text-2)', letterSpacing: '0.5px', marginBottom: 6 }}>INACTIVITÉ (min)</label>
            <select value={timeout} onChange={e => { setTimeout2(e.target.value); localStorage.setItem(TIMEOUT_KEY, e.target.value); }} style={iSt}>
              {[5, 10, 15, 30, 60].map(m => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          <button onClick={savePin} style={{ height: 40, padding: '0 18px', borderRadius: 10, background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Sauvegarder</button>
          <button onClick={() => { setStep(''); setNewPin(''); }} style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-2)', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
        </div>
      )}

      {msg && <div style={{ fontSize: 13, fontWeight: 700, color: msg.includes('✓') || msg.includes('désactivé') ? '#16a34a' : '#ef4444' }}>{msg}</div>}
    </div>
  );
}
