import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDeliveryZones } from '../../hooks/useDeliveryZones';
import { Button } from '../ui/Button';
import type { YandexMapInstance, MapAddress } from '../../types/yandex-maps';

interface YandexMapPickerProps {
  onAddressSelect: (address: MapAddress) => void;
  onClose: () => void;
}

export const YandexMapPicker: React.FC<YandexMapPickerProps> = ({
  onAddressSelect,
  onClose
}) => {
  // Состояния
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<MapAddress | null>(null);
  const [addressInZone, setAddressInZone] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Загрузка карты...');

  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<YandexMapInstance | null>(null);
  const placemarkRef = useRef<any>(null);

  // Хуки
  const { zones, isLoading: zonesLoading } = useDeliveryZones();

  // Координаты Ташкента (правильные)
  const TASHKENT_COORDS: [number, number] = [69.2797, 41.2995];

  // Обработчик клика по карте
  const handleMapClick = useCallback(async (coords: [number, number]) => {
    if (!mapInstanceRef.current) return;

    console.log('🗺️ Map clicked at:', coords);
    setStatus('Обработка адреса...');

    try {
      // Удаляем предыдущую метку
      if (placemarkRef.current) {
        mapInstanceRef.current.geoObjects.remove(placemarkRef.current);
      }

      // Создаем новую метку
      const placemark = new window.ymaps.Placemark(coords, {
        hintContent: 'Выбранный адрес'
      }, {
        preset: 'islands#redDotIcon'
      });

      mapInstanceRef.current.geoObjects.add(placemark);
      placemarkRef.current = placemark;

      // Геокодирование для получения адреса
      const geocoder = await window.ymaps.geocode(coords);
      const firstGeoObject = geocoder.geoObjects.get(0);
      const address = firstGeoObject.getAddressLine();

      // Проверяем зону доставки
      const isInZone = zones.some(zone => {
        const distance = Math.sqrt(
          Math.pow(coords[0] - zone.center_longitude, 2) + 
          Math.pow(coords[1] - zone.center_latitude, 2)
        );
        return distance <= zone.radius_km / 111; // Примерное расстояние в градусах
      });

      setAddressInZone(isInZone);

      // Создаем объект адреса
      const addressData: MapAddress = {
        coordinates: [coords[1], coords[0]], // [широта, долгота] для бэкэнда
        address: address,
        street: firstGeoObject.getThoroughfare() || '',
        house: firstGeoObject.getPremise() || '',
        city: firstGeoObject.getLocality() || 'Ташкент'
      };

      setSelectedAddress(addressData);
      setStatus('Адрес выбран!');

    } catch (error) {
      console.error('Error in handleMapClick:', error);
      setStatus('Ошибка обработки адреса');
    }
  }, [zones]);

  // Добавление зон доставки на карту
  const addDeliveryZones = useCallback((map: YandexMapInstance) => {
    if (!zones || zones.length === 0) return;

    console.log('🗺️ Adding delivery zones:', zones.length);

    zones.forEach((zone, index) => {
      try {
        // Создаем круг зоны доставки
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
          hintContent: `${zone.name || `Зона ${index + 1}`} - Доставка: ${zone.delivery_fee} сум`
        });

        map.geoObjects.add(circle);
        console.log(`✅ Zone ${index + 1} added`);
      } catch (error) {
        console.error(`❌ Zone ${index + 1} error:`, error);
      }
    });
  }, [zones]);

  // Определение местоположения пользователя
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('Геолокация не поддерживается');
      return;
    }

    setStatus('Определение местоположения...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude, // Долгота
          position.coords.latitude   // Широта
        ];

        console.log('🗺️ User location:', coords);
        setStatus('Местоположение определено!');

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(coords, 16);
          handleMapClick(coords);
        }
      },
      (error) => {
        console.log('🗺️ Geolocation error:', error.message);
        setStatus('Геолокация недоступна');
        
        // Fallback на Ташкент
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(TASHKENT_COORDS, 12);
          setStatus('Перемещено в Ташкент');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000
      }
    );
  }, [handleMapClick]);

  // Перемещение в Ташкент
  const goToTashkent = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(TASHKENT_COORDS, 12);
      setStatus('Перемещено в центр Ташкента');
    }
  }, []);

  // Инициализация карты
  useEffect(() => {
    console.log('🗺️ YandexMapPicker: Component mounted');

    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;

    const initMap = () => {
      if (!isMounted) return;

      retryCount++;
      setStatus(`Попытка ${retryCount}/${maxRetries}...`);

      if (retryCount > maxRetries) {
        setStatus('Ошибка: превышен лимит попыток');
        setIsMapLoading(false);
        return;
      }

      // Проверяем API
      if (typeof window.ymaps === 'undefined') {
        console.log('🗺️ API not ready, retrying...');
        setTimeout(initMap, 1000);
        return;
      }

      // Проверяем ref
      if (!mapRef.current) {
        console.log('🗺️ Ref not ready, retrying...');
        setTimeout(initMap, 500);
        return;
      }

      console.log('🗺️ Creating map...');
      setStatus('Создание карты...');

      try {
        // Создаем карту
        const map = new window.ymaps.Map(mapRef.current, {
          center: TASHKENT_COORDS, // [долгота, широта]
          zoom: 12,
          controls: ['zoomControl']
        });

        mapInstanceRef.current = map;
        console.log('🗺️ ✅ Map created successfully!');

        // Обработчик клика
        map.events.add('click', (e: any) => {
          const coords = e.get('coords');
          handleMapClick(coords);
        });

        // Добавляем зоны доставки
        addDeliveryZones(map);

        // Убираем загрузку
        setIsMapLoading(false);
        setStatus('Карта готова!');
        console.log('🗺️ 🎉 Map initialization completed!');

      } catch (error) {
        console.error('🗺️ Error creating map:', error);
        setStatus('Ошибка создания карты');
        setIsMapLoading(false);
      }
    };

    // Начинаем инициализацию
    setTimeout(initMap, 1000);

    return () => {
      console.log('🗺️ Component unmounting');
      isMounted = false;

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
          mapInstanceRef.current = null;
        } catch (error) {
          console.error('🗺️ Error destroying map:', error);
        }
      }
    };
  }, [addDeliveryZones, handleMapClick]);

  // Загрузка зон
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
              Статус: {status}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Кнопки управления */}
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
                    <span>Зоны доставки ({zones.length})</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={getUserLocation}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm"
              >
                📍 Мое местоположение
              </Button>
              <Button
                onClick={goToTashkent}
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
                <p className="text-gray-300 text-lg">{status}</p>
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
                  Координаты: {selectedAddress.coordinates[0].toFixed(6)}, {selectedAddress.coordinates[1].toFixed(6)}
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
                  onClick={() => onAddressSelect(selectedAddress)}
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
