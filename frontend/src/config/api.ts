// Конфигурация API для разных окружений
export const API_CONFIG = {
  // URL API в зависимости от окружения
  BASE_URL: import.meta.env.VITE_API_URL || 
    (import.meta.env.DEV 
      ? 'https://ec5b3f679bd2.ngrok-free.app/api/' 
      : 'https://ec5b3f679bd2.ngrok-free.app/api/'),
  
  // URL для авторизации Telegram Widget
  TELEGRAM_WIDGET_URL: import.meta.env.VITE_TELEGRAM_AUTH_URL || 
    (import.meta.env.DEV 
      ? 'https://ec5b3f679bd2.ngrok-free.app/api/auth/telegram-widget/'
      : 'https://ec5b3f679bd2.ngrok-free.app/api/auth/telegram-widget/'),
  
  // Таймаут запросов
  TIMEOUT: 15000, // Увеличиваем таймаут для продакшена
  
  // Настройки для разных окружений
  ENV: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    isTest: import.meta.env.MODE === 'test'
  }
};

// Функция для получения правильного URL
export const getApiUrl = (endpoint: string): string => {
  // Убираем лишние слеши
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
    ? API_CONFIG.BASE_URL 
    : API_CONFIG.BASE_URL + '/';
  
  return `${baseUrl}${cleanEndpoint}`;
};

// Функция для получения URL авторизации
export const getTelegramAuthUrl = (): string => {
  return API_CONFIG.TELEGRAM_WIDGET_URL;
};

// Функция для проверки доступности API
export const checkApiAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}test/`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('❌ API недоступен:', error);
    return false;
  }
}; 