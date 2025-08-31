import { useEffect } from 'react';

export const useScrollToTop = () => {
  useEffect(() => {
    // Плавно скроллим вверх при монтировании компонента
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
    
    // Дополнительно для Telegram Web App - принудительно устанавливаем позицию
    if (window.Telegram?.WebApp) {
      // Небольшая задержка для корректной работы
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }
  }, []); // Выполняется только при монтировании
};

// Хук для принудительного скролла вверх (например, при открытии модальных окон)
export const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: 'smooth'
  });
  
  // Для Telegram Web App
  if (window.Telegram?.WebApp) {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  }
};
