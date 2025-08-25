import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
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
  telegram_id?: string;
}

export const AddressManager: React.FC = () => {
  const { t } = useLanguage();
  const { state } = useAuth();
  
  // Состояния
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    street: '',
    house_number: '',
    apartment: '',
    city: '',
    phone_number: '',
    comment: '',
    is_primary: false,
    telegram_id: ''
  });

  // Функция получения telegram_id
  const getTelegramId = () => {
    // Пробуем получить из AuthContext (гостевой пользователь)
    if (state.user && state.user.telegram_id) {
      console.log('🗺️ 🔍 Got telegram_id from AuthContext:', state.user.telegram_id);
      return state.user.telegram_id.toString();
    }
    
    // Пробуем получить из localStorage
    const savedTelegramId = localStorage.getItem('user_telegram_id');
    if (savedTelegramId) {
      console.log('🗺️ 🔍 Got telegram_id from localStorage:', savedTelegramId);
      return savedTelegramId;
    }
    
    // Пробуем получить из Telegram WebApp
    if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) {
      const telegramId = (window as any).Telegram.WebApp.initDataUnsafe.user.id;
      // Сохраняем в localStorage для будущего использования
      localStorage.setItem('user_telegram_id', telegramId.toString());
      console.log('🗺️ 🔍 Got telegram_id from Telegram WebApp:', telegramId);
      return telegramId.toString();
    }
    
    // Fallback на гостевой ID из логов
    console.log('🗺️ ⚠️ No telegram_id found, using fallback');
    return '123456789'; // Fallback ID из логов
  };

  // Загрузка адресов при монтировании
  useEffect(() => {
    loadAddresses();
  }, []);

  // Загрузка адресов
  const loadAddresses = async () => {
    try {
      console.log('🗺️ Loading addresses from backend...');
      
      // Получаем telegram_id для запроса
      const telegramId = getTelegramId();
      console.log('🗺️ 🔍 Loading addresses with telegram_id:', telegramId);
      
      const response = await fetch(`/api/addresses/?telegram_id=${telegramId}`);
      if (response.ok) {
        const addressesData = await response.json();
        setAddresses(addressesData);
        console.log('🗺️ Addresses loaded:', addressesData.length);
      } else {
        console.error('Failed to load addresses:', response.status);
        setAddresses([]);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      setAddresses([]);
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
      city: '',
      phone_number: '',
      comment: '',
      is_primary: false,
      telegram_id: ''
    });
    setEditingAddress(null);
    setShowForm(false);
  };

  // Сохранение адреса
  const handleSave = async () => {
    try {
      // Проверяем обязательные поля
      if (!formData.street) {
        alert('Пожалуйста, введите улицу');
        return;
      }
      
      if (!formData.house_number || formData.house_number.trim() === '') {
        alert('Пожалуйста, введите номер дома');
        return;
      }
      
      if (!formData.phone_number) {
        alert('Пожалуйста, введите номер телефона');
        return;
      }

      // Подготавливаем данные для отправки
      const addressData = {
        street: formData.street,
        house_number: formData.house_number,
        apartment: formData.apartment || '',
        city: formData.city || 'Бухара',
        phone_number: formData.phone_number,
        comment: formData.comment || '',
        is_primary: formData.is_primary,
        telegram_id: formData.telegram_id
      };

      console.log('🗺️ 🔍 Form data before save:', formData);
      console.log('🗺️ 🔍 Address data to send:', addressData);
      console.log('🗺️ 🔍 Telegram ID in addressData:', addressData.telegram_id);
      console.log('🗺️ 🔍 User from AuthContext:', state.user);
      console.log('🗺️ Saving address to backend:', addressData);

      if (editingAddress) {
        // Обновление существующего адреса
        const response = await fetch('/api/addresses/' + editingAddress.id + '/', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(addressData)
        });

        if (response.ok) {
          const updatedAddress = await response.json();
          const updatedAddresses = addresses.map(addr =>
            addr.id === editingAddress.id ? updatedAddress : addr
          );
          setAddresses(updatedAddresses);
          console.log('🗺️ Address updated successfully');
        } else {
          throw new Error('Failed to update address');
        }
      } else {
        // Добавление нового адреса
        const response = await fetch('/api/addresses/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(addressData)
        });

        if (response.ok) {
          const newAddress = await response.json();
          setAddresses(prev => [...prev, newAddress]);
          console.log('🗺️ Address added successfully');
        } else {
          throw new Error('Failed to add address');
        }
      }

      resetForm();
    } catch (error) {
      console.error('Error saving address:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      alert('Ошибка сохранения адреса: ' + errorMessage);
    }
  };

  // Редактирование адреса
  const handleEdit = (address: Address) => {
    console.log('🗺️ Editing address:', address);
    setEditingAddress(address);
    setFormData({
      street: address.street,
      house_number: address.house_number,
      apartment: address.apartment || '',
      city: address.city,
      phone_number: address.phone_number,
      comment: address.comment || '',
      is_primary: address.is_primary,
      telegram_id: address.telegram_id || ''
    });
    setShowForm(true);
  };

  // Удаление адреса
  const handleDelete = async (id: number) => {
    if (confirm('Вы уверены, что хотите удалить этот адрес?')) {
      try {
        console.log('🗺️ Deleting address:', id);
        
        // Получаем telegram_id для запроса
        const telegramId = getTelegramId();
        
        // Удаляем из базы данных
        const response = await fetch(`/api/addresses/${id}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ telegram_id: telegramId })
        });
        
        if (response.ok) {
          // Удаляем из локального состояния только после успешного удаления из БД
          setAddresses(prev => prev.filter(addr => addr.id !== id));
          console.log('🗺️ Address deleted from backend successfully');
          
          // Если удаляли редактируемый адрес, закрываем форму
          if (editingAddress && editingAddress.id === id) {
            setEditingAddress(null);
            setShowForm(false);
          }
        } else {
          const errorData = await response.json();
          console.error('Failed to delete address from backend:', errorData);
          alert(`Ошибка удаления адреса: ${errorData.error || 'Неизвестная ошибка'}`);
        }
      } catch (error) {
        console.error('Error deleting address:', error);
        alert('Ошибка удаления адреса: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
      }
    }
  };

  // Установка основного адреса
  const handleSetPrimary = async (id: number) => {
    try {
      console.log('🗺️ Setting primary address:', id);
      
      // Сначала сбрасываем все адреса как не основные
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        is_primary: false
      }));
      
      // Затем устанавливаем выбранный как основной
      const finalAddresses = updatedAddresses.map(addr => ({
        ...addr,
        is_primary: addr.id === id
      }));
      
      setAddresses(finalAddresses);
      
      // Обновляем в базе данных
      const telegramId = getTelegramId();
      const response = await fetch(`/api/addresses/${id}/set-primary/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegram_id: telegramId })
      });
      
      if (response.ok) {
        console.log('🗺️ Primary address updated in backend');
      } else {
        console.error('Failed to update primary address in backend');
      }
    } catch (error) {
      console.error('Error setting primary address:', error);
      alert('Ошибка установки основного адреса');
    }
  };

    // Обработка выбора адреса с карты
  const handleMapAddressSelect = (mapAddress: MapAddress) => {
    console.log('🗺️ Address selected from map:', mapAddress);
    
    // Получаем номер телефона из localStorage или профиля пользователя
    const getUserPhone = () => {
      // Пробуем получить из localStorage
      const savedPhone = localStorage.getItem('user_phone');
      if (savedPhone) return savedPhone;
      
      // Пробуем получить из Telegram WebApp
      if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.phone_number) {
        return (window as any).Telegram.WebApp.initDataUnsafe.user.phone_number;
      }
      
      // Fallback на пустую строку
      return '';
    };
    
    // Если редактируем адрес, сохраняем существующие данные
    const existingData = editingAddress ? {
      apartment: editingAddress.apartment || '',
      phone_number: editingAddress.phone_number || getUserPhone(),
      comment: editingAddress.comment || '',
      is_primary: editingAddress.is_primary
    } : {
      apartment: '',
      phone_number: getUserPhone(),
      comment: '',
      is_primary: false
    };
    
    // Заполняем форму данными с карты
    setFormData({
      street: mapAddress.street || '',
      house_number: mapAddress.house || '1',
      apartment: existingData.apartment,
      city: mapAddress.city || 'Бухара',
      phone_number: existingData.phone_number,
      comment: existingData.comment,
      is_primary: existingData.is_primary,
      telegram_id: getTelegramId()
    });
    
    console.log('🗺️ Form filled with map data:', {
      isEditing: !!editingAddress,
      phone: existingData.phone_number,
      existingData
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
        </div>
      )}

      {/* Форма добавления/редактирования */}
      {showForm && (
        <div className="tg-card-modern p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-100">
              {editingAddress ? t('edit_address') : t('add_address')}
            </h3>
            
            {/* Кнопка карты для редактирования */}
            {editingAddress && (
              <Button
                onClick={() => {
                  console.log('🗺️ Edit address via map clicked');
                  setShowMapPicker(true);
                }}
                className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 text-sm"
              >
                🗺️ Изменить на карте
              </Button>
            )}
          </div>
          
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
                  placeholder="Введите город"
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
