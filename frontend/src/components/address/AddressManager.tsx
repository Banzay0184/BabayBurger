import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { YandexMapPicker } from '../map/YandexMapPicker';
import type { MapAddress } from '../../types/yandex-maps';

interface Address {
  id: number;
  street: string;
  house_number: string;
  apartment?: string;
  city: string;
  phone_number: string;
  comment?: string;
  is_primary: boolean;
}

export const AddressManager: React.FC = () => {
  const { t } = useLanguage();
  
  // Состояния
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    street: '',
    house_number: '',
    apartment: '',
    city: 'Ташкент',
    phone_number: '',
    comment: '',
    is_primary: false
  });

  // Загрузка адресов при монтировании
  useEffect(() => {
    loadAddresses();
  }, []);

  // Загрузка адресов
  const loadAddresses = async () => {
    try {
      // Здесь должен быть API запрос для загрузки адресов
      // Пока используем моковые данные
      const mockAddresses: Address[] = [
        {
          id: 1,
          street: 'Улица Навои',
          house_number: '15',
          apartment: '45',
          city: 'Ташкент',
          phone_number: '+998 90 123 45 67',
          comment: 'Около метро',
          is_primary: true
        }
      ];
      setAddresses(mockAddresses);
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

  // Обработка изменения формы
  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
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

  // Сохранение адреса
  const handleSave = async () => {
    try {
      if (!formData.street || !formData.house_number || !formData.phone_number) {
        alert('Пожалуйста, заполните обязательные поля');
        return;
      }

      if (editingAddress) {
        // Обновление существующего адреса
        const updatedAddresses = addresses.map(addr =>
          addr.id === editingAddress.id ? { ...addr, ...formData } : addr
        );
        setAddresses(updatedAddresses);
      } else {
        // Добавление нового адреса
        const newAddress: Address = {
          id: Date.now(),
          ...formData
        };
        setAddresses(prev => [...prev, newAddress]);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Ошибка сохранения адреса');
    }
  };

  // Редактирование адреса
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

  // Удаление адреса
  const handleDelete = async (id: number) => {
    if (confirm('Вы уверены, что хотите удалить этот адрес?')) {
      try {
        setAddresses(prev => prev.filter(addr => addr.id !== id));
      } catch (error) {
        console.error('Error deleting address:', error);
        alert('Ошибка удаления адреса');
      }
    }
  };

  // Установка основного адреса
  const handleSetPrimary = async (id: number) => {
    try {
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        is_primary: addr.id === id
      }));
      setAddresses(updatedAddresses);
    } catch (error) {
      console.error('Error setting primary address:', error);
      alert('Ошибка установки основного адреса');
    }
  };

  // Обработка выбора адреса с карты
  const handleMapAddressSelect = (mapAddress: MapAddress) => {
    console.log('🗺️ Address selected from map:', mapAddress);
    
    // Заполняем форму данными с карты
    setFormData({
      street: mapAddress.street || '',
      house_number: mapAddress.house || '',
      apartment: '',
      city: mapAddress.city || 'Ташкент',
      phone_number: '',
      comment: `Выбрано на карте: ${mapAddress.address}`,
      is_primary: addresses.length === 0 // Первый адрес = основной
    });
    
    // Закрываем карту и показываем форму
    setShowMapPicker(false);
    setShowForm(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Заголовок */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-100 mb-2">
          📍 {t('delivery_addresses')}
        </h2>
        <p className="text-gray-400">
          {t('manage_delivery_addresses')}
        </p>
      </div>

      {/* Список адресов */}
      {addresses.length > 0 ? (
        <div className="space-y-4 mb-6">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`p-4 rounded-lg border ${
                address.is_primary
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-gray-600 bg-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {address.is_primary && (
                      <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded">
                        {t('primary')}
                      </span>
                    )}
                    <h3 className="font-medium text-gray-100">
                      {address.street}, {address.house_number}
                      {address.apartment && `, кв. ${address.apartment}`}
                    </h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-1">
                    {address.city}
                  </p>
                  <p className="text-gray-400 text-sm mb-2">
                    {address.phone_number}
                  </p>
                  {address.comment && (
                    <p className="text-gray-500 text-sm italic">
                      {address.comment}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  {!address.is_primary && (
                    <Button
                      onClick={() => handleSetPrimary(address.id)}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 text-sm"
                    >
                      {t('set_as_primary')}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleEdit(address)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                  >
                    {t('edit')}
                  </Button>
                  <Button
                    onClick={() => handleDelete(address.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                  >
                    {t('delete')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 mb-6">
          <p className="text-gray-400 text-lg mb-2">
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
        />
      )}
    </div>
  );
}; 
