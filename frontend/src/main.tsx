import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'
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

  // Управление включением оверлея логов через query/localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');
  if (debugParam === '1') {
    try { localStorage.setItem('debug_overlay', '1'); } catch {}
  }
  const isDebugOverlayEnabled = (() => {
    try { return localStorage.getItem('debug_overlay') === '1' || debugParam === '1'; } catch { return debugParam === '1'; }
  })();

  // Перехватываем console методы для отображения в оверлее при включенном режиме
  if (isDebugOverlayEnabled) {
    (['log', 'error', 'warn'] as const).forEach((level) => {
      const original = console[level];
      console[level] = (...args: unknown[]) => {
        try {
          const color = level === 'error' ? '#ff6b6b' : level === 'warn' ? '#f1c40f' : '#ffffff';
          const text = args.map(a => {
            if (typeof a === 'string') return a;
            try { return JSON.stringify(a); } catch { return String(a); }
          }).join(' ');
          appendOverlayLine(`${level.toUpperCase()}: ${text}`, color);
        } catch {}
        try { original.apply(console, args as any); } catch {}
      };
    });
    // Глобальные утилиты для управления
    (window as any).__DEBUG_OVERLAY_TOGGLE__ = () => {
      try {
        const val = localStorage.getItem('debug_overlay') === '1' ? '0' : '1';
        localStorage.setItem('debug_overlay', val);
        location.reload();
      } catch {}
    };
  }

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
      // Диагностика возможных гонок данных
      try {
        const initDataLen = typeof tg.initData === 'string' ? tg.initData.length : 0;
        const userId = tg.initDataUnsafe?.user?.id ?? null;
        const themeParams = tg.themeParams ?? {};
        console.log('TG initData length:', initDataLen);
        console.log('TG user id:', userId);
        console.log('TG theme params:', themeParams);
      } catch (logErr) {
        console.warn('TG initData log error:', logErr);
      }
    } else {
      appendOverlayLine('Telegram WebApp: недоступен (работаем как обычный браузер)', '#f1c40f');
    }
  } catch (e) {
    appendOverlayLine(`Telegram WebApp init error: ${String(e)}`, '#e74c3c');
  }
}

try {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('#root not found');
  }
  createRoot(rootEl).render(
    // Временно отключаем StrictMode для стабильной работы карты
    // <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    // </StrictMode>,
  );
  if (typeof window !== 'undefined') {
    // Сообщим в оверлей об успешном старте React
    try {
      const dbg = (window as any).Telegram?.WebApp ? ' (внутри Telegram WebView)' : '';
      (window as any).requestAnimationFrame?.(() => {
        const overlay = document.getElementById('tg-debug-overlay') as HTMLPreElement | null;
        if (overlay) overlay.textContent += `\n[${new Date().toISOString()}] React: render ok${dbg}`;
      });
    } catch {}
  }
} catch (e) {
  // Покажем ошибку рендера в оверлее и консоли
  try {
    const text = `React render error: ${String(e)}`;
    // eslint-disable-next-line no-console
    console.error(text);
    const overlay = document.getElementById('tg-debug-overlay') as HTMLPreElement | null;
    if (overlay) overlay.textContent += `\n[${new Date().toISOString()}] ${text}`;
  } catch {}
}
