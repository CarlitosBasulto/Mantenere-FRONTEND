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

// Solicitar enlace de recuperación
export const forgotPassword = async (email: string) => {
    const res = await api.post(`/forgot-password`, { email });
    return res.data;
};

// Restablecer contraseña con el token
export const resetPassword = async (data: any) => {
    const res = await api.post(`/reset-password`, data);
    return res.data;
};

// Cambiar contraseña obligatoria
export const changeMandatoryPassword = async (data: any) => {
    const res = await api.post(`/auth/change-mandatory-password`, data);
    return res.data;
};
