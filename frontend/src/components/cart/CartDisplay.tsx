import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { AddMoreModal } from './AddMoreModal';
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

export const CartDisplay: React.FC = () => {
  const { state, incrementByKey, decrementByKey, removeByKey, clear } = useCart();
  const { t, formatCurrency } = useLanguage();
  const [addMoreItem, setAddMoreItem] = useState<CartItemDisplay | null>(null);

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
    clear();
  };

  const handleAddMore = (item: CartItemDisplay) => {
    setAddMoreItem(item);
  };

  const handleCloseAddMore = () => {
    setAddMoreItem(null);
  };

  // Преобразуем внутренние элементы корзины в отображаемые
  const displayItems: CartItemDisplay[] = state.items.map(item => ({
    key: item.key,
    menuItem: item.menuItem,
    quantity: item.quantity,
    sizeOption: item.sizeOption,
    addOns: item.addOns,
    totalPrice: Math.round(item.totalPrice),
    pricePerItem: Math.round(item.totalPrice / item.quantity)
  }));

  if (state.items.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600/50">
          <span className="text-3xl">🛒</span>
        </div>
        <p className="text-gray-300 text-lg font-medium mb-2">
          {t('cart_empty')}
        </p>
        <p className="text-gray-500 text-sm">
          {t('add_dishes_from_menu')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Заголовок корзины */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100 neon-text">
          🛒 {t('cart')}
        </h2>
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          {t('clear_cart')}
        </button>
      </div>

      {/* Список товаров */}
      <div className="space-y-4">
        {displayItems.map((item) => (
          <div
            key={item.key}
            className="bg-dark-800 rounded-lg p-4 border border-gray-700 shadow-dark-card"
          >
            {/* Основная информация о товаре */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-100 text-lg mb-1">
                  {item.menuItem.name}
                </h3>
                
                {/* Опции товара */}
                {(item.sizeOption || item.addOns.length > 0) && (
                  <div className="text-sm text-gray-400 space-y-1">
                    {item.sizeOption && (
                      <div className="flex items-center">
                        <span className="mr-2">📏</span>
                        <span>{t('size')}: {item.sizeOption.name}</span>
                        {Number(item.sizeOption.price_modifier) !== 0 && (
                          <span className="ml-2 text-primary-400">
                            ({Number(item.sizeOption.price_modifier) > 0 ? '+' : ''}{formatCurrency(Number(item.sizeOption.price_modifier) || 0)})
                          </span>
                        )}
                      </div>
                    )}
                    
                    {item.addOns.length > 0 && (
                      <div className="flex items-center">
                        <span className="mr-2">➕</span>
                        <span>{t('addition')}: {item.addOns.map(a => a.name).join(', ')}</span>
                        <span className="ml-2 text-accent-400">
                          (+{formatCurrency(item.addOns.reduce((sum, a) => sum + (Number(a.price) || 0), 0))})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Цена за единицу */}
              <div className="text-right ml-4">
                <div className="text-sm text-gray-400 mb-1">
                  {t('price_per_item')}
                </div>
                <div className="text-lg font-bold text-primary-400">
                  {formatCurrency(item.pricePerItem)}
                </div>
              </div>
            </div>

            {/* Управление количеством и общая цена */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Кнопки +/- */}
                <button
                  onClick={() => handleDecrement(item.key)}
                  className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full flex items-center justify-center transition-colors hover:scale-105"
                >
                  <span className="text-lg">−</span>
                </button>
                
                <span className="text-xl font-bold text-gray-100 min-w-[2rem] text-center">
                  {item.quantity}
                </span>
                
                <button
                  onClick={() => handleIncrement(item.key)}
                  className="w-8 h-8 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center transition-colors hover:scale-105"
                >
                  <span className="text-lg">+</span>
                </button>
              </div>

              {/* Общая цена и кнопка удаления */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">
                    {t('total')}
                  </div>
                  <div className="text-xl font-bold text-primary-400">
                    {formatCurrency(item.totalPrice)}
                  </div>
                </div>
                
                <button
                  onClick={() => handleRemove(item.key)}
                  className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors hover:scale-105"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
            </div>

            {/* Кнопка "Добавить еще с другими опциями" */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <button
                onClick={() => handleAddMore(item)}
                className="w-full px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <span className="flex items-center justify-center">
                  <span className="mr-2">🔄</span>
                  {t('add_more_with_other_options')}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Итого по корзине */}
      <div className="bg-dark-800 rounded-lg p-6 border border-gray-700 shadow-dark-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-100">
            {t('cart_total')}
          </h3>
          <div className="text-2xl font-bold text-primary-400">
            {formatCurrency(state.finalTotal)}
          </div>
        </div>
        
        <div className="text-sm text-gray-400 mb-6">
          {t('total_items')}: {state.items.reduce((sum, item) => sum + item.quantity, 0)}
        </div>
        
        <button className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:scale-105 shadow-dark-card hover:shadow-dark-card-hover">
          <span className="flex items-center justify-center">
            <span className="mr-2">💳</span>
            {t('checkout')}
          </span>
        </button>
      </div>

      {/* Модальное окно для добавления еще */}
      {addMoreItem && (
        <AddMoreModal
          item={addMoreItem}
          isOpen={true}
          onClose={handleCloseAddMore}
        />
      )}
    </div>
  );
};
