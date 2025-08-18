import React, { useRef, useState, useEffect } from 'react';
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  if (categories.length === 0) return null;

  return (
    <div className="relative mb-6">
      {/* Заголовок */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100">📂 Выберите категорию</h3>
      </div>

      {/* Контейнер с прокруткой */}
      <div className="relative group">
        {/* Кнопка прокрутки влево */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-gray-800/90 hover:bg-gray-700 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110"
          >
            <span className="text-sm">‹</span>
          </button>
        )}

        {/* Кнопка прокрутки вправо */}
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-gray-800/90 hover:bg-gray-700 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110"
          >
            <span className="text-sm">›</span>
          </button>
        )}

        {/* Категории */}
        <div
          ref={scrollContainerRef}
          className="flex space-x-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.name)}
              className={`
                flex-shrink-0 px-4 py-2.5 rounded-lg border-2 transition-all duration-300 hover:scale-105 whitespace-nowrap
                ${activeCategory === category.name
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white border-primary-500 shadow-lg shadow-primary-500/25'
                  : 'bg-gray-800/50 text-gray-300 border-gray-600/50 hover:bg-gray-700/50 hover:border-primary-500/50'
                }
              `}
            >
              <div className="flex items-center space-x-2">
                <span className="text-base">🍽️</span>
                <span className="font-medium">{category.name}</span>
                <span className="text-xs opacity-75">({category.items?.length || 0})</span>
              </div>
            </button>
          ))}
        </div>

        {/* Градиентные края для плавного перехода */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-dark-900 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-dark-900 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};
