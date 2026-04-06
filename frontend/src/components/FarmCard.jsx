import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertTriangle, Heart } from 'lucide-react';
import ThreeTile from './ThreeTile';

const STATUS_CLASS = {
  active: 'badge-success', inactive: 'badge-neutral', maintenance: 'badge-warning',
};

export default function FarmCard({ farm }) {
  const navigate = useNavigate();
  const healthColor = farm.avg_health_score >= 80 ? 'var(--color-success)'
    : farm.avg_health_score >= 60 ? 'var(--color-warning)'
    : 'var(--color-critical)';

  return (
    <ThreeTile>
      <div
        className="card"
        style={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}
        onClick={() => navigate(`/farms/${farm.id}`)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{farm.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: 'var(--color-text-3)', fontSize: 12 }}>
              <MapPin size={12} />
              {farm.location || 'No location'}
            </div>
          </div>
          <span className={`badge ${STATUS_CLASS[farm.status] || 'badge-neutral'}`}>
            {farm.status}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 'auto', paddingTop: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{farm.unit_count ?? 0}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Animal Units</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: farm.active_alerts > 0 ? 'var(--color-critical)' : 'var(--color-success)' }}>
              {farm.active_alerts ?? 0}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Active Alerts</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: healthColor }}>
              {farm.avg_health_score ?? '—'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Health Score</div>
          </div>
        </div>
      </div>
    </ThreeTile>
  );
}
