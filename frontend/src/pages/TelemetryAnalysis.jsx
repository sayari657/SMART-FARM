import React, { useEffect, useState } from 'react';
import { Search, Thermometer, CloudRain, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import TelemetryChart from '../components/TelemetryChart';
import { animalsAPI, telemetryAPI, externalAPI } from '../services/api';

export default function TelemetryAnalysis() {
  const { t, i18n } = useTranslation();
  const [units, setUnits]     = useState([]);
  const [selectedId, setSelId] = useState('');
  const [records, setRecords] = useState([]);
  const [latest, setLatest]   = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unit, setUnit]       = useState(null);

  useEffect(() => {
    animalsAPI.list().then(r => { setUnits(r.data); if (r.data.length > 0) setSelId(String(r.data[0].id)); });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    const found = units.find(u => String(u.id) === selectedId);
    setUnit(found || null);
    
    Promise.all([telemetryAPI.history(selectedId, 200), telemetryAPI.latest(selectedId)])
      .then(([h, l]) => { 
          setRecords(h.data); 
          setLatest(l.data); 
          if(found && found.farm_id) {
             externalAPI.weather.current(found.farm_id).then(wr => setWeather(wr.data)).catch(console.error);
          }
      })
      .finally(() => setLoading(false));
  }, [selectedId, units]);

  const SPECIES_METRICS = {
    bee: ['temperature','humidity','hive_weight','sound_level'],
    cow: ['body_temperature','activity','rumination','milk_yield'],
    poultry: ['coop_temperature','humidity','ammonia','sound_level','bird_count'],
    default: [],
  };
  const metrics = SPECIES_METRICS[unit?.species] || SPECIES_METRICS.default;

  const renderComparison = () => {
    if (!latest || !latest.metrics || !weather) return null;
    
    const iotTemp = latest.metrics.temperature || latest.metrics.body_temperature || latest.metrics.coop_temperature;
    const extTemp = weather.temperature;
    const isAnomalous = iotTemp && extTemp && Math.abs(iotTemp - extTemp) > 15;

    return (
      <div className="card" style={{ marginBottom: 24, background: isAnomalous ? '#fef2f2' : 'var(--color-surface)', border: isAnomalous ? '1px solid #fecaca' : '' }}>
        <div className="card-header"><div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Climate Intelligence {isAnomalous && <AlertTriangle color="#dc2626" size={16}/>}</div></div>
        <div style={{ display: 'flex', gap: 40, padding: 20 }}>
            <div>
               <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 4 }}><Thermometer size={12}/> {t('telemetry.real_time')} (IoT)</div>
               <div style={{ fontSize: 28, fontWeight: 800 }}>{iotTemp ? `${iotTemp.toFixed(1)}°C` : 'N/A'}</div>
            </div>
            <div>
               <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, marginBottom: 4 }}><CloudRain size={12}/> Open-Meteo Outdoors</div>
               <div style={{ fontSize: 28, fontWeight: 800, color: '#0369a1' }}>{extTemp}°C</div>
            </div>
        </div>
        {isAnomalous && <p style={{ margin: '0 20px 20px', color: '#dc2626', fontSize: 13, fontWeight: 500 }}>High disparity detected.</p>}
      </div>
    );
  };

  return (
    <>
      <Navbar title={t('telemetry.title')} subtitle={t('telemetry.subtitle')} />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>

        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:24 }}>
          <label className="form-label" style={{ margin:0, whiteSpace:'nowrap' }}>{t('common.actions')}:</label>
          <select className="form-select" style={{ maxWidth:300 }} value={selectedId} onChange={e => setSelId(e.target.value)}>
            {units.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.species} · {u.farm_name})</option>
            ))}
          </select>
        </div>

        {renderComparison()}

        {unit && latest?.metrics && (
          <div className="kpi-grid" style={{ marginBottom:24 }}>
            {Object.entries(latest.metrics).map(([k,v]) => (
              <div key={k} className="card" style={{ padding:'16px 18px' }}>
                <div style={{ fontSize:11, color:'var(--color-text-3)', fontWeight:600, marginBottom:6, textTransform:'capitalize' }}>
                  {k.replace(/_/g,' ')}
                </div>
                <div style={{ fontWeight:800, fontSize:24 }}>{typeof v === 'number' ? v.toFixed(1) : v}</div>
                <div style={{ fontSize:11, color:'var(--color-text-3)', marginTop:2 }}>{t('telemetry.real_time')}</div>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">{t('telemetry.history')}</div>
              <div className="card-subtitle">{records.length} records</div>
            </div>
          </div>
          {loading ? <div className="spinner" /> : <TelemetryChart records={records} metrics={metrics} height={320} />}
        </div>

        {records.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">{t('telemetry.history')}</div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    {Object.keys(records[0]?.metrics || {}).map(k => <th key={k}>{k.replace(/_/g,' ')}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 20).map(r => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace:'nowrap', fontSize:12 }}>{new Date(r.timestamp).toLocaleString()}</td>
                      {Object.values(r.metrics).map((v,i) => (
                        <td key={i} style={{ fontWeight:500 }}>{typeof v === 'number' ? v.toFixed(2) : v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
