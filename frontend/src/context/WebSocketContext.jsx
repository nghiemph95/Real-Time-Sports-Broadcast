import { createContext, useContext, useRef, useCallback, useState } from 'react';
import { useWebSocket } from '../api/ws';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const onMatchCreatedRef = useRef(null);
  const onCommentaryRef = useRef(null);

  const handleMatchCreated = useCallback((data) => {
    onMatchCreatedRef.current?.(data);
  }, []);

  const handleCommentary = useCallback((data) => {
    onCommentaryRef.current?.(data);
  }, []);

  const ws = useWebSocket({
    onMatchCreated: handleMatchCreated,
    onCommentary: handleCommentary,
  });

  const setOnMatchCreated = useCallback((fn) => {
    onMatchCreatedRef.current = fn;
  }, []);

  const setOnCommentary = useCallback((fn) => {
    onCommentaryRef.current = fn;
  }, []);

  const value = {
    connectionStatus: ws.connectionStatus,
    lastError: ws.lastError,
    subscribe: ws.subscribe,
    unsubscribe: ws.unsubscribe,
    setOnMatchCreated,
    setOnCommentary,
    reconnect: ws.reconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWS() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWS must be used within WebSocketProvider');
  return ctx;
}
