import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { AutoLocationDetector } from '../components/address/AutoLocationDetector';
import { RestaurantLogo } from '../components/common/RestaurantLogo';
import { PageTransition } from '../components/common/PageTransition';
// Ленивая загрузка тяжелых компонентов для оптимизации производительности
const OptionsPage = React.lazy(() => import('./OptionsPage').then(module => ({ default: module.OptionsPage })));
const ProfilePage = React.lazy(() => import('./ProfilePage').then(module => ({ default: module.ProfilePage })));
const CheckoutPage = React.lazy(() => import('./CheckoutPage').then(module => ({ default: module.CheckoutPage })));
import { getApiUrl } from '../config/api';
import type { MenuItem, Promotion } from '../types/menu';
import type { Address } from '../types/address';
const logoUrl = '/logo.jpg';

export const MainPage: React.FC = React.memo(() => {
  const { state } = useAuth();
  const { state: cartState } = useCart();
  const { 
    state: menuState, 
    fetchMenu, 
    fetchPromotions,
    getAvailableCategories,
    getActivePromotions,
    getHits,
    getNewItems,
    refreshMenu
  } = useMenu();

  const { t, language, setLanguage } = useLanguage();
  const { favorites, isLoading: favoritesLoading } = useFavorites();
  const [currentView, setCurrentView] = useState<'menu' | 'cart' | 'search' | 'favorites' | 'address' | 'profile'>('menu');
  
  // Логируем изменения currentView (только в dev режиме)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔄 MainPage: currentView changed to:', currentView);
    }
  }, [currentView]);
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Состояния
  const [showLogo, setShowLogo] = useState(true); // Показываем анимацию загрузки при первой загрузке
  const [showOptionsPage, setShowOptionsPage] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [showCheckoutPage, setShowCheckoutPage] = useState(false);
  const [showAutoLocationDetector, setShowAutoLocationDetector] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isWorkingWithAddresses, setIsWorkingWithAddresses] = useState(false);
  const [hasUserSelectedAddress, setHasUserSelectedAddress] = useState(() => {
    // Проверяем localStorage при инициализации
    const saved = localStorage.getItem('hasUserSelectedAddress');
    return saved === 'true';
  });
  const [prefillAddress, setPrefillAddress] = useState<Address | null>(null);
  
  // Логирование изменений (только в dev режиме)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🗺️ MainPage: showMapPicker changed to', showMapPicker);
    }
  }, [showMapPicker]);
  
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🏠 MainPage: isWorkingWithAddresses changed to', isWorkingWithAddresses);
    }
  }, [isWorkingWithAddresses]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [searchFilters, setSearchFilters] = useState({
    category: null as string | null,
    priceRange: [0, 100000] as [number, number],
    isHit: false,
    isNew: false,
    sortBy: 'name' as 'name' | 'price' | 'popularity' | 'newest'
  });
  const [hasScrolledToCategory, setHasScrolledToCategory] = useState(false);

  // Загрузка адресов
  const loadAddresses = async () => {
    try {
      console.log('🗺️ 🔄 Loading addresses in MainPage...');
      const telegramId = state.user?.telegram_id?.toString() || '908758841';
      const url = getApiUrl(`addresses/?telegram_id=${telegramId}`);
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (response.ok) {
        const addressesData = await response.json();
        console.log('🗺️ ✅ Addresses loaded in MainPage:', addressesData);
        
        // Если у пользователя только один адрес и он не основной, делаем его основным
        if (addressesData.length === 1 && !addressesData[0].is_primary) {
          console.log('🗺️ 🔧 Single address found, making it primary');
          addressesData[0].is_primary = true;
        }
        
        setAddresses(addressesData);
      } else {
        console.error('🗺️ ❌ Failed to load addresses in MainPage:', response.status);
      }
    } catch (error) {
      console.error('🗺️ ❌ Error loading addresses in MainPage:', error);
    }
  };



  // Загружаем адреса при монтировании
  useEffect(() => {
    if (state.user) {
      loadAddresses();
    }
  }, [state.user]);

  // Автоматически переходим на адреса для новых пользователей без адресов
  useEffect(() => {
    if (addresses.length === 0 && !showLogo && currentView !== 'address' && !hasUserSelectedAddress) {
      console.log('🗺️ 🔄 New user detected - switching to address view automatically');
      setCurrentView('address');
    }
  }, [addresses.length, showLogo, currentView, hasUserSelectedAddress]);

  // Автоматически показываем определение местоположения для новых пользователей или при несовпадении адресов
  useEffect(() => {
    const checkAndShowAutoLocationDetector = async () => {
      console.log('📍 🔍 AutoLocationDetector check:', {
        hasUser: !!state.user,
        addressesCount: addresses.length,
        showLogo,
        showAutoLocationDetector,
        showMapPicker,
        isWorkingWithAddresses,
        hasUserSelectedAddress,
        hasPrimaryAddress: addresses.some(addr => addr.is_primary)
      });
      
      // Если нет адресов, сбрасываем флаг выбора адреса
      if (addresses.length === 0 && hasUserSelectedAddress) {
        console.log('📍 🔄 No addresses found, resetting hasUserSelectedAddress flag');
        setHasUserSelectedAddress(false);
        localStorage.removeItem('hasUserSelectedAddress');
      }
      
      // Не показываем если пользователь уже выбрал адрес (сохранено в localStorage) И есть адреса
      if (hasUserSelectedAddress && addresses.length > 0) {
        console.log('📍 ✅ User already selected address (saved in localStorage) and has addresses - no need to show detector');
        return;
      }
      
      // Не показываем если есть основной адрес
      const hasPrimaryAddress = addresses.some(addr => addr.is_primary);
      if (hasPrimaryAddress) {
        console.log('📍 ✅ Primary address exists - no need to show detector');
        // Сохраняем в localStorage что пользователь выбрал адрес
        setHasUserSelectedAddress(true);
        localStorage.setItem('hasUserSelectedAddress', 'true');
        return;
      }
      
      // Показываем для новых пользователей (нет адресов)
      if (state.user && addresses.length === 0 && !showLogo && !showAutoLocationDetector && !showMapPicker && !isWorkingWithAddresses) {
        console.log('📍 🔄 New user detected - showing auto location detector');
        setShowAutoLocationDetector(true);
        return;
      }
      
      // Если есть адреса, но нет основного адреса - показываем выбор адреса вместо определения местоположения
      if (state.user && addresses.length > 0 && !hasPrimaryAddress && !showLogo && !showAutoLocationDetector && !showMapPicker && !isWorkingWithAddresses) {
        console.log('📍 🔍 User has addresses but no primary address - showing address selection');
        setCurrentView('address');
        setIsWorkingWithAddresses(true);
        // Сохраняем что пользователь выбрал адрес (через выбор из списка)
        setHasUserSelectedAddress(true);
        localStorage.setItem('hasUserSelectedAddress', 'true');
        return;
      }
    };
    
    checkAndShowAutoLocationDetector();
  }, [state.user, addresses.length, showLogo, showAutoLocationDetector, showMapPicker, isWorkingWithAddresses, hasUserSelectedAddress]);

  // Обработчики для AutoLocationDetector
  const handleAddressDetected = (address: Address | null) => {
    if (address) {
      console.log('📍 Address detected:', address);
      // Добавляем адрес в список
      setAddresses(prev => [...prev, address]);
      // Перезагружаем адреса
      loadAddresses();
    }
    // Устанавливаем флаг что пользователь выбрал адрес и сохраняем в localStorage
    setHasUserSelectedAddress(true);
    localStorage.setItem('hasUserSelectedAddress', 'true');
    setShowAutoLocationDetector(false);
  };

  const handleShowMap = () => {
    console.log('🗺️ MainPage.handleShowMap called');
    setShowAutoLocationDetector(false);
    setCurrentView('address');
    setShowMapPicker(true);
    setIsWorkingWithAddresses(true);
    // НЕ сбрасываем флаг выбора адреса, так как пользователь уже выбрал способ выбора адреса
    console.log('🗺️ MainPage.handleShowMap - setShowMapPicker(true)');
  };

  const handleCloseAutoLocationDetector = () => {
    setShowAutoLocationDetector(false);
    setCurrentView('address');
    setIsWorkingWithAddresses(true);
    // Устанавливаем флаг что пользователь выбрал адрес (закрыл модал)
    setHasUserSelectedAddress(true);
    localStorage.setItem('hasUserSelectedAddress', 'true');
  };

  // Обработчик для показа формы добавления адреса
  const handleShowForm = (address: Address) => {
    console.log('📍 📝 MainPage.handleShowForm called with address:', address);
    setShowAutoLocationDetector(false);
    setCurrentView('address');
    setIsWorkingWithAddresses(true);
    setHasUserSelectedAddress(true);
    
    // Устанавливаем адрес для предзаполнения формы
    setPrefillAddress(address);
  };

  // Обработчик для очистки prefillAddress
  const handleClearPrefillAddress = () => {
    console.log('📍 📝 MainPage.handleClearPrefillAddress called');
    setPrefillAddress(null);
  };

  // Функция для сброса выбора адреса (для новых пользователей или смены аккаунта)
  // const resetAddressSelection = () => {
  //   setHasUserSelectedAddress(false);
  //   localStorage.removeItem('hasUserSelectedAddress');
  //   console.log('📍 Address selection reset');
  // };

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
    const OPEN_TIME = 10; // 8:00 утра
    const CLOSE_TIME = 7; // 4:00 утра следующего дня
    
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
      message = t('open_until_3am');
      timeLeft = t('open_all_night');
    } else if (currentHour < CLOSE_TIME) {
      // До 4:00 утра - ресторан еще работает (открылся вчера в 8:00)
      isOpen = true;
      message = t('open_until_3am');
      timeLeft = t('open_all_night');
    } else {
      // Между 4:00 и 8:00 - ресторан закрыт
      isOpen = false;
      message = t('opens_at_10');
      
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
    // Загружаем данные сразу при монтировании компонента для более быстрой загрузки
    const loadData = async () => {
      await fetchMenu();
      await fetchPromotions();
    };
    
    loadData();
  }, []);

  const handleItemSelect = useCallback((item: MenuItem, size?: any, addOns?: any[]) => {
    console.log('Selected item:', item, 'Size:', size, 'AddOns:', addOns);
    
    // Проверяем, есть ли у блюда опции
    const hasOptions = (item.size_options && item.size_options.filter(size => size.is_active).length > 0) ||
                      (item.add_on_options && item.add_on_options.filter(addOn => addOn.is_active).length > 0);
    
    // Если переданы опции (размер или дополнения), добавляем в корзину
    if (size || (addOns && addOns.length > 0)) {
      console.log('Adding item with options to cart:', { item, size, addOns });
      // Здесь можно добавить логику для добавления в корзину с опциями
    } else if (hasOptions) {
      // Если у блюда есть опции, но они не выбраны - открываем OptionsPage
      console.log('Opening OptionsPage for item with options:', item.name);
      setSelectedItem(item);
      setShowOptionsPage(true);
    } else {
      // Если опций нет - добавляем в корзину напрямую
      console.log('Adding item without options directly to cart:', item.name);
      // Здесь можно добавить логику для добавления в корзину без опций
    }
  }, []);

  const handleCategorySelect = (categoryName: string) => {
    console.log('🍽️ Category selected:', categoryName);
    console.log('🍽️ Current activeCategory:', activeCategory);
    
    const isCurrentlyActive = activeCategory === categoryName;
    const newActiveCategory = isCurrentlyActive ? null : categoryName;
    
    console.log('🍽️ Category selection logic:', {
      isCurrentlyActive,
      newActiveCategory,
      willScroll: !isCurrentlyActive
    });
    
    setActiveCategory(newActiveCategory);
    
    // Плавная прокрутка к началу списка блюд при выборе категории
    if (!isCurrentlyActive) {
      // Небольшая задержка для обновления DOM
      setTimeout(() => {
        // Прокручиваем к заголовку выбранной категории
        const categoryHeader = document.getElementById(`category-header-${categoryName}`);
        console.log('🍽️ Scrolling to category header:', `category-header-${categoryName}`, categoryHeader);
        
        if (categoryHeader) {
          // Вычисляем позицию элемента относительно документа
          const rect = categoryHeader.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const elementTop = rect.top + scrollTop;
          
          console.log('🍽️ Element position:', {
            rectTop: rect.top,
            scrollTop: scrollTop,
            elementTop: elementTop,
            currentScrollY: window.scrollY
          });
          
          // Прокручиваем к элементу с небольшим отступом сверху
          window.scrollTo({ 
            top: elementTop - 20, 
            behavior: 'smooth' 
          });
          setHasScrolledToCategory(true);
          console.log('✅ Scrolled to category header with calculated position');
        } else {
          // Fallback: прокручиваем к началу контента меню
          const menuContent = document.querySelector('.animate-fade-in');
          console.log('🍽️ Fallback: scrolling to menu content:', menuContent);
          
          if (menuContent) {
            const rect = menuContent.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const elementTop = rect.top + scrollTop;
            
            window.scrollTo({ 
              top: elementTop - 20, 
              behavior: 'smooth' 
            });
            console.log('✅ Scrolled to menu content with calculated position');
          } else {
            // Fallback: прокручиваем к верху страницы
            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log('✅ Scrolled to top of page');
          }
        }
      }, 100);
    }
  };

  const handlePromotionApply = (promotion: Promotion) => {
    console.log('Applied promotion:', promotion);
  };

  const handleShowAllCategories = () => {
    console.log('🍽️ Show all clicked - returning to full menu');
    setActiveCategory(null);
    
    // Проверяем текущую позицию прокрутки и флаг прокрутки к категории
    const currentScrollY = window.scrollY;
    console.log('🍽️ Show all - scroll info:', {
      currentScrollY,
      hasScrolledToCategory,
      shouldScroll: currentScrollY > 100 || hasScrolledToCategory
    });
    
    // Прокручиваем к началу страницы если пользователь прокрутил вниз ИЛИ была прокрутка к категории
    if (currentScrollY > 100 || hasScrolledToCategory) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setHasScrolledToCategory(false); // Сбрасываем флаг
        console.log('✅ Scrolled to top of page (was scrolled down or had category scroll)');
      }, 100);
    } else {
      console.log('✅ No scroll needed - already near top and no category scroll');
    }
  };

  const handleRefreshMenu = async () => {
    console.log('🔄 Refreshing menu...');
    await refreshMenu();
    
    // Проверяем текущую позицию прокрутки
    const currentScrollY = window.scrollY;
    console.log('🔄 Current scroll position after refresh:', currentScrollY);
    
    // Прокручиваем к началу страницы только если пользователь прокрутил вниз
    if (currentScrollY > 100) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('✅ Menu refreshed and scrolled to top (was scrolled down)');
      }, 100);
    } else {
      console.log('✅ Menu refreshed - no scroll needed (already near top)');
    }
  };

  const handleCloseOptionsPage = () => {
    setShowOptionsPage(false);
    setSelectedItem(null);
  };

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ru' ? 'uz' : 'ru');
  }, [language, setLanguage]);

  // Мемоизируем вычисления для оптимизации производительности
  const availableCategories = useMemo(() => getAvailableCategories() || [], [getAvailableCategories]);
  const activePromotions = useMemo(() => getActivePromotions() || [], [getActivePromotions]);
  const hits = useMemo(() => getHits() || [], [getHits]);
  const newItems = useMemo(() => getNewItems() || [], [getNewItems]);

  // Фильтруем категории по активной
  const filteredCategories = useMemo(() => 
    activeCategory 
      ? availableCategories.filter(cat => cat.name === activeCategory)
      : availableCategories,
    [activeCategory, availableCategories]
  );
    
  // Отладочная информация для категорий
  console.log('🍽️ Category Debug:', {
    activeCategory,
    availableCategories: availableCategories.length,
    filteredCategories: filteredCategories.length,
    filteredCategoryNames: filteredCategories.map(cat => cat.name)
  });

  const totalItems = cartState.items.reduce((sum, item) => sum + item.quantity, 0);

  // Отладочная информация
  console.log('🔍 MainPage Debug:', {
    currentView,
    cartItemsCount: cartState.items.length,
    totalItems,
    cartState
  });


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
    <PageTransition>
      {/* Анимированный логотип при загрузке - показываем только при первой загрузке */}
      {showLogo && (
        <RestaurantLogo 
          showLogo={showLogo}
          onAnimationComplete={() => {
            console.log('🎉 Logo animation completed!');
            setShowLogo(false);
          }}
        />
      )}
      
      <div className="tg-webapp bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 pt-5">
      <div className="max-w-4xl mx-auto p-4 tg-safe-top tg-safe-bottom">
        {/* Современный хедер с темной темой */}
        

        {/* Быстрые действия с темной темой */}
        {/* Убрали кнопки - теперь они в нижней навигации */}

        {/* Основной контент - показывается всегда */}
        {(
          <>
            {/* OptionsPage - показывается вместо основного контента */}
            {showOptionsPage && selectedItem ? (
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>}>
                <OptionsPage
                  item={selectedItem}
                  onClose={handleCloseOptionsPage}
                />
              </React.Suspense>
            ) : showProfilePage ? (
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>}>
                <ProfilePage
                  onClose={() => setShowProfilePage(false)}
                />
              </React.Suspense>
            ) : showCheckoutPage ? (
              <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div></div>}>
                <CheckoutPage
                  onClose={() => setShowCheckoutPage(false)}
                />
              </React.Suspense>
            ) : showAutoLocationDetector && !isWorkingWithAddresses ? (
              <AutoLocationDetector
                onAddressDetected={handleAddressDetected}
                onShowMap={handleShowMap}
                onClose={handleCloseAutoLocationDetector}
                onShowForm={handleShowForm}
                existingAddresses={addresses}
              />
            ) : (
              <>
                <div className="animate-slide-up pb-24">
                <div className="tg-card-modern p-4  sm:p-6 mb-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className='flex items-center justify-between w-full'>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-dark-glow animate-dark-pulse">
                  <img src={logoUrl} alt="Babay Food" className="w-full h-full object-cover rounded-2xl" />
                </div>
              </div>
              <div className="min-w-0 flex-1 ">
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-xl mr-2 sm:text-2xl font-bold text-gray-100 neon-text leading-tight">
                  Babay Food
                </h1>
                  {/* Номер телефона */}
                  <div className="hidden sm:flex items-center space-x-1 bg-gray-700/50 px-2 py-1 rounded-lg">
                    <span className="text-green-400 text-sm">📱</span>
                    <span className="text-gray-300 text-xs font-medium">{t('phone_number')}</span>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentView('address')}
                  className="text-gray-400 text-xs sm:text-sm leading-tight hover:text-gray-300 transition-colors cursor-pointer"
                >
                  {addresses.length > 0 ? (
                    addresses.find((addr: any) => addr.is_primary)?.full_address || 
                    addresses[0]?.full_address || 
                    t('delivery_address')
                  ) : (
                    t('delivery_address')
                  )}
                </button>
                {/* Номер телефона для мобильных */}
                <div className="sm:hidden flex items-center space-x-1 mt-1">
                  <span className="text-green-400 text-xs">📱</span>
                  <span className="text-gray-400 text-xs">{t('phone_number')}</span>
                </div>
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
                  {/* Блокировка экрана когда ресторан закрыт */}
                  {!restaurantStatus.isOpen && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[9999] flex items-center justify-center p-4">
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
                        
                        
                        
                        {/* Адрес */}
                        <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4 mb-6">
                          <h3 className="text-gray-300 font-semibold mb-3">
                            📍 {t('our_address')}:
                          </h3>
                          <p className="text-gray-400 text-sm leading-relaxed">
                            {t('restaurant_address')}
                            {t('restaurant_address_2')}
                          </p>
                        </div>
                        
                        {/* Контакты */}
                        <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-3">
                          <h3 className="text-gray-300 font-medium mb-3 text-sm">
                            📞 {t('contacts')}:
                          </h3>
                          
                          <div className="space-y-2">
                            {/* Телефоны */}
                            <div className="flex items-center space-x-2">
                              <span className="text-green-400 text-sm">📱</span>
                              <div className="flex-1">
                                <p className="text-gray-300 text-sm font-medium">{t('phone_number')}</p>
                                <p className="text-gray-400 text-xs">{t('restaurant_phone_2')}</p>
                              </div>
                            </div>

                            {/* Социальные сети */}
                            <div className="flex items-center space-x-2">
                              <span className="text-blue-400 text-sm">📱</span>
                              <div className="flex-1">
                                <p className="text-gray-300 text-sm font-medium">Telegram: {t('telegram_contact')}</p>
                                <p className="text-gray-400 text-xs">Быстрая связь и заказы</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className="text-pink-400 text-sm">📷</span>
                              <div className="flex-1">
                                <p className="text-gray-300 text-sm font-medium">Instagram: {t('instagram_contact')}</p>
                                <p className="text-gray-400 text-xs">Новости и акции</p>
                              </div>
                            </div>
                            
                            {/* Время работы */}
                            <div className="pt-2 border-t border-gray-600/50">
                              <div className="flex items-center space-x-2">
                                <span className="text-orange-400 text-sm">⏰</span>
                                <div className="flex-1">
                                  <p className="text-gray-300 text-sm font-medium">{t('support_hours')}</p>
                                  <p className="text-gray-400 text-xs">{t('delivery_info')}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {currentView === 'menu' ? (
                    <>
                      {/* Акции - показываем только если не выбрана категория */}
                      {!activeCategory && activePromotions.length > 0 && (
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

                      {/* Быстрая навигация по категориям - показываем только если не выбрана категория */}
                      {!activeCategory && availableCategories.length > 0 && (
                        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                          <CategoryNavigation
                            categories={availableCategories}
                            activeCategory={activeCategory}
                            onCategorySelect={handleCategorySelect}
                          />
                        </div>
                      )}

                      {/* Хиты - показываем только если не выбрана категория */}
                      {!activeCategory && hits.length > 0 && (
                        <div className="animate-slide-up">
                          <FeaturedSection
                            title={`🔥 ${t('hits')}`}
                            items={hits}
                            onItemSelect={handleItemSelect}
                          />
                        </div>
                      )}

                      {/* Новинки - показываем только если не выбрана категория */}
                      {!activeCategory && newItems.length > 0 && (
                        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                          <FeaturedSection
                            title={`✨ ${t('new_items')}`}
                            items={newItems}
                            onItemSelect={handleItemSelect}
                          />
                        </div>
                      )}

                      

                      {/* Категории меню */}
                      <div className="animate-fade-in">
                        {filteredCategories.length > 0 ? (
                          <>
                            {!activeCategory && (
                              <div className="mb-4 sm:mb-6">
                                <div className="flex items-center justify-between mb-2">
                                  <h2 className="text-xl sm:text-2xl font-bold text-gray-100 neon-text">
                                    {t('full_menu')}
                                  </h2>
                                  <button
                                    onClick={handleRefreshMenu}
                                    disabled={menuState.isLoading}
                                    className="px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm flex items-center space-x-2"
                                    title="Обновить меню"
                                  >
                                    <span className={menuState.isLoading ? 'animate-spin' : ''}>
                                      {menuState.isLoading ? '⏳' : '🔄'}
                                    </span>
                                    <span className="hidden sm:inline">
                                      {menuState.isLoading ? 'Обновление...' : 'Обновить'}
                                    </span>
                                  </button>
                                </div>
                                <p className="text-gray-400 text-sm">
                                  {t('select_category_or_view_all')}
                                </p>
                              </div>
                            )}
                            
                            {activeCategory && (
                              <div className="mb-4 sm:mb-6" id={`category-header-${activeCategory}`}>
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
                                    onClick={handleShowAllCategories}
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
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                              <Button onClick={handleRefreshMenu} variant="primary" disabled={menuState.isLoading}>
                                <span className="flex items-center">
                                  <span className={`mr-2 ${menuState.isLoading ? 'animate-spin' : ''}`}>
                                    {menuState.isLoading ? '⏳' : '🔄'}
                                  </span>
                                  {t('refresh_menu')}
                                </span>
                              </Button>
                              <Button onClick={handleRefreshMenu} variant="accent" disabled={menuState.isLoading}>
                                <span className="flex items-center">
                                  <span className={`mr-2 ${menuState.isLoading ? 'animate-spin' : ''}`}>
                                    {menuState.isLoading ? '⏳' : '⚡'}
                                  </span>
                                  Принудительное обновление
                                </span>
                              </Button>
                            </div>
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
                            <p className="text-xl font-medium mb-2">
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
                    <AddressManager 
                      addresses={addresses}
                      setAddresses={(newAddresses: Address[]) => setAddresses(newAddresses)}
                      onViewChange={setCurrentView}
                      showMapPicker={showMapPicker}
                      setShowMapPicker={setShowMapPicker}
                      setIsWorkingWithAddresses={setIsWorkingWithAddresses}
                      prefillAddress={prefillAddress || undefined}
                      onClearPrefillAddress={handleClearPrefillAddress}
                      hasUserSelectedAddress={hasUserSelectedAddress}
                    />
                  ) : (
                    <div>
                      <CartDisplay onCheckout={() => setShowCheckoutPage(true)} />
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Фиксированная нижняя навигация - скрыта во время OptionsPage, ProfilePage и CheckoutPage */}
      {!showOptionsPage && !showProfilePage && !showCheckoutPage && !showAutoLocationDetector && (
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

          {/* Кнопка Профиль */}
          <button 
            onClick={() => {
              console.log('👤 Opening profile page');
              setShowProfilePage(true);
            }}
            className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 min-w-[4rem] ${
              showProfilePage 
                ? 'text-primary-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="text-xl mb-1">👤</span>
            <span className="text-xs font-medium">{t('profile')}</span>
          </button>
        </div>
        </div>
        )}
      </div>
    </PageTransition>
  );
});

export default MainPage; 