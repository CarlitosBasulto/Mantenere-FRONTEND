import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getNegocios } from "../../../services/autonomo/negociosService";
import {
    HiOutlineMapPin,
    HiOutlinePencilSquare,
    HiOutlineClipboardDocumentList,
    HiOutlineBriefcase,
    HiOutlineCalendarDays,
    HiOutlineArrowRight,
    HiOutlineExclamationCircle,
    HiOutlineUserGroup,
    HiOutlineChevronDown,
    HiOutlinePlus,
} from "react-icons/hi2";
import styles from "./AdminGeneralMisSucursales.module.css";

interface Negocio {
    id: number;
    nombre: string;
    tipo?: string;
    ciudad?: string;
    estado?: string;
    calle?: string;
    numero?: string;
    colonia?: string;
    calleAv?: string;
    manzana?: string;
    lote?: string;
    nombrePlaza?: string;
    cp?: string;
    gerente?: string;
    created_at?: string;
    imagenPerfil?: string;
    imagen_portada?: string;
}

const isSOSJob = (t: any) => t.tipo === 'SOS' || t.prioridad === 'Emergencia' || (t.titulo || '').includes('SOS') || t.isEmergency;

const AdminGeneralMisSucursales: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [negocios, setNegocios] = useState<Negocio[]>([]);
    const [rechazados, setRechazados] = useState<any[]>([]);
    const [allTrabajos, setAllTrabajos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
    const [coverErrors, setCoverErrors] = useState<Record<number, boolean>>({});
    const [openId, setOpenId] = useState<number | null>(null); // ID del acordeón abierto

    useEffect(() => {
        const fetchNegocios = async () => {
            try {
                const [data, trabajosData] = await Promise.all([getNegocios(), import('../../../services/trabajosService').then(m => m.getTrabajos())]);
                setAllTrabajos(trabajosData || []);
                const rejectedJobs = (trabajosData || []).filter((t: any) => t.estado === 'Rechazada');
                setRechazados(rejectedJobs);
                setNegocios(Array.isArray(data) ? data : []);
                // Abre el primero por defecto
                if (Array.isArray(data) && data.length > 0) {
                    setOpenId(data[0].id);
                }
            } catch (err) {
                console.error("Error al cargar sucursales:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNegocios();
    }, []);

    const toggleOpen = (id: number) => {
        setOpenId(prev => (prev === id ? null : id));
    };

    const buildUbicacion = (negocio: Negocio) => {
        if (negocio.tipo === "W/M") {
            return [
                negocio.calleAv,
                negocio.manzana ? "Mza " + negocio.manzana : "",
                negocio.lote ? "Lote " + negocio.lote : "",
            ].filter(Boolean).join(", ");
        }
        return [
            negocio.tipo !== "FS" && negocio.nombrePlaza ? negocio.nombrePlaza : "",
            negocio.calle,
            negocio.numero ? "#" + negocio.numero : "",
            negocio.colonia,
        ].filter(Boolean).join(", ");
    };

    if (loading) {
        return (
            <div className={styles.loadingWrapper}>
                <div className={styles.spinner} />
                <p>Cargando tus sucursales...</p>
            </div>
        );
    }

    if (negocios.length === 0) {
        return (
            <div className={styles.emptyWrapper}>
                <HiOutlineExclamationCircle size={56} className={styles.emptyIcon} />
                <h2>Sin sucursales registradas</h2>
                <p>Aún no tienes sucursales. Registra la primera para comenzar.</p>
                <button
                    className={styles.actionBtn}
                    onClick={() => navigate("/autonomo/perfil-empresa")}
                    style={{ marginTop: "16px", width: "auto" }}
                >
                    <HiOutlinePlus size={20} />
                    <span>Registrar primera sucursal</span>
                </button>
            </div>
        );
    }

    return (
        <div className={styles.page}>

            {/* Encabezado de la página */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Mis Sucursales</h1>
                    <p className={styles.pageSubtitle}>{negocios.length} sucursal{negocios.length !== 1 ? "es" : ""} registrada{negocios.length !== 1 ? "s" : ""}</p>
                </div>
                <button
                    className={styles.actionBtn}
                    onClick={() => navigate("/autonomo/perfil-empresa")}
                    style={{ width: "auto", padding: "12px 20px" }}
                >
                    <HiOutlinePlus size={18} />
                    <span>Registrar Sucursal</span>
                </button>
            </div>



            {/* SECCIÓN DE TRABAJOS RECHAZADOS */}
            {rechazados.length > 0 && (
                <div style={{ marginBottom: "32px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "16px", padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                        <h2 style={{ margin: 0, color: "#991b1b", fontSize: "20px", fontWeight: "800" }}>Trabajos Rechazados ({rechazados.length})</h2>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                        {rechazados.map((t) => (
                            <div key={t.id} style={{ background: "#ffffff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #fee2e2" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#ef4444", background: "#fef2f2", padding: "4px 8px", borderRadius: "6px" }}>#{t.id} • RECHAZADA</span>
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>{new Date(t.created_at).toLocaleDateString()}</span>
                                </div>
                                <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#1e293b" }}>{t.titulo}</h4>
                                <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 8px 0" }}><strong>Sucursal:</strong> {t.negocio?.nombre || "N/A"}</p>
                                <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 12px 0" }}><strong>Rechazado por:</strong> {t.rechazado_por_nombre || "Técnico"}</p>
                                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", borderLeft: "3px solid #ef4444", marginBottom: "16px" }}>
                                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>Motivo:</span>
                                    <span style={{ fontSize: "13px", color: "#334155", fontStyle: "italic" }}>"{t.motivo_rechazo || "Sin motivo especificado"}"</span>
                                </div>
                                <button 
                                    onClick={() => navigate(`/autonomo/trabajo-detalle/${t.id}`)}
                                    style={{ width: "100%", padding: "10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", transition: "background 0.2s" }}
                                    onMouseOver={(e) => (e.currentTarget.style.background = "#dc2626")}
                                    onMouseOut={(e) => (e.currentTarget.style.background = "#ef4444")}
                                >
                                    Reasignar Trabajo →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Lista acordeón */}
            <div className={styles.accordionList}>
                {negocios.map((negocio) => {
                    const isOpen = openId === negocio.id;
                    const ciudad = [negocio.ciudad, negocio.estado].filter(Boolean).join(", ");
                    const ubicacion = buildUbicacion(negocio);
                    const fechaRegistro = negocio.created_at
                        ? new Date(negocio.created_at).toLocaleDateString("es-MX", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                          })
                        : "";

                    return (
                        <div
                            key={negocio.id}
                            className={`${styles.accordionItem} ${isOpen ? styles.open : ""}`}
                        >
                            {/* ── CABECERA CLICKEABLE ── */}
                            <button
                                className={styles.accordionHeader}
                                style={
                                    negocio.imagen_portada && !coverErrors[negocio.id]
                                        ? { backgroundImage: `url(${negocio.imagen_portada})` }
                                        : {}
                                }
                                onClick={() => toggleOpen(negocio.id)}
                            >
                                <div className={styles.heroOverlay} />

                                {/* Logo */}
                                <div className={styles.logoWrapper}>
                                    {negocio.imagenPerfil && !imageErrors[negocio.id] ? (
                                        <img
                                            src={negocio.imagenPerfil}
                                            alt={negocio.nombre}
                                            className={styles.logoImg}
                                            onError={() =>
                                                setImageErrors(prev => ({ ...prev, [negocio.id]: true }))
                                            }
                                        />
                                    ) : (
                                        <div className={styles.logoPlaceholder}>
                                            {(negocio.nombre || "S").substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className={styles.heroInfo}>
                                    {negocio.tipo && (
                                        <span className={styles.heroBadge}>{negocio.tipo}</span>
                                    )}
                                    <h2 className={styles.heroTitle}>{negocio.nombre}</h2>
                                    {ciudad && (
                                        <p className={styles.heroCity}>
                                            <HiOutlineMapPin size={14} /> {ciudad}
                                        </p>
                                    )}
                                </div>

                                {/* Chevron */}
                                <HiOutlineChevronDown
                                    size={22}
                                    className={`${styles.chevron} ${isOpen ? styles.rotated : ""}`}
                                />
                            </button>

                            {/* ── CUERPO DESPLEGABLE ── */}
                            <div className={`${styles.accordionBody} ${isOpen ? styles.open : ""}`}>
                                <div className={styles.accordionContent}>

                                    {/* TABLERO DETALLES */}
                                    <div className={styles.tableroWrapper} style={{ marginBottom: '24px' }}>
                                        <h3 className={styles.tableroTitle}>TABLERO DETALLES</h3>
                                        <div className={styles.tableroGrid}>
                                            <div className={`${styles.tableroCard} ${styles.bgYellow}`}>
                                                <div className={styles.dotYellow}></div>
                                                <div className={styles.tableroCount}>
                                                    {allTrabajos.filter(t => t.negocio_id === negocio.id && ['Solicitud', 'Pendiente'].includes(t.estado) && !isSOSJob(t)).length}
                                                </div>
                                                <div className={styles.tableroLabel}>POR AUTORIZAR</div>
                                            </div>
                                            <div className={`${styles.tableroCard} ${styles.bgRed}`}>
                                                <div className={styles.dotRed}></div>
                                                <div className={styles.tableroCount}>
                                                    {allTrabajos.filter(t => t.negocio_id === negocio.id && isSOSJob(t) && !['Finalizado', 'Completado', 'Rechazada', 'Cotización Rechazada'].includes(t.estado)).length}
                                                </div>
                                                <div className={styles.tableroLabel}>SOS ACTIVO</div>
                                            </div>
                                            <div className={`${styles.tableroCard} ${styles.bgBlue}`}>
                                                <div className={styles.dotBlue}></div>
                                                <div className={styles.tableroCount}>
                                                    {allTrabajos.filter(t => t.negocio_id === negocio.id && ['En Espera', 'Aceptada', 'Cotización Aceptada'].includes(t.estado) && !isSOSJob(t)).length}
                                                </div>
                                                <div className={styles.tableroLabel}>AUTORIZADOS</div>
                                            </div>
                                            <div className={`${styles.tableroCard} ${styles.bgOrange}`}>
                                                <div className={styles.dotOrange}></div>
                                                <div className={styles.tableroCount}>
                                                    {allTrabajos.filter(t => t.negocio_id === negocio.id && t.estado === 'Asignado' && t.tipo !== 'Trabajo' && !isSOSJob(t)).length}
                                                </div>
                                                <div className={styles.tableroLabel}>POR HACER</div>
                                            </div>
                                            <div className={`${styles.tableroCard} ${styles.bgGreen}`}>
                                                <div className={styles.dotGreen}></div>
                                                <div className={styles.tableroCount}>
                                                    {allTrabajos.filter(t => t.negocio_id === negocio.id && (t.estado === 'En Proceso' || (t.estado === 'Asignado' && t.tipo === 'Trabajo')) && !isSOSJob(t)).length}
                                                </div>
                                                <div className={styles.tableroLabel}>EN PROCESO</div>
                                            </div>
                                            <div className={`${styles.tableroCard} ${styles.bgPurple}`}>
                                                <div className={styles.dotPurple}></div>
                                                <div className={styles.tableroCount}>
                                                    {allTrabajos.filter(t => t.negocio_id === negocio.id && t.estado === 'Cotización Enviada' && !isSOSJob(t)).length}
                                                </div>
                                                <div className={styles.tableroLabel}>COTIZACIONES</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Información de la sucursal */}
                                    <div className={styles.detailsCard}>
                                        <h3 className={styles.cardTitle}>Información de la Sucursal</h3>
                                        <div className={styles.detailGrid}>
                                            {ubicacion && (
                                                <div className={styles.detailItem}>
                                                    <HiOutlineMapPin className={styles.detailIcon} />
                                                    <div>
                                                        <span className={styles.detailLabel}>Dirección</span>
                                                        <span className={styles.detailValue}>{ubicacion}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {negocio.cp && (
                                                <div className={styles.detailItem}>
                                                    <HiOutlineClipboardDocumentList className={styles.detailIcon} />
                                                    <div>
                                                        <span className={styles.detailLabel}>Código Postal</span>
                                                        <span className={styles.detailValue}>{negocio.cp}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {negocio.gerente && (
                                                <div className={styles.detailItem}>
                                                    <HiOutlineBriefcase className={styles.detailIcon} />
                                                    <div>
                                                        <span className={styles.detailLabel}>Gerente / Encargado</span>
                                                        <span className={styles.detailValue}>{negocio.gerente}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {fechaRegistro && (
                                                <div className={styles.detailItem}>
                                                    <HiOutlineCalendarDays className={styles.detailIcon} />
                                                    <div>
                                                        <span className={styles.detailLabel}>Registrada el</span>
                                                        <span className={styles.detailValue}>{fechaRegistro}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Acciones rápidas del Admin General */}
                                    <div className={styles.actionsCard}>
                                        <h3 className={styles.cardTitle}>Acciones Rápidas</h3>
                                        <div className={styles.actionButtons}>

                                            <button
                                                className={styles.actionBtn}
                                                onClick={() =>
                                                    navigate(`/autonomo/perfil-empresa?id=${negocio.id}`)
                                                }
                                            >
                                                <HiOutlinePencilSquare size={18} />
                                                <span>Editar Sucursal</span>
                                                <HiOutlineArrowRight size={16} className={styles.actionArrow} />
                                            </button>

                                            <button
                                                className={styles.actionBtn}
                                                onClick={() =>
                                                    navigate(`/autonomo/trabajadores?negocio_id=${negocio.id}`)
                                                }
                                            >
                                                <HiOutlineUserGroup size={18} />
                                                <span>Gestionar Trabajadores</span>
                                                <HiOutlineArrowRight size={16} className={styles.actionArrow} />
                                            </button>

                                            <button
                                                className={styles.actionBtn}
                                                onClick={() =>
                                                    navigate(`/autonomo/historial?negocio_id=${negocio.id}`)
                                                }
                                            >
                                                <HiOutlineCalendarDays size={18} />
                                                <span>Historial de Trabajos</span>
                                                <HiOutlineArrowRight size={16} className={styles.actionArrow} />
                                            </button>

                                        </div>
                                    </div>

                                    {/* BOT�N VER TRABAJOS */}
                                    <div style={{ marginTop: '24px' }}>
                                        <button 
                                            onClick={() => navigate(`/autonomo/trabajo/${negocio.id}`)}
                                            style={{ width: '100%', padding: '14px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                            onMouseOver={(e) => (e.currentTarget.style.background = '#ea580c')}
                                            onMouseOut={(e) => (e.currentTarget.style.background = '#f97316')}
                                        >
                                            <HiOutlineClipboardDocumentList size={22} />
                                            Ver Detalles de Trabajo
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminGeneralMisSucursales;





