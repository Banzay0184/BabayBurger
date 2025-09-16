import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';

interface User {
  id: number;
  telegram_id: number;
  first_name: string;
  username?: string;
  last_name?: string;
  created_at: string;
  orders_count: number;
  total_spent: number;
}

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔄 Загружаем пользователей с поиском:', search);
      const response = await adminApi.getUsers({ search });
      
      console.log('📊 Ответ пользователей:', response);
      
      if (response.error) {
        console.error('❌ Ошибка загрузки пользователей:', response.error);
        setError(response.error);
      } else if (response.data) {
        const usersData = Array.isArray(response.data) ? response.data : [];
        setUsers(usersData);
        console.log('✅ Пользователи загружены:', usersData);
      }
    } catch (err) {
      console.error('💥 Исключение при загрузке пользователей:', err);
      setError('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Загрузка пользователей...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">👥 Управление пользователями</h1>
        <p className="text-gray-600 mt-1">Просмотр информации о клиентах</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Ошибка</div>
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {/* Поиск */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Поиск пользователей</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, username, telegram_id..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Список пользователей */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Пользователи ({users.length})
          </h3>
        </div>
        
        {users.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-semibold text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      {user.username && (
                        <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          @{user.username}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <div>🆔 Telegram ID: {user.telegram_id}</div>
                      <div>📅 Регистрация: {new Date(user.created_at).toLocaleString('ru-RU')}</div>
                      <div>📋 Заказов: {user.orders_count}</div>
                      <div>💰 Потрачено: {user.total_spent?.toLocaleString() || 0} ₽</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="text-right text-sm text-gray-600">
                      <div className="font-medium">ID: {user.id}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            Пользователи не найдены
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
