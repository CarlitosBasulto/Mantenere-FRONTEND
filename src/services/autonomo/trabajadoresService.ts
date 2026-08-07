import api from "../api";

// Obtener un trabajador por ID
export const getTrabajador = async (id: number) => {
    const res = await api.get(`/autonomo/trabajadores/${id}`);
    return res.data;
};

// Obtener todos los trabajadores
export const getTrabajadores = async () => {
    const res = await api.get(`/autonomo/trabajadores`);
    return res.data;
};

// Crear un trabajador
export const createTrabajador = async (data: any) => {
    const res = await api.post(`/autonomo/trabajadores`, data);
    return res.data;
};

// Cambiar el estado de un trabajador
export const toggleEstado = async (id: number) => {
    const res = await api.patch(`/autonomo/trabajadores/${id}/estado`);
    return res.data;
};

// Actualizar perfil de un trabajador
export const updateTrabajador = async (id: number, data: any) => {
    const res = await api.put(`/autonomo/trabajadores/${id}`, data);
    return res.data;
};
