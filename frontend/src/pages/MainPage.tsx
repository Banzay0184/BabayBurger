import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { TelegramBotButton } from '../components/ui/TelegramBotButton';
import { isTelegramWebApp, isInTelegramContext } from '../utils/telegram';

export const MainPage: React.FC = () => {
  const { state, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Определяем контекст для отображения
  const isTelegram = isTelegramWebApp();
  const isInContext = isInTelegramContext();
  const isDesktop = !isTelegram;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Babay Burger
            </h1>
            <Button 
              onClick={handleLogout}
              variant="secondary"
              size="sm"
            >
              Выйти
            </Button>
          </div>
          {/* Информация о контексте */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-900 mb-2">
              Статус подключения:
            </h3>
            <div className="text-sm text-green-800 space-y-1">
              <p>• Telegram Web App: {isTelegram ? '✅ Доступен' : '❌ Недоступен'}</p>
              <p>• Контекст Telegram: {isInContext ? '✅ В контексте' : '❌ Вне контекста'}</p>
              <p>• Режим: {isDesktop ? '🖥️ Десктоп' : '📱 Telegram'}</p>
              <p>• Авторизация: {state.isAuthenticated ? '✅ Авторизован' : '❌ Не авторизован'}</p>
            </div>
          </div>
          
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Добро пожаловать!
            </h2>
            <p className="text-gray-600 mb-4">
              Здесь будет основной контент приложения
            </p>
            
            {/* Кнопка для перехода в Telegram бот (только в десктопной версии) */}
            {isDesktop && (
              <div className="mt-6">
                <TelegramBotButton />
              </div>
            )}
            
            {/* Дополнительная информация в зависимости от контекста */}
            {isDesktop && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-800">
                  🖥️ Вы используете десктопную версию. 
                  Для полного функционала откройте приложение через Telegram бота.
                </p>
              </div>
            )}

            {isInContext && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-green-800">
                  📱 Вы авторизованы через Telegram Web App. 
                  Все функции доступны.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 