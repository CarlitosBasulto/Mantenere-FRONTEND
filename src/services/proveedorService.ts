import api from "./api";

// 📝 Enviar solicitud de upgrade a Técnico Proveedor
export const solicitarProveedor = async (formData: FormData) => {
    const res = await api.post('/tecnico/solicitar-proveedor', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return res.data;
};

// 🔍 Obtener mi solicitud actual como técnico
export const getMiSolicitudProveedor = async () => {
    const res = await api.get('/tecnico/mi-solicitud-proveedor');
    return res.data;
};

// 📋 Obtener todas las solicitudes (Admin Normal)
export const getSolicitudesProveedor = async () => {
    const res = await api.get('/admin/solicitudes-proveedor');
    return res.data;
};

// 🔍 Ver detalles de una solicitud
export const getSolicitudProveedorDetail = async (id: number) => {
    const res = await api.get(`/admin/solicitudes-proveedor/${id}`);
    return res.data;
};

// ✅ Aprobar solicitud (Admin Normal)
export const aprobarSolicitudProveedor = async (id: number) => {
    const res = await api.put(`/admin/solicitudes-proveedor/${id}/aprobar`);
    return res.data;
};

// ❌ Rechazar solicitud (Admin Normal)
export const rechazarSolicitudProveedor = async (id: number, motivo?: string) => {
    const res = await api.put(`/admin/solicitudes-proveedor/${id}/rechazar`, { motivo });
    return res.data;
};
