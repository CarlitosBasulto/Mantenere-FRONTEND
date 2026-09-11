import api from "./api";

export interface MiembroCuadrilla {
    id: number;
    nombre: string;
    telefono?: string;
    puesto?: string;
    estado?: string;
    avatar?: string;
    proveedor_id?: number;
    creador_id?: number;
    created_at?: string;
}

export interface TrabajoRed {
    id: number;
    titulo: string;
    descripcion?: string;
    estado: string;
    tipo?: string;
    prioridad?: string;
    fecha_programada?: string;
    hora_llegada?: string;
    negocio_id?: number;
    trabajador_id?: number;
    cotizacion?: number;
    created_at?: string;
    negocio?: {
        id: number;
        nombre: string;
        calle?: string;
        colonia?: string;
        nombrePlaza?: string;
    };
    trabajador?: {
        id: number;
        nombre: string;
        puesto?: string;
    };
    cotizaciones?: any[];
}

// 1. Obtener los técnicos de la cuadrilla del Pro-Veedor
export const getMiCuadrilla = async (): Promise<MiembroCuadrilla[]> => {
    const res = await api.get('/proveedor/cuadrilla');
    return res.data;
};

// 2. Crear un nuevo técnico en la cuadrilla
export const crearTecnicoCuadrilla = async (formData: FormData): Promise<{ message: string; tecnico: MiembroCuadrilla }> => {
    const res = await api.post('/proveedor/cuadrilla', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return res.data;
};

// 3. Actualizar datos de un técnico de la cuadrilla
export const actualizarTecnicoCuadrilla = async (id: number, formData: FormData): Promise<{ message: string; tecnico: MiembroCuadrilla }> => {
    const res = await api.post(`/proveedor/cuadrilla/${id}?_method=PUT`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return res.data;
};

// 4. Eliminar un técnico de la cuadrilla
export const eliminarTecnicoCuadrilla = async (id: number): Promise<{ message: string }> => {
    const res = await api.delete(`/proveedor/cuadrilla/${id}`);
    return res.data;
};

// 5. Obtener los trabajos asignados desde la RED
export const getTrabajosRedProVeedor = async (): Promise<TrabajoRed[]> => {
    const res = await api.get('/proveedor/trabajos-red');
    return res.data;
};

// 6. Sub-asignar trabajo a un técnico de su cuadrilla
export const asignarTrabajoACuadrilla = async (
    trabajoId: number, 
    data: { tecnico_id: number; tipo?: string; fecha?: string; hora?: string }
): Promise<{ message: string; trabajo: TrabajoRed }> => {
    const res = await api.post(`/proveedor/trabajos-red/${trabajoId}/asignar`, data);
    return res.data;
};

// 7. Enviar cotización al Administrador General
export const enviarCotizacionProVeedorAdmin = async (
    trabajoId: number, 
    formData: FormData
): Promise<{ message: string; cotizacion: any }> => {
    const res = await api.post(`/proveedor/trabajos-red/${trabajoId}/cotizar`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return res.data;
};
