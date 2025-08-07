import React, { useEffect } from 'react';
import { useMenu } from '../context/MenuContext';
import { MenuCategory } from '../components/menu/MenuCategory';
import { MenuFilters } from '../components/menu/MenuFilters';
import { FeaturedSection } from '../components/menu/FeaturedSection';
import { PromotionCard } from '../components/menu/PromotionCard';
import { Button } from '../components/ui/Button';
import type { MenuItem, Promotion } from '../types/menu';

export const MenuPage: React.FC = () => {
  const { 
    state, 
    fetchMenu, 
    fetchPromotions,
    setFilters, 
    resetFilters, 
    getFilteredItems, 
    getCategoriesWithItems, 
    getAvailableCategories,
    getActivePromotions,
    getHits,
    getNewItems
  } = useMenu();

  useEffect(() => {
    fetchMenu();
    fetchPromotions();
  }, []);

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

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="max-w-6xl mx-auto p-4">
          <div className="bg-bg-card rounded-2xl shadow-card border border-border-gray p-6">
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-6"></div>
              <p className="text-text-secondary text-lg">Загрузка меню...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="max-w-6xl mx-auto p-4">
          <div className="bg-bg-card rounded-2xl shadow-card border border-border-gray p-6">
            <div className="text-center py-16">
              <p className="text-error text-lg mb-6">{state.error}</p>
              <Button onClick={() => fetchMenu()}>
                Попробовать снова
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categories = getCategoriesWithItems();
  const availableCategories = getAvailableCategories();
  const filteredItems = getFilteredItems();
  const activePromotions = getActivePromotions();
  const hits = getHits();
  const newItems = getNewItems();

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-bg-card rounded-2xl shadow-card border border-border-gray p-8">
          {/* Заголовок */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-4">
              🍔 Меню Babay Burger
            </h1>
            <p className="text-text-secondary text-lg">
              Выберите любимые блюда из нашего меню
            </p>
          </div>

          {/* Акции */}
          {activePromotions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-text-primary mb-6">
                🎉 Акции и скидки
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activePromotions.map((promotion) => (
                  <PromotionCard
                    key={promotion.id}
                    promotion={promotion}
                    onApply={handlePromotionApply}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Хиты */}
          <FeaturedSection
            title="🔥 Хиты продаж"
            items={hits}
            icon="🔥"
            onItemSelect={handleItemSelect}
          />

          {/* Новинки */}
          <FeaturedSection
            title="✨ Новинки"
            items={newItems}
            icon="✨"
            onItemSelect={handleItemSelect}
          />

          {/* Фильтры */}
          <MenuFilters
            filters={state.filters}
            categories={availableCategories.map(cat => ({ id: cat.id, name: cat.name }))}
            onFiltersChange={handleFiltersChange}
            onReset={resetFilters}
          />

          {/* Результаты поиска */}
          {state.filters.search && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-text-primary mb-6">
                🔍 Результаты поиска: "{state.filters.search}"
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-light-gray border border-border-gray rounded-xl p-6 hover:border-primary transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-text-primary text-lg">{item.name}</h3>
                      <span className="font-bold text-primary text-lg">{item.price} ₽</span>
                    </div>
                    <p className="text-text-secondary">{item.description}</p>
                  </div>
                ))}
              </div>
              {filteredItems.length === 0 && (
                <p className="text-text-secondary text-center py-12 text-lg">
                  По вашему запросу ничего не найдено
                </p>
              )}
            </div>
          )}

          {/* Категории меню */}
          {!state.filters.search && (
            <div>
              {availableCategories.length > 0 ? (
                availableCategories.map((category) => (
                  <MenuCategory
                    key={category.id}
                    category={category}
                    onItemSelect={handleItemSelect}
                  />
                ))
              ) : (
                <div className="text-center py-16">
                  <p className="text-text-secondary text-lg">
                    В данный момент меню недоступно
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 