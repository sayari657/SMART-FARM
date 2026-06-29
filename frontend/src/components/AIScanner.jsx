import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, Sparkles, RefreshCcw, Activity, Trash2, X, Loader2, ShieldAlert, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { cvAPI, agentAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { translateLabel } from '../utils/labelTranslations';
import ModelClassesInfo from './ModelClassesInfo';

const CRITICAL_LABELS = new Set(['fire', 'smoke', 'predator', 'dead_bird', 'feu', 'fumee', 'blight', 'rot', 'disease']);
const SCAN_ALERT_KEY = 'farm_scan_alerts';
const SCAN_ALERT_MAX = 20;

// WebSocket base. In prod, VITE_WS_URL points at the backend directly. In dev we
// use the SAME ORIGIN so the request flows through Vite's `/ws` proxy → backend:
// connecting straight to :8000 breaks under the HTTPS dev server (wss:// to a
// non-TLS backend fails the handshake → "Connexion échouée").
const WS_BASE = import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;

const compressImage = (dataUrl, maxWidth = 520, quality = 0.72) =>
  new Promise((resolve) => {
    if (!dataUrl?.startsWith('data:')) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const c = document.createElement('canvas');
      c.width  = Math.round(img.width  * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

const pushScanAlert = (card) => {
  try {
    const existing = JSON.parse(localStorage.getItem(SCAN_ALERT_KEY) || '[]');
    const updated = [card, ...existing].slice(0, SCAN_ALERT_MAX);
    localStorage.setItem(SCAN_ALERT_KEY, JSON.stringify(updated));
  } catch {}
};

/**
 * BboxMiniCard: renders image with bbox overlay for history cards.
 */
const BboxMiniCard = ({ imageUrl, detections, color, palette, labelFormatter }) => {
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img || !detections?.length) return;

    canvas.width  = img.offsetWidth;
    canvas.height = img.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cW = canvas.width;
    const cH = canvas.height;

    // ── objectFit: cover — image fills container, excess is clipped ──────────
    // Compute where the original image is rendered so bbox % map correctly.
    const natW = img.naturalWidth  || cW;
    const natH = img.naturalHeight || cH;
    const scale = Math.max(cW / natW, cH / natH);
    const imgW  = natW * scale;
    const imgH  = natH * scale;
    const imgX  = (cW - imgW) / 2;   // ≤ 0 when image is wider than container
    const imgY  = (cH - imgH) / 2;   // ≤ 0 when image is taller than container

    detections.forEach(det => {
      const [cx_p, cy_p, w_p, h_p] = det.bbox;
      const w  = (w_p  / 100) * imgW;
      const h  = (h_p  / 100) * imgH;
      const cx = imgX + (cx_p / 100) * imgW;
      const cy = imgY + (cy_p / 100) * imgH;
      const x1 = cx - w / 2;
      const y1 = cy - h / 2;
      const boxColor = palette?.[det.label?.toLowerCase()] || color;

      ctx.strokeStyle = boxColor;
      ctx.lineWidth   = 1.5;
      ctx.shadowBlur  = 4;
      ctx.shadowColor = boxColor;
      ctx.strokeRect(x1, y1, w, h);

      ctx.shadowBlur = 0;
      const label = `${labelFormatter(det.label)} ${Math.round(det.confidence * 100)}%`;
      ctx.font = 'bold 8px sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = boxColor;
      ctx.fillRect(x1, Math.max(0, y1 - 13), tw + 6, 13);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x1 + 3, Math.max(11, y1 - 2));
    });
  }, [detections, palette, color, labelFormatter]);

  useEffect(() => {
    const t = setTimeout(draw, 60);
    return () => clearTimeout(t);
  }, [draw]);

  return (
    <div style={{ position: 'relative', width: '100%', paddingTop: '65%', background: '#000', borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
      <img
        ref={imgRef}
        src={imageUrl}
        alt="detection"
        onLoad={draw}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }} />
    </div>
  );
};

// ── BboxZoomCard: full-res image + bbox overlay for the zoom modal ────────────
const BboxZoomCard = ({ imageUrl, detections, color, palette, labelFormatter }) => {
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    canvas.width  = img.offsetWidth;
    canvas.height = img.offsetHeight;
    if (!detections?.length) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cW = canvas.width;
    const cH = canvas.height;
    detections.forEach(det => {
      const [cx_p, cy_p, w_p, h_p] = det.bbox;
      const w  = (w_p / 100) * cW, h  = (h_p / 100) * cH;
      const cx = (cx_p / 100) * cW, cy = (cy_p / 100) * cH;
      const x1 = cx - w / 2,        y1 = cy - h / 2;
      const boxColor = palette?.[det.label?.toLowerCase()] || color;
      ctx.strokeStyle = boxColor; ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10; ctx.shadowColor = boxColor;
      ctx.strokeRect(x1, y1, w, h);
      ctx.shadowBlur = 0;
      const lbl = `${labelFormatter(det.label).toUpperCase()} ${Math.round(det.confidence * 100)}%`;
      ctx.font = 'bold 13px Inter, sans-serif';
      const tw = ctx.measureText(lbl).width;
      ctx.fillStyle = boxColor;
      ctx.fillRect(x1, Math.max(0, y1 - 22), tw + 10, 22);
      ctx.fillStyle = '#fff';
      ctx.fillText(lbl, x1 + 5, Math.max(16, y1 - 5));
    });
  }, [detections, palette, color, labelFormatter]);

  useEffect(() => { const t = setTimeout(draw, 80); return () => clearTimeout(t); }, [draw]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <img ref={imgRef} src={imageUrl} alt="zoom" onLoad={draw}
        style={{ display: 'block', width: '100%', height: 'auto' }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    </div>
  );
};

// ── ZoomModal: lightbox with full image, bbox, detection chips, CRUD ──────────
const ZoomModal = ({ card, total, index, color, palette, labelFormatter, onClose, onDelete, onPrev, onNext }) => {
  const { t } = useTranslation();
  // Close on Escape, navigate with arrow keys
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  if (!card) return null;
  const hasCritical = card.detections.some(d => CRITICAL_LABELS.has(d.label?.toLowerCase()));

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Prev / Next arrows */}
      {onPrev && (
        <button onClick={onPrev} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <ChevronLeft size={22} />
        </button>
      )}
      {onNext && (
        <button onClick={onNext} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <ChevronRight size={22} />
        </button>
      )}

      <div style={{
        background: '#fff', borderRadius: 16, overflow: 'hidden',
        maxWidth: 780, width: '100%', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      }}>
        {/* ── Header ── */}
        <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#888' }}>{new Date(card.timestamp).toLocaleString()}</span>
            {total > 1 && <span style={{ fontSize: 10, background: '#f5f5f5', color: '#666', padding: '2px 8px', borderRadius: 20 }}>{index + 1} / {total}</span>}
            {hasCritical && <span style={{ fontSize: 10, background: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>⚠ {t('aiscanner.critical')}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { onDelete(card.id); onClose(); }}
              style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
              <Trash2 size={12} /> {t('aiscanner.delete')}
            </button>
            <button onClick={onClose}
              style={{ background: '#f5f5f5', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
              <X size={12} /> {t('aiscanner.close')}
            </button>
          </div>
        </div>

        {/* ── Image + bbox ── */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          <BboxZoomCard imageUrl={card.imageUrl} detections={card.detections} color={color} palette={palette} labelFormatter={labelFormatter} />
        </div>

        {/* ── Detections chips ── */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #f0f0f0', background: '#fafafa', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#999', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {card.detections.length} {t('aiscanner.detections')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {card.detections.map((det, i) => {
              const isCrit = CRITICAL_LABELS.has(det.label?.toLowerCase());
              const bc = palette?.[det.label?.toLowerCase()] || color;
              return (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: isCrit ? '#fef2f2' : `${bc}18`, color: isCrit ? '#ef4444' : bc, border: `1px solid ${isCrit ? '#ef444440' : `${bc}40`}` }}>
                  {labelFormatter(det.label).toUpperCase()} — {Math.round(det.confidence * 100)}%
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const HISTORY_MAX = 20;
const REPORT_EVERY = 10;

const loadHistory = (category) => {
  try { return JSON.parse(localStorage.getItem(`yolo_history_${category}`)) || []; }
  catch { return []; }
};
const saveHistory = (category, history) => {
  const key = `yolo_history_${category}`;
  const data = history.slice(0, HISTORY_MAX);
  // Retry with fewer items if quota is exceeded (newest images are first)
  for (let limit = data.length; limit >= 1; limit--) {
    try {
      localStorage.setItem(key, JSON.stringify(data.slice(0, limit)));
      return;
    } catch {}
  }
};
const loadReports = (category) => {
  try { return JSON.parse(localStorage.getItem(`yolo_reports_${category}`)) || []; }
  catch { return []; }
};
const saveReports = (category, reports) => {
  try { localStorage.setItem(`yolo_reports_${category}`, JSON.stringify(reports.slice(0, 10))); }
  catch {}
};
const getDetCount = (cat) => {
  try { return parseInt(localStorage.getItem(`yolo_count_${cat}`) || '0', 10); }
  catch { return 0; }
};
const incDetCount = (cat) => {
  const n = getDetCount(cat) + 1;
  try { localStorage.setItem(`yolo_count_${cat}`, String(n)); } catch {}
  return n;
};

const buildReportPrompt = (category, summary, avgConf, count, periodLabel) => {
  const base = `Analyse de ${count} images sur ${periodLabel}. Détections YOLO: ${summary}. Confiance moyenne: ${avgConf}%.`;
  const prompts = {
    bee: `${base} Tu es un expert apiculteur tunisien. En Darija tunisienne, fais un rapport complet sur: 1) l'état de santé des ruches, 2) les risques détectés (varroa, essaimage, prédateurs), 3) recommandations concrètes urgentes pour l'apiculteur. Sois précis et pratique.`,
    livestock: `${base} Tu es vétérinaire expert. En Darija, rapport sur: santé du bétail, maladies potentielles, recommandations de traitement et prévention.`,
    sheep: `${base} Tu es expert en élevage ovin. En Darija, rapport sur l'état des brebis, risques sanitaires et recommandations pratiques.`,
    goat: `${base} Tu es expert caprin. En Darija, rapport sur la santé des chèvres et recommandations.`,
    poultry: `${base} Tu es expert avicole. En Darija, rapport sur la santé du poulailler, risques épidémiques et mesures à prendre.`,
    leaves: `${base} Tu es phytopathologiste. En Darija, rapport sur l'état sanitaire des cultures, maladies détectées et plan de traitement.`,
    olive: `${base} Tu es expert oléicole tunisien. En Darija, rapport sur l'état des oliviers, ravageurs détectés et recommandations de traitement.`,
    insects: `${base} Tu es expert en protection des cultures. En Darija, rapport sur les nuisibles détectés, niveau de risque et stratégie de lutte intégrée.`,
    fire: `${base} En Darija, rapport d'urgence: risques incendie détectés, zones touchées, mesures immédiates à prendre.`,
    plant: `${base} Tu es agronome. En Darija, rapport phytosanitaire: problèmes détectés, diagnostic et plan d'action.`,
  };
  return prompts[category] || `${base} En Darija, fais un rapport avec diagnostic et recommandations pratiques.`;
};

const AIScanner = ({ category = 'livestock', title = 'AI Vision Scanner', color = '#7c3aed', onAnalysisComplete, allowIpCamera = false }) => {
  const { t, i18n } = useTranslation();
  const tLabel = useCallback((label) => translateLabel(label, i18n.language), [i18n.language]);

  const [mode, setMode]             = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [error, setError]           = useState(null);
  const [metadata, setMetadata]     = useState(null);
  const [palette, setPalette]       = useState({});
  const [detectionHistory, setDetectionHistory] = useState(() => loadHistory(category));
  const [aiReports, setAiReports]   = useState(() => loadReports(category));
  const [activeTab, setActiveTab]   = useState('cards');
  const [zoomedIdx, setZoomedIdx]   = useState(null);   // index in detectionHistory

  const [devices, setDevices]       = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [autoScan, setAutoScan]     = useState(false);
  const autoScanIntervalRef         = useRef(null);

  // ── IP / RTSP camera relay ──
  const [ipUrl, setIpUrl]     = useState('');
  const [ipState, setIpState] = useState('idle');  // idle | connecting | live | error
  const [ipMsg, setIpMsg]     = useState('');
  const wsRef        = useRef(null);
  const lastAlertRef = useRef(0);

  const videoRef     = useRef(null);
  const imgRef       = useRef(null);
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);

  // Migrate old uncompressed history images to compressed format on first mount
  useEffect(() => {
    const raw = loadHistory(category);
    if (!raw.length) return;
    const hasLarge = raw.some(c => (c.imageUrl?.length || 0) > 80_000);
    if (!hasLarge) return;
    let alive = true;
    Promise.all(raw.map(async c => ({
      ...c,
      imageUrl: (c.imageUrl?.length || 0) > 80_000 ? await compressImage(c.imageUrl) : c.imageUrl,
    }))).then(compressed => {
      if (!alive) return;
      setDetectionHistory(compressed);
      saveHistory(category, compressed);
    });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Implement Photo Capture (Moved up to be initialized before use)
  // 1. AI Logic
  const generateAIReport = useCallback(async (recentHistory) => {
    const allDets = recentHistory.flatMap(c => c.detections);
    if (!allDets.length) return;

    const counts = {};
    allDets.forEach(d => { counts[d.label] = (counts[d.label] || 0) + 1; });
    const summary = Object.entries(counts).map(([label, count]) => `${count}× ${label}`).join(', ');
    const avgConf = Math.round(allDets.reduce((s, d) => s + d.confidence, 0) / allDets.length * 100);

    const reportId = Date.now();
    const newReport = {
      id: reportId, isGenerating: true,
      timestamp: new Date().toISOString(),
      detectionCount: allDets.length, imageCount: recentHistory.length,
      summary, avgConf, text: null,
    };
    setAiReports(prev => { const u = [newReport, ...prev]; saveReports(category, u); return u; });
    setActiveTab('reports');

    try {
      // Use fast /report endpoint — Groq direct, structured output, ~1s
      const res = await agentAPI.report(allDets, category, recentHistory.length);
      const text = res.data.response_derja || res.data.response || 'Rapport généré.';
      setAiReports(prev => {
        const u = prev.map(r => r.id === reportId ? { ...r, isGenerating: false, text } : r);
        saveReports(category, u); return u;
      });
    } catch {
      // fallback to old chat endpoint
      try {
        const prompt = buildReportPrompt(category, summary, avgConf, recentHistory.length, `${recentHistory.length} images`);
        const res2 = await agentAPI.analyze(prompt, category, allDets);
        const text = res2.data.response_derja || 'Rapport généré.';
        setAiReports(prev => {
          const u = prev.map(r => r.id === reportId ? { ...r, isGenerating: false, text } : r);
          saveReports(category, u); return u;
        });
      } catch {
        setAiReports(prev => {
          const u = prev.map(r => r.id === reportId ? { ...r, isGenerating: false, text: 'Erreur de connexion — réessaie.' } : r);
          saveReports(category, u); return u;
        });
      }
    }
  }, [category]);

  const runInference = useCallback(async (file, imageUrl, isBatch = false) => {
    if (!isBatch) { setIsProcessing(true); setDetections([]); setError(null); }
    try {
      const res = await cvAPI.detect(file, category);
      const dets = res.data.detections;
      setDetections(dets);

      // Compress once — used for both history and alerts (prevents localStorage quota exhaustion)
      const storedUrl = await compressImage(imageUrl);
      const card = { id: Date.now() + Math.random(), timestamp: new Date().toISOString(), imageUrl: storedUrl, detections: dets, category };
      setDetectionHistory(prev => { const updated = [card, ...prev]; saveHistory(category, updated); return updated; });

      const isCriticalScan = category === 'fire'
        || dets.some(d => CRITICAL_LABELS.has(d.label?.toLowerCase()))
        || dets.some(d => ['0','1','2','3','4'].includes(d.label));
      if (isCriticalScan && dets.length > 0) {
        pushScanAlert(card);
        toast('🚨 Alerte ajoutée au moniteur', { duration: 2500, style: { background: '#fef2f2', color: '#991b1b', fontWeight: 700, fontSize: 13 } });
      }
      const totalCount = incDetCount(category);
      if (totalCount % REPORT_EVERY === 0) {
        setTimeout(() => { setDetectionHistory(curr => { generateAIReport(curr.slice(0, REPORT_EVERY)); return curr; }); }, 300);
      }
      if (onAnalysisComplete) onAnalysisComplete({ ...res.data, imageUrl });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      if (status === 503) {
        setError(t('aiscanner.err_cloud'));
      } else {
        setError(detail || t('aiscanner.err_ai'));
      }
    } finally { if (!isBatch) setIsProcessing(false); }
  }, [category, onAnalysisComplete, generateAIReport]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState !== 4) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    fetch(dataUrl).then(res => res.blob()).then(blob => {
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
      runInference(file, dataUrl);
    }).catch(err => console.error('Camera capture error:', err));
  }, [videoRef, runInference]);

  // 1. Load Metadata & Palette
  useEffect(() => {
    cvAPI.getModelMetadata(category)
      .then(res => {
        setMetadata(res.data);
        const colors = ['#7c3aed', '#ef4444', '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#eab308', '#06b6d4'];
        const p = {};
        Object.values(res.data.names).forEach((name, i) => { p[name.toLowerCase()] = colors[i % colors.length]; });
        setPalette(p);
      })
      .catch(() => {});
  }, [category]);

  // 2. Enumerate Video Devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter(d => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      } catch (err) {
        console.error("Erreur enumerateDevices:", err);
      }
    };
    getDevices();
  }, [selectedDeviceId]);

  // 3. Setup Camera Stream
  useEffect(() => {
    let stream = null;
    if (mode === 'camera') {
      const constraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId }, width: 1280, height: 720 }
          : { facingMode: 'environment', width: 1280, height: 720 }
      };
      
      navigator.mediaDevices.getUserMedia(constraints)
        .then(s => { 
          stream = s; 
          if (videoRef.current) videoRef.current.srcObject = s; 
        })
        .catch(err => { 
          console.error("Camera error:", err);
          setError(t('aiscanner.err_camera'));
          setMode('upload'); 
        });
    }
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [mode, selectedDeviceId]);


  // 5. Handle Auto-Scan
  useEffect(() => {
    if (autoScan && mode === 'camera' && !capturedImage && !isProcessing) {
      autoScanIntervalRef.current = setInterval(() => {
        if (!isProcessing) takePhoto();
      }, 5000); // Scan every 5 seconds
    } else {
      clearInterval(autoScanIntervalRef.current);
    }
    return () => clearInterval(autoScanIntervalRef.current);
  }, [autoScan, mode, capturedImage, isProcessing, takePhoto]);

  const getDetColor = useCallback(
    (label) => palette[label?.toLowerCase()] || color,
    [palette, color],
  );

  const drawBoxes = useCallback(() => {
    const canvas   = canvasRef.current;
    const viewport = mode === 'camera' && !capturedImage ? videoRef.current : imgRef.current;
    if (!canvas || !viewport || !detections.length) return;

    canvas.width  = viewport.offsetWidth;
    canvas.height = viewport.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cW = canvas.width;
    const cH = canvas.height;

    // ── Bbox coordinate space = full canvas (image fills the container exactly) ─
    // Uploaded image: width:100% height:auto → container = image → no black bars
    // Live camera:    objectFit:cover        → fills container → no black bars
    // In both cases imgX/imgY = 0, imgW = cW, imgH = cH.
    const imgX = 0, imgY = 0, imgW = cW, imgH = cH;

    detections.forEach(det => {
      const [cx_p, cy_p, w_p, h_p, rot = 0] = det.bbox;
      // Map bbox % coordinates onto the actual image area only
      const w  = (w_p  / 100) * imgW;
      const h  = (h_p  / 100) * imgH;
      const cx = imgX + (cx_p / 100) * imgW;
      const cy = imgY + (cy_p / 100) * imgH;
      const x1 = cx - w / 2;
      const y1 = cy - h / 2;
      const boxColor = getDetColor(det.label);

      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
      ctx.strokeStyle = boxColor; ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, w, h);
      const labelTxt = `${tLabel(det.label).toUpperCase()} ${Math.floor(det.confidence * 100)}%`;
      ctx.font = 'bold 11px Inter, sans-serif';
      const tw = ctx.measureText(labelTxt).width;
      ctx.fillStyle = boxColor; ctx.fillRect(x1, y1 - 20, tw + 10, 20);
      ctx.fillStyle = '#fff'; ctx.fillText(labelTxt, x1 + 5, y1 - 6);
      ctx.restore();
    });
  }, [detections, mode, capturedImage, getDetColor, tLabel]);

  useEffect(() => {
    const t = setTimeout(drawBoxes, 100);
    return () => clearTimeout(t);
  }, [detections, drawBoxes]);


  // ── Inference Logic ──

  const processBatch = useCallback(async (files) => {
    setIsProcessing(true);
    for (const file of files) {
      try {
        const dataUrl = await new Promise((resolve) => {
          const r = new FileReader(); r.onload = (f) => resolve(f.target.result); r.readAsDataURL(file);
        });
        setCapturedImage(dataUrl);
        await runInference(file, dataUrl, true);
      } catch (err) { console.error(err); }
    }
    setIsProcessing(false);
  }, [runInference]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 10);
    if (!files.length) return;
    if (files.length === 1) {
      const reader = new FileReader();
      reader.onload = (f) => { setCapturedImage(f.target.result); runInference(files[0], f.target.result); };
      reader.readAsDataURL(files[0]);
    } else {
      processBatch(files);
    }
  };

  const deleteCard = (id) => { setDetectionHistory(prev => { const updated = prev.filter(c => c.id !== id); saveHistory(category, updated); return updated; }); };
  const deleteReport = (id) => { setAiReports(prev => { const updated = prev.filter(r => r.id !== id); saveReports(category, updated); return updated; }); };
  const reset = () => { setCapturedImage(null); setDetections([]); setError(null); setAutoScan(false); };

  // ── IP / RTSP camera: open a relay WebSocket and render streamed frames ──
  const disconnectIp = useCallback(() => {
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    setIpState('idle');
    setCapturedImage(null);
    setDetections([]);
  }, []);

  const connectIp = useCallback(() => {
    const u = ipUrl.trim();
    if (!u) return;
    setIpState('connecting'); setIpMsg('');
    const token = localStorage.getItem('token');
    const wsUrl = `${WS_BASE}/ws/rtsp?token=${encodeURIComponent(token || '')}&url=${encodeURIComponent(u)}&model=${encodeURIComponent(category)}&fps=4`;
    let ws;
    try { ws = new WebSocket(wsUrl); } catch { setIpState('error'); setIpMsg(t('aiscanner.err_connect')); return; }
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      let m; try { m = JSON.parse(evt.data); } catch { return; }
      if (m.error)            { setIpMsg(m.error); setIpState('error'); try { ws.close(); } catch {} return; }
      if (m.status === 'connected') { setIpState('live'); return; }
      if (m.frame) {
        const dataUrl = `data:image/jpeg;base64,${m.frame}`;
        setCapturedImage(dataUrl);
        setDetections(m.detections || []);
        const crit = (m.detections || []).some(d => CRITICAL_LABELS.has(d.label?.toLowerCase()))
          || (category === 'fire' && (m.detections || []).length > 0);
        if (crit && Date.now() - lastAlertRef.current > 15000) {
          lastAlertRef.current = Date.now();
          const card = { id: Date.now() + Math.random(), timestamp: new Date().toISOString(), imageUrl: dataUrl, detections: m.detections, category };
          pushScanAlert(card);
          toast('🚨 ' + t('aiscanner.ip_detection'), { duration: 2500, style: { background: '#fef2f2', color: '#991b1b', fontWeight: 700, fontSize: 13 } });
          if (onAnalysisComplete) onAnalysisComplete({ detections: m.detections, imageUrl: dataUrl, category });
        }
      }
    };
    ws.onerror = () => { setIpState('error'); setIpMsg(t('aiscanner.err_connect')); };
    ws.onclose = () => { setIpState(s => (s === 'live' || s === 'connecting') ? 'idle' : s); };
  }, [ipUrl, category, onAnalysisComplete]);

  // Close the relay when leaving RTSP mode or unmounting
  useEffect(() => {
    if (mode !== 'rtsp' && wsRef.current) disconnectIp();
  }, [mode, disconnectIp]);
  useEffect(() => () => { try { wsRef.current?.close(); } catch {} }, []);

  return (
    <div className="card glass-card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${color}33`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', background: 'var(--glass-bg)', borderBottom: `1px solid ${color}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Activity size={18} /></div>
          <div><h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{title}</h3><span style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>{category}</span></div>
        </div>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 3, borderRadius: 8, gap: 2 }}>
          <button onClick={() => { setMode('upload'); reset(); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'upload' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>{t('aiscanner.tab_file')}</button>
          <button onClick={() => { setMode('camera'); reset(); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'camera' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>{t('aiscanner.tab_live')}</button>
          {allowIpCamera && (
            <button onClick={() => { setMode('rtsp'); reset(); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'rtsp' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>{t('aiscanner.tab_ip')}</button>
          )}
        </div>
      </div>

      {/* ── Viewport: fixed height for camera, auto height for uploaded image ── */}
      <div style={{
        ...(capturedImage
          ? { width: '100%' }                             // height driven by the img below
          : { height: 320 }),                             // fixed 320px for live camera / idle
        background: '#000',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {mode === 'camera' && !capturedImage && !window.isSecureContext && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', color: '#ef4444', padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <ShieldAlert size={40} style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 14 }}>{t('aiscanner.insecure_title')}</div>
            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>{t('aiscanner.insecure_desc')}</div>
            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 4, marginTop: 10, fontSize: 11 }}>{t('aiscanner.insecure_hint')}</code>
          </div>
        )}
        {/* Camera live: cover fills 320px area */}
        {mode === 'camera' && !capturedImage && (
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {/* Uploaded image: natural aspect ratio — no black bars */}
        {capturedImage && (
          <img
            ref={imgRef}
            src={capturedImage}
            alt="Scanning..."
            onLoad={drawBoxes}
            style={{ display: 'block', width: '100%', height: 'auto', maxHeight: '70vh' }}
          />
        )}
        {!capturedImage && mode === 'upload' && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}><Upload size={40} /><button className="btn btn-sm" onClick={() => fileInputRef.current.click()} style={{ marginTop: 12, background: 'white', color: '#000' }}>{t('aiscanner.browse')}</button></div>}
        {!capturedImage && mode === 'rtsp' && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: 24 }}>
            <Activity size={38} style={{ opacity: 0.5 }} />
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600 }}>
              {ipState === 'connecting' ? t('aiscanner.rtsp_connecting')
                : ipState === 'error' ? '⚠ ' + (ipMsg || t('aiscanner.rtsp_error'))
                : t('aiscanner.rtsp_prompt')}
            </div>
            {ipState === 'connecting' && <Loader2 className="animate-spin" size={20} color={color} style={{ marginTop: 10 }} />}
          </div>
        )}
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }} />
        {isProcessing && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}><Loader2 className="animate-spin" color={color} size={40} /></div>}
        {error && (
          <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 110, padding: '9px 12px', borderRadius: 8, background: 'rgba(127,29,29,0.92)', color: '#fff', fontSize: 11, textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        {/* Camera Selector Overlay */}
        {mode === 'camera' && !capturedImage && devices.length > 1 && (
          <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20 }}>
            <select 
              value={selectedDeviceId} 
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, fontSize: 10, background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', outline: 'none' }}
            >
              {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,4)}`}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 20px', background: 'var(--glass-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={handleFileUpload} />
        <div style={{ display: 'flex', gap: 8, flex: mode === 'rtsp' ? 1 : 'unset', marginRight: 8 }}>
          {mode === 'rtsp' ? (
            <div style={{ display: 'flex', gap: 8, flex: 1, alignItems: 'center', width: '100%' }}>
              <input
                value={ipUrl}
                onChange={e => setIpUrl(e.target.value)}
                placeholder="rtsp://user:pass@192.168.1.50:554/stream"
                disabled={ipState === 'live' || ipState === 'connecting'}
                style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', fontSize: 11, outline: 'none' }}
              />
              {(ipState === 'live' || ipState === 'connecting') ? (
                <button className="btn btn-sm" onClick={disconnectIp} style={{ background: '#ef4444', color: '#fff', flexShrink: 0 }}>{t('aiscanner.stop')}</button>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={connectIp} style={{ background: color, flexShrink: 0 }}>{t('aiscanner.connect')}</button>
              )}
            </div>
          ) : capturedImage ? (
            <button className="btn btn-secondary btn-sm" onClick={reset}><RefreshCcw size={14} /> {t('aiscanner.reset')}</button>
          ) : mode === 'camera' ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={takePhoto} style={{ background: color }} disabled={isProcessing}><Camera size={14} /> {t('aiscanner.scan')}</button>
              <button 
                className={`btn btn-sm ${autoScan ? 'btn-danger' : 'btn-secondary'}`} 
                onClick={() => setAutoScan(!autoScan)}
                style={autoScan ? { background: '#ef4444', color: 'white' } : {}}
              >
                {autoScan ? <Activity className="animate-pulse" size={14} /> : <Activity size={14} />} 
                {autoScan ? t('aiscanner.stop_auto') : t('aiscanner.auto_scan')}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current.click()}><Upload size={14} /> {t('aiscanner.import')}</button>
          )}
        </div>
        <button className="btn btn-sm" style={{ width: 40, height: 40, borderRadius: '50%', background: color, color: 'white' }}><Sparkles size={18} /></button>
      </div>

      {/* ── ℹ️ Liste des classes du modèle (FR/EN/AR) — clic pour ouvrir/fermer ── */}
      <ModelClassesInfo
        classes={metadata?.names ? Object.values(metadata.names) : []}
        accent={color}
        palette={palette}
      />

      <div style={{ borderTop: `1px solid ${color}22` }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${color}22` }}>
          <button onClick={() => setActiveTab('cards')} style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'cards' ? `${color}15` : 'transparent', color: activeTab === 'cards' ? color : '#666', fontSize: 12, fontWeight: 600 }}>{t('aiscanner.tab_images')} ({detectionHistory.length})</button>
          <button onClick={() => setActiveTab('reports')} style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'reports' ? `${color}15` : 'transparent', color: activeTab === 'reports' ? color : '#666', fontSize: 12, fontWeight: 600 }}>{t('aiscanner.tab_reports')} ({aiReports.length})</button>
        </div>
        <div style={{ padding: '15px' }}>
          {activeTab === 'cards' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {detectionHistory.slice(0, 10).map((card, idx) => {
                const hasCritical = card.detections.some(d => CRITICAL_LABELS.has(d.label?.toLowerCase()));
                return (
                  <div key={card.id} style={{ background: '#f9fafb', border: `1.5px solid ${hasCritical ? '#ef4444' : color}33`, borderRadius: 10, overflow: 'hidden', position: 'relative', transition: 'box-shadow .15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px ${color}33`}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    {/* Thumbnail */}
                    <div onClick={() => setZoomedIdx(idx)} style={{ position: 'relative' }}>
                      <BboxMiniCard imageUrl={card.imageUrl} detections={card.detections} color={color} palette={palette} labelFormatter={tLabel} />
                      {/* Zoom overlay on hover */}
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.32)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                      >
                        <ZoomIn size={22} color="#fff" style={{ opacity: 0, transition: 'opacity .15s', filter: 'drop-shadow(0 1px 3px #000)' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        />
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: 9, color: '#888', marginBottom: 3 }}>
                        {new Date(card.timestamp).toLocaleTimeString()}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {card.detections.slice(0, 3).map((det, i) => {
                          const isCrit = CRITICAL_LABELS.has(det.label?.toLowerCase());
                          return (
                            <span key={i} style={{
                              fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                              background: isCrit ? '#fef2f2' : '#f0fdf4',
                              color: isCrit ? '#ef4444' : '#16a34a',
                              border: `1px solid ${isCrit ? '#ef444430' : '#16a34a30'}`,
                            }}>
                              {tLabel(det.label)} {Math.round(det.confidence * 100)}%
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions: zoom + delete */}
                    <div style={{ position: 'absolute', top: 5, right: 5, display: 'flex', gap: 4 }}>
                      <button onClick={() => setZoomedIdx(idx)}
                        style={{ background: `${color}cc`, border: 'none', borderRadius: '50%', color: 'white', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <ZoomIn size={10} />
                      </button>
                      <button onClick={() => deleteCard(card.id)}
                        style={{ background: 'rgba(239,68,68,0.8)', border: 'none', borderRadius: '50%', color: 'white', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiReports.map(report => (
                <div key={report.id} style={{ background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 10, padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontWeight: 700, fontSize: 12, color }}>{t('aiscanner.report_ia')}</span><button onClick={() => deleteReport(report.id)} style={{ border: 'none', background: 'none' }}><X size={14} /></button></div>
                  {report.isGenerating ? <div style={{ fontSize: 12 }}>{t('aiscanner.analyzing')}</div> : <div style={{ fontSize: 12, direction: 'rtl', textAlign: 'right' }}>{report.text}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes scannerSpin { to { transform: rotate(360deg); } }
        .animate-spin { animation: scannerSpin 1s linear infinite; }
      `}</style>

      {/* ── Zoom Modal ── */}
      {zoomedIdx !== null && detectionHistory[zoomedIdx] && (
        <ZoomModal
          card={detectionHistory[zoomedIdx]}
          index={zoomedIdx}
          total={detectionHistory.length}
          color={color}
          palette={palette}
          labelFormatter={tLabel}
          onClose={() => setZoomedIdx(null)}
          onDelete={(id) => { deleteCard(id); setZoomedIdx(null); }}
          onPrev={zoomedIdx > 0 ? () => setZoomedIdx(i => i - 1) : null}
          onNext={zoomedIdx < detectionHistory.length - 1 ? () => setZoomedIdx(i => i + 1) : null}
        />
      )}
    </div>
  );
};

export default AIScanner;
