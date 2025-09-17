import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import type { DeliveryDriver, DeliveryAssignment, DeliveryDriverStats } from '../../types/delivery';

interface DriverDetailsModalProps {
  driver: DeliveryDriver | null;
  isOpen: boolean;
  onClose: () => void;
}

const DriverDetailsModal: React.FC<DriverDetailsModalProps> = ({ driver, isOpen, onClose }) => {
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [stats, setStats] = useState<DeliveryDriverStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assignments' | 'stats'>('assignments');

  useEffect(() => {
    if (driver && isOpen) {
      loadDriverData();
    }
  }, [driver, isOpen]);

  const loadDriverData = async () => {
    if (!driver) return;
    
    setLoading(true);
    try {
      const [assignmentsResponse, statsResponse] = await Promise.all([
        adminApi.getDeliveryDriverAssignments(driver.id),
        adminApi.getDeliveryDriverStats(driver.id, 'week')
      ]);

      if (assignmentsResponse.data) {
        setAssignments(assignmentsResponse.data as DeliveryAssignment[]);
      }
      if (statsResponse.data) {
        setStats(statsResponse.data as DeliveryDriverStats);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных курьера:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !driver) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {driver.user_name} - Детали курьера
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'assignments'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Заказы
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'stats'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Статистика
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'assignments' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">История заказов</h3>
                  {assignments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Заказов не найдено</p>
                  ) : (
                    <div className="space-y-3">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-medium text-gray-900">
                                  Заказ #{assignment.order_id}
                                </h4>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  assignment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                  assignment.status === 'delivering' ? 'bg-blue-100 text-blue-800' :
                                  assignment.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                                  assignment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                  assignment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {assignment.status_display}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Клиент</p>
                                  <p className="font-medium">{assignment.customer_name}</p>
                                  <p className="text-gray-600">{assignment.customer_phone}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Адрес</p>
                                  <p className="font-medium">{assignment.address}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Сумма</p>
                                  <p className="font-medium">{assignment.total_price.toLocaleString()} сум</p>
                                  <p className="text-gray-600">{assignment.payment_method}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Время доставки</p>
                                  <p className="font-medium">
                                    {assignment.delivery_time || 'Не завершено'}
                                  </p>
                                </div>
                              </div>

                              {assignment.receipt_photo_url && (
                                <div className="mt-3">
                                  <p className="text-sm text-gray-500 mb-2">Чек через карту:</p>
                                  <img 
                                    src={assignment.receipt_photo_url} 
                                    alt="Чек" 
                                    className="w-32 h-32 object-cover rounded border"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stats' && stats && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900">Статистика за {stats.period}</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600 font-medium">Всего заказов</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.total_assignments}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium">Выполнено</p>
                      <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-red-600 font-medium">Отменено</p>
                      <p className="text-2xl font-bold text-red-900">{stats.cancelled}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <p className="text-sm text-yellow-600 font-medium">В работе</p>
                      <p className="text-2xl font-bold text-yellow-900">{stats.in_progress}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 font-medium">Среднее время доставки</p>
                      <p className="text-xl font-bold text-gray-900">
                        {stats.avg_delivery_time 
                          ? `${stats.avg_delivery_time.minutes}м ${stats.avg_delivery_time.seconds}с`
                          : 'Нет данных'
                        }
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 font-medium">Общая выручка</p>
                      <p className="text-xl font-bold text-gray-900">
                        {stats.total_revenue.toLocaleString()} сум
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDetailsModal;
