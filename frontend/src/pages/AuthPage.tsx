import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TelegramBotButton } from '../components/ui/TelegramBotButton';
import { isTelegramWebApp, isInTelegramContext } from '../utils/telegram';

export const AuthPage: React.FC = () => {
  const { state, login, loginWithTelegram } = useAuth();

  const handleLogin = () => {
    // Если в Telegram контексте - используем Telegram авторизацию
    if (isInTelegramContext()) {
      loginWithTelegram();
    } else {
      // Иначе - ручная авторизация
      login();
    }
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Определяем контекст для отображения
  const isTelegram = isTelegramWebApp();
  const isInContext = isInTelegramContext();
  const isDesktop = !isTelegram;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Babay Burger
          </h1>
          <p className="text-gray-600">
            {isInContext 
              ? 'Автоматическая авторизация через Telegram'
              : isDesktop 
                ? 'Войдите в приложение для продолжения'
                : 'Откройте приложение через Telegram для авторизации'
            }
          </p>
        </div>
        
        {/* Информация о контексте */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            Статус подключения:
          </h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Telegram Web App: {isTelegram ? '✅ Доступен' : '❌ Недоступен'}</p>
            <p>• Контекст Telegram: {isInContext ? '✅ В контексте' : '❌ Вне контекста'}</p>
            <p>• Режим: {isDesktop ? '🖥️ Десктоп' : '📱 Telegram'}</p>
            <p>• URL: {window.location.href}</p>
          </div>
        </div>

        {/* Сообщение об ошибке */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              {state.error}
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Кнопка авторизации */}
          <Button 
            onClick={handleLogin}
            className="w-full"
            size="lg"
            loading={state.isLoading}
          >
            {isInContext 
              ? 'Войти через Telegram'
              : isDesktop 
                ? 'Войти (тестовый режим)'
                : 'Попробовать авторизацию'
            }
          </Button>

          {/* Кнопка для перехода в Telegram бот (только в десктопной версии) */}
          {isDesktop && (
            <TelegramBotButton />
          )}

          {/* Дополнительная информация */}
          {isDesktop && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                🖥️ Вы используете десктопную версию. 
                Для полного функционала откройте приложение через Telegram бота.
              </p>
            </div>
          )}

          {isTelegram && !isInContext && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                📱 Приложение запущено в Telegram, но данные пользователя отсутствуют. 
                Попробуйте перезапустить приложение.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 