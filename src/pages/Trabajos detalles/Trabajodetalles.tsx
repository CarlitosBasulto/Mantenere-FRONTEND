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
import { getNegocios, getNegocio, updateNegocio, uploadImage } from "../../services/negociosService";
import { getTrabajadores } from "../../services/trabajadoresService";
import { createNotificacion, createNotificacionByRole, createNotificacionEcosistema } from "../../services/notificacionesService";
import { getReporteByTrabajoId } from "../../services/reportesService";
import ReporteDetailModal from "../../components/modals/ReporteDetailModal";
import { getTrabajo } from "../../services/trabajosService";
import { deleteTrabajo } from "../../services/trabajosService";
import { HiOutlinePencil, HiOutlineTrash, HiOutlineArchiveBox, HiOutlineClock, HiOutlineListBullet, HiOutlineArrowPath, HiOutlineCheckCircle, HiOutlineClipboardDocument, HiOutlineChevronRight } from "react-icons/hi2";
import { Pencil, MoveVertical } from 'lucide-react';
import ChatTrabajo from "../../components/ChatTrabajo";

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
    foto_url?: string;
}

export interface AsignacionTecnico {
    tecnicoId: number;
    userId?: number;       // user_id del usuario asociado al trabajador
    tecnicoNombre: string;
    fechaAsignada: string;
    horaAsignada: string;
}

interface Tecnico {
    id: number;
    userId?: number;       // user_id del usuario asociado al trabajador
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
    const [businessDetails, setBusinessDetails] = useState<any>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isAdjustingPosition, setIsAdjustingPosition] = useState(false);
    const [bannerY, setBannerY] = useState(50);

    React.useEffect(() => {
        if (businessImage) {
            const match = businessImage.match(/[?&]posy=(\d+)/);
            if (match) {
                setBannerY(Number(match[1]));
            } else {
                setBannerY(50);
            }
        }
    }, [businessImage]);

    const saveBannerPosition = async () => {
        if (!id || !businessImage) return;
        const baseUrl = businessImage.split(/[?#]/)[0];
        const newUrl = `${baseUrl}?posy=${bannerY}`;
        try {
            await updateNegocio(Number(id), { imagen_portada: newUrl });
            setBusinessImage(newUrl);
            showAlert("Éxito", "Posición de portada guardada", "success");
        } catch (error) {
            console.error("Error al guardar posición de portada:", error);
            showAlert("Error", "No se pudo guardar la posición", "error");
        }
    };

    const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        try {
            const url = await uploadImage(file);
            await updateNegocio(Number(id), { imagen_portada: url });
            setBusinessImage(url);
            showAlert("Éxito", "Imagen de portada actualizada", "success");
        } catch (error) {
            console.error("Error al actualizar imagen de portada:", error);
            showAlert("Error", "No se pudo actualizar la imagen", "error");
        }
    };

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

                if (individual || current) {
                    setBusinessDetails({ ...current, ...individual });
                }

                if (current) {
                    const plaza = current.nombrePlaza || current.nombre_plaza;
                    const fullName = plaza ? `${current.nombre} - ${plaza}` : current.nombre;
                    setBusinessName(fullName);
                    setBusinessImage(current.imagen_portada || null);
                    setNewRequestData(prev => ({ ...prev, cliente: fullName }));
                } else {
                    // Si falla el query batch, try individual
                    if (individual && individual.nombre) {
                        const indPlaza = individual.nombrePlaza || individual.nombre_plaza;
                        const fullName = indPlaza ? `${individual.nombre} - ${indPlaza}` : individual.nombre;
                        setBusinessName(fullName);
                        setBusinessImage(individual.imagen_portada || null);
                        setNewRequestData(prev => ({ ...prev, cliente: fullName }));
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

    const getBusinessAddress = () => {
        if (!businessDetails) return "";
        const neg = businessDetails;
        const ubicacion = neg.tipo === 'W/M'
            ? [neg.calleAv, neg.manzana ? `Mza ${neg.manzana}` : '', neg.lote ? `Lote ${neg.lote}` : ''].filter(Boolean).join(', ')
            : [neg.calle, neg.numero ? `#${neg.numero}` : '', neg.colonia].filter(Boolean).join(', ');
        const estadoCiudad = [neg.ciudad, neg.estado].filter(Boolean).join(', ');
        return [ubicacion, estadoCiudad, neg.cp ? `CP ${neg.cp}` : ''].filter(Boolean).join(' · ');
    };

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
                        ubicacion: j.negocio ? ((j.negocio.nombrePlaza || j.negocio.nombre_plaza) ? `${j.negocio.nombre} - ${j.negocio.nombrePlaza || j.negocio.nombre_plaza}` : j.negocio.nombre) : businessName,
                        tecnico: j.trabajador?.nombre || "Sin asignar",
                        tecnicoUserId: j.trabajador?.user_id || null, // <--- Added User ID mapping for strict filtering
                        fecha: j.fecha_programada ? (j.fecha_programada.includes('-') ? j.fecha_programada.split('-').reverse().join('/') : j.fecha_programada) : new Date(j.created_at).toLocaleDateString('es-MX'),
                        estado: j.estado === "Pendiente" ? "Solicitud" : j.estado,
                        visitado: Boolean(j.visitado),
                        tipo: displayTipo,
                        descripcion: j.descripcion,
                        isEmergency: isSOS,
                        fechaSolicitud: j.created_at ? new Date(j.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "No registrada",
                        foto_url: j.foto_url
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
                    userId: t.user_id || null,   // user_id para notificaciones
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
    const [selectedJobId] = useState<number | null>(null);
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
                    userId: tech.userId ?? undefined,  // user_id para notificaciones
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
    const [fotosSOS, setFotosSOS] = useState<File[]>([]);
    const [fotosPreviewUrls, setFotosPreviewUrls] = useState<string[]>([]);
    const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);

    const parseFotoUrls = (fotoUrl: any): string[] => {
        if (!fotoUrl) return [];
        if (typeof fotoUrl === 'string') {
            if (fotoUrl.trim().startsWith('[')) {
                try {
                    const parsed = JSON.parse(fotoUrl);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {
                    console.error("Error parsing foto_url JSON:", e);
                }
            }
            return [fotoUrl];
        }
        if (Array.isArray(fotoUrl)) {
            return fotoUrl;
        }
        return [];
    };
    const [newRequestData, setNewRequestData] = useState({
        categoria: "Electricidad",
        cliente: "",
        fecha: new Date().toISOString().split('T')[0],
        descripcion: "",
        equipoSeleccionado: "",
        trabajador_id: ""
    });
    const [customCategoria, setCustomCategoria] = useState("");


    // Modal Filtro
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("Todos");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // --- MODAL DE REPORTE DETALLADO (PARA HISTORIAL EQUIPOS) ---
    const [reporteModalOpen, setReporteModalOpen] = useState(false);
    const [reporteData, setReporteData] = useState<any>(null);
    const [reporteTrabajo, setReporteTrabajo] = useState<any>(null);
    const [reporteTaskInfo, setReporteTaskInfo] = useState<any>(null);

    // Modal Rechazo Técnico
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [quoteToReject, setQuoteToReject] = useState<number | null>(null);

    const handleOpenReportDetail = async (trabajoId: number) => {
        try {
            setReporteModalOpen(true);
            setReporteData(null);
            setReporteTrabajo(null);
            setReporteTaskInfo(null);

            const cleanId = String(trabajoId).startsWith('gen-')
                ? Number(String(trabajoId).replace('gen-', ''))
                : trabajoId;

            let reporte = null;
            let jobDetails = null;

            // Fetch reporte
            try {
                reporte = await getReporteByTrabajoId(cleanId);
            } catch (err: any) {
                console.warn("No formal report found in DB, using fallback if available.");
            }

            if (reporte) {
                let parsedSolucion = reporte.solucion;
                if (typeof reporte.solucion === 'string') {
                    try {
                        parsedSolucion = JSON.parse(reporte.solucion);
                    } catch (e) {
                        console.error("Error al parsear reporte:", e);
                    }
                }
                setReporteData(parsedSolucion || reporte);
            } else {
                const fallback = localStorage.getItem(`report_data_${cleanId}`);
                if (fallback) setReporteData(JSON.parse(fallback));
            }

            // Fetch job details
            try {
                jobDetails = await getTrabajo(cleanId);
            } catch (err) {
                console.warn("Could not fetch job details for ID", cleanId);
            }

            if (jobDetails) {
                setReporteTrabajo({
                    id: jobDetails.id,
                    sucursal: jobDetails.negocio?.nombre || businessName,
                    tecnico: jobDetails.tecnico?.name || jobDetails.trabajador?.nombre || 'Técnico asignado',
                    encargado: jobDetails.contactos?.[0]?.nombre || jobDetails.negocio?.encargado || 'No asignado',
                    cotizacion: jobDetails.cotizacion_aceptada ? {
                        costo: jobDetails.cotizacion_aceptada.monto,
                        archivo: jobDetails.cotizacion_aceptada.archivo_url,
                        notas: jobDetails.cotizacion_aceptada.notas
                    } : jobDetails.cotizacion
                });

                setReporteTaskInfo({
                    id: jobDetails.id,
                    titulo: jobDetails.titulo || 'Mantenimiento General',
                    fecha: new Date(jobDetails.created_at).toLocaleDateString()
                });
            }
        } catch (error: any) {
            console.error("Error al abrir modal detalle:", error);
            showAlert("Error", "Ocurrió un error inesperado al preparar el reporte.");
            setReporteModalOpen(false);
        }
    };

    // --- LÓGICA DE FILTRADO Y AGRUPACIÓN ---
    const getTabCounts = () => {
        let baseJobs = trabajosData.filter(job => {
            if (job.estado === "Eliminado") return false;
            const matchesSearch = job.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
                job.tecnico.toLowerCase().includes(searchText.toLowerCase());
            
            let matchesCotizacion = true;
            if (isCotizacionesTab) {
                matchesCotizacion = !!job.cotizacion;
            }
            return matchesSearch && matchesCotizacion;
        });

        if (user?.role === 'tecnico') {
            baseJobs = baseJobs.filter(job => job.tecnicoUserId === user.id && job.estado !== "Finalizado");
        }

        const total = baseJobs.length;
        const enProceso = baseJobs.filter(job => ["En Proceso", "Asignado", "En Espera", "Cotización Aceptada", "Cotización Aprobada"].includes(job.estado)).length;
        const finalizadas = baseJobs.filter(job => job.estado === "Finalizado").length;
        const solicitud = baseJobs.filter(job => job.estado === "Solicitud").length;

        return { total, enProceso, finalizadas, solicitud };
    };

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
                    
                    // Nuevos filtros visuales (Pestañas)
                    if (filterStatus === "En proceso" && !["En Proceso", "Asignado", "En Espera", "Cotización Aceptada", "Cotización Aprobada"].includes(job.estado)) matchesStatus = false;
                    if (filterStatus === "Finalizadas" && job.estado !== "Finalizado") matchesStatus = false;
                    if (filterStatus === "Solicitud" && job.estado !== "Solicitud") matchesStatus = false;
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
                    // Notificar a cada técnico asignado usando user_id (no trabajador.id)
                    for (const asig of selectedAssignments) {
                        const notifUserId = asig.userId || asig.tecnicoId;
                        await createNotificacion({
                            user_id: notifUserId,
                            titulo: selectedType === 'Trabajo' ? 'Se te asignó este trabajo 🛠️' : '📋 Se te asignó una visita',
                            mensaje: `Te han asignado: ${assignedNames} en la sucursal ${businessName}.`,
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
        const finalCategoria = newRequestData.categoria === "Otro" && customCategoria.trim() !== ""
            ? customCategoria.trim()
            : newRequestData.categoria;

        if (isEditingRequest && editingRequestId !== null) {
            // Edit existing request
            try {
                const updatedPayload = {
                    titulo: `${finalCategoria} - ${newRequestData.cliente || businessName}`,
                    descripcion: newRequestData.descripcion,
                    fecha_programada: newRequestData.fecha || null
                };
                await updateTrabajo(editingRequestId, updatedPayload);

                const updated = trabajosData.map(job => {
                    if (job.id === editingRequestId) {
                        return {
                            ...job,
                            titulo: updatedPayload.titulo,
                            descripcion: updatedPayload.descripcion,
                            fecha: updatedPayload.fecha_programada
                                ? (updatedPayload.fecha_programada.includes('-') ? updatedPayload.fecha_programada.split('-').reverse().join('/') : updatedPayload.fecha_programada)
                                : job.fecha
                        };
                    }
                    return job;
                });
                saveJobs(updated);
                showAlert("Éxito", "Solicitud actualizada exitosamente.", "success");
            } catch (error) {
                console.error("Error al actualizar la solicitud:", error);
                showAlert("Error", "No se pudo actualizar la solicitud en el servidor.", "error");
            }
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

                    try {
                        let equName = "un equipo";
                        const individual = await getNegocio(Number(id));
                        if (individual && individual.areas) {
                            for (let a of individual.areas) {
                                const matched = a.equipos.find((e: any) => String(e.id) === String(newRequestData.equipoSeleccionado));
                                if (matched) { equName = matched.nombre; break; }
                            }
                        }
                        if (businessDetails && businessDetails.admin_autonomo_id) {
                            await createNotificacion({
                                user_id: businessDetails.admin_autonomo_id,
                                titulo: '📋 Reporte de Mantenimiento de Equipo',
                                mensaje: `Un cliente solicitó mantenimiento programado para ${equName}.`,
                                enlace: '/autonomo/solicitudes' // Autónomo no tiene ruta separada de mantenimiento aún, va a solicitudes
                            });
                        } else {
                            await createNotificacionByRole({
                                role: 'admin',
                                titulo: '📋 Reporte de Mantenimiento de Equipo',
                                mensaje: `Un cliente solicitó mantenimiento programado para ${equName}.`,
                                enlace: '/menu/mantenimiento'
                            });
                        }
                    } catch (e) { console.error(e); }

                    showAlert("Solicitud Exitosa", "Tu reporte se ha creado correctamente y ya es visible en la sección de Reportes de Mantenimiento para la administración.", "success");
                    setIsRequestModalOpen(false);
                    return;
                }

                const isEmergency = isSOSRequest;
                
                let dbJob;
                if (fotosSOS.length > 0) {
                    const formData = new FormData();
                    formData.append('titulo', isEmergency
                        ? `🚨 SOS: ${finalCategoria} - ${businessName}`
                        : `${finalCategoria} - ${newRequestData.cliente || businessName}`
                    );
                    formData.append('descripcion', (newRequestData.categoria === 'Mantenimiento' && newRequestData.equipoSeleccionado)
                        ? `[Equipo: ${newRequestData.equipoSeleccionado}]\n${newRequestData.descripcion}`
                        : newRequestData.descripcion
                    );
                    formData.append('prioridad', isEmergency ? 'Alta' : 'Media');
                    formData.append('tipo', isEmergency ? 'SOS' : 'Nueva Solicitud');
                    formData.append('negocio_id', id || '');
                    if (newRequestData.trabajador_id) {
                        formData.append('trabajador_id', newRequestData.trabajador_id);
                    }
                    if (newRequestData.fecha) {
                        formData.append('fecha_programada', newRequestData.fecha);
                    }
                    fotosSOS.forEach((file) => {
                        formData.append('fotos[]', file);
                    });
                    
                    dbJob = await createTrabajo(formData);
                } else {
                    const newJobPayload = {
                        titulo: isEmergency
                            ? `🚨 SOS: ${finalCategoria} - ${businessName}`
                            : `${finalCategoria} - ${newRequestData.cliente || businessName}`,
                        descripcion: (newRequestData.categoria === 'Mantenimiento' && newRequestData.equipoSeleccionado)
                            ? `[Equipo: ${newRequestData.equipoSeleccionado}]\n${newRequestData.descripcion}`
                            : newRequestData.descripcion,
                        prioridad: isEmergency ? "Alta" : "Media",
                        tipo: isEmergency ? "SOS" : "Nueva Solicitud",
                        negocio_id: Number(id),
                        fecha_programada: newRequestData.fecha || null,
                        trabajador_id: newRequestData.trabajador_id || null
                    };

                    dbJob = await createTrabajo(newJobPayload);
                }

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
                    isEmergency: isEmergency,
                    fechaSolicitud: dbJob.created_at 
                        ? new Date(dbJob.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) 
                        : new Date().toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
                    foto_url: dbJob.foto_url
                };

                if (isEmergency) {
                    saveJobs([newJobView as any, ...trabajosData]);
                } else {
                    saveJobs([...trabajosData, newJobView as any]);
                }

                // --- NOTIFICAR ADMIN EN BD ---
                try {
                    const tituloNoti = isEmergency ? '🚨 NUEVA EMERGENCIA' : 'NUEVA SOLICITUD ✨';
                    const mensajeNoti = isEmergency
                        ? `El cliente ha enviado un SOS: ${newJobView.titulo} en la sucursal ${businessName}.`
                        : `El cliente ha creado una nueva solicitud: ${newJobView.titulo} en la sucursal ${businessName}.`;

                    if (businessDetails && businessDetails.admin_autonomo_id) {
                        await createNotificacionEcosistema({
                            admin_autonomo_id: businessDetails.admin_autonomo_id,
                            titulo: tituloNoti,
                            mensaje: mensajeNoti,
                            enlace: `/autonomo/trabajo-detalle/${newJobView.id}`
                        });
                    } else {
                        await createNotificacionByRole({
                            role: 'admin',
                            titulo: tituloNoti,
                            mensaje: mensajeNoti,
                            enlace: `/menu/trabajo-detalle/${newJobView.id}`
                        });
                    }
                } catch (notiErr) {
                    console.error("Error al notificar admin de nueva solicitud:", notiErr);
                }
                showAlert(
                    isEmergency ? "🚨 ¡Emergencia Enviada!" : "✅ ¡Solicitud Enviada!",
                    isEmergency
                        ? "Tu alerta SOS ha sido enviada al administrador. Nos pondremos en contacto contigo a la brevedad posible."
                        : (newRequestData.trabajador_id 
                            ? "Tu solicitud ha sido mandada exitosamente al administrador, se te notificará cuando el técnico acepte."
                            : "Tu solicitud ha sido enviada exitosamente al administrador. Pronto te notificaremos cuando se asigne un técnico."),
                    "success"
                );
            } catch (error: any) {
                console.error("Error creating record:", error);
                let errorMessage = "Hubo un error contactando al servidor.";
                if (error.response && error.response.data) {
                    if (error.response.data.errors) {
                        const errorDetails = Object.values(error.response.data.errors).flat().join(" ");
                        errorMessage = `${error.response.data.message || "Error de validación"}: ${errorDetails}`;
                    } else if (error.response.data.message) {
                        errorMessage = error.response.data.message;
                    }
                }
                showAlert("Error", errorMessage, "error");
            }
        }

        setIsRequestModalOpen(false);
        setIsEditingRequest(false);
        setIsSOSRequest(false);
        setFotosSOS([]);
        setFotosPreviewUrls([]);
        setEditingRequestId(null);
        // Reset form
        setNewRequestData({
            categoria: "Electricidad",
            cliente: businessName,
            fecha: new Date().toISOString().split('T')[0],
            descripcion: "",
            equipoSeleccionado: "",
            trabajador_id: ""
        });
    };

    const handleSOSRequest = async () => {
        setNewRequestData({
            categoria: "Electricidad",
            cliente: businessName,
            fecha: new Date().toISOString().split('T')[0],
            descripcion: "",
            equipoSeleccionado: "",
            trabajador_id: ""
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
            fecha: job.fecha ? (job.fecha.includes('/') ? job.fecha.split('/').reverse().join('-') : job.fecha) : "",
            descripcion: job.descripcion || "",
            equipoSeleccionado: "",
            trabajador_id: ""
        });
        setFotosSOS([]);
        setFotosPreviewUrls([]);
        setIsEditingRequest(true);
        setEditingRequestId(job.id);
        setIsRequestModalOpen(true);
    };

    const handleAceptarCotizacion = async (jobId: number) => {
        try {
            await updateEstadoTrabajo(jobId, { estado: "Cotización Aceptada" });
            const updated = trabajosData.map(job => {
                if (job.id === jobId) {
                    return { ...job, estado: "Cotización Aceptada" as const };
                }
                return job;
            });
            saveJobs(updated);
            showAlert("Cotización Aceptada", "Has aceptado la propuesta. El administrador procederá a asignarte el trabajo.", "success");
        } catch (error) {
            console.error("Error al aceptar cotización:", error);
            showAlert("Error", "Hubo un problema al aceptar la cotización.", "error");
        }
    };

    const handleRechazarCotizacion = (jobId: number) => {
        setQuoteToReject(jobId);
        setRejectionReason("");
        setShowRejectionModal(true);
    };

    const handleSubmitRejection = async () => {
        if (!quoteToReject || !rejectionReason.trim()) {
            showAlert('Atención', 'Por favor ingresa un motivo para el rechazo.', 'warning');
            return;
        }
        try {
            await updateEstadoTrabajo(quoteToReject, { estado: "Cotización Rechazada" });
            
            // Enviar motivo como primer mensaje
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/trabajos/${quoteToReject}/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: `MOTIVO DE RECHAZO: ${rejectionReason}` })
            });

            const updated = trabajosData.map(job => {
                if (job.id === quoteToReject) {
                    return { ...job, estado: "Cotización Rechazada" as const };
                }
                return job;
            });
            saveJobs(updated);
            
            setShowRejectionModal(false);
            setRejectionReason("");
            setQuoteToReject(null);
            showAlert("Información", "Propuesta rechazada. Se ha iniciado un chat de negociación.", "info");
        } catch (error) {
            console.error("Error al rechazar:", error);
            showAlert("Error", "No se pudo rechazar la propuesta.", "error");
        }
    };

    const filteredTechnicians = tecnicosData.filter(t =>
        t.nombre.toLowerCase().includes(technicianSearch.toLowerCase())
    );

    const renderStatusBar = (job: Trabajo) => {
        const status = (job.estado || "").toLowerCase();
        let barClass = styles.yellow;
        let text: string = job.estado || "Pendiente";

        if (status === "cancelado") {
            barClass = styles.red;
            text = "SOLICITUD CANCELADA";
        } else if (status === "finalizado") {
            barClass = styles.green;
            text = "Finalizado";
        } else if (status === "rechazado por técnico" || status === "rechazado por tecnico") {
            barClass = styles.red;
            text = user?.role === 'tecnico' ? "RECHAZASTE ESTA ASIGNACIÓN" : "RECHAZADO POR TÉCNICO";
        } else if (job.tipo === "SOS") {
            barClass = styles.red;
            text = "¡ALERTA SOS!";
        } else if (status.includes("cotizaci")) {
            barClass = styles.blue;
            const hasTech = job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar";
            if (hasTech) {
                text = user?.role === 'tecnico' 
                    ? (job.tipo === 'Visita' ? "ASIGNACIÓN DE VISITA" : "SE TE ASIGNÓ ESTE TRABAJO 🛠️") 
                    : "TÉCNICO ASIGNADO";
                if (user?.role === 'tecnico') {
                    barClass = styles.orange;
                }
            } else {
                if (status.includes("aceptada") || status.includes("aprobada")) {
                    text = "COTIZACIÓN ACEPTADA";
                    barClass = styles.green;
                } else if (status.includes("rechazada")) {
                    text = "COTIZACIÓN RECHAZADA";
                    barClass = styles.red;
                } else {
                    text = user?.role === 'admin' ? "COTIZACIÓN ENVIADA" : "COTIZACIÓN DEL TRABAJO";
                }
            }
        } else if (status === "en proceso" || status === "en espera") {
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
        } else if (job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar") {
            barClass = user?.role === 'tecnico' ? styles.orange : styles.blue;
            text = user?.role === 'tecnico' 
                ? (job.tipo === 'Visita' ? "ASIGNACIÓN DE VISITA" : "SE TE ASIGNÓ ESTE TRABAJO 🛠️") 
                : "TÉCNICO ASIGNADO";
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
            <div className={styles.dashboardLayout} style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', minHeight: '80vh', border: '1px solid #e2e8f0', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.01)', boxSizing: 'border-box' }}>
                <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                    <div className={styles.headerWrapper} style={{ marginBottom: '20px' }}>
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
            <div className={styles.dashboardLayout} style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', minHeight: '80vh', border: '1px solid #e2e8f0', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.01)', boxSizing: 'border-box' }}>
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
            <div className={styles.dashboardLayout} style={{ background: '#f8fafc', padding: '24px', borderRadius: '24px', minHeight: '80vh', border: '1px solid #e2e8f0', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.01)', boxSizing: 'border-box' }}>
                <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                    <div className={styles.headerWrapper} style={{ marginBottom: '20px' }}>
                        <div>
                            <p className={styles.subTitle}>Equipos en la sucursal:</p>
                            <h2 className={styles.businessName}>{businessName}</h2>
                        </div>
                    </div>
                    <EquiposNegocio
                        businessId={Number(id)}
                        onViewReport={handleOpenReportDetail}
                    />
                </div>
                {/* MODAL DE REPORTE DETALLES (USA PORTAL) */}
                {reporteModalOpen && (
                    <ReporteDetailModal
                        isOpen={reporteModalOpen}
                        onClose={() => setReporteModalOpen(false)}
                        trabajo={reporteTrabajo}
                        task={reporteTaskInfo}
                        reporte={reporteData}
                        userRole={user?.role ?? undefined}
                    />
                )}
            </div>
        );
    }

    const jobsListContent = sortedDates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
            No se encontraron trabajos para este filtro.
        </div>
    ) : (
        sortedDates.map(date => (
            <div key={date}>
                {groupedJobs[date].map(trabajo => {
                    return (
                        <div
                            key={trabajo.id}
                            className={styles.jobCard}
                            onClick={(e) => {
                                if (!(e.target as HTMLElement).closest('button')) {
                                    const basePath = user?.role === 'tecnico' ? '/tecnico' : (user?.role === 'cliente' ? '/cliente' : (['autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '') ? '/autonomo' : (user?.role === 'encargado' ? '/encargado' : '/menu')));
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

                            <div className={styles.cardBodyWrapper}>
                                {parseFotoUrls(trabajo.foto_url).length > 0 && (
                                    <div 
                                        className={styles.verticalCarousel}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {parseFotoUrls(trabajo.foto_url).map((url, idx) => (
                                            <img 
                                                key={idx}
                                                src={url}
                                                alt={`Foto ${idx + 1}`}
                                                className={styles.carouselImg}
                                                onClick={() => setSelectedZoomImage(url)}
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className={styles.cardContent}>
                                    <div className={styles.cardLeftDetails}>
                                        {/* FILA SUPERIOR: FECHA Y MENU */}
                                        <div className={styles.headerRow}>
                                            <div className={styles.dateGroup}>
                                                <p className={styles.strikingDate}>
                                                    📅 Cita solicitada: {trabajo.fechaAsignada || trabajo.fecha}
                                                </p>
                                            </div>
                                            {/* ACCIONES - Solo Admin o Cliente en la parte derecha del header */}
                                            {user?.role === 'cliente' && (
                                                <div className={`${styles.menuContainer} ${styles.desktopOnlyEditContainer}`} onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        className={styles.editBtnSmall}
                                                        onClick={(e) => handleOpenEditRequest(e, trabajo)}
                                                        title="Editar"
                                                    >
                                                        <HiOutlinePencil size={14} />
                                                    </button>
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
                                                    {user?.role === 'tecnico' && trabajo.estado === 'Cotización Enviada' && (
                                                        <div style={{ display: 'flex', gap: '5px' }}>
                                                            <button onClick={(e) => { e.stopPropagation(); handleAceptarCotizacion(trabajo.id); }} style={{ flex: 1, padding: '5px', background: '#22c55e', color: 'white', borderRadius: '5px', border: 'none', fontSize: '12px' }}>Aceptar Propuesta</button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleRechazarCotizacion(trabajo.id); }} style={{ flex: 1, padding: '5px', background: '#ef4444', color: 'white', borderRadius: '5px', border: 'none', fontSize: '12px' }}>Rechazar / Negociar</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* CHAT DE NEGOCIACIÓN (Para el Técnico) */}
                                            {trabajo.estado === 'Cotización Rechazada' && (
                                                <div style={{ marginTop: '10px' }} onClick={(e) => e.stopPropagation()}>
                                                    <ChatTrabajo trabajoId={trabajo.id} />
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
                                                {/* Badge de tipo */}
                                                {trabajo.tipo && (
                                                    <span className={styles.jobTypeBadge}>
                                                        {trabajo.estado === 'Finalizado' && trabajo.tipo === "SOS" ? 'Finalizado' : trabajo.tipo}
                                                    </span>
                                                )}
                                                {/* Badge de prioridad/estado para móvil */}
                                                {(() => {
                                                    let text = trabajo.prioridad || "Media";
                                                    let badgeClass = styles.badgeMedia;
                                                    
                                                    if (trabajo.estado === 'Finalizado') {
                                                        text = "Finalizado";
                                                        badgeClass = styles.badgeFinalizado;
                                                    } else if (trabajo.estado === 'En Proceso') {
                                                        text = "En proceso";
                                                        badgeClass = styles.badgeEnProceso;
                                                    } else if (trabajo.prioridad === 'Alta' || trabajo.tipo === 'SOS' || trabajo.isEmergency) {
                                                        text = "Alta";
                                                        badgeClass = styles.badgeAlta;
                                                    } else if (trabajo.prioridad === 'Baja') {
                                                        text = "Baja";
                                                        badgeClass = styles.badgeBaja;
                                                    }
                                                    
                                                    return (
                                                        <span className={`${styles.statusPriorityBadge} ${badgeClass} ${styles.mobileOnlyStatusBadge}`}>
                                                            {text}
                                                        </span>
                                                    );
                                                })()}
                                                {/* Botón Editar para Móvil */}
                                                {user?.role === 'cliente' && (
                                                    <button
                                                        className={`${styles.editBtnSmall} ${styles.mobileOnlyEditBtn}`}
                                                        onClick={(e) => { e.stopPropagation(); handleOpenEditRequest(e, trabajo); }}
                                                        title="Editar"
                                                    >
                                                        <HiOutlinePencil size={14} />
                                                    </button>
                                                )}
                                                {/* Botón Asignar Técnico visible para Admin */}
                                                {user?.role === 'admin' && (
                                                    <div className={styles.actionBtns} onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            className={styles.trashBtn}
                                                            onClick={(e) => handleDeleteRequest(e, trabajo.id)}
                                                            title="Eliminar"
                                                        >
                                                            <HiOutlineTrash size={15} />
                                                        </button>
                                                    </div>
                                                )}
                                                {/* Botones de cliente */}
                                                {user?.role === 'cliente' && (
                                                    <button
                                                        className={styles.trashBtn}
                                                        onClick={(e) => handleDeleteRequest(e, trabajo.id)}
                                                        title="Eliminar"
                                                    >
                                                        <HiOutlineTrash size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* CONTENEDOR DERECHO CON PRIORIDAD / ESTADO Y CHEVRON */}
                                    <div className={styles.cardRightStatus}>
                                        {(() => {
                                            let text = trabajo.prioridad || "Media";
                                            let badgeClass = styles.badgeMedia;
                                            
                                            if (trabajo.estado === 'Finalizado') {
                                                text = "Finalizado";
                                                badgeClass = styles.badgeFinalizado;
                                            } else if (trabajo.estado === 'En Proceso') {
                                                text = "En proceso";
                                                badgeClass = styles.badgeEnProceso;
                                            } else if (trabajo.prioridad === 'Alta' || trabajo.tipo === 'SOS' || trabajo.isEmergency) {
                                                text = "Alta";
                                                badgeClass = styles.badgeAlta;
                                            } else if (trabajo.prioridad === 'Baja') {
                                                text = "Baja";
                                                badgeClass = styles.badgeBaja;
                                            }
                                            
                                            return (
                                                <span className={`${styles.statusPriorityBadge} ${badgeClass} ${styles.desktopOnlyStatusBadge}`}>
                                                    {text}
                                                </span>
                                            );
                                        })()}
                                        <HiOutlineChevronRight className={styles.cardChevron} size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        ))
    );

    const renderSummaryGrid = () => {
        const counts = getTabCounts();
        return (
            <div className={styles.summaryGrid}>
                <div className={styles.miniCountCard}>
                    <div className={`${styles.miniCountIconWrapper} ${styles.bgBlue}`}>
                        <HiOutlineListBullet />
                    </div>
                    <span className={styles.miniCountValue}>{counts.total}</span>
                    <span className={styles.miniCountLabel}>Total</span>
                </div>
                <div className={styles.miniCountCard}>
                    <div className={`${styles.miniCountIconWrapper} ${styles.bgGreen}`}>
                        <HiOutlineArrowPath />
                    </div>
                    <span className={styles.miniCountValue}>{counts.enProceso}</span>
                    <span className={styles.miniCountLabel}>En proceso</span>
                </div>
                <div className={styles.miniCountCard}>
                    <div className={`${styles.miniCountIconWrapper} ${styles.bgTeal}`}>
                        <HiOutlineCheckCircle />
                    </div>
                    <span className={styles.miniCountValue}>{counts.finalizadas}</span>
                    <span className={styles.miniCountLabel}>Finalizadas</span>
                </div>
                <div className={styles.miniCountCard}>
                    <div className={`${styles.miniCountIconWrapper} ${styles.bgPurple}`}>
                        <HiOutlineClipboardDocument />
                    </div>
                    <span className={styles.miniCountValue}>{counts.solicitud}</span>
                    <span className={styles.miniCountLabel}>Solicitudes</span>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.mainContainer}>
                {/* HEADER / BANNER PREMIUM */}
                <div className={styles.premiumHeader}>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleBannerChange} 
                    />
                    {businessImage ? (
                        <div className={styles.bannerWrapper} style={{ position: 'relative' }}>
                            <img 
                                src={businessImage} 
                                alt={businessName} 
                                className={styles.bannerImg} 
                                style={{ objectPosition: `center ${bannerY}%` }}
                            />
                            <div className={styles.bannerOverlay}>
                                <div className={styles.bannerContent}>
                                    <span className={styles.bannerLabel}>TRABAJOS DE LA SUCURSAL</span>
                                    <h1 className={styles.bannerTitle}>{businessName}</h1>
                                    {businessDetails && (
                                        <p className={styles.bannerStats} style={{ margin: '4px 0 0 0' }}>
                                            📍 {getBusinessAddress()}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {isAdjustingPosition && (
                                <div style={{ 
                                    position: 'absolute', 
                                    bottom: 16, 
                                    left: '50%', 
                                    transform: 'translateX(-50%)', 
                                    background: 'rgba(15, 23, 42, 0.95)', 
                                    padding: '12px 20px', 
                                    borderRadius: '16px', 
                                    zIndex: 100, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 15, 
                                    color: 'white', 
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                                }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Ajustar Encuadre Y:</span>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={bannerY} 
                                        onChange={(e) => setBannerY(Number(e.target.value))} 
                                        style={{ cursor: 'pointer', accentColor: '#f97316', width: '150px' }}
                                    />
                                    <button 
                                        onClick={async () => {
                                            await saveBannerPosition();
                                            setIsAdjustingPosition(false);
                                        }}
                                        style={{ 
                                            background: '#f97316', 
                                            border: 'none', 
                                            color: 'white', 
                                            fontWeight: 'bold', 
                                            cursor: 'pointer', 
                                            fontSize: '12px', 
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#ea580c'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#f97316'}
                                    >
                                        Guardar
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const match = businessImage.match(/[?&]posy=(\d+)/);
                                            setBannerY(match ? Number(match[1]) : 50);
                                            setIsAdjustingPosition(false);
                                        }}
                                        style={{ 
                                            background: 'rgba(255, 255, 255, 0.15)', 
                                            border: 'none', 
                                            color: 'white', 
                                            fontWeight: 'bold', 
                                            cursor: 'pointer', 
                                            fontSize: '12px', 
                                            padding: '6px 12px',
                                            borderRadius: '8px'
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}

                            {['cliente', 'encargado', 'autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '') && (
                                <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 10, zIndex: 50 }}>
                                    <button 
                                        onClick={() => setIsAdjustingPosition(!isAdjustingPosition)}
                                        style={{ 
                                            background: '#f97316', 
                                            border: '2px solid white', 
                                            borderRadius: '50%', 
                                            width: 44, 
                                            height: 44, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            cursor: 'pointer', 
                                            color: 'white', 
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                        }}
                                        title="Ajustar encuadre de imagen"
                                    >
                                        <MoveVertical size={24} color="white" style={{ width: 24, height: 24, flexShrink: 0 }} />
                                    </button>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{ 
                                            background: '#f97316', 
                                            border: '2px solid white', 
                                            borderRadius: '50%', 
                                            width: 44, 
                                            height: 44, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            cursor: 'pointer', 
                                            color: 'white', 
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                        }}
                                        title="Cambiar imagen de portada"
                                    >
                                        <Pencil size={24} color="white" style={{ width: 24, height: 24, flexShrink: 0 }} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.simpleHeader} style={{ position: 'relative' }}>
                            <h1 className={styles.businessTitle}>{businessName}</h1>
                            {businessDetails && (
                                <p className={styles.businessSubtitle} style={{ margin: '8px 0 0 0', color: '#64748b' }}>
                                    📍 {getBusinessAddress()}
                                </p>
                            )}
                            {['cliente', 'encargado', 'autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '') && (
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ position: 'absolute', top: 16, right: 16, background: '#f97316', border: '2px solid white', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', zIndex: 50, boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
                                    title="Añadir imagen de portada"
                                >
                                    <Pencil size={24} color="white" style={{ width: 24, height: 24, flexShrink: 0 }} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* SEARCH & ACTIONS */}
                <div className={styles.headerActionsRow}>
                    {/* BUSCADOR */}
                    <div className={styles.searchGroup}>
                        <input
                            type="text"
                            placeholder="Buscar trabajos..."
                            className={menuStyles.searchInput}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ margin: 0 }}
                        />
                        <button
                            className={menuStyles.filterBtn}
                            onClick={() => setIsFilterModalOpen(true)}
                        >
                            ⚙️
                        </button>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    {(user?.role?.toLowerCase() === 'cliente' || user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'encargado' || user?.role?.toLowerCase() === 'tecnico' || user?.role?.toLowerCase() === 'autonomo') && (
                        <div className={styles.actionButtonsGroup}>
                            {/* Botón SOS */}
                            {(user?.role?.toLowerCase() === 'cliente' || user?.role?.toLowerCase() === 'autonomo' || user?.role?.toLowerCase() === 'encargado') && (
                                <button
                                    className={styles.sosBtn}
                                    onClick={handleSOSRequest}
                                    translate="no"
                                >
                                    🚨 SOS
                                </button>
                            )}

                            {/* Botón Solicitud */}
                            {(user?.role?.toLowerCase() === 'cliente' || user?.role?.toLowerCase() === 'autonomo' || user?.role?.toLowerCase() === 'encargado') && (
                                <button
                                    className={styles.newRequestBtn}
                                    onClick={() => {
                                        setIsSOSRequest(false);
                                        setIsRequestModalOpen(true);
                                    }}
                                >
                                    <HiOutlineClipboardDocument size={18} />
                                    Solicitud
                                </button>
                            )}

                            {/* Botón Equipos */}
                            {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'cliente' || user?.role?.toLowerCase() === 'encargado' || user?.role?.toLowerCase() === 'autonomo') && (
                                <button
                                    className={styles.equiposBtn}
                                    onClick={() => setSearchParams({ tab: 'equipos' })}
                                >
                                    <HiOutlineArchiveBox size={18} />
                                    Equipos
                                </button>
                            )}

                            {/* Botón Ver Historial */}
                            {user?.role?.toLowerCase() === 'tecnico' && (
                                <button
                                    className={styles.historialBtn}
                                    onClick={() => setSearchParams({ tab: 'historial' })}
                                >
                                    <HiOutlineClock size={20} />
                                    Ver Historial
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ESTRUCTURA DE CONTENIDO */}
                {!isCotizacionesTab && !isHistorialTab && !isEquiposTab ? (
                    <div className={styles.dashboardGrid}>
                        {/* COLUMNA IZQUIERDA: PESTAÑAS Y TRABAJOS */}
                        <div className={styles.leftColumn}>
                            {/* BARRA DE PESTAÑAS DE ESTADO (FILTROS VISUALES) */}
                            <div className={styles.tabBarWrapper} style={{ justifyContent: 'flex-start', margin: '0 0 20px 0' }}>
                                <div className={styles.tabBarContainer}>
                                    {(() => {
                                        const counts = getTabCounts();
                                        return (
                                            <>
                                                <button
                                                    className={`${styles.tabButton} ${filterStatus === 'Todos' ? styles.tabButtonActive : ''}`}
                                                    onClick={() => setFilterStatus('Todos')}
                                                >
                                                    <span className={styles.tabIcon}><HiOutlineListBullet /></span>
                                                    Todas
                                                    <span className={styles.countBadge}>{counts.total}</span>
                                                </button>
                                                <button
                                                    className={`${styles.tabButton} ${filterStatus === 'En proceso' ? styles.tabButtonActive : ''}`}
                                                    onClick={() => setFilterStatus('En proceso')}
                                                >
                                                    <span className={styles.tabIcon}><HiOutlineArrowPath /></span>
                                                    En proceso
                                                    <span className={styles.countBadge}>{counts.enProceso}</span>
                                                </button>
                                                <button
                                                    className={`${styles.tabButton} ${filterStatus === 'Finalizadas' ? styles.tabButtonActive : ''}`}
                                                    onClick={() => setFilterStatus('Finalizadas')}
                                                >
                                                    <span className={styles.tabIcon}><HiOutlineCheckCircle /></span>
                                                    Finalizadas
                                                    <span className={styles.countBadge}>{counts.finalizadas}</span>
                                                </button>
                                                <button
                                                    className={`${styles.tabButton} ${filterStatus === 'Solicitud' ? styles.tabButtonActive : ''}`}
                                                    onClick={() => setFilterStatus('Solicitud')}
                                                >
                                                    <span className={styles.tabIcon}><HiOutlineClipboardDocument /></span>
                                                    Solicitudes
                                                    <span className={styles.countBadge}>{counts.solicitud}</span>
                                                </button>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* RESUMEN EXCLUSIVO PARA MÓVIL (SE MUESTRA ARRIBA DEL LISTADO) */}
                            <div className={styles.mobileSummaryWrapper}>
                                {renderSummaryGrid()}
                            </div>

                            {/* LISTADO DE TRABAJOS */}
                            <div className={styles.jobsSection} style={{ marginTop: 0 }}>
                                {jobsListContent}
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: RESUMEN Y RECIENTES */}
                        <div className={styles.rightColumn}>
                            {/* RESUMEN */}
                            <div className={styles.desktopSummaryWrapper}>
                                <div className={styles.sideCard}>
                                    <h3 className={styles.sideCardTitle}>Resumen</h3>
                                    {renderSummaryGrid()}
                                </div>
                            </div>

                            {/* TRABAJOS RECIENTES */}
                            <div className={styles.sideCard}>
                                <h3 className={styles.sideCardTitle}>Trabajos Recientes</h3>
                                <div className={styles.recentJobsList}>
                                    {(() => {
                                        const parseDate = (dateStr: string) => {
                                            const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
                                            if (parts.length === 3) {
                                                const [d, m, y] = parts.map(Number);
                                                return new Date(y, m - 1, d).getTime();
                                            }
                                            return new Date(dateStr).getTime();
                                        };

                                        const recentJobs = [...trabajosData]
                                            .filter(job => job.estado !== "Eliminado")
                                            .sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha))
                                            .slice(0, 4);

                                        if (recentJobs.length === 0) {
                                            return <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '10px 0' }}>No hay trabajos registrados.</div>;
                                        }

                                        return recentJobs.map(job => {
                                            let dotColor = '#f59e0b';
                                            if (job.estado === 'Finalizado') {
                                                dotColor = '#10b981';
                                            } else if (job.estado === 'Solicitud') {
                                                dotColor = '#8b5cf6';
                                            } else if (['Asignado', 'En Proceso'].includes(job.estado)) {
                                                dotColor = '#3b82f6';
                                            }

                                            return (
                                                <div 
                                                    key={job.id} 
                                                    className={styles.recentJobItem}
                                                    onClick={() => {
                                                        const basePath = user?.role === 'tecnico' ? '/tecnico' : (user?.role === 'cliente' ? '/cliente' : (['autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '') ? '/autonomo' : (user?.role === 'encargado' ? '/encargado' : '/menu')));
                                                        navigate(`${basePath}/trabajo-detalle/${job.id}`);
                                                    }}
                                                >
                                                    <div className={styles.recentJobInfo}>
                                                        <h4 className={styles.recentJobTitle}>{job.titulo}</h4>
                                                        <div className={styles.recentJobMeta}>
                                                            <span className={styles.statusIndicatorDot} style={{ backgroundColor: dotColor }}></span>
                                                            {job.estado} • {job.fecha}
                                                        </div>
                                                    </div>
                                                    <span className={styles.recentJobChevron}>
                                                        <HiOutlineChevronRight size={16} />
                                                    </span>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.jobsSection}>
                        {jobsListContent}
                    </div>
                )}
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
                            <button onClick={handleConfirmAssignment} className={styles.applyBtn} style={{ background: selectedAssignments.length === 0 ? '#ff5252' : '#f26522', color: '#fff', width: 'auto', padding: '12px 40px', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
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
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContentMedium}>
                        <h2 className={styles.modalTitle} style={isSOSRequest ? { color: '#e11d48' } : {}}>
                            {isSOSRequest ? "🚨 Nueva Emergencia SOS" : (isEditingRequest ? "Editar Solicitud" : "Nuevo Servicio")}
                        </h2>

                        <div className={styles.formGroup}>
                            <div className={styles.formGridRow}>
                                <div className={styles.formField}>
                                    <label className={styles.formLabel}>Categoría</label>
                                    <select
                                        className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
                                        value={newRequestData.categoria}
                                        onChange={(e) => {
                                            setNewRequestData({ ...newRequestData, categoria: e.target.value });
                                            if (e.target.value !== "Otro") setCustomCategoria("");
                                        }}
                                    >
                                        <option>Electricidad</option>
                                        <option>Plomeria</option>
                                        <option>Albañileria</option>
                                        <option>Limpieza</option>
                                        <option>Instalación</option>
                                        <option>Mantenimiento</option>
                                        <option value="Otro">Otro (Especificar)</option>
                                    </select>
                                    {newRequestData.categoria === "Otro" && (
                                        <input
                                            type="text"
                                            className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
                                            style={{ marginTop: '10px' }}
                                            placeholder="Escribe la categoría..."
                                            value={customCategoria}
                                            onChange={(e) => setCustomCategoria(e.target.value)}
                                        />
                                    )}
                                </div>

                                <div className={styles.formField}>
                                                    <label className={styles.formLabel}>Fecha para la cita solicitada</label>
                                                    <input
                                                        type="date"
                                                        className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
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
                                            className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
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
                                    className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
                                    placeholder="Ej: Pokémon Center"
                                    value={newRequestData.cliente}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, cliente: e.target.value })}
                                />
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Técnico Sugerido/Asignado (Opcional)</label>
                                <div className={styles.selectWrapper}>
                                    <select
                                        className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
                                        value={newRequestData.trabajador_id || ""}
                                        onChange={(e) => setNewRequestData({ ...newRequestData, trabajador_id: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar Técnico --</option>
                                        {tecnicosData.map(tecnico => (
                                            <option key={tecnico.id} value={tecnico.id}>
                                                {tecnico.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formField}>
                                <label className={styles.formLabel}>Descripción del problema</label>
                                <textarea
                                    className={`${styles.newServiceTextArea} ${isSOSRequest ? styles.newServiceTextAreaSos : ''}`}
                                    placeholder="Detalla lo que sucede o los requerimientos del servicio..."
                                    value={newRequestData.descripcion}
                                    onChange={(e) => setNewRequestData({ ...newRequestData, descripcion: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* INPUT FOTO MULTIPLE */}
                        <div style={{ marginTop: '15px', marginBottom: '15px' }}>
                            <label className={styles.formLabel}>Adjuntar fotos del problema (Opcional)</label>
                            
                            {fotosPreviewUrls.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', marginBottom: '15px' }}>
                                    {fotosPreviewUrls.map((url, index) => (
                                        <div key={url} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                            <img src={url} alt={`Vista previa ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setFotosSOS(prev => prev.filter((_, i) => i !== index));
                                                    setFotosPreviewUrls(prev => prev.filter((_, i) => i !== index));
                                                    URL.revokeObjectURL(url);
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    background: 'rgba(15, 23, 42, 0.7)',
                                                    border: 'none',
                                                    color: 'white',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    zIndex: 10,
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#ef4444'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.7)'}
                                                title="Quitar foto"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <label className={`${styles.uploadContainer} ${isSOSRequest ? styles.uploadContainerSos : ''}`} style={{ flex: 1, position: 'relative', cursor: 'pointer', padding: '15px 10px' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        multiple
                                        onChange={(e) => {
                                            const files = e.target.files ? Array.from(e.target.files) : [];
                                            if (files.length > 0) {
                                                setFotosSOS(prev => [...prev, ...files]);
                                                const newUrls = files.map(file => URL.createObjectURL(file));
                                                setFotosPreviewUrls(prev => [...prev, ...newUrls]);
                                            }
                                            e.target.value = '';
                                        }}
                                        style={{ display: 'none' }}
                                    />
                                    <span className={styles.uploadIcon}>📸</span>
                                    <span className={`${styles.uploadText} ${isSOSRequest ? styles.uploadTextSos : ''}`} style={{ fontSize: '13px' }}>
                                        Tomar Foto
                                    </span>
                                </label>

                                <label className={`${styles.uploadContainer} ${isSOSRequest ? styles.uploadContainerSos : ''}`} style={{ flex: 1, position: 'relative', cursor: 'pointer', padding: '15px 10px' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => {
                                            const files = e.target.files ? Array.from(e.target.files) : [];
                                            if (files.length > 0) {
                                                setFotosSOS(prev => [...prev, ...files]);
                                                const newUrls = files.map(file => URL.createObjectURL(file));
                                                setFotosPreviewUrls(prev => [...prev, ...newUrls]);
                                            }
                                            e.target.value = '';
                                        }}
                                        style={{ display: 'none' }}
                                    />
                                    <span className={styles.uploadIcon}>🖼️</span>
                                    <span className={`${styles.uploadText} ${isSOSRequest ? styles.uploadTextSos : ''}`} style={{ fontSize: '13px' }}>
                                        Abrir Galería
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.requestModalActions}>
                            <button
                                onClick={() => {
                                    setIsRequestModalOpen(false);
                                    setIsSOSRequest(false);
                                    setFotosSOS([]);
                                    setFotosPreviewUrls([]);
                                }}
                                className={styles.cancelBtnLarge}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmRequest}
                                className={`${styles.confirmBtnLarge} ${isSOSRequest ? styles.confirmBtnLargeSos : ''}`}
                            >
                                {isSOSRequest ? "Confirmar Emergencia" : "Confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL DE REPORTE DETALLES (USA PORTAL) */}
            {reporteModalOpen && (
                <ReporteDetailModal
                    isOpen={reporteModalOpen}
                    onClose={() => setReporteModalOpen(false)}
                    trabajo={reporteTrabajo}
                    task={reporteTaskInfo}
                    reporte={reporteData}
                    userRole={user?.role ?? undefined}
                />
            )}

            {/* MODAL RECHAZO TÉCNICO */}
            {showRejectionModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ width: '400px' }}>
                        <h3 style={{ margin: '0 0 15px 0' }}>Motivo del Rechazo</h3>
                        <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#64748b' }}>
                            Ingresa una contrapropuesta o el motivo por el cual rechazas el precio asignado.
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Escribe aquí tu comentario para iniciar la negociación..."
                            style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px', outline: 'none', resize: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowRejectionModal(false)}
                                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmitRejection}
                                style={{ padding: '8px 16px', background: '#ef4444', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                            >
                                Rechazar y Negociar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* PROBLEM DETAILS / IMAGE ZOOM MODAL */}
            {selectedZoomImage && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0, 0, 0, 0.85)', zIndex: 9999, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: '20px',
                        backdropFilter: 'blur(5px)'
                    }}
                    onClick={() => setSelectedZoomImage(null)}
                >
                    <div 
                        style={{ 
                            position: 'relative', maxWidth: '95%', maxHeight: '95%', display: 'flex', flexDirection: 'column', 
                            alignItems: 'center', background: '#fff', padding: '30px', borderRadius: '24px', overflowY: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedZoomImage(null)}
                            style={{ position: 'absolute', top: '15px', right: '15px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold', zIndex: 10000 }}
                        >
                            ✕
                        </button>
                        
                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '20px', width: '100%', textAlign: 'left' }}>Detalles de la Evidencia</h2>
                        
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img
                                src={selectedZoomImage}
                                alt="Zoomed Evidence"
                                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrabajoDetalle;
