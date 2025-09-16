import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CashierLoginPage } from './CashierLoginPage';
import CashierDashboardPage from './CashierDashboardPage';
import PWADiagnostics from '../../components/PWADiagnostics';
import PWAInstallPrompt from '../../components/PWAInstallPrompt';

export const CashierApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<CashierLoginPage />} />
        <Route path="/dashboard" element={<CashierDashboardPage />} />
        <Route path="/" element={<Navigate to="/cashier/login" replace />} />
      </Routes>
      
      {/* PWA Диагностика - показывается на всех страницах кассира */}
      <PWADiagnostics />
      
      {/* PWA Установка - показывается когда доступна */}
      <PWAInstallPrompt />
    </div>
  );
};

