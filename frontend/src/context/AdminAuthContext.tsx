import React from 'react';

type AdminAuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: { username: string } | null;
};

type AdminAuthContextType = {
  state: AdminAuthState;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AdminAuthContext = React.createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<AdminAuthState>({
    isAuthenticated: !!localStorage.getItem(ADMIN_TOKEN_KEY),
    isLoading: false,
    user: localStorage.getItem(ADMIN_USER_KEY)
      ? JSON.parse(localStorage.getItem(ADMIN_USER_KEY) as string)
      : null
  });

  const login = async (username: string, password: string): Promise<boolean> => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      // TODO: заменить на реальный бэкенд эндпоинт аутентификации администратора
      // Временная заглушка: любой пароль длиной >= 4
      if (username && password && password.length >= 4) {
        const fakeToken = 'admin-demo-token';
        localStorage.setItem(ADMIN_TOKEN_KEY, fakeToken);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({ username }));
        setState({ isAuthenticated: true, isLoading: false, user: { username } });
        return true;
      }
      return false;
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  };

  const logout = (): void => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    setState({ isAuthenticated: false, isLoading: false, user: null });
  };

  const value: AdminAuthContextType = { state, login, logout };
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = (): AdminAuthContextType => {
  const ctx = React.useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};


