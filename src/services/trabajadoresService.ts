import api from "./api";

// Obtener un trabajador por ID
export const getTrabajador = async (id: number) => {
    const res = await api.get(`/trabajadores/${id}`);
    return res.data;
};

// Obtener todos los trabajadores
export const getTrabajadores = async () => {
    const res = await api.get(`/trabajadores`);
    return res.data;
};

// Crear un trabajador
export const createTrabajador = async (data: any) => {
    const res = await api.post(`/trabajadores`, data);
    return res.data;
};

// Cambiar el estado de un trabajador
export const toggleEstado = async (id: number) => {
    const res = await api.patch(`/trabajadores/${id}/estado`);
    return res.data;
};