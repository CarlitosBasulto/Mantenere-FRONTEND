import api from './api';

export interface Actividad {
    id?: number;
    trabajo_id: number;
    tipo: string;
    descripcion: string;
    equipo?: {
        id?: number;
        tipo?: string;
        marca?: string;
        modelo?: string;
        piezas?: number;
        garantia?: string;
    };
    cotizacion_sugerida?: {
        id?: number;
        monto: number;
        detalles?: string;
    };
    cotizacion?: any; // Para la relación que regresa el backend
    refacciones?: {
        id?: number;
        pieza: string;
        cantidad: number;
        costo_estimado?: number;
        levantamiento_equipo_id?: number | null;
    }[];
    created_at?: string;
    updated_at?: string;
}

export const createActividad = async (actividad: Actividad): Promise<Actividad> => {
    const response = await api.post('/actividades', actividad);
    return response.data.actividad;
};

export const getActividadesByTrabajo = async (trabajoId: number): Promise<Actividad[]> => {
    const response = await api.get(`/trabajos/${trabajoId}/actividades`);
    return response.data;
};

export const deleteActividad = async (actividadId: number): Promise<void> => {
    await api.delete(`/actividades/${actividadId}`);
};
