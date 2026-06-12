/**
 * SuperAdminPlans — Gestion des abonnements + connexion Stripe live
 *
 * Données réelles :
 *   GET  /billing/admin/overview   → MRR, produit Stripe, abonnés
 *   GET  /superadmin/users         → tous les owners pour changer de plan
 *   PATCH /superadmin/tenants/{id}/plan → changer le plan d'un owner
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckSquare, Zap, Building, ExternalLink, RefreshCw,
  CheckCircle, AlertTriangle, XCircle, Users, Euro,
  TrendingUp, ChevronDown, Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import toast from 'react-hot-toast';

const C = {
  bg:     '#0a0e14',
  card:   '#0d1520',
  card2:  '#0f1923',
  border: '#1a2535',
  muted:  '#4b6380',
  text:   '#e2e8f0',
  purple: '#7c3aed',
  green:  '#22c55e',
  amber:  '#f59e0b',
  red:    '#ef4444',
};

const PLAN_STYLE = {
  free:       { color: '#475569', icon: CheckSquare },
  pro:        { color: C.green,   icon: Zap         },
  enterprise: { color: C.purple,  icon: Building    },
};

function usePlanMeta(t) {
  return {
    free:       { label: t('billing.plan_free'),       ...PLAN_STYLE.free       },
    pro:        { label: t('billing.plan_pro'),         ...PLAN_STYLE.pro        },
    enterprise: { label: t('billing.plan_enterprise'),  ...PLAN_STYLE.enterprise },
  };
}

/* ── Status dot ── */
function StatusDot({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: ok ? C.green : C.red,
        boxShadow: ok ? `0 0 6px ${C.green}` : `0 0 6px ${C.red}`,
        flexShrink: 0,
      }}/>
      <span style={{ fontSize: 12, color: ok ? C.green : C.red, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

/* ── KPI card ── */
function KpiCard({ icon: Icon, label, value, sub, color = C.purple, link }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ background: `${color}20`, borderRadius: 10, padding: 10, flexShrink: 0 }}>
        <Icon size={18} color={color}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.text, marginTop: 3, lineHeight: 1 }}>{value ?? '—'}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
      </div>
      {link && (
        <a href={link} target="_blank" rel="noreferrer" style={{ color: C.muted, display: 'flex' }}>
          <ExternalLink size={14}/>
        </a>
      )}
    </div>
  );
}

/* ── Plan change dropdown ── */
function PlanSelect({ user, onChanged, planMeta }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const current = planMeta[user.plan] || planMeta.free;
  const Icon = current.icon;

  const change = async (newPlan) => {
    if (newPlan === user.plan) { setOpen(false); return; }
    setLoading(true); setOpen(false);
    try {
      await api.patch(`/superadmin/tenants/${user.id}/plan`, { plan: newPlan });
      toast.success(`Plan → ${newPlan} pour ${user.email}`);
      onChanged();
    } catch {
      toast.error('Erreur changement de plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 8,
          background: `${current.color}20`,
          border: `1px solid ${current.color}50`,
          color: current.color, fontSize: 11, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all .15s',
        }}
      >
        {loading
          ? <RefreshCw size={10} style={{ animation: 'spin .7s linear infinite' }}/>
          : <Icon size={11}/>
        }
        {current.label}
        <ChevronDown size={10}/>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
          background: C.card2, border: `1px solid ${C.border}`,
          borderRadius: 10, overflow: 'hidden', minWidth: 140,
          boxShadow: '0 12px 32px rgba(0,0,0,.5)',
        }}>
          {Object.entries(planMeta).map(([key, meta]) => {
            const Ic = meta.icon;
            return (
              <button key={key} onClick={() => change(key)} style={{
                width: '100%', padding: '9px 14px', background: 'transparent',
                border: 'none', color: key === user.plan ? meta.color : C.text,
                fontSize: 12, fontWeight: key === user.plan ? 800 : 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                textAlign: 'left',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#ffffff0a'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Ic size={12} color={meta.color}/>
                {meta.label}
                {key === user.plan && <CheckCircle size={11} color={meta.color} style={{ marginLeft: 'auto' }}/>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════ */
export default function SuperAdminPlans() {
  const { t } = useTranslation();
  const PLAN_META = usePlanMeta(t);
  const [overview, setOverview] = useState(null);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, us] = await Promise.all([
        api.get('/billing/admin/overview'),
        api.get('/superadmin/users', { params: { limit: 300, role: 'owner' } }),
      ]);
      setOverview(ov.data);
      setUsers(Array.isArray(us.data?.users) ? us.data.users : []);
    } catch {
      toast.error('Erreur chargement billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const ms = !search     || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase());
    const mp = !planFilter || (u.plan || 'free') === planFilter;
    return ms && mp;
  });

  const dist = overview?.plan_dist || {};

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>
            {t('billing.admin_title')}
          </h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4, margin: '4px 0 0' }}>
            {t('billing.admin_subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {overview?.dashboard_url && (
            <a href={overview.dashboard_url} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#635bff', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
              <ExternalLink size={13}/> {t('billing.stripe_dashboard')}
            </a>
          )}
          <button onClick={load} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin .7s linear infinite' : 'none' }}/> {t('billing.refresh')}
          </button>
        </div>
      </div>

      {/* ── Stripe Config Status ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
          {t('billing.stripe_config_title')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          <StatusDot ok={overview?.stripe_enabled}     label={overview?.stripe_enabled     ? t('billing.stripe_secret_ok')        : t('billing.stripe_secret_missing')}/>
          <StatusDot ok={overview?.stripe_configured}  label={overview?.stripe_configured  ? `${t('billing.stripe_price_ok')} (${overview?.stripe_price?.amount ?? '29'}€/mois)` : t('billing.stripe_price_missing')}/>
          <StatusDot ok={overview?.webhook_configured} label={overview?.webhook_configured ? t('billing.stripe_webhook_ok')       : t('billing.stripe_webhook_missing')}/>
          {overview?.stripe_product && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: overview.stripe_product.active ? C.green : C.amber }}/>
              <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>
                {t('billing.stripe_product_label')} : <a href={overview.stripe_product.url} target="_blank" rel="noreferrer" style={{ color: '#818cf8', textDecoration: 'none' }}>{overview.stripe_product.name}</a>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <KpiCard icon={Euro}      label={t('billing.mrr_label')}      value={`${overview?.mrr_eur ?? 0} €`}  sub={t('billing.mrr_sub')}          color="#22c55e"  link={overview?.dashboard_url}/>
        <KpiCard icon={TrendingUp} label={t('billing.arr_label')}    value={`${overview?.arr_eur ?? 0} €`}  sub={t('billing.arr_sub')}          color="#06b6d4"/>
        <KpiCard icon={Zap}       label={t('billing.pro_subs_label')} value={dist.pro ?? 0}                  sub={`× 29€ = ${(dist.pro ?? 0) * 29}€/mois`} color={C.green}/>
        <KpiCard icon={Users}     label={t('billing.free_plan_label')} value={dist.free ?? 0}               sub={t('billing.free_plan_sub')}    color={C.muted}/>
        <KpiCard icon={Building}  label={t('billing.enterprise_label')} value={dist.enterprise ?? 0}       sub={t('billing.enterprise_sub')}   color={C.purple}/>
      </div>

      {/* ── Plan distribution bar ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>{t('billing.plan_dist_title')}</div>
        {Object.entries(PLAN_META).map(([key, meta]) => {
          const count = dist[key] ?? 0;
          const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
          const pct   = Math.round((count / total) * 100);
          const Icon  = meta.icon;
          return (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon size={12} color={meta.color}/>
                  <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: 'uppercase', background: `${meta.color}18`, padding: '2px 8px', borderRadius: 5 }}>{meta.label}</span>
                </div>
                <span style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>
                  {count} <span style={{ color: C.muted, fontWeight: 400 }}>({pct}%)</span>
                  {key === 'pro' && count > 0 && <span style={{ color: C.green, marginLeft: 8 }}>= {count * 29}€/mois</span>}
                </span>
              </div>
              <div style={{ height: 6, background: '#0a0e14', borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 99, transition: 'width .5s' }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Abonnés actifs (Pro + Enterprise) ── */}
      {(overview?.subscribers?.length ?? 0) > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            {t('billing.paying_subs')} ({overview.subscribers.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overview.subscribers.map(sub => {
              const meta = PLAN_META[sub.plan] || PLAN_META.free;
              const Icon = meta.icon;
              return (
                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#080c10', borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color={meta.color}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.full_name || sub.email}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{sub.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}18`, padding: '2px 8px', borderRadius: 6 }}>{meta.label}</span>
                    {sub.stripe_url && (
                      <a href={sub.stripe_url} target="_blank" rel="noreferrer" style={{ color: C.muted, display: 'flex' }}>
                        <ExternalLink size={12}/>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tous les owners : gestion de plan ── */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('billing.plan_mgmt')} · {filtered.length}
          </div>
          <div style={{ flex: 1, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }}/>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('billing.search_ph')}
                style={{ paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, background: '#080c10', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, outline: 'none', width: 160 }}
              />
            </div>
            {/* Plan filter */}
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
              style={{ padding: '6px 10px', background: '#080c10', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, outline: 'none' }}>
              <option value="">{t('billing.all_plans')}</option>
              {Object.entries(PLAN_META).map(([k, m]) => (
                <option key={k} value={k}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#080c10' }}>
                {[t('billing.th_id'), t('billing.th_user'), t('billing.th_email'), t('billing.th_plan'), t('billing.th_change')].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: C.muted, fontSize: 13 }}>
                  <RefreshCw size={16} style={{ animation: 'spin .7s linear infinite', marginRight: 8, verticalAlign: 'middle' }}/> {t('billing.loading')}
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: C.muted, fontSize: 13 }}>
                  {t('billing.no_owners')}
                </td></tr>
              ) : filtered.map(u => {
                const meta = PLAN_META[u.plan || 'free'] || PLAN_META.free;
                return (
                  <tr key={u.id}
                    style={{ borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0f1923'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 16px', fontSize: 12, color: C.muted }}>{u.id}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: C.text }}>{u.full_name || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: C.muted }}>{u.email}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}18`, padding: '3px 9px', borderRadius: 6 }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <PlanSelect user={{ ...u, plan: u.plan || 'free' }} onChanged={load} planMeta={PLAN_META}/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
