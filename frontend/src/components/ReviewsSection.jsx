/**
 * ReviewsSection — public testimonials with star ratings (landing page).
 * Visitors read recent reviews + the average, and submit their own (1–5 ★).
 * Data is persisted via the public /reviews API (no login required).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Quote, CheckCircle2, Loader2 } from 'lucide-react';
import { reviewsAPI } from '../services/api';

const GOLD = '#f59e0b';
const GREEN = '#16a34a';

function Stars({ value = 0, size = 18, onSelect, hover, onHover }) {
  const interactive = typeof onSelect === 'function';
  return (
    <div style={{ display: 'inline-flex', gap: 2 }} onMouseLeave={() => interactive && onHover?.(0)}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = (hover || value) >= n;
        return (
          <Star
            key={n}
            size={size}
            color={GOLD}
            fill={filled ? GOLD : 'none'}
            style={{ cursor: interactive ? 'pointer' : 'default', transition: 'transform .1s' }}
            onMouseEnter={() => interactive && onHover?.(n)}
            onClick={() => interactive && onSelect(n)}
          />
        );
      })}
    </div>
  );
}

export default function ReviewsSection() {
  const { t, i18n } = useTranslation();
  const [items, setItems]     = useState([]);
  const [average, setAverage] = useState(0);
  const [count, setCount]     = useState(0);
  const [loading, setLoading] = useState(true);

  const [rating, setRating]   = useState(0);
  const [hover, setHover]     = useState(0);
  const [name, setName]       = useState('');
  const [role, setRole]       = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await reviewsAPI.list();
      setItems(data.items || []);
      setAverage(data.average || 0);
      setCount(data.count || 0);
    } catch { /* backend offline — section stays empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (rating < 1) { setError(t('landing.reviews_need_star', 'Choisissez une note (étoiles).')); return; }
    setSubmitting(true);
    try {
      const { data } = await reviewsAPI.submit({ rating, name, role, comment });
      setItems(prev => [data, ...prev]);
      setCount(c => c + 1);
      setAverage(a => Math.round(((a * count + rating) / (count + 1)) * 10) / 10);
      setSubmitted(true);
      setRating(0); setName(''); setRole(''); setComment('');
    } catch (err) {
      setError(err?.response?.data?.detail || t('landing.reviews_error', "Échec de l'envoi. Réessayez."));
    } finally { setSubmitting(false); }
  };

  const C = {
    section: { background: '#f8fafc', padding: '72px 20px', borderTop: '1px solid #e2e8f0' },
    wrap: { maxWidth: 1100, margin: '0 auto' },
    h2: { fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, color: '#0f172a', textAlign: 'center', margin: 0, letterSpacing: '-0.5px' },
    sub: { textAlign: 'center', color: '#64748b', fontSize: 16, margin: '10px 0 0' },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, boxShadow: '0 4px 18px rgba(15,23,42,.05)' },
  };

  return (
    <section id="reviews" style={C.section}>
      <div style={C.wrap}>
        <h2 style={C.h2}>{t('landing.reviews_title', 'Ils nous font confiance')}</h2>
        <p style={C.sub}>{t('landing.reviews_subtitle', 'Partagez votre avis sur Smart Farm AI')}</p>

        {/* Average summary */}
        {count > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, margin: '26px 0 8px' }}>
            <div style={{ fontSize: 46, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
              {average.toFixed(1)}<span style={{ fontSize: 20, color: '#94a3b8' }}>/5</span>
            </div>
            <Stars value={Math.round(average)} size={22} />
            <div style={{ color: '#64748b', fontSize: 14 }}>
              {count} {count > 1 ? t('landing.reviews_count_plural', 'avis') : t('landing.reviews_count_one', 'avis')}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 28, marginTop: 32 }}>

          {/* Submit form */}
          <div style={{ ...C.card, padding: 24, maxWidth: 640, margin: '0 auto', width: '100%' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '20px 8px' }}>
                <CheckCircle2 size={48} color={GREEN} style={{ marginBottom: 10 }} />
                <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: 20, fontWeight: 800 }}>
                  {t('landing.reviews_thanks_title', 'Merci pour votre avis !')}
                </h3>
                <p style={{ color: '#64748b', margin: '0 0 16px', fontSize: 14 }}>
                  {t('landing.reviews_thanks_desc', 'Votre retour a bien été enregistré.')}
                </p>
                <button onClick={() => setSubmitted(false)}
                  style={{ background: 'none', border: 'none', color: GREEN, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {t('landing.reviews_add_another', 'Laisser un autre avis')}
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 4 }}>
                  {t('landing.reviews_form_title', 'Donnez votre avis')}
                </div>
                <div style={{ color: '#64748b', fontSize: 13, marginBottom: 14 }}>
                  {t('landing.reviews_your_rating', 'Votre note')}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Stars value={rating} hover={hover} size={34} onSelect={setRating} onHover={setHover} />
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <input
                    value={name} onChange={e => setName(e.target.value)} maxLength={80}
                    placeholder={t('landing.reviews_name_ph', 'Votre nom (optionnel)')}
                    style={inp}
                  />
                  <input
                    value={role} onChange={e => setRole(e.target.value)} maxLength={80}
                    placeholder={t('landing.reviews_role_ph', 'Rôle (ex. Agriculteur)')}
                    style={inp}
                  />
                </div>
                <textarea
                  value={comment} onChange={e => setComment(e.target.value)} maxLength={600}
                  placeholder={t('landing.reviews_comment_ph', 'Votre commentaire…')}
                  style={{ ...inp, width: '100%', minHeight: 90, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10 }}>{error}</div>}
                <button type="submit" disabled={submitting}
                  style={{
                    marginTop: 16, width: '100%', padding: '13px', borderRadius: 12, border: 'none',
                    background: submitting ? '#94a3b8' : `linear-gradient(135deg,#16a34a,#15803d)`,
                    color: '#fff', fontWeight: 800, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} fill="#fff" />}
                  {t('landing.reviews_submit', 'Envoyer mon avis')}
                </button>
              </form>
            )}
          </div>

          {/* Reviews list */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
            {loading ? null : items.length === 0 ? (
              <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                {t('landing.reviews_empty', 'Soyez le premier à laisser un avis !')}
              </p>
            ) : items.map(r => (
              <div key={r.id} style={{ ...C.card, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stars value={r.rating} size={16} />
                  <Quote size={18} color="#cbd5e1" />
                </div>
                {r.comment && <p style={{ margin: 0, color: '#334155', fontSize: 14, lineHeight: 1.6 }}>{r.comment}</p>}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                  }}>
                    {(r.name || 'A')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{r.name || t('landing.reviews_anonymous', 'Anonyme')}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      {r.role ? r.role + ' · ' : ''}{r.created_at ? new Date(r.created_at).toLocaleDateString(i18n.language) : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .animate-spin{animation:spin 1s linear infinite}`}</style>
    </section>
  );
}

const inp = {
  flex: 1, minWidth: 160, padding: '11px 13px', borderRadius: 10,
  border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 14, color: '#0f172a', outline: 'none',
};
