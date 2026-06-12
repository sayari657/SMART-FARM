import React, { useEffect, useState } from 'react';
import { HeartPulse, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

/**
 * Analyse de survie Kaplan-Meier des lots de volaille
 * (mortalité du journal santé, benchmark Ross/Cobb S(42) ≥ 96 %).
 */
export default function PoultrySurvivalCard({ farmId, color = '#f97316' }) {
  const { t } = useTranslation();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) return;
    let alive = true;
    api.get('/poultry/analytics/survival', { params: { farm_id: farmId } })
      .then((r) => { if (alive) setData(r.data); })
      .catch(() => { if (alive) setData(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [farmId]);

  return (
    <div className="card glass-card" style={{ padding: '18px 20px', border: `1px solid ${color}33`, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HeartPulse size={17} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{t('ai_cards.surv_title')}</div>
          <div style={{ fontSize: 9, color: 'var(--color-text-3, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('ai_cards.surv_sub')}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 14 }}>
          <Loader2 size={16} color={color} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : !data?.available ? (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{data?.reason || t('ai_cards.surv_none')}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,230px),1fr))', gap: 10 }}>
            {data.batches.map((b) => {
              const ok = b.survival_at_42d == null || b.survival_at_42d >= data.benchmark_s42;
              const sc = ok ? '#16a34a' : '#dc2626';
              return (
                <div key={b.batch_id} style={{ border: `1.5px solid ${sc}33`, borderTop: `3px solid ${sc}`, borderRadius: 12, padding: '10px 13px', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{b.name}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>{b.breed || b.batch_type} · {t('ai_cards.surv_age')} {b.age_days} j</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: sc }}>
                      {b.survival_at_42d != null ? `${(b.survival_at_42d * 100).toFixed(1)}%` : '—'}
                    </span>
                    <span style={{ fontSize: 9, color: '#64748b' }}>{t('ai_cards.surv_s42')}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: '#64748b', marginTop: 3 }}>
                    {b.deaths}/{b.initial_quantity} ({b.mortality_pct}% {t('ai_cards.surv_mortality')})
                    {b.vs_benchmark && b.vs_benchmark !== 'conforme' && (
                      <span style={{ color: '#dc2626', fontWeight: 700 }}> · ⚠ {b.vs_benchmark}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {data.logrank && (
            <div style={{ marginTop: 10, fontSize: 10, color: data.logrank.significant ? '#dc2626' : '#64748b', fontWeight: 600 }}>
              📊 Log-rank {data.logrank.batches.join(' vs ')} : p = {data.logrank.p_value} — {data.logrank.interpretation}
            </div>
          )}
        </>
      )}
    </div>
  );
}
