import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Mail, MessageCircle, ArrowLeft, CheckCircle,
  Shield, Cpu, Wifi, ServerOff, Leaf, Sparkles, Lock, User,
  RefreshCw, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';

/* ── Design tokens ────────────────────────────────────────────────────── */
const T = {
  bg:      '#f8fafc',
  white:   '#ffffff',
  border:  '#e2e8f0',
  raised:  '#f1f5f9',
  muted:   '#94a3b8',
  dim:     '#64748b',
  text:    '#0f172a',
  primary: '#4f46e5',
  green:   '#10b981',
  red:     '#ef4444',
  amber:   '#f59e0b',
};

/* ── Shared input style ───────────────────────────────────────────────── */
const INP = {
  width: '100%', padding: '11px 14px', background: T.raised,
  border: `1px solid ${T.border}`, borderRadius: 10, color: T.text,
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'Inter, system-ui, sans-serif', transition: 'border-color .15s',
};

function Input({ icon: Icon, type = 'text', placeholder, value, onChange, required, minLength, style = {}, right }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      {Icon && <Icon size={14} color={focus ? T.primary : T.muted} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color .15s' }}/>}
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange}
        required={required} minLength={minLength}
        onFocus={e => { setFocus(true); e.target.style.borderColor = T.primary; e.target.style.boxShadow = `0 0 0 3px ${T.primary}18`; }}
        onBlur={e => { setFocus(false); e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
        style={{ ...INP, paddingLeft: Icon ? 38 : 14, paddingRight: right ? 40 : 14, ...style }}
      />
      {right}
    </div>
  );
}

function ErrBanner({ msg, offline }) {
  if (!msg) return null;
  if (offline) return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
      <ServerOff size={16} style={{ color:T.red, flexShrink:0, marginTop:1 }}/>
      <div>
        <p style={{ margin:0, fontWeight:700, color:T.red, fontSize:13 }}>Backend hors ligne</p>
        <p style={{ margin:'3px 0 0', color:'#7f1d1d', fontSize:11 }}>
          Lancez&nbsp;: <code style={{ background:'#fee2e2', padding:'1px 5px', borderRadius:4 }}>cd backend &amp;&amp; uvicorn app.main:app --reload</code>
        </p>
      </div>
    </div>
  );
  return (
    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
      <p style={{ margin:0, fontSize:13, color:'#92400e', fontWeight:600 }}>{msg}</p>
    </div>
  );
}

function OkBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background:'#ecfdf5', border:'1px solid #6ee7b7', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
      <p style={{ margin:0, fontSize:13, color:'#065f46', fontWeight:600 }}>{msg}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function Login() {
  const [form, setForm]         = useState({ username: '', password: '' });
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [offline, setOffline]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [loading2, setLoading2] = useState(false);

  const [view, setView]               = useState('login');
  const [channel, setChannel]         = useState(null);
  const [identifier, setIdentifier]   = useState('');
  const [otpCode, setOtpCode]         = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw]     = useState(false);
  const [debugOtp, setDebugOtp]       = useState(null);

  const { login, loading } = useAuth();
  const { t, i18n }        = useTranslation();
  const navigate           = useNavigate();

  const resetFlow = () => {
    setView('login'); setChannel(null); setIdentifier('');
    setOtpCode(''); setNewPassword(''); setError(''); setMsg(''); setDebugOtp(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setOffline(false);
    const res = await login(form.username, form.password);
    if (res.ok) {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u?.role === 'worker') { navigate('/worker'); return; }
      const farms = JSON.parse(localStorage.getItem('user_farms') || '[]');
      navigate(farms.length === 0 ? '/farms' : '/dashboard');
    } else {
      if (res.offline) setOffline(true);
      setError(res.error);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading2(true);
    try {
      let res;
      if (channel === 'email') {
        res = await authAPI.forgotByEmail({ email: identifier });
        setMsg(`Code envoyé à ${identifier} — vérifiez votre boîte mail.`);
      } else {
        res = await authAPI.forgotByWhatsApp({ phone_number: identifier });
        setMsg(`Code WhatsApp envoyé au ${identifier}.`);
      }
      setDebugOtp(res.data?.debug_otp || null);
      setView('enter_otp');
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'envoi du code.");
    } finally { setLoading2(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setError(''); setLoading2(true);
    try {
      const res = await authAPI.resetPassword({ channel, identifier, otp: otpCode, new_password: newPassword });
      setMsg(res.data.message);
      setView('success');
    } catch (err) {
      setError(err.response?.data?.detail || 'Code OTP invalide ou expiré.');
    } finally { setLoading2(false); }
  };

  /* ── FEATURES shown on left panel ── */
  const FEATURES = [
    { icon: Wifi,     label: t('login.feat_iot',    'Monitoring IoT temps réel') },
    { icon: Eye,      label: t('login.feat_cv',     'Vision IA & détection') },
    { icon: Cpu,      label: t('login.feat_ai',     'IA souveraine Ollama') },
    { icon: Shield,   label: t('login.feat_alerts', 'Alertes & sécurité') },
  ];

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: '1fr 1fr', fontFamily: "'Inter', system-ui, sans-serif", direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>

      {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 35%, #4f46e5 70%, #6d28d9 100%)', padding: '60px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative blobs */}
        <div style={{ position:'absolute', top:-100, right:-80, width:320, height:320, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-80, left:-40, width:280, height:280, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'40%', left:'60%', width:160, height:160, borderRadius:'50%', background:'rgba(139,92,246,.15)', pointerEvents:'none' }}/>

        <div style={{ position:'relative', zIndex:2 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:48 }}>
            <div style={{ width:44, height:44, background:'rgba(255,255,255,.15)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,.25)', backdropFilter:'blur(8px)' }}>
              <Leaf size={22} color="#fff"/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:'#fff', lineHeight:1.2 }}>Smart Farm AI</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.55)' }}>Enterprise Platform v3.0</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ background:'rgba(255,255,255,.12)', borderRadius:99, padding:'4px 12px', display:'flex', alignItems:'center', gap:6, border:'1px solid rgba(255,255,255,.18)' }}>
              <Sparkles size={10} color="#a5b4fc"/>
              <span style={{ fontSize:10, color:'#a5b4fc', fontWeight:700, letterSpacing:.7, textTransform:'uppercase' }}>IA Souveraine</span>
            </div>
          </div>

          <h2 style={{ fontSize:'clamp(24px,3.5vw,34px)', fontWeight:900, color:'#fff', lineHeight:1.2, margin:'0 0 14px', letterSpacing:-.5 }}
            dangerouslySetInnerHTML={{ __html: t('login.hero_title', 'Gérez votre ferme<br/>avec l\'intelligence artificielle') }}/>

          <p style={{ fontSize:14, color:'rgba(255,255,255,.68)', lineHeight:1.75, margin:'0 0 36px', maxWidth:360 }}>
            {t('login.hero_desc', 'Monitoring IoT, vision par ordinateur, IA prédictive et gestion du bétail — tout en un.')}
          </p>

          {/* Feature list */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:32, height:32, background:'rgba(255,255,255,.1)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1px solid rgba(255,255,255,.12)' }}>
                  <Icon size={14} color="rgba(255,255,255,.85)"/>
                </div>
                <span style={{ fontSize:13, color:'rgba(255,255,255,.78)', fontWeight:500 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Bottom badge */}
          <div style={{ marginTop:40, display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', borderRadius:99, padding:'7px 14px' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', animation:'livePulse 2s infinite', display:'inline-block' }}/>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.65)', fontWeight:600 }}>Système opérationnel · Sécurisé HMAC</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
      <div style={{ background: T.bg, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 32px', overflowY:'auto' }}>
        <div style={{ width:'100%', maxWidth:420 }}>

          {/* ── LOGIN ───────────────────────────────────────────────── */}
          {view === 'login' && (
            <div style={{ animation:'fadeSlide .3s ease forwards' }}>
              <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:24, fontWeight:900, color:T.text, margin:'0 0 6px' }}>
                  {t('login.welcome_back', 'Bon retour 👋')}
                </h1>
                <p style={{ fontSize:13, color:T.dim, margin:0 }}>
                  {t('login.sign_in_to', 'Connectez-vous à votre plateforme agricole')}
                </p>
              </div>

              <OkBanner msg={msg}/>
              <ErrBanner msg={error} offline={offline}/>

              <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:T.dim, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                    {t('login.username', 'Identifiant')}
                  </label>
                  <Input icon={User} placeholder={t('login.enter_username', 'Nom d\'utilisateur ou email')} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required/>
                </div>

                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:T.dim, textTransform:'uppercase', letterSpacing:.5 }}>
                      {t('login.password', 'Mot de passe')}
                    </label>
                    <button type="button" onClick={() => { setView('choose_channel'); setError(''); setMsg(''); }}
                      style={{ background:'none', border:'none', color:T.primary, fontSize:12, fontWeight:600, cursor:'pointer', padding:0 }}>
                      {t('login.forgot_password', 'Mot de passe oublié ?')}
                    </button>
                  </div>
                  <Input icon={Lock} type={showPw ? 'text' : 'password'} placeholder={t('login.enter_password', '••••••••')} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required
                    right={
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:T.muted, cursor:'pointer', padding:6, display:'flex', alignItems:'center' }}>
                        {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    }/>
                </div>

                <button type="submit" disabled={loading}
                  style={{ marginTop:4, width:'100%', padding:'12px', borderRadius:10, border:'none', background:`linear-gradient(135deg, ${T.primary}, #6d28d9)`, color:'#fff', fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:`0 4px 14px ${T.primary}35`, opacity:loading?.7:1, transition:'all .2s' }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.transform='translateY(-1px)')}
                  onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                  {loading ? <><RefreshCw size={14} style={{animation:'spin .8s linear infinite'}}/> Connexion…</> : <>{t('login.sign_in', 'Se connecter')} <ChevronRight size={14}/></>}
                </button>
              </form>

              <div style={{ marginTop:20, textAlign:'center', fontSize:13, color:T.muted }}>
                {t('login.dont_have_account', "Pas de compte ?")}
                {' '}
                <Link to="/register" style={{ color:T.primary, fontWeight:700, textDecoration:'none' }}>
                  {t('login.create_one', 'Créer un compte')}
                </Link>
              </div>

              <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${T.border}`, textAlign:'center' }}>
                <Link to="/worker-login" style={{ fontSize:13, color:T.dim, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6, textDecoration:'none' }}
                  onMouseEnter={e => e.currentTarget.style.color=T.primary}
                  onMouseLeave={e => e.currentTarget.style.color=T.dim}>
                  👷 {t('login.worker_access', 'Accès ouvriers →')}
                </Link>
              </div>
            </div>
          )}

          {/* ── CHOOSE CHANNEL ──────────────────────────────────────── */}
          {view === 'choose_channel' && (
            <div style={{ animation:'fadeSlide .3s ease forwards' }}>
              <button onClick={resetFlow} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:T.dim, cursor:'pointer', fontSize:13, marginBottom:24, padding:0 }}>
                <ArrowLeft size={14}/> Retour
              </button>
              <h1 style={{ fontSize:22, fontWeight:900, color:T.text, margin:'0 0 6px' }}>
                {t('login.recover_access', 'Récupérer l\'accès')}
              </h1>
              <p style={{ fontSize:13, color:T.dim, margin:'0 0 24px' }}>
                {t('login.choose_how_to_receive', 'Choisissez comment recevoir votre code OTP')}
              </p>

              <ErrBanner msg={error}/>

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { ch:'email', label:t('login.by_email','Par E-mail'), icon:Mail, color:'#3b82f6', desc:t('login.email_desc','Code envoyé à votre adresse mail'), badge:'Gratuit · Instantané' },
                  { ch:'whatsapp', label:t('login.via_whatsapp','Via WhatsApp'), icon:MessageCircle, color:'#25D366', desc:t('login.whatsapp_desc','Code envoyé sur votre WhatsApp'), badge:'Gratuit · Instantané' },
                ].map(({ ch, label, icon: Icon, color, desc, badge }) => (
                  <button key={ch} onClick={() => { setChannel(ch); setIdentifier(ch==='whatsapp'?'+216':''); setView('enter_id'); setError(''); }}
                    style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 20px', background:T.white, border:`1.5px solid ${T.border}`, borderRadius:14, cursor:'pointer', textAlign:'left', transition:'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=color; e.currentTarget.style.boxShadow=`0 4px 12px ${color}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.boxShadow='none'; }}>
                    <div style={{ width:44, height:44, background:`${color}15`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={20} color={color}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:12, color:T.dim }}>{desc}</div>
                      <div style={{ fontSize:10, color:T.green, fontWeight:700, marginTop:3 }}>✓ {badge}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── ENTER IDENTIFIER ────────────────────────────────────── */}
          {view === 'enter_id' && (
            <div style={{ animation:'fadeSlide .3s ease forwards' }}>
              <button onClick={() => setView('choose_channel')} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:T.dim, cursor:'pointer', fontSize:13, marginBottom:24, padding:0 }}>
                <ArrowLeft size={14}/> Retour
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                <div style={{ width:44, height:44, background:channel==='email'?'rgba(59,130,246,.12)':'rgba(37,211,102,.12)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {channel==='email' ? <Mail size={20} color="#3b82f6"/> : <MessageCircle size={20} color="#25D366"/>}
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:T.text }}>{channel==='email'?'Vérification par E-mail':'Vérification WhatsApp'}</div>
                  <div style={{ fontSize:12, color:T.dim }}>{t('login.enter_registered','Saisissez votre identifiant enregistré').replace('{channel}', channel==='email'?'e-mail':'WhatsApp')}</div>
                </div>
              </div>

              <ErrBanner msg={error}/>

              <form onSubmit={handleRequestOtp} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:T.dim, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                    {channel==='email' ? t('login.by_email','E-mail') : t('login.via_whatsapp','Numéro WhatsApp')}
                  </label>
                  <Input
                    icon={channel==='email' ? Mail : MessageCircle}
                    type={channel==='email'?'email':'tel'}
                    placeholder={channel==='email'?'votre@email.com':'+216 21 952 358'}
                    value={identifier} onChange={e => setIdentifier(e.target.value)} required/>
                </div>
                <button type="submit" disabled={loading2}
                  style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${T.primary},#6d28d9)`, color:'#fff', fontSize:14, fontWeight:700, cursor:loading2?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:`0 4px 14px ${T.primary}35`, opacity:loading2?.7:1 }}>
                  {loading2 ? <><RefreshCw size={14} style={{animation:'spin .8s linear infinite'}}/> Envoi…</> : `${t('login.receive_code','Recevoir le code').replace('{channel}', channel==='email'?'Email':'WhatsApp')} →`}
                </button>
              </form>
            </div>
          )}

          {/* ── ENTER OTP ───────────────────────────────────────────── */}
          {view === 'enter_otp' && (
            <div style={{ animation:'fadeSlide .3s ease forwards' }}>
              <button onClick={() => setView('enter_id')} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:T.dim, cursor:'pointer', fontSize:13, marginBottom:24, padding:0 }}>
                <ArrowLeft size={14}/> Retour
              </button>
              <h1 style={{ fontSize:22, fontWeight:900, color:T.text, margin:'0 0 20px' }}>
                {t('login.enter_code','Entrez le code reçu')}
              </h1>

              <OkBanner msg={msg}/>
              <ErrBanner msg={error}/>

              {/* DEV helper */}
              {import.meta.env.DEV && debugOtp && (
                <div style={{ background:'rgba(234,179,8,.1)', border:'1.5px dashed rgba(234,179,8,.4)', borderRadius:10, padding:'10px 16px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div>
                    <div style={{ color:'#fbbf24', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>DEV — Code OTP</div>
                    <div style={{ color:'#fef08a', fontSize:24, fontWeight:800, fontFamily:'monospace', letterSpacing:5 }}>{debugOtp}</div>
                  </div>
                  <button type="button" onClick={() => setOtpCode(debugOtp)}
                    style={{ padding:'6px 12px', background:'rgba(234,179,8,.15)', border:'1px solid rgba(234,179,8,.3)', borderRadius:8, color:'#fbbf24', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    Remplir
                  </button>
                </div>
              )}

              <form onSubmit={handleResetPassword} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:T.dim, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                    {t('login.otp_received','Code OTP').replace('{channel}',channel==='email'?'email':'WhatsApp')}
                  </label>
                  <input
                    placeholder="123456" value={otpCode} onChange={e => setOtpCode(e.target.value)} required
                    style={{ ...INP, letterSpacing:8, fontSize:22, textAlign:'center', fontWeight:800 }}
                    onFocus={e => { e.target.style.borderColor=T.primary; e.target.style.boxShadow=`0 0 0 3px ${T.primary}18`; }}
                    onBlur={e => { e.target.style.borderColor=T.border; e.target.style.boxShadow='none'; }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:T.dim, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                    {t('login.new_password','Nouveau mot de passe')}
                  </label>
                  <div style={{ position:'relative' }}>
                    <Input icon={Lock} type={showNewPw?'text':'password'} placeholder="Minimum 6 caractères" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                      right={
                        <button type="button" onClick={() => setShowNewPw(v => !v)}
                          style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:T.muted, cursor:'pointer', padding:6, display:'flex' }}>
                          {showNewPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </button>
                      }/>
                  </div>
                </div>
                <button type="submit" disabled={loading2}
                  style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${T.primary},#6d28d9)`, color:'#fff', fontSize:14, fontWeight:700, cursor:loading2?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:`0 4px 14px ${T.primary}35`, opacity:loading2?.7:1 }}>
                  {loading2 ? <><RefreshCw size={14} style={{animation:'spin .8s linear infinite'}}/> Vérification…</> : `✅ ${t('login.confirm_reset','Confirmer le nouveau mot de passe')}`}
                </button>
              </form>
            </div>
          )}

          {/* ── SUCCESS ─────────────────────────────────────────────── */}
          {view === 'success' && (
            <div style={{ textAlign:'center', animation:'fadeSlide .3s ease forwards' }}>
              <div style={{ width:72, height:72, background:'#ecfdf5', borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
                <CheckCircle size={36} color={T.green}/>
              </div>
              <h2 style={{ fontSize:22, fontWeight:900, color:T.text, marginBottom:8 }}>
                {t('login.password_reset','Mot de passe réinitialisé')}
              </h2>
              <p style={{ color:T.dim, fontSize:13, marginBottom:28, lineHeight:1.7 }}>
                {t('login.password_updated','Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.')}
              </p>
              <button onClick={resetFlow}
                style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${T.primary},#6d28d9)`, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:`0 4px 14px ${T.primary}35` }}>
                {t('login.back_to_login','Retour à la connexion')}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        @media (max-width:768px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns:1fr !important; }
          div[style*="160deg, #1e1b4b"] { display:none !important; }
        }
      `}</style>
    </div>
  );
}
