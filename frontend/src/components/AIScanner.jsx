import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, Sparkles, RefreshCcw, Activity, History, Trash2, X, FileText, Loader2, ShieldAlert } from 'lucide-react';
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
  const [activeTab, setActiveTab]   = useState('cards'); 

  const [devices, setDevices]       = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [autoScan, setAutoScan]     = useState(false);
  const autoScanIntervalRef         = useRef(null);

  const videoRef     = useRef(null);
  const imgRef       = useRef(null);
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);

  // 4. Implement Photo Capture (Moved up to be initialized before use)
  // 1. AI Logic
  const generateAIReport = useCallback(async (recentHistory) => {
    const allDets = recentHistory.flatMap(c => c.detections);
    if (!allDets.length) return;
    const counts = {};
    allDets.forEach(d => { counts[d.label] = (counts[d.label] || 0) + 1; });
    const summary = Object.entries(counts).map(([label, count]) => `${count}× ${label}`).join(', ');
    const avgConf = Math.round(allDets.reduce((s, d) => s + d.confidence, 0) / allDets.length * 100);
    const prompt = buildReportPrompt(category, summary, avgConf, recentHistory.length, `${recentHistory.length} images`);
    const reportId = Date.now();
    const newReport = { id: reportId, isGenerating: true, timestamp: new Date().toISOString(), detectionCount: allDets.length, imageCount: recentHistory.length, summary, avgConf, text: null };
    setAiReports(prev => { const updated = [newReport, ...prev]; saveReports(category, updated); return updated; });
    setActiveTab('reports');
    try {
      const res = await agentAPI.chat(prompt);
      const text = res.data.response_derja || res.data.response || 'Rapport généré.';
      setAiReports(prev => { const updated = prev.map(r => r.id === reportId ? { ...r, isGenerating: false, text } : r); saveReports(category, updated); return updated; });
    } catch {
      setAiReports(prev => { const updated = prev.map(r => r.id === reportId ? { ...r, isGenerating: false, text: 'Erreur génération.' } : r); saveReports(category, updated); return updated; });
    }
  }, [category]);

  const runInference = useCallback(async (file, imageUrl, isBatch = false) => {
    if (!isBatch) { setIsProcessing(true); setDetections([]); setError(null); }
    try {
      const res = await cvAPI.detect(file, category);
      const dets = res.data.detections;
      setDetections(dets);
      const card = { id: Date.now() + Math.random(), timestamp: new Date().toISOString(), imageUrl, detections: dets, category };
      setDetectionHistory(prev => { const updated = [card, ...prev]; saveHistory(category, updated); return updated; });
      const totalCount = incDetCount(category);
      if (totalCount % REPORT_EVERY === 0) {
        setTimeout(() => { setDetectionHistory(curr => { generateAIReport(curr.slice(0, REPORT_EVERY)); return curr; }); }, 300);
      }
      if (onAnalysisComplete) onAnalysisComplete({ ...res.data, imageUrl });
    } catch { setError('Erreur IA.'); } finally { if (!isBatch) setIsProcessing(false); }
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
    });
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
          setError('Accès caméra refusé.'); 
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

  const getDetColor = (label) => palette[label?.toLowerCase()] || color;

  const drawBoxes = useCallback(() => {
    const canvas   = canvasRef.current;
    const viewport = mode === 'camera' && !capturedImage ? videoRef.current : imgRef.current;
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
      ctx.strokeRect(x1, y1, w, h);
      const labelTxt = `${det.label.toUpperCase()} ${Math.floor(det.confidence * 100)}%`;
      ctx.font = 'bold 11px Inter, sans-serif';
      const tw = ctx.measureText(labelTxt).width;
      ctx.fillStyle = boxColor; ctx.fillRect(x1, y1 - 20, tw + 10, 20);
      ctx.fillStyle = '#fff'; ctx.fillText(labelTxt, x1 + 5, y1 - 6);
      ctx.restore();
    });
  }, [detections, palette, mode, color, capturedImage]);

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

  return (
    <div className="card glass-card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${color}33`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', background: 'var(--glass-bg)', borderBottom: `1px solid ${color}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Activity size={18} /></div>
          <div><h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{title}</h3><span style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>{category}</span></div>
        </div>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: 3, borderRadius: 8, gap: 2 }}>
          <button onClick={() => { setMode('upload'); reset(); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'upload' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Fichier</button>
          <button onClick={() => { setMode('camera'); reset(); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: mode === 'camera' ? 'white' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Live</button>
        </div>
      </div>

      <div style={{ height: 320, background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {mode === 'camera' && !capturedImage && !window.isSecureContext && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', color: '#ef4444', padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <ShieldAlert size={40} style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 700, fontSize: 14 }}>Connexion non sécurisée</div>
            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>Le navigateur bloque la caméra car vous n'utilisez pas HTTPS.</div>
            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 4, marginTop: 10, fontSize: 11 }}>Utilisez https:// au lieu de http://</code>
          </div>
        )}
        {mode === 'camera' && !capturedImage ? <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : capturedImage && <img ref={imgRef} src={capturedImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Scanning..." />}
        {!capturedImage && mode === 'upload' && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}><Upload size={40} /><button className="btn btn-sm" onClick={() => fileInputRef.current.click()} style={{ marginTop: 12, background: 'white', color: '#000' }}>Parcourir</button></div>}
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }} />
        {isProcessing && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}><Loader2 className="animate-spin" color={color} size={40} /></div>}
        
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
        <div style={{ display: 'flex', gap: 8 }}>
          {capturedImage ? (
            <button className="btn btn-secondary btn-sm" onClick={reset}><RefreshCcw size={14} /> Reset</button>
          ) : mode === 'camera' ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={takePhoto} style={{ background: color }} disabled={isProcessing}><Camera size={14} /> Scan</button>
              <button 
                className={`btn btn-sm ${autoScan ? 'btn-danger' : 'btn-secondary'}`} 
                onClick={() => setAutoScan(!autoScan)}
                style={autoScan ? { background: '#ef4444', color: 'white' } : {}}
              >
                {autoScan ? <Activity className="animate-pulse" size={14} /> : <Activity size={14} />} 
                {autoScan ? 'Stop Auto' : 'Auto-Scan'}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current.click()}><Upload size={14} /> Importer</button>
          )}
        </div>
        <button className="btn btn-sm" style={{ width: 40, height: 40, borderRadius: '50%', background: color, color: 'white' }}><Sparkles size={18} /></button>
      </div>

      <div style={{ borderTop: `1px solid ${color}22` }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${color}22` }}>
          <button onClick={() => setActiveTab('cards')} style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'cards' ? `${color}15` : 'transparent', color: activeTab === 'cards' ? color : '#666', fontSize: 12, fontWeight: 600 }}>Images ({detectionHistory.length})</button>
          <button onClick={() => setActiveTab('reports')} style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'reports' ? `${color}15` : 'transparent', color: activeTab === 'reports' ? color : '#666', fontSize: 12, fontWeight: 600 }}>Rapports IA ({aiReports.length})</button>
        </div>
        <div style={{ padding: '15px' }}>
          {activeTab === 'cards' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {detectionHistory.slice(0, 10).map(card => (
                <div key={card.id} style={{ background: '#f9fafb', border: `1px solid ${color}22`, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                  <BboxMiniCard imageUrl={card.imageUrl} detections={card.detections} color={color} palette={palette} />
                  <div style={{ padding: '8px', fontSize: 10 }}>{new Date(card.timestamp).toLocaleTimeString()} · {card.detections.length} obj</div>
                  <button onClick={() => deleteCard(card.id)} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: 'white', width: 20, height: 20 }}><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiReports.map(report => (
                <div key={report.id} style={{ background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 10, padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontWeight: 700, fontSize: 12, color }}>Rapport IA</span><button onClick={() => deleteReport(report.id)} style={{ border: 'none', background: 'none' }}><X size={14} /></button></div>
                  {report.isGenerating ? <div style={{ fontSize: 12 }}>Analyse en cours...</div> : <div style={{ fontSize: 12, direction: 'rtl', textAlign: 'right' }}>{report.text}</div>}
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
    </div>
  );
};

export default AIScanner;
