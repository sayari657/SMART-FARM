import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Activity, Zap, Heart, CheckCircle, RefreshCw,
  ScanEye, Shield, Clock, X, ZoomIn, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import { COLORS } from './BeeConstants';
import AIScanner from '../AIScanner';

const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}`;
const PRED_URL = `${BASE}/bee/analytics/predict`;
const HIST_MAX = 20;

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/* ── compress image to thumbnail (max 480px wide, 0.7 quality) ── */
function compressImage(dataUrl, maxW = 480) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/* ── shared bbox drawing util ── */
function drawBboxes(canvas, containerEl, detections, accentColor = COLORS.accent) {
  if (!canvas || !containerEl || !detections?.length) return;
  canvas.width  = containerEl.offsetWidth;
  canvas.height = containerEl.offsetHeight;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const W = canvas.width, H = canvas.height;
  detections.forEach(det => {
    const [cx_p, cy_p, w_p, h_p] = det.bbox;
    const w = (w_p / 100) * W, h = (h_p / 100) * H;
    const cx = (cx_p / 100) * W, cy = (cy_p / 100) * H;
    const x1 = cx - w / 2, y1 = cy - h / 2;
    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = accentColor;
    ctx.strokeRect(x1, y1, w, h);
    const lbl = `${det.label} ${Math.floor(det.confidence * 100)}%`;
    ctx.font = 'bold 10px Inter,sans-serif';
    const tw = ctx.measureText(lbl).width;
    ctx.shadowBlur = 0;
    ctx.fillStyle = accentColor;
    ctx.fillRect(x1, Math.max(0, y1 - 17), tw + 8, 17);
    ctx.fillStyle = '#000';
    ctx.fillText(lbl, x1 + 4, Math.max(12, y1 - 4));
    ctx.restore();
  });
}

/* ── BboxImage — img + canvas overlay ── */
function BboxImage({ imageUrl, detections, style, onClick }) {
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);

  const redraw = useCallback(() => {
    drawBboxes(canvasRef.current, wrapRef.current, detections);
  }, [detections]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    img.addEventListener('load', redraw);
    if (img.complete) redraw();
    return () => img.removeEventListener('load', redraw);
  }, [redraw]);

  useEffect(() => { setTimeout(redraw, 80); }, [redraw]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', overflow: 'hidden', cursor: onClick ? 'zoom-in' : 'default', ...style }}
      onClick={onClick}>
      <img ref={imgRef} src={imageUrl} alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }} />
      {onClick && (
        <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 3,
          width: 28, height: 28, borderRadius: 7, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ZoomIn size={14} color="white" />
        </div>
      )}
    </div>
  );
}

/* ── Zoom modal ── */
function ZoomModal({ entry, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`,
        maxWidth: 860, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Modal header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <ScanEye size={16} color={COLORS.accent} />
          <span style={{ color: 'white', fontWeight: 800, fontSize: 14, flex: 1 }}>
            Analyse · {new Date(entry.timestamp).toLocaleString('fr-FR')}
          </span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginRight: 12 }}>
            <span style={{ color: COLORS.accent, fontWeight: 900, fontSize: 13 }}>
              {entry.report.beeCount} abeille(s)
            </span>
            <span style={{ color: entry.report.activityColor, fontWeight: 800, fontSize: 12 }}>
              {entry.report.activityLevel}
            </span>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Image with bboxes */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {entry.imageUrl ? (
            <BboxImage
              imageUrl={entry.imageUrl}
              detections={entry.detections}
              style={{ width: '100%', maxHeight: 480, borderRadius: 0 }}
            />
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
              Image non disponible
            </div>
          )}

          {/* Detection list */}
          {entry.detections.length > 0 && (
            <div style={{ padding: '14px 20px' }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
                Détections ({entry.detections.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 7 }}>
                {entry.detections.map((d, i) => (
                  <div key={i} style={{ padding: '7px 12px', borderRadius: 10,
                    background: COLORS.accent + '0a', border: `1px solid ${COLORS.accent}25`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{d.label}</span>
                    <span style={{ color: COLORS.accent, fontWeight: 900, fontSize: 12 }}>
                      {Math.floor(d.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Analysis card (history) ── */
function AnalysisCard({ entry, onZoom, onDelete, idx, total }) {
  return (
    <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`,
      overflow: 'hidden', position: 'relative' }}>
      {/* Thumbnail */}
      {entry.imageUrl ? (
        <BboxImage
          imageUrl={entry.imageUrl}
          detections={entry.detections}
          style={{ height: 130, borderRadius: 0 }}
          onClick={onZoom}
        />
      ) : (
        <div style={{ height: 130, background: 'rgba(255,255,255,0.02)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, cursor: 'pointer' }}
          onClick={onZoom}>
          <ScanEye size={28} style={{ opacity: 0.3 }} />
        </div>
      )}

      {/* Evolution badge (vs previous) */}
      {idx < total - 1 && (
        <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 3,
          padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 800,
          background: 'rgba(0,0,0,0.75)', color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 3 }}>
          #{total - idx}
        </div>
      )}
      {idx === 0 && (
        <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 3,
          padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 800,
          background: COLORS.accent + 'cc', color: 'white' }}>
          RÉCENT
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={10} color={COLORS.textMuted} />
            <span style={{ color: COLORS.textMuted, fontSize: 10 }}>
              {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(239,68,68,0.12)',
              border: 'none', color: COLORS.error, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={10} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, padding: '5px 8px', borderRadius: 8, background: COLORS.accent + '0f', textAlign: 'center' }}>
            <div style={{ color: COLORS.accent, fontWeight: 900, fontSize: 15 }}>{entry.report.beeCount}</div>
            <div style={{ color: COLORS.textMuted, fontSize: 8, fontWeight: 700 }}>ABEILLES</div>
          </div>
          <div style={{ flex: 1, padding: '5px 8px', borderRadius: 8,
            background: entry.report.activityColor + '0f', textAlign: 'center' }}>
            <div style={{ color: entry.report.activityColor, fontWeight: 900, fontSize: 10, marginTop: 3 }}>
              {entry.report.activityLevel}
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: 8, fontWeight: 700, marginTop: 1 }}>ACTIVITÉ</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Evolution comparison strip ── */
function EvolutionStrip({ history }) {
  if (history.length < 2) return null;
  const recent = history[0];
  const prev   = history[1];
  const delta  = recent.report.beeCount - prev.report.beeCount;
  const deltaH = (recent.report.healthScore ?? 7) - (prev.report.healthScore ?? 7);

  return (
    <div style={{ padding: '10px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: COLORS.textMuted, letterSpacing: '1px', textTransform: 'uppercase' }}>
        Évolution vs analyse précédente
      </div>
      {[
        { label: 'Abeilles', delta, unit: '' },
        { label: 'Score santé', delta: parseFloat(deltaH.toFixed(2)), unit: '/10' },
      ].map(m => (
        <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{m.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {m.delta > 0 ? <ChevronUp size={13} color={COLORS.success} /> : m.delta < 0 ? <ChevronDown size={13} color={COLORS.error} /> : null}
            <span style={{ color: m.delta > 0 ? COLORS.success : m.delta < 0 ? COLORS.error : COLORS.textMuted,
              fontWeight: 900, fontSize: 13 }}>
              {m.delta > 0 ? '+' : ''}{m.delta}{m.unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Report generation ── */
function generateReport(hive, detections, prediction) {
  const beeCount = detections.filter(d => d.label.toLowerCase().includes('bee')).length;
  const total    = detections.length;
  const avgConf  = total > 0
    ? Math.round(detections.reduce((s, d) => s + d.confidence, 0) / total * 100) : 0;
  const activityLevel = beeCount >= 10 ? 'Élevée' : beeCount >= 5 ? 'Normale' : beeCount >= 2 ? 'Faible' : 'Très faible';
  const activityColor = beeCount >= 10 ? COLORS.success : beeCount >= 5 ? '#fbbf24' : COLORS.error;
  const healthScore   = hive.health_score ?? 7;
  const healthLabel   = healthScore >= 8 ? 'Excellente' : healthScore >= 6 ? 'Bonne' : healthScore >= 4 ? 'À surveiller' : 'Critique';
  const recs = [];
  if (beeCount < 2) recs.push({ text: 'Activité d\'entrée très faible — inspection urgente recommandée', color: COLORS.error });
  if (healthScore < 5) recs.push({ text: 'Score santé critique — traitement prioritaire', color: COLORS.error });
  if (healthScore >= 7 && beeCount >= 5) recs.push({ text: 'Colonie active et en bonne condition', color: COLORS.success });
  if (prediction?.predictions?.sirop_L > 0) recs.push({ text: `Besoin sirop prédit: ${prediction.predictions.sirop_L}L`, color: COLORS.info });
  if (prediction?.predictions?.traitement > 0) recs.push({ text: `Traitement Varroa prédit: ${prediction.predictions.traitement} dose(s)`, color: '#fbbf24' });
  if (prediction?.predictions?.cadres > 0) recs.push({ text: `Cadres à prévoir: ${prediction.predictions.cadres}`, color: COLORS.accent });
  if (recs.length === 0) recs.push({ text: 'Aucune anomalie détectée — colonie stable', color: COLORS.success });
  return { beeCount, total, avgConf, activityLevel, activityColor, healthLabel, healthScore, recs };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function EntranceMonitorTab({ hive, toast }) {
  const storageKey = `bee_monitor_${hive.id}`;

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch { return []; }
  });
  const [report,       setReport]       = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [prediction,   setPrediction]   = useState(null);
  const [zoomEntry,    setZoomEntry]    = useState(null);

  const saveHistory = useCallback((newHistory) => {
    setHistory(newHistory);
    try { localStorage.setItem(storageKey, JSON.stringify(newHistory)); }
    catch { /* quota */ }
  }, [storageKey]);

  const fetchPrediction = useCallback(async () => {
    try {
      const r = await fetch(`${PRED_URL}/${hive.id}`, { headers: authHeaders() });
      if (r.ok) return r.json();
    } catch { /* ignore */ }
    return null;
  }, [hive.id]);

  const handleAnalysisComplete = useCallback(async (data) => {
    setLoadingReport(true);
    try {
      const pred = prediction ?? await fetchPrediction();
      if (pred && !prediction) setPrediction(pred);
      const rep = generateReport(hive, data.detections || [], pred);
      setReport(rep);

      /* compress image before storing to keep localStorage lean */
      const compressed = data.imageUrl?.startsWith('data:')
        ? await compressImage(data.imageUrl)
        : null;

      const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        imageUrl: compressed,
        detections: data.detections || [],
        report: rep,
      };
      saveHistory([entry, ...history].slice(0, HIST_MAX));
    } catch { /* ignore */ }
    setLoadingReport(false);
  }, [hive, prediction, fetchPrediction, history, saveHistory]);

  const deleteEntry = useCallback((id) => {
    saveHistory(history.filter(e => e.id !== id));
  }, [history, saveHistory]);

  const clearAll = () => {
    saveHistory([]);
    setReport(null);
    toast('Historique effacé', 'warning');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes monSpin { to { transform: rotate(360deg); } }` }} />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>Monitor IA · Entrée Ruche</div>
          <div style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 3 }}>
            YOLO v8 bee detection · {hive.identifier} · {history.length} analyse(s) sauvegardée(s)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ padding: '5px 12px', borderRadius: 10, background: COLORS.accent + '15', border: `1px solid ${COLORS.accent}30` }}>
            <span style={{ color: COLORS.accent, fontWeight: 800, fontSize: 12 }}>Modèle: bee</span>
          </div>
          {history.length > 0 && (
            <button onClick={clearAll}
              style={{ padding: '5px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)',
                border: `1px solid ${COLORS.error}25`, color: COLORS.error,
                cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              Effacer tout
            </button>
          )}
        </div>
      </div>

      {/* ── YOLO Scanner ── */}
      <AIScanner
        category="bee"
        title={`Hive Entrance · ${hive.identifier}`}
        color={COLORS.accent}
        onAnalysisComplete={handleAnalysisComplete}
      />

      {/* ── Loading report ── */}
      {loadingReport && (
        <div style={{ padding: 18, borderRadius: 16, background: COLORS.surface,
          border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <RefreshCw size={15} color={COLORS.accent} style={{ animation: 'monSpin 1s linear infinite' }} />
          <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Génération du rapport IA…</span>
        </div>
      )}

      {/* ── Current AI Report ── */}
      {report && !loadingReport && (
        <div style={{ background: COLORS.surface, borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.accent + '08', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScanEye size={16} color={COLORS.accent} />
            <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>Rapport IA — {hive.identifier}</span>
            <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 'auto' }}>
              {history[0] ? new Date(history[0].timestamp).toLocaleTimeString('fr-FR') : ''}
            </span>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { label: 'Abeilles détectées', value: report.beeCount, unit: 'abeilles', color: COLORS.accent, icon: Activity },
                { label: 'Activité entrée',    value: report.activityLevel, unit: '', color: report.activityColor, icon: Zap },
                { label: 'Confiance IA',       value: `${report.avgConf}%`, unit: '', color: COLORS.info, icon: CheckCircle },
              ].map(m => (
                <div key={m.label} style={{ padding: '14px 16px', borderRadius: 14,
                  background: m.color + '0a', border: `1px solid ${m.color}25` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <m.icon size={13} color={m.color} />
                    <span style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}>{m.label}</span>
                  </div>
                  <div style={{ color: m.color, fontWeight: 900, fontSize: 18 }}>
                    {m.value}
                    {m.unit && <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 4 }}>{m.unit}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 16px', borderRadius: 14,
              background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`,
              display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.success + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Heart size={16} color={COLORS.success} />
              </div>
              <div>
                <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: '0.8px' }}>
                  CORRÉLATION SANTÉ COLONIE
                </div>
                <div style={{ color: 'white', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                  Score COLOSS&nbsp;
                  <span style={{ color: COLORS.success, fontWeight: 900 }}>{report.healthScore?.toFixed(1)}/10</span>
                  &nbsp;·&nbsp;{report.healthLabel}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}>OBJETS TOTAUX</div>
                <div style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{report.total}</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 900, color: COLORS.textMuted,
                letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
                Recommandations IA
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {report.recs.map((rec, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 14px', borderRadius: 11,
                    background: rec.color + '0a', border: `1px solid ${rec.color}25` }}>
                    <Shield size={13} color={rec.color} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>{rec.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state (no analysis yet) ── */}
      {!report && !loadingReport && history.length === 0 && (
        <div style={{ height: 160, background: 'rgba(255,255,255,0.02)', border: `2px dashed ${COLORS.border}`,
          borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 10, color: COLORS.textMuted }}>
          <ScanEye size={38} strokeWidth={1} style={{ opacity: 0.4 }} />
          <div style={{ fontWeight: 600, fontSize: 13 }}>Analysez une image pour générer le rapport IA</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Importez une photo de l'entrée ou utilisez la caméra live</div>
        </div>
      )}

      {/* ── History section ── */}
      {history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: COLORS.textMuted,
              letterSpacing: '2px', textTransform: 'uppercase' }}>
              Historique Analyses · {history.length} entrée(s)
            </div>
          </div>

          {/* Evolution strip */}
          <EvolutionStrip history={history} />

          {/* Cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
            {history.map((entry, idx) => (
              <AnalysisCard
                key={entry.id}
                entry={entry}
                idx={idx}
                total={history.length}
                onZoom={() => setZoomEntry(entry)}
                onDelete={() => deleteEntry(entry.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Zoom modal ── */}
      {zoomEntry && <ZoomModal entry={zoomEntry} onClose={() => setZoomEntry(null)} />}
    </div>
  );
}
