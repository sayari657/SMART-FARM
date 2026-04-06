import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/hives/1/alerts')
      .then(res => res.json())
      .then(data => setAlerts(data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <header className="page-header">
        <h1><ShieldAlert color="var(--primary-color)" size={32} /> Alert Intelligence Center</h1>
      </header>
      
      <div className="panel">
        <table className="table-custom">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Severity</th>
              <th>AI Priority</th>
              <th>System Message & Deep Analysis</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? <tr><td colSpan="4">No Records Found</td></tr> : null}
            {alerts.map((a,i) => (
              <tr key={i}>
                <td>{a.timestamp ? new Date(a.timestamp).toLocaleString() : 'Just now'}</td>
                <td style={{color: a.alert_type === 'CRITICAL' ? 'var(--critical)' : 'var(--warning)', fontWeight: 'bold'}}>{a.alert_type}</td>
                <td><span style={{padding: '4px 8px', background: '#eee', borderRadius: '4px', fontSize: '0.8rem'}}>{a.priority || 'LOW'}</span></td>
                <td>
                  <strong>{a.message}</strong>
                  {a.root_cause && <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px'}}>Cause: {a.root_cause}</div>}
                  {a.suggested_action && <div style={{fontSize: '0.85rem', color: 'var(--success)', marginTop: '2px'}}>Action: {a.suggested_action}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
