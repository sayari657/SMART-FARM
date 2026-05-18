import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Building2, PawPrint, Activity, Eye,
  AlertTriangle, Lightbulb, FileText, Settings, LogOut, Leaf,
  Layers, Bot, TreePine, Map, X, ChevronLeft, ChevronRight,
  ChevronDown, Warehouse,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const NAV = [
  {
    section: 'Overview', items: [
      { to: '/about-project', icon: Layers,         labelKey: 'sidebar.project_about' },
      { to: '/dashboard',    icon: LayoutDashboard,  labelKey: 'sidebar.dashboard' },
      { to: '/farms',        icon: Building2,        labelKey: 'sidebar.farms' },
      { to: '/animals',      icon: PawPrint,         labelKey: 'sidebar.animals' },
      { to: '/trees',        icon: TreePine,         labelKey: 'sidebar.trees' },
      { to: '/map',          icon: Map,              labelKey: 'sidebar.map_center' },
      { to: '/entrepot',    icon: Warehouse,        labelKey: 'sidebar.entrepot' },
    ]
  },
  {
    section: 'Monitoring', items: [
      { to: '/telemetry', icon: Activity,       labelKey: 'sidebar.telemetry' },
      { to: '/cv',        icon: Eye,            labelKey: 'sidebar.cv_monitoring' },
      { to: '/alerts',    icon: AlertTriangle,  labelKey: 'sidebar.alerts' },
    ]
  },
  {
    section: 'Intelligence', items: [
      { to: '/assistant',       icon: Bot,       labelKey: 'sidebar.assistant' },
      { to: '/recommendations', icon: Lightbulb, labelKey: 'sidebar.recommendations' },
      { to: '/reports',         icon: FileText,  labelKey: 'sidebar.reports' },
    ]
  },
  {
    section: 'System', items: [
      { to: '/settings', icon: Settings, labelKey: 'sidebar.settings' },
    ]
  },
];

const SPECIES_NAV = [
  { to: '/aboutpoultry', emoji: '🐔', label: 'Volailles',    color: '#0891b2' },
  { to: '/aboutcow',     emoji: '🐄', label: 'Bovins',       color: '#1d4ed8' },
  { to: '/aboutsheep',   emoji: '🐑', label: 'Ovins',        color: '#7c3aed' },
  { to: '/aboutgoat',    emoji: '🐐', label: 'Caprins',      color: '#dc2626' },
  { to: '/aboutrabbit',  emoji: '🐰', label: 'Cuniculture',  color: '#0d9488' },
];

export default function Sidebar() {
  const { user, logout } = useAuth() || {};
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { close } = useSidebar();

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );
  const [speciesOpen, setSpeciesOpen] = useState(
    () => localStorage.getItem('sidebar-species-open') !== 'false'
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
            <div className="sidebar-logo-sub">Enterprise Platform</div>
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
            {items.map(({ to, icon: Icon, labelKey }) => (
              <NavLink
                key={to}
                to={to}
                onClick={handleNavClick}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                title={collapsed ? t(labelKey) : undefined}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(labelKey)}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Élevage — species quick links */}
        <div className="sidebar-section">
          {!collapsed ? (
            <button
              onClick={() => { const next = !speciesOpen; setSpeciesOpen(next); localStorage.setItem('sidebar-species-open', String(next)); }}
              style={{ display:'flex', alignItems:'center', width:'100%', background:'none', border:'none', cursor:'pointer',
                padding:'0 12px 6px', gap:6, color:'var(--color-text-3)', fontSize:10, fontWeight:800, letterSpacing:1, textTransform:'uppercase' }}
            >
              <span style={{ flex:1 }}>Élevage</span>
              <ChevronDown size={11} style={{ transform: speciesOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition:'transform .2s' }} />
            </button>
          ) : null}
          {(speciesOpen || collapsed) && SPECIES_NAV.map(sp => (
            <NavLink
              key={sp.to}
              to={sp.to}
              onClick={handleNavClick}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              title={collapsed ? sp.label : undefined}
              style={({ isActive }) => isActive ? { borderInlineStart: `3px solid ${sp.color}`, paddingInlineStart: collapsed ? undefined : 13 } : {}}
            >
              <span style={{ fontSize: collapsed ? 18 : 15, flexShrink:0, lineHeight:1 }}>{sp.emoji}</span>
              {!collapsed && <span style={{ overflow:'hidden', textOverflow:'ellipsis', fontSize:13 }}>{sp.label}</span>}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Collapse toggle — desktop only */}
      <button className="sidebar-collapse-btn menu-toggle-desktop" onClick={toggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? <ChevronRight size={16} /> : (
          <>
            <ChevronLeft size={16} />
            <span style={{ fontSize: 11 }}>Réduire</span>
          </>
        )}
      </button>

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
