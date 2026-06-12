import { useState, useEffect } from 'react';
import { Menu, ChevronRight, Sun, Moon, Globe, Wifi, WifiOff, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import FarmSelector from './FarmSelector';
import NotificationBell from './NotificationBell';

const ROLE_CFG = {
  owner:      { labelKey: 'navbar.owner', color: '#d97706', bg: 'rgba(217,119,6,.12)'  },
  worker:     { labelKey: 'navbar.worker',      color: '#059669', bg: 'rgba(5,150,105,.12)'  },
  superadmin: { labelKey: 'navbar.superadmin',  color: '#7c3aed', bg: 'rgba(124,58,237,.12)' },
};

/* ── Live clock ─────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })), 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <Clock size={11} style={{ color: 'var(--color-text-3)', flexShrink: 0 }}/>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
        {time}
      </span>
    </div>
  );
}

/* ── Online status dot ──────────────────────────────────── */
function OnlineDot() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <div title={online ? t('navbar.online') : t('navbar.offline')}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
        borderRadius: 99, background: online ? 'rgba(5,150,105,.10)' : 'rgba(239,68,68,.10)',
        border: `1px solid ${online ? 'rgba(5,150,105,.25)' : 'rgba(239,68,68,.25)'}` }}>
      {online
        ? <Wifi    size={11} color="#059669"/>
        : <WifiOff size={11} color="#ef4444"/>}
      <span style={{ fontSize: 10, fontWeight: 800,
        color: online ? '#059669' : '#ef4444' }}>
        {online ? t('navbar.online') : t('navbar.offline')}
      </span>
    </div>
  );
}

/* ══════════════ MAIN ══════════════════════════════════════ */
export default function Navbar({ title, subtitle, actions }) {
  const { t, i18n }        = useTranslation();
  const { toggle }         = useSidebar();
  const { user }           = useAuth() || {};
  const { dark, toggleTheme } = useTheme();
  const isOwner = user?.role === 'owner';

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir  = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.username || 'U').slice(0, 2).toUpperCase();

  const displayName = user?.full_name || user?.username || '';
  const roleCfg = ROLE_CFG[user?.role] || ROLE_CFG.worker;

  return (
    <header className="navbar" style={{ position: 'relative', zIndex: 100 }}>

      {/* Subtle glass accent line at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, var(--color-primary), transparent)',
        opacity: 0.25, pointerEvents: 'none',
      }}/>

      {/* ── Left: hamburger + breadcrumb ─────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>

        {/* Hamburger */}
        <button
          className="btn btn-secondary btn-sm menu-toggle"
          onClick={toggle}
          aria-label="Menu"
          style={{ flexShrink: 0, position: 'relative' }}
        >
          <Menu size={16}/>
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: 'var(--color-border)', flexShrink: 0, opacity: .7 }}/>

        {/* Breadcrumb block */}
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Row 1: App name + page */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap', overflow: 'hidden' }}>
            <span style={{
              fontSize: 10, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase',
              color: 'var(--color-primary)', flexShrink: 0,
            }}>
              SmartFarm AI
            </span>
            <ChevronRight size={11} style={{ color: 'var(--color-text-3)', flexShrink: 0 }}/>
            <h1 className="navbar-title" style={{
              fontSize: 15, fontWeight: 800, color: 'var(--color-text)',
              margin: 0, lineHeight: 1, letterSpacing: '-0.02em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {title || t('navbar.title')}
            </h1>
          </div>

          {/* Row 2: subtitle + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            {subtitle && (
              <span style={{
                fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: controls ──────────────────────────────── */}
      <div className="navbar-right" style={{ gap: 6 }}>

        {/* Live clock — hidden on mobile */}
        <div className="navbar-hide-mobile">
          <LiveClock/>
        </div>

        {/* Online indicator — hidden on mobile */}
        <div className="navbar-hide-mobile">
          <OnlineDot/>
        </div>

        {/* Divider */}
        <div className="navbar-hide-mobile" style={{ width: 1, height: 22, background: 'var(--color-border)', opacity: .7 }}/>

        {/* FarmSelector — owners only */}
        {isOwner && (
          <div className="navbar-hide-mobile">
            <FarmSelector/>
          </div>
        )}

        {/* Page actions */}
        {actions && <div className="navbar-hide-mobile">{actions}</div>}

        {/* Divider */}
        {actions && <div className="navbar-hide-mobile" style={{ width: 1, height: 22, background: 'var(--color-border)', opacity: .7 }}/>}

        {/* Language — icon buttons on desktop, hidden on mobile */}
        <div className="navbar-hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Globe size={12} color="var(--color-text-3)"/>
          {[
            { code: 'fr', flag: '🇫🇷', label: 'FR' },
            { code: 'ar', flag: '🇹🇳', label: 'AR' },
            { code: 'en', flag: '🇬🇧', label: 'EN' },
          ].map(lng => (
            <button key={lng.code}
              onClick={() => changeLanguage(lng.code)}
              title={lng.label}
              style={{
                height: 26, padding: '0 7px', borderRadius: 6, cursor: 'pointer',
                background: i18n.language === lng.code
                  ? 'var(--color-primary-subtle, rgba(16,185,129,.12))'
                  : 'transparent',
                border: i18n.language === lng.code
                  ? '1px solid var(--color-primary)'
                  : '1px solid transparent',
                fontSize: 10, fontWeight: 800,
                color: i18n.language === lng.code ? 'var(--color-primary)' : 'var(--color-text-3)',
                transition: 'all .15s',
              }}>
              {lng.flag} {lng.label}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          className="btn btn-secondary btn-sm navbar-hide-mobile"
          onClick={toggleTheme}
          title={dark ? t('navbar.light_mode') : t('navbar.dark_mode')}
          style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {dark ? <Sun size={14}/> : <Moon size={14}/>}
        </button>

        {/* Notifications */}
        <NotificationBell/>

        {/* Divider */}
        <div className="navbar-hide-mobile" style={{ width: 1, height: 22, background: 'var(--color-border)', opacity: .7 }}/>

        {/* User chip — desktop */}
        {displayName && (
          <div className="navbar-user-chip navbar-hide-mobile" style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '4px 12px 4px 4px',
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--r-full, 9999px)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer', userSelect: 'none',
            transition: 'border-color .15s, box-shadow .15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            {/* Avatar with gradient */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, var(--color-primary), #065F46)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 800,
              boxShadow: '0 0 8px rgba(16,185,129,.3)',
            }}>
              {initials}
            </div>

            {/* Name + role */}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--color-text)',
                maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}>
                {displayName}
              </div>
              {user?.role && (
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.5px',
                  textTransform: 'uppercase', color: roleCfg.color, lineHeight: 1,
                  marginTop: 2,
                }}>
                  {t(roleCfg.labelKey)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile: avatar only */}
        {displayName && (
          <div className="navbar-avatar-mobile" style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
            background: `linear-gradient(135deg, var(--color-primary), #065F46)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 800,
            boxShadow: '0 0 8px rgba(16,185,129,.25)',
          }}>
            {initials}
          </div>
        )}
      </div>
    </header>
  );
}
