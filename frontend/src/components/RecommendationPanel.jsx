import React from 'react';
import { Lightbulb, AlertOctagon, AlertTriangle, Info } from 'lucide-react';

const URGENCY_MAP = {
  critical: { icon: AlertOctagon,  color: 'var(--color-critical)', bg: 'var(--color-critical-bg)' },
  high:     { icon: AlertTriangle, color: '#f97316',               bg: '#fff7ed'                  },
  medium:   { icon: Lightbulb,     color: 'var(--color-warning)',   bg: 'var(--color-warning-bg)'  },
  low:      { icon: Info,          color: 'var(--color-info)',      bg: 'var(--color-info-bg)'     },
};

function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString();
}

export default function RecommendationPanel({ rec }) {
  const u = URGENCY_MAP[rec.urgency_level] || URGENCY_MAP.medium;
  const Icon = u.icon;

  return (
    <div style={{
      background: u.bg,
      border: `1px solid ${u.color}30`,
      borderLeft: `4px solid ${u.color}`,
      borderRadius: 'var(--radius)',
      padding: '16px 18px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Icon size={18} style={{ color: u.color, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`badge badge-${rec.urgency_level === 'critical' ? 'danger' : rec.urgency_level === 'high' ? 'warning' : 'info'}`}>
                {rec.urgency_level?.toUpperCase()}
              </span>
              {rec.unit_name && <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>{rec.unit_name}</span>}
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              Confidence: {rec.confidence_score?.toFixed(0)}%
            </span>
          </div>

          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--color-text)' }}>
            Probable Cause
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 10, lineHeight: 1.6 }}>
            {rec.probable_cause}
          </p>

          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--color-text)' }}>
            Recommendation
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
            {rec.recommendation_text}
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 10 }}>
            {fmtTime(rec.timestamp)}
            {rec.is_actioned && <span style={{ color: 'var(--color-success)', marginLeft: 10 }}>✓ Actioned</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
