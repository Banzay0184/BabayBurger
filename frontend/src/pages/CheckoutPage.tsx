import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { Address } from '../types/address';
import { YandexMapPicker } from '../components/map/YandexMapPicker';

interface CheckoutPageProps {
  onClose: () => void;
}

type ServiceType = 'delivery' | 'pickup';
type PaymentMethod = 'cash' | 'card' | 'telegram';

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onClose }) => {
  const { state } = useAuth();
  const { state: cartState, clear } = useCart();
  const [serviceType, setServiceType] = useState<ServiceType>('delivery');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState(''); // Дополнительный номер клиента
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false); // Модальное окно карты

  // Загрузка адресов пользователя
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const telegramId = state.user?.telegram_id?.toString() || '123456789';
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://3e3f35c1758a.ngrok-free.app';
        const response = await fetch(`${apiBaseUrl}/api/addresses/?telegram_id=${telegramId}`, {
          headers: {
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        });
        
        if (response.ok) {
          const addressesData = await response.json();
          setAddresses(addressesData);
          // Автоматически выбираем основной адрес
          const primaryAddress = addressesData.find((addr: Address) => addr.is_primary);
          if (primaryAddress) {
            setSelectedAddress(primaryAddress);
          }
        }
      } catch (error) {
        console.error('Error loading addresses:', error);
      }
    };

    const loadDeliveryZones = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://3e3f35c1758a.ngrok-free.app';
        const response = await fetch(`${apiBaseUrl}/api/delivery-zones/`, {
          headers: {
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        });
        
        if (response.ok) {
          const zonesData = await response.json();
          setDeliveryZones(zonesData);
        }
      } catch (error) {
        console.error('Error loading delivery zones:', error);
      }
    };

    if (state.user) {
      loadAddresses();
      loadDeliveryZones();
    }
  }, [state.user]);

  // Расчет стоимости доставки
  const getDeliveryFee = useMemo(() => {
    if (serviceType === 'pickup') return 0;
    if (!selectedAddress) return 0;
    
    // Ищем зону доставки для выбранного адреса
    const addressZone = deliveryZones.find(zone => 
      zone.city === selectedAddress.city && zone.is_active
    );
    
    if (!addressZone) {
      console.log('🔍 Зона доставки не найдена для города:', selectedAddress.city);
      return 0; // Если зона не найдена, доставка бесплатная
    }
    
    console.log('🔍 Найдена зона доставки:', addressZone.name);
    console.log('🔍 Стоимость доставки:', addressZone.delivery_fee);
    console.log('🔍 Минимальная сумма для бесплатной доставки:', addressZone.min_order_amount);
    console.log('🔍 Сумма заказа:', cartState.total);
    
    // Проверяем, подходит ли сумма заказа для бесплатной доставки
    if (addressZone.min_order_amount && cartState.total >= Number(addressZone.min_order_amount)) {
      console.log('✅ Сумма заказа достаточна для бесплатной доставки');
      return 0; // Бесплатная доставка
    }
    
    // Возвращаем стоимость доставки из зоны
    const deliveryFee = Number(addressZone.delivery_fee) || 0;
    console.log('💰 Стоимость доставки:', deliveryFee);
    return deliveryFee;
  }, [serviceType, selectedAddress, deliveryZones, cartState.total]);

  // Расчет итоговой суммы
  const getTotalAmount = () => {
    const subtotal = cartState.total;
    const deliveryFee = getDeliveryFee;
    return subtotal + deliveryFee;
  };

  // Время доставки
  const getDeliveryTime = () => {
    if (serviceType === 'pickup') return '15-20 минут';
    return '30-40 минут';
  };

  // Оформление заказа
  const handleSubmitOrder = async () => {
    if (serviceType === 'delivery' && !selectedAddress) {
      setError('Выберите адрес доставки');
      return;
    }

    if (cartState.items.length === 0) {
      setError('Корзина пуста');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const telegramId = state.user?.telegram_id?.toString() || '123456789';
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://3e3f35c1758a.ngrok-free.app';
      
      let finalAddressId = selectedAddress?.id;
      
      // Если адрес выбран с карты (временный), сначала сохраняем его
      if (selectedAddress?.id === -1) {
        console.log('🗺️ Сохраняем временный адрес с карты...');
        
        // Показываем уведомление пользователю
        setError(null);
        setError('🗺️ Сохраняем выбранный адрес...');
        
        const addressData = {
          telegram_id: telegramId,
          street: selectedAddress.street || 'Улица не определена',
          house_number: selectedAddress.house_number || '200',
          apartment: selectedAddress.apartment || '',
          city: selectedAddress.city || 'Бухара',
          comment: selectedAddress.comment || '',
          coordinates: `${selectedAddress.longitude || 0},${selectedAddress.latitude || 0}`,
          // Ограничиваем координаты до 6 знаков после запятой для соответствия backend
          latitude: Number((selectedAddress.latitude || 0).toFixed(6)),
          longitude: Number((selectedAddress.longitude || 0).toFixed(6)),
          phone_number: selectedAddress.phone_number || state.user?.phone_number || '+9989041410184',
          is_primary: false // Не делаем основным автоматически
        };
        
        console.log('📍 Данные адреса для сохранения:', addressData);
        
        const addressResponse = await fetch(`${apiBaseUrl}/api/addresses/`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify(addressData)
        });
        
        if (addressResponse.ok) {
          const savedAddress = await addressResponse.json();
          console.log('✅ Адрес сохранен:', savedAddress);
          finalAddressId = savedAddress.id;
          
          // Обновляем selectedAddress с реальным ID
          setSelectedAddress({
            ...selectedAddress,
            id: savedAddress.id
          });
          
          // Обновляем список адресов
          setAddresses(prev => [...prev, savedAddress]);
          
          // Очищаем сообщение о сохранении
          setError(null);
        } else {
          const addressError = await addressResponse.json();
          console.error('❌ Ошибка сохранения адреса:', addressError);
          setError(`Ошибка сохранения адреса: ${addressError.error || 'Неизвестная ошибка'}`);
          setIsSubmitting(false);
          return;
        }
      }
      
      const orderData = {
        telegram_id: telegramId,
        service_type: serviceType,
        address_id: finalAddressId, // Теперь у нас всегда есть реальный ID
        payment_method: paymentMethod,
        notes: notes,
        additional_phone: additionalPhone,
        items: cartState.items.map(item => ({
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
          size_option_id: item.sizeOption?.id || null,
          add_ons: item.addOns.map(addon => addon.id),
          price: item.totalPrice / item.quantity
        })),
        total_price: getTotalAmount(),
        delivery_fee: getDeliveryFee
      };

      console.log('📦 Отправляем заказ:', orderData);
      console.log('📍 Финальный ID адреса:', finalAddressId);

      const response = await fetch(`${apiBaseUrl}/api/orders/create/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        const orderResult = await response.json();
        setOrderNumber(`#${orderResult.id}`);
        setSuccess(true);
        // Очищаем корзину после успешного заказа
        clear();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка при создании заказа');
      }
    } catch (err) {
      console.error('Error creating order:', err);
      setError('Ошибка при создании заказа');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Модальное окно выбора адреса
  const AddressSelectionModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-dark-800 rounded-2xl border border-gray-700/50 w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-100">Выбор адреса доставки</h3>
            <button
              onClick={() => setShowAddressModal(false)}
              className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              <span className="text-gray-300 text-lg">×</span>
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {addresses.map((address) => (
            <button
              key={address.id}
              onClick={() => {
                setSelectedAddress(address);
                setShowAddressModal(false);
              }}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                selectedAddress?.id === address.id
                  ? 'border-primary-500 bg-primary-500/20'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-100">
                    {address.full_address}
                  </div>
                  <div className="text-sm text-gray-400">
                    {address.phone_number}
                  </div>
                  {address.is_primary && (
                    <div className="text-xs text-primary-400 mt-1">Основной адрес</div>
                  )}
                </div>
                {selectedAddress?.id === address.id && (
                  <span className="text-primary-400 text-xl">✓</span>
                )}
              </div>
            </button>
          ))}
          
        </div>
      </div>
    </div>
  );

  // Модальное окно карты для выбора адреса
  const MapModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-dark-800 rounded-2xl border border-gray-700/50 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-100">Выбор адреса на карте</h3>
            <button
              onClick={() => setShowMapModal(false)}
              className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              <span className="text-gray-300 text-lg">×</span>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="h-96 rounded-xl overflow-hidden">
            <YandexMapPicker
              onAddressSelect={(addressData) => {
                console.log('🗺️ Выбран адрес с карты:', addressData);
                console.log('📍 Координаты с карты:', addressData.coordinates);
                console.log('📍 Longitude (долгота):', addressData.coordinates[0]);
                console.log('📍 Latitude (широта):', addressData.coordinates[1]);
                
                // Создаем временный адрес для использования в заказе
                const tempAddress: Address = {
                  id: -1, // Временный ID
                  user: Number(state.user?.id) || 0,
                  street: addressData.street || '',
                  house_number: addressData.house || '',
                  apartment: '',
                  city: addressData.city || 'Бухара',
                  comment: '',
                  // Формируем координаты правильно: longitude,latitude
                  coordinates: `${addressData.coordinates[0]},${addressData.coordinates[1]}`,
                  // coordinates[0] - это longitude, coordinates[1] - это latitude
                  latitude: addressData.coordinates[1],
                  longitude: addressData.coordinates[0],
                  phone_number: state.user?.phone_number || '+9989041410184',
                  formatted_phone: state.user?.phone_number || '+9989041410184',
                  full_address: addressData.address || 'Выбрано на карте',
                  is_primary: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  telegram_id: String(state.user?.telegram_id || '123456789')
                };
                
                setSelectedAddress(tempAddress);
                setShowMapModal(false);
              }}
              onClose={() => setShowMapModal(false)}
            />
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              Кликните по карте для выбора адреса доставки
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen text-gray-100 bg-dark-900">
        <div className="sticky top-0 z-50 bg-dark-800/95 backdrop-blur-lg border-b border-gray-700/50">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-bold text-gray-100">Заказ оформлен</h1>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              <span className="text-gray-300 text-lg">✓</span>
            </button>
          </div>
        </div>

        <div className="pt-8 px-4 text-center">
          <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-600/50">
            <span className="text-4xl">✅</span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-100 mb-4">
            Заказ успешно оформлен!
          </h2>
          
          <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50 mb-6">
            <div className="text-4xl font-bold text-primary-400 mb-2">
              {orderNumber}
            </div>
            <p className="text-gray-400 mb-4">
              Номер вашего заказа
            </p>
            
            <div className="space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-gray-400">Тип услуги:</span>
                <span className="text-gray-100">
                  {serviceType === 'delivery' ? 'Доставка' : 'Самовывоз'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Время:</span>
                <span className="text-gray-100">
                  {getDeliveryTime()}
                </span>
              </div>
              
              {serviceType === 'delivery' && selectedAddress && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Адрес:</span>
                  <span className="text-gray-100 text-right">
                    {selectedAddress.full_address}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-400">Способ оплаты:</span>
                <span className="text-gray-100">
                  {paymentMethod === 'cash' ? 'Наличными' : 
                   paymentMethod === 'card' ? 'Картой' : 'Telegram'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                setSuccess(false);
                setOrderNumber(null);
              }}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
            >
              Сделать еще один заказ
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 py-3 px-6 rounded-xl font-semibold transition-colors"
            >
              Вернуться в меню
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-100 bg-dark-900">
      {/* Заголовок страницы */}
      <div className="sticky top-0 z-50 bg-dark-800/95 backdrop-blur-lg border-b border-gray-700/50">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
          >
            <span className="text-gray-300 text-lg">←</span>
          </button>
          <h1 className="text-lg font-bold text-gray-100">Оформление заказа</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="pt-4 space-y-6 px-4 pb-24">
        {/* Выбор типа услуги */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center">
            <span className="mr-2">🚚</span>
            Тип услуги
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setServiceType('delivery')}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                serviceType === 'delivery'
                  ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                  : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              <div className="text-2xl mb-2">🚚</div>
              <div className="font-semibold">Доставка</div>
              <div className="text-sm opacity-80">30-40 минут</div>
            </button>
            
            <button
              onClick={() => setServiceType('pickup')}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                serviceType === 'pickup'
                  ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                  : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
              }`}
            >
              <div className="text-2xl mb-2">🏪</div>
              <div className="font-semibold">Самовывоз</div>
              <div className="text-sm opacity-80">15-20 минут</div>
            </button>
          </div>
        </div>

        {/* Выбор адреса (только для доставки) */}
        {serviceType === 'delivery' && (
          <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center">
              <span className="mr-2">📍</span>
              Адрес доставки
            </h3>
            
            {addresses.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-4">🏠</div>
                <p className="text-gray-400 mb-4">У вас нет сохраненных адресов</p>
                <button
                  onClick={() => onClose()}
                  className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Добавить адрес
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Показываем только выбранный адрес или кнопку выбора */}
                {selectedAddress ? (
                  <div className="p-4 rounded-xl border-2 border-primary-500 bg-primary-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-100">
                          {selectedAddress.full_address}
                        </div>
                        <div className="text-sm text-gray-400">
                          {selectedAddress.phone_number}
                        </div>
                        {selectedAddress.is_primary && (
                          <div className="text-xs text-primary-400 mt-1">Основной адрес</div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowAddressModal(true)}
                        className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                      >
                        Изменить
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="w-full p-4 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:border-primary-500 hover:text-primary-400 transition-colors"
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">📍</div>
                      <div className="font-semibold">Выбрать адрес доставки</div>
                    </div>
                  </button>
                )}
                
                {/* Кнопка добавления нового адреса */}
                <button
                  onClick={() => setShowMapModal(true)}
                  className="w-full p-3 border border-gray-600 rounded-lg text-gray-400 hover:border-primary-500 hover:text-primary-400 transition-colors"
                >
                  <div className="flex items-center justify-center">
                    <span className="mr-2">🗺️</span>
                    Выбрать адрес на карте
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Дополнительный номер клиента (только для доставки) */}
        {serviceType === 'delivery' && (
          <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center">
              <span className="mr-2">📱</span>
              Дополнительный номер клиента
            </h3>
            
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="tel"
                  value={additionalPhone}
                  onChange={(e) => setAdditionalPhone(e.target.value)}
                  placeholder="+998 90 123 45 67 (необязательно)"
                  className="w-full p-4 bg-gray-700/50 border border-gray-600 rounded-xl text-gray-100 placeholder-gray-500 focus:border-primary-500 focus:outline-none transition-colors"
                />
                <div className="text-xs text-gray-500 mt-2">
                  Укажите дополнительный номер для связи с клиентом (если отличается от основного)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Способ оплаты */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center">
            <span className="mr-2">💳</span>
            Способ оплаты
          </h3>
          
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                paymentMethod === 'cash'
                  ? 'border-primary-500 bg-primary-500/20'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">💵</span>
                  <div>
                    <div className="font-semibold text-gray-100">Наличными</div>
                    <div className="text-sm text-gray-400">Оплата при получении</div>
                  </div>
                </div>
                {paymentMethod === 'cash' && (
                  <span className="text-primary-400 text-xl">✓</span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setPaymentMethod('card')}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                paymentMethod === 'card'
                  ? 'border-primary-500 bg-primary-500/20'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">💳</span>
                  <div>
                    <div className="font-semibold text-gray-100">Картой</div>
                    <div className="text-sm text-gray-400">Онлайн оплата</div>
                  </div>
                </div>
                {paymentMethod === 'card' && (
                  <span className="text-primary-400 text-xl">✓</span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setPaymentMethod('telegram')}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                paymentMethod === 'telegram'
                  ? 'border-primary-500 bg-primary-500/20'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📱</span>
                  <div>
                    <div className="font-semibold text-gray-100">Telegram</div>
                    <div className="text-sm text-gray-400">Через Telegram Pay</div>
                  </div>
                </div>
                {paymentMethod === 'telegram' && (
                  <span className="text-primary-400 text-xl">✓</span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Примечания к заказу */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center">
            <span className="mr-2">📝</span>
            Примечания к заказу
          </h3>
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Дополнительные пожелания, инструкции для курьера..."
            className="w-full p-4 bg-gray-700/50 border border-gray-600 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors resize-none"
            rows={3}
          />
        </div>

        {/* Итоговая информация */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center">
            <span className="mr-2">📋</span>
            Итоговая информация
          </h3>
          
          <div className="space-y-4">
            {/* Состав заказа */}
            <div>
              <h4 className="font-semibold text-gray-300 mb-2">Состав заказа:</h4>
              <div className="space-y-2">
                {cartState.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">
                      {item.quantity}x {item.menuItem.name}
                    </span>
                    <span className="text-gray-300 font-medium">
                      {item.totalPrice} сум
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Стоимость */}
            <div className="border-t border-gray-600 pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Стоимость товаров:</span>
                <span className="text-gray-300">{cartState.total} сум</span>
              </div>
              
              {serviceType === 'delivery' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Стоимость доставки:</span>
                    <span className="text-gray-300">{getDeliveryFee} сум</span>
                  </div>
                  
                  {/* Информация о зоне доставки */}
                  {selectedAddress && deliveryZones.length > 0 && (
                    (() => {
                      const addressZone = deliveryZones.find(zone => 
                        zone.city === selectedAddress.city && zone.is_active
                      );
                      
                      if (addressZone) {
                        const isFreeDelivery = addressZone.min_order_amount && 
                          cartState.total >= Number(addressZone.min_order_amount);
                        
                        return (
                          <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/50">
                            <div className="text-xs text-gray-400 mb-2">
                              📍 Зона доставки: {addressZone.name}
                            </div>
                            
                            {isFreeDelivery ? (
                              <div className="text-green-400 text-sm font-medium">
                                ✅ Бесплатная доставка (заказ от {Number(addressZone.min_order_amount).toLocaleString()} сум)
                              </div>
                            ) : (
                              <div className="text-sm">
                                <div className="text-gray-300 mb-1">
                                  💰 Стоимость доставки: {Number(addressZone.delivery_fee).toLocaleString()} сум
                                </div>
                                <div className="text-gray-400 text-xs">
                                  🆓 Бесплатно от {Number(addressZone.min_order_amount).toLocaleString()} сум
                                </div>
                                <div className="text-primary-400 text-xs mt-1">
                                  До бесплатной доставки: {Math.max(0, Number(addressZone.min_order_amount) - cartState.total).toLocaleString()} сум
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </>
              )}
              
              <div className="flex justify-between text-lg font-bold border-t border-gray-600 pt-2">
                <span className="text-gray-100">Итого:</span>
                <span className="text-primary-400">{getTotalAmount()} сум</span>
              </div>
            </div>
            
            {/* Время доставки */}
            <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/50">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">⏱️ Время {serviceType === 'delivery' ? 'доставки' : 'готовности'}:</span>
                <span className="text-primary-400 font-semibold">{getDeliveryTime()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ошибки */}
        {error && (
          <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Кнопка оформления заказа */}
        <button
          onClick={handleSubmitOrder}
          disabled={isSubmitting || (serviceType === 'delivery' && !selectedAddress)}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
            isSubmitting || (serviceType === 'delivery' && !selectedAddress)
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white hover:scale-105'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Оформление заказа...
            </span>
          ) : (
            `Оформить заказ за ${getTotalAmount()} сум`
          )}
        </button>
      </div>

      {/* Модальное окно выбора адреса */}
      {showAddressModal && <AddressSelectionModal />}
      {showMapModal && <MapModal />}
    </div>
  );
};
