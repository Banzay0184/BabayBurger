// Конфигурация API для разных окружений
export const API_CONFIG = {
  // URL API в зависимости от окружения
  BASE_URL: import.meta.env.DEV 
    ? 'http://localhost:8000/api' 
    : 'http://localhost:8000/api', // Временно используем локальный сервер
  
  // URL для авторизации Telegram Widget
  TELEGRAM_WIDGET_URL: import.meta.env.DEV 
    ? 'http://localhost:8000/api/auth/telegram-widget/'
    : 'http://localhost:8000/api/auth/telegram-widget/', // Временно используем локальный сервер
  
  // Таймаут запросов
  TIMEOUT: 30000, // Увеличиваем таймаут для ngrok
  
  // Настройки для разных окружений
  ENV: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    isTest: import.meta.env.MODE === 'test'
  }
};

// Добавляем диагностику конфигурации
console.log('🔧 API Config:', {
  BASE_URL: API_CONFIG.BASE_URL,
  TELEGRAM_WIDGET_URL: API_CONFIG.TELEGRAM_WIDGET_URL,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE
});

// Функция для получения правильного URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
    ? API_CONFIG.BASE_URL 
    : `${API_CONFIG.BASE_URL}/`;
  const url = `${baseUrl}${endpoint}`;
  console.log('🔗 Generated URL:', { baseUrl, endpoint, url });
  return url;
};

// Функция для получения URL авторизации
export const getTelegramAuthUrl = (): string => {
  return API_CONFIG.TELEGRAM_WIDGET_URL;
}; 