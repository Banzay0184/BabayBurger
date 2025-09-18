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
  const [activeIndex, setActiveIndex] = useState(0);

  // Отладочная информация
  console.log(`🎠 FeaturedSection "${title}":`, {
    itemsCount: items?.length || 0,
    items: items?.map(item => ({ 
      id: item.id, 
      name: item.name, 
      is_hit: item.is_hit,
      is_new: item.is_new,
      priority: item.priority
    })) || [],
    canScrollLeft,
    canScrollRight
  });

  // Проверяем возможность скролла и активную позицию
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      
      // Вычисляем активную позицию
      const itemWidth = 280; // 256px (ширина элемента) + 24px (space-x-4)
      const newActiveIndex = Math.round(scrollLeft / itemWidth);
      setActiveIndex(Math.min(newActiveIndex, Math.min(items.length - 1, 4)));
    }
  };

  // Скролл влево
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  // Скролл вправо
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  // Обработчик скролла
  const handleScroll = () => {
    checkScroll();
  };

  // Проверяем скролл при монтировании и изменении элементов
  React.useEffect(() => {
    // Небольшая задержка для корректного расчета размеров
    const timer = setTimeout(() => {
      checkScroll();
      console.log(`🎠 FeaturedSection "${title}": Checked scroll after mount/update`);
    }, 100);
    
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [items, title]);

  if (!items || items.length === 0) {
    console.log(`🎠 FeaturedSection "${title}": No items to display`);
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-100 neon-text">
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
            title={`Скролл влево (${canScrollLeft ? 'доступно' : 'недоступно'})`}
          >
            <span className="text-sm">‹</span>
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
            title={`Скролл вправо (${canScrollRight ? 'доступно' : 'недоступно'})`}
          >
            <span className="text-sm">›</span>
          </button>
        </div>
      </div>

      {/* Контейнер с горизонтальным скроллом */}
      <div className="relative group">
        {/* Градиент слева */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-dark-800 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Градиент справа */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-dark-800 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Карусель */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex space-x-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 pt-2"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className="flex-shrink-0 w-64 animate-fade-in" 
              style={{ 
                animationDelay: `${index * 0.05}s`,
                minWidth: '256px', // 16rem = 256px
                maxWidth: '256px'
              }}
            >
              <MenuItem
                item={item}
                onSelect={onItemSelect}
                isCompact={true}
                hideDescription={true}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Индикатор количества элементов */}
      <div className="flex justify-center mt-3">
        <div className="flex space-x-1.5">
          {Array.from({ length: Math.min(items.length, 5) }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (scrollContainerRef.current) {
                  const targetScroll = index * 280; // 280 = 256px (ширина элемента) + 24px (space-x-4)
                  scrollContainerRef.current.scrollTo({ 
                    left: targetScroll, 
                    behavior: 'smooth' 
                  });
                }
              }}
              className={`
                w-2 h-2 rounded-full transition-all duration-300 cursor-pointer
                ${activeIndex === index
                  ? 'bg-primary-500 scale-125 shadow-lg shadow-primary-500/50' 
                  : 'bg-gray-600 hover:bg-gray-500 hover:scale-110'
                }
              `}
              title={`Перейти к элементу ${index + 1} из ${Math.min(items.length, 5)}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}; 