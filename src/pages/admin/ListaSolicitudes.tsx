import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTrabajos } from "../../services/trabajosService";
import styles from "./ListaSolicitudes.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { deleteTrabajo } from "../../services/trabajosService";
import { HiOutlinePencil, HiOutlineTrash } from "react-icons/hi2";
import { HiDotsVertical } from "react-icons/hi";

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
    const { showAlert, showConfirm } = useModal();

    // DATA LOADING
    const [solicitudes, setSolicitudes] = useState<Trabajo[]>([]);
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

    useEffect(() => {
        const fetchSolicitudes = async () => {
            try {
                const apiJobs = await getTrabajos();
                
                // Filtramos por estados relevantes para la bandeja de "Nuevas Solicitudes"
                // Si es técnico, queremos ver TODO lo que tiene asignado y no esté finalizado
                const activeJobs = apiJobs.filter((j: any) => {
                    const isTecnico = user?.role === 'tecnico';
                    const assignedToMe = j.trabajador?.user_id === user?.id || j.trabajador_id === user?.id;

                    if (isTecnico) {
                        const status = (j.estado || "").toLowerCase();
                        // El técnico solo debe ver lo que tiene activamente para TRABAJAR (Asignado, En Proceso)
                        // EXCLUIMOS: Finalizado, Cancelado, En Espera (Diagnóstico terminado), Solicitud (Aún es visita), Cotización Enviada
                        return assignedToMe && 
                               status !== 'finalizado' && 
                               status !== 'cancelado' && 
                               status !== 'en espera' && 
                               status !== 'solicitud' && 
                               status !== 'cotización enviada' &&
                               status !== 'pendiente';
                    }

                    // Filtro original para Admin (Bandeja de entrada general)
                    // Mostrar si: Pendiente, Solicitud, En Espera, Cotización Aceptada
                    // O si: Es SOS/Alta Prioridad y NO está Finalizado/Cancelado
                    const isSOS = j.prioridad === 'Alta' || (j.titulo && j.titulo.includes('SOS'));
                    
                    if (isSOS) {
                        return j.estado !== 'Finalizado' && j.estado !== 'Cancelado';
                    }

                    return j.estado === 'Pendiente' || 
                        j.estado === 'Solicitud' || 
                        j.estado === 'En Espera' || 
                        j.estado === 'Asignado' ||
                        j.estado === 'Cotización Aceptada';
                });

                const mappedJobs = activeJobs.map((j: any) => ({
                    id: j.id,
                    titulo: j.titulo,
                    ubicacion: j.negocio?.ubicacion || j.negocio?.nombre || "Por definir",
                    tecnico: j.trabajador?.nombre || "Sin asignar",
                    tecnicoUserId: j.trabajador?.user_id || j.trabajador_id || null,
                    fecha: j.fecha_programada ? (j.fecha_programada.includes('-') ? j.fecha_programada.split('-').reverse().join('/') : j.fecha_programada) : new Date(j.created_at).toLocaleDateString('es-MX'),
                    estado: j.estado === "Pendiente" ? "Solicitud" : j.estado,
                    tipo: (["Cotización Enviada", "Cotización Aceptada", "Cotización Aprobada", "Cotización Rechazada", "En Proceso", "Finalizado"].includes(j.estado) || j.visitado) ? "Trabajo" : "Visita",
                    sucursal: j.negocio?.nombre || "Por definir",
                    visitado: !!j.visitado,
                }));

                // ORDENAMIENTO AUTOMÁTICO: SOS primero, luego Fecha Descendente
                const sortedJobs = [...mappedJobs].sort((a, b) => {
                    // 1. SOS primero
                    if (a.tipo === 'SOS' && b.tipo !== 'SOS') return -1;
                    if (a.tipo !== 'SOS' && b.tipo === 'SOS') return 1;

                    // 2. Fecha descendente (más recientes primero)
                    const parseDate = (dateStr: string) => {
                        const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
                        if (parts.length === 3) {
                            const [d, m, y] = parts.map(Number);
                            return new Date(y, m - 1, d).getTime();
                        }
                        return new Date(dateStr).getTime();
                    };
                    return parseDate(b.fecha) - parseDate(a.fecha);
                });

                setSolicitudes(sortedJobs);
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

    const handleDeleteRequest = (id: number) => {
        showConfirm(
            "Borrar Solicitud",
            "¿Estás seguro de que deseas eliminar esta solicitud? Esta acción no se puede deshacer.",
            async () => {
                try {
                    await deleteTrabajo(id);
                    setSolicitudes(prev => prev.filter(s => s.id !== id));
                    showAlert("Éxito", "Solicitud eliminada correctamente", "success");
                } catch (error) {
                    console.error("Error al borrar:", error);
                    showAlert("Error", "No se pudo eliminar la solicitud en el servidor.", "error");
                }
            }
        );
    };

    const renderStatusBar = (job: Trabajo) => {
        const status = (job.estado || "").toLowerCase();
        let barClass = styles.yellow;
        let text = "Pendiente";

        if (status === "finalizado") {
            barClass = styles.green;
            text = "Finalizado";
        } else if (job.tipo === "SOS") {
            barClass = styles.red;
            text = "¡ALERTA SOS!";
        } else if (status.includes("cotizaci") || status === "asignado" || (job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar")) {
            barClass = styles.blue;
            const hasTech = job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar";
            text = hasTech
                ? ((user?.role === 'tecnico' && (job.visitado || job.tipo === 'Trabajo'))
                    ? "Se te asignó este trabajo 🛠️"
                    : "TÉCNICO ASIGNADO")
                : "Cotización Enviada";
        } else {
            text = job.estado;
        }

        return (
            <div className={`${styles.statusBar} ${barClass}`}>
                {text}
            </div>
        );
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

                <div className={styles.jobsSection} onClick={() => setActiveMenuId(null)}>
                    {filteredRequests.map((req) => (
                        <div
                            key={req.id}
                            className={styles.jobCard}
                            onClick={() => navigate(user?.role === 'tecnico' ? `/tecnico/trabajo-detalle/${req.id}` : `/menu/trabajo-detalle/${req.id}`)}
                        >
                            {/* BARRA DE ESTADO SUPERIOR */}
                            {renderStatusBar(req)}

                            {!!req.visitado && (req.estado === 'Solicitud' || req.estado === 'En Espera') && (
                                <div style={{ position: 'absolute', right: '-10px', top: '10px', background: '#00a699', color: 'white', fontWeight: 'bold', padding: '5px 15px', borderRadius: '20px', zIndex: 10, boxShadow: '0 4px 8px rgba(0, 166, 153, 0.4)', fontSize: '12px' }}>
                                    DIAGNÓSTICO LISTO
                                </div>
                            )}

                            {/* BANNER DE DIAGNÓSTICO (Opcional) */}


                            <div className={styles.cardContent}>
                                {/* FILA SUPERIOR: FECHA Y MENU */}
                                <div className={styles.headerRow}>
                                    <div className={styles.dateGroup}>
                                        <p className={styles.strikingDate}>
                                            📅 {req.fechaAsignada || req.fecha}
                                        </p>
                                    </div>

                                    {/* MENU DE TRES PUNTOS - Solo Admin */}
                                    {user?.role === 'admin' && (
                                        <div className={styles.menuContainer} onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                className={styles.dotsBtn}
                                                onClick={() => setActiveMenuId(activeMenuId === req.id ? null : req.id)}
                                            >
                                                <HiDotsVertical />
                                            </button>

                                            {activeMenuId === req.id && (
                                                <div className={styles.dropdownMenu}>
                                                    <button 
                                                        className={styles.menuItem}
                                                        onClick={() => navigate(`/menu/editar-servicio/${req.id}`)}
                                                    >
                                                        <HiOutlinePencil /> Editar
                                                    </button>
                                                    <button 
                                                        className={styles.menuItem}
                                                        onClick={() => navigate(`/menu/trabajo-detalle/${req.id}`)}
                                                    >
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>📋 Asignar</span>
                                                    </button>
                                                    <button 
                                                        className={`${styles.menuItem} ${styles.deleteItem}`}
                                                        onClick={() => handleDeleteRequest(req.id)}
                                                    >
                                                        <HiOutlineTrash /> Borrar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* INFO PRINCIPAL */}
                                <div className={styles.cardInfo}>
                                    <h3>{(req.estado === 'Finalizado') ? req.titulo.replace('🚨 SOS: ', '').replace('SOS: ', '') : req.titulo}</h3>
                                    
                                    {/* CAJA DE DESCRIPCIÓN ELEGANTE */}
                                    {req.descripcion && (() => {
                                        const desc = req.descripcion;
                                        const bracketMatch = desc.match(/\[(.*?)\]/);
                                        const mainText = desc.replace(/\[.*?\]/, '').trim();
                                        const extraInfo = bracketMatch ? bracketMatch[1] : null;

                                        return (
                                            <div className={styles.descriptionBox}>
                                                <p>{mainText || "Servicio solicitado sin descripción adicional."}</p>
                                                {extraInfo && (
                                                    <div className={styles.equipmentBadge}>
                                                        📦 {extraInfo}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* FOOTER DE LA TARJETA */}
                                <div className={styles.footerRow}>
                                    <span className={styles.tecnicoInfo}>
                                        {req.tecnico !== "Sin asignar" ? `Técnico: ${req.tecnico}` : `Dueño: ${req.sucursal || "No registrado"}`}
                                    </span>
                                    {/* Hide type label if not assigned (Admin sees it as 'Trabajo' or similar) */}
                                    {req.tecnico && 
                                     !req.tecnico.toLowerCase().includes("sin asignar") && 
                                     !req.tecnico.toLowerCase().includes("pendiente") && 
                                     req.tecnico !== "" && (
                                        <span className={styles.tipoBadge}>
                                            {req.estado === 'Finalizado' && req.tipo === 'SOS' ? 'Finalizado' : req.tipo}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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
