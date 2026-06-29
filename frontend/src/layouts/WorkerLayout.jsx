import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, CheckSquare, Camera, AlertTriangle, LogOut, Wifi, WifiOff, CloudOff, RefreshCw, Settings, Warehouse, MessagesSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { usePWAVersion } from '../hooks/usePWAVersion';

function WorkerLayout() {
  const { user, logout } = useAuth();
  const { isOnline, syncing, pendingCount } = useNetworkSync();
  const { updateAvailable, newVersion, dismiss, applyUpdate } = usePWAVersion();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/worker-login');
  };

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      height:'100dvh',
      background:'#0f172a', color:'#f1f5f9',
      fontFamily:"'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      maxWidth:480, margin:'0 auto', position:'relative',
      overscrollBehavior:'none',
    }}>
      {/* ── PWA Update Banner ── */}
      {updateAvailable && (
        <div style={{ background: '#7c3aed', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>
            Mise à jour disponible : v{newVersion}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={applyUpdate} style={{ padding: '4px 12px', background: '#fff', color: '#7c3aed', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Mettre à jour
            </button>
            <button onClick={dismiss} style={{ padding: '4px 8px', background: 'transparent', color: '#ffffff99', border: 'none', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── TOP BAR — safe-area-inset-top for notch/island phones ── */}
      <header style={{
        background:'rgba(15,23,42,0.95)',
        backdropFilter:'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        /* Pad top to account for phone notch in standalone PWA */
        paddingTop:'calc(12px + env(safe-area-inset-top))',
        paddingBottom:'12px',
        paddingLeft:'20px',
        paddingRight:'20px',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        position:'sticky', top:0, zIndex:50,
        flexShrink: 0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:40, height:40, borderRadius:12,
            background:'linear-gradient(135deg, #16a34a, #15803d)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, boxShadow:'0 4px 12px rgba(22,163,74,0.3)'
          }}>🌿</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#f1f5f9' }}>
              {user?.full_name || 'Ouvrier'}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color: isOnline ? '#22c55e' : '#f59e0b' }}>
              {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
              <span>{isOnline ? 'En ligne' : 'Hors-ligne'}</span>
              {pendingCount > 0 && (
                <span style={{
                  marginLeft:4, background:'rgba(245,158,11,0.2)', color:'#f59e0b',
                  padding:'1px 6px', borderRadius:20, fontSize:10, display:'flex', alignItems:'center', gap:3
                }}>
                  {syncing ? <RefreshCw size={8} style={{ animation:'spin 1s linear infinite' }} /> : <CloudOff size={8} />}
                  {pendingCount} en attente
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button
            onClick={() => navigate('/worker/messages')}
            aria-label="Messagerie"
            style={{
              background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.25)',
              color:'#22c55e', borderRadius:10, width:36, height:36,
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.2s'
            }}
          >
            <MessagesSquare size={16} />
          </button>
          <button
            onClick={() => navigate('/worker/settings')}
            aria-label="Réglages"
            style={{
              background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
              color:'#cbd5e1', borderRadius:10, width:36, height:36,
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.2s'
            }}
          >
            <Settings size={16} />
          </button>
          <button
            onClick={handleLogout}
            style={{
              background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)',
              color:'#f87171', borderRadius:10, padding:'8px 12px',
              cursor:'pointer', fontSize:12, fontWeight:600,
              display:'flex', alignItems:'center', gap:5, transition:'all 0.2s'
            }}
          >
            <LogOut size={14} /> Quitter
          </button>
        </div>
      </header>

      {/* ── OFFLINE BANNER ── */}
      {!isOnline && (
        <div style={{
          background:'rgba(245,158,11,0.15)', borderBottom:'1px solid rgba(245,158,11,0.2)',
          padding:'8px 20px', textAlign:'center',
          color:'#fbbf24', fontSize:12, fontWeight:600
        }}>
          📡 Mode Hors-Ligne — Données sauvegardées localement
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{
        flex:1, overflowY:'auto',
        paddingBottom:'calc(80px + env(safe-area-inset-bottom))',
        WebkitOverflowScrolling:'touch',
      }}>
        <Outlet />
      </main>

      {/* ── BOTTOM NAV ── */}
      <nav style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:480,
        background:'rgba(15,23,42,0.95)',
        backdropFilter:'blur(20px)',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        display:'flex', justifyContent:'space-around', alignItems:'center',
        height:'calc(72px + env(safe-area-inset-bottom))',
        paddingBottom:'env(safe-area-inset-bottom)',
        zIndex:50,
        touchAction:'manipulation',
      }}>
        <NavItem to="/worker" icon={<Home size={22} />} label="Accueil" end />
        <NavItem to="/worker/tasks" icon={<CheckSquare size={22} />} label="Tâches" />

        {/* ── Floating Scan Button (Center) ── */}
        <NavLink to="/worker/scan" style={{ textDecoration:'none' }}>
          {({ isActive }) => (
            <div style={{ position:'relative', top:-18 }}>
              <div style={{
                width:64, height:64, borderRadius:'50%',
                background: isActive 
                  ? 'linear-gradient(135deg, #15803d, #14532d)' 
                  : 'linear-gradient(135deg, #16a34a, #15803d)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                boxShadow:`0 8px 24px rgba(22,163,74,${isActive ? 0.6 : 0.4})`,
                border:'3px solid rgba(22,163,74,0.3)',
                transition:'all 0.2s', cursor:'pointer'
              }}>
                <Camera size={26} color="white" />
              </div>
              <div style={{ textAlign:'center', fontSize:10, color:'#22c55e', fontWeight:600, marginTop:4 }}>Scanner</div>
            </div>
          )}
        </NavLink>

        <NavItem to="/worker/report" icon={<AlertTriangle size={22} />} label="Signaler" />
        <NavItem to="/worker/warehouse" icon={<Warehouse size={22} />} label="Entrepôt" />
      </nav>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function NavItem({ to, icon, label, end }) {
  return (
    <NavLink to={to} end={end} style={{ textDecoration:'none', touchAction:'manipulation' }}>
      {({ isActive }) => (
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:3,
          padding:'8px 12px', minWidth:60, minHeight:44,
          justifyContent:'center',
          color: isActive ? '#22c55e' : '#475569',
          transition:'color 0.2s'
        }}>
          {icon}
          <span style={{ fontSize:10, fontWeight:600 }}>{label}</span>
          {isActive && <div style={{ width:4, height:4, borderRadius:'50%', background:'#22c55e' }} />}
        </div>
      )}
    </NavLink>
  );
}

export default WorkerLayout;
