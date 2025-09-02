import React, { useState } from 'react';
import { OperatorAuthProvider, useOperatorAuth } from '../../context/OperatorAuthContext';
import { OperatorLoginPage } from './OperatorLoginPage';
import { OperatorDashboardPage } from './OperatorDashboardPage';
import { OperatorStatsPage } from './OperatorStatsPage';

// Типы для страниц
type OperatorPage = 'login' | 'dashboard' | 'stats';

// Компонент для защищенных страниц
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  isAuthenticated: boolean;
  onNavigate: (page: OperatorPage) => void;
}> = ({ children, isAuthenticated, onNavigate }) => {
  React.useEffect(() => {
    if (!isAuthenticated) {
      onNavigate('login');
    }
  }, [isAuthenticated, onNavigate]);
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <>{children}</>;
};

// Компонент для публичных страниц
const PublicRoute: React.FC<{ 
  children: React.ReactNode; 
  isAuthenticated: boolean;
  onNavigate: (page: OperatorPage) => void;
}> = ({ children, isAuthenticated, onNavigate }) => {
  React.useEffect(() => {
    if (isAuthenticated) {
      onNavigate('dashboard');
    }
  }, [isAuthenticated, onNavigate]);
  
  if (isAuthenticated) {
    return null;
  }
  
  return <>{children}</>;
};

// Основное приложение оператора
const OperatorAppContent: React.FC = () => {
  const { state } = useOperatorAuth();
  const [currentPage, setCurrentPage] = useState<OperatorPage>('login');

  // Навигация между страницами
  const handleNavigate = (page: OperatorPage) => {
    setCurrentPage(page);
  };

  // Автоматическая навигация при изменении состояния аутентификации
  React.useEffect(() => {
    if (state.isAuthenticated) {
      setCurrentPage('dashboard');
    } else if (!state.isLoading) {
      // Только если не загружается и не аутентифицирован
      setCurrentPage('login');
    }
  }, [state.isAuthenticated, state.isLoading]);

  // Инициализация страницы при загрузке
  React.useEffect(() => {
    if (state.isAuthenticated && currentPage === 'login') {
      setCurrentPage('dashboard');
    }
  }, [state.isAuthenticated, currentPage]);

  // Показываем экран загрузки, пока проверяется токен
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Проверка аутентификации...</p>
        </div>
      </div>
    );
  }

  // Рендер текущей страницы
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'login':
        return (
          <PublicRoute 
            isAuthenticated={state.isAuthenticated} 
            onNavigate={handleNavigate}
          >
            <OperatorLoginPage />
          </PublicRoute>
        );
      
      case 'dashboard':
        return (
          <ProtectedRoute 
            isAuthenticated={state.isAuthenticated} 
            onNavigate={handleNavigate}
          >
            <OperatorDashboardPage />
          </ProtectedRoute>
        );
      
      case 'stats':
        return (
          <ProtectedRoute 
            isAuthenticated={state.isAuthenticated} 
            onNavigate={handleNavigate}
          >
            <OperatorStatsPage />
          </ProtectedRoute>
        );
      
      default:
        return <OperatorLoginPage />;
    }
  };

  return (
    <>
      {renderCurrentPage()}
    </>
  );
};

// Главный компонент с провайдером контекста
export const OperatorApp: React.FC = () => {
  return (
    <OperatorAuthProvider>
      <OperatorAppContent />
    </OperatorAuthProvider>
  );
};
