// Grupos de roles por ecosistema
export const BASE_ROLES = ['root', 'admin', 'cliente', 'tecnico-normal', 'tecnico-proveedor', 'tecnico-cuadrilla'];
export const AUTONOMO_ROLES = [
  'autonomo', 
  'propietario-autonomo',
  'admin-autonomo',
  'administrador-general',
  'gerente-general',
  'gerente-sucursal', 
  'tecnico-autonomo'
];

export type AnyRole = string | null | undefined;

export const isBaseRole = (role?: AnyRole) => BASE_ROLES.includes(normalizeRole(role));
export const isAutonomoRole = (role?: AnyRole) => {
  const norm = normalizeRole(role);
  return norm === 'autonomo' || norm === 'propietario-autonomo' || norm === 'administrador-general' || norm === 'gerente-sucursal' || norm === 'tecnico-autonomo';
};

export const isAutonomoAdmin = (role?: AnyRole): boolean => {
  const norm = normalizeRole(role);
  return norm === 'autonomo' || norm === 'propietario-autonomo' || norm === 'administrador-general';
};

// Nombres viejos que vienen del backend (mientras migran)
export const normalizeRole = (role?: AnyRole): string => {
  if (!role) return '';
  const map: Record<string, string> = {
    'admin-autonomo': 'propietario-autonomo',
    'gerente-general': 'administrador-general',
    'encargado': 'gerente-sucursal',
    'Trabajador': 'tecnico-normal',
    'tecnico': 'tecnico-normal',
  };
  return map[role] ?? role ?? '';
};
