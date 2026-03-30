import api from "./api";

// Obtener todos los negocios
export const getNegocios = async () => {
    const res = await api.get(`/negocios`);
    return res.data;
};

// Obtener un negocio por ID
export const getNegocio = async (id: number) => {
    const res = await api.get(`/negocios/${id}`);
    return res.data;
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
