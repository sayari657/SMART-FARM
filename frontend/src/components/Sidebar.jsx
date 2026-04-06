import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, PawPrint, Activity, Eye,
  AlertTriangle, Lightbulb, FileText, Settings, LogOut, Leaf, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    section: 'Overview', items: [
      { to: '/about-project', icon: Layers, label: 'About Project' },
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/farms', icon: Building2, label: 'Farms' },
      { to: '/animals', icon: PawPrint, label: 'Animals' },

    ]
  },
  {
    section: 'Monitoring', items: [
      { to: '/telemetry', icon: Activity, label: 'Telemetry' },
      { to: '/cv', icon: Eye, label: 'CV Monitoring' },
      { to: '/alerts', icon: AlertTriangle, label: 'Alerts Center' },
    ]
  },
  {
    section: 'Intelligence', items: [
      { to: '/recommendations', icon: Lightbulb, label: 'Recommendations' },
      { to: '/reports', icon: FileText, label: 'Reports' },
    ]
  },
  {
    section: 'System', items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
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
          <div className="sidebar-section-label">{section}</div>
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              {label}
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
