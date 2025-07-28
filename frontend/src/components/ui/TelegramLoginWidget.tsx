import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TELEGRAM_CONFIG, getWidgetAuthUrl } from '../../config/telegram';
import type { TelegramWidgetUser } from '../../types/telegram';

interface TelegramLoginWidgetProps {
  botName?: string;
  onAuth: (user: TelegramWidgetUser) => void;
  onError?: (error: string) => void;
  className?: string;
  size?: 'large' | 'medium' | 'small';
  requestAccess?: 'write' | 'read';
  lang?: string;
  radius?: string;
  cornerRadius?: string;
  theme?: 'light' | 'dark';
}

// Типы для Telegram Login Widget
interface TelegramWidgetConfig {
  botName: string;
  size: string;
  requestAccess: string;
  lang: string;
  radius: string;
  cornerRadius?: string;
  theme?: string;
}

// Глобальные типы для Telegram Widget
declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth: (user: TelegramWidgetUser) => void;
    };
    onTelegramAuth?: (user: TelegramWidgetUser) => void;
    onTelegramWidgetError?: (error: any) => void;
  }
}

export const TelegramLoginWidget: React.FC<TelegramLoginWidgetProps> = ({
  botName = TELEGRAM_CONFIG.BOT_NAME,
  onAuth,
  onError,
  className = '',
  size = TELEGRAM_CONFIG.WIDGET_SETTINGS.size,
  requestAccess = TELEGRAM_CONFIG.WIDGET_SETTINGS.requestAccess,
  lang = TELEGRAM_CONFIG.WIDGET_SETTINGS.lang,
  radius = TELEGRAM_CONFIG.WIDGET_SETTINGS.radius,
  cornerRadius = '8',
  theme = 'light'
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Валидация данных пользователя от Telegram
  const validateTelegramUser = useCallback((user: any): user is TelegramWidgetUser => {
    if (!user || typeof user !== 'object') {
      console.error('Telegram Widget: Неверный формат данных пользователя');
      return false;
    }

    // Проверяем обязательные поля
    const requiredFields = ['id', 'first_name', 'auth_date'];
    for (const field of requiredFields) {
      if (!user[field]) {
        console.error(`Telegram Widget: Отсутствует обязательное поле ${field}`);
        return false;
      }
    }

    // Проверяем типы данных
    if (typeof user.id !== 'number' || user.id <= 0) {
      console.error('Telegram Widget: Неверный ID пользователя');
      return false;
    }

    if (typeof user.first_name !== 'string' || user.first_name.trim() === '') {
      console.error('Telegram Widget: Неверное имя пользователя');
      return false;
    }

    // Проверяем дату авторизации (не старше 24 часов)
    const authDate = parseInt(user.auth_date);
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 часа

    if (isNaN(authDate) || currentTime - authDate > maxAge) {
      console.error('Telegram Widget: Устаревшие данные авторизации');
      return false;
    }

    console.log('Telegram Widget: Данные пользователя валидны:', {
      id: user.id,
      first_name: user.first_name,
      username: user.username,
      auth_date: new Date(authDate * 1000).toISOString()
    });

    return true;
  }, []);

  // Обработчик успешной авторизации
  const handleTelegramAuth = useCallback((user: any) => {
    console.log('Telegram Widget: Получены данные авторизации:', user);

    try {
      // Валидируем данные пользователя
      if (!validateTelegramUser(user)) {
        const errorMsg = 'Получены неверные данные от Telegram';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // Преобразуем данные в нужный формат
      const telegramUser: TelegramWidgetUser = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name || '',
        username: user.username || '',
        language_code: user.language_code || 'ru',
        is_premium: user.is_premium || false,
        auth_date: user.auth_date,
        hash: user.hash,
        // Дополнительные поля для виджета
        photo_url: user.photo_url || '',
        allows_write_to_pm: user.allows_write_to_pm || false
      };

      console.log('Telegram Widget: Авторизация успешна:', telegramUser);
      
      // Вызываем callback с валидными данными
      onAuth(telegramUser);
      setError(null);
    } catch (error) {
      const errorMsg = 'Ошибка обработки данных авторизации';
      console.error('Telegram Widget: Ошибка обработки:', error);
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [validateTelegramUser, onAuth, onError]);

  // Обработчик ошибок виджета
  const handleWidgetError = useCallback((error: any) => {
    const errorMsg = 'Ошибка загрузки Telegram Login Widget';
    console.error('Telegram Widget: Ошибка виджета:', error);
    setError(errorMsg);
    onError?.(errorMsg);
  }, [onError]);

  // Загрузка Telegram Login Widget скрипта
  const loadTelegramWidget = useCallback(() => {
    if (isScriptLoaded || !widgetRef.current) {
      return;
    }

    try {
      // Проверяем, не загружен ли уже скрипт
      if (document.querySelector('script[src*="telegram-widget.js"]')) {
        console.log('Telegram Widget: Скрипт уже загружен');
        setIsScriptLoaded(true);
        return;
      }

      // Создаем конфигурацию виджета
      const widgetConfig: TelegramWidgetConfig = {
        botName,
        size,
        requestAccess,
        lang,
        radius,
        cornerRadius,
        theme
      };

      console.log('Telegram Widget: Загружаем виджет с конфигурацией:', widgetConfig);
      console.log('Telegram Widget: URL авторизации:', getWidgetAuthUrl());

      // Создаем скрипт
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.setAttribute('data-telegram-login', widgetConfig.botName);
      script.setAttribute('data-size', widgetConfig.size);
      script.setAttribute('data-auth-url', getWidgetAuthUrl());
      script.setAttribute('data-request-access', widgetConfig.requestAccess);
      script.setAttribute('data-lang', widgetConfig.lang);
      script.setAttribute('data-radius', widgetConfig.radius);
      
      // Дополнительные настройки
      if (widgetConfig.cornerRadius) {
        script.setAttribute('data-corner-radius', widgetConfig.cornerRadius);
      }
      
      if (widgetConfig.theme) {
        script.setAttribute('data-theme', widgetConfig.theme);
      }

      // Обработчик успешной авторизации
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      
      // Обработчик ошибок
      script.setAttribute('data-onerror', 'onTelegramWidgetError(error)');

      // Устанавливаем глобальные обработчики
      window.onTelegramAuth = handleTelegramAuth;
      window.onTelegramWidgetError = handleWidgetError;

      // Обработчики загрузки скрипта
      script.onload = () => {
        console.log('Telegram Widget: Скрипт успешно загружен');
        setIsScriptLoaded(true);
        setIsLoading(false);
        
        // Проверяем, появился ли виджет через некоторое время
        setTimeout(() => {
          const widgetElement = document.querySelector('[data-telegram-login]');
          console.log('Telegram Widget: Элемент виджета найден:', !!widgetElement);
          if (!widgetElement) {
            console.warn('Telegram Widget: Виджет не появился после загрузки скрипта');
            setError('Виджет не загрузился. Попробуйте обновить страницу.');
            onError?.('Виджет не загрузился');
          }
        }, 2000);
      };

      script.onerror = () => {
        const errorMsg = 'Не удалось загрузить Telegram Login Widget';
        console.error('Telegram Widget: Ошибка загрузки скрипта');
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
      };

      // Добавляем скрипт в DOM
      widgetRef.current.appendChild(script);
      scriptRef.current = script;

      console.log('Telegram Widget: Скрипт добавлен в DOM');

    } catch (error) {
      const errorMsg = 'Ошибка инициализации Telegram Login Widget';
      console.error('Telegram Widget: Ошибка инициализации:', error);
      setError(errorMsg);
      onError?.(errorMsg);
      setIsLoading(false);
    }
  }, [botName, size, requestAccess, lang, radius, cornerRadius, theme, isScriptLoaded, handleTelegramAuth, handleWidgetError, onError]);

  // Таймаут для загрузки скрипта
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        const errorMsg = 'Таймаут загрузки Telegram Login Widget';
        console.warn('Telegram Widget: Таймаут загрузки');
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
      }
    }, 10000); // 10 секунд

    return () => clearTimeout(timeout);
  }, [isLoading, onError]);

  // Загружаем виджет при монтировании
  useEffect(() => {
    loadTelegramWidget();

    // Очистка при размонтировании
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      
      // Удаляем глобальные обработчики
      delete window.onTelegramAuth;
      delete window.onTelegramWidgetError;
    };
  }, [loadTelegramWidget]);

  // Обработчик повторной попытки
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setIsScriptLoaded(false);
    loadTelegramWidget();
  }, [loadTelegramWidget]);

  return (
    <div className={`telegram-login-widget ${className}`}>
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Войти через Telegram
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Используйте свой Telegram аккаунт для быстрой авторизации
        </p>
      </div>
      
      {/* Состояние загрузки */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Загрузка виджета...</span>
        </div>
      )}
      
      {/* Состояние ошибки */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-red-800">{error}</span>
          </div>
          <button
            onClick={handleRetry}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Попробовать снова
          </button>
        </div>
      )}
      
      {/* Контейнер для виджета */}
      <div 
        ref={widgetRef} 
        className="flex justify-center"
        id="telegram-login-widget"
      />
      
      {/* Fallback кнопка если виджет не загрузился */}
      {!isLoading && !isScriptLoaded && !error && (
        <div className="text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 mb-3">
              Telegram Login Widget не загрузился. Попробуйте альтернативный способ:
            </p>
            <button
              onClick={handleRetry}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      )}
      
      {/* Информация о безопасности */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Нажимая кнопку, вы соглашаетесь с условиями использования
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Авторизация происходит через официальный Telegram API
        </p>
      </div>
      
      {/* Отладочная информация в режиме разработки */}
      {import.meta.env.DEV && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
          <p className="font-semibold mb-1">Отладка:</p>
          <p>• Скрипт загружен: {isScriptLoaded ? '✅' : '❌'}</p>
          <p>• Состояние загрузки: {isLoading ? '🔄' : '✅'}</p>
          <p>• Ошибка: {error ? '❌' : '✅'}</p>
          <p>• Бот: {botName}</p>
          <p>• Размер: {size}</p>
          <p>• URL авторизации: {getWidgetAuthUrl()}</p>
          <p>• Контейнер виджета: {widgetRef.current ? '✅' : '❌'}</p>
        </div>
      )}
    </div>
  );
}; 