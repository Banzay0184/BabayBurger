import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../api/types';
import { 
  isTelegramWebApp, 
  isInTelegramContext, 
  getTelegramId, 
  getTelegramUser, 
  initTelegramWebApp 
} from '../utils/telegram';

// Типы для состояния авторизации
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isTelegramContext: boolean;
  isDesktopMode: boolean;
}

// Типы для действий
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_CONTEXT'; payload: { isTelegramContext: boolean; isDesktopMode: boolean } };

// Начальное состояние
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isTelegramContext: false,
  isDesktopMode: false,
};

// Редьюсер для управления состоянием
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_CONTEXT':
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
};

// Контекст авторизации
interface AuthContextType {
  state: AuthState;
  login: () => Promise<void>;
  loginWithTelegram: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Провайдер контекста
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Функция авторизации через Telegram
  const loginWithTelegram = async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // Проверяем контекст Telegram
      if (!isInTelegramContext()) {
        throw new Error('Пожалуйста, откройте приложение через Telegram');
      }

      // Инициализируем Telegram Web App
      initTelegramWebApp();

      // Получаем данные пользователя из Telegram
      const telegramId = getTelegramId();
      const telegramUser = getTelegramUser();

      console.log('🔍 Данные из Telegram Web App:', {
        telegramId,
        telegramUser,
        hasId: !!telegramId,
        hasUser: !!telegramUser
      });

      // Если данные не получены, создаем тестовые данные
      let finalUserId = telegramId;
      let finalUserData = telegramUser;

      if (!telegramId || !telegramUser) {
        console.log('⚠️ Данные пользователя не получены, пытаемся получить из URL');
        
        // Попробуем получить ID из URL параметров
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const userParam = urlParams.get('user');
          
          if (userParam) {
            const userData = JSON.parse(decodeURIComponent(userParam));
            console.log('✅ Данные пользователя получены из URL:', userData);
            finalUserId = userData.id;
            finalUserData = userData;
          } else {
            // Попробуем получить из URL hash
            const url = window.location.href;
            if (url.includes('tgWebAppData=')) {
              const urlParams = new URLSearchParams(window.location.hash.substring(1));
              const tgWebAppData = urlParams.get('tgWebAppData');
              
              if (tgWebAppData) {
                console.log('🔍 Найдены данные в URL hash:', tgWebAppData);
                
                // Парсим данные из URL
                const decodedData = decodeURIComponent(tgWebAppData);
                const dataParams = new URLSearchParams(decodedData);
                const userParam = dataParams.get('user');
                
                if (userParam) {
                  const userData = JSON.parse(userParam);
                  console.log('✅ Данные пользователя получены из URL hash:', userData);
                  finalUserId = userData.id;
                  finalUserData = userData;
                }
              }
            }
            

          }
        } catch (error) {
          console.log('❌ Ошибка получения данных из URL:', error);
          throw new Error('Не удалось получить данные пользователя из URL');
        }
      }

      console.log('🔐 Авторизация через Telegram:', {
        telegram_id: finalUserId,
        first_name: finalUserData.first_name,
        last_name: finalUserData.last_name,
        username: finalUserData.username,
        language_code: finalUserData.language_code,
        is_premium: finalUserData.is_premium,
        url: window.location.href,
        hasTelegramId: !!finalUserId,
        hasUserData: !!finalUserData
      });

      // Проверяем корректность ID
      if (!finalUserId) {
        throw new Error('Не удалось получить корректный ID пользователя');
      }

      // Убеждаемся, что ID является числом
      const userId = typeof finalUserId === 'string' ? parseInt(finalUserId, 10) : finalUserId;
      if (isNaN(userId)) {
        throw new Error('ID пользователя должен быть числом');
      }

      // Создаем данные для авторизации
      const authData = {
        id: userId, // API ожидает id
        first_name: finalUserData.first_name,
        last_name: finalUserData.last_name || '',
        username: finalUserData.username || '',
        language_code: finalUserData.language_code || 'ru',
        is_premium: finalUserData.is_premium || false,
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'telegram_webapp_hash', // В Web App хеш не нужен
        photo_url: finalUserData.photo_url || '',
        allows_write_to_pm: finalUserData.allows_write_to_pm || false
      };

      console.log('📤 Данные для авторизации:', authData);
      console.log('🔍 Проверка данных:', {
        id: authData.id,
        idType: typeof authData.id,
        isValidId: authData.id && authData.id !== undefined
      });

      // Создаем пользователя локально без API вызова
      const user: User = {
        id: userId,
        telegram_id: userId,
        first_name: finalUserData.first_name,
        last_name: finalUserData.last_name || '',
        username: finalUserData.username || '',
        phone_number: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('✅ Создан пользователь локально:', user);
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
      console.log('🎉 Авторизация успешна!');
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка авторизации через Telegram';
      console.error('❌ Ошибка авторизации:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция ручной авторизации (для десктопа)
  const login = async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      throw new Error('Метод login не реализован. Используйте loginWithTelegram для авторизации через Telegram.');
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка авторизации';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция входа как гость
  const loginAsGuest = async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // Создаем гостевого пользователя (используем тестовый telegram_id для API)
      const guestUser: User = {
        id: 5, // ID тестового пользователя
        telegram_id: 908758841, // telegram_id тестового пользователя для API
        first_name: 'Гость',
        last_name: '',
        username: 'guest',
        phone_number: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log('👤 Вход как гость:', guestUser);
      dispatch({ type: 'AUTH_SUCCESS', payload: guestUser });
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка входа как гость';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция выхода
  const logout = async (): Promise<void> => {
    try {
      // Очищаем локальное хранилище
      localStorage.removeItem('auth_token');
      console.log('✅ Токен удален из localStorage');
    } catch (error: any) {
      console.error('Ошибка при выходе:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  // Функция очистки ошибки
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Проверяем контекст и авторизацию при загрузке
  useEffect(() => {
    const initializeApp = async (): Promise<void> => {
      try {
        // Определяем контекст
        const isTelegram = isTelegramWebApp();
        const isInContext = isInTelegramContext();
        const isDesktop = !isTelegram;
        
        console.log('🔍 Анализ контекста приложения:', {
          isTelegram,
          isInContext,
          isDesktop,
          userAgent: navigator.userAgent,
          url: window.location.href
        });
        
        dispatch({ 
          type: 'SET_CONTEXT', 
          payload: { 
            isTelegramContext: isInContext, 
            isDesktopMode: isDesktop 
          } 
        });

        // Если в Telegram контексте - пробуем автоматическую авторизацию
        if (isInContext) {
          console.log('✅ Автоматическая авторизация в Telegram контексте');
          await loginWithTelegram();
        } else {
          // Для всех остальных случаев - гостевой вход
          console.log('🖥️ Гостевой вход для всех случаев');
          await loginAsGuest();
        }
      } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        // В случае ошибки тоже делаем гостевой вход
        await loginAsGuest();
      }
    };

    initializeApp();
  }, []);

  const value: AuthContextType = {
    state,
    login,
    loginWithTelegram,
    loginAsGuest,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Хук для использования контекста авторизации
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 