import React, { useState, useEffect } from 'react';
import { Database, AlertTriangle } from 'lucide-react';
import { alertsAPI } from '../services/api';

export default function HiveIntel() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    alertsAPI.critical()
      .then(res => setAlerts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAlerts([]));
  }, []);

  return (
    <div>
      <header className="page-header">
        <h1><Database color="var(--primary-color)" size={32} /> Hive Intelligence</h1>
      </header>

      <div className="dashboard-grid">
        <div className="panel" style={{gridColumn: 'span 2'}}>
          <div className="panel-header">Explainable AI & Smart Recommendations</div>
          <p style={{marginBottom: '1rem', color: 'var(--text-muted)'}}>
            This section renders deep-learning and heuristic outputs explaining <strong>WHY</strong> the AI flagged an anomaly.
          </p>
          
          {alerts.filter(a => a.root_cause).length === 0 ? <p style={{fontWeight: '500'}}>Awaiting AI analysis...</p> : null}
          {alerts.filter(a => a.root_cause).map((a, i) => (
            <div key={i} style={{marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)'}}>
              <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--critical)'}}>
                <AlertTriangle /> {a.alert_type} FLAG
              </h3>
              
              <div className="ai-reason">
                <strong>Model Reasoning (Root Cause):</strong> {a.root_cause}
              </div>
              
              <div className="ai-recommendation">
                <strong>Recommended Action:</strong> {a.suggested_action}
                <div style={{marginTop: '0.5rem', display: 'flex', gap: '2rem'}}>
                  <div><strong style={{color: 'var(--critical)'}}>Impact:</strong> {a.impact}</div>
                  <div><strong>Priority:</strong> {a.priority}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
