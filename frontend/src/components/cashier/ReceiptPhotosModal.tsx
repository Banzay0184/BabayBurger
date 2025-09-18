import React, { useState } from 'react';
import { type ReceiptPhoto } from '../../api/cashierApi';

interface ReceiptPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptPhotos: ReceiptPhoto[];
  orderId: number;
}

export const ReceiptPhotosModal: React.FC<ReceiptPhotosModalProps> = ({
  isOpen,
  onClose,
  receiptPhotos,
  orderId
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  if (!isOpen || !receiptPhotos || receiptPhotos.length === 0) return null;

  const currentPhoto = receiptPhotos[currentPhotoIndex];

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

  const handlePrevious = () => {
    setCurrentPhotoIndex(prev => 
      prev === 0 ? receiptPhotos.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentPhotoIndex(prev => 
      prev === receiptPhotos.length - 1 ? 0 : prev + 1
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      handlePrevious();
    } else if (event.key === 'ArrowRight') {
      handleNext();
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок модального окна */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Чеки заказа #{orderId}</h2>
              <p className="text-green-100 text-sm">
                {receiptPhotos.length} {receiptPhotos.length === 1 ? 'чек' : 'чека'}
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
        <div className="p-6">
          {receiptPhotos.length > 1 && (
            <div className="flex justify-center mb-4">
              <div className="flex space-x-2">
                {receiptPhotos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentPhotoIndex 
                        ? 'bg-green-600' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Информация о текущем чеке */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Чек #{currentPhotoIndex + 1} из {receiptPhotos.length}
                </h3>
                <p className="text-sm text-gray-600">
                  Курьер: {currentPhoto.driver_name}
                </p>
                <p className="text-sm text-gray-600">
                  Доставлен: {formatTime(currentPhoto.delivered_at)}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  currentPhoto.status === 'delivered' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {currentPhoto.status === 'delivered' ? 'Доставлен' : currentPhoto.status}
                </span>
              </div>
            </div>
          </div>

          {/* Фотография чека */}
          <div className="relative">
            <div className="flex justify-center">
              <img
                src={currentPhoto.photo_url}
                alt={`Чек заказа #${orderId}`}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-food.jpg';
                  target.alt = 'Ошибка загрузки изображения';
                }}
              />
            </div>

            {/* Навигационные кнопки */}
            {receiptPhotos.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 p-2 rounded-full shadow-lg transition-all"
                  title="Предыдущий чек"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 p-2 rounded-full shadow-lg transition-all"
                  title="Следующий чек"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Инструкции */}
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>Используйте стрелки ← → для навигации или кликните на точки выше</p>
            <p>Нажмите Esc или кликните вне окна для закрытия</p>
          </div>
        </div>

        {/* Футер модального окна */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {receiptPhotos.length > 1 && (
                <span>
                  {currentPhotoIndex + 1} из {receiptPhotos.length} чеков
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              {receiptPhotos.length > 1 && (
                <>
                  <button
                    onClick={handlePrevious}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                    disabled={receiptPhotos.length <= 1}
                  >
                    ← Предыдущий
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                    disabled={receiptPhotos.length <= 1}
                  >
                    Следующий →
                  </button>
                </>
              )}
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
    </div>
  );
};
