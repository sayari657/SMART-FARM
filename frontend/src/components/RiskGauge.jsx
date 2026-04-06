import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

function scoreColor(score) {
  if (score >= 80) return 'var(--color-success)';
  if (score >= 60) return 'var(--color-warning)';
  if (score >= 40) return '#f97316';
  return 'var(--color-critical)';
}

function scoreLabel(score) {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

export default function RiskGauge({ score = 0, label = 'Health Score', size = 140 }) {
  const color = scoreColor(score);
  const data = [{ value: score, fill: color }];

  return (
    <div className="risk-gauge-wrap">
      <div style={{ position: 'relative', width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={180}
            endAngle={0}
            barSize={10}
          >
            <RadialBar
              background={{ fill: 'var(--color-border)' }}
              dataKey="value"
              cornerRadius={6}
              max={100}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 14,
        }}>
          <div className="risk-score-text" style={{ color }}>{Math.round(score)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500 }}>{scoreLabel(score)}</div>
        </div>
      </div>
      <div className="risk-gauge-label">{label}</div>
    </div>
  );
}
