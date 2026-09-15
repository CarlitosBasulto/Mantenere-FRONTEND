// Grupos de roles por ecosistema
export const BASE_ROLES = ['root', 'admin', 'cliente', 'tecnico-normal'];
export const AUTONOMO_ROLES = [
  'autonomo', 
  'propietario-autonomo',
  'admin-autonomo',
  'administrador-general',
  'gerente-general',
  'gerente-sucursal', 
  'tecnico-autonomo'
];

export const isBaseRole = (role?: any) => BASE_ROLES.includes(normalizeRole(role));
export const isAutonomoRole = (role?: any) => {
  const norm = normalizeRole(role);
  return norm === 'autonomo' || norm === 'propietario-autonomo' || norm === 'administrador-general' || norm === 'gerente-sucursal' || norm === 'tecnico-autonomo';
};

export const isAutonomoAdmin = (role?: any): boolean => {
  const norm = normalizeRole(role);
  return norm === 'autonomo' || norm === 'propietario-autonomo' || norm === 'administrador-general';
};

export const isAutonomoPropietario = (role?: string): boolean => {
  const norm = normalizeRole(role);
  return norm === 'autonomo' || norm === 'propietario-autonomo';
};

// Nombres viejos que vienen del backend (mientras migran)
export const normalizeRole = (role?: any): string => {
  const roleStr = typeof role === 'object' && role !== null ? role.name : role;
  const map: Record<string, string> = {
    'admin-autonomo': 'propietario-autonomo',
    'gerente-general': 'administrador-general',
    'encargado': 'gerente-sucursal',
    'Trabajador': 'tecnico-normal',
    'tecnico': 'tecnico-normal',
  };
  return map[roleStr || ''] ?? roleStr ?? '';
};
