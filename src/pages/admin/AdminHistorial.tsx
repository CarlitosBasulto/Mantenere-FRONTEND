import React, { useState, useEffect } from "react";
import styles from "../cliente/Historial.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";
import { getTrabajos } from "../../services/trabajosService";
import {
    HiOutlineClipboardDocumentList,
    HiOutlineIdentification,
    HiOutlineClock,
    HiOutlineBuildingOffice2,
    HiOutlineUser,
    HiOutlineWrench
} from "react-icons/hi2";

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
    monthYear?: string;
}

const AdminHistorial: React.FC = () => {
    const { user } = useAuth();
    const [rawTareas, setRawTareas] = useState<TareaHistorial[]>([]);
    const [selectedHistoryTask, setSelectedHistoryTask] = useState<TareaHistorial | null>(null);
    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

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

                const mappedTareas = terminados.map((job: any) => {
                    const dateObj = job.fecha_programada ? new Date(`${job.fecha_programada}T00:00:00`) : new Date(job.created_at);
                    const isInvalid = isNaN(dateObj.getTime());
                    const finalDate = isInvalid ? new Date() : dateObj;
                    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
                    return {
                        id: job.id,
                        titulo: job.titulo,
                        descripcion: job.descripcion || "Trabajo completado exitosamente.",
                        estado: job.estado,
                        ubicacion: job.negocio?.ubicacion || job.negocio?.nombre || "Sucursal",
                        fecha: finalDate.toLocaleDateString('es-MX'),
                        monthYear: capitalize(finalDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' })),
                        tecnico: job.trabajador?.nombre || "Sin Asignar",
                        trabajoId: job.id
                    };
                });

                // Ordenar más recientes primero
                mappedTareas.sort((a: TareaHistorial, b: TareaHistorial) => b.id - a.id);
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
                        {(() => {
                            const grouped = filtradas.reduce((acc, tarea) => {
                                const key = tarea.monthYear || 'Desconocido';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(tarea);
                                return acc;
                            }, {} as Record<string, TareaHistorial[]>);                            return Object.entries(grouped).map(([monthYear, tareasGroup]) => {
                                const isExpanded = expandedMonths[monthYear] !== false; // Default true
                                return (
                                    <div key={monthYear} style={{ marginBottom: '10px' }}>
                                        <div 
                                            onClick={() => setExpandedMonths(prev => ({ ...prev, [monthYear]: !isExpanded }))} 
                                            className={styles.accordionHeader}
                                        >
                                            <div className={styles.accordionLeft}>
                                                <span style={{ fontSize: '22px' }}>{isExpanded ? '📂' : '📁'}</span>
                                                <span style={{ textTransform: 'capitalize' }}>{monthYear}</span>
                                                <span className={styles.accordionCount}>{tareasGroup.length} reporte{tareasGroup.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            <span className={`${styles.accordionArrow} ${isExpanded ? styles.accordionArrowExpanded : ''}`}>▼</span>
                                        </div>
                                        {isExpanded && (
                                            <div className={styles.groupContentList}>
                                                {tareasGroup.map((tarea, index) => {
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
                                                                            <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block', marginBottom: '8px' }}>
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
                                                                        {tarea.tecnico && tarea.tecnico !== "Sin Asignar" ? (
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
                                        )}
                                    </div>
                                );
                            });
                        })()}
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
                        <div className={styles.premiumModalOverlay} onClick={(e) => {
                            if (e.target === e.currentTarget) setSelectedHistoryTask(null);
                        }}>
                            <div className={styles.premiumModalContent}>
                                <div className={styles.premiumModalHeader}>
                                    <h2>
                                        <HiOutlineClipboardDocumentList size={26} color="#3b82f6" />
                                        Detalles del Reporte
                                        {selectedHistoryTask.estado === 'Pre-Reporte' && <span style={{ color: '#f26522', fontSize: '13px', background: '#fffbeb', padding: '4px 10px', borderRadius: '10px', border: '1px solid #fef3c7', marginLeft: '10px' }}>Pre-Reporte</span>}
                                    </h2>
                                    <button
                                        className={styles.closeButtonCircle}
                                        onClick={() => setSelectedHistoryTask(null)}
                                        title="Cerrar"
                                    >
                                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'inherit' }}>✕</span>
                                    </button>
                                </div>

                                <div className={styles.premiumModalBody}>
                                    <div className={styles.infoGrid}>
                                        <div className={styles.reportDetailCard} style={{ margin: 0 }}>
                                            <div className={styles.detailSectionTitle}>
                                                <HiOutlineIdentification size={18} />
                                                Identificación
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span className={styles.dataLabel}>Folio de Reporte</span>
                                                    <span className={styles.folioBadge}>#{reportData?.id || selectedHistoryTask.id}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span className={styles.dataLabel}>Estatus</span>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        color: selectedHistoryTask.estado === 'Finalizado' ? '#059669' : '#b45309',
                                                        background: selectedHistoryTask.estado === 'Finalizado' ? '#ecfdf5' : '#fffbeb',
                                                        padding: '4px 10px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${selectedHistoryTask.estado === 'Finalizado' ? '#d1fae5' : '#fef3c7'}`
                                                    }}>
                                                        {selectedHistoryTask.estado.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.reportDetailCard} style={{ margin: 0 }}>
                                            <div className={styles.detailSectionTitle}>
                                                <HiOutlineClock size={18} />
                                                Cronología
                                            </div>
                                            <span className={styles.dataLabel}>Fecha de Registro</span>
                                            <span className={styles.dataText}>{selectedHistoryTask.fecha}</span>
                                        </div>
                                    </div>

                                    <div className={styles.reportDetailCard}>
                                        <div className={styles.detailSectionTitle}>
                                            <HiOutlineBuildingOffice2 size={18} />
                                            Información de Servicio
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div className={styles.dataBlock}>
                                                <span className={styles.dataLabel}>Sucursal</span>
                                                <span className={styles.dataText}>{selectedHistoryTask.ubicacion}</span>
                                            </div>
                                            <div className={styles.dataBlock}>
                                                <span className={styles.dataLabel}>Tipo de Trabajo</span>
                                                <span className={styles.dataText}>{selectedHistoryTask.titulo}</span>
                                            </div>
                                            <div className={styles.dataBlock} style={{ gridColumn: 'span 2' }}>
                                                <span className={styles.dataLabel}>Técnico Encargado</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                        <HiOutlineUser size={16} />
                                                    </div>
                                                    <span className={styles.dataText}>{selectedHistoryTask.tecnico || "No asignado"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {reportData ? (
                                        <>
                                            <div className={styles.reportDetailCard}>
                                                <div className={styles.detailSectionTitle}>
                                                    <HiOutlineClipboardDocumentList size={18} />
                                                    Datos del Reporte
                                                </div>

                                                <div className={styles.dataBlock}>
                                                    <span className={styles.dataLabel}>Reporte de Tienda / Hallazgo</span>
                                                    <div className={styles.dataBox}>{reportData.reporteTienda || 'N/A'}</div>
                                                </div>

                                                <div className={styles.dataBlock}>
                                                    <span className={styles.dataLabel}>Descripción del Trabajo Realizado</span>
                                                    <div className={styles.dataBox}>{reportData.descripcion || 'N/A'}</div>
                                                </div>

                                                <div className={styles.dataBlock}>
                                                    <span className={styles.dataLabel}>Materiales y Refacciones</span>
                                                    <div className={styles.dataBox}>{reportData.materiales || 'No se utilizaron materiales.'}</div>
                                                </div>

                                                <div className={styles.dataBlock}>
                                                    <span className={styles.dataLabel}>Observaciones Adicionales</span>
                                                    <div className={styles.dataBox}>{reportData.observaciones || 'Sin observaciones adicionales.'}</div>
                                                </div>
                                            </div>

                                            {(reportData.imagenes && (reportData.imagenes.antes || reportData.imagenes.durante || reportData.imagenes.despues || reportData.imagenObservacion || (reportData.imagenesObservacion && reportData.imagenesObservacion.length > 0))) && (
                                                <div className={styles.reportDetailCard}>
                                                    <div className={styles.detailSectionTitle}>
                                                        <HiOutlineWrench size={18} />
                                                        Evidencia Fotográfica
                                                    </div>
                                                    <div className={styles.evidenceGrid}>
                                                        {['antes', 'durante', 'despues'].map(key => reportData.imagenes[key] && (
                                                            <div key={key} className={styles.evidenceItem}>
                                                                <img
                                                                    src={reportData.imagenes[key]}
                                                                    alt={key}
                                                                    className={styles.evidenceThumb}
                                                                    onClick={() => setSelectedZoomImage(reportData.imagenes[key])}
                                                                />
                                                                <span className={styles.evidenceLabel}>{key === 'despues' ? 'después' : key}</span>
                                                            </div>
                                                        ))}
                                                        {reportData.imagenesObservacion && reportData.imagenesObservacion.length > 0 ? (
                                                            reportData.imagenesObservacion.map((img: string, idx: number) => (
                                                                <div key={idx} className={styles.evidenceItem}>
                                                                    <img
                                                                        src={img}
                                                                        alt={`Extra ${idx + 1}`}
                                                                        className={styles.evidenceThumb}
                                                                        onClick={() => setSelectedZoomImage(img)}
                                                                    />
                                                                    <span className={styles.evidenceLabel}>Extra {idx + 1}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            reportData.imagenObservacion && (
                                                                <div className={styles.evidenceItem}>
                                                                    <img
                                                                        src={reportData.imagenObservacion}
                                                                        alt="Observación"
                                                                        className={styles.evidenceThumb}
                                                                        onClick={() => setSelectedZoomImage(reportData.imagenObservacion)}
                                                                    />
                                                                    <span className={styles.evidenceLabel}>Extra</span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {reportData.firmaEmpresa && (
                                                <div className={styles.reportDetailCard} style={{ textAlign: 'center' }}>
                                                    <span className={styles.dataLabel}>Firma de Validación (Cliente)</span>
                                                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', display: 'inline-block', marginTop: '10px', border: '1px solid #f1f5f9' }}>
                                                        <img
                                                            src={reportData.firmaEmpresa}
                                                            alt="Firma"
                                                            style={{ height: '70px', objectFit: 'contain', cursor: 'zoom-in' }}
                                                            onClick={() => setSelectedZoomImage(reportData.firmaEmpresa)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ background: '#fffbeb', padding: '24px', borderRadius: '25px', border: '1.5px solid #fef3c7', textAlign: 'center' }}>
                                            <p style={{ margin: 0, color: '#b45309', fontSize: '14px', fontWeight: '600', fontStyle: 'italic' }}>
                                                ⚠️ Aún no hay un reporte detallado registrado para esta actividad.
                                            </p>
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
