import React, { useState, useEffect, useCallback } from 'react';
import { cashierApi } from '../../api/cashierApi';
import { useCashierWebSocket } from '../../hooks/useCashierWebSocket';

interface AddOnManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AddOn {
  id: number;
  name: string;
  price: number;
  categories: Array<{
    id: number;
    name: string;
  }>;
  is_active: boolean;
  created_at: string;
}

interface SizeOption {
  id: number;
  name: string;
  price_modifier: number;
  is_active: boolean;
  created_at: string;
}

interface AddOnsResponse {
  addons: AddOn[];
  restaurant_name: string;
}

interface SizesResponse {
  sizes: SizeOption[];
  restaurant_name: string;
}

export const AddOnManagementModal: React.FC<AddOnManagementModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'addons' | 'sizes'>('addons');
  const [addonsData, setAddonsData] = useState<AddOnsResponse | null>(null);
  const [sizesData, setSizesData] = useState<SizesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [processingItems, setProcessingItems] = useState<Set<number>>(new Set());

  // WebSocket обработчики для real-time обновлений
  const handleAddonUpdate = useCallback((addonId: number, addonName: string, isActive: boolean, action: string) => {
    console.log('➕ AddOnManagementModal - AddOn updated via WebSocket:', { addonId, addonName, isActive, action });
    
    if (addonsData) {
      const updatedAddons = addonsData.addons.map(addon => 
        addon.id === addonId ? { ...addon, is_active: isActive } : addon
      );
      setAddonsData({ ...addonsData, addons: updatedAddons });
    }
  }, [addonsData]);

  const handleSizeUpdate = useCallback((sizeId: number, sizeName: string, isActive: boolean, action: string) => {
    console.log('📏 AddOnManagementModal - Size updated via WebSocket:', { sizeId, sizeName, isActive, action });
    
    if (sizesData) {
      const updatedSizes = sizesData.sizes.map(size => 
        size.id === sizeId ? { ...size, is_active: isActive } : size
      );
      setSizesData({ ...sizesData, sizes: updatedSizes });
    }
  }, [sizesData]);

  // WebSocket подключение
  useCashierWebSocket({
    onAddonUpdated: handleAddonUpdate,
    onSizeUpdated: handleSizeUpdate,
    enabled: isOpen
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
      // Сбрасываем фильтры при закрытии
      setSearchQuery('');
      setSelectedCategory('all');
      setActiveTab('addons');
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [addonsResponse, sizesResponse] = await Promise.all([
        cashierApi.getAddons(),
        cashierApi.getSizes()
      ]);
      setAddonsData(addonsResponse);
      setSizesData(sizesResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAddonStatus = async (addon: AddOn) => {
    if (processingItems.has(addon.id)) return;

    setProcessingItems(prev => new Set(prev).add(addon.id));
    
    try {
      await cashierApi.toggleAddonStatus(addon.id);
      
      // Обновляем локальное состояние
      if (addonsData) {
        const updatedAddons = addonsData.addons.map(a => 
          a.id === addon.id ? { ...a, is_active: !a.is_active } : a
        );
        setAddonsData({ ...addonsData, addons: updatedAddons });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка изменения статуса');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(addon.id);
        return newSet;
      });
    }
  };

  const handleToggleSizeStatus = async (size: SizeOption) => {
    if (processingItems.has(size.id)) return;

    setProcessingItems(prev => new Set(prev).add(size.id));
    
    try {
      await cashierApi.toggleSizeStatus(size.id);
      
      // Обновляем локальное состояние
      if (sizesData) {
        const updatedSizes = sizesData.sizes.map(s => 
          s.id === size.id ? { ...s, is_active: !s.is_active } : s
        );
        setSizesData({ ...sizesData, sizes: updatedSizes });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка изменения статуса');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(size.id);
        return newSet;
      });
    }
  };

  const filteredAddons = addonsData?.addons.filter(addon => {
    const matchesSearch = addon.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || addon.categories.some(cat => cat.id.toString() === selectedCategory);
    return matchesSearch && matchesCategory;
  }) || [];

  const filteredSizes = sizesData?.sizes.filter(size => 
    size.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const categories = addonsData?.addons.reduce((acc, addon) => {
    addon.categories.forEach(cat => {
      if (!acc.find(existingCat => existingCat.id === cat.id)) {
        acc.push(cat);
      }
    });
    return acc;
  }, [] as Array<{ id: number; name: string }>) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Управление дополнениями и размерами
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {addonsData?.restaurant_name || sizesData?.restaurant_name}
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

        {/* Tabs */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('addons')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'addons'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Дополнения ({addonsData?.addons.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('sizes')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sizes'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Размеры ({sizesData?.sizes.length || 0})
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Поиск ${activeTab === 'addons' ? 'дополнений' : 'размеров'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-gray-900 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filter (only for addons) */}
            {activeTab === 'addons' && (
              <div className="sm:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                >
                  <option value="all">Все категории</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id.toString()}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Загрузка данных...</p>
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
                onClick={fetchData}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          ) : activeTab === 'addons' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAddons.map(addon => (
                <AddOnCard
                  key={addon.id}
                  addon={addon}
                  onToggle={handleToggleAddonStatus}
                  isProcessing={processingItems.has(addon.id)}
                />
              ))}
              
              {filteredAddons.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.571M15 6.334A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.571" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Дополнения не найдены</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSizes.map(size => (
                <SizeCard
                  key={size.id}
                  size={size}
                  onToggle={handleToggleSizeStatus}
                  isProcessing={processingItems.has(size.id)}
                />
              ))}
              
              {filteredSizes.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.571M15 6.334A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.571" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Размеры не найдены</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface AddOnCardProps {
  addon: AddOn;
  onToggle: (addon: AddOn) => void;
  isProcessing: boolean;
}

const AddOnCard: React.FC<AddOnCardProps> = ({ addon, onToggle, isProcessing }) => {
  return (
    <div className={`bg-white rounded-lg border-2 transition-all duration-200 ${
      addon.is_active 
        ? 'border-green-200 hover:border-green-300' 
        : 'border-red-200 hover:border-red-300'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
              {addon.name}
            </h4>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">
              {addon.categories.map(cat => cat.name).join(', ') || 'Без категорий'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-orange-600 font-semibold text-sm sm:text-base">
            {addon.price.toLocaleString()} UZS
          </div>
          
          <button
            onClick={() => onToggle(addon)}
            disabled={isProcessing}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              addon.is_active
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                <span>...</span>
              </div>
            ) : addon.is_active ? (
              'Деактивировать'
            ) : (
              'Активировать'
            )}
          </button>
        </div>

        {/* Status indicator */}
        <div className={`mt-2 text-xs font-medium ${
          addon.is_active ? 'text-green-600' : 'text-red-600'
        }`}>
          {addon.is_active ? '✓ Активно' : '✗ Деактивировано'}
        </div>
      </div>
    </div>
  );
};

interface SizeCardProps {
  size: SizeOption;
  onToggle: (size: SizeOption) => void;
  isProcessing: boolean;
}

const SizeCard: React.FC<SizeCardProps> = ({ size, onToggle, isProcessing }) => {
  return (
    <div className={`bg-white rounded-lg border-2 transition-all duration-200 ${
      size.is_active 
        ? 'border-green-200 hover:border-green-300' 
        : 'border-red-200 hover:border-red-300'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
              {size.name}
            </h4>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-orange-600 font-semibold text-sm sm:text-base">
            {size.price_modifier > 0 ? '+' : ''}{size.price_modifier.toLocaleString()} UZS
          </div>
          
          <button
            onClick={() => onToggle(size)}
            disabled={isProcessing}
            className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              size.is_active
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                <span>...</span>
              </div>
            ) : size.is_active ? (
              'Деактивировать'
            ) : (
              'Активировать'
            )}
          </button>
        </div>

        {/* Status indicator */}
        <div className={`mt-2 text-xs font-medium ${
          size.is_active ? 'text-green-600' : 'text-red-600'
        }`}>
          {size.is_active ? '✓ Активно' : '✗ Деактивировано'}
        </div>
      </div>
    </div>
  );
};
