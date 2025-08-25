import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMenu } from '../context/MenuContext';
import { useLanguage } from '../context/LanguageContext';
import { useFavorites } from '../context/FavoriteContext';
import { MenuCategory } from '../components/menu/MenuCategory';
import { CategoryNavigation } from '../components/menu/CategoryNavigation';
import { FeaturedSection } from '../components/menu/FeaturedSection';
import { PromotionCard } from '../components/menu/PromotionCard';
import { CartDisplay } from '../components/cart/CartDisplay';
import { MenuItem as MenuItemComponent } from '../components/menu/MenuItem';
import { Button } from '../components/ui/Button';
import { AddressManager } from '../components/address/AddressManager';
import { RestaurantLogo } from '../components/common/RestaurantLogo';
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
  const { favorites, isLoading: favoritesLoading } = useFavorites();
  const [currentView, setCurrentView] = useState<'menu' | 'cart' | 'search' | 'favorites' | 'address'>('menu');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogo, setShowLogo] = useState(true);
  const [searchFilters, setSearchFilters] = useState({
    category: null as string | null,
    priceRange: [0, 100000] as [number, number],
    isHit: false,
    isNew: false,
    sortBy: 'name' as 'name' | 'price' | 'popularity' | 'newest'
  });

  // Функция для определения статуса работы ресторана
  const getRestaurantStatus = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник, ...
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    console.log(currentDay, currentHour, currentMinute);
    
    // Настройки времени работы (можно легко изменить)
    // Чтобы изменить время открытия: измените значение OPEN_TIME
    // Например: OPEN_TIME = 9 для открытия в 9:00
    const OPEN_TIME = 8; // 8:00 утра
    const CLOSE_TIME = 8; // 4:00 утра следующего дня
    
    // Воскресенье - не работает
    // if (currentDay === 0) {
    //   return { 
    //     isOpen: false, 
    //     message: t('closed_sunday'), 
    //     nextOpen: t('next_open_monday'),
    //     nextOpenTime: `${OPEN_TIME}:00`
    //   };
    // }
    
    // Логика для определения статуса работы
    let isOpen = false;
    let message = '';
    let timeLeft = '';
    let nextOpen = '';
    
    if (currentHour >= OPEN_TIME) {
      // После 8:00 утра - ресторан открыт
      isOpen = true;
      message = t('open_until_4am');
      timeLeft = t('open_all_night');
    } else if (currentHour < CLOSE_TIME) {
      // До 4:00 утра - ресторан еще работает (открылся вчера в 8:00)
      isOpen = true;
      message = t('open_until_4am');
      timeLeft = t('open_all_night');
    } else {
      // Между 4:00 и 8:00 - ресторан закрыт
      isOpen = false;
      message = t('opens_at_8');
      
      // Вычисляем время до открытия
      const hoursUntilOpen = OPEN_TIME - currentHour;
      if (hoursUntilOpen > 0) {
        nextOpen = `${hoursUntilOpen}ч ${currentMinute}м`;
      } else {
        nextOpen = `${currentMinute}м`;
      }
    }
    
    return {
      isOpen,
      message,
      timeLeft: isOpen ? timeLeft : undefined,
      nextOpen: !isOpen ? nextOpen : undefined,
      nextOpenTime: `${OPEN_TIME}:00`
    };
  };

  const restaurantStatus = getRestaurantStatus();

  // Автоматическое обновление статуса работы каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      // Принудительно перерендериваем компонент для обновления статуса
      setCurrentView(prev => prev);
    }, 60000); // каждую минуту

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Загружаем данные только после завершения анимации логотипа
    if (!showLogo) {
      const loadData = async () => {
        await fetchMenu();
        await fetchPromotions();
      };
      
      loadData();
    }
  }, [showLogo]);

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
    <>
      {/* Анимированный логотип при загрузке */}
      <RestaurantLogo 
        showLogo={showLogo}
        onAnimationComplete={() => {
          console.log('🎉 Logo animation completed!');
          setShowLogo(false);
        }}
      />
      
      <div className="tg-webapp bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 pt-5">
      <div className="max-w-4xl mx-auto p-4 tg-safe-top tg-safe-bottom">
        {/* Современный хедер с темной темой */}
        <div className="tg-card-modern p-4  sm:p-6 mb-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className='flex items-center justify-between w-full'>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-dark-glow animate-dark-pulse">
                  <img src="/public/logo.jpg" alt="Babay Burger" className="w-full h-full object-cover rounded-2xl" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-100 neon-text leading-tight">
                  Babay Burger
                </h1>
                </div>
                <button
                  onClick={() => setCurrentView('address')}
                  className="text-gray-400 text-xs sm:text-sm leading-tight hover:text-gray-300 transition-colors cursor-pointer"
                >
                  {t('delivery_address')}
                </button>
                {state.user && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {state.user.telegram_id === 0 ? `👤 ${t('guest')}` : `📱 ${t('telegram')}`}
                    </span>
                    <span className="text-xs text-gray-600 truncate">
                      {state.user.first_name}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
                    onClick={() => setCurrentView('search')}
                    className="p-2 text-gray-300 rounded-lg transition-colors active:scale-95"
                    aria-label="Поиск блюд"
                  >
                    <span className="text-lg">🔍</span>
                  </button>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Статус заказа с неоновым эффектом */}
              <div className={`flex items-center space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full transition-all duration-300 ${
                restaurantStatus.isOpen 
                  ? 'bg-success-900/30 border border-success-700/50' 
                  : 'bg-red-900/30 border border-red-700/50'
              }`}>
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse ${
                  restaurantStatus.isOpen ? 'bg-success-500' : 'bg-red-500'
                }`}></div>
                <div className="flex flex-col">
                  <span className={`text-xs font-medium ${
                    restaurantStatus.isOpen ? 'text-success-300' : 'text-red-300'
                  }`}>
                    {restaurantStatus.message}
                  </span>
                  
                  {restaurantStatus.nextOpen && (
                    <span className="text-xs text-red-400">
                      {restaurantStatus.nextOpen}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Переключатель языка - только флаги */}
              <button
                onClick={toggleLanguage}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-gray-300 rounded-lg transition-colors text-lg sm:text-xl active:scale-95"
                aria-label={language === 'ru' ? 'Переключить на узбекский' : 'Switch to Russian'}
              >
                {language === 'ru' ? '🇺🇿' : '🇷🇺'}
              </button>
            </div>
          </div>
        </div>

        {/* Быстрые действия с темной темой */}
        {/* Убрали кнопки - теперь они в нижней навигации */}

        {/* Основной контент - показывается только после завершения анимации логотипа */}
        {!showLogo && (
          <div className="animate-slide-up pb-24">
          {/* Блокировка экрана когда ресторан закрыт */}
          {!restaurantStatus.isOpen && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[100] flex items-center justify-center p-4">
              <div className="bg-dark-900 border border-red-600/50 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center animate-fade-in">
                {/* Иконка закрытого ресторана */}
                <div className="w-20 h-20 bg-gradient-to-br from-red-900/50 to-red-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-600/50">
                  <span className="text-4xl">🚫</span>
                </div>
                
                {/* Заголовок */}
                <h2 className="text-2xl sm:text-3xl font-bold text-red-400 mb-4 neon-text">
                  {t('restaurant_closed')}
                </h2>
                
                {/* Сообщение о статусе */}
                <p className="text-gray-300 text-lg mb-6">
                  {restaurantStatus.message}
                </p>
                
                {/* Время следующего открытия */}
                {restaurantStatus.nextOpen && (
                  <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-6">
                    <p className="text-red-300 text-sm mb-2">
                      {t('next_opening')}:
                    </p>
                    <p className="text-red-400 font-semibold text-lg">
                      {restaurantStatus.nextOpen}
                    </p>
                  </div>
                )}
                
                {/* Время работы */}
                <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4 mb-6">
                  <h3 className="text-gray-300 font-semibold mb-3">
                    {t('working_hours')}:
                  </h3>
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>{t('monday')} - {t('saturday')}:</span>
                      <span className="text-gray-300">8:00 - 4:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('sunday')}:</span>
                      <span className="text-red-400">{t('closed')}</span>
                    </div>
                    <div className="text-xs text-primary-400 mt-2 text-center">
                      {t('note_24h_operation')}
                    </div>
                  </div>
                </div>
                
                {/* Адрес */}
                <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4 mb-6">
                  <h3 className="text-gray-300 font-semibold mb-3">
                    📍 {t('our_address')}:
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {t('restaurant_address')}
                  </p>
                </div>
                
                {/* Контакты */}
                <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
                  <h3 className="text-gray-300 font-semibold mb-3">
                    📞 {t('contacts')}:
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {t('phone_number')}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {currentView === 'menu' ? (
            <>
              {/* Акции */}
              {activePromotions.length > 0 && (
                <div className="mb-6 sm:mb-8 animate-fade-in">
                  <div className="flex items-center mb-4 sm:mb-6">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center mr-2 sm:mr-3 shadow-dark-glow">
                      <span className="text-white text-xs sm:text-sm">🎉</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-100 neon-text">
                      {t('promotions_discounts')}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                      <div className="mb-4 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-100 neon-text mb-2">
                          {t('full_menu')}
                        </h2>
                        <p className="text-gray-400 text-sm">
                          {t('select_category_or_view_all')}
                        </p>
                      </div>
                    )}
                    
                    {activeCategory && (
                      <div className="mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-100 neon-text mb-2">
                              {activeCategory}
                            </h2>
                            <p className="text-gray-400 text-sm">
                              {t('dishes_from_category')}
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveCategory(null)}
                            className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm w-full sm:w-auto"
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
          ) : currentView === 'search' ? (
            <div className="animate-fade-in">
              {/* Заголовок поиска */}
        <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-100 neon-text">
                    🔍 {t('search_dishes')}
                  </h2>
                  <button
                    onClick={() => setCurrentView('menu')}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
                  >
                    ← {t('back_to_menu')}
                  </button>
                </div>
                
                {/* Поисковая строка */}
                <div className="relative mb-6">
                  <input
                    type="text"
                    placeholder={t('search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </span>
                </div>

                {/* Фильтры */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Категория */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('category')}
                    </label>
                    <select
                      value={searchFilters.category || ''}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, category: e.target.value || null }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                    >
                      <option value="">{t('all_categories')}</option>
                      {availableCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Диапазон цен */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('price_range')}
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="От"
                        value={searchFilters.priceRange[0]}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, priceRange: [Number(e.target.value), prev.priceRange[1]] }))}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                      />
                      <input
                        type="number"
                        placeholder="До"
                        value={searchFilters.priceRange[1]}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, priceRange: [prev.priceRange[0], Number(e.target.value)] }))}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Чекбоксы */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={searchFilters.isHit}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, isHit: e.target.checked }))}
                        className="mr-2 text-primary-500"
                      />
                      <span className="text-sm text-gray-300">🔥 {t('hits')}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={searchFilters.isNew}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, isNew: e.target.checked }))}
                        className="mr-2 text-primary-500"
                      />
                      <span className="text-sm text-gray-300">✨ {t('new')}</span>
                    </label>
                  </div>

                  {/* Сортировка */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('sort_by')}
                    </label>
                    <select
                      value={searchFilters.sortBy}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-primary-500"
                    >
                      <option value="name">{t('by_name')}</option>
                      <option value="price">{t('by_price')}</option>
                      <option value="popularity">{t('by_popularity')}</option>
                      <option value="newest">{t('by_newest')}</option>
                    </select>
                  </div>
                </div>

                {/* Результаты поиска */}
                <div className="space-y-4">
                  {(() => {
                    let filteredItems = menuState.items;
                    
                    // Фильтрация по поисковому запросу
                    if (searchQuery) {
                      filteredItems = filteredItems.filter(item => 
                        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.description.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                    }
                    
                    // Фильтрация по категории
                    if (searchFilters.category) {
                      filteredItems = filteredItems.filter(item => 
                        availableCategories.find(cat => cat.id === item.category)?.name === searchFilters.category
                      );
                    }
                    
                    // Фильтрация по цене
                    filteredItems = filteredItems.filter(item => 
                      item.price >= searchFilters.priceRange[0] && item.price <= searchFilters.priceRange[1]
                    );
                    
                    // Фильтрация по хитам
                    if (searchFilters.isHit) {
                      filteredItems = filteredItems.filter(item => item.is_hit);
                    }
                    
                    // Фильтрация по новинкам
                    if (searchFilters.isNew) {
                      filteredItems = filteredItems.filter(item => item.is_new);
                    }
                    
                    // Сортировка
                    switch (searchFilters.sortBy) {
                      case 'price':
                        filteredItems = [...filteredItems].sort((a, b) => a.price - b.price);
                        break;
                      case 'popularity':
                        filteredItems = [...filteredItems].sort((a, b) => (b.is_hit ? 1 : 0) - (a.is_hit ? 1 : 0));
                        break;
                      case 'newest':
                        filteredItems = [...filteredItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        break;
                      default: // по имени
                        filteredItems = [...filteredItems].sort((a, b) => a.name.localeCompare(b.name));
                    }
                    
                    return (
                      <>
                        <div className="text-gray-400 text-sm mb-4">
                          {t('found_items')}: <strong>{filteredItems.length}</strong>
                        </div>
                        {filteredItems.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredItems.map((item) => (
                              <div key={item.id} className="animate-fade-in">
                                <MenuItemComponent
                                  item={item}
                                  onSelect={handleItemSelect}
                                  isCompact={true}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600/50">
                              <span className="text-3xl">🔍</span>
                            </div>
                            <p className="text-gray-300 text-lg font-medium mb-2">
                              {t('no_items_found')}
                            </p>
                            <p className="text-gray-500 text-sm">
                              {t('try_different_filters')}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : currentView === 'favorites' ? (
            <div className="animate-fade-in">
              {/* Заголовок избранного */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-100 neon-text">
                    🤍 {t('favorites')}
                  </h2>
                  <button
                    onClick={() => setCurrentView('menu')}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
                  >
                    ← {t('back_to_menu')}
                  </button>
                </div>
                
                {/* Содержимое избранного */}
                {favoritesLoading ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300">{t('loading')}...</p>
                  </div>
                ) : favorites.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites.map((favorite) => (
                      <div key={favorite.id} className="animate-fade-in">
                        <MenuItemComponent
                          item={favorite.menu_item}
                          onSelect={handleItemSelect}
                          isCompact={true}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600/50">
                      <span className="text-3xl">🤍</span>
                    </div>
                    <p className="text-gray-300 text-lg font-medium mb-2">
                      {t('no_favorites')}
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                      Добавьте блюда в избранное, нажав на ❤️
                    </p>
                    <button
                      onClick={() => setCurrentView('menu')}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                    >
                      {t('back_to_menu')}
                    </button>
                  </div>
                )}
              </div>
            </div>
                              ) : currentView === 'address' ? (
                      <div className="animate-fade-in">
                        <AddressManager />
                      </div>
                    ) : (
                      <div>
                        <div className="text-white mb-2">🛒 Показываю корзину</div>
                        {/* Здесь будет CartDisplay */}
                        <CartDisplay />
                      </div>
                    )}
          </div>
        )}
      </div>

      {/* Фиксированная нижняя навигация - скрыта во время анимации логотипа */}
      {!showLogo && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-900/95 backdrop-blur-lg border-t border-gray-700/50 z-50">
        <div className="flex items-center justify-around px-4 py-3">
          {/* Кнопка Меню */}
          <button 
            onClick={() => {
              console.log('🍽️ Switching to menu view');
              setCurrentView('menu');
            }}
            className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 min-w-[4rem] ${
              currentView === 'menu' 
                ? 'text-primary-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="text-xl mb-1">🍽️</span>
            <span className="text-xs font-medium">{t('menu')}</span>
          </button>

          {/* Кнопка Корзина */}
          <button 
            onClick={() => {
              console.log('🛒 Switching to cart view');
              setCurrentView('cart');
            }}
            className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 min-w-[4rem] relative ${
              currentView === 'cart' 
                ? 'text-primary-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="text-xl mb-1">🛒</span>
            <span className="text-xs font-medium">{t('cart')}</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </button>

          {/* Кнопка Избранное */}
          <button 
            onClick={() => {
              console.log('🤍 Switching to favorites view');
              setCurrentView('favorites');
            }}
            className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 min-w-[4rem] relative ${
              currentView === 'favorites' 
                ? 'text-primary-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="text-xl mb-1">🤍</span>
            <span className="text-xs font-medium">{t('favorites')}</span>
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {favorites.length > 99 ? '99+' : favorites.length}
              </span>
            )}
          </button>

          {/* Кнопка Поиск */}
          <button 
            onClick={() => {
              console.log('🔍 Switching to search view');
              setCurrentView('search');
            }}
            className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 min-w-[4rem] ${
              currentView === 'search' 
                ? 'text-primary-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="text-xl mb-1">🔍</span>
            <span className="text-xs font-medium">{t('search')}</span>
          </button>
        </div>
        </div>
        )}
      </div>
    </>
  );
}; 