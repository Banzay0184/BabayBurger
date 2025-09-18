import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import type { DeliveryDriver } from '../../types/delivery';
import DriverDetailsModal from '../../components/admin/DriverDetailsModal';

interface DriverCardProps {
  driver: DeliveryDriver;
  onViewDetails: (driver: DeliveryDriver) => void;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver, onViewDetails }) => {
  const [showAllOrders, setShowAllOrders] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'busy': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offline': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'busy': return 'Занят';
      case 'offline': return 'Не в сети';
      case 'blocked': return 'Заблокирован';
      default: return status;
    }
  };


  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Заголовок карточки */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs">
                {driver.user_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-xs">{driver.user_name}</h3>
              <p className="text-xs text-gray-600">{driver.phone}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(driver.status)}`}>
            {getStatusText(driver.status)}
          </span>
        </div>
      </div>

      {/* Основная информация */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-gray-50 rounded-md p-2">
            <div className="flex items-center space-x-1 mb-0.5">
              <span className="text-xs text-gray-500">📦</span>
              <span className="text-xs text-gray-500">Заказов</span>
            </div>
            <p className="text-xs font-semibold text-gray-900">
              {driver.current_orders_count}/{driver.max_orders}
            </p>
          </div>
          <div className="bg-gray-50 rounded-md p-2">
            <div className="flex items-center space-x-1 mb-0.5">
              <span className="text-xs text-gray-500">🚚</span>
              <span className="text-xs text-gray-500">Доставок</span>
            </div>
            <p className="text-xs font-semibold text-gray-900">{driver.total_deliveries}</p>
          </div>
        </div>

        {/* Текущие заказы */}
        {driver.current_assignments.length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700" title="Нажмите на заказ для просмотра деталей курьера">
                Текущие заказы
              </span>
              <span className="text-xs text-gray-500">({driver.current_assignments.length})</span>
            </div>
            <div className="space-y-1">
              {(showAllOrders ? driver.current_assignments : driver.current_assignments.slice(0, 2)).map((assignment) => (
                <div 
                  key={assignment.id} 
                  className="bg-blue-50 rounded-md p-1.5 border border-blue-100 cursor-pointer hover:bg-blue-100 hover:border-blue-200 transition-colors"
                  onClick={() => onViewDetails(driver)}
                  title="Нажмите для просмотра деталей курьера"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        #{assignment.order_id} • {assignment.customer_name}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{assignment.address}</p>
                      {assignment.delivery_time ? (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">
                          ⏱️ {assignment.delivery_time}
                        </p>
                      ) : assignment.assigned_at ? (
                        <p className="text-xs text-gray-500 mt-0.5">
                          📅 {new Date(assignment.assigned_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs font-semibold text-gray-900">
                        {assignment.total_price.toLocaleString()} сум
                      </p>
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${
                        assignment.status === 'delivering' ? 'bg-blue-100 text-blue-800' :
                        assignment.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                        assignment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {assignment.status_display}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {driver.current_assignments.length > 2 && (
                <div className="text-center">
                  <button
                    onClick={() => setShowAllOrders(!showAllOrders)}
                    className="text-sm text-blue-600 font-medium hover:text-blue-800 hover:underline transition-colors"
                  >
                    {showAllOrders 
                      ? `Скрыть заказы` 
                      : `+${driver.current_assignments.length - 2} еще заказов`
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Действия */}
      <div className="bg-gray-50 px-3 py-2 border-t border-gray-100">
        <button
          onClick={() => onViewDetails(driver)}
          className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Подробнее
        </button>
      </div>
    </div>
  );
};

export const AdminDeliveryDriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DeliveryDriver | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    is_active: true
  });

  useEffect(() => {
    loadDrivers();
  }, [filters]);

  const loadDrivers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.getDeliveryDrivers(filters);
      if (response.data) {
        const data = response.data as any;
        setDrivers(data.results || data);
      } else {
        setError(response.error || 'Ошибка загрузки курьеров');
      }
    } catch (err) {
      setError('Ошибка загрузки курьеров');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (driver: DeliveryDriver) => {
    setSelectedDriver(driver);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedDriver(null);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Заголовок - фиксированный */}
      <div className="flex-shrink-0 border-b border-gray-200 pb-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">🚚 Управление курьерами</h1>
        <p className="text-gray-600 mt-1">Управление курьерами доставки и их заказами</p>
      </div>

      {/* Фильтры - фиксированные */}
      <div className="flex-shrink-0 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <span className="w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center text-white text-xs mr-2">🔍</span>
            Фильтры
          </h3>
        </div>
        
        <div className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">Статус:</span>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="border text-black border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Все статусы</option>
                <option value="active">🟢 Активный</option>
                <option value="busy">🟡 Занят</option>
                <option value="offline">⚫ Не в сети</option>
                <option value="blocked">🔴 Заблокирован</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">Активность:</span>
              <select
                value={filters.is_active.toString()}
                onChange={(e) => handleFilterChange('is_active', e.target.value === 'true')}
                className="border text-black border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="true">✅ Активные</option>
                <option value="false">❌ Неактивные</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 ml-auto">
              <span className="text-sm text-gray-500">Всего курьеров:</span>
              <span className="text-sm font-semibold text-gray-900">{drivers.length}</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Список курьеров - с прокруткой */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {drivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}

        {drivers.length === 0 && !loading && !error && (
          <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
            <div className="text-4xl mb-4">🚚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Курьеры не найдены</h3>
            <p className="text-gray-600">Попробуйте изменить фильтры поиска</p>
          </div>
        )}
      </div>

      {/* Модальное окно с деталями */}
      <DriverDetailsModal
        driver={selectedDriver}
        isOpen={showDetailsModal}
        onClose={handleCloseDetails}
      />
    </div>
  );
};

export default AdminDeliveryDriversPage;