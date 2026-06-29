import React from 'react';
import { useTranslation } from 'react-i18next';

/* ════════════════════════════════════════════════════════════════════════
   WeatherDashboard — MSN-Weather-style panel, 100 % data-driven (Open-Meteo)
   Sections: current card · hourly strip · daily strip · details grid ·
             monthly outlook calendar · temperature trend chart
   No API key, no hard-coded values — everything comes from the live API.
   ════════════════════════════════════════════════════════════════════════ */

// ── Tiny tri-lingual label dictionary (fr / en / ar) ──────────────────────
const T = {
    weather:       { fr: 'Météo',                 en: 'Weather',          ar: 'الطقس' },
    realtime:      { fr: 'Temps réel',            en: 'Real-time',        ar: 'الوقت الحقيقي' },
    now:           { fr: 'Maintenant',            en: 'Now',              ar: 'الآن' },
    feels_like:    { fr: 'Ressenti',              en: 'Feels like',       ar: 'يبدو كـ' },
    hourly:        { fr: 'Par heure',             en: 'Hourly',           ar: 'كل ساعة' },
    daily:         { fr: 'Prévisions',            en: 'Daily forecast',   ar: 'الأيام القادمة' },
    details:       { fr: 'Détails météo',         en: 'Weather details',  ar: 'تفاصيل الطقس' },
    humidity:      { fr: 'Humidité',              en: 'Humidity',         ar: 'الرطوبة' },
    wind:          { fr: 'Vent',                  en: 'Wind',             ar: 'الرياح' },
    pressure:      { fr: 'Pression',              en: 'Pressure',         ar: 'الضغط' },
    visibility:    { fr: 'Visibilité',            en: 'Visibility',       ar: 'الرؤية' },
    precipitation: { fr: 'Précipitations',        en: 'Precipitation',    ar: 'هطول الأمطار' },
    cloud_cover:   { fr: 'Couverture nuageuse',   en: 'Cloud cover',      ar: 'الغطاء السحابي' },
    uv:            { fr: 'Indice UV',             en: 'UV index',         ar: 'الأشعة فوق البنفسجية' },
    aqi:           { fr: 'Qualité de l’air',      en: 'Air quality',      ar: 'جودة الهواء' },
    sun:           { fr: 'Soleil',               en: 'Sun',              ar: 'الشمس' },
    sunrise:       { fr: 'Lever',                 en: 'Sunrise',          ar: 'الشروق' },
    sunset:        { fr: 'Coucher',               en: 'Sunset',           ar: 'الغروب' },
    moon:          { fr: 'Phase lunaire',         en: 'Moon phase',       ar: 'مرحلة القمر' },
    calendar:      { fr: 'Mensuel',               en: 'Monthly',          ar: 'شهرياً' },
    trends:        { fr: 'Tendances de température', en: 'Temperature trends', ar: 'اتجاهات درجة الحرارة' },
    chance_rain:   { fr: 'Risque de pluie',       en: 'Chance of rain',   ar: 'احتمال المطر' },
    max:           { fr: 'Max',                   en: 'High',             ar: 'العظمى' },
    min:           { fr: 'Min',                   en: 'Low',              ar: 'الصغرى' },
    loading:       { fr: 'Chargement de la météo…', en: 'Loading weather…', ar: 'جارٍ تحميل الطقس…' },
    error:         { fr: 'Météo indisponible',    en: 'Weather unavailable', ar: 'الطقس غير متاح' },
    source:        { fr: 'Source : Open-Meteo · temps réel', en: 'Source: Open-Meteo · real-time', ar: 'المصدر: Open-Meteo · الوقت الحقيقي' },
    // weather categories
    clear:         { fr: 'Ciel dégagé',           en: 'Clear',            ar: 'صافٍ' },
    sunny:         { fr: 'Ensoleillé',            en: 'Sunny',            ar: 'مشمس' },
    mainly_clear:  { fr: 'Plutôt dégagé',         en: 'Mainly clear',     ar: 'صافٍ غالباً' },
    partly_cloudy: { fr: 'Partiellement nuageux', en: 'Partly cloudy',    ar: 'غائم جزئياً' },
    cloudy:        { fr: 'Nuageux',               en: 'Cloudy',           ar: 'غائم' },
    fog:           { fr: 'Brouillard',            en: 'Fog',              ar: 'ضباب' },
    drizzle:       { fr: 'Bruine',                en: 'Drizzle',          ar: 'رذاذ' },
    rain:          { fr: 'Pluie',                 en: 'Rain',             ar: 'مطر' },
    snow:          { fr: 'Neige',                 en: 'Snow',             ar: 'ثلج' },
    thunderstorm:  { fr: 'Orage',                 en: 'Thunderstorm',     ar: 'عاصفة رعدية' },
    // AQI levels
    aqi_good:      { fr: 'Bonne',                 en: 'Good',             ar: 'جيدة' },
    aqi_moderate:  { fr: 'Modérée',               en: 'Moderate',         ar: 'معتدلة' },
    aqi_sensitive: { fr: 'Sensible',              en: 'Sensitive groups', ar: 'حساسة' },
    aqi_unhealthy: { fr: 'Mauvaise',              en: 'Unhealthy',        ar: 'غير صحية' },
    aqi_very_bad:  { fr: 'Très mauvaise',         en: 'Very unhealthy',   ar: 'سيئة جداً' },
    aqi_hazard:    { fr: 'Dangereuse',            en: 'Hazardous',        ar: 'خطيرة' },
    // UV levels
    uv_low:        { fr: 'Faible',                en: 'Low',              ar: 'منخفض' },
    uv_moderate:   { fr: 'Modéré',                en: 'Moderate',         ar: 'معتدل' },
    uv_high:       { fr: 'Élevé',                 en: 'High',             ar: 'مرتفع' },
    uv_very_high:  { fr: 'Très élevé',            en: 'Very high',        ar: 'مرتفع جداً' },
    uv_extreme:    { fr: 'Extrême',               en: 'Extreme',          ar: 'شديد' },
};

// ── WMO weather code → emoji + category id ────────────────────────────────
function wmo(code, isDay = 1) {
    const d = isDay !== 0;
    if (code === 0)                      return { emoji: d ? '☀️' : '🌙', cat: d ? 'sunny' : 'clear' };
    if (code === 1)                      return { emoji: d ? '🌤️' : '🌙', cat: 'mainly_clear' };
    if (code === 2)                      return { emoji: d ? '⛅' : '☁️', cat: 'partly_cloudy' };
    if (code === 3)                      return { emoji: '☁️', cat: 'cloudy' };
    if (code === 45 || code === 48)      return { emoji: '🌫️', cat: 'fog' };
    if (code >= 51 && code <= 57)        return { emoji: '🌦️', cat: 'drizzle' };
    if (code >= 61 && code <= 67)        return { emoji: '🌧️', cat: 'rain' };
    if (code >= 71 && code <= 77)        return { emoji: '🌨️', cat: 'snow' };
    if (code >= 80 && code <= 82)        return { emoji: '🌧️', cat: 'rain' };
    if (code >= 85 && code <= 86)        return { emoji: '🌨️', cat: 'snow' };
    if (code >= 95)                      return { emoji: '⛈️', cat: 'thunderstorm' };
    return { emoji: d ? '🌤️' : '🌙', cat: 'mainly_clear' };
}

// ── Moon phase (synodic month since reference new moon) ───────────────────
function moonPhase(date = new Date()) {
    const synodic = 29.53058867;
    const ref = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
    const now = date.getTime() / 86400000;
    const age = (((now - ref) % synodic) + synodic) % synodic;
    const frac = age / synodic;                              // 0..1 through the cycle
    const illum = Math.round(((1 - Math.cos(2 * Math.PI * frac)) / 2) * 100);
    const emojis = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
    const emoji = emojis[Math.round(frac * 8) % 8];
    return { illum, emoji };
}

function aqiInfo(aqi) {
    if (aqi == null)   return { key: 'aqi_moderate', color: '#94a3b8' };
    if (aqi <= 50)     return { key: 'aqi_good',      color: '#22c55e' };
    if (aqi <= 100)    return { key: 'aqi_moderate',  color: '#eab308' };
    if (aqi <= 150)    return { key: 'aqi_sensitive', color: '#f97316' };
    if (aqi <= 200)    return { key: 'aqi_unhealthy', color: '#ef4444' };
    if (aqi <= 300)    return { key: 'aqi_very_bad',  color: '#a21caf' };
    return { key: 'aqi_hazard', color: '#7f1d1d' };
}

function uvInfo(uv) {
    if (uv == null)  return { key: 'uv_low',       color: '#22c55e' };
    if (uv < 3)      return { key: 'uv_low',       color: '#22c55e' };
    if (uv < 6)      return { key: 'uv_moderate',  color: '#eab308' };
    if (uv < 8)      return { key: 'uv_high',      color: '#f97316' };
    if (uv < 11)     return { key: 'uv_very_high', color: '#ef4444' };
    return { key: 'uv_extreme', color: '#a21caf' };
}

const round = (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : (+v).toFixed(d));

export default function WeatherDashboard({ lat, lon, locationName }) {
    const { i18n } = useTranslation();
    const lang = ['fr', 'en', 'ar'].includes(i18n.language) ? i18n.language : 'fr';
    const rtl = lang === 'ar';
    const tr = (k) => T[k]?.[lang] ?? T[k]?.fr ?? k;
    const locale = lang === 'ar' ? 'ar-TN' : lang === 'en' ? 'en-GB' : 'fr-FR';

    const [data, setData]       = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError]     = React.useState(false);

    React.useEffect(() => {
        if (lat == null || lon == null) return;
        let alive = true;
        setLoading(true);
        setError(false);

        const la = (+lat).toFixed(4), lo = (+lon).toFixed(4);
        const fUrl = `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}`
            + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,visibility`
            + `&hourly=temperature_2m,weather_code,precipitation_probability,is_day`
            + `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max`
            + `&timezone=auto&forecast_days=16`;
        const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${la}&longitude=${lo}&current=us_aqi,uv_index&timezone=auto`;

        const t = setTimeout(async () => {
            try {
                const [f, a] = await Promise.all([
                    fetch(fUrl, { signal: AbortSignal.timeout(15000) }).then(r => r.json()),
                    fetch(aUrl, { signal: AbortSignal.timeout(15000) }).then(r => r.json()).catch(() => null),
                ]);
                if (!alive) return;
                if (!f?.current) { setError(true); setLoading(false); return; }
                setData({ f, a });
                setLoading(false);
            } catch {
                if (alive) { setError(true); setLoading(false); }
            }
        }, 250);                                              // debounce rapid lat/lon changes

        return () => { alive = false; clearTimeout(t); };
    }, [lat, lon]);

    // ── shared card styling ──
    const shell = {
        direction: rtl ? 'rtl' : 'ltr',
        background: 'linear-gradient(160deg, #e9f1fb 0%, #f4f8ff 60%, #eef5ff 100%)',
        borderRadius: 18, border: '1px solid rgba(148,163,184,0.18)',
        padding: 16, marginTop: 16,
    };
    const card = {
        background: '#fff', borderRadius: 16, border: '1px solid rgba(15,23,42,0.06)',
        boxShadow: '0 2px 12px rgba(15,23,42,0.05)', padding: 16,
    };
    const sectionTitle = { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10, letterSpacing: 0.2 };

    if (loading) {
        return (
            <div style={{ ...shell, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 120 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>{tr('loading')}</span>
            </div>
        );
    }
    if (error || !data) {
        return (
            <div style={{ ...shell, textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 28 }}>
                ⚠️ {tr('error')}
            </div>
        );
    }

    const { f, a } = data;
    const cur = f.current;
    const curW = wmo(cur.weather_code, cur.is_day);
    const aqi = a?.current?.us_aqi ?? null;
    const uvNow = a?.current?.uv_index ?? f.daily?.uv_index_max?.[0] ?? null;
    const aqiI = aqiInfo(aqi);
    const uvI = uvInfo(uvNow);
    const moon = moonPhase(new Date());

    // ── hourly: start at the current hour, next 24 ──
    const hourly = [];
    if (f.hourly?.time) {
        const anchor = cur.time;                              // "YYYY-MM-DDTHH:mm"
        let start = f.hourly.time.findIndex(ti => ti >= anchor);
        if (start < 0) start = 0;
        for (let i = start; i < Math.min(start + 24, f.hourly.time.length); i++) {
            hourly.push({
                time: f.hourly.time[i],
                temp: f.hourly.temperature_2m[i],
                code: f.hourly.weather_code[i],
                isDay: f.hourly.is_day?.[i] ?? 1,
                pop: f.hourly.precipitation_probability?.[i],
                first: i === start,
            });
        }
    }

    // ── daily ──
    const daily = (f.daily?.time || []).map((d, i) => ({
        date: d,
        code: f.daily.weather_code[i],
        max: f.daily.temperature_2m_max[i],
        min: f.daily.temperature_2m_min[i],
        sunrise: f.daily.sunrise?.[i],
        sunset: f.daily.sunset?.[i],
        pop: f.daily.precipitation_probability_max?.[i],
        precipitation_sum: f.daily.precipitation_sum?.[i],
    }));

    const fmtHour = (iso) => {
        const h = iso.slice(11, 13);
        return lang === 'en' ? `${(+h % 12) || 12}${+h < 12 ? 'AM' : 'PM'}` : `${h}:00`;
    };
    const fmtDay = (iso) => new Date(iso + 'T12:00').toLocaleDateString(locale, { weekday: 'short' });
    const fmtTime = (iso) => iso ? iso.slice(11, 16) : '—';

    // small reusable detail card
    const Detail = ({ icon, label, big, sub, accent }) => (
        <div style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 104 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{label}</span>
                <span style={{ fontSize: 15 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: accent || '#0f172a', lineHeight: 1.1 }}>{big}</div>
            {sub && <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{sub}</div>}
        </div>
    );

    // ── monthly calendar (current month, populated where forecast exists) ──
    const dayMap = new Map(daily.map(d => [d.date, d]));
    const today = new Date();
    const y = today.getFullYear(), mo = today.getMonth();
    const first = new Date(y, mo, 1);
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const lead = first.getDay();                              // 0=Sun
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({ d, key, fc: dayMap.get(key), isToday: d === today.getDate() });
    }
    const weekdays = [...Array(7)].map((_, i) =>
        new Date(2024, 0, 7 + i).toLocaleDateString(locale, { weekday: 'narrow' }));   // Sun..Sat
    const monthName = first.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

    return (
        <div style={shell}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, padding: '0 2px' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    🌤️ {tr('weather')}{locationName ? ` · ${locationName}` : ''}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {tr('realtime')}
                </span>
            </div>

            {/* ── Current conditions ── */}
            <div style={{ ...card, padding: 20, marginBottom: 14, background: 'linear-gradient(135deg,#ffffff 0%,#f0f7ff 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>{tr('now')}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{tr(curW.cat)}</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                            {tr('feels_like')} {round(cur.apparent_temperature)}°
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 56, lineHeight: 1 }}>{curW.emoji}</span>
                        <span style={{ fontSize: 64, fontWeight: 300, color: '#0f172a', lineHeight: 1 }}>{round(cur.temperature_2m)}°</span>
                    </div>
                </div>
                {/* quick stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 10, marginTop: 18 }}>
                    {[
                        { l: tr('humidity'),   v: `${round(cur.relative_humidity_2m)}%` },
                        { l: tr('wind'),       v: `${round(cur.wind_speed_10m)} km/h` },
                        { l: tr('pressure'),   v: `${round(cur.pressure_msl)} hPa` },
                        { l: tr('visibility'), v: `${round((cur.visibility ?? 0) / 1000)} km` },
                        { l: tr('precipitation'), v: `${round(cur.precipitation, 1)} mm` },
                    ].map(s => (
                        <div key={s.l} style={{ background: 'rgba(241,245,249,0.7)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 3 }}>{s.l}</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{s.v}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Hourly strip ── */}
            <div style={{ ...card, marginBottom: 14 }}>
                <div style={sectionTitle}>{tr('hourly')}</div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {hourly.map((h, i) => {
                        const w = wmo(h.code, h.isDay);
                        return (
                            <div key={i} style={{
                                flex: '0 0 auto', width: 66, textAlign: 'center',
                                background: h.first ? 'linear-gradient(160deg,#dbeafe,#eff6ff)' : 'rgba(248,250,252,0.8)',
                                border: h.first ? '1px solid #93c5fd' : '1px solid rgba(15,23,42,0.05)',
                                borderRadius: 14, padding: '10px 4px',
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{h.first ? tr('now') : fmtHour(h.time)}</div>
                                <div style={{ fontSize: 22, margin: '4px 0' }}>{w.emoji}</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{round(h.temp)}°</div>
                                <div style={{ fontSize: 10, color: h.pop > 0 ? '#3b82f6' : '#cbd5e1', fontWeight: 700, marginTop: 3 }}>
                                    💧{round(h.pop)}%
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Daily strip ── */}
            <div style={{ ...card, marginBottom: 14 }}>
                <div style={sectionTitle}>{tr('daily')}</div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {daily.slice(0, 10).map((d, i) => {
                        const w = wmo(d.code, 1);
                        return (
                            <div key={i} style={{
                                flex: '0 0 auto', width: 78, textAlign: 'center',
                                background: i === 0 ? 'linear-gradient(160deg,#dbeafe,#eff6ff)' : 'rgba(248,250,252,0.8)',
                                border: i === 0 ? '1px solid #93c5fd' : '1px solid rgba(15,23,42,0.05)',
                                borderRadius: 14, padding: '12px 4px',
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'capitalize' }}>
                                    {i === 0 ? tr('now') : fmtDay(d.date)}
                                </div>
                                <div style={{ fontSize: 26, margin: '6px 0' }}>{w.emoji}</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{round(d.max)}°</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{round(d.min)}°</div>
                                {d.pop > 0 && <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, marginTop: 3 }}>💧{round(d.pop)}%</div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Details grid ── */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ ...sectionTitle, padding: '0 2px' }}>{tr('details')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                    <Detail icon="🌧️" label={tr('precipitation')} big={`${round(daily[0]?.precipitation_sum ?? cur.precipitation, 1)} mm`}
                        sub={`${tr('chance_rain')} ${round(daily[0]?.pop)}%`} />
                    <Detail icon="☁️" label={tr('cloud_cover')} big={`${round(cur.cloud_cover)}%`} sub={tr(curW.cat)} />
                    <Detail icon="💧" label={tr('humidity')} big={`${round(cur.relative_humidity_2m)}%`}
                        sub={`${tr('feels_like')} ${round(cur.apparent_temperature)}°`} />
                    <Detail icon="💨" label={tr('wind')} big={`${round(cur.wind_speed_10m)} km/h`}
                        sub={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ display: 'inline-block', transform: `rotate(${(cur.wind_direction_10m ?? 0)}deg)` }}>↑</span>
                            {round(cur.wind_direction_10m)}°
                        </span>} />
                    <Detail icon="🌫️" label={tr('aqi')} big={round(aqi)} sub={tr(aqiI.key)} accent={aqiI.color} />
                    <Detail icon="🔆" label={tr('uv')} big={round(uvNow, 1)} sub={tr(uvI.key)} accent={uvI.color} />
                    <Detail icon="🌅" label={tr('sun')}
                        big={<span style={{ fontSize: 18 }}>↑ {fmtTime(daily[0]?.sunrise)}</span>}
                        sub={`↓ ${fmtTime(daily[0]?.sunset)}`} />
                    <Detail icon={moon.emoji} label={tr('moon')} big={`${moon.illum}%`} />
                    <Detail icon="🧭" label={tr('pressure')} big={`${round(cur.pressure_msl)}`} sub="hPa" />
                    <Detail icon="👁️" label={tr('visibility')} big={`${round((cur.visibility ?? 0) / 1000)} km`} />
                </div>
            </div>

            {/* ── Monthly outlook calendar ── */}
            <div style={{ ...card, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={sectionTitle}>{tr('calendar')}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'capitalize' }}>{monthName}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
                    {weekdays.map((w, i) => (
                        <div key={`wd${i}`} style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#94a3b8', paddingBottom: 2 }}>{w}</div>
                    ))}
                    {cells.map((c, i) => {
                        if (!c) return <div key={`e${i}`} />;
                        const w = c.fc ? wmo(c.fc.code, 1) : null;
                        return (
                            <div key={c.key} style={{
                                aspectRatio: '1 / 1.15', borderRadius: 10, padding: '4px 2px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                                background: c.isToday ? 'linear-gradient(160deg,#dbeafe,#eff6ff)' : c.fc ? 'rgba(248,250,252,0.9)' : 'transparent',
                                border: c.isToday ? '1.5px solid #3b82f6' : c.fc ? '1px solid rgba(15,23,42,0.05)' : '1px dashed rgba(148,163,184,0.25)',
                                opacity: c.fc ? 1 : 0.45,
                            }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: c.isToday ? '#1d4ed8' : '#64748b' }}>{c.d}</span>
                                {w && <span style={{ fontSize: 15, lineHeight: 1 }}>{w.emoji}</span>}
                                {c.fc && <span style={{ fontSize: 9, fontWeight: 800, color: '#0f172a' }}>{round(c.fc.max)}°</span>}
                                {c.fc && <span style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8' }}>{round(c.fc.min)}°</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Temperature trend chart ── */}
            <TrendChart daily={daily} title={tr('trends')} locale={locale} card={card} sectionTitle={sectionTitle}
                maxLabel={tr('max')} minLabel={tr('min')} />

            <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 10, fontWeight: 600 }}>
                {tr('source')}
            </div>
        </div>
    );
}

// ── SVG temperature trend chart (max / min over the forecast window) ──────
function TrendChart({ daily, title, locale, card, sectionTitle, maxLabel, minLabel }) {
    if (!daily?.length) return null;
    const W = 720, H = 220, padX = 34, padY = 26;
    const maxs = daily.map(d => d.max), mins = daily.map(d => d.min);
    const hi = Math.ceil(Math.max(...maxs) + 2);
    const lo = Math.floor(Math.min(...mins) - 2);
    const n = daily.length;
    const xs = (i) => padX + (i * (W - 2 * padX)) / (n - 1);
    const ys = (v) => H - padY - ((v - lo) / (hi - lo)) * (H - 2 * padY);
    const lineMax = maxs.map((v, i) => `${xs(i)},${ys(v)}`).join(' ');
    const lineMin = mins.map((v, i) => `${xs(i)},${ys(v)}`).join(' ');
    const area = `${maxs.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs(i)},${ys(v)}`).join(' ')} `
        + `${mins.map((v, i) => `L${xs(n - 1 - i)},${ys(mins[n - 1 - i])}`).join(' ')} Z`;
    const gridVals = [lo, Math.round((lo + hi) / 2), hi];
    const tick = (i) => new Date(daily[i].date + 'T12:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });

    return (
        <div style={{ ...card, marginBottom: 14 }}>
            <div style={sectionTitle}>{title}</div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="wbandgrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.35" />
                    </linearGradient>
                </defs>
                {gridVals.map((g, i) => (
                    <g key={i}>
                        <line x1={padX} y1={ys(g)} x2={W - padX} y2={ys(g)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 4" />
                        <text x={6} y={ys(g) + 4} fontSize="11" fill="#94a3b8">{g}°</text>
                    </g>
                ))}
                <path d={area} fill="url(#wbandgrad)" />
                <polyline points={lineMax} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" />
                <polyline points={lineMin} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
                {maxs.map((v, i) => <circle key={`mx${i}`} cx={xs(i)} cy={ys(v)} r="3" fill="#ef4444" />)}
                {mins.map((v, i) => <circle key={`mn${i}`} cx={xs(i)} cy={ys(v)} r="3" fill="#3b82f6" />)}
                {daily.map((d, i) => (
                    (i === 0 || i === Math.floor(n / 2) || i === n - 1)
                        ? <text key={`tk${i}`} x={xs(i)} y={H - 6} fontSize="10" fill="#94a3b8" textAnchor="middle">{tick(i)}</text>
                        : null
                ))}
            </svg>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>● {maxLabel}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>● {minLabel}</span>
            </div>
        </div>
    );
}
