import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Leaf, CheckSquare, MapPin, BarChart2, Shield, Heart, Globe,
  Cpu, ChevronRight, Smartphone, Layers, LayoutDashboard,
  X, CreditCard, Lock, CheckCircle, Send, Building2, Zap,
} from 'lucide-react';
import './Landing.css';

/* ─── Card-number helpers ─────────────────────────────────────────── */
function fmtCard(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function fmtExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
function cardBrand(n) {
  const d = n.replace(/\s/g, '');
  if (d.startsWith('4')) return 'VISA';
  if (/^5[1-5]/.test(d)) return 'MC';
  return null;
}

/* ─── Payment Modal ───────────────────────────────────────────────── */
function PaymentModal({ onClose }) {
  const navigate = useNavigate();
  const [card, setCard]     = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [status, setStatus] = useState('idle'); // idle | processing | success | error
  const [err, setErr]       = useState('');

  const brand = cardBrand(card.number);

  const validate = () => {
    const n = card.number.replace(/\s/g, '');
    if (n.length < 16)   return 'Numéro de carte invalide.';
    if (!card.expiry.match(/^\d{2}\/\d{2}$/)) return 'Date d\'expiration invalide (MM/AA).';
    if (card.cvv.length < 3) return 'CVV invalide.';
    if (!card.name.trim()) return 'Nom du titulaire requis.';
    return null;
  };

  const handlePay = (e) => {
    e.preventDefault();
    const e2 = validate();
    if (e2) { setErr(e2); return; }
    setErr('');
    setStatus('processing');
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => navigate('/register?plan=pro'), 1800);
    }, 2500);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}
      onClick={status === 'idle' ? onClose : undefined}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460,
          boxShadow: '0 32px 80px rgba(0,0,0,.22)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '22px 28px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ background: '#22c55e', borderRadius: 6, padding: '3px 9px', fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: .5 }}>
                ⚡ PROFESSIONNEL
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1 }}>29 €<span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.55)', marginLeft: 4 }}>/mois</span></div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>Facturation mensuelle · Annulez quand vous voulez</div>
          </div>
          {status === 'idle' && (
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, padding: 8, color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'flex' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px 28px' }}>

          {/* Success state */}
          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 64, height: 64, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={36} color="#22c55e" />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Paiement confirmé !</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Redirection vers la création de compte…</div>
            </div>
          )}

          {/* Form */}
          {status !== 'success' && (
            <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {err && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ⚠️ {err}
                </div>
              )}

              {/* Card number */}
              <div>
                <label style={lbl}>Numéro de carte</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...inp, paddingRight: 60 }}
                    placeholder="1234 5678 9012 3456"
                    value={card.number}
                    onChange={e => setCard(p => ({ ...p, number: fmtCard(e.target.value) }))}
                    disabled={status === 'processing'}
                  />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 800, color: brand === 'VISA' ? '#1a56ff' : brand === 'MC' ? '#eb001b' : '#94a3b8', letterSpacing: .5 }}>
                    {brand || <CreditCard size={16} color="#94a3b8" />}
                  </span>
                </div>
              </div>

              {/* Expiry + CVV */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Date d'expiration</label>
                  <input style={inp} placeholder="MM/AA"
                    value={card.expiry}
                    onChange={e => setCard(p => ({ ...p, expiry: fmtExpiry(e.target.value) }))}
                    disabled={status === 'processing'}
                  />
                </div>
                <div>
                  <label style={lbl}>CVV</label>
                  <input style={inp} placeholder="•••" maxLength={4}
                    value={card.cvv}
                    onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    disabled={status === 'processing'}
                    type="password"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={lbl}>Nom du titulaire</label>
                <input style={inp} placeholder="AHMED BEN ALI"
                  value={card.name}
                  onChange={e => setCard(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                  disabled={status === 'processing'}
                />
              </div>

              {/* What's included */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .7, marginBottom: 8 }}>Inclus dans votre abonnement</div>
                {['Données temps-réel illimitées', 'Analyse prédictive IA', 'Exports Excel/PDF', 'Support prioritaire'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#374151', marginBottom: 5 }}>
                    <CheckCircle size={12} color="#22c55e" /> {f}
                  </div>
                ))}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'processing'}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                  background: status === 'processing' ? '#94a3b8' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#fff', fontSize: 14, fontWeight: 800, cursor: status === 'processing' ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all .2s',
                  boxShadow: status === 'processing' ? 'none' : '0 4px 14px rgba(22,163,74,.35)',
                }}
              >
                {status === 'processing' ? (
                  <>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite', display: 'inline-block' }} />
                    Traitement en cours…
                  </>
                ) : (
                  <><Lock size={14} /> Payer 29 € et créer mon compte</>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                <Lock size={11} /> Paiement sécurisé SSL · Annulation facile
              </div>

              <div style={{ textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Préférez commencer gratuitement ? </span>
                <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#16a34a', fontWeight: 700, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                  Voir l'offre Initiation →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Contact Modal (Entreprise) ──────────────────────────────────── */
function ContactModal({ onClose }) {
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

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '22px 28px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Building2 size={16} color="#94a3b8" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .7 }}>PLAN ENTREPRISE</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Contacter nos experts</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>Notre équipe vous répond sous 24h</div>
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
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Message envoyé !</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Notre équipe commerciale vous contactera dans les 24h.</div>
              <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: 10, background: '#f1f5f9', border: 'none', color: '#374151', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Fermer</button>
            </div>
          ) : (
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Nom complet *</label>
                  <input style={inp} placeholder="Ahmed Ben Ali" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label style={lbl}>Email *</label>
                  <input style={inp} type="email" placeholder="vous@domaine.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label style={lbl}>Coopérative / Entreprise</label>
                <input style={inp} placeholder="UTAP Jendouba, GDA …" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Votre besoin *</label>
                <textarea
                  style={{ ...inp, height: 90, resize: 'none', paddingTop: 10 }}
                  placeholder="Décrivez votre exploitation (taille, espèces, besoins spécifiques)…"
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  required
                />
              </div>

              {/* Plan features reminder */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                {['CV Custom', 'Acteurs illimités', 'API & Webhooks', 'Serveur souverain', 'Account Manager'].map(f => (
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
                  <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite', display: 'inline-block' }} /> Envoi en cours…</>
                ) : (
                  <><Send size={14} /> Envoyer ma demande</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Shared input styles ─────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid #e2e8f0', background: '#f8fafc',
  fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .15s',
};
const lbl = { fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6, letterSpacing: .2 };

/* ═══════════════════════════════════════════════════════════════════
   Main Landing Page
═══════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const [payModal, setPayModal]         = useState(false);
  const [contactModal, setContactModal] = useState(false);

  return (
    <div className="landing-page">

      {/* ── Modals ── */}
      {payModal     && <PaymentModal onClose={() => setPayModal(false)} />}
      {contactModal && <ContactModal onClose={() => setContactModal(false)} />}

      {/* --- Navbar --- */}
      <nav className="landing-nav">
        <div className="landing-nav-container">
          <div className="landing-logo">
            <Leaf className="landing-logo-icon" size={28} />
            <span className="landing-logo-text">SMART FARM AI</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Fonctionnalités</a>
            <a href="#how-it-works">Comment ça marche</a>
            <a href="#pricing">Tarifs</a>
          </div>
          <div className="landing-nav-actions">
            <div className="landing-lang"><Globe size={18} /> FR</div>
            <Link to="/login" className="landing-link-login">Connexion</Link>
            <Link to="/register" className="landing-btn-primary">Commencer</Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            L'Intelligence au Service de <span className="text-primary">l'Agriculture</span>
          </h1>
          <p className="landing-hero-subtitle">
            La plateforme SaaS de nouvelle génération conçue pour révolutionner la gestion du bétail, le suivi des cultures et la rentabilité de votre exploitation.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register?plan=free" className="landing-btn-primary large">
              Commencer Gratuitement <ChevronRight size={20} />
            </Link>
            <Link to="/login" className="landing-btn-outline large">Accéder au Dashboard <LayoutDashboard size={20} style={{ marginLeft: 6 }} /></Link>
          </div>
          <div className="landing-hero-trust">
            <div className="stars"><span className="text-primary" style={{ fontSize: 20 }}>★ ★ ★ ★ ★</span></div>
            <span>Approuvé par les agriculteurs pionniers</span>
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
        <div className="section-pill">FONCTIONNALITÉS</div>
        <h2 className="section-title">Tout ce qu'il vous faut pour gérer votre exploitation agricole</h2>
        <p className="section-subtitle">Des visites de terrain au suivi de production — tout dans une seule plateforme robuste.</p>
        <div className="features-grid">
          <FeatureCard icon={<Leaf size={24} />}         title="Gestion des Fermes"   desc="Suivez chaque unité avec nos capteurs environnementaux. Les indicateurs visuels de santé procurent un aperçu instantané." />
          <FeatureCard icon={<CheckSquare size={24} />}  title="Visites de Terrain"   desc="Enregistrement 100% visuel. Aucun clavier nécessaire — tapez pour inspecter en quelques minutes depuis votre smartphone." />
          <FeatureCard icon={<MapPin size={24} />}       title="Monitoring GPS"       desc="Cartographiez tous vos emplacements. Suivez les déplacements saisonniers et l'allocation des surfaces." />
          <FeatureCard icon={<BarChart2 size={24} />}    title="Suivi de Production"  desc="Enregistrez les récoltes par zone. Surveillez les rendements et projetez les tendances via notre IA." />
          <FeatureCard icon={<Shield size={24} />}       title="Télémesure Sécurisée" desc="Le monitoring MQTT garantit une remontée des métriques vitaux avec une latence minimale et une haute sécurité." />
          <FeatureCard icon={<Cpu size={24} />}          title="Intelligence Vision"  desc="La détection YOLO permet le suivi automatisé du bétail, la détection des maladies et l'analyse de comportement." />
          <FeatureCard icon={<Heart size={24} />}        title="Moteur de Santé"      desc="Score de santé automatique basé sur la télémétrie. Détectez les anomalies avant qu'elles ne deviennent des problèmes." />
          <FeatureCard icon={<Globe size={24} />}        title="Multi-Langues"        desc="Support complet Français, Anglais et Arabe avec interface RTL intégrale." />
        </div>
      </section>

      {/* --- How it works Section --- */}
      <section id="how-it-works" className="landing-steps">
        <div className="section-pill">COMMENT ÇA MARCHE</div>
        <h2 className="section-title">Comment fonctionne SMART FARM</h2>
        <p className="section-subtitle">Trois étapes simples pour bâtir une exploitation connectée.</p>
        <div className="steps-container">
          <div className="step-item">
            <div className="step-circle">
              <div className="step-number">1</div>
              <Smartphone size={48} color="var(--color-primary)" strokeWidth={1} />
            </div>
            <h3>Déployez vos Capteurs</h3>
            <p>Ajoutez vos fermes et configurez vos modules IoT et caméras IA sur les zones de pâturage.</p>
          </div>
          <div className="step-arrow"><ChevronRight size={24} color="var(--color-primary)" /></div>
          <div className="step-item">
            <div className="step-circle">
              <div className="step-number">2</div>
              <Cpu size={48} color="var(--color-primary)" strokeWidth={1} />
            </div>
            <h3>Collecte Automatique</h3>
            <p>Laissez nos algorithmes collecter, analyser et traiter la télémétrie environnementale 24h/24.</p>
          </div>
          <div className="step-arrow"><ChevronRight size={24} color="var(--color-primary)" /></div>
          <div className="step-item">
            <div className="step-circle">
              <div className="step-number">3</div>
              <BarChart2 size={48} color="var(--color-primary)" strokeWidth={1} />
            </div>
            <h3>Pilotez et Anticipez</h3>
            <p>Exploitez nos tableaux de bord prédictifs et rapports IA pour optimiser vos rendements.</p>
          </div>
        </div>
      </section>

      {/* --- Pricing Section --- */}
      <section id="pricing" className="landing-pricing">
        <div className="section-pill">TARIFS</div>
        <h2 className="section-title">Tarification Simple et Transparente</h2>
        <p className="section-subtitle">Commencez gratuitement. Passez au niveau supérieur quand l'exploitation s'agrandit.</p>

        <div className="pricing-grid">

          {/* Free */}
          <div className="pricing-card">
            <h4>Initiation</h4>
            <div className="price">Gratuit<span className="month">//mois</span></div>
            <p className="price-desc">Pour les petites structures et la découverte</p>
            <ul className="price-features">
              <li><CheckSquare size={16} color="var(--color-primary)" /> Jusqu'à 50 animaux statiques</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> 1 utilisateur</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Tableaux de bord de base</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Historique 14 jours</li>
            </ul>
            <Link to="/register?plan=free" className="landing-btn-outline w-full">Créer un compte</Link>
          </div>

          {/* Pro */}
          <div className="pricing-card popular">
            <div className="popular-badge">⚡ Le plus populaire</div>
            <h4>Professionnel</h4>
            <div className="price">29€<span className="month">//mois</span></div>
            <p className="price-desc">Pour les agriculteurs modernes connectés</p>
            <ul className="price-features">
              <li><CheckSquare size={16} color="var(--color-primary)" /> Données en temps-réel illimitées</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Jusqu'à 5 équipes</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Analyse prédictive IA</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Exports avancés Excel/PDF</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Support prioritaire intégré</li>
            </ul>
            <button onClick={() => setPayModal(true)} className="landing-btn-primary w-full" style={{ border: 'none', cursor: 'pointer' }}>
              <Zap size={14} style={{ marginRight: 6 }} /> Essayer l'offre Pro
            </button>
          </div>

          {/* Enterprise */}
          <div className="pricing-card">
            <h4>Entreprise</h4>
            <div className="price">Sur mesure</div>
            <p className="price-desc">Pour les coopératives et larges domaines</p>
            <ul className="price-features">
              <li><CheckSquare size={16} color="var(--color-primary)" /> Modèles Computer Vision Custom</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Acteurs illimités</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Accès strict API & Webhooks</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Serveur local / Souveraineté</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Account Manager Dédié</li>
            </ul>
            <button onClick={() => setContactModal(true)} className="landing-btn-outline w-full" style={{ cursor: 'pointer' }}>
              <Building2 size={14} style={{ marginRight: 6 }} /> Contacter nos experts
            </button>
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="landing-cta">
        <div className="cta-container">
          <h2>Prêt à numériser votre agriculture ?</h2>
          <p>Rejoignez un réseau de spécialistes qui utilisent SMART FARM pour une gestion durable et optimisée.</p>
          <Link to="/register?plan=free" className="landing-btn-white large">
            Commencer l'Essai Gratuit <ChevronRight size={20} />
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
            <p>La plateforme souveraine d'intelligence agronomique pour moderniser vos parcelles au quotidien.</p>
            <div className="secure-badge">
              <Shield size={16} color="#fbbf24" /> Données 100% Chiffrées de bout-en-bout
            </div>
          </div>
          <div className="footer-col">
            <h4>PRODUIT</h4>
            <a href="#features">Moteur IA</a>
            <a href="#pricing">Tarification</a>
            <a href="#how-it-works">Télémétrie</a>
            <a href="#">Mises à jour</a>
          </div>
          <div className="footer-col">
            <h4>ENTREPRISE</h4>
            <a href="#">Notre Mission</a>
            <a href="#">Recherche & Développement</a>
            <a href="#">Carrières</a>
            <a href="#">Contact</a>
          </div>
          <div className="footer-col">
            <h4>LÉGAL</h4>
            <a href="#">Confidentialité</a>
            <a href="#">CGU</a>
            <a href="#">Souveraineté des Données</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 SMART FARM AI Enterprise. Tous droits réservés. Construit par <strong>InTech Solutions</strong>.</p>
          <div className="footer-langs">
            <a href="#">English</a>
            <a href="#" className="active">Français</a>
            <a href="#">العربية</a>
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
