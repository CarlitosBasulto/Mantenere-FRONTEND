import { Navigate, useLocation } from "react-router-dom";
import MandatoryPasswordModal from "./modals/MandatoryPasswordModal";
import { normalizeRole } from "../utils/roles";

interface Props {
    children: React.ReactNode;
    allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    const location = useLocation();

    console.log("🛡️ [ProtectedRoute] Evaluando ruta protegida para PATH:", location.pathname);
    console.log("🛡️ Token existe:", !!token);
    console.log("🛡️ UserData en localStorage:", userData);
    console.log("🛡️ Roles permitidos para esta ruta:", allowedRoles);

    if (!token || !userData) {
        console.log("🔴 [ProtectedRoute] RECHAZADO: No hay token o no hay userData. Redirigiendo a /inicio-sesion");
        return <Navigate to="/inicio-sesion" replace />;
    }

    let user: any = {};
    try {
        user = JSON.parse(userData);
    } catch (e) {
        console.error("🔴 [ProtectedRoute] Error parsing user data:", e);
        return <Navigate to="/inicio-sesion" replace />;
    }

    const rawRole = typeof user.role === 'object' && user.role !== null ? (user.role as any).name : user.role;
    const role = normalizeRole(rawRole);

    console.log("🛡️ Rol del usuario actual (raw):", rawRole, "| (normalized):", role);

    const isAllowed = allowedRoles.some((allowed) => {
        const normAllowed = normalizeRole(allowed);
        return allowed === rawRole || normAllowed === role || allowed === role || normAllowed === rawRole;
    });

    if (!isAllowed) {
        let userHome = '/cliente';
        if (role === 'admin' || rawRole === 'root') userHome = '/menu';
        else if (role === 'tecnico-normal' || rawRole === 'tecnico' || rawRole === 'tecnico-autonomo') userHome = '/tecnico';
        else if (role === 'gerente-sucursal' || rawRole === 'encargado') userHome = '/gerente-sucursal';
        else if (
            role === 'autonomo' || 
            role === 'administrador-general' || 
            role === 'propietario-autonomo' || 
            rawRole === 'gerente-general' || 
            rawRole === 'administrador-general' || 
            rawRole === 'admin-autonomo'
        ) userHome = '/autonomo';

        console.log(`🔴 [ProtectedRoute] RECHAZADO: El rol '${rawRole}' (normalizado: '${role}') no está permitido en '${location.pathname}'. Redirigiendo a su portal: ${userHome}`);
        return <Navigate to={userHome} replace />;
    }

    console.log("✅ [ProtectedRoute] ACCESO CONCEDIDO");
    return (
        <>
            {children}
            {user.must_change_password && <MandatoryPasswordModal />}
        </>
    );
};

export default ProtectedRoute;