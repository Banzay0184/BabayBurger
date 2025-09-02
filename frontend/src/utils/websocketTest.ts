/**
 * Простая утилита для тестирования WebSocket соединения
 */

// import { WEBSOCKET_URLS } from '../config/websocket'; // Не используется

export interface WebSocketTestResult {
  success: boolean;
  message: string;
  error?: string;
}

export const testWebSocketConnection = async (): Promise<WebSocketTestResult> => {
  return new Promise((resolve) => {
    try {
      // Определяем URL для WebSocket в зависимости от окружения
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let baseUrl: string;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = `${protocol}//localhost:8000`;
      } else {
        // В продакшене используем ngrok URL для WebSocket (бэкенд на ngrok)
        const ngrokUrl = import.meta.env.VITE_WEBSOCKET_URL || '3e3f35c1758a.ngrok-free.app';
        baseUrl = `${protocol}//${ngrokUrl}`;
      }
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
            error: error.toString()
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
      // Определяем URL для WebSocket в зависимости от окружения
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let baseUrl: string;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = `${protocol}//localhost:8000`;
      } else {
        // В продакшене используем ngrok URL для WebSocket (бэкенд на ngrok)
        const ngrokUrl = import.meta.env.VITE_WEBSOCKET_URL || '3e3f35c1758a.ngrok-free.app';
        baseUrl = `${protocol}//${ngrokUrl}`;
      }
      const wsUrl = `${baseUrl}/ws/operator/`;

      console.log('🔌 Тестирование WebSocket с ping:', wsUrl);

      const ws = new WebSocket(wsUrl);
      let resolved = false;
      // let pingSent = false;

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
        
        // Отправляем ping
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
        // pingSent = true;
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
            error: error.toString()
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
