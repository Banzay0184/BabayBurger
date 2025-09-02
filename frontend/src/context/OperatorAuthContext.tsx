import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Operator } from '../types/operator';
import { operatorAuthApi } from '../api/operatorApi';

// Типы для состояния аутентификации
interface OperatorAuthState {
  operator: Operator | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Типы для действий
type OperatorAuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { operator: Operator; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_OPERATOR'; payload: Operator };

// Начальное состояние
const initialState: OperatorAuthState = {
  operator: null,
  token: localStorage.getItem('operator_token'),
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Редьюсер для управления состоянием
const operatorAuthReducer = (state: OperatorAuthState, action: OperatorAuthAction): OperatorAuthState => {
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
        operator: action.payload.operator,
        token: action.payload.token,
        isLoading: false,
        error: null,
        isAuthenticated: true,
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        operator: null,
        token: null,
        isLoading: false,
        error: action.payload,
        isAuthenticated: false,
      };
    
    case 'AUTH_LOGOUT':
      return {
        ...state,
        operator: null,
        token: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'UPDATE_OPERATOR':
      return {
        ...state,
        operator: action.payload,
      };
    
    default:
      return state;
  }
};

// Интерфейс контекста
interface OperatorAuthContextType {
  state: OperatorAuthState;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (operatorData: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    password_confirm: string;
  }) => Promise<void>;
  clearError: () => void;
  updateOperator: (operator: Operator) => void;
}

// Создание контекста
const OperatorAuthContext = createContext<OperatorAuthContextType | undefined>(undefined);

// Провайдер контекста
interface OperatorAuthProviderProps {
  children: ReactNode;
}

export const OperatorAuthProvider: React.FC<OperatorAuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(operatorAuthReducer, initialState);

      // Проверка токена при загрузке
    useEffect(() => {
      const checkAuth = async () => {
        const token = localStorage.getItem('operator_token');
        if (token && !state.operator) {
          try {
            dispatch({ type: 'AUTH_START' });
            const result = await operatorAuthApi.verifyToken();
            
            if (result.valid && result.operator) {
              dispatch({ 
                type: 'AUTH_SUCCESS', 
                payload: { operator: result.operator, token } 
              });
            } else {
              // Токен недействителен, удаляем его
              localStorage.removeItem('operator_token');
              dispatch({ type: 'AUTH_FAILURE', payload: result.error || 'Токен недействителен' });
            }
          } catch (error) {
            // Токен недействителен, удаляем его
            localStorage.removeItem('operator_token');
            dispatch({ type: 'AUTH_FAILURE', payload: 'Ошибка проверки токена' });
          }
        }
      };

      checkAuth();
    }, []);

  // Функция входа
  const login = async (username: string, password: string): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      const result = await operatorAuthApi.login(username, password);
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { operator: result.operator, token: result.token } 
      });
    } catch (error) {
      dispatch({ 
        type: 'AUTH_FAILURE', 
        payload: error instanceof Error ? error.message : 'Ошибка входа' 
      });
    }
  };

  // Функция выхода
  const logout = async (): Promise<void> => {
    try {
      await operatorAuthApi.logout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  // Функция регистрации
  const register = async (operatorData: {
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
      const result = await operatorAuthApi.register(operatorData);
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { operator: result.operator, token: result.token } 
      });
    } catch (error) {
      dispatch({ 
        type: 'AUTH_FAILURE', 
        payload: error instanceof Error ? error.message : 'Ошибка регистрации' 
      });
    }
  };

  // Функция очистки ошибки
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Функция обновления данных оператора
  const updateOperator = (operator: Operator): void => {
    dispatch({ type: 'UPDATE_OPERATOR', payload: operator });
  };

  const value: OperatorAuthContextType = {
    state,
    login,
    logout,
    register,
    clearError,
    updateOperator,
  };

  return (
    <OperatorAuthContext.Provider value={value}>
      {children}
    </OperatorAuthContext.Provider>
  );
};

// Хук для использования контекста
export const useOperatorAuth = (): OperatorAuthContextType => {
  const context = useContext(OperatorAuthContext);
  if (context === undefined) {
    throw new Error('useOperatorAuth must be used within an OperatorAuthProvider');
  }
  return context;
};
