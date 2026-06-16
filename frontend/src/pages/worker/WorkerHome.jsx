import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Download, Bell, Camera, CheckSquare, AlertTriangle, ChevronRight, Wifi, WifiOff, BookOpen } from 'lucide-react';
import { useNetworkSync } from '../../hooks/useNetworkSync';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { WorkerPage, SectionLabel, Card } from './workerUI';

function WorkerHome() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { isOnline } = useNetworkSync();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled]     = useState(false);
  const [pushStatus, setPushStatus]       = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [pendingTasks, setPendingTasks]   = useState(null);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12
    ? t('worker.home.greeting_morning')
    : hour < 18
      ? t('worker.home.greeting_afternoon')
      : t('worker.home.greeting_evening');

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    api.get('/worker-tasks')
      .then(({ data }) => setPendingTasks((Array.isArray(data) ? data : []).filter(t => t.status === 'pending').length))
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

  const press   = e => e.currentTarget.style.transform = 'scale(0.97)';
  const release = e => e.currentTarget.style.transform = 'scale(1)';

  const QuickAction = ({ icon, label, color, gradient, to }) => (
    <button
      onClick={() => navigate(to)}
      style={{
        background: `linear-gradient(135deg, ${gradient})`,
        border: 'none', borderRadius: 16, padding: '18px 16px',
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', gap: 10, width: '100%', minHeight: 96,
        boxShadow: `0 4px 16px ${color}30`, transition: 'transform 0.15s, box-shadow 0.15s',
        textAlign: 'left', touchAction: 'manipulation',
      }}
      onMouseDown={press} onMouseUp={release} onMouseLeave={release}
      onTouchStart={press} onTouchEnd={release}
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

  const systemRows = [
    { label: t('worker.home.network'),        value: isOnline  ? t('worker.home.online_badge')  : t('worker.home.offline_badge'), ok: isOnline },
    { label: t('worker.home.pwa_mode'),       value: isInstalled ? t('worker.home.installed')    : t('worker.home.browser'),      ok: isInstalled },
    { label: t('worker.home.notifications'),  value: pushStatus === 'granted' ? t('worker.home.enabled') : t('worker.home.disabled'), ok: pushStatus === 'granted' },
  ];

  return (
    <WorkerPage style={{ paddingBottom: 20 }}>

      {/* ── Greeting banner ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '18px 18px 16px' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 3 }}>
          {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 style={{ color: '#0f172a', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
          {greeting}, {user?.full_name?.split(' ')[0] || t('worker.home.worker_default')} 👋
        </h1>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          {user?.farm_id && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#dcfce7', border: '1px solid #bbf7d0',
              borderRadius: 99, padding: '3px 10px', fontSize: 12, color: '#15803d', fontWeight: 600,
            }}>
              🌾 {t('worker.home.farm_label')}{user.farm_id}
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
            {isOnline ? t('worker.home.online') : t('worker.home.offline')}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ── Quick actions ── */}
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>{t('worker.home.quick_actions')}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QuickAction
              to="/worker/scan"
              label={t('worker.home.scan_ai')}
              color="#16a34a"
              gradient="#16a34a, #15803d"
              icon={<Camera size={20} color="white" />}
            />
            <QuickAction
              to="/worker/tasks"
              label={pendingTasks !== null
                ? t('worker.home.tasks_count', { count: pendingTasks })
                : t('worker.home.tasks')}
              color="#2563eb"
              gradient="#2563eb, #1d4ed8"
              icon={<CheckSquare size={20} color="white" />}
            />
            <QuickAction
              to="/worker/report"
              label={t('worker.home.report')}
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
                {pushStatus === 'granted' ? t('worker.home.alerts_active') : t('worker.home.enable_alerts')}
              </div>
            </button>
          </div>
        </div>

        {/* ── Resources ── */}
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>{t('worker.home.resources')}</SectionLabel>
          <button
            onClick={() => navigate('/worker/instructions')}
            style={{
              width: '100%', background: 'linear-gradient(135deg, #0891b2, #0369a1)',
              border: 'none', borderRadius: 14, padding: '16px 18px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '0 4px 16px #0891b230', transition: 'transform 0.15s',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={20} color="white" />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>{t('worker.home.protocols_title')}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>{t('worker.home.protocols_sub')}</div>
            </div>
            <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
          </button>
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
              <div style={{ color: '#15803d', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{t('worker.home.install_app')}</div>
              <div style={{ color: '#86efac', fontSize: 12 }}>{t('worker.home.install_sub')}</div>
            </div>
            <button
              onClick={handleInstall}
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                border: 'none', borderRadius: 10, padding: '9px 14px',
                color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {t('worker.home.install_btn')}
            </button>
          </div>
        )}

        {/* ── System status ── */}
        <Card style={{ padding: '14px 16px' }}>
          <SectionLabel style={{ marginBottom: 12 }}>{t('worker.home.system_status')}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {systemRows.map(({ label, value, ok }) => (
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
        </Card>

      </div>
    </WorkerPage>
  );
}

export default WorkerHome;
