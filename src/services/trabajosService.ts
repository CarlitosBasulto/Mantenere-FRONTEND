import api from "./api";

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

// Obtener todos los trabajos (solicitudes)
export const getTrabajos = async () => {
    const res = await api.get(`/trabajos`);
    return fixUrls(res.data);
};

// Obtener un trabajo por ID
export const getTrabajo = async (id: number) => {
    const res = await api.get(`/trabajos/${id}`);
    return fixUrls(res.data);
};

// Crear un nuevo trabajo
export const createTrabajo = async (data: any) => {
    const res = await api.post(`/trabajos`, data);
    return res.data;
};

export const updateEstadoTrabajo = async (id: number, data: { estado: string; visitado?: boolean }) => {
    const res = await api.put(`/trabajos/${id}/estado`, data);
    return res.data;
};

export const assignTrabajador = async (trabajoId: number, trabajadorId: number) => {
    const res = await api.put(`/trabajos/${trabajoId}/asignar`, { trabajador_id: trabajadorId });
    return res.data;
};

// Actualizar un trabajo
export const updateTrabajo = async (id: number, data: any) => {
    const res = await api.put(`/trabajos/${id}`, data);
    return res.data;
};

// Actualizar un trabajo (PATCH para actualizaciones parciales)
export const updateTrabajoPatch = async (id: number, data: any) => {
    const res = await api.patch(`/trabajos/${id}`, data);
    return res.data;
};
// Eliminar un trabajo
export const deleteTrabajo = async (id: number) => {
    const res = await api.delete(`/trabajos/${id}`);
    return res.data;
};
