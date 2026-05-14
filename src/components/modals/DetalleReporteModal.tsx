import React, { useState, useEffect } from "react";
import ReporteDetailModal from "./ReporteDetailModal";
import { getTrabajo } from "../../services/trabajosService";
import { getReporteByTrabajoId } from "../../services/reportesService";

interface DetalleReporteModalProps {
    isOpen: boolean;
    onClose: () => void;
    trabajoId: number;
}

const DetalleReporteModal: React.FC<DetalleReporteModalProps> = ({ isOpen, onClose, trabajoId }) => {
    const [loading, setLoading] = useState(true);
    const [trabajo, setTrabajo] = useState<any>(null);
    const [reporte, setReporte] = useState<any>(null);
    const [taskInfo, setTaskInfo] = useState<any>(null);

    useEffect(() => {
        if (!isOpen || !trabajoId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Obtener datos del trabajo
                const jobData = await getTrabajo(trabajoId);
                
                // Formatear para el modal de detalle
                const formattedTrabajo = {
                    id: jobData.id,
                    sucursal: jobData.negocio?.nombre || 'N/A',
                    tecnico: jobData.trabajador?.nombre || 'No asignado',
                    encargado: jobData.negocio?.encargado || 'N/A',
                    cotizacion: jobData.cotizacion ? {
                        costo: jobData.cotizacion.costo_estimado,
                        notas: jobData.cotizacion.notas_cliente,
                        archivo: jobData.cotizacion.archivo_presupuesto
                    } : undefined
                };

                const formattedTask = {
                    id: jobData.id,
                    titulo: jobData.titulo,
                    fecha: jobData.fecha_programada || new Date(jobData.created_at).toLocaleDateString()
                };

                setTrabajo(formattedTrabajo);
                setTaskInfo(formattedTask);

                // 2. Obtener datos del reporte
                const reportRes = await getReporteByTrabajoId(trabajoId);
                if (reportRes && reportRes.solucion) {
                    try {
                        const parsed = JSON.parse(reportRes.solucion);
                        // Añadir el id de la DB si no lo tiene el JSON
                        setReporte({ ...parsed, dbId: reportRes.id });
                    } catch (e) {
                        setReporte({
                            id: reportRes.id,
                            descripcion: reportRes.descripcion,
                            fecha: reportRes.fecha
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching report details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, trabajoId]);

    if (!isOpen) return null;

    if (loading) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', padding: '30px', borderRadius: '15px', textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
                    <p style={{ color: '#64748b' }}>Cargando reporte técnico...</p>
                </div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <ReporteDetailModal 
            isOpen={isOpen}
            onClose={onClose}
            trabajo={trabajo}
            task={taskInfo}
            reporte={reporte}
        />
    );
};

export default DetalleReporteModal;
