import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Phone, ArrowRight, RotateCcw, Check, Shield,
  Leaf, ChevronLeft, MessageCircle, Loader2,
} from 'lucide-react';

/* ── Shared input style helper ── */
const inputStyle = (focused) => ({
  width: '100%', padding: '13px 14px 13px 44px',
  background: '#fff',
  border: `1.5px solid ${focused ? '#16a34a' : '#e2e8f0'}`,
  borderRadius: 10, color: '#0f172a', fontSize: 16,
  outline: 'none', boxSizing: 'border-box',
  fontFamily: 'monospace', letterSpacing: '1.5px',
  boxShadow: focused ? '0 0 0 3px rgba(22,163,74,.12)' : 'none',
  transition: 'border-color .2s, box-shadow .2s',
});

/* ── Step progress indicator ── */
function StepBar({ step }) {
  const steps = ['Numéro', 'Code OTP'];
  const current = step === 'phone' ? 0 : 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: i <= current ? '#16a34a' : '#e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .3s',
            }}>
              {i < current
                ? <Check size={14} color="#fff" strokeWidth={3} />
                : <span style={{ fontSize: 12, fontWeight: 700, color: i === current ? '#fff' : '#94a3b8' }}>{i + 1}</span>
              }
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: i === current ? '#16a34a' : '#94a3b8', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: '0 6px', marginBottom: 16,
              background: i < current ? '#16a34a' : '#e2e8f0',
              borderRadius: 99, transition: 'background .3s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function WorkerLogin() {
  const [step, setStep]       = useState('phone');
  const [phone, setPhone]     = useState('+216');
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');
  const [debugOtp, setDebugOtp] = useState(null);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const { workerRequestOtp, workerVerifyOtp, loading } = useAuth();
  const navigate = useNavigate();

  /* ── Send OTP ── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const phoneClean = phone.trim().replace(/\s/g, '');
    if (!phoneClean.startsWith('+') || phoneClean.length < 10) {
      setError('Format invalide. Utilisez le format international : +21655…');
      return;
    }
    const res = await workerRequestOtp(phoneClean);
    if (res.ok) {
      setDebugOtp(res.data?.debug_otp || null);
      setInfo(`Code envoyé au ${phoneClean}`);
      setStep('otp');
    } else {
      setError(res.error);
    }
  };

  /* ── Verify OTP ── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length !== 6) { setError('Saisissez le code à 6 chiffres complet.'); return; }
    const res = await workerVerifyOtp(phone.trim().replace(/\s/g, ''), code);
    if (res.ok) {
      setStep('success');
      setTimeout(() => navigate('/worker'), 1400);
    } else {
      setError(res.error);
    }
  };

  /* ── OTP input handlers ── */
  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus();
  };
  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otp];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
    e.preventDefault();
  };
  const resetToPhone = () => {
    setStep('phone'); setOtp(['', '', '', '', '', '']);
    setError(''); setInfo(''); setDebugOtp(null);
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#f1f5f9',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>

      {/* ── Brand header strip ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1a2d1a 60%, #14532d 100%)',
        padding: '28px 24px 36px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle SVG grid */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .06, pointerEvents: 'none' }}>
          <defs>
            <pattern id="wgrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wgrid)" />
        </svg>
        {/* Glow orb */}
        <div style={{ position: 'absolute', top: '-40%', right: '-10%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,163,74,.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Back button */}
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 99, padding: '6px 12px 6px 8px',
            color: 'rgba(255,255,255,.75)', fontSize: 12, fontWeight: 600,
            marginBottom: 24, cursor: 'pointer', transition: 'all .2s',
            backdropFilter: 'blur(6px)',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}
          >
            <ChevronLeft size={14} /> Accueil
          </div>
        </Link>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(22,163,74,.4)',
          }}>
            <Leaf size={26} color="white" />
          </div>
          <div>
            <div style={{ color: '#f8fafc', fontSize: 20, fontWeight: 800, letterSpacing: '-.3px', lineHeight: 1.1 }}>
              Smart Farm AI
            </div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, marginTop: 2, fontWeight: 500 }}>
              Espace Ouvrier · Accès sécurisé
            </div>
          </div>
        </div>
      </div>

      {/* ── Form card (pulled up to overlap header) ── */}
      <div style={{ flex: 1, padding: '0 16px 32px', marginTop: -16 }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 24px rgba(0,0,0,.08)',
          padding: '28px 24px',
          maxWidth: 420, margin: '0 auto',
        }}>

          {/* ── PHONE STEP ── */}
          {step === 'phone' && (
            <>
              <StepBar step="phone" />

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ color: '#0f172a', fontSize: 20, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-.3px' }}>
                  Connexion par WhatsApp
                </h2>
                <p style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  Entrez votre numéro pour recevoir un code de vérification à usage unique.
                </p>
              </div>

              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                  padding: '11px 14px', marginBottom: 18,
                  color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSendOtp}>
                <label style={{ display: 'block', color: '#475569', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Numéro WhatsApp
                </label>
                <div style={{ position: 'relative', marginBottom: 20 }}>
                  <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#16a34a', pointerEvents: 'none' }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={loading}
                    placeholder="+21655123456"
                    autoComplete="tel"
                    style={inputStyle(phoneFocused)}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px',
                    background: loading ? '#e2e8f0' : 'linear-gradient(135deg, #16a34a, #15803d)',
                    border: 'none', borderRadius: 12,
                    color: loading ? '#94a3b8' : 'white',
                    fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: loading ? 'none' : '0 4px 16px rgba(22,163,74,.3)',
                    transition: 'all .2s',
                  }}
                >
                  {loading
                    ? <><Loader2 size={16} style={{ animation: 'spin .8s linear infinite' }} /> Envoi en cours…</>
                    : <><MessageCircle size={16} /> Recevoir le code WhatsApp <ArrowRight size={15} /></>
                  }
                </button>
              </form>

              {/* Trust badge */}
              <div style={{
                marginTop: 20, padding: '10px 14px',
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 8,
                color: '#64748b', fontSize: 12,
              }}>
                <Shield size={13} color="#16a34a" style={{ flexShrink: 0 }} />
                <span>Code OTP à usage unique · Expire en <strong style={{ color: '#0f172a' }}>10 minutes</strong></span>
              </div>
            </>
          )}

          {/* ── OTP STEP ── */}
          {step === 'otp' && (
            <>
              <StepBar step="otp" />

              <div style={{ marginBottom: 22 }}>
                <h2 style={{ color: '#0f172a', fontSize: 20, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-.3px' }}>
                  Code de vérification
                </h2>
                <p style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                  Vérifiez WhatsApp sur{' '}
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>{phone}</span>
                  {' '}et saisissez le code reçu.
                </p>
              </div>

              {/* Info banner */}
              {info && (
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                  padding: '10px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 8,
                  color: '#15803d', fontSize: 13, fontWeight: 500,
                }}>
                  <MessageCircle size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                  {info}
                </div>
              )}

              {/* Dev OTP debug box */}
              {debugOtp && (
                <div style={{
                  background: '#fffbeb', border: '1.5px dashed #fcd34d', borderRadius: 10,
                  padding: '12px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div>
                    <div style={{ color: '#92400e', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                      DEV · Code OTP
                    </div>
                    <div style={{ color: '#b45309', fontSize: 24, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '8px' }}>
                      {debugOtp}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(debugOtp.split(''))}
                    style={{
                      padding: '8px 14px', background: '#fef3c7',
                      border: '1px solid #fcd34d', borderRadius: 8,
                      color: '#92400e', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    Remplir ↗
                  </button>
                </div>
              )}

              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                  padding: '11px 14px', marginBottom: 16,
                  color: '#b91c1c', fontSize: 13,
                }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                {/* OTP boxes */}
                <div
                  style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      disabled={loading}
                      style={{
                        width: 'clamp(38px, 11vw, 48px)', height: 'clamp(48px, 14vw, 56px)', flexShrink: 0,
                        background: digit ? '#f0fdf4' : '#f8fafc',
                        border: `2px solid ${digit ? '#16a34a' : '#e2e8f0'}`,
                        borderRadius: 12, color: '#0f172a',
                        fontSize: 'clamp(18px, 5vw, 22px)', fontWeight: 800, fontFamily: 'monospace',
                        textAlign: 'center', outline: 'none',
                        boxShadow: digit ? '0 0 0 3px rgba(22,163,74,.1)' : 'none',
                        transition: 'all .15s', cursor: 'text',
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  style={{
                    width: '100%', padding: '14px',
                    background: (loading || otp.join('').length !== 6)
                      ? '#e2e8f0'
                      : 'linear-gradient(135deg, #16a34a, #15803d)',
                    border: 'none', borderRadius: 12,
                    color: (loading || otp.join('').length !== 6) ? '#94a3b8' : 'white',
                    fontSize: 15, fontWeight: 700,
                    cursor: (loading || otp.join('').length !== 6) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    boxShadow: otp.join('').length === 6 && !loading ? '0 4px 16px rgba(22,163,74,.3)' : 'none',
                    transition: 'all .2s',
                  }}
                >
                  {loading
                    ? <><Loader2 size={16} style={{ animation: 'spin .8s linear infinite' }} /> Vérification…</>
                    : <><Check size={16} /> Valider et accéder <ArrowRight size={15} /></>
                  }
                </button>
              </form>

              <button
                onClick={resetToPhone}
                style={{
                  width: '100%', marginTop: 10, padding: '12px',
                  background: 'transparent', border: '1px solid #e2e8f0',
                  borderRadius: 12, color: '#64748b', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
              >
                <RotateCcw size={13} /> Changer de numéro
              </button>
            </>
          )}

          {/* ── SUCCESS STEP ── */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
              <div style={{
                width: 76, height: 76, borderRadius: '50%',
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 0 0 8px rgba(22,163,74,.12), 0 8px 24px rgba(22,163,74,.3)',
                animation: 'successPulse 1.2s ease-in-out infinite',
              }}>
                <Check size={38} color="white" strokeWidth={2.5} />
              </div>
              <h2 style={{ color: '#0f172a', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
                Bienvenue !
              </h2>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>
                Connexion réussie. Redirection vers l'espace ouvrier…
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#94a3b8', fontSize: 12 }}>
                <Loader2 size={13} style={{ animation: 'spin .8s linear infinite', color: '#16a34a' }} />
                Chargement…
              </div>
            </div>
          )}
        </div>

        {/* ── Footer links ── */}
        <div style={{ textAlign: 'center', marginTop: 20, maxWidth: 420, margin: '20px auto 0' }}>
          <Link
            to="/login"
            style={{
              color: '#94a3b8', fontSize: 12, textDecoration: 'none', fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 99,
              border: '1px solid #e2e8f0', background: '#fff',
              transition: 'all .15s',
            }}
          >
            🔑 Accès Propriétaire (Email + Mot de passe)
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes successPulse { 0%,100% { box-shadow: 0 0 0 8px rgba(22,163,74,.12), 0 8px 24px rgba(22,163,74,.3); } 50% { box-shadow: 0 0 0 14px rgba(22,163,74,.06), 0 8px 32px rgba(22,163,74,.2); } }
      `}</style>
    </div>
  );
}
