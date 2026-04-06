import React from 'react';

export default function KPIBox({ icon: Icon, value, label, change, colorClass = 'green', unit = '' }) {
  return (
    <div className="kpi-box">
      <div className={`kpi-icon ${colorClass}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="kpi-value">
          {value !== null && value !== undefined ? value : '—'}
          {unit && <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 3 }}>{unit}</span>}
        </div>
        <div className="kpi-label">{label}</div>
        {change !== undefined && (
          <div className={`kpi-change ${change >= 0 ? 'up' : 'down'}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs last period
          </div>
        )}
      </div>
    </div>
  );
}
