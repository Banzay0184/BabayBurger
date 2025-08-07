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
  
  return user?.id || null;
};

// Получаем данные пользователя из Telegram
export const getTelegramUser = () => {
  if (!isTelegramWebApp()) return null;
  
  const webApp = (window as any).Telegram.WebApp;
  const user = webApp.initDataUnsafe?.user;
  
  console.log('Получение данных пользователя:', {
    user: user,
    hasUser: !!user,
    initData: webApp.initData?.substring(0, 50) + '...'
  });
  
  return user || null;
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
  const botUsername = 'todobotuz_bot'; // Замените на реальный username бота
  return `https://t.me/${botUsername}?start=${command}`;
};

// Перенаправляем в Telegram бот
export const redirectToTelegramBot = (command: string = '/start'): void => {
  const url = createTelegramBotUrl(command);
  window.open(url, '_blank');
}; 