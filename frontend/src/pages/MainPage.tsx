import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMenu } from '../context/MenuContext';
import { useLanguage } from '../context/LanguageContext';
import { MenuCategory } from '../components/menu/MenuCategory';
import { CategoryNavigation } from '../components/menu/CategoryNavigation';
import { FeaturedSection } from '../components/menu/FeaturedSection';
import { PromotionCard } from '../components/menu/PromotionCard';
import { CartDisplay } from '../components/cart/CartDisplay';
import { Button } from '../components/ui/Button';
import type { MenuItem, Promotion } from '../types/menu';

export const MainPage: React.FC = () => {
  const { state } = useAuth();
  const { state: cartState } = useCart();
  const { 
    state: menuState, 
    fetchMenu, 
    fetchPromotions,
    getAvailableCategories,
    getActivePromotions,
    getHits,
    getNewItems
  } = useMenu();

  const { t, language, setLanguage } = useLanguage();
  const [currentView, setCurrentView] = useState<'menu' | 'cart'>('menu');
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

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'uz' : 'ru');
  };

  const availableCategories = getAvailableCategories() || [];
  const activePromotions = getActivePromotions() || [];
  const hits = getHits() || [];
  const newItems = getNewItems() || [];

  // Фильтруем категории по активной
  const filteredCategories = activeCategory 
    ? availableCategories.filter(cat => cat.name === activeCategory)
    : availableCategories;

  const totalItems = cartState.items.reduce((sum, item) => sum + item.quantity, 0);

  // Отладочная информация
  console.log('🔍 MainPage Debug:', {
    currentView,
    cartItemsCount: cartState.items.length,
    totalItems,
    cartState
  });

  if (menuState.isLoading) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-6"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-accent-500 rounded-full animate-spin mx-auto" style={{ animationDelay: '-0.5s' }}></div>
        </div>
        <p className="text-gray-300 text-lg font-medium">{t('loading_menu')}</p>
        <p className="text-gray-500 text-sm mt-2">{t('preparing_delicious_dishes')}</p>
      </div>
    );
  }

  if (menuState.error) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="w-20 h-20 bg-gradient-to-br from-error-900/30 to-error-800/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-error-700/50">
          <span className="text-3xl">⚠️</span>
        </div>
        <p className="text-error-300 text-lg font-semibold mb-4">{menuState.error}</p>
        <Button onClick={() => fetchMenu()} variant="primary">
          <span className="flex items-center">
            <span className="mr-2">🔄</span>
            {t('try_again')}
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="tg-webapp bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
      <div className="max-w-4xl mx-auto p-4 tg-safe-top tg-safe-bottom">
        {/* Современный хедер с темной темой */}
        <div className="tg-card-modern p-6 mb-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-dark-glow animate-dark-pulse">
                  <span className="text-2xl">🍔</span>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">🔥</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-100 mb-1 neon-text">
                  Babay Burger
                </h1>
                <p className="text-gray-400 text-sm">
                  Вкусные бургеры и фастфуд
                </p>
                {state.user && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {state.user.telegram_id === 0 ? `👤 ${t('guest')}` : `📱 ${t('telegram')}`}
                    </span>
                    <span className="text-xs text-gray-600">
                      {state.user.first_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Статус заказа с неоновым эффектом */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-success-900/30 border border-success-700/50 rounded-full">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-success-300">{t('open')}</span>
              </div>
              
              {/* Переключатель языка */}
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm font-medium"
              >
                {language === 'ru' ? '🇺🇿 O\'zbekcha' : '🇷🇺 Русский'}
              </button>
            </div>
          </div>
          
          {/* Быстрые действия с темной темой */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <button 
              onClick={() => {
                console.log('🛒 Switching to cart view');
                setCurrentView('cart');
              }}
              className={`flex flex-col items-center p-3 rounded-xl transition-all duration-300 hover:scale-105 relative ${
                currentView === 'cart' 
                  ? 'bg-primary-600/30 border border-primary-500/50' 
                  : 'glass-dark hover:bg-dark-700/50'
              }`}
            >
              <span className="text-xl mb-1">🛒</span>
              <span className="text-xs font-medium text-gray-300">Корзина</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </button>
            <button 
              onClick={() => {
                console.log('🍽️ Switching to menu view');
                setCurrentView('menu');
              }}
              className={`flex flex-col items-center p-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                currentView === 'menu' 
                  ? 'bg-primary-600/30 border border-primary-500/50' 
                  : 'glass-dark hover:bg-dark-700/50'
              }`}
            >
              <span className="text-xl mb-1">🍽️</span>
              <span className="text-xs font-medium text-gray-300">Меню</span>
            </button>
            <button className="flex flex-col items-center p-3 glass-dark rounded-xl hover:bg-dark-700/50 transition-all duration-300 hover:scale-105">
              <span className="text-xl mb-1">📍</span>
              <span className="text-xs font-medium text-gray-300">Адрес</span>
            </button>
          </div>
        </div>

        {/* Отладочная информация */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg text-white text-sm">
          <div>Текущий вид: <strong>{currentView}</strong></div>
          <div>Элементов в корзине: <strong>{cartState.items.length}</strong></div>
          <div>Общее количество: <strong>{totalItems}</strong></div>
        </div>

        {/* Основной контент */}
        <div className="animate-slide-up">
          {currentView === 'menu' ? (
            <>
              {/* Акции */}
              {activePromotions.length > 0 && (
                <div className="mb-8 animate-fade-in">
                  <div className="flex items-center mb-6">
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center mr-3 shadow-dark-glow">
                      <span className="text-white text-sm">🎉</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100 neon-text">
                      {t('promotions_discounts')}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activePromotions.map((promotion: Promotion, index: number) => (
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
                    title={`🔥 ${t('hits')}`}
                    items={hits}
                    onItemSelect={handleItemSelect}
                  />
                </div>
              )}

              {/* Новинки */}
              {newItems.length > 0 && (
                <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <FeaturedSection
                    title={`✨ ${t('new_items')}`}
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
                          {t('full_menu')}
                        </h2>
                        <p className="text-gray-400">
                          {t('select_category_or_view_all')}
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
                              {t('dishes_from_category')}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveCategory(null)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
                          >
                            {t('show_all')}
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
                      {t('menu_unavailable')}
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                      {t('try_later')}
                    </p>
                    <Button onClick={() => fetchMenu()} variant="primary">
                      <span className="flex items-center">
                        <span className="mr-2">🔄</span>
                        {t('refresh_menu')}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <div className="text-white mb-2">🛒 Показываю корзину</div>
              {/* Здесь будет CartDisplay */}
              <CartDisplay />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 