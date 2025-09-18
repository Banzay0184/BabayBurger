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
  const [statsPeriod, setStatsPeriod] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    if (driver && isOpen) {
      loadDriverData();
    }
  }, [driver, isOpen]);

  useEffect(() => {
    if (driver && isOpen && activeTab === 'stats') {
      loadDriverData();
    }
  }, [statsPeriod]);

  const loadDriverData = async () => {
    if (!driver) return;
    
    setLoading(true);
    try {
      const [assignmentsResponse, statsResponse] = await Promise.all([
        adminApi.getDeliveryDriverAssignments(driver.id),
        adminApi.getDeliveryDriverStats(driver.id, statsPeriod)
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
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">
                  {driver.user_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{driver.user_name}</h2>
                <p className="text-sm text-gray-600">{driver.phone}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Навигация по вкладкам */}
          <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === 'assignments'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📦 Заказы
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === 'stats'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📊 Статистика
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">История заказов</h3>
                    <span className="text-sm text-gray-500">Всего: {assignments.length}</span>
                  </div>
                  
                  {assignments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📦</div>
                      <p className="text-gray-500">Заказов не найдено</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-semibold text-gray-900">
                                #{assignment.order_id}
                              </h4>
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                assignment.status === 'delivered' ? 'bg-green-100 text-green-800 border border-green-200' :
                                assignment.status === 'delivering' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                assignment.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                assignment.status === 'accepted' ? 'bg-green-100 text-green-800 border border-green-200' :
                                assignment.status === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                                'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}>
                                {assignment.status_display}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                {assignment.total_price.toLocaleString()} сум
                              </p>
                              <p className="text-xs text-gray-500">{assignment.payment_method}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-gray-500">👤</span>
                                <span className="text-gray-500">Клиент</span>
                              </div>
                              <p className="font-medium text-gray-900">{assignment.customer_name}</p>
                              <p className="text-gray-600 text-xs">{assignment.customer_phone}</p>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-gray-500">📍</span>
                                <span className="text-gray-500">Адрес</span>
                              </div>
                              <p className="font-medium text-gray-900 text-xs">{assignment.address}</p>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-gray-500">⏱️</span>
                                <span className="text-gray-500">Время доставки</span>
                              </div>
                              <p className="font-medium text-gray-900 text-xs">
                                {assignment.delivery_time || 'Не завершено'}
                              </p>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-gray-500">📅</span>
                                <span className="text-gray-500">Дата</span>
                              </div>
                              <p className="font-medium text-gray-900 text-xs">
                                {assignment.assigned_at ? new Date(assignment.assigned_at).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Неизвестно'}
                              </p>
                            </div>
                          </div>

                          {assignment.receipt_photo_url && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-500">🧾</span>
                                  <span className="text-sm text-gray-500">Чек через карту</span>
                                </div>
                                <button
                                  onClick={() => window.open(assignment.receipt_photo_url, '_blank')}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Открыть в полном размере
                                </button>
                              </div>
                              <img 
                                src={assignment.receipt_photo_url} 
                                alt="Чек" 
                                className="w-full max-w-xs h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(assignment.receipt_photo_url, '_blank')}
                                title="Нажмите для открытия в полном размере"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Статистика за {stats?.period || 'период'}
                    </h3>
                    <div className="flex items-center space-x-3">
                      <select
                        value={statsPeriod}
                        onChange={(e) => setStatsPeriod(e.target.value as 'day' | 'week' | 'month')}
                        className="border text-black border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        disabled={loading}
                      >
                        <option value="day">📅 День</option>
                        <option value="week">📆 Неделя</option>
                        <option value="month">🗓️ Месяц</option>
                      </select>
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <span className="text-sm text-gray-500">Обновлено: {new Date().toLocaleDateString('ru-RU')}</span>
                      )}
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : stats ? (
                    <div>
                      {/* Основные метрики */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-blue-600">📦</span>
                        <span className="text-sm text-blue-600 font-medium">Всего заказов</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{stats.total_assignments}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-green-600">✅</span>
                        <span className="text-sm text-green-600 font-medium">Выполнено</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-red-600">❌</span>
                        <span className="text-sm text-red-600 font-medium">Отменено</span>
                      </div>
                      <p className="text-2xl font-bold text-red-900">{stats.cancelled}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-yellow-600">🔄</span>
                        <span className="text-sm text-yellow-600 font-medium">В работе</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-900">{stats.in_progress}</p>
                    </div>
                  </div>

                  {/* Дополнительная статистика */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-gray-600">⏱️</span>
                        <span className="text-sm text-gray-600 font-medium">Среднее время доставки</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {stats.avg_delivery_time 
                          ? `${stats.avg_delivery_time.minutes}м ${stats.avg_delivery_time.seconds}с`
                          : 'Нет данных'
                        }
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-purple-600">💰</span>
                        <span className="text-sm text-purple-600 font-medium">Общая выручка</span>
                      </div>
                      <p className="text-xl font-bold text-purple-900">
                        {stats.total_revenue.toLocaleString()} сум
                      </p>
                    </div>
                  </div>

                  {/* Процент выполнения */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Процент выполнения заказов</span>
                      <span className="text-sm font-bold text-gray-900">
                        {stats.total_assignments > 0 
                          ? Math.round((stats.completed / stats.total_assignments) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${stats.total_assignments > 0 
                            ? (stats.completed / stats.total_assignments) * 100 
                            : 0}%` 
                        }}
                      ></div>
                    </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">📊</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Статистика недоступна</h3>
                      <p className="text-gray-600">Не удалось загрузить статистику для выбранного периода</p>
                    </div>
                  )}
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
