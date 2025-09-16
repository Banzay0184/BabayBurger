import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  className = ''
}) => {
  // Обработка клавиши Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Блокируем прокрутку body когда модальное окно открыто
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'sm:max-w-sm';
      case 'md':
        return 'sm:max-w-md';
      case 'lg':
        return 'sm:max-w-lg';
      case 'xl':
        return 'sm:max-w-xl';
      case 'full':
        return 'sm:max-w-4xl';
      default:
        return 'sm:max-w-md';
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        // Закрываем модальное окно при клике по фону
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={`
          bg-white shadow-xl overflow-hidden
          w-full h-full
          sm:w-auto sm:h-auto sm:max-h-[90vh]
          rounded-none sm:rounded-lg
          ${getSizeClasses()}
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <span className="text-xl">×</span>
            </button>
          </div>
        </div>
        
        {/* Контент */}
        <div className="overflow-y-auto h-[calc(100vh-80px)] sm:max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );

  // Рендерим модальное окно в body, чтобы оно было поверх всех элементов
  return createPortal(modalContent, document.body);
};

export default Modal;
