import React, { useState, useEffect } from 'react';
import { cashierApi, type StopListMenuResponse, type MenuItem } from '../../api/cashierApi';

interface StopListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StopListModal: React.FC<StopListModalProps> = ({ isOpen, onClose }) => {
  const [menuData, setMenuData] = useState<StopListMenuResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [processingItems, setProcessingItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchMenuData();
    } else {
      // Сбрасываем фильтры при закрытии
      setSearchQuery('');
      setSelectedCategory('all');
      setActiveTab('all');
    }
  }, [isOpen]);

  const fetchMenuData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cashierApi.getStopListMenu();
      setMenuData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки меню');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: MenuItem) => {
    if (processingItems.has(item.id)) return;

    setProcessingItems(prev => new Set(prev).add(item.id));
    
    try {
      await cashierApi.toggleMenuItemStatus(item.id);
      
      // Обновляем локальное состояние
      if (menuData) {
        const updatedCategories = menuData.categories.map(category => ({
          ...category,
          items: category.items.map(menuItem => 
            menuItem.id === item.id 
              ? { ...menuItem, is_active: !menuItem.is_active }
              : menuItem
          )
        }));
        setMenuData({ ...menuData, categories: updatedCategories });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка изменения статуса');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const filteredCategories = menuData?.categories
    .filter(category => selectedCategory === 'all' || category.id.toString() === selectedCategory)
    .map(category => ({
      ...category,
      items: category.items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(category => category.items.length > 0) || [];

  const inactiveItems = menuData?.categories
    .filter(category => selectedCategory === 'all' || category.id.toString() === selectedCategory)
    .flatMap(category => 
      category.items.filter(item => !item.is_active)
    ).filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Стоп лист
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {menuData?.restaurant_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search, Category Filter and Tabs */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            {/* Search and Category Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Поиск блюд..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Category Filter */}
              <div className="sm:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                >
                  <option value="all">Все категории</option>
                  {menuData?.categories.map(category => (
                    <option key={category.id} value={category.id.toString()}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Все блюда
              </button>
              <button
                onClick={() => setActiveTab('inactive')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'inactive'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Деактивированные ({inactiveItems.length})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Загрузка меню...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchMenuData}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          ) : activeTab === 'all' ? (
            <div className="space-y-6">
              {filteredCategories.map(category => (
                <div key={category.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                      {category.items.length}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map(item => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        onToggle={handleToggleStatus}
                        isProcessing={processingItems.has(item.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              {filteredCategories.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.571M15 6.334A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.571" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Блюда не найдены</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {inactiveItems.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onToggle={handleToggleStatus}
                  isProcessing={processingItems.has(item.id)}
                />
              ))}
              
              {inactiveItems.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Нет деактивированных блюд</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MenuItemCardProps {
  item: MenuItem;
  onToggle: (item: MenuItem) => void;
  isProcessing: boolean;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onToggle, isProcessing }) => {
  return (
    <div className={`bg-white rounded-lg border-2 transition-all duration-200 ${
      item.is_active 
        ? 'border-green-200 hover:border-green-300' 
        : 'border-red-200 hover:border-red-300'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
              {item.name}
            </h4>
            <p className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-2">
              {item.description}
            </p>
          </div>
          
          {/* Badges */}
          <div className="flex flex-col items-end space-y-1 ml-2">
            {item.is_hit && (
              <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded-full">
                Хит
              </span>
            )}
            {item.is_new && (
              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                Новинка
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-orange-600 font-semibold text-sm sm:text-base">
            {item.price.toLocaleString()} UZS
          </div>
          
          <button
            onClick={() => onToggle(item)}
            disabled={isProcessing}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              item.is_active
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                <span>...</span>
              </div>
            ) : item.is_active ? (
              'Деактивировать'
            ) : (
              'Активировать'
            )}
          </button>
        </div>

        {/* Status indicator */}
        <div className={`mt-2 text-xs font-medium ${
          item.is_active ? 'text-green-600' : 'text-red-600'
        }`}>
          {item.is_active ? '✓ Активно' : '✗ Деактивировано'}
        </div>
      </div>
    </div>
  );
};
