import api from './api';

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
    const response = await api.get(`/notificaciones/usuario/${userId}`);
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
    const response = await api.post(`/notificaciones`, data);
    return response.data;
};

/**
 * Marcar una notificación como leída
 */
export const markNotificacionAsRead = async (id: number) => {
    const response = await api.put(`/notificaciones/${id}/leer`);
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
    const response = await api.post(`/notificaciones/rol`, data);
    return response.data;
};

/**
 * Marcar TODAS las notificaciones de un usuario como leídas
 */
export const markAllNotificacionesAsRead = async (userId: number) => {
    const response = await api.put(`/notificaciones/usuario/${userId}/leer-todas`);
    return response.data;
};

/**
 * Notificar a todos los administradores de un ecosistema (admin-autonomo y gerente-general)
 */
export const createNotificacionEcosistema = async (data: {
    admin_autonomo_id: number;
    titulo: string;
    mensaje: string;
    enlace?: string;
}) => {
    const response = await api.post(`/notificaciones/ecosistema`, data);
    return response.data;
};

/**
 * Notificar a todos los usuarios que pertenecen a un negocio_id (p.ej. los encargados de una sucursal)
 */
export const createNotificacionNegocio = async (data: {
    negocio_id: number;
    titulo: string;
    mensaje: string;
    enlace?: string;
}) => {
    const response = await api.post(`/notificaciones/negocio`, data);
    return response.data;
};

