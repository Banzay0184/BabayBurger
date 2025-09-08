import React from 'react';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Link to="/admin/menu" className="p-4 bg-white rounded border hover:shadow">
        <div className="text-lg font-medium">Меню</div>
        <div className="text-sm text-gray-600">Категории и товары</div>
      </Link>
      <Link to="/admin/promocodes" className="p-4 bg-white rounded border hover:shadow">
        <div className="text-lg font-medium">Промокоды</div>
        <div className="text-sm text-gray-600">Создание и управление</div>
      </Link>
    </div>
  );
};

export default AdminDashboard;


