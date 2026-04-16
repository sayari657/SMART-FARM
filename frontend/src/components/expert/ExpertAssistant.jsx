import React, { useState } from 'react';
import { Bot, Mic, Send, X, Sparkles, Loader2 } from 'lucide-react';
import { useExpertAgent } from '../../hooks/useExpertAgent';
import ChatBubble from './ChatBubble';

/**
 * SOLID: Open/Closed Principle
 * ExpertAssistant can be configured for any animal species.
 */
const ExpertAssistant = ({ species = 'cow', color = '#7c3aed' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isTyping, sendMessage, scrollRef } = useExpertAgent(species);

  // Allow external triggers from AIScanners
  React.useEffect(() => {
    const handleTrigger = (e) => {
      if (e.detail?.species === species || !e.detail?.species) {
        setIsOpen(true);
      }
    };
    window.addEventListener('open-assistant', handleTrigger);
    return () => window.removeEventListener('open-assistant', handleTrigger);
  }, [species]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fab-hover assistant-sparkle-trigger"
          style={{
            position: 'fixed', bottom: 32, right: 32,
            width: 64, height: 64, borderRadius: '50%',
            background: `linear-gradient(135deg, ${color}, #4c1d95)`,
            color: 'white', border: 'none', boxShadow: `0 8px 32px ${color}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 999, transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          <div className="sparkle-pulse" />
          <Sparkles size={28} />
          <style dangerouslySetInnerHTML={{ __html: `
            .assistant-sparkle-trigger:hover { transform: scale(1.1) rotate(5deg); }
            .sparkle-pulse {
              position: absolute; width: 100%; height: 100%;
              border-radius: 50%; background: ${color};
              opacity: 0.6; animation: assistantPulse 2s infinite;
              z-index: -1;
            }
            @keyframes assistantPulse {
              0% { transform: scale(1); opacity: 0.6; }
              100% { transform: scale(1.6); opacity: 0; }
            }
          `}} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="expert-panel" style={{
          position: 'fixed', bottom: 100, right: 32, width: 400, height: 550,
          background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', borderRadius: 24,
          border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)',
          display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{ background: `linear-gradient(135deg, ${color}, #4c1d95)`, padding: '20px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 }}><Sparkles size={20} /></div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Smart Farm Expert Agentic RAG</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{species.charAt(0).toUpperCase() + species.slice(1)} Mode</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((m, i) => (
              <ChatBubble key={i} message={m} />
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'white', padding: '12px 16px', borderRadius: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} className="animate-spin" />
                <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Expert is thinking...</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ padding: 20, background: 'white', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn-icon" style={{ padding: 10, borderRadius: '50%', background: '#f4f6f9', border: 'none', cursor: 'pointer' }} title="Voice recording (Whisper)">
              <Mic size={18} color={color} />
            </button>
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask in Derja..." 
              style={{ flex: 1, border: 'none', background: '#f4f6f9', padding: '12px 16px', borderRadius: 24, fontSize: 13 }} 
            />
            <button 
              onClick={handleSend} 
              disabled={isTyping}
              style={{ 
                background: color, color: 'white', border: 'none', width: 40, height: 40, 
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', opacity: isTyping ? 0.6 : 1
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ExpertAssistant;
