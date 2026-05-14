import api from "./api";

// Obtener todos los usuarios (para luego filtrar por rol en el frontend si es necesario)
export const getUsers = async () => {
    const res = await api.get(`/users`);
    return res.data;
};

// Crear un nuevo usuario
export const createUser = async (data: any) => {
    // Para Técnicos/Trabajadores usaremos role_id: 3 según tu DB
    const res = await api.post(`/users`, data);
    return res.data;
};

// Actualizar un usuario existente
export const updateUser = async (id: number, data: any) => {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
};

// Obtener un usuario específico por ID
export const getUserById = async (id: number) => {
    const res = await api.get(`/users/${id}`);
    return res.data;
};

// Eliminar un usuario (o dar de baja)
export const deleteUser = async (id: number) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
};

// Asignar / actualizar encargado de una sucursal (crea el usuario y envía el correo)
export const asignarEncargadoSucursal = async (negocioId: number, data: {
    name: string;
    email: string;
    password: string;
}) => {
    const res = await api.post(`/negocios/${negocioId}/encargado`, data);
    return res.data;
};

// Obtener el encargado actual asignado a una sucursal
export const getEncargadoSucursal = async (negocioId: number) => {
    const res = await api.get(`/negocios/${negocioId}/encargado`);
    return res.data;
};
