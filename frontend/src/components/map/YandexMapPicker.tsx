import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDeliveryZones } from '../../hooks/useDeliveryZones';
import { Button } from '../ui/Button';
import type { YandexMapInstance, YandexPlacemark, MapAddress } from '../../types/yandex-maps';

interface YandexMapPickerProps {
  onAddressSelect: (address: MapAddress) => void;
  onClose: () => void;
  initialCenter?: [number, number];
  initialZoom?: number;
}

export const YandexMapPicker: React.FC<YandexMapPickerProps> = ({
  onAddressSelect,
  onClose,
  initialCenter = [41.2995, 69.2401], // Ташкент
  initialZoom = 11
}) => {

  const { zones, isLoading: zonesLoading, isAddressInDeliveryZone } = useDeliveryZones();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<YandexMapInstance | null>(null);
  const placemarkRef = useRef<YandexPlacemark | null>(null);
  const initTimeoutRef = useRef<number | null>(null);
  
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<MapAddress | null>(null);
  const [addressInZone, setAddressInZone] = useState<boolean>(true);
  const [initStatus, setInitStatus] = useState<string>('Ожидание...');

  // Обработка клика по карте
  const handleMapClick = useCallback(async (coords: [number, number]) => {
    if (!mapInstanceRef.current) return;

    console.log('🗺️ Map clicked at:', coords);

    try {
      // Удаляем предыдущую метку
      if (placemarkRef.current) {
        try {
          mapInstanceRef.current.geoObjects.remove(placemarkRef.current);
        } catch (error) {
          console.error('Error removing placemark:', error);
        }
      }

      // Проверяем зону доставки
      const { inZone } = isAddressInDeliveryZone(coords[1], coords[0]);
      setAddressInZone(inZone);

      // Создаем новую метку
      const placemark = new window.ymaps.Placemark(coords, {
        hintContent: inZone ? 'Доступно для доставки' : 'Вне зоны доставки'
      }, {
        preset: inZone ? 'islands#greenIcon' : 'islands#redIcon'
      });

      mapInstanceRef.current.geoObjects.add(placemark);
      placemarkRef.current = placemark;

      // Геокодирование
      try {
        const geocoder = await window.ymaps.geocode(coords);
        const firstGeoObject = geocoder.geoObjects.get(0);
        const address = firstGeoObject.getAddressLine();
        const thoroughfare = firstGeoObject.getThoroughfare();
        const premise = firstGeoObject.getPremise();
        const locality = firstGeoObject.getLocality();

        const addressData: MapAddress = {
          coordinates: [coords[1], coords[0]], // [широта, долгота]
          address: address,
          street: thoroughfare || '',
          house: premise || '',
          city: locality || 'Ташкент'
        };

        setSelectedAddress(addressData);
      } catch (error) {
        console.error('Geocoding error:', error);
        const addressData: MapAddress = {
          coordinates: [coords[1], coords[0]],
          address: `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`,
          street: '',
          house: '',
          city: 'Ташкент'
        };
        setSelectedAddress(addressData);
      }
    } catch (error) {
      console.error('Error in handleMapClick:', error);
    }
  }, []); // Убираем зависимости для стабильности

  // Добавление зон доставки с полигонами
  const addDeliveryZonesToMap = useCallback((map: YandexMapInstance) => {
    if (!zones || zones.length === 0) return;
    
    try {
      console.log('🗺️ Adding delivery zones:', zones.length);
      
      zones.forEach((zone, index) => {
        try {
          // Создаем полигон зоны доставки
          // Если у зоны есть координаты полигона, используем их
          if (zone.coordinates && zone.coordinates.length > 0) {
            // Создаем полигон из координат
            const polygon = new window.ymaps.Polygon([zone.coordinates], {
              fillColor: '#00ff00',
              fillOpacity: 0.2,
              strokeColor: '#00ff00',
              strokeOpacity: 0.8,
              strokeWidth: 2
            }, {
              hintContent: `${zone.name || `Зона ${index + 1}`} - Доступна для доставки`
            });

            map.geoObjects.add(polygon);
            console.log(`✅ Polygon zone ${index + 1} added`);
          } else {
            // Если координат полигона нет, создаем круг по центру и радиусу
            const circle = new window.ymaps.Circle([
              [zone.center_longitude, zone.center_latitude], // [долгота, широта]
              zone.radius_km * 1000 // Радиус в метрах
            ], {
              fillColor: '#00ff00',
              fillOpacity: 0.2,
              strokeColor: '#00ff00',
              strokeOpacity: 0.8,
              strokeWidth: 2
            }, {
              hintContent: `${zone.name || `Зона ${index + 1}`} - Доступна для доставки`
            });

            map.geoObjects.add(circle);
            console.log(`✅ Circle zone ${index + 1} added (center: [${zone.center_longitude}, ${zone.center_latitude}], radius: ${zone.radius_km}km)`);
          }
        } catch (error) {
          console.error(`❌ Zone ${index + 1} error:`, error);
        }
      });
    } catch (error) {
      console.error('❌ Error adding zones:', error);
    }
  }, []); // Убираем зависимости для стабильности

  // Инициализация карты
  useEffect(() => {
    console.log('🗺️ YandexMapPicker: Component mounted');
    
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 10;
    
    const initMap = () => {
      if (!isMounted) {
        console.log('🗺️ Component unmounted, stopping');
        return;
      }
      
      retryCount++;
      setInitStatus(`Попытка ${retryCount}/${maxRetries}`);
      
      if (retryCount > maxRetries) {
        console.error('🗺️ Max retries reached');
        setInitStatus('Ошибка: превышен лимит попыток');
        setIsMapLoading(false);
        return;
      }
      
      console.log(`🗺️ Attempt ${retryCount}/${maxRetries} - Starting map initialization...`);
      
      // Проверяем API
      if (typeof window.ymaps === 'undefined') {
        console.log('🗺️ API not ready, retrying...');
        setInitStatus('API не готов, повтор...');
        initTimeoutRef.current = setTimeout(initMap, 1000);
        return;
      }

      // Проверяем ref
      if (!mapRef.current) {
        console.log('🗺️ Ref not ready, retrying...');
        setInitStatus('Ref не готов, повтор...');
        initTimeoutRef.current = setTimeout(initMap, 500);
        return;
      }

      console.log('🗺️ API and ref ready, creating map...');
      setInitStatus('Создание карты...');
      
      // Создаем карту
      try {
        const map = new window.ymaps.Map(mapRef.current, {
          center: [69.2401, 41.2995], // Ташкент [долгота, широта]
          zoom: 11,
          controls: ['zoomControl', 'geolocationControl']
        });

        mapInstanceRef.current = map;
        console.log('🗺️ ✅ Map created successfully!');

        // Обработчик клика
        map.events.add('click', (e: any) => {
          const coords = e.get('coords');
          handleMapClick(coords);
        });

        // Добавляем зоны доставки
        addDeliveryZonesToMap(map);

        // НЕ запускаем автоматическую геолокацию - только по кнопке
        console.log('🗺️ Skipping automatic geolocation - use button instead');
        setInitStatus('Карта готова! Используйте кнопки для навигации');
        
        // Перемещаем карту к координатам по умолчанию (Ташкент)
        const defaultCoords: [number, number] = [69.2401, 41.2995];
        map.setCenter(defaultCoords, 12);

        // Убираем загрузку
        setIsMapLoading(false);
        setInitStatus('Карта готова!');
        console.log('🗺️ 🎉 Map initialization completed!');
        
      } catch (error) {
        console.error('🗺️ Error creating map:', error);
        setInitStatus('Ошибка создания карты');
        setIsMapLoading(false);
      }
    };

    // Начинаем инициализацию
    initTimeoutRef.current = setTimeout(initMap, 1000);

    return () => {
      console.log('🗺️ Component unmounting');
      isMounted = false;
      
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
          mapInstanceRef.current = null;
        } catch (error) {
          console.error('🗺️ Error destroying map:', error);
        }
      }
    };
  }, []); // Убираем все зависимости для предотвращения перемонтирования

  // Геолокация пользователя
  const handleGetUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setInitStatus('Геолокация не поддерживается в этом браузере');
      return;
    }

    console.log('🗺️ Starting manual geolocation...');
    setInitStatus('Определение местоположения...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude, // Долгота
          position.coords.latitude   // Широта
        ];
        
        console.log('🗺️ ✅ User location detected:', coords);
        console.log('🗺️ Accuracy:', position.coords.accuracy, 'meters');
        
        if (mapInstanceRef.current) {
          // Перемещаем карту к пользователю
          mapInstanceRef.current.setCenter(coords, 16);
          
          // Автоматически кликаем по местоположению
          setTimeout(() => {
            handleMapClick(coords);
          }, 500);
          
          setInitStatus('Местоположение определено!');
        }
      },
      (error) => {
        console.log('🗺️ ❌ Geolocation error:', error.message);
        console.log('🗺️ Error code:', error.code);
        
        let errorMessage = 'Геолокация недоступна';
        
        // Подробное описание ошибки
        switch (error.code) {
          case 1:
            errorMessage = 'Доступ к геолокации запрещен. Разрешите доступ в настройках браузера.';
            break;
          case 2:
            errorMessage = 'Местоположение недоступно. Проверьте GPS или сеть.';
            break;
          case 3:
            errorMessage = 'Превышено время ожидания. Попробуйте еще раз.';
            break;
          default:
            errorMessage = 'Неизвестная ошибка геолокации.';
        }
        
        console.log('🗺️ Error description:', errorMessage);
        setInitStatus(errorMessage);
        
        // Показываем уведомление пользователю
        setTimeout(() => {
          alert(`Ошибка геолокации: ${errorMessage}`);
        }, 1000);
      },
      {
        enableHighAccuracy: false,  // Сначала попробуем с низкой точностью
        timeout: 20000,            // 20 секунд
        maximumAge: 600000         // 10 минут
      }
    );
  }, []);

  // Подтверждение выбора адреса
  const handleConfirmAddress = useCallback(() => {
    if (selectedAddress && addressInZone) {
      onAddressSelect(selectedAddress);
    }
  }, [selectedAddress, addressInZone, onAddressSelect]);

  if (zonesLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300">Загрузка зон доставки...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">
              📍 Выбор адреса на карте
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Координаты: [{initialCenter[0]}, {initialCenter[1]}] | Zoom: {initialZoom}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Инструкции */}
        <div className="p-4 bg-gray-750 border-b border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 mb-2">
                Кликните по карте для выбора адреса доставки
              </p>
              {zones.length > 0 && (
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 bg-opacity-50 border border-green-500 rounded-full"></div>
                    <span>Зоны доставки</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGetUserLocation}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm"
              >
                📍 Мое местоположение
              </Button>
              <Button
                onClick={() => {
                  if (mapInstanceRef.current) {
                    const defaultCoords: [number, number] = [69.2401, 41.2995];
                    mapInstanceRef.current.setCenter(defaultCoords, 12);
                    setInitStatus('Перемещено в Ташкент');
                  }
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 text-sm"
              >
                🏙️ Ташкент
              </Button>
            </div>
          </div>
        </div>

        {/* Карта */}
        <div className="flex-1 relative">
          {isMapLoading && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300 text-lg">Загрузка карты...</p>
                <div className="mt-4 p-3 bg-gray-800 rounded-lg text-left text-xs">
                  <p className="text-green-400">API: {typeof window.ymaps !== 'undefined' ? '✅ Готов' : '⏳ Загружается...'}</p>
                  <p className="text-blue-400">Ref: {mapRef.current ? '✅ Готов' : '⏳ Ожидание...'}</p>
                  <p className="text-yellow-400">Статус: {initStatus}</p>
                </div>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Информация о выбранном адресе */}
        {selectedAddress && (
          <div className="p-4 bg-gray-750 border-t border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-100 mb-1">
                  Выбранный адрес:
                </h4>
                <p className="text-sm text-gray-300 break-words">
                  {selectedAddress.address}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedAddress.coordinates[0].toFixed(6)}, {selectedAddress.coordinates[1].toFixed(6)}
                </p>
                {!addressInZone && (
                  <p className="text-sm text-red-400 mt-2">
                    ⚠️ Адрес вне зоны доставки
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={onClose}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2"
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleConfirmAddress}
                  disabled={!addressInZone}
                  className={`px-4 py-2 text-white ${
                    addressInZone 
                      ? 'bg-primary-600 hover:bg-primary-700' 
                      : 'bg-gray-500 cursor-not-allowed'
                  }`}
                >
                  Подтвердить адрес
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
