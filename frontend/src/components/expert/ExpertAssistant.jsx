import React, { useState, useRef } from 'react';
import { Bot, Mic, MicOff, Send, X, Sparkles, Loader2, Eye, CheckCircle, Paperclip, Trash2 } from 'lucide-react';
import { useExpertAgent } from '../../hooks/useExpertAgent';
import ChatBubble from './ChatBubble';

const SPECIES_CONFIG = {
  cow:       { title: 'خبير الأبقار',      subtitle: 'Bovine Intelligence',     grad: ['#7c3aed', '#4c1d95'] },
  sheep:     { title: 'خبير الغنم',        subtitle: 'Ovine Health Expert',     grad: ['#059669', '#064e3b'] },
  goat:      { title: 'خبير الماعز',       subtitle: 'Caprine Health Expert',   grad: ['#dc2626', '#7f1d1d'] },
  livestock: { title: 'خبير المواشي',      subtitle: 'Livestock Expert',        grad: ['#7c3aed', '#1e1b4b'] },
  bee:       { title: 'خبير النحل',        subtitle: 'Apiculture Intelligence', grad: ['#d97706', '#92400e'] },
  poultry:   { title: 'خبير الدواجن',      subtitle: 'Poultry Health Expert',   grad: ['#0891b2', '#164e63'] },
  rabbit:    { title: 'خبير الأرانب',      subtitle: 'Cuniculture Expert',      grad: ['#16a34a', '#14532d'] },
  leaves:    { title: 'خبير أمراض النبات', subtitle: 'Plant Disease Expert',    grad: ['#16a34a', '#065f46'] },
  olive:     { title: 'خبير الزيتون',      subtitle: 'Olive Expert',            grad: ['#65a30d', '#365314'] },
  insects:   { title: 'خبير الآفات',       subtitle: 'Pest Control Expert',     grad: ['#ea580c', '#7c2d12'] },
  fire:      { title: 'نظام الطوارئ',      subtitle: 'Emergency Response',      grad: ['#ef4444', '#7f1d1d'] },
  plant:     { title: 'خبير الزراعة',      subtitle: 'Agronomy Expert',         grad: ['#22c55e', '#14532d'] },
};

const ExpertAssistant = ({ species = 'cow', color }) => {
  const cfg   = SPECIES_CONFIG[species] || SPECIES_CONFIG['livestock'];
  const grad1 = color || cfg.grad[0];
  const grad2 = cfg.grad[1];

  const [isOpen, setIsOpen]           = useState(false);
  const [input, setInput]             = useState('');
  const [pendingDets, setPendingDets] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);

  const recognitionRef = useRef(null);
  const imageInputRef  = useRef(null);

  const { messages, isTyping, sendMessage, analyzeDetections, addImageMessage, clearHistory, scrollRef } = useExpertAgent(species);

  // Listen for AIScanner trigger
  React.useEffect(() => {
    const handleTrigger = (e) => {
      const { species: evtSpecies, detections, category } = e.detail || {};
      if (!evtSpecies || evtSpecies === species || evtSpecies === category) {
        setIsOpen(true);
        if (detections?.length) {
          setPendingDets({ detections, category: category || evtSpecies || species });
          setTimeout(() => {
            analyzeDetections(detections, category || evtSpecies || species);
            setPendingDets(null);
          }, 400);
        }
      }
    };
    window.addEventListener('open-assistant', handleTrigger);
    return () => window.removeEventListener('open-assistant', handleTrigger);
  }, [species, analyzeDetections]);

  // ── STT ──
  const toggleListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { recognitionRef.current?.stop(); return; }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'ar-TN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend   = () => setIsListening(false);
    rec.onresult = e => setInput(prev => prev + (prev ? ' ' : '') + e.results[0][0].transcript);
    rec.start();
  };

  // ── Image attach ──
  const handleImageAttach = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 600 / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setAttachedImage({ dataUrl: canvas.toDataURL('image/jpeg', 0.7), name: file.name });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = () => {
    if (isTyping) return;

    if (attachedImage) {
      addImageMessage(attachedImage.dataUrl, input || '');
      setAttachedImage(null);
      if (input.trim()) {
        sendMessage(input);
        setInput('');
      }
      return;
    }

    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      {/* ── FAB ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: 32, right: 32,
            width: 64, height: 64, borderRadius: '50%',
            background: `linear-gradient(135deg, ${grad1}, ${grad2})`,
            color: 'white', border: 'none',
            boxShadow: `0 8px 32px ${grad1}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 999,
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          title={`${cfg.title} — ${cfg.subtitle}`}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{
            position: 'absolute', width: '100%', height: '100%',
            borderRadius: '50%', background: grad1, opacity: 0.5,
            animation: 'expertPulse 2s infinite',
          }} />
          <Sparkles size={26} />
        </button>
      )}

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 420, height: 590,
          background: 'var(--glass-bg, #fff)',
          backdropFilter: 'blur(16px)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          zIndex: 1000, overflow: 'hidden',
          animation: 'expertSlideUp 0.3s ease-out',
        }}>
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${grad1}, ${grad2})`,
            padding: '16px 20px', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 }}>
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.85 }}>
                  Smart Farm Expert · RAG
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, direction: 'rtl' }}>{cfg.title}</div>
                <div style={{ fontSize: 10, opacity: 0.75 }}>{cfg.subtitle}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={clearHistory}
                title="Effacer historique"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Pending detections banner */}
          {pendingDets && (
            <div style={{ background: `${grad1}18`, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${grad1}22` }}>
              <Loader2 size={13} color={grad1} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: grad1, fontWeight: 600 }}>
                Analyse de {pendingDets.detections.length} détection(s)…
              </span>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto',
            padding: '16px 16px 8px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {messages.map((m, i) => (
              <div key={i}>
                {m.isAutoGenerated && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, justifyContent: 'flex-end' }}>
                    <Eye size={11} color={grad1} />
                    <span style={{ fontSize: 10, color: grad1, fontWeight: 600 }}>
                      Analyse auto — {m.detectionCount} détection(s)
                    </span>
                  </div>
                )}
                <ChatBubble message={m} />
                {m.sources?.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, paddingLeft: 8 }}>
                    <CheckCircle size={10} color="#22c55e" />
                    <span style={{ fontSize: 9, color: '#6b7280' }}>Source: RAG · UTAP/AVFA Guide</span>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div style={{
                alignSelf: 'flex-start', background: 'white',
                padding: '10px 16px', borderRadius: 18, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <Loader2 size={14} color={grad1} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontStyle: 'italic', opacity: 0.6 }}>جاري التحليل…</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: '10px 14px 12px', background: 'white', borderTop: '1px solid #f0f0f0' }}>
            {/* Image preview */}
            {attachedImage && (
              <div style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f4f6f9', padding: '4px 8px', borderRadius: 8 }}>
                <img src={attachedImage.dataUrl} alt="preview" style={{ height: 28, borderRadius: 4 }} />
                <span style={{ fontSize: 10, color: '#6b7280' }}>{attachedImage.name}</span>
                <button onClick={() => setAttachedImage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 2 }}>
                  <X size={11} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Mic */}
              <button
                onClick={toggleListening}
                style={{
                  padding: 10, borderRadius: '50%',
                  background: isListening ? `${grad1}22` : '#f4f6f9',
                  border: `1px solid ${isListening ? grad1 : 'transparent'}`,
                  cursor: 'pointer', flexShrink: 0,
                  animation: isListening ? 'micPulse 1s ease-in-out infinite' : 'none',
                }}
                title={isListening ? 'Arrêter' : 'Dicter'}
              >
                {isListening ? <MicOff size={15} color={grad1} /> : <Mic size={15} color={grad1} />}
              </button>

              {/* Image attach */}
              <button
                onClick={() => imageInputRef.current.click()}
                style={{ padding: 10, borderRadius: '50%', background: '#f4f6f9', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                title="Joindre une image"
              >
                <Paperclip size={15} color={attachedImage ? grad1 : '#9ca3af'} />
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageAttach} />

              {/* Input */}
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="اسأل بالدارجة أو الفرنسية…"
                style={{
                  flex: 1, border: 'none', background: '#f4f6f9',
                  padding: '10px 14px', borderRadius: 20, fontSize: 13,
                  outline: 'none', direction: 'rtl',
                }}
              />

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={isTyping || (!input.trim() && !attachedImage)}
                style={{
                  background: (input.trim() || attachedImage) ? `linear-gradient(135deg, ${grad1}, ${grad2})` : '#e5e7eb',
                  color: 'white', border: 'none',
                  width: 40, height: 40, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: (input.trim() || attachedImage) ? 'pointer' : 'default',
                  flexShrink: 0, transition: 'background 0.2s',
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes expertPulse {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(1.7); opacity: 0;   }
        }
        @keyframes expertSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
          50%       { box-shadow: 0 0 0 5px rgba(124,58,237,0); }
        }
      `}</style>
    </>
  );
};

export default ExpertAssistant;
