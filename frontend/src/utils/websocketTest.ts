/**
 * Простая утилита для тестирования WebSocket соединения
 */

// import { WEBSOCKET_URLS } from '../config/websocket'; // Не используется

export interface WebSocketTestResult {
  success: boolean;
  message: string;
  error?: string;
}

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

export const testWebSocketConnection = async (): Promise<WebSocketTestResult> => {
  return new Promise((resolve) => {
    try {
      const envWs = (import.meta as any)?.env?.VITE_WEBSOCKET_URL as string | undefined;
      const baseUrl = buildWsBase(envWs);
      const wsUrl = `${baseUrl}/ws/operator/`;

      console.log('🔌 Тестирование WebSocket соединения:', wsUrl);

      const ws = new WebSocket(wsUrl);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          resolve({
            success: false,
            message: 'Таймаут подключения',
            error: 'WebSocket не подключился в течение 5 секунд'
          });
        }
      }, 5000);

      ws.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          resolve({
            success: true,
            message: 'WebSocket подключен успешно'
          });
        }
      };

      ws.onerror = (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            message: 'Ошибка WebSocket соединения',
            error: (error as any)?.message || error.toString()
          });
        }
      };

      ws.onclose = (event) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            message: 'WebSocket соединение закрыто',
            error: `Код: ${event.code}, Причина: ${event.reason}`
          });
        }
      };

    } catch (error) {
      resolve({
        success: false,
        message: 'Ошибка создания WebSocket',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
};

export const testWebSocketWithPing = async (): Promise<WebSocketTestResult> => {
  return new Promise((resolve) => {
    try {
      const envWs = (import.meta as any)?.env?.VITE_WEBSOCKET_URL as string | undefined;
      const baseUrl = buildWsBase(envWs);
      const wsUrl = `${baseUrl}/ws/operator/`;

      console.log('🔌 Тестирование WebSocket с ping:', wsUrl);

      const ws = new WebSocket(wsUrl);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          resolve({
            success: false,
            message: 'Таймаут тестирования',
            error: 'WebSocket не ответил на ping в течение 10 секунд'
          });
        }
      }, 10000);

      ws.onopen = () => {
        console.log('✅ WebSocket подключен, отправляем ping...');
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Получено сообщение:', data);

          if (data.type === 'pong') {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              ws.close();
              resolve({
                success: true,
                message: 'WebSocket работает корректно (ping/pong)'
              });
            }
          }
        } catch (error) {
          console.error('❌ Ошибка парсинга сообщения:', error);
        }
      };

      ws.onerror = (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            message: 'Ошибка WebSocket соединения',
            error: (error as any)?.message || error.toString()
          });
        }
      };

      ws.onclose = (event) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            message: 'WebSocket соединение закрыто',
            error: `Код: ${event.code}, Причина: ${event.reason}`
          });
        }
      };

    } catch (error) {
      resolve({
        success: false,
        message: 'Ошибка создания WebSocket',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
};

export const testClientWebSocketConnection = async (telegramId: number): Promise<WebSocketTestResult> => {
  return new Promise((resolve) => {
    try {
      const envWs = (import.meta as any)?.env?.VITE_WEBSOCKET_URL as string | undefined;
      const baseUrl = buildWsBase(envWs);
      const wsUrl = `${baseUrl}/ws/client/${telegramId}/`;

      console.log('🔌 Тестирование клиентского WebSocket соединения:', wsUrl);

      const ws = new WebSocket(wsUrl);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          resolve({
            success: false,
            message: 'Таймаут подключения',
            error: 'Клиентский WebSocket не подключился в течение 5 секунд'
          });
        }
      }, 5000);

      ws.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          resolve({
            success: true,
            message: 'Клиентский WebSocket подключен успешно'
          });
        }
      };

      ws.onerror = (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            message: 'Ошибка клиентского WebSocket соединения',
            error: (error as any)?.message || error.toString()
          });
        }
      };

      ws.onclose = (event) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            message: 'Клиентский WebSocket соединение закрыто',
            error: `Код: ${event.code}, Причина: ${event.reason}`
          });
        }
      };

    } catch (error) {
      resolve({
        success: false,
        message: 'Ошибка создания клиентского WebSocket',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
};
