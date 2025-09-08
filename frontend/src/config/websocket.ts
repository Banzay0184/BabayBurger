/**
 * Конфигурация WebSocket соединений
 */

// Определяем URL бэкенда для WebSocket
const buildWsBase = (override?: string): string => {
  const isHttps = window.location.protocol === 'https:';
  const wsProtocol = isHttps ? 'wss:' : 'ws:';

  if (override && override.trim()) {
    const raw = override.trim();
    if (raw.startsWith('ws://') || raw.startsWith('wss://')) {
      return raw.replace(/^http(s)?:/, wsProtocol);
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      try {
        const u = new URL(raw);
        return `${wsProtocol}//${u.host}`;
      } catch {
        return `${wsProtocol}//${raw.replace(/^\/*/, '')}`;
      }
    }
    return `${wsProtocol}//${raw.replace(/^\/*/, '')}`;
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${wsProtocol}//localhost:8000`;
  }

  return `${wsProtocol}//api.babayfood.uz`;
};

export const getWebSocketUrl = (path: string = ''): string => {
  const envWs = (import.meta as any)?.env?.VITE_WEBSOCKET_URL as string | undefined;
  const base = buildWsBase(envWs);
  return `${base}/ws${path}`;
};

// Предопределенные пути WebSocket
export const WEBSOCKET_PATHS = {
  OPERATOR: '/operator/',
  OPERATOR_BY_ID: (id: number) => `/operator/${id}/`,
  ORDER: (id: number) => `/order/${id}/`,
  CASHIER: '/cashier/',
} as const;

// Полные URL для WebSocket соединений
export const WEBSOCKET_URLS = {
  OPERATOR: getWebSocketUrl(WEBSOCKET_PATHS.OPERATOR),
  OPERATOR_BY_ID: (id: number) => getWebSocketUrl(WEBSOCKET_PATHS.OPERATOR_BY_ID(id)),
  ORDER: (id: number) => getWebSocketUrl(WEBSOCKET_PATHS.ORDER(id)),
  CASHIER: getWebSocketUrl(WEBSOCKET_PATHS.CASHIER),
} as const;
