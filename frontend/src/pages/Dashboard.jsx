import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudRain, Sun, Wind, Cloud, Building2, PawPrint, AlertTriangle, AlertOctagon, Heart, TrendingUp, Eye, Cpu } from 'lucide-react';
import Navbar from '../components/Navbar';
import KPIBox from '../components/KPIBox';
import ThreeTile from '../components/ThreeTile';
import AlertCard from '../components/AlertCard';
import TelemetryChart from '../components/TelemetryChart';
import { dashboardAPI, alertsAPI, telemetryAPI, cvAPI, anomalyAPI, animalsAPI, farmsAPI, externalAPI } from '../services/api';

export default function Dashboard() {
  const [stats, setStats]         = useState(null);
  const [alerts, setAlerts]       = useState([]);
  const [cvEvents, setCvEvents]   = useState([]);
  const [recentTelemetry, setRT]  = useState([]);
  const [weather, setWeather]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      dashboardAPI.stats(),
      alertsAPI.list(),
      cvAPI.recent(10),
      animalsAPI.list(),
      farmsAPI.list()
    ]).then(([statsRes, alertsRes, cvRes, unitsRes, farmsRes]) => {
      setStats(statsRes.data);
      setAlerts(alertsRes.data.slice(0, 5));
      setCvEvents(cvRes.data.slice(0, 6));
      
      // Load telemetry for first unit
      if (unitsRes.data.length > 0) {
        telemetryAPI.history(unitsRes.data[0].id, 48).then(r => setRT(r.data));
      }
      
      // Load weather for first available farm
      if (farmsRes.data.length > 0) {
          externalAPI.weather.current(farmsRes.data[0].id)
            .then(res => setWeather(res.data))
            .catch(err => console.log('Weather fetch error:', err));
          
          externalAPI.weather.forecast(farmsRes.data[0].id)
            .then(res => {
                // Ensure forecasting exists
                setWeather(prev => prev ? { ...prev, forecast: res.data } : null);
            })
            .catch(err => console.log('Forecast error:', err));
      }
    }).finally(() => setLoading(false));
  }, []);

  const SPECIES_COLORS = { bee:'#d97706', cow:'#7c3aed', poultry:'#0891b2', sheep:'#059669', goat:'#dc2626' };
  const SPECIES_EMOJI  = { bee:'🐝', cow:'🐄', poultry:'🐔', sheep:'🐑', goat:'🐐' };

  if (loading) return <div className="page-content"><div className="spinner" /></div>;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <Navbar title="Dashboard" subtitle={`Farm intelligence overview • ${today}`} />
      <div className="page-content">

        {/* Global Weather Widget */}
        {weather && (
          <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', border: '1px solid #7dd3fc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <CloudRain size={40} color="#0284c7" />
                <div>
                  <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0369a1', margin: 0 }}>{weather.temperature}°C</h3>
                  <p style={{ color: '#0284c7', margin: 0, fontWeight: 500 }}>Local Farm Weather</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <Cloud size={20} color="#0284c7" style={{ margin: '0 auto 4px' }}/>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{weather.humidity}% Hum</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Wind size={20} color="#0284c7" style={{ margin: '0 auto 4px' }}/>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{weather.wind_speed} km/h</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <CloudRain size={20} color="#0284c7" style={{ margin: '0 auto 4px' }}/>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{weather.precipitation !== undefined ? weather.precipitation : 0} mm</div>
                </div>
                <div style={{ textAlign: 'center', paddingLeft: 16, borderLeft: '1px solid #7dd3fc' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Risk Score</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: (weather.risks?.heat_stress || weather.risks?.storm_risk) ? '#dc2626' : '#0ea5e9' }}>
                    {(weather.risks?.heat_stress || weather.risks?.storm_risk) ? '85/100' : '15/100'}
                  </div>
                </div>
              </div>
            </div>
            
            {(weather.risks?.heat_stress || weather.risks?.storm_risk) && (
              <div style={{ background: '#fef2f2', padding: '12px 24px', borderTop: '1px solid #fecaca', display: 'flex', gap: 12 }}>
                {weather.risks.heat_stress && <span className="badge badge-danger"><Sun size={14} style={{marginRight: 4}}/> Heat Stress Warning</span>}
                {weather.risks.storm_risk && <span className="badge badge-danger"><CloudRain size={14} style={{marginRight: 4}}/> Storm Incoming</span>}
              </div>
            )}
          </div>
        )}

        {/* Today Forecast Widget */}
        {weather && weather.forecast?.hourly && (
            <div className="card" style={{ marginBottom: 28, padding: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Wind size={16}/> Today Forecast (24h)</div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                    {[8, 12, 16, 20, 23].map(hour => {
                        const temp = weather.forecast.hourly.temperature_2m[hour];
                        const pluie = weather.forecast.hourly.precipitation[hour];
                        return (
                            <div key={hour} style={{ flex: '0 0 auto', background: 'var(--color-bg)', padding: '10px 16px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 4 }}>{hour}:00</div>
                                <div style={{ fontSize: 16, fontWeight: 800 }}>{temp}°C</div>
                                {pluie > 0 && <div style={{ fontSize: 10, color: '#0284c7', marginTop: 2 }}>{pluie} mm</div>}
                            </div>
                        )
                    })}
                </div>
            </div>
        )}


        {/* 3D KPI Row */}
        <div className="kpi-grid">
          <ThreeTile><KPIBox icon={Building2}    value={stats?.total_farms}    label="Total Farms"        colorClass="green" /></ThreeTile>
          <ThreeTile><KPIBox icon={PawPrint}     value={stats?.total_units}    label="Animal Units"       colorClass="blue" /></ThreeTile>
          <ThreeTile><KPIBox icon={AlertTriangle} value={stats?.active_alerts}  label="Active Alerts"      colorClass="yellow" /></ThreeTile>
          <ThreeTile><KPIBox icon={AlertOctagon} value={stats?.critical_alerts} label="Critical Alerts"    colorClass="red" /></ThreeTile>
          <ThreeTile><KPIBox icon={Heart}        value={stats?.avg_health_score} label="Avg Health Score"  colorClass="green" unit="%" /></ThreeTile>
          <ThreeTile><KPIBox icon={Cpu}          value={stats?.recent_anomalies} label="Anomalies (24h)"   colorClass="teal" /></ThreeTile>
        </div>

        {/* 3D Species Overview */}
        <div style={{ marginBottom: 28 }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <h2 className="card-title" style={{ fontSize: 16 }}>Species Monitoring</h2>
            <p className="card-subtitle">Real-time status of each animal category</p>
          </div>
          <div className="species-grid">
            {['bee', 'cow', 'poultry', 'sheep', 'goat'].map(sp => {
              const count = stats?.units_by_species?.[sp] || 0;
              const accentColor = SPECIES_COLORS[sp] || 'var(--color-primary)';
              return (
                <ThreeTile key={sp}>
                  <div className="species-card" onClick={() => navigate('/animals')} style={{ cursor:'pointer', height:'100%' }}>
                    <div className="species-card-emoji">{SPECIES_EMOJI[sp]}</div>
                    <div className="species-card-label">{sp.charAt(0).toUpperCase() + sp.slice(1)}s</div>
                    <div className="species-card-count">{count} Active Units</div>
                    <div className="species-card-accent" style={{ background: accentColor }} />
                    {count > 0 && <div className="species-card-trend" style={{ background: `${accentColor}22`, color: accentColor }}>ONLINE</div>}
                  </div>
                </ThreeTile>
              );
            })}
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom:24 }}>
          {/* Recent CV Events */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Recent CV Detections</div>
                <div className="card-subtitle">Latest computer vision events</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/cv')}>View all</button>
            </div>
            {cvEvents.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Unit</th><th>Class</th><th>Confidence</th><th>Severity</th></tr></thead>
                  <tbody>
                    {cvEvents.map(ev => (
                      <tr key={ev.id}>
                        <td style={{ fontWeight:600 }}>{ev.unit_name || `Unit ${ev.unit_id}`}</td>
                        <td><code style={{ background:'var(--color-bg)', padding:'2px 6px', borderRadius:4, fontSize:11 }}>{ev.object_class}</code></td>
                        <td>{(ev.confidence * 100).toFixed(0)}%</td>
                        <td><span className={`badge badge-${ev.severity === 'critical' ? 'danger' : ev.severity === 'warning' ? 'warning' : 'info'}`}>{ev.severity}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty-state" style={{ padding:'20px 0' }}><Eye size={28} /><p>No CV events yet</p></div>}
          </div>
        </div>

        {/* Telemetry trend */}
        {recentTelemetry.length > 0 && (
          <div className="card" style={{ marginBottom:24 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Telemetry Trend (Last 48h)</div>
                <div className="card-subtitle">First monitored animal unit</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/telemetry')}>Full analysis</button>
            </div>
            <TelemetryChart records={recentTelemetry} height={220} />
          </div>
        )}

        {/* Active alerts */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Active Alerts</div>
              <div className="card-subtitle">{alerts.filter(a => !a.is_resolved).length} requiring attention</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/alerts')}>View all</button>
          </div>
          {alerts.filter(a => !a.is_resolved).length > 0
            ? alerts.filter(a => !a.is_resolved).map(a => <AlertCard key={a.id} alert={a} />)
            : <div className="empty-state" style={{ padding:'20px 0' }}><span style={{ fontSize:32 }}>✅</span><h3>No active alerts</h3><p>All clear — farm health is nominal.</p></div>
          }
        </div>
      </div>
    </>
  );
}
