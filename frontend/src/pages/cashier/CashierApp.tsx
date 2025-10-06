import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CashierLoginPage } from './CashierLoginPage';
import CashierDashboardPage from './CashierDashboardPage';
import { useCashierPWA } from '../../hooks/useCashierPWA';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

export const CashierApp: React.FC = () => {
  const pwa = useCashierPWA();

  useEffect(() => {
    // Инициализируем PWA при загрузке приложения
    console.log('💰 Cashier App: PWA initialized', {
      isInstalled: pwa.isInstalled,
      isInstallable: pwa.isInstallable,
      isOnline: pwa.isOnline,
      serviceWorkerStatus: pwa.serviceWorkerStatus
    });

    // Проверяем обновления при загрузке
    pwa.checkForUpdates();
  }, [pwa]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<CashierLoginPage />} />
          <Route path="/dashboard" element={<CashierDashboardPage />} />
          <Route path="/" element={<Navigate to="/cashier/login" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
};

