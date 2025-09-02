import React, { useState, useEffect } from 'react';
import { WEBSOCKET_URLS } from '../../config/websocket';

interface WebSocketStatusProps {
  className?: string;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ className = '' }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: number | null = null;
    let pingInterval: number | null = null;

    const connect = () => {
      try {
        setStatus('connecting');
        setError(null);

        const wsUrl = WEBSOCKET_URLS.OPERATOR;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('🔌 WebSocket подключен');
          setStatus('connected');
          setError(null);

          // Отправляем ping каждые 30 секунд
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
              }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket сообщение:', data);
            
            if (data.type === 'pong') {
              console.log('🏓 Pong получен');
            }
          } catch (err) {
            console.error('❌ Ошибка парсинга WebSocket сообщения:', err);
          }
        };

        ws.onclose = (event) => {
          console.log('🔌 WebSocket отключен:', event.code, event.reason);
          setStatus('disconnected');
          
          if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
          }

          // Автоматическое переподключение через 3 секунды
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket ошибка:', error);
          setError('Ошибка соединения');
          setStatus('disconnected');
        };

      } catch (err) {
        console.error('❌ Ошибка создания WebSocket:', err);
        setError('Ошибка создания соединения');
        setStatus('disconnected');
      }
    };

    // Подключаемся при монтировании
    connect();

    // Очистка при размонтировании
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Онлайн';
      case 'connecting': return 'Подключение...';
      case 'disconnected': return 'Офлайн';
      default: return 'Неизвестно';
    }
  };

  const getStatusTextColor = () => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'disconnected': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
      <span className={`text-xs ${getStatusTextColor()}`}>
        {getStatusText()}
      </span>
      {error && (
        <span className="text-xs text-red-400" title={error}>
          ⚠️
        </span>
      )}
    </div>
  );
};
