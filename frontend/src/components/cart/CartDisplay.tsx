import React from 'react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import type { MenuItem, SizeOption, AddOn } from '../../types/menu';

interface CartDisplayProps {
  onCheckout?: () => void;
}

interface CartItemDisplay {
  key: string;
  menuItem: MenuItem;
  quantity: number;
  sizeOption?: SizeOption;
  addOns: AddOn[];
  totalPrice: number;
  pricePerItem: number;
}

export const CartDisplay: React.FC<CartDisplayProps> = ({ onCheckout }) => {
  const { state, incrementByKey, decrementByKey, removeByKey, clear } = useCart();
  const { t, formatCurrency } = useLanguage();

  const handleIncrement = (key: string) => {
    incrementByKey(key);
  };

  const handleDecrement = (key: string) => {
    decrementByKey(key);
  };

  const handleRemove = (key: string) => {
    removeByKey(key);
  };

  const handleClear = () => {
    if (confirm('🗑️ Очистить корзину?')) {
      clear();
    }
  };

  // Преобразуем внутренние элементы корзины в отображаемые
  const displayItems: CartItemDisplay[] = state.items.map(item => {
    // Отладочная информация
    console.log('🛒 Cart item data:', {
      name: item.menuItem.name,
      image: item.menuItem.image,
      hasSizeOption: !!item.sizeOption,
      sizeOption: item.sizeOption,
      addOnsCount: item.addOns.length,
      addOns: item.addOns
    });
    
    return {
      key: item.key,
      menuItem: item.menuItem,
      quantity: item.quantity,
      sizeOption: item.sizeOption,
      addOns: item.addOns,
      totalPrice: Math.round(item.totalPrice),
      pricePerItem: Math.round(item.totalPrice / item.quantity)
    };
  });

  if (state.items.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 px-4 animate-fade-in">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-gray-600/50">
          <span className="text-2xl sm:text-3xl">🛒</span>
        </div>
        <p className="text-gray-300 text-base sm:text-lg font-medium mb-2">
          {t('cart_empty')}
        </p>
        <p className="text-gray-500 text-sm">
          {t('add_dishes_from_menu')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in px-2 sm:px-0">
      {/* Заголовок корзины */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-100">
          🛒 {t('cart')}
        </h2>
        <button
          onClick={handleClear}
          className="px-3 py-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium"
        >
          {t('clear_cart')}
        </button>
      </div>

      {/* Список товаров */}
      <div className="space-y-3 sm:space-y-4">
        {displayItems.map((item) => (
          <div
            key={item.key}
            className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700 shadow-lg"
          >
            {/* Основная информация о товаре */}
            <div className="flex items-start justify-between mb-3">
              {/* Изображение и информация о блюде */}
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                {/* Изображение блюда */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                                  <img
                  src={item.menuItem.image ? item.menuItem.image : '/placeholder-food.jpg'}
                  alt={item.menuItem.name}
                  className="w-full h-full object-cover rounded-lg border border-gray-600"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-food.jpg';
                    console.log('🖼️ Image failed to load:', item.menuItem.image);
                  }}
                />
                </div>
                
                {/* Информация о блюде */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-100 text-sm sm:text-base mb-2 leading-tight line-clamp-2">
                    {item.menuItem.name}
                  </h3>
                  
                  {/* Опции товара - всегда показываем если есть */}
                  <div className="text-xs sm:text-sm text-gray-400 space-y-1 mb-2">
                    {/* Размер блюда */}
                    {item.sizeOption && (
                      <div className="bg-gray-700/50 px-2 py-1 rounded">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center min-w-0 flex-1">
                            <span className="mr-2 text-primary-400 flex-shrink-0">📏</span>
                            <span className="text-gray-300 truncate">Р: {item.sizeOption.name}</span>
                          </div>
                          {Number(item.sizeOption.price_modifier) !== 0 && (
                            <span className="ml-2 text-primary-400 font-medium flex-shrink-0">
                              ({Number(item.sizeOption.price_modifier) > 0 ? '+' : ''}{formatCurrency(Number(item.sizeOption.price_modifier) || 0)})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Дополнения */}
                    {item.addOns.length > 0 && (
                      <div className="bg-gray-700/50 px-2 py-1 rounded">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center min-w-0 flex-1">
                            <span className="mr-2 text-accent-400 flex-shrink-0">➕</span>
                            <div className="text-gray-300 min-w-0">
                              <span className="block truncate">Доп: {item.addOns.map(a => a.name).join(', ')}</span>
                            </div>
                          </div>
                          <span className="ml-2 text-accent-400 font-medium flex-shrink-0">
                            (+{formatCurrency(item.addOns.reduce((sum, a) => sum + (Number(a.price) || 0), 0))})
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Показываем сообщение если нет опций */}
                    {!item.sizeOption && item.addOns.length === 0 && (
                      <div className="text-gray-500 text-xs italic">
                        Без доп. опций
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Цена за единицу */}
              <div className="text-right ml-2 sm:ml-4 flex-shrink-0">
                <div className="text-xs sm:text-sm text-gray-400 mb-1">
                  {t('price_per_item')}
                </div>
                <div className="text-sm sm:text-lg font-bold text-primary-400">
                  {formatCurrency(item.pricePerItem)}
                </div>
              </div>
            </div>

            {/* Управление количеством и общая цена */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Кнопки +/- */}
                <button
                  onClick={() => handleDecrement(item.key)}
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full flex items-center justify-center transition-colors hover:scale-105"
                >
                  <span className="text-sm sm:text-lg">−</span>
                </button>
                
                <span className="text-lg sm:text-xl font-bold text-gray-100 min-w-[1.5rem] sm:min-w-[2rem] text-center">
                  {item.quantity}
                </span>
                
                <button
                  onClick={() => handleIncrement(item.key)}
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center transition-colors hover:scale-105"
                >
                  <span className="text-sm sm:text-lg">+</span>
                </button>
              </div>

              {/* Общая цена и кнопка удаления */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="text-right">
                  <div className="text-xs sm:text-sm text-gray-400 mb-1">
                    {t('total')}
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-primary-400">
                    {formatCurrency(item.totalPrice)}
                  </div>
                </div>
                
                <button
                  onClick={() => handleRemove(item.key)}
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors hover:scale-105"
                >
                  <span className="text-sm sm:text-lg">×</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Итого по корзине */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-100">
            {t('cart_total')}
          </h3>
          <div className="text-xl sm:text-2xl font-bold text-primary-400">
            {formatCurrency(state.finalTotal)}
          </div>
        </div>
        
        <div className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
          {t('total_items')}: {state.items.reduce((sum, item) => sum + item.quantity, 0)}
        </div>
        
        <button 
          onClick={onCheckout}
          className="w-full px-4 py-3 sm:px-6 sm:py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 shadow-lg"
        >
          <span className="flex items-center justify-center">
            <span className="mr-2">💳</span>
            {t('checkout')}
          </span>
        </button>
      </div>

      {/* Модальное окно для добавления еще */}
      {/* The AddMoreModal component was removed from imports, so this block is now effectively removed. */}
    </div>
  );
};
