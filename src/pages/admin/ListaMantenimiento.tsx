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
                <h2>Reportes de Mantenimiento</h2>
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
                        filteredRequests.map((req) => (
                            <div
                                key={req.id}
                                className={styles.jobCard}
                                onClick={() => navigate(user?.role === 'admin' ? `/menu/mantenimiento-detalle/${req.id}` : `/tecnico/mantenimiento-detalle/${req.id}`)}
                            >
                                {renderStatusBar(req)}
                                <div className={styles.cardContent}>
                                    <div className={styles.headerRow}>
                                        <div className={styles.dateGroup}>
                                            <p className={styles.strikingDate}>
                                                📅 {new Date(req.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={styles.cardInfo}>
                                        <h3 style={{ marginBottom: '5px' }}>{req.negocio?.nombre || 'Negocio desconocido'}</h3>
                                        <div className={styles.descriptionBox}>
                                            <div className={styles.equipmentBadge} style={{ marginBottom: '10px' }}>
                                                📦 Equipo: {req.levantamiento_equipo?.nombre || 'Desconocido'} ({req.levantamiento_equipo?.marca})
                                            </div>
                                            <p style={{ fontStyle: 'italic', color: '#dc2626' }}>
                                                " {req.descripcion_problema} "
                                            </p>
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
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ListaMantenimiento;
