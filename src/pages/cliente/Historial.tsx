import React, { useState, useEffect } from "react";

import styles from "./Historial.module.css";

import { useAuth } from "../../context/AuthContext";
import menuStyles from "../../components/Menu.module.css";
import { getTrabajos } from "../../services/trabajosService";
import { getReporteByTrabajoId } from "../../services/reportesService";

// Interfaz para el Trabajo
interface TareaHistorial {
    id: number;
    titulo: string;
    descripcion: string;
    estado: string;
    ubicacion: string;
    fecha: string;
    tecnico?: string;
    trabajoId: number;
}
interface HistorialProps {
    businessId?: number;
}

const Historial: React.FC<HistorialProps> = ({ businessId }) => {
    const { user } = useAuth();
    const [rawTareas, setRawTareas] = useState<TareaHistorial[]>([]);
    const [selectedHistoryTask, setSelectedHistoryTask] = useState<TareaHistorial | null>(null);
    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");
    const [reportData, setReportData] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    useEffect(() => {
        if (!user) return;

        // 1. Obtener los negocios del cliente actual
        const storedNegocios = localStorage.getItem('negocios_list');
        const negociosIds = new Set<number>();

        if (storedNegocios) {
            const negocios = JSON.parse(storedNegocios);
            negocios.forEach((n: any) => {
                if (n.user_id === user.id || n.dueno === user.name) {
                    negociosIds.add(n.id);
                }
            });
        }

        const fetchClientHistory = async () => {
            try {
                const apiJobs = await getTrabajos();
                
                // Filtrar solo los trabajos finalizados o completados
                const terminados = apiJobs.filter((j: any) => j.estado === 'Finalizado' || j.estado === 'Cotización Aceptada');
                
                // Filtrar por negocio
                const filteredJobs = terminados.filter((job: any) => {
                    if (businessId) {
                        return job.negocio_id === businessId;
                    }
                    if (user.role === 'admin' || user.role === 'tecnico') {
                        return true;
                    }
                    return negociosIds.has(job.negocio_id) || job.negocio?.user_id === user.id;
                });

                const mappedTareas = filteredJobs.map((job: any) => ({
                    id: job.id,
                    titulo: job.titulo,
                    descripcion: job.descripcion || "Trabajo completado exitosamente.",
                    estado: job.estado,
                    ubicacion: job.negocio?.ubicacion || job.negocio?.nombre || "Sucursal",
                    fecha: job.fecha_programada ? (job.fecha_programada.includes('-') ? job.fecha_programada.split('-').reverse().join('/') : job.fecha_programada) : new Date(job.created_at).toLocaleDateString('es-MX'),
                    tecnico: job.trabajador?.nombre || "Sin Asignar",
                    trabajoId: job.id
                }));

                mappedTareas.sort((a: any, b: any) => b.id - a.id);
                setRawTareas(mappedTareas);
            } catch (error) {
                console.error("Error cargando historial de cliente:", error);
            }
        };

        fetchClientHistory();
    }, [user, businessId]);

    // Filtrado
    const filtradas = rawTareas.filter(tarea => {
        const matchesText = tarea.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
            tarea.ubicacion.toLowerCase().includes(searchText.toLowerCase()) ||
            tarea.descripcion.toLowerCase().includes(searchText.toLowerCase());
        return matchesText;
    });

    // Agrupar por empresa
    type TareasAgrupadas = { [nombreEmpresa: string]: TareaHistorial[] };
    const tareasAgrupadas: TareasAgrupadas = {};
    filtradas.forEach(tarea => {
        const empresa = tarea.ubicacion || "Otras Sugerencias";
        if (!tareasAgrupadas[empresa]) tareasAgrupadas[empresa] = [];
        tareasAgrupadas[empresa].push(tarea);
    });

    const handleSelectTask = async (tarea: TareaHistorial) => {
        setSelectedHistoryTask(tarea);
        setReportData(null);
        setLoadingReport(true);

        try {
            // 1. Intentar cargar desde API
            const apiReport = await getReporteByTrabajoId(tarea.trabajoId);
            
            if (apiReport && apiReport.solucion) {
                try {
                    const parsed = JSON.parse(apiReport.solucion);
                    setReportData(parsed);
                } catch (e) {
                    console.error("Error parseando solución del reporte:", e);
                    setReportData({
                        descripcion: apiReport.descripcion,
                        fecha: apiReport.fecha,
                        id: apiReport.id
                    });
                }
            } else {
                // 2. Fallback a LocalStorage
                const localData = localStorage.getItem(`report_data_${tarea.id}`);
                const temporalData = localStorage.getItem(`report_data_temporal_${tarea.id}`);
                const savedData = localData || temporalData;
                
                if (savedData) {
                    setReportData(JSON.parse(savedData));
                }
            }
        } catch (error) {
            console.error("Error al obtener reporte:", error);
            const localData = localStorage.getItem(`report_data_${tarea.id}`);
            if (localData) setReportData(JSON.parse(localData));
        } finally {
            setLoadingReport(false);
        }
    };


    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Historial de Trabajos Realizados</h1>
                <p className={styles.subtitle}>Revisa cada una de las labores y diagnósticos realizados en tus sucursales.</p>
            </div>

            {/* BUSCADOR */}
            <div className={styles.searchSection}>
                <div className={menuStyles.searchCard}>
                    <input
                        type="text"
                        placeholder="Buscar trabajo, detalle o sucursal..."
                        className={menuStyles.searchInput}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.list}>
                {Object.keys(tareasAgrupadas).length > 0 ? (
                    Object.keys(tareasAgrupadas).map((empresa) => (
                        <div key={empresa} style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px', borderBottom: '2px solid #eaeaea', paddingBottom: '10px' }}>
                                Sucursal: {empresa}
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {tareasAgrupadas[empresa].map((tarea, index) => {
                                    return (
                                        <div
                                            key={`${tarea.id}-${index}`}
                                            className={styles.completedTaskCard}
                                            onClick={() => handleSelectTask(tarea)}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <h3 className={styles.completedTaskTitle}>
                                                    {tarea.titulo}
                                                </h3>
                                                <p className={styles.completedTaskDesc}>
                                                    {tarea.descripcion}
                                                </p>
                                                {tarea.tecnico && tarea.tecnico !== "Sin asignar" && (
                                                    <span style={{ fontSize: '13px', color: '#888', display: 'block', marginTop: '5px' }}>
                                                        🧑‍🔧 {tarea.tecnico} • {tarea.fecha}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={styles.completedBadge}>
                                                Completado
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '30px', border: '1px solid #eee' }}>
                        <p style={{ color: '#666', fontSize: '16px' }}>No hay labores o diagnósticos finalizados en el historial.</p>
                    </div>
                )}
            </div>

            {/* MODAL HISTORIAL DETALLADO */}
            {selectedHistoryTask && (
                <div className={menuStyles.modalOverlay} onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setSelectedHistoryTask(null);
                        setReportData(null);
                    }
                }}>
                    <div className={menuStyles.modalContent} style={{ maxWidth: '600px', width: '90%', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
                            <h2 style={{ margin: 0, color: '#333' }}>Detalles del Reporte {selectedHistoryTask.estado === 'Pre-Reporte' && <span style={{ color: '#ff9800', fontSize: '14px', marginLeft: '10px' }}>(Pre-Reporte Sin Firma)</span>}</h2>
                            <button
                                onClick={() => { setSelectedHistoryTask(null); setReportData(null); }}
                                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: '20px' }}>
                            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', borderLeft: '4px solid #4caf50' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32', fontSize: '18px' }}>{selectedHistoryTask.titulo}</h3>
                                <p style={{ margin: 0, color: '#555', fontSize: '15px', lineHeight: '1.5' }}>{selectedHistoryTask.descripcion}</p>
                                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                    <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '5px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                                        Estado: {selectedHistoryTask.estado}
                                    </span>
                                    <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '5px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                                        Fecha: {selectedHistoryTask.fecha}
                                    </span>
                                </div>
                            </div>

                            <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '16px' }}>👤 Información Adicional</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#777', fontSize: '14px' }}>Técnico Encargado:</span>
                                        <span style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>{selectedHistoryTask.tecnico || "No asignado"}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#777', fontSize: '14px' }}>Sucursal:</span>
                                        <span style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>{selectedHistoryTask.ubicacion}</span>
                                    </div>
                                </div>
                            </div>

                            {loadingReport ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #fbbc04', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
                                    <p style={{ color: '#888' }}>Cargando reporte de Base de Datos...</p>
                                </div>
                            ) : reportData ? (
                                <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee' }}>
                                    <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '16px' }}>📋 Datos del Reporte</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div>
                                            <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Reporte de tienda:</span>
                                            <div style={{ background: '#fafafa', padding: '10px', borderRadius: '8px', fontSize: '14px', color: '#333' }}>
                                                {reportData.reporteTienda || 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Descripción del técnico:</span>
                                            <div style={{ background: '#fafafa', padding: '10px', borderRadius: '8px', fontSize: '14px', color: '#333' }}>
                                                {reportData.descripcion || 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Materiales Utilizados:</span>
                                            <div style={{ background: '#fafafa', padding: '10px', borderRadius: '8px', fontSize: '14px', color: '#333' }}>
                                                {reportData.materiales || 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Observaciones Adicionales:</span>
                                            <div style={{ background: '#fafafa', padding: '10px', borderRadius: '8px', fontSize: '14px', color: '#333' }}>
                                                {reportData.observaciones || 'N/A'}
                                            </div>
                                        </div>

                                        {reportData.imagenes && (reportData.imagenes.antes || reportData.imagenes.durante || reportData.imagenes.despues || reportData.imagenObservacion) && (
                                            <div>
                                                <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Evidencia Fotográfica:</span>
                                                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                                    {['antes', 'durante', 'despues'].map(key => reportData.imagenes[key] && (
                                                        <div key={key} style={{ textAlign: 'center' }}>
                                                            <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                                            <img
                                                                src={reportData.imagenes[key]}
                                                                alt={key}
                                                                onClick={() => setSelectedZoomImage(reportData.imagenes[key])}
                                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                            />
                                                        </div>
                                                    ))}
                                                    {reportData.imagenObservacion && (
                                                        <div style={{ textAlign: 'center' }}>
                                                            <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Observación</span>
                                                            <img
                                                                src={reportData.imagenObservacion}
                                                                alt="Observación"
                                                                onClick={() => setSelectedZoomImage(reportData.imagenObservacion)}
                                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {reportData.firmaEmpresa && (
                                            <div style={{ marginTop: '10px' }}>
                                                <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Firma de Validación:</span>
                                                <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                                                    <img
                                                        src={reportData.firmaEmpresa}
                                                        alt="Firma"
                                                        onClick={() => setSelectedZoomImage(reportData.firmaEmpresa)}
                                                        style={{ height: '60px', objectFit: 'contain', cursor: 'pointer' }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: '#fff9e6', padding: '20px', borderRadius: '15px', border: '1px solid #ffe0b2', textAlign: 'center' }}>
                                    <p style={{ margin: 0, color: '#e65100', fontSize: '14px', fontStyle: 'italic' }}>
                                        ⚠️ Aún no hay un reporte detallado registrado para esta actividad en Base de Datos.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VIEW IMAGE */}
            {selectedZoomImage && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setSelectedZoomImage(null)}
                >
                    <img src={selectedZoomImage} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '10px' }} alt="Zoomed" />
                    <button
                        onClick={() => setSelectedZoomImage(null)}
                        style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', fontSize: '40px', cursor: 'pointer' }}
                    >
                        ×
                    </button>
                </div>
            )}
            
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};


export default Historial;
