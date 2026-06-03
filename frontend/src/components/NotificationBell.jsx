/**
 * NotificationBell — cloche de notifications en temps réel.
 * - Récupère les broadcasts depuis /superadmin/broadcasts/public/{role}
 * - Réagit aux events WebSocket {type: "alert"} ou {type: "broadcast"}
 * - Badge rouge avec compteur non-lus
 */
import React, { useEffect, useRef, useState } from 'react';
import { Bell, X, Megaphone, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../services/api';

const MAX_NOTIFS = 20;

function NotifItem({ n, onDismiss }) {
  const icons = { alert: AlertTriangle, broadcast: Megaphone, info: CheckCircle };
  const colors = { alert: '#ef4444', broadcast: '#7c3aed', info: '#22c55e' };
  const Icon = icons[n.type] || Megaphone;
  const color = colors[n.type] || '#7c3aed';

  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid #1e293b', background: n.read ? 'transparent' : '#7c3aed08' }}>
      <div style={{ background: `${color}20`, borderRadius: 7, padding: 6, flexShrink: 0, height: 'fit-content' }}>
        <Icon size={13} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>{n.title}</div>
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
        <div style={{ fontSize: 10, color: '#334155', marginTop: 4 }}>
          {n.created_at ? new Date(n.created_at).toLocaleString('fr-FR') : ''}
        </div>
      </div>
      <button onClick={() => onDismiss(n.id)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: 2, flexShrink: 0, alignSelf: 'flex-start' }}>
        <X size={12} />
      </button>
    </div>
  );
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const panelRef = useRef(null);
  const { lastMessage } = useWebSocket({ enabled: !!user });

  const unread = notifs.filter(n => !n.read).length;

  // Load broadcasts from server
  const loadBroadcasts = async () => {
    if (!user?.role) return;
    try {
      const { data } = await api.get(`/superadmin/broadcasts/public/${user.role}`);
      setNotifs(prev => {
        const existingIds = new Set(prev.map(n => `bc_${n.id}`));
        const newOnes = data
          .filter(b => !existingIds.has(`bc_${b.id}`))
          .map(b => ({ ...b, id: `bc_${b.id}`, type: 'broadcast', read: false }));
        return [...newOnes, ...prev].slice(0, MAX_NOTIFS);
      });
    } catch { /* silent */ }
  };

  useEffect(() => { loadBroadcasts(); }, [user]);

  // React to WebSocket real-time events
  useEffect(() => {
    if (!lastMessage) return;
    const { type, payload } = lastMessage;
    if (type === 'alert' || type === 'broadcast' || type === 'notification') {
      const n = {
        id: `ws_${Date.now()}`,
        title: payload?.title || payload?.message || 'Alerte',
        body: payload?.body || payload?.detail || '',
        type: type === 'alert' ? 'alert' : 'broadcast',
        read: false,
        created_at: new Date().toISOString(),
      };
      setNotifs(prev => [n, ...prev].slice(0, MAX_NOTIFS));
    }
  }, [lastMessage]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dismiss = (id) => setNotifs(prev => prev.filter(n => n.id !== id));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#64748b', display: 'flex', alignItems: 'center' }}>
        <Bell size={18} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, background: '#0d1520', border: '1px solid #1e293b', borderRadius: 12, boxShadow: '0 8px 32px #0008', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #1e293b' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Notifications {unread > 0 && `(${unread})`}</span>
            <button onClick={markAllRead} style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>Tout lire</button>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#334155', fontSize: 13 }}>Aucune notification</div>
            ) : (
              notifs.map(n => <NotifItem key={n.id} n={n} onDismiss={dismiss} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
