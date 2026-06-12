import api from "./api";

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface AdminAutonomo {
    id: number;
    name: string;
    email: string;
    active: number;
    stats?: {
        negocios: number;
        tecnicos: number;
        trabajos: number;
    };
}

export interface AdminAutonomoDashboard {
    admin: AdminAutonomo;
    stats: { negocios: number; tecnicos: number; trabajos: number };
    trabajos_por_estado: { estado: string; total: number }[];
}

// ── Crear Admin Autónomo desde el panel de Usuarios ────────────────────────
export const createAdminAutonomo = async (data: {
    name: string;
    email: string;
    password: string;
    role_id: number;
}) => {
    const res = await api.post("/users", data);
    return res.data;
};

// ── Obtener lista de Admin Autónomos (solo Admin principal) ─────────────────
export const getAdminAutonomos = async (): Promise<AdminAutonomo[]> => {
    const res = await api.get("/admin-autonomo");
    return res.data;
};

// ── Dashboard/stats de un Admin Autónomo ───────────────────────────────────
export const getAdminAutonomoDashboard = async (id: number): Promise<AdminAutonomoDashboard> => {
    const res = await api.get(`/admin-autonomo/${id}/dashboard`);
    return res.data;
};

// ── Sus negocios ───────────────────────────────────────────────────────────
export const getAdminAutonomoNegocios = async (id: number) => {
    const res = await api.get(`/admin-autonomo/${id}/negocios`);
    return res.data;
};

// ── Sus técnicos ───────────────────────────────────────────────────────────
export const getAdminAutonomoTrabajadores = async (id: number) => {
    const res = await api.get(`/admin-autonomo/${id}/trabajadores`);
    return res.data;
};

// ── Sus trabajos ───────────────────────────────────────────────────────────
export const getAdminAutonomoTrabajos = async (id: number) => {
    const res = await api.get(`/admin-autonomo/${id}/trabajos`);
    return res.data;
};

// ── Sus cotizaciones ───────────────────────────────────────────────────────
export const getAdminAutonomoCotizaciones = async (id: number) => {
    const res = await api.get(`/admin-autonomo/${id}/cotizaciones`);
    return res.data;
};

// ── Bloquear / Desbloquear ─────────────────────────────────────────────────
export const toggleBloqueoAdminAutonomo = async (id: number) => {
    const res = await api.put(`/admin-autonomo/${id}/bloquear`);
    return res.data;
};
