// Конфигурация API для разных окружений
export const API_CONFIG = {
  // URL API в зависимости от окружения
  BASE_URL: import.meta.env.DEV 
    ? 'http://localhost:8000/api' 
    : 'https://ec5b3f679bd2.ngrok-free.app/api',
  
  // URL для авторизации Telegram Widget
  TELEGRAM_WIDGET_URL: import.meta.env.DEV 
    ? 'http://localhost:8000/api/auth/telegram-widget/'
    : 'https://ec5b3f679bd2.ngrok-free.app/api/auth/telegram-widget/',
  
  // Таймаут запросов
  TIMEOUT: 30000, // Увеличиваем таймаут для ngrok
  
  // Настройки для разных окружений
  ENV: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    isTest: import.meta.env.MODE === 'test'
  }
};

// Функция для получения правильного URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
    ? API_CONFIG.BASE_URL 
    : `${API_CONFIG.BASE_URL}/`;
  return `${baseUrl}${endpoint}`;
};

// Функция для получения URL авторизации
export const getTelegramAuthUrl = (): string => {
  return API_CONFIG.TELEGRAM_WIDGET_URL;
}; 