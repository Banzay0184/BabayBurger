import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';

interface DeliveryZone {
  id: number;
  name: string;
  city: string;
  delivery_fee: number;
  min_order_amount?: number;
  is_active: boolean;
  center_latitude?: number;
  center_longitude?: number;
  radius_km?: number;
}

export const AdminDeliveryZonesPage: React.FC = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    city: '',
    is_active: undefined as boolean | undefined,
  });

  useEffect(() => {
    fetchZones();
  }, [filters]);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getDeliveryZones(filters);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setZones(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      setError('Ошибка загрузки зон доставки');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Загрузка зон доставки...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">🗺️ Управление зонами доставки</h1>
        <p className="text-gray-600 mt-1">Настройка зон доставки и их параметров</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Ошибка</div>
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Фильтры</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Город</label>
            <input
              type="text"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              placeholder="Поиск по городу..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
            <select
              value={filters.is_active === undefined ? '' : String(filters.is_active)}
              onChange={(e) => {
                const value = e.target.value;
                setFilters({ 
                  ...filters, 
                  is_active: value === '' ? undefined : value === 'true' 
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Все зоны</option>
              <option value="true">Активные</option>
              <option value="false">Неактивные</option>
            </select>
          </div>
        </div>
      </div>

      {/* Список зон */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Зоны доставки ({zones.length})
          </h3>
        </div>
        
        {zones.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {zones.map((zone) => (
              <div key={zone.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-semibold text-gray-900">
                        {zone.name}
                      </div>
                      <div className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        {zone.city}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        zone.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {zone.is_active ? '✅ Активна' : '❌ Неактивна'}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <div>💰 Стоимость доставки: {zone.delivery_fee.toLocaleString()} ₽</div>
                      {zone.min_order_amount && (
                        <div>🛒 Минимальная сумма: {zone.min_order_amount.toLocaleString()} ₽</div>
                      )}
                      {zone.center_latitude && zone.center_longitude && (
                        <div>📍 Центр: {zone.center_latitude.toFixed(6)}, {zone.center_longitude.toFixed(6)}</div>
                      )}
                      {zone.radius_km && (
                        <div>📏 Радиус: {zone.radius_km} км</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="text-right text-sm text-gray-600">
                      <div className="font-medium">ID: {zone.id}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            Зоны доставки не найдены
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDeliveryZonesPage;
