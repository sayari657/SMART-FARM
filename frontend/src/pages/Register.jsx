import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Zap, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ThreeBackground from '../components/ThreeBackground';
import ThreeFarmBackground from '../components/ThreeFarmBackground';

const PLAN_META = {
  pro:  { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: Zap },
  free: { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', icon: CheckCircle },
};

export default function Register() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ username:'', email:'', phone_number:'+216', full_name:'', password:'', role:'owner' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan');

  const ROLES = [
    { value: 'owner',  label: t('register.role_owner') },
    { value: 'worker', label: t('register.role_worker') },
  ];

  const ROLE_DESC = {
    owner: t('register.role_owner_desc'),
    worker: t('register.role_worker_desc'),
  };

  const PLAN_LABEL = {
    pro:  `${t('landing.plan_pro_title')} · 29€/${t('landing.pay_monthly').replace('/', '')}`,
    free: `${t('landing.plan_free_title')} · ${t('landing.plan_free_price')}`,
  };

  const HERO_FEATURES = [
    t('register.hero_f1'),
    t('register.hero_f2'),
    t('register.hero_f3'),
    t('register.hero_f4'),
    t('register.hero_f5'),
  ];

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await register(form);
    if (res.ok) {
      setSuccess(true);
      const target = form.role === 'owner' ? '/login?first_farm=1' : '/login';
      setTimeout(() => navigate(target), 1500);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="auth-page" style={{ background: 'transparent', position: 'relative' }}>
      <ThreeBackground />

      {/* ── Left panel ── */}
      <div className="auth-left" style={{ position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', justifyContent:'center', zIndex:1, padding:'clamp(20px, 5vw, 40px)' }}>
        <ThreeFarmBackground />
        <div style={{ position:'relative', zIndex:2 }}>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:40 }}>
            <div style={{ width:48, height:48, background:'rgba(255,255,255,.2)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Leaf size={24} />
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:20, color:'#fff' }}>Smart Farm AI</div>
              <div style={{ opacity:.7, fontSize:12, color:'#fff' }}>Enterprise Platform</div>
            </div>
          </div>

          <h2 style={{ color:'#fff' }}>{t('register.hero_title')}</h2>
          <p style={{ color:'#fff', opacity:.9, lineHeight:1.7 }}>
            {t('register.hero_desc')}
          </p>

          <div className="auth-features" style={{ marginTop:32 }}>
            {HERO_FEATURES.map(item => (
              <div className="auth-feature" key={item} style={{ color:'#fff' }}>
                <div className="auth-feature-dot" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-card">
          <h1>{t('register.title')}</h1>
          <p>{t('register.subtitle')}</p>

          {/* Plan badge */}
          {plan && PLAN_META[plan] && (() => {
            const m = PLAN_META[plan];
            const Icon = m.icon;
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: m.bg, border: `1.5px solid ${m.border}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 4,
              }}>
                <Icon size={15} color={m.color} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: m.color, textTransform: 'uppercase', letterSpacing: .6 }}>{t('register.plan_selected')}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{PLAN_LABEL[plan]}</div>
                </div>
                <Link to="/#pricing" style={{ marginLeft: 'auto', fontSize: 11, color: m.color, textDecoration: 'underline', fontWeight: 600 }}>{t('register.plan_change')}</Link>
              </div>
            );
          })()}

          {success && (
            <div className="alert-banner success" style={{ marginBottom:16 }}>
              <div className="alert-banner-msg">✓ {t('register.success')}</div>
            </div>
          )}
          {error && (
            <div className="alert-banner warning" style={{ marginBottom:16 }}>
              <div className="alert-banner-msg">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('register.username')} *</label>
                <input className="form-input" id="reg-username" placeholder={t('register.username_placeholder')} value={form.username} onChange={set('username')} required minLength={3} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('register.name')}</label>
                <input className="form-input" id="reg-fullname" placeholder={t('register.fullname_placeholder')} value={form.full_name} onChange={set('full_name')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('register.phone')} *</label>
                <input className="form-input" id="reg-phone" type="tel" placeholder={t('register.phone_placeholder')} value={form.phone_number} onChange={set('phone_number')} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('register.email')}</label>
                <input className="form-input" id="reg-email" type="email" placeholder={t('register.email_placeholder')} value={form.email} onChange={set('email')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('register.password')} *</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" id="reg-password" type={showPw ? 'text' : 'password'} placeholder={t('register.password_placeholder')} value={form.password} onChange={set('password')} required minLength={6} style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--color-text-3)', cursor:'pointer', padding:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('register.role')}</label>
                <select className="form-select" id="reg-role" value={form.role} onChange={set('role')}>
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role description card */}
            <div style={{
              background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.15)',
              borderRadius:10, padding:'10px 14px', fontSize:13, color:'var(--color-text-2)', lineHeight:1.6
            }}>
              <strong style={{ color:'var(--color-text-1)' }}>
                {form.role === 'owner' ? t('register.role_owner_label') : t('register.role_worker_label')}
              </strong>
              {' — '}{ROLE_DESC[form.role]}
            </div>

            <button
              className="btn btn-primary"
              id="reg-submit"
              type="submit"
              disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'11px 0', fontSize:14, marginTop:4 }}
            >
              {loading ? t('register.creating') : t('register.create_btn')}
            </button>
          </form>

          <div className="auth-footer">
            {t('register.already_have_account')} <Link to="/login">{t('register.login_link')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
