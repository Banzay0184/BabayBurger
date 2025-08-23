import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { YandexMapPicker } from '../map/YandexMapPicker';
import apiClient from '../../api/client';
import type { MapAddress } from '../../types/yandex-maps';

interface Address {
  id: number;
  street: string;
  house_number: string;
  apartment?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  is_primary: boolean;
  phone_number: string;
  comment?: string;
  full_address: string;
  created_at: string;
}

interface AddressFormData {
  street: string;
  house_number: string;
  apartment: string;
  city: string;
  phone_number: string;
  comment: string;
  is_primary: boolean;
}

export const AddressManager: React.FC = () => {
  const { state: authState } = useAuth();
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    street: '',
    house_number: '',
    apartment: '',
    city: 'Ташкент',
    phone_number: '',
    comment: '',
    is_primary: false
  });

  const telegramId = authState.user?.telegram_id;

  // Загрузка адресов
  const fetchAddresses = async () => {
    if (!telegramId) return;
    
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/addresses/?telegram_id=${telegramId}`);
      setAddresses(response.data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [telegramId]);

  // Обработка изменения формы
  const handleInputChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Сброс формы
  const resetForm = () => {
    setFormData({
      street: '',
      house_number: '',
      apartment: '',
      city: 'Ташкент',
      phone_number: '',
      comment: '',
      is_primary: false
    });
    setEditingAddress(null);
    setShowForm(false);
  };

  // Открытие формы для редактирования
  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      street: address.street,
      house_number: address.house_number,
      apartment: address.apartment || '',
      city: address.city,
      phone_number: address.phone_number,
      comment: address.comment || '',
      is_primary: address.is_primary
    });
    setShowForm(true);
  };

  // Сохранение адреса
  const handleSave = async () => {
    if (!telegramId) return;

    try {
      const addressData = {
        ...formData,
        telegram_id: telegramId
      };

      if (editingAddress) {
        // Обновление существующего адреса
        await apiClient.put(`/addresses/${editingAddress.id}/`, addressData);
      } else {
        // Создание нового адреса
        await apiClient.post('/addresses/', addressData);
      }

      await fetchAddresses();
      resetForm();
    } catch (error: any) {
      console.error('Error saving address:', error);
      alert(error.response?.data?.error || 'Ошибка сохранения адреса');
    }
  };

  // Удаление адреса
  const handleDelete = async (addressId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот адрес?')) return;

    try {
      await apiClient.delete(`/addresses/${addressId}/`, {
        data: { telegram_id: telegramId }
      });
      await fetchAddresses();
    } catch (error: any) {
      console.error('Error deleting address:', error);
      alert(error.response?.data?.error || 'Ошибка удаления адреса');
    }
  };

  // Установка основного адреса
  const handleSetPrimary = async (addressId: number) => {
    try {
      await apiClient.patch(`/addresses/${addressId}/`, {
        telegram_id: telegramId,
        is_primary: true
      });
      await fetchAddresses();
    } catch (error: any) {
      console.error('Error setting primary address:', error);
      alert(error.response?.data?.error || 'Ошибка установки основного адреса');
    }
  };

  // Обработка выбора адреса на карте
  const handleMapAddressSelect = (mapAddress: MapAddress) => {
    console.log('🗺️ AddressManager: Address selected from map:', mapAddress);
    setFormData(prev => ({
      ...prev,
      street: mapAddress.street || '',
      house_number: mapAddress.house || '',
      city: mapAddress.city || 'Ташкент',
      // Сохраняем координаты в комментариях для использования в будущем
      comment: prev.comment + ` [${mapAddress.coordinates[0]}, ${mapAddress.coordinates[1]}]`
    }));
    setShowMapPicker(false);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-300">{t('loading')}...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Заголовок */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-100 neon-text">
            📍 {t('delivery_addresses')}
          </h2>
          <button
            onClick={() => window.history.back()}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
          >
            ← {t('back')}
          </button>
        </div>
      </div>

      {/* Список адресов */}
      {addresses.length > 0 ? (
        <div className="space-y-4 mb-6">
          {addresses.map((address) => (
            <div key={address.id} className="tg-card-modern p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-100">
                      {address.full_address}
                    </h3>
                    {address.is_primary && (
                      <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                        {t('primary')}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>📱 {address.phone_number}</p>
                    {address.comment && (
                      <p>💬 {address.comment}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(address.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  {!address.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(address.id)}
                      className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded-lg transition-colors"
                    >
                      {t('set_primary')}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleEdit(address)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                  >
                    ✏️ {t('edit')}
                  </button>
                  
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                  >
                    🗑️ {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-600/50">
            <span className="text-3xl">📍</span>
          </div>
          <p className="text-gray-300 text-lg font-medium mb-2">
            {t('no_addresses')}
          </p>
          <p className="text-gray-500 text-sm mb-6">
            {t('add_first_address')}
          </p>
        </div>
      )}

      {/* Кнопки добавления */}
      {!showForm && (
        <div className="space-y-3">
          <Button
            onClick={() => {
              console.log('🗺️ AddressManager: Map button clicked, setting showMapPicker to true');
              setShowMapPicker(true);
            }}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white"
          >
            🗺️ {t('select_on_map')}
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white"
          >
            ✏️ {t('enter_manually')}
          </Button>
        </div>
      )}

      {/* Форма добавления/редактирования */}
      {showForm && (
        <div className="tg-card-modern p-4">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            {editingAddress ? t('edit_address') : t('add_address')}
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  {t('street')} *
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none"
                  placeholder={t('street_placeholder')}
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  {t('house_number')} *
                </label>
                <input
                  type="text"
                  value={formData.house_number}
                  onChange={(e) => handleInputChange('house_number', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none"
                  placeholder="123"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  {t('apartment')}
                </label>
                <input
                  type="text"
                  value={formData.apartment}
                  onChange={(e) => handleInputChange('apartment', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none"
                  placeholder="45"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  {t('city')} *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none"
                  placeholder="Ташкент"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                {t('phone_number')} *
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none"
                placeholder="+998 90 123 45 67"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                {t('comment')}
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => handleInputChange('comment', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none"
                rows={3}
                placeholder={t('comment_placeholder')}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_primary"
                checked={formData.is_primary}
                onChange={(e) => handleInputChange('is_primary', e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
              />
              <label htmlFor="is_primary" className="text-gray-300 text-sm">
                {t('set_as_primary')}
              </label>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleSave}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
            >
              {editingAddress ? t('update') : t('save')}
            </Button>
            
            <Button
              onClick={resetForm}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
            >
              {t('cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Компонент карты */}
      {showMapPicker && (
        <YandexMapPicker
          onAddressSelect={handleMapAddressSelect}
          onClose={() => setShowMapPicker(false)}
          initialCenter={[41.2995, 69.2401]} // Ташкент
          initialZoom={11}
        />
      )}
    </div>
  );
};
