import React, { useState, useEffect } from "react";
import { createTrabajo, getTrabajos, assignTrabajador } from "../../services/trabajosService";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import menuStyles from "../../components/Menu.module.css";
import styles from "./Trabajodetalles.module.css";
import { useAuth } from "../../context/AuthContext";
import Historial from "../cliente/Historial";
import Cotizaciones from "../cliente/Cotizaciones";
import { getNegocios, getNegocio } from "../../services/negociosService";
import { getTrabajadores } from "../../services/trabajadoresService";

interface Trabajo {
    id: number;
    titulo: string;
    ubicacion: string;
    tecnico: string;
    tecnicoUserId?: number; // Permite un tracking fidedigno del técnico asignado
    fecha: string; // Formato DD/MM/YYYY
    estado: "En Espera" | "Finalizado" | "En Proceso" | "Asignado" | "Solicitud" | "Cotización Enviada" | "Cotización Aceptada" | "Cotización Rechazada" | "Cotización Aprobada";
    tipo?: "Visita" | "Trabajo" | "Nueva Solicitud" | "SOS";
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
    isEmergency?: boolean;
    asignaciones?: AsignacionTecnico[];
}

export interface AsignacionTecnico {
    tecnicoId: number;
    tecnicoNombre: string;
    fechaAsignada: string;
    horaAsignada: string;
}

interface Tecnico {
    id: number;
    nombre: string;
    avatar?: string;
}

const TrabajoDetalle: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const isCotizacionesTab = searchParams.get('tab') === 'cotizaciones';
    const isHistorialTab = searchParams.get('tab') === 'historial';

    // Obtener nombre del negocio desde localStorage
    const [businessName, setBusinessName] = useState("Cargando...");

    React.useEffect(() => {
        const fetchBusiness = async () => {
            try {
                // Intenta obtener de la lista global que Laravel nos de
                const all = await getNegocios();
                const current = all.find((n: any) => n.id === Number(id));
                
                if (current) {
                    setBusinessName(current.nombre);
                    setNewRequestData(prev => ({ ...prev, cliente: current.nombre }));
                } else {
                    // Si falla el query batch, try individual
                    const individual = await getNegocio(Number(id));
                    if (individual && individual.nombre) {
                        setBusinessName(individual.nombre);
                        setNewRequestData(prev => ({ ...prev, cliente: individual.nombre }));
                    } else {
                        setBusinessName("Desconocido");
                    }
                }
            } catch (err) {
                console.error("Error cargando nombre del negocio:", err);
                setBusinessName("Desconocido");
            }
        };

        fetchBusiness();
    }, [id]);

    // DATOS DESDE LA API
    const [trabajosData, setTrabajosData] = useState<Trabajo[]>([]);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const data = await getTrabajos();
                const filtered = data.filter((j: any) => j.negocio_id === Number(id));
                const mapped = filtered.map((j: any) => {
                    const isSOS = j.prioridad === "Alta" || j.titulo?.includes("SOS");
                    let displayTipo = "Nueva Solicitud";
                    if (isSOS) {
                        displayTipo = "SOS";
                    } else if (j.tipo && ["Visita", "Trabajo", "Mantenimiento"].includes(j.tipo)) {
                        displayTipo = j.tipo;
                    } else if (j.estado !== "Pendiente" && j.estado !== "Solicitud") {
                        // Si el estado tiene que ver con la cotización ya completada o en proceso, 
                        // automáticamente es la fase de Trabajo (haya presionado terminar visita o no).
                        const isTrabajoDefinitivo = ["Cotización Enviada", "Cotización Rechazada", "Cotización Aceptada", "Cotización Aprobada", "En Proceso", "Finalizado"].includes(j.estado) || j.visitado;
                        
                        displayTipo = isTrabajoDefinitivo ? "Trabajo" : "Visita";
                    }

                    return {
                        id: j.id,
                        titulo: j.titulo,
                        ubicacion: j.negocio?.nombre || businessName,
                        tecnico: j.trabajador?.nombre || "Sin asignar",
                        tecnicoUserId: j.trabajador?.user_id || null, // <--- Added User ID mapping for strict filtering
                        fecha: j.fecha_programada ? (j.fecha_programada.includes('-') ? j.fecha_programada.split('-').reverse().join('/') : j.fecha_programada) : new Date(j.created_at).toLocaleDateString('es-MX'),
                        estado: j.estado === "Pendiente" ? "Solicitud" : j.estado,
                        visitado: Boolean(j.visitado),
                        tipo: displayTipo,
                        descripcion: j.descripcion,
                        isEmergency: isSOS
                    };
                });
                setTrabajosData(mapped);
            } catch (error) {
                console.error("Error al obtener trabajos: ", error);
            }
        };
        if (businessName !== "Cargando...") {
            fetchJobs();
        }
    }, [id, businessName]);

    const saveJobs = (data: Trabajo[]) => {
        setTrabajosData(data);
        // localStorage.setItem(`trabajos_business_${id}`, JSON.stringify(data)); // Eliminado para evitar cruce de caché
    };

    // DATOS REALES - TECNICOS
    const [tecnicosData, setTecnicosData] = useState<Tecnico[]>([]);

    React.useEffect(() => {
        const fetchTecnicos = async () => {
            try {
                const data = await getTrabajadores();
                const techList = data.filter((t: any) => t.estado?.toLowerCase() === 'activo' || t.estado === 'Activo');
                setTecnicosData(techList.map((t: any) => ({
                    id: t.id,
                    nombre: t.nombre
                })));
            } catch (error) {
                console.error("Error al obtener técnicos:", error);
            }
        };
        fetchTecnicos();
    }, []);

    // ESTADOS
    const [searchText, setSearchText] = useState("");

    // Modal Asignación
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [selectedAssignments, setSelectedAssignments] = useState<AsignacionTecnico[]>([]);
    const [technicianSearch, setTechnicianSearch] = useState("");
    const [selectedType, setSelectedType] = useState<"Visita" | "Trabajo">("Visita");

    const handleTechToggle = (tech: Tecnico) => {
        const isSelected = selectedAssignments.some(a => a.tecnicoId === tech.id);
        if (isSelected) {
            setSelectedAssignments(selectedAssignments.filter(a => a.tecnicoId !== tech.id));
        } else {
            setSelectedAssignments([
                ...selectedAssignments,
                {
                    tecnicoId: tech.id,
                    tecnicoNombre: tech.nombre,
                    fechaAsignada: "",
                    horaAsignada: ""
                }
            ]);
        }
    };

    const handleUpdateAssignmentDate = (tecnicoId: number, field: "fechaAsignada" | "horaAsignada", value: string) => {
        setSelectedAssignments(prev => prev.map(a =>
            a.tecnicoId === tecnicoId ? { ...a, [field]: value } : a
        ));
    };

    // MODAL NUEVO/EDITAR SERVICIO (CLIENTE)
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isEditingRequest, setIsEditingRequest] = useState(false);
    const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
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
                    if (filterStatus === "Pagados" && !["Cotización Aceptada", "Asignado", "En Proceso", "Finalizado"].includes(job.estado)) matchesStatus = false;
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
                matchesCotizacion = !!job.cotizacion;
            }

            return matchesSearch && matchesStatus && matchesCotizacion;
        });

        // 2. FILTRO ADICIONAL: Solo mostrar trabajos del técnico si el rol es 'tecnico' y NO están finalizados
        if (user?.role === 'tecnico') {
            filteredJobs = filteredJobs.filter(job => job.tecnicoUserId === user.id && job.estado !== "Finalizado");
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
        const parseDate = (dateStr: string) => {
            const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
            if (parts.length === 3) {
                // Asumiendo DD/MM/YYYY si el día está primero. YYYY-MM-DD fue convertido arriba a DD/MM/YYYY
                const [d, m, y] = parts.map(Number);
                return new Date(y, m - 1, d).getTime();
            }
            return new Date(dateStr).getTime();
        };
        return parseDate(b) - parseDate(a);
    });

    // --- HANDLERS ---
    const openAssignmentModal = (jobId: number) => {
        const job = trabajosData.find(j => j.id === jobId);
        setSelectedJobId(jobId);

        if (job?.asignaciones && job.asignaciones.length > 0) {
            setSelectedAssignments(job.asignaciones);
        } else if (job?.tecnico && job.tecnico !== "Sin asignar") {
            // Conversión por si viene de la estructura antigua sencilla
            const techNames = job.tecnico.split(", ");
            const convertedAssignments = techNames.map(name => {
                const foundTech = tecnicosData.find(t => t.nombre === name);
                return {
                    tecnicoId: foundTech ? foundTech.id : Date.now() + Math.random(),
                    tecnicoNombre: name,
                    fechaAsignada: job.fechaAsignada || "",
                    horaAsignada: job.horaAsignada || ""
                } as AsignacionTecnico;
            });
            setSelectedAssignments(convertedAssignments);
        } else {
            setSelectedAssignments([]);
        }

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
        if (selectedJobId) {
            const assignedNames = selectedAssignments.length > 0
                ? selectedAssignments.map(a => a.tecnicoNombre).join(", ")
                : "Sin asignar";

            const newEstado = (selectedAssignments.length > 0 ? "Asignado" : "Solicitud") as any;

            if (selectedAssignments.length > 0) {
                try {
                    await assignTrabajador(selectedJobId, selectedAssignments[0].tecnicoId);
                } catch (error) {
                    console.error("Error al asignar técnico en la API:", error);
                    alert("Hubo un error sincronizando el trabajador con la base de datos.");
                    return;
                }
            }

            const updated = trabajosData.map(job => {
                if (job.id === selectedJobId) {
                    return {
                        ...job,
                        tecnico: assignedNames,
                        estado: (job.estado === "Solicitud" || job.estado === "Asignado") ? newEstado : job.estado,
                        tipo: selectedType,
                        visitado: job.visitado,
                        asignaciones: selectedAssignments.length > 0 ? selectedAssignments : [],
                        fechaAsignada: selectedAssignments.length > 0 ? selectedAssignments[0].fechaAsignada : "",
                        horaAsignada: selectedAssignments.length > 0 ? selectedAssignments[0].horaAsignada : ""
                    };
                }
                return job;
            });
            saveJobs(updated);

            // Generar notificaciones para los técnicos asignados
            const jobToNotify = trabajosData.find(j => j.id === selectedJobId);
            if (jobToNotify && selectedAssignments.length > 0) {
                selectedAssignments.forEach(asig => {
                    const techKey = `tecnico_notifications_${asig.tecnicoNombre}`;
                    const techNotifs = JSON.parse(localStorage.getItem(techKey) || '[]');
                    techNotifs.unshift({
                        id: Date.now() + Math.random(),
                        titulo: 'Nuevo Trabajo Asignado',
                        mensaje: `Te han asignado un nuevo trabajo: ${jobToNotify.titulo} en la sucursal ${businessName}.`,
                        fecha: new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                        leida: false,
                        jobId: jobToNotify.id
                    });
                    localStorage.setItem(techKey, JSON.stringify(techNotifs));
                });
                window.dispatchEvent(new Event('storage'));
            }
        }
        setIsModalOpen(false);
    };

    const handleConfirmRequest = async () => {
        if (isEditingRequest && editingRequestId !== null) {
            // Edit existing request
            const updated = trabajosData.map(job => {
                if (job.id === editingRequestId) {
                    return {
                        ...job,
                        titulo: `${newRequestData.categoria} - ${newRequestData.cliente || businessName}`,
                        descripcion: newRequestData.descripcion
                    };
                }
                return job;
            });
            saveJobs(updated);
            alert("Solicitud actualizada exitosamente.");
        } else {
            // Create new request
            try {
                const newJobPayload = {
                    titulo: `${newRequestData.categoria} - ${newRequestData.cliente || businessName}`,
                    descripcion: newRequestData.descripcion,
                    prioridad: "Media",
                    negocio_id: Number(id),
                    fecha_programada: newRequestData.fecha || null
                };
                
                const dbJob = await createTrabajo(newJobPayload);

                // Update purely visual UI State immediately
                const newJobView = {
                    id: dbJob.id || Date.now(),
                    titulo: dbJob.titulo,
                    ubicacion: newRequestData.cliente || businessName,
                    tecnico: "Sin asignar",
                    fecha: dbJob.fecha_programada || new Date().toLocaleDateString('es-MX'),
                    estado: "Solicitud",
                    tipo: "Nueva Solicitud",
                    descripcion: dbJob.descripcion
                };
                saveJobs([...trabajosData, newJobView as any]);

                // Notify admin
                const adminNotifications = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
                adminNotifications.unshift({
                    id: Date.now() + Math.random(),
                    titulo: 'NUEVA SOLICITUD',
                    mensaje: `El cliente ha creado una nueva solicitud: ${newJobView.titulo} en la sucursal ${businessName}.`,
                    fecha: new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                    leida: false,
                    jobId: newJobView.id
                });
                localStorage.setItem('admin_notifications', JSON.stringify(adminNotifications));
                window.dispatchEvent(new Event('storage'));
            } catch (error) {
                console.error("Error creating record:", error);
                alert("Hubo un error contactando al servidor.");
            }
        }
        setTimeout(() => {
            setIsRequestModalOpen(false);
            setIsEditingRequest(false);
            setEditingRequestId(null);
            // Reset form
            setNewRequestData({
                categoria: "Electricidad",
                cliente: businessName,
                fecha: "",
                descripcion: ""
            });
            setTimeout(() => {
                alert(isEditingRequest ? "Solicitud actualizada exitosamente." : "Solicitud creada exitosamente.");
            }, 50);
        }, 0);
    };

    const handleSOSRequest = async () => {
        if (window.confirm("¿Estás seguro de que deseas enviar una solicitud de EMERGENCIA (SOS)? Esto notificará al administrador inmediatamente.")) {
            try {
                const newJobPayload = {
                    titulo: `🚨 EMERGENCIA SOS - ${businessName}`,
                    descripcion: "Solicitud de emergencia generada por el cliente.",
                    prioridad: "Alta",
                    negocio_id: Number(id),
                    fecha_programada: null
                };
                
                const dbJob = await createTrabajo(newJobPayload);

                const newJobView = {
                    id: dbJob.id || Date.now(),
                    titulo: dbJob.titulo,
                    ubicacion: businessName,
                    tecnico: "Sin asignar",
                    fecha: new Date().toLocaleDateString('es-MX'),
                    estado: "Solicitud",
                    tipo: "SOS",
                    descripcion: dbJob.descripcion,
                    isEmergency: true
                };
                
                saveJobs([newJobView as any, ...trabajosData]);

                const adminNotifications = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
                adminNotifications.unshift({
                    id: Date.now(),
                    titulo: `🚨 NUEVA EMERGENCIA`,
                    mensaje: `El cliente ${user?.name || 'desconocido'} de la sucursal ${businessName} ha solicitado ayuda de emergencia.`,
                    fecha: new Date().toLocaleDateString('es-MX') + ' ' + new Date().toLocaleTimeString('es-MX'),
                    leida: false,
                    jobId: newJobView.id
                });
                localStorage.setItem('admin_notifications', JSON.stringify(adminNotifications));
                window.dispatchEvent(new Event('storage'));

                alert("Solicitud de emergencia enviada exitosamente. El administrador ha sido notificado.");
            } catch (error) {
                console.error("Error SOS:", error);
                alert("Hubo un error contactando al servidor.");
            }
        }
    };

    const handleDeleteSOS = (jobId: number) => {
        if (window.confirm("¿Estás seguro de que deseas cancelar esta solicitud de emergencia SOS?")) {
            const updated = trabajosData.filter(job => job.id !== jobId);
            saveJobs(updated);
            alert("Solicitud de emergencia cancelada.");
        }
    };

    const handleDeleteRequest = (e: React.MouseEvent, jobId: number) => {
        e.stopPropagation();
        if (window.confirm("¿Estás seguro de que deseas borrar esta solicitud?")) {
            const updated = trabajosData.filter(job => job.id !== jobId);
            saveJobs(updated);
            alert("Solicitud borrada exitosamente.");
        }
    };

    const handleOpenEditRequest = (e: React.MouseEvent, job: Trabajo) => {
        e.stopPropagation();
        // Intentar deducir la categoría del título si es posible (Ej: "Plomeria - pokemon center")
        const parts = job.titulo.split(' - ');
        const cat = parts.length > 1 ? parts[0] : "Electricidad";

        setNewRequestData({
            categoria: cat,
            cliente: businessName,
            fecha: job.fecha,
            descripcion: job.descripcion || ""
        });
        setIsEditingRequest(true);
        setEditingRequestId(job.id);
        setIsRequestModalOpen(true);
    };

    const handleAceptarCotizacion = (jobId: number) => {
        const updated = trabajosData.map(job => {
            if (job.id === jobId) {
                return { ...job, estado: "Cotización Aceptada" as const };
            }
            return job;
        });
        saveJobs(updated);
        alert("Cotización aceptada. El administrador procederá a asignar a un técnico.");
    };

    const handleRechazarCotizacion = (jobId: number) => {
        if (window.confirm("¿Seguro que deseas rechazar la cotización?")) {
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

    if (isHistorialTab) {
        return (
            <div className={menuStyles.dashboardLayout}>
                <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                    <div className={styles.headerWrapper} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button
                            onClick={() => {
                                searchParams.delete('tab');
                                setSearchParams(searchParams);
                            }}
                            style={{ background: '#f5f5f5', border: '1px solid #ddd', padding: '8px 15px', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold', color: '#333' }}
                        >
                            ← Volver
                        </button>
                        <div>
                            <p className={styles.subTitle}>Historial de la sucursal:</p>
                            <h2 className={styles.businessName}>{businessName}</h2>
                        </div>
                    </div>
                    <Historial businessId={Number(id)} />
                </div>
            </div>
        );
    }

    if (isCotizacionesTab) {
        return (
            <div className={menuStyles.dashboardLayout}>
                <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                    <div className={styles.headerWrapper} style={{ marginBottom: '20px' }}>
                        <p className={styles.subTitle}>Cotizaciones de la sucursal:</p>
                        <h2 className={styles.businessName}>{businessName}</h2>
                    </div>
                    <Cotizaciones businessId={Number(id)} />
                </div>
            </div>
        );
    }

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
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className={`${menuStyles.filterBtn} ${styles.sosBtn}`}
                                onClick={handleSOSRequest}
                            >
                                SOS
                            </button>
                            <button
                                className={`${menuStyles.filterBtn} ${styles.newRequestBtn}`}
                                onClick={() => setIsRequestModalOpen(true)}
                            >
                                Solicitud
                            </button>
                        </div>
                    )}

                    {user?.role === 'tecnico' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className={`${menuStyles.filterBtn} ${styles.newRequestBtn}`}
                                style={{ background: '#4caf50', color: 'white', fontWeight: 'bold' }}
                                onClick={() => setSearchParams({ tab: 'historial' })}
                            >
                                Ver Historial
                            </button>
                        </div>
                    )}
                </div>

                {/* LISTA DE TRABAJOS */}
                <div className={styles.jobsSection}>
                    {sortedDates.map(date => (
                        <div key={date}>
                            {groupedJobs[date].map(trabajo => {
                                const isSos = trabajo.tipo === 'SOS' || trabajo.isEmergency || (trabajo.titulo && trabajo.titulo.includes('EMERGENCIA SOS'));
                                return (
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
                                        style={isSos && trabajo.estado !== 'Finalizado' ? { border: '2px solid #f44336', backgroundColor: '#fffafa', flexDirection: 'column', alignItems: 'stretch' } : {}}
                                    >
                                        {user?.role === 'admin' && trabajo.estado === 'Solicitud' && !isSos && (
                                            <div className={styles.nuevoBadge}>NUEVO</div>
                                        )}
                                        {isSos && trabajo.estado !== 'Finalizado' && (
                                            <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 15px', borderRadius: '10px', marginBottom: '15px', fontWeight: 'bold', border: '1px solid #ffcdd2' }}>
                                                🚨 EMERGENCIA SOS: ATENCIÓN PRIORITARIA REQUERIDA
                                            </div>
                                        )}
                                        <div className={styles.cardContent}>

                                            {/* ICONO */}
                                            <div className={styles.cardIconStatus}>
                                                {trabajo.estado === "Finalizado" ? "✅" : (trabajo.estado === "Solicitud" ? (
                                                    trabajo.tipo === "SOS" ? (
                                                        <div className={styles.requestBadgeContainer}>
                                                            <div className={styles.requestBadge} style={{ background: '#ffebee', color: '#c62828' }}>
                                                                🚨 SOS
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={styles.requestBadgeContainer}>
                                                            <div className={styles.requestBadge}>
                                                                Solicitud
                                                            </div>
                                                        </div>
                                                    )
                                                ) : "")}
                                            </div>

                                            {/* INFO */}
                                            <div className={styles.cardInfo}>
                                                <div className={styles.cardDateWrapper}>
                                                    <span className={styles.cardDate}>{trabajo.fecha}</span>
                                                </div>

                                                {user?.role === 'admin' && Boolean(trabajo.visitado) && (trabajo.estado === 'Solicitud' || trabajo.estado === 'En Espera') && !isSos ? (
                                                    <div className={styles.diagnosisBanner}>
                                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                            <span className={styles.diagnosisIcon}>🛡️</span>
                                                            <div>
                                                                <p className={styles.diagnosisTitle}>AVISO DE DIAGNÓSTICO</p>
                                                                <p className={styles.diagnosisText}>Esta sucursal ya fue visitada y tiene un diagnóstico listo para ser revisado.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {user?.role === 'admin' && (trabajo.estado === 'Cotización Aceptada' || trabajo.estado === 'Cotización Aprobada') ? (
                                                    <div className={styles.diagnosisBanner} style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#2e7d32', marginBottom: '15px' }}>
                                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                            <span className={styles.diagnosisIcon} style={{ background: '#c8e6c9', color: '#2e7d32' }}>✓</span>
                                                            <div>
                                                                <p className={styles.diagnosisTitle} style={{ color: '#2e7d32' }}>COTIZACIÓN ACEPTADA</p>
                                                                <p className={styles.diagnosisText} style={{ color: '#388e3c', margin: 0 }}>El cliente ha aceptado la cotización. Asigne técnico para arrancar el trabajo.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null}

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
                                                        Tipo: <span className={styles.jobTypeBadge} style={isSos ? { backgroundColor: '#ffebee', color: '#c62828', fontWeight: 'bold', border: '1px solid #ffcdd2' } : {}}>{trabajo.tipo}</span>
                                                    </p>
                                                )}
                                            </div>

                                            {/* ACCIONES - Solo Admin */}
                                            <div className={styles.actionsContainer}>
                                                {user?.role === 'admin' && trabajo.estado !== 'Finalizado' && (trabajo.asignaciones && trabajo.asignaciones.length > 0 || (trabajo.tecnico !== "Sin asignar" && trabajo.estado !== "Solicitud" && trabajo.tecnico)) ? (
                                                    <button
                                                        className={styles.statusBtn}
                                                        style={{ background: '#eef8f1', color: '#137333', border: '1px solid #c8e6c9', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                        onClick={(e) => { e.stopPropagation(); openAssignmentModal(trabajo.id); }}
                                                    >
                                                        🧑‍🔧 Ver / Editar Asignaciones ({trabajo.asignaciones ? trabajo.asignaciones.length : trabajo.tecnico.split(',').length})
                                                    </button>
                                                ) : null}

                                                {user?.role === 'admin' ? (
                                                    (trabajo.tecnico === "Sin asignar" || trabajo.estado === "Solicitud") && trabajo.estado !== "En Espera" ? (
                                                        <>
                                                            {/* Solo permitir asignar si NO ha sido visitado o si es cotización aceptada (pero esas ya no son Solicitud) */}
                                                            {(!Boolean(trabajo.visitado) || trabajo.estado === "Cotización Aceptada" || trabajo.estado === "Cotización Aprobada") && (
                                                                <button
                                                                    className={`${styles.statusBtn} ${styles.assignBtn}`}
                                                                    onClick={(e) => { e.stopPropagation(); openAssignmentModal(trabajo.id); }}
                                                                >
                                                                    Asignar
                                                                </button>
                                                            )}
                                                            {/* Mostrar el botón de cotizar si el trabajo ya fue visitado y sigue siendo Solicitud */}
                                                            {(Boolean(trabajo.visitado) && trabajo.estado === "Solicitud") ? (
                                                                <button
                                                                    className={styles.btnCotizar}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate(`/menu/trabajo-detalle/${trabajo.id}?tab=cotizacion`);
                                                                    }}
                                                                >
                                                                    📝 Realizar Cotización →
                                                                </button>
                                                            ) : null}
                                                            <button
                                                                className={`${styles.statusBtn} ${styles.statusBadge} ${trabajo.estado === "Solicitud" ? styles.statusSolicitud : styles.statusAsignado}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {trabajo.estado}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>


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
                                                    <>
                                                        <button
                                                            className={`${styles.statusBtn} ${styles.statusBadge} ${trabajo.estado === 'Finalizado' ? styles.statusFinalizado : ((trabajo.estado === 'Cotización Aceptada' || trabajo.estado === 'Cotización Aprobada') ? styles.statusAceptada : styles.statusAsignado)}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                background: trabajo.estado === 'Cotización Enviada' ? '#ffe0b2' : undefined,
                                                                color: trabajo.estado === 'Cotización Enviada' ? '#e65100' : undefined
                                                            }}
                                                        >
                                                            {trabajo.estado}
                                                        </button>
                                                        {user?.role === 'cliente' && trabajo.estado === 'Solicitud' && (
                                                            <>
                                                                {trabajo.tipo === 'SOS' ? (
                                                                    <button
                                                                        className={`${styles.statusBtn}`}
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteSOS(trabajo.id); }}
                                                                        style={{ background: '#f44336', color: 'white', fontWeight: 'bold' }}
                                                                    >
                                                                        ❌ Cancelar SOS
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            className={styles.statusBtn}
                                                                            onClick={(e) => handleOpenEditRequest(e, trabajo)}
                                                                            style={{ background: '#e3f2fd', color: '#1976d2', fontWeight: 'bold', border: '1px solid #bbdefb' }}
                                                                        >
                                                                            ✏️ Editar
                                                                        </button>
                                                                        <button
                                                                            className={styles.statusBtn}
                                                                            onClick={(e) => handleDeleteRequest(e, trabajo.id)}
                                                                            style={{ background: '#ffebee', color: '#c62828', fontWeight: 'bold', border: '1px solid #ffcdd2' }}
                                                                        >
                                                                            🗑️ Borrar
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* INDICADOR ESTADO LATERAL */}
                                            <div className={`${styles.cardIndicator} ${trabajo.estado === 'Finalizado' ? styles.green : styles.blue
                                                } ${styles.cardIndicatorOverride}`} style={isSos && trabajo.estado !== 'Finalizado' ? { background: '#f44336' } : {}}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

            </div>

            <div className={styles.rightColumn}></div>

            {/* MODAL ASIGNAR TÉCNICO */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} ${styles.modalContentWide}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
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
                                        checked={selectedAssignments.some(a => a.tecnicoId === tech.id)}
                                        onChange={() => handleTechToggle(tech)}
                                        style={{ width: '20px', height: '20px', accentColor: '#333', cursor: 'pointer' }}
                                    />
                                </div>
                            ))}
                        </div>

                        {selectedAssignments.length > 0 && (
                            <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                                <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#555' }}>Fechas y Horas de Asignación por Técnico</h4>
                                <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '5px' }}>
                                    {selectedAssignments.map(asig => (
                                        <div key={asig.tecnicoId} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', background: '#f8f9fa', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                                            <div style={{ width: '30%', fontWeight: 'bold', fontSize: '13px' }}>{asig.tecnicoNombre}</div>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="date"
                                                    value={asig.fechaAsignada}
                                                    onChange={(e) => handleUpdateAssignmentDate(asig.tecnicoId, 'fechaAsignada', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="time"
                                                    value={asig.horaAsignada}
                                                    onChange={(e) => handleUpdateAssignmentDate(asig.tecnicoId, 'horaAsignada', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.modalActions} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <button onClick={handleConfirmAssignment} className={styles.applyBtn} style={{ background: selectedAssignments.length === 0 ? '#ff5252' : '#fbbc04', color: '#fff', width: 'auto', padding: '12px 40px', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                {selectedAssignments.length === 0 ? 'Dejar Sin Asignar' : 'Confirmar Asignación'}
                            </button>
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
