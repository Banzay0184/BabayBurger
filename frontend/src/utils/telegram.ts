// Утилиты для работы с Telegram Web App

// Проверяем, запущено ли приложение в Telegram Web App
export const isTelegramWebApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Проверяем наличие Telegram объекта
  if (!('Telegram' in window) || !('WebApp' in (window as any).Telegram)) {
    return false;
  }
  
  const webApp = (window as any).Telegram.WebApp;
  
  // Проверяем, что WebApp действительно инициализирован
  if (!webApp || typeof webApp.ready !== 'function') {
    return false;
  }
  
  // Проверяем, что мы в реальном Telegram контексте
  // В браузере initData будет пустым или отсутствовать
  const hasInitData = webApp.initData && webApp.initData.length > 0;
  const hasUserData = webApp.initDataUnsafe?.user;
  
  return hasInitData || hasUserData;
};

// Проверяем, есть ли данные пользователя в контексте Telegram
export const isInTelegramContext = (): boolean => {
  if (!isTelegramWebApp()) return false;
  
  const webApp = (window as any).Telegram.WebApp;
  
  // Проверяем наличие данных пользователя
  const user = webApp.initDataUnsafe?.user;
  
  // Дополнительная проверка - в браузере initData обычно пустой
  const hasInitData = webApp.initData && webApp.initData.length > 0;
  
  console.log('Telegram контекст проверка:', {
    user: !!user,
    hasInitData: hasInitData,
    initDataLength: webApp.initData?.length || 0,
    platform: webApp.platform,
    isExpanded: webApp.isExpanded
  });
  
  return !!(user || hasInitData);
};

// Получаем ID пользователя из Telegram
export const getTelegramId = (): number | null => {
  if (!isTelegramWebApp()) return null;
  
  const webApp = (window as any).Telegram.WebApp;
  const user = webApp.initDataUnsafe?.user;
  
  console.log('🔍 Получение Telegram ID:', {
    hasWebApp: !!webApp,
    hasInitDataUnsafe: !!webApp.initDataUnsafe,
    hasUser: !!user,
    userId: user?.id,
    userData: user,
    initData: webApp.initData?.substring(0, 200) + '...',
    initDataUnsafe: webApp.initDataUnsafe
  });
  
  // Если ID есть в WebApp
  if (user?.id) {
    console.log('✅ ID получен из WebApp:', user.id);
    return user.id;
  }
  
  // Попробуем получить из initData
  if (webApp.initData) {
    try {
      const initDataParams = new URLSearchParams(webApp.initData);
      const userParam = initDataParams.get('user');
      
      if (userParam) {
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log('✅ ID получен из initData:', userData.id);
        return userData.id;
      }
    } catch (error) {
      console.log('❌ Ошибка парсинга initData для ID:', error);
    }
  }
  
  // Попробуем получить из URL hash
  try {
    const url = window.location.href;
    if (url.includes('tgWebAppData=')) {
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const tgWebAppData = urlParams.get('tgWebAppData');
      
      if (tgWebAppData) {
        console.log('🔍 Найдены данные в URL для ID:', tgWebAppData);
        
        // Парсим данные из URL
        const decodedData = decodeURIComponent(tgWebAppData);
        const dataParams = new URLSearchParams(decodedData);
        const userParam = dataParams.get('user');
        
        if (userParam) {
          const userData = JSON.parse(userParam);
          console.log('✅ ID пользователя из tgWebAppData:', userData.id);
          return userData.id;
        }
      }
    }
  } catch (error) {
    console.log('❌ Ошибка парсинга URL для ID:', error);
  }
  
  // Альтернативный способ - получение из URL параметров
  try {
    const url = window.location.href;
    
    // Вариант 1: tgWebAppData в hash
    if (url.includes('tgWebAppData=')) {
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const tgWebAppData = urlParams.get('tgWebAppData');
      
      if (tgWebAppData) {
        console.log('🔍 Найдены данные в URL для ID:', tgWebAppData);
        
        // Парсим данные из URL
        const decodedData = decodeURIComponent(tgWebAppData);
        const dataParams = new URLSearchParams(decodedData);
        const userParam = dataParams.get('user');
        
        if (userParam) {
          const userData = JSON.parse(userParam);
          console.log('✅ ID пользователя из tgWebAppData:', userData.id);
          return userData.id;
        }
      }
    }
    
    // Вариант 2: user параметр в URL
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    
    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log('✅ ID пользователя из user параметра:', userData.id);
        return userData.id;
      } catch (e) {
        console.log('❌ Не удалось распарсить user параметр для ID');
      }
    }
    
    // Вариант 3: Парсим из полного URL
    const userMatch = url.match(/user%3D([^%&]+)/);
    if (userMatch) {
      try {
        const userData = JSON.parse(decodeURIComponent(userMatch[1]));
        console.log('✅ ID пользователя из URL regex:', userData.id);
        return userData.id;
      } catch (e) {
        console.log('❌ Не удалось распарсить ID из URL regex');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка парсинга ID из URL:', error);
  }
  
  return null;
};

// Получаем данные пользователя из Telegram
export const getTelegramUser = () => {
  if (!isTelegramWebApp()) return null;
  
  const webApp = (window as any).Telegram.WebApp;
  const user = webApp.initDataUnsafe?.user;
  
  console.log('🔍 Получение данных пользователя:', {
    hasWebApp: !!webApp,
    hasInitDataUnsafe: !!webApp.initDataUnsafe,
    hasUser: !!user,
    user: user,
    initDataLength: webApp.initData?.length || 0,
    initDataPreview: webApp.initData?.substring(0, 200) + '...'
  });
  
  // Если данные пользователя есть в WebApp
  if (user) {
    console.log('✅ Данные пользователя получены из WebApp:', user);
    return user;
  }
  
  // Попробуем получить из initData
  if (webApp.initData) {
    try {
      const initDataParams = new URLSearchParams(webApp.initData);
      const userParam = initDataParams.get('user');
      
      if (userParam) {
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log('✅ Данные пользователя получены из initData:', userData);
        return userData;
      }
    } catch (error) {
      console.log('❌ Ошибка парсинга initData для данных пользователя:', error);
    }
  }
  
  // Альтернативный способ - получение из URL параметров
  try {
    // Проверяем разные варианты URL параметров
    const url = window.location.href;
    console.log('🔗 Анализ URL:', url);
    
    // Вариант 1: tgWebAppData в hash
    if (url.includes('tgWebAppData=')) {
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const tgWebAppData = urlParams.get('tgWebAppData');
      
      if (tgWebAppData) {
        console.log('🔍 Найдены данные в tgWebAppData:', tgWebAppData);
        
        // Парсим данные из URL
        const decodedData = decodeURIComponent(tgWebAppData);
        const dataParams = new URLSearchParams(decodedData);
        const userParam = dataParams.get('user');
        
        if (userParam) {
          const userData = JSON.parse(userParam);
          console.log('✅ Данные пользователя из tgWebAppData:', userData);
          return userData;
        }
      }
    }
    
    // Вариант 2: user параметр в URL
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    
    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log('✅ Данные пользователя из user параметра:', userData);
        return userData;
      } catch (e) {
        console.log('❌ Не удалось распарсить user параметр:', userParam);
      }
    }
    
    // Вариант 3: Парсим из полного URL
    const userMatch = url.match(/user%3D([^%&]+)/);
    if (userMatch) {
      try {
        const userData = JSON.parse(decodeURIComponent(userMatch[1]));
        console.log('✅ Данные пользователя из URL regex:', userData);
        return userData;
      } catch (e) {
        console.log('❌ Не удалось распарсить данные из URL regex');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка парсинга данных из URL:', error);
  }
  
  return null;
};

// Инициализируем Telegram Web App
export const initTelegramWebApp = (): void => {
  if (!isTelegramWebApp()) {
    console.log('Telegram Web App недоступен для инициализации');
    return;
  }
  
  const webApp = (window as any).Telegram.WebApp;
  
  try {
    webApp.ready();
    webApp.expand();
    console.log('Telegram Web App инициализирован');
  } catch (error) {
    console.error('Ошибка инициализации Telegram Web App:', error);
  }
};

// Получаем параметры запуска
export const getStartParam = (): string => {
  if (!isTelegramWebApp()) return '';
  
  const webApp = (window as any).Telegram.WebApp;
  return webApp.initDataUnsafe?.start_param || '';
};

// Создаем URL для перехода в Telegram бот
export const createTelegramBotUrl = (command: string = '/start'): string => {
  const botUsername = 'babayfooduzbot'; // Замените на реальный username бота
  return `https://t.me/${botUsername}?start=${command}`;
};

// Перенаправляем в Telegram бот
export const redirectToTelegramBot = (command: string = '/start'): void => {
  const url = createTelegramBotUrl(command);
  window.open(url, '_blank');
}; 