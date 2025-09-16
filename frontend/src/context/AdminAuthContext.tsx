import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
}

interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AdminUser | null;
  error: string | null;
}

interface AdminAuthContextType {
  state: AdminAuthState;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

type AdminAuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: AdminUser }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AdminAuthState = {
  isAuthenticated: false,
  isLoading: true, // Начинаем с загрузки для проверки сохраненной сессии
  user: null,
  error: null,
};

const adminAuthReducer = (state: AdminAuthState, action: AdminAuthAction): AdminAuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(adminAuthReducer, initialState);

  const login = async (username: string, password: string): Promise<boolean> => {
    dispatch({ type: 'LOGIN_START' });

    try {
             // Используем правильный URL для админ-панели
      const { getAdminApiUrl } = await import('../config/api');
      const adminApiUrl = getAdminApiUrl('auth/');
      
      const response = await fetch(adminApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
        // Сохраняем настоящий токен и данные пользователя в localStorage
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        
        // Отладочная информация
        console.log('✅ Admin login successful:', {
          token: data.token ? `${data.token.substring(0, 10)}...` : 'No token',
          user: data.user.username
        });
        
        return true;
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: data.error || 'Ошибка авторизации' });
        return false;
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Ошибка сети' });
      return false;
    }
  };

  const logout = (): void => {
    dispatch({ type: 'LOGOUT' });
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Проверяем сохраненную сессию при загрузке
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');
    
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      } catch (error) {
        // Если данные повреждены, очищаем localStorage
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        dispatch({ type: 'LOGIN_FAILURE', payload: 'Сессия истекла' });
      }
    } else {
      // Если нет сохраненной сессии, завершаем загрузку
      dispatch({ type: 'LOGIN_FAILURE', payload: '' });
    }
  }, []);

  const value: AdminAuthContextType = {
    state,
    login,
    logout,
    clearError,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextType => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};