import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, BookOpen, Clock, ChevronRight, Mic, Volume2, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';

export default function SovereignAssistant() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      text: t('assistant.welcome'), 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLite, setIsLite] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
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
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
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
    if (!input.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      type: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Timeout Controller (increased to 60s for intensive AI RAG queries)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("REASON_TIMEOUT"), 60000);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/agent/chat?query=${encodeURIComponent(input)}`, {
        method: 'POST',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      setIsLite(data.is_lite);

      const botMsg = {
        id: Date.now() + 1,
        type: 'bot',
        text: data.response_derja || t('assistant.error'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || []
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Agent chat error:", error);
      
      let errorMessage = t('assistant.error');
      if (error.name === 'AbortError' || error === "REASON_TIMEOUT") {
        errorMessage = t('assistant.timeout') || "Désolé, l'agent IA analyse trop de données (Délai d'attente dépassé). Veuillez réessayer dans un instant !";
      }

      const errorMsg = {
        id: Date.now() + 2,
        type: 'bot',
        text: errorMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar title={t('sidebar.assistant')} subtitle="Interactive Agricultural Intelligence" />
      
      <div className="page-content" style={{ display: 'flex', gap: 24, height: 'calc(100vh - 180px)', direction: i18n.language === 'ar' ? 'rtl' : 'ltr' }}>
        
        {/* Chat History Section */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ 
                alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                display: 'flex',
                gap: 12,
                flexDirection: msg.type === 'user' ? (i18n.language === 'ar' ? 'row' : 'row-reverse') : (i18n.language === 'ar' ? 'row-reverse' : 'row')
              }}>
                <div style={{ 
                  width: 36, height: 36, borderRadius: '50%', 
                  background: msg.type === 'user' ? '#3b82f6' : '#111827',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {msg.type === 'user' ? <User size={18} color="white" /> : <Bot size={18} color={isLite ? "#fbbf24" : "#3b82f6"} />}
                </div>
                <div>
                  <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: 16, 
                    background: msg.type === 'user' ? '#3b82f6' : 'var(--color-bg)',
                    color: msg.type === 'user' ? 'white' : 'var(--color-text)',
                    border: msg.type === 'bot' ? '1px solid var(--color-border)' : 'none',
                    textAlign: i18n.language === 'ar' ? 'right' : 'left',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    position: 'relative'
                  }}>
                    {msg.text}
                    {msg.type === 'bot' && (
                      <button 
                        onClick={() => speak(msg.text)} 
                        style={{ background: 'none', border: 'none', marginLeft: 8, cursor: 'pointer', opacity: 0.6 }}
                        title="Vocaliser"
                      >
                        <Volume2 size={12} color="var(--color-text-3)" />
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4, textAlign: msg.type === 'user' ? 'left' : 'right' }}>
                    {msg.time}
                  </div>
                  
                  {msg.sources?.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {msg.sources.map((s, i) => (
                        <span key={i} className="badge badge-info" style={{ fontSize: 10, cursor: 'help' }} title={s}>
                          <BookOpen size={10} style={{ marginLeft: 4 }} /> Experts Wisdom {i+1}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} color={isLite ? "#fbbf24" : "#3b82f6"} />
                </div>
                <div className="loading-dots" style={{ padding: '12px 16px', borderRadius: 16, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  {t('assistant.think')}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: 20, borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                onClick={startListening}
                style={{ width: 50, height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <input 
                type="text" 
                className="form-control" 
                placeholder={t('assistant.welcome').slice(0, 30) + "..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                style={{ borderRadius: 12, height: 50, fontSize: 16, flex: 1 }}
              />
              
              <button 
                className="btn btn-primary" 
                onClick={handleSend}
                disabled={loading}
                style={{ width: 50, height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Send size={20} />
              </button>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 16, color: 'var(--color-text-3)', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={14} color={isLite ? "#fbbf24" : "#3b82f6"} /> {isLite ? t('assistant.lite_active') : t('assistant.enterprise_active')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <BookOpen size={14} /> Knowledge Pack: UTAP/AVFA
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} /> Recent Knowledge
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               {['Hive Heat Stress Guide', 'Rabbitry Nest Care', 'Sheep Health Protocol'].map((guide, i) => (
                 <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13 }}>
                   {guide}
                   <ChevronRight size={14} color="var(--color-text-3)" />
                 </div>
               ))}
            </div>
          </div>
          
          <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)', color: 'white', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Sparkles size={20} color="#3b82f6" />
              <h3 style={{ margin: 0, fontSize: 16 }}>Agent Capabilities</h3>
            </div>
            <ul style={{ padding: 0, listStyle: 'none', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 12, color: '#9ca3af' }}>
              <li style={{ display: 'flex', gap: 8 }}>✅ Native Derja Translation</li>
              <li style={{ display: 'flex', gap: 8 }}>✅ Species-specific Expertise</li>
              <li style={{ display: 'flex', gap: 8 }}>✅ RAG Data Grounding</li>
              <li style={{ display: 'flex', gap: 8 }}>✅ Zero-Cost Local Inference</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
