import React, { useEffect, useState } from 'react';
import { Search, RefreshCw, Building2, ChevronDown, Check, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PLANS = ['all', 'free', 'pro', 'enterprise'];

const PLAN_COLORS = { free: '#64748b', pro: '#22c55e', enterprise: '#7c3aed' };

function PlanBadge({ plan }) {
  const c = PLAN_COLORS[plan] || '#64748b';
  return (
    <span style={{ background: `${c}22`, color: c, border: `1px solid ${c}44`, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
      {plan}
    </span>
  );
}

function PlanSelect({ userId, currentPlan, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const change = async (plan) => {
    setLoading(true);
    setOpen(false);
    try {
      await api.patch(`/superadmin/tenants/${userId}/plan`, { plan });
      toast.success(`Plan mis à jour : ${plan}`);
      onUpdated();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#1e2d3d', border: '1px solid #2d3f50', borderRadius: 6, cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}
      >
        <PlanBadge plan={currentPlan} />
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8, zIndex: 50, minWidth: 130, overflow: 'hidden' }}>
          {['free', 'pro', 'enterprise'].map(p => (
            <button key={p} onClick={() => change(p)}
              style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: p === currentPlan ? '#fff' : '#64748b', fontSize: 12 }}
            >
              {p === currentPlan && <Check size={11} style={{ marginRight: 6 }} />}{p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuperAdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { plan: filter } : {};
      const { data } = await api.get('/superadmin/tenants', { params });
      setTenants(data);
    } catch {
      toast.error('Erreur de chargement des tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const toggleStatus = async (userId, currentStatus) => {
    try {
      await api.patch(`/superadmin/users/${userId}/status`, { is_active: !currentStatus });
      toast.success(currentStatus ? 'Compte désactivé' : 'Compte activé');
      load();
    } catch {
      toast.error('Erreur');
    }
  };

  const filtered = tenants.filter(t =>
    !search || t.username?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Tenants — Propriétaires</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{tenants.length} comptes enregistrés</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#1e2d3d', border: '1px solid #2d3f50', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8, color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PLANS.map(p => (
            <button key={p} onClick={() => setFilter(p)}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid', borderColor: filter === p ? PLAN_COLORS[p] || '#7c3aed' : '#1e2d3d', background: filter === p ? `${PLAN_COLORS[p] || '#7c3aed'}22` : 'transparent', color: filter === p ? '#f1f5f9' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2d3d' }}>
              {['Propriétaire', 'Contact', 'Plan', 'Fermes', 'Animaux', 'Statut', 'Inscription', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Aucun tenant trouvé</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #1e2d3d11' }}
                onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#f1f5f9' }}>{t.full_name || t.username}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>@{t.username}</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.email || '—'}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{t.phone_number || '—'}</div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <PlanSelect userId={t.id} currentPlan={t.plan || 'free'} onUpdated={load} />
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' }}>
                    <Building2 size={13} /> {t.farm_count}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>{t.animal_count}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.is_active ? '#22c55e' : '#ef4444', background: t.is_active ? '#22c55e22' : '#ef444422', padding: '3px 10px', borderRadius: 6, textTransform: 'uppercase' }}>
                    {t.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b' }}>
                  {t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <button
                    onClick={() => toggleStatus(t.id, t.is_active)}
                    style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid', borderColor: t.is_active ? '#ef444444' : '#22c55e44', background: 'transparent', color: t.is_active ? '#ef4444' : '#22c55e', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {t.is_active ? <><X size={12} /> Désactiver</> : <><Check size={12} /> Activer</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
