import React from 'react';

interface DebugInfoProps {
  logs: string[];
  isVisible: boolean;
  onToggle: () => void;
  onClear: () => void;
  className?: string;
}

export const DebugInfo: React.FC<DebugInfoProps> = ({ 
  logs, 
  isVisible, 
  onToggle, 
  onClear, 
  className = '' 
}) => {
  if (!isVisible) {
    return (
      <div className={`text-center ${className}`}>
        <button
          onClick={onToggle}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          🔍 Показать диагностику
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-gray-100 border border-gray-300 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">🔍 Диагностика</h3>
        <div className="space-x-2">
          <button
            onClick={onClear}
            className="text-xs text-red-600 hover:text-red-800 underline"
          >
            Очистить
          </button>
          <button
            onClick={onToggle}
            className="text-xs text-gray-600 hover:text-gray-800 underline"
          >
            Скрыть
          </button>
        </div>
      </div>
      
      <div className="max-h-40 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-500">Логи отсутствуют</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="text-xs font-mono bg-white p-2 rounded border">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 