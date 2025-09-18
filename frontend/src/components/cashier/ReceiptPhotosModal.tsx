import React, { useState } from 'react';
import { type Order, type ReceiptPhoto } from '../../api/cashierApi';

interface ReceiptPhotosModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptPhotosModal: React.FC<ReceiptPhotosModalProps> = ({
  order,
  isOpen,
  onClose
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  if (!isOpen || !order) return null;

  const receiptPhotos: ReceiptPhoto[] = order.receipt_photos || [];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handlePreviousPhoto = () => {
    setSelectedPhotoIndex(prev => 
      prev > 0 ? prev - 1 : receiptPhotos.length - 1
    );
  };

  const handleNextPhoto = () => {
    setSelectedPhotoIndex(prev => 
      prev < receiptPhotos.length - 1 ? prev + 1 : 0
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      handlePreviousPhoto();
    } else if (event.key === 'ArrowRight') {
      handleNextPhoto();
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Заголовок модального окна */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold">Фотографии чека</h2>
                <span className="px-2 py-1 bg-green-200 text-green-800 text-sm font-medium rounded-full">
                  Заказ #{order.id}
                </span>
              </div>
              <p className="text-green-100 text-sm">
                {receiptPhotos.length} фотографий чека
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Содержимое модального окна */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {receiptPhotos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-50">📷</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Фотографии чека отсутствуют
              </h3>
              <p className="text-gray-600">
                Для этого заказа фотографии чека не были загружены курьером.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Основная фотография */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="relative">
                  <img
                    src={receiptPhotos[selectedPhotoIndex]?.photo_url}
                    alt={`Чек заказа ${order.id}`}
                    className="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-food.jpg';
                    }}
                  />
                  
                  {/* Навигация по фотографиям */}
                  {receiptPhotos.length > 1 && (
                    <>
                      <button
                        onClick={handlePreviousPhoto}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all duration-200"
                        aria-label="Предыдущая фотография"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={handleNextPhoto}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all duration-200"
                        aria-label="Следующая фотография"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                
                {/* Информация о текущей фотографии */}
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Фотография {selectedPhotoIndex + 1} из {receiptPhotos.length}
                    </span>
                    <span className="text-sm text-gray-500">
                      {receiptPhotos[selectedPhotoIndex]?.driver_name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Доставлено: {receiptPhotos[selectedPhotoIndex]?.delivered_at ? 
                      formatTime(receiptPhotos[selectedPhotoIndex].delivered_at) : 
                      'Время не указано'
                    }
                  </p>
                </div>
              </div>

              {/* Миниатюры фотографий */}
              {receiptPhotos.length > 1 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Все фотографии чека
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {receiptPhotos.map((photo, index) => (
                      <button
                        key={photo.id}
                        onClick={() => setSelectedPhotoIndex(index)}
                        className={`relative group rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          index === selectedPhotoIndex 
                            ? 'border-green-500 ring-2 ring-green-200' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={photo.photo_url}
                          alt={`Чек ${index + 1}`}
                          className="w-full h-20 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-food.jpg';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {index + 1}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Информация о заказе */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Информация о заказе
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Номер заказа:</p>
                    <p className="font-semibold text-gray-900">#{order.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Тип услуги:</p>
                    <p className="font-semibold text-gray-900">
                      {order.service_type === 'pickup' ? '🍽️ Самовывоз' : '🚚 Доставка'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Способ оплаты:</p>
                    <p className="font-semibold text-gray-900">
                      {order.payment_method === 'cash' ? '💵 Наличные' : 
                       order.payment_method === 'card' ? '💳 Карта' : '🌐 Онлайн'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Итоговая сумма:</p>
                    <p className="font-semibold text-green-600">
                      {order.final_price && parseFloat(order.final_price) > 0 
                        ? `${Number(order.final_price).toLocaleString()} сум`
                        : order.total_price && parseFloat(order.total_price) > 0
                          ? `${Number(order.total_price).toLocaleString()} сум`
                          : '⏳ Загрузка...'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Футер модального окна */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {receiptPhotos.length > 0 && (
                <>
                  Используйте стрелки ← → для навигации или клавишу Esc для закрытия
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
