import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { TelegramUserInfo } from '../components/ui/TelegramUserInfo';
import { TelegramLoginWidget } from '../components/ui/TelegramLoginWidget';
import { DebugInfo } from '../components/ui/DebugInfo';
import { isTelegramWebApp, isInTelegramContext, getTelegramUser, createTestUrl, getTelegramTheme } from '../utils/telegram';
import { telegramAuth, testApiConnection } from '../api/auth';
import { TELEGRAM_CONFIG, getWidgetSettings } from '../config/telegram';
import type { TelegramWidgetUser } from '../types/telegram';

export const AuthPage: React.FC = () => {
  const { state, login, forceLogin, toggleDebugInfo } = useAuth();

  // Проверяем тестовый режим
  const isTestMode = new URLSearchParams(window.location.search).get('test_mode') === 'true';
  
  // Проверяем, запущено ли приложение в браузере (не в Telegram)
  const isInBrowser = !isTelegramWebApp();
  
  // Проверяем, нужно ли показывать виджет в браузере
  const shouldShowWidget = isInBrowser && !isTestMode;
  
  // Проверяем, нужно ли показывать кнопки Telegram Web App
  const shouldShowTelegramButtons = isTelegramWebApp() && !isTestMode;

  // Получаем тему Telegram для адаптации виджета
  const telegramTheme = getTelegramTheme();
  const widgetSettings = getWidgetSettings(telegramTheme);

  // Автоматическая авторизация при загрузке страницы
  useEffect(() => {
    if (!state.isAuthenticated && !state.isLoading && !state.error) {
      // Проверяем контекст Telegram перед авторизацией
      if (isInTelegramContext()) {
        login();
      }
    }
  }, [state.isAuthenticated, state.isLoading, state.error, login]);

  // Получаем данные пользователя Telegram для отображения
  const telegramUser = getTelegramUser();

  // Обработчик авторизации через Telegram Login Widget
  const handleTelegramWidgetAuth = async (widgetData: TelegramWidgetUser) => {
    try {
      console.log('Telegram Widget auth data:', widgetData);
      
      // Используем новую функцию telegramAuth
      const response = await telegramAuth(widgetData);
      
      if (response.success && response.user) {
        // Сохраняем токен если есть
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
        }
        
        // Обновляем состояние авторизации
        login();
      }
    } catch (error: any) {
      console.error('Telegram Widget auth error:', error);
      // Ошибка будет обработана в AuthContext
    }
  };

  // Обработчик ошибок виджета
  const handleWidgetError = (error: string) => {
    console.error('Telegram Widget error:', error);
    // Можно показать уведомление пользователю
  };

  // Тестирование подключения к API
  const handleTestApi = async () => {
    try {
      console.log('Тестируем подключение к API...');
      const result = await testApiConnection();
      alert(`API подключение успешно!\n\nОтвет: ${JSON.stringify(result, null, 2)}`);
    } catch (error: any) {
      console.error('Ошибка тестирования API:', error);
      alert(`Ошибка подключения к API:\n\n${error.message || 'Неизвестная ошибка'}`);
    }
  };

  // Создание тестового URL
  const handleCreateTestUrl = () => {
    const testUrl = createTestUrl({
      id: 987654321,
      first_name: 'Иван',
      last_name: 'Иванов',
      username: 'ivan_test',
      language_code: 'ru',
      is_premium: true
    });
    
    // Копируем URL в буфер обмена
    navigator.clipboard.writeText(testUrl).then(() => {
      alert('Тестовый URL скопирован в буфер обмена!\n\n' + testUrl);
    }).catch(() => {
      alert('Тестовый URL:\n\n' + testUrl);
    });
  };

  // Если загрузка
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Авторизация...</p>
        </div>
      </div>
    );
  }

  // Если ошибка
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Babay Burger
            </h1>
            <p className="text-gray-600">
              Доставка вкусных бургеров в Бухаре и Кагане
            </p>
          </div>
          
          <ErrorMessage 
            message={state.error} 
            onRetry={login}
            className="mb-4"
          />
          
          {/* Информация о контексте Telegram */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Информация о контексте:
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Telegram Web App: {isTelegramWebApp() ? '✅ Доступен' : '❌ Недоступен'}</p>
              <p>• Контекст Telegram: {isInTelegramContext() ? '✅ В контексте' : '❌ Вне контекста'}</p>
              <p>• Данные пользователя: {state.telegramContext.hasUserData ? '✅ Есть' : '❌ Отсутствуют'}</p>
              <p>• Тема: {telegramTheme}</p>
              {isTestMode && <p>• Тестовый режим: ✅ Активен</p>}
            </div>
          </div>
          
          {/* Показываем данные пользователя Telegram если есть */}
          {telegramUser && (
            <TelegramUserInfo user={telegramUser} className="mb-4" />
          )}
          
          {!isTelegramWebApp() && !isTestMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                Это приложение предназначено для использования в Telegram. 
                Откройте его через Telegram Bot или добавьте <code>?test_mode=true</code> к URL для тестирования.
              </p>
            </div>
          )}
          
          {isTestMode && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                🧪 Тестовый режим активен. Используются моковые данные пользователя для разработки.
              </p>
            </div>
          )}
          
          {!isInTelegramContext() && isTelegramWebApp() && !isTestMode && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-800">
                Приложение запущено в Telegram, но данные пользователя отсутствуют. 
                Попробуйте перезапустить приложение.
              </p>
            </div>
          )}
          
          <Button 
            onClick={login} 
            className="w-full"
            loading={state.isLoading}
          >
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  // Если авторизован (должно перенаправить на главную)
  if (state.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Перенаправление...</p>
        </div>
      </div>
    );
  }

  // Начальное состояние - показываем информацию о контексте
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Babay Burger
          </h1>
          <p className="text-gray-600">
            Доставка вкусных бургеров в Бухаре и Кагане
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Авторизация
            </h2>
            <p className="text-sm text-gray-600">
              Выберите способ авторизации
            </p>
          </div>
          
          {/* Показываем кнопку авторизации для Telegram Web App */}
          {shouldShowTelegramButtons && (
            <div className="space-y-2 mb-4">
              <Button 
                onClick={login} 
                className="w-full"
                loading={state.isLoading}
                disabled={!isInTelegramContext()}
              >
                {isInTelegramContext() ? 'Войти через Telegram' : 'Попробовать авторизацию'}
              </Button>
              
              {/* Кнопка принудительной авторизации */}
              {!isInTelegramContext() && (
                <Button 
                  onClick={forceLogin} 
                  className="w-full"
                  loading={state.isLoading}
                  variant="secondary"
                >
                  Принудительная авторизация
                </Button>
              )}
            </div>
          )}
          
          {/* Если в браузере - показываем улучшенный Telegram Login Widget */}
          {shouldShowWidget && (
            <TelegramLoginWidget
              botName={TELEGRAM_CONFIG.BOT_NAME}
              onAuth={handleTelegramWidgetAuth}
              onError={handleWidgetError}
              className="mb-4"
              size={widgetSettings.size}
              requestAccess={widgetSettings.requestAccess}
              lang={widgetSettings.lang}
              radius={widgetSettings.radius}
              cornerRadius={widgetSettings.cornerRadius}
              theme={widgetSettings.theme}
            />
          )}
          
          {/* Информация о контексте */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Статус подключения:
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Telegram Web App: {isTelegramWebApp() ? '✅ Доступен' : '❌ Недоступен'}</p>
              <p>• Контекст Telegram: {isInTelegramContext() ? '✅ В контексте' : '❌ Вне контекста'}</p>
              <p>• Данные пользователя: {state.telegramContext.hasUserData ? '✅ Есть' : '❌ Отсутствуют'}</p>
              <p>• Тема: {telegramTheme}</p>
              {isTestMode && <p>• Тестовый режим: ✅ Активен</p>}
            </div>
          </div>
          
          {/* Компонент диагностики */}
          <DebugInfo
            logs={state.debugLogs}
            isVisible={state.showDebugInfo}
            onToggle={toggleDebugInfo}
            onClear={() => {}} // clearDebugLogs removed
            className="mt-4"
          />
          
          {/* Детальная диагностика */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Детальная диагностика:
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• В браузере: {isInBrowser ? '✅ Да' : '❌ Нет'}</p>
              <p>• В Telegram Web App: {isTelegramWebApp() ? '✅ Да' : '❌ Нет'}</p>
              <p>• Тестовый режим: {isTestMode ? '✅ Активен' : '❌ Неактивен'}</p>
              <p>• Показывать виджет: {shouldShowWidget ? '✅ Да' : '❌ Нет'}</p>
              <p>• Показывать кнопку: {shouldShowTelegramButtons ? '✅ Да' : '❌ Нет'}</p>
              <p>• Настройки виджета: {JSON.stringify(widgetSettings)}</p>
            </div>
          </div>
          
          {/* Показываем данные пользователя Telegram если есть */}
          {telegramUser && (
            <TelegramUserInfo user={telegramUser} className="mb-4" />
          )}
          
          {!isTelegramWebApp() && !isTestMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                Это приложение предназначено для использования в Telegram. 
                Откройте его через Telegram Bot или добавьте <code>?test_mode=true</code> к URL для тестирования.
              </p>
            </div>
          )}
          
          {isTestMode && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                🧪 Тестовый режим активен. Используются моковые данные пользователя для разработки.
              </p>
            </div>
          )}
          
          {!isInTelegramContext() && isTelegramWebApp() && !isTestMode && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-800">
                Приложение запущено в Telegram, но данные пользователя отсутствуют. 
                Попробуйте перезапустить приложение или обратитесь к администратору.
              </p>
            </div>
          )}
          
          {/* Кнопки для тестирования */}
          <div className="space-y-2">
            {/* Альтернативная кнопка для тестового режима */}
            {isTestMode && (
              <Button 
                onClick={login} 
                className="w-full"
                loading={state.isLoading}
              >
                Войти в тестовом режиме
              </Button>
            )}
            
            {/* Кнопка для создания тестового URL */}
            {!isTestMode && (
              <Button 
                onClick={handleCreateTestUrl} 
                className="w-full"
                variant="secondary"
              >
                🧪 Создать тестовый URL
              </Button>
            )}

            {/* Кнопка для тестирования API */}
            <Button 
              onClick={handleTestApi} 
              className="w-full"
              variant="secondary"
            >
              🧪 Тестировать API
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 