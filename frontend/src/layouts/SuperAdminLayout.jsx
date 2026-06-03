import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Building2, CreditCard, Flag,
  Cpu, FileText, Radio, Brain, LogOut,
  ChevronLeft, ChevronRight, Leaf, Activity, ExternalLink, Shield
} from 'lucide-react';

const SECTIONS = [
  {
    label: 'PLATEFORME',
    items: [
      { to: '/superadmin',           label: 'Dashboard',      icon: LayoutDashboard, end: true },
      { to: '/superadmin/tenants',   label: 'Tenants',        icon: Building2 },
      { to: '/superadmin/users',     label: 'Utilisateurs',   icon: Users },
    ],
  },
  {
    label: 'COMMERCIAL',
    items: [
      { to: '/superadmin/plans',     label: 'Abonnements',    icon: CreditCard },
      { to: '/superadmin/broadcast', label: 'Broadcast',      icon: Radio },
    ],
  },
  {
    label: 'TECHNIQUE',
    items: [
      { to: '/superadmin/models',    label: 'Modèles AI',     icon: Brain },
      { to: '/superadmin/flags',     label: 'Feature Flags',  icon: Flag },
      { to: '/superadmin/audit',     label: 'Audit Log',      icon: FileText },
      { to: '/superadmin/2fa',       label: '2FA TOTP',       icon: Shield },
      { to: '/superadmin/system',    label: 'Système',        icon: Cpu },
    ],
  },
];

const PURPLE = '#7c3aed';

export default function SuperAdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#080c10', color: '#e2e8f0', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 60 : 230, minWidth: collapsed ? 60 : 230,
        background: '#0a0e14', borderRight: '1px solid #1a2535',
        display: 'flex', flexDirection: 'column', transition: 'width .2s, min-width .2s',
        overflowX: 'hidden',
      }}>

        {/* Logo */}
        <div style={{ padding: collapsed ? '18px 14px' : '18px 16px', borderBottom: '1px solid #1a2535', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ background: PURPLE, borderRadius: 8, padding: 7, flexShrink: 0, display: 'flex' }}>
            <Shield size={16} color="#fff" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 1.5, whiteSpace: 'nowrap' }}>SMART FARM AI</div>
              <div style={{ fontSize: 10, color: PURPLE, fontWeight: 700, letterSpacing: 0.5 }}>SUPERADMIN PORTAL</div>
            </div>
          )}
        </div>

        {/* Sections */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          {SECTIONS.map(section => (
            <div key={section.label} style={{ marginBottom: 6 }}>
              {!collapsed && (
                <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: 1.5, padding: '10px 8px 4px', textTransform: 'uppercase' }}>
                  {section.label}
                </div>
              )}
              {collapsed && <div style={{ height: 8 }} />}
              {section.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: collapsed ? '9px 14px' : '9px 10px',
                  borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 500,
                  color: isActive ? '#fff' : '#4b6380',
                  background: isActive ? `${PURPLE}20` : 'transparent',
                  borderLeft: `3px solid ${isActive ? PURPLE : 'transparent'}`,
                  transition: 'all .12s', marginBottom: 1, whiteSpace: 'nowrap',
                })}>
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {!collapsed && label}
                </NavLink>
              ))}
            </div>
          ))}

          {/* MLflow external */}
          <div style={{ marginTop: 4 }}>
            {!collapsed && <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: 1.5, padding: '6px 8px 4px' }}>OUTILS</div>}
            {collapsed && <div style={{ height: 8 }} />}
            <a href="http://localhost:5000" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '9px 14px' : '9px 10px', borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 500, color: '#4b6380', borderLeft: '3px solid transparent', whiteSpace: 'nowrap' }}>
              <Activity size={15} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>MLflow <ExternalLink size={10} /></span>}
            </a>
          </div>
        </nav>

        {/* User + footer */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid #1a2535' }}>
          {!collapsed && (
            <div style={{ padding: '8px 10px', marginBottom: 6, background: '#0d1520', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, background: PURPLE, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {user?.username?.[0]?.toUpperCase() || 'S'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username}</div>
                <div style={{ fontSize: 10, color: PURPLE, fontWeight: 600 }}>superadmin</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '9px 14px' : '9px 10px', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 500, width: '100%', whiteSpace: 'nowrap' }}>
            <LogOut size={15} />
            {!collapsed && 'Déconnexion'}
          </button>
          <button onClick={() => setCollapsed(c => !c)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, background: '#1a2535', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#4b6380', width: '100%', marginTop: 4 }}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
