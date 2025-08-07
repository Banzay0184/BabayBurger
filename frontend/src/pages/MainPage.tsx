import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { MenuPage } from './MenuPage';

export const MainPage: React.FC = () => {
  const { state, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-bg-card rounded-2xl shadow-card border border-border-gray p-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary">
              🍔 Babay Burger
            </h1>
            <Button 
              onClick={handleLogout}
              variant="secondary"
              size="sm"
            >
              Выйти
            </Button>
          </div>

          <MenuPage />
        </div>
      </div>
    </div>
  );
}; 