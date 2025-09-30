import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './utils/tronWebFix' // Предотвращаем конфликты с TronWeb

// Ранняя инициализация: глобальные обработчики ошибок и проверка Telegram WebApp
if (typeof window !== 'undefined') {
  // Отображаем ошибки прямо в UI (актуально для WebView Telegram, где консоль недоступна)
  const appendOverlayLine = (text: string, color = '#0f0') => {
    try {
      let overlay = document.getElementById('tg-debug-overlay') as HTMLPreElement | null;
      if (!overlay) {
        overlay = document.createElement('pre');
        overlay.id = 'tg-debug-overlay';
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.maxHeight = '50vh';
        overlay.style.overflow = 'auto';
        overlay.style.background = '#000';
        overlay.style.color = color;
        overlay.style.padding = '8px';
        overlay.style.margin = '0';
        overlay.style.fontSize = '12px';
        overlay.style.zIndex = '2147483647';
        overlay.style.whiteSpace = 'pre-wrap';
        document.addEventListener('click', () => overlay && (overlay.style.display = 'none'), { once: true });
        document.body.appendChild(overlay);
      }
      const time = new Date().toISOString();
      overlay.textContent += `\n[${time}] ${text}`;
    } catch (_) {
      // игнорируем ошибки рендера оверлея
    }
  };

  window.onerror = function (message, source, lineno, colno) {
    appendOverlayLine(`Ошибка: ${message} @ ${source}:${lineno}:${colno}`, '#ff6b6b');
  };

  window.addEventListener('unhandledrejection', function (event) {
    appendOverlayLine(`UnhandledRejection: ${String((event as any).reason)}`, '#ff8787');
  });

  // Telegram WebApp init
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready?.();
      tg.expand?.();
      // Необязательно, но помогает избежать неожиданных закрытий
      if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes();
      if (typeof tg.disableClosingConfirmation === 'function') tg.disableClosingConfirmation?.();
      appendOverlayLine('Telegram WebApp: ready()', '#7efc7e');
    } else {
      appendOverlayLine('Telegram WebApp: недоступен (работаем как обычный браузер)', '#f1c40f');
    }
  } catch (e) {
    appendOverlayLine(`Telegram WebApp init error: ${String(e)}`, '#e74c3c');
  }
}

createRoot(document.getElementById('root')!).render(
  // Временно отключаем StrictMode для стабильной работы карты
  // <StrictMode>
    <App />
  // </StrictMode>,
)
