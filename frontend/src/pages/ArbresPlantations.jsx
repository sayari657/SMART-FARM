import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  TreePine, ShieldCheck, AlertCircle,
  Search, Bot, Sparkles, Send, User, 
  Mic, MicOff, Volume2, Upload, Leaf, 
  Flower2, CheckCircle2, X, Bug
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { agentAPI, cvAPI } from '../services/api';

// ─── Reusable YOLO Scanner Panel ─────────────────────────────────────────────
function YOLOScannerPanel({ title, subtitle, category, color = '#22c55e', icon: Icon }) {
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

  const runInference = async (file) => {
    setIsProcessing(true); setError(null); setDetections([]);
    try {
      const res = await cvAPI.detect(file, category);
      setDetections(res.data.detections || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur analyse.');
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
    setCapturedImage(null); setDetections([]); setError(null);
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
                <span style={{ color, marginTop: 12, fontWeight: 700, fontSize: 11, letterSpacing: 2 }}>YOLO SCANNING...</span>
              </div>
            )}

            {!isProcessing && detections.length > 0 && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.82)', padding: '7px 12px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', zIndex: 20 }}>
                <CheckCircle2 size={13} color={color} />
                <span style={{ color, fontWeight: 700, fontSize: 12 }}>{detections.length} détection(s) persistées en base</span>
                {Object.entries(counts).slice(0,2).map(([lbl, cnt]) => (
                  <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#fff' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: getDetColor(lbl), display: 'inline-block' }} />
                    {lbl.replace(/_/g,' ')} ×{cnt}
                  </span>
                ))}
                <button onClick={reset} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #444', color: '#999', borderRadius: 5, padding: '2px 9px', cursor: 'pointer', fontSize: 10 }}>
                  Reset
                </button>
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
  const [isPlantBotOpen, setIsPlantBotOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: "Bonjour ! Je suis PlantBot. Identifiez vos insectes et maladies instantanément.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
          />
          <YOLOScannerPanel
            title="Maladies de l'Olivier"
            subtitle="Pathologies de l'olivier (Peacock Spot/...)"
            category="olive"
            color="#d97706"
            icon={Flower2}
          />
          <YOLOScannerPanel
            title="Détection des Insectes"
            subtitle="Identification des ravageurs"
            category="insects"
            color="#ea580c"
            icon={Bug}
          />
        </div>

        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">{t('trees.detection_log')}</h3>
              <p className="card-subtitle">Flux combiné des analyses phyto-sanitaires</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="pulse-dot green" />
              <span className="text-xs text-bold">LIVE STREAM</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {[
              { type: 'Army_Worm',                 conf: 0.94, time: '16:05', status: 'Critique', model: 'insects' },
              { type: 'Bactériose olivier',        conf: 0.98, time: '14:22', status: 'Sain',     model: 'olive'   },
              { type: 'Tomato_Blight',              conf: 0.91, time: '13:50', status: 'Alerte',   model: 'leaves'  },
              { type: 'Red_Spider',                conf: 0.88, time: '12:45', status: 'Alerte',   model: 'insects' },
            ].map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: d.status === 'Sain' ? 'var(--color-success-bg)' : 'var(--color-critical-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.status === 'Sain' ? 'var(--color-success)' : 'var(--color-critical)' }}>
                  {d.model === 'insects' ? <Bug size={16} /> : <TreePine size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="text-bold" style={{ fontSize: 13 }}>{d.type.replace(/_/g,' ')}</div>
                  <div className="text-xs text-muted">{(d.conf*100).toFixed(0)}% · {d.time} · Modèle: {d.model}</div>
                </div>
                <span className={`badge ${d.status==='Sain'?'badge-success':(d.status==='Alerte'?'badge-warning':'badge-danger')}`}>{d.status}</span>
              </div>
            ))}
          </div>
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

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin { to { transform: rotate(360deg); } }
          .pulse-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
          .pulse-dot.green { background:#22c55e; animation:pulse-g 2s infinite; }
          @keyframes pulse-g { 0%{box-shadow:0 0 0 0 rgba(34,197,94,0.7)} 70%{box-shadow:0 0 0 8px rgba(34,197,94,0)} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} }
        `}} />
      </div>
    </>
  );
}
