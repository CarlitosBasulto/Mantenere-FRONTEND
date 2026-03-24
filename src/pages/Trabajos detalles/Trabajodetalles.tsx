import React, { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import menuStyles from "../../components/Menu.module.css";
import styles from "./Trabajodetalles.module.css";
import { useAuth } from "../../context/AuthContext";
import { getCotizacionByTrabajoId, updateCotizacionStatus } from "../../services/cotizacionesService";
import { getTrabajos, createTrabajo, assignTrabajador } from "../../services/trabajosService";
import { getTrabajadores } from "../../services/trabajadoresService";
import { getNegocio } from "../../services/negociosService";

interface Trabajo {
    id: number;
    titulo: string;
    ubicacion: string;
    tecnico: string;
    fecha: string; // Formato DD/MM/YYYY
    estado: "En Espera" | "Finalizado" | "En Proceso" | "Asignado" | "Solicitud" | "Cotización Enviada" | "Cotización Aceptada" | "Cotización Rechazada" | "Completado";
    tipo?: "Visita" | "Trabajo" | "Nueva Solicitud";
    visitado?: boolean;
    descripcion?: string;
    fechaAsignada?: string;
    horaAsignada?: string;
    cotizacion?: {
        costo: string;
        notas: string;
        archivo: string;
        fecha: string;
    };
}


const TrabajoDetalle: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const isCotizacionesTab = searchParams.get('tab') === 'cotizaciones';

    // Obtener nombre del negocio desde localStorage
    const [businessName, setBusinessName] = useState("Cargando...");

    React.useEffect(() => {
        const fetchNegocio = async () => {
            try {
                const n = await getNegocio(Number(id));
                if (n) {
                    setBusinessName(n.nombre);
                    setNewRequestData(prev => ({ ...prev, cliente: n.nombre }));
                }
            } catch(e) { console.error("Error al obtener nombre del negocio", e); }
        };
        fetchNegocio();
    }, [id]);

    const [trabajosData, setTrabajosData] = useState<Trabajo[]>([]);
    const [tecnicosData, setTecnicosData] = useState<any[]>([]);

    const fetchAllData = async () => {
        try {
            // 1. Traer Trabajos
            const tData = await getTrabajos();
            // Filtrar solo los de la sucursal actual
            const filtered = tData.filter((t: any) => t.negocio_id === Number(id));
            
            // Tratamos de resolver las cotizaciones para cada trabajo de manera asíncrona si amerita
            const mapped = await Promise.all(filtered.map(async (t: any) => {
                let coti = undefined;
                if (['Cotización Enviada', 'Cotización Aceptada', 'Cotización Rechazada'].includes(t.estado)) {
                    try { coti = await getCotizacionByTrabajoId(t.id); } catch(e) {}
                }

                return {
                    id: t.id,
                    titulo: t.titulo,
                    ubicacion: t.negocio?.direccion || t.negocio?.nombre || businessName,
                    tecnico: t.trabajador ? t.trabajador.nombre : "Sin asignar",
                    fecha: t.fecha_programada || new Date(t.created_at).toLocaleDateString('es-MX'),
                    estado: t.estado,
                    tipo: t.tipo || "Trabajo",
                    visitado: t.visitado || false,
                    descripcion: t.descripcion,
                    fechaAsignada: t.fechaAsignada,
                    horaAsignada: t.horaAsignada,
                    cotizacion: coti ? {
                        costo: coti.monto,
                        notas: coti.descripcion,
                        archivo: coti.archivo || "",
                        fecha: coti.created_at
                    } : undefined
                };
            }));
            
            setTrabajosData(mapped as Trabajo[]);

            // 2. Traer Técnicos activos
            const wData = await getTrabajadores();
            setTecnicosData(wData.filter((w: any) => w.estado === "Activo"));

        } catch (error) {
            console.error("Error al obtener datos de DB:", error);
        }
    };

    React.useEffect(() => {
        fetchAllData();
    }, [id, businessName]);

    // Función que muta estado localmente mientras se refresca (para agilidad)
    const saveJobs = (data: Trabajo[]) => {
        setTrabajosData(data);
    };

    // ESTADOS
    const [searchText, setSearchText] = useState("");

    // Modal Asignación
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [selectedTechnicians, setSelectedTechnicians] = useState<number[]>([]);
    const [asignarFecha, setAsignarFecha] = useState("");
    const [asignarHora, setAsignarHora] = useState("");
    const [technicianSearch, setTechnicianSearch] = useState("");
    const [selectedType, setSelectedType] = useState<"Visita" | "Trabajo">("Visita");

    const handleTechToggle = (id: number) => {
        if (selectedTechnicians.includes(id)) {
            setSelectedTechnicians(selectedTechnicians.filter(tId => tId !== id));
        } else {
            setSelectedTechnicians([...selectedTechnicians, id]);
        }
    };

    // MODAL NUEVO SERVICIO (CLIENTE)
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [newRequestData, setNewRequestData] = useState({
        categoria: "Electricidad",
        cliente: "",
        fecha: "",
        descripcion: ""
    });

    // Modal Filtro
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("Todos");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // --- LÓGICA DE FILTRADO Y AGRUPACIÓN ---
    const getGroupedJobs = () => {
        const groups: { [key: string]: Trabajo[] } = {};

        // 1. Filtrar por búsqueda y estatus
        let filteredJobs = trabajosData.filter(job => {
            const matchesSearch = job.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
                job.tecnico.toLowerCase().includes(searchText.toLowerCase());

            let matchesStatus = true;
            if (filterStatus !== "Todos") {
                if (isCotizacionesTab) {
                    if (filterStatus === "Pagados" && job.estado !== "Cotización Aceptada") matchesStatus = false;
                    if (filterStatus === "En espera" && job.estado !== "Cotización Enviada") matchesStatus = false;
                    if (filterStatus === "Rechazado" && job.estado !== "Cotización Rechazada") matchesStatus = false;
                } else {
                    if (filterStatus === "Completadas" && job.estado !== "Finalizado") matchesStatus = false;
                    if (filterStatus === "En espera" && job.estado !== "En Espera") matchesStatus = false;
                    if (filterStatus === "Asignados" && job.estado !== "Asignado") matchesStatus = false;
                    if (filterStatus === "Sin asignar" && job.tecnico !== "Sin asignar") matchesStatus = false;
                }
            }

            // Filtrado adicional si estamos en la pestaña de cotizaciones
            let matchesCotizacion = true;
            if (isCotizacionesTab) {
                matchesCotizacion =
                    job.estado === 'Cotización Enviada' ||
                    job.estado === 'Cotización Aceptada' ||
                    job.estado === 'Cotización Rechazada';
            }

            return matchesSearch && matchesStatus && matchesCotizacion;
        });

        // 2. FILTRO ADICIONAL: Solo mostrar trabajos del técnico si el rol es 'tecnico' y NO están finalizados ni completados
        if (user?.role === 'tecnico') {
            filteredJobs = filteredJobs.filter(job => job.tecnico === user.name && job.estado !== "Finalizado" && job.estado !== "Completado");
        }

        // Agrupar por fecha
        filteredJobs.forEach(job => {
            const dateKey = job.fecha;
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(job);
        });
        return groups;
    };

    const groupedJobs = getGroupedJobs();
    const sortedDates = Object.keys(groupedJobs).sort((a, b) => {
        const [da, ma, ya] = a.split('/').map(Number);
        const [db, mb, yb] = b.split('/').map(Number);
        return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    });

    // --- HANDLERS ---
    const openAssignmentModal = (jobId: number) => {
        const job = trabajosData.find(j => j.id === jobId);
        setSelectedJobId(jobId);
        setSelectedTechnicians([]);
        setAsignarFecha("");
        setAsignarHora("");
        setTechnicianSearch("");

        // Si es una solicitud nueva, forzamos a que sea Visita por defecto
        if (job?.estado === "Solicitud") {
            setSelectedType("Visita");
        } else {
            setSelectedType("Trabajo"); // O el tipo que ya tenga
        }

        setIsModalOpen(true);
    };

    const handleConfirmAssignment = async () => {
        if (selectedJobId && selectedTechnicians.length > 0) {
            // El backend acepta 'trabajador_id'. Asumimos asignación de un solo técnico
            const authWorkerId = selectedTechnicians[0];

            try {
                // Notificar a API de la asignación
                await assignTrabajador(selectedJobId, authWorkerId);
                // Opcional: Podríamos hacer un fetchAllData() de nuevo para refrescar
                fetchAllData();
            } catch (error) {
                console.error("Error asignando técnico en Backend:", error);
                alert("Ocurrió un error al asignar técnico en la base de datos.");
            }
        }
        setIsModalOpen(false);
    };

    const handleConfirmRequest = async () => {
        const newJobPayload = {
            titulo: `${newRequestData.categoria} - ${newRequestData.cliente || businessName}`,
            descripcion: newRequestData.descripcion,
            prioridad: "Media",
            negocio_id: Number(id),
            fecha_programada: newRequestData.fecha || new Date().toISOString().split('T')[0],
        };

        try {
            await createTrabajo(newJobPayload);
            fetchAllData(); 
        } catch (error) {
            console.error("Error subiendo solicitud al backend", error);
            alert("Hubo un error al crear la solicitud.");
        }

        setIsRequestModalOpen(false);
        setNewRequestData({
            categoria: "Electricidad",
            cliente: businessName,
            fecha: "",
            descripcion: ""
        });
    };

    const handleAceptarCotizacion = async (jobId: number) => {
        if (window.confirm("¿Seguro que deseas ACEPTAR la cotización?")) {
            try {
                const coti = await getCotizacionByTrabajoId(jobId);
                if (coti && coti.id) {
                    await updateCotizacionStatus(coti.id, "Aprobada");
                }
            } catch (error) {
                console.error("No se pudo actualizar la cotización en Backend", error);
            }
            const updated = trabajosData.map(job => {
                if (job.id === jobId) {
                    return { ...job, estado: "Cotización Aceptada" as const };
                }
                return job;
            });
            saveJobs(updated);
            alert("Cotización aceptada en el sistema. El administrador procederá a asignar a un técnico.");
        }
    };

    const handleRechazarCotizacion = async (jobId: number) => {
        if (window.confirm("¿Seguro que deseas RECHAZAR la cotización?")) {
            try {
                const coti = await getCotizacionByTrabajoId(jobId);
                if (coti && coti.id) {
                    await updateCotizacionStatus(coti.id, "Rechazada");
                }
            } catch (error) {
                console.error("No se pudo actualizar la cotización en Backend", error);
            }
            const updated = trabajosData.map(job => {
                if (job.id === jobId) {
                    return { ...job, estado: "Cotización Rechazada" as const };
                }
                return job;
            });
            saveJobs(updated);
        }
    };

    const filteredTechnicians = tecnicosData.filter(t =>
        t.nombre.toLowerCase().includes(technicianSearch.toLowerCase())
    );

    return (
        <div className={menuStyles.dashboardLayout}>
            <div className={menuStyles.leftColumn}>

                {/* HEADER / TITULO */}
                <div className={styles.headerWrapper}>
                    <p className={styles.subTitle}>Trabajos de la sucursal:</p>
                    <h2 className={styles.businessName}>
                        {businessName}
                    </h2>
                </div>

                {/* BUSCADOR */}
                <div className={menuStyles.searchCard}>
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
                        ⚙️
                    </button>

                    {user?.role === 'cliente' && (
                        <button
                            className={`${menuStyles.filterBtn} ${styles.newRequestBtn}`}
                            onClick={() => setIsRequestModalOpen(true)}
                        >
                            + Nueva Solicitud
                        </button>
                    )}
                </div>

                {/* LISTA DE TRABAJOS */}
                <div className={styles.jobsSection}>
                    {trabajosData.length === 0 && (
                        <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
                            No hay trabajos registrados aún.
                        </div>
                    )}
                    {sortedDates.map(date => (
                        <div key={date}>
                            {groupedJobs[date].map(trabajo => (
                                <div
                                    key={trabajo.id}
                                    className={styles.jobCard}
                                    onClick={(e) => {
                                        // Asegurar que no sea un clic en un botón interno (aunque ya tienen stopPropagation)
                                        if (!(e.target as HTMLElement).closest('button')) {
                                            const basePath = user?.role === 'tecnico' ? '/tecnico' : (user?.role === 'cliente' ? '/cliente' : '/menu');
                                            navigate(`${basePath}/trabajo-detalle/${trabajo.id}`);
                                        }
                                    }}
                                >
                                    <div className={styles.cardContent}>

                                        {/* ICONO */}
                                        <div className={styles.cardIconStatus}>
                                            {trabajo.estado === "Finalizado" ? "✅" : (trabajo.estado === "Solicitud" ? (
                                                <div className={styles.requestBadgeContainer}>
                                                    <div className={styles.requestBadge}>
                                                        Solicitud
                                                    </div>
                                                </div>
                                            ) : "")}
                                        </div>

                                        {/* INFO */}
                                        <div className={styles.cardInfo}>
                                            <div className={styles.cardDateWrapper}>
                                                <span className={styles.cardDate}>{trabajo.fecha}</span>
                                            </div>

                                            {user?.role === 'admin' && trabajo.visitado && trabajo.estado !== 'Finalizado' && (
                                                <div className={styles.diagnosisBanner}>
                                                    <span className={styles.diagnosisIcon}>🛡️</span>
                                                    <div>
                                                        <p className={styles.diagnosisTitle}>AVISO DE DIAGNÓSTICO</p>
                                                        <p className={styles.diagnosisText}>Esta sucursal ya fue visitada y tiene un diagnóstico listo para ser revisado.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {(user?.role === 'cliente' || user?.role === 'admin') &&
                                                ['Cotización Enviada', 'Cotización Aceptada', 'Cotización Rechazada'].includes(trabajo.estado) &&
                                                trabajo.cotizacion && (
                                                    <div style={{ background: '#fff9e6', border: '1px solid #ffe0b2', borderRadius: '15px', padding: '20px', marginTop: '15px', marginBottom: '15px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                                            <span style={{ fontSize: '24px' }}>📄</span>
                                                            <h4 style={{ margin: 0, color: '#e65100', fontSize: '18px' }}>
                                                                {trabajo.estado === 'Cotización Enviada' ? 'Cotización Recibida' :
                                                                    trabajo.estado === 'Cotización Aceptada' ? 'Cotización Aceptada' :
                                                                        'Cotización Rechazada'}
                                                            </h4>
                                                        </div>

                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                                                            <div style={{ flex: '1', minWidth: '200px' }}>
                                                                <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#666' }}>Costo Estimado:</p>
                                                                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#333' }}>${trabajo.cotizacion.costo}</p>
                                                            </div>
                                                            <div style={{ flex: '2', minWidth: '300px' }}>
                                                                <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#666' }}>Notas:</p>
                                                                <p style={{ margin: 0, fontSize: '15px', color: '#444' }}>{trabajo.cotizacion.notas || "Sin notas adicionales."}</p>
                                                            </div>
                                                        </div>

                                                        <div style={{ marginBottom: '20px' }}>
                                                            <a
                                                                href={trabajo.cotizacion.archivo}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #ccc', padding: '10px 20px', borderRadius: '25px', color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                📎 Ver Archivo Adjunto
                                                            </a>
                                                        </div>

                                                        {user?.role === 'cliente' && trabajo.estado === 'Cotización Enviada' && (
                                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                                <button
                                                                    style={{ flex: 1, background: '#4caf50', color: 'white', border: 'none', padding: '12px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' }}
                                                                    onClick={(e) => { e.stopPropagation(); handleAceptarCotizacion(trabajo.id); }}
                                                                >
                                                                    ✓ Aceptar Cotización
                                                                </button>
                                                                <button
                                                                    style={{ flex: 1, background: '#f44336', color: 'white', border: 'none', padding: '12px', borderRadius: '25px', fontWeight: 'bold', cursor: 'pointer' }}
                                                                    onClick={(e) => { e.stopPropagation(); handleRechazarCotizacion(trabajo.id); }}
                                                                >
                                                                    ✕ Rechazar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                            <h3 className={styles.jobTitle}>{trabajo.titulo}</h3>
                                            {trabajo.descripcion && (
                                                <p className={styles.jobDescription}>
                                                    {trabajo.descripcion}
                                                </p>
                                            )}
                                            <p className={styles.technicianLabel}>Tecnico: <span className={styles.technicianName}>{trabajo.tecnico}</span></p>


                                            {/* Mostrar Tipo si existe */}
                                            {trabajo.tipo && (
                                                <p className={styles.jobTypeContainer}>
                                                    Tipo: <span className={styles.jobTypeBadge}>{trabajo.tipo}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* ACCIONES - Solo Admin */}
                                        <div className={styles.actionsContainer}>
                                            {(trabajo.fechaAsignada || trabajo.horaAsignada) && (
                                                <div style={{ background: '#eef8f1', padding: '6px 14px', borderRadius: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid #c8e6c9' }}>
                                                    {trabajo.fechaAsignada && (
                                                        <span style={{ color: '#137333', fontWeight: 'bold', fontSize: '13px' }}>
                                                            📅 {trabajo.fechaAsignada}
                                                        </span>
                                                    )}
                                                    {trabajo.fechaAsignada && trabajo.horaAsignada && (
                                                        <span style={{ color: '#137333', fontWeight: 'bold', fontSize: '13px' }}>-</span>
                                                    )}
                                                    {trabajo.horaAsignada && (
                                                        <span style={{ color: '#137333', fontWeight: 'bold', fontSize: '13px' }}>
                                                            ⏰ {trabajo.horaAsignada}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {user?.role === 'admin' ? (
                                                (trabajo.tecnico === "Sin asignar" || trabajo.estado === "Solicitud") ? (
                                                    <>
                                                        <button
                                                            className={`${styles.statusBtn} ${styles.assignBtn}`}
                                                            onClick={(e) => { e.stopPropagation(); openAssignmentModal(trabajo.id); }}
                                                        >
                                                            Asignar
                                                        </button>
                                                        <button
                                                            className={`${styles.statusBtn} ${styles.statusBadge} ${trabajo.estado === "Solicitud" ? styles.statusSolicitud : styles.statusAsignado}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {trabajo.estado}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {trabajo.estado !== 'Finalizado' && (
                                                            <button
                                                                className={`${styles.statusBtn} ${styles.editBtn}`}
                                                                onClick={(e) => { e.stopPropagation(); openAssignmentModal(trabajo.id); }}
                                                            >
                                                                Editar
                                                            </button>
                                                        )}

                                                        <button
                                                            className={`${styles.statusBtn} ${styles.statusBadge} ${trabajo.estado === 'Finalizado' ? styles.statusFinalizado : styles.statusAsignado}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {trabajo.estado}
                                                        </button>
                                                    </>
                                                )
                                            ) : (
                                                // Vista para Tecnico o Cliente (solo badge de estado)
                                                <button
                                                    className={`${styles.statusBtn} ${styles.statusBadge} ${trabajo.estado === 'Finalizado' ? styles.statusFinalizado : (trabajo.estado === 'Cotización Aceptada' ? styles.statusAceptada : styles.statusAsignado)}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        background: trabajo.estado === 'Cotización Enviada' ? '#ffe0b2' : undefined,
                                                        color: trabajo.estado === 'Cotización Enviada' ? '#e65100' : undefined
                                                    }}
                                                >
                                                    {trabajo.estado}
                                                </button>
                                            )}
                                        </div>

                                        {/* INDICADOR ESTADO LATERAL */}
                                        <div className={`${styles.cardIndicator} ${trabajo.estado === 'Finalizado' ? styles.green : styles.blue
                                            } ${styles.cardIndicatorOverride}`}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

            </div>

            <div className={styles.rightColumn}></div>

            {/* MODAL ASIGNAR TÉCNICO */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} ${styles.modalContentWide}`}>
                        <h3 className={styles.modalTitle}>Asignar Tecnico</h3>

                        {/* SELECCION TIPO DE TRABAJO */}
                        <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                            <label className={`${styles.radioLabel} ${styles.radioLabelLarge}`}>
                                <input
                                    type="radio"
                                    name="type"
                                    checked={selectedType === "Visita"}
                                    onChange={() => setSelectedType("Visita")}
                                />
                                <span>Visita</span>
                            </label>
                            <label className={`${styles.radioLabel} ${styles.radioLabelLarge}`}>
                                <input
                                    type="radio"
                                    name="type"
                                    checked={selectedType === "Trabajo"}
                                    onChange={() => setSelectedType("Trabajo")}
                                />
                                <span>Trabajo</span>
                            </label>
                        </div>

                        <div className={`${menuStyles.searchCard} ${styles.techSearchWrapper}`}>
                            <input
                                type="text"
                                placeholder="Buscar técnico..."
                                className={`${menuStyles.searchInput} ${styles.techSearchInput}`}
                                value={technicianSearch}
                                onChange={(e) => setTechnicianSearch(e.target.value)}
                            />
                        </div>

                        <div className={styles.techList}>
                            {filteredTechnicians.map(tech => (
                                <div key={tech.id} className={styles.techItem}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className={styles.techAvatar}>👤</div>
                                        <span style={{ fontWeight: 'bold' }}>{tech.nombre}</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={selectedTechnicians.includes(tech.id)}
                                        onChange={() => handleTechToggle(tech.id)}
                                        style={{ width: '20px', height: '20px', accentColor: '#333', cursor: 'pointer' }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '20px', marginTop: '20px', marginBottom: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Fecha Asignada</label>
                                <input
                                    type="date"
                                    value={asignarFecha}
                                    onChange={(e) => setAsignarFecha(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Hora Estimada</label>
                                <input
                                    type="time"
                                    value={asignarHora}
                                    onChange={(e) => setAsignarHora(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
                                />
                            </div>
                        </div>

                        <div className={styles.modalActions} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <button onClick={handleConfirmAssignment} className={styles.applyBtn} disabled={selectedTechnicians.length === 0} style={{ background: selectedTechnicians.length === 0 ? '#ccc' : '#fbbc04', color: selectedTechnicians.length === 0 ? '#666' : '#fff', width: 'auto', padding: '12px 40px', border: 'none', borderRadius: '30px', cursor: selectedTechnicians.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: selectedTechnicians.length === 0 ? 'none' : '0 4px 10px rgba(251, 188, 4, 0.3)' }}>Confirmar</button>
                            <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        </div>

                    </div>
                </div>
            )}

            {/* MODAL FILTRO */}
            {isFilterModalOpen && (
                <div className={menuStyles.modalOverlay}>
                    <div className={menuStyles.modalContent}>
                        <h2 className={menuStyles.modalTitle}>Filtro</h2>

                        {/* SECCION ESTATUS */}
                        <div className={menuStyles.filterSection}>
                            <span className={menuStyles.filterSubtitle}>Estatus de estado</span>
                            <div className={menuStyles.radioGroup}>
                                {(isCotizacionesTab ? ['Pagados', 'En espera', 'Rechazado'] : ['Completadas', 'En espera', 'Asignados', 'Sin asignar']).map(status => (
                                    <label key={status} className={menuStyles.radioLabel}>
                                        <input
                                            type="radio"
                                            name="filterStatus"
                                            value={status}
                                            checked={filterStatus === status}
                                            onChange={() => setFilterStatus(status)}
                                        />
                                        <span>{status}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* SECCION FECHAS */}
                        <div className={menuStyles.filterSection}>
                            <span className={menuStyles.filterSubtitle}>Rango de Fechas</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ position: 'relative' }}>
                                    <input type="date" className={menuStyles.modalInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input type="date" className={menuStyles.modalInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* BOTONES */}
                        <div className={menuStyles.modalActions}>
                            <button className={menuStyles.applyBtn} onClick={() => setIsFilterModalOpen(false)}>
                                Aplicar Filtro
                            </button>
                            <button className={menuStyles.cancelBtn} onClick={() => setIsFilterModalOpen(false)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NUEVA SOLICITUD (CLIENTE) */}
            {isRequestModalOpen && (
                <div className={menuStyles.modalOverlay}>
                    <div className={`${menuStyles.modalContent} ${styles.modalContentMedium}`}>
                        <h2 className={styles.modalTitle} style={{ fontWeight: '900', fontSize: '26px' }}>Nuevo Servicio</h2>

                        <div className={styles.formGroup}>
                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Categoria</label>
                                <select
                                    className={styles.newServiceInput}
                                    style={{ flex: 1 }}
                                    value={newRequestData.categoria}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, categoria: e.target.value })}
                                >
                                    <option>Electricidad</option>
                                    <option>Plomeria</option>
                                    <option>Albañileria</option>
                                    <option>Limpieza</option>
                                </select>
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Cliente</label>
                                <input
                                    type="text"
                                    className={styles.newServiceInput}
                                    placeholder="pokemon center"
                                    style={{ flex: 1 }}
                                    value={newRequestData.cliente}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, cliente: e.target.value })}
                                />
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Fecha</label>
                                <input
                                    type="date"
                                    className={styles.newServiceInput}
                                    style={{ flex: 1 }}
                                    value={newRequestData.fecha}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, fecha: e.target.value })}
                                />
                            </div>

                            <textarea
                                className={styles.newServiceTextArea}
                                placeholder="Descripción del problema"
                                value={newRequestData.descripcion}
                                onChange={(e) => setNewRequestData({ ...newRequestData, descripcion: e.target.value })}
                            />
                        </div>

                        <div className={styles.requestModalActions}>
                            <button
                                onClick={() => setIsRequestModalOpen(false)}
                                className={styles.cancelBtnLarge}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmRequest}
                                className={styles.confirmBtnLarge}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrabajoDetalle;
