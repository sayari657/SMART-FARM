/**
 * BeeAICharts — Tableau de bord analytique IA pour l'apiculture
 *
 * Algorithmes Data Science implémentés :
 *  1. Régression linéaire (moindres carrés) → prévision production miel
 *  2. Moyenne mobile exponentielle (EMA)    → lissage tendance santé colonie
 *  3. Détection anomalie (Z-score)          → alertes ruches hors-norme
 *  4. Corrélation Pearson                   → floraison ↔ production
 *  5. Score d'autonomie stock               → jours restants par produit
 */
import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Brain, TrendingUp, AlertTriangle, Zap, BarChart2, Activity } from 'lucide-react';
import { COLORS } from './BeeConstants';

/* ── DS algorithms ─────────────────────────────────────────────── */

/** Linear regression (OLS) on [{x, y}] → { slope, intercept, r2 } */
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const meanY = sumY / n;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const ssTot = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  return { slope, intercept, r2 };
}

/** Exponential Moving Average — alpha ∈ (0,1] */
function ema(values, alpha = 0.3) {
  if (!values.length) return [];
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/** Z-score anomaly detection — returns indices where |z| > threshold */
function zScoreAnomalies(values, threshold = 2.0) {
  if (values.length < 3) return [];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  if (std === 0) return [];
  return values.map((v, i) => ({ i, z: Math.abs((v - mean) / std) })).filter(r => r.z > threshold).map(r => r.i);
}

/** Pearson correlation coefficient */
function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const my = ys.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const num  = xs.slice(0, n).reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0);
  const den  = Math.sqrt(
    xs.slice(0, n).reduce((s, v) => s + (v - mx) ** 2, 0) *
    ys.slice(0, n).reduce((s, v) => s + (v - my) ** 2, 0),
  );
  return den === 0 ? 0 : num / den;
}

/* ── Shared style helpers ─────────────────────────────────────── */
const cardStyle = {
  background: COLORS.surface,
  borderRadius: 24,
  border: `1px solid ${COLORS.border}`,
  padding: '24px 28px',
  display: 'flex', flexDirection: 'column', gap: 18,
};
const sectionTitle = (label, sub, icon) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${COLORS.accent}18`, border: `1px solid ${COLORS.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontWeight: 800, color: COLORS.text, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>{sub}</div>
    </div>
  </div>
);
const ttStyle = {
  background: COLORS.surface, border: `1px solid ${COLORS.border}`,
  borderRadius: 12, fontSize: 11, color: 'white',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

/* ── Chart 1: Production Forecast (Linear Regression) ─────────── */
function ProductionForecastChart({ productions }) {
  const data = useMemo(() => {
    const byMonth = {};
    productions.forEach(p => {
      const m = (p.production_date || p.date || '').slice(0, 7);
      if (!m) return;
      byMonth[m] = (byMonth[m] || 0) + (parseFloat(p.honey_kg) || 0);
    });
    const sorted = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
    const points = sorted.map(([m, v], i) => ({ x: i, y: v, label: m }));
    const reg = linearRegression(points);
    const healthyValues = points.map(p => p.y);
    const anomalyIdx = zScoreAnomalies(healthyValues, 2.0);
    const emaValues = ema(healthyValues, 0.35);

    // Project 3 months ahead
    const n = points.length;
    const projections = [1, 2, 3].map(d => {
      const px = n - 1 + d;
      const date = new Date();
      date.setMonth(date.getMonth() + d);
      return {
        label: date.toISOString().slice(0, 7),
        forecast: Math.max(0, Math.round(reg.slope * px + reg.intercept)),
        isPrediction: true,
      };
    });

    return {
      chartData: [
        ...points.map((p, i) => ({
          label: p.label,
          réel: Math.round(p.y * 10) / 10,
          EMA: Math.round(emaValues[i] * 10) / 10,
          anomalie: anomalyIdx.includes(i) ? p.y : null,
        })),
        ...projections,
      ],
      reg,
      anomalyCount: anomalyIdx.length,
    };
  }, [productions]);

  if (!data.chartData.length) return (
    <div style={{ ...cardStyle, alignItems: 'center', justifyContent: 'center', minHeight: 200, color: COLORS.textMuted, fontSize: 13 }}>
      Aucune donnée de production disponible
    </div>
  );

  return (
    <div style={cardStyle}>
      {sectionTitle('Prévision Production Miel', `Régression linéaire · R²=${data.reg.r2.toFixed(2)} · ${data.anomalyCount} anomalie(s)`, <TrendingUp size={16} color={COLORS.accent} />)}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { l: 'Tendance', v: data.reg.slope >= 0 ? '📈 Croissante' : '📉 Décroissante', c: data.reg.slope >= 0 ? COLORS.success : COLORS.error },
          { l: 'R² (précision)', v: `${(data.reg.r2 * 100).toFixed(0)}%`, c: COLORS.accent },
          { l: 'Anomalies', v: data.anomalyCount, c: data.anomalyCount > 0 ? COLORS.honey : COLORS.success },
        ].map(k => (
          <div key={k.l} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '10px 16px', minWidth: 100 }}>
            <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 800, letterSpacing: 1 }}>{k.l.toUpperCase()}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: k.c, marginTop: 4 }}>{k.v}</div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.chartData} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.overlay10} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: COLORS.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: COLORS.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} unit=" kg" />
          <Tooltip contentStyle={ttStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="réel"     stroke={COLORS.accent}   strokeWidth={2} dot={false} name="Production réelle (kg)" />
          <Line type="monotone" dataKey="EMA"      stroke={COLORS.success}  strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Tendance EMA" />
          <Line type="monotone" dataKey="forecast" stroke={COLORS.honey}    strokeWidth={2} dot={{ r: 4, fill: COLORS.honey }} strokeDasharray="6 3" name="Prévision (+3 mois)" />
          <Line type="monotone" dataKey="anomalie" stroke={COLORS.error}    strokeWidth={0} dot={{ r: 6, fill: COLORS.error, strokeWidth: 2, stroke: '#fff' }} name="Anomalie" connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Chart 2: Colony Health Trend (EMA + Anomaly Detection) ─── */
function HealthTrendChart({ ruches, visites }) {
  const data = useMemo(() => {
    if (!visites.length) return [];
    const sorted = [...visites].sort((a, b) =>
      (a.visit_date || '').localeCompare(b.visit_date || ''),
    );
    const scores = sorted.map(v => {
      const h = v.health_state === 'health' ? 90 : v.health_state === 'warning' ? 60 : v.health_state === 'urgent' ? 30 : 75;
      return h + (Math.random() * 10 - 5); // slight noise for visualization
    });
    const emaScores = ema(scores, 0.25);
    const anomalies = zScoreAnomalies(scores, 1.8);

    return sorted.map((v, i) => ({
      date:     (v.visit_date || '').slice(0, 10),
      score:    Math.round(scores[i]),
      EMA:      Math.round(emaScores[i]),
      anomalie: anomalies.includes(i) ? scores[i] : null,
      ruche:    ruches.find(r => r.id === v.hive_id)?.identifier || `#${v.hive_id}`,
    }));
  }, [visites, ruches]);

  if (!data.length) return (
    <div style={{ ...cardStyle, alignItems: 'center', justifyContent: 'center', minHeight: 200, color: COLORS.textMuted, fontSize: 13 }}>
      Effectuez des inspections pour voir la tendance santé
    </div>
  );

  return (
    <div style={cardStyle}>
      {sectionTitle('Tendance Santé Colonies', 'EMA α=0.25 · Détection anomalies Z-score > 1.8σ', <Activity size={16} color={COLORS.success} />)}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.overlay10} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: COLORS.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: COLORS.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip contentStyle={ttStyle} />
          <ReferenceLine y={60} stroke={COLORS.honey}   strokeDasharray="4 3" label={{ value: 'Seuil attention', fill: COLORS.honey,   fontSize: 9 }} />
          <ReferenceLine y={30} stroke={COLORS.error}   strokeDasharray="4 3" label={{ value: 'Seuil critique',  fill: COLORS.error,   fontSize: 9 }} />
          <Line type="monotone" dataKey="score"    stroke={COLORS.accent}  strokeWidth={1.5} dot={false} name="Score santé" />
          <Line type="monotone" dataKey="EMA"      stroke={COLORS.success} strokeWidth={2.5} dot={false} name="Tendance (EMA)" />
          <Line type="monotone" dataKey="anomalie" stroke={COLORS.error}   strokeWidth={0}   dot={{ r: 7, fill: COLORS.error }} name="Anomalie" connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Chart 3: Production par floraison (Corrélation Pearson) ── */
function FloralCorrelationChart({ productions }) {
  const data = useMemo(() => {
    const byFloral = {};
    productions.forEach(p => {
      const k = p.floral_source || p.floraison || 'Indéfinie';
      if (!byFloral[k]) byFloral[k] = { total: 0, count: 0 };
      byFloral[k].total += parseFloat(p.honey_kg) || 0;
      byFloral[k].count += 1;
    });
    return Object.entries(byFloral)
      .map(([f, d]) => ({ floraison: f, total: Math.round(d.total * 10) / 10, moyenne: Math.round((d.total / d.count) * 10) / 10, récoltes: d.count }))
      .sort((a, b) => b.total - a.total);
  }, [productions]);

  const correlation = useMemo(() => {
    const xs = data.map(d => d.récoltes);
    const ys = data.map(d => d.total);
    return pearson(xs, ys);
  }, [data]);

  if (!data.length) return null;

  const COLORS_BAR = [COLORS.accent, COLORS.honey, COLORS.success, COLORS.info, COLORS.error];

  return (
    <div style={cardStyle}>
      {sectionTitle(
        'Production par Floraison',
        `Corrélation fréquence↔rendement r=${correlation.toFixed(2)} (Pearson)`,
        <BarChart2 size={16} color={COLORS.honey} />,
      )}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.overlay10} vertical={false} />
          <XAxis dataKey="floraison" tick={{ fill: COLORS.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: COLORS.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} unit=" kg" />
          <Tooltip contentStyle={ttStyle} />
          <Bar dataKey="total" name="Total (kg)" radius={[8, 8, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS_BAR[i % COLORS_BAR.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 11, color: COLORS.textMuted, padding: '4px 0' }}>
        {Math.abs(correlation) > 0.7 ? '✅ Forte corrélation' : Math.abs(correlation) > 0.4 ? '⚠️ Corrélation modérée' : '❌ Faible corrélation'} entre nombre de récoltes et volume produit (r={correlation.toFixed(2)})
      </div>
    </div>
  );
}

/* ── Chart 4: Radar santé par ruche ─────────────────────────── */
function HiveRadarChart({ ruches }) {
  const data = useMemo(() =>
    ruches.slice(0, 8).map(r => ({
      ruche:      r.identifier,
      santé:      Math.round((r.health_score || 5) * 10),
      miel:       r.honey_level === 'Excellent' ? 100 : r.honey_level === 'Bon' ? 75 : r.honey_level === 'Moyen' ? 50 : 25,
      force:      Math.round((r.force_level  || 5) * 10),
      température:r.brood_temp ? Math.min(100, Math.round(((r.brood_temp - 30) / 10) * 100)) : 50,
    })),
  [ruches]);

  if (data.length < 2) return null;

  return (
    <div style={cardStyle}>
      {sectionTitle('Profil Multi-Critères Ruches', 'Santé · Miel · Force · Température couvain', <Zap size={16} color={COLORS.info} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
        {data.slice(0, 4).map((d, idx) => (
          <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 12, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: COLORS.accent, marginBottom: 8 }}>{d.ruche}</div>
            <ResponsiveContainer width="100%" height={130}>
              <RadarChart data={[
                { subject: 'Santé',  A: d.santé },
                { subject: 'Miel',   A: d.miel  },
                { subject: 'Force',  A: d.force },
                { subject: 'Temp',   A: d.température },
              ]}>
                <PolarGrid stroke={COLORS.border} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: COLORS.textMuted, fontSize: 9 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="A" stroke={COLORS.accent} fill={COLORS.accent} fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Chart 5: Stock Autonomy Prediction ─────────────────────── */
function StockAutonomyChart({ stock, ruches }) {
  const data = useMemo(() => {
    const DAILY_RATES = { sirop: 0.5, pate: 0.2, traitement: 0.08, cadres: 0.05, hausse: 0.02, equipement: 0.01 };
    const nhives = Math.max(1, ruches.length);
    return Object.entries(DAILY_RATES).map(([key, rate]) => {
      const qty    = stock[key] || 0;
      const daily  = rate * nhives;
      const days   = daily > 0 ? Math.round(qty / daily) : 999;
      const pct    = Math.min(100, (qty / Math.max(1, daily * 30)) * 100);
      return {
        produit:   key.charAt(0).toUpperCase() + key.slice(1),
        jours:     days > 365 ? 365 : days,
        stock:     qty,
        alerte:    days < 7,
        attention: days < 14 && days >= 7,
        couleur:   days < 7 ? COLORS.error : days < 14 ? COLORS.honey : COLORS.success,
        pct:       Math.round(pct),
      };
    });
  }, [stock, ruches]);

  const alertes = data.filter(d => d.alerte).length;

  return (
    <div style={cardStyle}>
      {sectionTitle(
        'Autonomie Stock Prévisionnelle',
        `Taux consommation / ruche · ${alertes} alerte(s) critique(s)`,
        <AlertTriangle size={16} color={alertes > 0 ? COLORS.error : COLORS.success} />,
      )}
      {alertes > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: `${COLORS.error}12`, border: `1px solid ${COLORS.error}30` }}>
          <AlertTriangle size={14} color={COLORS.error} />
          <span style={{ fontSize: 12, color: COLORS.error, fontWeight: 700 }}>
            {data.filter(d => d.alerte).map(d => d.produit).join(', ')} — Stock critique (&lt;7 jours)
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.overlay10} horizontal={false} />
          <XAxis type="number" tick={{ fill: COLORS.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} unit=" j" domain={[0, 30]} />
          <YAxis type="category" dataKey="produit" tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} width={75} />
          <Tooltip contentStyle={ttStyle} formatter={(v) => [`${v} jours`, 'Autonomie']} />
          <ReferenceLine x={7}  stroke={COLORS.error}  strokeDasharray="3 2" />
          <ReferenceLine x={14} stroke={COLORS.honey} strokeDasharray="3 2" />
          <Bar dataKey="jours" radius={[0, 8, 8, 0]} name="Autonomie (jours)">
            {data.map((d, i) => <Cell key={i} fill={d.couleur} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: COLORS.textMuted }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.error }} /> &lt;7j = critique</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.honey }} /> &lt;14j = attention</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.success }} /> ≥14j = OK</span>
      </div>
    </div>
  );
}

/* ── Main export ────────────────────────────────────────────── */
export default function BeeAICharts({ ruches = [], emplacements = [], productions = [], visites = [], stock = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px', background: `linear-gradient(135deg, ${COLORS.surface}, rgba(217,119,6,0.06))`, borderRadius: 20, border: `1px solid ${COLORS.border}` }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${COLORS.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Brain size={22} color={COLORS.accent} />
        </div>
        <div>
          <div style={{ fontWeight: 900, color: COLORS.text, fontSize: 15 }}>Analyses IA & Data Science</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
            Régression linéaire · EMA · Z-score · Pearson · Prédiction stock
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {[
            { l: `${ruches.length} ruches`,      c: COLORS.accent  },
            { l: `${productions.length} récoltes`, c: COLORS.honey  },
            { l: `${visites.length} visites`,    c: COLORS.success },
          ].map(b => (
            <div key={b.l} style={{ padding: '5px 12px', borderRadius: 99, background: `${b.c}15`, border: `1px solid ${b.c}30`, fontSize: 11, fontWeight: 700, color: b.c }}>
              {b.l}
            </div>
          ))}
        </div>
      </div>

      {/* 2-column grid on large screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
        <ProductionForecastChart productions={productions} />
        <HealthTrendChart ruches={ruches} visites={visites} />
        <FloralCorrelationChart productions={productions} />
        <StockAutonomyChart stock={stock} ruches={ruches} />
      </div>

      {/* Full-width radar */}
      <HiveRadarChart ruches={ruches} />
    </div>
  );
}
