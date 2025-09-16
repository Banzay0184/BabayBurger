import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { User } from '../api/types';
import type { Operator } from '../types/operator';
import { clientApi, operatorApi, cashierApi } from '../api/unifiedClient';
import { 
  isTelegramWebApp, 
  isInTelegramContext, 
  getTelegramId, 
  getTelegramUser, 
  initTelegramWebApp 
} from '../utils/telegram';

// Типы для различных ролей пользователей
export type UserRole = 'client' | 'operator' | 'cashier';

// Типы для состояния авторизации
interface UnifiedAuthState {
  user: User | Operator | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isTelegramContext: boolean;
  isDesktopMode: boolean;
}

// Типы для действий
type UnifiedAuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User | Operator; role: UserRole } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_CONTEXT'; payload: { isTelegramContext: boolean; isDesktopMode: boolean } }
  | { type: 'UPDATE_USER'; payload: User | Operator };

// Начальное состояние
const initialState: UnifiedAuthState = {
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isTelegramContext: false,
  isDesktopMode: false,
};

// Редьюсер для управления состоянием
const unifiedAuthReducer = (state: UnifiedAuthState, action: UnifiedAuthAction): UnifiedAuthState => {
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
        user: action.payload.user,
        role: action.payload.role,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        role: null,
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
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

// Интерфейс контекста
interface UnifiedAuthContextType {
  state: UnifiedAuthState;
  // Методы для клиентов
  loginWithTelegram: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  // Методы для операторов
  loginOperator: (username: string, password: string) => Promise<void>;
  registerOperator: (operatorData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    password_confirm: string;
  }) => Promise<void>;
  // Методы для кассиров
  loginCashier: (username: string, password: string) => Promise<void>;
  // Общие методы
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User | Operator) => void;
  switchRole: (role: UserRole) => void;
}

// Создание контекста
const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

// Провайдер контекста
interface UnifiedAuthProviderProps {
  children: ReactNode;
  defaultRole?: UserRole;
}

export const UnifiedAuthProvider: React.FC<UnifiedAuthProviderProps> = ({ 
  children, 
  defaultRole = 'client' 
}) => {
  const [state, dispatch] = useReducer(unifiedAuthReducer, initialState);

  // Функция авторизации через Telegram (для клиентов)
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
        
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const userParam = urlParams.get('user');
          
          if (userParam) {
            const userData = JSON.parse(decodeURIComponent(userParam));
            console.log('✅ Данные пользователя получены из URL:', userData);
            finalUserId = userData.id;
            finalUserData = userData;
          } else {
            const url = window.location.href;
            if (url.includes('tgWebAppData=')) {
              const urlParams = new URLSearchParams(window.location.hash.substring(1));
              const tgWebAppData = urlParams.get('tgWebAppData');
              
              if (tgWebAppData) {
                console.log('🔍 Найдены данные в URL hash:', tgWebAppData);
                
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

      // Проверяем корректность ID
      if (!finalUserId) {
        throw new Error('Не удалось получить корректный ID пользователя');
      }

      const userId = typeof finalUserId === 'string' ? parseInt(finalUserId, 10) : finalUserId;
      if (isNaN(userId)) {
        throw new Error('ID пользователя должен быть числом');
      }

      // Создаем пользователя локально
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
      dispatch({ type: 'AUTH_SUCCESS', payload: { user, role: 'client' } });
      console.log('🎉 Авторизация успешна!');
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка авторизации через Telegram';
      console.error('❌ Ошибка авторизации:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция входа как гость
  const loginAsGuest = async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const guestUser: User = {
        id: 5,
        telegram_id: 908758841,
        first_name: 'Гость',
        last_name: '',
        username: 'guest',
        phone_number: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log('👤 Вход как гость:', guestUser);
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: guestUser, role: 'client' } });
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка входа как гость';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция входа оператора
  const loginOperator = async (username: string, _password: string): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // Здесь должен быть вызов API для авторизации оператора
      // Пока используем заглушку
      const operator: Operator = {
        id: 1,
        username,
        first_name: 'Оператор',
        last_name: 'Тестовый',
        phone: '+1234567890',
        is_active_operator: true,
        assigned_zones: [],
        assigned_zones_names: '',
        completed_orders_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      dispatch({ type: 'AUTH_SUCCESS', payload: { user: operator, role: 'operator' } });
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка входа оператора';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция регистрации оператора
  const registerOperator = async (operatorData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    password_confirm: string;
  }): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // Здесь должен быть вызов API для регистрации оператора
      // Пока используем заглушку
      const operator: Operator = {
        id: 1,
        username: operatorData.username,
        first_name: operatorData.first_name,
        last_name: operatorData.last_name,
        phone: operatorData.phone,
        is_active_operator: true,
        assigned_zones: [],
        assigned_zones_names: '',
        completed_orders_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      dispatch({ type: 'AUTH_SUCCESS', payload: { user: operator, role: 'operator' } });
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка регистрации оператора';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция входа кассира
  const loginCashier = async (username: string, _password: string): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // Здесь должен быть вызов API для авторизации кассира
      // Пока используем заглушку
      const cashier: any = {
        id: 1,
        username,
        first_name: 'Кассир',
        last_name: 'Тестовый',
        restaurant: {
          id: 1,
          name: 'Тестовый ресторан',
          city: 'Тестовый город'
        }
      };

      dispatch({ type: 'AUTH_SUCCESS', payload: { user: cashier, role: 'cashier' } });
    } catch (error: any) {
      const errorMessage = error.message || 'Ошибка входа кассира';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  // Функция выхода
  const logout = async (): Promise<void> => {
    try {
      // Очищаем токены в зависимости от роли
      switch (state.role) {
        case 'client':
          clientApi.removeToken();
          break;
        case 'operator':
          operatorApi.removeToken();
          break;
        case 'cashier':
          cashierApi.removeToken();
          break;
      }
      
      console.log('✅ Токены удалены из localStorage');
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

  // Функция обновления пользователя
  const updateUser = (user: User | Operator): void => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  // Функция переключения роли
  const switchRole = (role: UserRole): void => {
    // Очищаем текущую авторизацию
    dispatch({ type: 'AUTH_LOGOUT' });
    
    // Переключаемся на новую роль
    if (role === 'client') {
      loginAsGuest();
    }
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

        // Проверяем существующие токены
        const hasClientToken = clientApi.isAuthenticated();
        const hasOperatorToken = operatorApi.isAuthenticated();
        const hasCashierToken = cashierApi.isAuthenticated();

        if (hasClientToken && defaultRole === 'client') {
          // Восстанавливаем сессию клиента
          await loginAsGuest();
        } else if (hasOperatorToken && defaultRole === 'operator') {
          // Восстанавливаем сессию оператора
          // Здесь должен быть вызов API для проверки токена
        } else if (hasCashierToken && defaultRole === 'cashier') {
          // Восстанавливаем сессию кассира
          // Здесь должен быть вызов API для проверки токена
        } else {
          // Автоматическая авторизация в зависимости от контекста
          if (isInContext && defaultRole === 'client') {
            console.log('✅ Автоматическая авторизация в Telegram контексте');
            await loginWithTelegram();
          } else if (defaultRole === 'client') {
            console.log('🖥️ Гостевой вход для всех случаев');
            await loginAsGuest();
          }
        }
      } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        if (defaultRole === 'client') {
          await loginAsGuest();
        }
      }
    };

    initializeApp();
  }, [defaultRole]);

  const value: UnifiedAuthContextType = {
    state,
    loginWithTelegram,
    loginAsGuest,
    loginOperator,
    registerOperator,
    loginCashier,
    logout,
    clearError,
    updateUser,
    switchRole,
  };

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};

// Хук для использования контекста
export const useUnifiedAuth = (): UnifiedAuthContextType => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
};

// Хуки для совместимости с существующим кодом
export const useAuth = () => {
  const { state, loginWithTelegram, loginAsGuest, logout, clearError } = useUnifiedAuth();
  return {
    state,
    login: loginWithTelegram,
    loginWithTelegram,
    loginAsGuest,
    logout,
    clearError,
  };
};

export const useOperatorAuth = () => {
  const { state, loginOperator, registerOperator, logout, clearError, updateUser } = useUnifiedAuth();
  return {
    state,
    login: loginOperator,
    register: registerOperator,
    logout,
    clearError,
    updateOperator: updateUser,
  };
};
