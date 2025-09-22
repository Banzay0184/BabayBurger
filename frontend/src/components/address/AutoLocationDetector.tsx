import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import type { Address } from '../../types/address';
import { addressApi } from '../../api/addressApi';

interface AutoLocationDetectorProps {
  onAddressDetected: (address: Address | null) => void;
  onShowMap: () => void;
  onClose: () => void;
  existingAddresses?: Address[];
}

export const AutoLocationDetector: React.FC<AutoLocationDetectorProps> = React.memo(({
  onAddressDetected,
  onShowMap,
  onClose,
  existingAddresses = []
}) => {
  const { state } = useAuth();
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [matchedAddress, setMatchedAddress] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveryZoneCheck, setDeliveryZoneCheck] = useState<{
    is_in_delivery_zone: boolean;
    message: string;
  } | null>(null);
  
  // Ref для предотвращения множественных вызовов
  const hasDetectedRef = useRef(false);
  const detectionTimeoutRef = useRef<number | null>(null);

  // Функция для получения местоположения через Telegram Web App
  const getTelegramLocation = useCallback(async (): Promise<[number, number] | null> => {
    try {
      // Проверяем, есть ли доступ к Telegram Web App
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const webApp = (window as any).Telegram.WebApp;
        
        // Запрашиваем местоположение через Telegram Web App
        if (webApp.requestLocation) {
          return new Promise((resolve) => {
            webApp.requestLocation((location: any) => {
              if (location && location.latitude && location.longitude) {
                console.log('📍 Telegram location received:', location);
                resolve([location.latitude, location.longitude]);
              } else {
                console.log('❌ Telegram location not available');
                resolve(null);
              }
            });
          });
        }
      }
      
      // Fallback на стандартный Geolocation API
      if (navigator.geolocation) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const coords: [number, number] = [
                position.coords.latitude,
                position.coords.longitude
              ];
              console.log('📍 Browser location received:', coords);
              resolve(coords);
            },
            (error) => {
              console.log('❌ Geolocation error:', error.message);
              console.log('❌ Error code:', error.code);
              resolve(null);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 минут
            }
          );
        });
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting location:', error);
      return null;
    }
  }, []);

  // Функция для геокодирования координат в адрес
  const geocodeCoordinates = useCallback(async (lat: number, lon: number): Promise<string | null> => {
    try {
      // Используем Яндекс Геокодер для получения адреса
      const response = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?format=json&geocode=${lon},${lat}&apikey=3033f881-c5ec-434f-96aa-e13da893f61f&lang=ru_RU`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      const featureMember = data.response?.GeoObjectCollection?.featureMember;
      
      if (featureMember && featureMember.length > 0) {
        const address = featureMember[0].GeoObject.metaDataProperty.GeocoderMetaData.text;
        console.log('📍 Geocoded address:', address);
        return address;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  }, []);

  // Функция для проверки зоны доставки
  const checkDeliveryZone = useCallback(async (address: string, coords: [number, number]): Promise<{
    is_in_delivery_zone: boolean;
    message: string;
  }> => {
    try {
      // Улучшенный парсинг адреса
      const addressParts = address.split(',').map(part => part.trim());
      
      // Определяем город - ищем в конце адреса
      let city = 'Бухара'; // По умолчанию
      let street = '';
      let houseNumber = '';
      
      // Ищем город в конце адреса (обычно это последняя часть)
      const possibleCities = ['Бухара', 'Каган', 'Бухарская область', 'Узбекистан'];
      for (let i = addressParts.length - 1; i >= 0; i--) {
        const part = addressParts[i];
        if (possibleCities.some(c => part.toLowerCase().includes(c.toLowerCase()))) {
          city = part;
          break;
        }
      }
      
      // Улица - первая часть
      street = addressParts[0] || '';
      
      // Номер дома - ищем число во второй части или в первой
      for (let i = 1; i < Math.min(3, addressParts.length); i++) {
        const part = addressParts[i];
        if (part && /\d/.test(part)) {
          houseNumber = part;
          break;
        }
      }
      
      // Если номер дома не найден, пробуем найти в улице
      if (!houseNumber && street) {
        const houseMatch = street.match(/(\d+[а-я]?)/i);
        if (houseMatch) {
          houseNumber = houseMatch[1];
          street = street.replace(houseMatch[0], '').trim();
        }
      }

      const addressData = {
        street,
        house_number: houseNumber,
        city,
        latitude: coords[0],
        longitude: coords[1]
      };

      console.log('🚚 Checking delivery zone for address:', addressData);
      console.log('🚚 Original address string:', address);
      console.log('🚚 Parsed components:', { street, houseNumber, city });
      
      const result = await addressApi.checkDeliveryZone(addressData);
      console.log('🚚 Delivery zone check result:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error checking delivery zone:', error);
      return {
        is_in_delivery_zone: false,
        message: 'Ошибка проверки зоны доставки'
      };
    }
  }, []);

  // Функция для поиска похожих адресов
  const findSimilarAddress = useCallback((detectedAddr: string, addresses: Address[]): Address | null => {
    const detectedLower = detectedAddr.toLowerCase();
    
    for (const address of addresses) {
      const addressLower = address.full_address.toLowerCase();
      
      // Проверяем точное совпадение
      if (addressLower === detectedLower) {
        return address;
      }
      
      // Проверяем частичное совпадение (улица и дом)
      const addressParts = addressLower.split(',');
      const detectedParts = detectedLower.split(',');
      
      if (addressParts.length >= 2 && detectedParts.length >= 2) {
        const addressStreet = addressParts[0].trim();
        const detectedStreet = detectedParts[0].trim();
        
        if (addressStreet === detectedStreet) {
          return address;
        }
      }
    }
    
    return null;
  }, []);

  // Основная функция определения адреса
  const detectLocation = useCallback(async () => {
    setIsDetecting(true);
    setError(null);
    
    try {
      // 1. Получаем координаты
      const coords = await getTelegramLocation();
      if (!coords) {
        throw new Error('Не удалось получить местоположение');
      }
      
      setCoordinates(coords);
      
      // 2. Получаем адрес по координатам
      const address = await geocodeCoordinates(coords[0], coords[1]);
      if (!address) {
        throw new Error('Не удалось определить адрес по координатам');
      }
      
      setDetectedAddress(address);
      
      // 3. Проверяем зону доставки
      try {
        const deliveryZoneResult = await checkDeliveryZone(address, coords);
        setDeliveryZoneCheck(deliveryZoneResult);
        
        // Если адрес не в зоне доставки, показываем ошибку но продолжаем
        if (!deliveryZoneResult.is_in_delivery_zone) {
          // Не устанавливаем error, так как это не критическая ошибка
          // Пользователь может выбрать другой адрес
          console.log('⚠️ Address not in delivery zone:', deliveryZoneResult.message);
        }
      } catch (deliveryError) {
        console.warn('⚠️ Delivery zone check failed:', deliveryError);
        // Устанавливаем результат по умолчанию, если проверка зоны не удалась
        setDeliveryZoneCheck({
          is_in_delivery_zone: true, // Предполагаем, что доставка доступна
          message: 'Не удалось проверить зону доставки. Пожалуйста, подтвердите адрес.'
        });
      }
      
      // 4. Загружаем существующие адреса пользователя
      const userAddresses = await addressApi.getUserAddresses(state.user?.telegram_id);
      
      // 5. Ищем похожий адрес
      const similarAddress = findSimilarAddress(address, userAddresses);
      setMatchedAddress(similarAddress);
      
    } catch (error) {
      console.error('❌ Location detection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка определения местоположения';
      
      // Если это ошибка геолокации, показываем более понятное сообщение
      if (errorMessage.includes('местоположение') || errorMessage.includes('geolocation')) {
        setError('Не удалось получить доступ к местоположению. Пожалуйста, разрешите доступ к геолокации в настройках браузера или выберите адрес на карте.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsDetecting(false);
    }
  }, [getTelegramLocation, geocodeCoordinates, checkDeliveryZone, findSimilarAddress]);

  // Функция подтверждения адреса
  const confirmAddress = useCallback(async (address: Address) => {
    try {
      onAddressDetected(address);
      onClose();
    } catch (error) {
      console.error('❌ Error confirming address:', error);
      setError('Ошибка подтверждения адреса');
    }
  }, [onAddressDetected, onClose]);

  // Функция создания нового адреса
  const createNewAddress = useCallback(async () => {
    if (!detectedAddress || !coordinates) return;
    
    try {
      // Создаем новый адрес на основе определенного местоположения
      const newAddress: Address = {
        id: -1, // Временный ID
        user: Number(state.user?.id) || 0,
        street: detectedAddress.split(',')[0] || '',
        house_number: detectedAddress.split(',')[1] || '',
        apartment: '',
        city: 'Бухара',
        comment: 'Автоматически определенный адрес',
        coordinates: `${coordinates[1]},${coordinates[0]}`, // longitude,latitude
        latitude: coordinates[0],
        longitude: coordinates[1],
        phone_number: state.user?.phone_number || '',
        formatted_phone: state.user?.phone_number || '',
        full_address: detectedAddress,
        is_primary: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        telegram_id: String(state.user?.telegram_id || '')
      };
      
      onAddressDetected(newAddress);
      onClose();
    } catch (error) {
      console.error('❌ Error creating new address:', error);
      setError('Ошибка создания нового адреса');
    }
  }, [detectedAddress, coordinates, state.user, onAddressDetected, onClose]);

  // Функция для выбора существующего адреса
  const selectExistingAddress = useCallback(async (address: Address) => {
    try {
      console.log('📍 Selecting existing address:', address);
      onAddressDetected(address);
      onClose();
    } catch (error) {
      console.error('❌ Error selecting existing address:', error);
      setError('Ошибка выбора адреса');
    }
  }, [onAddressDetected, onClose]);

  // Мемоизируем существующие адреса для оптимизации
  const memoizedExistingAddresses = useMemo(() => existingAddresses, [existingAddresses]);

  // Автоматически запускаем определение при загрузке с дебаунсингом
  useEffect(() => {
    // Предотвращаем множественные вызовы
    if (hasDetectedRef.current) return;
    
    // Очищаем предыдущий таймер
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }
    
    // Запускаем с небольшой задержкой для оптимизации
    detectionTimeoutRef.current = setTimeout(() => {
      if (!hasDetectedRef.current) {
        hasDetectedRef.current = true;
        detectLocation();
      }
    }, 100);

    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [detectLocation]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              📍 Определение адреса
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {isDetecting && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Определяем ваше местоположение...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-red-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Ошибка определения адреса
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => {
                        console.log('🔄 Попробовать снова clicked');
                        detectLocation();
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2"
                    >
                      Попробовать снова
                    </Button>
                    <Button
                      onClick={() => {
                        console.log('🗺️ Выбрать на карте clicked');
                        onShowMap();
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-2"
                    >
                      Выбрать на карте
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {detectedAddress && !isDetecting && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">
                  📍 Ваш текущий адрес:
                </h3>
                <p className="text-green-700 mb-2">{detectedAddress}</p>
                <p className="text-sm text-green-600">
                  💡 Этот адрес отличается от ваших сохраненных адресов
                </p>
              </div>

              {deliveryZoneCheck && (
                <div className={`border rounded-lg p-4 ${
                  deliveryZoneCheck.is_in_delivery_zone 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <h3 className={`font-semibold mb-2 ${
                    deliveryZoneCheck.is_in_delivery_zone 
                      ? 'text-green-800' 
                      : 'text-red-800'
                  }`}>
                    {deliveryZoneCheck.is_in_delivery_zone ? '✅ Доставка доступна' : '❌ Доставка недоступна'}
                  </h3>
                  <p className={`text-sm ${
                    deliveryZoneCheck.is_in_delivery_zone 
                      ? 'text-green-700' 
                      : 'text-red-700'
                  }`}>
                    {deliveryZoneCheck.message}
                  </p>
                </div>
              )}

              {deliveryZoneCheck?.is_in_delivery_zone && matchedAddress ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">
                    ✅ Найден похожий адрес:
                  </h3>
                  <p className="text-blue-700 mb-3">{matchedAddress.full_address}</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => confirmAddress(matchedAddress)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Да, это мой адрес
                    </Button>
                    <Button
                      onClick={onShowMap}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      Нет, выбрать другой
                    </Button>
                  </div>
                </div>
              ) : deliveryZoneCheck?.is_in_delivery_zone ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    🆕 Новый адрес
                  </h3>
                  <p className="text-yellow-700 mb-3">
                    Этот адрес не найден в вашем списке. Хотите добавить его?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={createNewAddress}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Да, добавить
                    </Button>
                    <Button
                      onClick={onShowMap}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      Выбрать на карте
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2">
                      ❌ Доставка недоступна
                    </h3>
                    <p className="text-red-700 mb-3">
                      К сожалению, в этот адрес мы не доставляем. Выберите один из ваших сохраненных адресов:
                    </p>
                  </div>

                  {/* Список существующих адресов */}
                  {memoizedExistingAddresses.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-800 mb-3">
                        📍 Ваши сохраненные адреса:
                      </h4>
                      {memoizedExistingAddresses.map((address) => (
                        <div
                          key={`auto-location-${address.id}`}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => selectExistingAddress(address)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">
                                {address.full_address || `${address.street}, д. ${address.house_number}`}
                              </p>
                              {address.comment && (
                                <p className="text-xs text-gray-600 mt-1">
                                  💬 {address.comment}
                                </p>
                              )}
                              {address.is_primary && (
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
                                  ⭐ Основной
                                </span>
                              )}
                            </div>
                            <div className="ml-2">
                              <span className="text-gray-400">→</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-700 text-sm">
                        У вас нет сохраненных адресов. Добавьте адрес для доставки.
                      </p>
                    </div>
                  )}

                  {/* Кнопки действий */}
                  <div className="flex gap-2">
                    <Button
                      onClick={onShowMap}
                      className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                    >
                      🗺️ Выбрать на карте
                    </Button>
                    <Button
                      onClick={onClose}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isDetecting && !detectedAddress && !error && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Не удалось автоматически определить адрес. Это может быть связано с настройками браузера или отсутствием разрешения на доступ к местоположению.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={detectLocation}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Попробовать снова
                </Button>
                <Button
                  onClick={onShowMap}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Выбрать на карте
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
