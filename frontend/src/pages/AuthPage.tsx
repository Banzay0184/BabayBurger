import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { isInTelegramContext } from '../utils/telegram';
import { useLanguage } from '../context/LanguageContext';
import { PageTransition } from '../components/common/PageTransition';

export const AuthPage: React.FC = () => {
  const { state, loginWithTelegram, loginAsGuest } = useAuth();
  const { t } = useLanguage();
  const isTelegram = isInTelegramContext();
  const [authMode, setAuthMode] = useState<'telegram' | 'guest'>(isTelegram ? 'telegram' : 'guest');

  const handleTelegramLogin = () => {
    loginWithTelegram();
  };

  const handleGuestLogin = () => {
    loginAsGuest();
  };

  // Автоматический гостевой вход для веб-версии
  React.useEffect(() => {
    if (!isTelegram && !state.isAuthenticated && !state.isLoading) {
      console.log('🖥️ Автоматический гостевой вход для веб-версии');
      loginAsGuest();
    }
  }, [isTelegram, state.isAuthenticated, state.isLoading, loginAsGuest]);

  if (state.isLoading) {
    return (
      <div className="tg-webapp flex items-center justify-center tg-safe-top tg-safe-bottom bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-accent-500 rounded-full animate-spin mx-auto" style={{ animationDelay: '-0.5s' }}></div>
          </div>
          <p className="text-gray-300 text-lg font-medium">Загрузка...</p>
          <p className="text-gray-500 text-sm mt-2">Подготавливаем приложение</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="tg-webapp flex items-center justify-center tg-safe-top tg-safe-bottom bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center animate-slide-up">
          <div className="mb-8">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center mx-auto shadow-dark-glow animate-dark-pulse">
                <span className="text-4xl">🍔</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">🔥</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-100 mb-4 neon-text">
              Babay Burger
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              Войдите в приложение для продолжения
            </p>
            <p className="text-gray-500 text-sm mt-2">
                              {t('delicious_burgers_fast_delivery')}
            </p>
          </div>
        </div>
        
        {state.error && (
          <div className="tg-card-modern p-4 animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-error-500 to-error-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">⚠️</span>
              </div>
              <p className="text-error-300 text-sm font-medium">
                {state.error}
              </p>
            </div>
          </div>
        )}
        
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {isTelegram ? (
            // В Telegram контексте - только Telegram авторизация
            <Button 
              onClick={handleTelegramLogin}
              fullWidth
              size="lg"
              loading={state.isLoading}
              className="animate-scale-in"
            >
              <span className="flex items-center justify-center">
                <span className="mr-2">📱</span>
                Войти через Telegram
              </span>
            </Button>
          ) : (
            // В веб-версии - выбор типа входа
            <>
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setAuthMode('telegram')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    authMode === 'telegram'
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-400 hover:text-gray-300'
                  }`}
                >
                  📱 Telegram
                </button>
                <button
                  onClick={() => setAuthMode('guest')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    authMode === 'guest'
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-gray-400 hover:text-gray-300'
                  }`}
                >
                  👤 Гость
                </button>
              </div>
              
              {authMode === 'telegram' ? (
                <Button 
                  onClick={handleTelegramLogin}
                  fullWidth
                  size="lg"
                  loading={state.isLoading}
                  className="animate-scale-in"
                >
                  <span className="flex items-center justify-center">
                    <span className="mr-2">📱</span>
                    Войти через Telegram
                  </span>
                </Button>
              ) : (
                <Button 
                  onClick={handleGuestLogin}
                  fullWidth
                  size="lg"
                  loading={state.isLoading}
                  className="animate-scale-in"
                >
                  <span className="flex items-center justify-center">
                    <span className="mr-2">👤</span>
                    Войти как гость
                  </span>
                </Button>
              )}
            </>
          )}
          
          <div className="text-center">
            <p className="text-gray-500 text-xs">
              Нажимая кнопку, вы соглашаетесь с условиями использования
            </p>
          </div>
        </div>
        
        {/* Дополнительная информация для темной темы */}
        <div className="mt-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 glass-dark rounded-xl">
              <span className="text-2xl mb-2 block">🚚</span>
              <p className="text-xs font-medium text-gray-300">{t('fast_delivery')}</p>
            </div>
            <div className="p-4 glass-dark rounded-xl">
              <span className="text-2xl mb-2 block">🍔</span>
              <p className="text-xs font-medium text-gray-300">Вкусные бургеры</p>
            </div>
            <div className="p-4 glass-dark rounded-xl">
              <span className="text-2xl mb-2 block">💳</span>
              <p className="text-xs font-medium text-gray-300">Удобная оплата</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}; 