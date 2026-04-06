import React from 'react';
import { AlertTriangle, AlertOctagon, Info, CheckCircle2 } from 'lucide-react';

const SEVERITY_MAP = {
  critical: { cls: 'critical', icon: AlertOctagon,   color: 'var(--color-critical)' },
  warning:  { cls: 'warning',  icon: AlertTriangle,  color: 'var(--color-warning)'  },
  info:     { cls: 'info',     icon: Info,           color: 'var(--color-info)'     },
};

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.round((now - d) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return d.toLocaleDateString();
}

export default function AlertCard({ alert, onResolve }) {
  const sev = SEVERITY_MAP[alert.severity] || SEVERITY_MAP.info;
  const Icon = sev.icon;

  return (
    <div className={`alert-banner ${sev.cls}`} style={{ justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Icon size={18} style={{ color: sev.color, flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="alert-banner-title">
            {alert.unit_name && <span style={{ color: 'var(--color-text-2)', marginRight: 6 }}>[{alert.unit_name}]</span>}
            {alert.alert_type?.replace(/_/g, ' ')}
          </div>
          <div className="alert-banner-msg">{alert.message}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>
            {alert.farm_name && <span>{alert.farm_name} · </span>}
            {fmtTime(alert.timestamp)}
            {alert.is_resolved && <span style={{ color: 'var(--color-success)', marginLeft: 8 }}>✓ Resolved</span>}
          </div>
        </div>
      </div>
      {!alert.is_resolved && onResolve && (
        <button
          className="btn btn-sm btn-secondary"
          style={{ flexShrink: 0, marginLeft: 12 }}
          onClick={() => onResolve(alert.id)}
        >
          Resolve
        </button>
      )}
    </div>
  );
}
