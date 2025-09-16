import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CashierLoginPage } from './CashierLoginPage';
import CashierDashboardPage from './CashierDashboardPage';
// PWA компоненты удалены
// import PWADiagnostics from '../../components/PWADiagnostics';
// import { CashierPWAInstallPrompt } from '../../components/cashier/PWAInstallPrompt';

export const CashierApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<CashierLoginPage />} />
        <Route path="/dashboard" element={<CashierDashboardPage />} />
        <Route path="/" element={<Navigate to="/cashier/login" replace />} />
      </Routes>
      
      {/* PWA компоненты удалены */}
      {/* <PWADiagnostics /> */}
      {/* <CashierPWAInstallPrompt /> */}
    </div>
  );
};

