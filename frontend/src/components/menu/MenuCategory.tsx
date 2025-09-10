import React from 'react';
import { MenuItem } from './MenuItem';
import type { MenuCategory as MenuCategoryType, MenuItem as MenuItemType } from '../../types/menu';

interface MenuCategoryProps {
  category: MenuCategoryType;
  onItemSelect?: (item: MenuItemType) => void;
}

export const MenuCategory: React.FC<MenuCategoryProps> = ({ category, onItemSelect }) => {
  if (!category.items || category.items.length === 0) {
    console.log('❌ MenuCategory: no items for category', category.name);
    return null;
  }

  // Функция для исправления путей изображений
  const fixImagePath = (imagePath: string | undefined): string => {
    if (!imagePath) return '/placeholder-category.jpg';
    
    // Если путь уже полный (начинается с http)
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Используем относительный путь для прокси
    return imagePath;
  };

  // Функция для обработки ошибок загрузки изображений
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, categoryName: string) => {
    const target = e.currentTarget;
    console.log('🖼️ Image failed to load for category:', categoryName, 'Path:', target.src);
    
    // Предотвращаем бесконечные циклы
    if (target.dataset.fallbackAttempted === 'true') {
      // Если fallback уже пытались загрузить, показываем эмодзи
      const parent = target.parentElement;
      if (parent) {
        parent.innerHTML = '<span class="text-white text-lg">🍽️</span>';
      }
      return;
    }
    
    // Отмечаем, что fallback уже пытались загрузить
    target.dataset.fallbackAttempted = 'true';
    
    // Заменяем на fallback изображение
    target.src = '/placeholder-category.jpg';
  };

  return (
    <div className="mb-12 animate-fade-in">
      {/* Современный заголовок категории для темной темы */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mr-4 shadow-dark-glow overflow-hidden">
            {category.image ? (
              <img 
                src={fixImagePath(category.image)}
                alt={category.name}
                className="w-8 h-8 object-cover rounded-lg"
                onError={(e) => handleImageError(e, category.name)}
                onLoad={() => console.log('✅ Category image loaded:', fixImagePath(category.image))}
              />
            ) : (
              <span className="text-white text-lg">🍽️</span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-100 neon-text">
            {category.name}
          </h2>
        </div>
        {category.description && (
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
            {category.description}
          </p>
        )}
      </div>

      {/* Сетка блюд с современным дизайном для темной темы */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {category.items
          // .filter((item: MenuItemType) => item.is_active) // Временно отключаем фильтрацию
          .map((item: MenuItemType, index: number) => (
            <div key={item.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <MenuItem 
                item={item} 
                onSelect={onItemSelect}
              />
            </div>
          ))}
      </div>
    </div>
  );
}; 