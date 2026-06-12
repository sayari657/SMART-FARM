import React, { useEffect, useState } from 'react';
import { TrendingUp, Loader2, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { marketAPI } from '../services/api';

const PRODUCTS = [
  'olive', 'huile_olive_vierge', 'tomate', 'pomme_de_terre',
  'miel', 'lait_vache', 'viande_volaille', 'oeuf', 'ble_dur',
];

/**
 * Prix actuel + prévision SARIMA sur l'historique réellement collecté
 * (snapshot quotidien — job scheduler n°7). Affiche honnêtement l'état
 * de la collecte tant que < 14 jours d'historique.
 */
export default function PriceForecastCard() {
  const { t } = useTranslation();
  const [product, setProduct] = useState('olive');
  const [history, setHistory] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([marketAPI.history(product), marketAPI.forecast(product)])
      .then(([h, f]) => { if (alive) { setHistory(h.data); setForecast(f.data); } })
      .catch(() => { if (alive) { setHistory(null); setForecast(null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [product]);

  const lastPrice = history?.history?.length
    ? history.history[history.history.length - 1].price_tnd : null;
  const collecting = forecast?.status === 'insufficient_history';

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0',
      borderTop: '3px solid #16a34a', padding: '18px 20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={17} color="#16a34a" />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{t('ai_cards.pf_title')}</div>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            UTAP/GIFruits · SARIMA · job quotidien 5h
          </div>
        </div>
        <select value={product} onChange={(e) => setProduct(e.target.value)} style={{
          fontSize: 11, fontWeight: 700, color: '#475569', background: '#f8fafc',
          border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '5px 9px', cursor: 'pointer',
        }}>
          {PRODUCTS.map((p) => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 14 }}>
          <Loader2 size={16} color="#16a34a" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#16a34a', lineHeight: 1 }}>
              {lastPrice != null ? lastPrice.toFixed(2) : '—'}
            </span>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>TND · {t('ai_cards.pf_current')}</span>
          </div>

          {collecting ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11, color: '#64748b', background: '#f8fafc', borderRadius: 10, padding: '9px 12px', lineHeight: 1.5 }}>
              <Database size={13} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {t('ai_cards.pf_collecting', {
                  n: forecast.points_collected,
                  total: forecast.points_required,
                })}
                <div style={{ height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ width: `${(forecast.points_collected / forecast.points_required) * 100}%`, height: '100%', background: '#16a34a', borderRadius: 99 }} />
                </div>
              </span>
            </div>
          ) : forecast?.status === 'ok' && (
            <div style={{ fontSize: 11, color: '#475569' }}>
              <span style={{ fontWeight: 800, color: '#16a34a' }}>{t('ai_cards.pf_forecast')} J+14 : </span>
              {forecast.yhat?.[forecast.yhat.length - 1]?.toFixed(2)} TND
              <span style={{ color: '#94a3b8' }}>
                {' '}[{forecast.yhat_lower?.[forecast.yhat_lower.length - 1]?.toFixed(2)} – {forecast.yhat_upper?.[forecast.yhat_upper.length - 1]?.toFixed(2)}]
                {' '}· {forecast.method} · {forecast.points_used} j d'historique
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
