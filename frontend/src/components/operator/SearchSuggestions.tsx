import React from 'react';

export interface SearchSuggestion {
  id: string;
  type: 'order' | 'customer' | 'phone';
  title: string;
  subtitle?: string;
  value: string;
}

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  onSelect: (suggestion: SearchSuggestion) => void;
  isLoading?: boolean;
  visible: boolean;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  onSelect,
  isLoading = false,
  visible
}) => {
  if (!visible || (!isLoading && suggestions.length === 0)) {
    return null;
  }

  const getIcon = (type: SearchSuggestion['type']): string => {
    switch (type) {
      case 'order': return '📋';
      case 'customer': return '👤';
      case 'phone': return '📞';
      default: return '🔍';
    }
  };

  const getTypeLabel = (type: SearchSuggestion['type']): string => {
    switch (type) {
      case 'order': return 'Заказ';
      case 'customer': return 'Клиент';
      case 'phone': return 'Телефон';
      default: return 'Результат';
    }
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
      {isLoading ? (
        <div className="p-3 text-center text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-sm">Поиск...</span>
        </div>
      ) : (
        <>
          {suggestions.length > 0 && (
            <div className="p-2 text-xs text-gray-400 border-b border-gray-700">
              Найдено {suggestions.length} {suggestions.length === 1 ? 'результат' : 'результата'}
            </div>
          )}
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id}-${index}`}
              onClick={() => onSelect(suggestion)}
              className="w-full p-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getIcon(suggestion.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium truncate">
                      {suggestion.title}
                    </span>
                    <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                      {getTypeLabel(suggestion.type)}
                    </span>
                  </div>
                  {suggestion.subtitle && (
                    <div className="text-sm text-gray-400 truncate mt-1">
                      {suggestion.subtitle}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
};
