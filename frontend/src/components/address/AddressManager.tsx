import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { YandexMapPicker } from '../map/YandexMapPicker';
import { getApiUrl } from '../../config/api';
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
            }
          }
        }
      }
    }
    
    // Пробуем получить из localStorage
    const savedPhone = localStorage.getItem('user_phone');
    if (savedPhone) {
      console.log('📱 🔍 Got phone from localStorage:', savedPhone);
      return savedPhone;
    }
    
    // Fallback на пустой телефон
    console.log('📱 ⚠️ No phone found, using empty string');
    return '';
  };

  // Функция загрузки адресов
  const loadAddresses = async () => {
    try {
      console.log('🗺️ 🔄 Loading addresses in AddressManager...');
      const telegramId = getTelegramId();
      const url = getApiUrl(`addresses/?telegram_id=${telegramId}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (response.ok) {
        const addressesData = await response.json();
        console.log('🗺️ ✅ Addresses loaded in AddressManager:', addressesData);
        setAddresses(addressesData);
      } else {
        console.error('🗺️ ❌ Failed to load addresses in AddressManager:', response.status);
      }
    } catch (error) {
      console.error('🗺️ ❌ Error loading addresses in AddressManager:', error);
    }
  };

  // Автоматически открываем карту для новых пользователей без адресов
  useEffect(() => {
    if (addresses.length === 0 && !showForm && !showMapPicker) {
      console.log('🗺️ 🔄 New user detected - opening address form automatically');
      setShowMapPicker(true); // Directly open the map picker
    }
  }, [addresses.length, showForm, showMapPicker]);

  // Загружаем адреса при монтировании компонента
  useEffect(() => {
    console.log('🗺️ 🔄 AddressManager mounted, loading addresses...');
    loadAddresses();
  }, []);

  // Перезагрузка адресов при изменении AuthContext
  useEffect(() => {
    if (state.user && state.user.telegram_id) {
      console.log('🗺️ 🔄 AuthContext changed, reloading addresses...');
      loadAddresses();
    }
  }, [state.user]);

  // Специальные стили для Telegram WebApp на мобильных
  useEffect(() => {
    // Добавляем стили для лучшей работы с клавиатурой на мобильных
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .tg-webapp-form {
          padding-bottom: 120px !important;
          min-height: 100vh !important;
        }
        
        .tg-webapp-input:focus {
          transform: translateY(-10px) !important;
          transition: transform 0.3s ease !important;
        }
        
        .tg-webapp-phone-input {
          font-size: 16px !important; /* Предотвращает зум на iOS */
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Автоматическая прокрутка к полю ввода при фокусе
  const handlePhoneFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Прокручиваем к полю ввода телефона
    setTimeout(() => {
      e.target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }, 300); // Небольшая задержка для открытия клавиатуры
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
    console.log('🗺️ 🚀 handleSave called');
    
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

      console.log('🗺️ 📝 Form validation passed, preparing to save...');
      console.log('🗺️ 📝 Form data:', formData);

      // Подготавливаем данные для отправки
      const addressData = {
        street: formData.street,
        house_number: formData.house_number,
        apartment: formData.apartment,
        city: formData.city,
        phone_number: formData.phone_number,
        comment: formData.comment,
        is_primary: formData.is_primary,
        telegram_id: formData.telegram_id,
        latitude: formData.latitude,
        longitude: formData.longitude
      };

      console.log('🗺️ 📤 Sending address data to backend:', addressData);

      // Определяем URL и метод
      const url = editingAddress 
        ? getApiUrl(`addresses/${editingAddress.id}/`)
        : getApiUrl('addresses/');
      const method = editingAddress ? 'PUT' : 'POST';

      console.log('🗺️ 🌐 API request:', { method, url });

      const response = await fetch(url, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(addressData)
      });

      console.log('🗺️ 📥 Backend response status:', response.status);

      if (response.ok) {
        const newAddress = await response.json();
        console.log('🗺️ ✅ Address saved successfully:', newAddress);
        
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
          console.log('🗺️ 🔄 Switching view from address to menu...');
          onViewChange('menu');
          console.log('🗺️ ✅ View switched to menu');
        }
      } else {
        const errorData = await response.json();
        console.error('🗺️ ❌ Backend error:', errorData);
        throw new Error(`Backend error: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🗺️ ❌ Error in handleSave:', error);
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
        // Получаем telegram_id для запроса
        const telegramId = getTelegramId();
        
        const url = getApiUrl(`addresses/${addressId}/`);
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ telegram_id: telegramId })
        });

        if (response.ok) {
          // Обновляем список адресов
          const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
          updateAddresses(updatedAddresses);
          alert('✅ Адрес удален!');
        } else {
          const errorData = await response.json();
          alert(`❌ Ошибка удаления адреса: ${errorData.error || 'Неизвестная ошибка'}`);
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
      // Получаем telegram_id для запроса
      const telegramId = getTelegramId();
      
      // Сначала сбрасываем все адреса как не основные
      const updatePromises = addresses.map(async (addr) => {
        if (addr.id !== addressId) {
          const url = getApiUrl(`addresses/${addr.id}/`);
          return fetch(url, {
            method: 'PUT',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
              ...addr,
              is_primary: false,
              telegram_id: telegramId
            })
          });
        }
        return null;
      });

      // Ждем завершения всех обновлений
      await Promise.all(updatePromises.filter(Boolean));

      // Теперь устанавливаем выбранный адрес как основной
      const primaryAddr = addresses.find(addr => addr.id === addressId);
      if (primaryAddr) {
        const url = getApiUrl(`addresses/${addressId}/`);
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({
            ...primaryAddr,
            is_primary: true,
            telegram_id: telegramId
          })
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
          const errorData = await response.json();
          alert(`❌ Ошибка установки основного адреса: ${errorData.error || 'Неизвестная ошибка'}`);
        }
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

  // Обработчик отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Предотвращаем стандартную отправку формы
    console.log('🗺️ Form submitted, calling handleSave...');
    handleSave();
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

      {/* Форма добавления/редактирования адреса */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-6 animate-fade-in min-h-screen sm:min-h-0 tg-webapp-form">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-100">
              {editingAddress ? t('edit_address') : t('add_address')}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 pb-20 sm:pb-4">
            {/* Поле улицы */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Улица *
              </label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm tg-webapp-input"
                placeholder="Введите название улицы"
                required
              />
            </div>

            {/* Поле номера дома */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Номер дома *
              </label>
              <input
                type="text"
                name="house_number"
                value={formData.house_number}
                onChange={(e) => handleInputChange('house_number', e.target.value)}
                className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm tg-webapp-input"
                placeholder="Введите номер дома"
                required
              />
            </div>

            {/* Поле квартиры */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Квартира
              </label>
              <input
                type="text"
                name="apartment"
                value={formData.apartment}
                onChange={(e) => handleInputChange('apartment', e.target.value)}
                className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm tg-webapp-input"
                placeholder="Введите номер квартиры (необязательно)"
              />
            </div>

            {/* Поле города */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Город *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm tg-webapp-input"
                placeholder="Введите название города"
                required
              />
            </div>

            {/* Поле телефона - улучшенное для мобильных */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Номер телефона *
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                onFocus={handlePhoneFocus}
                className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm tg-webapp-input tg-webapp-phone-input"
                placeholder="+998 90 123 45 67"
                required
                autoComplete="tel"
                inputMode="numeric"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <span className="text-xs text-gray-400">📱</span>
              </div>
            </div>

            {/* Поле комментария */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Комментарий
              </label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={(e) => handleInputChange('comment', e.target.value)}
                className="w-full px-2 sm:px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:border-primary-500 focus:outline-none text-sm resize-none"
                placeholder="Дополнительная информация (необязательно)"
                rows={2}
              />
            </div>

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

            {/* Чекбокс основного адреса */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_primary"
                name="is_primary"
                checked={formData.is_primary}
                onChange={(e) => handleInputChange('is_primary', e.target.checked)}
                disabled={addresses.length === 0}
                className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500 focus:ring-2"
              />
              <label htmlFor="is_primary" className="text-sm text-gray-300">
                {addresses.length === 0 
                  ? '🔒 Это единственный адрес - он должен быть основным'
                  : 'Установить как основной адрес доставки'
                }
              </label>
            </div>

            {/* Кнопки действий */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm"
              >
                {editingAddress ? 'Обновить адрес' : 'Добавить адрес'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingAddress(null);
                  resetForm();
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 text-sm"
              >
                Отмена
              </Button>
            </div>
          </form>
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
