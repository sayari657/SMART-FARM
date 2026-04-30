import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Phone, ArrowRight, RotateCcw, Check, Shield, Wheat } from 'lucide-react';

export default function WorkerLogin() {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'success'
  const [phone, setPhone] = useState('+216');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [debugOtp, setDebugOtp] = useState(null);
  const { workerRequestOtp, workerVerifyOtp, loading } = useAuth();
  const navigate = useNavigate();

  // ── Étape 1 : Envoyer OTP ────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const phoneClean = phone.trim().replace(/\s/g, '');
    if (!phoneClean.startsWith('+') || phoneClean.length < 10) {
      setError('Format invalide. Utilisez le format international : +21655...');
      return;
    }
    const res = await workerRequestOtp(phoneClean);
    if (res.ok) {
      const devCode = res.data?.debug_otp;
      setDebugOtp(devCode || null);
      setInfo(`Code envoyé sur WhatsApp au ${phoneClean}`);
      setStep('otp');
    } else {
      setError(res.error);
    }
  };

  // ── Étape 2 : Vérifier OTP ────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Veuillez saisir le code à 6 chiffres complet.');
      return;
    }
    const res = await workerVerifyOtp(phone.trim().replace(/\s/g, ''), code);
    if (res.ok) {
      setStep('success');
      setTimeout(() => navigate('/worker'), 1200);
    } else {
      setError(res.error);
    }
  };

  // ── Gestion saisie OTP ─────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
    e.preventDefault();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #0a2910 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322c55e' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Glow effects */}
      <div style={{ position:'absolute', top:'-20%', right:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-20%', left:'-10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:10 }}>
        
        {/* Logo Header */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:72, height:72, borderRadius:20,
            background:'linear-gradient(135deg, #16a34a, #15803d)',
            boxShadow:'0 20px 40px rgba(22,163,74,0.3)', marginBottom:16
          }}>
            <Wheat size={36} color="white" />
          </div>
          <h1 style={{ color:'#f1f5f9', fontSize:28, fontWeight:800, margin:'0 0 6px', letterSpacing:'-0.5px' }}>
            Smart Farm AI
          </h1>
          <p style={{ color:'#64748b', fontSize:14, margin:0 }}>Espace Ouvrier — Accès sécurisé</p>
        </div>

        {/* Card */}
        <div style={{
          background:'rgba(255,255,255,0.04)',
          backdropFilter:'blur(20px)',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:24,
          padding:32,
          boxShadow:'0 25px 50px rgba(0,0,0,0.5)'
        }}>

          {/* ── ÉTAPE 1: PHONE ── */}
          {step === 'phone' && (
            <>
              <div style={{ marginBottom:28 }}>
                <h2 style={{ color:'#f1f5f9', fontSize:22, fontWeight:700, margin:'0 0 8px' }}>
                  Connectez-vous
                </h2>
                <p style={{ color:'#64748b', fontSize:14, margin:0, lineHeight:1.6 }}>
                  Entrez votre numéro de téléphone pour recevoir un code de vérification WhatsApp.
                </p>
              </div>

              {error && (
                <div style={{
                  background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
                  borderRadius:12, padding:'12px 16px', marginBottom:20,
                  color:'#f87171', fontSize:14
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOtp}>
                <label style={{ display:'block', color:'#94a3b8', fontSize:13, fontWeight:600, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  Numéro WhatsApp
                </label>
                <div style={{ position:'relative', marginBottom:24 }}>
                  <div style={{
                    position:'absolute', left:16, top:'50%', transform:'translateY(-50%)',
                    color:'#22c55e', display:'flex', alignItems:'center'
                  }}>
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={loading}
                    placeholder="+21655123456"
                    autoComplete="tel"
                    style={{
                      width:'100%', padding:'16px 16px 16px 48px',
                      background:'rgba(255,255,255,0.05)',
                      border:'1.5px solid rgba(255,255,255,0.1)',
                      borderRadius:14, color:'#f1f5f9', fontSize:18,
                      outline:'none', boxSizing:'border-box',
                      fontFamily:'monospace', letterSpacing:'1px',
                      transition:'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#22c55e'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width:'100%', padding:'16px',
                    background: loading ? 'rgba(22,163,74,0.5)' : 'linear-gradient(135deg, #16a34a, #15803d)',
                    border:'none', borderRadius:14, color:'white',
                    fontSize:16, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                    boxShadow: loading ? 'none' : '0 8px 20px rgba(22,163,74,0.3)',
                    transition:'all 0.2s'
                  }}
                >
                  {loading ? 'Envoi en cours...' : <>Recevoir le code WhatsApp <ArrowRight size={18} /></>}
                </button>
              </form>

              {/* Security badge */}
              <div style={{
                marginTop:24, display:'flex', alignItems:'center', justifyContent:'center',
                gap:8, color:'#475569', fontSize:12
              }}>
                <Shield size={14} />
                <span>Code OTP à usage unique · Expire en 10 min</span>
              </div>
            </>
          )}

          {/* ── ÉTAPE 2: OTP ── */}
          {step === 'otp' && (
            <>
              <div style={{ marginBottom:28 }}>
                <h2 style={{ color:'#f1f5f9', fontSize:22, fontWeight:700, margin:'0 0 8px' }}>
                  Code de vérification
                </h2>
                <p style={{ color:'#64748b', fontSize:14, margin:0, lineHeight:1.6 }}>
                  Consultez WhatsApp sur <strong style={{ color:'#22c55e' }}>{phone}</strong> et saisissez le code à 6 chiffres.
                </p>
              </div>

              {info && (
                <div style={{
                  background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)',
                  borderRadius:12, padding:'12px 16px', marginBottom:20,
                  color:'#4ade80', fontSize:14
                }}>
                  ✅ {info}
                </div>
              )}

              {debugOtp && (
                <div style={{
                  background:'rgba(234,179,8,0.12)', border:'1.5px dashed rgba(234,179,8,0.5)',
                  borderRadius:12, padding:'12px 16px', marginBottom:20,
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:12
                }}>
                  <div>
                    <div style={{ color:'#fbbf24', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>
                      DEV — Code OTP
                    </div>
                    <div style={{ color:'#fef08a', fontSize:26, fontWeight:800, fontFamily:'monospace', letterSpacing:'6px' }}>
                      {debugOtp}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(debugOtp.split(''))}
                    style={{
                      padding:'8px 14px', background:'rgba(234,179,8,0.2)',
                      border:'1px solid rgba(234,179,8,0.4)', borderRadius:10,
                      color:'#fbbf24', fontSize:13, fontWeight:600, cursor:'pointer',
                      whiteSpace:'nowrap'
                    }}
                  >
                    Remplir
                  </button>
                </div>
              )}

              {error && (
                <div style={{
                  background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
                  borderRadius:12, padding:'12px 16px', marginBottom:20,
                  color:'#f87171', fontSize:14
                }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                {/* OTP Input Boxes */}
                <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:28 }} onPaste={handleOtpPaste}>
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
                        width:48, height:60,
                        background: digit ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${digit ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius:14, color:'#f1f5f9',
                        fontSize:24, fontWeight:700, fontFamily:'monospace',
                        textAlign:'center', outline:'none',
                        transition:'all 0.15s'
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  style={{
                    width:'100%', padding:'16px',
                    background: (loading || otp.join('').length !== 6) ? 'rgba(22,163,74,0.3)' : 'linear-gradient(135deg, #16a34a, #15803d)',
                    border:'none', borderRadius:14, color:'white',
                    fontSize:16, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                    boxShadow:'0 8px 20px rgba(22,163,74,0.3)', transition:'all 0.2s'
                  }}
                >
                  {loading ? 'Vérification...' : <>Valider et entrer <ArrowRight size={18} /></>}
                </button>
              </form>

              <button
                onClick={() => { setStep('phone'); setOtp(['','','','','','']); setError(''); setInfo(''); setDebugOtp(null); }}
                style={{
                  width:'100%', marginTop:12, padding:'12px',
                  background:'transparent', border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:14, color:'#64748b', fontSize:14, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8
                }}
              >
                <RotateCcw size={14} /> Changer de numéro
              </button>
            </>
          )}

          {/* ── ÉTAPE 3: SUCCESS ── */}
          {step === 'success' && (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{
                width:80, height:80, borderRadius:'50%',
                background:'linear-gradient(135deg, #16a34a, #22c55e)',
                display:'flex', alignItems:'center', justifyContent:'center',
                margin:'0 auto 24px', boxShadow:'0 0 40px rgba(34,197,94,0.4)',
                animation:'pulse 1s ease-in-out infinite'
              }}>
                <Check size={40} color="white" />
              </div>
              <h2 style={{ color:'#f1f5f9', fontSize:24, fontWeight:800, margin:'0 0 8px' }}>Bienvenue !</h2>
              <p style={{ color:'#64748b' }}>Connexion réussie. Redirection...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:24 }}>
          <Link to="/login" style={{ color:'#475569', fontSize:13, textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            🔑 Accès Propriétaire (Email + Mot de passe)
          </Link>
        </div>
      </div>
    </div>
  );
}
