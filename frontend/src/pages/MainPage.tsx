import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { MenuPage } from './MenuPage';

export const MainPage: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="tg-webapp bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
      <div className="max-w-4xl mx-auto p-4 tg-safe-top tg-safe-bottom">
        {/* Современный хедер с темной темой */}
        <div className="tg-card-modern p-6 mb-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-dark-glow animate-dark-pulse">
                  <span className="text-2xl">🍔</span>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">🔥</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-100 mb-1 neon-text">
                  Babay Burger
                </h1>
                <p className="text-gray-400 text-sm">
                  Вкусные бургеры и фастфуд
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Статус заказа с неоновым эффектом */}
              <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-success-900/30 border border-success-700/50 rounded-full">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-success-300">Открыто</span>
              </div>
              
              <Button 
                onClick={handleLogout}
                variant="secondary"
                size="sm"
                className="!px-4 !py-2"
              >
                <span className="hidden sm:inline">Выйти</span>
                <span className="sm:hidden">🚪</span>
              </Button>
            </div>
          </div>
          
          {/* Быстрые действия с темной темой */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <button className="flex flex-col items-center p-3 glass-dark rounded-xl hover:bg-dark-700/50 transition-all duration-300 hover:scale-105">
              <span className="text-xl mb-1">🛒</span>
              <span className="text-xs font-medium text-gray-300">Корзина</span>
            </button>
            <button className="flex flex-col items-center p-3 glass-dark rounded-xl hover:bg-dark-700/50 transition-all duration-300 hover:scale-105">
              <span className="text-xl mb-1">📞</span>
              <span className="text-xs font-medium text-gray-300">Звонок</span>
            </button>
            <button className="flex flex-col items-center p-3 glass-dark rounded-xl hover:bg-dark-700/50 transition-all duration-300 hover:scale-105">
              <span className="text-xl mb-1">📍</span>
              <span className="text-xs font-medium text-gray-300">Адрес</span>
            </button>
          </div>
        </div>

        {/* Основной контент */}
        <div className="animate-slide-up">
          <MenuPage />
        </div>
      </div>
    </div>
  );
}; 