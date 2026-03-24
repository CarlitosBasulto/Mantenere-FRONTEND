import React, { useState, useEffect } from "react";
import styles from "./Cotizaciones.module.css";
import { HiOutlineDocumentText, HiOutlineCheckCircle, HiOutlineXCircle } from "react-icons/hi2";
import { useAuth } from "../../context/AuthContext";
import menuStyles from "../../components/Menu.module.css";
import { getTrabajos } from "../../services/trabajosService";
import { getCotizacionByTrabajoId } from "../../services/cotizacionesService";

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

const Cotizaciones: React.FC = () => {
    const { user } = useAuth();
    const [rawCotizaciones, setRawCotizaciones] = useState<TrabajoCotizado[]>([]);

    const [searchText, setSearchText] = useState("");
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("Todas");
    const [tempFilter, setTempFilter] = useState("Todas");

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // 1. Obtener todos los trabajos
                const allJobs = await getTrabajos();
                
                // 2. Extraer los trabajos que tengan una cotización (estado avanzado)
                const jobsWithCoti = allJobs.filter((job: any) => 
                     ['Cotización Enviada', 'Cotización Aceptada', 'Cotización Rechazada', 'Asignado', 'En Proceso', 'Finalizado'].includes(job.estado)
                );
                
                // 3. Si el usuario es cliente, filtrar solo sus negocios
                let filteredJobs = jobsWithCoti;
                if (user.role === 'cliente') {
                    // La asociación 'negocio' debería tener 'dueno' igual al nombre o al user asociado.
                    // Si el backend no tiene 'dueno', usamos la lógica de autenticación o la comparamos con user.name por ahora
                    // Asumimos que negocio.user_id = auth.user.id en el futuro, o comparamos strings
                    // Como parche intermedio de compatibilidad:
                    filteredJobs = jobsWithCoti.filter((j: any) => 
                        (j.negocio?.dueno === user.name) || 
                        (j.negocio?.user_id === user.id)
                    );
                }

                // 4. Buscar la info de cotizacion para mapearla
                const mapped = await Promise.all(filteredJobs.map(async (j: any) => {
                     let coti: any = null;
                     try {
                         coti = await getCotizacionByTrabajoId(j.id);
                     } catch(e) {}

                     // Parse date para el fallback
                     const jobFallbackDate = j.fecha_programada ? new Date(j.fecha_programada) : new Date(j.created_at);

                     return {
                         id: j.id,
                         titulo: j.titulo,
                         ubicacion: j.negocio?.nombre || 'Negocio',
                         fecha: jobFallbackDate.toISOString(), 
                         estado: j.estado,
                         descripcion: j.descripcion,
                         cotizacion: coti ? {
                             costo: coti.monto,
                             notas: coti.descripcion,
                             archivo: coti.archivo || "",
                             fecha: new Date(coti.created_at).toISOString()
                         } : undefined
                     };
                }));

                // 5. Ordenar por fecha (ISO strings hacen que sea fail-safe new Date(str).getTime())
                mapped.sort((a, b) => {
                    const dateA = a.cotizacion?.fecha || a.fecha;
                    const dateB = b.cotizacion?.fecha || b.fecha;
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                });

                // Convertir ISO string de nuevo a Formato legible "DD/MM/YYYY" para la UI de React
                const finalFormat = mapped.map(item => ({
                     ...item,
                     fecha: new Date(item.fecha).toLocaleDateString('es-MX'),
                     cotizacion: item.cotizacion ? {
                         ...item.cotizacion,
                         fecha: new Date(item.cotizacion.fecha).toLocaleDateString('es-MX')
                     } : undefined
                }));

                setRawCotizaciones(finalFormat as TrabajoCotizado[]);

            } catch(e) { 
                console.error("Error trayendo cotizaciones:", e); 
            }
        };

        fetchData();
    }, [user]);

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

                                    return (
                                        <div key={cotizacion.id} className={styles.card}>
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
                                                        <div className={styles.montoContainer}>
                                                            <span className={styles.monto}>${cotizacion.cotizacion?.costo}</span>
                                                        </div>
                                                    </div>

                                                    <div className={styles.cardFooter}>
                                                        <span className={styles.fecha}>Actualizada: {cotizacion.cotizacion?.fecha || cotizacion.fecha}</span>

                                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                            {/* Link al archivo PDF */}
                                                            {cotizacion.cotizacion?.archivo && (
                                                                <a
                                                                    href={cotizacion.cotizacion.archivo}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    style={{ fontSize: '12px', fontWeight: 'bold', color: '#007bff', textDecoration: 'none' }}
                                                                >
                                                                    Ver PDF 📎
                                                                </a>
                                                            )}

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
