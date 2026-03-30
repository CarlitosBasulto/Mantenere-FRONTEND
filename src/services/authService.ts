import api from "./api";

// Iniciar sesión
export const loginUser = async (email: string, password: string) => {
    const res = await api.post(`/login`, { email, password });
    return res.data; // { token, user: { id, name, email, role } }
};

// Registrar cliente (suponiendo que haya un endpoint, o puedes probar crear uno más tarde)
export const registerUser = async (data: any) => {
    // Laravel por defecto en tu api no tiene /register expuesto, 
    // pero si usas UserController@store sería /users
    const res = await api.post(`/users`, data);
    return res.data;
};

// Cerrar sesión
export const logoutUser = async () => {
    const res = await api.post(`/logout`);
    return res.data;
};
