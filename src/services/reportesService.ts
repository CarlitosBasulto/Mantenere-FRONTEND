import api from "./api";

export interface ImagenReporte {
    id?: number;
    ruta: string; // O ruta donde se almacena
    reporte_id?: number;
}

export interface Reporte {
    id?: number;
    trabajo_id: number;
    descripcion: string;
    solucion: string;
    fecha?: string;
    imagenes?: ImagenReporte[];
}

// 📌 Obtener el reporte de un trabajo en específico
export const getReporteByTrabajoId = async (trabajoId: number): Promise<Reporte | null> => {
    try {
        const response = await api.get(`/reportes/trabajo/${trabajoId}`);
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return null; // No hay reporte para este trabajo aún
        }
        throw error;
    }
};

// 📌 Crear un reporte (Normalmente lo haría el Técnico)
// Ahora acepta tanto JSON (para Base64) como FormData
export const createReporte = async (data: FormData | any): Promise<Reporte> => {
    const isFormData = data instanceof FormData;
    const response = await api.post('/reportes', data, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : { "Content-Type": "application/json" }
    });
    return response.data?.data || response.data; // Suponiendo que el backend retorna { message: "...", data: {...} } o directo
};
