import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { isInTelegramContext } from '../utils/telegram';

export const AuthPage: React.FC = () => {
  const { state, login, loginWithTelegram } = useAuth();

  const handleLogin = () => {
    if (isInTelegramContext()) {
      loginWithTelegram();
    } else {
      login();
    }
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-6"></div>
          <p className="text-text-secondary text-lg">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              🍔 Babay Burger
            </h1>
            <p className="text-text-secondary text-lg">
              Войдите в приложение для продолжения
            </p>
          </div>
        </div>
        
        {state.error && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-4">
            <p className="text-error text-sm">
              {state.error}
            </p>
          </div>
        )}
        
        <Button 
          onClick={handleLogin}
          className="w-full"
          size="lg"
          loading={state.isLoading}
        >
          Войти
        </Button>
      </div>
    </div>
  );
}; 