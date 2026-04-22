import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./Cotizaciones.module.css";
import { HiOutlineDocumentText, HiOutlineCheckCircle, HiOutlineXCircle } from "react-icons/hi2";
import { useAuth } from "../../context/AuthContext";
import menuStyles from "../../components/Menu.module.css";
import { getTrabajos } from "../../services/trabajosService";
import { getCotizacionByTrabajoId } from "../../services/cotizacionesService";
import { getNegocios } from "../../services/negociosService";


// Interfaz para el Trabajo con Cotización
interface TrabajoCotizado {
    id: number;
    titulo: string;
    ubicacion: string;
    fecha: string;
    estado: string;
    descripcion?: string;
    cotizacion?: {
        costo: string;
        notas: string;
        archivo: string;
        fecha: string;
    };
}

interface SubTarea {
    id: number;
    titulo: string;
    descripcion: string;
    estado: string;
}

interface CotizacionesProps {
    businessId?: number;
}

const Cotizaciones: React.FC<CotizacionesProps> = ({ businessId }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [rawCotizaciones, setRawCotizaciones] = useState<TrabajoCotizado[]>([]);

    const [searchText, setSearchText] = useState("");
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("Todas");
    const [tempFilter, setTempFilter] = useState("Todas");

    const [selectedCotizacion, setSelectedCotizacion] = useState<TrabajoCotizado | null>(null);
    const [cotizacionTasks, setCotizacionTasks] = useState<SubTarea[]>([]);
    const [reportData] = useState<any>(null);
    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);

    // Eliminado el modal local en favor de la navegación al detalle del trabajo

    useEffect(() => {
        if (!user) return;

        const fetchCotizaciones = async () => {
            try {
                // 1. Obtener los negocios del cliente actual desde la API
                const apiNegocios = await getNegocios();
                const negociosIds = new Set<number>();
                
                apiNegocios.forEach((n: any) => {
                    if (n.user_id === user.id) {
                        negociosIds.add(n.id);
                    }
                });

                const apiJobs = await getTrabajos();
                
                const filtrados = apiJobs.filter((job: any) => {
                    if (businessId && job.negocio_id !== businessId) return false;
                    
                    // Incluir trabajos que tienen o tuvieron cotización
                    const isCotizado = job.cotizacion || ["Cotización Enviada", "Cotización Aceptada", "Cotización Rechazada", "Asignado", "En Proceso", "Finalizado"].includes(job.estado);
                    const isVisible = negociosIds.has(job.negocio_id) || job.negocio?.user_id === user.id || user.role === 'admin';
                    
                    return isCotizado && isVisible;
                });

                const mapeados: TrabajoCotizado[] = await Promise.all(filtrados.map(async (job: any) => {
                    let cotizacionData = job.cotizacion;
                    if (!cotizacionData && ["Cotización Enviada", "Cotización Aceptada", "Cotización Rechazada", "Asignado", "En Proceso", "Finalizado"].includes(job.estado)) {
                        try {
                            const coti = await getCotizacionByTrabajoId(job.id);
                            if (coti && coti.length > 0) {
                                const mainCoti = coti[0];
                                cotizacionData = {
                                    id: mainCoti.id,
                                    costo: mainCoti.monto,
                                    notas: mainCoti.descripcion,
                                    archivo: mainCoti.archivo,
                                    fecha: mainCoti.updated_at ? new Date(mainCoti.updated_at).toLocaleDateString('es-MX') : (job.fecha_programada || new Date(job.created_at).toLocaleDateString('es-MX'))
                                };
                            }
                        } catch (e) {
                            // Si tira 404 significa que no existe
                        }
                    }
                    
                    return {
                        id: job.id,
                        titulo: job.titulo,
                        ubicacion: job.negocio?.ubicacion || job.negocio?.nombre || "Sucursal",
                        fecha: job.fecha_programada || new Date(job.created_at).toLocaleDateString('es-MX'),
                        estado: job.estado,
                        descripcion: job.descripcion,
                        cotizacion: cotizacionData
                    };
                }));

                mapeados.sort((a, b) => {
                    const dateA = a.cotizacion?.fecha || a.fecha;
                    const dateB = b.cotizacion?.fecha || b.fecha;
                    const partsA = dateA.split('/');
                    const partsB = dateB.split('/');
                    if (partsA.length === 3 && partsB.length === 3) {
                        const [da, ma, ya] = partsA.map(Number);
                        const [db, mb, yb] = partsB.map(Number);
                        return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
                    }
                    return 0;
                });

                setRawCotizaciones(mapeados);
            } catch (error) {
                console.error("Error cargando cotizaciones:", error);
            }
        };

        fetchCotizaciones();
    }, [user, businessId]);

    // Lógica de Filtrado Reactiva (en vivo)
    const filtradas = rawCotizaciones.filter(coti => {
        const matchesText = coti.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
            coti.ubicacion.toLowerCase().includes(searchText.toLowerCase());

        let matchesStatus = true;
        if (filterStatus !== "Todas") {
            const isPagadaFinalizada = ["Cotización Aceptada", "Asignado", "En Proceso", "Finalizado"].includes(coti.estado);

            if (filterStatus === "Aceptadas" && !isPagadaFinalizada) matchesStatus = false;
            if (filterStatus === "Rechazadas" && coti.estado !== "Cotización Rechazada") matchesStatus = false;
            if (filterStatus === "Pendientes" && coti.estado !== "Cotización Enviada") matchesStatus = false;
        }
        return matchesText && matchesStatus;
    });

    // Agrupar por empresa (luego de filtrar)
    type CotizacionesAgrupadas = { [nombreEmpresa: string]: TrabajoCotizado[] };
    const cotizacionesAgrupadas: CotizacionesAgrupadas = {};
    filtradas.forEach(coti => {
        const empresa = coti.ubicacion || "Otras Sugerencias";
        if (!cotizacionesAgrupadas[empresa]) cotizacionesAgrupadas[empresa] = [];
        cotizacionesAgrupadas[empresa].push(coti);
    });

    const handleApplyFilter = () => {
        setFilterStatus(tempFilter);
        setIsFilterModalOpen(false);
    };

    // Calcular estatus visual basado en el estado del trabajo
    const getEstatusInfo = (estado: string) => {
        if (["Cotización Aceptada", "Asignado", "En Proceso"].includes(estado)) return { text: "Aceptada", cssClass: styles.badgeAccepted, borderClass: styles.borderAccepted };
        if (estado === "Finalizado") return { text: "Finalizada", cssClass: styles.badgeAccepted, borderClass: styles.borderAccepted };
        if (estado === "Cotización Rechazada") return { text: "Rechazada", cssClass: styles.badgeRejected, borderClass: styles.borderRejected };
        return { text: "Pendiente", cssClass: styles.badgePending, borderClass: styles.borderPending };
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Mis Cotizaciones</h1>
                <p className={styles.subtitle}>Revisa el historial de cotizaciones que has recibido, aceptado o rechazado.</p>
            </div>

            {/* BUSCADOR Y FILTRO */}
            <div className={styles.searchSection}>
                <div className={menuStyles.searchCard}>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className={menuStyles.searchInput}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                    <button
                        className={menuStyles.filterBtn}
                        onClick={() => { setTempFilter(filterStatus); setIsFilterModalOpen(true); }}
                    >
                        <span style={{ fontSize: '18px' }}>⚙️</span>
                    </button>
                </div>
            </div>

            <div className={styles.list}>
                {Object.keys(cotizacionesAgrupadas).length > 0 ? (
                    Object.keys(cotizacionesAgrupadas).map((empresa) => (
                        <div key={empresa} style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px', borderBottom: '2px solid #eaeaea', paddingBottom: '10px' }}>
                                Sucursal: {empresa}
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {cotizacionesAgrupadas[empresa].map((cotizacion) => {
                                    const estatusInfo = getEstatusInfo(cotizacion.estado);

                                    const basePath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/menu') ? '/menu' : '/cliente';
                                    return (
                                        <div key={cotizacion.id} className={styles.card} 
                                            onClick={() => navigate(`${basePath}/trabajo-detalle/${cotizacion.id}?tab=cotizacion`)} 
                                            style={{ cursor: 'pointer' }}>
                                            <div className={styles.cardContent}>
                                                <div className={styles.cardIcon}>
                                                    <HiOutlineDocumentText className={styles.iconDoc} />
                                                </div>

                                                <div className={styles.cardInfo}>
                                                    <div className={styles.cardHeader}>
                                                        <div>
                                                            <h3 className={styles.concepto}>{cotizacion.titulo}</h3>
                                                            <span className={styles.negocio}>{cotizacion.ubicacion}</span>
                                                        </div>
                                                    </div>

                                                    <div className={styles.cardFooter}>
                                                        <span className={styles.fecha}>Actualizada: {cotizacion.cotizacion?.fecha || cotizacion.fecha}</span>

                                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                            <div className={`${styles.statusBadge} ${estatusInfo.cssClass}`}>
                                                                {estatusInfo.text === "Aceptada" ? (
                                                                    <HiOutlineCheckCircle className={styles.statusIcon} />
                                                                ) : estatusInfo.text === "Rechazada" ? (
                                                                    <HiOutlineXCircle className={styles.statusIcon} />
                                                                ) : (
                                                                    <HiOutlineDocumentText className={styles.statusIcon} />
                                                                )}
                                                                {estatusInfo.text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Indicador inferior simulando el border-bottom estético */}
                                            <div className={`${styles.cardIndicator} ${estatusInfo.borderClass}`}></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '30px', border: '1px solid #eee' }}>
                        <p style={{ color: '#666', fontSize: '16px' }}>No tienes cotizaciones registradas por el momento.</p>
                    </div>
                )}
            </div>

            {/* MODAL DETALLE DE COTIZACION Y REPORTE */}
            {selectedCotizacion && (
                <div className={menuStyles.modalOverlay} onClick={(e) => {
                    if (e.target === e.currentTarget) setSelectedCotizacion(null);
                }}>
                    <div className={menuStyles.modalContent} style={{ maxWidth: '700px', width: '90%', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
                            <h2 style={{ margin: 0, color: '#333' }}>Detalles de Cotización</h2>
                            <button
                                onClick={() => setSelectedCotizacion(null)}
                                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: '20px' }}>
                            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', borderLeft: '4px solid #FFB800' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#d49a00', fontSize: '18px' }}>{selectedCotizacion.titulo}</h3>
                                <p style={{ margin: 0, color: '#555', fontSize: '15px', lineHeight: '1.5' }}>{selectedCotizacion.descripcion || 'Sin descripción.'}</p>
                                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                    <span style={{ background: '#fff9e6', color: '#d49a00', padding: '5px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                                        Estado: {selectedCotizacion.estado}
                                    </span>
                                </div>
                            </div>

                            {selectedCotizacion.cotizacion && (
                                <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee' }}>
                                    <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '16px' }}>💰 Información de Cotización</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#777', fontSize: '14px' }}>Costo:</span>
                                            <span style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>${selectedCotizacion.cotizacion.costo}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#777', fontSize: '14px' }}>Fecha:</span>
                                            <span style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>{selectedCotizacion.cotizacion.fecha}</span>
                                        </div>
                                        <div>
                                            <span style={{ color: '#777', fontSize: '14px', display: 'block', marginBottom: '5px' }}>Notas:</span>
                                            <p style={{ margin: 0, color: '#555', fontSize: '14px', fontStyle: 'italic', background: '#fafafa', padding: '10px', borderRadius: '8px' }}>
                                                "{selectedCotizacion.cotizacion.notas || "Sin notas adicionales."}"
                                            </p>
                                        </div>
                                        {selectedCotizacion.cotizacion.archivo && (
                                            <div style={{ marginTop: '10px' }}>
                                                <a
                                                    href={selectedCotizacion.cotizacion.archivo}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ display: 'inline-flex', padding: '8px 15px', background: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold' }}
                                                >
                                                    📎 Ver Documento PDF
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* REPORTE CENTRALIZADO (SI EXISTE) */}
                            {reportData ? (
                                <div style={{ borderTop: '2px solid #eaeaea', paddingTop: '20px', marginTop: '10px' }}>
                                    <h3 style={{ marginBottom: '15px', color: '#2e7d32' }}>Reporte de Finalización</h3>
                                    <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #ddd' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            {reportData.reporteTienda && (
                                                <div>
                                                    <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Diagnóstico / Tienda:</span>
                                                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '8px', fontSize: '14px', color: '#333' }}>
                                                        {reportData.reporteTienda}
                                                    </div>
                                                </div>
                                            )}

                                            {reportData.descripcion && (
                                                <div>
                                                    <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Descripción del trabajo:</span>
                                                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '8px', fontSize: '14px', color: '#333' }}>
                                                        {reportData.descripcion}
                                                    </div>
                                                </div>
                                            )}

                                            {reportData.materiales && (
                                                <div>
                                                    <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Materiales utilizados:</span>
                                                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '8px', fontSize: '14px', color: '#333' }}>
                                                        {reportData.materiales}
                                                    </div>
                                                </div>
                                            )}

                                            {reportData.observaciones && (
                                                <div>
                                                    <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '4px' }}>Observaciones adicionales:</span>
                                                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '8px', fontSize: '14px', color: '#333' }}>
                                                        {reportData.observaciones}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Evidencia Fotográfica */}
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
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(reportData.imagenes.antes); }}
                                                                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                                />
                                                            </div>
                                                        )}
                                                        {reportData.imagenes.durante && (
                                                            <div style={{ textAlign: 'center' }}>
                                                                <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Durante</span>
                                                                <img
                                                                    src={reportData.imagenes.durante}
                                                                    alt="Durante"
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(reportData.imagenes.durante); }}
                                                                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                                />
                                                            </div>
                                                        )}
                                                        {reportData.imagenes.despues && (
                                                            <div style={{ textAlign: 'center' }}>
                                                                <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Después</span>
                                                                <img
                                                                    src={reportData.imagenes.despues}
                                                                    alt="Después"
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(reportData.imagenes.despues); }}
                                                                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer' }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Firma de Validación */}
                                            {reportData.firmaEmpresa && (
                                                <div style={{ marginTop: '10px' }}>
                                                    <span style={{ color: '#777', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Firma de Validación:</span>
                                                    <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
                                                        <img
                                                            src={reportData.firmaEmpresa}
                                                            alt="Firma"
                                                            onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(reportData.firmaEmpresa); }}
                                                            style={{ height: '60px', objectFit: 'contain', cursor: 'pointer' }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ borderTop: '2px solid #eaeaea', paddingTop: '20px', marginTop: '10px' }}>
                                    <h3 style={{ marginBottom: '15px' }}>Tareas del Trabajo</h3>
                                    {cotizacionTasks.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            {cotizacionTasks.map(tarea => (
                                                <div key={tarea.id} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
                                                    <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#333' }}>{tarea.titulo}</h4>
                                                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{tarea.descripcion}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: '#999', fontStyle: 'italic', fontSize: '14px', textAlign: 'center' }}>No hay tareas detalladas registradas.</p>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* IMAGE ZOOM MODAL */}
            {selectedZoomImage && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0, 0, 0, 0.85)', zIndex: 9999, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: '20px',
                        backdropFilter: 'blur(5px)'
                    }}
                    onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(null); }}
                >
                    <div style={{ position: 'relative', maxWidth: '95%', maxHeight: '95%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(null); }}
                            style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: '#fff', fontSize: '30px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ×
                        </button>
                        <img
                            src={selectedZoomImage}
                            alt="Zoomed Evidence"
                            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            {/* MODAL DE FILTRO */}
            {isFilterModalOpen && (
                <div className={menuStyles.modalOverlay}>
                    <div className={menuStyles.modalContent}>
                        <h3 className={menuStyles.modalTitle}>Filtrar Cotizaciones</h3>

                        <div className={menuStyles.filterSection}>
                            <span className={menuStyles.filterSubtitle}>Estatus</span>
                            <div className={menuStyles.radioGroup}>
                                {["Todas", "Pendientes", "Aceptadas", "Rechazadas"].map(status => (
                                    <label key={status} className={menuStyles.radioLabel}>
                                        <input
                                            type="radio"
                                            name="status"
                                            checked={tempFilter === status}
                                            onChange={() => setTempFilter(status)}
                                        />
                                        <span>{status}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className={menuStyles.modalActions}>
                            <button className={menuStyles.applyBtn} onClick={handleApplyFilter}>Aplicar Filtro</button>
                            <button className={menuStyles.cancelBtn} onClick={() => setIsFilterModalOpen(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cotizaciones;
