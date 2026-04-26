import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, Sparkles, RefreshCcw, Activity, History, Trash2, X, FileText, Loader2 } from 'lucide-react';
import { cvAPI, agentAPI } from '../services/api';

/**
 * BboxMiniCard: renders image with bbox overlay for history cards.
 */
const BboxMiniCard = ({ imageUrl, detections, color, palette }) => {
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

    const W = canvas.width;
    const H = canvas.height;

    detections.forEach(det => {
      const [cx_p, cy_p, w_p, h_p] = det.bbox;
      const w  = (w_p / 100) * W;
      const h  = (h_p / 100) * H;
      const cx = (cx_p / 100) * W;
      const cy = (cy_p / 100) * H;
      const x1 = cx - w / 2;
      const y1 = cy - h / 2;
      const boxColor = palette?.[det.label?.toLowerCase()] || color;

      ctx.strokeStyle = boxColor;
      ctx.lineWidth   = 1.5;
      ctx.shadowBlur  = 4;
      ctx.shadowColor = boxColor;
      ctx.strokeRect(x1, y1, w, h);

      ctx.shadowBlur = 0;
      const label = `${det.label} ${Math.round(det.confidence * 100)}%`;
      ctx.font = 'bold 8px sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = boxColor;
      ctx.fillRect(x1, Math.max(0, y1 - 13), tw + 6, 13);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x1 + 3, Math.max(11, y1 - 2));
    });
  }, [detections, palette, color]);

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

const HISTORY_MAX = 20;
const REPORT_EVERY = 10;

const loadHistory = (category) => {
  try { return JSON.parse(localStorage.getItem(`yolo_history_${category}`)) || []; }
  catch { return []; }
};
const saveHistory = (category, history) => {
  try { localStorage.setItem(`yolo_history_${category}`, JSON.stringify(history.slice(0, HISTORY_MAX))); }
  catch {}
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

// Build AI report prompt per category
const buildReportPrompt = (category, summary, avgConf, count, periodLabel) => {
  const base = `Analyse de ${count} images sur ${periodLabel}. Détections YOLO: ${summary}. Confiance moyenne: ${avgConf}%.`;
  const prompts = {
    bee: `${base} Tu es un expert apiculteur tunisien. En Darija tunisienne, fais un rapport complet sur: 1) l'état de santé des ruches, 2) les risques détectés (varroa, essaimage, prédateurs), 3) recommandations concrètes urgentes pour l'apiculteur. Sois précis et pratique.`,
    livestock: `${base} Tu es vétérinaire expert. En Darija, rapport sur: santé du bétail, maladies potentielles, recommandations de traitement et prévention.`,
    sheep: `${base} Tu es expert en élevage ovin. En Darija, rapport sur l'état des brebis, risques sanitaires et recommandations pratiques.`,
    goat: `${base} Tu es expert caprin. En Darija, rapport sur la santé des chèvres et recommandations.`,
    poultry: `${base} Tu es expert avicole. En Darija, rapport sur la santé du poulailler, risques épidémiques et mesures à prendre.`,
    rabbit: `${base} Tu es expert cuniculture. En Darija, rapport sur la santé des lapins et recommandations d'élevage.`,
    leaves: `${base} Tu es phytopathologiste. En Darija, rapport sur l'état sanitaire des cultures, maladies détectées et plan de traitement.`,
    olive: `${base} Tu es expert oléicole tunisien. En Darija, rapport sur l'état des oliviers, ravageurs détectés et recommandations de traitement.`,
    insects: `${base} Tu es expert en protection des cultures. En Darija, rapport sur les nuisibles détectés, niveau de risque et stratégie de lutte intégrée.`,
    fire: `${base} En Darija, rapport d'urgence: risques incendie détectés, zones touchées, mesures immédiates à prendre.`,
    plant: `${base} Tu es agronome. En Darija, rapport phytosanitaire: problèmes détectés, diagnostic et plan d'action.`,
  };
  return prompts[category] || `${base} En Darija, fais un rapport avec diagnostic et recommandations pratiques.`;
};

/**
 * AIScanner: reusable YOLO vision component with detection history cards and AI reports.
 */
const AIScanner = ({ category = 'livestock', title = 'AI Vision Scanner', color = '#7c3aed', onAnalysisComplete }) => {
  const [mode, setMode]             = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [detections, setDetections] = useState([]);
  const [error, setError]           = useState(null);
  const [, setMetadata]             = useState(null);
  const [palette, setPalette]       = useState({});
  const [detectionHistory, setDetectionHistory] = useState(() => loadHistory(category));
  const [aiReports, setAiReports]   = useState(() => loadReports(category));
  const [activeTab, setActiveTab]   = useState('cards'); // 'cards' | 'reports'

  const videoRef     = useRef(null);
  const imgRef       = useRef(null);
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch model metadata
  useEffect(() => {
    cvAPI.getModelMetadata(category)
      .then(res => {
        setMetadata(res.data);
        const colors = ['#7c3aed', '#ef4444', '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#eab308', '#06b6d4'];
        const p = {};
        Object.values(res.data.names).forEach((name, i) => {
          p[name.toLowerCase()] = colors[i % colors.length];
        });
        setPalette(p);
      })
      .catch(() => {});
  }, [category]);

  // Camera stream
  useEffect(() => {
    let stream = null;
    if (mode === 'camera') {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 1280, height: 720 } })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(() => { setError('Accès caméra refusé.'); setMode('upload'); });
    }
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [mode]);

  // Receive agent analysis to enrich most recent history card
  useEffect(() => {
    const handler = (e) => {
      const { category: cat, analysis } = e.detail || {};
      if (cat === category && analysis) {
        setDetectionHistory(prev => {
          if (!prev.length) return prev;
          const updated = [{ ...prev[0], agentAnalysis: analysis }, ...prev.slice(1)];
          saveHistory(category, updated);
          return updated;
        });
      }
    };
    window.addEventListener('yolo-analysis-update', handler);
    return () => window.removeEventListener('yolo-analysis-update', handler);
  }, [category]);

  const getDetColor = (label) => palette[label?.toLowerCase()] || color;

  const drawBoxes = useCallback(() => {
    const canvas   = canvasRef.current;
    const viewport = mode === 'camera' ? videoRef.current : imgRef.current;
    if (!canvas || !viewport || !detections.length) return;

    canvas.width  = viewport.offsetWidth;
    canvas.height = viewport.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;

    detections.forEach(det => {
      const [cx_p, cy_p, w_p, h_p, rot = 0] = det.bbox;
      const w  = (w_p / 100) * W;
      const h  = (h_p / 100) * H;
      const cx = (cx_p / 100) * W;
      const cy = (cy_p / 100) * H;
      const x1 = cx - w / 2;
      const y1 = cy - h / 2;
      const boxColor = getDetColor(det.label);

      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);

      ctx.strokeStyle = boxColor; ctx.lineWidth = 3;
      ctx.shadowBlur = 10; ctx.shadowColor = boxColor;
      ctx.strokeRect(x1, y1, w, h);

      const cl = Math.min(w, h) * 0.2;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + cl); ctx.lineTo(x1, y1); ctx.lineTo(x1 + cl, y1);
      ctx.stroke();

      const conf = Math.floor(det.confidence * 100);
      const labelTxt = `${det.label.toUpperCase()} ${conf}%`;
      ctx.font = 'bold 11px Inter, sans-serif';
      const tw = ctx.measureText(labelTxt).width;
      ctx.fillStyle = boxColor; ctx.shadowBlur = 0;
      ctx.fillRect(x1, y1 - 20, tw + 10, 20);
      ctx.fillStyle = '#fff';
      ctx.fillText(labelTxt, x1 + 5, y1 - 6);
      ctx.restore();
    });
  }, [detections, palette, mode, color]);

  useEffect(() => {
    const t = setTimeout(drawBoxes, 100);
    return () => clearTimeout(t);
  }, [detections, drawBoxes]);

  // ── Generate AI Report ──
  const generateAIReport = useCallback(async (recentHistory) => {
    const allDets = recentHistory.flatMap(c => c.detections);
    if (!allDets.length) return;

    const counts = {};
    allDets.forEach(d => { counts[d.label] = (counts[d.label] || 0) + 1; });
    const summary = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => `${count}× ${label.replace(/_/g, ' ')}`)
      .join(', ');
    const avgConf = Math.round(allDets.reduce((s, d) => s + d.confidence, 0) / allDets.length * 100);
    const periodLabel = `${recentHistory.length} images`;
    const prompt = buildReportPrompt(category, summary, avgConf, recentHistory.length, periodLabel);

    const reportId = Date.now();
    const newReport = {
      id: reportId,
      isGenerating: true,
      timestamp: new Date().toISOString(),
      detectionCount: allDets.length,
      imageCount: recentHistory.length,
      summary,
      avgConf,
      text: null,
    };

    setAiReports(prev => {
      const updated = [newReport, ...prev];
      saveReports(category, updated);
      return updated;
    });
    setActiveTab('reports');

    try {
      const res = await agentAPI.chat(prompt);
      const text = res.data.response_derja || res.data.response || 'Rapport généré.';
      setAiReports(prev => {
        const updated = prev.map(r => r.id === reportId ? { ...r, isGenerating: false, text } : r);
        saveReports(category, updated);
        return updated;
      });
    } catch {
      setAiReports(prev => {
        const updated = prev.map(r => r.id === reportId ? { ...r, isGenerating: false, text: 'Rapport non disponible. Vérifiez la connexion à l\'agent IA.' } : r);
        saveReports(category, updated);
        return updated;
      });
    }
  }, [category]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const dataUrl = f.target.result;
      setCapturedImage(dataUrl);
      runInference(file, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const captureAndScan = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    canvas.toBlob(blob => {
      runInference(new File([blob], 'capture.jpg', { type: 'image/jpeg' }), dataUrl);
    }, 'image/jpeg');
  };

  const runInference = async (file, imageUrl) => {
    setIsProcessing(true); setDetections([]); setError(null);
    try {
      const res = await cvAPI.detect(file, category);
      const dets = res.data.detections;
      setDetections(dets);

      const card = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        imageUrl,
        detections: dets,
        category,
        agentAnalysis: null,
      };

      let newHistory;
      setDetectionHistory(prev => {
        newHistory = [card, ...prev];
        saveHistory(category, newHistory);
        return newHistory;
      });

      // Check if we hit a REPORT_EVERY multiple
      const totalCount = incDetCount(category);
      if (totalCount % REPORT_EVERY === 0) {
        // Use setTimeout to let state settle first
        setTimeout(() => {
          setDetectionHistory(curr => {
            const slice = curr.slice(0, REPORT_EVERY);
            generateAIReport(slice);
            return curr;
          });
        }, 300);
      }

      if (onAnalysisComplete) onAnalysisComplete({ ...res.data, imageUrl });
    } catch {
      setError('Erreur analyse AI.');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteCard = (id) => {
    setDetectionHistory(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveHistory(category, updated);
      return updated;
    });
  };

  const deleteReport = (id) => {
    setAiReports(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveReports(category, updated);
      return updated;
    });
  };

  const clearAllCards = () => {
    saveHistory(category, []);
    setDetectionHistory([]);
  };

  const reset = () => { setCapturedImage(null); setDetections([]); setError(null); };

  const hasHistory = detectionHistory.length > 0 || aiReports.length > 0;
  const nextReportIn = REPORT_EVERY - (getDetCount(category) % REPORT_EVERY);

  return (
    <div className="card glass-card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${color}33`, display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 20px', background: 'var(--glass-bg)', borderBottom: `1px solid ${color}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Activity size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{title}</h3>
            <span style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Modèle: {category}</span>
          </div>
        </div>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 3, borderRadius: 8, gap: 2 }}>
          <button onClick={() => { setMode('upload'); reset(); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'upload' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Fichier</button>
          <button onClick={() => { setMode('camera'); reset(); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'camera' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Live</button>
        </div>
      </div>

      {/* ── Viewport ── */}
      <div style={{ height: 320, background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {mode === 'camera' && !capturedImage
          ? <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : capturedImage && <img ref={imgRef} src={capturedImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Scanning..." />
        }

        {!capturedImage && mode === 'upload' && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <Upload size={40} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 12 }}>Importer une image pour analyse</p>
            <button className="btn btn-sm" onClick={() => fileInputRef.current.click()} style={{ marginTop: 12, background: 'white', color: '#000' }}>Parcourir</button>
          </div>
        )}

        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }} />

        {isProcessing && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: color, borderRadius: '50%', animation: 'scannerSpin 1s linear infinite' }} />
          </div>
        )}

        {detections.length > 0 && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: 'rgba(0,0,0,0.8)', padding: '5px 10px', borderRadius: 6, fontSize: 10, color: 'white', zIndex: 50, display: 'flex', justifyContent: 'space-between' }}>
            <span>AI: {detections.length} objet(s) détecté(s)</span>
            <span style={{ color: `${color}`, opacity: 0.8 }}>Rapport dans {nextReportIn} image(s)</span>
          </div>
        )}

        {error && (
          <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: 'rgba(239,68,68,0.9)', padding: '5px 10px', borderRadius: 6, fontSize: 10, color: 'white', zIndex: 50 }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div style={{ padding: '12px 20px', background: 'var(--glass-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileUpload} />
        <div style={{ display: 'flex', gap: 8 }}>
          {capturedImage
            ? <button className="btn btn-secondary btn-sm" onClick={reset}><RefreshCcw size={14} /> Reset</button>
            : mode === 'camera' && <button className="btn btn-primary btn-sm" onClick={captureAndScan} style={{ background: color }}><Camera size={14} /> Scan</button>
          }
          {!capturedImage && mode === 'upload' && (
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current.click()}>
              <Upload size={14} /> Importer
            </button>
          )}
        </div>
        <button
          className="btn btn-sm"
          onClick={() => window.dispatchEvent(new CustomEvent('open-assistant', {
            detail: { species: category, detections, category },
          }))}
          style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, #000)`, color: 'white' }}
          title={detections.length ? `Analyser ${detections.length} détection(s) avec l'IA` : 'Ouvrir assistant IA'}
        >
          <Sparkles size={18} />
        </button>
      </div>

      {/* ── History Section ── */}
      {hasHistory && (
        <div style={{ borderTop: `1px solid ${color}22` }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${color}22` }}>
            <button
              onClick={() => setActiveTab('cards')}
              style={{
                flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
                background: activeTab === 'cards' ? `${color}15` : 'transparent',
                borderBottom: activeTab === 'cards' ? `2px solid ${color}` : '2px solid transparent',
                color: activeTab === 'cards' ? color : 'var(--color-text-3)',
                fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <History size={13} /> Images ({detectionHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              style={{
                flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
                background: activeTab === 'reports' ? `${color}15` : 'transparent',
                borderBottom: activeTab === 'reports' ? `2px solid ${color}` : '2px solid transparent',
                color: activeTab === 'reports' ? color : 'var(--color-text-3)',
                fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <FileText size={13} /> Rapports IA ({aiReports.length})
              {aiReports.some(r => r.isGenerating) && (
                <Loader2 size={11} style={{ animation: 'scannerSpin 1s linear infinite' }} />
              )}
            </button>
          </div>

          {/* ── Detection Cards Tab ── */}
          {activeTab === 'cards' && detectionHistory.length > 0 && (
            <div style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <button onClick={clearAllCards} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={11} /> Tout effacer
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))', gap: 10 }}>
                {detectionHistory.map(card => (
                  <div key={card.id} style={{ background: 'var(--color-bg2, #111827)', border: `1px solid ${color}22`, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                    <BboxMiniCard imageUrl={card.imageUrl} detections={card.detections} color={color} palette={palette} />
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>
                        {new Date(card.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
                        {card.detections.length} obj
                        {card.detections.length > 0 && ` · ${Math.round(Math.max(...card.detections.map(d => d.confidence)) * 100)}%`}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
                        {[...new Set(card.detections.map(d => d.label))].slice(0, 3).map((label, i) => (
                          <span key={i} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: `${color}22`, color, fontWeight: 600 }}>
                            {label}
                          </span>
                        ))}
                      </div>
                      {card.agentAnalysis && (
                        <div style={{ marginTop: 5, fontSize: 10, color: 'var(--color-text-3)', fontStyle: 'italic', lineHeight: 1.4, borderTop: `1px solid ${color}22`, paddingTop: 5 }}>
                          {card.agentAnalysis.slice(0, 72)}{card.agentAnalysis.length > 72 ? '…' : ''}
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteCard(card.id)} title="Supprimer" style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI Reports Tab ── */}
          {activeTab === 'reports' && (
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aiReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-3)', fontSize: 13 }}>
                  <FileText size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>Le premier rapport sera généré après {nextReportIn} image(s)</div>
                  <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>Rapport automatique toutes les {REPORT_EVERY} détections</div>
                </div>
              ) : (
                aiReports.map(report => (
                  <div key={report.id} style={{
                    background: `linear-gradient(135deg, ${color}12, ${color}06)`,
                    border: `1px solid ${color}33`,
                    borderRadius: 12, padding: '14px 16px',
                    position: 'relative',
                  }}>
                    {/* Report header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={15} color={color} />
                          <span style={{ fontSize: 13, fontWeight: 700, color }}>Rapport IA</span>
                          {report.isGenerating && (
                            <Loader2 size={13} color={color} style={{ animation: 'scannerSpin 1s linear infinite' }} />
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 3 }}>
                          {new Date(report.timestamp).toLocaleString()} · {report.imageCount} images · {report.detectionCount} détections
                        </div>
                      </div>
                      <button onClick={() => deleteReport(report.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 4 }}>
                        <X size={14} />
                      </button>
                    </div>

                    {/* Detection summary chips */}
                    {report.summary && (
                      <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {report.summary.split(', ').slice(0, 6).map((item, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: `${color}22`, color, fontWeight: 600 }}>
                            {item}
                          </span>
                        ))}
                        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', color: 'var(--color-text-3)' }}>
                          moy. {report.avgConf}%
                        </span>
                      </div>
                    )}

                    {/* Report text */}
                    {report.isGenerating ? (
                      <div style={{ fontSize: 13, color: 'var(--color-text-3)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Loader2 size={13} color={color} style={{ animation: 'scannerSpin 1s linear infinite', flexShrink: 0 }} />
                        L'agent IA analyse les données et rédige votre rapport…
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--color-text, #e2e8f0)', lineHeight: 1.65, whiteSpace: 'pre-wrap', direction: 'rtl', textAlign: 'right', background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                        {report.text}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes scannerSpin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
};

export default AIScanner;
