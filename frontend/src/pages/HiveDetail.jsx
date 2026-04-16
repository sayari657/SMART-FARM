import React from 'react';
import { Database, MapPin, Calendar, GitBranch } from 'lucide-react';

export default function HiveDetail() {
  const hive = null; // Static display — no backend hive route needed

  return (
    <>
      <header className="page-header">
        <h1><Database color="var(--accent-color)" size={32} /> Hive Context & Metadata</h1>
      </header>
      
      <div className="dashboard-grid">
        <div className="panel" style={{gridColumn: 'span 2'}}>
          <div className="panel-header">Metadata & Geography</div>
          <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem'}}>
            <div className="info-card" style={{flex: 1}}>
              <MapPin size={24} color="var(--text-secondary)" />
              <div style={{color: 'var(--text-secondary)', marginTop: '0.5rem'}}>Location</div>
              <div className="info-value">{hive?.location || 'North Field Sector A'}</div>
            </div>
            
            <div className="info-card" style={{flex: 1}}>
              <Calendar size={24} color="var(--text-secondary)" />
              <div style={{color: 'var(--text-secondary)', marginTop: '0.5rem'}}>Installation Date</div>
              <div className="info-value">12 Oct 2023</div>
            </div>

            <div className="info-card" style={{flex: 1}}>
              <GitBranch size={24} color="var(--text-secondary)" />
              <div style={{color: 'var(--text-secondary)', marginTop: '0.5rem'}}>Queen Lineage</div>
              <div className="info-value">Buckfast Hybrid</div>
            </div>
          </div>
        </div>

        <div className="panel" style={{gridColumn: 'span 2'}}>
          <div className="panel-header">Recent Maintenance Logs</div>
          <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '1rem'}}>
             <thead>
               <tr style={{borderBottom: '1px solid var(--border-color)'}}>
                 <th style={{padding: '12px 8px', color: 'var(--text-secondary)'}}>Date</th>
                 <th style={{padding: '12px 8px', color: 'var(--text-secondary)'}}>Technician</th>
                 <th style={{padding: '12px 8px', color: 'var(--text-secondary)'}}>Action Taken</th>
               </tr>
             </thead>
             <tbody>
               <tr style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                 <td style={{padding: '12px 8px'}}>2 Days ago</td>
                 <td style={{padding: '12px 8px'}}>Admin</td>
                 <td style={{padding: '12px 8px'}}>Replaced front brood box frame</td>
               </tr>
               <tr style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                 <td style={{padding: '12px 8px'}}>1 Month ago</td>
                 <td style={{padding: '12px 8px'}}>Admin</td>
                 <td style={{padding: '12px 8px'}}>Varroa mite treatment applied</td>
               </tr>
             </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
