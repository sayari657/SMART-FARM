import React from 'react';
import { TrendingUp, Activity } from 'lucide-react';

export default function Predictions() {
  return (
    <div>
      <header className="page-header">
        <h1><TrendingUp color="var(--primary-color)" size={32} /> Forecast & Predictions</h1>
      </header>
      <div className="panel">
        <div className="panel-header"><Activity size={20}/> Swarm Risk Forecast (Next 7 Days)</div>
        <p style={{color: 'var(--text-muted)', marginBottom: '1rem'}}>Aggregating Scikit-Learn Isolation Forest weights alongside IoT telemetry models to project future colony loss.</p>
        <div style={{padding: '1.5rem', background: '#f8f5ef', borderRadius: '8px'}}>
          <h3 style={{marginBottom: '0.5rem', color: 'var(--warning)'}}>Projected Swarm Event: Medium Risk</h3>
          <p style={{fontSize: '0.9rem'}}>Hive #1 shows climbing temperatures combined with dropping acoustic signatures. At the current trend, Swarm execution is projected within ~14 days.</p>
        </div>
      </div>
    </div>
  );
}
