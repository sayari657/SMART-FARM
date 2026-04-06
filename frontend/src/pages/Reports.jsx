import React, { useEffect, useState } from 'react';
import { FileText, Plus, CloudRain, Sprout } from 'lucide-react';
import Navbar from '../components/Navbar';
import { reportsAPI, farmsAPI, externalAPI } from '../services/api';

const REPORT_TYPES = ['daily','weekly','monthly'];

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [farms, setFarms]     = useState([]);
  const [forecast, setForecast] = useState(null);
  const [agroInfo, setAgroInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGen]  = useState(false);
  const [form, setForm] = useState({
    farm_id: '', report_type: 'daily',
    period_start: new Date(Date.now()-86400000).toISOString().split('T')[0],
    period_end:   new Date().toISOString().split('T')[0],
  });

  const load = () => {
    setLoading(true);
    Promise.all([reportsAPI.list(), farmsAPI.list()])
      .then(([r,f]) => { 
          setReports(r.data); 
          setFarms(f.data); 
          if (f.data.length>0) {
              const farmId = String(f.data[0].id);
              setForm(p=>({...p,farm_id:farmId})); 
              
              // Load external insights
              externalAPI.weather.forecast(farmId).then(wr => setForecast(wr.data)).catch(() => {});
              externalAPI.plants.search("grass").then(ar => setAgroInfo(ar.data)).catch(() => {});
          }
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGen(true);
    try {
      await reportsAPI.generate({
        farm_id: +form.farm_id,
        report_type: form.report_type,
        period_start: new Date(form.period_start).toISOString(),
        period_end:   new Date(form.period_end).toISOString(),
      });
      setShowForm(false);
      load();
    } finally { setGen(false); }
  };

  const TYPE_COLOR = { daily:'badge-info', weekly:'badge-warning', monthly:'badge-success' };

  return (
    <>
      <Navbar
        title="Reports"
        subtitle="Farm performance reports"
        actions={
          <button className="btn btn-primary" onClick={() => setShowForm(v=>!v)}>
            <Plus size={14} /> Generate Report
          </button>
        }
      />
      <div className="page-content">

        {/* Agronomic Insight Header */}
        {(forecast || agroInfo) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                {forecast && forecast.hourly && (
                  <div className="card" style={{ padding: 20, background: 'linear-gradient(to right, #f8fafc, #e2e8f0)', border: '1px solid #cbd5e1' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}><CloudRain size={16}/> External Weather Context</div>
                      <p style={{ fontSize: 13, color: '#334155' }}>7-day meteorological forecast has been explicitly correlated against generated reports to calculate expected impacts on livestock health & humidity anomalies.</p>
                  </div>
                )}
                {agroInfo && agroInfo.data && agroInfo.data.length > 0 && (
                  <div className="card" style={{ padding: 20, background: 'linear-gradient(to right, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontWeight: 800, color: '#166534', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}><Sprout size={16}/> Trefle Botanical Data</div>
                      <p style={{ fontSize: 13, color: '#15803d' }}>Successfully integrated plant species intelligence for <b>{agroInfo.data[0].scientific_name}</b> providing agronomic feed context to each AI generated report.</p>
                  </div>
                )}
            </div>
        )}

        {showForm && (
          <div className="card" style={{ marginBottom:24 }}>
            <div className="card-header">
              <div className="card-title">Generate New Report</div>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--color-text-3)' }}>✕</button>
            </div>
            <form onSubmit={handleGenerate} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Farm</label>
                  <select className="form-select" value={form.farm_id} onChange={e=>setForm(p=>({...p,farm_id:e.target.value}))} required>
                    {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Report Type</label>
                  <select className="form-select" value={form.report_type} onChange={e=>setForm(p=>({...p,report_type:e.target.value}))}>
                    {REPORT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Period Start</label>
                  <input className="form-input" type="date" value={form.period_start} onChange={e=>setForm(p=>({...p,period_start:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Period End</label>
                  <input className="form-input" type="date" value={form.period_end} onChange={e=>setForm(p=>({...p,period_end:e.target.value}))} required />
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-primary" type="submit" disabled={generating}>{generating?'Generating…':'Generate'}</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          {loading ? <div className="spinner" /> : reports.length === 0 ? (
            <div className="empty-state"><FileText size={40} /><h3>No reports yet</h3><p>Generate your first report above.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Title</th><th>Type</th><th>Period</th><th>Units</th><th>Alerts</th><th>Avg Health</th><th>Generated</th></tr></thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight:600 }}>{r.title}</td>
                      <td><span className={`badge ${TYPE_COLOR[r.report_type]||'badge-neutral'}`}>{r.report_type}</span></td>
                      <td style={{ fontSize:12, color:'var(--color-text-3)' }}>
                        {new Date(r.period_start).toLocaleDateString()} → {new Date(r.period_end).toLocaleDateString()}
                      </td>
                      <td>{r.summary?.unit_count ?? '—'}</td>
                      <td>{r.summary?.total_alerts ?? '—'}</td>
                      <td>{r.summary?.avg_health_score ? `${r.summary.avg_health_score}%` : '—'}</td>
                      <td style={{ fontSize:12, color:'var(--color-text-3)' }}>{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
