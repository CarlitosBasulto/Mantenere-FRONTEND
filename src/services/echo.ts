import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

(window as any).Pusher = Pusher;

// ──────────────────────────────────────────────────────────────────
// Stub silencioso para cuando WebSocket no está disponible.
// Previene errores en producción sin romper el código que usa echo.
// ──────────────────────────────────────────────────────────────────
const noOpChannel: any = {
    listen:        () => noOpChannel,
    whisper:       () => noOpChannel,
    here:          () => noOpChannel,
    joining:       () => noOpChannel,
    leaving:       () => noOpChannel,
    subscribed:    () => noOpChannel,
    notification:  () => noOpChannel,
    stopListening: () => noOpChannel,
    error:         () => noOpChannel,
};

const noOpEcho: any = {
    channel:      () => noOpChannel,
    private:      () => noOpChannel,
    join:         () => noOpChannel,
    leave:        () => {},
    leaveChannel: () => {},
    disconnect:   () => {},
    connector:    { pusher: { connection: { bind: () => {}, state: 'disconnected' } } },
};

// En producción con ws:// el navegador bloquea la conexión (mixed content).
// Solo conectamos WebSocket si la página y el socket usan el mismo protocolo.
const reverbScheme  = import.meta.env.VITE_REVERB_SCHEME ?? 'http';
const pageIsHttps   = typeof window !== 'undefined' && window.location.protocol === 'https:';
const wouldFail     = pageIsHttps && reverbScheme !== 'https';

export const echo: typeof noOpEcho = wouldFail
    ? noOpEcho
    : new Echo({
        broadcaster: 'reverb',
        key:         import.meta.env.VITE_REVERB_APP_KEY || 'mantenere-app-key',
        wsHost:      import.meta.env.VITE_REVERB_HOST  || window.location.hostname,
        wsPort:      import.meta.env.VITE_REVERB_PORT  ? parseInt(import.meta.env.VITE_REVERB_PORT)  : 8080,
        wssPort:     import.meta.env.VITE_REVERB_PORT  ? parseInt(import.meta.env.VITE_REVERB_PORT)  : 8080,
        forceTLS:    reverbScheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8085/api'}/broadcasting/auth`,
        auth: {
            headers: {
                get Authorization() {
                    const token = localStorage.getItem('token');
                    return token ? `Bearer ${token}` : '';
                }
            }
        }
    });

export default echo;

