import api from "./api";

export const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("foto", file);
    const response = await api.post("/upload-imagen", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    
    let url = response.data.url;
    const backendBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8085/api').replace(/\/api\/?$/, '');
    
    if (!backendBaseUrl.includes('localhost') && !backendBaseUrl.includes('127.0.0.1')) {
        url = url.replace('http://mantenere-backend', 'https://mantenere-backend');
        url = url.replace('http://127.0.0.1:8085', 'https://mantenere-backend-production.up.railway.app');
        url = url.replace('http://localhost:8085', 'https://mantenere-backend-production.up.railway.app');
    } else {
        url = url.replace('https://mantenere-backend-production.up.railway.app', backendBaseUrl);
        url = url.replace('http://mantenere-backend', backendBaseUrl);
        url = url.replace('http://localhost:8085', backendBaseUrl);
        url = url.replace('http://127.0.0.1:8085', backendBaseUrl);
    }
    
    return url;
};

// Función helper para corregir URLs en toda la respuesta
const fixUrls = (data: any) => {
    if (!data) return data;
    const backendBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8085/api').replace(/\/api\/?$/, '');
    let stringified = JSON.stringify(data);
    
    if (!backendBaseUrl.includes('localhost') && !backendBaseUrl.includes('127.0.0.1')) {
        stringified = stringified.replace(/http:\/\/mantenere-backend/g, 'https://mantenere-backend');
        stringified = stringified.replace(/http:\/\/127\.0\.0\.1:8085/g, 'https://mantenere-backend-production.up.railway.app');
        stringified = stringified.replace(/http:\/\/localhost:8085/g, 'https://mantenere-backend-production.up.railway.app');
    } else {
        stringified = stringified.replace(/https:\/\/mantenere-backend-production\.up\.railway\.app/g, backendBaseUrl);
        stringified = stringified.replace(/http:\/\/mantenere-backend/g, backendBaseUrl);
        stringified = stringified.replace(/http:\/\/localhost:8085/g, backendBaseUrl);
        stringified = stringified.replace(/http:\/\/127\.0\.0\.1:8085/g, backendBaseUrl);
    }
    return JSON.parse(stringified);
};

// Obtener todos los negocios
export const getNegocios = async () => {
    const res = await api.get(`/negocios`);
    return fixUrls(res.data);
};

// Obtener un negocio por ID
export const getNegocio = async (id: number) => {
    const res = await api.get(`/negocios/${id}`);
    return fixUrls(res.data);
};

// Crear un nuevo negocio
export const createNegocio = async (data: any) => {
    const res = await api.post(`/negocios`, data);
    return res.data;
};

// Actualizar un negocio
export const updateNegocio = async (id: number, data: any) => {
    const res = await api.put(`/negocios/${id}`, data);
    return res.data;
};

// Actualizar datos de un equipo individual (Admin)
export const updateEquipo = async (id: number, data: {
    nombre?: string;
    marca?: string;
    modelo?: string;
    serie?: string;
    anioFabricacion?: string;
    anioUso?: string;
    categoria_id?: number | null;
}) => {
    const res = await api.put(`/equipos/${id}`, data);
    return res.data;
};

// Historial de solicitudes de mantenimiento de un equipo
export const getEquipoHistorial = async (equipoId: number) => {
    const res = await api.get(`/equipos/${equipoId}/historial`);
    return fixUrls(res.data);
};
