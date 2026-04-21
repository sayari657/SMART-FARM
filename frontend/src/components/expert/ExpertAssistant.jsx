import React, { useState } from 'react';
import { Bot, Mic, Send, X, Sparkles, Loader2, Eye, CheckCircle } from 'lucide-react';
import { useExpertAgent } from '../../hooks/useExpertAgent';
import ChatBubble from './ChatBubble';

// Per-species config: title, subtitle, gradient colors
const SPECIES_CONFIG = {
  cow:       { title: 'خبير الأبقار',    subtitle: 'Bovine Intelligence',    grad: ['#7c3aed', '#4c1d95'] },
  sheep:     { title: 'خبير الغنم',      subtitle: 'Ovine Health Expert',    grad: ['#059669', '#064e3b'] },
  goat:      { title: 'خبير الماعز',     subtitle: 'Caprine Health Expert',  grad: ['#dc2626', '#7f1d1d'] },
  livestock: { title: 'خبير المواشي',    subtitle: 'Livestock Expert',       grad: ['#7c3aed', '#1e1b4b'] },
  bee:       { title: 'خبير النحل',      subtitle: 'Apiculture Intelligence', grad: ['#d97706', '#92400e'] },
  poultry:   { title: 'خبير الدواجن',    subtitle: 'Poultry Health Expert',  grad: ['#0891b2', '#164e63'] },
  rabbit:    { title: 'خبير الأرانب',    subtitle: 'Cuniculture Expert',     grad: ['#16a34a', '#14532d'] },
  leaves:    { title: 'خبير أمراض النبات', subtitle: 'Plant Disease Expert', grad: ['#16a34a', '#065f46'] },
  olive:     { title: 'خبير الزيتون',    subtitle: 'Olive Expert',           grad: ['#65a30d', '#365314'] },
  insects:   { title: 'خبير الآفات',     subtitle: 'Pest Control Expert',    grad: ['#ea580c', '#7c2d12'] },
  fire:      { title: 'نظام الطوارئ',    subtitle: 'Emergency Response',     grad: ['#ef4444', '#7f1d1d'] },
  plant:     { title: 'خبير الزراعة',    subtitle: 'Agronomy Expert',        grad: ['#22c55e', '#14532d'] },
};

const ExpertAssistant = ({ species = 'cow', color }) => {
  const cfg     = SPECIES_CONFIG[species] || SPECIES_CONFIG['livestock'];
  const grad1   = color || cfg.grad[0];
  const grad2   = cfg.grad[1];

  const [isOpen, setIsOpen]         = useState(false);
  const [input,  setInput]          = useState('');
  const [pendingDets, setPendingDets] = useState(null);

  const { messages, isTyping, sendMessage, analyzeDetections, scrollRef } = useExpertAgent(species);

  // Listen for AIScanner ✨ trigger — receives detections
  React.useEffect(() => {
    const handleTrigger = (e) => {
      const { species: evtSpecies, detections, category } = e.detail || {};
      // Open if this assistant matches or is generic
      if (!evtSpecies || evtSpecies === species || evtSpecies === category) {
        setIsOpen(true);
        if (detections && detections.length > 0) {
          setPendingDets({ detections, category: category || evtSpecies || species });
          // Small delay so panel renders before auto-sending
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

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput('');
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

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
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          title={`${cfg.title} — ${cfg.subtitle}`}
        >
          <span style={{
            position: 'absolute', width: '100%', height: '100%',
            borderRadius: '50%', background: grad1, opacity: 0.5,
            animation: 'expertPulse 2s infinite',
          }} />
          <Sparkles size={26} />
          <style>{`
            @keyframes expertPulse {
              0%   { transform: scale(1);   opacity: 0.5; }
              100% { transform: scale(1.7); opacity: 0;   }
            }
            .expert-fab:hover { transform: scale(1.1) rotate(5deg); }
          `}</style>
        </button>
      )}

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 420, height: 580,
          background: 'var(--glass-bg, #fff)',
          backdropFilter: 'blur(16px)',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          zIndex: 1000, overflow: 'hidden',
          animation: 'expertSlideUp 0.3s ease-out',
        }}>
          <style>{`
            @keyframes expertSlideUp {
              from { opacity: 0; transform: translateY(24px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${grad1}, ${grad2})`,
            padding: '18px 20px', color: 'white',
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
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            ><X size={16} /></button>
          </div>

          {/* Loading overlay for pending detections */}
          {pendingDets && (
            <div style={{ background: `${grad1}18`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${grad1}22` }}>
              <Loader2 size={14} color={grad1} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: grad1, fontWeight: 600 }}>
                Analyse de {pendingDets.detections.length} détection(s) en cours…
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
                {/* Auto-generated badge */}
                {m.isAutoGenerated && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, justifyContent: 'flex-end' }}>
                    <Eye size={11} color={grad1} />
                    <span style={{ fontSize: 10, color: grad1, fontWeight: 600 }}>
                      Analyse auto — {m.detectionCount} détection(s)
                    </span>
                  </div>
                )}
                <ChatBubble message={m} />
                {/* Sources badge */}
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
          <div style={{
            padding: '12px 16px',
            background: 'white',
            borderTop: '1px solid #f0f0f0',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <button style={{ padding: 10, borderRadius: '50%', background: '#f4f6f9', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              <Mic size={16} color={grad1} />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="اسأل بالدارجة أو الفرنسية…"
              style={{
                flex: 1, border: 'none', background: '#f4f6f9',
                padding: '11px 16px', borderRadius: 24, fontSize: 13,
                outline: 'none', direction: 'rtl',
              }}
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              style={{
                background: input.trim() ? `linear-gradient(135deg, ${grad1}, ${grad2})` : '#e5e7eb',
                color: 'white', border: 'none',
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
                flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              <Send size={16} />
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </>
  );
};

export default ExpertAssistant;
