import React from 'react';
import { Cpu } from 'lucide-react';

export default function SystemMonitor() {
  return (
    <div>
      <header className="page-header">
        <h1><Cpu color="var(--primary-color)" size={32} /> Infrastructure Monitor</h1>
      </header>
      <div className="dashboard-grid">
        <div className="panel info-card">
          <div className="info-value" style={{color: 'var(--success)'}}>ONLINE</div>
          <div style={{fontWeight: '500'}}>Mosquitto MQTT Broker</div>
          <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Port: 1883</div>
        </div>
        
        <div className="panel info-card">
          <div className="info-value" style={{color: 'var(--success)'}}>ONLINE</div>
          <div style={{fontWeight: '500'}}>PostgreSQL Storage</div>
          <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Volumes Attached</div>
        </div>

        <div className="panel info-card">
          <div className="info-value" style={{color: 'var(--warning)'}}>SIMULATING</div>
          <div style={{fontWeight: '500'}}>Computer Vision (YOLO)</div>
          <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Failsafe Mode Active</div>
        </div>
      </div>
    </div>
  );
}
