import { useState, useCallback } from 'react';
import {
  Activity, Zap, Heart, CheckCircle, RefreshCw, ScanEye, Shield
} from 'lucide-react';
import { COLORS } from './BeeConstants';
import { beeApi } from '../../services/beeApi';
import AIScanner from '../AIScanner';
import { compressImage, generateReport } from './EntranceMonitorUtils';
import { BboxImage, ZoomModal, AnalysisCard, EvolutionStrip } from './EntranceMonitorComponents';

const HIST_MAX = 20;

export default function EntranceMonitorTab({ hive, toast }) {
  const storageKey = `bee_monitor_${hive.id}`;

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch { return []; }
  });
  const [report,        setReport]        = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [prediction,    setPrediction]    = useState(null);
  const [zoomEntry,     setZoomEntry]     = useState(null);

  const saveHistory = useCallback((newHistory) => {
    setHistory(newHistory);
    try { localStorage.setItem(storageKey, JSON.stringify(newHistory)); }
    catch { /* quota */ }
  }, [storageKey]);

  const fetchPrediction = useCallback(async () => {
    try {
      const r = await beeApi.getPrediction(hive.id);
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 18 }}>Monitor IA · Entrée Ruche</div>
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

      {/* YOLO Scanner */}
      <AIScanner
        category="bee"
        title={`Hive Entrance · ${hive.identifier}`}
        color={COLORS.accent}
        onAnalysisComplete={handleAnalysisComplete}
      />

      {/* Loading report */}
      {loadingReport && (
        <div style={{ padding: 18, borderRadius: 16, background: COLORS.surface,
          border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <RefreshCw size={15} color={COLORS.accent} style={{ animation: 'monSpin 1s linear infinite' }} />
          <span style={{ color: COLORS.textMuted, fontSize: 13 }}>Génération du rapport IA…</span>
        </div>
      )}

      {/* Current AI Report */}
      {report && !loadingReport && (
        <div style={{ background: COLORS.surface, borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: `1px solid ${COLORS.border}`,
            background: COLORS.accent + '08', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScanEye size={16} color={COLORS.accent} />
            <span style={{ color: COLORS.text, fontWeight: 800, fontSize: 14 }}>Rapport IA — {hive.identifier}</span>
            <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: 'auto' }}>
              {history[0] ? new Date(history[0].timestamp).toLocaleTimeString('fr-FR') : ''}
            </span>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
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
              background: COLORS.overlay03, border: `1px solid ${COLORS.border}`,
              display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.success + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Heart size={16} color={COLORS.success} />
              </div>
              <div>
                <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: '0.8px' }}>
                  CORRÉLATION SANTÉ COLONIE
                </div>
                <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                  Score COLOSS&nbsp;
                  <span style={{ color: COLORS.success, fontWeight: 900 }}>{report.healthScore?.toFixed(1)}/10</span>
                  &nbsp;·&nbsp;{report.healthLabel}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 700 }}>OBJETS TOTAUX</div>
                <div style={{ color: COLORS.text, fontWeight: 900, fontSize: 16 }}>{report.total}</div>
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
                    <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 600 }}>{rec.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && !loadingReport && history.length === 0 && (
        <div style={{ height: 160, background: COLORS.overlay03, border: `2px dashed ${COLORS.border}`,
          borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 10, color: COLORS.textMuted }}>
          <ScanEye size={38} strokeWidth={1} style={{ opacity: 0.4 }} />
          <div style={{ fontWeight: 600, fontSize: 13 }}>Analysez une image pour générer le rapport IA</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Importez une photo de l'entrée ou utilisez la caméra live</div>
        </div>
      )}

      {/* History section */}
      {history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: COLORS.textMuted,
            letterSpacing: '2px', textTransform: 'uppercase' }}>
            Historique Analyses · {history.length} entrée(s)
          </div>
          <EvolutionStrip history={history} />
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

      {zoomEntry && <ZoomModal entry={zoomEntry} onClose={() => setZoomEntry(null)} />}
    </div>
  );
}
