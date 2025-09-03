import React, { useState, useEffect } from 'react';
import { useOperatorAuth } from '../../context/OperatorAuthContext';
import { operatorOrdersApi } from '../../api/operatorApi';
import type { OperatorDashboard } from '../../types/operator';
import { DashboardStats } from '../../components/operator/DashboardStats';

// Типы для страниц
type OperatorPage = 'login' | 'dashboard' | 'stats';

interface OperatorStatsPageProps {
  onNavigate?: (page: OperatorPage) => void;
}

export const OperatorStatsPage: React.FC<OperatorStatsPageProps> = ({ onNavigate }) => {
  const { state: authState, logout } = useOperatorAuth();
  const [dashboard, setDashboard] = useState<OperatorDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка дашборда
  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const dashboardData = await operatorOrdersApi.getDashboard();
      
      // Убеждаемся, что все поля являются массивами
      if (dashboardData) {
        if (!Array.isArray(dashboardData.recent_orders)) {
          dashboardData.recent_orders = [];
        }
        if (!Array.isArray(dashboardData.notifications)) {
          dashboardData.notifications = [];
        }
        if (!Array.isArray(dashboardData.assigned_zones)) {
          dashboardData.assigned_zones = [];
        }
      }
      
      setDashboard(dashboardData);
    } catch (err) {
      setError('Ошибка загрузки статистики');
      console.error('Ошибка загрузки статистики:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    loadDashboard();
  }, []);

  // Автообновление каждые 30 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Обработка выхода
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  if (isLoading && !dashboard) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-6 max-w-md">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                loadDashboard();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Верхняя панель */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-full mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            {/* Логотип и название */}
            <div className="flex items-center">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white text-3xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Статистика оператора</h1>
                <p className="text-gray-400 text-sm">
                  {authState.operator?.assigned_zones?.map(zone => zone.city).join(', ')}
                </p>
              </div>
            </div>

            {/* Информация об операторе и действия */}
            <div className="flex items-center space-x-6">
              
              <div className="text-right">
                <p className="text-lg text-gray-300 font-medium">
                  {authState.operator?.first_name} {authState.operator?.last_name}
                </p>
                <p className="text-sm text-gray-400">
                  Оператор
                </p>
              </div>
              
              {/* Кнопки действий */}
              <div className="flex space-x-4">
{/* Кнопка "Назад" */}
<button
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('dashboard');
                  }
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>←</span>
                <span>Назад</span>
              </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-lg font-medium transition-colors"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {dashboard && (
          <DashboardStats 
            stats={dashboard}
            onRefresh={loadDashboard}
          />
        )}
      </main>
    </div>
  );
};
