import api from "./api";

// Iniciar sesión
export const loginUser = async (email: string, password: string) => {
    const res = await api.post(`/login`, { email, password });
    return res.data; // { token, user: { id, name, email, role } }
};

// Registrar cliente
export const registerUser = async (data: any) => {
    const res = await api.post(`/register`, data);
    return res.data;
};

// Cerrar sesión
export const logoutUser = async () => {
    const res = await api.post(`/logout`);
    return res.data;
};
