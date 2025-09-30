import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './utils/tronWebFix' // Предотвращаем конфликты с TronWeb

// ULTRA SAFE режим: минимальная инициализация (включается параметром ?safe=2)
const __isBrowser = typeof window !== 'undefined'
const __ULTRA_SAFE__ = __isBrowser ? new URLSearchParams(window.location.search).get('safe') === '2' : false

if (__ULTRA_SAFE__) {
  const showFallbackError = (msg: string) => {
    try {
      const el = document.createElement('pre')
      el.style.color = 'red'
      el.style.background = '#000'
      el.style.position = 'fixed'
      el.style.left = '0'
      el.style.right = '0'
      el.style.bottom = '0'
      el.style.maxHeight = '50vh'
      el.style.overflow = 'auto'
      el.style.padding = '8px'
      el.style.margin = '0'
      el.style.fontSize = '12px'
      el.style.zIndex = '2147483647'
      el.textContent = msg
      document.body.appendChild(el)
    } catch {}
  }

  const safeInitTelegram = () => {
    try {
      const tg = (window as any).Telegram?.WebApp
      if (!tg) {
        // eslint-disable-next-line no-console
        console.warn('❌ Telegram.WebApp не найден')
        return
      }
      if (!(tg as any)._isReady) {
        tg.ready?.()
        ;(tg as any)._isReady = true
        // eslint-disable-next-line no-console
        console.log('✅ Telegram WebApp готов (ULTRA SAFE)')
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Ошибка init WebApp (ULTRA SAFE):', err)
      showFallbackError('Ошибка init WebApp: ' + String(err))
    }
  }

  try {
    safeInitTelegram()
    const rootEl = document.getElementById('root')
    if (rootEl) {
      try { rootEl.innerHTML = '' } catch {}
      const root = createRoot(rootEl)
      root.render(
        // <StrictMode>
        <App />
        // </StrictMode>
      )
    } else {
      showFallbackError('❌ Root element не найден')
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Ошибка запуска React (ULTRA SAFE):', err)
    showFallbackError('Ошибка запуска React: ' + String(err))
  }
} else {

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

  // Фолбэк-экран на случай, если UI не смонтировался вовремя
  const showHardFallback = (reason: string) => {
    try {
      const existing = document.getElementById('bb-hard-fallback');
      if (existing) return;
      const wrap = document.createElement('div');
      wrap.id = 'bb-hard-fallback';
      wrap.style.position = 'fixed';
      wrap.style.inset = '0';
      wrap.style.background = '#000';
      wrap.style.color = '#fff';
      wrap.style.display = 'flex';
      wrap.style.alignItems = 'center';
      wrap.style.justifyContent = 'center';
      wrap.style.zIndex = '2147483646';
      wrap.style.textAlign = 'center';
      wrap.innerHTML = `
        <div style="max-width:600px;padding:16px;">
          <div style="font-size:16px;opacity:.8;margin-bottom:8px;">Загрузка затянулась…</div>
          <div style="font-size:13px;opacity:.6;margin-bottom:16px;">${reason}</div>
          <button id="bb-reload" style="background:#22c55e;color:#000;padding:10px 14px;border-radius:10px;border:none;font-weight:600;cursor:pointer">Перезапустить</button>
        </div>`;
      document.body.appendChild(wrap);
      document.getElementById('bb-reload')?.addEventListener('click', () => {
        try {
          const url = new URL(location.href);
          if (!(window as any).__SAFE_MODE__) {
            url.searchParams.set('safe', '2');
          }
          location.replace(url.toString());
        } catch {
          location.reload();
        }
      });
    } catch {}
  };

  // Режим безопасного запуска: можно включить ?safe=1 для отключения агрессивных оптимизаций
  const urlParamsGlobal = new URLSearchParams(window.location.search);
  const SAFE_MODE = urlParamsGlobal.get('safe') === '1';
  if (SAFE_MODE) {
    appendOverlayLine('SAFE MODE: включён (минимальные изменения среды)', '#00d1b2');
    (window as any).__SAFE_MODE__ = true;
  }

  // Идемпотентная инициализация debug-overlay и console-перехватов
  if (!(window as any).__DEBUG_OVERLAY_INIT__) {
    (window as any).__DEBUG_OVERLAY_INIT__ = true;

    // Управление включением оверлея логов через query/localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug');
    if (debugParam === '1') {
      try { localStorage.setItem('debug_overlay', '1'); } catch {}
    }
    const isDebugOverlayEnabled = (() => {
      try { return localStorage.getItem('debug_overlay') === '1' || debugParam === '1'; } catch { return debugParam === '1'; }
    })();

    if (isDebugOverlayEnabled && !SAFE_MODE) {
      const originalConsole: Record<string, any> = (window as any).__ORIG_CONSOLE__ || {};
      (['log', 'error', 'warn'] as const).forEach((level) => {
        if (!(console as any)[level]?.__wrapped) {
          originalConsole[level] = originalConsole[level] || console[level];
          const original = originalConsole[level];
          const wrapped = (...args: unknown[]) => {
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
          (wrapped as any).__wrapped = true;
          (console as any)[level] = wrapped;
        }
      });
      (window as any).__ORIG_CONSOLE__ = originalConsole;

      // Глобальная утилита
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
      // Вызываем ready() только один раз на жизненный цикл webview
      if (!(tg as any).__readyCalled) {
        tg.ready?.();
        (tg as any).__readyCalled = true;
      }
      if (!SAFE_MODE) tg.expand?.();
      // Необязательно, но помогает избежать неожиданных закрытий
      if (!SAFE_MODE) {
        if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes();
        if (typeof tg.disableClosingConfirmation === 'function') tg.disableClosingConfirmation?.();
      }
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

  // Сторож рендера: если приложение не смонтировалось за 6 секунд — покажем фолбэк
  try {
    setTimeout(() => {
      if (!(window as any).__APP_MOUNTED__) {
        showHardFallback('Приложение не успело запуститься. Попробуйте перезапустить.');
      }
    }, 6000);
  } catch {}

  // Ретрай при возврате во вкладку, если всё ещё не смонтировано
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !(window as any).__APP_MOUNTED__) {
        try {
          const url = new URL(location.href);
          url.searchParams.set('safe', '2');
          location.replace(url.toString());
        } catch {
          location.reload();
        }
      }
    });
  } catch {}
}
}

try {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('#root not found');
  }
  // Идемпотентно сбросим контейнер и предыдущий React root (кроме SAFE MODE)
  if (!(window as any).__SAFE_MODE__) {
    try { (window as any).__REACT_ROOT__?.unmount?.(); } catch {}
    try { rootEl.innerHTML = ''; } catch {}
  }

  const reactRoot = createRoot(rootEl);
  (window as any).__REACT_ROOT__ = reactRoot;

  reactRoot.render(
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
      (window as any).__APP_MOUNTED__ = true;
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
