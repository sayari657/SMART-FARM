import React, { useEffect, useState } from 'react';
import { Search, RefreshCw, Shield } from 'lucide-react';
import api from '../../services/api';

const C = { bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0', muted: '#64748b', text: '#1e293b', purple: '#7c3aed' };

const ACTION_COLORS = {
  plan_update:       '#22c55e',
  user_create:       '#06b6d4',
  user_update:       '#f59e0b',
  user_delete:       '#ef4444',
  user_status_toggle:'#f97316',
  password_reset:    '#f59e0b',
  impersonate:       '#a78bfa',
  pwa_version_push:  '#8b5cf6',
  flags_update:      '#ec4899',
  broadcast_sent:    '#06b6d4',
  broadcast_delete:  '#ef4444',
  db_backup:         '#22c55e',
};

const ACTION_LABELS = {
  plan_update:       'Plan mis à jour',
  user_create:       'Utilisateur créé',
  user_update:       'Utilisateur modifié',
  user_delete:       'Utilisateur supprimé',
  user_status_toggle:'Statut basculé',
  password_reset:    'MDP réinitialisé',
  impersonate:       'Impersonation',
  pwa_version_push:  'Version PWA déployée',
  flags_update:      'Feature flags modifiés',
  broadcast_sent:    'Broadcast envoyé',
  broadcast_delete:  'Broadcast supprimé',
  db_backup:         'Backup DB téléchargé',
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

export default function SuperAdminAudit() {
  const [data, setData] = useState({ logs: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const PER_PAGE = 30;

  const load = async (p = 0) => {
    setLoading(true);
    try {
      const { data: d } = await api.get('/superadmin/audit', {
        params: { skip: p * PER_PAGE, limit: PER_PAGE, action: filter || undefined },
      });
      setData(d);
      setPage(p);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(0); }, [filter]);

  const filtered = search
    ? data.logs.filter(l => l.action.includes(search) || l.admin?.includes(search) || JSON.stringify(l.detail).includes(search))
    : data.logs;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Audit Log</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{data.total} actions enregistrées</p>
        </div>
        <button onClick={() => load(page)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw size={13} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '9px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, cursor: 'pointer' }}>
          <option value="">Toutes les actions</option>
          {ALL_ACTIONS.map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
        </select>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['#', 'Action', 'Admin', 'Cible', 'Détails', 'IP', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Aucune action</td></tr>
            ) : filtered.map(log => {
              const color = ACTION_COLORS[log.action] || C.purple;
              return (
                <tr key={log.id} style={{ borderBottom: `1px solid ${C.border}11` }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>#{log.id}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>{ACTION_LABELS[log.action] || log.action}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.muted }}>
                      <Shield size={11} /> {log.admin || '?'}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>
                    {log.target_id ? `ID ${log.target_id}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', maxWidth: 200 }}>
                    <div style={{ fontSize: 11, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {Object.entries(log.detail || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#334155', fontFamily: 'monospace' }}>
                    {log.ip_address || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.total > PER_PAGE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => load(page - 1)} disabled={page === 0}
            style={{ padding: '6px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 12 }}>← Préc.</button>
          <span style={{ padding: '6px 14px', fontSize: 12, color: C.muted }}>Page {page + 1} / {Math.ceil(data.total / PER_PAGE)}</span>
          <button onClick={() => load(page + 1)} disabled={(page + 1) * PER_PAGE >= data.total}
            style={{ padding: '6px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, cursor: (page + 1) * PER_PAGE >= data.total ? 'not-allowed' : 'pointer', fontSize: 12 }}>Suiv. →</button>
        </div>
      )}
    </div>
  );
}
