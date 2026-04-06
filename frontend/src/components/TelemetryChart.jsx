import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

const METRIC_COLORS = {
  temperature: '#ef4444', body_temperature: '#ef4444', coop_temperature: '#f97316',
  humidity:    '#3b82f6',
  hive_weight: '#8b5cf6',
  sound_level: '#f59e0b',
  activity:    '#22c55e',
  rumination:  '#06b6d4',
  milk_yield:  '#a855f7',
  ammonia:     '#dc2626',
  bird_count:  '#0ea5e9',
  respiratory_rate: '#10b981',
};

function fmtTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

export default function TelemetryChart({ records = [], metrics = [], height = 280, anomalyPoints = [] }) {
  if (!records.length) {
    return (
      <div className="empty-state" style={{ padding: '40px 0' }}>
        <span style={{ fontSize: 32 }}>📡</span>
        <h3>No telemetry data</h3>
        <p>Waiting for sensor readings...</p>
      </div>
    );
  }

  // Build chart data: reverse so oldest first
  const data = [...records].reverse().map(r => ({
    ts: fmtTimestamp(r.timestamp),
    fullTs: r.timestamp,
    ...r.metrics,
  }));

  // Determine which metrics to show
  const displayMetrics = metrics.length > 0 ? metrics : Object.keys(records[0]?.metrics || {});

  // Anomaly reference lines
  const anomalyTs = new Set(anomalyPoints.map(a => fmtTimestamp(a.timestamp)));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="ts"
          tick={{ fontSize: 11, fill: 'var(--color-text-3)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-3)' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            fontSize: 12,
          }}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {displayMetrics.slice(0, 4).map(metric => (
          <Line
            key={metric}
            type="monotone"
            dataKey={metric}
            stroke={METRIC_COLORS[metric] || '#64748b'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}

        {/* Anomaly reference lines */}
        {[...anomalyTs].map(ts => (
          <ReferenceLine key={ts} x={ts} stroke="var(--color-critical)" strokeDasharray="4 2" strokeWidth={1.5} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
