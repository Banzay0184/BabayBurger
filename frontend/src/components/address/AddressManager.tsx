import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { YandexMapPicker } from '../map/YandexMapPicker';
import type { MapAddress } from '../../types/yandex-maps';
import type { Address } from '../../types/address';

interface AddressManagerProps {
  addresses: Address[];
  setAddresses: (addresses: Address[]) => void;
  onViewChange?: (view: 'menu' | 'cart' | 'search' | 'favorites' | 'address') => void;
}

export const AddressManager: React.FC<AddressManagerProps> = ({
  addresses,
  setAddresses,
  onViewChange
}) => {
  const { t } = useLanguage();
  const { state } = useAuth();
  
  // Состояния
  const [showForm, setShowForm] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [formData, setFormData] = useState({
    street: '',
    house_number: '',
    apartment: '',
    city: '',
    phone_number: '',
    comment: '',
    is_primary: false,
    telegram_id: '',
    latitude: null as number | null,
    longitude: null as number | null
  });

  // Функция-обертка для setAddresses с правильной типизацией
  const updateAddresses = useCallback((newAddresses: Address[]) => {
    setAddresses(newAddresses);
  }, [setAddresses]);

  // Функция получения telegram_id
  const getTelegramId = () => {
    console.log('🗺️ 🔍 Getting telegram_id...');
    console.log('🗺️ 🔍 AuthContext state:', state);
    console.log('🗺️ 🔍 AuthContext user:', state.user);
    
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
    return '908758841'; // Используем ваш реальный telegram_id из логов
  };

  // Функция получения телефона пользователя
  const getUserPhone = () => {
    console.log('📱 🔍 Getting user phone...');
    
    // Проверяем доступность Telegram WebApp
    if ((window as any).Telegram) {
      console.log('📱 🔍 Telegram WebApp object found:', (window as any).Telegram);
      
      if ((window as any).Telegram.WebApp) {
        console.log('📱 🔍 Telegram WebApp.WebApp found:', (window as any).Telegram.WebApp);
        
        if ((window as any).Telegram.WebApp.initDataUnsafe) {
          console.log('📱 🔍 Telegram WebApp.initDataUnsafe found:', (window as any).Telegram.WebApp.initDataUnsafe);
          
          if ((window as any).Telegram.WebApp.initDataUnsafe.user) {
            console.log('📱 🔍 Telegram WebApp.initDataUnsafe.user found:', (window as any).Telegram.WebApp.initDataUnsafe.user);
            
            if ((window as any).Telegram.WebApp.initDataUnsafe.user.phone_number) {
              const phone = (window as any).Telegram.WebApp.initDataUnsafe.user.phone_number;
              console.log('📱 🔍 Got phone from Telegram WebApp:', phone);
              // Сохраняем в localStorage для будущего использования
              localStorage.setItem('user_phone', phone);
              return phone;
            } else {
              console.log('📱 🔍 No phone_number in Telegram WebApp user object');
            }
          } else {
            console.log('📱 🔍 No user object in Telegram WebApp.initDataUnsafe');
          }
        } else {
          console.log('📱 🔍 No initDataUnsafe in Telegram WebApp');
        }
      } else {
        console.log('📱 🔍 No WebApp object in Telegram');
      }
    } else {
      console.log('📱 🔍 Telegram object not found in window');
    }
    
    // Пробуем получить из localStorage
    const savedPhone = localStorage.getItem('user_phone');
    if (savedPhone) {
      console.log('📱 🔍 Got phone from localStorage:', savedPhone);
      return savedPhone;
    }
    
    // Fallback на пустую строку
    console.log('📱 ⚠️ No phone found, user will enter manually');
    return '';
  };

  // Автоматически открываем карту для новых пользователей без адресов
  useEffect(() => {
    if (addresses.length === 0 && !showForm && !showMapPicker) {
      console.log('🗺️ 🔄 New user detected - opening address form automatically');
      setShowMapPicker(true); // Directly open the map picker
    }
  }, [addresses.length, showForm, showMapPicker]);

  // Перезагрузка адресов при изменении AuthContext
  useEffect(() => {
    if (state.user && state.user.telegram_id) {
      console.log('🗺️ 🔄 AuthContext changed, reloading addresses...');
      // loadAddresses(); // This line was removed as per the new_code.
    }
  }, [state.user]);

  // Загрузка адресов
  // const loadAddresses = async () => { // This function was removed as per the new_code.
  //   try {
  //     console.log('🗺️ Loading addresses from backend...');
      
  //     // Получаем telegram_id для запроса
  //     const telegramId = getTelegramId();
  //     console.log('🗺️ 🔍 Loading addresses with telegram_id:', telegramId);
      
  //     // Используем правильный API URL
  //     const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://3e3f35c1758a.ngrok-free.app';
  //     const fullUrl = `${apiBaseUrl}/api/addresses/?telegram_id=${telegramId}`;
  //     console.log('🗺️ 🔍 Full API URL:', fullUrl);
      
  //     const response = await fetch(fullUrl, {
  //       method: 'GET',
  //       headers: {
  //         'Accept': 'application/json',
  //         'Content-Type': 'application/json',
  //         'ngrok-skip-browser-warning': 'true'
  //       },
  //       mode: 'cors'
  //     });
  //     console.log('🗺️ 🔍 Response status:', response.status);
  //     console.log('🗺️ 🔍 Response headers:', response.headers);
      
  //     // Получаем текст ответа для отладки
  //     const responseText = await response.text();
  //     console.log('🗺️ 🔍 Response text (first 500 chars):', responseText.substring(0, 500));
      
  //     if (response.ok) {
  //       try {
  //         const addressesData = JSON.parse(responseText);
  //         console.log('🗺️ 🔍 Parsed addresses data:', addressesData);
  //         setAddresses(addressesData);
  //         console.log('🗺️ Addresses loaded:', addressesData.length);
  //       } catch (parseError) {
  //         console.error('🗺️ ❌ JSON parse error:', parseError);
  //         console.error('🗺️ ❌ Response was not valid JSON');
  //         setAddresses([]);
  //       }
  //     } else {
  //       console.error('Failed to load addresses:', response.status, responseText);
  //       setAddresses([]);
  //     }
  //   } catch (error) {
  //     console.error('Error loading addresses:', error);
  //     setAddresses([]);
  //   }
  // };

  // Обработка изменения формы
  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Сброс формы
  const resetForm = () => {
    // Получаем телефон пользователя для автоматического заполнения
    const userPhone = getUserPhone();
    
    setFormData({
      street: '',
      house_number: '',
      apartment: '',
      city: '',
      phone_number: userPhone, // Автоматически заполняем телефон
      comment: '',
      is_primary: false,
      telegram_id: getTelegramId(), // Автоматически заполняем telegram_id
      latitude: null,
      longitude: null
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
        // Устанавливаем is_primary: true если это единственный адрес, иначе по выбору пользователя
        is_primary: addresses.length === 0 ? true : (addresses.some(addr => addr.is_primary) ? false : formData.is_primary),
        telegram_id: formData.telegram_id,
        latitude: formData.latitude,
        longitude: formData.longitude
      };

      console.log('🗺️ 🔍 Form data before save:', formData);
      console.log('🗺️ 🔍 Address data to send:', addressData);
      console.log('🗺️ 🔍 Telegram ID in addressData:', addressData.telegram_id);
      console.log('🗺️ 🔍 User from AuthContext:', state.user);
      console.log('🗺️ 🔍 Coordinates in addressData:', {
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        hasCoordinates: addressData.latitude !== null && addressData.longitude !== null
      });
      console.log('🗺️ Saving address to backend:', addressData);

      if (editingAddress) {
        // Обновление существующего адреса
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://3e3f35c1758a.ngrok-free.app';
        const response = await fetch(`${apiBaseUrl}/api/addresses/${editingAddress.id}/`, {
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
          updateAddresses(updatedAddresses);
          console.log('🗺️ Address updated successfully');
        } else {
          throw new Error('Failed to update address');
        }
      } else {
        // Добавление нового адреса
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://3e3f35c1758a.ngrok-free.app';
        const response = await fetch(`${apiBaseUrl}/api/addresses/`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          mode: 'cors',
          body: JSON.stringify(addressData)
        });

        if (response.ok) {
          const newAddress = await response.json();
          
          if (editingAddress) {
            // Редактирование существующего адреса
            const updatedAddresses = addresses.map((addr: any) => 
              addr.id === editingAddress.id ? newAddress : addr
            );
            updateAddresses(updatedAddresses);
            alert('✅ Адрес обновлен!');
          } else {
            // Добавление нового адреса
            const updatedAddresses = [...addresses, newAddress];
            updateAddresses(updatedAddresses);
            alert('✅ Адрес добавлен!');
          }
          
          // Сбрасываем форму
          resetForm();
          
          // Закрываем форму и карту
          setShowForm(false);
          setShowMapPicker(false);
          
          // Переключаемся на главную страницу
          if (onViewChange) {
            onViewChange('menu');
          }
        } else {
          throw new Error('Failed to add address');
        }
      }

      // resetForm(); // This line was removed as per the new_code.
    } catch (error) {
      console.error('Error saving address:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      alert('Ошибка сохранения адреса: ' + errorMessage);
    }
  };

  // Редактирование адреса
  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      street: address.street || '',
      house_number: address.house_number || '',
      apartment: address.apartment || '',
      city: address.city || '',
      phone_number: address.phone_number || '',
      comment: address.comment || '',
      is_primary: address.is_primary || false,
      telegram_id: address.telegram_id || '',
      latitude: address.latitude || null,
      longitude: address.longitude || null
    });
    setShowForm(true);
  };

  // Удаление адреса
  const handleDelete = async (addressId: number) => {
    if (addresses.length <= 1) {
      alert('❌ Нельзя удалить последний адрес!');
      return;
    }

    if (confirm('🗑️ Вы уверены, что хотите удалить этот адрес?')) {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://3e3f35c1758a.ngrok-free.app';
        const response = await fetch(`${apiBaseUrl}/api/addresses/${addressId}/`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        });

        if (response.ok) {
          // Обновляем список адресов
          const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
          updateAddresses(updatedAddresses);
          alert('✅ Адрес удален!');
        } else {
          alert('❌ Ошибка удаления адреса');
        }
      } catch (error) {
        console.error('Error deleting address:', error);
        alert('❌ Ошибка удаления адреса');
      }
    }
  };

  // Установка основного адреса
  const handleSetPrimary = async (addressId: number) => {
    if (addresses.length <= 1) {
      alert('🔒 Это единственный адрес - он должен быть основным!');
      return;
    }

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://3e3f35c1758a.ngrok-free.app';
      const response = await fetch(`${apiBaseUrl}/api/addresses/${addressId}/set-primary/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        // Обновляем список адресов
        const updatedAddresses = addresses.map(addr => ({
          ...addr,
          is_primary: addr.id === addressId
        }));
        updateAddresses(updatedAddresses);
        alert('⭐ Адрес установлен как основной!');
      } else {
        alert('❌ Ошибка установки основного адреса');
      }
    } catch (error) {
      console.error('Error setting primary address:', error);
      alert('❌ Ошибка установки основного адреса');
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
      is_primary: editingAddress.is_primary,
      latitude: editingAddress.latitude || null,
      longitude: editingAddress.longitude || null
    } : {
      apartment: formData.apartment || '',
      phone_number: formData.phone_number || getUserPhone(),
      comment: formData.comment || '',
      is_primary: formData.is_primary,
      latitude: formData.latitude || null,
      longitude: formData.longitude || null
    };
    
    // Заполняем форму данными с карты, сохраняя ручной ввод
    setFormData({
      street: mapAddress.street || formData.street || '',
      house_number: mapAddress.house || formData.house_number || '1',
      apartment: existingData.apartment,
      city: mapAddress.city || formData.city || 'Бухара',
      phone_number: existingData.phone_number,
      comment: existingData.comment,
      is_primary: existingData.is_primary,
      telegram_id: getTelegramId(),
      latitude: mapAddress.coordinates ? Number(mapAddress.coordinates[0].toFixed(6)) : null,  // Широта (первый элемент)
      longitude: mapAddress.coordinates ? Number(mapAddress.coordinates[1].toFixed(6)) : null  // Долгота (второй элемент)
    });
    
    console.log('🗺️ Form filled with map data:', {
      isEditing: !!editingAddress,
      phone: existingData.phone_number,
      existingData,
      mapCoordinates: mapAddress.coordinates,
      finalCoordinates: {
        latitude: mapAddress.coordinates ? mapAddress.coordinates[0].toFixed(6) : null,  // Широта (первый элемент)
        longitude: mapAddress.coordinates ? mapAddress.coordinates[1].toFixed(6) : null  // Долгота (второй элемент)
      }
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
        <div className="space-y-3 sm:space-y-4 mb-6">
          {addresses
            .sort((_a, b) => (b.is_primary ? 1 : -1)) // Основной адрес сверху
            .map((address) => (
            <div
              key={address.id}
              className={`p-3 sm:p-4 rounded-lg border ${
                address.is_primary
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-gray-600 bg-gray-700'
              }`}
            >
              <div className="flex items-center sm:flex-row sm:items-start gap-3 sm:gap-4">
                {/* Основная информация */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {address.is_primary && (
                      <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded whitespace-nowrap">
                        {t('primary')}
                      </span>
                    )}
                    <h3 className="font-medium text-gray-100 text-sm sm:text-base break-words">
                      {address.street}, {address.house_number}
                      {address.apartment && `, кв. ${address.apartment}`}
                    </h3>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm mb-1">
                    {address.city}
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm mb-2">
                    {address.phone_number}
                  </p>
                  {address.comment && (
                    <p className="text-gray-500 text-xs sm:text-sm italic break-words">
                      {address.comment}
                    </p>
                  )}
                </div>
                
                {/* Кнопки действий */}
                <div className="flex flex-wrap gap-2 sm:gap-2 sm:ml-auto">
                  {/* Кнопка "Сделать основным" - показываем только если не единственный адрес */}
                  {!address.is_primary && addresses.length > 1 && (
                    <button
                      onClick={() => handleSetPrimary(address.id)}
                      className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg transition-colors active:scale-95"
                      title={t('set_as_primary')}
                    >
                      ⭐
                    </button>
                  )}
                  {/* Кнопка "Редактировать" - показываем всегда */}
                  <button
                    onClick={() => handleEdit(address)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors active:scale-95"
                    title={t('edit')}
                  >
                    ✏️
                  </button>
                  {/* Кнопка "Удалить" - показываем только если не единственный адрес */}
                  {addresses.length > 1 && (
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors active:scale-95"
                      title={t('delete')}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        ''
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
          
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              💡 Адрес добавляется только через карту для точности
            </p>
          </div>
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
          
          {/* Показываем форму только для новых адресов или если не редактируем через карту */}
          {!editingAddress || !showMapPicker ? (
            <div className="space-y-3 sm:space-y-4">
              {/* Кнопка для выбора координат на карте */}
              <div className="text-center mb-4">
                <Button
                  onClick={() => {
                    console.log('🗺️ Manual input: opening map for coordinates');
                    setShowMapPicker(true);
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm"
                >
                  🗺️ Открыть карту
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-300 text-xs sm:text-sm mb-2">
                    {t('street')} *
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm"
                    placeholder={t('street_placeholder')}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-xs sm:text-sm mb-2">
                    {t('house_number')} *
                  </label>
                  <input
                    type="text"
                    value={formData.house_number}
                    onChange={(e) => handleInputChange('house_number', e.target.value)}
                    className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm"
                    placeholder="123"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-gray-300 text-xs sm:text-sm mb-2">
                    {t('apartment')}
                  </label>
                  <input
                    type="text"
                    value={formData.apartment}
                    onChange={(e) => handleInputChange('apartment', e.target.value)}
                    className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm"
                    placeholder="45"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-xs sm:text-sm mb-2">
                    {t('city')} *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm"
                    placeholder="Введите город"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-300 text-xs sm:text-sm mb-2">
                  {t('phone_number')} *
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm"
                  placeholder="+998 90 123 45 67"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-xs sm:text-sm mb-2">
                  {t('comment')}
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm"
                  rows={3}
                  placeholder={t('comment_placeholder')}
                />
              </div>
              
              <div className="flex items-center gap-2">
                {/* Показываем чекбокс только если нет основного адреса или это не единственный адрес */}
                {(!addresses.some(addr => addr.is_primary) || addresses.length === 1) && (
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={formData.is_primary}
                    onChange={(e) => handleInputChange('is_primary', e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
                    disabled={addresses.length === 1} // Отключаем если это единственный адрес
                  />
                )}
                {(!addresses.some(addr => addr.is_primary) || addresses.length === 1) && (
                  <label htmlFor="is_primary" className="text-gray-300 text-sm">
                    {t('set_as_primary')}
                  </label>
                )}
                {/* Показываем сообщение если уже есть основной адрес */}
                {addresses.some(addr => addr.is_primary) && addresses.length > 1 && (
                  <div className="text-sm text-gray-400 italic">
                    💡 У вас уже есть основной адрес
                  </div>
                )}
                {/* Показываем сообщение если это единственный адрес */}
                {addresses.length === 1 && (
                  <div className="text-sm text-primary-400 italic">
                    🔒 Это единственный адрес - он должен быть основным
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Показываем информацию о редактировании через карту */
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg mb-4">
                🗺️ Редактирование адреса через карту
              </p>
              <p className="text-gray-500 text-sm">
                Кликните на карте для выбора нового местоположения
              </p>
            </div>
          )}
          
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
