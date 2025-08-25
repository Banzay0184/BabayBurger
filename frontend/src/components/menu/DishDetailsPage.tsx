import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import type { MenuItem, SizeOption, AddOn } from '../../types/menu';

interface DishDetailsPageProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (item: MenuItem, size?: SizeOption, addOns?: AddOn[]) => void;
}

export const DishDetailsPage: React.FC<DishDetailsPageProps> = ({
  item,
  onClose,
  onAddToCart
}) => {
  const { t, formatCurrency } = useLanguage();
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Доступные размеры и дополнения
  const availableSizes = item.size_options?.filter(size => size.is_active) || [];
  const availableAddOns = item.add_on_options?.filter(addOn => addOn.is_active) || [];

  // Автоматически выбираем первый размер, если он есть
  useEffect(() => {
    if (availableSizes.length > 0 && !selectedSize) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes, selectedSize]);

  const handleSizeSelect = (size: SizeOption) => {
    setSelectedSize(size);
  };

  const handleAddOnToggle = (addOn: AddOn) => {
    setSelectedAddOns(prev => {
      const isSelected = prev.find(a => a.id === addOn.id);
      if (isSelected) {
        return prev.filter(a => a.id !== addOn.id);
      } else {
        return [...prev, addOn];
      }
    });
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = Math.max(1, quantity + change);
    setQuantity(newQuantity);
  };

  const calculateTotalPrice = () => {
    let total = Number(item.price) || 0;
    
    // Добавляем стоимость размера
    if (selectedSize) {
      total += Number(selectedSize.price_modifier) || 0;
    }
    
    // Добавляем стоимость дополнений
    selectedAddOns.forEach(addOn => {
      total += Number(addOn.price) || 0;
    });
    
    return total * quantity;
  };

  const handleAddToCart = () => {
    onAddToCart(item, selectedSize || undefined, selectedAddOns);
    onClose();
  };

  const totalPrice = calculateTotalPrice();

  return (
    <div className="fixed inset-0 bg-dark-900 z-60 overflow-y-auto">
      {/* Заголовок - фиксированный */}
      <div className="sticky top-0 bg-dark-800 border-b border-gray-700 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
          >
            <span className="text-gray-300 text-xl">←</span>
          </button>
          <h1 className="text-lg font-bold text-gray-100 flex-1 text-center mr-10">
            {item.name}
          </h1>
        </div>
      </div>

      {/* Основной контент */}
      <div className="p-4 space-y-6">
        {/* Изображение блюда */}
        <div className="relative">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-48 object-cover rounded-2xl"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div 
            className="hidden w-full h-48 bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl items-center justify-center"
            style={{ display: 'none' }}
          >
            <span className="text-6xl">🍽️</span>
          </div>
        </div>

        {/* Название и описание */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-100">{item.name}</h2>
          {item.description && (
            <p className="text-gray-300 text-base leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Размеры */}
        {availableSizes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center">
              <span className="mr-2">📏</span>
              {t('select_size')}:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {availableSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => handleSizeSelect(size)}
                  className={`
                    relative p-4 text-center rounded-xl border-2 transition-all duration-300 font-medium
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
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center">
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
                      relative p-4 text-center rounded-xl border-2 transition-all duration-300 font-medium
                      ${isSelected
                        ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white border-accent-500 shadow-dark-glow scale-105'
                        : 'glass-dark text-gray-300 border-gray-600/50 hover:bg-dark-700/50 hover:border-accent-500/50 hover:shadow-dark-card hover:scale-102'
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

        {/* Количество */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center">
            <span className="mr-2">🔢</span>
            {t('quantity')}:
          </h3>
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => handleQuantityChange(-1)}
              className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors text-gray-300 text-xl"
            >
              -
            </button>
            <span className="text-2xl font-bold text-gray-100 min-w-[3rem] text-center">
              {quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(1)}
              className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors text-gray-300 text-xl"
            >
              +
            </button>
          </div>
        </div>

        {/* Итоговая цена */}
        <div className="bg-dark-800 rounded-2xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-semibold text-gray-100">
              {t('total_price')}:
            </span>
            <span className="text-2xl font-bold text-primary-400">
              {formatCurrency(totalPrice)}
            </span>
          </div>
          <div className="text-sm text-gray-400">
            {quantity} × {formatCurrency(calculateTotalPrice() / quantity)} = {formatCurrency(totalPrice)}
          </div>
        </div>

        {/* Кнопка добавления в корзину */}
        <Button
          onClick={handleAddToCart}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 text-lg font-semibold rounded-2xl shadow-dark-glow hover:scale-105 transition-all duration-300"
        >
          🛒 {t('add_to_cart')} - {formatCurrency(totalPrice)}
        </Button>
      </div>
    </div>
  );
};
