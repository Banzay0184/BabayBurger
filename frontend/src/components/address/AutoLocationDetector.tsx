import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import type { Address } from '../../types/address';
import { addressApi } from '../../api/addressApi';

interface AutoLocationDetectorProps {
  onAddressDetected: (address: Address | null) => void;
  onShowMap: () => void;
  onClose: () => void;
  onShowForm?: (address: Address) => void; // Новый проп для показа формы
  existingAddresses?: Address[];
}

export const AutoLocationDetector: React.FC<AutoLocationDetectorProps> = React.memo(({
  onAddressDetected,
  onShowMap,
  onClose,
  onShowForm,
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
  const [showExistingAddresses, setShowExistingAddresses] = useState(false);
  
  // Ref для предотвращения множественных вызовов
  const hasDetectedRef = useRef(false);
  const detectionTimeoutRef = useRef<number | null>(null);

  // Функция для получения местоположения через Telegram Web App с улучшенной точностью
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
                // Сохраняем полную точность координат для лучшего геокодирования
                const coords: [number, number] = [
                  location.latitude,
                  location.longitude
                ];
                console.log('📍 Telegram location received:', coords);
                console.log('📍 Original accuracy:', location.accuracy || 'unknown');
                console.log('📍 Full precision coordinates:', {
                  lat: location.latitude,
                  lng: location.longitude
                });
                resolve(coords);
              } else {
                console.log('❌ Telegram location not available');
                resolve(null);
              }
            });
          });
        }
      }
      
      // Fallback на стандартный Geolocation API с улучшенными настройками
      if (navigator.geolocation) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Сохраняем полную точность координат
              const coords: [number, number] = [
                position.coords.latitude,
                position.coords.longitude
              ];
              console.log('📍 Browser location received:', coords);
              console.log('📍 Location accuracy:', position.coords.accuracy, 'meters');
              console.log('📍 Full precision coordinates:', {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
              resolve(coords);
            },
            (error) => {
              console.log('❌ Geolocation error:', error.message);
              console.log('❌ Error code:', error.code);
              resolve(null);
            },
            {
              enableHighAccuracy: true,
              timeout: 20000, // Увеличиваем таймаут для лучшей точности
              maximumAge: 30000 // Уменьшаем кэш до 30 секунд для свежести
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

  // Кэш для геокодирования (ключ: "lat,lng", значение: адрес)
  const geocodeCache = useRef<Map<string, string>>(new Map());

  // Функция для геокодирования координат в адрес с кэшированием
  const geocodeCoordinates = useCallback(async (lat: number, lon: number): Promise<string | null> => {
    try {
      // Создаем ключ для кэша (более точные координаты для избежания конфликтов)
      const cacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
      
      // Проверяем кэш
      if (geocodeCache.current.has(cacheKey)) {
        const cachedAddress = geocodeCache.current.get(cacheKey);
        console.log('📍 Using cached address:', cachedAddress);
        return cachedAddress || null;
      }
      
      console.log('📍 Geocoding coordinates:', lat, lon);
      console.log('📍 Cache key:', cacheKey);
      console.log('📍 Cache size:', geocodeCache.current.size);
      
      // Используем Яндекс Геокодер для получения адреса
      const response = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?format=json&geocode=${lon},${lat}&apikey=3033f881-c5ec-434f-96aa-e13da893f61f&lang=ru_RU&results=1&kind=house`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      const featureMember = data.response?.GeoObjectCollection?.featureMember;
      
      if (featureMember && featureMember.length > 0) {
        const address = featureMember[0].GeoObject.metaDataProperty.GeocoderMetaData.text;
        console.log('📍 Geocoded address:', address);
        
        // Сохраняем в кэш
        geocodeCache.current.set(cacheKey, address);
        
        // Ограничиваем размер кэша (максимум 10 записей для свежести)
        if (geocodeCache.current.size > 10) {
          const firstKey = geocodeCache.current.keys().next().value;
          geocodeCache.current.delete(firstKey);
          console.log('📍 Cache cleaned, removed key:', firstKey);
        }
        
        return address;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  }, []);

  // Функция для парсинга адреса
  const parseAddress = useCallback((address: string) => {
    const addressParts = address.split(',').map(part => part.trim());
    
    let city = 'Бухара'; // По умолчанию
    let street = '';
    let houseNumber = '';
    
    console.log('🔍 Parsing address parts:', addressParts);
    console.log('🔍 Full address:', address);
    
    // Определяем город - ищем Каган или Бухара
    const cityKeywords = ['Каган', 'Бухара'];
    for (let i = addressParts.length - 1; i >= 0; i--) {
      const part = addressParts[i];
      const foundCity = cityKeywords.find(city => 
        part.toLowerCase().includes(city.toLowerCase())
      );
      if (foundCity) {
        city = foundCity;
        console.log('🏙️ Found city:', city, 'in part:', part);
        break;
      }
    }
    
    // Ищем улицу - обычно содержит слово "улица" или "street"
    const streetKeywords = ['улица', 'street', 'проспект', 'проезд', 'переулок'];
    for (let i = 0; i < addressParts.length; i++) {
      const part = addressParts[i];
      const foundStreet = streetKeywords.find(keyword => 
        part.toLowerCase().includes(keyword.toLowerCase())
      );
      if (foundStreet) {
        street = part;
        console.log('🛣️ Found street:', street);
        break;
      }
    }
    
    // Если улица не найдена по ключевым словам, берем предпоследнюю часть
    if (!street && addressParts.length >= 2) {
      street = addressParts[addressParts.length - 2];
      console.log('🛣️ Using second-to-last part as street:', street);
    }
    
    // Улучшенный поиск номера дома
    // Сначала ищем в последней части (обычно там номер дома)
    if (addressParts.length > 0) {
      const lastPart = addressParts[addressParts.length - 1];
      const lastNumberMatch = lastPart.match(/(\d+[а-я]?)/i);
      if (lastNumberMatch) {
        houseNumber = lastNumberMatch[1];
        console.log('🏠 Found house number in last part:', houseNumber, 'in part:', lastPart);
      }
    }
    
    // Если номер дома не найден в последней части, ищем в любой части
    if (!houseNumber) {
      for (let i = 0; i < addressParts.length; i++) {
        const part = addressParts[i];
        const numberMatch = part.match(/(\d+[а-я]?)/i);
        if (numberMatch) {
          houseNumber = numberMatch[1];
          console.log('🏠 Found house number:', houseNumber, 'in part:', part);
          break;
        }
      }
    }
    
    // Если номер дома найден в улице, убираем его из улицы
    if (houseNumber && street && street.includes(houseNumber)) {
      street = street.replace(houseNumber, '').trim();
      console.log('🛣️ Cleaned street after removing house number:', street);
    }
    
    // Очищаем улицу от лишних слов
    if (street) {
      street = street.replace(/улица\s*/i, '').trim();
      street = street.replace(/street\s*/i, '').trim();
    }
    
    console.log('🔍 Parsing result:', { city, street, houseNumber });
    
    return { city, street, houseNumber };
  }, []);

  // Функция для проверки зоны доставки
  const checkDeliveryZone = useCallback(async (address: string, coords: [number, number]): Promise<{
    is_in_delivery_zone: boolean;
    message: string;
  }> => {
    try {
      // Используем функцию парсинга адреса
      const { city, street, houseNumber } = parseAddress(address);

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
  }, [parseAddress]);

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
      if (errorMessage.includes('местоположение') || errorMessage.includes('geolocation') || errorMessage.includes('User denied Geolocation')) {
        setError('Геолокация недоступна. Выберите адрес на карте или используйте сохраненный.');
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
    console.log('📍 📝 createNewAddress called');
    console.log('📍 📝 detectedAddress:', detectedAddress);
    console.log('📍 📝 coordinates:', coordinates);
    console.log('📍 📝 onShowForm:', !!onShowForm);
    
    if (!detectedAddress || !coordinates) {
      console.log('❌ Missing detectedAddress or coordinates');
      return;
    }
    
    try {
      // Парсим адрес для получения компонентов
      const { city, street, houseNumber } = parseAddress(detectedAddress);
      console.log('📍 📝 Parsed address:', { city, street, houseNumber });
      
      // Проверяем полноту адреса
      const isAddressComplete = street && houseNumber && city;
      console.log('📍 📝 Address completeness check:', { 
        street: !!street, 
        houseNumber: !!houseNumber, 
        city: !!city, 
        isComplete: isAddressComplete 
      });
      
      // Создаем новый адрес на основе определенного местоположения
      const newAddress: Address = {
        id: -1, // Временный ID
        user: Number(state.user?.id) || 0,
        street: street || '',
        house_number: houseNumber || '', // Оставляем пустым если не найден
        apartment: '',
        city: city || 'Бухара',
        comment: isAddressComplete 
          ? 'Автоматически определенный адрес' 
          : 'Автоматически определенный адрес (требует уточнения)',
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
      
      console.log('📍 📝 Created newAddress:', newAddress);
      
      // Всегда показываем форму для уточнения адреса
      if (onShowForm) {
        console.log('📍 📝 Calling onShowForm with newAddress (always show form for address verification)');
        onShowForm(newAddress);
        console.log('📍 📝 Calling onClose');
        onClose();
      } else {
        console.log('📍 📝 onShowForm not available, using fallback');
        // Fallback: добавляем адрес напрямую
        onAddressDetected(newAddress);
        onClose();
      }
    } catch (error) {
      console.error('❌ Error creating new address:', error);
      setError('Ошибка создания нового адреса');
    }
  }, [detectedAddress, coordinates, state.user, onAddressDetected, onClose, onShowForm, parseAddress]);

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
          <div className="flex items-center justify-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              📍 Определение адреса
            </h2>
          </div>

          {isDetecting && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Определяем ваше местоположение...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center mb-3">
                <span className="text-red-500 text-lg mr-2">⚠️</span>
                <h3 className="text-sm font-semibold text-red-800">
                  Не удалось определить адрес
                </h3>
              </div>
              
              <p className="text-xs text-red-600 mb-3 leading-relaxed">
                {error}
              </p>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      console.log('🔄 Попробовать снова clicked');
                      // Очищаем кэш для получения свежего адреса
                      geocodeCache.current.clear();
                      console.log('📍 Cache cleared for fresh geocoding');
                      detectLocation();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 flex-1"
                  >
                    🔄 Попробовать снова
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('🗺️ Выбрать на карте clicked');
                      onShowMap();
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-2 flex-1"
                  >
                    🗺️ На карте
                  </Button>
                </div>
                {existingAddresses.length > 0 && (
                  <Button
                    onClick={() => {
                      console.log('📍 Показать сохраненные адреса clicked');
                      setShowExistingAddresses(true);
                      setError(null);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 w-full"
                  >
                    📍 Сохраненные адреса ({existingAddresses.length})
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Показываем существующие адреса, если пользователь выбрал этот вариант */}
          {showExistingAddresses && existingAddresses.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-800 mb-3">
                📍 Ваши сохраненные адреса:
              </h3>
              <div className="space-y-2">
                {existingAddresses.map((address) => (
                  <div
                    key={address.id}
                    className="bg-white border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => selectExistingAddress(address)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {address.street} {address.house_number}
                          {address.apartment && `, кв. ${address.apartment}`}
                        </p>
                        <p className="text-sm text-gray-600">{address.city}</p>
                        {address.comment && (
                          <p className="text-xs text-gray-500 mt-1">{address.comment}</p>
                        )}
                      </div>
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          selectExistingAddress(address);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Выбрать
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={() => setShowExistingAddresses(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-2 flex-1"
                >
                  Назад
                </Button>
                <Button
                  onClick={() => {
                    console.log('🗺️ Выбрать на карте clicked');
                    onShowMap();
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-3 py-2 flex-1"
                >
                  Выбрать на карте
                </Button>
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
                
                {/* Показываем координаты для отладки */}
                {coordinates && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                    <h4 className="font-semibold text-blue-800 text-sm mb-1">
                      📍 Координаты местоположения:
                    </h4>
                    <p className="text-blue-700 text-xs">
                      Широта: {coordinates[0].toFixed(6)}<br/>
                      Долгота: {coordinates[1].toFixed(6)}
                    </p>
                  </div>
                )}
                
                <p className="text-sm text-green-600 mt-2">
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
                  
                  {/* Проверяем полноту адреса и показываем предупреждение */}
                  {(() => {
                    const { city, street, houseNumber } = parseAddress(detectedAddress);
                    const isAddressComplete = street && houseNumber && city;
                    
                    if (!isAddressComplete) {
                      return (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                          <div className="flex items-start">
                            <span className="text-orange-500 text-lg mr-2">⚠️</span>
                            <div>
                              <h4 className="font-semibold text-orange-800 text-sm mb-1">
                                Адрес требует уточнения
                              </h4>
                              <p className="text-orange-700 text-xs leading-relaxed">
                                Не удалось определить полный адрес. Пожалуйста, укажите номер дома вручную.
                              </p>
                              {!street && (
                                <p className="text-orange-600 text-xs mt-1">• Улица не определена</p>
                              )}
                              {!houseNumber && (
                                <p className="text-orange-600 text-xs">• Номер дома не определен</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          console.log('📍 📝 "Да, добавить" button clicked');
                          createNewAddress();
                        }}
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
                    
                    {/* Кнопка для обновления адреса */}
                    <Button
                      onClick={() => {
                        console.log('🔄 Обновить адрес clicked');
                        // Очищаем кэш и переопределяем местоположение
                        geocodeCache.current.clear();
                        console.log('📍 Cache cleared for fresh geocoding');
                        setDetectedAddress(null);
                        setCoordinates(null);
                        setDeliveryZoneCheck(null);
                        setMatchedAddress(null);
                        detectLocation();
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
                    >
                      🔄 Обновить адрес
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  

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
