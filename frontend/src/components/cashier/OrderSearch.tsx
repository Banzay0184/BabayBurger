import React, { useState, useEffect, useCallback } from 'react';
import { cashierApi, type Order } from '../../api/cashierApi';

interface OrderSearchProps {
  onSearchResults: (orders: Order[]) => void;
  onClearSearch: () => void;
  onSearchingChange?: (searching: boolean) => void;
}

export const OrderSearch: React.FC<OrderSearchProps> = ({
  onSearchResults,
  onClearSearch,
  onSearchingChange
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [searchCount, setSearchCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchCount(0);
      setShowResults(false);
      onClearSearch();
      return;
    }

    try {
      onSearchingChange?.(true);
      setError(null);
      
      const response = await cashierApi.searchOrders(searchQuery);
      setSearchResults(response.orders);
      setSearchCount(response.count);
      setShowResults(true);
      onSearchResults(response.orders);
    } catch (err) {
      console.error('Ошибка поиска:', err);
      setError('Ошибка при поиске заказов');
      setSearchResults([]);
      setSearchCount(0);
      setShowResults(false);
    } finally {
      onSearchingChange?.(false);
    }
  }, [onSearchingChange, onSearchResults, onClearSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setSearchCount(0);
    setShowResults(false);
    setError(null);
    onClearSearch();
  }, [onClearSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Очищаем ошибки при вводе
    if (error) {
      setError(null);
    }
  };

  // Поиск в реальном времени с задержкой
  useEffect(() => {
    if (query.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch(query);
      }, 300); // Задержка 300мс
      
      return () => clearTimeout(timeoutId);
    } else {
      // Если поле пустое, очищаем результаты
      handleClear();
    }
  }, [query, handleSearch, handleClear]);

  const formatPhone = (phone: string) => {
    // Форматируем телефон для отображения
    if (phone.startsWith('+998')) {
      return `+998 ${phone.slice(4, 7)} ${phone.slice(7, 9)} ${phone.slice(9, 11)} ${phone.slice(11)}`;
    }
    return phone;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing':
        return 'text-orange-600 bg-orange-100';
      case 'ready_for_delivery':
        return 'text-green-600 bg-green-100';
      case 'delivering':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-gray-600 bg-gray-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'preparing':
        return 'Готовится';
      case 'ready_for_delivery':
        return 'Готов';
      case 'delivering':
        return 'Доставляется';
      case 'completed':
        return 'Завершен';
      case 'cancelled':
        return 'Отменен';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-3 mb-3 sm:mb-4">
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <svg className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Поиск по телефону, номеру заказа..."
            className="w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 border border-gray-300 text-gray-900 rounded-md sm:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md sm:rounded-lg">
          <p className="text-red-600 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {showResults && (
        <div className="mt-2 sm:mt-3">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                Результаты поиска
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {query.match(/^\d+$/) 
                  ? `Поиск по номеру заказа #${query}`
                  : `Поиск по "${query}"`
                }
              </p>
            </div>
            <span className="text-xs sm:text-sm text-gray-500">
              Найдено: {searchCount} заказ{searchCount === 1 ? '' : searchCount < 5 ? 'а' : 'ов'}
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-4 sm:py-6 text-gray-500">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm sm:text-base">Заказы не найдены</p>
              <p className="text-xs sm:text-sm">
                {query.match(/^\d+$/) 
                  ? `Заказ #${query} не найден в вашем ресторане`
                  : `По запросу "${query}" ничего не найдено`
                }
              </p>
              <p className="text-xs text-gray-400 mt-1 sm:mt-2">
                Попробуйте поиск по номеру заказа, телефону или номеру очереди
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
              {searchResults.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-md sm:rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                        <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          <span>#{order.id}</span>
                        </div>
                        {order.operator_order_number && (
                          <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Очередь: {order.operator_order_number}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{formatPhone(order.phone)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                        <span className="text-xs sm:text-sm text-gray-600">
                          {order.user_info?.first_name || 'Неизвестный'} {order.user_info?.last_name || ''}
                        </span>
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      
                      <div className="text-xs sm:text-sm text-gray-600 space-y-0.5">
                        <p>Сумма: {order.final_price.toLocaleString()} сум</p>
                        <p>Время: {new Date(order.created_at).toLocaleString('ru-RU')}</p>
                        {order.address_info && (
                          <p className="truncate">Адрес: {order.address_info.full_address}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
