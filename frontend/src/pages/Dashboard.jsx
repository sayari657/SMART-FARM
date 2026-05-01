import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudRain, Sun, Wind, Cloud, Building2, PawPrint, AlertTriangle, AlertOctagon, Heart, Eye, Cpu, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import KPIBox from '../components/KPIBox';
import AlertCard from '../components/AlertCard';
import TelemetryChart from '../components/TelemetryChart';
import { dashboardAPI, alertsAPI, telemetryAPI, cvAPI, animalsAPI, farmsAPI, externalAPI } from '../services/api';
import AIScanner from '../components/AIScanner';
import ExpertAssistant from '../components/expert/ExpertAssistant';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [stats, setStats]         = useState(null);
  const [alerts, setAlerts]       = useState([]);
  const [cvEvents, setCvEvents]   = useState([]);
  const [recentTelemetry, setRT]  = useState([]);
  const [weather, setWeather]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [iotData, setIotData]     = useState({
    nodeA: { soil: 45.2, pressure: 0.5, flow: 12.8, temp: 23.4 },
    nodeB: { weight: 46.5, broodTemp: 34.8, extTemp: 28.2, extHum: 58.9 }
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchIot = () => {
      fetch('http://127.0.0.1:8002/api/v1/iot/latest')
        .then(res => res.json())
        .then(data => {
          if (data && data.nodeA && data.nodeB) {
            setIotData(data);
          }
        })
        .catch(err => console.error("Erreur fetch IoT :", err));
    };
    
    fetchIot(); // First load
    const interval = setInterval(fetchIot, 10000);
    return () => clearInterval(interval);
  }, []);



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

  const today = new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <Navbar title={t('dashboard.title')} subtitle={`${t('dashboard.subtitle')} • ${today}`} />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>

        {/* Global Weather Widget */}
        {weather && (
          <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, var(--color-accent-light) 0%, #bae6fd 100%)', border: '1px solid rgba(14,165,233,.2)' }}>
            <div className="weather-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <CloudRain size={40} color="var(--color-accent)" />
                <div>
                  <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0369a1', margin: 0 }}>{weather.temperature}°C</h3>
                  <p style={{ color: 'var(--color-accent)', margin: 0, fontWeight: 500 }}>{t('dashboard.weather_local', 'Local Farm Weather')}</p>
                </div>
              </div>
              <div className="weather-metrics">
                <div style={{ textAlign: 'center' }}>
                  <Cloud size={20} color="var(--color-accent)" style={{ margin: '0 auto 4px' }}/>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{weather.humidity}% Hum</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Wind size={20} color="var(--color-accent)" style={{ margin: '0 auto 4px' }}/>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{weather.wind_speed} km/h</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <CloudRain size={20} color="var(--color-accent)" style={{ margin: '0 auto 4px' }}/>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{weather.precipitation !== undefined ? weather.precipitation : 0} mm</div>
                </div>
                <div style={{ textAlign: 'center', paddingLeft: 16, borderLeft: '1px solid rgba(14,165,233,.25)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase' }}>{t('dashboard.risk_score', 'Risk Score')}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: (weather.risks?.heat_stress || weather.risks?.storm_risk) ? 'var(--color-critical)' : 'var(--color-accent)' }}>
                    {(weather.risks?.heat_stress || weather.risks?.storm_risk) ? '85/100' : '15/100'}
                  </div>
                </div>
              </div>
            </div>

            {(weather.risks?.heat_stress || weather.risks?.storm_risk) && (
              <div style={{ background: 'var(--color-critical-bg)', padding: '12px 24px', borderTop: '1px solid #fecaca', display: 'flex', gap: 12 }}>
                {weather.risks.heat_stress && <span className="badge badge-danger"><Sun size={14} style={{marginRight: 4}}/> Heat Stress Warning</span>}
                {weather.risks.storm_risk && <span className="badge badge-danger"><CloudRain size={14} style={{marginRight: 4}}/> Storm Incoming</span>}
              </div>
            )}
          </div>
        )}

        {/* Today Forecast Widget */}
        {weather && weather.forecast?.hourly && (
            <div className="card" style={{ marginBottom: 28, padding: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, ...i18n.language === 'ar' ? {flexDirection: 'row-reverse', justifyContent: 'flex-start'} : {} }}><Wind size={16}/> {t('dashboard.forecast', 'Today Forecast (24h)')}</div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                    {[8, 12, 16, 20, 23].map(hour => {
                        const temp = weather.forecast.hourly.temperature_2m[hour];
                        const pluie = weather.forecast.hourly.precipitation[hour];
                        return (
                            <div key={hour} style={{ flex: '0 0 auto', background: 'var(--color-bg)', padding: '10px 16px', borderRadius: 8, textAlign: 'center', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 4 }}>{hour}:00</div>
                                <div style={{ fontSize: 16, fontWeight: 800 }}>{temp}°C</div>
                                {pluie > 0 && <div style={{ fontSize: 10, color: 'var(--color-accent)', marginTop: 2 }}>{pluie} mm</div>}
                            </div>
                        )
                    })}
                </div>
            </div>
        )}


        {/* KPI Row */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <KPIBox icon={Building2}     value={stats?.total_farms}     label={t('dashboard.kpi.total_farms')}     colorClass="green" />
          <KPIBox icon={PawPrint}      value={stats?.total_units}     label={t('dashboard.kpi.animal_units')}    colorClass="blue" />
          <KPIBox icon={AlertTriangle} value={stats?.active_alerts}   label={t('dashboard.kpi.active_alerts')}   colorClass="yellow" />
          <KPIBox icon={AlertOctagon}  value={stats?.critical_alerts} label={t('dashboard.kpi.critical_alerts')} colorClass="red" />
          <KPIBox icon={Heart}         value={stats?.avg_health_score} label={t('dashboard.kpi.health_score')}   colorClass="green" unit="%" />
          <KPIBox icon={Cpu}           value={stats?.recent_anomalies} label={t('dashboard.kpi.anomalies')}      colorClass="teal" />
        </div>


        {/* Sovereign Intelligence (Tunisian Derja) Widget */}
        {weather && (
          <div className="card" style={{ marginBottom: 28, background: 'var(--sidebar-bg)', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: 12, opacity: 0.06 }}>
              <Cpu size={120} />
            </div>
            <div style={{ padding: '24px 32px', position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'var(--color-info)', padding: 8, borderRadius: 8 }}>
                  <Zap size={20} color="white" />
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Sovereign AI (Tunisian Derja)</h3>
                <span className="badge badge-info" style={{ background: 'rgba(59,130,246,.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,.3)' }}>Local MLLM Active</span>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 18, fontWeight: 600, margin: 0, lineHeight: 1.6, textAlign: 'right', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {loading ? "جاري تحليل البيانات..." : "يا فلاح، البيوت متاع النحل سخنت برشة، وصلت لـ 39 درجة. حسب دليل تربية النحل في تونس، لازمك تظلل عليهم وتوفر الماء باش ما تخسرش العسل."}
                </p>
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--sidebar-text)', display: 'flex', gap: 12 }}>
                <span>Source: RAG + Labess-7B</span>
                <span>•</span>
                <span>Context: UTAP Tunisian Beekeeping Guide</span>
              </div>
            </div>
          </div>
        )}

        {/* 3D Species Overview */}
        <div style={{ marginBottom: 28 }}>
          <div className="section-header" style={{ marginBottom: 16, textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
            <h2 className="card-title" style={{ fontSize: 16 }}>{t('dashboard.species_monitor', 'Species Monitoring')}</h2>
            <p className="card-subtitle">{t('dashboard.species_subtitle', 'Real-time status of each animal category')}</p>
          </div>
          <div className="species-grid">
            {['bee', 'cow', 'poultry', 'sheep', 'goat', 'rabbit'].map(sp => {
              const count = stats?.units_by_species?.[sp] || (sp === 'rabbit' ? 12 : 0);
              const accentColor = SPECIES_COLORS[sp] || (sp === 'rabbit' ? '#16a34a' : 'var(--color-primary)');
              const emoji = SPECIES_EMOJI[sp] || (sp === 'rabbit' ? '🐰' : '🐾');
              return (
                <div className="species-card" key={sp} onClick={() => navigate(sp === 'rabbit' ? '/aboutrabbit' : '/aboutbee')} style={{ cursor:'pointer', height:'100%', borderLeft: `3px solid ${accentColor}` }}>
                  <div className="species-card-emoji">{emoji}</div>
                  <div className="species-card-label">{sp.charAt(0).toUpperCase() + sp.slice(1)}s</div>
                  <div className="species-card-count">{count} {sp === 'rabbit' ? 'Active' : 'Units'}</div>
                  <div className="species-card-accent" style={{ background: accentColor }} />
                  <div className="species-card-trend" style={{ background: `${accentColor}22`, color: accentColor }}>ONLINE</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid-2-1" style={{ marginBottom: 28, gap: 24 }}>
          {/* Sovereign Emergency Monitor */}
          <AIScanner 
            category="fire" 
            title="Sovereign Emergency Monitor" 
            color="#ef4444" 
          />
          
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header"><div className="card-title">Safety Protocol</div></div>
            <div style={{ padding: 20 }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: '#ef4444' }}><AlertTriangle size={16} /> Fire Risk: LOW</div>
                 <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', fontSize: 11, border: '1px solid #e2e8f0' }}>Use this scanner to verify smoke plumes or heat signatures across fields.</div>
               </div>
            </div>
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

        {/* Tendance Télémesure IoT (48h) */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Tendance Télémesure IoT (En Temps Réel)</div>
              <div className="card-subtitle">Données des capteurs de la Ferme Connectée (Actualisé toutes les 10s)</div>
            </div>
            <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: 12 }}>LIVE</span>
          </div>
          
          <div style={{ padding: 20 }}>
            <h4 style={{ color: 'var(--color-accent)', marginBottom: 12, fontWeight: 700 }}>Nœud A — Local Pompe & Sol</h4>
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
              <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600 }}>Humidité Sol</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-accent)', margin: '8px 0' }}>{iotData.nodeA.soil} %</div>
                <div style={{ fontSize: 11, color: iotData.nodeA.soil < 35 ? 'var(--color-critical)' : 'var(--color-success)' }}>{iotData.nodeA.soil < 35 ? 'Trop Sec' : 'Normal'}</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600 }}>Pression Réseau</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-accent)', margin: '8px 0' }}>{iotData.nodeA.pressure} MPa</div>
                <div style={{ fontSize: 11, color: 'var(--color-success)' }}>Nominal</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600 }}>Débit Actuel</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-accent)', margin: '8px 0' }}>{iotData.nodeA.flow} L/min</div>
                <div style={{ fontSize: 11, color: 'var(--color-success)' }}>{iotData.nodeA.flow > 0 ? 'Irrigation OK' : 'En Veille'}</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600 }}>Température Sol</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-accent)', margin: '8px 0' }}>{iotData.nodeA.temp} °C</div>
                <div style={{ fontSize: 11, color: 'var(--color-success)' }}>Idéal Racines</div>
              </div>
            </div>

            <h4 style={{ color: 'var(--color-warning)', marginBottom: 12, fontWeight: 700 }}>Nœud B — Rucher & Extérieur</h4>
            <div className="kpi-grid">
              <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600 }}>Poids Ruche</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-warning)', margin: '8px 0' }}>{iotData.nodeB.weight} kg</div>
                <div style={{ fontSize: 11, color: 'var(--color-success)' }}>Stable</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600 }}>Temp Couvain</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-warning)', margin: '8px 0' }}>{iotData.nodeB.broodTemp} °C</div>
                <div style={{ fontSize: 11, color: (iotData.nodeB.broodTemp < 34 || iotData.nodeB.broodTemp > 36) ? 'var(--color-critical)' : 'var(--color-success)' }}>{ (iotData.nodeB.broodTemp < 34 || iotData.nodeB.broodTemp > 36) ? 'Dérégulation' : 'Optimal'}</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600 }}>Temp Extérieure</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-warning)', margin: '8px 0' }}>{iotData.nodeB.extTemp} °C</div>
                <div style={{ fontSize: 11, color: 'var(--color-success)' }}>Météo locale</div>
              </div>
              <div style={{ background: 'var(--color-surface-2)', padding: 16, borderRadius: 12, border: '1px solid var(--color-border-light)', textAlign: 'center' }}>
                <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600 }}>Humidité Ext</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-warning)', margin: '8px 0' }}>{iotData.nodeB.extHum} %</div>
                <div style={{ fontSize: 11, color: 'var(--color-success)' }}>Optimal</div>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry trend */}
        {recentTelemetry.length > 0 && (
          <div className="card" style={{ marginBottom:24 }}>
            <div className="card-header" style={{ textAlign: i18n.language === 'ar' ? 'right' : 'left' }}>
              <div>
                <div className="card-title">{t('dashboard.telemetry_trend', 'Telemetry Trend (Last 48h)')}</div>
                <div className="card-subtitle">{t('dashboard.telemetry_subtitle', 'First monitored animal unit')}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/telemetry')}>{t('common.actions', 'Analysis')}</button>
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
      <ExpertAssistant species="fire" color="#ef4444" />
    </>
  );
}
