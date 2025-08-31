import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Restaurant } from '../../types/yandex-maps';
import { useRestaurants } from '../../hooks/useRestaurants';

interface RestaurantPickerProps {
  onRestaurantSelect: (restaurant: Restaurant) => void;
  selectedRestaurant?: Restaurant | null;
  onClose: () => void;
}

export const RestaurantPicker: React.FC<RestaurantPickerProps> = ({
  onRestaurantSelect,
  selectedRestaurant,
  onClose
}) => {
  const { restaurants, loading, error } = useRestaurants();
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(
    selectedRestaurant?.id || null
  );
  const mapRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const initAttemptedRef = useRef(false);
  const mapInitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Стабилизируем restaurants массив и колбэки
  const stableRestaurants = useMemo(() => restaurants, [restaurants]);
  const stableOnRestaurantSelect = useCallback(onRestaurantSelect, []);
  const stableOnClose = useCallback(onClose, []);

  // Проверяем загрузку API при монтировании компонента
  useEffect(() => {
    console.log('🗺️ RestaurantPicker: Компонент смонтирован');
    console.log('🗺️ RestaurantPicker: window.ymaps доступен:', !!window.ymaps);
    console.log('🗺️ RestaurantPicker: restaurants загружены:', stableRestaurants.length);
    console.log('🗺️ RestaurantPicker: restaurants данные:', stableRestaurants);
    
    return () => {
      isMountedRef.current = false;
      console.log('🗺️ RestaurantPicker: Компонент размонтирован');
      
      // Очищаем все таймауты при размонтировании
      if (mapInitTimeoutRef.current) {
        clearTimeout(mapInitTimeoutRef.current);
      }
    };
  }, []);

  // Инициализация карты - запускаем только один раз при монтировании
  useEffect(() => {
    console.log('🗺️ RestaurantPicker: useEffect для инициализации карты сработал');
    console.log('🗺️ RestaurantPicker: initAttemptedRef.current:', initAttemptedRef.current);
    console.log('🗺️ RestaurantPicker: mapInstance:', mapInstance);
    console.log('🗺️ RestaurantPicker: mapRef.current:', mapRef.current);
    
    if (initAttemptedRef.current || mapInstance) {
      console.log('🗺️ RestaurantPicker: Инициализация карты уже была попытка или карта уже создана, пропускаем');
      return;
    }

    const initMap = async () => {
      try {
        console.log('🗺️ RestaurantPicker: initMap вызвана');
        
        // Проверяем, что компонент все еще смонтирован
        if (!isMountedRef.current) {
          console.log('🗺️ RestaurantPicker: Компонент размонтирован, отменяем инициализацию карты');
          return;
        }

        // Проверяем, что ref существует и DOM элемент готов
        if (!mapRef.current) {
          console.log('🗺️ RestaurantPicker: mapRef.current еще не готов, ждем...');
          return;
        }

        setMapLoading(true);
        setMapError(null);
        
        console.log('🗺️ RestaurantPicker: Начинаем инициализацию карты...');
        console.log('🗺️ RestaurantPicker: mapRef.current:', mapRef.current);
        console.log('🗺️ RestaurantPicker: window.ymaps:', window.ymaps);
        console.log('🗺️ RestaurantPicker: window.ymaps.ready:', window.ymaps?.ready);
        
        // Проверяем, загружен ли Yandex Maps API
        if (!window.ymaps) {
          console.error('❌ RestaurantPicker: Yandex Maps API не загружен!');
          throw new Error('Yandex Maps API не загружен');
        }
        
        console.log('🗺️ RestaurantPicker: Yandex Maps API найден, вызываем ymaps.ready...');
        console.log('🗺️ RestaurantPicker: typeof window.ymaps.ready:', typeof window.ymaps.ready);
        
        await window.ymaps.ready();
        
        // Проверяем еще раз, что компонент все еще смонтирован
        if (!isMountedRef.current) {
          console.log('🗺️ RestaurantPicker: Компонент размонтирован после ymaps.ready, отменяем создание карты');
          return;
        }
        
        console.log('🗺️ RestaurantPicker: ymaps.ready выполнен, создаем карту...');
        
        // Дополнительная проверка, что ref все еще существует
        if (!mapRef.current) {
          throw new Error('mapRef.current стал null во время инициализации');
        }
        
        console.log('🗺️ RestaurantPicker: mapRef.current размеры:', mapRef.current.offsetWidth, 'x', mapRef.current.offsetHeight);
        
        const map = new window.ymaps.Map(mapRef.current, {
          center: [64.553131, 39.731224], // Центр на ресторане BABAY1 в Бухаре [долгота, широта]
          zoom: 15,
          controls: ['zoomControl', 'fullscreenControl'],
          // Дополнительные настройки для мобильных устройств
          behaviors: ['drag', 'scrollZoom', 'multiTouch'],
          // Улучшаем отображение на мобильных
          options: {
            suppressMapOpenBlock: true,
            suppressObsoleteBrowserNotifier: true
          }
        });

        // Проверяем еще раз, что компонент все еще смонтирован
        if (!isMountedRef.current) {
          console.log('🗺️ RestaurantPicker: Компонент размонтирован после создания карты, уничтожаем карту');
          map.destroy();
          return;
        }

        console.log('🗺️ RestaurantPicker: Карта создана успешно!');
        console.log('🗺️ RestaurantPicker: map instance:', map);
        console.log('🗺️ RestaurantPicker: map.geoObjects:', map.geoObjects);
        console.log('🗺️ RestaurantPicker: map.geoObjects.add:', map.geoObjects?.add);
        setMapInstance(map);
        setMapLoading(false);
        initAttemptedRef.current = true;
        
      } catch (error) {
        console.error('❌ RestaurantPicker: Ошибка инициализации карты:', error);
        if (isMountedRef.current) {
          setMapError(error instanceof Error ? error.message : 'Неизвестная ошибка');
          setMapLoading(false);
        }
      }
    };

    // Функция для попытки инициализации с проверкой
    const tryInitMap = () => {
      console.log('🗺️ RestaurantPicker: tryInitMap вызвана');
      console.log('🗺️ RestaurantPicker: isMountedRef.current:', isMountedRef.current);
      console.log('🗺️ RestaurantPicker: mapRef.current:', mapRef.current);
      console.log('🗺️ RestaurantPicker: mapRef.current?.offsetWidth:', mapRef.current?.offsetWidth);
      console.log('🗺️ RestaurantPicker: mapRef.current?.offsetHeight:', mapRef.current?.offsetHeight);
      
      if (!isMountedRef.current) {
        console.log('🗺️ RestaurantPicker: Компонент размонтирован, отменяем попытку инициализации');
        return;
      }
      
      if (mapRef.current) {
        console.log('🗺️ RestaurantPicker: mapRef.current готов, начинаем инициализацию');
        initMap();
      } else {
        console.log('🗺️ RestaurantPicker: mapRef.current не готов, повторяем через 100мс...');
        mapInitTimeoutRef.current = setTimeout(tryInitMap, 100);
      }
    };

    // Начинаем с задержки 500мс для полной загрузки DOM
    mapInitTimeoutRef.current = setTimeout(tryInitMap, 500);
    
    return () => {
      // Очищаем таймаут при размонтировании
      if (mapInitTimeoutRef.current) {
        clearTimeout(mapInitTimeoutRef.current);
      }
      
      // Очищаем карту при размонтировании
      if (mapInstance) {
        try {
          mapInstance.destroy();
          console.log('🗺️ RestaurantPicker: Карта уничтожена при размонтировании');
        } catch (error) {
          console.warn('⚠️ RestaurantPicker: Ошибка при уничтожении карты:', error);
        }
      }
    };
  }, [mapInstance]);

  // Добавление ресторанов на карту - только когда карта готова и рестораны загружены
  useEffect(() => {
    console.log('🗺️ RestaurantPicker: useEffect для добавления ресторанов сработал');
    console.log('🗺️ RestaurantPicker: mapInstance:', mapInstance);
    console.log('🗺️ RestaurantPicker: stableRestaurants:', stableRestaurants);
    console.log('🗺️ RestaurantPicker: stableRestaurants.length:', stableRestaurants.length);
    console.log('🗺️ RestaurantPicker: mapInstance.geoObjects:', mapInstance?.geoObjects);
    
    if (!mapInstance || !stableRestaurants.length) {
      console.log('🗺️ RestaurantPicker: Карта или рестораны не готовы:', { 
        hasMap: !!mapInstance, 
        restaurantsCount: stableRestaurants.length,
        mapInstanceType: typeof mapInstance,
        mapInstanceKeys: mapInstance ? Object.keys(mapInstance) : 'null'
      });
      return;
    }

    // Дополнительная проверка, что карта все еще существует
    if (!mapInstance.geoObjects) {
      console.warn('⚠️ RestaurantPicker: mapInstance.geoObjects недоступен');
      return;
    }

    console.log('🗺️ RestaurantPicker: Добавляем рестораны на карту...');
    console.log('🗺️ RestaurantPicker: Количество ресторанов:', stableRestaurants.length);

    // Очищаем предыдущие метки
    mapInstance.geoObjects.removeAll();

    stableRestaurants.forEach((restaurant, index) => {
      if (restaurant.latitude && restaurant.longitude) {
        // Преобразуем координаты в числа и проверяем порядок
        let lat = parseFloat(String(restaurant.latitude));
        let lon = parseFloat(String(restaurant.longitude));
        
        // Проверяем, что координаты в правильных диапазонах
        // Широта: -90 до 90, Долгота: -180 до 180
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
          console.log(`🗺️ RestaurantPicker: Координаты ресторана ${restaurant.name} перепутаны, исправляем...`);
          [lat, lon] = [lon, lat]; // Меняем местами
        }
        
        // Проверяем, что после исправления координаты корректны
        if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
          const coord: [number, number] = [lon, lat]; // Yandex Maps использует [долгота, широта]
          
          console.log(`🗺️ RestaurantPicker: Добавляем ресторан ${index + 1}:`, restaurant.name, 'исправленные координаты:', coord);
          
          const placemark = new window.ymaps.Placemark(
            coord,
            {
              balloonContent: `
                <div style="padding: 10px; max-width: 280px;">
                  <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">${restaurant.name}</h3>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">${restaurant.address}</p>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">Минимум: ${restaurant.min_order_amount.toLocaleString()} сум</p>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">Время: ${restaurant.pickup_time}</p>
                  <button 
                    onclick="window.selectRestaurant(${restaurant.id})"
                    style="background: #ff6b35; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; width: 100%; margin-top: 10px;"
                  >
                    Выбрать ресторан
                  </button>
                </div>
              `,
              hintContent: restaurant.name
            },
            {
              preset: 'islands#blueStretchyIcon', // Используем растягивающуюся иконку для текста
              iconContent: restaurant.name, // Полное название ресторана
              iconContentColor: '#FFFFFF', // Белый цвет для текста
              iconContentSize: 10, // Уменьшаем размер текста для мобильных
              iconContentOffset: [0, 0], // Смещение текста
              iconColor: restaurant.pickup_available ? '#4CAF50' : '#F44336', // Цвет фона иконки
              iconContentFontWeight: 'bold', // Жирный шрифт
              iconContentFontFamily: 'Arial, sans-serif', // Шрифт
              // Дополнительные настройки для лучшей читаемости
              iconContentMaxWidth: 100, // Уменьшаем максимальную ширину для мобильных
              iconContentOverflow: 'ellipsis', // Обрезаем длинный текст с многоточием
              // Улучшения для мобильных устройств
              iconSize: [24, 24], // Оптимальный размер для мобильных
              iconOffset: [-12, -12] // Центрируем иконку
            }
          );

          // Обработчик клика по метке
          placemark.events.add('click', () => {
            console.log('🗺️ RestaurantPicker: Клик по метке ресторана:', restaurant.name);
            setSelectedRestaurantId(restaurant.id);
          });

          mapInstance.geoObjects.add(placemark);
          console.log(`🗺️ RestaurantPicker: Метка ресторана ${restaurant.name} добавлена на карту`);
          console.log(`🗺️ RestaurantPicker: Текущее количество меток на карте:`, mapInstance.geoObjects.getLength());
        } else {
          console.warn(`⚠️ RestaurantPicker: Ресторан ${restaurant.name} имеет некорректные координаты после исправления: lat=${lat}, lon=${lon}`);
        }
      } else {
        console.warn(`⚠️ RestaurantPicker: Ресторан ${restaurant.name} не имеет координат`);
      }
    });

    // Центрируем карту на ресторанах после их добавления
    const allPlacemarks = mapInstance.geoObjects.getLength();
    if (allPlacemarks > 0) {
      console.log('🗺️ RestaurantPicker: Центрируем карту на ресторанах, найдено меток:', allPlacemarks);
      
      if (allPlacemarks === 1) {
        // Если один ресторан - центрируем на нем
        // Получаем координаты первого ресторана из stableRestaurants
        const firstRestaurant = stableRestaurants.find(r => r.latitude && r.longitude);
        if (firstRestaurant) {
          let lat = parseFloat(String(firstRestaurant.latitude));
          let lon = parseFloat(String(firstRestaurant.longitude));
          
          // Проверяем и исправляем порядок координат
          if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            [lat, lon] = [lon, lat];
          }
          
          const coords: [number, number] = [lon, lat];
          mapInstance.setCenter(coords, 15);
          console.log('🗺️ RestaurantPicker: Карта центрирована на ресторане:', coords);
        }
      } else {
        // Если несколько ресторанов - подбираем масштаб, чтобы все были видны
        const bounds = mapInstance.geoObjects.getBounds();
        if (bounds) {
          mapInstance.setBounds(bounds, {
            checkZoomRange: true,
            duration: 300
          });
          console.log('🗺️ RestaurantPicker: Карта масштабирована для отображения всех ресторанов');
        } else {
          // Если не удалось получить bounds, центрируем на первом ресторане
          const firstRestaurant = stableRestaurants.find(r => r.latitude && r.longitude);
          if (firstRestaurant) {
            let lat = parseFloat(String(firstRestaurant.latitude));
            let lon = parseFloat(String(firstRestaurant.longitude));
            
            if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
              [lat, lon] = [lon, lat];
            }
            
            const coords: [number, number] = [lon, lat];
            mapInstance.setCenter(coords, 12);
            console.log('🗺️ RestaurantPicker: Карта центрирована на первом ресторане (fallback):', coords);
          }
        }
      }
    }

    // Добавляем функцию выбора ресторана в глобальную область
      (window as any).selectRestaurant = (restaurantId: number) => {
        console.log('🗺️ RestaurantPicker: Выбор ресторана через balloon:', restaurantId);
        const restaurant = stableRestaurants.find(r => r.id === restaurantId);
        if (restaurant) {
        stableOnRestaurantSelect(restaurant);
        stableOnClose();
      }
    };
    
    console.log('🗺️ RestaurantPicker: Все рестораны добавлены на карту');
    console.log('🗺️ RestaurantPicker: Итоговое количество меток на карте:', mapInstance.geoObjects.getLength());
    
    // Проверяем, что метки действительно видны
    const finalPlacemarksCount = mapInstance.geoObjects.getLength();
    if (finalPlacemarksCount === 0) {
      console.warn('⚠️ RestaurantPicker: ВНИМАНИЕ! На карте нет меток, хотя рестораны были добавлены!');
    } else {
      console.log(`✅ RestaurantPicker: Успешно добавлено ${finalPlacemarksCount} меток ресторанов на карту`);
    }
  }, [mapInstance, stableRestaurants, stableOnRestaurantSelect, stableOnClose]);

  // Обновляем selectedRestaurantId при изменении selectedRestaurant
  useEffect(() => {
    if (selectedRestaurant?.id !== selectedRestaurantId) {
      setSelectedRestaurantId(selectedRestaurant?.id || null);
    }
  }, [selectedRestaurant?.id, selectedRestaurantId]);

  const handleRestaurantSelect = useCallback((restaurant: Restaurant) => {
    console.log('🗺️ RestaurantPicker: Выбор ресторана из списка:', restaurant.name);
    setSelectedRestaurantId(restaurant.id);
    stableOnRestaurantSelect(restaurant);
  }, [stableOnRestaurantSelect]);

  // Мемоизируем обработчик выбора ресторана
  const handleConfirmSelection = useCallback(() => {
    if (selectedRestaurantId) {
      const restaurant = stableRestaurants.find(r => r.id === selectedRestaurantId);
      if (restaurant) {
        stableOnRestaurantSelect(restaurant);
        stableOnClose();
      }
    }
  }, [selectedRestaurantId, stableRestaurants, stableOnRestaurantSelect, stableOnClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-4 sm:p-6 text-center w-full max-w-sm">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-500 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Загружаем рестораны...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-4 sm:p-6 text-center w-full max-w-sm">
          <p className="text-red-600 mb-3 sm:mb-4 text-sm sm:text-base">Ошибка загрузки ресторанов</p>
          <button
            onClick={stableOnClose}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm sm:text-base w-full"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-0">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] sm:max-h-[90vh] overflow-hidden">
        {/* Заголовок */}
        <div className="bg-primary-500 text-white p-3 sm:p-4 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold text-white">Выберите ресторан для самовывоза</h2>
          <button
            onClick={stableOnClose}
            className="text-white hover:text-gray-200 text-xl sm:text-2xl p-1"
          >
            ×
          </button>
        </div>

        {/* Мобильная версия - вертикальное расположение */}
        <div className="flex flex-col lg:flex-row h-[calc(90vh-60px)] sm:h-[calc(90vh-80px)]">
          {/* Список ресторанов - на мобильных сверху, на десктопе слева */}
          <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto max-h-[40vh] lg:max-h-none">
            <div className="p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Список ресторанов</h3>
              <div className="space-y-2 sm:space-y-3">
                {stableRestaurants.map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className={`p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRestaurantId === restaurant.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleRestaurantSelect(restaurant)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base truncate">
                          {restaurant.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 truncate">
                          {restaurant.address}, {restaurant.city}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm space-y-1 sm:space-y-0">
                          <span className="text-gray-500">
                            Минимум: {restaurant.min_order_amount.toLocaleString()} сум
                          </span>
                          <span className="text-gray-500">
                            {restaurant.pickup_time}
                          </span>
                        </div>
                      </div>
                      {restaurant.pickup_available && (
                        <span className="text-green-600 text-xs font-medium ml-2 flex-shrink-0">
                          ✓ Доступен
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Карта - на мобильных снизу, на десктопе справа */}
          <div className="w-full lg:w-2/3 relative flex-1 min-h-[50vh] lg:min-h-0">
            {mapLoading && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                <div className="text-center p-4">
                  <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary-500 mx-auto mb-3 sm:mb-4"></div>
                  <p className="text-gray-600 text-sm sm:text-base">Загружаем карту...</p>
                  <p className="text-xs text-gray-500 mt-2">Проверьте консоль для отладочной информации</p>
                </div>
              </div>
            )}
            
            {mapError && (
              <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10">
                <div className="text-center p-4">
                  <div className="text-red-600 text-3xl sm:text-4xl mb-3 sm:mb-4">❌</div>
                  <p className="text-red-600 mb-2 text-sm sm:text-base">Ошибка загрузки карты</p>
                  <p className="text-red-500 text-xs sm:text-sm mb-3 sm:mb-4">{mapError}</p>
                  <div className="text-xs text-gray-600 mb-3 sm:mb-4">
                    Проверьте консоль браузера для подробной информации
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded text-sm sm:text-base hover:bg-red-700"
                  >
                    Перезагрузить страницу
                  </button>
                </div>
              </div>
            )}
            
            <div 
              ref={mapRef} 
              className="w-full h-full bg-gray-100 border border-gray-300"
              style={{ minHeight: '300px' }}
            />
            
            {/* Fallback текст, если карта не загрузилась */}
            {!mapInstance && !mapLoading && !mapError && (
              <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
                <div className="text-center p-4">
                  <div className="text-gray-400 text-3xl sm:text-4xl mb-3 sm:mb-4">🗺️</div>
                  <p className="text-gray-600 mb-2 text-sm sm:text-base">Карта загружается...</p>
                  <p className="text-xs text-gray-500">Если карта не появилась, проверьте консоль</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={stableOnClose}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
            >
              Отмена
            </button>
            {selectedRestaurantId && (
              <button
                onClick={handleConfirmSelection}
                className="w-full sm:w-auto px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm sm:text-base"
              >
                Выбрать ресторан
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};