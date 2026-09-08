import { useMemo } from 'react';
import { isAutonomoAdmin, normalizeRole } from '../../../utils/roles';

export interface RolePermissions {
    canEdit: boolean;            // puede editar datos de la sucursal (levantamiento, banner)
    canSeeActions: boolean;      // puede ver la barra de acciones
    canSeeSOS: boolean;          // puede lanzar una alerta SOS
    canSeeSolicitud: boolean;    // puede crear solicitudes
    canSeeEquipos: boolean;      // puede acceder a la pestaña Equipos
    isTecnico: boolean;
    isAdmin: boolean;
    isCliente: boolean;
    isEncargado: boolean;        // incluye encargado y gerente-sucursal
    isAutonomo: boolean;
    /** Devuelve el base-path de navegación según el rol */
    getBasePath: () => string;
}

/**
 * Hook que centraliza todos los checkeos de rol para Trabajodetalles.
 * Evita la proliferación de strings de rol repetidos por todo el render.
 */
export const useRolePermissions = (user: any): RolePermissions => {
    return useMemo(() => {
        const roleRaw = typeof user?.role === 'string' ? user.role : (user?.role?.name || '');
        const roleStr = normalizeRole(roleRaw).toLowerCase();

        const isEncargado =
            roleStr === 'encargado' ||
            roleStr === 'gerente-sucursal' ||
            roleStr.includes('encargado') ||
            roleStr.includes('subgerente') ||
            roleStr.includes('gerente');
        const isCliente = roleStr === 'cliente';
        const isAdmin = roleStr === 'admin' || roleStr === 'root' || roleStr === 'sub-admin';
        const isAutonomo = isAutonomoAdmin(user?.role);
        const isTecnico = roleStr.includes('tecnico') || roleStr === 'tecnico-normal';

        const canEdit = isCliente || isEncargado || isAutonomo;
        const canSeeActions = isCliente || isAdmin || isEncargado || isAutonomo || isTecnico;
        const canSeeSOS = isCliente || isEncargado || isAutonomo || isAdmin;
        const canSeeSolicitud = isCliente || isEncargado || isAutonomo || isAdmin;
        const canSeeEquipos = isAdmin || isCliente || isEncargado || isAutonomo;

        const getBasePath = (): string => {
            if (isTecnico) return '/tecnico';
            if (isCliente) return '/cliente';
            if (isAutonomo) return '/autonomo';
            if (isEncargado) return '/gerente-sucursal';
            return '/menu';
        };

        return {
            canEdit,
            canSeeActions,
            canSeeSOS,
            canSeeSolicitud,
            canSeeEquipos,
            isTecnico,
            isAdmin,
            isCliente,
            isEncargado,
            isAutonomo,
            getBasePath,
        };
    }, [user]);
};
