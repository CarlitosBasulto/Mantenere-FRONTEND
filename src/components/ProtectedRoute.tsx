import { Navigate } from "react-router-dom";

interface Props {
    children: React.ReactNode;
    allowedRoles: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    console.log("🛡️ [ProtectedRoute] Evaluando ruta protegida");
    console.log("🛡️ Token existe:", !!token);
    console.log("🛡️ UserData en localStorage:", userData);
    console.log("🛡️ Roles permitidos para esta ruta:", allowedRoles);

    if (!token || !userData) {
        console.log("🔴 [ProtectedRoute] RECHAZADO: No hay token o no hay userData. Redirigiendo a /inicio-sesion");
        return <Navigate to="/inicio-sesion" replace />;
    }

    const user = JSON.parse(userData);
    const role = user.role; // <-- IMPORTANTE

    console.log("🛡️ Rol del usuario actual:", role);

    if (!allowedRoles.includes(role)) {
        console.log(`🔴 [ProtectedRoute] RECHAZADO: El rol '${role}' no está en la lista de permitidos [${allowedRoles}]. Redirigiendo a /`);
        return <Navigate to="/" replace />;
    }

    console.log("✅ [ProtectedRoute] ACCESO CONCEDIDO");
    return <>{children}</>;
};

export default ProtectedRoute;