import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Layers, AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import AnimalCard from '../components/AnimalCard';
import AlertCard from '../components/AlertCard';
import { farmsAPI, animalsAPI, alertsAPI } from '../services/api';

export default function FarmDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [farm, setFarm]     = useState(null);
  const [units, setUnits]   = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('units');

  useEffect(() => {
    Promise.all([
      farmsAPI.get(id),
      animalsAPI.list({ farm_id: id }),
      alertsAPI.list(),
    ]).then(([fRes, uRes, aRes]) => {
      setFarm(fRes.data);
      setUnits(uRes.data);
      // Filter alerts belonging to this farm's units
      const unitIds = new Set(uRes.data.map(u => u.id));
      setAlerts(aRes.data.filter(a => unitIds.has(a.unit_id)));
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-content"><div className="spinner" /></div>;
  if (!farm)   return <div className="page-content"><p style={{color:'var(--color-critical)'}}>Farm not found</p></div>;

  const TABS = [
    { id:'units',  label:`Animal Units (${units.length})` },
    { id:'alerts', label:`Alerts (${alerts.filter(a=>!a.is_resolved).length})` },
    { id:'info',   label:'Farm Info' },
  ];

  return (
    <>
      <Navbar
        title={farm.name}
        subtitle={farm.location}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/farms')}>
            <ArrowLeft size={13} /> Back
          </button>
        }
      />
      <div className="page-content">

        {/* Stats banner */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:24 }}>
          {[
            { label:'Animal Units',   value: farm.unit_count,        icon:'🐾' },
            { label:'Active Alerts',  value: farm.active_alerts,     icon:'⚠️', danger: farm.active_alerts > 0 },
            { label:'Avg Health',     value: farm.avg_health_score ? `${farm.avg_health_score}%` : '—', icon:'❤️' },
            { label:'Area',           value: farm.total_area_ha ? `${farm.total_area_ha} ha` : '—', icon:'🌿' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign:'center', padding:'16px 12px' }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontWeight:800, fontSize:22, color: s.danger ? 'var(--color-critical)' : 'var(--color-text)' }}>{s.value ?? '—'}</div>
              <div style={{ fontSize:11, color:'var(--color-text-3)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--color-border)', paddingBottom:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background:'none', border:'none', padding:'10px 16px', cursor:'pointer', fontSize:13,
                fontWeight: tab===t.id ? 700 : 500,
                color: tab===t.id ? 'var(--color-primary)' : 'var(--color-text-2)',
                borderBottom: tab===t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom:-1,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'units' && (
          units.length > 0
            ? <div className="grid-auto">{units.map(u => <AnimalCard key={u.id} unit={u} />)}</div>
            : <div className="empty-state"><span style={{fontSize:40}}>🐾</span><h3>No animal units</h3><p>Add animal units from the Animals page.</p></div>
        )}

        {tab === 'alerts' && (
          <div>
            {alerts.filter(a=>!a.is_resolved).length > 0
              ? alerts.filter(a=>!a.is_resolved).map(a => <AlertCard key={a.id} alert={a} />)
              : <div className="empty-state"><span style={{fontSize:32}}>✅</span><h3>No active alerts</h3></div>
            }
          </div>
        )}

        {tab === 'info' && (
          <div className="card" style={{ maxWidth:520 }}>
            {[
              ['Name', farm.name],
              ['Location', farm.location || '—'],
              ['Status', farm.status],
              ['Total Area', farm.total_area_ha ? `${farm.total_area_ha} ha` : '—'],
              ['Description', farm.description || '—'],
              ['Created', new Date(farm.created_at).toLocaleDateString()],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--color-border-light)' }}>
                <span style={{ fontSize:13, color:'var(--color-text-3)', fontWeight:600 }}>{k}</span>
                <span style={{ fontSize:13, fontWeight:500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
