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
          className="fab-hover"
          style={{
            position: 'fixed', bottom: 32, right: 32,
            width: 60, height: 60, borderRadius: '50%',
            background: `linear-gradient(135deg, ${color}, #4c1d95)`,
            color: 'white', border: 'none', boxShadow: '0 8px 32px rgba(124, 58, 237, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 999, transition: 'all 0.3s ease'
          }}
        >
          <Sparkles size={24} />
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
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 }}><Bot size={20} /></div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Smart Farm Expert</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Agentic RAG • {species.charAt(0).toUpperCase() + species.slice(1)} Mode</div>
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
