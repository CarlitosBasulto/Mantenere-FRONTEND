import api from "./api";

// Obtener todos los trabajos (solicitudes)
export const getTrabajos = async () => {
    const res = await api.get(`/trabajos`);
    return res.data;
};

// Obtener un trabajo por ID
export const getTrabajo = async (id: number) => {
    const res = await api.get(`/trabajos/${id}`);
    return res.data;
};

// Crear un nuevo trabajo
export const createTrabajo = async (data: any) => {
    const res = await api.post(`/trabajos`, data);
    return res.data;
};

export const updateEstadoTrabajo = async (id: number, data: { estado: string }) => {
    const res = await api.put(`/trabajos/${id}/estado`, data);
    return res.data;
};

export const assignTrabajador = async (trabajoId: number, trabajadorId: number) => {
    const res = await api.put(`/trabajos/${trabajoId}/asignar`, { trabajador_id: trabajadorId });
    return res.data;
};
