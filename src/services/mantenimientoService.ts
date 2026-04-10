import api from './api';

export const createMantenimientoSolicitud = async (data: {
    cliente_id: number;
    negocio_id: number;
    levantamiento_equipo_id: number | string;
    descripcion_problema: string;
}) => {
    try {
        const response = await api.post('/mantenimiento-solicitudes', data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getMantenimientoSolicitudes = async (negocio_id?: number) => {
    try {
        const url = negocio_id ? `/mantenimiento-solicitudes?negocio_id=${negocio_id}` : '/mantenimiento-solicitudes';
        const response = await api.get(url);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getMantenimientoSolicitud = async (id: number | string) => {
    try {
        const response = await api.get(`/mantenimiento-solicitudes/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const asignarMantenimientoVisita = async (id: string, data: any) => {
    const res = await api.post(`/mantenimiento-solicitudes/${id}/asignar-visita`, data);
    return res.data;
};

// Asignar técnico para el trabajo final (reparación)
export const asignarMantenimientoReparacion = async (id: string, data: any) => {
    const res = await api.post(`/mantenimiento-solicitudes/${id}/asignar-reparacion`, data);
    return res.data;
};
