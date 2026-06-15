import React, { useState, lazy, Suspense } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
const LoginBackground3D = lazy(() => import('../components/LoginBackground3D'));
import {
  Eye, EyeOff, Mail, MessageCircle, ArrowLeft, CheckCircle,
  Shield, Cpu, Wifi, ServerOff, Leaf, Sparkles, Lock, User,
  RefreshCw, ChevronRight, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';
import { redirectToCheckout } from '../services/billingApi';

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
  width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,.9)',
  border: `1.5px solid ${T.border}`, borderRadius: 12, color: T.text,
  fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'Inter, system-ui, sans-serif',
  transition: 'border-color .18s, box-shadow .18s, background .18s',
  boxShadow: '0 1px 2px rgba(15,23,42,.04)',
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
        onBlur={e => { setFocus(false); e.target.style.borderColor = T.border; e.target.style.boxShadow = '0 1px 2px rgba(15,23,42,.04)'; }}
        style={{ ...INP, paddingLeft: Icon ? 38 : 14, paddingRight: right ? 40 : 14, ...style }}
      />
      {right}
    </div>
  );
}

function ErrBanner({ msg, offline }) {
  const { t } = useTranslation();
  if (!msg) return null;
  if (offline) return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
      <ServerOff size={16} style={{ color:T.red, flexShrink:0, marginTop:1 }}/>
      <div>
        <p style={{ margin:0, fontWeight:700, color:T.red, fontSize:13 }}>{t('login.backend_offline', 'Backend hors ligne')}</p>
        <p style={{ margin:'3px 0 0', color:'#7f1d1d', fontSize:11 }}>
          {t('login.run_command', 'Lancez :')} <code style={{ background:'#fee2e2', padding:'1px 5px', borderRadius:4 }}>cd backend &amp;&amp; uvicorn app.main:app --reload</code>
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
  const [searchParams]     = useSearchParams();
  const [planChoice, setPlanChoice] = useState(searchParams.get('plan') || 'free');

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
      if (planChoice === 'pro') {
        await redirectToCheckout('pro');
        return;
      }
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
        setMsg(t('login.code_sent_email', 'Code envoyé à {{email}} — vérifiez votre boîte mail.', { email: identifier }));
      } else {
        res = await authAPI.forgotByWhatsApp({ phone_number: identifier });
        setMsg(t('login.code_sent_whatsapp', 'Code WhatsApp envoyé au {{phone}}.', { phone: identifier }));
      }
      setDebugOtp(res.data?.debug_otp || null);
      setView('enter_otp');
    } catch (err) {
      setError(err.response?.data?.detail || t('login.error_sending_code', "Erreur lors de l'envoi du code."));
    } finally { setLoading2(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setError(''); setLoading2(true);
    try {
      const res = await authAPI.resetPassword({ channel, identifier, otp: otpCode, new_password: newPassword });
      setMsg(res.data.message);
      setView('success');
    } catch (err) {
      setError(err.response?.data?.detail || t('login.invalid_otp', 'Code OTP invalide ou expiré.'));
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
      <div style={{ background: 'linear-gradient(160deg, #064e3b 0%, #1e1b4b 30%, #312e81 60%, #4f46e5 100%)', padding: '60px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Dynamic Three.js Smart Farm AI background */}
        <Suspense fallback={null}>
          <LoginBackground3D />
        </Suspense>
        {/* Decorative blobs (base layer under the 3D canvas) */}
        <div style={{ position:'absolute', top:-100, right:-80, width:320, height:320, borderRadius:'50%', background:'rgba(52,211,153,.06)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-80, left:-40, width:280, height:280, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>

        <div style={{ position:'relative', zIndex:2 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:48 }}>
            <div style={{ width:44, height:44, background:'rgba(255,255,255,.15)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,.25)', backdropFilter:'blur(8px)' }}>
              <Leaf size={22} color="#fff"/>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:'#fff', lineHeight:1.2 }}>Smart Farm AI</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.55)' }}>{t('login.enterprise_platform', 'Enterprise Platform v3.0')}</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ background:'rgba(255,255,255,.12)', borderRadius:99, padding:'4px 12px', display:'flex', alignItems:'center', gap:6, border:'1px solid rgba(255,255,255,.18)' }}>
              <Sparkles size={10} color="#a5b4fc"/>
              <span style={{ fontSize:10, color:'#a5b4fc', fontWeight:700, letterSpacing:.7, textTransform:'uppercase' }}>{t('login.sovereign_ai', 'IA Souveraine')}</span>
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
            <span style={{ fontSize:11, color:'rgba(255,255,255,.65)', fontWeight:600 }}>{t('login.system_operational', 'Système opérationnel · Sécurisé HMAC')}</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
      <div style={{ position:'relative', background:'linear-gradient(155deg, #f8fafc 0%, #eef2ff 45%, #f5f3ff 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 32px', overflowY:'auto' }}>
        {/* soft ambient glows */}
        <div style={{ position:'absolute', top:'6%', right:'-12%', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, rgba(79,70,229,.12), transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'-10%', left:'-10%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle, rgba(16,185,129,.10), transparent 70%)', pointerEvents:'none' }}/>
        <div style={{
          position:'relative', width:'100%', maxWidth:440,
          background:'rgba(255,255,255,.72)', backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
          border:'1px solid rgba(255,255,255,.8)', borderRadius:24, padding:'36px 34px',
          boxShadow:'0 30px 70px -18px rgba(30,27,75,.22), 0 8px 24px -10px rgba(15,23,42,.10)',
        }}>

          {/* ── LOGIN ───────────────────────────────────────────────── */}
          {view === 'login' && (
            <div style={{ animation:'fadeSlide .3s ease forwards' }}>

              <div style={{ marginBottom:22 }}>
                <h1 style={{ fontSize:22, fontWeight:900, color:T.text, margin:'0 0 4px' }}>
                  Connexion
                </h1>
                <p style={{ fontSize:13, color:T.dim, margin:0 }}>
                  Choisissez votre plan puis connectez-vous
                </p>
              </div>

              {/* ── Plan selector ── */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:800, color:T.dim, textTransform:'uppercase', letterSpacing:.6, marginBottom:10 }}>
                  Choisir un plan
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>

                  {/* Free */}
                  <button type="button" onClick={() => setPlanChoice('free')} style={{
                    padding:'14px 12px', borderRadius:12, cursor:'pointer', textAlign:'left', transition:'all .18s',
                    border: planChoice==='free' ? `2px solid ${T.primary}` : `2px solid ${T.border}`,
                    background: planChoice==='free' ? '#eff6ff' : T.white,
                    boxShadow: planChoice==='free' ? `0 0 0 3px ${T.primary}18` : 'none',
                  }}>
                    <div style={{ fontSize:13, fontWeight:800, color: planChoice==='free' ? T.primary : T.text, marginBottom:4 }}>
                      Initiation
                    </div>
                    <div style={{ fontSize:20, fontWeight:900, color: planChoice==='free' ? T.primary : T.text, lineHeight:1, marginBottom:6 }}>
                      Gratuit
                    </div>
                    <div style={{ fontSize:11, color:T.dim, lineHeight:1.5 }}>50 animaux · 1 utilisateur</div>
                    {planChoice==='free' && (
                      <div style={{ marginTop:6, fontSize:10, fontWeight:700, color:T.primary, display:'flex', alignItems:'center', gap:4 }}>
                        <CheckCircle size={11}/> Sélectionné
                      </div>
                    )}
                  </button>

                  {/* Pro */}
                  <button type="button" onClick={() => setPlanChoice('pro')} style={{
                    padding:'14px 12px', borderRadius:12, cursor:'pointer', textAlign:'left', transition:'all .18s',
                    border: planChoice==='pro' ? '2px solid #16a34a' : `2px solid ${T.border}`,
                    background: planChoice==='pro' ? '#f0fdf4' : T.white,
                    boxShadow: planChoice==='pro' ? '0 0 0 3px rgba(22,163,74,.15)' : 'none',
                    position:'relative',
                  }}>
                    <div style={{ position:'absolute', top:-1, right:-1, background:'#16a34a', color:'#fff', fontSize:9, fontWeight:900, padding:'3px 8px', borderRadius:'0 10px 0 8px', letterSpacing:.5 }}>
                      POPULAIRE
                    </div>
                    <div style={{ fontSize:13, fontWeight:800, color: planChoice==='pro' ? '#15803d' : T.text, marginBottom:4 }}>
                      Professionnel
                    </div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:3, marginBottom:6 }}>
                      <span style={{ fontSize:20, fontWeight:900, color: planChoice==='pro' ? '#15803d' : T.text, lineHeight:1 }}>29€</span>
                      <span style={{ fontSize:11, color:T.dim }}>/mois</span>
                    </div>
                    <div style={{ fontSize:11, color:T.dim, lineHeight:1.5 }}>Illimité · IA · PDF</div>
                    {planChoice==='pro' && (
                      <div style={{ marginTop:6, fontSize:10, fontWeight:700, color:'#16a34a', display:'flex', alignItems:'center', gap:4 }}>
                        <CheckCircle size={11}/> Sélectionné
                      </div>
                    )}
                  </button>
                </div>

                {/* Stripe notice — only shown when Pro selected */}
                {planChoice==='pro' && (
                  <div style={{ marginTop:10, display:'flex', alignItems:'flex-start', gap:8, background:'#fefce8', border:'1px solid #fde047', borderRadius:10, padding:'10px 13px' }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>💳</span>
                    <div style={{ fontSize:12, color:'#713f12', lineHeight:1.5 }}>
                      <strong>Paiement Stripe requis.</strong> Après connexion, vous serez redirigé vers la page de paiement sécurisée Stripe pour activer votre plan Professionnel.
                    </div>
                  </div>
                )}
              </div>

              <OkBanner msg={msg}/>
              <ErrBanner msg={error} offline={offline}/>

              <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:T.dim, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                    {t('login.username', 'Identifiant')}
                  </label>
                  <Input icon={User} placeholder={t('login.enter_username', "Nom d'utilisateur ou email")} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required/>
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
                  <Input icon={Lock} type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required
                    right={
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:T.muted, cursor:'pointer', padding:6, display:'flex', alignItems:'center' }}>
                        {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    }/>
                </div>

                <button type="submit" disabled={loading} className={loading ? '' : 'loginCta'} style={{
                  position:'relative', overflow:'hidden',
                  marginTop:6, width:'100%', padding:'14px', borderRadius:14, border:'none',
                  background: loading ? '#94a3b8' : planChoice==='pro'
                    ? 'linear-gradient(135deg,#16a34a,#15803d)'
                    : `linear-gradient(135deg,${T.primary} 0%,#6d28d9 60%,#8b5cf6 100%)`,
                  color:'#fff', fontSize:14.5, fontWeight:800, letterSpacing:.2,
                  cursor:loading?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow: loading ? 'none' : planChoice==='pro' ? '0 10px 26px -8px rgba(22,163,74,.55)' : '0 10px 26px -8px rgba(79,70,229,.55)',
                  opacity:loading ? .7 : 1, transition:'transform .2s, box-shadow .2s',
                }}
                  onMouseEnter={e => { if(!loading){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow = planChoice==='pro' ? '0 16px 32px -8px rgba(22,163,74,.6)' : '0 16px 32px -8px rgba(79,70,229,.6)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow = planChoice==='pro' ? '0 10px 26px -8px rgba(22,163,74,.55)' : '0 10px 26px -8px rgba(79,70,229,.55)'; }}>
                  {loading ? (
                    <><RefreshCw size={14} style={{animation:'spin .8s linear infinite'}}/> {planChoice==='pro' ? 'Connexion → Stripe…' : 'Connexion…'}</>
                  ) : planChoice==='pro' ? (
                    <><Zap size={15}/> Se connecter → Payer 29€/mois</>
                  ) : (
                    <><ChevronRight size={15}/> Se connecter gratuitement</>
                  )}
                </button>
              </form>

              <div style={{ marginTop:18, textAlign:'center', fontSize:13, color:T.muted }}>
                Pas de compte ?{' '}
                <Link to={`/register?plan=${planChoice}`} style={{ color:T.primary, fontWeight:700, textDecoration:'none' }}>
                  Créer un compte
                </Link>
              </div>

              <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${T.border}`, textAlign:'center' }}>
                <Link to="/worker-login" style={{ fontSize:12, color:T.dim, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6, textDecoration:'none' }}
                  onMouseEnter={e => e.currentTarget.style.color=T.primary}
                  onMouseLeave={e => e.currentTarget.style.color=T.dim}>
                  👷 Accès ouvriers →
                </Link>
              </div>
            </div>
          )}

          {/* ── CHOOSE CHANNEL ──────────────────────────────────────── */}
          {view === 'choose_channel' && (
            <div style={{ animation:'fadeSlide .3s ease forwards' }}>
              <button onClick={resetFlow} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:T.dim, cursor:'pointer', fontSize:13, marginBottom:24, padding:0 }}>
                <ArrowLeft size={14}/> {t('login.back', 'Retour')}
              </button>
              <h1 style={{ fontSize:22, fontWeight:900, color:T.text, margin:'0 0 6px' }}>
                {t('login.recover_access', 'Récupérer l\'accès')}
              </h1>
              <p style={{ fontSize:13, color:T.dim, margin:'0 0 24px' }}>
                {t('login.choose_how_to_receive', 'Choisissez comment recevoir votre code OTP')}
              </p>

              <ErrBanner msg={error}/>

              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[
                  { ch:'email', label:t('login.by_email','Par E-mail'), icon:Mail, color:'#3b82f6', grad:'linear-gradient(135deg,#3b82f6,#6366f1)', desc:t('login.email_desc','Code envoyé à votre adresse email enregistrée'), badge:'Gratuit · Instantané' },
                  { ch:'whatsapp', label:t('login.via_whatsapp','Via WhatsApp'), icon:MessageCircle, color:'#25D366', grad:'linear-gradient(135deg,#25D366,#128C7E)', desc:t('login.whatsapp_desc','Code OTP sur votre numéro WhatsApp enregistré'), badge:'Gratuit · Instantané' },
                ].map(({ ch, label, icon: Icon, color, grad, desc, badge }) => (
                  <button key={ch} onClick={() => { setChannel(ch); setIdentifier(ch==='whatsapp'?'+216':''); setView('enter_id'); setError(''); }}
                    style={{
                      position:'relative', overflow:'hidden', display:'flex', alignItems:'center', gap:16,
                      padding:'18px 18px', background:'rgba(255,255,255,.75)', backdropFilter:'blur(8px)',
                      border:`1.5px solid ${T.border}`, borderRadius:16, cursor:'pointer', textAlign:'left',
                      transition:'transform .2s, box-shadow .2s, border-color .2s',
                      boxShadow:'0 1px 3px rgba(15,23,42,.05)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=color; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 14px 30px -10px ${color}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(15,23,42,.05)'; }}>
                    {/* accent bar */}
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:grad }}/>
                    <div style={{ width:52, height:52, background:grad, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 8px 18px -6px ${color}88` }}>
                      <Icon size={24} color="#fff"/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:15, color:T.text, marginBottom:3 }}>{label}</div>
                      <div style={{ fontSize:12, color:T.dim, lineHeight:1.4 }}>{desc}</div>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:7, fontSize:10, fontWeight:800, color:'#15803d', background:'#dcfce7', border:'1px solid #bbf7d0', padding:'2px 9px', borderRadius:99 }}>
                        <CheckCircle size={10}/> {badge}
                      </span>
                    </div>
                    <ChevronRight size={20} color={T.muted} style={{ flexShrink:0 }}/>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── ENTER IDENTIFIER ────────────────────────────────────── */}
          {view === 'enter_id' && (
            <div style={{ animation:'fadeSlide .3s ease forwards' }}>
              <button onClick={() => setView('choose_channel')} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:T.dim, cursor:'pointer', fontSize:13, marginBottom:24, padding:0 }}>
                <ArrowLeft size={14}/> {t('login.back', 'Retour')}
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                <div style={{ width:44, height:44, background:channel==='email'?'rgba(59,130,246,.12)':'rgba(37,211,102,.12)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {channel==='email' ? <Mail size={20} color="#3b82f6"/> : <MessageCircle size={20} color="#25D366"/>}
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:T.text }}>{channel==='email'? t('login.email_verification', 'Vérification par E-mail') : t('login.whatsapp_verification', 'Vérification WhatsApp')}</div>
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
                <ArrowLeft size={14}/> {t('login.back', 'Retour')}
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
                    <div style={{ color:'#fbbf24', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>{t('login.dev_otp', 'DEV — Code OTP')}</div>
                    <div style={{ color:'#fef08a', fontSize:24, fontWeight:800, fontFamily:'monospace', letterSpacing:5 }}>{debugOtp}</div>
                  </div>
                  <button type="button" onClick={() => setOtpCode(debugOtp)}
                    style={{ padding:'6px 12px', background:'rgba(234,179,8,.15)', border:'1px solid rgba(234,179,8,.3)', borderRadius:8, color:'#fbbf24', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    {t('login.fill', 'Remplir')}
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
        @keyframes ctaShine { 0%{left:-160%} 60%,100%{left:160%} }
        /* Premium CTA shine sweep */
        .loginCta::after {
          content:''; position:absolute; top:0; left:-160%; width:55%; height:100%;
          background:linear-gradient(120deg, transparent, rgba(255,255,255,.45), transparent);
          transform:skewX(-20deg); animation:ctaShine 3.8s ease-in-out infinite; pointer-events:none;
        }
        @media (max-width:768px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns:1fr !important; }
          div[style*="155deg, #1e1b4b"], div[style*="160deg, #064e3b"] { display:none !important; }
        }
      `}</style>
    </div>
  );
}
