import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoriteContext';
import { OptionsModal } from './OptionsModal';
import type { MenuItem as MenuItemType, SizeOption, AddOn } from '../../types/menu';

interface MenuItemProps {
  item: MenuItemType;
  onSelect?: (item: MenuItemType, size?: SizeOption, addOns?: AddOn[]) => void;
  isCompact?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({ 
  item, 
  onSelect, 
  isCompact = false 
}) => {
  const { addItem, decrementByKey, getItemCountForMenuItem, state: cartState } = useCart();
  const { t, formatCurrency } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const availableSizes = item.size_options?.filter((size: SizeOption) => size.is_active) || [];
  const availableAddOns = item.add_on_options?.filter((addOn: AddOn) => addOn.is_active) || [];
  const currentCount = getItemCountForMenuItem(item.id);

  // Открытие модала
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // Закрытие модала
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Обработка подтверждения опций из модала
  const handleConfirmOptions = (size?: SizeOption, addOns?: AddOn[]) => {
    addItem(item, size, addOns);
    if (onSelect) onSelect(item, size, addOns);
    
    const optionsText = [];
    if (size) optionsText.push(`${t('size')}: ${size.name}`);
    if (addOns && addOns.length > 0) {
      optionsText.push(`${t('addition')}: ${addOns.map(a => a.name).join(', ')}`);
    }
    
    const message = optionsText.length > 0 
      ? `${item.name} ${t('with_options')} ${optionsText.join(', ')} ${t('added_to_cart')}`
      : `${item.name} ${t('added_to_cart')}`;
    
    showNotification(message);
    handleCloseModal();
  };

  // Переключение избранного
  const [isToggling, setIsToggling] = useState(false);
  
  const handleToggleFavorite = async () => {
    if (isToggling) {
      console.log('🤍 Already toggling favorite, skipping...');
      return;
    }
    
    try {
      setIsToggling(true);
      const wasFavorite = isFavorite(item.id);
      
      console.log('🤍 MenuItem - Starting toggle:', {
        item: item.name,
        wasFavorite,
        action: wasFavorite ? 'remove' : 'add'
      });
      
      await toggleFavorite(item);
      
      // Показываем уведомление на основе предыдущего состояния
      const message = wasFavorite 
        ? `${item.name} ${t('removed_from_favorites')}` 
        : `${item.name} ${t('added_to_favorites')}`;
      
      showNotification(message);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification(t('error_toggle_favorite'));
    } finally {
      setIsToggling(false);
    }
  };

  // Показ уведомления
  const showNotification = (message: string) => {
    // Простое уведомление в консоли (можно заменить на toast)
    console.log(message);
  };

  // Получение тегов для блюда
  const getTags = () => {
    const tags = [];
    
    const name = item.name.toLowerCase();
    if (name.includes('острый') || name.includes('spicy') || name.includes('чили') || name.includes('o\'tkir')) {
      tags.push({ text: `🌶️ ${t('spicy')}`, color: 'bg-red-600/20 text-red-400 border-red-500/30' });
    }
    
    if (name.includes('вегетариан') || name.includes('vegetarian') || name.includes('овощ') || name.includes('sabzavot')) {
      tags.push({ text: `🥬 ${t('vegetarian')}`, color: 'bg-green-600/20 text-green-400 border-green-500/30' });
    }
    
    if (name.includes('без глютена') || name.includes('gluten-free') || name.includes('glyutensiz')) {
      tags.push({ text: `🌾 ${t('gluten_free')}`, color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' });
    }
    
    if (item.is_hit) {
      tags.push({ text: `🔥 ${t('hit')}`, color: 'bg-orange-600/20 text-orange-400 border-orange-500/30' });
    }
    
    if (item.is_new) {
      tags.push({ text: `✨ ${t('new')}`, color: 'bg-purple-600/20 text-purple-400 border-purple-500/30' });
    }
    
    return tags;
  };

  const tags = getTags();

  // Функция для получения URL изображения
  const getImageUrl = (imagePath: string | null): string => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${imagePath}`;
  };

  return (
    <>
      <div className={`tg-card-modern p-4 ${isCompact ? 'max-w' : ''}`}>
        {/* Верхняя часть с изображением и быстрыми действиями */}
        <div className="relative mb-3">
          {/* Изображение блюда */}
          <div className={`${isCompact ? 'w-full h-32' : 'w-full h-48'} bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg flex items-center justify-center border border-gray-600/50 overflow-hidden`}>
            {item.image ? (
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
            ) : (
              <span className="text-2xl animate-float">🍔</span>
            )}
          </div>
          
          {/* Быстрые действия поверх изображения */}
          <div className="absolute top-2 right-2 flex flex-col space-y-2">
            {/* Кнопка избранного */}
            <button
              onClick={handleToggleFavorite}
              disabled={isToggling}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                isToggling 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : isFavorite(item.id) 
                    ? 'bg-red-500 text-white shadow-lg' 
                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
              }`}
            >
              <span className="text-xs">
                {isToggling ? '⏳' : isFavorite(item.id) ? '❤️' : '🤍'}
              </span>
            </button>
          </div>

          {/* Теги */}
          {tags.length > 0 && (
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
              {tags.slice(0, isCompact ? 1 : 2).map((tag, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs rounded-full border ${tag.color} backdrop-blur-sm`}
                >
                  {tag.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Информация о блюде */}
        <div className="space-y-2">
          {/* Название и цена */}
          <div className="flex justify-between items-start">
            <h3 className={`font-semibold text-gray-100 ${isCompact ? 'text-sm' : 'text-lg'} leading-tight line-clamp-2 flex-1 mr-2`}>
              {item.name}
            </h3>
            <span className={`font-bold text-primary-400 ${isCompact ? 'text-sm' : 'text-lg'} flex-shrink-0`}>
              {formatCurrency(item.price)}
                </span>
          </div>
          
          {/* Описание */}
          {!isCompact && (
            <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
            {item.description}
          </p>
          )}

          {/* Счетчик в корзине */}
          {currentCount > 0 && (
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-accent-600 text-white text-[11px] font-bold">
                {t('in_cart')}: {currentCount}
              </span>
            </div>
          )}
        </div>
            
        {/* Кнопка выбора опций или управления количеством */}
        {availableSizes.length > 0 || availableAddOns.length > 0 ? (
          // Если есть опции - показываем кнопку шестеренки
          <button
            onClick={handleOpenModal}
            className={`w-full ${isCompact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'} bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-lg font-semibold hover:from-accent-600 hover:to-accent-700 transition-all duration-300 hover:scale-105 shadow-dark-card hover:shadow-dark-card-hover mt-3`}
          >
            <span className="flex items-center justify-center">
              <span className="mr-2">⚙️</span>
              {t('select_options')}
            </span>
          </button>
        ) : (
          // Если опций нет - показываем кнопки - 1 +
          <div className="flex items-center justify-center space-x-2 mt-3">
            <button
              onClick={() => {
                // Уменьшить количество
                if (currentCount > 0) {
                  // Находим товар в корзине без опций
                  const cartItems = cartState.items.filter((i: any) => 
                    i.menuItem.id === item.id && 
                    !i.sizeOption && 
                    i.addOns.length === 0
                  );
                  
                  if (cartItems.length > 0) {
                    // Берем первый найденный товар без опций и уменьшаем количество
                    const cartItem = cartItems[0];
                    decrementByKey(cartItem.key);
                    console.log('Уменьшили количество товара:', item.name);
                  }
                }
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                currentCount > 0 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              disabled={currentCount === 0}
            >
              <span className="text-lg font-bold">-</span>
            </button>
            
            <span className="min-w-[2rem] text-center font-bold text-gray-100">
              {currentCount}
            </span>
            
            <button
              onClick={() => {
                // Увеличить количество
                addItem(item);
                if (onSelect) onSelect(item);
                showNotification(`${item.name} ${t('added_to_cart')}`);
              }}
              className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-all duration-300 hover:scale-105"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          </div>
        )}
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