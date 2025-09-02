import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        operator: 'operator.html'
      }
    }
  },
  server: {
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
