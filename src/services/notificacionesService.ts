import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8085/api';

export interface Notificacion {
    id: number;
    user_id: number;
    titulo: string;
    mensaje: string;
    enlace?: string;
    leido: boolean;
    created_at: string;
}

/**
 * Obtener notificaciones del usuario actual
 */
export const getNotificaciones = async (userId: number): Promise<Notificacion[]> => {
    const response = await axios.get(`${API_URL}/notificaciones/usuario/${userId}`);
    return response.data;
};

/**
 * Crear una nueva notificación en la BD
 */
export const createNotificacion = async (data: {
    user_id: number;
    titulo: string;
    mensaje: string;
    enlace?: string;
}) => {
    const response = await axios.post(`${API_URL}/notificaciones`, data);
    return response.data;
};

/**
 * Marcar una notificación como leída
 */
export const markNotificacionAsRead = async (id: number) => {
    const response = await axios.put(`${API_URL}/notificaciones/${id}/leer`);
    return response.data;
};

/**
 * Notificar a todos los usuarios de un ROL específico (p.ej. 'admin')
 */
export const createNotificacionByRole = async (data: {
    role: string;
    titulo: string;
    mensaje: string;
    enlace?: string;
}) => {
    const response = await axios.post(`${API_URL}/notificaciones/rol`, data);
    return response.data;
};

/**
 * Marcar TODAS las notificaciones de un usuario como leídas
 */
export const markAllNotificacionesAsRead = async (userId: number) => {
    const response = await axios.put(`${API_URL}/notificaciones/usuario/${userId}/leer-todas`);
    return response.data;
};
