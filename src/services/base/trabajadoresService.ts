import api from "../api";

// Obtener un trabajador por ID
export const getTrabajador = async (id: number) => {
    const res = await api.get(`/base/trabajadores/${id}`);
    return res.data;
};

// Obtener todos los trabajadores
export const getTrabajadores = async () => {
    const res = await api.get(`/base/trabajadores`);
    return res.data;
};

// Crear un trabajador
export const createTrabajador = async (data: any) => {
    const res = await api.post(`/base/trabajadores`, data);
    return res.data;
};

// Cambiar el estado de un trabajador
export const toggleEstado = async (id: number) => {
    const res = await api.patch(`/base/trabajadores/${id}/estado`);
    return res.data;
};

// Actualizar perfil de un trabajador
export const updateTrabajador = async (id: number, data: any) => {
    const res = await api.put(`/base/trabajadores/${id}`, data);
    return res.data;
};
