import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTrabajos } from "../../services/base/trabajosService";
import styles from "./ListaSolicitudes.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole } from "../../utils/roles";
import { useModal } from "../../context/ModalContext";
import { deleteTrabajo } from "../../services/base/trabajosService";
import { HiOutlineTrash, HiOutlineUserPlus } from "react-icons/hi2";

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
    imagenPerfil?: string | null;
    imagenPortada?: string | null;
}

const ListaSolicitudes: React.FC = () => {
    const [searchText, setSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("Todos");
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [tempFilter, setTempFilter] = useState("Todos");
    const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();

    // DATA LOADING
    const [solicitudes, setSolicitudes] = useState<Trabajo[]>([]);

    useEffect(() => {
        const fetchSolicitudes = async () => {
            try {
                const apiJobs = await getTrabajos();
                
                // Filtramos por estados relevantes para la bandeja de "Nuevas Solicitudes"
                // Si es técnico, queremos ver TODO lo que tiene asignado y no esté finalizado
                const activeJobs = apiJobs.filter((j: any) => {
                    const isTecnico = normalizeRole(user?.role) === 'tecnico-normal' || user?.role === 'tecnico_externo';
                    const assignedToMe = j.trabajador?.user_id === user?.id || j.trabajador_id === user?.id;

                    if (isTecnico) {
                        const status = (j.estado || "").toLowerCase();
                        // El técnico debe ver lo que tiene asignado y las propuestas
                        return (assignedToMe || j.trabajador_id === user?.id || j.trabajador?.user_id === user?.id) && 
                               status !== 'finalizado' && 
                               status !== 'cancelado' && 
                               status !== 'solicitud' && 
                               status !== 'pendiente';
                    }

                    // Filtro para Admin
                    const isSOS = j.prioridad === 'Alta' || (j.titulo && j.titulo.includes('SOS'));
                    if (isSOS) {
                        return j.estado !== 'Finalizado' && j.estado !== 'Cancelado';
                    }

                    return j.estado === 'Pendiente' || 
                        j.estado === 'Solicitud' || 
                        j.estado === 'En Espera' || 
                        j.estado === 'Asignado' ||
                        j.estado === 'Cotización Enviada' ||
                        j.estado === 'Cotización Rechazada' ||
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
                    imagenPerfil: j.negocio?.imagenPerfil || j.negocio?.imagen_perfil || null,
                    imagenPortada: j.negocio?.imagen_portada || j.negocio?.imagenPortada || null,
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

        if (normalizeRole(user?.role) === 'tecnico-normal') {
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
        } else if (status === "rechazado por técnico" || status === "rechazado por tecnico") {
            barClass = styles.red;
            text = normalizeRole(user?.role) === 'tecnico-normal' ? "RECHAZASTE ESTA ASIGNACIÓN" : "RECHAZADO POR TÉCNICO";
        } else if (job.tipo === "SOS") {
            barClass = styles.red;
            text = "¡ALERTA SOS!";
        } else if (status === "en espera") {
            barClass = styles.yellow;
            text = "EN ESPERA DE ASIGNACIÓN";
        } else if (status === "en proceso") {
            barClass = styles.blue;
            text = "TÉCNICO ACEPTADO";
        } else if (status === "solicitud" || status === "pendiente" || status === "asignado") {
            const hasTech = job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar";
            if (hasTech) {
                barClass = styles.orange;
                text = "SOLICITUD POR ACEPTAR";
            } else {
                barClass = styles.yellow;
                text = "SOLICITUD";
            }
        } else if (status.includes("cotizaci") || (job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar")) {
            const hasTech = job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar";

            if (normalizeRole(user?.role) === 'tecnico-normal') {
                if (status === 'cotización enviada' || status === 'cotización rechazada') {
                    barClass = styles.orange;
                    text = "EN PROCESO DE COTIZACIÓN";
                } else if (status === 'cotización aceptada') {
                    barClass = styles.blue;
                    text = "COTIZACIÓN ACEPTADA";
                } else if (hasTech) {
                    barClass = styles.blue;
                    text = job.tipo === 'Visita' ? "ASIGNACIÓN DE VISITA" : "SE TE ASIGNÓ ESTE TRABAJO 🛠️";
                } else {
                    barClass = styles.orange;
                    text = "Cotización Pendiente";
                }
            } else {
                if (status.includes('cotizaci')) {
                    barClass = styles.orange;
                    text = "EN PROCESO DE COTIZACIÓN";
                } else if (hasTech) {
                    barClass = styles.blue;
                    text = "TÉCNICO ASIGNADO";
                } else {
                    barClass = styles.blue;
                    text = "COTIZACIÓN DEL TRABAJO";
                }
            }
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

                <div className={styles.jobsSection}>
                    {filteredRequests.map((req, index) => {
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
                                    onClick={() => {
                                        const r = normalizeRole(user?.role);
                                        const basePath = r === 'tecnico-normal' ? '/tecnico' : '/menu';
                                        navigate(`${basePath}/trabajo-detalle/${req.id}`);
                                    }}
                                >
                            {/* BARRA DE ESTADO SUPERIOR */}
                            {renderStatusBar(req)}

                            {!!req.visitado && (req.estado === 'Solicitud' || req.estado === 'En Espera') && (
                                <div style={{ position: 'absolute', right: '-10px', top: '10px', background: '#00a699', color: 'white', fontWeight: 'bold', padding: '5px 15px', borderRadius: '20px', zIndex: 10, boxShadow: '0 4px 8px rgba(0, 166, 153, 0.4)', fontSize: '12px' }}>
                                    DIAGNÓSTICO LISTO
                                </div>
                            )}

                             <div className={styles.cardContent}>
                                 <div className={styles.cardContentMainRow}>
                                     {/* Left Column: Info */}
                                     <div className={styles.cardInfoCol}>
                                         {/* FILA SUPERIOR: FECHA */}
                                         <div className={styles.headerRow}>
                                             <div className={styles.dateGroup}>
                                                 <p className={styles.strikingDate}>
                                                     {req.fechaAsignada || req.fecha}
                                                 </p>
                                             </div>
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
                                     </div>

                                     {/* Right Column: Business Logo */}
                                     <div className={styles.businessLogoWrapper}>
                                         {req.imagenPerfil && !imageErrors[req.id] ? (
                                             <img
                                                 src={req.imagenPerfil}
                                                 alt={req.sucursal}
                                                 className={styles.businessAvatar}
                                                 onError={() => setImageErrors(prev => ({...prev, [req.id]: true}))}
                                             />
                                         ) : (
                                             <div className={styles.businessAvatarPlaceholder}>
                                                 {req.sucursal ? req.sucursal.substring(0, 2).toUpperCase() : 'SU'}
                                             </div>
                                         )}
                                     </div>
                                 </div>

                                 {/* FOOTER DE LA TARJETA */}
                                 <div className={styles.footerRow}>
                                     <span className={styles.tecnicoInfo}>
                                         {req.tecnico !== "Sin asignar" ? `Técnico: ${req.tecnico}` : `Dueño: ${req.sucursal || "No registrado"}`}
                                     </span>
                                     <div className={styles.footerActions}>
                                         {req.tecnico && 
                                          !req.tecnico.toLowerCase().includes("sin asignar") && 
                                          !req.tecnico.toLowerCase().includes("pendiente") && 
                                          req.tecnico !== "" && (
                                             <span className={styles.tipoBadge}>
                                                 {req.estado === 'Finalizado' && req.tipo === 'SOS' ? 'Finalizado' : req.tipo}
                                             </span>
                                         )}
                                         {normalizeRole(user?.role) === 'admin' && (
                                             <div className={styles.actionBtns} onClick={(e) => e.stopPropagation()}>
                                                 <button
                                                     className={styles.assignBtn}
                                                     onClick={(e) => { 
                                                         e.stopPropagation(); 
                                                         const r = normalizeRole(user?.role);
                                                         const basePath = r === 'tecnico-normal' ? '/tecnico' : '/menu';
                                                         navigate(`${basePath}/trabajo-detalle/${req.id}`); 
                                                     }}
                                                     title="Asignar Técnico"
                                                 >
                                                     <HiOutlineUserPlus size={15} />
                                                     Asignar Técnico
                                                 </button>
                                                 <button
                                                     className={styles.trashBtn}
                                                     onClick={(e) => { e.stopPropagation(); handleDeleteRequest(req.id); }}
                                                     title="Eliminar"
                                                 >
                                                     <HiOutlineTrash size={15} />
                                                 </button>
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>
                );
            })}
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

