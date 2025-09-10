import React, { useState } from 'react';
import { testWebSocketConnection, testWebSocketWithPing, testClientWebSocketConnection } from '../../utils/websocketTest';
import { useAuth } from '../../context/AuthContext';

interface WebSocketDebuggerProps {
  className?: string;
}

export const WebSocketDebugger: React.FC<WebSocketDebuggerProps> = ({ className = '' }) => {
  const { state: authState } = useAuth();
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<{
    operator?: any;
    operatorPing?: any;
    client?: any;
  }>({});

  const runTests = async () => {
    setIsTesting(true);
    setResults({});

    try {
      // Тест операторского WebSocket
      console.log('🧪 Тестирование операторского WebSocket...');
      const operatorResult = await testWebSocketConnection();
      setResults(prev => ({ ...prev, operator: operatorResult }));

      // Тест операторского WebSocket с ping
      console.log('🧪 Тестирование операторского WebSocket с ping...');
      const operatorPingResult = await testWebSocketWithPing();
      setResults(prev => ({ ...prev, operatorPing: operatorPingResult }));

      // Тест клиентского WebSocket (если есть telegram_id)
      if (authState.user?.telegram_id) {
        console.log('🧪 Тестирование клиентского WebSocket...');
        const clientResult = await testClientWebSocketConnection(authState.user.telegram_id);
        setResults(prev => ({ ...prev, client: clientResult }));
      }
    } catch (error) {
      console.error('❌ Ошибка тестирования:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusColor = (result: any) => {
    if (!result) return 'text-gray-500';
    return result.success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (result: any) => {
    if (!result) return '⏳';
    return result.success ? '✅' : '❌';
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow-md ${className}`}>
      <h3 className="text-lg font-semibold mb-4">🔌 WebSocket Debugger</h3>
      
      <div className="space-y-4">
        <button
          onClick={runTests}
          disabled={isTesting}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isTesting ? 'Тестирование...' : 'Запустить тесты'}
        </button>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span>{getStatusIcon(results.operator)}</span>
            <span className="font-medium">Операторский WebSocket:</span>
            <span className={getStatusColor(results.operator)}>
              {results.operator?.message || 'Не тестировался'}
            </span>
          </div>
          {results.operator?.error && (
            <div className="text-sm text-red-600 ml-6">
              Ошибка: {results.operator.error}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <span>{getStatusIcon(results.operatorPing)}</span>
            <span className="font-medium">Операторский WebSocket (ping):</span>
            <span className={getStatusColor(results.operatorPing)}>
              {results.operatorPing?.message || 'Не тестировался'}
            </span>
          </div>
          {results.operatorPing?.error && (
            <div className="text-sm text-red-600 ml-6">
              Ошибка: {results.operatorPing.error}
            </div>
          )}

          {authState.user?.telegram_id && (
            <>
              <div className="flex items-center space-x-2">
                <span>{getStatusIcon(results.client)}</span>
                <span className="font-medium">Клиентский WebSocket:</span>
                <span className={getStatusColor(results.client)}>
                  {results.client?.message || 'Не тестировался'}
                </span>
              </div>
              {results.client?.error && (
                <div className="text-sm text-red-600 ml-6">
                  Ошибка: {results.client.error}
                </div>
              )}
            </>
          )}

          {!authState.user?.telegram_id && (
            <div className="text-sm text-gray-500">
              Telegram ID не найден, клиентский WebSocket не тестируется
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 mt-4">
          <p>Текущий URL: {window.location.href}</p>
          <p>Протокол: {window.location.protocol}</p>
          <p>Telegram ID: {authState.user?.telegram_id || 'Не найден'}</p>
        </div>
      </div>
    </div>
  );
};
