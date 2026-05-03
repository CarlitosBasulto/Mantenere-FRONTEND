import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Vista inicial del encargado de sucursal.
 * Redirige automáticamente a la vista de su sucursal asignada.
 */
const EncargadoHome: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (user?.negocio_id) {
            navigate(`/encargado/sucursal?id=${user.negocio_id}`, { replace: true });
        }
    }, [user, navigate]);

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '60vh', gap: '16px', color: '#64748b'
        }}>
            <div style={{
                width: '48px', height: '48px', border: '4px solid #f59e0b',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ fontSize: '15px', fontWeight: 500 }}>Cargando tu sucursal...</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default EncargadoHome;
