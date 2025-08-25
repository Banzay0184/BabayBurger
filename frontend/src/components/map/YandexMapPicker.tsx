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
  
  // Ref для zones чтобы избежать проблем с замыканием
  const zonesRef = useRef(zones);
  
  // Отладка zones
  console.log('🗺️ 🔍 YandexMapPicker - zones state:', zones);
  console.log('🗺️ 🔍 YandexMapPicker - zonesLoading:', zonesLoading);
  
  // Отладка изменения zones
  useEffect(() => {
    console.log('🗺️ 🔍 YandexMapPicker - zones changed:', zones);
    console.log('🗺️ 🔍 YandexMapPicker - zones length changed:', zones?.length);
    
    // Обновляем ref при изменении zones
    zonesRef.current = zones;
  }, [zones]);

  // Координаты Бухары (правильные - из вашего бэкэнда)
  const BUKHARA_COORDS: [number, number] = [39.767966, 64.421728];
  
  // Координаты Кагана (ваш город)
  const KAGAN_COORDS: [number, number] = [39.723543, 64.547178];
  
  
  // Координаты Ташкента (для справки)
  const TASHKENT_COORDS: [number, number] = [41.2995, 69.2797];
  
  // Отладка координат
  console.log('🗺️ 📍 Coordinates loaded:', {
    BUKHARA: BUKHARA_COORDS,
    KAGAN: KAGAN_COORDS,
    TASHKENT: TASHKENT_COORDS
  });

  // Функция проверки "точка внутри полигона" (алгоритм ray casting)
  const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Функция создания fallback адреса на основе координат
  const createFallbackAddress = (coords: [number, number]): string => {
    const [lat, lon] = coords;
    
    // Определяем примерное местоположение на основе координат
    if (lat >= 39.76 && lat <= 39.78 && lon >= 64.39 && lon <= 64.42) {
      return 'Бухара, центр города';
    } else if (lat >= 39.72 && lat <= 39.74 && lon >= 64.54 && lon <= 64.56) {
      return 'Каган, центр города';
    } else if (lat >= 39.7 && lat <= 39.8 && lon >= 64.3 && lon <= 64.6) {
      // Более широкий диапазон для Бухары
      return 'Бухара, город';
    } else {
      // Более точные координаты для отладки
      return `Координаты: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
  };

  // Функция создания fallback номера дома на основе координат
  const createFallbackHouseNumber = (coords: [number, number]): string => {
    const [lat, lon] = coords;
    
    // Генерируем примерный номер дома на основе координат
    // Используем последние цифры координат для уникальности
    const latLast = Math.floor((lat % 0.01) * 1000000);
    const lonLast = Math.floor((lon % 0.01) * 1000000);
    
    // Создаем номер дома из последних цифр координат
    const houseNumber = Math.abs(latLast + lonLast) % 200 + 1;
    
    return houseNumber.toString();
  };
  
  // Тестовая зона удалена - теперь используются только данные из backend

  // Обработчик клика по карте
  const handleMapClick = useCallback(async (coords: [number, number]) => {
    if (!mapInstanceRef.current) return;

    console.log('🗺️ Map clicked at:', coords);
    console.log('🗺️ 🔍 Zones available for checking:', zones?.length);
    console.log('🗺️ 🔍 Zones data:', zones);
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
      let address = 'Адрес не определен';
      let thoroughfare = '';
      let premise = '';
      let locality = '';
      
      try {
        console.log('🗺️ 🔍 Starting geocoding for coordinates:', coords);
        
        // Пробуем геокодирование через Yandex Maps API
        const geocoder = await window.ymaps.geocode(coords);
        
        if (geocoder.geoObjects.getLength() > 0) {
          const firstGeoObject = geocoder.geoObjects.get(0);
          
          // Безопасное получение данных адреса
          try {
            // Получаем полный адрес
            address = firstGeoObject.getAddressLine() || 'Адрес не определен';
            
            // Получаем улицу
            thoroughfare = firstGeoObject.getThoroughfare() || '';
            
            // Получаем номер дома/здания
            premise = firstGeoObject.getPremise() || '';
            
            // Получаем город
            locality = firstGeoObject.getLocality() || '';
            
            // Дополнительные поля для отладки
            const street = firstGeoObject.getThoroughfare() || '';
            const houseNumber = firstGeoObject.getPremise() || '';
            const city = firstGeoObject.getLocality() || '';
            const country = firstGeoObject.getCountry() || '';
            const postalCode = firstGeoObject.getPostalCode() || '';
            
            console.log('🗺️ ✅ Geocoding successful:', { 
              address, 
              thoroughfare, 
              premise, 
              locality,
              street,
              houseNumber,
              city,
              country,
              postalCode
            });
            
            // Логируем все доступные методы
            console.log('🗺️ 🔍 Available geocoding methods:', {
              hasGetAddressLine: typeof firstGeoObject.getAddressLine === 'function',
              hasGetThoroughfare: typeof firstGeoObject.getThoroughfare === 'function',
              hasGetPremise: typeof firstGeoObject.getPremise === 'function',
              hasGetLocality: typeof firstGeoObject.getLocality === 'function',
              hasGetCountry: typeof firstGeoObject.getCountry === 'function',
              hasGetPostalCode: typeof firstGeoObject.getPostalCode === 'function'
            });
            
            // Попробуем получить адрес через properties
            try {
              const properties = firstGeoObject.properties;
              if (properties) {
                const metaDataProperty = properties.get('metaDataProperty');
                if (metaDataProperty) {
                  const geocoderMetaData = metaDataProperty.get('GeocoderMetaData');
                  if (geocoderMetaData) {
                    const addressComponents = geocoderMetaData.get('Address');
                    if (addressComponents) {
                      console.log('🗺️ 🔍 Address components from properties:', addressComponents);
                      
                      // Получаем компоненты адреса
                      const streetComponent = addressComponents.get('Thoroughfare')?.get('ThoroughfareName') || '';
                      const houseComponent = addressComponents.get('Premise')?.get('PremiseNumber') || '';
                      const cityComponent = addressComponents.get('Locality')?.get('LocalityName') || '';
                      
                      console.log('🗺️ 🔍 Parsed components:', { streetComponent, houseComponent, cityComponent });
                      
                      // Обновляем значения если они пустые
                      if (!thoroughfare && streetComponent) thoroughfare = streetComponent;
                      if (!premise && houseComponent) premise = houseComponent;
                      if (!locality && cityComponent) locality = cityComponent;
                    }
                  }
                }
              }
            } catch (propertiesError) {
              console.log('🗺️ ⚠️ Error parsing properties:', propertiesError);
            }
            
          } catch (addressError) {
            console.log('🗺️ ⚠️ Error getting address fields:', addressError);
            // Fallback на координаты если не удается получить поля адреса
            address = createFallbackAddress(coords);
          }
        } else {
          console.log('🗺️ ⚠️ No geocoding results');
          address = createFallbackAddress(coords);
        }
      } catch (geocodeError) {
        console.log('🗺️ ⚠️ Geocoding failed, trying alternative method:', geocodeError);
        
        // Альтернативный метод: геокодирование через reverse geocoding
        try {
          const reverseGeocoder = await window.ymaps.geocode(coords, { 
            results: 1,
            kind: 'locality'
          });
          
          if (reverseGeocoder.geoObjects.getLength() > 0) {
            const geoObject = reverseGeocoder.geoObjects.get(0);
            const altAddress = geoObject.getAddressLine();
            if (altAddress) {
              address = altAddress;
              locality = geoObject.getLocality() || '';
              console.log('🗺️ ✅ Alternative geocoding successful:', { address, locality });
            } else {
              address = createFallbackAddress(coords);
            }
          } else {
            address = createFallbackAddress(coords);
          }
        } catch (altError) {
          console.log('🗺️ ⚠️ Alternative geocoding also failed:', altError);
          address = createFallbackAddress(coords);
        }
      }

      // Проверяем зону доставки
      console.log('🗺️ 🔍 Starting zone delivery check...');
      console.log('🗺️ 🔍 Number of zones to check:', zonesRef.current?.length);
      
      const isInZone = zonesRef.current?.some(zone => {
        // Если есть полигон, используем алгоритм "точка внутри полигона"
        if (zone.polygon_coordinates && zone.polygon_coordinates.length > 2) {
          console.log('🗺️ 🔍 Checking if point is inside polygon for zone:', zone.name);
          const isInside = isPointInPolygon(coords, zone.polygon_coordinates);
          console.log('🗺️ 🔍 Point inside polygon:', isInside);
          return isInside;
        }
        // Если нет полигона, но есть центр и радиус
        if (zone.center_latitude && zone.center_longitude && zone.radius_km) {
          const distance = Math.sqrt(
            Math.pow(coords[0] - zone.center_longitude, 2) + 
            Math.pow(coords[1] - zone.center_latitude, 2)
          );
          return distance <= zone.radius_km / 111; // Примерное расстояние в градусах
        }
        return false;
      });

      console.log('🗺️ 🔍 Zone delivery check result:', isInZone);
      setAddressInZone(isInZone);

      // Создаем объект адреса
      const addressData: MapAddress = {
        coordinates: [coords[0], coords[1]], // [широта, долгота] для бэкэнда
        address: address,
        street: thoroughfare || 'Улица не определена',
        house: premise || createFallbackHouseNumber(coords), // Генерируем номер дома если не определен
        city: locality || 'Бухара' // Fallback на Бухару если город не определен
      };
      
      console.log('🗺️ 📝 Final address data:', addressData);

      setSelectedAddress(addressData);
      setStatus('Адрес выбран! Нажмите "Подтвердить" для добавления');

    } catch (error) {
      console.error('Error in handleMapClick:', error);
      setStatus('Ошибка обработки адреса');
    }
  }, []);

  // Добавление зон доставки на карту
  const addDeliveryZones = useCallback((map: YandexMapInstance) => {
    console.log('🗺️ 🚀 addDeliveryZones function called!');
    console.log('🗺️ Map instance:', map);
    console.log('🗺️ Adding delivery zones...');
    console.log('🗺️ 🔍 Zones in addDeliveryZones:', zones);
    console.log('🗺️ 🔍 Zones length:', zones?.length);
    console.log('🗺️ 🔍 Zones type:', typeof zones);

    // Добавляем зоны из backend
    if (!zones || zones.length === 0) {
      console.log('🗺️ No backend zones to add');
      console.log('🗺️ 🔍 Zones is empty or undefined');
      return;
    }

    console.log('🗺️ Adding backend zones:', zones.length);

    zones.forEach((zone, index) => {
      try {
        if (zone.polygon_coordinates && zone.polygon_coordinates.length > 0) {
          // Создаем полигон зоны доставки с настройками из backend
          console.log(`🎨 Zone ${index + 1} styles:`, {
            fillColor: zone.polygon_fill_color,
            fillOpacity: zone.polygon_fill_opacity,
            strokeColor: zone.polygon_stroke_color,
            strokeOpacity: zone.polygon_stroke_opacity,
            strokeWidth: zone.polygon_stroke_width
          });
          
          const polygon = new window.ymaps.Polygon([zone.polygon_coordinates], {
            fillColor: zone.polygon_fill_color || '#00ff00',
            fillOpacity: zone.polygon_fill_opacity || 0.2,
            strokeColor: zone.polygon_stroke_color || '#00ff00',
            strokeOpacity: zone.polygon_stroke_opacity || 0.8,
            strokeWidth: zone.polygon_stroke_width || 2
          }, {
            hintContent: `${zone.name || `Зона ${index + 1}`} - Доставка: ${zone.delivery_fee} сум`
          });

          // Принудительно применяем стили
          polygon.options.set({
            fillColor: zone.polygon_fill_color || '#00ff00',
            fillOpacity: zone.polygon_fill_opacity || 0.2,
            strokeColor: zone.polygon_stroke_color || '#00ff00',
            strokeOpacity: zone.polygon_stroke_opacity || 0.8,
            strokeWidth: zone.polygon_stroke_width || 2
          });

          // Делаем полигон прозрачным для кликов
          polygon.options.set('interactive', false);

          map.geoObjects.add(polygon);
          console.log(`✅ Polygon zone ${index + 1} added (${zone.polygon_coordinates.length} points) with styles applied and click-through enabled`);
        } else if (zone.center_latitude && zone.center_longitude && zone.radius_km) {
          // Fallback на круг, если нет полигона, но есть центр и радиус
          const circle = new window.ymaps.Circle([
            [zone.center_latitude, zone.center_longitude], // [широта, долгота]
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

          // Делаем круг прозрачным для кликов
          circle.options.set('interactive', false);

          map.geoObjects.add(circle);
          console.log(`✅ Circle zone ${index + 1} added (center: [${zone.center_latitude}, ${zone.center_longitude}], radius: ${zone.radius_km}km) with click-through enabled`);
        }
      } catch (error) {
        console.error(`❌ Zone ${index + 1} error:`, error);
      }
    });
  }, [zones]);

  // Добавляем зоны когда они загружаются после создания карты
  useEffect(() => {
    console.log('🗺️ 🔍 useEffect triggered - zones:', zones?.length, 'mapInstance:', !!mapInstanceRef.current);
    
    if (mapInstanceRef.current && zones && zones.length > 0) {
      console.log('🗺️ 🔍 Zones loaded after map creation, adding zones now...');
      addDeliveryZones(mapInstanceRef.current);
    } else {
      console.log('🗺️ 🔍 useEffect - conditions not met:', {
        hasMapInstance: !!mapInstanceRef.current,
        zonesLength: zones?.length,
        zones: zones
      });
    }
  }, [zones, addDeliveryZones]);

  // Добавляем зоны когда карта создается после загрузки зон
  useEffect(() => {
    console.log('🗺️ 🔍 useEffect mapInstance triggered - mapInstance:', !!mapInstanceRef.current, 'zones:', zones?.length);
    
    if (mapInstanceRef.current && zones && zones.length > 0) {
      console.log('🗺️ 🔍 Map created after zones loaded, adding zones now...');
      addDeliveryZones(mapInstanceRef.current);
    }
  }, [mapInstanceRef.current, zones, addDeliveryZones]);

  // Определение местоположения пользователя
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('Геолокация не поддерживается');
      return;
    }
    
    // Проверяем, доступна ли геолокация
    if (!navigator.permissions) {
      console.log('🗺️ 🔍 Permissions API not supported, trying geolocation anyway...');
    } else {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log('🗺️ 🔍 Geolocation permission status:', result.state);
        if (result.state === 'denied') {
          setStatus('Доступ к геолокации запрещен. Разрешите в настройках браузера.');
          return;
        }
      });
    }

    setStatus('Определение местоположения...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,   // Широта
          position.coords.longitude   // Долгота
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
        console.log('🗺️ Error code:', error.code);
        
        let errorMessage = 'Геолокация недоступна';
        if (error.code === 1) {
          errorMessage = 'Доступ к геолокации запрещен';
        } else if (error.code === 2) {
          errorMessage = 'Местоположение недоступно';
        } else if (error.code === 3) {
          errorMessage = 'Превышено время ожидания';
        }
        
        setStatus(errorMessage);
        
        // Fallback на центр Бухары
        if (mapInstanceRef.current) {
          console.log('🗺️ 🔍 Attempting fallback to Bukhara center...');
          console.log('🗺️ 🔍 Bukhara coordinates:', BUKHARA_COORDS);
          mapInstanceRef.current.setCenter(BUKHARA_COORDS, 12);
          setStatus('Перемещено в центр Бухары (геолокация недоступна)');
          console.log('🗺️ ✅ Fallback to Bukhara center completed');
          
          // Показываем инструкцию пользователю
          setTimeout(() => {
            setStatus('Используйте кнопки "Бухара", "Каган" или кликните по карте для выбора адреса');
          }, 3000);
        } else {
          console.log('🗺️ ❌ Cannot set fallback - mapInstance not ready');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000
      }
    );
  }, [handleMapClick]);



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

      // Проверяем доступность геокодирования
      try {
        if (window.ymaps.geocode) {
          console.log('🗺️ ✅ Geocoding API available');
        } else {
          console.log('🗺️ ⚠️ Geocoding API not available');
        }
      } catch (error) {
        console.log('🗺️ ⚠️ Error checking geocoding API:', error);
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
          center: BUKHARA_COORDS, // [широта, долгота] - Бухара
          zoom: 12,
          controls: ['zoomControl']
        });
        
        console.log('🗺️ 🎯 Map centered at Bukhara:', BUKHARA_COORDS);

        mapInstanceRef.current = map;
        console.log('🗺️ ✅ Map created successfully!');

        // Обработчик клика
        map.events.add('click', (e: any) => {
          const coords = e.get('coords');
          console.log('🗺️ 🖱️ Map clicked at coordinates:', coords);
          handleMapClick(coords);
        });

        // Зоны доставки будут добавлены автоматически через useEffect когда zones загрузятся
        console.log('🗺️ Map ready, waiting for zones to load...');

        // Убираем загрузку
        setIsMapLoading(false);
        setStatus('Карта готова! Используйте кнопки для навигации');
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
  }, []); // Убираем зависимости для предотвращения перемонтирования

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
      <div className="bg-gray-800 rounded-lg w-full h-full sm:h-[80vh] sm:max-w-4xl flex flex-col overflow-hidden">
        {/* Заголовок - фиксированный */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-100">
              📍 Выбор адреса на карте
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl p-2 ml-2"
          >
            ✕
          </button>
        </div>

        {/* Кнопки управления - фиксированные */}
        <div className="p-3 sm:p-4 bg-gray-750 border-b border-gray-700 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 mb-2">
                Кликните по карте для выбора адреса доставки
              </p>
              {zones.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 bg-opacity-50 border border-green-500 rounded-full"></div>
                    <span>Зоны доставки ({zones.length})</span>
                  </div>
                  <div className="text-orange-400">
                    📍 Текущие зоны: {zones.map(zone => `${zone.city || 'Неизвестно'}`).join(', ')}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 xs:grid-cols-4 sm:flex sm:flex-wrap gap-1 sm:gap-2">
              <Button
                onClick={getUserLocation}
                className="bg-blue-600 hover:bg-blue-700 text-white px-1 sm:px-2 md:px-3 py-2 text-xs sm:text-sm"
              >
                📍 Мое местоположение
              </Button>
              <Button
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setCenter(BUKHARA_COORDS, 12);
                    setStatus('Перемещено в центр Бухары');
                    console.log('🗺️ Moved to Bukhara center:', BUKHARA_COORDS);
                  }
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-1 sm:px-2 md:px-3 py-2 text-xs sm:text-sm"
              >
                🏛️ Бухара
              </Button>
              <Button
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setCenter(KAGAN_COORDS, 12);
                    setStatus('Перемещено в центр Кагана');
                    console.log('🗺️ Moved to Kagan center:', KAGAN_COORDS);
                  }
                }}
                className="bg-green-600 hover:bg-gray-700 text-white px-1 sm:px-2 md:px-3 py-2 text-xs sm:text-sm"
              >
                🏘️ Каган
              </Button>
            </div>
          </div>
        </div>

        {/* Карта - скроллируемая */}
        <div className="flex-1 relative overflow-auto">
          {isMapLoading && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300 text-lg">{status}</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full min-h-[300px] sm:min-h-[400px]" />
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
