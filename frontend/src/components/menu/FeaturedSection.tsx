import React, { useRef, useState } from 'react';
import { MenuItem } from './MenuItem';
import type { MenuItem as MenuItemType, SizeOption, AddOn } from '../../types/menu';

interface FeaturedSectionProps {
  title: string;
  items: MenuItemType[];
  onItemSelect?: (item: MenuItemType, size?: SizeOption, addOns?: AddOn[]) => void;
}

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({ 
  title, 
  items, 
  onItemSelect 
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  if (!items || items.length === 0) {
    return null;
  }

  // Проверяем возможность скролла
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Скролл влево
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  // Скролл вправо
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Обработчик скролла
  const handleScroll = () => {
    checkScroll();
  };

  // Проверяем скролл при монтировании
  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items]);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-100 neon-text">
          {title}
        </h2>
        
        {/* Навигационные кнопки */}
        <div className="flex items-center space-x-2">
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
              ${canScrollLeft 
                ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-dark-card hover:scale-105' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <span className="text-lg">←</span>
          </button>
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
              ${canScrollRight 
                ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-dark-card hover:scale-105' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <span className="text-lg">→</span>
          </button>
        </div>
      </div>

      {/* Контейнер с горизонтальным скроллом */}
      <div className="relative group">
        {/* Градиент слева */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-dark-800 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Градиент справа */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-dark-800 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Карусель */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex space-x-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 pt-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
                     {items.map((item, index) => (
             <div 
               key={item.id} 
               className="flex-shrink-0 w-80 animate-fade-in" 
               style={{ animationDelay: `${index * 0.1}s` }}
             >
               <MenuItem
                 item={item}
                 onSelect={onItemSelect}
                 isCompact={true}
               />
             </div>
           ))}
        </div>
      </div>

      {/* Индикатор количества элементов */}
      <div className="flex justify-center mt-4">
        <div className="flex space-x-2">
          {Array.from({ length: Math.ceil(items.length / 2) }).map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full bg-gray-600 opacity-50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}; 