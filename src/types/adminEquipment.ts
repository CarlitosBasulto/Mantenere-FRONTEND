// Shared types for admin equipment management

export interface AdminEquipment {
    id: number;
    nombre: string;
    marca: string;
    modelo: string;
    serie?: string;
    anioFabricacion?: string;
    anioUso?: string;
    foto?: string;
    fotoPlaca?: string;
    categoria_id?: number | null;
    categoria?: { id: number; nombre: string } | null;
    sucursalId: number;
    sucursalNombre: string;
    areaId: number;
    areaNombre: string;
    categoriaNombre: string;
}
