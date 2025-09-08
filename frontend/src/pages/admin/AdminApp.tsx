import React from 'react';
import { Link, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { AdminMenuPage } from './AdminMenuPage';
import { AdminPromoCodesPage } from './AdminPromoCodesPage';

export const AdminApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="text-lg font-semibold">Админ панель</Link>
          <nav className="flex items-center gap-4">
            <NavLink to="/admin" end className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-700'}>
              Главная
            </NavLink>
            <NavLink to="/admin/menu" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-700'}>
              Меню
            </NavLink>
            <NavLink to="/admin/promocodes" className={({ isActive }) => isActive ? 'text-blue-600 font-medium' : 'text-gray-700'}>
              Промокоды
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="" element={<AdminDashboard />} />
          <Route path="menu" element={<AdminMenuPage />} />
          <Route path="promocodes" element={<AdminPromoCodesPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminApp;


