import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Mail, MessageCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThreeBackground from '../components/ThreeBackground';
import ThreeFarmBackground from '../components/ThreeFarmBackground';
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

  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const fillDemo = (role) => {
    const demos = { admin: ['med9', 'password123'], manager: ['manager1', 'password123'], vet: ['vet1', 'password123'] };
    const [u, p] = demos[role] || ['', ''];
    setForm({ username: u, password: p });
  };

  const resetFlow = () => {
    setView('login'); setChannel(null); setIdentifier('');
    setOtpCode(''); setNewPassword(''); setError(''); setMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setError('');
    const res = await login(form.username, form.password);
    if (res.ok) navigate('/about-project');
    else setError(res.error);
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading2(true);
    try {
      if (channel === 'email') {
        await authAPI.forgotByEmail({ email: identifier });
        setMsg(`✅ Code envoyé à ${identifier}. Vérifiez votre boîte mail.`);
      } else {
        await authAPI.forgotByWhatsApp({ phone_number: identifier });
        setMsg(`✅ Code WhatsApp envoyé au ${identifier}. Vérifiez WhatsApp.`);
      }
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
    <div className="auth-left" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 1, padding: '40px' }}>
      <ThreeFarmBackground />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:40 }}>
          <div style={{ width:48, height:48, background:'rgba(255,255,255,.2)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Leaf size={24} />
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:20, color:'#fff' }}>Smart Farm AI</div>
            <div style={{ opacity:.7, fontSize:12, color:'#fff' }}>Enterprise Platform</div>
          </div>
        </div>
        <h2 style={{ color:'#fff' }}>Intelligent Farm<br />Monitoring at Scale</h2>
        <p style={{ color:'#fff', opacity:.9 }}>Monitor bees, cows, poultry with IoT telemetry, computer vision, and AI anomaly detection.</p>
        <div className="auth-features">
          {['Real-time IoT telemetry', 'Computer vision detection', 'AI anomaly engine', 'Multi-species alerts', 'Automated recommendations'].map(f => (
            <div className="auth-feature" key={f} style={{ color:'#fff' }}>
              <div className="auth-feature-dot" />{f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-page" style={{ background: 'transparent', position: 'relative' }}>
      <ThreeBackground />
      {renderLeft()}

      <div className="auth-right" style={{ zIndex: 1 }}>
        <div className="auth-card" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>

          {/* ── Login View ───────────────────────────────── */}
          {view === 'login' && (
            <>
              <h1>Welcome back</h1>
              <p>Sign in to your Smart Farm AI account</p>

              <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                {['admin','manager','vet'].map(r => (
                  <button key={r} className="btn btn-secondary btn-sm" onClick={() => fillDemo(r)}>Demo {r}</button>
                ))}
              </div>

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
                    <Mail size={22} color="#3b82f6" />
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
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#25D366'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <div style={{ width:48, height:48, background:'rgba(37,211,102,0.15)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <MessageCircle size={22} color="#25D366" />
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
                  {channel === 'email' ? <Mail size={20} color="#3b82f6" /> : <MessageCircle size={20} color="#25D366" />}
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
