import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  return (
    <div>
      <header className="page-header">
        <h1><BarChart3 color="var(--primary-color)" size={32} /> Farm Analytics</h1>
      </header>
      <div className="panel">
        <div className="panel-header">30-Day Anomaly Correlation</div>
        <p style={{color: 'var(--text-muted)'}}>Historical time-series correlation graphs and anomaly distribution charts will render here leveraging the `pandas` worker layer.</p>
        
        <div style={{marginTop: '2rem', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-light)', borderRadius: '8px'}}>
          [Analytics Graph Container - Awaiting Data Sync]
        </div>
      </div>
    </div>
  );
}
