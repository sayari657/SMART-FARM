import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Mail, MessageCircle, ArrowLeft, CheckCircle, Shield, Cpu, Wifi } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading2, setLoading2] = useState(false);

  // OTP multi-step states
  const [view, setView] = useState('login'); // 'login' | 'choose_channel' | 'enter_id' | 'enter_otp'
  const [channel, setChannel] = useState(null); // 'email' | 'whatsapp'
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [debugOtp, setDebugOtp] = useState(null);

  const { login, loading } = useAuth();
  const navigate = useNavigate();



  const resetFlow = () => {
    setView('login'); setChannel(null); setIdentifier('');
    setOtpCode(''); setNewPassword(''); setError(''); setMsg(''); setDebugOtp(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setError('');
    const res = await login(form.username, form.password);
    if (res.ok) {
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      navigate(savedUser?.role === 'worker' ? '/worker' : '/dashboard');
    } else {
      setError(res.error);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading2(true);
    try {
      let res;
      if (channel === 'email') {
        res = await authAPI.forgotByEmail({ email: identifier });
        setMsg(`✅ Code envoyé à ${identifier}. Vérifiez votre boîte mail.`);
      } else {
        res = await authAPI.forgotByWhatsApp({ phone_number: identifier });
        setMsg(`✅ Code WhatsApp envoyé au ${identifier}. Vérifiez WhatsApp.`);
      }
      setDebugOtp(res.data?.debug_otp || null);
      setView('enter_otp');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'envoi du code.');
    } finally { setLoading2(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setError(''); setLoading2(true);
    try {
      const res = await authAPI.resetPassword({
        channel,
        identifier,
        otp: otpCode,
        new_password: newPassword,
      });
      setMsg(res.data.message);
      setView('success');
    } catch (err) {
      setError(err.response?.data?.detail || 'Code OTP invalide ou expiré.');
    } finally { setLoading2(false); }
  };

  const renderLeft = () => (
    <div className="auth-left" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Decorative SVG pattern */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:.08 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Decorative circles */}
      <div style={{ position:'absolute', top:-60, right:-60, width:240, height:240, borderRadius:'50%', border:'1px solid rgba(255,255,255,.12)' }} />
      <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:'50%', border:'1px solid rgba(255,255,255,.08)' }} />
      <div style={{ position:'absolute', bottom:-80, left:-40, width:280, height:280, borderRadius:'50%', border:'1px solid rgba(255,255,255,.08)' }} />

      <div style={{ position:'relative', zIndex:2 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:40 }}>
          <div style={{ width:48, height:48, background:'rgba(255,255,255,.15)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,.2)' }}>
            <Leaf size={24} />
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:20, color:'#fff' }}>Smart Farm AI</div>
            <div style={{ opacity:.65, fontSize:12, color:'#fff' }}>Enterprise Platform</div>
          </div>
        </div>
        <h2 style={{ color:'#fff', fontSize:32, fontWeight:800, lineHeight:1.2, marginBottom:16 }}>Intelligent Farm<br />Monitoring at Scale</h2>
        <p style={{ color:'#fff', opacity:.8, fontSize:15, lineHeight:1.7, maxWidth:360 }}>
          Monitor bees, cows, poultry with IoT telemetry, computer vision, and AI anomaly detection.
        </p>
        <div className="auth-features">
          {[
            { icon: Wifi,   label: 'Real-time IoT telemetry' },
            { icon: Eye,    label: 'Computer vision detection' },
            { icon: Cpu,    label: 'AI anomaly engine' },
            { icon: Shield, label: 'Multi-species alerts' },
          ].map(({ icon: Icon, label }) => (
            <div className="auth-feature" key={label} style={{ color:'#fff' }}>
              <Icon size={15} style={{ opacity:.8, flexShrink:0 }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      {renderLeft()}

      <div className="auth-right">
        <div className="auth-card" style={{ background: '#fff', border: '1px solid var(--color-border-light)', boxShadow: 'var(--shadow-xl)' }}>

          {/* ── Login View ───────────────────────────────── */}
          {view === 'login' && (
            <>
              <h1>Welcome back</h1>
              <p>Sign in to your Smart Farm AI account</p>



              {msg && <div className="alert-banner success" style={{ marginBottom:16 }}><div className="alert-banner-msg">{msg}</div></div>}
              {error && <div className="alert-banner warning" style={{ marginBottom:16 }}><div className="alert-banner-msg">{error}</div></div>}

              <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-input" id="login-username" placeholder="Enter your username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position:'relative' }}>
                    <input className="form-input" id="login-password" type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required style={{ paddingRight:40 }} />
                    <button type="button" onClick={() => setShowPw(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--color-text-3)', cursor:'pointer' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: 8 }}>
                    <button type="button" onClick={() => { setView('choose_channel'); setError(''); setMsg(''); }} style={{ background:'none', border:'none', color:'var(--color-primary)', fontSize:12, cursor:'pointer', padding:0 }}>
                      Mot de passe oublié ?
                    </button>
                  </div>
                </div>
                <button className="btn btn-primary" id="login-submit" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'11px 0', fontSize:14, marginTop:4 }}>
                  {loading ? 'Connexion...' : 'Sign In'}
                </button>
              </form>
              <div className="auth-footer">Don't have an account? <Link to="/register">Create one</Link></div>
              <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <Link to="/worker-login" style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span>👷</span> Accès Ouvrier (Code PIN)
                </Link>
              </div>
            </>
          )}

          {/* ── Choose Channel ────────────────────────────── */}
          {view === 'choose_channel' && (
            <>
              <button onClick={resetFlow} style={{ background:'none', border:'none', color:'var(--color-text-3)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, marginBottom:20, padding:0 }}>
                <ArrowLeft size={14} /> Retour
              </button>
              <h1 style={{ fontSize: 22, marginBottom: 8 }}>Récupérer l'accès</h1>
              <p style={{ marginBottom: 28 }}>Choisissez comment recevoir votre code de vérification</p>

              {error && <div className="alert-banner warning" style={{ marginBottom:16 }}><div className="alert-banner-msg">{error}</div></div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <button
                  onClick={() => { setChannel('email'); setIdentifier(''); setView('enter_id'); setError(''); }}
                  style={{ display:'flex', alignItems:'center', gap:16, padding:'20px 24px', background:'var(--color-bg-2)', border:'2px solid var(--color-border)', borderRadius:12, cursor:'pointer', textAlign:'left', transition:'all .2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <div style={{ width:48, height:48, background:'rgba(59,130,246,0.15)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Mail size={22} color="var(--color-info)" />
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:'var(--color-text)' }}>📧 Par E-mail</div>
                    <div style={{ fontSize:12, color:'var(--color-text-3)', marginTop:3 }}>Code envoyé à votre adresse email enregistrée</div>
                    <div style={{ fontSize:11, color:'#22c55e', marginTop:4, fontWeight:600 }}>✅ 100% Gratuit — Gmail SMTP</div>
                  </div>
                </button>

                <button
                  onClick={() => { setChannel('whatsapp'); setIdentifier('+216'); setView('enter_id'); setError(''); }}
                  style={{ display:'flex', alignItems:'center', gap:16, padding:'20px 24px', background:'var(--color-bg-2)', border:'2px solid var(--color-border)', borderRadius:12, cursor:'pointer', textAlign:'left', transition:'all .2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-whatsapp)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <div style={{ width:48, height:48, background:'rgba(37,211,102,.12)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <MessageCircle size={22} color="var(--color-whatsapp)" />
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:'var(--color-text)' }}>💬 Via WhatsApp</div>
                    <div style={{ fontSize:12, color:'var(--color-text-3)', marginTop:3 }}>Code OTP sur votre numéro WhatsApp enregistré</div>
                    <div style={{ fontSize:11, color:'#22c55e', marginTop:4, fontWeight:600 }}>✅ Gratuit (Meta Cloud API)</div>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ── Enter Identifier (email or phone) ────────── */}
          {view === 'enter_id' && (
            <>
              <button onClick={() => setView('choose_channel')} style={{ background:'none', border:'none', color:'var(--color-text-3)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, marginBottom:20, padding:0 }}>
                <ArrowLeft size={14} /> Retour
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                <div style={{ width:44, height:44, background: channel==='email' ? 'rgba(59,130,246,0.15)' : 'rgba(37,211,102,0.15)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {channel === 'email' ? <Mail size={20} color="var(--color-info)" /> : <MessageCircle size={20} color="var(--color-whatsapp)" />}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{channel === 'email' ? 'Vérification par E-mail' : 'Vérification WhatsApp'}</div>
                  <div style={{ fontSize:12, color:'var(--color-text-3)' }}>Entrez votre {channel === 'email' ? 'adresse e-mail' : 'numéro de téléphone'} enregistré</div>
                </div>
              </div>

              {error && <div className="alert-banner warning" style={{ marginBottom:16 }}><div className="alert-banner-msg">{error}</div></div>}

              <form onSubmit={handleRequestOtp} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div className="form-group">
                  <label className="form-label">{channel === 'email' ? 'Adresse E-mail' : 'Numéro WhatsApp'}</label>
                  <input
                    className="form-input"
                    type={channel === 'email' ? 'email' : 'tel'}
                    placeholder={channel === 'email' ? 'votre@email.com' : '+216 21 952 358'}
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading2} style={{ width:'100%', justifyContent:'center', padding:'11px 0', fontSize:14 }}>
                  {loading2 ? 'Envoi en cours...' : `Recevoir le code ${channel === 'email' ? 'par Email' : 'via WhatsApp'}`}
                </button>
              </form>
            </>
          )}

          {/* ── Enter OTP + New Password ──────────────────── */}
          {view === 'enter_otp' && (
            <>
              <button onClick={() => setView('enter_id')} style={{ background:'none', border:'none', color:'var(--color-text-3)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, marginBottom:20, padding:0 }}>
                <ArrowLeft size={14} /> Retour
              </button>
              <h1 style={{ fontSize:20, marginBottom:8 }}>Entrez votre code</h1>
              {msg && <div className="alert-banner success" style={{ marginBottom:16 }}><div className="alert-banner-msg">{msg}</div></div>}
              {error && <div className="alert-banner warning" style={{ marginBottom:16 }}><div className="alert-banner-msg">{error}</div></div>}

              {/* Dev OTP helper */}
              {import.meta.env.DEV && debugOtp && (
                <div style={{
                  background:'rgba(234,179,8,0.1)', border:'1.5px dashed rgba(234,179,8,0.4)',
                  borderRadius:10, padding:'10px 16px', marginBottom:12,
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:12
                }}>
                  <div>
                    <div style={{ color:'#fbbf24', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>
                      DEV — Code OTP
                    </div>
                    <div style={{ color:'#fef08a', fontSize:24, fontWeight:800, fontFamily:'monospace', letterSpacing:'5px' }}>
                      {debugOtp}
                    </div>
                  </div>
                  <button type="button" onClick={() => setOtpCode(debugOtp)}
                    style={{ padding:'6px 12px', background:'rgba(234,179,8,0.15)', border:'1px solid rgba(234,179,8,0.3)',
                      borderRadius:8, color:'#fbbf24', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    Remplir
                  </button>
                </div>
              )}

              <form onSubmit={handleResetPassword} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div className="form-group">
                  <label className="form-label">Code OTP reçu {channel === 'email' ? 'par email' : 'sur WhatsApp'}</label>
                  <input
                    className="form-input"
                    placeholder="123456"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    required
                    style={{ letterSpacing: '6px', fontSize: 20, textAlign: 'center', fontWeight: 800 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nouveau mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showNewPw ? 'text' : 'password'}
                      placeholder="Minimum 6 caractères"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required minLength={6}
                      style={{ paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowNewPw(v => !v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--color-text-3)', cursor:'pointer' }}>
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading2} style={{ width:'100%', justifyContent:'center', padding:'11px 0', fontSize:14 }}>
                  {loading2 ? 'Vérification...' : '✅ Confirmer la réinitialisation'}
                </button>
              </form>
            </>
          )}

          {/* ── Success ───────────────────────────────────── */}
          {view === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle size={60} color="#22c55e" style={{ marginBottom: 20 }} />
              <h2 style={{ color: '#22c55e', marginBottom: 12 }}>Mot de passe réinitialisé !</h2>
              <p style={{ color: 'var(--color-text-3)', marginBottom: 28 }}>Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.</p>
              <button className="btn btn-primary" onClick={resetFlow} style={{ width:'100%', justifyContent:'center', padding:'11px 0', fontSize:14 }}>
                Retour à la connexion
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
