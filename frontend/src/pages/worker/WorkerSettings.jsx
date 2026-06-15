import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Database, Bell, ShieldCheck, Smartphone, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from './workerUI';

const LANGS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية',  flag: '🇹🇳' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
];

function WorkerSettings() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { isOnline, syncing, pendingCount, syncData } = useNetworkSync();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/worker-login'); };

  const SettingRow = ({ icon, label, sublabel, onClick, rightElement, color = '#64748b' }) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px',
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 12, marginBottom: 8,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background .15s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = '#f8fafc'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#0f172a', fontWeight: 600, fontSize: 14 }}>{label}</div>
        {sublabel && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{sublabel}</div>}
      </div>
      {rightElement || (onClick && <ChevronRight size={16} color="#cbd5e1" />)}
    </div>
  );

  const notifGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', paddingBottom: 32 }}>

      <PageHeader title={t('worker.settings.title')} subtitle={t('worker.settings.subtitle')} icon="⚙️" />

      <div style={{ margin: '14px 14px 0' }}>
        {/* User card */}
        <div style={{
          background: 'linear-gradient(135deg, #16a34a, #15803d)',
          borderRadius: 14, padding: '16px',
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
          boxShadow: '0 4px 16px rgba(22,163,74,.25)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: 'white',
          }}>
            {(user?.full_name || user?.username || 'O')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>
              {user?.full_name || user?.username || t('worker.home.worker_default')}
            </div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginTop: 1 }}>
              {user?.role || 'worker'} {user?.farm_id ? `· ${t('worker.home.farm_label')}${user.farm_id}` : ''}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{
              background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)',
              borderRadius: 99, padding: '3px 10px', fontSize: 11, color: 'white', fontWeight: 600,
            }}>
              {isOnline ? t('worker.settings.online') : t('worker.settings.offline')}
            </div>
          </div>
        </div>

        {/* Language section */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 8 }}>
          {t('worker.settings.language_section', 'Langue')}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {LANGS.map(l => {
            const active = (i18n.language || 'fr').startsWith(l.code);
            return (
              <button key={l.code}
                onClick={() => { i18n.changeLanguage(l.code); try { localStorage.setItem('i18nextLng', l.code); } catch {} }}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                  background: active ? '#16a34a' : '#fff',
                  border: `1.5px solid ${active ? '#16a34a' : '#e2e8f0'}`,
                  color: active ? '#fff' : '#475569', fontWeight: 700, fontSize: 13,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  boxShadow: active ? '0 4px 12px rgba(22,163,74,.25)' : 'none', transition: 'all .15s',
                }}>
                <span style={{ fontSize: 20 }}>{l.flag}</span>
                {l.label}
              </button>
            );
          })}
        </div>

        {/* Sync section */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: 8 }}>
          {t('worker.settings.sync_section')}
        </div>

        <SettingRow
          icon={<RefreshCw size={18} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />}
          label={t('worker.settings.force_sync')}
          sublabel={pendingCount > 0
            ? `${pendingCount} ${t('worker.settings.pending')}`
            : t('worker.settings.all_synced')}
          color={pendingCount > 0 ? '#d97706' : '#16a34a'}
          onClick={pendingCount > 0 ? syncData : null}
          rightElement={syncing
            ? <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>{t('worker.settings.in_progress')}</span>
            : pendingCount > 0
              ? <span style={{
                  fontSize: 11, fontWeight: 700, background: '#fef9c3', color: '#854d0e',
                  border: '1px solid #fef08a', borderRadius: 99, padding: '2px 8px',
                }}>
                  {pendingCount}
                </span>
              : <span style={{
                  fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d',
                  border: '1px solid #bbf7d0', borderRadius: 99, padding: '2px 8px',
                }}>
                  ✓ Sync
                </span>
          }
        />

        <SettingRow
          icon={<Database size={18} />}
          label={t('worker.settings.local_db')}
          sublabel={t('worker.settings.local_db_sub')}
          color="#3b82f6"
        />

        {/* Security section */}
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', margin: '16px 0 8px' }}>
          {t('worker.settings.security_section')}
        </div>

        <SettingRow
          icon={<Bell size={18} />}
          label={t('worker.settings.notifications')}
          sublabel={notifGranted ? t('worker.settings.notif_on') : t('worker.settings.notif_off')}
          color="#ec4899"
          rightElement={
            <span style={{
              fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 8px',
              background: notifGranted ? '#dcfce7' : '#f1f5f9',
              color: notifGranted ? '#15803d' : '#94a3b8',
              border: `1px solid ${notifGranted ? '#bbf7d0' : '#e2e8f0'}`,
            }}>
              {notifGranted ? 'ON' : 'OFF'}
            </span>
          }
        />

        <SettingRow
          icon={<ShieldCheck size={18} />}
          label={t('worker.settings.security')}
          sublabel={t('worker.settings.security_sub')}
          color="#10b981"
        />

        <SettingRow
          icon={<Smartphone size={18} />}
          label={t('worker.settings.app_version')}
          sublabel="v2.0.0 (Enterprise PWA)"
          color="#8b5cf6"
        />

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', marginTop: 12, padding: '14px', borderRadius: 12,
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#b91c1c', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
        >
          <LogOut size={17} /> {t('worker.settings.logout')}
        </button>

        <div style={{ textAlign: 'center', marginTop: 28, color: '#cbd5e1', fontSize: 11 }}>
          {t('worker.settings.footer')}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default WorkerSettings;
