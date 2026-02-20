/**
 * WebSocket URL.
 * - Dev: same origin (/ws) → Vite proxy to backend.
 * - Production: VITE_WS_URL nếu có, không thì suy từ VITE_API_URL (đổi http(s) -> ws(s), thêm /ws).
 */
function getWsUrl() {
  if (import.meta.env.DEV) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/ws`;
  }
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) return explicit;
  const api = import.meta.env.VITE_API_URL || '';
  if (api) {
    const u = api.replace(/^http/, 'ws');
    return u.endsWith('/') ? `${u}ws` : `${u}/ws`;
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

/**
 * Hook: connect to WS, subscribe to matchId when set, handle welcome / match_created / commentary.
 * Returns { connectionStatus, matches, appendCommentary, subscribe, unsubscribe }.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(options = {}) {
  const { onMatchCreated, onCommentary } = options;
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected | connecting | connected
  const [lastError, setLastError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const subscribedMatchIdRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setConnectionStatus('connecting');
    setLastError(null);
    const url = getWsUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'welcome':
            break;
          case 'subscribed':
            break;
          case 'unsubscribed':
            break;
          case 'match_created':
            onMatchCreated?.(msg.data);
            break;
          case 'commentary':
            onCommentary?.(msg.data);
            break;
          case 'error':
            setLastError(msg.message || 'WebSocket error');
            break;
          default:
            break;
        }
      } catch {
        setLastError('Invalid message');
      }
    };

    ws.onerror = () => {
      setLastError('Connection error');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      wsRef.current = null;
      const delay = 3000;
      reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
    };
  }, [onMatchCreated, onCommentary]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((obj) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  const subscribe = useCallback((matchId) => {
    if (subscribedMatchIdRef.current !== null) {
      send({ type: 'unsubscribe', matchId: subscribedMatchIdRef.current });
    }
    subscribedMatchIdRef.current = matchId;
    send({ type: 'subscribe', matchId });
  }, [send]);

  const unsubscribe = useCallback(() => {
    if (subscribedMatchIdRef.current !== null) {
      send({ type: 'unsubscribe', matchId: subscribedMatchIdRef.current });
      subscribedMatchIdRef.current = null;
    }
  }, [send]);

  return {
    connectionStatus,
    lastError,
    subscribe,
    unsubscribe,
    reconnect: connect,
  };
}

export { getWsUrl };
