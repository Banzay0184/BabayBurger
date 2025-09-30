import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        client: 'client.html',
        cashier: 'cashier.html',
        operator: 'operator.html'
      },
      output: {
        // Убеждаемся, что JS файлы имеют правильные расширения
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Копируем PWA файлы в build
    copyPublicDir: true,
    assetsInlineLimit: 0, // Не инлайним ассеты для PWA
    // Убеждаемся, что модули правильно обрабатываются
    modulePreload: {
      polyfill: false
    },
    // Настройки для правильной обработки модулей
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true
  },
  // Настройки для PWA
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'https://api.babayfood.uz/', 
        changeOrigin: true,
        secure: false,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
        // Настраиваем rewrite для правильной обработки admin-panel маршрутов
        configure: (proxy) => {
          proxy.on('proxyReq', () => {
            // Прокси-запросы обрабатываются автоматически
          });
        }
      },
      '/media': {
        target: 'https://api.babayfood.uz/',
        changeOrigin: true,
        secure: false,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      }
    }
  }
})
