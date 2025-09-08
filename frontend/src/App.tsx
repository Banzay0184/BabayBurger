import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MenuProvider } from './context/MenuContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { FavoriteProvider } from './context/FavoriteContext';
import { OperatorAuthProvider } from './context/OperatorAuthContext';
import { AuthPage } from './pages/AuthPage';
import { MainPage } from './pages/MainPage';
import { OperatorApp } from './pages/operator/OperatorApp';
import { CashierApp } from './pages/cashier/CashierApp';
import { TelegramWebAppOptimizer } from './components/common/TelegramWebAppOptimizer';
import { LoadingScreen } from './components/common/LoadingScreen';
import { initTelegramWebApp } from './utils/telegram';
import './styles/telegram-optimization.css';
import { AdminApp } from './pages/AdminApp';

// Компонент для основного приложения (клиент)
const ClientApp: React.FC = () => {
  const { state } = useAuth();
  const [isInitializing, setIsInitializing] = React.useState(true);

  // Инициализируем Telegram Web App при загрузке
  useEffect(() => {
    const initializeApp = async () => {
      await initTelegramWebApp();
      // Небольшая задержка для показа анимации загрузки
      setTimeout(() => {
        setIsInitializing(false);
      }, 1000);
    };
    
    initializeApp();
  }, []);

  // Показываем анимацию загрузки только при инициализации
  if (isInitializing) {
    return <LoadingScreen title="Babay Food" subtitle="Загрузка приложения..." />;
  }

  // Если загрузка или не авторизован - показываем страницу авторизации
  if (state.isLoading || !state.isAuthenticated) {
    return <AuthPage />;
  }

  // Если авторизован - показываем главную страницу с меню
  return (
    <MenuProvider>
      <FavoriteProvider>
        <CartProvider>
          <MainPage />
        </CartProvider>
      </FavoriteProvider>
    </MenuProvider>
  );
};

// Компонент для операторского интерфейса
const OperatorInterface: React.FC = () => {
  return (
    <OperatorAuthProvider>
      <OperatorApp />
    </OperatorAuthProvider>
  );
};

// Компонент для кассирского интерфейса
const CashierInterface: React.FC = () => {
  return <CashierApp />;
};

// Главный компонент приложения с роутингом
const App: React.FC = () => {
  return (
    <TelegramWebAppOptimizer>
      <LanguageProvider>
        <Router>
          <Routes>
            {/* Основное приложение (клиент) */}
            <Route 
              path="/" 
              element={
                <AuthProvider>
                  <ClientApp />
                </AuthProvider>
              } 
            />
            
            {/* Операторский интерфейс */}
            <Route 
              path="/operator/*" 
              element={<OperatorInterface />} 
            />
            
            {/* Кассирский интерфейс */}
            <Route 
              path="/cashier/*" 
              element={<CashierInterface />} 
            />

            {/* Админский интерфейс */}
            <Route 
              path="/admin/*" 
              element={<AdminApp />} 
            />
            
            {/* Редирект на главную для неизвестных маршрутов */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </LanguageProvider>
    </TelegramWebAppOptimizer>
  );
};

export default App;
