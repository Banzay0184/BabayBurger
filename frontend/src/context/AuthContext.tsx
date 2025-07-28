import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../api/types';
import { authApi, telegramAuth } from '../api/auth';
import {
  getTelegramId,
  getTelegramUser,
  initTelegramWebApp,
  isInTelegramContext,
  getTelegramContextInfo
} from '../utils/telegram';
import type { TelegramWidgetUser } from '../types/telegram';

// Типы для состояния авторизации
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  telegramContext: {
    isAvailable: boolean;
    isInContext: boolean;
    hasUserData: boolean;
    message: string;
  };
  // Добавляем состояние для диагностики
  debugLogs: string[];
  showDebugInfo: boolean;
}

// Типы для действий
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_TELEGRAM_CONTEXT'; payload: any }
  | { type: 'ADD_DEBUG_LOG'; payload: string }
  | { type: 'CLEAR_DEBUG_LOGS' }
  | { type: 'TOGGLE_DEBUG_INFO' };

// Начальное состояние
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  telegramContext: {
    isAvailable: false,
    isInContext: false,
    hasUserData: false,
    message: 'Проверка контекста Telegram...'
  },
  debugLogs: [],
  showDebugInfo: false,
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
    case 'SET_TELEGRAM_CONTEXT':
      return {
        ...state,
        telegramContext: action.payload,
      };
    case 'ADD_DEBUG_LOG':
      return {
        ...state,
        debugLogs: [...state.debugLogs, action.payload],
      };
    case 'CLEAR_DEBUG_LOGS':
      return {
        ...state,
        debugLogs: [],
      };
    case 'TOGGLE_DEBUG_INFO':
      return {
        ...state,
        showDebugInfo: !state.showDebugInfo,
      };
    default:
      return state;
  }
};

// Контекст авторизации
interface AuthContextType {
  state: AuthState;
  login: () => Promise<void>;
  forceLogin: () => Promise<void>; // Добавляем принудительную авторизацию
  logout: () => Promise<void>;
  clearError: () => void;
  // Добавляем функции для диагностики
  addDebugLog: (message: string) => void;
  clearDebugLogs: () => void;
  toggleDebugInfo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Провайдер контекста
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Проверка контекста Telegram при загрузке
  useEffect(() => {
    const checkTelegramContext = () => {
      const contextInfo = getTelegramContextInfo();
      dispatch({ type: 'SET_TELEGRAM_CONTEXT', payload: contextInfo });
      console.log('Telegram контекст:', contextInfo);
    };

    checkTelegramContext();
  }, []);

  // Функции для диагностики
  const addDebugLog = (message: string) => {
    dispatch({ type: 'ADD_DEBUG_LOG', payload: message });
  };

  // Функция авторизации через Telegram
  const login = async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      addDebugLog('🚀 Начинаем авторизацию...');

      // Проверяем контекст Telegram
      if (!isInTelegramContext()) {
        addDebugLog('❌ Не в контексте Telegram');
        throw new Error('Пожалуйста, откройте приложение через Telegram');
      }

      addDebugLog('✅ В контексте Telegram');

      // Инициализируем Telegram Web App
      initTelegramWebApp();
      addDebugLog('✅ Telegram Web App инициализирован');

      // Получаем данные пользователя из Telegram
      const telegramId = getTelegramId();
      const telegramUser = getTelegramUser();

      if (!telegramId || !telegramUser) {
        addDebugLog('❌ Не удалось получить данные пользователя');
        throw new Error('Не удалось получить данные пользователя из Telegram. Пожалуйста, откройте приложение через Telegram');
      }

      addDebugLog(`✅ Получены данные пользователя: ${telegramUser.first_name} (ID: ${telegramId})`);

      console.log('Попытка авторизации с данными:', {
        telegram_id: telegramId,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        username: telegramUser.username
      });

      // Создаем данные для авторизации через виджет
      const widgetUserData: TelegramWidgetUser = {
        id: telegramId,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name || '',
        username: telegramUser.username || '',
        language_code: telegramUser.language_code || 'ru',
        is_premium: telegramUser.is_premium || false,
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'telegram_webapp_hash', // В Web App хеш не нужен
        photo_url: '',
        allows_write_to_pm: false
      };

      addDebugLog('📤 Отправляем данные на сервер...');
      console.log('Данные для авторизации:', widgetUserData);

      // Отправляем запрос на авторизацию через виджет
      const response = await telegramAuth(widgetUserData);

      addDebugLog('✅ Получен ответ от сервера');

      // Сохраняем токен если он есть
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        addDebugLog('✅ Токен сохранен');
      }

      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
      addDebugLog('🎉 Авторизация успешна!');
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка авторизации';
      addDebugLog(`❌ Ошибка авторизации: ${errorMessage}`);
      console.error('Ошибка авторизации:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Принудительная авторизация без проверки данных пользователя
  const forceLogin = async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      initTelegramWebApp();

      // Пробуем получить данные пользователя любым способом
      const telegramId = getTelegramId();
      const telegramUser = getTelegramUser();

      if (telegramId && telegramUser) {
        // Если есть данные пользователя, используем обычную авторизацию
        console.log('Принудительная авторизация с данными:', { telegram_id: telegramId, first_name: telegramUser.first_name });
        const response = await authApi.telegramAuth({ telegram_id: telegramId, first_name: telegramUser.first_name, last_name: telegramUser.last_name, username: telegramUser.username });
        if (response.token) { localStorage.setItem('auth_token', response.token); }
        dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
      } else {
        // Если данных нет, создаем тестового пользователя
        console.log('Принудительная авторизация без данных пользователя');
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
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка принудительной авторизации';
      console.error('Ошибка принудительной авторизации:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция выхода
  const logout = async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_LOGOUT' });
      await authApi.logout();
    } catch (error: any) {
      console.error('Ошибка при выходе:', error);
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  // Функция очистки ошибки
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const isValid = await authApi.validateToken();
        if (isValid) {
          const user = await authApi.getCurrentUser();
          dispatch({ type: 'AUTH_SUCCESS', payload: user });
        } else {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };

    checkAuth();
  }, []);

  const value: AuthContextType = {
    state,
    login,
    forceLogin,
    logout,
    clearError,
    addDebugLog: (message: string) => dispatch({ type: 'ADD_DEBUG_LOG', payload: message }),
    clearDebugLogs: () => dispatch({ type: 'CLEAR_DEBUG_LOGS' }),
    toggleDebugInfo: () => dispatch({ type: 'TOGGLE_DEBUG_INFO' }),
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