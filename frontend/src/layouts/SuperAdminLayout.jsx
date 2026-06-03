import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Building2, CreditCard, Flag,
  Cpu, FileText, Radio, Brain, LogOut,
  ChevronLeft, ChevronRight, Activity, ExternalLink, Shield,
  Menu, X,
} from 'lucide-react';

const SECTIONS = [
  {
    label: 'PLATEFORME',
    items: [
      { to: '/superadmin',           label: 'Dashboard',    icon: LayoutDashboard, end: true },
      { to: '/superadmin/tenants',   label: 'Tenants',      icon: Building2 },
      { to: '/superadmin/users',     label: 'Utilisateurs', icon: Users },
    ],
  },
  {
    label: 'COMMERCIAL',
    items: [
      { to: '/superadmin/plans',     label: 'Abonnements',  icon: CreditCard },
      { to: '/superadmin/broadcast', label: 'Broadcast',    icon: Radio },
    ],
  },
  {
    label: 'TECHNIQUE',
    items: [
      { to: '/superadmin/models',    label: 'Modèles AI',   icon: Brain },
      { to: '/superadmin/flags',     label: 'Feature Flags',icon: Flag },
      { to: '/superadmin/audit',     label: 'Audit Log',    icon: FileText },
      { to: '/superadmin/2fa',       label: '2FA TOTP',     icon: Shield },
      { to: '/superadmin/system',    label: 'Système',      icon: Cpu },
    ],
  },
];

/* Mobile bottom tabs — 5 most-used */
const MOBILE_TABS = [
  { to: '/superadmin',           label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/superadmin/tenants',   label: 'Tenants',   icon: Building2 },
  { to: '/superadmin/users',     label: 'Users',     icon: Users },
  { to: '/superadmin/audit',     label: 'Audit',     icon: FileText },
  { to: '/superadmin/system',    label: 'Système',   icon: Cpu },
];

const PURPLE = '#7c3aed';
const BG     = '#080c10';
const SIDE   = '#0a0e14';
const BORDER = '#1a2535';

export default function SuperAdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  /* Desktop collapse state */
  const [collapsed, setCollapsed] = useState(false);
  /* Mobile sidebar open/close */
  const [mobileOpen, setMobileOpen] = useState(false);
  /* Screen size detection */
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* Close mobile sidebar on route change */
  const handleNavClick = () => { if (isMobile) setMobileOpen(false); };

  const handleLogout = () => { logout(); navigate('/login'); };

  /* ── Sidebar content — shared desktop/mobile ── */
  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{
        padding: (collapsed && !isMobile) ? '18px 14px' : '18px 16px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <div style={{ background: PURPLE, borderRadius: 8, padding: 7, flexShrink: 0, display: 'flex' }}>
          <Shield size={16} color="#fff" />
        </div>
        {(!collapsed || isMobile) && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 1.5, whiteSpace: 'nowrap' }}>SMART FARM AI</div>
            <div style={{ fontSize: 10, color: PURPLE, fontWeight: 700, letterSpacing: 0.5 }}>SUPERADMIN PORTAL</div>
          </div>
        )}
        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            style={{ background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 8, padding: 6, color: '#94a3b8', cursor: 'pointer', display: 'flex', marginLeft: 'auto' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
        {SECTIONS.map(section => (
          <div key={section.label} style={{ marginBottom: 6 }}>
            {(!collapsed || isMobile) && (
              <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: 1.5, padding: '10px 8px 4px', textTransform: 'uppercase' }}>
                {section.label}
              </div>
            )}
            {collapsed && !isMobile && <div style={{ height: 8 }} />}
            {section.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={handleNavClick}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center',
                  gap: (collapsed && !isMobile) ? 0 : 10,
                  padding: (collapsed && !isMobile) ? '9px 14px' : '9px 10px',
                  borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 500,
                  color: isActive ? '#fff' : '#4b6380',
                  background: isActive ? `${PURPLE}20` : 'transparent',
                  borderLeft: `3px solid ${isActive ? PURPLE : 'transparent'}`,
                  transition: 'all .12s', marginBottom: 1, whiteSpace: 'nowrap',
                })}>
                <Icon size={15} style={{ flexShrink: 0 }} />
                {(!collapsed || isMobile) && label}
              </NavLink>
            ))}
          </div>
        ))}

        {/* MLflow external */}
        <div style={{ marginTop: 4 }}>
          {(!collapsed || isMobile) && (
            <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: 1.5, padding: '6px 8px 4px' }}>OUTILS</div>
          )}
          {collapsed && !isMobile && <div style={{ height: 8 }} />}
          <a href="http://localhost:5000" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: (collapsed && !isMobile) ? 0 : 10, padding: (collapsed && !isMobile) ? '9px 14px' : '9px 10px', borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 500, color: '#4b6380', borderLeft: '3px solid transparent', whiteSpace: 'nowrap' }}>
            <Activity size={15} style={{ flexShrink: 0 }} />
            {(!collapsed || isMobile) && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>MLflow <ExternalLink size={10} /></span>}
          </a>
        </div>
      </nav>

      {/* User + footer */}
      <div style={{ padding: '10px 8px', borderTop: `1px solid ${BORDER}` }}>
        {(!collapsed || isMobile) && (
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
          style={{ display: 'flex', alignItems: 'center', gap: (collapsed && !isMobile) ? 0 : 10, padding: (collapsed && !isMobile) ? '9px 14px' : '9px 10px', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 500, width: '100%', whiteSpace: 'nowrap', justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start', minHeight: 40, touchAction: 'manipulation' }}>
          <LogOut size={15} />
          {(!collapsed || isMobile) && 'Déconnexion'}
        </button>

        {/* Desktop collapse toggle — hidden on mobile */}
        {!isMobile && (
          <button onClick={() => setCollapsed(c => !c)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, background: '#1a2535', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#4b6380', width: '100%', marginTop: 4 }}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>
    </>
  );

  return (
    <div style={{
      display: 'flex', height: '100dvh',
      background: BG, color: '#e2e8f0',
      fontFamily: 'Inter, sans-serif', overflow: 'hidden',
    }}>

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
      {!isMobile && (
        <aside style={{
          width: collapsed ? 60 : 230,
          minWidth: collapsed ? 60 : 230,
          background: SIDE, borderRight: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column',
          transition: 'width .2s, min-width .2s', overflowX: 'hidden',
        }}>
          <SidebarContent />
        </aside>
      )}

      {/* ── MOBILE SIDEBAR (off-canvas) ──────────────────────── */}
      {isMobile && (
        <>
          {/* Overlay */}
          {mobileOpen && (
            <div
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 299, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
            />
          )}
          {/* Drawer */}
          <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: 280, background: SIDE, zIndex: 300,
            display: 'flex', flexDirection: 'column',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
            boxShadow: mobileOpen ? '6px 0 30px rgba(0,0,0,.5)' : 'none',
            overflowY: 'auto',
            /* Safe area for notch */
            paddingTop: 'env(safe-area-inset-top)',
          }}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── MAIN AREA ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Mobile top bar */}
        {isMobile && (
          <header style={{
            background: SIDE,
            borderBottom: `1px solid ${BORDER}`,
            padding: `calc(12px + env(safe-area-inset-top)) 16px 12px`,
            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
            zIndex: 50,
          }}>
            <button
              onClick={() => setMobileOpen(true)}
              style={{ background: `${PURPLE}20`, border: `1px solid ${PURPLE}40`, borderRadius: 9, padding: 8, color: PURPLE, cursor: 'pointer', display: 'flex', minHeight: 40, minWidth: 40, alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}
            >
              <Menu size={18} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>SMART FARM AI</div>
              <div style={{ fontSize: 10, color: PURPLE, fontWeight: 700 }}>SuperAdmin Portal</div>
            </div>
            <div style={{ width: 32, height: 32, background: PURPLE, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {user?.username?.[0]?.toUpperCase() || 'S'}
            </div>
          </header>
        )}

        {/* Content */}
        <main style={{
          flex: 1, overflow: 'auto',
          padding: isMobile ? '16px 14px calc(80px + env(safe-area-inset-bottom))' : '28px 32px',
          minWidth: 0,
        }}>
          <Outlet />
        </main>

        {/* ── MOBILE BOTTOM NAV ─────────────────────────────── */}
        {isMobile && (
          <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: 'rgba(10,14,20,.97)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: `1px solid ${BORDER}`,
            display: 'flex', justifyContent: 'space-around', alignItems: 'center',
            height: 'calc(60px + env(safe-area-inset-bottom))',
            paddingBottom: 'env(safe-area-inset-bottom)',
            zIndex: 200,
          }}>
            {MOBILE_TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                style={({ isActive }) => ({
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '8px 6px', minWidth: 52, textDecoration: 'none',
                  color: isActive ? PURPLE : '#4b6380',
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                  position: 'relative',
                })}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span style={{ position: 'absolute', top: 4, width: 4, height: 4, borderRadius: '50%', background: PURPLE }} />
                    )}
                    <Icon size={20} />
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: .2 }}>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
