import React from 'react';

export const AdminOperatorsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">📞 Управление операторами</h1>
        <p className="text-gray-600 mt-1">Управление операторами доставки</p>
      </div>
      
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🚧</div>
          <div className="text-lg font-medium">Раздел в разработке</div>
          <div className="text-sm">Скоро здесь будет управление операторами</div>
        </div>
      </div>
    </div>
  );
};

export default AdminOperatorsPage;
