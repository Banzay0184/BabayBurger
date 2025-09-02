/**
 * Конфигурация WebSocket соединений
 */

// Определяем URL бэкенда для WebSocket
export const getWebSocketUrl = (path: string = ''): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // В режиме разработки используем localhost:8000
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${protocol}//localhost:8000/ws${path}`;
  }
  
  // В продакшене используем тот же хост что и фронтенд
  const host = window.location.host;
  return `${protocol}//${host}/ws${path}`;
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
