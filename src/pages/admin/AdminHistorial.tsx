import React, { useState, useEffect } from "react";
import styles from "../cliente/Historial.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";
import { getTrabajos } from "../../services/trabajosService";

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

const AdminHistorial: React.FC = () => {
    const { user } = useAuth();
    const [rawTareas, setRawTareas] = useState<TareaHistorial[]>([]);
    const [selectedHistoryTask, setSelectedHistoryTask] = useState<TareaHistorial | null>(null);
    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);

    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            try {
                const apiJobs = await getTrabajos();
                let terminados = apiJobs.filter((j: any) => j.estado === 'Finalizado' || j.estado === 'Cotización Aceptada');
                
                // Si es técnico, filtrar solo los terminados que le pertenecen
                if (user.role === 'tecnico') {
                    terminados = terminados.filter((j: any) => 
                        j.trabajador_id === user.id || j.trabajador?.user_id === user.id
                    );
                }
                
                const mappedTareas = terminados.map((job: any) => ({
                    id: job.id,
                    titulo: job.titulo,
                    descripcion: job.descripcion || "Trabajo completado exitosamente.",
                    estado: job.estado,
                    ubicacion: job.negocio?.ubicacion || job.negocio?.nombre || "Sucursal",
                    fecha: job.fecha_programada || new Date(job.created_at).toLocaleDateString('es-MX'),
                    tecnico: job.trabajador?.nombre || "Sin Asignar",
                    trabajoId: job.id
                }));

                // Ordenar más recientes primero
                mappedTareas.sort((a, b) => b.id - a.id);
                setRawTareas(mappedTareas);
            } catch (error) {
                console.error("Error al obtener el historial de la API", error);
            }
        };

        fetchHistory();
    }, [user]);

    // Filtrado
    const filtradas = rawTareas.filter(tarea => {
        const matchesText = tarea.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
            tarea.ubicacion.toLowerCase().includes(searchText.toLowerCase()) ||
            tarea.descripcion.toLowerCase().includes(searchText.toLowerCase());
        return matchesText;
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Historial Global de Trabajos</h1>
                <p className={styles.subtitle}>Listado centralizado de todos los trabajos terminados en todas las sucursales.</p>
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
                {filtradas.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {filtradas.map((tarea, index) => {
                            return (
                                <div
                                    key={`${tarea.id}-${index}`}
                                    className={styles.card}
                                    onClick={() => setSelectedHistoryTask(tarea)}
                                    title="Haz clic para ver más detalles"
                                >
                                    <div className={`${styles.cardIndicator} ${styles.borderSuccess}`}></div>
                                    <div className={styles.cardContent}>
                                        <div className={styles.cardIcon}>
                                            <span className={styles.iconHistory}>📋</span>
                                        </div>
                                        <div className={styles.cardInfo}>
                                            <div className={styles.cardHeader}>
                                                <div>
                                                    <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginBottom: '5px' }}>
                                                        🏢 {tarea.ubicacion}
                                                    </span>
                                                    <h3 className={styles.concepto} style={{ marginTop: '0' }}>{tarea.titulo}</h3>
                                                </div>
                                                <div className={`${styles.statusBadge} ${styles.badgeSuccess}`}>
                                                    <span className={styles.statusIcon}>✓</span> Completado
                                                </div>
                                            </div>
                                            <p className={styles.descripcion}>{tarea.descripcion}</p>
                                            <div className={styles.cardFooter}>
                                                {tarea.tecnico && tarea.tecnico !== "Sin asignar" ? (
                                                    <span className={styles.tecnicoBadge}>🧑‍🔧 {tarea.tecnico}</span>
                                                ) : <span></span>}
                                                <span className={styles.fecha}>{tarea.fecha}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '30px', border: '1px solid #eee' }}>
                        <p style={{ color: '#666', fontSize: '16px' }}>No hay labores o diagnósticos finalizados en el historial global.</p>
                    </div>
                )}
            </div>

            {/* MODAL HISTORIAL DETALLADO */}
            {
                selectedHistoryTask && (() => {
                    const reportDataRaw = localStorage.getItem(`report_data_${selectedHistoryTask.id}`);
                    const temporalReportDataRaw = localStorage.getItem(`report_data_temporal_${selectedHistoryTask.id}`);
                    const reportData = reportDataRaw ? JSON.parse(reportDataRaw) : (temporalReportDataRaw ? JSON.parse(temporalReportDataRaw) : null);

                    return (
                        <div className={menuStyles.modalOverlay} onClick={(e) => {
                            if (e.target === e.currentTarget) setSelectedHistoryTask(null);
                        }}>
                            <div className={menuStyles.modalContent} style={{ maxWidth: '600px', width: '90%', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
                                    <h2 style={{ margin: 0, color: '#333' }}>Detalles del Reporte {selectedHistoryTask.estado === 'Pre-Reporte' && <span style={{ color: '#ff9800', fontSize: '14px', marginLeft: '10px' }}>(Pre-Reporte Sin Firma)</span>}</h2>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        <button
                                            onClick={() => setSelectedHistoryTask(null)}
                                            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: '20px' }}>

                                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', borderLeft: '4px solid #4caf50' }}>
                                        <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32', fontSize: '18px' }}>{selectedHistoryTask.titulo}</h3>
                                        <p style={{ margin: 0, color: '#555', fontSize: '15px', lineHeight: '1.5' }}>{selectedHistoryTask.descripcion}</p>
                                        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                            <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '5px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                                                Estado: {selectedHistoryTask.estado}
                                            </span>
                                            {reportData && reportData.fecha && (
                                                <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '5px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                                                    Fecha: {reportData.fecha}
                                                </span>
                                            )}
                                            {reportData && (
                                                <span style={{ background: '#f3e5f5', color: '#7b1fa2', padding: '5px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                                                    Folio: {reportData.id}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {reportData && (
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
                                                    <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Descripción:</span>
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

                                                {/* EVIDENCIA FOTOGRÁFICA */}
                                                {reportData.imagenes && (reportData.imagenes.antes || reportData.imagenes.durante || reportData.imagenes.despues || reportData.imagenObservacion) && (
                                                    <div>
                                                        <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Evidencia Fotográfica:</span>
                                                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                                            {reportData.imagenes.antes && (
                                                                <div style={{ textAlign: 'center' }}>
                                                                    <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Antes</span>
                                                                    <img
                                                                        src={reportData.imagenes.antes}
                                                                        alt="Antes"
                                                                        onClick={() => setSelectedZoomImage(reportData.imagenes.antes)}
                                                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', transition: 'transform 0.2s' }}
                                                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                                    />
                                                                </div>
                                                            )}
                                                            {reportData.imagenes.durante && (
                                                                <div style={{ textAlign: 'center' }}>
                                                                    <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Durante</span>
                                                                    <img
                                                                        src={reportData.imagenes.durante}
                                                                        alt="Durante"
                                                                        onClick={() => setSelectedZoomImage(reportData.imagenes.durante)}
                                                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', transition: 'transform 0.2s' }}
                                                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                                    />
                                                                </div>
                                                            )}
                                                            {reportData.imagenes.despues && (
                                                                <div style={{ textAlign: 'center' }}>
                                                                    <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Después</span>
                                                                    <img
                                                                        src={reportData.imagenes.despues}
                                                                        alt="Después"
                                                                        onClick={() => setSelectedZoomImage(reportData.imagenes.despues)}
                                                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', transition: 'transform 0.2s' }}
                                                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                                    />
                                                                </div>
                                                            )}
                                                            {reportData.imagenObservacion && (
                                                                <div style={{ textAlign: 'center' }}>
                                                                    <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Observación</span>
                                                                    <img
                                                                        src={reportData.imagenObservacion}
                                                                        alt="Observación"
                                                                        onClick={() => setSelectedZoomImage(reportData.imagenObservacion)}
                                                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', transition: 'transform 0.2s' }}
                                                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* FIRMA DE LA EMPRESA */}
                                                {reportData.firmaEmpresa && (
                                                    <div style={{ marginTop: '10px' }}>
                                                        <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Firma de Validación:</span>
                                                        <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                                                            <img
                                                                src={reportData.firmaEmpresa}
                                                                alt="Firma"
                                                                onClick={() => setSelectedZoomImage(reportData.firmaEmpresa)}
                                                                style={{ height: '60px', objectFit: 'contain', cursor: 'pointer', transition: 'transform 0.2s' }}
                                                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* MODAL VIEW IMAGE */}
            {selectedZoomImage && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setSelectedZoomImage(null)}
                >
                    <img
                        src={selectedZoomImage}
                        style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '10px' }}
                    />
                    <button
                        onClick={() => setSelectedZoomImage(null)}
                        style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', fontSize: '40px', cursor: 'pointer' }}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
};

export default AdminHistorial;
