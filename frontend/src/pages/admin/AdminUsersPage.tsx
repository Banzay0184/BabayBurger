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
        // API возвращает {count: X, results: [...]}, нужно извлечь results
        const usersData = Array.isArray((response.data as any)?.results) ? (response.data as any).results : [];
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
    <div className="space-y-8">
      {/* Заголовок */}
      <div className="text-center pb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl text-white">👥</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление пользователями</h1>
        <p className="text-gray-600 text-lg">Просмотр информации о клиентах</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Ошибка</div>
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {/* Поиск */}
      <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg p-6">
        <div className="max-w-md">
          <label className="block text-sm font-semibold text-gray-700 mb-3">🔍 Поиск пользователей</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, username, telegram_id..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Список пользователей */}
      <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm mr-3">👥</span>
            Пользователи ({users.length})
          </h3>
        </div>
        
        {users.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {user.first_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        {user.username && (
                          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold border border-blue-200 mt-1">
                            @{user.username}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="font-semibold text-gray-700 mb-1">🆔 Telegram ID</div>
                        <div className="text-gray-600 text-sm">{user.telegram_id}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="font-semibold text-gray-700 mb-1">📅 Регистрация</div>
                        <div className="text-gray-600 text-sm">{new Date(user.created_at).toLocaleDateString('ru-RU')}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="font-semibold text-gray-700 mb-1">📋 Заказов</div>
                        <div className="text-gray-600 text-sm font-bold">{user.orders_count}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="font-semibold text-gray-700 mb-1">💰 Потрачено</div>
                        <div className="text-gray-600 text-sm font-bold">{user.total_spent?.toLocaleString() || 0} ₽</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="text-right text-sm text-gray-600">
                      <div className="font-bold bg-gray-100 px-3 py-1 rounded-full">ID: {user.id}</div>
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
