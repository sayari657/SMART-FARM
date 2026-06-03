/**
 * HiveMetricCard — Enterprise quick-update stepper
 * 3 metrics: Santé ❤️ / Miel 🍯 / Force 🐝  (scale 1-5 UI → 2-10 stored)
 * Debounce auto-save (1 s) + offline-aware queue
 */
import { useState, useEffect, useRef } from 'react';
import { Heart, Droplets, Zap, Check, Loader2, Wifi, WifiOff } from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';

const QUEUE_KEY = 'bee_offline_queue';
const pushQueue = (item) => {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...q, item]));
  } catch {}
};

/* ── Metric definitions ─────────────────────────────────── */
const METRICS = [
  {
    key: 'health_score',
    label: 'Santé',
    icon: Heart,
    topEmoji: '❤️',
    scale: [
      { v: 1, label: 'Critique',   color: '#ef4444', dot: '🔴' },
      { v: 2, label: 'Mauvaise',   color: '#f97316', dot: '🟠' },
      { v: 3, label: 'Moyenne',    color: '#f59e0b', dot: '🟡' },
      { v: 4, label: 'Bonne',      color: '#84cc16', dot: '🟢' },
      { v: 5, label: 'Excellente', color: '#059669', dot: '💚' },
    ],
    toStored:   v => v * 2,
    fromStored: v => Math.max(1, Math.min(5, Math.round((v ?? 10) / 2))),
  },
  {
    key: 'honey_level',
    label: 'Miel',
    icon: Droplets,
    topEmoji: '🍯',
    scale: [
      { v: 1, label: 'Vide',   color: '#94a3b8', dot: '⬜' },
      { v: 2, label: 'Faible', color: '#fcd34d', dot: '🟨' },
      { v: 3, label: 'Moyen',  color: '#f59e0b', dot: '🟧' },
      { v: 4, label: 'Bon',    color: '#d97706', dot: '🔶' },
      { v: 5, label: 'Plein',  color: '#92400e', dot: '🍯' },
    ],
    toStored:   v => v * 2,
    fromStored: v => Math.max(1, Math.min(5, Math.round((v ?? 5) / 2))),
  },
  {
    key: 'force_level',
    label: 'Force Colonie',
    icon: Zap,
    topEmoji: '🐝',
    scale: [
      { v: 1, label: 'Très faible', color: '#ef4444', dot: '😢' },
      { v: 2, label: 'Faible',      color: '#f97316', dot: '😕' },
      { v: 3, label: 'Moyenne',     color: '#f59e0b', dot: '😐' },
      { v: 4, label: 'Forte',       color: '#84cc16', dot: '💪' },
      { v: 5, label: 'Très forte',  color: '#059669', dot: '🔥' },
    ],
    toStored:   v => v * 2,
    fromStored: v => Math.max(1, Math.min(5, Math.round((v ?? 5) / 2))),
  },
];

/* ── Single metric control ────────────────────────────────── */
function MetricControl({ metric, value, onChange, compact = false }) {
  const step = metric.scale.find(s => s.v === value) || metric.scale[2];
  const Icon = metric.icon;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: compact ? 6 : 10,
      padding: compact ? '12px 10px' : '18px 14px',
      background: `${step.color}10`,
      borderRadius: compact ? 14 : 18,
      border: `1.5px solid ${step.color}35`,
      flex: '1 1 0', minWidth: compact ? 80 : 110,
      transition: 'all .25s',
    }}>
      {/* Icon + label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: compact ? 20 : 26 }}>{metric.topEmoji}</span>
        <span style={{ fontSize: 9, fontWeight: 800, color: COLORS.textMuted,
          textTransform: 'uppercase', letterSpacing: 1 }}>{metric.label}</span>
      </div>

      {/* -  value  + */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 12 }}>
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          style={{
            width: compact ? 28 : 34, height: compact ? 28 : 34, borderRadius: '50%',
            background: COLORS.bg2, border: `1px solid ${COLORS.border}`,
            color: COLORS.text, cursor: 'pointer', fontWeight: 900,
            fontSize: compact ? 14 : 18, display: 'flex', alignItems: 'center',
            justifyContent: 'center', touchAction: 'manipulation', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = step.color + '22'; e.currentTarget.style.borderColor = step.color; }}
          onMouseLeave={e => { e.currentTarget.style.background = COLORS.bg2; e.currentTarget.style.borderColor = COLORS.border; }}
        >−</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: compact ? 20 : 26, fontWeight: 900, color: step.color,
            lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          <div style={{ fontSize: 8, color: step.color + 'aa', fontWeight: 700 }}>/5</div>
        </div>

        <button
          onClick={() => onChange(Math.min(5, value + 1))}
          style={{
            width: compact ? 28 : 34, height: compact ? 28 : 34, borderRadius: '50%',
            background: COLORS.bg2, border: `1px solid ${COLORS.border}`,
            color: COLORS.text, cursor: 'pointer', fontWeight: 900,
            fontSize: compact ? 14 : 18, display: 'flex', alignItems: 'center',
            justifyContent: 'center', touchAction: 'manipulation', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = step.color + '22'; e.currentTarget.style.borderColor = step.color; }}
          onMouseLeave={e => { e.currentTarget.style.background = COLORS.bg2; e.currentTarget.style.borderColor = COLORS.border; }}
        >+</button>
      </div>

      {/* Label */}
      <span style={{ fontSize: 10, fontWeight: 800, color: step.color }}>{step.label}</span>

      {/* 5-dot indicator */}
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            width: compact ? 6 : 8, height: compact ? 6 : 8, borderRadius: '50%',
            background: i <= value ? step.color : COLORS.border,
            transition: 'background .2s, transform .15s',
            transform: i === value ? 'scale(1.3)' : 'scale(1)',
          }} />
        ))}
      </div>
    </div>
  );
}

/* ══════════ MAIN COMPONENT ══════════════════════════════════ */
export default function HiveMetricCard({ hive, compact = false, onSaved }) {
  const initVals = () => ({
    health_score: METRICS[0].fromStored(hive.health_score),
    honey_level:  METRICS[1].fromStored(hive.honey_level),
    force_level:  METRICS[2].fromStored(hive.force_level),
  });

  const [vals,   setVals]   = useState(initVals);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | offline
  const [online, setOnline] = useState(navigator.onLine);
  const timerRef = useRef(null);
  const baseRef  = useRef(JSON.stringify(initVals()));

  useEffect(() => {
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const isDirty = JSON.stringify(vals) !== baseRef.current;

  /* Debounce auto-save */
  useEffect(() => {
    if (!isDirty) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      const payload = {};
      METRICS.forEach(m => { payload[m.key] = m.toStored(vals[m.key]); });

      if (!navigator.onLine) {
        pushQueue({ url: `/api/v1/bee/hives/${hive.id}`, method: 'PATCH', body: JSON.stringify(payload) });
        setStatus('offline');
        setTimeout(() => setStatus('idle'), 2500);
        return;
      }

      try {
        const res = await beeApi.patchHive(hive.id, payload);
        if (res.ok) {
          baseRef.current = JSON.stringify(vals);
          setStatus('saved');
          onSaved?.();
          setTimeout(() => setStatus('idle'), 2000);
        } else {
          setStatus('idle');
        }
      } catch {
        setStatus('idle');
      }
    }, 900);
    return () => clearTimeout(timerRef.current);
  }, [vals]); // eslint-disable-line

  const change = key => v => setVals(prev => ({ ...prev, [key]: v }));

  /* Status badge */
  const badge = status === 'saving'  ? { icon: <Loader2 size={12} style={{ animation: 'spin .7s linear infinite' }}/>, label: 'Sauvegarde…',  bg: COLORS.accent + '15',  c: COLORS.accent  }
              : status === 'saved'   ? { icon: <Check    size={12}/>,                                                   label: 'Sauvegardé ✓', bg: COLORS.success + '15', c: COLORS.success }
              : status === 'offline' ? { icon: <WifiOff  size={12}/>,                                                   label: 'En attente',    bg: '#f59e0b15',            c: '#f59e0b'      }
              : null;

  return (
    <div style={{
      background: COLORS.surface, borderRadius: compact ? 16 : 22,
      border: `1.5px solid ${isDirty ? COLORS.accent + '60' : COLORS.border}`,
      padding: compact ? '14px 14px 12px' : '22px 22px 18px',
      boxShadow: isDirty ? `0 4px 20px ${COLORS.accent}12` : 'none',
      transition: 'border-color .2s, box-shadow .2s',
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 12 : 18 }}>
        <div>
          <div style={{ fontWeight: 900, color: COLORS.text, fontSize: compact ? 13 : 15 }}>
            🔶 {hive.identifier}
          </div>
          {!compact && (
            <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>
              Mise à jour rapide · auto-sauvegarde 1s
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!online && <WifiOff size={12} color="#f59e0b"/>}
          {badge && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              borderRadius: 8, background: badge.bg, color: badge.c,
              fontSize: 11, fontWeight: 800,
            }}>
              {badge.icon} {badge.label}
            </div>
          )}
          {isDirty && !badge && (
            <div style={{ fontSize: 10, color: COLORS.accent, fontWeight: 700 }}>● modifié</div>
          )}
        </div>
      </div>

      {/* Metric controls */}
      <div style={{ display: 'flex', gap: compact ? 8 : 12, flexWrap: 'wrap' }}>
        {METRICS.map(m => (
          <MetricControl
            key={m.key} metric={m} value={vals[m.key]}
            onChange={change(m.key)} compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
