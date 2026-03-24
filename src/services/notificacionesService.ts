import api from './api';

export interface Notificacion {
    id: number;
    user_id: number;
    mensaje: string;
    leido: boolean;
    created_at: string;
    updated_at: string;
}

// 📌 Obtener todas las notificaciones de un usuario
export const getNotificacionesUsuario = async (userId: number): Promise<Notificacion[]> => {
    const response = await api.get(`/notificaciones/usuario/${userId}`);
    return response.data;
};

// 📌 Crear una nueva notificación (Opcional desde frontend, útil para reportar cosas rápidas)
export const createNotificacion = async (userId: number, mensaje: string): Promise<Notificacion> => {
    const response = await api.post('/notificaciones', { user_id: userId, mensaje });
    return response.data.data;
};

// 📌 Marcar una notificación individual como leída
export const markNotificacionAsRead = async (notificacionId: number): Promise<Notificacion> => {
    const response = await api.put(`/notificaciones/${notificacionId}/leer`);
    return response.data.data;
};

// 📌 Marcar todas las notificaciones del usuario como leídas (Útil para la campanita del Menu)
export const markAllNotificacionesAsRead = async (userId: number): Promise<void> => {
    await api.put(`/notificaciones/usuario/${userId}/leer-todas`);
};
