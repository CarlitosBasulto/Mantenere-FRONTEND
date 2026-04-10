import React, { useState, useEffect } from "react";
import { createTrabajo, getTrabajos, updateEstadoTrabajo, assignTrabajador, updateTrabajo } from "../../services/trabajosService";
import { createMantenimientoSolicitud } from "../../services/mantenimientoService";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import menuStyles from "../../components/Menu.module.css";
import styles from "./Trabajodetalles.module.css";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import Historial from "../cliente/Historial";
import Cotizaciones from "../cliente/Cotizaciones";
import EquiposNegocio from "../admin/EquiposNegocio";
import { getNegocios, getNegocio } from "../../services/negociosService";
import { getTrabajadores } from "../../services/trabajadoresService";
import { createNotificacion, createNotificacionByRole } from "../../services/notificacionesService";
import { deleteTrabajo } from "../../services/trabajosService";
import { HiDotsVertical } from "react-icons/hi";
import { HiOutlinePencil, HiOutlineTrash, HiOutlineClipboardDocumentList } from "react-icons/hi2";

interface Trabajo {
    id: number;
    titulo: string;
    ubicacion: string;
    tecnico: string;
    tecnicoUserId?: number; // Permite un tracking fidedigno del técnico asignado
    fecha: string; // Formato DD/MM/YYYY
    estado: "En Espera" | "Finalizado" | "En Proceso" | "Asignado" | "Solicitud" | "Cotización Enviada" | "Cotización Aceptada" | "Cotización Rechazada" | "Cotización Aprobada" | "Eliminado";
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
    fechaSolicitud?: string;
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
    const { showAlert, showConfirm } = useModal();
    const [searchParams, setSearchParams] = useSearchParams();
    const isCotizacionesTab = searchParams.get('tab') === 'cotizaciones';
    const isHistorialTab = searchParams.get('tab') === 'historial';
    const isEquiposTab = searchParams.get('tab') === 'equipos';

    // Obtener nombre del negocio desde localStorage
    const [businessName, setBusinessName] = useState("Cargando...");
    const [businessImage, setBusinessImage] = useState<string | null>(null);
    const [businessAreas, setBusinessAreas] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchBusiness = async () => {
            try {
                // Intenta obtener de la lista global que Laravel nos de
                const all = await getNegocios();
                const current = all.find((n: any) => n.id === Number(id));
                
                // Fetch individual to securely get 'areas' array
                const individual = await getNegocio(Number(id));
                if (individual && individual.areas) {
                    setBusinessAreas(individual.areas);
                }
                
                if (current) {
                    setBusinessName(current.nombre);
                    setBusinessImage(current.imagenPerfil || null);
                    setNewRequestData(prev => ({ ...prev, cliente: current.nombre }));
                } else {
                    // Si falla el query batch, try individual
                    const individual = await getNegocio(Number(id));
                    if (individual && individual.nombre) {
                        setBusinessName(individual.nombre);
                        setBusinessImage(individual.imagenPerfil || null);
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
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

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
                        isEmergency: isSOS,
                        fechaSolicitud: j.created_at ? new Date(j.created_at).toLocaleDateString('es-MX') : "No registrada"
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
    const [isSOSRequest, setIsSOSRequest] = useState(false);
    const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
    const [newRequestData, setNewRequestData] = useState({
        categoria: "Electricidad",
        cliente: "",
        fecha: "",
        descripcion: "",
        equipoSeleccionado: ""
    });

    // Modal Filtro
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("Todos");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // --- LÓGICA DE FILTRADO Y AGRUPACIÓN ---
    const getGroupedJobs = () => {
        const groups: { [key: string]: Trabajo[] } = {};

        // 1. Filtrar por búsqueda, estatus y ocultar eliminados
        let filteredJobs = trabajosData.filter(job => {
            if (job.estado === "Eliminado") return false;

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

        // 3. ORDENAMIENTO AUTOMÁTICO: SOS primero, luego Fecha Descendente
        const parseDateForSort = (dateStr: string) => {
            const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
            if (parts.length === 3) {
                const [d, m, y] = parts.map(Number);
                return new Date(y, m - 1, d).getTime();
            }
            return new Date(dateStr).getTime();
        };

        const sortedFilteredJobs = [...filteredJobs].sort((a, b) => {
            // SOS primero
            if (a.tipo === 'SOS' && b.tipo !== 'SOS') return -1;
            if (a.tipo !== 'SOS' && b.tipo === 'SOS') return 1;

            // Fecha descendente
            return parseDateForSort(b.fecha) - parseDateForSort(a.fecha);
        });

        // 4. Agrupar por fecha (manteniendo el orden del sort)
        sortedFilteredJobs.forEach(job => {
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

        // Reset search
        setTechnicianSearch("");
        
        // Logic for pre-filling or resetting assignments
        if (job?.estado === "Solicitud" || job?.estado === "En Espera" || job?.tecnico === "Sin asignar") {
            // If it's a new request or coming back from a visit, we want it empty to avoid auto-assigning old tech
            setSelectedAssignments([]);
            setSelectedType("Visita");
        } else if (job?.asignaciones && job.asignaciones.length > 0) {
            setSelectedAssignments(job.asignaciones);
            setSelectedType("Trabajo");
        } else if (job?.tecnico && job.tecnico !== "Sin asignar") {
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
            setSelectedType("Trabajo");
        } else {
            setSelectedAssignments([]);
            setSelectedType("Visita");
        }

        setIsModalOpen(true);
    };

    const handleConfirmAssignment = async () => {
        if (selectedJobId) {
            const trabajo = trabajosData.find(j => j.id === selectedJobId);
            const selectedTechnicians = selectedAssignments.map(a => a.tecnicoId);
            
            const assignedNames = selectedAssignments.length > 0
                ? selectedAssignments.map(a => a.tecnicoNombre).join(", ")
                : "Sin asignar";

            const newEstado = (selectedAssignments.length > 0 ? "Asignado" : "Solicitud") as any;

            // Sincronizar con Backend
            if (selectedJobId && selectedTechnicians.length > 0) {
                try {
                    await assignTrabajador(selectedJobId, selectedTechnicians[0]);
                    
                    const needsStateUpdate = trabajo?.estado === "Solicitud" || trabajo?.estado === "Cotización Aceptada" || trabajo?.estado === "Cotización Aprobada";
                    const newEstado = (needsStateUpdate ? "Asignado" : trabajo?.estado || "Asignado") as any;

                    let nuevoTitulo = trabajo?.titulo || "";
                    if (selectedType === "Trabajo" && nuevoTitulo.includes("(Visita)")) {
                        nuevoTitulo = nuevoTitulo.replace("(Visita)", "(Reparación)");
                    } else if (selectedType === "Visita" && nuevoTitulo.includes("(Reparación)")) {
                        nuevoTitulo = nuevoTitulo.replace("(Reparación)", "(Visita)");
                    }

                    // Always sync visited status regardless of current state to allow reverting mistakes
                    await updateEstadoTrabajo(selectedJobId, { 
                        estado: newEstado,
                        visitado: selectedType === "Trabajo" 
                    });

                    // Sync the type and title explicitly
                    await updateTrabajo(selectedJobId, {
                        tipo: selectedType,
                        titulo: nuevoTitulo
                    });

                    showAlert("Asignación Exitosa", "Cambio guardado en el servidor.", "success");
                } catch (error: any) {
                    console.error("Error al asignar:", error);
                    if (error.response && error.response.status === 422) {
                        showAlert("Restricción del Sistema", "El servidor no permite dejar el trabajo sin un técnico asignado.", "warning");
                    } else {
                        showAlert("Error de Sincronización", "Hubo un error sincronizando el trabajador con la base de datos.", "error");
                    }
                    return;
                }
            } else {
                // Intentar desasignar si es necesario
                try {
                    await assignTrabajador(selectedJobId, null as any);
                    showAlert("Desasignación Exitosa", "Se retiró el técnico.", "success");
                } catch (assignError: any) {
                    // PLAN B: Intentar con PUT general (si falla con 405/422 en la ruta específica)
                    if (assignError.response && (assignError.response.status === 422 || assignError.response.status === 405)) {
                        console.log("Intentando Plan B: PUT general...");
                        try {
                            await updateTrabajo(selectedJobId, { trabajador_id: null });
                            showAlert("Desasignación Exitosa (B)", "Se actualizó el registro.", "success");
                        } catch (e) {
                            console.error("Plan B falló también:", e);
                            showAlert("Error", "No se pudo desasignar.", "error");
                        }
                    } else {
                        showAlert("Error", "Ocurrió un error al desasignar.", "error");
                    }
                }
            }

            const updated = trabajosData.map(job => {
                if (job.id === selectedJobId) {
                    let nuevoTitulo = job.titulo || "";
                    if (selectedType === "Trabajo" && nuevoTitulo.includes("(Visita)")) {
                        nuevoTitulo = nuevoTitulo.replace("(Visita)", "(Reparación)");
                    } else if (selectedType === "Visita" && nuevoTitulo.includes("(Reparación)")) {
                        nuevoTitulo = nuevoTitulo.replace("(Reparación)", "(Visita)");
                    }

                    return {
                        ...job,
                        tecnico: assignedNames,
                        titulo: nuevoTitulo,
                        estado: (job.estado === "Solicitud" || job.estado === "Asignado") ? newEstado : job.estado,
                        tipo: selectedType,
                        visitado: selectedType === "Trabajo",
                        asignaciones: selectedAssignments.length > 0 ? selectedAssignments : [],
                        fechaAsignada: selectedAssignments.length > 0 ? selectedAssignments[0].fechaAsignada : "",
                        horaAsignada: selectedAssignments.length > 0 ? selectedAssignments[0].horaAsignada : ""
                    };
                }
                return job;
            });
            saveJobs(updated);

            // --- NOTIFICACIONES EN BD ---
            if (selectedJobId && selectedAssignments.length > 0) {
                try {
                    // Notificar a cada técnico asignado
                    for (const asig of selectedAssignments) {
                        await createNotificacion({
                            user_id: asig.tecnicoId,
                            titulo: 'Nuevo Trabajo Asignado 🛠️',
                            mensaje: `Te han asignado un nuevo trabajo: ${assignedNames} en la sucursal ${businessName}.`,
                            enlace: `/tecnico/trabajo-detalle/${selectedJobId}`
                        });
                    }
                } catch (notiErr) {
                    console.error("Error enviando notificaciones a técnicos:", notiErr);
                }
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
            showAlert("Éxito", "Solicitud actualizada exitosamente.", "success");
        } else {
            // Create new request (Normal or SOS)
            try {
                if (newRequestData.categoria === 'Mantenimiento' && newRequestData.equipoSeleccionado) {
                    // Si se seleccionó equipo, se va flujo especializado de mantenimiento
                    await createMantenimientoSolicitud({
                        cliente_id: user?.id || 1,
                        negocio_id: Number(id),
                        levantamiento_equipo_id: newRequestData.equipoSeleccionado,
                        descripcion_problema: newRequestData.descripcion || "Mantenimiento general programado"
                    });
                    
                    showAlert("Solicitud Exitosa", "Tu reporte se ha creado correctamente y ya es visible en la sección de Reportes de Mantenimiento para la administración.", "success");
                    setIsRequestModalOpen(false);
                    return;
                }

                const isEmergency = isSOSRequest;
                const newJobPayload = {
                    titulo: isEmergency 
                        ? `🚨 SOS: ${newRequestData.categoria} - ${businessName}`
                        : `${newRequestData.categoria} - ${newRequestData.cliente || businessName}`,
                    descripcion: (newRequestData.categoria === 'Mantenimiento' && newRequestData.equipoSeleccionado) 
                        ? `[Equipo: ${newRequestData.equipoSeleccionado}]\n${newRequestData.descripcion}` 
                        : newRequestData.descripcion,
                    prioridad: isEmergency ? "Alta" : "Media",
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
                    fecha: dbJob.fecha_programada ? (dbJob.fecha_programada.includes('-') ? dbJob.fecha_programada.split('-').reverse().join('/') : dbJob.fecha_programada) : new Date().toLocaleDateString('es-MX'),
                    estado: "Solicitud",
                    tipo: isEmergency ? "SOS" : "Nueva Solicitud",
                    descripcion: dbJob.descripcion,
                    isEmergency: isEmergency
                };
                
                if (isEmergency) {
                    saveJobs([newJobView as any, ...trabajosData]);
                } else {
                    saveJobs([...trabajosData, newJobView as any]);
                }

                // --- NOTIFICAR ADMIN EN BD ---
                try {
                    await createNotificacionByRole({
                        role: 'admin',
                        titulo: isEmergency ? '🚨 NUEVA EMERGENCIA' : 'NUEVA SOLICITUD ✨',
                        mensaje: isEmergency 
                            ? `El cliente ha enviado un SOS: ${newJobView.titulo} en la sucursal ${businessName}.`
                            : `El cliente ha creado una nueva solicitud: ${newJobView.titulo} en la sucursal ${businessName}.`,
                        enlace: `/menu/trabajo-detalle/${newJobView.id}`
                    });
                } catch (notiErr) {
                    console.error("Error al notificar admin de nueva solicitud:", notiErr);
                }
            } catch (error) {
                console.error("Error creating record:", error);
                showAlert("Error", "Hubo un error contactando al servidor.", "error");
            }
        }
        
        setIsRequestModalOpen(false);
        setIsEditingRequest(false);
        setIsSOSRequest(false);
        setEditingRequestId(null);
        // Reset form
        setNewRequestData({
            categoria: "Electricidad",
            cliente: businessName,
            fecha: "",
            descripcion: "",
            equipoSeleccionado: ""
        });
    };

    const handleSOSRequest = async () => {
        setNewRequestData({
            categoria: "Electricidad",
            cliente: businessName,
            fecha: new Date().toISOString().split('T')[0],
            descripcion: "",
            equipoSeleccionado: ""
        });
        setIsSOSRequest(true);
        setIsEditingRequest(false);
        setIsRequestModalOpen(true);
    };

    const handleDeleteRequest = (e: React.MouseEvent, jobId: number) => {
        e.stopPropagation();
        showConfirm(
            "Borrar Solicitud",
            "¿Estás seguro de que deseas borrar esta solicitud?",
            async () => {
                try {
                    await deleteTrabajo(jobId);
                    const updated = trabajosData.filter(job => job.id !== jobId);
                    saveJobs(updated);
                    showAlert("Éxito", "Solicitud borrada exitosamente.", "success");
                } catch (error) {
                    console.error("Error al borrar solicitud:", error);
                    showAlert("Error", "No se pudo borrar la solicitud en el servidor.", "error");
                }
            }
        );
    };

    const handleOpenEditRequest = (e: React.MouseEvent, job: Trabajo) => {
        e.stopPropagation();
        // Intentar deducir la categoría del título si es posible
        const parts = (job.titulo || "").split(' - ');
        let cat = parts.length > 1 ? parts[0] : "Electricidad";

        if (!["Electricidad", "Plomeria", "Albañileria", "Limpieza", "Instalación", "Mantenimiento"].includes(cat)) {
            if (job.titulo?.includes("Mantenimiento")) cat = "Mantenimiento";
            else if (job.titulo?.includes("Instalación")) cat = "Instalación";
        }

        setNewRequestData({
            categoria: cat,
            cliente: businessName,
            fecha: job.fecha,
            descripcion: job.descripcion || "",
            equipoSeleccionado: ""
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
        showAlert("Cotización Aceptada", "Cotización aceptada. El administrador procederá a asignar a un técnico.", "success");
    };

    const handleRechazarCotizacion = (jobId: number) => {
        showConfirm(
            "Rechazar Cotización",
            "¿Seguro que deseas rechazar la cotización?",
            () => {
                const updated = trabajosData.map(job => {
                    if (job.id === jobId) {
                        return { ...job, estado: "Cotización Rechazada" as const };
                    }
                    return job;
                });
                saveJobs(updated);
                showAlert("Información", "Cotización rechazada.", "info");
            }
        );
    };

    const filteredTechnicians = tecnicosData.filter(t =>
        t.nombre.toLowerCase().includes(technicianSearch.toLowerCase())
    );

    const renderStatusBar = (job: Trabajo) => {
        const status = (job.estado || "").toLowerCase();
        let barClass = styles.yellow;
        let text: string = job.estado || "Pendiente";

        if (status === "finalizado") {
            barClass = styles.green;
            text = "Finalizado";
        } else if (job.tipo === "SOS") {
            barClass = styles.red;
            text = "¡ALERTA SOS!";
        } else if (status.includes("cotizaci")) {
            barClass = styles.blue;
            // Si ya hay un técnico asignado (no es "Sin Asignar"), lo mostramos en el banner
            const hasTech = job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar";
            if (hasTech) {
                text = "TÉCNICO ASIGNADO";
            } else {
                text = user?.role === 'admin' ? "COTIZACIÓN ENVIADA" : "COTIZACIÓN DEL TRABAJO";
            }
        } else if (status === "asignado" || (job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar")) {
            barClass = styles.blue;
            text = "TÉCNICO ASIGNADO";
        }

        return (
            <div className={`${styles.statusBar} ${barClass}`}>
                {text}
            </div>
        );
    };

    // sortedDates se calcula una sola vez antes del return final

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

    if (isEquiposTab) {
        return (
            <div className={menuStyles.dashboardLayout}>
                <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                    <div className={styles.headerWrapper} style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p className={styles.subTitle}>Equipos en la sucursal:</p>
                            <h2 className={styles.businessName}>{businessName}</h2>
                        </div>
                        <button 
                            onClick={() => setSearchParams({})}
                            style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ← Volver a Trabajos
                        </button>
                    </div>
                    <EquiposNegocio businessId={Number(id)} />
                </div>
            </div>
        );
    }

    return (
        <div className={menuStyles.dashboardLayout}>
            <div className={styles.mainContainer}>
                {/* HEADER / BANNER PREMIUM */}
                <div className={styles.premiumHeader}>
                    {businessImage ? (
                        <div className={styles.bannerWrapper}>
                            <img src={businessImage} alt={businessName} className={styles.bannerImg} />
                            <div className={styles.bannerOverlay}>
                                <div className={styles.bannerContent}>
                                    <span className={styles.bannerLabel}>TRABAJOS DE LA SUCURSAL</span>
                                    <h1 className={styles.bannerTitle}>{businessName}</h1>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.simpleHeader}>
                             <h1 className={styles.businessTitle}>{businessName}</h1>
                        </div>
                    )}
                </div>

                {/* SEARCH & ACTIONS */}
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

                    {user?.role === 'admin' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className={`${menuStyles.filterBtn}`}
                                style={{ background: '#0284c7', color: 'white', fontWeight: 'bold', minWidth: '120px' }}
                                onClick={() => setSearchParams({ tab: 'equipos' })}
                            >
                                📦 Equipos
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
                <div className={styles.jobsSection} onClick={() => setActiveMenuId(null)}>
                    {sortedDates.map(date => (
                        <div key={date}>
                            {groupedJobs[date].map(trabajo => {
                                return (
                                    <div
                                        key={trabajo.id}
                                        className={styles.jobCard}
                                        onClick={(e) => {
                                            if (!(e.target as HTMLElement).closest('button')) {
                                                const basePath = user?.role === 'tecnico' ? '/tecnico' : (user?.role === 'cliente' ? '/cliente' : '/menu');
                                                navigate(`${basePath}/trabajo-detalle/${trabajo.id}`);
                                            }
                                        }}
                                    >
                                        {/* BARRA DE ESTADO SUPERIOR */}
                                        {renderStatusBar(trabajo)}

                                        {/* INDICADOR FLOTANTE DE DIAGNÓSTICO (PREMIUM) */}
                                        {!!trabajo.visitado && (trabajo.estado === 'Solicitud' || trabajo.estado === 'En Espera') && (
                                            <div style={{ 
                                                position: 'absolute', 
                                                right: '-10px', 
                                                top: '10px', 
                                                background: '#00a699', 
                                                color: 'white', 
                                                padding: '6px 16px', 
                                                borderRadius: '12px', 
                                                fontSize: '11px', 
                                                fontWeight: '900', 
                                                textTransform: 'uppercase', 
                                                boxShadow: '0 4px 12px rgba(0, 166, 153, 0.4)',
                                                zIndex: 20,
                                                letterSpacing: '0.5px'
                                            }}>
                                                DIAGNÓSTICO LISTO
                                            </div>
                                        )}

                                        {/* BANNER DE DIAGNÓSTICO (Opcional - debajo de la barra si se desea mantener) */}
                                        {trabajo.visitado && trabajo.estado === 'Solicitud' && (
                                            <div className={styles.diagnosisBanner}>
                                                <div className={styles.diagnosisIconWrapper}>🛡️</div>
                                                <div className={styles.diagnosisTextGroup}>
                                                    <p className={styles.diagnosisTitle}>AVISO DE DIAGNÓSTICO</p>
                                                    <p className={styles.diagnosisText}>Diagnóstico listo para ser revisado.</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className={styles.cardContent}>
                                            {/* FILA SUPERIOR: FECHA Y MENU */}
                                            <div className={styles.headerRow}>
                                                <div className={styles.dateGroup}>
                                                    <p className={styles.strikingDate}>
                                                        📅 {trabajo.fechaAsignada || trabajo.fecha}
                                                    </p>
                                                </div>

                                                {/* MENU DE TRES PUNTOS - Only for Admin or Cliente */}
                                                {(user?.role === 'admin' || user?.role === 'cliente') && (
                                                    <div className={styles.menuContainer} onClick={(e) => e.stopPropagation()}>
                                                        <button 
                                                            className={styles.dotsBtn}
                                                            onClick={() => setActiveMenuId(activeMenuId === trabajo.id ? null : trabajo.id)}
                                                        >
                                                            <HiDotsVertical />
                                                        </button>

                                                        {activeMenuId === trabajo.id && (
                                                            <div className={styles.dropdownMenu}>
                                                                {user?.role === 'cliente' && (
                                                                    <button 
                                                                        className={styles.menuItem}
                                                                        onClick={(e) => handleOpenEditRequest(e, trabajo)}
                                                                    >
                                                                        <HiOutlinePencil /> Editar
                                                                    </button>
                                                                )}
                                                                
                                                                {user?.role === 'admin' && (
                                                                    <button 
                                                                        className={styles.menuItem}
                                                                        onClick={() => openAssignmentModal(trabajo.id)}
                                                                    >
                                                                        <HiOutlineClipboardDocumentList /> Asignar
                                                                    </button>
                                                                )}

                                                                {user?.role === 'cliente' && (
                                                                    <button 
                                                                        className={`${styles.menuItem} ${styles.deleteItem}`}
                                                                        onClick={(e) => handleDeleteRequest(e, trabajo.id)}
                                                                    >
                                                                        <HiOutlineTrash /> Borrar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* INFO PRINCIPAL */}
                                            <div className={styles.cardInfo}>
                                                <h3 className={styles.jobTitle}>
                                                    {trabajo.estado === 'Finalizado' ? trabajo.titulo.replace('🚨 SOS: ', '').replace('SOS: ', '') : trabajo.titulo}
                                                </h3>
                                                
                                                {/* CAJA DE DESCRIPCIÓN ELEGANTE */}
                                                {trabajo.descripcion && (() => {
                                                    const desc = trabajo.descripcion;
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

                                                {/* INFO DE COTIZACIÓN (Solo si está enviada y es relevante) */}
                                                {(['Cotización Enviada', 'Cotización Aceptada', 'Cotización Rechazada', 'Cotización'].includes(trabajo.estado) || status.includes("cotizaci")) && trabajo.cotizacion && (
                                                     <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '10px', marginTop: '10px', border: '1px solid #fcd34d' }}>
                                                         <p style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '5px' }}>
                                                             {user?.role === 'admin' ? '💰 Cotización Enviada' : '💰 Cotización del Trabajo'}: ${trabajo.cotizacion.costo}
                                                         </p>
                                                         {user?.role === 'cliente' && trabajo.estado === 'Cotización Enviada' && (
                                                             <div style={{ display: 'flex', gap: '5px' }}>
                                                                 <button onClick={(e) => { e.stopPropagation(); handleAceptarCotizacion(trabajo.id); }} style={{ flex: 1, padding: '5px', background: '#22c55e', color: 'white', borderRadius: '5px', border: 'none', fontSize: '12px' }}>Aceptar</button>
                                                                 <button onClick={(e) => { e.stopPropagation(); handleRechazarCotizacion(trabajo.id); }} style={{ flex: 1, padding: '5px', background: '#ef4444', color: 'white', borderRadius: '5px', border: 'none', fontSize: '12px' }}>Rechazar</button>
                                                             </div>
                                                         )}
                                                     </div>
                                                )}
                                            </div>

                                            {/* FOOTER DE LA TARJETA */}
                                            <div className={styles.footerRow}>
                                                <div className={styles.technicianInfo}>
                                                    {trabajo.tecnico !== "Sin asignar" ? `👤 ${trabajo.tecnico}` : `🏢 ${trabajo.ubicacion}`}
                                                </div>

                                                <div className={styles.actionsCard}>
                                                    {/* Botón rápido si es necesario (ej. Cotizar) */}
                                                    {trabajo.visitado && !trabajo.cotizacion && user?.role === 'admin' && trabajo.estado === 'Solicitud' && (
                                                        <button 
                                                            className={styles.btnCotizar}
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/menu/admin-reporte/${trabajo.id}`); }}
                                                        >
                                                            💰 Cotizar
                                                        </button>
                                                    )}
                                                        {/* Hide type label if unassigned or technician search matches */}
                                                        {trabajo.tecnico && 
                                                         !trabajo.tecnico.toLowerCase().includes("sin asignar") && 
                                                         !trabajo.tecnico.toLowerCase().includes("pendiente") && 
                                                         trabajo.tecnico.trim() !== "" && (
                                                            <span className={styles.jobTypeBadge}>
                                                                {trabajo.estado === 'Finalizado' && trabajo.tipo === "SOS" ? 'Finalizado' : trabajo.tipo}
                                                            </span>
                                                        )}
                                                    </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL ASIGNAR TÉCNICO */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} ${styles.modalContentWide}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ textAlign: 'center', marginBottom: '5px', fontSize: '28px', fontWeight: '800' }}>Asignar Tecnico</h2>
                        {selectedJobId && trabajosData.find(j => j.id === selectedJobId)?.fechaSolicitud && (
                            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 'bold', marginBottom: '25px', marginTop: 0 }}>
                                📅 Solicitado el: {trabajosData.find(j => j.id === selectedJobId)?.fechaSolicitud}
                            </p>
                        )}

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
                        <h2 className={styles.modalTitle} style={isSOSRequest ? { fontWeight: '900', fontSize: '26px', color: '#c62828' } : { fontWeight: '900', fontSize: '26px' }}>
                            {isSOSRequest ? "🚨 Nueva Emergencia SOS" : (isEditingRequest ? "Editar Solicitud" : "Nuevo Servicio")}
                        </h2>

                        <div className={styles.formGroup}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', width: '100%' }}>
                                <div className={styles.formField}>
                                    <label className={styles.formLabel}>Categoría</label>
                                    <select
                                        className={styles.newServiceInput}
                                        value={newRequestData.categoria}
                                        onChange={(e) => setNewRequestData({ ...newRequestData, categoria: e.target.value })}
                                    >
                                        <option>Electricidad</option>
                                        <option>Plomeria</option>
                                        <option>Albañileria</option>
                                        <option>Limpieza</option>
                                        <option>Instalación</option>
                                        <option>Mantenimiento</option>
                                    </select>
                                </div>

                                <div className={styles.formField}>
                                    <label className={styles.formLabel}>Fecha Estimada</label>
                                    <input
                                        type="date"
                                        className={styles.newServiceInput}
                                        value={newRequestData.fecha}
                                        onChange={(e) => setNewRequestData({ ...newRequestData, fecha: e.target.value })}
                                    />
                                </div>
                            </div>

                            {newRequestData.categoria === 'Mantenimiento' && businessAreas.length > 0 && (
                                <div className={styles.formField}>
                                    <label className={styles.formLabel}>Equipo a mantener</label>
                                    <div className={styles.selectWrapper}>
                                        <select
                                            className={styles.newServiceInput}
                                            value={newRequestData.equipoSeleccionado}
                                            onChange={(e) => setNewRequestData({ ...newRequestData, equipoSeleccionado: e.target.value })}
                                        >
                                            <option value="">-- Seleccionar Equipo (Opcional) --</option>
                                            {businessAreas.map((area: any) => (
                                                <optgroup key={area.id} label={area.nombreArea}>
                                                    {area.equipos && area.equipos.map((eq: any) => (
                                                        <option key={eq.id} value={eq.id}>
                                                            {eq.nombre} - {eq.marca} {eq.modelo}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Sucursal / Cliente</label>
                                <input
                                    type="text"
                                    className={styles.newServiceInput}
                                    placeholder="Ej: Pokémon Center"
                                    value={newRequestData.cliente}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, cliente: e.target.value })}
                                />
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Descripción del problema</label>
                                <textarea
                                    className={styles.newServiceTextArea}
                                    placeholder="Detalla lo que sucede o los requerimientos del servicio..."
                                    value={newRequestData.descripcion}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, descripcion: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className={styles.requestModalActions}>
                            <button
                                onClick={() => {
                                    setIsRequestModalOpen(false);
                                    setIsSOSRequest(false);
                                }}
                                className={styles.cancelBtnLarge}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmRequest}
                                className={styles.confirmBtnLarge}
                                style={isSOSRequest ? { background: '#f44336', boxShadow: '0 4px 10px rgba(244, 67, 54, 0.3)' } : {}}
                            >
                                {isSOSRequest ? "Confirmar Emergencia" : "Confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrabajoDetalle;
