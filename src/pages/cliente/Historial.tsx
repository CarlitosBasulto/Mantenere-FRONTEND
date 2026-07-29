import React, { useState, useEffect } from "react";

import styles from "./Historial.module.css";

import { useAuth } from "../../context/AuthContext";
import menuStyles from "../../components/Menu.module.css";
import { getTrabajos } from "../../services/trabajosService";
import { getReporteByTrabajoId } from "../../services/reportesService";

import {
    HiOutlineCheckBadge,
    HiOutlineCheckCircle,
    HiOutlineClipboardDocumentList,
    HiOutlineIdentification,
    HiOutlineClock,
    HiOutlineBuildingOffice2,
    HiOutlineWrench,
    HiOutlineUser
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
interface HistorialProps {
    businessId?: number;
}

const parseJobDate = (fechaStr?: string, createdAt?: string): Date => {
    if (fechaStr) {
        if (fechaStr.includes('-')) {
            const parts = fechaStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                return new Date(year, month, day);
            }
        }
        if (fechaStr.includes('/')) {
            const parts = fechaStr.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                return new Date(year, month, day);
            }
        }
        const dateObj = new Date(fechaStr);
        if (!isNaN(dateObj.getTime())) return dateObj;
    }
    if (createdAt) {
        const dateObj = new Date(createdAt);
        if (!isNaN(dateObj.getTime())) return dateObj;
    }
    return new Date();
};

const getMonthYearString = (date: Date): string => {
    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${months[date.getMonth()]} de ${date.getFullYear()}`;
};

const Historial: React.FC<HistorialProps> = ({ businessId }) => {
    const { user } = useAuth();
    const [rawTareas, setRawTareas] = useState<TareaHistorial[]>([]);
    const [selectedHistoryTask, setSelectedHistoryTask] = useState<TareaHistorial | null>(null);
    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
    const [searchText, setSearchText] = useState("");
    const [reportData, setReportData] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!user) return;

        // 1. Obtener los negocios del cliente actual
        const apiNegociosRaw = localStorage.getItem('negocios_list');
        const negociosIds = new Set<number>();

        if (apiNegociosRaw) {
            const negocios = JSON.parse(apiNegociosRaw);
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
                const terminados = apiJobs.filter((j: any) => j.estado === 'Finalizado' || j.estado === 'Cotización Aceptada' || j.estado === 'Completado');

                // Filtrar por negocio
                const filteredJobs = terminados.filter((job: any) => {
                    if (businessId) {
                        return job.negocio_id === businessId;
                    }
                    if (user.role === 'admin' || user.role === 'tecnico') {
                        return true;
                    }
                    return negociosIds.has(job.negocio_id) || job.negocio?.user_id === user.id || (user.role === 'encargado' && job.negocio_id === user.negocio_id);
                });

                const mappedTareas = filteredJobs.map((job: any) => {
                    const finalDate = parseJobDate(job.fecha_programada, job.created_at);
                    return {
                        id: job.id,
                        titulo: job.titulo,
                        descripcion: job.descripcion || "Trabajo completado exitosamente.",
                        estado: job.estado,
                        ubicacion: job.negocio?.ubicacion || job.negocio?.nombre || "Sucursal",
                        fecha: finalDate.toLocaleDateString('es-MX'),
                        monthYear: getMonthYearString(finalDate),
                        tecnico: job.trabajador?.nombre || "Sin Asignar",
                        trabajoId: job.id
                    };
                });

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


    useEffect(() => {
        if (selectedHistoryTask) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedHistoryTask]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}></h1>
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
                    Object.keys(tareasAgrupadas).map((empresa) => {
                        const tareasDeEmpresa = tareasAgrupadas[empresa];
                        // Agrupar por mes/año dentro de esta sucursal
                        const groupedByMonth = tareasDeEmpresa.reduce((acc, tarea) => {
                            const key = tarea.monthYear || 'Desconocido';
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(tarea);
                            return acc;
                        }, {} as Record<string, TareaHistorial[]>);

                        return (
                            <div key={empresa} style={{ marginBottom: '40px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px', borderBottom: '2px solid #eaeaea', paddingBottom: '10px' }}>
                                    Sucursal: {empresa}
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {Object.entries(groupedByMonth).map(([monthYear, tareasGroup]) => {
                                        const stateKey = `${empresa}-${monthYear}`;
                                        const isExpanded = expandedMonths[stateKey] !== false; // Default true
                                        return (
                                            <div key={monthYear} style={{ marginBottom: '10px' }}>
                                                <div 
                                                    onClick={() => setExpandedMonths(prev => ({ ...prev, [stateKey]: !isExpanded }))} 
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
                                                                    onClick={() => handleSelectTask(tarea)}
                                                                    title="Haz clic para ver más detalles"
                                                                >
                                                                    <div className={`${styles.cardIndicator} ${styles.borderSuccess}`}></div>
                                                                    <div className={styles.cardContent}>
                                                                        <div className={styles.cardIcon}>
                                                                            <HiOutlineCheckBadge className={styles.iconHistory} size={32} />
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
                                                                                    <HiOutlineCheckCircle className={styles.statusIcon} /> Completado
                                                                                </div>
                                                                            </div>

                                                                            <p className={styles.descripcion}>{tarea.descripcion}</p>

                                                                            <div className={styles.cardFooter}>
                                                                                {tarea.tecnico && tarea.tecnico !== "Sin Asignar" && tarea.tecnico !== "Sin asignar" ? (
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
                                    })}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '30px', border: '1px solid #eee' }}>
                        <p style={{ color: '#666', fontSize: '16px' }}>No hay labores o diagnósticos finalizados en el historial.</p>
                    </div>
                )}
            </div>


            {/* MODAL HISTORIAL DETALLADO */}
            {selectedHistoryTask && (
                <div className={styles.premiumModalOverlay} onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setSelectedHistoryTask(null);
                        setReportData(null);
                    }
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
                                onClick={() => { setSelectedHistoryTask(null); setReportData(null); }}
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

                            {loadingReport ? (
                                <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '25px', border: '1.5px solid #f1f5f9' }}>
                                    <div className="loader-mantenere" style={{ margin: '0 auto 15px' }}></div>
                                    <p style={{ color: '#64748b', fontWeight: '600' }}>Cargando reporte técnico...</p>
                                </div>
                            ) : reportData ? (
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
