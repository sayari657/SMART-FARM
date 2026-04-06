import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Filter, CloudLightning, Sun } from 'lucide-react';
import Navbar from '../components/Navbar';
import AlertCard from '../components/AlertCard';
import KPIBox from '../components/KPIBox';
import { alertsAPI, farmsAPI, externalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AlertsCenter() {
  const [alerts, setAlerts]   = useState([]);
  const [weatherRisks, setWeatherRisks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('active'); // active | critical | resolved | all
  const { user } = useAuth();

  const load = () => {
    setLoading(true);
    alertsAPI.list().then(r => {
        let baseAlerts = r.data;
        
        // Fetch weather risks for the first farm to simulate regional weather awareness
        farmsAPI.list().then(fRes => {
            if(fRes.data.length > 0) {
                externalAPI.weather.current(fRes.data[0].id)
                   .then(wRes => {
                       const risks = wRes.data?.risks;
                       setWeatherRisks(risks);
                       
                       // Generate virtual weather alerts
                       if (risks) {
                           if (risks.heat_stress) baseAlerts.unshift({ id: 'w1', title: 'Severe Heat Stress Warning', description: 'Metereological temperature crossed 35°C threshold. Danger to livestock detected.', severity: 'critical', entity_type: 'Farm Environment', entity_id: fRes.data[0].id, timestamp: new Date().toISOString(), is_resolved: false });
                           if (risks.storm_risk) baseAlerts.unshift({ id: 'w2', title: 'Severe Wind/Storm Warning', description: 'Wind speed exceeded safe threshold. Secure outdoor assets.', severity: 'critical', entity_type: 'Farm Environment', entity_id: fRes.data[0].id, timestamp: new Date().toISOString(), is_resolved: false });
                           if (risks.cold_stress) baseAlerts.unshift({ id: 'w3', title: 'Cold Stress Warning', description: 'Temperatures dropping below safe levels for young livestock.', severity: 'warning', entity_type: 'Farm Environment', entity_id: fRes.data[0].id, timestamp: new Date().toISOString(), is_resolved: false });
                       }
                       setAlerts([...baseAlerts]);
                   })
                   .catch(() => setAlerts([...baseAlerts]));
            } else {
                setAlerts([...baseAlerts]);
            }
        }).catch(() => setAlerts([...baseAlerts]));
    }).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const resolve = async (id) => {
    await alertsAPI.resolve(id, user?.username || 'manager');
    load();
  };

  const counts = {
    active:   alerts.filter(a=>!a.is_resolved).length,
    critical: alerts.filter(a=>!a.is_resolved&&a.severity==='critical').length,
    warning:  alerts.filter(a=>!a.is_resolved&&a.severity==='warning').length,
    resolved: alerts.filter(a=>a.is_resolved).length,
  };

  const FILTERS = [
    { id:'active',   label:`Active (${counts.active})` },
    { id:'critical', label:`Critical (${counts.critical})` },
    { id:'resolved', label:`Resolved (${counts.resolved})` },
    { id:'all',      label:`All (${alerts.length})` },
  ];

  const filtered = alerts.filter(a => {
    if (filter === 'active')   return !a.is_resolved;
    if (filter === 'critical') return !a.is_resolved && a.severity === 'critical';
    if (filter === 'resolved') return a.is_resolved;
    return true;
  });

  return (
    <>
      <Navbar title="Alerts Center" subtitle="Monitor and resolve farm alerts" />
      <div className="page-content">

        <div className="kpi-grid" style={{ marginBottom:24 }}>
          <KPIBox icon={AlertTriangle} value={counts.active}   label="Active Alerts"   colorClass="yellow" />
          <KPIBox icon={AlertTriangle} value={counts.critical} label="Critical Alerts"  colorClass="red" />
          <KPIBox icon={AlertTriangle} value={counts.warning}  label="Warning Alerts"  colorClass="yellow" />
          <KPIBox icon={CheckCircle2} value={counts.resolved}  label="Resolved Today"  colorClass="green" />
        </div>

        {weatherRisks && (weatherRisks.heat_stress || weatherRisks.storm_risk || weatherRisks.cold_stress) && (
           <div className="card" style={{ marginBottom: 20, background: '#fef2f2', border: '1px solid #fecaca' }}>
               <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                   <div style={{ color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                       <CloudLightning size={18}/> Global Weather Hazards Detected
                   </div>
                   {weatherRisks.heat_stress && <div style={{ fontSize: 13, background: 'white', padding: '8px 12px', borderRadius: 4, display: 'inline-block', border: '1px solid #fee2e2' }}><Sun size={14} style={{ color: '#dc2626', marginRight: 6 }}/><b>Heat Stress</b> implies dangerous temperatures for livestock operations.</div>}
                   {weatherRisks.storm_risk && <div style={{ fontSize: 13, background: 'white', padding: '8px 12px', borderRadius: 4, display: 'inline-block', border: '1px solid #fee2e2' }}><CloudLightning size={14} style={{ color: '#dc2626', marginRight: 6 }}/><b>Storm/Wind Warning</b> implies high risk for outdoor units.</div>}
                   {weatherRisks.cold_stress && <div style={{ fontSize: 13, background: 'white', padding: '8px 12px', borderRadius: 4, display: 'inline-block', border: '1px solid #fee2e2' }}><b>Cold Stress Warning</b> detected for young animals.</div>}
               </div>
           </div>
        )}

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--color-border)' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ background:'none', border:'none', padding:'10px 16px', cursor:'pointer', fontSize:13,
                fontWeight: filter===f.id ? 700 : 500,
                color: filter===f.id ? 'var(--color-primary)' : 'var(--color-text-2)',
                borderBottom: filter===f.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom:-1 }}>
              {f.label}
            </button>
          ))}
        </div>

        {loading && <div className="spinner" />}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <span style={{ fontSize:40 }}>✅</span>
            <h3>{filter === 'resolved' ? 'No resolved alerts' : 'No active alerts'}</h3>
            <p>Everything looks good!</p>
          </div>
        )}
        <div>
          {filtered.map(a => (
            <AlertCard key={a.id} alert={a} onResolve={!a.is_resolved ? resolve : null} />
          ))}
        </div>
      </div>
    </>
  );
}
