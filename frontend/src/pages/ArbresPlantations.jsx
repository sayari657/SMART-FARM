import React, { useState, useRef } from 'react';
import { 
  TreePine, Eye, ShieldCheck, AlertCircle, 
  Search, Bot, Activity, Upload, CheckCircle2,
  Sparkles, Camera, ArrowRight, RefreshCcw, FileImage,
  Send, User, Mic, MicOff, Volume2, BookOpen
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import analysisResult from '../assets/trees/analysis_result.png';

export default function ArbresPlantations() {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isPlantBotOpen, setIsPlantBotOpen] = useState(false);
  const [chatAttachment, setChatAttachment] = useState(null);

  // PlantBot Chat State
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: "Bonjour ! Je suis PlantBot. Je viens d'être affecté à cette zone. Téléchargez une image de vos arbres et je l'analyserai avec vous.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLite, setIsLite] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Chat scroll effect
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // STT: Speech to Text
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === 'ar' ? 'ar-TN' : (i18n.language === 'fr' ? 'fr-FR' : 'en-US');
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      setInput(event.results[0][0].transcript);
    };
    recognition.start();
  };

  // TTS: Text to Speech
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'ar' ? 'ar-SA' : (i18n.language === 'fr' ? 'fr-FR' : 'en-US');
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async () => {
    if ((!input.trim() && !chatAttachment) || loading) return;

    const userMsg = { 
        id: Date.now(), type: 'user', 
        text: input, 
        image: chatAttachment,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setChatAttachment(null);
    setLoading(true);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/agent/chat?query=${encodeURIComponent(input)}`, { method: 'POST' });
      const data = await response.json();
      setIsLite(data.is_lite);

      const botMsg = {
        id: Date.now() + 1, type: 'bot', text: data.response_derja || t('assistant.error'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || []
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now() + 2, type: 'bot', text: "Erreur de connexion à l'IA.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        startAnalysis();
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const startAnalysis = () => {
    setIsAnalyzing(true);
    setHasResult(false);
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasResult(true);
      // Auto-inject context into PlantBot
      setMessages(prev => [...prev, { 
        id: Date.now(), type: 'bot', 
        text: "J'ai bien reçu votre image. L'analyse montre une santé globale de 94%. Souhaitez-vous des détails sur les taches détectées ou des conseils d'irrigation ?", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
      setIsPlantBotOpen(true);
    }, 2500);
  };

  const resetAnalysis = () => {
    setHasResult(false);
    setUploadedImage(null);
    setChatAttachment(null);
  };

  const pushImageToPlantBot = () => {
    setChatAttachment(uploadedImage || analysisResult);
    setIsPlantBotOpen(true);
  };

  const stats = [
    { label: "Population d'Arbres", value: "1,240", icon: TreePine, color: "green" },
    { label: "Alertes Maladies", value: "3", icon: AlertCircle, color: "red" },
    { label: "Confiance AI", value: "94.2%", icon: ShieldCheck, color: "blue" },
    { label: "Espèces Détectées", value: "5", icon: Search, color: "teal" },
  ];

  return (
    <>
      <Navbar title={t('trees.title')} subtitle={t('trees.subtitle')} />
      
      <div className="page-content" style={{ direction: i18n.language === 'ar' ? 'rtl' : 'ltr', position: 'relative', minHeight: 'calc(100vh - 80px)' }}>
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleFileSelect} 
        />

        {/* KPI Grid */}
        <div className="kpi-grid">
          {stats.map((s, i) => (
            <div key={i} className="kpi-box">
              <div className={`kpi-icon ${s.color}`}>
                <s.icon size={20} />
              </div>
              <div>
                <div className="kpi-value">{s.value}</div>
                <div className="kpi-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid-2">
          {/* AI Image Diagnostic Card (PROFESSIONAL VERSION) */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">{t('trees.diagnostic_title')}</h3>
                <p className="card-subtitle">{t('trees.diagnostic_subtitle')}</p>
              </div>
              <Sparkles size={20} className="text-primary" />
            </div>

            {!hasResult ? (
              <div 
                className="diagnostic-upload-zone"
                onClick={!isAnalyzing ? triggerFileUpload : undefined}
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: 'var(--color-bg)',
                  transition: 'var(--transition)',
                  cursor: isAnalyzing ? 'default' : 'pointer',
                  minHeight: 280,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isAnalyzing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    {uploadedImage && (
                      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 10 }}>
                        <img src={uploadedImage} alt="Uploading..." style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius)', opacity: 0.5 }} />
                        <div className="spinner-center" />
                      </div>
                    )}
                    {!uploadedImage && <div className="spinner-large" />}
                    <div className="text-bold">{t('common.loading')}</div>
                    <div className="text-xs text-muted">Extraction des caractéristiques phénotypiques...</div>
                  </div>
                ) : (
                  <div>
                    <Camera size={48} className="text-muted" style={{ marginBottom: 16 }} />
                    <h4 style={{ marginBottom: 8 }}>{t('trees.diagnostic_drop')}</h4>
                    <p className="text-xs text-muted">{t('trees.diagnostic_upload')}</p>
                    <button className="btn btn-primary mt-4" onClick={(e) => { e.stopPropagation(); triggerFileUpload(); }}>
                      <Upload size={16} /> {t('trees.diagnostic_upload')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="diagnostic-result-area">
                <div style={{ 
                  position: 'relative', 
                  borderRadius: 'var(--radius-lg)', 
                  overflow: 'hidden',
                  border: '2px solid var(--color-primary)',
                  boxShadow: '0 12px 24px rgba(22, 163, 74, 0.2)',
                  background: '#000'
                }}>
                  {/* The User's Actual Image */}
                  <img 
                    src={uploadedImage || analysisResult} 
                    alt="AI Analysis Result" 
                    style={{ width: '100%', height: 'auto', display: 'block', opacity: isAnalyzing ? 0.5 : 1 }} 
                  />

                  {/* Simulated SVG Overlay (Bounding Boxes) */}
                  {!isAnalyzing && (
                    <svg 
                      viewBox="0 0 100 100" 
                      preserveAspectRatio="none" 
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                    >
                      <rect x="10" y="20" width="20" height="25" fill="none" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="2,1" />
                      <rect x="40" y="10" width="15" height="15" fill="none" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="2,1" />
                      <rect x="70" y="30" width="22" height="30" fill="none" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="2,1" />
                      <rect x="30" y="60" width="18" height="20" fill="none" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2,1" />
                    </svg>
                  )}

                  <div style={{ 
                    position: 'absolute', 
                    top: 12, left: 12, 
                    background: 'rgba(0,0,0,0.7)', 
                    color: 'white', 
                    padding: '4px 10px', 
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backdropFilter: 'blur(4px)'
                  }}>
                    <CheckCircle2 size={12} color="#22c55e" /> ANALYSE TERMINÉE
                  </div>
                </div>
                
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div>
                     <div className="text-bold" style={{ fontSize: 14 }}>Santé Globale: 94%</div>
                     <div className="text-xs text-muted">Diagnostic: {uploadedImage ? 'Analyse personnalisée réussie' : 'Variété: Chemlali (Sfax)'}</div>
                   </div>
                   <div style={{ display: 'flex', gap: 8 }}>
                     <button className="btn btn-secondary btn-sm" onClick={resetAnalysis}>
                       <RefreshCcw size={14} /> 
                     </button>
                     <button className="btn btn-primary btn-sm" onClick={pushImageToPlantBot} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                       Demander au PlantBot <ArrowRight size={14} />
                     </button>
                   </div>
                </div>
              </div>
            )}

            <div style={{ padding: 16, background: 'var(--color-primary-light)', borderRadius: 'var(--radius)', color: 'var(--color-primary-dark)', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 4 }}>
                <Bot size={16} /> Conseil de l'Intelligence Souveraine
              </div>
              "L'analyse montre une structure foliaire saine. Pensez à vérifier l'irrigation pour le mois prochain (Période de floraison)."
            </div>
          </div>

          {/* CV Detection Log Card (Restored) */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">{t('trees.detection_log')}</h3>
                <p className="card-subtitle">Historique des détections automatiques</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                 <div className="pulse-dot green"></div>
                 <span className="text-xs text-bold">LIVE</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               {[
                 { type: 'Bactériose de l’olivier', confidence: 0.98, time: '14:22', status: 'Sain' },
                 { type: 'Mouche de l’olive', confidence: 0.12, time: '14:15', status: 'Alerte' },
                 { type: 'Psylle de l’olivier', confidence: 0.05, time: '12:05', status: 'Sain' },
                 { type: 'Cochenille noire', confidence: 0.08, time: '11:30', status: 'Sain' },
               ].map((d, i) => (
                 <div key={i} className="detection-item" style={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: 12, 
                   padding: 12, 
                   background: 'var(--color-bg)', 
                   borderRadius: 'var(--radius)',
                   border: '1px solid var(--color-border)'
                 }}>
                   <div style={{ 
                     width: 32, height: 32, 
                     borderRadius: 8, 
                     background: d.status === 'Sain' ? 'var(--color-success-bg)' : 'var(--color-critical-bg)',
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     color: d.status === 'Sain' ? 'var(--color-success)' : 'var(--color-critical)'
                   }}>
                     <TreePine size={18} />
                   </div>
                   <div style={{ flex: 1 }}>
                     <div className="text-bold" style={{ fontSize: 13 }}>{d.type}</div>
                     <div className="text-xs text-muted">Confiance: {(d.confidence * 100).toFixed(0)}% • {d.time}</div>
                   </div>
                   <span className={`badge ${d.status === 'Sain' ? 'badge-success' : 'badge-danger'}`}>
                     {d.status}
                   </span>
                 </div>
               ))}
            </div>
            
            <button className="btn btn-secondary w-full mt-4" style={{ justifyContent: 'center' }}>
              {t('common.view_all')} <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Floating PlantBot Widget */}
        {isPlantBotOpen ? (
          <div className="card plantbot-widget" style={{ 
            position: 'fixed', bottom: 20, right: 20, width: 380, height: 600, zIndex: 1000, 
            display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden',
            boxShadow: '0 24px 48px rgba(0,0,0,0.2)', border: '1px solid var(--color-primary)'
          }}>
            <div className="card-header" style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', margin: 0, background: 'var(--color-primary)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'white', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="card-title" style={{ fontSize: 15, color: 'white', margin: 0 }}>PlantBot</h3>
                    <p className="card-subtitle" style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                      <span className="pulse-dot" style={{ background: 'white', width: 6, height: 6 }}></span>
                      En ligne
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsPlantBotOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 14, height: 2, background: 'currentColor', borderRadius: 2 }}></div>
                </button>
              </div>
            </div>

            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--color-bg)' }}>
              {messages.map((msg, i) => (
                <div key={msg.id} style={{ 
                  alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%', display: 'flex', gap: 10,
                  flexDirection: msg.type === 'user' ? 'row-reverse' : 'row'
                }}>
                  <div style={{ 
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: msg.type === 'user' ? 'var(--color-primary)' : 'white',
                    border: msg.type === 'bot' ? '1px solid var(--color-border)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {msg.type === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="var(--color-primary)" />}
                  </div>
                  <div>
                    <div style={{ 
                      padding: '10px 14px', borderRadius: 16, fontSize: 13,
                      background: msg.type === 'user' ? 'var(--color-primary)' : 'white',
                      color: msg.type === 'user' ? 'white' : 'var(--color-text)',
                      border: msg.type === 'bot' ? '1px solid var(--color-border)' : 'none',
                      boxShadow: msg.type === 'bot' ? 'var(--shadow-sm)' : 'none',
                      lineHeight: 1.4
                    }}>
                      {msg.image && <img src={msg.image} alt="Upload" style={{ width: 140, borderRadius: 8, marginBottom: 8, display: 'block', border: '1px solid rgba(255,255,255,0.2)' }} />}
                      {msg.text}
                      {msg.type === 'bot' && (
                        <button onClick={() => speak(msg.text)} style={{ background: 'none', border: 'none', marginLeft: 8, cursor: 'pointer', opacity: 0.6 }} title="Vocaliser">
                          <Volume2 size={12} />
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4, textAlign: msg.type === 'user' ? 'right' : 'left' }}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'white', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={14} color="var(--color-primary)" />
                  </div>
                  <div className="loading-dots" style={{ padding: '10px 16px', borderRadius: 16, background: 'white', border: '1px solid var(--color-border)', fontSize: 13 }}>
                    Analyse en cours...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: 12, borderTop: '1px solid var(--color-border)', background: 'white' }}>
              {/* Attachment Preview Box */}
              {chatAttachment && (
                <div style={{ marginBottom: 12, display: 'inline-block', position: 'relative' }}>
                  <img src={chatAttachment} alt="Attachment" style={{ height: 60, borderRadius: 8, border: '2px solid var(--color-primary)' }} />
                  <button onClick={() => setChatAttachment(null)} style={{ position: 'absolute', top: -6, right: -6, background: 'var(--color-critical)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✕</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={startListening}
                  style={{ width: 40, height: 40, borderRadius: 10, padding: 0, justifyContent: 'center' }}
                  title="Assistant Vocal"
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Demandez au PlantBot..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  style={{ borderRadius: 10, flex: 1, fontSize: 13 }}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleSend}
                  disabled={loading || (!input.trim() && !chatAttachment)}
                  style={{ width: 40, height: 40, borderRadius: 10, padding: 0, justifyContent: 'center' }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button 
            className="fab-assistant"
            onClick={() => setIsPlantBotOpen(true)}
            style={{
              position: 'fixed', bottom: 40, right: 40, width: 64, height: 64,
              background: 'var(--color-primary)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', boxShadow: '0 8px 32px rgba(22, 163, 74, 0.4)',
              zIndex: 100, cursor: 'pointer', border: 'none'
            }}
          >
            <div className="fab-pulse"></div>
            <Bot size={28} />
          </button>
        )}

        {/* CSS for Professional Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          .diagnostic-upload-zone:hover {
            border-color: var(--color-primary) !important;
            background: var(--color-primary-light) !important;
          }
          .spinner-large {
            width: 48px;
            height: 48px;
            border: 4px solid var(--color-border);
            border-top-color: var(--color-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .spinner-center {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 32px; height: 32px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }

          .fab-assistant:hover {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 12px 40px rgba(22, 163, 74, 0.6);
          }
          .fab-pulse {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: var(--color-primary);
            opacity: 0.6;
            animation: pulse 2s infinite;
            z-index: -1;
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          .fab-label {
            position: absolute;
            right: 80px;
            background: #111827;
            color: white;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            opacity: 0;
            transform: translateX(20px);
            transition: all 0.3s ease;
            pointer-events: none;
          }
          .fab-assistant:hover .fab-label {
            opacity: 1;
            transform: translateX(0);
          }
          .pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
          }
          .pulse-dot.green {
            background: #22c55e;
            box-shadow: 0 0 0 rgba(34, 197, 94, 0.4);
            animation: pulse-green 2s infinite;
          }
          @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
          }
        `}} />

      </div>
    </>
  );
}
