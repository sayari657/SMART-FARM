import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Download, Bell, Camera, CheckSquare, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

function WorkerHome() {
  const { user } = useAuth();
  const { isOnline } = useNetworkSync();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled]     = useState(false);
  const [pushStatus, setPushStatus]       = useState(Notification.permission);
  const [pendingTasks, setPendingTasks]   = useState(null);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    api.get('/worker/tasks')
      .then(({ data }) => setPendingTasks(data.filter(t => t.status === 'pending').length))
      .catch(() => {});
  }, [isOnline]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setIsInstalled(true); setInstallPrompt(null); }
  };

  const requestNotifs = async () => {
    const p = await Notification.requestPermission();
    setPushStatus(p);
  };

  const QuickAction = ({ icon, label, color, gradient, to }) => (
    <button
      onClick={() => navigate(to)}
      style={{
        background:`linear-gradient(135deg, ${gradient})`,
        border:'none', borderRadius:20, padding:'20px 16px',
        cursor:'pointer', display:'flex', flexDirection:'column',
        alignItems:'flex-start', gap:12, width:'100%',
        boxShadow:`0 8px 20px ${color}30`, transition:'transform 0.15s',
        textAlign:'left'
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{
        width:44, height:44, borderRadius:14,
        background:'rgba(255,255,255,0.2)',
        display:'flex', alignItems:'center', justifyContent:'center'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color:'white', fontWeight:700, fontSize:15 }}>{label}</div>
      </div>
      <ChevronRight size={16} color="rgba(255,255,255,0.6)" style={{ alignSelf:'flex-end', marginTop:-8 }} />
    </button>
  );

  return (
    <div style={{ padding:'24px 20px', background:'#0f172a', minHeight:'100%' }}>
      
      {/* ── GREETING ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ color:'#64748b', fontSize:14, marginBottom:4 }}>
          {now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
        </div>
        <h1 style={{ color:'#f1f5f9', fontSize:26, fontWeight:800, margin:0, letterSpacing:'-0.5px' }}>
          {greeting}, {user?.full_name?.split(' ')[0] || 'Ouvrier'} 👋
        </h1>
        {user?.farm_id && (
          <div style={{
            marginTop:8, display:'inline-flex', alignItems:'center', gap:6,
            background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)',
            borderRadius:20, padding:'4px 12px', fontSize:12, color:'#4ade80', fontWeight:600
          }}>
            🌾 Ferme #{user.farm_id} · {isOnline ? 'En ligne' : 'Hors-ligne'}
          </div>
        )}
      </div>

      {/* ── ACTIONS RAPIDES ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ color:'#64748b', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:14 }}>
          Actions rapides
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <QuickAction
            to="/worker/scan"
            label="Scanner IA"
            color="#22c55e"
            gradient="#16a34a, #15803d"
            icon={<Camera size={22} color="white" />}
          />
          <QuickAction
            to="/worker/tasks"
            label={pendingTasks !== null ? `Mes Tâches (${pendingTasks})` : 'Mes Tâches'}
            color="#3b82f6"
            gradient="#2563eb, #1d4ed8"
            icon={<CheckSquare size={22} color="white" />}
          />
          <QuickAction
            to="/worker/report"
            label="Signaler"
            color="#f59e0b"
            gradient="#d97706, #b45309"
            icon={<AlertTriangle size={22} color="white" />}
          />
          <button
            style={{
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:20, padding:'20px 16px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'flex-start', gap:12,
              transition:'background 0.2s', textAlign:'left'
            }}
            onClick={requestNotifs}
          >
            <div style={{
              width:44, height:44, borderRadius:14,
              background: pushStatus === 'granted' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <Bell size={22} color={pushStatus === 'granted' ? '#22c55e' : '#94a3b8'} />
            </div>
            <div>
              <div style={{ color: pushStatus === 'granted' ? '#4ade80' : '#94a3b8', fontWeight:700, fontSize:14 }}>
                {pushStatus === 'granted' ? 'Alertes actives ✓' : 'Activer alertes'}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ── INSTALL PWA CARD ── */}
      {installPrompt && !isInstalled && (
        <div style={{
          background:'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(21,128,61,0.1))',
          border:'1px solid rgba(34,197,94,0.2)',
          borderRadius:20, padding:20,
          display:'flex', alignItems:'center', gap:16, marginBottom:20
        }}>
          <div style={{
            width:48, height:48, borderRadius:14, flexShrink:0,
            background:'rgba(34,197,94,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <Download size={22} color="#22c55e" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ color:'#f1f5f9', fontWeight:700, fontSize:15, marginBottom:3 }}>Installer l'app</div>
            <div style={{ color:'#64748b', fontSize:12 }}>Accès rapide · Fonctionne hors-ligne</div>
          </div>
          <button
            onClick={handleInstall}
            style={{
              background:'linear-gradient(135deg, #16a34a, #15803d)',
              border:'none', borderRadius:10, padding:'10px 16px',
              color:'white', fontWeight:700, fontSize:13, cursor:'pointer',
              flexShrink:0
            }}
          >
            Installer
          </button>
        </div>
      )}

      {/* ── STATUS CARD ── */}
      <div style={{
        background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
        borderRadius:20, padding:20
      }}>
        <div style={{ color:'#64748b', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:14 }}>
          Statut du système
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { label:'Connexion réseau', value: isOnline ? 'EN LIGNE' : 'HORS-LIGNE', ok: isOnline },
            { label:'Mode PWA', value: isInstalled ? 'Installée' : 'Navigateur', ok: isInstalled },
            { label:'Notifications', value: pushStatus === 'granted' ? 'Activées' : 'Désactivées', ok: pushStatus === 'granted' },
          ].map(({ label, value, ok }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'#94a3b8', fontSize:13 }}>{label}</span>
              <span style={{
                fontSize:11, fontWeight:700, letterSpacing:'0.5px', padding:'3px 10px',
                borderRadius:20,
                background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.1)',
                color: ok ? '#4ade80' : '#94a3b8'
              }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WorkerHome;
