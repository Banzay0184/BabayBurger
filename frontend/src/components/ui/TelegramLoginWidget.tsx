import React, { useEffect, useRef } from 'react';
import { TELEGRAM_CONFIG, getWidgetAuthUrl } from '../../config/telegram';

interface TelegramLoginWidgetProps {
  botName?: string;
  onAuth: (user: any) => void;
  className?: string;
}

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: any) => void;
    };
  }
}

export const TelegramLoginWidget: React.FC<TelegramLoginWidgetProps> = ({
  botName = TELEGRAM_CONFIG.BOT_NAME,
  onAuth,
  className = ''
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Загружаем Telegram Login Widget скрипт
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', TELEGRAM_CONFIG.WIDGET_SETTINGS.size);
    script.setAttribute('data-auth-url', getWidgetAuthUrl());
    script.setAttribute('data-request-access', TELEGRAM_CONFIG.WIDGET_SETTINGS.requestAccess);
    script.setAttribute('data-lang', TELEGRAM_CONFIG.WIDGET_SETTINGS.lang);
    script.setAttribute('data-radius', TELEGRAM_CONFIG.WIDGET_SETTINGS.radius);
    
    // Обработчик успешной авторизации
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    
    // Добавляем глобальную функцию для обработки авторизации
    (window as any).onTelegramAuth = (user: any) => {
      console.log('Telegram Login Widget auth:', user);
      onAuth(user);
    };

    // Добавляем скрипт в DOM
    if (widgetRef.current) {
      widgetRef.current.appendChild(script);
    }

    // Очистка при размонтировании
    return () => {
      if (widgetRef.current && script.parentNode) {
        widgetRef.current.removeChild(script);
      }
      delete (window as any).onTelegramAuth;
    };
  }, [botName, onAuth]);

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
      
      <div 
        ref={widgetRef} 
        className="flex justify-center"
        id="telegram-login-widget"
      />
      
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Нажимая кнопку, вы соглашаетесь с условиями использования
        </p>
      </div>
    </div>
  );
}; 