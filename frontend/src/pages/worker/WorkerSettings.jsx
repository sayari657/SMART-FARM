import React from 'react';
import { RefreshCw, Database, Info, LogOut, ChevronRight, Bell, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import { useNavigate } from 'react-router-dom';

function WorkerSettings() {
  const { user, logout } = useAuth();
  const { isOnline, syncing, pendingCount, syncData } = useNetworkSync();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/worker-login');
  };

  const SettingRow = ({ icon, label, sublabel, onClick, rightElement, color = '#64748b' }) => (
    <div 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '16px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20, marginBottom: 12, cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: color
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 15 }}>{label}</div>
        {sublabel && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{sublabel}</div>}
      </div>
      {rightElement || (onClick && <ChevronRight size={18} color="#1e293b" />)}
    </div>
  );

  return (
    <div style={{ padding: '24px 20px', background: '#0f172a', minHeight: '100%' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
          Paramètres
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          Gestion de l'application et synchronisation
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>
          Synchronisation
        </div>
        
        <SettingRow 
          icon={<RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />}
          label="Forcer la synchronisation"
          sublabel={pendingCount > 0 ? `${pendingCount} éléments en attente` : "Tout est à jour"}
          color={pendingCount > 0 ? '#f59e0b' : '#22c55e'}
          onClick={pendingCount > 0 ? syncData : null}
          rightElement={syncing && <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>En cours...</span>}
        />

        <SettingRow 
          icon={<Database size={20} />}
          label="Base de données locale"
          sublabel="Dexie IndexedDB active"
          color="#3b82f6"
        />
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>
          Système & Sécurité
        </div>

        <SettingRow 
          icon={<Bell size={20} />}
          label="Notifications"
          sublabel={Notification.permission === 'granted' ? "Autorisées" : "Désactivées"}
          color="#ec4899"
        />

        <SettingRow 
          icon={<ShieldCheck size={20} />}
          label="Sécurité"
          sublabel="Authentification par OTP WhatsApp"
          color="#10b981"
        />

        <SettingRow 
          icon={<Smartphone size={20} />}
          label="Version de l'App"
          sublabel="v2.0.0 (Enterprise PWA)"
          color="#8b5cf6"
        />
      </div>

      <button
        onClick={handleLogout}
        style={{
          width: '100%', padding: '16px', borderRadius: 16,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#f87171', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginTop: 20
        }}
      >
        <LogOut size={20} /> Se déconnecter de la ferme
      </button>

      <div style={{ textAlign: 'center', marginTop: 40, color: '#1e293b', fontSize: 11 }}>
        &copy; 2026 Smart Farm AI — Tunisian Sovereign Intelligence
      </div>
    </div>
  );
}

export default WorkerSettings;
