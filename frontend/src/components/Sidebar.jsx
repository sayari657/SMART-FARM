import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Building2, PawPrint, Eye,
  AlertTriangle, FileText, Settings, LogOut, Leaf,
  Layers, Bot, TreePine, Map, X, ChevronLeft, ChevronRight,
  Warehouse, Cpu, Sun, Moon, Languages,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  {
    section: 'Overview', items: [
      { to: '/about-project', icon: Layers,         labelKey: 'sidebar.project_about' },
      { to: '/dashboard',    icon: LayoutDashboard,  labelKey: 'sidebar.dashboard' },
      { to: '/farms',        icon: Building2,        labelKey: 'sidebar.farms' },
      { to: '/animals',      icon: PawPrint,         labelKey: 'sidebar.animals' },
      { to: '/aboutbee',     emoji: '🐝',            labelKey: 'sidebar.bee',    color: '#d97706' },
      { to: '/trees',        icon: TreePine,         labelKey: 'sidebar.trees' },
      { to: '/map',          icon: Map,              labelKey: 'sidebar.map_center' },
      { to: '/entrepot',    icon: Warehouse,        labelKey: 'sidebar.entrepot' },
      { to: '/iot-devices', icon: Cpu,              labelKey: 'sidebar.iot_devices' },
    ]
  },
  {
    section: 'Monitoring', items: [
      { to: '/cv',        icon: Eye,            labelKey: 'sidebar.cv_monitoring' },
      { to: '/alerts',    icon: AlertTriangle,  labelKey: 'sidebar.alerts' },
    ]
  },
  {
    section: 'Intelligence', items: [
      { to: '/assistant', icon: Bot,      labelKey: 'sidebar.assistant' },
      { to: '/reports',   icon: FileText, labelKey: 'sidebar.reports'   },
    ]
  },
  {
    section: 'System', items: [
      { to: '/settings', icon: Settings, labelKey: 'sidebar.settings' },
    ]
  },
];


export default function Sidebar() {
  const { user, logout } = useAuth() || {};
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { close } = useSidebar();
  const { dark, toggleTheme } = useTheme();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir  = lng === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  };

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width', collapsed ? '68px' : '240px'
    );
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
    document.documentElement.style.setProperty(
      '--sidebar-width', next ? '68px' : '240px'
    );
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.username || 'U').slice(0, 2).toUpperCase();

  const handleNavClick = () => close();

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Leaf size={18} />
        </div>
        {!collapsed && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="sidebar-logo-text">Smart Farm AI</div>
            <div className="sidebar-logo-sub">{t('sidebar.enterprise_platform')}</div>
          </div>
        )}
        {/* Mobile close button */}
        <button
          className="sidebar-close-btn"
          onClick={close}
          aria-label="Close menu"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 4, borderRadius: 6 }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map(({ section, items }) => (
          <div className="sidebar-section" key={section}>
            {!collapsed && (
              <div className="sidebar-section-label">
                {t(`sidebar.${section.toLowerCase()}`, section)}
              </div>
            )}
            {items.map(({ to, icon: Icon, emoji, labelKey, color }) => (
              <NavLink
                key={to}
                to={to}
                onClick={handleNavClick}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                title={collapsed ? t(labelKey) : undefined}
                style={({ isActive }) => color && isActive ? { borderInlineStart: `3px solid ${color}`, paddingInlineStart: collapsed ? undefined : 13 } : {}}
              >
                {emoji
                  ? <span style={{ fontSize: collapsed ? 18 : 15, flexShrink: 0, lineHeight: 1 }}>{emoji}</span>
                  : <Icon size={16} style={{ flexShrink: 0 }} />
                }
                {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(labelKey)}</span>}
              </NavLink>
            ))}
          </div>
        ))}

      </div>

      {/* Collapse toggle — desktop only */}
      <button className="sidebar-collapse-btn menu-toggle-desktop" onClick={toggleCollapse} title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}>
        {collapsed ? <ChevronRight size={16} /> : (
          <>
            <ChevronLeft size={16} />
            <span style={{ fontSize: 11 }}>{t('sidebar.collapse')}</span>
          </>
        )}
      </button>

      {/* Mobile-only: language + theme controls ─────────────── */}
      <div className="sidebar-mobile-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--color-border)' }}>
          <Languages size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
          <select
            onChange={e => changeLanguage(e.target.value)}
            value={i18n.language}
            style={{
              flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600,
            }}
          >
            <option value="fr">🇫🇷 Français</option>
            <option value="ar">🇹🇳 العربية</option>
            <option value="en">🇬🇧 English</option>
          </select>
          <button
            onClick={toggleTheme}
            title={dark ? t('navbar.light_mode') : t('navbar.dark_mode')}
            style={{
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              color: 'var(--color-text)', display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>

      {/* User footer */}
      <div className="sidebar-footer">
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="sidebar-avatar" title={user?.full_name || user?.username}>{initials}</div>
            <button onClick={handleLogout} title="Logout"
              style={{ background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name || user?.username}
              </div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <button onClick={handleLogout} title="Logout"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer', flexShrink: 0 }}>
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
