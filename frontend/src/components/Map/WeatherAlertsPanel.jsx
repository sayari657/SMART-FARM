import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Mail, RefreshCw, Check, X, ShieldCheck, Sparkles } from 'lucide-react';
import api, { externalAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/* ════════════════════════════════════════════════════════════════════════
   WeatherAlertsPanel — live weather alerts for the owner's farms.
   • GET  /weather/alerts          → active alerts
   • POST /weather/alerts/check    → evaluate now + email owner/workers
   • POST /weather/alerts/{id}/resolve
   Each alert that was emailed shows a 📧 badge.
   ════════════════════════════════════════════════════════════════════════ */

const T = {
    title:     { fr: 'Alertes météo',          en: 'Weather alerts',      ar: 'تنبيهات الطقس' },
    check:     { fr: 'Vérifier',               en: 'Check now',           ar: 'تحقّق الآن' },
    checking:  { fr: 'Analyse…',               en: 'Checking…',           ar: 'جارٍ التحليل…' },
    none:      { fr: 'Aucune alerte météo active', en: 'No active weather alerts', ar: 'لا توجد تنبيهات طقس نشطة' },
    emailed:   { fr: 'Email envoyé',           en: 'Emailed',             ar: 'تم الإرسال بالبريد' },
    resolve:   { fr: 'Résoudre',               en: 'Resolve',             ar: 'حلّ' },
    created:   { fr: 'nouvelle(s) alerte(s)',  en: 'new alert(s)',        ar: 'تنبيه(ات) جديدة' },
    emails:    { fr: 'email(s) envoyé(s)',     en: 'email(s) sent',       ar: 'بريد مُرسَل' },
    nochange:  { fr: 'Aucun nouveau risque détecté', en: 'No new risk detected', ar: 'لم يُكتشف خطر جديد' },
    farms:     { fr: 'ferme(s) analysée(s)',   en: 'farm(s) checked',     ar: 'مزرعة تم فحصها' },
    desc:      { fr: 'Canicule · gel · tempête · pluies · UV — notifiées par email', en: 'Heat · frost · storm · rain · UV — notified by email', ar: 'حرارة · صقيع · عاصفة · أمطار · UV — عبر البريد' },
    forecast:  { fr: 'Prévision 5 jours — IA', en: '5-day forecast — AI', ar: 'توقعات 5 أيام — ذكاء اصطناعي' },
    fc_loading:{ fr: 'Analyse météo par IA…', en: 'AI weather analysis…', ar: 'تحليل الطقس بالذكاء…' },
    pick_farm: { fr: 'Sélectionnez une ferme pour la prévision.', en: 'Select a farm for the forecast.', ar: 'اختر مزرعة لعرض التوقعات.' },
    occurrences:{ fr: 'occurrence(s)', en: 'occurrence(s)', ar: 'مرّات' },
};

const SEV = {
    critical: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: { fr: 'Critique', en: 'Critical', ar: 'حرِج' } },
    warning:  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: { fr: 'Avertissement', en: 'Warning', ar: 'تحذير' } },
    info:     { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: { fr: 'Info', en: 'Info', ar: 'معلومة' } },
};

// ── Localisation de la prévision (FR/EN/AR) ──────────────────────────────────
const LOCALE = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN' };
const COND = {
    clear:        { e: '☀️', fr: 'Ciel dégagé', en: 'Clear sky', ar: 'سماء صافية' },
    mostly_clear: { e: '🌤️', fr: 'Peu nuageux', en: 'Mostly clear', ar: 'صحو غالبًا' },
    partly:       { e: '⛅', fr: 'Partiellement nuageux', en: 'Partly cloudy', ar: 'غائم جزئيًا' },
    overcast:     { e: '☁️', fr: 'Couvert', en: 'Overcast', ar: 'ملبّد بالغيوم' },
    fog:          { e: '🌫️', fr: 'Brouillard', en: 'Fog', ar: 'ضباب' },
    drizzle:      { e: '🌦️', fr: 'Bruine', en: 'Drizzle', ar: 'رذاذ' },
    rain:         { e: '🌧️', fr: 'Pluie', en: 'Rain', ar: 'مطر' },
    rain_heavy:   { e: '🌧️', fr: 'Pluie forte', en: 'Heavy rain', ar: 'مطر غزير' },
    snow:         { e: '❄️', fr: 'Neige', en: 'Snow', ar: 'ثلج' },
    showers:      { e: '🌦️', fr: 'Averses', en: 'Showers', ar: 'زخات' },
    thunder:      { e: '⛈️', fr: 'Orage', en: 'Thunderstorm', ar: 'عاصفة رعدية' },
    variable:     { e: '🌡️', fr: 'Variable', en: 'Variable', ar: 'متغيّر' },
};
function condKey(c) {
    if (c == null) return 'variable';
    if (c === 0) return 'clear';
    if (c === 1) return 'mostly_clear';
    if (c === 2) return 'partly';
    if (c === 3) return 'overcast';
    if (c === 45 || c === 48) return 'fog';
    if (c >= 51 && c <= 57) return 'drizzle';
    if (c === 65) return 'rain_heavy';
    if ((c >= 61 && c <= 64) || c === 66 || c === 67) return 'rain';
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
    if (c >= 80 && c <= 82) return 'showers';
    if (c >= 95) return 'thunder';
    return 'variable';
}
const ADV = {
    heat:  { fr: '🥵 Canicule : ombre + eau fraîche, éviter le travail 11h–16h', en: '🥵 Heatwave: shade + fresh water, avoid work 11am–4pm', ar: '🥵 موجة حرّ: ظلّ وماء بارد، تجنّب العمل 11ص–4م' },
    frost: { fr: '🥶 Risque de gel : protéger jeunes animaux, ruches et plants', en: '🥶 Frost risk: protect young animals, hives and seedlings', ar: '🥶 خطر صقيع: احمِ الصغار والخلايا والشتلات' },
    rain_heavy: { fr: '🌧️ Fortes pluies : abriter, drainer, reporter les traitements', en: '🌧️ Heavy rain: shelter, drain, postpone treatments', ar: '🌧️ أمطار غزيرة: إيواء وتصريف وتأجيل المعالجات' },
    rain:  { fr: '🌦️ Pluie : prévoir l\'abri, décaler l\'irrigation', en: '🌦️ Rain: provide shelter, delay irrigation', ar: '🌦️ مطر: وفّر المأوى وأجّل الريّ' },
    wind:  { fr: '💨 Vent fort : sécuriser toitures, ruches, clôtures', en: '💨 Strong wind: secure roofs, hives, fences', ar: '💨 رياح قوية: ثبّت الأسقف والخلايا والأسوار' },
    uv:    { fr: '🔆 UV extrême : limiter l\'exposition (11h–16h)', en: '🔆 Extreme UV: limit exposure (11am–4pm)', ar: '🔆 UV قويّة: قلّل التعرّض (11ص–4م)' },
    ok:    { fr: '✅ Conditions favorables', en: '✅ Favorable conditions', ar: '✅ ظروف ملائمة' },
};
function dayAdvice(d, lang) {
    const out = [];
    const tmax = d.t_max, tmin = d.t_min, rain = d.precip_mm || 0, wind = d.wind_max || 0, uv = d.uv_max || 0;
    if (tmax != null && tmax >= 35) out.push(ADV.heat[lang]);
    if (tmin != null && tmin <= 3) out.push(ADV.frost[lang]);
    if (rain >= 15) out.push(ADV.rain_heavy[lang]); else if (rain >= 3) out.push(ADV.rain[lang]);
    if (wind >= 40) out.push(ADV.wind[lang]);
    if (uv >= 8) out.push(ADV.uv[lang]);
    if (!out.length) out.push(ADV.ok[lang]);
    return out;
}
function dayName(date, lang) {
    try { return new Date(date).toLocaleDateString(LOCALE[lang] || 'fr-FR', { weekday: 'long' }); }
    catch { return date; }
}

export default function WeatherAlertsPanel() {
    const { i18n } = useTranslation();
    const lang = ['fr', 'en', 'ar'].includes(i18n.language) ? i18n.language : 'fr';
    const rtl = lang === 'ar';
    const tr = (k) => T[k]?.[lang] ?? T[k]?.fr ?? k;

    const { farmId } = useAuth() || {};
    const [alerts, setAlerts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [checking, setChecking] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const [fc, setFc] = React.useState(null);
    const [fcLoading, setFcLoading] = React.useState(true);

    // Prévision 5 jours assistée par IA (Groq → Ollama → règles côté backend)
    React.useEffect(() => {
        let alive = true;
        if (farmId == null) { setFcLoading(false); return undefined; }
        setFcLoading(true);
        externalAPI.weather.aiForecast(farmId, lang)
            .then(({ data }) => { if (alive) setFc(data); })
            .catch(() => { if (alive) setFc(null); })
            .finally(() => { if (alive) setFcLoading(false); });
        return () => { alive = false; };
    }, [farmId, lang]);

    const load = React.useCallback(async () => {
        try {
            const res = await api.get('/weather/alerts');
            setAlerts(res.data?.alerts || []);
        } catch {
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const runCheck = async () => {
        setChecking(true);
        setResult(null);
        try {
            const res = await api.post('/weather/alerts/check');
            setResult(res.data);
            await load();
        } catch {
            setResult({ error: true });
        } finally {
            setChecking(false);
        }
    };

    const resolve = async (id) => {
        setAlerts(prev => prev.filter(a => a.id !== id));   // optimistic
        try { await api.post(`/weather/alerts/${id}/resolve`); } catch { load(); }
    };

    // Regroupe les alertes répétées (même type) → 1 carte claire par type
    const groups = React.useMemo(() => {
        const m = new Map();
        for (const a of alerts) {
            const key = a.type || a.title || a.id;
            if (!m.has(key)) m.set(key, []);
            m.get(key).push(a);
        }
        return [...m.values()].map(items => {
            const sorted = [...items].sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
            const farms = [...new Set(items.map(i => i.farm_name).filter(Boolean))];
            return { latest: sorted[0], count: items.length, ids: items.map(i => i.id), farms,
                     emailed: items.some(i => i.email_sent) };
        }).sort((a, b) => new Date(b.latest.created_at) - new Date(a.latest.created_at));
    }, [alerts]);

    const resolveGroup = async (ids) => {
        setAlerts(prev => prev.filter(a => !ids.includes(a.id)));   // optimistic
        for (const id of ids) { try { await api.post(`/weather/alerts/${id}/resolve`); } catch { /* ignore */ } }
    };

    const fmtTime = (iso) => {
        if (!iso) return '';
        try { return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-TN' : lang === 'en' ? 'en-GB' : 'fr-FR',
            { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
        catch { return ''; }
    };

    return (
        <div style={{
            direction: rtl ? 'rtl' : 'ltr',
            background: 'linear-gradient(160deg,#fff7ed 0%,#fffbeb 60%,#fef9f3 100%)',
            borderRadius: 18, border: '1px solid rgba(245,158,11,0.25)',
            padding: 16, marginTop: 16, boxShadow: '0 2px 12px rgba(245,158,11,0.08)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10, background: '#f59e0b22',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <AlertTriangle size={18} color="#f59e0b" />
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                            ⛈️ {tr('title')}
                            {alerts.length > 0 && (
                                <span style={{
                                    marginInlineStart: 8, fontSize: 11, fontWeight: 800, color: '#fff',
                                    background: '#ef4444', borderRadius: 99, padding: '1px 8px',
                                }}>{alerts.length}</span>
                            )}
                        </div>
                        <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>{tr('desc')}</div>
                    </div>
                </div>
                <button
                    onClick={runCheck}
                    disabled={checking}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                        borderRadius: 10, border: 'none', cursor: checking ? 'default' : 'pointer',
                        background: checking ? '#fbbf24' : 'linear-gradient(135deg,#f59e0b,#d97706)',
                        color: '#fff', fontSize: 12, fontWeight: 800, opacity: checking ? 0.8 : 1,
                        boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
                    }}
                >
                    <RefreshCw size={13} style={checking ? { animation: 'spin 0.8s linear infinite' } : undefined} />
                    {checking ? tr('checking') : tr('check')}
                </button>
            </div>

            {/* Check result banner */}
            {result && !result.error && (
                <div style={{
                    marginTop: 12, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: result.alerts_created > 0 ? '#fef2f2' : '#f0fdf4',
                    color: result.alerts_created > 0 ? '#991b1b' : '#166534',
                    border: `1px solid ${result.alerts_created > 0 ? '#fecaca' : '#bbf7d0'}`,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    {result.alerts_created > 0
                        ? <><AlertTriangle size={14} /> {result.alerts_created} {tr('created')} · {result.emails_sent} {tr('emails')}</>
                        : <><Check size={14} /> {tr('nochange')} ({result.farms_checked} {tr('farms')})</>
                    }
                </div>
            )}

            {/* Alerts list */}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontSize: 12, padding: 6 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #f59e0b', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                        …
                    </div>
                ) : alerts.length === 0 ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, color: '#166534',
                        fontSize: 13, fontWeight: 600,
                    }}>
                        <ShieldCheck size={18} color="#16a34a" /> {tr('none')}
                    </div>
                ) : groups.map(g => {
                    const a = g.latest;
                    const sev = SEV[a.severity] || SEV.warning;
                    return (
                        <div key={a.id} style={{
                            background: '#fff', borderRadius: 12, padding: '11px 12px',
                            border: `1px solid ${sev.border}`, borderInlineStart: `4px solid ${sev.color}`,
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                        }}>
                            <span style={{ fontSize: 22, lineHeight: 1 }}>{a.emoji || '⚠️'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{a.title}</span>
                                    <span style={{
                                        fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4,
                                        color: sev.color, background: sev.bg, border: `1px solid ${sev.border}`,
                                        borderRadius: 6, padding: '1px 6px',
                                    }}>{sev.label[lang] || sev.label.fr}</span>
                                    {g.count > 1 && (
                                        <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: sev.color, borderRadius: 6, padding: '1px 7px' }}>× {g.count}</span>
                                    )}
                                    {g.emailed && (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700,
                                            color: '#15803d', background: '#dcfce7', borderRadius: 6, padding: '1px 6px',
                                        }}>
                                            <Mail size={9} /> {tr('emailed')}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, lineHeight: 1.45 }}>{a.message}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: 10, color: '#94a3b8', fontWeight: 600, flexWrap: 'wrap' }}>
                                    {g.farms.length > 0 && <span>🏡 {g.farms.join(' · ')}</span>}
                                    <span>·</span>
                                    <span>{fmtTime(a.created_at)}</span>
                                    {g.count > 1 && <span>· {g.count} {tr('occurrences')}</span>}
                                </div>
                            </div>
                            <button
                                onClick={() => resolveGroup(g.ids)}
                                title={tr('resolve')}
                                style={{
                                    flexShrink: 0, width: 26, height: 26, borderRadius: 8, cursor: 'pointer',
                                    background: '#f1f5f9', border: '1px solid #e2e8f0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <X size={13} color="#64748b" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ── Prévision 5 jours — IA ── */}
            <div style={{ marginTop: 16, borderTop: '1px dashed rgba(245,158,11,0.35)', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Sparkles size={16} color="#0ea5e9" />
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{tr('forecast')}</span>
                    {fc?.ai_source && (
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', borderRadius: 6, padding: '1px 7px' }}>
                            {fc.ai_source === 'groq' ? 'Groq AI' : fc.ai_source === 'ollama' ? 'IA locale' : 'Règles'}
                        </span>
                    )}
                </div>

                {fcLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0369a1', fontSize: 12, padding: 6 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #0ea5e9', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                        {tr('fc_loading')}
                    </div>
                ) : (farmId == null) ? (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{tr('pick_farm')}</div>
                ) : !fc?.days?.length ? null : (
                    <>
                        {fc.ai_summary && (
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 12px', fontSize: 12.5, color: '#1e3a5f', lineHeight: 1.5, marginBottom: 10 }}>
                                🤖 {fc.ai_summary}
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(118px,1fr))', gap: 8 }}>
                            {fc.days.map((d, i) => {
                                const cond = COND[condKey(d.code)] || COND.variable;
                                const tip = dayAdvice(d, lang)[0];
                                return (
                                <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>{dayName(d.date, lang)}</div>
                                    <div style={{ fontSize: 26, lineHeight: 1.2, margin: '2px 0' }} title={cond[lang] || cond.fr}>{cond.e}</div>
                                    <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>{cond[lang] || cond.fr}</div>
                                    <div style={{ fontSize: 13, fontWeight: 800 }}>
                                        <span style={{ color: '#ef4444' }}>{Math.round(d.t_max)}°</span>
                                        <span style={{ color: '#94a3b8' }}> / {Math.round(d.t_min)}°</span>
                                    </div>
                                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <span>💧 {Math.round(d.precip_mm || 0)} mm</span>
                                        <span>💨 {Math.round(d.wind_max || 0)} km/h</span>
                                        <span>🔆 UV {Math.round(d.uv_max || 0)}</span>
                                    </div>
                                    {tip && (
                                        <div style={{ fontSize: 9.5, color: '#92400e', marginTop: 6, lineHeight: 1.3, textAlign: 'start' }}>{tip}</div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
