import { useEffect, useRef } from 'react';
import { scrollToTop } from '../../hooks/useScrollToTop';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Автоматически скроллим вверх при монтировании компонента
    scrollToTop();
    
    // Дополнительная оптимизация для Telegram Web App
    if (window.Telegram?.WebApp) {
      // Небольшая задержка для корректной работы
      setTimeout(() => {
        if (pageRef.current) {
          pageRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
      }, 50);
    }
  }, []);

  return (
    <div 
      ref={pageRef}
      className={`page-transition ${className}`}
      style={{
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden'
      }}
    >
      {children}
    </div>
  );
};
