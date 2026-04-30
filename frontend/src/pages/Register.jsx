import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThreeBackground from '../components/ThreeBackground';
import ThreeFarmBackground from '../components/ThreeFarmBackground';

const ROLES = [
  { value: 'owner',  label: 'Propriétaire de ferme' },
  { value: 'worker', label: 'Ouvrier / Agent de terrain' },
];

const ROLE_DESC = {
  owner: 'Gestion complète : fermes, animaux, IoT, rapports IA, équipes, analyses — accessible depuis tout appareil (web, mobile, tablette).',
  worker: 'Opérations terrain : tâches assignées, signalements incidents, scan IA, rapports — optimisé mobile avec mode hors-ligne.',
};

export default function Register() {
  const [form, setForm] = useState({ username:'', email:'', phone_number:'+216', full_name:'', password:'', role:'owner' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await register(form);
    if (res.ok) { setSuccess(true); setTimeout(() => navigate('/login'), 2000); }
    else setError(res.error);
  };

  return (
    <div className="auth-page" style={{ background: 'transparent', position: 'relative' }}>
      <ThreeBackground />

      {/* ── Left panel ── */}
      <div className="auth-left" style={{ position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', justifyContent:'center', zIndex:1, padding:'40px' }}>
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

          <h2 style={{ color:'#fff' }}>Une plateforme,<br />tous vos appareils</h2>
          <p style={{ color:'#fff', opacity:.9, lineHeight:1.7 }}>
            Architecture enterprise multi-canal — chaque utilisateur accède à la plateforme depuis le web, le mobile ou la tablette selon son contexte de travail.
          </p>

          <div className="auth-features" style={{ marginTop:32 }}>
            {[
              'Accès web & mobile pour tous les rôles',
              'Propriétaire — supervision globale, IA, analytics',
              'Ouvrier — opérations terrain, PWA hors-ligne',
              'Base de données unifiée — synchronisation temps réel',
              'OTP WhatsApp — authentification sécurisée sans mot de passe',
            ].map(item => (
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
          <h1>Créer un compte</h1>
          <p>Renseignez vos informations pour rejoindre la plateforme</p>

          {success && (
            <div className="alert-banner success" style={{ marginBottom:16 }}>
              <div className="alert-banner-msg">✓ Compte créé avec succès ! Redirection vers la connexion...</div>
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
                <label className="form-label">Nom d'utilisateur *</label>
                <input className="form-input" id="reg-username" placeholder="ex: ahmed.farm" value={form.username} onChange={set('username')} required minLength={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Nom complet</label>
                <input className="form-input" id="reg-fullname" placeholder="Ahmed Ben Ali" value={form.full_name} onChange={set('full_name')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Numéro de téléphone *</label>
                <input className="form-input" id="reg-phone" type="tel" placeholder="+216 55 123 456" value={form.phone_number} onChange={set('phone_number')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" id="reg-email" type="email" placeholder="vous@exemple.com" value={form.email} onChange={set('email')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Mot de passe *</label>
                <input className="form-input" id="reg-password" type="password" placeholder="Min. 6 caractères" value={form.password} onChange={set('password')} required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Rôle</label>
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
                {form.role === 'owner' ? 'Propriétaire' : 'Ouvrier / Agent'}
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
              {loading ? 'Création en cours...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="auth-footer">
            Déjà inscrit ? <Link to="/login">Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
