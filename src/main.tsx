import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Keep-alive: ping el backend cada 9 minutos solo en producción (evita que Railway hiberne el servidor)
if (import.meta.env.PROD) {
  const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://mantenere-backend-production.up.railway.app';
  const keepAlive = () => fetch(`${BACKEND_URL}/ping`, { method: 'GET', cache: 'no-cache' }).catch(() => {});
  keepAlive(); // ping inmediato al cargar la app en producción
  setInterval(keepAlive, 9 * 60 * 1000); // ping cada 9 minutos
}

createRoot(document.getElementById('root')!).render(
  <App />
)
