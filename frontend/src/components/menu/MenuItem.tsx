import React, { useState } from 'react';
import type { MenuItem as MenuItemType, SizeOption, AddOn } from '../types/menu';

interface MenuItemProps {
  item: MenuItemType;
  onSelect?: (item: MenuItemType, size?: SizeOption, addOns?: AddOn[]) => void;
  showDetails?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({ item, onSelect, showDetails = false }) => {
  const [selectedSize, setSelectedSize] = useState<SizeOption | undefined>();
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [showOptions, setShowOptions] = useState(false);

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

  const availableSizes = item.size_options.filter(size => size.is_active);
  const availableAddOns = item.add_on_options.filter(addOn => addOn.is_active);

  return (
    <div className="bg-bg-card border border-border-gray rounded-2xl p-6 transition-all duration-300 hover:shadow-card hover:border-primary group">
      <div className="flex items-start space-x-6">
        {/* Изображение блюда */}
        <div className="flex-shrink-0 relative">
          <div className="w-28 h-28 bg-light-gray rounded-xl flex items-center justify-center border border-border-gray overflow-hidden">
            {item.image ? (
              <img 
                src={item.image} 
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-text-light text-4xl">🍔</span>
            )}
          </div>
          
          {/* Бейджи для хит и новинка */}
          <div className="absolute -top-2 -right-2 flex flex-col gap-1">
            {item.is_hit && (
              <span className="px-2 py-1 bg-warning text-black text-xs font-bold rounded-full shadow-lg">
                🔥 ХИТ
              </span>
            )}
            {item.is_new && (
              <span className="px-2 py-1 bg-success text-black text-xs font-bold rounded-full shadow-lg">
                ✨ НОВИНКА
              </span>
            )}
          </div>
        </div>

        {/* Информация о блюде */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-xl font-bold text-text-primary truncate">
              {item.name}
            </h3>
            <div className="flex flex-col items-end">
              <span className="text-xl font-bold text-primary">
                {calculateTotalPrice()} ₽
              </span>
              {selectedSize && (
                <span className="text-sm text-text-secondary">
                  +{selectedSize.price_modifier} ₽
                </span>
              )}
            </div>
          </div>
          
          <p className="text-text-secondary text-base mb-4 line-clamp-2">
            {item.description}
          </p>

          {/* Размеры */}
          {availableSizes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Размеры:</h4>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => handleSizeSelect(size)}
                    className={`
                      px-3 py-1 text-sm rounded-lg border transition-all duration-200
                      ${selectedSize?.id === size.id
                        ? 'bg-primary text-secondary border-primary'
                        : 'bg-bg-card text-text-secondary border-border-gray hover:bg-light-gray hover:text-text-primary'
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

          {/* Дополнения */}
          {availableAddOns.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Дополнения:</h4>
              <div className="flex flex-wrap gap-2">
                {availableAddOns.map((addOn) => (
                  <button
                    key={addOn.id}
                    onClick={() => handleAddOnToggle(addOn)}
                    className={`
                      px-3 py-1 text-sm rounded-lg border transition-all duration-200
                      ${selectedAddOns.find(a => a.id === addOn.id)
                        ? 'bg-primary text-secondary border-primary'
                        : 'bg-bg-card text-text-secondary border-border-gray hover:bg-light-gray hover:text-text-primary'
                      }
                    `}
                  >
                    {addOn.name} +{addOn.price} ₽
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка добавления */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {availableSizes.length > 0 && (
                <span className="text-xs text-text-light">
                  Выберите размер
                </span>
              )}
            </div>
            
            <button
              onClick={handleClick}
              className="px-6 py-2 bg-primary text-secondary rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-105 shadow-button"
            >
              Добавить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 