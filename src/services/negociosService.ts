import api from "./api";

export interface Negocio {
    id: number;
    nombre: string;
    tipo: "FC" | "FS" | "MALL" | "W/M";
    encargado?: string;
    // Ubicación Estándar
    nombrePlaza?: string;
    estado?: string;
    ciudad?: string;
    calle?: string;
    numero?: string;
    colonia?: string;
    cp?: string;
    // Campos FS
    referencia?: string;
    // Campos W/M
    manzana?: string;
    lote?: string;
    calleAv?: string;
    // Contacto
    telefono?: string;
    correo?: string;
    // Imagen
    imagenPerfil?: string;
    // Estatus Admin
    estado_aprobacion?: string;
}

export const getNegocios = async (): Promise<Negocio[]> => {
    const response = await api.get('/negocios');
    return response.data;
};

export const getNegocio = async (id: number): Promise<Negocio> => {
    const response = await api.get(`/negocios/${id}`);
    return response.data;
};

export const createNegocio = async (data: Partial<Negocio>): Promise<Negocio> => {
    const response = await api.post('/negocios', data);
    return response.data.data;
};

export const updateNegocio = async (id: number, data: Partial<Negocio>): Promise<Negocio> => {
    const response = await api.put(`/negocios/${id}`, data);
    return response.data.data;
};
