import { useRef, useCallback, useEffect } from 'react';
import { ScanEye, ZoomIn, X, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { COLORS } from './BeeConstants';
import { drawBboxes } from './EntranceMonitorUtils';

export function BboxImage({ imageUrl, detections, style, onClick }) {
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
    <div ref={wrapRef}
      style={{ position: 'relative', overflow: 'hidden', cursor: onClick ? 'zoom-in' : 'default', ...style }}
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

export function ZoomModal({ entry, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ background: COLORS.surface, borderRadius: 24, border: `1px solid ${COLORS.border}`,
        maxWidth: 860, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <ScanEye size={16} color={COLORS.accent} />
          <span style={{ color: COLORS.text, fontWeight: 800, fontSize: 14, flex: 1 }}>
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
            style={{ width: 32, height: 32, borderRadius: 9, background: COLORS.overlay06,
              border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

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
                    <span style={{ color: COLORS.text, fontSize: 11, fontWeight: 700 }}>{d.label}</span>
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

export function AnalysisCard({ entry, onZoom, onDelete, idx, total }) {
  return (
    <div style={{ background: COLORS.surface, borderRadius: 16, border: `1px solid ${COLORS.border}`,
      overflow: 'hidden', position: 'relative' }}>
      {entry.imageUrl ? (
        <BboxImage
          imageUrl={entry.imageUrl}
          detections={entry.detections}
          style={{ height: 130, borderRadius: 0 }}
          onClick={onZoom}
        />
      ) : (
        <div style={{ height: 130, background: COLORS.overlay03, display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, cursor: 'pointer' }}
          onClick={onZoom}>
          <ScanEye size={28} style={{ opacity: 0.3 }} />
        </div>
      )}

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

export function EvolutionStrip({ history }) {
  if (history.length < 2) return null;
  const recent = history[0];
  const prev   = history[1];
  const delta  = recent.report.beeCount - prev.report.beeCount;
  const deltaH = (recent.report.healthScore ?? 7) - (prev.report.healthScore ?? 7);

  return (
    <div style={{ padding: '10px 16px', borderRadius: 14, background: COLORS.overlay03,
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
