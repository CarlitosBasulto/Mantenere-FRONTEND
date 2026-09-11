import api from "./api";

export interface DatosBancarios {
    banco: string;
    titular?: string;
    beneficiario?: string;
    clabe: string;
    cuenta?: string;
    numero_cuenta?: string;
    monto_suscripcion?: number;
    monto_sugerido?: number;
    moneda?: string;
    concepto_referencia?: string;
    instrucciones: string[] | string;
}

export interface PagoProveedor {
    id: number;
    user_id: number;
    trabajador_id?: number;
    nombre_empresa: string;
    telefono: string;
    monto: number;
    banco_origen?: string;
    referencia?: string;
    folio_referencia?: string;
    fecha_transferencia?: string;
    comprobante_url?: string;
    notas?: string;
    estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
    motivo_rechazo?: string;
    aprobado_por?: number;
    revisado_por?: number;
    fecha_revision?: string;
    aprobado_at?: string;
    created_at: string;
    // Campos prueba gratis
    es_prueba_gratis?: boolean;
    dias_prueba?: number;
    prueba_inicio_at?: string;
    prueba_fin_at?: string;
    user?: {
        id: number;
        name: string;
        email: string;
        telefono?: string;
        foto_perfil?: string;
    };
    revisadoPor?: {
        id: number;
        name: string;
    };
    trabajador?: {
        id: number;
        nombre: string;
        puesto?: string;
        estado?: string;
    };
}

export interface PruebaGratisInfo {
    es_prueba_gratis: boolean;
    dias_totales: number;
    prueba_inicio_at?: string;
    prueba_fin_at?: string;
    ha_expirado: boolean;
    dias_restantes: number;
    meses_restantes: number;
    tiempo_restante_texto: string;
}

export interface EstadoPagoResponse {
    es_proveedor: boolean;
    ultimo_pago: PagoProveedor | null;
    pago?: PagoProveedor | null; // Compatibilidad hacia atrás
    prueba_info: PruebaGratisInfo | null;
}

export interface ProveedorRed {
    id: number;
    user_id?: number;
    nombre: string;
    correo?: string;
    telefono?: string;
    puesto?: string;
    avatar?: string;
    estado?: string;
    es_proveedor: boolean;
    cuadrilla_total: number;
    tipo_origen: 'RED';
}

// 1. Obtener datos bancarios oficiales para transferencia
export const getDatosBancariosMantenere = async (): Promise<DatosBancarios> => {
    const res = await api.get('/pagos-proveedor/datos-bancarios');
    return res.data;
};

// 2. Solicitar Prueba Gratuita (6 Meses)
export const solicitarPruebaGratis = async (data: {
    nombre_empresa: string;
    telefono: string;
    notas?: string;
}): Promise<{ message: string; pago: PagoProveedor }> => {
    const res = await api.post('/pagos-proveedor/solicitar-prueba', data);
    return res.data;
};

// 3. Enviar comprobante de transferencia y registrar pago
export const registrarPagoTransferencia = async (formData: FormData): Promise<{ message: string; pago: PagoProveedor }> => {
    const res = await api.post('/pagos-proveedor/registrar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return res.data;
};

// 4. Consultar mi estado de pago / prueba como técnico
export const getMiEstadoPago = async (): Promise<EstadoPagoResponse> => {
    const res = await api.get('/pagos-proveedor/mi-estado');
    const data = res.data;
    const ultimo = data.ultimo_pago || data.pago || null;
    return {
        es_proveedor: Boolean(data.es_proveedor),
        ultimo_pago: ultimo,
        pago: ultimo,
        prueba_info: data.prueba_info || null,
    };
};

// 5. Listar pagos para el Administrador General
export const getPagosAdmin = async (estado?: string, tipo?: 'prueba' | 'pago'): Promise<PagoProveedor[]> => {
    const params: Record<string, string> = {};
    if (estado && estado !== 'Todos') params.estado = estado;
    if (tipo) params.tipo = tipo;

    const res = await api.get('/admin/pagos-proveedor', { params });
    if (res.data && Array.isArray(res.data.data)) {
        return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
};

// 6. Ver detalle de un pago
export const getPagoAdminDetail = async (id: number): Promise<PagoProveedor> => {
    const res = await api.get(`/admin/pagos-proveedor/${id}`);
    return res.data;
};

// 7. Aprobar pago o prueba gratis y activar rol Pro-Veedor
export const aprobarPagoAdmin = async (id: number): Promise<any> => {
    const res = await api.put(`/admin/pagos-proveedor/${id}/aprobar`);
    return res.data;
};

// 8. Rechazar pago o prueba gratis especificando motivo
export const rechazarPagoAdmin = async (id: number, motivo: string): Promise<any> => {
    const res = await api.put(`/admin/pagos-proveedor/${id}/rechazar`, { motivo });
    return res.data;
};

// 9. Obtener Técnicos Pro-Veedores de la RED (para Admin General, Admin Base y Autónomo Dueño)
export const getProveedoresRed = async (): Promise<ProveedorRed[]> => {
    try {
        const res = await api.get('/admin/proveedores-red');
        return res.data;
    } catch (e) {
        try {
            const res2 = await api.get('/base/proveedores-red');
            return res2.data;
        } catch (err) {
            const res3 = await api.get('/autonomo/proveedores-red');
            return res3.data;
        }
    }
};
