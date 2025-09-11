import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useMenu } from '../context/MenuContext';
import { useClientWebSocket } from '../hooks/useClientWebSocket';
import type { MenuItem, SizeOption, AddOn } from '../types/menu';

interface OptionsPageProps {
  item: MenuItem;
  onClose: () => void;
}

export const OptionsPage: React.FC<OptionsPageProps> = ({ item, onClose }) => {
  const { t, formatCurrency } = useLanguage();
  const { addItem } = useCart();
  const { getMenuItemById } = useMenu();
  
  const [selectedSize, setSelectedSize] = useState<SizeOption | undefined>();
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(Number(item?.price) || 0);
  const [currentItem, setCurrentItem] = useState<MenuItem>(item);

  // WebSocket обработчики для real-time обновлений
  const handleAddonUpdate = useCallback((addonId: number, addonName: string, isActive: boolean, action: string) => {
    console.log('➕ OptionsPage - AddOn updated via WebSocket:', { addonId, addonName, isActive, action });
    
    // Обновляем данные товара из контекста для получения актуального списка дополнений
    const updatedItem = getMenuItemById(item.id);
    if (updatedItem) {
      console.log('🔄 OptionsPage - Обновляем данные товара после изменения дополнения');
      setCurrentItem(updatedItem);
    }
    
    // Если дополнение было удалено, деактивировано или убрано из товара, убираем его из выбранных
    if (!isActive || action === 'deleted' || action === 'removed_from_item') {
      setSelectedAddOns(prev => {
        const filtered = prev.filter(addon => addon.id !== addonId);
        if (filtered.length !== prev.length) {
          console.log('🔄 OptionsPage - Удаляем дополнение из выбранных:', addonName, 'действие:', action);
        }
        return filtered;
      });
    }
  }, [item.id, getMenuItemById]);

  const handleSizeUpdate = useCallback((sizeId: number, sizeName: string, isActive: boolean, action: string) => {
    console.log('📏 OptionsPage - Size updated via WebSocket:', { sizeId, sizeName, isActive, action });
    
    // Обновляем данные товара из контекста для получения актуального списка размеров
    const updatedItem = getMenuItemById(item.id);
    if (updatedItem) {
      console.log('🔄 OptionsPage - Обновляем данные товара после изменения размера');
      setCurrentItem(updatedItem);
    }
    
    // Если размер был удален, деактивирован или убран из товара, сбрасываем выбор
    if (!isActive || action === 'deleted' || action === 'removed_from_item') {
      if (selectedSize?.id === sizeId) {
        console.log('🔄 OptionsPage - Сбрасываем выбор размера:', sizeName, 'действие:', action);
        setSelectedSize(undefined);
      }
    }
  }, [item.id, getMenuItemById, selectedSize]);

  const handleMenuUpdate = useCallback((itemId: number, itemName: string, isActive: boolean, action: string) => {
    console.log('🍽️ OptionsPage - Menu item updated via WebSocket:', { itemId, itemName, isActive, action });
    
    // Если это наш товар, обновляем его данные
    if (itemId === item.id) {
      const updatedItem = getMenuItemById(item.id);
      if (updatedItem) {
        console.log('🔄 OptionsPage - Обновляем данные товара после изменения меню');
        setCurrentItem(updatedItem);
      }
    }
  }, [item.id, getMenuItemById]);

  // Инициализируем WebSocket для получения обновлений
  useClientWebSocket({
    onMenuUpdate: handleMenuUpdate,
    onAddonUpdate: handleAddonUpdate,
    onSizeUpdate: handleSizeUpdate,
    enabled: true
  });

  // Обновляем данные товара при изменении в контексте
  useEffect(() => {
    if (!item?.id) return;
    
    const updatedItem = getMenuItemById(item.id);
    if (updatedItem) {
      console.log('🔄 OptionsPage - Обновление данных товара:', updatedItem.name);
      setCurrentItem(updatedItem);
    }
  }, [item.id, getMenuItemById]);

  // Пересчитываем общую сумму при изменении выбора
  useEffect(() => {
    if (!currentItem) return;
    
    const basePrice = Number(currentItem.price) || 0;
    const sizeModifier = selectedSize ? Number(selectedSize.price_modifier) || 0 : 0;
    const addOnsSum = selectedAddOns.reduce((sum, addOn) => sum + (Number(addOn.price) || 0), 0);
    const total = basePrice + sizeModifier + addOnsSum;
    const roundedTotal = Math.round(total);
    
    console.log('🔄 OptionsPage - Пересчет суммы:', {
      basePrice,
      selectedSize: selectedSize?.name,
      sizeModifier,
      addOns: selectedAddOns.map(a => ({ name: a.name, price: Number(a.price) || 0 })),
      total,
      roundedTotal
    });
    
    setTotalPrice(roundedTotal);
  }, [selectedSize, selectedAddOns, currentItem]);

  // Дополнительный эффект для обновления цены при изменении currentItem
  useEffect(() => {
    if (!currentItem) return;
    
    const basePrice = Number(currentItem.price) || 0;
    const sizeModifier = selectedSize ? Number(selectedSize.price_modifier) || 0 : 0;
    const addOnsSum = selectedAddOns.reduce((sum, addOn) => sum + (Number(addOn.price) || 0), 0);
    const total = basePrice + sizeModifier + addOnsSum;
    const roundedTotal = Math.round(total);
    
    console.log('🔄 OptionsPage - Обновление цены после изменения товара:', {
      basePrice,
      total: roundedTotal
    });
    
    setTotalPrice(roundedTotal);
  }, [currentItem]);

  const handleSizeSelect = (size: SizeOption | undefined) => {
    if (size) {
      console.log('📏 OptionsPage - Выбран размер:', size.name, 'модификатор цены:', size.price_modifier);
    } else {
      console.log('📏 OptionsPage - Выбран стандартный размер (безразмерный)');
    }
    console.log('📏 OptionsPage - Устанавливаем selectedSize:', size);
    setSelectedSize(size);
  };

  const handleAddOnToggle = (addOn: AddOn) => {
    const isCurrentlySelected = selectedAddOns.find(a => a.id === addOn.id);
    console.log('➕ OptionsPage - Переключение дополнения:', addOn.name, 'цена:', addOn.price, 'было выбрано:', !!isCurrentlySelected);
    setSelectedAddOns(prev => 
      prev.find(a => a.id === addOn.id)
        ? prev.filter(a => a.id !== addOn.id)
        : [...prev, addOn]
    );
  };

  const handleConfirm = () => {
    if (!currentItem) return;
    
    addItem(currentItem, selectedSize, selectedAddOns);
    
    const optionsText = [];
    if (selectedSize) optionsText.push(`${t('size')}: ${selectedSize.name}`);
    if (selectedAddOns && selectedAddOns.length > 0) {
      optionsText.push(`${t('addition')}: ${selectedAddOns.map(a => a.name).join(', ')}`);
    }
    
    const message = optionsText.length > 0 
      ? `${currentItem.name} ${t('with_options')} ${optionsText.join(', ')} ${t('added_to_cart')}`
      : `${currentItem.name} ${t('added_to_cart')}`;
    
    console.log('✅ OptionsPage - Добавлено в корзину:', message);
    
    // Закрываем страницу
    onClose();
  };

  if (!currentItem) {
    return null;
  }

  const availableSizes = currentItem.size_options?.filter((size: SizeOption) => size.is_active) || [];
  const availableAddOns = currentItem.add_on_options?.filter((addOn: AddOn) => addOn.is_active) || [];

  // Функция для получения URL изображения
  const getImageUrl = (imagePath: string | null): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    // Используем относительный путь для прокси
    return imagePath;
  };

  return (
    <div className="min-h-screen text-gray-100">
      {/* Заголовок страницы */}
      <div className="sticky top-0 z-50 bg-dark-800/95 backdrop-blur-lg border-b border-gray-700/50">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
          >
            <span className="text-gray-300 text-lg">←</span>
          </button>
          <h1 className="text-lg font-bold text-gray-100">{t('select_options')}</h1>
          <div className="w-10"></div> {/* Для центрирования заголовка */}
        </div>
      </div>

      {/* Основной контент */}
      <div className="pt-4 space-y-6">
        {/* Информация о блюде */}
        <div className="bg-dark-800 rounded-2xl p-4 border border-gray-700/50">
          <div className="flex items-start space-x-4">
            {/* Изображение блюда */}
            <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg flex items-center justify-center border border-gray-600/50 overflow-hidden flex-shrink-0">
              {currentItem.image ? (
                <img 
                  src={getImageUrl(currentItem.image)} 
                  alt={currentItem.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('span');
                      fallback.className = 'text-2xl animate-float';
                      fallback.textContent = '🍔';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span className="text-2xl animate-float">🍔</span>
              )}
            </div>
            
            {/* Детали блюда */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-100 mb-2">{currentItem.name}</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">{currentItem.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary-400">
                  {formatCurrency(currentItem.price)}
                </span>
                {/* Теги */}
                <div className="flex space-x-2">
                  {currentItem.is_hit && (
                    <span className="px-2 py-1 text-xs rounded-full bg-white/20 text-white border border-white/30">
                      🔥 {t('hit')}
                    </span>
                  )}
                  {currentItem.is_new && (
                    <span className="px-2 py-1 text-xs rounded-full bg-white/20 text-white border border-white/30">
                      ✨ {t('new')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Размеры */}
        {availableSizes.length > 0 && (
          <div className="bg-dark-800 rounded-2xl p-4 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
              <span className="mr-2">📏</span>
              {t('select_size')}:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Стандартный размер (безразмерный) */}
              <button
                onClick={() => {
                  console.log('🖱️ OptionsPage - Клик по кнопке "Стандартный"');
                  handleSizeSelect(undefined);
                }}
                className={`
                  relative p-4 text-sm rounded-lg border-2 transition-all duration-300 font-medium text-center
                  ${!selectedSize
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white border-primary-500 shadow-dark-glow scale-105'
                    : 'glass-dark text-gray-300 border-gray-600/50 hover:bg-dark-700/50 hover:border-primary-500/50 hover:shadow-dark-card hover:scale-102'
                  }
                `}
              >
                <div className="font-semibold mb-2">Стандартный</div>
                <div className={`text-sm ${!selectedSize ? 'text-primary-100' : 'text-gray-400'}`}>
                  Без доплаты
                </div>
                {!selectedSize && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
              
              {/* Доступные размеры */}
              {availableSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => handleSizeSelect(size)}
                  className={`
                    relative p-4 text-sm rounded-lg border-2 transition-all duration-300 font-medium text-center
                    ${selectedSize?.id === size.id
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white border-primary-500 shadow-dark-glow scale-105'
                      : 'glass-dark text-gray-300 border-gray-600/50 hover:bg-dark-700/50 hover:border-primary-500/50 hover:shadow-dark-card hover:scale-102'
                    }
                  `}
                >
                  <div className="font-semibold mb-2">{size.name}</div>
                  {Number(size.price_modifier) !== 0 && (
                    <div className={`text-sm ${selectedSize?.id === size.id ? 'text-primary-100' : 'text-gray-400'}`}>
                      {Number(size.price_modifier) > 0 ? '+' : ''}{formatCurrency(Number(size.price_modifier) || 0)}
                    </div>
                  )}
                  {selectedSize?.id === size.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Дополнения */}
        {availableAddOns.length > 0 && (
          <div className="bg-dark-800 rounded-2xl p-4 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
              <span className="mr-2">➕</span>
              {t('additions_optional')}:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {availableAddOns.map((addOn) => {
                const isSelected = selectedAddOns.find(a => a.id === addOn.id);
                return (
                  <button
                    key={addOn.id}
                    onClick={() => handleAddOnToggle(addOn)}
                    className={`
                      relative p-4 text-sm rounded-lg border-2 transition-all duration-300 font-medium text-center
                      ${isSelected
                        ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white border-accent-500 shadow-dark-glow scale-105'
                        : 'glass-dark text-gray-300 border-gray-600/50 hover:bg-dark-700/50 hover:border-primary-500/50 hover:shadow-dark-card hover:scale-102'
                      }
                    `}
                  >
                    <div className="font-semibold mb-2">{addOn.name}</div>
                    <div className={`text-sm ${isSelected ? 'text-accent-100' : 'text-gray-400'}`}>
                      +{formatCurrency(Number(addOn.price) || 0)}
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Итого */}
        <div className="bg-dark-800 rounded-2xl p-4 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-300 text-lg">{t('total')}:</span>
            <span className="text-3xl font-bold text-primary-400">
              {formatCurrency(totalPrice)}
            </span>
          </div>
          
          {/* Кнопки действий */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-semibold hover:bg-gray-600 transition-all duration-300"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={false}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 shadow-dark-card disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="flex items-center justify-center">
                {t('add')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
