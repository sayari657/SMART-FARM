import React from 'react';

const ChatBubble = ({ message }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div style={{
      alignSelf: isAssistant ? 'flex-start' : 'flex-end',
      maxWidth: '85%',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      {/* Attached image (user messages) */}
      {message.imageUrl && (
        <div style={{
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)',
          maxWidth: 220,
          alignSelf: isAssistant ? 'flex-start' : 'flex-end',
        }}>
          <img src={message.imageUrl} alt="joint" style={{ width: '100%', display: 'block' }} />
        </div>
      )}

      {/* Text bubble */}
      {message.text && (
        <div style={{
          background: isAssistant ? 'white' : '#7c3aed',
          color: isAssistant ? 'var(--color-text)' : 'white',
          padding: '12px 16px',
          borderRadius: isAssistant ? '20px 20px 20px 4px' : '20px 20px 4px 20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          fontSize: 13,
          lineHeight: 1.5,
        }}>
          {message.text}

          {message.intent && (
            <div style={{
              marginTop: 8, paddingTop: 8,
              borderTop: `1px solid ${isAssistant ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'}`,
              fontSize: 10, opacity: 0.7, fontStyle: 'italic',
            }}>
              Intent: {message.intent.toUpperCase()}
            </div>
          )}

          {message.sources?.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {message.sources.map((s, si) => (
                <span key={si} style={{
                  background: isAssistant ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.2)',
                  color: isAssistant ? '#7c3aed' : 'white',
                  padding: '2px 6px', borderRadius: 4, fontSize: 9,
                }}>
                  Source {si + 1}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
