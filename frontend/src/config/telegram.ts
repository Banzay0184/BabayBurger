// Конфигурация Telegram
export const TELEGRAM_CONFIG = {
  // Имя бота для Telegram Login Widget (без @)
  // Замените на имя вашего бота, созданного через @BotFather
  BOT_NAME: 'BabayBurgerBot', // Измените на имя вашего бота

  // URL для авторизации через виджет
  WIDGET_AUTH_URL: '/api/auth/telegram-widget/',
  
  // Настройки для Telegram Login Widget
  WIDGET_SETTINGS: {
    size: 'large' as const, // 'large', 'medium', 'small'
    requestAccess: 'write' as const, // 'write', 'read'
    lang: 'ru', // 'ru', 'en', etc.
    radius: '8', // радиус кнопки в пикселях
    cornerRadius: '8', // радиус углов кнопки
    theme: 'light' as const, // 'light', 'dark'
    showUserPhoto: true, // показывать фото пользователя
  },

  // Настройки безопасности
  SECURITY: {
    // Максимальный возраст данных авторизации (в секундах)
    MAX_AUTH_AGE: 24 * 60 * 60, // 24 часа
    
    // Таймаут загрузки виджета (в миллисекундах)
    WIDGET_LOAD_TIMEOUT: 10000, // 10 секунд
    
    // Проверять подпись на клиенте (дополнительно к серверной проверке)
    VALIDATE_HASH_CLIENT: false,
  },

  // Настройки для Web App
  WEBAPP: {
    // Цвета темы
    COLORS: {
      primary: '#0088cc',
      secondary: '#1a1a1a',
      background: '#ffffff',
      text: '#000000',
    },
    
    // Версия минимально поддерживаемого Telegram
    MIN_VERSION: '6.0',
  }
};

export const getWidgetAuthUrl = (): string => {
  return `${window.location.origin}${TELEGRAM_CONFIG.WIDGET_AUTH_URL}`;
};

// Функция для получения Web App URL
export const getWebAppUrl = (): string => {
  // Для разработки используем localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://localhost:5173`;
  }

  // Для продакшена используем домен
  return window.location.origin;
};

// Функция для получения настроек виджета в зависимости от темы
export const getWidgetSettings = (theme: 'light' | 'dark' = 'light') => {
  return {
    ...TELEGRAM_CONFIG.WIDGET_SETTINGS,
    theme,
    // Адаптируем радиус для темной темы
    cornerRadius: theme === 'dark' ? '12' : '8',
  };
};

// Функция для валидации данных пользователя на клиенте
export const validateTelegramUserData = (user: any): boolean => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  // Проверяем обязательные поля
  const requiredFields = ['id', 'first_name', 'auth_date', 'hash'];
  for (const field of requiredFields) {
    if (!user[field]) {
      return false;
    }
  }

  // Проверяем типы данных
  if (typeof user.id !== 'number' || user.id <= 0) {
    return false;
  }

  if (typeof user.first_name !== 'string' || user.first_name.trim() === '') {
    return false;
  }

  // Проверяем дату авторизации
  const authDate = parseInt(user.auth_date);
  const currentTime = Math.floor(Date.now() / 1000);
  const maxAge = TELEGRAM_CONFIG.SECURITY.MAX_AUTH_AGE;

  if (isNaN(authDate) || currentTime - authDate > maxAge) {
    return false;
  }

  return true;
}; 