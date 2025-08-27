import React, { useRef } from 'react';
import type { MenuCategory } from '../../types/menu';

interface CategoryNavigationProps {
  categories: MenuCategory[];
  activeCategory: string | null;
  onCategorySelect: (categoryName: string) => void;
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  categories,
  activeCategory,
  onCategorySelect
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        parent.innerHTML = `
          <div class="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center">
            <span class="text-4xl">🍽️</span>
          </div>
        `;
      }
      return;
    }
    
    // Отмечаем, что fallback уже пытались загрузить
    target.dataset.fallbackAttempted = 'true';
    
    // Заменяем на fallback изображение
    target.src = '/placeholder-category.jpg';
  };

  // Отладочная информация
  console.log('🎯 CategoryNavigation:', {
    categoriesCount: categories.length,
    categories: categories.map(cat => ({ 
      id: cat.id, 
      name: cat.name, 
      image: cat.image,
      fixedImage: fixImagePath(cat.image),
      hasImage: !!cat.image 
    }))
  });

  if (categories.length === 0) return null;

  return (
    <div className="mb-8">

      {/* Контейнер с прокруткой */}
      <div className="relative group">
        {/* Категории */}
        <div
          ref={scrollContainerRef}
          className="flex space-x-4 overflow-x-auto scrollbar-hide scroll-smooth p-3"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.name)}
              className={`
                flex-shrink-0 relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-105
                w-32 h-40 group/cat cursor-pointer
                ${activeCategory === category.name
                  ? 'border-primary-400 shadow-xl shadow-primary-500/30 transform scale-105 ring-2 ring-primary-500/50'
                  : 'border-gray-600/50 hover:border-primary-400/50 hover:shadow-lg'
                }
              `}
            >
              {/* Фоновое изображение категории */}
              {category.image ? (
                <img 
                  src={fixImagePath(category.image)} 
                  alt={category.name} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover/cat:scale-110"
                  onError={(e) => handleImageError(e, category.name)}
                  onLoad={() => console.log('✅ Category image loaded:', fixImagePath(category.image))}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center">
                  <span className="text-4xl">🍽️</span>
                </div>
              )}
              
              {/* Градиентный оверлей для лучшей читаемости текста */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              
              {/* Название категории внизу */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <span className={`
                  block font-bold text-sm leading-tight text-center text-white
                  ${activeCategory === category.name ? 'text-primary-200' : 'text-white'}
                  drop-shadow-lg
                `}>
                  {category.name}
                </span>
              </div>
              
              {/* Индикатор активной категории */}
              {activeCategory === category.name && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-primary-500 rounded-full shadow-lg animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
