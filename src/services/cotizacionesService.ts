import api from "./api";

export interface Cotizacion {
    id?: number;
    trabajo_id: number;
    descripcion?: string;
    monto: number;
    estado?: "Pendiente" | "Aprobada" | "Rechazada";
    archivo?: string; // Corrigiendo error TS
    created_at?: string;
    updated_at?: string;
}

// 📌 Obtener la cotización de un trabajo específico
export const getCotizacionByTrabajoId = async (trabajoId: number): Promise<Cotizacion | null> => {
    try {
        const response = await api.get(`/cotizaciones/trabajo/${trabajoId}`);
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return null; // No existe
        }
        throw error;
    }
};

// 📌 Crear o actualizar una cotización
export const saveCotizacion = async (data: Partial<Cotizacion> | FormData): Promise<Cotizacion> => {
    const isFormData = data instanceof FormData;
    const response = await api.post('/cotizaciones', data, isFormData ? {
        headers: { "Content-Type": "multipart/form-data" }
    } : {});
    return response.data.data;
};

// 📌 Actualizar el estado de la cotización (Aprobar / Rechazar)
export const updateCotizacionStatus = async (id: number, estado: "Aprobada" | "Rechazada" | "Pendiente"): Promise<Cotizacion> => {
    const response = await api.put(`/cotizaciones/${id}/estado`, { estado });
    return response.data.data;
};
