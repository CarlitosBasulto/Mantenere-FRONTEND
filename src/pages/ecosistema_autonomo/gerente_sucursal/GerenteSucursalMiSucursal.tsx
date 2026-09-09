import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getNegocio } from "../../../services/autonomo/negociosService";
import {
    HiOutlineMapPin,
    HiOutlinePencilSquare,
    HiOutlineClipboardDocumentList,
    HiOutlineBriefcase,
    HiOutlineCalendarDays,
    HiOutlineArrowRight,
    HiOutlineExclamationCircle,
    HiArrowPath,
} from "react-icons/hi2";
import { getTrabajos } from "../../../services/trabajosService";
import styles from "./GerenteSucursalMiSucursal.module.css";

const GerenteSucursalMiSucursal: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [negocio, setNegocio] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [coverError, setCoverError] = useState(false);

    // TABLERO METRICS STATE
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [metrics, setMetrics] = useState({ porAutorizar: 0, sosActivo: 0, autorizados: 0, porHacer: 0, enProceso: 0, finalizados: 0 });

    const fetchMetrics = async () => {
        if (!user?.negocio_id) return;
        setMetricsLoading(true);
        try {
            const trabajos = await getTrabajos({ negocio_id: user.negocio_id });
            
            const isSOSJob = (t: any) => t.tipo === 'SOS' || t.prioridad === 'Emergencia' || (t.titulo || '').includes('SOS') || t.isEmergency;

            const porAutorizar = trabajos.filter((t: any) => ['Solicitud', 'Pendiente', 'Cotización Enviada'].includes(t.estado) && !isSOSJob(t)).length;
            const sosActivo = trabajos.filter((t: any) => isSOSJob(t) && !['Finalizado', 'Completado', 'Rechazada', 'Cotización Rechazada'].includes(t.estado)).length;
            const autorizados = trabajos.filter((t: any) => ['En Espera', 'Aceptada', 'Cotización Aceptada'].includes(t.estado) && !isSOSJob(t)).length;
            const porHacer = trabajos.filter((t: any) => t.estado === 'Asignado' && t.tipo !== 'Trabajo' && !isSOSJob(t)).length;
            const enProceso = trabajos.filter((t: any) => (t.estado === 'En Proceso' || (t.estado === 'Asignado' && t.tipo === 'Trabajo')) && !isSOSJob(t)).length;
            const finalizados = trabajos.filter((t: any) => ['Finalizado', 'Completado'].includes(t.estado)).length;
            
            setMetrics({ porAutorizar, sosActivo, autorizados, porHacer, enProceso, finalizados });
        } catch (error) {
            console.error("Error al cargar trabajos para tablero", error);
        } finally {
            setMetricsLoading(false);
        }
    };

    useEffect(() => {
        const fetchSucursal = async () => {
            if (!user?.negocio_id) {
                setLoading(false);
                return;
            }
            try {
                const data = await getNegocio(user.negocio_id);
                setNegocio(data);
                fetchMetrics(); // Fetch metrics on load
            } catch (err) {
                console.error("Error al cargar sucursal:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSucursal();
    }, [user?.negocio_id]);

    if (loading) {
        return (
            <div className={styles.loadingWrapper}>
                <div className={styles.spinner} />
                <p>Cargando tu sucursal...</p>
            </div>
        );
    }

    if (!user?.negocio_id || !negocio) {
        return (
            <div className={styles.emptyWrapper}>
                <HiOutlineExclamationCircle size={56} className={styles.emptyIcon} />
                <h2>Sin sucursal asignada</h2>
                <p>Aun no tienes una sucursal asignada. Comunicat con tu administrador.</p>
            </div>
        );
    }

    const buildUbicacion = () => {
        if (negocio.tipo === "W/M") {
            return [negocio.calleAv, negocio.manzana ? "Mza " + negocio.manzana : "", negocio.lote ? "Lote " + negocio.lote : ""]
                .filter(Boolean).join(", ");
        }
        return [
            negocio.tipo !== "FS" && negocio.nombrePlaza ? negocio.nombrePlaza : "",
            negocio.calle,
            negocio.numero ? "#" + negocio.numero : "",
            negocio.colonia,
        ].filter(Boolean).join(", ");
    };

    const ciudad = [negocio.ciudad, negocio.estado].filter(Boolean).join(", ");
    const ubicacion = buildUbicacion();
    const fechaRegistro = negocio.created_at
        ? new Date(negocio.created_at).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })
        : "";

    return (
        <div className={styles.page}>
            {/* HERO BANNER */}
            <div
                className={styles.heroBanner}
                style={
                    negocio.imagen_portada && !coverError
                        ? { backgroundImage: "url(" + negocio.imagen_portada + ")" }
                        : {}
                }
            >
                <div className={styles.heroOverlay} />

                <div className={styles.logoWrapper}>
                    {negocio.imagenPerfil && !imageError ? (
                        <img
                            src={negocio.imagenPerfil}
                            alt={negocio.nombre}
                            className={styles.logoImg}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className={styles.logoPlaceholder}>
                            {(negocio.nombre || "S").substring(0, 2).toUpperCase()}
                        </div>
                    )}
                </div>

                <div className={styles.heroInfo}>
                    <span className={styles.heroBadge}>{negocio.tipo || "Sucursal"}</span>
                    <h1 className={styles.heroTitle}>{negocio.nombre}</h1>
                    {ciudad && (
                        <p className={styles.heroCity}>
                            <HiOutlineMapPin size={16} />
                            {" "}{ciudad}
                        </p>
                    )}
                </div>
            </div>

            {/* CONTENIDO */}
            <div className={styles.content}>
                
                {/* IZQUIERDA: TABLERO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className={styles.miniTablero}>
                        <div className={styles.miniTableroHeader}>
                            <span className={styles.miniTableroTitle}>📊 Tablero de Control — {negocio.nombre}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {metricsLoading && <span className={styles.miniLoading}>Cargando...</span>}
                                <button 
                                    onClick={fetchMetrics}
                                    className={styles.miniRefreshBtn}
                                    title="Actualizar tablero"
                                    disabled={metricsLoading}
                                >
                                    <HiArrowPath size={14} className={metricsLoading ? styles.spin : ''} />
                                </button>
                            </div>
                        </div>
                        <div className={styles.miniTableroGrid}>
                            <div className={`${styles.miniCard} ${styles.miniCardYellow}`}>
                                <span className={styles.miniIcon}>🟡</span>
                                <span className={styles.miniCount}>{metricsLoading ? '...' : metrics.porAutorizar}</span>
                                <span className={styles.miniLabel}>Por Autorizar</span>
                            </div>
                            <div className={`${styles.miniCard} ${styles.miniCardRed}`}>
                                <span className={styles.miniIcon}>🔴</span>
                                <span className={styles.miniCount}>{metricsLoading ? '...' : metrics.sosActivo}</span>
                                <span className={styles.miniLabel}>SOS Activo</span>
                            </div>
                            <div className={`${styles.miniCard} ${styles.miniCardBlue}`}>
                                <span className={styles.miniIcon}>🔵</span>
                                <span className={styles.miniCount}>{metricsLoading ? '...' : metrics.autorizados}</span>
                                <span className={styles.miniLabel}>Autorizados</span>
                            </div>
                            <div className={`${styles.miniCard} ${styles.miniCardOrange}`}>
                                <span className={styles.miniIcon}>🟠</span>
                                <span className={styles.miniCount}>{metricsLoading ? '...' : metrics.porHacer}</span>
                                <span className={styles.miniLabel}>Por Hacer</span>
                            </div>
                            <div className={`${styles.miniCard} ${styles.miniCardGreen}`}>
                                <span className={styles.miniIcon}>🟢</span>
                                <span className={styles.miniCount}>{metricsLoading ? '...' : metrics.enProceso}</span>
                                <span className={styles.miniLabel}>En Proceso</span>
                            </div>
                            <div className={`${styles.miniCard} ${styles.miniCardPurple}`}>
                                <span className={styles.miniIcon}>🟣</span>
                                <span className={styles.miniCount}>{metricsLoading ? '...' : metrics.finalizados}</span>
                                <span className={styles.miniLabel}>Finalizados</span>
                            </div>
                        </div>
                        <button
                            className={styles.miniTableroBtn}
                            onClick={() => navigate(`/gerente-sucursal/trabajo/${negocio.id}`)}
                        >
                            Ver Trabajos Detallados &rarr;
                        </button>
                    </div>
                </div>

                {/* DERECHA: DETALLES Y ACCIONES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* DETALLES */}
                    <div className={styles.detailsCard}>
                    <h2 className={styles.cardTitle}>Informacion de la Sucursal</h2>
                    <div className={styles.detailGrid}>
                        {ubicacion ? (
                            <div className={styles.detailItem}>
                                <HiOutlineMapPin className={styles.detailIcon} />
                                <div>
                                    <span className={styles.detailLabel}>Direccion</span>
                                    <span className={styles.detailValue}>{ubicacion}</span>
                                </div>
                            </div>
                        ) : null}
                        {negocio.cp ? (
                            <div className={styles.detailItem}>
                                <HiOutlineClipboardDocumentList className={styles.detailIcon} />
                                <div>
                                    <span className={styles.detailLabel}>Codigo Postal</span>
                                    <span className={styles.detailValue}>{negocio.cp}</span>
                                </div>
                            </div>
                        ) : null}
                        {negocio.gerente ? (
                            <div className={styles.detailItem}>
                                <HiOutlineBriefcase className={styles.detailIcon} />
                                <div>
                                    <span className={styles.detailLabel}>Gerente</span>
                                    <span className={styles.detailValue}>{negocio.gerente}</span>
                                </div>
                            </div>
                        ) : null}
                        {fechaRegistro ? (
                            <div className={styles.detailItem}>
                                <HiOutlineCalendarDays className={styles.detailIcon} />
                                <div>
                                    <span className={styles.detailLabel}>Registrada el</span>
                                    <span className={styles.detailValue}>{fechaRegistro}</span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* ACCIONES */}
                <div className={styles.actionsCard}>
                    <h2 className={styles.cardTitle}>Acciones Rapidas</h2>
                    <div className={styles.actionButtons}>

                        <button
                            className={styles.actionBtn}
                            onClick={() => navigate("/gerente-sucursal/sucursal?id=" + negocio.id)}
                        >
                            <HiOutlinePencilSquare size={22} />
                            <span>Editar Sucursal</span>
                            <HiOutlineArrowRight size={18} className={styles.actionArrow} />
                        </button>

                        <button
                            className={styles.actionBtn}
                            onClick={() => navigate("/gerente-sucursal/trabajo/" + negocio.id)}
                        >
                            <HiOutlineClipboardDocumentList size={22} />
                            <span>Ver Trabajos</span>
                            <HiOutlineArrowRight size={18} className={styles.actionArrow} />
                        </button>

                        <button
                            className={styles.actionBtn}
                            onClick={() => navigate("/gerente-sucursal/historial")}
                        >
                            <HiOutlineCalendarDays size={22} />
                            <span>Historial</span>
                            <HiOutlineArrowRight size={18} className={styles.actionArrow} />
                        </button>

                        <button
                            className={styles.actionBtn}
                            onClick={() => navigate("/gerente-sucursal/cotizaciones")}
                        >
                            <HiOutlineBriefcase size={22} />
                            <span>Cotizaciones</span>
                            <HiOutlineArrowRight size={18} className={styles.actionArrow} />
                        </button>

                    </div>
                </div>
                </div>

            </div>
        </div>
    );
};

export default GerenteSucursalMiSucursal;
