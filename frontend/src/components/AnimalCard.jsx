import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThreeTile from './ThreeTile';

const SPECIES_EMOJI = { bee: '🐝', cow: '🐄', poultry: '🐔', sheep: '🐑', goat: '🐐' };
const STATUS_CLASS  = { healthy: 'badge-success', warning: 'badge-warning', critical: 'badge-danger', offline: 'badge-neutral' };

export default function AnimalCard({ unit }) {
  const navigate = useNavigate();
  const health = unit.health_score ?? 0;
  const barColor = health >= 80 ? 'var(--color-success)' : health >= 60 ? 'var(--color-warning)' : 'var(--color-critical)';

  return (
    <ThreeTile>
      <div
        className="card"
        style={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}
        onClick={() => navigate(`/animals/${unit.id}`)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{SPECIES_EMOJI[unit.species] || '🐾'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{unit.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                {unit.species_display || unit.species} · {unit.farm_name}
              </div>
            </div>
          </div>
          <span className={`badge ${STATUS_CLASS[unit.status] || 'badge-neutral'}`}>
            {unit.status}
          </span>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
            <span style={{ color: 'var(--color-text-3)' }}>Health Score</span>
            <span style={{ fontWeight: 700, color: barColor }}>{health.toFixed(0)}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${health}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width .5s ease' }} />
          </div>
        </div>
      </div>
    </ThreeTile>
  );
}
