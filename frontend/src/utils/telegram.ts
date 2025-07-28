import type { TelegramWebApp, TelegramUser } from '../types/telegram';

// Получение экземпляра Telegram Web App
export const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

// Парсинг initData для получения данных пользователя
const parseInitData = (initData: string): TelegramUser | null => {
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    
    if (userStr) {
      const user = JSON.parse(decodeURIComponent(userStr));
      console.log('Пользователь из initData:', user);
      return user;
    }
  } catch (error) {
    console.warn('Ошибка парсинга initData:', error);
  }
  
  return null;
};

// Моковые данные для тестирования в браузере
const getMockUserData = (): TelegramUser | null => {
  // Проверяем, есть ли параметр для тестирования в URL
  const urlParams = new URLSearchParams(window.location.search);
  const testMode = urlParams.get('test_mode');
  const mockUser = urlParams.get('mock_user');
  
  if (testMode === 'true') {
    let mockUserData: TelegramUser;
    
    if (mockUser) {
      try {
        mockUserData = JSON.parse(decodeURIComponent(mockUser));
      } catch (error) {
        console.warn('Ошибка парсинга mock_user, используем стандартные данные');
        mockUserData = {
          id: 123456789,
          first_name: 'Тестовый',
          last_name: 'Пользователь',
          username: 'test_user',
          language_code: 'ru',
          is_premium: false
        };
      }
    } else {
      mockUserData = {
        id: 123456789,
        first_name: 'Тестовый',
        last_name: 'Пользователь',
        username: 'test_user',
        language_code: 'ru',
        is_premium: false
      };
    }
    
    console.log('Используем моковые данные для тестирования:', mockUserData);
    return mockUserData;
  }
  
  return null;
};

// Инициализация Telegram Web App
export const initTelegramWebApp = (): TelegramWebApp | null => {
  const tg = getTelegramWebApp();
  if (tg) {
    // Готовим приложение к отображению
    tg.ready();
    
    // Расширяем на весь экран
    tg.expand();
    
    // Проверяем версию перед установкой цветов
    const version = tg.isVersionAtLeast('6.0') ? '6.0+' : '5.0+';
    console.log('Telegram Web App версия:', version);
    
    // Устанавливаем цвет заголовка только если поддерживается
    try {
      if (tg.isVersionAtLeast('6.0')) {
        tg.setHeaderColor('#0088cc');
      }
    } catch (error) {
      console.warn('setHeaderColor не поддерживается в этой версии');
    }
    
    // Устанавливаем цвет фона только если поддерживается
    try {
      if (tg.isVersionAtLeast('6.0')) {
        tg.setBackgroundColor('#ffffff');
      }
    } catch (error) {
      console.warn('setBackgroundColor не поддерживается в этой версии');
    }
    
    console.log('Telegram Web App initialized');
    return tg;
  }
  
  console.warn('Telegram Web App not available');
  return null;
};

// Получение данных пользователя из Telegram с детальной проверкой
export const getTelegramUser = (): TelegramUser | null => {
  const tg = getTelegramWebApp();
  
  if (!tg) {
    console.warn('Telegram Web App не доступен');
    // Пробуем получить моковые данные для тестирования
    return getMockUserData();
  }

  // Отладочная информация
  console.log('=== ДЕТАЛЬНАЯ ДИАГНОСТИКА ===');
  console.log('initDataUnsafe:', tg.initDataUnsafe);
  console.log('initData:', tg.initData);
  console.log('initDataUnsafe.user:', tg.initDataUnsafe?.user);
  console.log('initDataUnsafe keys:', tg.initDataUnsafe ? Object.keys(tg.initDataUnsafe) : 'null');

  // Сначала пробуем получить из initDataUnsafe
  if (tg.initDataUnsafe) {
    const user = tg.initDataUnsafe.user;
    console.log('Пользователь из initDataUnsafe:', user);

    if (user && user.id && user.first_name) {
      console.log('✅ Данные пользователя получены из initDataUnsafe:', {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username
      });
      return user;
    } else {
      console.log('❌ Данные пользователя в initDataUnsafe неполные:', user);
    }
  } else {
    console.log('❌ initDataUnsafe пустой');
  }

  // Если в initDataUnsafe нет данных, пробуем парсить initData
  if (tg.initData) {
    console.log('Пробуем парсить initData...');
    const user = parseInitData(tg.initData);
    if (user && user.id && user.first_name) {
      console.log('✅ Данные пользователя получены из initData:', {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username
      });
      return user;
    } else {
      console.log('❌ Данные пользователя в initData неполные:', user);
    }
  } else {
    console.log('❌ initData пустой');
  }

  console.warn('❌ Данные пользователя не найдены ни в initDataUnsafe, ни в initData');
  
  // Если нет данных в Telegram, пробуем моковые данные
  return getMockUserData();
};

// Получение telegram_id пользователя с проверкой
export const getTelegramId = (): number | null => {
  const user = getTelegramUser();
  if (!user || !user.id) {
    console.warn('Не удалось получить telegram_id');
    return null;
  }
  return user.id;
};

// Проверка доступности Telegram Web App
export const isTelegramWebApp = (): boolean => {
  const tg = getTelegramWebApp();
  return tg !== null;
};

// Проверка, что приложение запущено в контексте Telegram
export const isInTelegramContext = (): boolean => {
  const tg = getTelegramWebApp();
  if (!tg) {
    // Если нет Telegram Web App, проверяем моковые данные
    return getMockUserData() !== null;
  }
  
  // Проверяем наличие initDataUnsafe или initData
  if (!tg.initDataUnsafe && !tg.initData) {
    // Если нет данных в Telegram, проверяем моковые данные
    return getMockUserData() !== null;
  }
  
  // Проверяем наличие данных пользователя
  const user = getTelegramUser();
  return !!(user && user.id && user.first_name);
};

// Получение темы Telegram (светлая/темная)
export const getTelegramTheme = (): 'light' | 'dark' => {
  const tg = getTelegramWebApp();
  return tg?.colorScheme || 'light';
};

// Показ алерта через Telegram
export const showTelegramAlert = (message: string, callback?: () => void): void => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.showAlert(message, callback);
  } else {
    // Fallback для браузера
    alert(message);
    if (callback) callback();
  }
};

// Показ подтверждения через Telegram
export const showTelegramConfirm = (message: string, callback?: (confirmed: boolean) => void): void => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.showConfirm(message, callback);
  } else {
    // Fallback для браузера
    const confirmed = confirm(message);
    if (callback) callback(confirmed);
  }
};

// Закрытие Web App
export const closeTelegramWebApp = (): void => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.close();
  }
};

// Отправка данных в Telegram
export const sendTelegramData = (data: string): void => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.sendData(data);
  }
};

// Получение параметров запуска
export const getStartParam = (): string | null => {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.start_param || null;
};

// Проверка версии Telegram Web App
export const isVersionSupported = (minVersion: string): boolean => {
  const tg = getTelegramWebApp();
  return tg ? tg.isVersionAtLeast(minVersion) : false;
};

// Получение детальной информации о контексте запуска
export const getTelegramContextInfo = () => {
  const tg = getTelegramWebApp();
  
  if (!tg) {
    const mockUser = getMockUserData();
    if (mockUser) {
      return {
        isAvailable: false,
        isInContext: true,
        hasUserData: true,
        user: mockUser,
        message: 'Тестовый режим - используются моковые данные'
      };
    }
    
    return {
      isAvailable: false,
      isInContext: false,
      hasUserData: false,
      message: 'Telegram Web App недоступен'
    };
  }

  const user = getTelegramUser();
  const hasUserData = !!(user && user.id && user.first_name);
  
  return {
    isAvailable: true,
    isInContext: !!(tg.initDataUnsafe || tg.initData),
    hasUserData,
    user: user,
    message: hasUserData 
      ? 'Приложение запущено в Telegram с данными пользователя'
      : 'Приложение запущено в Telegram, но данные пользователя отсутствуют'
  };
};

// Функция для создания тестового URL с моковыми данными
export const createTestUrl = (userData?: Partial<TelegramUser>): string => {
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  
  params.set('test_mode', 'true');
  
  if (userData) {
    const mockUser: TelegramUser = {
      id: 123456789,
      first_name: 'Тестовый',
      last_name: 'Пользователь',
      username: 'test_user',
      language_code: 'ru',
      is_premium: false,
      ...userData
    };
    
    params.set('mock_user', encodeURIComponent(JSON.stringify(mockUser)));
  }
  
  return `${baseUrl}?${params.toString()}`;
}; 