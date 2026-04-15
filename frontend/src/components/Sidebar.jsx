import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Building2, PawPrint, Activity, Eye,
  AlertTriangle, Lightbulb, FileText, Settings, LogOut, Leaf, Layers, Bot, TreePine, Map
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    section: 'Overview', items: [
      { to: '/about-project', icon: Layers, labelKey: 'sidebar.project_about' },
      { to: '/dashboard', icon: LayoutDashboard, labelKey: 'sidebar.dashboard' },
      { to: '/farms', icon: Building2, labelKey: 'sidebar.farms' },
      { to: '/animals', icon: PawPrint, labelKey: 'sidebar.animals' },
      { to: '/trees', icon: TreePine, labelKey: 'sidebar.trees' },
      { to: '/map', icon: Map, labelKey: 'sidebar.map_center' },
    ]
  },
  {
    section: 'Monitoring', items: [
      { to: '/telemetry', icon: Activity, labelKey: 'sidebar.telemetry' },
      { to: '/cv', icon: Eye, labelKey: 'sidebar.cv_monitoring' },
      { to: '/alerts', icon: AlertTriangle, labelKey: 'sidebar.alerts' },
    ]
  },
  {
    section: 'Intelligence', items: [
      { to: '/assistant', icon: Bot, labelKey: 'sidebar.assistant' },
      { to: '/recommendations', icon: Lightbulb, labelKey: 'sidebar.recommendations' },
      { to: '/reports', icon: FileText, labelKey: 'sidebar.reports' },
    ]
  },
  {
    section: 'System', items: [
      { to: '/settings', icon: Settings, labelKey: 'sidebar.settings' },
    ]
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Leaf size={18} />
        </div>
        <div>
          <div className="sidebar-logo-text">Smart Farm AI</div>
          <div className="sidebar-logo-sub">Enterprise Platform</div>
        </div>
      </div>

      {NAV.map(({ section, items }) => (
        <div className="sidebar-section" key={section}>
          <div className="sidebar-section-label">{t(`sidebar.${section.toLowerCase()}`, section)}</div>
          {items.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              {t(labelKey)}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div>
            <div className="sidebar-user-name">{user?.full_name || user?.username}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-text-3)', cursor: 'pointer' }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
