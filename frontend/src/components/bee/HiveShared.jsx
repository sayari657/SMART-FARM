import { ThumbsUp, AlertTriangle, AlertOctagon, ShieldPlus } from 'lucide-react';
import { COLORS } from './BeeConstants';

export const HEALTH_OPTIONS = [
  { id: 'health',    label: 'Bonne santé',      icon: ThumbsUp,      color: COLORS.success },
  { id: 'warning',   label: 'À surveiller',      icon: AlertTriangle, color: COLORS.honey },
  { id: 'urgent',    label: 'Urgent',            icon: AlertOctagon,  color: COLORS.error },
  { id: 'treatment', label: 'Traitement requis', icon: ShieldPlus,    color: COLORS.info },
];

export const TASK_STATUS = {
  todo:  { label: 'À FAIRE',  color: COLORS.textMuted },
  doing: { label: 'EN COURS', color: COLORS.honey },
  done:  { label: 'TERMINÉ',  color: COLORS.success },
};

export const DEPENSE_TYPES = ['Alimentation', 'Traitement', 'Équipement', "Main-d'œuvre", 'Transport', 'Autre'];

export function healthBadge(state) {
  const opt = HEALTH_OPTIONS.find(h => h.id === state) || HEALTH_OPTIONS[0];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      background: opt.color + '18', color: opt.color,
      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
      <opt.icon size={11} /> {opt.label}
    </span>
  );
}

export function Section({ title, icon: Icon, color = COLORS.accent, children, action }) {
  return (
    <div style={{ background: COLORS.surface, borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '14px 22px', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} color={color} />
          </div>
          <span style={{ color: COLORS.text, fontWeight: 800, fontSize: 13 }}>{title}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

export const inputSt = {
  width: '100%', height: 44, background: COLORS.surface,
  border: `1px solid ${COLORS.border}`, borderRadius: 12,
  padding: '0 14px', color: COLORS.text, outline: 'none', fontSize: 13,
};

export function StepperInput({ label, value, onChange, min = 0, step = 1, color = COLORS.accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 12, border: `1px solid ${COLORS.border}`,
      background: 'rgba(0,0,0,0.03)' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onChange(Math.max(min, value - step))}
          style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,0,0,0.06)',
            border: `1px solid ${COLORS.border}`, color: COLORS.text, cursor: 'pointer', fontWeight: 900, fontSize: 16 }}>−</button>
        <span style={{ color: COLORS.text, fontWeight: 900, fontSize: 16, minWidth: 40, textAlign: 'center' }}>{value}</span>
        <button onClick={() => onChange(value + step)}
          style={{ width: 30, height: 30, borderRadius: 8, background: color + '25',
            border: `1px solid ${color}40`, color, cursor: 'pointer', fontWeight: 900, fontSize: 16 }}>+</button>
      </div>
    </div>
  );
}

