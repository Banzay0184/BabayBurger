import React, { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext';
import { MenuCategory } from '../components/menu/MenuCategory';
import { CategoryNavigation } from '../components/menu/CategoryNavigation';
import { FeaturedSection } from '../components/menu/FeaturedSection';
import { PromotionCard } from '../components/menu/PromotionCard';
import { Button } from '../components/ui/Button';
import type { MenuItem, Promotion } from '../types/menu';

export const MenuPage: React.FC = () => {
  const { 
    state, 
    fetchMenu, 
    fetchPromotions,
    getAvailableCategories,
    getActivePromotions,
    getHits,
    getNewItems
  } = useMenu();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      await fetchMenu();
      await fetchPromotions();
    };
    
    loadData();
  }, []);

  const handleItemSelect = (item: MenuItem, size?: any, addOns?: any[]) => {
    console.log('Selected item:', item, 'Size:', size, 'AddOns:', addOns);
  };

  const handleCategorySelect = (categoryName: string) => {
    setActiveCategory(activeCategory === categoryName ? null : categoryName);
    
    // Плавная прокрутка к выбранной категории
    if (activeCategory !== categoryName) {
      const element = document.getElementById(`category-${categoryName}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handlePromotionApply = (promotion: Promotion) => {
    console.log('Applied promotion:', promotion);
  };

  const availableCategories = getAvailableCategories() || [];
  const activePromotions = getActivePromotions() || [];
  const hits = getHits() || [];
  const newItems = getNewItems() || [];

  // Фильтруем категории по активной
  const filteredCategories = activeCategory 
    ? availableCategories.filter(cat => cat.name === activeCategory)
    : availableCategories;

  if (state.isLoading) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-accent-500 rounded-full animate-spin mx-auto" style={{ animationDelay: '-0.5s' }}></div>
        </div>
        <p className="text-gray-300 text-lg font-medium">Загрузка меню...</p>
        <p className="text-gray-500 text-sm mt-2">Подготавливаем вкусные блюда для вас</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-br from-error-900/30 to-error-800/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-error-700/50">
          <span className="text-3xl">⚠️</span>
        </div>
        <p className="text-error-300 text-lg font-semibold mb-4">{state.error}</p>
        <Button onClick={() => fetchMenu()} variant="primary">
          <span className="flex items-center">
            <span className="mr-2">🔄</span>
            Попробовать снова
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Акции */}
      {activePromotions.length > 0 && (
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center mr-3 shadow-dark-glow">
              <span className="text-white text-sm">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-100 neon-text">
              Акции и скидки
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activePromotions.map((promotion, index) => (
              <div key={promotion.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <PromotionCard
                  promotion={promotion}
                  onApply={handlePromotionApply}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Хиты */}
      {hits.length > 0 && (
        <div className="animate-slide-up">
          <FeaturedSection
            title="🔥 Хиты продаж"
            items={hits}
            onItemSelect={handleItemSelect}
          />
        </div>
      )}

      {/* Новинки */}
      {newItems.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <FeaturedSection
            title="✨ Новинки"
            items={newItems}
            onItemSelect={handleItemSelect}
          />
        </div>
      )}

      {/* Быстрая навигация по категориям */}
      {availableCategories.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <CategoryNavigation
            categories={availableCategories}
            activeCategory={activeCategory}
            onCategorySelect={handleCategorySelect}
          />
        </div>
      )}

      {/* Категории меню */}
      <div className="animate-fade-in">
        {filteredCategories.length > 0 ? (
          <>
            {!activeCategory && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-100 neon-text mb-2">
                  Полное меню
                </h2>
                <p className="text-gray-400">
                  Выберите категорию выше или просмотрите все блюда
                </p>
              </div>
            )}
            
            {activeCategory && (
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-100 neon-text mb-2">
                      {activeCategory}
                    </h2>
                    <p className="text-gray-400">
                      Блюда из выбранной категории
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
                  >
                    Показать все
                  </button>
                </div>
              </div>
            )}
            
            {filteredCategories.map((category, index) => (
              <div 
                key={category.id} 
                id={`category-${category.name}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <MenuCategory
                  category={category}
                  onItemSelect={handleItemSelect}
                />
              </div>
            ))}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600/50">
              <span className="text-3xl">🍽️</span>
            </div>
            <p className="text-gray-300 text-lg font-medium mb-2">
              В данный момент меню недоступно
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Попробуйте позже или свяжитесь с нами
            </p>
            <Button onClick={() => fetchMenu()} variant="primary">
              <span className="flex items-center">
                <span className="mr-2">🔄</span>
                Обновить меню
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}; 