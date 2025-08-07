/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Современная чёрно-белая палитра
        'primary': '#ffffff',
        'secondary': '#000000',
        'accent': '#1a1a1a',
        'light-gray': '#111111',
        'dark-gray': '#000000',
        'border-gray': '#333333',
        'text-primary': '#ffffff',
        'text-secondary': '#cccccc',
        'text-light': '#999999',
        'bg-primary': '#000000',
        'bg-secondary': '#111111',
        'bg-dark': '#000000',
        'bg-card': '#1a1a1a',
        'shadow-light': 'rgba(255, 255, 255, 0.1)',
        'shadow-dark': 'rgba(0, 0, 0, 0.5)',
        'success': '#00ff00',
        'error': '#ff4444',
        'warning': '#ffaa00',
      },
      fontFamily: {
        'telegram': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.3)',
        'button': '0 2px 8px rgba(0, 0, 0, 0.2)',
        'glow': '0 0 20px rgba(255, 255, 255, 0.1)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
} 