import api from './api';

export interface ChecklistItem {
    id?: number;
    trabajo_id?: number;
    tipo?: 'herramienta' | 'seguridad';
    nombre: string;
    checked: boolean;
    // Opcionalmente soportar 'name' también para compatibilidad local
    name?: string; 
}

export interface ChecklistPayload {
    trabajo_id: number;
    herramientas: ChecklistItem[];
    seguridad: ChecklistItem[];
}

export interface ChecklistResponse {
    herramientas: ChecklistItem[];
    seguridad: ChecklistItem[];
}

// 📌 Obtener el checklist guardado de un trabajo
export const getChecklistByTrabajoId = async (trabajoId: number): Promise<ChecklistResponse | null> => {
    try {
        const response = await api.get(`/checklist/trabajo/${trabajoId}`);
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null; // Significa que no se ha guardado nada en DB aún
        }
        throw error;
    }
};

// 📌 Guardar todo el checklist (Reemplaza el viejo por el nuevo en BD)
export const saveChecklist = async (data: ChecklistPayload): Promise<void> => {
    await api.post('/checklist', data);
};
