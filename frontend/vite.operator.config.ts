import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Конфигурация Vite для операторского интерфейса
export default defineConfig({
  plugins: [react()],
  base: "/",
  root: ".",
  build: {
    outDir: 'dist-operator',
    rollupOptions: {
      input: {
        operator: 'operator.html'
      }
    }
  },
  server: {
    port: 5174,
    open: '/operator.html',
    proxy: {
      '/api': {
        target: 'https://3e3f35c1758a.ngrok-free.app', 
        changeOrigin: true,
        secure: false,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/media': {
        target: 'https://3e3f35c1758a.ngrok-free.app',
        changeOrigin: true,
        secure: false,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      }
    }
  }
})
