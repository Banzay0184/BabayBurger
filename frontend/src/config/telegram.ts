// Конфигурация Telegram
export const TELEGRAM_CONFIG = {
  // Имя бота для Telegram Login Widget (без @)
  // Замените на имя вашего бота, созданного через @BotFather
  BOT_NAME: 'BabayBurgerBot', // Измените на имя вашего бота

  // URL для авторизации через виджет
  WIDGET_AUTH_URL: '/api/auth/telegram-widget/',
  
  // Настройки для Telegram Login Widget
  WIDGET_SETTINGS: {
    size: 'large', // 'large', 'medium', 'small'
    requestAccess: 'write', // 'write', 'read'
    lang: 'ru', // 'ru', 'en', etc.
    radius: '8', // радиус кнопки в пикселях
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