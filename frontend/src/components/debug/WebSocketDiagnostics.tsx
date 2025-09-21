import React, { useState, useEffect } from 'react';
import { websocketMonitor, type WebSocketStatus } from '../../utils/websocketMonitor';

interface WebSocketDiagnosticsProps {
  show?: boolean;
  className?: string;
}

const WebSocketDiagnostics: React.FC<WebSocketDiagnosticsProps> = ({ 
  show = false, 
  className = '' 
}) => {
  const [statuses, setStatuses] = useState<WebSocketStatus[]>([]);
  const [diagnostics, setDiagnostics] = useState(websocketMonitor.getDiagnostics());

  useEffect(() => {
    if (!show) return;

    const unsubscribe = websocketMonitor.subscribe((newStatuses) => {
      setStatuses(newStatuses);
      setDiagnostics(websocketMonitor.getDiagnostics());
    });

    // Получаем начальные данные
    setStatuses(websocketMonitor.getStatuses());
    setDiagnostics(websocketMonitor.getDiagnostics());

    return unsubscribe;
  }, [show]);

  if (!show) return null;

  const getReadyStateText = (readyState: number): string => {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'Подключение';
      case WebSocket.OPEN: return 'Подключено';
      case WebSocket.CLOSING: return 'Закрытие';
      case WebSocket.CLOSED: return 'Закрыто';
      default: return 'Неизвестно';
    }
  };

  const getReadyStateColor = (readyState: number): string => {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'text-yellow-600';
      case WebSocket.OPEN: return 'text-green-600';
      case WebSocket.CLOSING: return 'text-orange-600';
      case WebSocket.CLOSED: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        🔌 WebSocket Диагностика
      </h3>
      
      {/* Общая статистика */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">
            {diagnostics.totalConnections}
          </div>
          <div className="text-xs text-gray-600">Всего</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600">
            {diagnostics.activeConnections}
          </div>
          <div className="text-xs text-gray-600">Активных</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600">
            {diagnostics.failedConnections}
          </div>
          <div className="text-xs text-gray-600">Ошибок</div>
        </div>
      </div>

      {/* Детальная информация о соединениях */}
      <div className="space-y-2">
        {statuses.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-2">
            Нет активных WebSocket соединений
          </div>
        ) : (
          statuses.map((status, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {status.url}
                </div>
                <div className={`text-xs font-medium ${getReadyStateColor(status.readyState)}`}>
                  {getReadyStateText(status.readyState)}
                </div>
              </div>
              
              {status.error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  ❌ {status.error}
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Обновлено: {new Date(status.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Кнопка обновления */}
      <div className="mt-4 text-center">
        <button
          onClick={() => {
            setStatuses(websocketMonitor.getStatuses());
            setDiagnostics(websocketMonitor.getDiagnostics());
          }}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          🔄 Обновить
        </button>
      </div>
    </div>
  );
};

export default WebSocketDiagnostics;
