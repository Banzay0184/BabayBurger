import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import type { DeliveryDriver } from '../../types/delivery';
import DriverDetailsModal from '../../components/admin/DriverDetailsModal';

interface DriverCardProps {
  driver: DeliveryDriver;
  onViewDetails: (driver: DeliveryDriver) => void;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver, onViewDetails }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="bg-white rounded-lg border shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-lg">
                {driver.user_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{driver.user_name}</h3>
              <p className="text-sm text-gray-600">{driver.phone}</p>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Статус</p>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(driver.status)}`}>
                {getStatusText(driver.status)}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Рейтинг</p>
              <p className="text-sm font-medium text-gray-900">⭐ {driver.rating}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Заказов сейчас</p>
              <p className="text-sm font-medium text-gray-900">
                {driver.current_orders_count}/{driver.max_orders}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Всего доставок</p>
              <p className="text-sm font-medium text-gray-900">{driver.total_deliveries}</p>
            </div>
          </div>

          {driver.current_assignments.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Текущие заказы:</p>
              <div className="space-y-2">
                {driver.current_assignments.map((assignment) => (
                  <div key={assignment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Заказ #{assignment.order_id}
                        </p>
                        <p className="text-xs text-gray-600">{assignment.customer_name}</p>
                        <p className="text-xs text-gray-600">{assignment.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {assignment.total_price.toLocaleString()} сум
                        </p>
                        <p className="text-xs text-gray-600">{assignment.payment_method}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          assignment.status === 'delivering' ? 'bg-blue-100 text-blue-800' :
                          assignment.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                          assignment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {assignment.status_display}
                        </span>
                      </div>
                    </div>
                    
                    {assignment.receipt_photo_url && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Чек через карту:</p>
                        <img 
                          src={assignment.receipt_photo_url} 
                          alt="Чек" 
                          className="w-20 h-20 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={() => onViewDetails(driver)}
          className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">🚚 Управление курьерами</h1>
        <p className="text-gray-600 mt-1">Управление курьерами доставки и их заказами</p>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Все статусы</option>
              <option value="active">Активный</option>
              <option value="busy">Занят</option>
              <option value="offline">Не в сети</option>
              <option value="blocked">Заблокирован</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Активность</label>
            <select
              value={filters.is_active.toString()}
              onChange={(e) => handleFilterChange('is_active', e.target.value === 'true')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="true">Активные</option>
              <option value="false">Неактивные</option>
            </select>
          </div>
        </div>
      </div>

      {/* Список курьеров */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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