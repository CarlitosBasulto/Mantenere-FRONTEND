import api from "../api";

export const getAutonomoUsers = async () => {
    const res = await api.get(`/autonomo/usuarios`);
    return res.data;
};

export const createAutonomoUser = async (data: any) => {
    const res = await api.post(`/autonomo/usuarios`, data);
    return res.data;
};

export const updateAutonomoUser = async (id: number, data: any) => {
    const res = await api.put(`/autonomo/usuarios/${id}`, data);
    return res.data;
};

export const getAutonomoUserById = async (id: number) => {
    const res = await api.get(`/autonomo/usuarios/${id}`);
    return res.data;
};

export const deleteAutonomoUser = async (id: number) => {
    const res = await api.delete(`/autonomo/usuarios/${id}`);
    return res.data;
};
