import { useState, useEffect, useRef } from 'react';
import { agentAPI } from '../services/api';

/**
 * SOLID: Dependency Inversion
 * useExpertAgent provides an abstract interface for interacting with the Smart Farm Expert.
 * It encapsulates state management and API communication.
 */
export const useExpertAgent = (species = 'cow') => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Aslema! I'm your Smart Farm Expert. How can I help you today? (Derja or FR)" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await agentAPI.chat(text, species);
      
      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        text: response.data.response_derja,
        intent: response.data.intent,
        sources: response.data.sources
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Expert AI Error:", err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: "Desolé, j'ai eu un problème de connexion. Réessayez plus tard." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearHistory = () => {
    setMessages([{ role: 'assistant', text: "History cleared. How can I help you now?" }]);
  };

  return {
    messages,
    isTyping,
    sendMessage,
    clearHistory,
    scrollRef
  };
};
