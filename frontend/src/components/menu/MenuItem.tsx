import React, { useState } from 'react';
import type { MenuItem as MenuItemType, SizeOption, AddOn } from '../../types/menu';

interface MenuItemProps {
  item: MenuItemType;
  onSelect?: (item: MenuItemType, size?: SizeOption, addOns?: AddOn[]) => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({ item, onSelect }) => {
  const [selectedSize, setSelectedSize] = useState<SizeOption | undefined>();
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);

  const handleClick = () => {
    if (onSelect) {
      onSelect(item, selectedSize, selectedAddOns);
    }
  };

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

  return (
    <div className="menu-item-card p-6 mb-6 animate-fade-in">
      <div className="flex items-start space-x-6">
        {/* Изображение блюда с современным дизайном */}
        <div className="flex-shrink-0 relative">
          <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center border border-white/50 overflow-hidden shadow-card">
            {item.image ? (
              <img 
                src={item.image} 
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-5xl animate-float">🍔</span>
            )}
          </div>
          
          {/* Современные бейджи */}
          <div className="absolute -top-2 -right-2 flex flex-col gap-2">
            {item.is_hit && (
              <span className="px-3 py-1 bg-gradient-to-r from-warning-500 to-warning-600 text-white text-xs font-bold rounded-full shadow-lg animate-pulse-glow">
                🔥 ХИТ
              </span>
            )}
            {item.is_new && (
              <span className="px-3 py-1 bg-gradient-to-r from-success-500 to-success-600 text-white text-xs font-bold rounded-full shadow-lg animate-pulse-glow">
                ✨ НОВИНКА
              </span>
            )}
          </div>
        </div>

        {/* Информация о блюде */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900 truncate">
              {item.name}
            </h3>
            <div className="flex flex-col items-end">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                {calculateTotalPrice()} ₽
              </span>
              {selectedSize && (
                <span className="text-sm text-gray-600">
                  +{selectedSize.price_modifier} ₽
                </span>
              )}
            </div>
          </div>
          
          <p className="text-gray-600 text-base mb-6 line-clamp-2">
            {item.description}
          </p>

          {/* Размеры с современным дизайном */}
          {availableSizes.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">📏</span>
                Размеры:
              </h4>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => handleSizeSelect(size)}
                    className={`
                      px-4 py-2 text-sm rounded-xl border-2 transition-all duration-300 font-medium
                      ${selectedSize?.id === size.id
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white border-primary-500 shadow-glow'
                        : 'bg-white/80 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-white hover:border-primary-300 hover:shadow-button'
                      }
                    `}
                  >
                    {size.name}
                    {size.price_modifier !== 0 && (
                      <span className="ml-1">
                        {size.price_modifier > 0 ? '+' : ''}{size.price_modifier} ₽
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Дополнения с современным дизайном */}
          {availableAddOns.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">➕</span>
                Дополнения:
              </h4>
              <div className="flex flex-wrap gap-2">
                {availableAddOns.map((addOn) => (
                  <button
                    key={addOn.id}
                    onClick={() => handleAddOnToggle(addOn)}
                    className={`
                      px-4 py-2 text-sm rounded-xl border-2 transition-all duration-300 font-medium
                      ${selectedAddOns.find(a => a.id === addOn.id)
                        ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white border-accent-500 shadow-glow'
                        : 'bg-white/80 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-white hover:border-accent-300 hover:shadow-button'
                      }
                    `}
                  >
                    {addOn.name} +{addOn.price} ₽
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка добавления с современным дизайном */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {availableSizes.length > 0 && !selectedSize && (
                <span className="text-xs text-gray-500 flex items-center">
                  <span className="mr-1">⚠️</span>
                  Выберите размер
                </span>
              )}
            </div>
            
            <button
              onClick={handleClick}
              disabled={availableSizes.length > 0 && !selectedSize}
              className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 shadow-button hover:shadow-button-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="flex items-center">
                <span className="mr-2">🛒</span>
                Добавить
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 