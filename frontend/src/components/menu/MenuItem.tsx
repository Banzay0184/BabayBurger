import React, { useState } from 'react';
import type { MenuItem as MenuItemType, SizeOption, AddOn } from '../../types/menu';
import { API_CONFIG } from '../../config/api';

interface MenuItemProps {
  item: MenuItemType;
  onSelect?: (item: MenuItemType, size?: SizeOption, addOns?: AddOn[]) => void;
  isCompact?: boolean; // Для отображения в карусели
}

// Модальное окно для выбора опций
const OptionsModal: React.FC<{
  item: MenuItemType;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (size?: SizeOption, addOns?: AddOn[]) => void;
  getImageUrl: (imagePath: string | null) => string | null;
}> = ({ item, isOpen, onClose, onConfirm, getImageUrl }) => {
  const [selectedSize, setSelectedSize] = useState<SizeOption | undefined>();
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);

  const handleSizeSelect = (size: SizeOption) => {
    setSelectedSize(size);
  };

  const handleAddOnToggle = (addOn: AddOn) => {
    setSelectedAddOns(prev => 
      prev.find(a => a.id === addOn.id)
        ? prev.filter(a => a.id !== addOn.id)
        : [...prev, addOn]
    );
  };

  const calculateTotalPrice = () => {
    let total = item.price;
    if (selectedSize) {
      total += selectedSize.price_modifier;
    }
    total += selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
    return total;
  };

  const availableSizes = item.size_options.filter((size: SizeOption) => size.is_active);
  const availableAddOns = item.add_on_options.filter((addOn: AddOn) => addOn.is_active);

  const handleConfirm = () => {
    onConfirm(selectedSize, selectedAddOns);
    onClose();
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={handleBackdropClick}>
      <div className="bg-dark-800 rounded-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-700">
        {/* Заголовок */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-100">{item.name}</h3>
            <button
              onClick={onClose}
              className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              <span className="text-gray-300 text-base">×</span>
            </button>
          </div>
          <p className="text-gray-400 text-sm">{item.description}</p>
          
          {/* Изображение блюда в модальном окне */}
          {item.image && (
            <div className="mt-3 flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg flex items-center justify-center border border-gray-600/50 overflow-hidden">
                <img 
                  src={getImageUrl(item.image) || ''} 
                  alt={item.name}
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
              </div>
            </div>
          )}
        </div>

        {/* Размеры */}
        {availableSizes.length > 0 && (
          <div className="p-4 border-b border-gray-700">
            <h4 className="text-sm font-semibold text-gray-100 mb-3 flex items-center">
              <span className="mr-2">📏</span>
              Выберите размер:
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => handleSizeSelect(size)}
                  className={`
                    relative p-3 text-sm rounded-lg border-2 transition-all duration-300 font-medium text-center
                    ${selectedSize?.id === size.id
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white border-primary-500 shadow-dark-glow scale-105'
                      : 'glass-dark text-gray-300 border-gray-600/50 hover:bg-dark-700/50 hover:border-primary-500/50 hover:shadow-dark-card hover:scale-102'
                    }
                  `}
                >
                  <div className="font-semibold mb-1">{size.name}</div>
                  {size.price_modifier !== 0 && (
                    <div className={`text-xs ${selectedSize?.id === size.id ? 'text-primary-100' : 'text-gray-400'}`}>
                      {size.price_modifier > 0 ? '+' : ''}{size.price_modifier} ₽
                    </div>
                  )}
                  {selectedSize?.id === size.id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 rounded-full flex items-center justify-center">
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
          <div className="p-4 border-b border-gray-700">
            <h4 className="text-sm font-semibold text-gray-100 mb-3 flex items-center">
              <span className="mr-2">➕</span>
              Дополнения (необязательно):
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {availableAddOns.map((addOn) => {
                const isSelected = selectedAddOns.find(a => a.id === addOn.id);
                return (
                  <button
                    key={addOn.id}
                    onClick={() => handleAddOnToggle(addOn)}
                    className={`
                      relative p-3 text-sm rounded-lg border-2 transition-all duration-300 font-medium text-center
                      ${isSelected
                        ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white border-accent-500 shadow-dark-glow scale-105'
                        : 'glass-dark text-gray-300 border-gray-600/50 hover:bg-dark-700/50 hover:border-accent-500/50 hover:shadow-dark-card hover:scale-102'
                      }
                    `}
                  >
                    <div className="font-semibold mb-1">{addOn.name}</div>
                    <div className={`text-xs ${isSelected ? 'text-accent-100' : 'text-gray-400'}`}>
                      +{addOn.price} ₽
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Сводка и кнопки */}
        <div className="p-4">
          {/* Сводка выбора */}
          {(selectedSize || selectedAddOns.length > 0) && (
            <div className="mb-4 p-3 glass-dark rounded-lg border border-gray-600/50">
              <h5 className="text-sm font-semibold text-gray-100 mb-3 flex items-center">
                <span className="mr-2">📋</span>
                Ваш выбор:
              </h5>
              <div className="space-y-2">
                {selectedSize && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">Размер: <span className="text-primary-300 font-medium">{selectedSize.name}</span></span>
                    <span className="text-gray-400">
                      {selectedSize.price_modifier > 0 ? '+' : ''}{selectedSize.price_modifier} ₽
                    </span>
                  </div>
                )}
                {selectedAddOns.map((addOn) => (
                  <div key={addOn.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">Дополнение: <span className="text-accent-300 font-medium">{addOn.name}</span></span>
                    <span className="text-gray-400">+{addOn.price} ₽</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-600/50">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-gray-200">Итого:</span>
                    <span className="text-primary-300 text-lg">{calculateTotalPrice()} ₽</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-lg font-semibold hover:bg-gray-600 transition-all duration-300 text-sm"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={availableSizes.length > 0 && !selectedSize}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 shadow-dark-card disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
            >
              Добавить в корзину
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MenuItem: React.FC<MenuItemProps> = ({ item, onSelect, isCompact = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Функция для получения полного URL изображения
  const getImageUrl = (imagePath: string | null): string | null => {
    if (!imagePath) return null;
    
    // Если путь уже полный URL, возвращаем как есть
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Убираем начальный слеш если есть
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    
    let fullUrl: string;
    
    if (API_CONFIG.ENV.isDevelopment) {
      // В режиме разработки используем localhost backend
      fullUrl = `http://localhost:8000/${cleanPath}`;
    } else {
      // В продакшене используем полный URL
      const baseUrl = API_CONFIG.BASE_URL.replace('/api/', '');
      fullUrl = `${baseUrl}${cleanPath}`;
    }
    
    console.log('🖼️ Генерация URL изображения:', {
      original: imagePath,
      cleanPath,
      isDev: API_CONFIG.ENV.isDevelopment,
      fullUrl,
      'API_CONFIG.BASE_URL': API_CONFIG.BASE_URL,
      'import.meta.env.DEV': import.meta.env.DEV
    });
    
    return fullUrl;
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Закрытие по Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Блокируем скролл
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset'; // Восстанавливаем скролл
    };
  }, [isModalOpen]);

  const handleConfirmOptions = (size?: SizeOption, addOns?: AddOn[]) => {
    if (onSelect) {
      onSelect(item, size, addOns);
    }
  };

  const availableSizes = item.size_options.filter((size: SizeOption) => size.is_active);
  const availableAddOns = item.add_on_options.filter((addOn: AddOn) => addOn.is_active);

  return (
    <>
      <div className={`menu-item-card animate-fade-in ${isCompact ? 'p-3 mb-0' : 'p-4 mb-4'}`}>
        <div className={`flex items-start ${isCompact ? 'space-x-3' : 'space-x-4'}`}>
          {/* Изображение блюда */}
          <div className="flex-shrink-0 relative">
            <div className={`${isCompact ? 'w-16 h-16' : 'w-20 h-20'} bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl flex items-center justify-center border border-gray-600/50 overflow-hidden shadow-dark-card`}>
              {item.image ? (
                <img 
                  src={getImageUrl(item.image) || ''} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onLoad={() => {
                    console.log('✅ Изображение загружено успешно:', item.name, getImageUrl(item.image || null));
                  }}
                  onError={(e) => {
                    console.error('❌ Ошибка загрузки изображения:', item.name, getImageUrl(item.image || null));
                    // Если изображение не загрузилось, показываем эмодзи
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('span');
                      fallback.className = `${isCompact ? 'text-2xl' : 'text-3xl'} animate-float`;
                      fallback.textContent = '🍔';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span className={`${isCompact ? 'text-2xl' : 'text-3xl'} animate-float`}>🍔</span>
              )}
            </div>
            
            {/* Бейджи */}
            <div className={`absolute ${isCompact ? '-top-1 -right-1' : '-top-1 -right-1'} flex flex-col gap-1`}>
              {item.is_hit && (
                <span className={`${isCompact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} bg-gradient-to-r from-warning-500 to-warning-600 text-white font-bold rounded-full shadow-dark-glow animate-pulse-glow`}>
                  🔥
                </span>
              )}
              {item.is_new && (
                <span className={`${isCompact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} bg-gradient-to-r from-success-500 to-success-600 text-white font-bold rounded-full shadow-dark-glow animate-pulse-glow`}>
                  ✨
                </span>
              )}
            </div>
          </div>

                      {/* Информация о блюде */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <h3 className={`${isCompact ? 'text-base' : 'text-lg'} font-bold text-gray-100 truncate pr-2`}>
                  {item.name}
                </h3>
                <div className="text-right flex-shrink-0">
                  <span className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent neon-text`}>
                    {item.price} ₽
                  </span>
                  
                </div>
              </div>
              
              <p className={`text-gray-400 ${isCompact ? 'text-xs' : 'text-sm'} mb-3 line-clamp-2`}>
                {item.description}
              </p>

            

              {/* Кнопка выбора опций */}
              <button
                onClick={handleOpenModal}
                className={`w-full ${isCompact ? 'px-4 py-2 text-xs' : 'px-6 py-2.5 text-sm'} bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 shadow-dark-card hover:shadow-dark-card-hover`}
              >
                <span className="flex items-center justify-center">
                  <span className="mr-2">⚙️</span>
                  {availableSizes.length > 0 || availableAddOns.length > 0 ? 'Выбрать опции' : 'Добавить в корзину'}
                </span>
              </button>
            </div>
          </div>
        </div>

      {/* Модальное окно для выбора опций */}
      <OptionsModal
        item={item}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmOptions}
        getImageUrl={getImageUrl}
      />
    </>
  );
}; 