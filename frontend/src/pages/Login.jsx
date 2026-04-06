import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThreeBackground from '../components/ThreeBackground';
import ThreeFarmBackground from '../components/ThreeFarmBackground';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(form.username, form.password);
    if (res.ok) navigate('/about-project');
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
          <h2 style={{ color:'#fff' }}>Intelligent Farm<br />Monitoring at Scale</h2>
          <p style={{ color:'#fff', opacity:.9 }}>Monitor bees, cows, poultry, sheep and goats with IoT telemetry, computer vision, and AI-powered anomaly detection.</p>
          <div className="auth-features">
            {['Real-time IoT telemetry monitoring','Computer vision event detection','AI anomaly & explainability engine','Multi-species alert management','Automated recommendations'].map(f => (
              <div className="auth-feature" key={f} style={{ color:'#fff' }}>
                <div className="auth-feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right" style={{ zIndex: 1 }}>
        <div className="auth-card" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
          <h1>Welcome back</h1>
          <p>Sign in to your Smart Farm AI account</p>

          <div style={{ display:'flex', gap:8, marginBottom:20 }}>
            {['admin','manager','vet'].map(r => (
              <button key={r} className="btn btn-secondary btn-sm" onClick={() => fillDemo(r)}>
                Demo {r}
              </button>
            ))}
          </div>

          {error && (
            <div className="alert-banner warning" style={{ marginBottom:16 }}>
              <div className="alert-banner-msg">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                id="login-username"
                placeholder="Enter your username"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position:'relative' }}>
                <input
                  className="form-input"
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  style={{ paddingRight:40 }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--color-text-3)', cursor:'pointer' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="btn btn-primary" id="login-submit" type="submit" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'11px 0', fontSize:14, marginTop:4 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
