import React, { useEffect } from 'react';
import { useMenu } from '../context/MenuContext';
import { MenuCategory } from '../components/menu/MenuCategory';
import { MenuFilters } from '../components/menu/MenuFilters';
import { FeaturedSection } from '../components/menu/FeaturedSection';
import { PromotionCard } from '../components/menu/PromotionCard';
import { Button } from '../components/ui/Button';
import type { MenuItem, Promotion } from '../types/menu';

export const MenuPage: React.FC = () => {
  console.log('🎬 MenuPage component rendered');
  
  const { 
    state, 
    fetchMenu, 
    fetchPromotions,
    setFilters, 
    resetFilters, 
    getFilteredItems, 
    getAvailableCategories,
    getActivePromotions,
    getHits,
    getNewItems
  } = useMenu();

  useEffect(() => {
    console.log('🔄 MenuPage useEffect: loading menu data...');
    console.log('📋 Functions available:', { 
      fetchMenu: typeof fetchMenu, 
      fetchPromotions: typeof fetchPromotions 
    });
    
    // Сначала загружаем меню, потом промоции
    const loadData = async () => {
      await fetchMenu();
      await fetchPromotions();
    };
    
    loadData();
  }, []); // Убираем зависимости чтобы избежать бесконечного цикла

  const handleItemSelect = (item: MenuItem, size?: any, addOns?: any[]) => {
    // TODO: Добавить в корзину
    console.log('Selected item:', item, 'Size:', size, 'AddOns:', addOns);
  };

  const handleFiltersChange = (newFilters: Partial<typeof state.filters>) => {
    setFilters(newFilters);
  };

  const handlePromotionApply = (promotion: Promotion) => {
    // TODO: Применить акцию к заказу
    console.log('Applied promotion:', promotion);
  };

  const availableCategories = getAvailableCategories() || [];
  const filteredItems = getFilteredItems() || [];
  const activePromotions = getActivePromotions() || [];
  const hits = getHits() || [];
  const newItems = getNewItems() || [];

  // Статистика для отображения
  const totalItems = state.items.length;
  const totalCategories = availableCategories.length;
  const totalPromotions = activePromotions.length;

  // Отладочная информация
  console.log('📱 MenuPage state:', {
    isLoading: state.isLoading,
    error: state.error,
    totalItems,
    totalCategories,
    totalPromotions,
    availableCategories: availableCategories.length,
    filteredItems: filteredItems.length,
    hits: hits.length,
    newItems: newItems.length,
    stateItems: state.items.length,
    stateCategories: state.categories.length
  });

  if (state.isLoading) {
    console.log('⏳ MenuPage: showing loading state');
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
      {/* Акции с современным дизайном для темной темы */}
      {activePromotions.length > 0 && (
        <div className="mb-10 animate-fade-in">
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

      {/* Хиты с современным дизайном для темной темы */}
      {hits.length > 0 && (
        <div className="animate-slide-up">
          <FeaturedSection
            title="🔥 Хиты продаж"
            items={hits}
            onItemSelect={handleItemSelect}
          />
        </div>
      )}

      {/* Новинки с современным дизайном для темной темы */}
      {newItems.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <FeaturedSection
            title="✨ Новинки"
            items={newItems}
            onItemSelect={handleItemSelect}
          />
        </div>
      )}

      {/* Фильтры с современным дизайном для темной темы */}
      <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <MenuFilters
          filters={state.filters}
          categories={availableCategories.map(cat => ({ id: cat.id, name: cat.name }))}
          onFiltersChange={handleFiltersChange}
          onReset={resetFilters}
        />
      </div>

      {/* Результаты поиска с современным дизайном для темной темы */}
      {state.filters.search && (
        <div className="mb-10 animate-fade-in">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mr-3 shadow-dark-glow">
              <span className="text-white text-sm">🔍</span>
            </div>
            <h2 className="text-xl font-bold text-gray-100 neon-text">
              Результаты поиска: "{state.filters.search}"
            </h2>
            <span className="ml-3 text-gray-400 text-sm">
              Найдено: {filteredItems.length}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredItems.map((item, index) => (
              <div key={item.id} className="tg-card-modern p-6 animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-100 text-lg">{item.name}</h3>
                  <span className="font-bold text-primary-400 text-lg">{item.price} ₽</span>
                </div>
                <p className="text-gray-400 text-sm">{item.description}</p>
                <div className="flex gap-2 mt-3">
                  {item.is_hit && (
                    <span className="px-2 py-1 bg-warning-900/50 text-warning-300 text-xs rounded">
                      🔥 Хит
                    </span>
                  )}
                  {item.is_new && (
                    <span className="px-2 py-1 bg-success-900/50 text-success-300 text-xs rounded">
                      ✨ Новинка
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-600/50">
                <span className="text-2xl">🔍</span>
              </div>
              <p className="text-gray-300 text-lg font-medium">
                По вашему запросу ничего не найдено
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Попробуйте изменить поисковый запрос
              </p>
            </div>
          )}
        </div>
      )}

      {/* Категории меню с современным дизайном для темной темы */}
      {!state.filters.search && (
        <div className="animate-fade-in">
          {availableCategories.length > 0 ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-100 neon-text mb-2">
                  Категории меню
                </h2>
                <p className="text-gray-400">
                  Выберите категорию для просмотра блюд
                </p>
              </div>
              {availableCategories.map((category, index) => (
                <div key={category.id} style={{ animationDelay: `${index * 0.1}s` }}>
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
      )}
    </div>
  );
}; 