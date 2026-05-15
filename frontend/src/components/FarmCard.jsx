import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, X, PawPrint, AlertTriangle, Heart, Layers, ArrowRight, CheckCircle2, Clock, Wrench } from 'lucide-react';

const STATUS_CONFIG = {
  active:      { label: 'Actif',       color: '#16a34a', bg: 'rgba(22,163,74,.12)',  dot: '#4ade80',  grad: 'linear-gradient(135deg, #064e3b 0%, #166534 50%, #16a34a 100%)' },
  inactive:    { label: 'Inactif',     color: '#64748b', bg: 'rgba(100,116,139,.12)',dot: '#94a3b8',  grad: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)' },
  maintenance: { label: 'Maintenance', color: '#d97706', bg: 'rgba(217,119,6,.12)',  dot: '#fbbf24',  grad: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #d97706 100%)' },
};

export default function FarmCard({ farm, onDelete }) {
  const navigate = useNavigate();
  const cfg    = STATUS_CONFIG[farm.status] || STATUS_CONFIG.inactive;
  const health = farm.avg_health_score;
  const healthColor = health >= 80 ? '#22c55e' : health >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fcard" onClick={() => navigate(`/farms/${farm.id}`)}>

      {/* ── gradient header ────────────────────────────────────────────── */}
      <div className="fcard-header" style={{ background: cfg.grad }}>
        {/* status dot */}
        <div className="fcard-status-row">
          <span className="fcard-status-dot" style={{ background: cfg.dot }} />
          <span className="fcard-status-label" style={{ color: cfg.dot }}>{cfg.label}</span>
        </div>

        {/* farm name */}
        <div className="fcard-name">{farm.name}</div>

        {/* location */}
        <div className="fcard-location">
          <MapPin size={11} style={{ flexShrink: 0 }} />
          <span>{farm.location || 'Emplacement non défini'}</span>
        </div>

        {/* area chip */}
        {farm.total_area_ha > 0 && (
          <div className="fcard-area-chip">
            <Layers size={10} /> {farm.total_area_ha} ha
          </div>
        )}

        {/* delete */}
        {onDelete && (
          <button
            className="fcard-delete-btn"
            title="Supprimer"
            onClick={e => { e.stopPropagation(); onDelete(farm); }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── metrics strip ─────────────────────────────────────────────── */}
      <div className="fcard-metrics">
        <div className="fcard-metric">
          <PawPrint size={14} color="#0ea5e9" />
          <span className="fcard-metric-val">{farm.unit_count ?? 0}</span>
          <span className="fcard-metric-label">Animaux</span>
        </div>

        <div className="fcard-metric-divider" />

        <div className="fcard-metric">
          <AlertTriangle size={14} color={farm.active_alerts > 0 ? '#ef4444' : '#22c55e'} />
          <span className="fcard-metric-val" style={{ color: farm.active_alerts > 0 ? '#ef4444' : '#22c55e' }}>
            {farm.active_alerts ?? 0}
          </span>
          <span className="fcard-metric-label">Alertes</span>
        </div>

        <div className="fcard-metric-divider" />

        <div className="fcard-metric">
          <Heart size={14} color={healthColor} />
          <span className="fcard-metric-val" style={{ color: healthColor }}>
            {health != null ? `${health}%` : '—'}
          </span>
          <span className="fcard-metric-label">Santé</span>
        </div>
      </div>

      {/* ── health bar ────────────────────────────────────────────────── */}
      {health != null && (
        <div className="fcard-health-bar-wrap">
          <div className="fcard-health-bar-track">
            <div
              className="fcard-health-bar-fill"
              style={{ width: `${Math.min(health, 100)}%`, background: healthColor }}
            />
          </div>
          <span className="fcard-health-pct" style={{ color: healthColor }}>{health}%</span>
        </div>
      )}

      {/* ── footer CTA ────────────────────────────────────────────────── */}
      <div className="fcard-footer">
        <span className="fcard-view-btn">
          Voir la ferme <ArrowRight size={13} />
        </span>
        {farm.latitude && farm.longitude && (
          <span className="fcard-coords">
            {(+farm.latitude).toFixed(3)}, {(+farm.longitude).toFixed(3)}
          </span>
        )}
      </div>
    </div>
  );
}
