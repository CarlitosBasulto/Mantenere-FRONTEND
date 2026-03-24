import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ListaSolicitudes.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";
import { getTrabajos } from "../../services/trabajosService";

interface Trabajo {
    id: number;
    titulo: string;
    descripcion?: string;
    prioridad: "Alta" | "Media" | "Baja";
    estado: "Pendiente" | "En proceso" | "Completado" | "Finalizado";
    fecha_programada?: string;
    created_at: string;
    trabajador?: {
        nombre: string;
    };
    negocio: {
        nombre: string;
        ubicacion: string;
    };
}

const ListaSolicitudes: React.FC = () => {
    const [searchText, setSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("Todos");
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [tempFilter, setTempFilter] = useState("Todos");
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();
    const { user } = useAuth();

    // DATA LOADING
    const [solicitudes, setSolicitudes] = useState<Trabajo[]>([]);

    useEffect(() => {
        const fetchSolicitudes = async () => {
            try {
                const data = await getTrabajos();
                setSolicitudes(data);
            } catch (error) {
                console.error("Error cargando solicitudes", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSolicitudes();
    }, []);

    // FILTRADO
    const filteredRequests = solicitudes.filter((req) => {
        const searchTextLower = searchText.toLowerCase();
        
        const negocioNombre = req.negocio?.nombre || "";
        const trabajadorNombre = req.trabajador?.nombre || "Sin asignar";

        const matchesText = req.titulo.toLowerCase().includes(searchTextLower) ||
            negocioNombre.toLowerCase().includes(searchTextLower) ||
            trabajadorNombre.toLowerCase().includes(searchTextLower);

        // Si es técnico, solo ve las de él que NO esten Finalizadas ni Completadas
        if (user?.role === 'tecnico') {
            return matchesText && req.trabajador && req.trabajador.nombre === user.name && req.estado !== "Finalizado" && req.estado !== "Completado";
        }

        let matchesStatus = true;
        if (filterStatus !== "Todos") {
            if (filterStatus === "Pendiente" && req.estado !== "Pendiente") matchesStatus = false;
            if (filterStatus === "En proceso" && req.estado !== "En proceso") matchesStatus = false;
            if (filterStatus === "Completado" && req.estado !== "Completado") matchesStatus = false;
            if (filterStatus === "Finalizado" && req.estado !== "Finalizado") matchesStatus = false;
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
                            placeholder="Buscar titulo, negocio o técnico..."
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
                    {loading && (
                        <div style={{ padding: "20px", color: "#666" }}>
                            Cargando solicitudes...
                        </div>
                    )}

                    {!loading && filteredRequests.length === 0 && (
                        <div style={{ padding: "20px", color: "#888" }}>
                            No hay solicitudes registradas
                        </div>
                    )}

                    {!loading && filteredRequests.map((req) => (
                        <div
                            key={req.id}
                            className={styles.jobCard}
                            onClick={() => navigate(user?.role === 'tecnico' ? `/tecnico/trabajo-detalle/${req.id}` : `/menu/trabajo-detalle/${req.id}`)}
                            style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch' }}
                        >
                            <div className={styles.cardContent}>
                                {/* ICONO */}
                                <div className={styles.cardIcon}>
                                    📋
                                </div>
                                <div className={styles.cardInfo}>
                                    <div style={{
                                        background: (req.estado === 'Finalizado' || req.estado === 'Completado') ? '#eef8f1' : req.estado === 'En proceso' ? '#fff8e1' : '#ffebee', 
                                        padding: '6px 14px', 
                                        borderRadius: '15px', 
                                        marginBottom: '10px', 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        border: (req.estado === 'Finalizado' || req.estado === 'Completado') ? '1px solid #c8e6c9' : req.estado === 'En proceso' ? '1px solid #ffecb3' : '1px solid #ffcdd2', 
                                        width: 'fit-content' 
                                    }}>
                                        <span style={{ color: (req.estado === 'Finalizado' || req.estado === 'Completado') ? '#137333' : req.estado === 'En proceso' ? '#f57f17' : '#c62828', fontWeight: 'bold', fontSize: '13px' }}>
                                            {req.estado === 'Completado' ? 'En revisión' : req.estado}
                                        </span>
                                    </div>
                                    <h3>{req.titulo}</h3>
                                    <p>🛡️ Prioridad: <b>{req.prioridad}</b></p>
                                    <p>🏢 Negocio: {req.negocio?.nombre}</p>
                                    <p>👨‍🔧 Técnico: {req.trabajador ? req.trabajador.nombre : <span style={{color: '#ff9800', fontWeight: 'bold'}}>Sin asignar</span>}</p>
                                </div>
                                {/* Indicador lateral dependiendo del estado */}
                                <div className={`${styles.cardIndicator} ${req.estado === 'Finalizado' ? styles.green : req.estado === 'En proceso' ? styles.blue : styles.yellow}`}></div>
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
                                        checked={tempFilter === "Pendiente"}
                                        onChange={() => setTempFilter("Pendiente")}
                                    />
                                    <span>Pendiente</span>
                                </label>

                                <label className={menuStyles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={tempFilter === "En proceso"}
                                        onChange={() => setTempFilter("En proceso")}
                                    />
                                    <span>En proceso</span>
                                </label>

                                <label className={menuStyles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={tempFilter === "Completado"}
                                        onChange={() => setTempFilter("Completado")}
                                    />
                                    <span>Para revisión (Admin)</span>
                                </label>

                                <label className={menuStyles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={tempFilter === "Finalizado"}
                                        onChange={() => setTempFilter("Finalizado")}
                                    />
                                    <span>Finalizado</span>
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
