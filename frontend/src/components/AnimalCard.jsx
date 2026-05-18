import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Activity } from 'lucide-react';

const SPECIES_EMOJI  = { bee: '🐝', cow: '🐄', poultry: '🐔', sheep: '🐑', goat: '🐐', rabbit: '🐰' };
const SPECIES_COLORS = { bee: '#d97706', cow: '#7c3aed', poultry: '#0891b2', sheep: '#059669', goat: '#dc2626', rabbit: '#16a34a' };
const STATUS_CFG = {
  healthy:  { color: '#15803d', bg: '#f0fdf4', label: 'Sain' },
  warning:  { color: '#d97706', bg: '#fffbeb', label: 'Attention' },
  critical: { color: '#dc2626', bg: '#fef2f2', label: 'Critique' },
  offline:  { color: '#94a3b8', bg: '#f8fafc', label: 'Hors ligne' },
};

export default function AnimalCard({ unit }) {
  const navigate   = useNavigate();
  const health     = unit.health_score ?? 0;
  const sp         = unit.species || 'bee';
  const spColor    = SPECIES_COLORS[sp] || '#16a34a';
  const statusCfg  = STATUS_CFG[unit.status] || STATUS_CFG.offline;
  const barColor   = health >= 80 ? '#15803d' : health >= 60 ? '#d97706' : '#dc2626';

  return (
    <div className="anim-card" onClick={() => navigate(`/animals/${unit.id}`)}>

      {/* Top — species color band */}
      <div className="anim-card-top" style={{ background: `linear-gradient(135deg, ${spColor}18, ${spColor}06)` }}>
        <div className="anim-card-accent" style={{ background: spColor }} />
        <div className="anim-card-species-icon" style={{ background: `${spColor}20`, color: spColor }}>
          {SPECIES_EMOJI[sp] || '🐾'}
        </div>
        <div className="anim-card-info">
          <div className="anim-card-name">{unit.name}</div>
          <div className="anim-card-meta">
            <MapPin size={10} /> {unit.farm_name || '—'}
          </div>
        </div>
        <div className="anim-card-status" style={{ background: statusCfg.bg, color: statusCfg.color }}>
          <span className="anim-card-status-dot" style={{ background: statusCfg.color }} />
          {statusCfg.label}
        </div>
      </div>

      {/* Body */}
      <div className="anim-card-body">
        <div className="anim-card-id">
          ID: <span>{unit.identifier || '—'}</span> · {unit.species_display || sp}
        </div>
        <div className="anim-card-health-row">
          <span className="anim-card-health-label"><Activity size={11} /> Santé</span>
          <span className="anim-card-health-val" style={{ color: barColor }}>{health.toFixed(0)}%</span>
        </div>
        <div className="anim-card-bar-bg">
          <div className="anim-card-bar-fill" style={{ width: `${health}%`, background: barColor }} />
        </div>
        <div className="anim-card-footer" style={{ color: spColor }}>
          Voir le dossier <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
}
