import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import RecommendationPanel from '../components/RecommendationPanel';
import KPIBox from '../components/KPIBox';
import { recsAPI, farmsAPI, externalAPI } from '../services/api';
import { Lightbulb, Sprout } from 'lucide-react';

const URGENCY_LEVELS = ['all','critical','high','medium','low'];

export default function Recommendations() {
  const [recs, setRecs]     = useState([]);
  const [advancedRecs, setAdvancedRecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    recsAPI.list().then(r => setRecs(r.data)).finally(() => setLoading(false));

    // Fetch Advanced Agronomic & Weather guidance
    farmsAPI.list().then(fRes => {
        if(fRes.data.length > 0) {
            // we use 'wheat' or 'grass' as an example forage crop for the Trefle API demo
            externalAPI.recommendations.getFarmAdvice(fRes.data[0].id, 'grass')
                .then(res => setAdvancedRecs(res.data))
                .catch(() => {});
        }
    });
  }, []);

  const counts = Object.fromEntries(
    URGENCY_LEVELS.filter(l=>l!=='all').map(l => [l, recs.filter(r=>r.urgency_level===l).length])
  );

  const filtered = filter === 'all' ? recs : recs.filter(r => r.urgency_level === filter);

  return (
    <>
      <Navbar title="Recommendations" subtitle="AI-generated actionable insights" />
      <div className="page-content">

        <div className="kpi-grid" style={{ marginBottom:24 }}>
          <KPIBox icon={Lightbulb} value={recs.length}           label="Total Recommendations" colorClass="blue" />
          <KPIBox icon={Lightbulb} value={counts.critical||0}    label="Critical Actions"       colorClass="red" />
          <KPIBox icon={Lightbulb} value={counts.high||0}        label="High Priority"          colorClass="yellow" />
          <KPIBox icon={Lightbulb} value={recs.filter(r=>r.is_actioned).length} label="Actioned" colorClass="green" />
        </div>

        {advancedRecs && advancedRecs.recommendations?.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <h2 className="card-title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sprout size={18} color="var(--color-primary)" /> Agronomic & Weather Intelligence
              </h2>
              <p className="card-subtitle">Powered by Open-Meteo & Trefle.io integrations</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {advancedRecs.recommendations.map((ar, idx) => (
                <div key={idx} className="card" style={{ padding: 16, borderLeft: '4px solid var(--color-primary)' }}>
                   <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{ar.title}</div>
                   <div style={{ fontSize: 13, marginBottom: 8 }}>{ar.action}</div>
                   <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>Reason: {ar.reason}</div>
                   <div style={{ fontSize: 11, background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: 10, textTransform: 'uppercase', fontWeight: 600 }}>{ar.type} Layer</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {URGENCY_LEVELS.map(l => (
            <button key={l} onClick={() => setFilter(l)}
              className="btn btn-sm"
              style={{ background: filter===l ? 'var(--color-primary)' : 'var(--color-surface)',
                       color: filter===l ? 'white' : 'var(--color-text-2)',
                       border:'1px solid var(--color-border)' }}>
              {l.charAt(0).toUpperCase()+l.slice(1)}{l!=='all' ? ` (${counts[l]||0})` : ''}
            </button>
          ))}
        </div>

        {loading && <div className="spinner" />}
        {!loading && filtered.length === 0 && (
          <div className="empty-state"><Lightbulb size={40} /><h3>No recommendations</h3><p>The AI engine has no pending recommendations.</p></div>
        )}
        {filtered.map(r => <RecommendationPanel key={r.id} rec={r} />)}
      </div>
    </>
  );
}
