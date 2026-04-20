import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Search, Bot, Sparkles, Send, User, 
  Mic, MicOff, Volume2, Upload, Leaf, 
  Flower2, CheckCircle2, X, Bug, History, Trash2, ExternalLink, Image as ImageIcon,
  TreePine, ShieldCheck, AlertCircle, Maximize2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { agentAPI, cvAPI, diagnosticAPI } from '../services/api';

// ─── Reusable YOLO Scanner Panel ─────────────────────────────────────────────
function YOLOScannerPanel({ title, subtitle, category, color = '#22c55e', icon: Icon, onAnalyze }) {
  const [capturedImage, setCapturedImage]   = useState(null);
  const [detections, setDetections]         = useState([]);
  const [isProcessing, setIsProcessing]     = useState(false);
  const [error, setError]                   = useState(null);
  const [metadata, setMetadata]             = useState(null);
  const [palette, setPalette]               = useState({});

  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  // Fetch model metadata and generate auto-palette
  useEffect(() => {
    cvAPI.getModelMetadata(category)
      .then(res => {
        setMetadata(res.data);
        const p = {};
        const colors = [
          '#ef4444', '#f97316', '#22c55e', '#a855f7', '#8b5cf6', 
          '#64748b', '#eab308', '#06b6d4', '#84cc16', '#f59e0b',
          '#ec4899', '#3b82f6', '#10b981', '#ea580c', '#6366f1'
        ];
        // res.data.names is {0: 'name1', ...}
        Object.values(res.data.names).forEach((name, i) => {
          const key = name.toLowerCase().replace(/\s+/g, '_');
          p[key] = colors[i % colors.length];
        });
        setPalette(p);
      })
      .catch(err => console.error(`Metadata error for ${category}:`, err));
  }, [category]);

  const getDetColor = useCallback((label) => {
    const key = label?.toLowerCase().replace(/\s+/g,'_') || '';
    return palette[key] || color;
  }, [palette, color]);

  // Draw bounding boxes on canvas
  const drawBoxes = useCallback((dets) => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img || !dets?.length) return;

    canvas.width  = img.offsetWidth;
    canvas.height = img.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvas.width, H = canvas.height;

    dets.forEach(det => {
      const [cx_p, cy_p, w_p, h_p, rot = 0] = det.bbox;
      const w  = (w_p  / 100) * W,  h  = (h_p  / 100) * H;
      const cx = (cx_p / 100) * W,  cy = (cy_p / 100) * H;
      const x1 = cx - w/2,          y1 = cy - h/2;
      const boxColor = getDetColor(det.label);
      const conf = Math.round(det.confidence * 100);

      const r = parseInt(boxColor.slice(1,3),16);
      const g = parseInt(boxColor.slice(3,5),16);
      const b = parseInt(boxColor.slice(5,7),16);
      const rgb = `${r},${g},${b}`;

      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);

      ctx.strokeStyle = boxColor;
      ctx.lineWidth   = 3;
      ctx.shadowBlur  = 14;
      ctx.shadowColor = boxColor;
      ctx.strokeRect(x1, y1, w, h);

      const cl = Math.min(w, h) * 0.18;
      ctx.lineWidth = 5;
      [[x1,y1],[x1+w,y1],[x1,y1+h],[x1+w,y1+h]].forEach(([px,py]) => {
        const dx = px===x1?cl:-cl, dy = py===y1?cl:-cl;
        ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+dx,py); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px,py+dy); ctx.stroke();
      });

      const labelTxt = det.label.replace(/_/g,' ').toUpperCase() + '  ' + conf + '%';
      ctx.font      = 'bold 12px Inter, sans-serif';
      ctx.shadowBlur = 0;
      const tw = ctx.measureText(labelTxt).width;
      const lh = 20, ly = Math.max(y1 - lh - 5, 0);
      ctx.fillStyle = `rgba(${rgb},0.92)`;
      ctx.beginPath(); ctx.roundRect(x1, ly, tw+14, lh, 4); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(labelTxt, x1+7, ly+14);

      ctx.restore();
    });
  }, [getDetColor]);

  useEffect(() => {
    if (capturedImage && detections.length > 0) {
      const timer = setTimeout(() => drawBoxes(detections), 120);
      return () => clearTimeout(timer);
    }
  }, [detections, capturedImage, drawBoxes]);

  const [hasScanned, setHasScanned] = useState(false);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 720; // Slightly larger for better zoom results but still optimized
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const base64 = canvas.toDataURL('image/jpeg', 0.85); // Direct base64 output
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
            resolve({ file: compressedFile, base64 });
          }, 'image/jpeg', 0.85);
        };
      };
    });
  };

  const [saveStatus, setSaveStatus] = useState(null);
  const [lastError, setLastError] = useState(null);

  const runInference = async (file) => {
    setIsProcessing(true); 
    setError(null); 
    setDetections([]); 
    setHasScanned(false);
    setSaveStatus(null);
    setLastError(null);
    try {
      // Professional Optimization: Resize locally before upload
      const { file: optimizedFile, base64 } = await compressImage(file);
      const res = await cvAPI.detect(optimizedFile, category);
      const dets = res.data.detections || [];
      setDetections(dets);
      setHasScanned(true);

      // Auto-save if detections found - Using optimized base64
      if (dets.length > 0) {
        setSaveStatus('saving');
        setTimeout(async () => {
          try {
            await onAnalyze?.(dets, category, base64, true); // true = auto-save flag
            setSaveStatus('saved');
          } catch (e) {
            console.error("Auto-save failed:", e);
            const errMsg = String(e.response?.data?.detail || e.response?.status || e.message).substring(0, 20);
            setLastError(errMsg);
            setSaveStatus('error');
          }
        }, 300);
      }
    } catch (err) {
      console.error('Scan Error:', err);
      setError(err.response?.data?.detail || 'Erreur analyse ou Timeout. Réessayez.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = f => setCapturedImage(f.target.result);
    reader.readAsDataURL(file);
    await runInference(file);
  };

  const reset = () => {
    setCapturedImage(null); 
    setDetections([]); 
    setError(null);
    setHasScanned(false);
  };

  const counts = detections.reduce((acc, d) => {
    acc[d.label] = (acc[d.label]||0)+1; return acc;
  }, {});

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${color}33`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 18px', background: `${color}11`, borderBottom: `1px solid ${color}22`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
          <Icon size={20} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{title}</h3>
          <span style={{ fontSize: 10, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 1 }}>{subtitle}</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: `${color}22`, color }}>
            {category}
          </span>
        </div>
      </div>

      <div style={{ height: 280, background: '#080808', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {capturedImage ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img ref={imgRef} src={capturedImage}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
              alt="scan"
              onLoad={() => detections.length > 0 && drawBoxes(detections)}
            />
            <canvas ref={canvasRef} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 10 }} />

            {isProcessing && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
                <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color, marginTop: 12, fontWeight: 700, fontSize: 11, letterSpacing: 2 }}>ALGO INITIALISATION...</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: 10 }}>Poids du modèle en cours de vérification</span>
              </div>
            )}

            {!isProcessing && detections.length > 0 && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.82)', padding: '7px 12px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', zIndex: 20 }}>
                <CheckCircle2 size={13} color={color} />
                <span style={{ color, fontWeight: 700, fontSize: 12 }}>{detections.length} détection(s) trouvée(s)</span>
                {saveStatus === 'saved' && (
                  <span style={{ fontSize: 10, background: '#22c55e', color: 'white', padding: '1px 8px', borderRadius: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={10} /> ANALYSE SAUVEGARDÉE
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span style={{ fontSize: 10, background: '#ef4444', color: 'white', padding: '1px 8px', borderRadius: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <X size={10} /> {lastError ? `ERREUR: ${lastError}` : 'ERREUR SAUVEGARDE'}
                  </span>
                )}
                {Object.entries(counts).slice(0,2).map(([lbl, cnt]) => (
                  <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#fff' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: getDetColor(lbl), display: 'inline-block' }} />
                    {lbl.replace(/_/g,' ')} ×{cnt}
                  </span>
                ))}
                  <button onClick={() => onAnalyze?.(detections, category, capturedImage)} title="Envoyer au PlantBot" style={{ marginLeft: 'auto', background: color, border: 'none', color: '#fff', borderRadius: 5, padding: '2px 12px', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Bot size={11} /> Analyser
                </button>
                <button onClick={reset} style={{ background: 'transparent', border: '1px solid #444', color: '#999', borderRadius: 5, padding: '2px 9px', cursor: 'pointer', fontSize: 10 }}>
                  Reset
                </button>
              </div>
            )}

            {!isProcessing && hasScanned && detections.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, padding: 20, textAlign: 'center' }}>
                <CheckCircle2 size={30} color={color} style={{ marginBottom: 10, opacity: 0.6 }} />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Analyse Terminée</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>Aucune anomalie détectée sur cette image.</span>
                <button onClick={reset} style={{ marginTop: 15, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '5px 15px', cursor: 'pointer', fontSize: 11 }}>Prendre une autre photo</button>
              </div>
            )}

            {error && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', border: '1px solid #ef444433', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 40, padding: 20, textAlign: 'center' }}>
                <AlertCircle size={30} color="#ef4444" style={{ marginBottom: 10 }} />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Erreur Système</span>
                <span style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{error}</span>
                <button onClick={reset} style={{ marginTop: 15, background: '#ef4444', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Réessayer</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
            <Upload size={50} style={{ marginBottom: 10, opacity: 0.25 }} />
            <p style={{ fontSize: 13, marginBottom: 3 }}>Importer une image</p>
            <p style={{ fontSize: 10, opacity: 0.4, marginBottom: 18 }}>YOLO · {category}</p>
            <label style={{ cursor: 'pointer', background: color, color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Upload size={14} /> Parcourir
              <input type="file" hidden accept="image/*" onChange={handleFile} />
            </label>
          </div>
        )}
      </div>

      <div style={{ padding: '8px 12px', background: 'var(--color-surface)', borderTop: `1px solid ${color}22`, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Object.entries(palette).slice(0, 5).map(([cls, clr]) => (
          <span key={cls} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--color-text-2)', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: clr, display: 'inline-block', flexShrink: 0 }} />
            {cls.replace(/_/g,' ')}
          </span>
        ))}
        {Object.keys(palette).length > 5 && (
          <span style={{ fontSize: 9, color: 'var(--color-text-3)' }}>+{Object.keys(palette).length - 5} others</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ArbresPlantations() {
  const { t, i18n } = useTranslation();
  const chatEndRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null); // For Zoom feature
  const [isPlantBotOpen, setIsPlantBotOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: "Bonjour ! Je suis PlantBot. Identifiez vos insectes et maladies instantanément.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    fetchHistory();
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await diagnosticAPI.list();
      setHistory(res.data);
    } catch (err) { console.error("History fetch error:", err); }
  };

  const deleteHistoryRecord = async (id) => {
    if (!window.confirm("Supprimer ce diagnostic ?")) return;
    try {
      await diagnosticAPI.delete(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (err) { alert("Erreur suppression."); }
  };

  const loadFromHistory = (h) => {
    setIsPlantBotOpen(true);
    setMessages(h.chat_log || []);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Reconnaissance vocale non supportée.');
    const r = new SR();
    r.lang = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    r.onstart = () => setIsListening(true);
    r.onend   = () => setIsListening(false);
    r.onresult = e => setInput(e.results[0][0].transcript);
    r.start();
  };

  const speak = text => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = i18n.language === 'ar' ? 'ar-SA' : i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    window.speechSynthesis.speak(u);
  };

   const triggerPlantBotAnalysis = async (detections, cat, imgData = '', isAuto = false) => {
    if (!detections?.length) return;
    
    const counts = detections.reduce((acc, d) => { acc[d.label] = (acc[d.label]||0)+1; return acc; }, {});
    const summary = Object.entries(counts).map(([lbl, cnt]) => `${cnt} ${lbl.replace(/_/g,' ')}`).join(', ');
    const query = `J'ai détecté ${summary} sur mes ${cat === 'olive' ? 'oliviers' : 'plantations'}. Quels sont tes conseils et traitements ?`;

    if (isAuto) {
      // Silence auto-save to history
      try {
        const payload = {
          category: cat,
          image_url: imgData,
          detections: { count: detections.length, types: counts },
          chat_log: [{ type: 'bot', text: `Analyse automatique: ${summary} détectés.`, time: new Date().toLocaleTimeString() }]
        };
        
        await diagnosticAPI.save(payload);
        await fetchHistory(); 
      } catch (err) { 
        console.error("Critical Auto-save error:", err.response?.status, err.response?.data);
        throw err; 
      }
      return;
    }

    // Open chat manually
    setIsPlantBotOpen(true);
    
    // Add user message with image context
    const userMsg = { 
        id: Date.now(), 
        type: 'user', 
        text: query, 
        image: imgData, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

     try {
      const res = await agentAPI.chat(query, 'plant');
      const botResponse = res.data.response_derja || 'Erreur analyse.';
      const botMsg = { id: Date.now()+1, type: 'bot', text: botResponse, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      
      const sessionLog = [...messages, userMsg, botMsg];
      setMessages(sessionLog);

      // Persist to history
      await diagnosticAPI.save({
        category: cat,
        image_url: imgData,
        detections: { count: detections.length, types: counts },
        chat_log: sessionLog
      });
      fetchHistory();

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now()+2, type: 'bot', text: "Erreur de connexion.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { id: Date.now(), type: 'user', text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput(''); setLoading(true);
    try {
      const res = await agentAPI.chat(input, 'plant');
      setMessages(prev => [...prev, { id: Date.now()+1, type: 'bot', text: res.data.response_derja || 'Désolé, erreur.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now()+2, type: 'bot', text: "Erreur de connexion à l'IA.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally { setLoading(false); }
  };

  const stats = [
    { label: "Population d'Arbres", value: '1,240', icon: TreePine,    color: 'green' },
    { label: 'Alertes Maladies',    value: '3',     icon: AlertCircle, color: 'red'   },
    { label: 'Confiance AI',        value: '94.2%', icon: ShieldCheck, color: 'blue'  },
    { label: 'Insects Détectés',   value: '12',    icon: Bug,         color: 'orange' },
  ];

  return (
    <>
      <Navbar title={t('trees.title')} subtitle={t('trees.subtitle')} />
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr', position: 'relative', minHeight: 'calc(100vh - 80px)' }}>

        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          {stats.map((s,i) => (
            <div key={i} className="kpi-box">
              <div className={`kpi-icon ${s.color}`}><s.icon size={20} /></div>
              <div><div className="kpi-value">{s.value}</div><div className="kpi-label">{s.label}</div></div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 4, height: 32, background: 'linear-gradient(180deg,#16a34a,#22c55e)', borderRadius: 4 }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Agronomie & Phyto-Vision</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-3)' }}>Diagnostic IA des cultures, maladies et ravageurs</p>
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: 20, 
          marginBottom: 32 
        }}>
          <YOLOScannerPanel
            title="Maladies des Feuilles"
            subtitle="Diagnostic multi-espèces (Beans/Fraises/Tomates)"
            category="leaves"
            color="#22c55e"
            icon={Leaf}
            onAnalyze={triggerPlantBotAnalysis}
          />
          <YOLOScannerPanel
            title="Maladies de l'Olivier"
            subtitle="Pathologies de l'olivier (Peacock Spot/...)"
            category="olive"
            color="#d97706"
            icon={Flower2}
            onAnalyze={triggerPlantBotAnalysis}
          />
          <YOLOScannerPanel
            title="Détection des Insectes"
            subtitle="Identification des ravageurs"
            category="insects"
            color="#ea580c"
            icon={Bug}
            onAnalyze={triggerPlantBotAnalysis}
          />
        </div>



        {isPlantBotOpen ? (
          <div className="card" style={{ position: 'fixed', bottom: 20, right: 20, width: 370, height: 560, zIndex: 1000, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', border: '1px solid var(--color-primary)' }}>
            <div style={{ padding: '14px 16px', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'white', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={18} /></div>
                <div><h3 style={{ margin: 0, fontSize: 14, color: 'white' }}>PlantBot</h3><p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Expert Phyto IA</p></div>
              </div>
              <button onClick={() => setIsPlantBotOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            
            <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-bg)' }}>
              {messages.map(msg => (
                <div key={msg.id} style={{ alignSelf: msg.type==='user'?'flex-end':'flex-start', maxWidth: '85%', display: 'flex', gap: 8, flexDirection: msg.type==='user'?'row-reverse':'row' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: msg.type==='user'?'var(--color-primary)':'white', border: msg.type==='bot'?'1px solid var(--color-border)':'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {msg.type==='user' ? <User size={13} color="white" /> : <Bot size={13} color="var(--color-primary)" />}
                  </div>
                  <div style={{ padding: '9px 13px', borderRadius: 14, fontSize: 13, background: msg.type==='user'?'var(--color-primary)':'white', color: msg.type==='user'?'white':'var(--color-text)', border: msg.type==='bot'?'1px solid var(--color-border)':'none', lineHeight: 1.45 }}>
                    {msg.image && <img src={msg.image} alt="diagnostic" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
                    {msg.text}
                    {msg.type==='bot' && <button onClick={() => speak(msg.text)} style={{ background: 'none', border: 'none', marginLeft: 8, cursor: 'pointer', opacity: 0.5 }}><Volume2 size={11} /></button>}
                  </div>
                </div>
              ))}
              {loading && <div style={{ alignSelf: 'flex-start', padding: '9px 14px', borderRadius: 14, background: 'white', border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-3)' }}>Analyse...</div>}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: 10, borderTop: '1px solid var(--color-border)', background: 'white', display: 'flex', gap: 8 }}>
              <button className={`btn ${isListening?'btn-danger':'btn-secondary'}`} onClick={startListening} style={{ width: 38, height: 38, borderRadius: 9, padding: 0, justifyContent: 'center' }}>
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
              <input type="text" className="form-input" placeholder="Question..." value={input} onChange={e=>setInput(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleSend()} style={{ borderRadius: 9, flex: 1, fontSize: 13 }} />
              <button className="btn btn-primary" onClick={handleSend} disabled={loading||!input.trim()} style={{ width: 38, height: 38, borderRadius: 9, padding: 0, justifyContent: 'center' }}>
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsPlantBotOpen(true)} style={{ position: 'fixed', bottom: 40, right: 40, width: 62, height: 62, background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 32px rgba(22,163,74,0.4)', zIndex: 100, cursor: 'pointer', border: 'none' }}>
            <Bot size={26} />
          </button>
        )}

        {/* ─── Diagnostic History Section ─── */}
        <div style={{ marginTop: 40, borderTop: '1px solid var(--color-border)', paddingTop: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div className="kpi-icon blue" style={{ width: 32, height: 32 }}><History size={16} /></div>
                <h3 className="card-title">Historique des Analyses & Conseils</h3>
            </div>

            {history.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', background: 'white', borderRadius: 16, border: '1px dashed var(--color-border)', color: 'var(--color-text-3)' }}>
                    Aucune analyse sauvegardée pour le moment.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                    {history.map(h => (
                        <div key={h.id} className="card" style={{ padding: 0, overflow: 'hidden', transition: 'transform 0.2s', cursor: 'default' }}>
                            <div style={{ height: 160, background: '#f8fafc', position: 'relative' }}>
                                {h.image_url ? (
                                    <img src={h.image_url} alt="diag" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><ImageIcon size={40} /></div>
                                )}
                                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 6, color: 'white', fontSize: 10 }}>
                                    {new Date(h.timestamp).toLocaleDateString()}
                                </div>
                            </div>
                            <div style={{ padding: 15 }}>
                                <div className="text-bold" style={{ fontSize: 14, marginBottom: 5, color: 'var(--color-primary)' }}>{h.category.toUpperCase()}</div>
                                <div className="text-xs" style={{ color: 'var(--color-text-3)', marginBottom: 12 }}>
                                    {h.detections?.count || 0} détection(s) analysée(s)
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => setSelectedRecord(h)} className="btn btn-primary" style={{ flex: 1, height: 38, fontSize: 12, borderRadius: 10, justifyContent: 'center' }}>
                                        <Maximize2 size={14} /> Zoomer
                                    </button>
                                    <button onClick={() => deleteHistoryRecord(h.id)} className="btn btn-danger" style={{ width: 38, height: 38, padding: 0, borderRadius: 10, justifyContent: 'center' }}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* ─── Zoom Modal ─── */}
        {selectedRecord && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="card" style={{ width: '100%', maxWidth: 900, height: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '15px 25px', background: 'rgba(255,255,20,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><History size={16} /></div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Détails de l'Analyse</h3>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-3)' }}>{new Date(selectedRecord.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRecord(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', overflow: 'hidden' }}>
                <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={selectedRecord.image_url} alt="zoom" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ padding: 30, overflowY: 'auto', background: 'var(--color-surface)' }}>
                  <div style={{ marginBottom: 30 }}>
                    <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--color-primary)', letterSpacing: 1, marginBottom: 15, fontWeight: 800 }}>Detections</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {Object.entries(selectedRecord.detections?.types || {}).map(([lbl, cnt]) => (
                        <div key={lbl} style={{ padding: '8px 16px', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                           <Bug size={14} color="#22c55e" />
                           <span style={{ fontSize: 13, fontWeight: 600 }}>{lbl.replace(/_/g,' ')} <span style={{ color: 'var(--color-primary)', marginLeft: 4 }}>×{cnt}</span></span>
                        </div>
                      ))}
                      {(!selectedRecord.detections?.types || Object.keys(selectedRecord.detections.types).length === 0) && (
                        <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Aucune détection spécifique enregistrée.</p>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: 30 }}>
                     <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--color-primary)', letterSpacing: 1, marginBottom: 15, fontWeight: 800 }}>Conseils & Discussion</h4>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                        {(selectedRecord.chat_log || []).map((msg, i) => (
                           <div key={i} style={{ display: 'flex', gap: 12, flexDirection: msg.type === 'user' ? 'row-reverse' : 'row' }}>
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: msg.type === 'user' ? 'var(--color-primary)' : 'white', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {msg.type === 'user' ? <User size={13} color="white" /> : <Bot size={13} color="var(--color-primary)" />}
                              </div>
                              <div style={{ padding: '10px 15px', borderRadius: 15, fontSize: 13, background: msg.type === 'user' ? 'var(--color-primary)' : 'white', color: msg.type === 'user' ? 'white' : 'var(--color-text)', border: '1px solid var(--color-border)', flex: 1, lineHeight: 1.5 }}>
                                 {msg.text}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10 }}>
                     <button onClick={() => { loadFromHistory(selectedRecord); setSelectedRecord(null); }} className="btn btn-primary" style={{ flex: 1, height: 44, borderRadius: 12 }}>Relancer la Discussion</button>
                     <button onClick={() => { deleteHistoryRecord(selectedRecord.id); setSelectedRecord(null); }} className="btn btn-danger" style={{ width: 44, height: 44, padding: 0, borderRadius: 12, justifyContent: 'center' }}><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin { to { transform: rotate(360deg); } }
          .pulse-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
          .pulse-dot.green { background:#22c55e; animation:pulse-g 2s infinite; }
          @keyframes pulse-g { 0%{box-shadow:0 0 0 0 rgba(34,197,94,0.7)} 70%{box-shadow:0 0 0 8px rgba(34,197,94,0)} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} }
          .history-card:hover { transform: translateY(-5px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
        `}} />
      </div>
    </>
  );
}
