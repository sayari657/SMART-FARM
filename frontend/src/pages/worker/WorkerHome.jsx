import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Download, Bell, Camera, CheckSquare, AlertTriangle, ChevronRight, Wifi, WifiOff } from 'lucide-react';
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
        background: `linear-gradient(135deg, ${gradient})`,
        border: 'none', borderRadius: 16, padding: '18px 16px',
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', gap: 10, width: '100%',
        boxShadow: `0 4px 16px ${color}30`, transition: 'transform 0.15s, box-shadow 0.15s',
        textAlign: 'left',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'rgba(255,255,255,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{label}</div>
      <ChevronRight size={14} color="rgba(255,255,255,0.55)" style={{ alignSelf: 'flex-end', marginTop: -4 }} />
    </button>
  );

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', paddingBottom: 20 }}>

      {/* ── Greeting banner ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '18px 18px 16px' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 3 }}>
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 style={{ color: '#0f172a', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
          {greeting}, {user?.full_name?.split(' ')[0] || 'Ouvrier'} 👋
        </h1>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          {user?.farm_id && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#dcfce7', border: '1px solid #bbf7d0',
              borderRadius: 99, padding: '3px 10px', fontSize: 12, color: '#15803d', fontWeight: 600,
            }}>
              🌾 Ferme #{user.farm_id}
            </div>
          )}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: isOnline ? '#dcfce7' : '#fef9c3',
            border: `1px solid ${isOnline ? '#bbf7d0' : '#fef08a'}`,
            borderRadius: 99, padding: '3px 10px', fontSize: 12,
            color: isOnline ? '#15803d' : '#854d0e', fontWeight: 600,
          }}>
            {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isOnline ? 'En ligne' : 'Hors-ligne'}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ── Quick actions ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 10 }}>
            Actions rapides
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickAction
              to="/worker/scan"
              label="Scanner IA"
              color="#16a34a"
              gradient="#16a34a, #15803d"
              icon={<Camera size={20} color="white" />}
            />
            <QuickAction
              to="/worker/tasks"
              label={pendingTasks !== null ? `Tâches (${pendingTasks})` : 'Mes Tâches'}
              color="#2563eb"
              gradient="#2563eb, #1d4ed8"
              icon={<CheckSquare size={20} color="white" />}
            />
            <QuickAction
              to="/worker/report"
              label="Signaler"
              color="#d97706"
              gradient="#d97706, #b45309"
              icon={<AlertTriangle size={20} color="white" />}
            />
            <button
              style={{
                background: '#fff', border: `1.5px solid ${pushStatus === 'granted' ? '#bbf7d0' : '#e2e8f0'}`,
                borderRadius: 16, padding: '18px 16px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 10, textAlign: 'left', transition: 'all 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,.06)',
              }}
              onClick={requestNotifs}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: pushStatus === 'granted' ? '#dcfce7' : '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bell size={20} color={pushStatus === 'granted' ? '#16a34a' : '#94a3b8'} />
              </div>
              <div style={{ color: pushStatus === 'granted' ? '#15803d' : '#64748b', fontWeight: 700, fontSize: 14 }}>
                {pushStatus === 'granted' ? 'Alertes actives ✓' : 'Activer alertes'}
              </div>
            </button>
          </div>
        </div>

        {/* ── Install PWA ── */}
        {installPrompt && !isInstalled && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Download size={20} color="#16a34a" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#15803d', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Installer l'app</div>
              <div style={{ color: '#86efac', fontSize: 12 }}>Accès rapide · Fonctionne hors-ligne</div>
            </div>
            <button
              onClick={handleInstall}
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                border: 'none', borderRadius: 10, padding: '9px 14px',
                color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
              }}
            >
              Installer
            </button>
          </div>
        )}

        {/* ── System status ── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 12 }}>
            Statut du système
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Connexion réseau', value: isOnline ? 'EN LIGNE' : 'HORS-LIGNE', ok: isOnline },
              { label: 'Mode PWA',         value: isInstalled ? 'Installée' : 'Navigateur',          ok: isInstalled },
              { label: 'Notifications',    value: pushStatus === 'granted' ? 'Activées' : 'Désactivées', ok: pushStatus === 'granted' },
            ].map(({ label, value, ok }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#475569', fontSize: 13 }}>{label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '.03em', padding: '3px 10px', borderRadius: 99,
                  background: ok ? '#dcfce7' : '#f1f5f9',
                  color:      ok ? '#15803d' : '#94a3b8',
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default WorkerHome;
