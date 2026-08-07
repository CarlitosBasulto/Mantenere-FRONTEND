// Grupos de roles por ecosistema
export const BASE_ROLES = ['root', 'admin', 'cliente', 'tecnico-normal'];
export const AUTONOMO_ROLES = [
  'autonomo', 
  'propietario-autonomo',
  'administrador-general',
  'gerente-sucursal', 
  'tecnico-autonomo'
];

export const isBaseRole = (role?: string) => BASE_ROLES.includes(role || '');
export const isAutonomoRole = (role?: string) => AUTONOMO_ROLES.includes(role || '');

// Nombres viejos que vienen del backend (mientras migran)
export const normalizeRole = (role?: string): string => {
  const map: Record<string, string> = {
    'admin-autonomo': 'propietario-autonomo',
    'gerente-general': 'administrador-general',
    'encargado': 'gerente-sucursal',
    'Trabajador': 'tecnico-normal',
    'tecnico': 'tecnico-normal',
  };
  return map[role || ''] ?? role ?? '';
};
