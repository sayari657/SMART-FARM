import React, { useEffect, useState } from 'react';
import { Scale, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { beeApi } from '../../services/beeApi';

const LEVELS = {
  critical: { color: '#dc2626', bg: '#fef2f2', label: 'CRITIQUE',  emoji: '🚨' },
  high:     { color: '#ea580c', bg: '#fff7ed', label: 'ÉLEVÉ',     emoji: '⚠️' },
  moderate: { color: '#d97706', bg: '#fffbeb', label: 'MODÉRÉ',    emoji: '👀' },
  low:      { color: '#16a34a', bg: '#f0fdf4', label: 'FAIBLE',    emoji: '✅' },
};

/**
 * Risque d'essaimage — score expert + ML sur la balance connectée (NODE_B)
 * et la température du couvain. Source : /bee/analytics/swarm-risk.
 */
export default function SwarmRiskCard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await beeApi.getSwarmRisk()); }
    catch { setData(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const lv = LEVELS[data?.level] || LEVELS.low;

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #f3e8d8',
      boxShadow: '0 2px 8px rgba(139,68,14,.06)', padding: '18px 20px', marginBottom: 24,
      borderTop: `3px solid ${data?.available ? lv.color : '#d6d3d1'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: lv.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Scale size={17} color={data?.available ? lv.color : '#a8a29e'} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#2c1a0e' }}>
            Risque d'Essaimage — Balance Connectée
          </div>
          <div style={{ fontSize: 9, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Poids ruche · T° couvain · Modèle expert {data?.signals?.some(s => s.includes('ML')) ? '+ ML' : ''} · {data?.source === 'iot_csv' ? 'IoT NODE_B' : 'Télémétrie'}
          </div>
        </div>
        <button onClick={load} disabled={loading} style={{
          background: '#faf6f0', border: '1px solid #f3e8d8', borderRadius: 8,
          width: 28, height: 28, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#a8a29e',
        }}>
          {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 14 }}>
          <Loader2 size={16} color="#fbbf24" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : !data?.available ? (
        <div style={{ fontSize: 11, color: '#a8a29e', display: 'flex', alignItems: 'center', gap: 7 }}>
          <AlertTriangle size={13} /> {data?.reason || 'Télémétrie ruche indisponible'}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Jauge score */}
          <div style={{ textAlign: 'center', minWidth: 90 }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: lv.color, lineHeight: 1 }}>
              {data.score}<span style={{ fontSize: 14 }}>%</span>
            </div>
            <div style={{
              marginTop: 5, fontSize: 9, fontWeight: 900, letterSpacing: 0.8,
              background: lv.bg, color: lv.color, borderRadius: 99, padding: '3px 12px',
              border: `1px solid ${lv.color}33`, display: 'inline-block',
            }}>
              {lv.emoji} {lv.label}
            </div>
          </div>

          {/* Signaux + features */}
          <div style={{ flex: 1, minWidth: 220 }}>
            {(data.signals || []).slice(0, 3).map((s, i) => (
              <div key={i} style={{ fontSize: 11, color: '#57534e', marginBottom: 3, display: 'flex', gap: 6 }}>
                <span style={{ color: lv.color }}>•</span> {s}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
              {[
                { l: 'Δ 1h',  v: `${data.features.delta_1h > 0 ? '+' : ''}${data.features.delta_1h} kg` },
                { l: 'Δ 24h', v: `${data.features.delta_24h > 0 ? '+' : ''}${data.features.delta_24h} kg` },
                { l: 'Pente 7j', v: `${data.features.slope_7d > 0 ? '+' : ''}${data.features.slope_7d} kg/j` },
                { l: 'Poids', v: `${data.features.weight} kg` },
              ].map(({ l, v }) => (
                <span key={l} style={{
                  fontSize: 9, fontWeight: 700, background: '#faf6f0', color: '#78716c',
                  border: '1px solid #f3e8d8', borderRadius: 6, padding: '2px 8px',
                }}>{l}: {v}</span>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: lv.color, fontWeight: 600, marginTop: 8, lineHeight: 1.5 }}>
              💡 {data.recommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
