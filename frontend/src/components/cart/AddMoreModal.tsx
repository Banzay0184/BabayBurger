import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import type { MenuItem, SizeOption, AddOn } from '../../types/menu';

interface CartItemDisplay {
  key: string;
  menuItem: MenuItem;
  quantity: number;
  sizeOption?: SizeOption;
  addOns: AddOn[];
  totalPrice: number;
  pricePerItem: number;
}

interface AddMoreModalProps {
  item: CartItemDisplay;
  isOpen: boolean;
  onClose: () => void;
}

export const AddMoreModal: React.FC<AddMoreModalProps> = ({ 
  item, 
  isOpen, 
  onClose 
}) => {
  const { addItem } = useCart();
  const { t, formatCurrency } = useLanguage();
  const [selectedSize, setSelectedSize] = useState<SizeOption | undefined>();
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(Number(item.menuItem.price) || 0);

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

  // Пересчитываем общую сумму при изменении выбора
  useEffect(() => {
    const basePrice = Number(item.menuItem.price) || 0;
    const sizeModifier = selectedSize ? Number(selectedSize.price_modifier) || 0 : 0;
    const addOnsSum = selectedAddOns.reduce((sum, addOn) => sum + (Number(addOn.price) || 0), 0);
    const total = basePrice + sizeModifier + addOnsSum;
    const roundedTotal = Math.round(total);
    console.log('🔄 AddMoreModal - Пересчет суммы:', {
      basePrice,
      selectedSize: selectedSize?.name,
      sizeModifier,
      addOns: selectedAddOns.map(a => ({ name: a.name, price: Number(a.price) || 0 })),
      total,
      roundedTotal
    });
    setTotalPrice(roundedTotal);
  }, [selectedSize, selectedAddOns, item.menuItem.price]);

  const calculateTotalPrice = () => {
    console.log('💰 AddMoreModal - calculateTotalPrice вызвана, totalPrice:', totalPrice);
    return totalPrice;
  };

  const availableSizes = item.menuItem.size_options?.filter((size: SizeOption) => size.is_active) || [];
  const availableAddOns = item.menuItem.add_on_options?.filter((addOn: AddOn) => addOn.is_active) || [];

  const handleConfirm = () => {
    addItem(item.menuItem, selectedSize, selectedAddOns);
    onClose();
    // Сбрасываем выбор
    setSelectedSize(undefined);
    setSelectedAddOns([]);
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
            <h3 className="text-lg font-bold text-gray-100">
              {t('add_more')}: {item.menuItem.name}
            </h3>
            <button
              onClick={onClose}
              className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              <span className="text-gray-300 text-base">×</span>
            </button>
          </div>
          <p className="text-gray-400 text-sm">{item.menuItem.description}</p>
        </div>

        {/* Размеры */}
        {availableSizes.length > 0 && (
          <div className="p-4 border-b border-gray-700">
            <h4 className="text-sm font-semibold text-gray-100 mb-3 flex items-center">
              <span className="mr-2">📏</span>
              {t('select_size')}:
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
                  {Number(size.price_modifier) !== 0 && (
                    <div className={`text-xs ${selectedSize?.id === size.id ? 'text-primary-100' : 'text-gray-400'}`}>
                      {Number(size.price_modifier) > 0 ? '+' : ''}{formatCurrency(Number(size.price_modifier) || 0)}
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
              {t('additions_optional')}:
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
                      +{formatCurrency(Number(addOn.price) || 0)}
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

        {/* Итого и кнопка */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-300 text-sm">{t('total')}:</span>
            <span className="text-xl font-bold text-primary-400">
              {formatCurrency(calculateTotalPrice())}
            </span>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-lg font-semibold hover:bg-gray-600 transition-all duration-300 text-sm"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 shadow-dark-card text-sm"
            >
              <span className="flex items-center justify-center">
                <span className="mr-2">🛒</span>
                {t('add_to_cart')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
