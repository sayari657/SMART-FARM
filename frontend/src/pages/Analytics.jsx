import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BarChart3, TrendingUp, AlertTriangle, Heart, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { dashboardAPI } from '../services/api';

const PALETTE = {
  critical: '#ef4444',
  warning:  '#f59e0b',
  info:     '#3b82f6',
  anomaly:  '#8b5cf6',
  health:   '#10b981',
};

const SPECIES_COLORS = ['#d97706','#7c3aed','#0891b2','#059669','#dc2626','#16a34a'];

function KPI({ icon: Icon, value, label, color }) {
  return (
    <div className="kpi-box" style={{ flex: 1 }}>
      <div className={`kpi-icon ${color}`}><Icon size={20} /></div>
      <div><div className="kpi-value">{value}</div><div className="kpi-label">{label}</div></div>
    </div>
  );
}

export default function Analytics() {
  const { t } = useTranslation();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [days,    setDays]    = useState(30);

  const load = (d) => {
    setLoading(true);
    dashboardAPI.analytics(d)
      .then(r => setData(r.data))
      .catch(e => console.error('Analytics fetch error:', e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(days); }, [days]);

  // Derived KPIs from timeline
  const totalAnomalies  = data?.timeline?.reduce((s, r) => s + (r.anomalies || 0), 0) ?? 0;
  const totalCritical   = data?.timeline?.reduce((s, r) => s + (r.alerts_critical || 0), 0) ?? 0;
  const totalWarning    = data?.timeline?.reduce((s, r) => s + (r.alerts_warning || 0), 0) ?? 0;
  const avgHealth       = data?.species_health?.length
    ? (data.species_health.reduce((s, r) => s + r.avg_health, 0) / data.species_health.length).toFixed(1)
    : '—';

  return (
    <>
      <Navbar title="Farm Analytics" subtitle={`Intelligence agronomique — ${days} derniers jours`} />
      <div className="page-content">

        {/* Day selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          {[7, 14, 30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}
            >{d}j</button>
          ))}
          <button className="btn btn-sm btn-secondary" onClick={() => load(days)} style={{ marginLeft: 'auto' }}>
            <RefreshCw size={14} /> Rafraîchir
          </button>
        </div>

        {/* KPI row */}
        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          <KPI icon={AlertTriangle} value={totalAnomalies}  label="Anomalies totales"    color="teal"   />
          <KPI icon={AlertTriangle} value={totalCritical}   label="Alertes critiques"     color="red"    />
          <KPI icon={AlertTriangle} value={totalWarning}    label="Alertes avertissement" color="yellow" />
          <KPI icon={Heart}         value={`${avgHealth}%`} label="Santé moy. espèces"    color="green"  />
        </div>

        {loading ? (
          <div className="page-content" style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner" />
            <p style={{ color: 'var(--color-text-3)', marginTop: 12 }}>Chargement des données analytiques…</p>
          </div>
        ) : !data ? (
          <div className="empty-state"><BarChart3 size={40} /><p>Aucune donnée analytique disponible.</p></div>
        ) : (
          <>
            {/* Timeline: Anomalies + Alerts */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Chronologie — Anomalies & Alertes</div>
                  <div className="card-subtitle">Évolution quotidienne sur {days} jours</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="anomalies"      name="Anomalies"         stroke={PALETTE.anomaly}   strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="alerts_critical" name="Alertes critiques" stroke={PALETTE.critical}  strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="alerts_warning"  name="Avertissements"    stroke={PALETTE.warning}   strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid-2" style={{ marginBottom: 24, gap: 20 }}>
              {/* Species Health Bars */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Santé par Espèce</div>
                  <div className="card-subtitle">Score moyen de santé (0–100)</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.species_health} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="species" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => [`${v}%`, 'Santé']} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="avg_health" name="Santé %" radius={[4, 4, 0, 0]}>
                      {data.species_health.map((_, i) => (
                        <Cell key={i} fill={SPECIES_COLORS[i % SPECIES_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Alert Severity Pie */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Distribution des Alertes</div>
                  <div className="card-subtitle">Par niveau de sévérité</div>
                </div>
                {data.alert_severity_distribution.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px 0' }}>
                    <span style={{ fontSize: 32 }}>✅</span>
                    <p>Aucune alerte sur cette période.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.alert_severity_distribution}
                        dataKey="count"
                        nameKey="severity"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ severity, percent }) => `${severity} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {data.alert_severity_distribution.map((entry, i) => (
                          <Cell key={i} fill={PALETTE[entry.severity] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Anomaly Type Distribution */}
            {data.anomaly_type_distribution.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                  <div className="card-title">Types d'Anomalies les Plus Fréquents</div>
                  <div className="card-subtitle">Top 8 — {days} derniers jours</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.anomaly_type_distribution}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 120, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" name="Occurrences" fill={PALETTE.anomaly} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
