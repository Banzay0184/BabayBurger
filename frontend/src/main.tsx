import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // Временно отключаем StrictMode для стабильной работы карты
  // <StrictMode>
    <App />
  // </StrictMode>,
)
