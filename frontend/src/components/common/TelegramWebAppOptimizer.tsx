import { useEffect } from 'react';

interface TelegramWebAppOptimizerProps {
  children: React.ReactNode;
}

export const TelegramWebAppOptimizer: React.FC<TelegramWebAppOptimizerProps> = ({ children }) => {
  useEffect(() => {
    // Проверяем, что мы в Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Настраиваем Telegram Web App
      tg.ready();
      
      // Устанавливаем основной цвет
      tg.MainButton.setParams({
        text: 'Готово',
        color: '#6366f1', // primary-600
        text_color: '#ffffff'
      });
      
      // Отключаем автоматическое скрытие кнопки
      tg.MainButton.hide();
      
      // Настраиваем BackButton
      tg.BackButton.hide();
      
      // Устанавливаем цвет темы
      document.documentElement.style.setProperty(
        '--tg-theme-bg-color', 
        tg.themeParams.bg_color || '#1f2937'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-text-color', 
        tg.themeParams.text_color || '#f9fafb'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-hint-color', 
        tg.themeParams.hint_color || '#9ca3af'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-link-color', 
        tg.themeParams.link_color || '#6366f1'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-button-color', 
        tg.themeParams.button_color || '#6366f1'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-button-text-color', 
        tg.themeParams.button_text_color || '#ffffff'
      );
      
      // Добавляем CSS переменные для использования в стилях
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --tg-theme-bg-color: ${tg.themeParams.bg_color || '#1f2937'};
          --tg-theme-text-color: ${tg.themeParams.text_color || '#f9fafb'};
          --tg-theme-hint-color: ${tg.themeParams.hint_color || '#9ca3af'};
          --tg-theme-link-color: ${tg.themeParams.link_color || '#6366f1'};
          --tg-theme-button-color: ${tg.themeParams.button_color || '#6366f1'};
          --tg-theme-button-text-color: ${tg.themeParams.button_text_color || '#ffffff'};
        }
        
        /* Оптимизация для Telegram Web App */
        body {
          background-color: var(--tg-theme-bg-color) !important;
          color: var(--tg-theme-text-color) !important;
          /* Отключаем bounce эффект на iOS */
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: none;
        }
        
        /* Улучшаем скролл в Telegram */
        * {
          -webkit-overflow-scrolling: touch;
        }
        
        /* Фиксируем позицию скролла */
        html {
          scroll-behavior: smooth;
        }
        
        /* Оптимизация для мобильных устройств */
        @media (max-width: 768px) {
          body {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
          }
        }
      `;
      document.head.appendChild(style);
      
      // Обработчик для корректного скролла
      let isScrolling = false;
      let scrollTimeout: NodeJS.Timeout;
      
      const handleScroll = () => {
        if (!isScrolling) {
          isScrolling = true;
        }
        
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isScrolling = false;
        }, 150);
      };
      
      window.addEventListener('scroll', handleScroll, { passive: true });
      
      // Очистка при размонтировании
      return () => {
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimeout);
        document.head.removeChild(style);
      };
    }
  }, []);

  return <>{children}</>;
};
