import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoriteContext';
import type { MenuItem as MenuItemType, SizeOption, AddOn } from '../../types/menu';

interface MenuItemProps {
  item: MenuItemType;
  onSelect?: (item: MenuItemType, size?: SizeOption, addOns?: AddOn[]) => void;
  isCompact?: boolean;
  hideDescription?: boolean;
  onNavigateToDetails?: (item: MenuItemType) => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  item,
  onSelect,
  isCompact = false,
  hideDescription = false,
  onNavigateToDetails
}) => {
  const { formatCurrency } = useLanguage();
  const { addItem } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  // Доступные размеры и дополнения
  const availableSizes = item.size_options?.filter(size => size.is_active) || [];
  const availableAddOns = item.add_on_options?.filter(addOn => addOn.is_active) || [];

  const handleOpenModal = () => {
    // Если есть опции (размеры или дополнения), переходим на страницу деталей
    if (availableSizes.length > 0 || availableAddOns.length > 0) {
      if (onNavigateToDetails) {
        onNavigateToDetails(item);
      }
    } else if (onSelect) {
      // Если опций нет, вызываем onSelect напрямую
      onSelect(item);
    } else {
      // Если нет onSelect, добавляем в корзину напрямую
      addItem(item);
      // Простое уведомление в консоли
      console.log(`${item.name} добавлен в корзину`);
    }
  };

  const handleFavoriteToggle = async () => {
    if (isFavoriteLoading) return;
    
    setIsFavoriteLoading(true);
    try {
      await toggleFavorite(item);
      // Простое уведомление в консоли
      console.log(`${item.name} ${isFavorite(item.id) ? 'удален из' : 'добавлен в'} избранное`);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const isItemFavorite = isFavorite(item.id);

  return (
    <div className={`
      bg-dark-800 rounded-2xl overflow-hidden shadow-dark-card hover:shadow-dark-glow transition-all duration-300
      ${isCompact ? 'w-64' : 'w-full'}
      hover:scale-105 group cursor-pointer
    `}>
      {/* Изображение */}
      <div className="relative">
        <img
          src={item.image}
          alt={item.name}
          className={`w-full object-cover transition-transform duration-300 group-hover:scale-110 ${
            isCompact ? 'h-32' : 'h-48'
          }`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div 
          className={`hidden w-full bg-gradient-to-br from-gray-800 to-gray-700 items-center justify-center ${
            isCompact ? 'h-32' : 'h-48'
          }`}
          style={{ display: 'none' }}
        >
          <span className="text-4xl">🍽️</span>
        </div>
        
        {/* Теги */}
        <div className="absolute top-2 right-2 flex flex-col space-y-2">
          {item.is_hit && (
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg">
              🔥 Хит
            </div>
          )}
          {item.is_new && (
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg">
              ✨ Новинка
            </div>
          )}
        </div>

        {/* Кнопка избранного */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFavoriteToggle();
          }}
          disabled={isFavoriteLoading}
          className={`
            absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
            ${isItemFavorite
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
              : 'bg-dark-700/80 text-gray-400 hover:bg-dark-600/80 hover:text-white'
            }
            ${isFavoriteLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
          `}
        >
          {isFavoriteLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="text-sm">{isItemFavorite ? '❤️' : '🤍'}</span>
          )}
        </button>
      </div>

      {/* Контент */}
      <div className="p-4 space-y-3">
        {/* Название и цена */}
        <div className="flex items-start justify-between">
          <h3 className={`font-bold text-gray-100 leading-tight ${
            isCompact ? 'text-sm' : 'text-lg'
          }`}>
            {item.name}
          </h3>
          <span className={`font-bold text-primary-400 ${
            isCompact ? 'text-sm' : 'text-lg'
          }`}>
            {formatCurrency(Number(item.price) || 0)}
          </span>
        </div>

        {/* Описание */}
        {!hideDescription && item.description && (
          <p className={`text-gray-400 leading-relaxed ${
            isCompact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'
          }`}>
            {item.description}
          </p>
        )}

        {/* Теги внизу */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {item.is_hit && (
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
              🔥
            </div>
          )}
          {item.is_new && (
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
              ✨
            </div>
          )}
        </div>

        {/* Кнопка действия */}
        <button
          onClick={handleOpenModal}
          className={`
            w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300
            ${availableSizes.length > 0 || availableAddOns.length > 0
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-dark-glow hover:scale-105'
              : 'bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white shadow-dark-glow hover:scale-105'
            }
          `}
        >
          {availableSizes.length > 0 || availableAddOns.length > 0
            ? '📋 Выбрать опции'
            : '🛒 Добавить в корзину'
          }
        </button>
      </div>
    </div>
  );
};

export default MenuItem; 