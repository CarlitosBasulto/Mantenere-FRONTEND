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
// Usamos FormData si vamos a enviar archivos físicos de imágenes
export const createReporte = async (data: FormData): Promise<Reporte> => {
    const response = await api.post('/reportes', data, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
    return response.data.data; // Suponiendo que el backend retorna { message: "...", data: {...} }
};
