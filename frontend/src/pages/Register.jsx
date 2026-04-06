import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThreeBackground from '../components/ThreeBackground';
import ThreeFarmBackground from '../components/ThreeFarmBackground';

const ROLES = ['admin','farm_manager','vet','operator'];

export default function Register() {
  const [form, setForm] = useState({ username:'', email:'', full_name:'', password:'', role:'operator' });
  const [error, setError] = useState('');
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
          <h2 style={{ color:'#fff' }}>Join the Smart<br />Farm Network</h2>
          <p style={{ color:'#fff', opacity:.9 }}>Create your account and start monitoring your farm operations with AI-powered intelligence.</p>
          <div className="auth-features" style={{ marginTop:32 }}>
            {['Admin — full system access','Farm Manager — farm operations','Vet — animal health focus','Operator — basic monitoring'].map(r => (
              <div className="auth-feature" key={r} style={{ color:'#fff' }}>
                <div className="auth-feature-dot" />
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h1>Create Account</h1>
          <p>Fill in your details to get started</p>

          {success && <div className="alert-banner success" style={{ marginBottom:16 }}><div className="alert-banner-msg">✓ Account created! Redirecting to login...</div></div>}
          {error   && <div className="alert-banner warning" style={{ marginBottom:16 }}><div className="alert-banner-msg">{error}</div></div>}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input className="form-input" id="reg-username" placeholder="username" value={form.username} onChange={set('username')} required minLength={3} />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" id="reg-fullname" placeholder="John Doe" value={form.full_name} onChange={set('full_name')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" id="reg-email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" id="reg-password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" id="reg-role" value={form.role} onChange={set('role')}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" id="reg-submit" type="submit" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'11px 0', fontSize:14, marginTop:6 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
        </div>
      </div>
    </div>
  );
}
