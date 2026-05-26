import React from 'react';
import { Bell, RefreshCw, Languages, Menu, ChevronRight, ChevronDown, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ title, subtitle, actions }) {
  const { t, i18n } = useTranslation();
  const { toggle } = useSidebar();
  const { user } = useAuth() || {};
  const { dark, toggleTheme } = useTheme();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    const dir = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir  = dir;
    document.documentElement.lang = lng;
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.username || 'U').slice(0, 2).toUpperCase();

  const displayName = user?.full_name || user?.username || '';

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn btn-secondary btn-sm menu-toggle"
          onClick={toggle}
          title="Menu"
          aria-label="Toggle navigation"
        >
          <Menu size={16} />
        </button>
        <div>
          <h1 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-text)', margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            {title || t('navbar.title')}
          </h1>
          <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <span style={{ fontWeight: 600 }}>SmartFarm AI</span>
            <ChevronRight size={10} style={{ color: '#9ca3af' }} />
            <span style={{ color: '#374151', fontWeight: 600 }}>{subtitle || title || t('navbar.title')}</span>
          </div>
        </div>
      </div>

      <div className="navbar-right">
        {actions}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Languages size={14} color="var(--color-primary)" />
          <select
            onChange={(e) => changeLanguage(e.target.value)}
            defaultValue={i18n.language}
            className="form-select"
            style={{ padding: '4px 8px', fontSize: 12, height: 30, width: 96, borderRadius: 'var(--r-sm, 6px)' }}
          >
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={toggleTheme}
          title={dark ? 'Mode clair' : 'Mode sombre'}
          style={{ position: 'relative' }}
        >
          {dark ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()} title="Refresh">
          <RefreshCw size={11} />
        </button>
        <button className="btn btn-secondary btn-sm" title="Notifications">
          <Bell size={11} />
        </button>

        {/* User avatar chip */}
        {displayName && (
          <div className="navbar-user-chip" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 6px',
            background: 'var(--color-surface-2)', borderRadius: 'var(--r-full, 9999px)',
            border: '1px solid var(--color-border)', cursor: 'pointer', userSelect: 'none'
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0
            }}>
              {initials}
            </div>
            <span style={{ fontSize: 'var(--text-sm, 12px)', fontWeight: 500, color: 'var(--color-text-2)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            <ChevronDown size={12} color="var(--color-text-3)" />
          </div>
        )}
      </div>
    </header>
  );
}
