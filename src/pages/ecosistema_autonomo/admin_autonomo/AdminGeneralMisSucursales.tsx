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

const AdminGeneralMisSucursales: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [negocios, setNegocios] = useState<Negocio[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
    const [coverErrors, setCoverErrors] = useState<Record<number, boolean>>({});
    const [openId, setOpenId] = useState<number | null>(null); // ID del acordeón abierto

    useEffect(() => {
        const fetchNegocios = async () => {
            try {
                const data = await getNegocios();
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
