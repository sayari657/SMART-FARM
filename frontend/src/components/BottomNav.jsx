/**
 * BottomNav — Mobile bottom navigation for OWNER role only.
 *
 * - Workers use WorkerLayout which has its own bottom nav.
 * - SuperAdmins use SuperAdminLayout which has its own mobile nav.
 * - This component only renders inside MainLayout (owner scope).
 */
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PawPrint, AlertTriangle, FileText, Menu,
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';

const OWNER_TABS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/animals',   icon: PawPrint,        label: 'Animaux'   },
  { to: '/alerts',    icon: AlertTriangle,   label: 'Alertes'   },
  { to: '/reports',   icon: FileText,        label: 'Rapports'  },
];

export default function BottomNav() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { toggle } = useSidebar();
  const { user }   = useAuth() || {};

  /* Only render for owner role — other roles have their own nav */
  if (!user || user.role !== 'owner') return null;

  const isActive = (to) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {OWNER_TABS.map(({ to, icon: Icon, label }) => {
        const active = isActive(to);
        return (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`bottom-nav-item${active ? ' active' : ''}`}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} />
            <span className="bottom-nav-label">{label}</span>
            {active && <span className="bottom-nav-indicator" />}
          </button>
        );
      })}

      {/* Plus — opens the full sidebar */}
      <button
        onClick={toggle}
        className="bottom-nav-item"
        aria-label="Plus de pages"
      >
        <Menu size={22} />
        <span className="bottom-nav-label">Plus</span>
      </button>
    </nav>
  );
}
