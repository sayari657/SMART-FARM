import React, { useEffect, useState } from 'react';
import {
  Users, Building2, PawPrint, Euro, Wifi, TrendingUp,
  RefreshCw, ExternalLink, ArrowUpRight, AlertTriangle
} from 'lucide-react';
import api from '../../services/api';

const C = { bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0', muted: '#64748b', text: '#1e293b', purple: '#7c3aed' };

/* ── Mini sparkline bar chart ─── */
function SparkBars({ data = [], color = '#7c3aed', valueKey = 'mrr', labelKey = 'month' }) {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
      {data.slice(-12).map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div title={`${d[labelKey]}: ${d[valueKey]}`}
            style={{ width: '100%', height: `${Math.max(4, ((d[valueKey] || 0) / max) * 44)}px`, background: i === data.length - 1 ? color : `${color}55`, borderRadius: 2, transition: 'height .3s' }} />
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = C.purple, trend }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ background: `${color}20`, borderRadius: 10, padding: 10, flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginTop: 2, lineHeight: 1 }}>{value ?? '—'}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
      </div>
      {trend != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: trend >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
          <ArrowUpRight size={12} /> +{trend}
        </div>
      )}
    </div>
  );
}

function PlanBar({ plan, count, total }) {
  const colors = { free: '#475569', pro: '#22c55e', enterprise: C.purple };
  const c = colors[plan] || '#475569';
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: c, textTransform: 'uppercase', background: `${c}20`, padding: '2px 8px', borderRadius: 5 }}>{plan}</span>
        <span style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{count} <span style={{ color: C.muted, fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 3, transition: 'width .5s' }} />
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { label: 'MLflow — Modèles AI', url: 'http://localhost:5000', color: C.purple },
  { label: 'Swagger API Docs',    url: 'http://localhost:8000/docs', color: '#06b6d4' },
  { label: 'Grafana Monitoring',  url: 'https://medsayari2001.grafana.net', color: '#f59e0b' },
  { label: 'Prometheus Métriques',url: 'http://localhost:8000/metrics', color: '#22c55e' },
  { label: 'Prometheus UI',       url: 'http://localhost:9090', color: '#f97316' },
];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, g] = await Promise.all([
        api.get('/superadmin/stats'),
        api.get('/superadmin/stats/revenue'),
        api.get('/superadmin/stats/growth'),
      ]);
      setStats(s.data);
      setRevenue(r.data);
      setGrowth(g.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Tableau de bord Plateforme</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Smart Farm AI — Vue globale InTech Solutions</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {stats?.maintenance_mode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#ef444422', border: '1px solid #ef444444', borderRadius: 8, fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
              <AlertTriangle size={13} /> MODE MAINTENANCE
            </div>
          )}
          <button onClick={load} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Actualiser
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard icon={Users}     label="Propriétaires"  value={stats?.owners}        sub={`+${stats?.new_this_week ?? 0} cette semaine`} color={C.purple} trend={stats?.new_this_month} />
        <StatCard icon={Users}     label="Ouvriers PWA"   value={stats?.workers}       sub="comptes actifs" color="#06b6d4" />
        <StatCard icon={Building2} label="Fermes"         value={stats?.farms}         color="#f59e0b" />
        <StatCard icon={PawPrint}  label="Animaux"        value={stats?.animals}       color="#22c55e" />
        <StatCard icon={Euro}      label="MRR"            value={`${stats?.mrr_eur ?? 0} €`} sub={`ARR: ${stats?.arr_eur ?? 0} €`} color="#ec4899" />
        <StatCard icon={Wifi}      label="Version PWA"    value={stats?.pwa_version}   sub="en production" color="#8b5cf6" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Revenue chart */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12 }}>MRR — 12 DERNIERS MOIS</div>
          <SparkBars data={revenue} color="#ec4899" valueKey="mrr" labelKey="month" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: C.muted }}>{revenue[0]?.month}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ec4899' }}>{revenue[revenue.length - 1]?.mrr ?? 0} €</span>
          </div>
        </div>

        {/* Growth chart */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12 }}>CROISSANCE TENANTS</div>
          <SparkBars data={growth} color={C.purple} valueKey="cumulative" labelKey="month" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: C.muted }}>{growth[0]?.month}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>{growth[growth.length - 1]?.cumulative ?? 0} total</span>
          </div>
        </div>

        {/* Plan distribution */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 14 }}>DISTRIBUTION PLANS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['free', 'pro', 'enterprise'].map(p => (
              <PlanBar key={p} plan={p} count={stats?.plan_dist?.[p] || 0} total={stats?.owners || 1} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Quick links */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12 }}>ACCÈS RAPIDES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {QUICK_LINKS.map(({ label, url, color }) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: C.bg, borderRadius: 8, textDecoration: 'none', border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, transition: 'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = color}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                {label} <ExternalLink size={12} color={color} />
              </a>
            ))}
          </div>
        </div>

        {/* Platform summary */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 14 }}>RÉSUMÉ PLATEFORME</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Utilisateurs actifs',  stats?.active_users,   '#22c55e'],
              ['Utilisateurs inactifs',stats?.inactive_users, '#ef4444'],
              ['Nouveaux ce mois',     stats?.new_this_month, C.purple],
              ['Nouveaux cette semaine',stats?.new_this_week, '#06b6d4'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color }}>{val ?? '—'}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
              <span style={{ fontSize: 12, color: C.muted }}>ARR estimé</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#ec4899' }}>{stats?.arr_eur ?? 0} €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
