import api from './api';

export interface Actividad {
    id?: number;
    trabajo_id: number;
    tipo: string;
    descripcion: string;
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
