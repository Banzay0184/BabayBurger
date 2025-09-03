import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SearchSuggestions } from './SearchSuggestions';
import type { SearchSuggestion } from './SearchSuggestions';
import { operatorOrdersApi } from '../../api/operatorApi';

interface OrderSearchProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  searchQuery?: string;
}

export const OrderSearch: React.FC<OrderSearchProps> = ({
  onSearch,
  onClear,
  isLoading = false,
  searchQuery = ''
}) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced поиск предложений
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length >= 2) {
      setSuggestionsLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await operatorOrdersApi.getSearchSuggestions(searchQuery);
          const formattedSuggestions: SearchSuggestion[] = results.map((item: any) => ({
            id: item.id?.toString() || item.order_id?.toString() || Math.random().toString(),
            type: item.type || 'order',
            title: item.title || item.name || item.phone || `Заказ #${item.id}`,
            subtitle: item.subtitle || item.phone || item.address,
            value: item.search_value || item.title || item.name || item.phone
          }));
          setSuggestions(formattedSuggestions);
        } catch (error) {
          console.warn('Ошибка получения предложений:', error);
          setSuggestions([]);
        } finally {
          setSuggestionsLoading(false);
        }
      }, 300); // 300ms задержка
    } else {
      setSuggestions([]);
      setSuggestionsLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setShowSuggestions(false);
    }
  }, [searchQuery, onSearch]);

  const handleClear = useCallback(() => {
    onClear();
  }, [onClear]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
    setShowSuggestions(true);
  }, [onSearch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [handleSearch]);

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    onSearch(suggestion.value);
    setShowSuggestions(false);
  }, [onSearch]);

  const handleInputFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length]);

  const handleInputBlur = useCallback(() => {
    // Небольшая задержка, чтобы клик по предложению успел сработать
    setTimeout(() => setShowSuggestions(false), 150);
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-3">
        {/* Поле поиска с предложениями */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Поиск по номеру, имени или телефону..."
            className="w-full bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          
          {/* Предложения поиска */}
          <SearchSuggestions
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
            isLoading={suggestionsLoading}
            visible={showSuggestions}
          />
        </div>

        {/* Кнопка поиска */}
        <button
          onClick={handleSearch}
          disabled={!searchQuery.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span>🔍</span>
          )}
        </button>

        {/* Кнопка очистки */}
        {searchQuery && (
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
