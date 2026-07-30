import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMantenimientoSolicitudes } from "../../services/mantenimientoService";
import styles from "./ListaSolicitudes.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";

// Usamos el mismo diseño base pero enfocado en mantenimiento

const ListaMantenimiento: React.FC = () => {
    const [searchText, setSearchText] = useState("");
    const navigate = useNavigate();
    const { user } = useAuth();

    const [solicitudes, setSolicitudes] = useState<any[]>([]);

    const fetchSolicitudes = async () => {
        try {
            const data = await getMantenimientoSolicitudes();
            setSolicitudes(data);
        } catch (error) {
            console.error("Error al obtener solicitudes de mantenimiento:", error);
        }
    };

    useEffect(() => {
        fetchSolicitudes();
    }, []);

    const filteredRequests = solicitudes.filter((req) => {
        const searchTextLower = searchText.toLowerCase();
        return req.negocio?.nombre?.toLowerCase().includes(searchTextLower) ||
               req.levantamiento_equipo?.nombre?.toLowerCase().includes(searchTextLower) ||
               req.estado.toLowerCase().includes(searchTextLower);
    });

    const renderStatusBar = (job: any) => {
        const status = (job.estado || "Pendiente").toLowerCase();
        let barClass = styles.yellow;

        if (status === "finalizado") {
            barClass = styles.green;
        } else if (status.includes("asignada") || status.includes("trabajo asignado")) {
            barClass = styles.blue;
        }

        return (
            <div className={`${styles.statusBar} ${barClass}`}>
                {job.estado}
            </div>
        );
    };

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.leftColumn}>
                <div className={styles.searchSection} style={{ marginTop: '20px' }}>
                    <div className={menuStyles.searchCard}>
                        <input
                            type="text"
                            placeholder="Buscar por negocio o equipo..."
                            className={menuStyles.searchInput}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.jobsSection}>
                    {filteredRequests.length === 0 ? (
                        <p style={{ color: '#64748b', textAlign: 'center', marginTop: '20px' }}>No hay solicitudes de mantenimiento activas.</p>
                    ) : (
                        filteredRequests.map((req, index) => {
                            const stackIndex = Math.min(index, 5);
                            return (
                                <div 
                                    key={req.id} 
                                    style={{ 
                                        position: 'sticky', 
                                        top: `calc(10px + ${stackIndex * 14}px)`, 
                                        zIndex: index, 
                                        paddingBottom: '15px' 
                                    }}
                                >
                                    <div
                                        className={styles.jobCard}
                                        onClick={() => navigate(user?.role === 'admin' ? `/menu/mantenimiento-detalle/${req.id}` : `/tecnico/mantenimiento-detalle/${req.id}`)}
                                    >
                                        {renderStatusBar(req)}
                                        <div className={styles.cardContent}>
                                            <div className={styles.cardContentMainRow}>
                                                {/* Left Column: Info */}
                                                <div className={styles.cardInfoCol}>
                                                    <div className={styles.headerRow}>
                                                        <div className={styles.dateGroup}>
                                                            <p className={styles.strikingDate}>
                                                                {new Date(req.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={styles.cardInfo}>
                                                        <h3 style={{ marginBottom: '5px' }}>{req.negocio?.nombre || 'Negocio desconocido'}</h3>
                                                        
                                                        <div className={styles.descriptionBox} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                            {req.levantamiento_equipo?.foto ? (
                                                                <img
                                                                    src={req.levantamiento_equipo.foto}
                                                                    alt={req.levantamiento_equipo.nombre}
                                                                    style={{
                                                                        width: '50px',
                                                                        height: '50px',
                                                                        borderRadius: '8px',
                                                                        objectFit: 'cover',
                                                                        border: '1px solid #cbd5e1',
                                                                        flexShrink: 0
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div style={{
                                                                    width: '50px',
                                                                    height: '50px',
                                                                    borderRadius: '8px',
                                                                    background: '#f1f5f9',
                                                                    border: '1px solid #cbd5e1',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#64748b',
                                                                    flexShrink: 0
                                                                }}>
                                                                    📦
                                                                </div>
                                                            )}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div className={styles.equipmentBadge} style={{ marginBottom: '6px', marginTop: 0 }}>
                                                                    Equipo: {req.levantamiento_equipo?.nombre || 'Desconocido'} ({req.levantamiento_equipo?.marca})
                                                                </div>
                                                                <p style={{ fontStyle: 'italic', color: '#dc2626', margin: 0, fontSize: '13px' }}>
                                                                    " {req.descripcion_problema} "
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Column: Business Logo */}
                                                <div className={styles.businessLogoWrapper}>
                                                    {req.negocio?.imagen_perfil ? (
                                                        <img
                                                            src={req.negocio?.imagen_perfil}
                                                            alt={req.negocio?.nombre}
                                                            className={styles.businessAvatar}
                                                        />
                                                    ) : req.negocio?.imagen_portada ? (
                                                        <img
                                                            src={req.negocio?.imagen_portada}
                                                            alt={req.negocio?.nombre}
                                                            className={styles.businessAvatar}
                                                        />
                                                    ) : (
                                                        <div className={styles.businessAvatarPlaceholder}>
                                                            {req.negocio?.nombre ? req.negocio.nombre.substring(0, 2).toUpperCase() : 'SU'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={styles.footerRow}>
                                                <span className={styles.tecnicoInfo}>
                                                    Cliente: {req.cliente?.name || 'Cliente desconocido'}
                                                </span>
                                                <span className={styles.tipoBadge}>
                                                    Revisión
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ListaMantenimiento;
