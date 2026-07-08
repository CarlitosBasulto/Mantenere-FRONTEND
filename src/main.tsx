import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Keep-alive: ping el backend cada 9 minutos para evitar que Railway hiberne el servidor
const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://mantenere-backend-production.up.railway.app';
const keepAlive = () => fetch(`${BACKEND_URL}/ping`, { method: 'GET', cache: 'no-cache' }).catch(() => {});
keepAlive(); // ping inmediato al cargar la app
setInterval(keepAlive, 9 * 60 * 1000); // ping cada 9 minutos

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
