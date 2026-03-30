import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTrabajos } from "../../services/trabajosService";
import styles from "./ListaSolicitudes.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";

interface Trabajo {
    id: number;
    titulo: string;
    ubicacion: string;
    tecnico: string;
    tecnicoUserId?: number | null;
    fecha: string;
    estado: string;
    tipo?: "Visita" | "Trabajo" | "Nueva Solicitud" | "SOS";
    visitado?: boolean;
    descripcion?: string;
    sucursal?: string;
    fechaAsignada?: string;
    horaAsignada?: string;
}

const ListaSolicitudes: React.FC = () => {
    const [searchText, setSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("Todos");
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [tempFilter, setTempFilter] = useState("Todos");

    const navigate = useNavigate();
    const { user } = useAuth();

    // DATA LOADING
    const [solicitudes, setSolicitudes] = useState<Trabajo[]>([]);

    useEffect(() => {
        const fetchSolicitudes = async () => {
            try {
                const apiJobs = await getTrabajos();
                // Filtramos por estados relevantes para la bandeja de "Nuevas Solicitudes"
                const activeJobs = apiJobs.filter((j: any) => 
                    j.estado === 'Pendiente' || 
                    j.estado === 'Solicitud' || 
                    j.estado === 'En Espera' || 
                    (j.estado === 'Asignado' && (j.prioridad !== 'Alta' && !j.titulo?.includes('SOS'))) ||
                    j.estado === 'Cotización Aceptada'
                );

                const mappedJobs = activeJobs.map((j: any) => ({
                    id: j.id,
                    titulo: j.titulo,
                    ubicacion: j.negocio?.ubicacion || j.negocio?.nombre || "Por definir",
                    tecnico: j.trabajador?.nombre || "Sin asignar",
                    tecnicoUserId: j.trabajador?.user_id || null,
                    fecha: j.fecha_programada ? (j.fecha_programada.includes('-') ? j.fecha_programada.split('-').reverse().join('/') : j.fecha_programada) : new Date(j.created_at).toLocaleDateString('es-MX'),
                    estado: j.estado === "Pendiente" ? "Solicitud" : j.estado,
                    tipo: j.prioridad === 'Alta' || j.titulo?.includes('SOS') ? "SOS" : "Nueva Solicitud",
                    sucursal: j.negocio?.nombre || "Por definir",
                    visitado: false,
                }));
                setSolicitudes(mappedJobs);
            } catch (error) {
                console.error("Error al obtener solicitudes desde la base de datos:", error);
            }
        };

        fetchSolicitudes();
    }, []);

    // FILTRADO
    const filteredRequests = solicitudes.filter((req) => {
        const searchTextLower = searchText.toLowerCase();
        const matchesText = req.titulo.toLowerCase().includes(searchTextLower) ||
            (req.sucursal || "").toLowerCase().includes(searchTextLower) ||
            req.tecnico.toLowerCase().includes(searchTextLower);

        if (user?.role === 'tecnico') {
            return matchesText && req.tecnicoUserId === user.id;
        }

        let matchesStatus = true;
        if (filterStatus !== "Todos") {
            const isDueño = req.tecnico === "Sin asignar" || !req.tecnico;
            if (filterStatus === "Dueño" && (!isDueño || req.estado === "Cotización Aceptada")) matchesStatus = false;
            if (filterStatus === "Técnico" && (isDueño || req.estado === "Cotización Aceptada")) matchesStatus = false;
            if (filterStatus === "Pagados" && req.estado !== "Cotización Aceptada") matchesStatus = false;
        }

        return matchesText && matchesStatus;
    });

    const handleApplyFilter = () => {
        setFilterStatus(tempFilter);
        setIsFilterModalOpen(false);
    };

    return (
        <div className={styles.dashboardLayout}>
            {/* COLUMNA IZQUIERDA - LISTA */}
            <div className={styles.leftColumn}>

                {/* BUSCADOR Y FILTRO */}
                <div className={styles.searchSection}>
                    <div className={menuStyles.searchCard}>
                        {/* INPUT BUSQUEDA */}
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className={menuStyles.searchInput}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />

                        {/* BOTON FILTRO */}
                        <button
                            className={menuStyles.filterBtn}
                            onClick={() => setIsFilterModalOpen(true)}
                        >
                            <span style={{ fontSize: '18px' }}>⚙️</span>
                        </button>
                    </div>
                </div>

                {/* LISTA DE SOLICITUDES */}
                <div className={styles.jobsSection}>
                    {filteredRequests.map((req) => (
                        <div
                            key={req.id}
                            className={styles.jobCard}
                            onClick={() => navigate(user?.role === 'tecnico' ? `/tecnico/trabajo-detalle/${req.id}` : `/menu/trabajo-detalle/${req.id}`)}
                            style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch' }}
                        >
                            {req.tipo === 'SOS' && req.estado === 'Solicitud' && (
                                <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 15px', borderRadius: '10px', marginBottom: '15px', fontWeight: 'bold', border: '1px solid #ffcdd2' }}>
                                    🚨 EMERGENCIA SOS: EL CLIENTE SOLICITA ATENCIÓN INMEDIATA
                                </div>
                            )}
                            {req.visitado && req.estado === 'Solicitud' && (
                                <div style={{ border: '1px solid #ff9800', background: '#fff3e0', color: '#e65100', padding: '10px 15px', borderRadius: '10px', marginBottom: '15px', fontWeight: 'bold' }}>
                                    🛡️ AVISO DE DIAGNÓSTICO<br />
                                    <span style={{ fontWeight: 'normal', fontSize: '14px', color: '#333' }}>Esta sucursal ya fue visitada y tiene un diagnóstico listo para ser revisado.</span>
                                </div>
                            )}
                            <div className={styles.cardContent}>
                                {/* ICONO (Placeholder de imagen) */}
                                <div className={styles.cardIcon}>
                                    🖼️
                                </div>
                                <div className={styles.cardInfo}>
                                    {(req.fechaAsignada || req.fecha) && (
                                        <div style={{ background: '#eef8f1', padding: '6px 14px', borderRadius: '15px', marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid #c8e6c9', width: 'fit-content' }}>
                                            <span style={{ color: '#137333', fontWeight: 'bold', fontSize: '13px' }}>
                                                📅 {req.fechaAsignada || req.fecha}
                                            </span>
                                            {req.horaAsignada && (
                                                <>
                                                    <span style={{ color: '#137333', fontWeight: 'bold', fontSize: '13px' }}>-</span>
                                                    <span style={{ color: '#137333', fontWeight: 'bold', fontSize: '13px' }}>
                                                        ⏰ {req.horaAsignada}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <h3>{req.titulo}</h3>
                                    <p>{req.tecnico !== "Sin asignar" ? `Técnico: ${req.tecnico}` : `Dueño: ${req.sucursal || "No registrado"}`}</p>
                                    {req.descripcion && <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', marginTop: '5px' }}>Obs: {req.descripcion.substring(0, 50)}...</p>}
                                </div>
                                {/* Indicador lateral AMARILLO o ROJO */}
                                <div className={`${styles.cardIndicator} ${req.tipo === 'SOS' && req.estado === 'Solicitud' ? '' : styles.yellow}`} style={req.tipo === 'SOS' && req.estado === 'Solicitud' ? { background: '#f44336' } : {}}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className={styles.rightColumn}>
            </div>

            {/* MODAL DE FILTRO */}
            {isFilterModalOpen && (
                <div className={menuStyles.modalOverlay}>
                    <div className={menuStyles.modalContent}>
                        <h3 className={menuStyles.modalTitle}>Filtrar Solicitudes</h3>

                        <div className={menuStyles.filterSection}>
                            <span className={menuStyles.filterSubtitle}>Estatus</span>
                            <div className={menuStyles.radioGroup}>
                                <label className={menuStyles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={tempFilter === "Todos"}
                                        onChange={() => setTempFilter("Todos")}
                                    />
                                    <span>Todos</span>
                                </label>

                                <label className={menuStyles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={tempFilter === "Dueño"}
                                        onChange={() => setTempFilter("Dueño")}
                                    />
                                    <span>Dueño</span>
                                </label>

                                <label className={menuStyles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={tempFilter === "Técnico"}
                                        onChange={() => setTempFilter("Técnico")}
                                    />
                                    <span>Técnico</span>
                                </label>

                                <label className={menuStyles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={tempFilter === "Pagados"}
                                        onChange={() => setTempFilter("Pagados")}
                                    />
                                    <span>Pagados</span>
                                </label>
                            </div>
                        </div>

                        <div className={menuStyles.modalActions}>
                            <button
                                className={menuStyles.applyBtn}
                                onClick={handleApplyFilter}
                            >
                                Aplicar Filtro
                            </button>
                            <button
                                className={menuStyles.cancelBtn}
                                onClick={() => setIsFilterModalOpen(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListaSolicitudes;
