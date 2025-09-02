import { createRoot } from 'react-dom/client'
import './index.css'
import { OperatorApp } from './pages/operator/OperatorApp'

createRoot(document.getElementById('root')!).render(
  <OperatorApp />
)
