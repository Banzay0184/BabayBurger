import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../api/types';
import { authApi } from '../api/auth';
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

      if (!telegramId || !telegramUser) {
        throw new Error('Не удалось получить данные пользователя из Telegram');
      }

      console.log('Авторизация через Telegram:', {
        telegram_id: telegramId,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        username: telegramUser.username
      });

      // Отправляем запрос на авторизацию
      const response = await authApi.telegramAuth({
        telegram_id: telegramId,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name || '',
        username: telegramUser.username || ''
      });

      // Сохраняем токен если он есть
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
      }

      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка авторизации через Telegram';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция ручной авторизации (для десктопа)
  const login = async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // Создаем тестового пользователя для демонстрации
      const testUser: User = {
        id: 1,
        telegram_id: 123456789,
        first_name: 'Тестовый',
        last_name: 'Пользователь',
        username: 'test_user',
        phone_number: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      dispatch({ type: 'AUTH_SUCCESS', payload: testUser });
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка авторизации';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция выхода
  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
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
        } else if (isTelegram && !isInContext) {
          // Telegram Web App доступен, но нет данных пользователя
          console.log('⚠️ Telegram Web App доступен, но нет данных пользователя');
          dispatch({ type: 'AUTH_LOGOUT' });
        } else {
          // Десктопная версия - проверяем существующую авторизацию
          console.log('🖥️ Десктопная версия - проверка существующей авторизации');
          const isValid = await authApi.validateToken();
          if (isValid) {
            const user = await authApi.getCurrentUser();
            dispatch({ type: 'AUTH_SUCCESS', payload: user });
          } else {
            dispatch({ type: 'AUTH_LOGOUT' });
          }
        }
      } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };

    initializeApp();
  }, []);

  const value: AuthContextType = {
    state,
    login,
    loginWithTelegram,
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