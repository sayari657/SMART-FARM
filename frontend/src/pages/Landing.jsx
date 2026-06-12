import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Leaf, CheckSquare, MapPin, BarChart2, Shield, Heart, Globe,
  Cpu, ChevronRight, Smartphone, Layers, LayoutDashboard,
  X, Lock, CheckCircle, Send, Building2, Zap, CreditCard, Loader2,
} from 'lucide-react';
import { redirectToCheckout } from '../services/billingApi';
import './Landing.css';

/* ─── Stripe Payment Modal ─────────────────────────────────────────── */
function PaymentModal({ onClose, t }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const isLoggedIn = !!localStorage.getItem('token');

  const features = [t('landing.pay_f1'), t('landing.pay_f2'), t('landing.pay_f3'), t('landing.pay_f4')];

  const handleStripe = async () => {
    setLoading(true); setError('');
    const result = await redirectToCheckout('pro');
    if (!result.ok && result.reason !== 'not_authed') {
      setError(result.reason || t('billing.stripe_error'));
      setLoading(false);
    }
    /* if not_authed: already redirected to /register */
  };

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={loading ? undefined : onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'#fff', borderRadius:22, width:'100%', maxWidth:440, boxShadow:'0 32px 80px rgba(0,0,0,.24)', overflow:'hidden' }}
      >
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#0f172a,#1a2e1a)', padding:'22px 28px 20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ background:'#22c55e', borderRadius:6, padding:'3px 10px', fontSize:10, fontWeight:900, color:'#fff', letterSpacing:.5 }}>
                {t('landing.pay_plan_badge')}
              </div>
            </div>
            <div style={{ fontSize:28, fontWeight:900, color:'#fff', lineHeight:1 }}>
              29 €<span style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,.5)', marginLeft:5 }}>{t('landing.pay_monthly')}</span>
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginTop:4 }}>{t('landing.pay_billing')}</div>
          </div>
          {!loading && (
            <button onClick={onClose} style={{ background:'rgba(255,255,255,.1)', border:'none', borderRadius:8, padding:8, color:'rgba(255,255,255,.7)', cursor:'pointer', display:'flex' }}>
              <X size={16}/>
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding:'26px 28px 28px', display:'flex', flexDirection:'column', gap:18 }}>

          {/* Error banner */}
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#dc2626', display:'flex', alignItems:'center', gap:8 }}>
              ⚠️ {error}
            </div>
          )}

          {/* What's included */}
          <div style={{ background:'#f8fafc', borderRadius:14, padding:'14px 16px', border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:10, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:.7, marginBottom:10 }}>
              {t('landing.pay_included')}
            </div>
            {features.map(f => (
              <div key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#374151', marginBottom:6 }}>
                <CheckCircle size={14} color="#22c55e" /> {f}
              </div>
            ))}
          </div>

          {/* Auth state info */}
          {!isLoggedIn && (
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'12px 14px', fontSize:12, color:'#1d4ed8', lineHeight:1.7 }}>
              <strong>ℹ️ Non connecté</strong> — connectez-vous pour passer au paiement.
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:10 }}>
                <a href="/login?plan=pro" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px', background:'#1d4ed8', color:'#fff', borderRadius:8, fontWeight:700, fontSize:12, textDecoration:'none' }}>
                  Se connecter
                </a>
                <span style={{ color:'#93c5fd', fontSize:11 }}>ou</span>
                <a href="/register?plan=pro" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px', background:'transparent', color:'#1d4ed8', border:'1px solid #bfdbfe', borderRadius:8, fontWeight:700, fontSize:12, textDecoration:'none' }}>
                  Créer un compte
                </a>
              </div>
            </div>
          )}

          {/* Stripe redirect button */}
          <button
            onClick={handleStripe}
            disabled={loading}
            style={{
              width:'100%', padding:'15px', borderRadius:14, border:'none',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg,#16a34a,#15803d)',
              color:'#fff', fontSize:15, fontWeight:900, cursor: loading ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'all .2s',
              boxShadow: loading ? 'none' : '0 6px 20px rgba(22,163,74,.4)',
            }}
          >
            {loading ? (
              <><Loader2 size={18} style={{ animation:'spin .8s linear infinite' }}/> Redirection vers Stripe…</>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ flexShrink:0 }}>
                  <rect width="32" height="32" rx="6" fill="white" fillOpacity=".2"/>
                  <path d="M14.5 10.5c0-1.1.9-2 2-2 1.6 0 2.7 1.1 2.7 2.7 0 2.1-2.7 4.8-2.7 4.8s-2-2.3-2-5.5z" fill="white"/>
                  <path d="M11 18.5c.5-1.5 2-2.5 3.5-2.5s3 1 3.5 2.5H11z" fill="white"/>
                </svg>
                Payer via Stripe — 29 €{t('landing.pay_monthly')}
              </>
            )}
          </button>

          {/* Trust badges */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:11, color:'#94a3b8' }}>
              <Lock size={11}/> Paiement sécurisé SSL · Stripe PCI DSS Niveau 1
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, opacity:.6, marginTop:2 }}>
              {['VISA', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay'].map(b => (
                <span key={b} style={{ fontSize:9, fontWeight:800, color:'#64748b', background:'#f1f5f9', padding:'2px 6px', borderRadius:4 }}>{b}</span>
              ))}
            </div>
          </div>

          <div style={{ textAlign:'center', borderTop:'1px solid #e2e8f0', paddingTop:14 }}>
            <span style={{ fontSize:12, color:'#64748b' }}>{t('landing.pay_free_offer')} </span>
            <button type="button" onClick={onClose} style={{ background:'none', border:'none', color:'#16a34a', fontWeight:700, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
              {t('landing.pay_free_link')}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Shared input styles (contact modal) ────────────────────────── */
const inp = { width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #e2e8f0', background:'#f8fafc', fontSize:14, color:'#0f172a', outline:'none', boxSizing:'border-box', transition:'border-color .15s' };
const lbl = { fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6, letterSpacing:.2 };

/* ─── Contact Modal (Entreprise) ──────────────────────────────────── */
function ContactModal({ onClose, t }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => { setSending(false); setSent(true); }, 1800);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 32px 80px rgba(0,0,0,.2)', overflow: 'hidden' }}>

        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '22px 28px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Building2 size={16} color="#94a3b8" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .7 }}>{t('landing.contact_plan')}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{t('landing.contact_title')}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>{t('landing.contact_subtitle')}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, padding: 8, color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px 28px 28px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ width: 60, height: 60, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle size={32} color="#22c55e" />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>{t('landing.contact_sent_title')}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>{t('landing.contact_sent_desc')}</div>
              <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: 10, background: '#f1f5f9', border: 'none', color: '#374151', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>{t('landing.contact_close')}</button>
            </div>
          ) : (
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>{t('landing.contact_fullname')} *</label>
                  <input style={inp} placeholder="Ahmed Ben Ali" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label style={lbl}>{t('landing.contact_email')} *</label>
                  <input style={inp} type="email" placeholder="you@domain.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label style={lbl}>{t('landing.contact_company')}</label>
                <input style={inp} placeholder={t('landing.contact_company_ph')} value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>{t('landing.contact_need')} *</label>
                <textarea
                  style={{ ...inp, height: 90, resize: 'none', paddingTop: 10 }}
                  placeholder={t('landing.contact_need_ph')}
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  required
                />
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                {['CV Custom', 'Unlimited actors', 'API & Webhooks', 'Local server', 'Account Manager'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#374151', marginBottom: 4 }}>
                    <CheckCircle size={11} color="#6366f1" /> {f}
                  </div>
                ))}
              </div>

              <button type="submit" disabled={sending} style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                background: sending ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff', fontSize: 14, fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: sending ? 'none' : '0 4px 14px rgba(99,102,241,.35)',
              }}>
                {sending ? (
                  <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite', display: 'inline-block' }} /> {t('landing.contact_sending')}</>
                ) : (
                  <><Send size={14} /> {t('landing.contact_send')}</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Landing Page
═══════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const { t, i18n } = useTranslation();
  const [payModal, setPayModal]         = useState(false);
  const [contactModal, setContactModal] = useState(false);

  return (
    <div className="landing-page">

      {payModal     && <PaymentModal onClose={() => setPayModal(false)} t={t} />}
      {contactModal && <ContactModal onClose={() => setContactModal(false)} t={t} />}

      {/* --- Navbar --- */}
      <nav className="landing-nav">
        <div className="landing-nav-container">
          <div className="landing-logo">
            <Leaf className="landing-logo-icon" size={28} />
            <span className="landing-logo-text">SMART FARM AI</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">{t('landing.nav_features')}</a>
            <a href="#how-it-works">{t('landing.nav_how')}</a>
            <a href="#pricing">{t('landing.nav_pricing')}</a>
          </div>
          <div className="landing-nav-actions">
            <div className="landing-lang"><Globe size={18} /> {i18n.language?.toUpperCase().slice(0,2) || 'FR'}</div>
            <Link to="/login" className="landing-link-login">{t('landing.nav_login')}</Link>
            <Link to="/register" className="landing-btn-primary">{t('landing.nav_start')}</Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            {t('landing.hero_title_1')} <span className="text-primary">{t('landing.hero_title_2')}</span>
          </h1>
          <p className="landing-hero-subtitle">
            {t('landing.hero_subtitle')}
          </p>
          <div className="landing-hero-actions">
            <Link to="/register?plan=free" className="landing-btn-primary large">
              {t('landing.hero_btn_free')} <ChevronRight size={20} />
            </Link>
            <Link to="/login" className="landing-btn-outline large">{t('landing.hero_btn_dashboard')} <LayoutDashboard size={20} style={{ marginLeft: 6 }} /></Link>
          </div>
          <div className="landing-hero-trust">
            <div className="stars"><span className="text-primary" style={{ fontSize: 20 }}>★ ★ ★ ★ ★</span></div>
            <span>{t('landing.hero_trust')}</span>
          </div>
        </div>
        <div className="landing-hero-illustration">
          <div className="circle-grid">
            <div className="connector-line" style={{ top: '15px', left: '50%', width: '150px', height: '160px', borderLeft: 'none', borderBottom: 'none', transform: 'translateX(-50%)' }} />
            <div className="circle-node node-1"><Leaf size={32} /></div>
            <div className="circle-node node-2"><Cpu size={28} /></div>
            <div className="circle-node node-3"><BarChart2 size={28} /></div>
            <div className="circle-node node-4"><MapPin size={28} /></div>
            <div className="circle-node node-5"><Heart size={28} /></div>
            <div className="circle-node node-center"><Layers size={48} /></div>
          </div>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="features" className="landing-features">
        <div className="section-pill">{t('landing.features_pill')}</div>
        <h2 className="section-title">{t('landing.features_title')}</h2>
        <p className="section-subtitle">{t('landing.features_sub')}</p>
        <div className="features-grid">
          <FeatureCard icon={<Leaf size={24} />}        title={t('landing.feat_farms_title')}  desc={t('landing.feat_farms_desc')} />
          <FeatureCard icon={<CheckSquare size={24} />} title={t('landing.feat_visits_title')} desc={t('landing.feat_visits_desc')} />
          <FeatureCard icon={<MapPin size={24} />}      title={t('landing.feat_gps_title')}    desc={t('landing.feat_gps_desc')} />
          <FeatureCard icon={<BarChart2 size={24} />}   title={t('landing.feat_prod_title')}   desc={t('landing.feat_prod_desc')} />
          <FeatureCard icon={<Shield size={24} />}      title={t('landing.feat_tele_title')}   desc={t('landing.feat_tele_desc')} />
          <FeatureCard icon={<Cpu size={24} />}         title={t('landing.feat_vision_title')} desc={t('landing.feat_vision_desc')} />
          <FeatureCard icon={<Heart size={24} />}       title={t('landing.feat_health_title')} desc={t('landing.feat_health_desc')} />
          <FeatureCard icon={<Globe size={24} />}       title={t('landing.feat_multi_title')}  desc={t('landing.feat_multi_desc')} />
        </div>
      </section>

      {/* --- How it works Section --- */}
      <section id="how-it-works" className="landing-steps">
        <div className="section-pill">{t('landing.how_pill')}</div>
        <h2 className="section-title">{t('landing.how_title')}</h2>
        <p className="section-subtitle">{t('landing.how_sub')}</p>
        <div className="steps-container">
          <div className="step-item">
            <div className="step-circle">
              <div className="step-number">1</div>
              <Smartphone size={48} color="var(--color-primary)" strokeWidth={1} />
            </div>
            <h3>{t('landing.step1_title')}</h3>
            <p>{t('landing.step1_desc')}</p>
          </div>
          <div className="step-arrow"><ChevronRight size={24} color="var(--color-primary)" /></div>
          <div className="step-item">
            <div className="step-circle">
              <div className="step-number">2</div>
              <Cpu size={48} color="var(--color-primary)" strokeWidth={1} />
            </div>
            <h3>{t('landing.step2_title')}</h3>
            <p>{t('landing.step2_desc')}</p>
          </div>
          <div className="step-arrow"><ChevronRight size={24} color="var(--color-primary)" /></div>
          <div className="step-item">
            <div className="step-circle">
              <div className="step-number">3</div>
              <BarChart2 size={48} color="var(--color-primary)" strokeWidth={1} />
            </div>
            <h3>{t('landing.step3_title')}</h3>
            <p>{t('landing.step3_desc')}</p>
          </div>
        </div>
      </section>

      {/* --- Pricing Section --- */}
      <section id="pricing" className="landing-pricing">
        <div className="section-pill">{t('landing.pricing_pill')}</div>
        <h2 className="section-title">{t('landing.pricing_title')}</h2>
        <p className="section-subtitle">{t('landing.pricing_sub')}</p>

        <div className="pricing-grid">

          {/* Free */}
          <div className="pricing-card">
            <h4>{t('landing.plan_free_title')}</h4>
            <div className="price">{t('landing.plan_free_price')}<span className="month">//month</span></div>
            <p className="price-desc">{t('landing.plan_free_desc')}</p>
            <ul className="price-features">
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_free_f1')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_free_f2')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_free_f3')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_free_f4')}</li>
            </ul>
            <Link to="/register?plan=free" className="landing-btn-outline w-full">{t('landing.plan_free_btn')}</Link>
          </div>

          {/* Pro */}
          <div className="pricing-card popular">
            <div className="popular-badge">{t('landing.plan_pro_badge')}</div>
            <h4>{t('landing.plan_pro_title')}</h4>
            <div className="price">29€<span className="month">//month</span></div>
            <p className="price-desc">{t('landing.plan_pro_desc')}</p>
            <ul className="price-features">
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_pro_f1')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_pro_f2')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_pro_f3')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_pro_f4')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_pro_f5')}</li>
            </ul>
            <button onClick={() => setPayModal(true)} className="landing-btn-primary w-full" style={{ border: 'none', cursor: 'pointer' }}>
              <Zap size={14} style={{ marginRight: 6 }} /> {t('landing.plan_pro_btn')}
            </button>
          </div>

          {/* Enterprise */}
          <div className="pricing-card">
            <h4>{t('landing.plan_ent_title')}</h4>
            <div className="price">{t('landing.plan_ent_price')}</div>
            <p className="price-desc">{t('landing.plan_ent_desc')}</p>
            <ul className="price-features">
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_ent_f1')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_ent_f2')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_ent_f3')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_ent_f4')}</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> {t('landing.plan_ent_f5')}</li>
            </ul>
            <button onClick={() => setContactModal(true)} className="landing-btn-outline w-full" style={{ cursor: 'pointer' }}>
              <Building2 size={14} style={{ marginRight: 6 }} /> {t('landing.plan_ent_btn')}
            </button>
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="landing-cta">
        <div className="cta-container">
          <h2>{t('landing.cta_title')}</h2>
          <p>{t('landing.cta_desc')}</p>
          <Link to="/register?plan=free" className="landing-btn-white large">
            {t('landing.cta_btn')} <ChevronRight size={20} />
          </Link>
          <div className="cta-bg-shapes">
            <div className="cta-circle cta-circle-1" />
            <div className="cta-circle cta-circle-2" />
            <div className="cta-circle cta-circle-3" />
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-col brand">
            <div className="landing-logo white">
              <Leaf className="landing-logo-icon" size={24} />
              <span>SMART FARM AI</span>
            </div>
            <p>{t('landing.description')}</p>
            <div className="secure-badge">
              <Shield size={16} color="#fbbf24" /> {t('landing.footer_encrypted')}
            </div>
          </div>
          <div className="footer-col">
            <h4>{t('landing.footer_product')}</h4>
            <a href="#features">{t('landing.footer_ai_engine')}</a>
            <a href="#pricing">{t('landing.footer_pricing')}</a>
            <a href="#how-it-works">{t('landing.footer_telemetry')}</a>
            <a href="#">{t('landing.footer_updates')}</a>
          </div>
          <div className="footer-col">
            <h4>{t('landing.footer_company_col')}</h4>
            <a href="#">{t('landing.footer_mission')}</a>
            <a href="#">{t('landing.footer_rd')}</a>
            <a href="#">{t('landing.footer_careers')}</a>
            <a href="#">{t('landing.footer_contact')}</a>
          </div>
          <div className="footer-col">
            <h4>{t('landing.footer_legal')}</h4>
            <a href="#">{t('landing.footer_privacy')}</a>
            <a href="#">{t('landing.footer_terms')}</a>
            <a href="#">{t('landing.footer_sovereignty')}</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>{t('landing.footer_copy')} <strong>{t('landing.footer_company_name')}</strong>.</p>
          <div className="footer-langs">
            <a href="#" onClick={() => i18n.changeLanguage('en')}>English</a>
            <a href="#" onClick={() => i18n.changeLanguage('fr')} className={i18n.language === 'fr' ? 'active' : ''}>Français</a>
            <a href="#" onClick={() => i18n.changeLanguage('ar')}>العربية</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="feature-card">
      <div className="feature-icon-wrapper">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{desc}</p>
    </div>
  );
}
