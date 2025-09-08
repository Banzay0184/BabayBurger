import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import AdminCategoriesPage from './AdminCategoriesPage';

export const AdminApp: React.FC = () => {
  return (
    <div className="min-h-screen">
      <nav className="p-4 border-b flex gap-4">
        <Link to="/admin/categories" className="underline">Категории</Link>
      </nav>
      <Routes>
        <Route path="/categories" element={<AdminCategoriesPage />} />
        <Route path="*" element={<Navigate to="/admin/categories" replace />} />
      </Routes>
    </div>
  );
};

export default AdminApp;


