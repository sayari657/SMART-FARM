/**
 * useWebSocket — connexion WS sécurisée au backend Smart Farm AI.
 * Se reconnecte automatiquement (backoff exponentiel jusqu'à 30s).
 * Envoie des messages JSON avec {type, payload}.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

// Prod: VITE_WS_URL targets the backend directly. Dev: use the SAME ORIGIN so the
// connection flows through Vite's `/ws` proxy → backend (connecting straight to
// :8000 fails the handshake under the HTTPS dev server → "Connexion échouée").
const WS_BASE = import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
  window.location.host;

export function useWebSocket({ endpoint = '/ws/events', enabled = true } = {}) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const retryRef = useRef(null);
  const retryDelay = useRef(1000);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const url = `${WS_BASE}${endpoint}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        retryDelay.current = 1000;
      };

      ws.onmessage = (evt) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(evt.data);
          setLastMessage(data);
        } catch {
          setLastMessage({ raw: evt.data });
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        // Exponential backoff: 1s → 2s → 4s → … → 30s
        retryRef.current = setTimeout(() => {
          retryDelay.current = Math.min(retryDelay.current * 2, 30000);
          connect();
        }, retryDelay.current);
      };

      ws.onerror = () => { ws.close(); };
    } catch (e) {
      console.warn('WebSocket connect failed:', e);
    }
  }, [endpoint, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((type, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return { connected, lastMessage, send };
}
