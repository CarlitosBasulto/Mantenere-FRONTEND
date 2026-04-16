import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./AdminDetalleTrabajo.module.css";
import { useAuth } from "../../context/AuthContext";
import {
    HiOutlineInformationCircle,
    HiOutlineWrench,
    HiOutlineClipboardDocumentList,
    HiOutlineClock,
    HiOutlineCurrencyDollar,
    HiOutlineUser,
    HiOutlineMapPin,
    HiOutlinePhone,
    HiOutlineChatBubbleLeftRight,
    HiOutlineBuildingOffice2,
    HiOutlineBolt,
    HiOutlineCog6Tooth,
    HiOutlineSquare3Stack3D, // For masonry
    HiOutlinePencilSquare, // For general categories
    HiOutlineXMark,
    HiOutlineIdentification,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineDocumentText
} from "react-icons/hi2";
import { getTrabajo, updateEstadoTrabajo, assignTrabajador, updateTrabajo } from "../../services/trabajosService";
import { createActividad, getActividadesByTrabajo, deleteActividad } from "../../services/actividadesService";
import { getTrabajadores } from "../../services/trabajadoresService";
import { saveCotizacion, updateCotizacion, deleteCotizacion, updateCotizacionStatus, getCotizacionesByTrabajoId, type Cotizacion } from "../../services/cotizacionesService";
import { createNotificacionByRole, createNotificacion } from "../../services/notificacionesService";
import { getReporteByTrabajoId, type Reporte as ReporteFinal } from "../../services/reportesService";
import { useModal } from "../../context/ModalContext";
import { getNegocio } from "../../services/negociosService";
import LevantamientoModal from "../../components/LevantamientoModal";
import api from "../../services/api";


export interface CotizacionData {
    id?: number;
    costo: string;
    notas: string;
    archivo: string;
    fecha: string;
}

// Interfaces
interface Trabajo {
    id: number;
    titulo: string;
    ubicacion: string;
    tecnico: string;
    fecha: string;
    estado: "En Espera" | "Finalizado" | "En Proceso" | "Asignado" | "Solicitud" | "Cotización Enviada" | "Cotización Aceptada" | "Cotización Rechazada" | "Cotización Aprobada" | "Pendiente de Cotizar";
    tipo?: "Visita" | "Trabajo" | "Nueva Solicitud";
    visitado?: boolean;
    descripcion?: string;
    sucursal?: string;
    encargado?: string;
    telefonoEncargado?: string;
    subgerente?: string;
    telefonoSubgerente?: string;
    plaza?: string;
    ciudad?: string;
    calle?: string;
    numero?: string;
    colonia?: string;
    cp?: string;
    manzana?: string;
    lote?: string;
    referencias?: string;
    fechaAsignada?: string;
    horaAsignada?: string;
    cotizacion?: CotizacionData;
        asignaciones?: {
        tecnicoId: number;
        tecnicoNombre: string;
        fechaAsignada: string;
        horaAsignada: string;
    }[];
    fechaSolicitud?: string;
    clienteUserId?: number;  // user_id del negocio (cliente) para notificaciones
}

interface SubTarea {
    id: number;
    titulo: string;
    descripcion: string;
    estado: "Completa" | "Pendiente" | "Nueva"; // Added "Nueva"
    tecnicoId?: number;
    tecnicoNombre?: string;
    esCotizacion?: boolean;
    cotizacionMonto?: number | string;
    cotizacionDetalles?: string;
    cotizacionEstado?: "Pendiente" | "Aprobada" | "Rechazada";
    cotizacionArchivo?: string;
    serviceData?: {
        marca: string;
        modelo: string;
        pieza?: string;
        garantia?: string;
    };
}

interface Tecnico {
    id: number;
    nombre: string;
}

const AdminDetalleTrabajo: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();

    // Permitir abrir la pestaña de cotización directamente vía URL
    const searchParams = new URLSearchParams(location.search);
    const initialTab = searchParams.get('tab') === 'cotizacion' ? 'Cotización' : (user?.role === 'cliente' ? "Historial" : "Datos");
    const [activeTab, setActiveTab] = useState<"Datos" | "Trabajo" | "Registro" | "Historial" | "Cotización">(initialTab);

    // Sincronizar pestaña activa con parámetro de URL (Deep Linking)
    useEffect(() => {
        const tabParam = new URLSearchParams(location.search).get('tab');
        if (tabParam === 'cotizacion') {
            setActiveTab('Cotización');
        } else if (tabParam === 'historial') {
            setActiveTab('Historial');
        }
    }, [location.search]);

    // Modal Imagen Full-Screen
    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);

    // MOCK DATA
    const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
    const [subTareas, setSubTareas] = useState<SubTarea[]>([]);
    const [reporteFinal, setReporteFinal] = useState<any>(null);
    // const [isFromNewReq, setIsFromNewReq] = useState(false);

    // MODAL DE SEGURIDAD
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [selectedTaskForReport, setSelectedTaskForReport] = useState<SubTarea | null>(null);

    // MODAL DATOS SUCURSAL
    const [isSucursalModalOpen, setIsSucursalModalOpen] = useState(false);

    // MODAL EQUIPOS = LEVANTAMIENTO TÉCNICO
    const [isAdminLevantamientoModalOpen, setIsAdminLevantamientoModalOpen] = useState(false);
    const [adminLevantamientoData, setAdminLevantamientoData] = useState<any[]>([]);

    const handleOpenEquipos = async () => {
        if (!(trabajo as any).businessId) {
            showAlert("Error", "Este trabajo no tiene una empresa asociada válida.", "error");
            return;
        }
        try {
            const negocioResponse = await getNegocio((trabajo as any).businessId);
            const negocio = negocioResponse.data || negocioResponse;
            // Manejar si el arreglo es null
            setAdminLevantamientoData(negocio.areas || []);
            setIsAdminLevantamientoModalOpen(true);
        } catch (error) {
            showAlert("Error", "No se pudo cargar la información de equipos.", "error");
        }
    };


    // ESTADOS COTIZACIÓN (nueva cotización)
    const [costo, setCosto] = useState("");
    const [notas, setNotas] = useState("");
    const [archivoFile, setArchivoFile] = useState<File | null>(null);
    const [nombreArchivo, setNombreArchivo] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addFileInputRef = useRef<HTMLInputElement>(null);

    // ESTADO: lista de cotizaciones del trabajo
    const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);

    // ESTADO: edición de cotización existente
    const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null);
    const [editCosto, setEditCosto] = useState("");
    const [editNotas, setEditNotas] = useState("");
    const [editArchivoFile, setEditArchivoFile] = useState<File | null>(null);
    const [editNombreArchivo, setEditNombreArchivo] = useState("");
    const editFileInputRef = useRef<HTMLInputElement>(null);
    const [tecnicosData, setTecnicosData] = useState<Tecnico[]>([]);
    const [showAddQuoteForm, setShowAddQuoteForm] = useState(false);

    // ESTADOS RECHAZO CON MOTIVO
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [quoteToReject, setQuoteToReject] = useState<number | null>(null);

    useEffect(() => {
        const fetchTecnicos = async () => {
            try {
                const data = await getTrabajadores();
                // Filtramos activos si es que hay un campo estado activo (opcional) o tomamos todos
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

    useEffect(() => {
        const fetchAll = async () => {
            if (!id) return;
            let currentTech = "Admin/Técnico";
            try {
                const data = await getTrabajo(Number(id));
                currentTech = data.trabajador?.nombre || "Sin Asignar";
                const calculatedTipo = (["Cotización Enviada", "Cotización Aceptada", "Cotización Aprobada", "Cotización Rechazada", "En Proceso", "Finalizado"].includes(data.estado) || data.visitado) ? "Trabajo" : "Visita";

                const mappedJob = {
                    id: data.id,
                    titulo: data.titulo || (data as any).descripcion?.substring(0, 20) || "Servicio",
                    ubicacion: data.negocio?.ubicacion || "Por definir",
                    tecnico: currentTech,
                    fecha: data.fecha_programada || new Date(data.created_at).toLocaleDateString('es-MX'),
                    estado: (data.estado === "Pendiente" ? "Solicitud" : data.estado) as any,
                    tipo: calculatedTipo,
                    visitado: data.visitado,
                    descripcion: data.descripcion,
                    sucursal: data.negocio?.nombre || "Por definir",
                    encargado: data.negocio?.encargado || "No registrado",
                    telefonoEncargado: data.negocio?.telefono || data.negocio?.telefonoEncargado || "S/N",
                    subgerente: data.negocio?.subgerente || "No registrado",
                    telefonoSubgerente: data.negocio?.telefonoSubgerente || "S/N",
                    plaza: data.negocio?.nombrePlaza || data.negocio?.nombre_plaza || "Por definir",
                    ciudad: data.negocio?.ciudad || "Mérida",
                    calle: data.negocio?.calle || "Por definir",
                    numero: data.negocio?.numero || "S/N",
                    colonia: data.negocio?.colonia || "Por definir",
                    cp: data.negocio?.cp || "S/N",
                    manzana: data.negocio?.manzana || "Por definir",
                    lote: data.negocio?.lote || "Por definir",
                    referencias: data.negocio?.referencias || "Por definir",
                    fechaSolicitud: data.created_at ? new Date(data.created_at).toLocaleDateString('es-MX') : "No registrada",
                    businessId: data.negocio_id || data.negocio?.id,
                    clienteUserId: data.negocio?.user_id || null
                };
                
                // Autofill Marca and Modelo if there is a linked MantenimientoSolicitud
                const solicitud = data.mantenimiento_solicitud_visita ||  data.mantenimientoSolicitudVisita || data.mantenimiento_solicitud_reparacion || data.mantenimientoSolicitudReparacion;
                const equipo = solicitud ? (solicitud.levantamiento_equipo || solicitud.levantamientoEquipo) : null;
                
                if (equipo) {
                    setServiceMarca(equipo.marca || "");
                    setServiceModelo(equipo.modelo || "");
                    setServiceEquipoId(equipo.id);
                } else if (data.descripcion && typeof data.descripcion === 'string' && data.descripcion.includes('[Equipo:')) {
                    const match = data.descripcion.match(/\[Equipo:\s*(.+?)\]/);
                    if (match && match[1]) {
                        const equipoNombre = match[1].trim();
                        try {
                            const bizId = data.negocio_id || data.negocio?.id;
                            if (bizId) {
                                const resEq = await api.get(`/negocios/${bizId}/equipos`);
                                const foundEq = resEq.data.find((e: any) => e.nombre.toLowerCase().trim() === equipoNombre.toLowerCase());
                                if (foundEq) {
                                    setServiceMarca(foundEq.marca || "");
                                    setServiceModelo(foundEq.modelo || "");
                                    setServiceEquipoId(foundEq.id);
                                }
                            }
                        } catch (err) {
                            console.error("Error fetching fallback equipment:", err);
                        }
                    }
                }

                // FETCH REPORTE FINAL DESDE DB
                try {
                    const dbReport = await getReporteByTrabajoId(Number(id));
                    if (dbReport && dbReport.solucion) {
                        if (dbReport.solucion.trim().startsWith('{')) {
                            try {
                                const parsed = JSON.parse(dbReport.solucion);
                                setReporteFinal({ ...parsed, dbId: dbReport.id });
                            } catch (e) {
                                console.error("Error parsing report JSON:", e);
                            }
                        }
                    }
                } catch (reportErr) {
                    console.error("Error fetching report from DB:", reportErr);
                }

                setTrabajo(mappedJob as any);
            } catch (error) {
                console.error("No se pudo hallar el trabajo en servidor:", error);
                setTrabajo(null);
            }

            try {
                const acts = await getActividadesByTrabajo(Number(id));
                const mappedSubTareas = acts.map((act: any) => {
                    let finalDesc = act.descripcion || "";
                    let parsedMonto = "Por Evaluar";
                    let esCot = true;
                    let sData = null;

                    const quoteMarker = "|||QUOTE_DATA|||";
                    const serviceMarker = "|||SERVICE_DATA|||";

                    let displayDesc = finalDesc.split(serviceMarker)[0].split(quoteMarker)[0].trim();

                    if (finalDesc.includes(serviceMarker)) {
                        const parts = finalDesc.split(serviceMarker);
                        try {
                            sData = JSON.parse(parts[1].split(quoteMarker)[0].trim());
                        } catch (e) { }
                    }

                    if (finalDesc.includes(quoteMarker)) {
                        const parts = finalDesc.split(quoteMarker);
                        try {
                            const qData = JSON.parse(parts[1].split(serviceMarker)[0].trim());
                            if (qData.monto) parsedMonto = qData.monto;
                            if (qData.detalles) displayDesc += "\n\nNotas de cotización:\n" + qData.detalles;
                        } catch (e) { }
                    }

                    return {
                        id: act.id,
                        titulo: act.tipo,
                        descripcion: displayDesc,
                        estado: "Nueva",
                        tecnicoNombre: currentTech,
                        esCotizacion: esCot,
                        cotizacionMonto: parsedMonto,
                        cotizacionDetalles: displayDesc,
                        cotizacionArchivo: "",
                        cotizacionEstado: "Sugerencia de Técnico",
                        serviceData: sData
                    };
                });
                setSubTareas(mappedSubTareas as any);

                // Cargar cotizaciones reales (array)
                try {
                    const cotizs = await getCotizacionesByTrabajoId(Number(id));
                    setCotizaciones(cotizs);
                    // Compat: si hay cotizaciones, ponemos la primera en trabajo.cotizacion para compatible con otros usos
                    if (cotizs.length > 0) {
                        const first = cotizs[0];
                        setTrabajo((prev: any) => prev ? {
                            ...prev,
                            cotizacion: {
                                id: first.id,
                                costo: first.monto,
                                notas: first.descripcion || "",
                                archivo: first.archivo || "",
                                fecha: first.updated_at ? new Date(first.updated_at).toLocaleDateString('es-MX') : ""
                            }
                        } : prev);
                    }
                } catch (e) { console.log('Sin cotizaciones previas'); }

            } catch (error) {
                console.error("Error al cargar historial desde Laravel:", error);
            }
        };
        fetchAll();
    }, [id]);


    // MODAL STATES
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTechnicians, setSelectedTechnicians] = useState<number[]>([]);
    const [technicianSearch, setTechnicianSearch] = useState("");
    const [selectedType, setSelectedType] = useState<"Visita" | "Trabajo">("Visita");
    const [selectedHistoryTask, setSelectedHistoryTask] = useState<SubTarea | null>(null);
    const [asignarFecha, setAsignarFecha] = useState("");
    const [asignarHora, setAsignarHora] = useState("");

    const handleTechToggle = (id: number) => {
        if (selectedTechnicians.includes(id)) {
            setSelectedTechnicians(selectedTechnicians.filter(tId => tId !== id));
        } else {
            setSelectedTechnicians([...selectedTechnicians, id]);
        }
    };

    // ADD NEW TASK MODAL STATE
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [newTaskDescription, setNewTaskDescription] = useState("");
    const [isQuoteIncluded, setIsQuoteIncluded] = useState(false);
    const [newQuoteAmount, setNewQuoteAmount] = useState("");
    const [newQuoteDetails, setNewQuoteDetails] = useState("");
    const [newQuoteFileName, setNewQuoteFileName] = useState("");

    // SERVICE TYPE FIELDS (NEW)
    const [activeServiceType, setActiveServiceType] = useState<"Mantenimiento" | "Instalacion">("Mantenimiento");
    const [serviceMarca, setServiceMarca] = useState("");
    const [serviceModelo, setServiceModelo] = useState("");
    const [serviceEquipoId, setServiceEquipoId] = useState<number | null>(null);
    const [servicePieza, setServicePieza] = useState("");
    const [serviceGarantia, setServiceGarantia] = useState("");
    const [refacciones, setRefacciones] = useState<{pieza: string, cantidad: number, costo_estimado?: string}[]>([]);


    const handleNewQuoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setNewQuoteFileName(file.name);
            const reader = new FileReader();
            reader.onload = () => {
                // Archivo procesado
            };
            reader.readAsDataURL(file);
        }
    };

    const filteredTechnicians = tecnicosData.filter(t =>
        t.nombre.toLowerCase().includes(technicianSearch.toLowerCase())
    );

    const handleConfirmAssignment = async () => {
        if (trabajo && selectedTechnicians.length > 0) {
            const assignedNames = selectedTechnicians
                .map(id => tecnicosData.find(t => t.id === id)?.nombre)
                .filter(Boolean)
                .join(", ");

            if (assignedNames) {
                try {
                    // Update in Backend
                    await assignTrabajador(trabajo.id, selectedTechnicians[0]);

                    const needsStateUpdate = trabajo.estado === "Solicitud" || trabajo.estado === "Cotización Aceptada" || trabajo.estado === "Cotización Aprobada";
                    const newEstado = needsStateUpdate ? "Asignado" : trabajo.estado;

                    let nuevoTitulo = trabajo.titulo || "";
                    if (selectedType === "Trabajo" && nuevoTitulo.includes("(Visita)")) {
                        nuevoTitulo = nuevoTitulo.replace("(Visita)", "(Reparación)");
                    } else if (selectedType === "Visita" && nuevoTitulo.includes("(Reparación)")) {
                        nuevoTitulo = nuevoTitulo.replace("(Reparación)", "(Visita)");
                    }

                    // Always sync visited status regardless of current state to allow reverting mistakes
                    await updateEstadoTrabajo(trabajo.id, { 
                        estado: newEstado,
                        visitado: selectedType === "Trabajo" 
                    });

                    // Sync the type and title explicitly
                    await updateTrabajo(trabajo.id, {
                        tipo: selectedType,
                        titulo: nuevoTitulo
                    });

                    const updatedJob = {
                        ...trabajo,
                        tecnico: assignedNames,
                        estado: newEstado,
                        tipo: selectedType,
                        titulo: nuevoTitulo,
                        visitado: selectedType === "Trabajo",
                        fechaAsignada: asignarFecha,
                        horaAsignada: asignarHora
                    };
                    setTrabajo(updatedJob);

                    // Notificaciones al técnico
                    selectedTechnicians.forEach(id => {
                        const tech = tecnicosData.find(t => t.id === id);
                        if (tech) {
                            const techKey = `tecnico_notifications_${tech.nombre}`;
                            const techNotifs = JSON.parse(localStorage.getItem(techKey) || '[]');
                            techNotifs.unshift({
                                id: Date.now() + Math.random(),
                                titulo: 'Nuevo Trabajo Asignado',
                                mensaje: `Te han asignado un nuevo trabajo: ${trabajo.titulo} en ${trabajo.sucursal}.`,
                                fecha: new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                                leida: false,
                                jobId: trabajo.id
                            });
                            localStorage.setItem(techKey, JSON.stringify(techNotifs));
                        }
                    });
                    window.dispatchEvent(new Event('storage'));
                    showAlert(
                        'Técnico Asignado',
                        'El técnico ha sido asignado exitosamente al trabajo.',
                        'success'
                    );
                } catch (error) {
                    console.error("Error asignando técnico:", error);
                    showAlert(
                        'Error de Servidor',
                        'Hubo un problema al conectar con la base de datos.',
                        'error'
                    );
                }
            }
        }
        setIsModalOpen(false);
    };

    const handleAddTask = async () => {
        try {
            if (editingTaskId) {
                showAlert(
                    'Edición Deshabilitada',
                    'La edición de actividades ya completadas está deshabilitada en el sistema en vivo.',
                    'info'
                );
            } else {
                let desc = newTaskDescription;

                // Serializar datos técnicos (Marca, Modelo, etc.)
                const serviceData = {
                    tipoServicio: activeServiceType,
                    marca: serviceMarca,
                    modelo: serviceModelo,
                    pieza: activeServiceType === 'Instalacion' ? servicePieza : '',
                    garantia: activeServiceType === 'Instalacion' ? serviceGarantia : ''
                };
                desc += ` \n|||SERVICE_DATA||| ${JSON.stringify(serviceData)}`;

                if (isQuoteIncluded) {
                    const quotePayload = { monto: newQuoteAmount, detalles: newQuoteDetails };
                    desc += ` \n|||QUOTE_DATA||| ${JSON.stringify(quotePayload)}`;
                }

                const payloadRefacciones = refacciones.map(r => ({
                    pieza: r.pieza,
                    cantidad: Number(r.cantidad),
                    costo_estimado: r.costo_estimado ? Number(r.costo_estimado) : undefined,
                    levantamiento_equipo_id: serviceEquipoId || undefined
                }));

                const body = {
                    trabajo_id: Number(id),
                    tipo: activeServiceType, // Usamos Mantenimiento o Instalación como tipo principal
                    descripcion: desc,
                    refacciones: payloadRefacciones
                };
                await createActividad(body);
                const acts = await getActividadesByTrabajo(Number(id));
                const mappedSubTareas = acts.map((act: any) => {
                    let finalDesc = act.descripcion || "";
                    let parsedMonto = "Por Evaluar";
                    let esCot = true;
                    let sData = null;

                    const quoteMarker = "|||QUOTE_DATA|||";
                    const serviceMarker = "|||SERVICE_DATA|||";

                    let displayDesc = finalDesc.split(serviceMarker)[0].split(quoteMarker)[0].trim();

                    if (finalDesc.includes(serviceMarker)) {
                        const parts = finalDesc.split(serviceMarker);
                        try {
                            sData = JSON.parse(parts[1].split(quoteMarker)[0].trim());
                        } catch (e) { }
                    }

                    if (finalDesc.includes(quoteMarker)) {
                        const parts = finalDesc.split(quoteMarker);
                        try {
                            const qData = JSON.parse(parts[1].split(serviceMarker)[0].trim());
                            if (qData.monto) parsedMonto = qData.monto;
                            if (qData.detalles) displayDesc += "\n\nNotas de cotización:\n" + qData.detalles;
                        } catch (e) { }
                    }

                    return {
                        id: act.id,
                        titulo: act.tipo,
                        descripcion: displayDesc,
                        estado: "Nueva",
                        tecnicoNombre: user?.name,
                        esCotizacion: esCot,
                        cotizacionMonto: parsedMonto,
                        cotizacionDetalles: displayDesc,
                        cotizacionArchivo: "",
                        cotizacionEstado: "Sugerencia de Técnico",
                        serviceData: sData
                    };
                });
                setSubTareas(mappedSubTareas as any);
                showAlert(
                    'Actividad Registrada',
                    'La actividad ha sido guardada y sincronizada correctamente.',
                    'success'
                );
            }
        } catch (error: any) {
            console.error("Error added task:", error);
            showAlert(
                'Error de API',
                error.response?.data?.message || error.message,
                'error'
            );
            return;
        }

        setIsAddModalOpen(false);
        setEditingTaskId(null);
        setNewTaskDescription("");
        setIsQuoteIncluded(false);
        setNewQuoteAmount("");
        setNewQuoteDetails("");
        setNewQuoteFileName("");
        // Reset service fields
        setServiceMarca("");
        setServiceModelo("");
        setServicePieza("");
        setServiceGarantia("");
        setRefacciones([]);
        setActiveTab("Registro");
    };


    const handleDeleteTask = async (e: React.MouseEvent, taskId: number) => {
        e.stopPropagation();
        showConfirm(
            '¿Eliminar Actividad?',
            '¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.',
            async () => {
                try {
                    await deleteActividad(taskId);
                    // Refresh from server to stay in sync
                    const acts = await getActividadesByTrabajo(Number(id));
                    const serviceMarker = "|||SERVICE_DATA|||";
                    const quoteMarker = "|||QUOTE_DATA|||";
                    const mappedSubTareas = acts.map((act: any) => {
                        let finalDesc = act.descripcion || "";
                        let parsedMonto = "Por Evaluar";
                        let sData = null;
                        let displayDesc = finalDesc.split(serviceMarker)[0].split(quoteMarker)[0].trim();
                        if (finalDesc.includes(serviceMarker)) {
                            try { sData = JSON.parse(finalDesc.split(serviceMarker)[1].split(quoteMarker)[0].trim()); } catch (e) { }
                        }
                        if (finalDesc.includes(quoteMarker)) {
                            try {
                                const qData = JSON.parse(finalDesc.split(quoteMarker)[1].split(serviceMarker)[0].trim());
                                if (qData.monto) parsedMonto = qData.monto;
                                if (qData.detalles) displayDesc += "\n\nNotas de cotización:\n" + qData.detalles;
                            } catch (e) { }
                        }
                        return {
                            id: act.id,
                            titulo: act.tipo,
                            descripcion: displayDesc,
                            estado: "Nueva",
                            tecnicoNombre: user?.name,
                            esCotizacion: true,
                            cotizacionMonto: parsedMonto,
                            cotizacionDetalles: displayDesc,
                            cotizacionArchivo: "",
                            cotizacionEstado: "Sugerencia de Técnico",
                            serviceData: sData
                        };
                    });
                    setSubTareas(mappedSubTareas as any);
                    showAlert('Eliminado', 'La actividad ha sido eliminada correctamente.', 'success');
                } catch (error: any) {
                    showAlert('Error al Eliminar', error.response?.data?.message || 'No se pudo eliminar la actividad del servidor.', 'error');
                }
            }
        );
    };

    const openEditModal = (e: React.MouseEvent, tarea: SubTarea) => {
        e.stopPropagation();
        setEditingTaskId(tarea.id);
        setNewTaskDescription(tarea.descripcion);
        setIsAddModalOpen(true);
    };


    const handleFinishVisit = async () => {
        if (!trabajo) return;

        const isVisita = trabajo.tipo === "Visita";
        const message = isVisita
            ? "¿Confirmar diagnóstico y enviar al administrador? Ya no podrás editar esta visita."
            : "¿Confirmar finalización del trabajo? Ya no podrás editar este registro.";

        showConfirm(
            isVisita ? 'Finalizar Visita' : 'Finalizar Trabajo',
            message,
            async () => {
                try {
                    if (isVisita) {
                        await updateEstadoTrabajo(trabajo.id, { estado: "En Espera", visitado: true });
                        try {
                            await assignTrabajador(trabajo.id, null as any);
                        } catch (e: any) {
                            if (e.response && (e.response.status === 422 || e.response.status === 405)) {
                                try { await updateTrabajo(trabajo.id, { trabajador_id: null }); } catch (e2) {}
                            }
                        }
                        const updatedJob = {
                            ...trabajo,
                            estado: "En Espera" as any,
                            visitado: true,
                            tecnico: "Sin asignar"
                        };
                        setTrabajo(updatedJob);

                        // Notificar al Admin via BD
                        try {
                            await createNotificacionByRole({
                                role: 'admin',
                                titulo: '🔍 Visita Finalizada',
                                mensaje: `El técnico ${user?.name || 'Sistema'} ha concluido la visita en ${trabajo.sucursal || 'la sucursal'}. Ya puede enviar cotización al cliente.`,
                                enlace: `/menu/trabajo-detalle/${trabajo.id}`
                            });
                        } catch (notiErr) {
                            console.error("Error enviando notificación de visita finalizada:", notiErr);
                        }
                    } else {
                        await updateEstadoTrabajo(trabajo.id, { estado: "Finalizado" });
                        const updatedJob = {
                            ...trabajo,
                            estado: "Finalizado" as any,
                            tecnico: trabajo.tecnico
                        };
                        setTrabajo(updatedJob);

                        // Notificar al Admin que el trabajo fue finalizado
                        try {
                            await createNotificacionByRole({
                                role: 'admin',
                                titulo: '✅ Trabajo Finalizado',
                                mensaje: `El técnico ${user?.name || 'Sistema'} finalizó el trabajo en ${trabajo.sucursal || 'la sucursal'}. El reporte ya está disponible.`,
                                enlace: `/menu/trabajo-detalle/${trabajo.id}`
                            });
                        } catch (notiErr) {
                            console.error("Error enviando notificación de trabajo finalizado:", notiErr);
                        }
                    } // end else (Trabajo)
                    showAlert(
                        'Éxito',
                        'Reporte confirmado y enviado al Administrador.',
                        'success'
                    );

                    // Redirigir al técnico al menú para evitar que siga editando
                    if (user?.role === 'tecnico') {
                        navigate('/tecnico/solicitudes');
                    }
                } catch (error: any) {
                    showAlert(
                        'Error de Estado',
                        error.message,
                        'error'
                    );
                }
            }
        );
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNombreArchivo(file.name);
            setArchivoFile(file); // Guarda el objeto puro File para enviarlo
            const reader = new FileReader();
            reader.onloadend = () => {
                // Sirve solo para mantener el string en UI (opcional)
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEnviarCotizacion = async (keepOpen: boolean = false) => {
        if (!costo || !archivoFile || !trabajo) {
            showAlert('Campos Incompletos', 'Por favor, ingresa el costo y sube un documento.', 'info');
            return;
        }
        try {
            if (cotizaciones.length === 0) {
                await updateEstadoTrabajo(trabajo.id, { estado: "Cotización Enviada" });
                setTrabajo((prev: any) => prev ? { ...prev, estado: "Cotización Enviada" } : prev);
            }
            const formData = new FormData();
            formData.append('trabajo_id', trabajo.id.toString());
            formData.append('monto', costo);
            formData.append('descripcion', notas);
            formData.append('estado', "Pendiente");
            formData.append('archivo', archivoFile);
            const savedCotiz = await saveCotizacion(formData as any);
            setCotizaciones(prev => [...prev, savedCotiz]);

            // Notificar al cliente que recibió una cotización
            const clientUserId = (trabajo as any).clienteUserId;
            if (clientUserId) {
                try {
                    await createNotificacion({
                        user_id: clientUserId,
                        titulo: '📄 Cotización Recibida',
                        mensaje: `Has recibido una propuesta de presupuesto para tu sucursal "${trabajo.sucursal || 'tu sucursal'}". Revísala en la sección de Cotizaciones.`,
                        enlace: `/cliente/cotizaciones`
                    });
                } catch (notiErr) {
                    console.error("Error notificando al cliente de cotización:", notiErr);
                }
            }

            // RESET FIELDS
            setCosto(""); setNotas(""); setArchivoFile(null); setNombreArchivo("");
            
            if (!keepOpen) {
                setShowAddQuoteForm(false);
            }

            showAlert('Cotización Agregada', `Cotización #${cotizaciones.length + 1} agregada y enviada al cliente.`, 'success');
        } catch (error: any) {
            showAlert('Error', error.response?.data?.message || error.message, 'error');
        }
    };

    const handleEditarCotizacion = (cotiz: Cotizacion) => {
        setEditingCotizacion(cotiz);
        setEditCosto(String(cotiz.monto));
        setEditNotas(cotiz.descripcion || "");
        setEditArchivoFile(null);
        setEditNombreArchivo("");
    };

    const handleUpdateCotizacion = async () => {
        if (!editingCotizacion?.id) return;
        try {
            const formData = new FormData();
            formData.append('monto', editCosto);
            formData.append('descripcion', editNotas);
            if (editArchivoFile) formData.append('archivo', editArchivoFile);
            const updated = await updateCotizacion(editingCotizacion.id, formData as any);
            setCotizaciones(prev => prev.map(c => c.id === updated.id ? updated : c));
            setEditingCotizacion(null);
            showAlert('Actualizada', 'Los cambios se guardaron correctamente.', 'success');
        } catch (error: any) {
            showAlert('Error', error.response?.data?.message || error.message, 'error');
        }
    };

    const handleEliminarCotizacion = (cotizId: number) => {
        showConfirm('¿Eliminar Cotización?', '¿Estás seguro? El cliente ya no podrá ver esta cotización.',
            async () => {
                try {
                    await deleteCotizacion(cotizId);
                    setCotizaciones(prev => prev.filter(c => c.id !== cotizId));
                    showAlert('Eliminada', 'La cotización fue eliminada correctamente.', 'success');
                } catch (error: any) {
                    showAlert('Error', error.response?.data?.message || error.message, 'error');
                }
            }
        );
    };

    const handleClienteAceptarCotizacion = async (cotizId: number) => {
        if (!trabajo) return;
        try {
            await updateCotizacionStatus(cotizId, "Aprobada");
            await updateEstadoTrabajo(trabajo.id, { estado: "Cotización Aprobada" });
            setCotizaciones(prev => prev.map(c => c.id === cotizId ? { ...c, estado: "Aprobada" as const } : c));
            setTrabajo((prev: any) => prev ? { ...prev, estado: "Cotización Aprobada" } : prev);
            // Notificar al Admin
            try {
                await createNotificacionByRole({
                    role: 'admin',
                    titulo: '📄 Cotización Aceptada',
                    mensaje: `El cliente aceptó la propuesta de presupuesto para "${trabajo.sucursal || 'la sucursal'}". Ya puede asignar un técnico para el trabajo.`,
                    enlace: `/menu/trabajo-detalle/${trabajo.id}`
                });
            } catch (notiErr) {
                console.error("Error enviando notificación de cotización aceptada:", notiErr);
            }
            showAlert('Cotización Aceptada', 'Propuesta aceptada. El administrador será notificado para asignar al técnico.', 'success');
        } catch (error: any) {
            showAlert('Error', error.response?.data?.message || error.message, 'error');
        }
    };

    const handleClienteRechazarCotizacion = (cotizId: number) => {
        setQuoteToReject(cotizId);
        setRejectionReason("");
        setShowRejectionModal(true);
    };

    const handleSubmitRejection = async () => {
        if (!quoteToReject || !rejectionReason.trim() || !trabajo) {
            showAlert('Atención', 'Por favor ingresa un motivo para el rechazo.', 'warning');
            return;
        }

        try {
            // 1. Actualizar estado de la cotización individual
            await updateCotizacionStatus(quoteToReject, "Rechazada");
            
            // 2. Notificar al administrador con el motivo
            await createNotificacionByRole({
                role: 'admin',
                titulo: '🚫 Cotización Rechazada',
                mensaje: `El cliente ha rechazado una opción de presupuesto para "${trabajo.sucursal || 'Servicio'}". Motivo: ${rejectionReason}`,
                enlace: `/menu/trabajo-detalle/${trabajo.id}?tab=cotizacion`
            });

            // 3. Actualizar estado local
            setCotizaciones(prev => prev.map(c => c.id === quoteToReject ? { ...c, estado: "Rechazada" as const } : c));
            
            setShowRejectionModal(false);
            setRejectionReason("");
            setQuoteToReject(null);
            
            showAlert('Enviado', 'Se ha notificado al administrador sobre el rechazo y tu motivo.', 'info');
        } catch (error: any) {
            showAlert('Error', error.response?.data?.message || error.message, 'error');
        }
    };



    if (!trabajo) {
        return (
            <div className={styles.dashboardLayout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '18px', color: '#666', fontWeight: 'bold' }}>Cargando información del trabajo...</p>
            </div>
        );
    }

    const renderTaskCard = (tarea: SubTarea, isInteractive: boolean = true) => {
        const getCategoryIcon = (titulo: string) => {
            const t = titulo?.toLowerCase() || '';
            if (t.includes('mantenimiento')) return <HiOutlineCog6Tooth size={24} style={{ color: '#FFB800' }} />;
            if (t.includes('instalacion')) return <HiOutlineBuildingOffice2 size={24} style={{ color: '#6366f1' }} />;
            if (t.includes('electricidad')) return <HiOutlineBolt size={24} style={{ color: '#fbbf24' }} />;
            if (t.includes('plomeria')) return <HiOutlineWrench size={24} style={{ color: '#0ea5e9' }} />;
            if (t.includes('albañil')) return <HiOutlineSquare3Stack3D size={24} style={{ color: '#f59e0b' }} />;
            if (t.includes('carpinter')) return <HiOutlinePencilSquare size={24} style={{ color: '#b45309' }} />;
            if (t.includes('pintura')) return <HiOutlinePencilSquare size={24} style={{ color: '#db2777' }} />;
            return <HiOutlineClipboardDocumentList size={24} style={{ color: '#94a3b8' }} />;
        };

        const isVisita = trabajo?.tipo === "Visita";
        const isTecnico = user?.role === 'tecnico';
        const canEdit = isVisita && isTecnico;

        return (
            <div
                key={tarea.id}
                onClick={() => {
                    if (isInteractive) {
                        if (trabajo?.tipo === "Visita" && user?.role === 'tecnico') {
                            showAlert(
                                'Modo Visita',
                                'Estás en modo Visita. No puedes realizar los trabajos, solo registrar hallazgos.',
                                'info'
                            );
                            return;
                        }
                        setSelectedTaskForReport(tarea);
                        setIsSecurityModalOpen(true);
                    }
                }}
                className={`${styles.taskCard} ${tarea.estado === 'Nueva' ? styles.newTaskCard : styles.defaultTaskCard}`}
                style={{
                    cursor: (isInteractive && !canEdit) || (isInteractive && !isVisita) ? 'pointer' : (isInteractive ? 'not-allowed' : 'default'),
                    opacity: isVisita && isTecnico && isInteractive ? 0.7 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: '20px'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #f1f5f9'
                        }}>
                            {getCategoryIcon(tarea.titulo)}
                        </div>
                        <div>
                            <h3 className={styles.taskTitle} style={{ margin: 0, fontSize: '17px' }}>
                                {tarea.titulo}
                            </h3>
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>ID: {tarea.id}</span>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                        <span
                            className={styles.taskStatus}
                            style={{
                                background: tarea.estado === 'Completa' ? '#ecfdf5' : (tarea.estado === 'Nueva' ? '#fff7ed' : '#eff6ff'),
                                color: tarea.estado === 'Completa' ? '#059669' : (tarea.estado === 'Nueva' ? '#ea580c' : '#2563eb'),
                                padding: '4px 12px',
                                border: `1px solid ${tarea.estado === 'Completa' ? '#10b98133' : (tarea.estado === 'Nueva' ? '#f9731633' : '#3b82f633')}`,
                                fontSize: '12px'
                            }}
                        >
                            {tarea.estado}
                        </span>
                    </div>
                </div>

                <div style={{ padding: '0 0 0 63px' }}>
                    <p className={styles.taskDesc} style={{ color: '#475569', fontSize: '15px', marginBottom: '15px', fontWeight: 'normal' }}>
                        {tarea.descripcion}
                    </p>

                    {tarea.serviceData && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: '12px',
                            background: '#f8fafc',
                            padding: '15px',
                            borderRadius: '12px',
                            border: '1px solid #f1f5f9'
                        }}>
                            {tarea.serviceData.marca && (
                                <div>
                                    <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '800' }}>Marca</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '700' }}>{tarea.serviceData.marca}</span>
                                </div>
                            )}
                            {tarea.serviceData.modelo && (
                                <div>
                                    <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '800' }}>Modelo</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '700' }}>{tarea.serviceData.modelo}</span>
                                </div>
                            )}
                            {tarea.serviceData.pieza && (
                                <div>
                                    <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '800' }}>Pieza</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '700' }}>{tarea.serviceData.pieza}</span>
                                </div>
                            )}
                            {tarea.serviceData.garantia && (
                                <div>
                                    <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '800' }}>Garantía</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '700' }}>{tarea.serviceData.garantia} Meses</span>
                                </div>
                            )}
                        </div>
                    )}

                    {canEdit && isInteractive && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <button
                                onClick={(e) => openEditModal(e, tarea)}
                                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: '#475569', fontWeight: '700' }}
                            >
                                ✍️ Editar
                            </button>
                            <button
                                onClick={(e) => handleDeleteTask(e, tarea.id)}
                                style={{ background: '#fef2f2', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: '#dc2626', fontWeight: '700' }}
                            >
                                🗑️ Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.dashboardLayout}>

            <div className={styles.bgShape1}></div>
            <div className={styles.bgShape2}></div>

            <div className={styles.mainCard}>

                {/* Shapes removed for cleaner look */}

                <div className={styles.contentWrapper}>

                    <div className={styles.headerContainer}>
                        <div>
                            <h1 className={styles.pageTitle}>
                                {activeTab === 'Trabajo' ? 'tareas por realizar' :
                                    (activeTab === 'Registro' ? 'Registro de Actividad' :
                                        (activeTab === 'Cotización' ? 'Generar Cotización' : 'Datos de la Empresa'))}
                            </h1>
                        </div>
                    </div>

                    {/* STEPS LOGIC */}
                    {(() => {
                        const getStepIndex = (estado: string) => {
                            if (estado === "Finalizado") return 4;
                            if (["En Proceso"].includes(estado)) return 3;
                            const isAuthTech = user?.role === 'tecnico';
                            // Usamos includes para manejar los estados que tienen texto extra
                            if (estado.includes("Cotización") || estado.includes("Asignado")) {
                                if (estado === "Asignado" && trabajo.visitado) return 3;
                                if (estado.includes("Cotización Aceptada") || estado.includes("Cotización Aprobada")) {
                                    if (isAuthTech || (trabajo.tecnico !== "Sin asignar" && trabajo.tecnico !== "Sin Asignar")) return 3;
                                }
                                return 2;
                            }
                            return 1;
                        };
                        const currentStep = getStepIndex(trabajo.estado);
                        return (
                            <div style={{ padding: '8px 15px', background: '#fff', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f0f0f0' }}>
                                {[
                                    { id: 1, label: "Solicitud", icon: "📥" },
                                    { id: 2, label: "Cotización", icon: "👨‍🔧" },
                                    { id: 3, label: "En Proceso", icon: "🛠️" },
                                    { id: 4, label: "Finalizado", icon: "✅" }
                                ].map((step, index, arr) => {
                                    const isActive = currentStep === step.id;
                                    const isCompleted = currentStep > step.id;

                                    return (
                                        <React.Fragment key={step.id}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, width: '80px' }}>
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '50%',
                                                    background: isCompleted ? '#4caf50' : (isActive ? '#ffb800' : '#f5f5f5'),
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    transition: 'all 0.5s ease',
                                                    animation: isActive ? 'pulseTracker 2s infinite' : 'none',
                                                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                                    boxShadow: isCompleted ? '0 2px 6px rgba(76, 175, 80, 0.2)' : (isActive ? '0 2px 8px rgba(255, 184, 0, 0.3)' : 'none'),
                                                    border: !isCompleted && !isActive ? '1.5px solid #e0e0e0' : 'none'
                                                }}>
                                                    {isCompleted ? "✓" : step.icon}
                                                </div>
                                                <span style={{
                                                    marginTop: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: (isActive || isCompleted) ? '700' : '600',
                                                    color: isCompleted ? '#2e7d32' : (isActive ? '#d89b00' : '#94a3b8'),
                                                    textAlign: 'center',
                                                    transition: 'color 0.4s ease'
                                                }}>
                                                    {step.label}
                                                </span>
                                            </div>

                                            {index < arr.length - 1 && (
                                                <div style={{ flex: 1, height: '3px', background: '#f5f5f5', borderRadius: '2px', position: 'relative', margin: '0 4px', bottom: '8px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        height: '100%',
                                                        background: '#4caf50',
                                                        borderRadius: '2px',
                                                        width: isCompleted ? '100%' : '0%',
                                                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }} />
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    <div className={styles.tabsContainer}>
                        {['Datos', 'Trabajo', 'Registro', 'Historial', 'Cotización']
                            .filter(tabName => {
                                if (user?.role === 'cliente') {
                                    if (tabName === 'Cotización' && trabajo.estado === 'Cotización Enviada' && trabajo.cotizacion) {
                                        return true;
                                    }
                                    return tabName === 'Historial' || tabName === 'Cotización';
                                }
                                if (trabajo.estado === "Finalizado") {
                                    return tabName === 'Datos' || tabName === 'Historial';
                                }
                                if (tabName === 'Cotización') {
                                    return user?.role === 'admin' && trabajo.visitado;
                                }
                                return tabName !== 'Trabajo' || trabajo?.tipo !== "Visita" || user?.role === 'admin' || user?.role === 'tecnico';
                            })
                            .map((tabName) => (
                                <button
                                    key={tabName}
                                    className={`${styles.tabButton} ${activeTab === tabName ? styles.activeTab : styles.inactiveTab}`}
                                    onClick={() => setActiveTab(tabName as any)}
                                    title={tabName}
                                    style={{ position: 'relative' }}
                                >
                                    <span className={styles.tabIcon}>
                                        {tabName === 'Datos' ? <HiOutlineBuildingOffice2 size={22} /> :
                                            tabName === 'Trabajo' ? <HiOutlineWrench size={22} /> :
                                                tabName === 'Registro' ? <HiOutlineClipboardDocumentList size={22} /> :
                                                    tabName === 'Historial' ? <HiOutlineClock size={22} /> :
                                                        tabName === 'Cotización' ? <HiOutlineCurrencyDollar size={22} /> : <HiOutlineInformationCircle size={22} />}
                                    </span>
                                    <span className={styles.tabText}>{tabName}</span>

                                    {/* INDICADOR DE NOTIFICACIÓN (ROJO) PARA COTIZACIÓN PENDIENTE */}
                                    {tabName === 'Cotización' && (
                                        (trabajo?.visitado && cotizaciones.length === 0 && user?.role === 'admin') ||
                                        (user?.role === 'cliente' && cotizaciones.some(c => c.estado === 'Pendiente'))
                                    ) && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '2px',
                                            right: '2px',
                                            width: '10px',
                                            height: '10px',
                                            background: '#ef4444',
                                            borderRadius: '50%',
                                            border: '2px solid #fff',
                                            boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)',
                                            animation: 'pulse 2s infinite'
                                        }} />
                                    )}
                                </button>
                            ))}
                        {(trabajo as any).businessId && user?.role === 'admin' && (
                            <button
                                className={`${styles.tabButton} ${styles.inactiveTab}`}
                                onClick={handleOpenEquipos}
                                title="Ver Equipos"
                            >
                                <span className={styles.tabIcon}>
                                    <HiOutlineClipboardDocumentList size={22} />
                                </span>
                                <span className={styles.tabText}>Ver Equipos</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.scrollableContent}>
                    {activeTab === 'Datos' && (
                        <div className={styles.bentoGrid}>
                            {/* Card 1: Información General (8/12) */}
                            <div 
                                className={`${styles.bentoCard} ${styles.colSpan8}`}
                                onClick={() => setIsSucursalModalOpen(true)}
                                style={{ cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.02)' } } as any}
                                title="Ver detalles de contacto y ubicación"
                            >
                                <div className={styles.cardHeader}>
                                    <div className={`${styles.iconBox} ${styles.bgBlue}`}>
                                        <HiOutlineBuildingOffice2 size={20} />
                                    </div>
                                    <h3 className={styles.cardTitle}>Sucursal</h3>
                                </div>
                                <div className={styles.bentoContent}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                                        <div>
                                            <span className={styles.bentoLabel}>Nombre</span>
                                            <span className={styles.bentoValue} style={{ fontSize: '20px' }}>{trabajo.sucursal || "No registrado"}</span>
                                            <span className={styles.badge} style={{ marginTop: '5px' }}>{trabajo.tipo || "Trabajo"}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                        </div>
                                    </div>

                                    {trabajo.descripcion && (
                                        <div className={styles.descriptionBox}>
                                            <span className={styles.bentoLabel} style={{ marginBottom: '4px', color: '#334155' }}>Problema Reportado</span>
                                            <p className={styles.descriptionQuote}>"{trabajo.descripcion}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card 2: Estado Actual (4/12) */}
                            <div className={`${styles.bentoCard} ${styles.colSpan4}`}>
                                <div className={styles.cardHeader}>
                                    <div className={`${styles.iconBox} ${styles.bgOrange}`}>
                                        <HiOutlineClock size={18} />
                                    </div>
                                    <h3 className={styles.cardTitle}>Estado</h3>
                                </div>
                                <div className={styles.bentoContent} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '5px' }}>
                                    <span className={styles.bentoValue} style={{ color: '#d97706', fontSize: '16px', textAlign: 'center' }}>
                                        {trabajo.estado}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                                        Actividad: {trabajo.fecha}
                                    </span>
                                </div>
                            </div>

                            {/* CONTACTS AND LOCATION CARDS WERE MOVED TO MODAL */}
                            {/* Card 5: Acciones (12/12) */}
                            {user?.role === 'admin' && (
                                <div className={`${styles.colSpan12}`} style={{ marginTop: '5px' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {(trabajo.estado === "Solicitud" && !trabajo.visitado && trabajo.tecnico === "Sin asignar") && (
                                            <button
                                                onClick={() => { setSelectedType("Visita"); setIsModalOpen(true); }}
                                                className={`${styles.actionButton} ${styles.assignButton}`}
                                                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px' }}
                                            >
                                                👤 Asignar para Visita
                                            </button>
                                        )}
                                        {(trabajo.estado === "Solicitud" && trabajo.visitado || trabajo.estado === "En Espera") && (
                                            <button
                                                onClick={() => setActiveTab('Cotización')}
                                                className={styles.actionButton}
                                                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', background: '#f59e0b', color: '#fff', position: 'relative' }}
                                            >
                                                💰 Crear Cotización
                                                {cotizaciones.length === 0 && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: '-5px',
                                                        right: '-5px',
                                                        width: '12px',
                                                        height: '12px',
                                                        background: '#ef4444',
                                                        borderRadius: '50%',
                                                        border: '2px solid #fff',
                                                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)',
                                                        animation: 'pulse 2s infinite'
                                                    }} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}


                    {
                        activeTab === 'Cotización' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                {/* VISTA CLIENTE: lista de cotizaciones con aceptar/rechazar individual */}
                                {user?.role === 'cliente' && (
                                    <div className={styles.clientQuoteList}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #FFB800, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255, 184, 0, 0.2)' }}>
                                                <HiOutlineCurrencyDollar size={22} color="white" />
                                            </div>
                                            <div>
                                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>Cotizaciones Recibidas</h2>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>{cotizaciones.length} opción{cotizaciones.length !== 1 ? 'es' : ''} disponible{cotizaciones.length !== 1 ? 's' : ''}</p>
                                            </div>
                                        </div>

                                        {cotizaciones.length === 0 ? (
                                            <div style={{ background: '#fff', borderRadius: '24px', padding: '60px 40px', textAlign: 'center', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                                                <p style={{ margin: 0, color: '#94a3b8', fontWeight: '700', fontSize: '16px' }}>Aún no hay cotizaciones disponibles.</p>
                                                <p style={{ margin: '8px 0 0 0', color: '#cbd5e1', fontSize: '14px' }}>Te notificaremos en cuanto el administrador envíe una propuesta.</p>
                                            </div>
                                        ) : (
                                            cotizaciones.map((cotiz, idx) => {
                                                const isApproved = cotiz.estado === 'Aprobada';
                                                const isRejected = cotiz.estado === 'Rechazada';
                                                const isPending = cotiz.estado === 'Pendiente';

                                                const statusClass = isApproved ? styles.statusAprobada : (isRejected ? styles.statusRechazada : styles.statusPendiente);
                                                const cardClass = `${styles.clientQuoteCard} ${isApproved ? styles.cardApproved : (isRejected ? styles.cardRejected : styles.cardPending)}`;

                                                return (
                                                    <div key={cotiz.id} className={cardClass}>
                                                        <div className={styles.quoteCardHeader}>
                                                            <div>
                                                                <p className={styles.quoteOptionLabel}>Propuesta Técnica {idx + 1}</p>
                                                                <p className={styles.quotePriceValue}>${Number(cotiz.monto).toLocaleString('es-MX')}</p>
                                                            </div>
                                                            <span className={`${styles.quoteStatusBadge} ${statusClass}`}>
                                                                {cotiz.estado}
                                                            </span>
                                                        </div>

                                                        {cotiz.descripcion && (
                                                            <div className={styles.quoteNotesBox}>
                                                                <p className={styles.notesLabel}>Descripción y Alcance</p>
                                                                <p className={styles.notesText}>{cotiz.descripcion}</p>
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                            {cotiz.archivo && (
                                                                <a href={cotiz.archivo.startsWith('http') ? cotiz.archivo : `http://127.0.0.1:8085/storage/${cotiz.archivo}`} 
                                                                   target="_blank" 
                                                                   rel="noreferrer"
                                                                   className={styles.attachmentLink}
                                                                >
                                                                    <div className={styles.pdfIconBox}>
                                                                        <HiOutlineDocumentText size={20} color="white" />
                                                                    </div>
                                                                    <span>Descargar Presupuesto Detallado.pdf</span>
                                                                </a>
                                                            )}
                                                        </div>

                                                        {isPending && (
                                                            <div className={styles.quoteActions}>
                                                                <button 
                                                                    onClick={() => handleClienteAceptarCotizacion(cotiz.id!)} 
                                                                    className={styles.btnAccept}
                                                                >
                                                                    <HiOutlineCheckCircle size={22} />
                                                                    Aceptar Propuesta
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleClienteRechazarCotizacion(cotiz.id!)} 
                                                                    className={styles.btnReject}
                                                                >
                                                                    <HiOutlineXCircle size={22} />
                                                                    Rechazar
                                                                </button>
                                                            </div>
                                                        )}

                                                        {isApproved && (
                                                            <div className={styles.approvedMsg}>
                                                                <HiOutlineCheckCircle size={22} style={{ verticalAlign: 'middle', marginRight: '10px' }} />
                                                                <strong>Propuesta Aceptada:</strong> El administrador ha sido notificado y procederá con la asignación.
                                                            </div>
                                                        )}

                                                        {isRejected && (
                                                            <div className={styles.rejectedMsg}>
                                                                <HiOutlineXCircle size={22} style={{ verticalAlign: 'middle', marginRight: '10px' }} />
                                                                <strong>Propuesta Rechazada:</strong> Tu respuesta ha sido enviada para revisión administrativa.
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* VISTA ADMIN: columna izquierda (gestión de cotizaciones), columna derecha (actividades del técnico) */}
                                {user?.role !== 'cliente' && (
                                    <div className={styles.infoGrid2} style={{ gap: '30px' }}>
                                        {/* IZQUIERDA: lista + agregar */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                            {/* LISTA DE COTIZACIONES EXISTENTES */}
                                            {cotizaciones.length > 0 && (
                                                <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #f8fafc' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>Cotizaciones Enviadas</h3>
                                                        <span style={{ marginLeft: 'auto', background: '#ecfdf5', color: '#065f46', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
                                                            {cotizaciones.length} cotizacion{cotizaciones.length !== 1 ? 'es' : ''}
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {cotizaciones.map((cotiz, idx) => {
                                                            const isEditing = editingCotizacion?.id === cotiz.id;
                                                            const estadoBadge: Record<string, string> = { Pendiente: '#fffbeb', Aprobada: '#ecfdf5', Rechazada: '#fef2f2' };
                                                            const estadoText: Record<string, string> = { Pendiente: '#92400e', Aprobada: '#065f46', Rechazada: '#7f1d1d' };
                                                            return (
                                                                <div key={cotiz.id} style={{ background: '#fafafa', border: '1.5px solid #f1f5f9', borderRadius: '18px', padding: '18px' }}>
                                                                    {isEditing ? (
                                                                        /* FORMULARIO INLINE DE EDICIÓN */
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Editando Opción {idx + 1}</p>
                                                                            <div style={{ position: 'relative' }}>
                                                                                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: '900', color: '#FFB800', fontSize: '16px' }}>$</span>
                                                                                <input type="number" value={editCosto} onChange={e => setEditCosto(e.target.value)}
                                                                                    style={{ width: '100%', padding: '12px 14px 12px 30px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '16px', fontWeight: '700', boxSizing: 'border-box' }} />
                                                                            </div>
                                                                            <textarea value={editNotas} onChange={e => setEditNotas(e.target.value)} placeholder="Notas..."
                                                                                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '14px', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                                                                            <input ref={editFileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setEditArchivoFile(f); setEditNombreArchivo(f.name); } }} />
                                                                            <button onClick={() => editFileInputRef.current?.click()} style={{ padding: '10px', borderRadius: '10px', border: '2px dashed #e2e8f0', background: editArchivoFile ? '#f0fdf4' : '#f8fafc', color: editArchivoFile ? '#059669' : '#64748b', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                                                                                {editArchivoFile ? `✓ ${editNombreArchivo}` : '📎 Cambiar documento (opcional)'}
                                                                            </button>
                                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                                <button onClick={handleUpdateCotizacion} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #FFB800, #f59e0b)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }}>💾 Guardar cambios</button>
                                                                                <button onClick={() => setEditingCotizacion(null)} style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>Cancelar</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        /* VISTA DE LA COTIZACIÓN */
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                                                            <div>
                                                                                <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Opción {idx + 1}</p>
                                                                                <p style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '900', color: '#1e293b' }}>${Number(cotiz.monto).toLocaleString('es-MX')}</p>
                                                                                {cotiz.descripcion && <p style={{ margin: 0, fontSize: '12px', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cotiz.descripcion}</p>}
                                                                            </div>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                                                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', background: estadoBadge[cotiz.estado || 'Pendiente'], color: estadoText[cotiz.estado || 'Pendiente'] }}>
                                                                                    {cotiz.estado}
                                                                                </span>
                                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                                    <button onClick={() => handleEditarCotizacion(cotiz)} style={{ padding: '7px 12px', borderRadius: '10px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#475569' }}>✏️ Editar</button>
                                                                                    <button onClick={() => handleEliminarCotizacion(cotiz.id!)} style={{ padding: '7px 12px', borderRadius: '10px', background: '#fef2f2', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>🗑️</button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* BOTÓN PARA DESPLEGAR NUEVA COTIZACIÓN */}
                                            {!showAddQuoteForm ? (
                                                <button
                                                    onClick={() => setShowAddQuoteForm(true)}
                                                    className={styles.addTaskButton}
                                                    style={{ borderStyle: 'solid', background: '#fff', height: '100px', justifyContent: 'center' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <div className={styles.addTaskIcon} style={{ width: '36px', height: '36px', fontSize: '20px' }}>+</div>
                                                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                                                            Agregar nueva cotización
                                                        </span>
                                                    </div>
                                                </button>
                                            ) : (
                                                /* FORMULARIO NUEVA COTIZACIÓN */
                                                <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px', paddingBottom: '16px', borderBottom: '2px solid #f8fafc' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #FFB800, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <HiOutlineCurrencyDollar size={20} color="white" />
                                                        </div>
                                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
                                                            {cotizaciones.length === 0 ? 'Nueva Cotización' : `Configurando Opción ${cotizaciones.length + 1}`}
                                                        </h3>
                                                    </div>

                                                    <div style={{ marginBottom: '16px' }}>
                                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Monto ($)</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: '900', color: '#FFB800' }}>$</span>
                                                            <input type="number" placeholder="1500" value={costo} onChange={e => setCosto(e.target.value)}
                                                                style={{ width: '100%', padding: '13px 16px 13px 36px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '17px', fontWeight: '700', color: '#1e293b', boxSizing: 'border-box' }} />
                                                        </div>
                                                    </div>

                                                    <div style={{ marginBottom: '16px' }}>
                                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Notas para el cliente</label>
                                                        <textarea placeholder="Ej: Incluye mano de obra y materiales..." value={notas} onChange={e => setNotas(e.target.value)}
                                                            style={{ width: '100%', padding: '13px 16px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '14px', color: '#475569', minHeight: '90px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.6' }} />
                                                    </div>

                                                    <input type="file" accept="image/*, .pdf" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                                                    <div onClick={() => fileInputRef.current?.click()}
                                                        style={{ border: `2.5px dashed ${archivoFile ? '#10b981' : '#e2e8f0'}`, padding: '22px 16px', borderRadius: '16px', cursor: 'pointer', background: archivoFile ? '#f0fdf4' : '#f8fafc', textAlign: 'center', transition: 'all 0.3s', marginBottom: '16px' }}>
                                                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{archivoFile ? '✅' : '📎'}</div>
                                                        <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: archivoFile ? '#059669' : '#64748b' }}>
                                                            {archivoFile ? `✓ ${nombreArchivo}` : 'Adjuntar PDF o imagen'}
                                                        </p>
                                                        {!archivoFile && <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>PDF, PNG, JPG — Máx. 10MB</p>}
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        <div style={{ display: 'flex', gap: '12px' }}>
                                                            <button onClick={() => handleEnviarCotizacion(false)}
                                                                style={{ flex: 2, padding: '15.5px', background: 'linear-gradient(135deg, #FFB800, #f59e0b)', color: '#fff', border: 'none', borderRadius: '15px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(255,184,0,0.3) ', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                <span>Enviar Cotización</span>
                                                            </button>
                                                            <button onClick={() => setShowAddQuoteForm(false)}
                                                                style={{ flex: 1, padding: '15px', background: '#f8fafc', border: '2px solid #e2e8f0', color: '#64748b', borderRadius: '15px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                                                                Cancelar
                                                            </button>
                                                        </div>

                                                        {/* BOTÓN SOLICITADO: Agregar otra y seguir en la hoja */}
                                                        <button onClick={() => handleEnviarCotizacion(true)}
                                                            style={{ width: '100%', padding: '15px', background: '#fff', border: '2.5px solid #FFB800', color: '#FFB800', borderRadius: '15px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                                                            ➕ Agregar nueva cotización
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* DERECHA: actividades del técnico */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {subTareas.some(t => t.esCotizacion) && (
                                                <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #f8fafc' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFB800' }} />
                                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>Sugerencias del Técnico</h3>
                                                        <span style={{ marginLeft: 'auto', background: '#fff7ed', color: '#d97706', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', border: '1px solid #fed7aa' }}>
                                                            {subTareas.filter(t => t.esCotizacion).length} registros
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {subTareas.filter(t => t.esCotizacion).map(tarea => (
                                                            <div key={tarea.id} style={{ background: '#fafafa', border: '1.5px solid #f1f5f9', borderRadius: '16px', padding: '16px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <HiOutlineUser size={16} color="#64748b" />
                                                                        </div>
                                                                        <div>
                                                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{tarea.tecnicoNombre || 'Técnico'}</p>
                                                                            <span style={{ display: 'inline-block', fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', marginTop: '2px' }}>{tarea.titulo}</span>
                                                                        </div>
                                                                    </div>
                                                                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: tarea.cotizacionMonto === 'Por Evaluar' ? '#94a3b8' : '#FFB800' }}>
                                                                        {tarea.cotizacionMonto === 'Por Evaluar' ? 'Sin monto' : `$${tarea.cotizacionMonto}`}
                                                                    </p>
                                                                </div>
                                                                <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '10px', padding: '12px' }}>
                                                                    <p style={{ margin: '0 0 3px 0', fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Descripción</p>
                                                                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>{tarea.cotizacionDetalles || 'Sin detalles.'}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #f8fafc' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
                                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>Actividades Registradas</h3>
                                                    <span style={{ marginLeft: 'auto', background: '#eef2ff', color: '#4f46e5', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', border: '1px solid #c7d2fe' }}>
                                                        {subTareas.length} total
                                                    </span>
                                                </div>
                                                <div className={styles.taskList}>
                                                    {subTareas.length > 0 ? subTareas.map(tarea => renderTaskCard(tarea, false)) : (
                                                        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
                                                            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📋</div>
                                                            <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>No hay actividades registradas</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }


                    {
                        activeTab === 'Trabajo' && (
                            <div>
                                {/* LISTA DE TAREAS / SUBTAREAS — Solo para trabajos que NO son de tipo Visita */}
                                {/* Las Visitas gestionan sus actividades desde la pestaña Registro */}
                                {trabajo.tipo !== 'Visita' && (
                                    <div className={styles.taskList}>
                                        {subTareas.map(tarea => renderTaskCard(tarea, true))}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {
                        activeTab === 'Registro' && (
                            <div>
                                {(user?.role === 'tecnico' || user?.role === 'admin') && trabajo.tipo === 'Visita' && (
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className={styles.addTaskButton}
                                    >
                                        <div className={styles.addTaskIcon}>+</div>
                                        Agregar
                                    </button>
                                )}

                                {/* LISTADO DE ACTIVIDADES REGISTRADAS — para tipo Visita */}
                                {(user?.role === 'tecnico' || user?.role === 'admin') && trabajo.tipo === 'Visita' && subTareas.length > 0 && (
                                    <div className={styles.taskList}>
                                        {subTareas.map(tarea => renderTaskCard(tarea, true))}
                                    </div>
                                )}

                                {(user?.role === 'tecnico' || user?.role === 'admin') && subTareas.length > 0 && trabajo.tipo === 'Visita' && (
                                    <div style={{ marginTop: '50px', textAlign: 'center' }}>
                                        <button
                                            onClick={handleFinishVisit}
                                            style={{ background: '#333', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%', maxWidth: '400px' }}
                                        >
                                            Confirmar y Guardar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {
                        activeTab === 'Historial' && (
                            <div>
                                <h3 className={styles.sectionTitle}>Historial de Trabajos Realizados</h3>
                                <div className={styles.taskList}>
                                    {subTareas.filter(t => trabajo.estado === 'Finalizado' || t.estado === 'Completa' || ((user?.role === 'admin' || user?.role === 'tecnico') && !!localStorage.getItem(`report_data_temporal_${t.id}`))).length > 0 ? (
                                        subTareas.filter(t => trabajo.estado === 'Finalizado' || t.estado === 'Completa' || ((user?.role === 'admin' || user?.role === 'tecnico') && !!localStorage.getItem(`report_data_temporal_${t.id}`))).map(tarea => {
                                            const isPreReport = tarea.estado !== 'Completa' && !!localStorage.getItem(`report_data_temporal_${tarea.id}`);
                                            return (
                                                <div
                                                    key={tarea.id}
                                                    className={styles.completedTaskCard}
                                                    onClick={() => setSelectedHistoryTask(tarea)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div>
                                                        <h3 className={styles.completedTaskTitle}>
                                                            {tarea.titulo}
                                                        </h3>
                                                        <p className={styles.completedTaskDesc}>
                                                            {tarea.descripcion}
                                                        </p>
                                                    </div>
                                                    <span className={styles.completedBadge} style={{ background: isPreReport ? '#fff3e0' : undefined, color: isPreReport ? '#e65100' : undefined }}>
                                                        {isPreReport ? 'Pre-Reporte' : 'Completado'}
                                                    </span>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No hay trabajos en el historial.</p>
                                    )}
                                </div>
                            </div>
                        )}
                </div>
            </div>
            {/* MODAL ASIGNAR T├ëCNICO */}
            {
                isModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent} style={{ width: '500px' }}>
                            <h3 style={{ textAlign: 'center', marginBottom: trabajo?.fechaSolicitud ? '5px' : '20px' }}>Asignar Tecnico</h3>
                            {trabajo?.fechaSolicitud && (
                                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '25px', marginTop: 0 }}>
                                    📅 Solicitado el: {trabajo.fechaSolicitud}
                                </p>
                            )}

                            <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                                <label className={styles.radioLabel}>
                                    <input type="radio" name="type" checked={selectedType === "Visita"} onChange={() => setSelectedType("Visita")} />
                                    <span>Visita</span>
                                </label>
                                <label className={styles.radioLabel}>
                                    <input type="radio" name="type" checked={selectedType === "Trabajo"} onChange={() => setSelectedType("Trabajo")} />
                                    <span>Trabajo</span>
                                </label>
                            </div>

                            <div className={styles.searchCard} style={{ marginTop: '0', marginBottom: '20px', padding: '0' }}>
                                <input
                                    type="text"
                                    placeholder="Buscar técnico..."
                                    className={styles.searchInput}
                                    value={technicianSearch}
                                    onChange={(e) => setTechnicianSearch(e.target.value)}
                                />
                            </div>

                            <div className={styles.techList}>
                                {filteredTechnicians.map(tech => (
                                    <div key={tech.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '40px', height: '40px', background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥</div>
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

                            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
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

                            <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <button onClick={handleConfirmAssignment} className={styles.applyBtn} disabled={selectedTechnicians.length === 0} style={{ background: selectedTechnicians.length === 0 ? '#ccc' : '#fbbc04', color: selectedTechnicians.length === 0 ? '#666' : '#fff', width: 'auto', padding: '12px 40px', border: 'none', borderRadius: '30px', cursor: selectedTechnicians.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: selectedTechnicians.length === 0 ? 'none' : '0 4px 10px rgba(251, 188, 4, 0.3)' }}>Confirmar</button>
                                <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL AGREGAR TAREA (NUEVO) */}
            {
                isAddModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent} style={{ width: '600px', padding: '40px', borderRadius: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Registro de Actividad</h2>
                                <span style={{ color: '#888', fontWeight: 'bold', fontSize: '20px' }}>Visita</span>
                            </div>

                            <div style={{ border: '2px solid #e0e0e0', borderRadius: '20px', padding: '30px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', marginBottom: '15px' }}>Tipo de Actividad</h4>
                                    <div className={styles.categoryGrid}>
                                        {[
                                            { id: 'Mantenimiento', icon: <HiOutlineCog6Tooth size={20} />, label: 'Mantenimiento' },
                                            { id: 'Instalacion', icon: <HiOutlineBuildingOffice2 size={20} />, label: 'Instalación' },
                                            { id: 'Plomeria', icon: <HiOutlineWrench size={20} />, label: 'Plomería' },
                                            { id: 'Electricidad', icon: <HiOutlineBolt size={20} />, label: 'Electricidad' },
                                            { id: 'Albañileria', icon: <HiOutlineSquare3Stack3D size={20} />, label: 'Albañilería' },
                                            { id: 'Carpinteria', icon: <HiOutlinePencilSquare size={20} />, label: 'Carpintería' },
                                            { id: 'Pintura', icon: <HiOutlinePencilSquare size={20} />, label: 'Pintura' },
                                        ].map((cat) => (
                                            <div
                                                key={cat.id}
                                                className={`${styles.categoryItem} ${activeServiceType === cat.id ? styles.categoryItemSelected : ''}`}
                                                onClick={() => setActiveServiceType(cat.id as any)}
                                            >
                                                {cat.icon}
                                                <span className={styles.categoryLabel}>{cat.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {(activeServiceType === 'Mantenimiento' || activeServiceType === 'Instalacion') && (
                                    <div className={styles.serviceFieldGrid}>
                                        <div className={styles.serviceInputGroup}>
                                            <label className={styles.serviceLabel}>Marca</label>
                                            <input
                                                className={styles.serviceInput}
                                                value={serviceMarca}
                                                onChange={(e) => setServiceMarca(e.target.value)}
                                                placeholder="Ej. Daikin, York..."
                                                disabled={!!serviceEquipoId}
                                                style={{ background: serviceEquipoId ? '#f1f5f9' : 'white', cursor: serviceEquipoId ? 'not-allowed' : 'text' }}
                                            />
                                        </div>
                                        <div className={styles.serviceInputGroup}>
                                            <label className={styles.serviceLabel}>Modelo</label>
                                            <input
                                                className={styles.serviceInput}
                                                value={serviceModelo}
                                                onChange={(e) => setServiceModelo(e.target.value)}
                                                placeholder="Ej. R-410A..."
                                                disabled={!!serviceEquipoId}
                                                style={{ background: serviceEquipoId ? '#f1f5f9' : 'white', cursor: serviceEquipoId ? 'not-allowed' : 'text' }}
                                            />
                                        </div>
                                        {activeServiceType === 'Instalacion' && (
                                            <>
                                                <div className={styles.serviceInputGroup}>
                                                    <label className={styles.serviceLabel}>Pieza</label>
                                                    <input
                                                        className={styles.serviceInput}
                                                        value={servicePieza}
                                                        onChange={(e) => setServicePieza(e.target.value)}
                                                        placeholder="Ej. Evaporador..."
                                                    />
                                                </div>
                                                <div className={styles.serviceInputGroup}>
                                                    <label className={styles.serviceLabel}>Garantía (Meses)</label>
                                                    <input
                                                        className={styles.serviceInput}
                                                        type="number"
                                                        value={serviceGarantia}
                                                        onChange={(e) => setServiceGarantia(e.target.value)}
                                                        placeholder="Ej. 12"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeServiceType === 'Mantenimiento' && (
                                    <div style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '10px' }}>Refacciones y Piezas (Historial de Equipo)</h4>
                                        {refacciones.map((ref, i) => (
                                            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                                <input
                                                    placeholder="Nombre de la pieza"
                                                    value={ref.pieza}
                                                    onChange={(e) => {
                                                        const newR = [...refacciones];
                                                        newR[i].pieza = e.target.value;
                                                        setRefacciones(newR);
                                                    }}
                                                    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Cant."
                                                    value={ref.cantidad}
                                                    onChange={(e) => {
                                                        const newR = [...refacciones];
                                                        newR[i].cantidad = Number(e.target.value);
                                                        setRefacciones(newR);
                                                    }}
                                                    style={{ width: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                />
                                                {user?.role === 'admin' && (
                                                    <input
                                                        type="number"
                                                        placeholder="Costo Est. ($)"
                                                        value={ref.costo_estimado || ""}
                                                        onChange={(e) => {
                                                            const newR = [...refacciones];
                                                            newR[i].costo_estimado = e.target.value;
                                                            setRefacciones(newR);
                                                        }}
                                                        style={{ width: '120px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                    />
                                                )}
                                                <button
                                                    onClick={() => setRefacciones(refacciones.filter((_, idx) => idx !== i))}
                                                    style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    X
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setRefacciones([...refacciones, { pieza: '', cantidad: 1 }])}
                                            style={{ background: 'transparent', color: '#FFB800', border: '1px dashed #FFB800', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', width: '100%', marginTop: '5px' }}
                                        >
                                            + Agregar Pieza/Refacción
                                        </button>
                                    </div>
                                )}

                                <div style={{ marginBottom: '20px' }}>
                                    <textarea
                                        placeholder="Especifica tarea"
                                        value={newTaskDescription}
                                        onChange={(e) => setNewTaskDescription(e.target.value)}
                                        style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', color: '#666', resize: 'none' }}
                                    />
                                </div>

                                { (
                                    <div style={{ marginTop: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={isQuoteIncluded}
                                                onChange={(e) => setIsQuoteIncluded(e.target.checked)}
                                                style={{ width: '18px', height: '18px', accentColor: '#FFB800' }}
                                            />
                                            Agregar Cotización para el Administrador
                                        </label>

                                        {isQuoteIncluded && (
                                            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '5px' }}>Monto Estimado ($)</label>
                                                    <input
                                                        type="number"
                                                        value={newQuoteAmount}
                                                        onChange={(e) => setNewQuoteAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '5px' }}>Detalles o materiales necesarios</label>
                                                    <textarea
                                                        value={newQuoteDetails}
                                                        onChange={(e) => setNewQuoteDetails(e.target.value)}
                                                        placeholder="Mano de obra, materiales, refacciones..."
                                                        style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', resize: 'none' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '8px' }}>Adjuntar documento (PDF o Imagen)</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*, .pdf"
                                                        ref={addFileInputRef}
                                                        style={{ display: 'none' }}
                                                        onChange={handleNewQuoteFileChange}
                                                    />
                                                    <button
                                                        onClick={() => addFileInputRef.current?.click()}
                                                        style={{ background: '#fff', border: '1px solid #ccc', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', width: 'fit-content' }}
                                                    >
                                                        📄 {newQuoteFileName || "Seleccionar archivo"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    onClick={() => { setIsAddModalOpen(false); setEditingTaskId(null); setNewTaskDescription(""); setIsQuoteIncluded(false); setNewQuoteAmount(""); setNewQuoteDetails(""); setNewQuoteFileName(""); }}
                                    style={{ background: '#eee', color: '#555', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>

                                <button
                                    onClick={handleAddTask}
                                    style={{ background: '#FFB800', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    {editingTaskId ? "Actualizar" : "Guardar y enviar"}
                                </button>
                            </div>

                        </div>
                    </div>
                )
            }
            {/* MODAL HISTORIAL DETALLADO */}
            {
                selectedHistoryTask && (() => {
                    const fallbackReportDataRaw = localStorage.getItem(`report_data_${trabajo?.id}`);
                    const temporalReportDataRaw = localStorage.getItem(`report_data_temporal_${trabajo?.id}`);
                    const fallbackReportData = fallbackReportDataRaw ? JSON.parse(fallbackReportDataRaw) : (temporalReportDataRaw ? JSON.parse(temporalReportDataRaw) : null);
                    
                    // Prioridad: 1. DB (reporteFinal), 2. Local Final (fallbackReportData), 3. Temporal
                    const reportData = reporteFinal || fallbackReportData;
                    const isPreReport = !reporteFinal && !fallbackReportDataRaw && !!temporalReportDataRaw;

                    return (
                        <div className={styles.premiumModalOverlay} onClick={(e) => {
                            if (e.target === e.currentTarget) setSelectedHistoryTask(null);
                        }}>
                            <div className={styles.premiumModalContent}>
                                <div className={styles.premiumModalHeader}>
                                    <h2>
                                        <HiOutlineClipboardDocumentList size={26} color="#3b82f6" />
                                        Detalles del Reporte
                                        {isPreReport && <span style={{ color: '#f59e0b', fontSize: '13px', background: '#fffbeb', padding: '4px 10px', borderRadius: '10px', border: '1px solid #fef3c7' }}>Pre-Reporte</span>}
                                    </h2>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        <button
                                            className={styles.editReportBtn}
                                            onClick={() => {
                                                const baseRoute = user?.role === 'tecnico' ? '/tecnico' : '/menu';
                                                navigate(`${baseRoute}/reporte-tarea/${trabajo?.id}`, { state: { trabajoId: trabajo?.id, actividadId: selectedHistoryTask.id } });
                                            }}
                                        >
                                            <HiOutlinePencilSquare size={18} />
                                            Editar Reporte
                                        </button>
                                        <button
                                            className={styles.closeButtonCircle}
                                            onClick={() => setSelectedHistoryTask(null)}
                                        >
                                            <HiOutlineXMark size={22} />
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.premiumModalBody}>
                                    <div className={styles.infoGrid}>
                                        <div className={styles.reportDetailCard} style={{ margin: 0 }}>
                                            <div className={styles.detailSectionTitle}>
                                                <HiOutlineIdentification size={18} />
                                                Identificación
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span className={styles.dataLabel}>Folio de Reporte</span>
                                                    <span className={styles.folioBadge}>#{reportData?.id || selectedHistoryTask.id}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span className={styles.dataLabel}>Estatus</span>
                                                    <span style={{ 
                                                        fontSize: '11px', 
                                                        fontWeight: '800', 
                                                        color: isPreReport ? '#b45309' : '#059669',
                                                        background: isPreReport ? '#fffbeb' : '#ecfdf5',
                                                        padding: '4px 10px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${isPreReport ? '#fef3c7' : '#d1fae5'}`
                                                    }}>
                                                        {isPreReport ? 'PENDIENTE DE FIRMA' : 'FINALIZADO'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.reportDetailCard} style={{ margin: 0 }}>
                                            <div className={styles.detailSectionTitle}>
                                                <HiOutlineClock size={18} />
                                                Cronología
                                            </div>
                                            <span className={styles.dataLabel}>Fecha de Registro</span>
                                            <span className={styles.dataText}>{reportData?.fecha || 'No registrada'}</span>
                                        </div>
                                    </div>

                                    <div className={styles.reportDetailCard}>
                                        <div className={styles.detailSectionTitle}>
                                            <HiOutlineBuildingOffice2 size={18} />
                                            Información de Servicio
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div className={styles.dataBlock}>
                                                <span className={styles.dataLabel}>Sucursal</span>
                                                <span className={styles.dataText}>{trabajo.sucursal}</span>
                                            </div>
                                            <div className={styles.dataBlock}>
                                                <span className={styles.dataLabel}>Tipo de Trabajo</span>
                                                <span className={styles.dataText}>{selectedHistoryTask.titulo}</span>
                                            </div>
                                            <div className={styles.dataBlock}>
                                                <span className={styles.dataLabel}>Técnico</span>
                                                <span className={styles.dataText}>{trabajo.tecnico}</span>
                                            </div>
                                            <div className={styles.dataBlock}>
                                                <span className={styles.dataLabel}>Gerente / Encargado</span>
                                                <span className={styles.dataText}>{trabajo.encargado}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.reportDetailCard}>
                                        <div className={styles.detailSectionTitle}>
                                            <HiOutlineClipboardDocumentList size={18} />
                                            Datos del Reporte
                                        </div>
                                        
                                        <div className={styles.dataBlock}>
                                            <span className={styles.dataLabel}>Reporte de Tienda / Hallazgo</span>
                                            <div className={styles.dataBox}>{reportData?.reporteTienda || 'N/A'}</div>
                                        </div>

                                        <div className={styles.dataBlock}>
                                            <span className={styles.dataLabel}>Descripción del Trabajo Realizado</span>
                                            <div className={styles.dataBox}>{reportData?.descripcion || 'N/A'}</div>
                                        </div>

                                        <div className={styles.dataBlock}>
                                            <span className={styles.dataLabel}>Materiales y Refacciones</span>
                                            <div className={styles.dataBox}>{reportData?.materiales || 'No se utilizaron materiales.'}</div>
                                        </div>

                                        <div className={styles.dataBlock}>
                                            <span className={styles.dataLabel}>Observaciones Adicionales</span>
                                            <div className={styles.dataBox}>{reportData?.observaciones || 'Sin observaciones adicionales.'}</div>
                                        </div>
                                    </div>

                                    {(reportData?.imagenes?.antes || reportData?.imagenes?.durante || reportData?.imagenes?.despues || reportData?.imagenObservacion) && (
                                        <div className={styles.reportDetailCard}>
                                            <div className={styles.detailSectionTitle}>
                                                <HiOutlineWrench size={18} />
                                                Evidencia Fotográfica
                                            </div>
                                            <div className={styles.evidenceGrid}>
                                                {reportData.imagenes.antes && (
                                                    <div className={styles.evidenceItem}>
                                                        <img
                                                            src={reportData.imagenes.antes}
                                                            alt="Antes"
                                                            className={styles.evidenceThumb}
                                                            onClick={() => setSelectedZoomImage(reportData.imagenes.antes)}
                                                        />
                                                        <span className={styles.evidenceLabel}>Antes</span>
                                                    </div>
                                                )}
                                                {reportData.imagenes.durante && (
                                                    <div className={styles.evidenceItem}>
                                                        <img
                                                            src={reportData.imagenes.durante}
                                                            alt="Durante"
                                                            className={styles.evidenceThumb}
                                                            onClick={() => setSelectedZoomImage(reportData.imagenes.durante)}
                                                        />
                                                        <span className={styles.evidenceLabel}>Durante</span>
                                                    </div>
                                                )}
                                                {reportData.imagenes.despues && (
                                                    <div className={styles.evidenceItem}>
                                                        <img
                                                            src={reportData.imagenes.despues}
                                                            alt="Después"
                                                            className={styles.evidenceThumb}
                                                            onClick={() => setSelectedZoomImage(reportData.imagenes.despues)}
                                                        />
                                                        <span className={styles.evidenceLabel}>Después</span>
                                                    </div>
                                                )}
                                                {reportData.imagenObservacion && (
                                                    <div className={styles.evidenceItem}>
                                                        <img
                                                            src={reportData.imagenObservacion}
                                                            alt="Obs"
                                                            className={styles.evidenceThumb}
                                                            onClick={() => setSelectedZoomImage(reportData.imagenObservacion)}
                                                        />
                                                        <span className={styles.evidenceLabel}>Extra</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {trabajo.cotizacion && (
                                        <div className={styles.approvedQuoteBox}>
                                            <div className={styles.quoteHeader}>
                                                <div className={styles.quoteTitle}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <HiOutlineCurrencyDollar size={20} color="white" />
                                                    </div>
                                                    Cotización Aprobada
                                                </div>
                                                <div className={styles.quoteAmount}>${trabajo.cotizacion.costo}</div>
                                            </div>
                                            
                                            <div className={styles.dataBlock}>
                                                <span className={styles.dataLabel} style={{ color: '#b45309' }}>Notas Administrativas</span>
                                                <p style={{ margin: 0, fontSize: '14px', color: '#92400e', fontStyle: 'italic', lineHeight: '1.6' }}>
                                                    "{trabajo.cotizacion.notas || "Sin notas adicionales."}"
                                                </p>
                                            </div>

                                            <a
                                                href={trabajo.cotizacion.archivo}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={styles.quoteDocBtn}
                                            >
                                                <HiOutlineClipboardDocumentList size={18} />
                                                Ver Documento de Cotización Original
                                            </a>
                                        </div>
                                    )}

                                    {reportData?.firmaEmpresa && (
                                        <div className={styles.reportDetailCard} style={{ marginTop: '20px', textAlign: 'center' }}>
                                            <span className={styles.dataLabel}>Firma de Validación (Cliente)</span>
                                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', display: 'inline-block', marginTop: '10px', border: '1px solid #f1f5f9' }}>
                                                <img
                                                    src={reportData.firmaEmpresa}
                                                    alt="Firma"
                                                    style={{ height: '70px', objectFit: 'contain', cursor: 'zoom-in' }}
                                                    onClick={() => setSelectedZoomImage(reportData.firmaEmpresa)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* MODAL RECORDATORIO DE SEGURIDAD */}
            {isSecurityModalOpen && selectedTaskForReport && (
                <div className={styles.modalOverlay} style={{ zIndex: 1000 }} onClick={() => setIsSecurityModalOpen(false)}>
                    <div className={styles.modalContent} style={{ maxWidth: '500px', width: '90%', padding: '40px 30px', textAlign: 'center', borderRadius: '25px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 20px 0', color: '#f57f17', fontSize: '26px' }}>Recordatorio de Seguridad</h3>
                        <p style={{ margin: '0 0 30px 0', fontSize: '16px', color: '#555', lineHeight: '1.6' }}>
                            Por favor, asegúrate de llevar contigo todo tu <strong>equipo de seguridad adecuado</strong> (casco, guantes, lentes, botas, etc.) y las <strong>herramientas de mano necesarias</strong> antes de iniciar la tarea <span style={{ fontWeight: 'bold', color: '#333' }}>'{selectedTaskForReport.titulo}'</span>.<br /><br />
                            ¡Tu seguridad es lo más importante!
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setIsSecurityModalOpen(false)}
                                style={{ padding: '12px 25px', borderRadius: '30px', border: 'none', background: '#eee', color: '#555', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedTaskForReport && trabajo) {
                                        setIsSecurityModalOpen(false);
                                        const baseRoute = user?.role === 'tecnico' ? '/tecnico' : '/menu';
                                        navigate(`${baseRoute}/reporte-tarea/${trabajo.id}`, { state: { trabajoId: trabajo.id, actividadId: selectedTaskForReport.id } });
                                    }
                                }}
                                style={{ padding: '12px 30px', borderRadius: '30px', border: 'none', background: '#fbbc04', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 10px rgba(251, 188, 4, 0.3)' }}
                            >
                                Entendido, Continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* IMAGE ZOOM MODAL */}
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
                    <div style={{ position: 'relative', maxWidth: '95%', maxHeight: '95%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <button
                            onClick={() => setSelectedZoomImage(null)}
                            style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: '#fff', fontSize: '30px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ├ù
                        </button>
                        <img
                            src={selectedZoomImage}
                            alt="Zoomed Evidence"
                            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            {/* MODAL DE RECHAZO CON MOTIVO */}
            {showRejectionModal && (
                <div 
                    style={{ 
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
                        background: 'rgba(0, 0, 0, 0.6)', zIndex: 10001, display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' 
                    }}
                    onClick={() => setShowRejectionModal(false)}
                >
                    <div 
                        style={{ 
                            background: '#fff', borderRadius: '28px', padding: '35px', width: '92%', 
                            maxWidth: '480px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                            animation: 'modalSlideUp 0.3s ease-out'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                            <div style={{ 
                                width: '60px', height: '60px', background: '#fef2f2', borderRadius: '50%', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' 
                            }}>
                                <span style={{ fontSize: '30px' }}>📄</span>
                            </div>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: '900' }}>Motivo de Rechazo</h3>
                            <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>
                                Cuéntanos por qué no te convence esta opción para que podamos mejorarla.
                            </p>
                        </div>

                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ej: El presupuesto es muy elevado / Los materiales no son los requeridos..."
                            style={{ 
                                width: '100%', minHeight: '130px', padding: '16px', borderRadius: '18px', 
                                border: '2px solid #e2e8f0', fontSize: '15px', color: '#475569', 
                                boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none',
                                outline: 'none', transition: 'border-color 0.2s'
                            }}
                            autoFocus
                        />

                        <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                            <button
                                onClick={() => setShowRejectionModal(false)}
                                style={{ 
                                    flex: 1, padding: '14px', borderRadius: '15px', border: 'none', 
                                    background: '#f1f5f9', color: '#64748b', fontWeight: '800', 
                                    cursor: 'pointer', fontSize: '14px' 
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmitRejection}
                                style={{ 
                                    flex: 2, padding: '14px', borderRadius: '15px', border: 'none', 
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', 
                                    fontWeight: '800', cursor: 'pointer', fontSize: '14px',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                Confirmar Rechazo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SUCURSAL */}
            {isSucursalModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsSucursalModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Contacto y Ubicación</h2>
                            <button 
                                onClick={() => setIsSucursalModalOpen(false)}
                                style={{ 
                                    background: '#fef2f2', color: '#ef4444', border: 'none', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    padding: '8px', borderRadius: '50%', cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                title="Cerrar"
                            >
                                <HiOutlineXMark size={24} strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                            {/* Contactos */}
                            <div className={styles.bentoCard} style={{ margin: 0, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', height: '100%' }}>
                                <div className={styles.cardHeader}>
                                    <div className={`${styles.iconBox} ${styles.bgPurple}`}>
                                        <HiOutlineUser size={18} />
                                    </div>
                                    <h3 className={styles.cardTitle}>Contactos</h3>
                                </div>
                                <div className={styles.contactGrid} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className={styles.contactBlock} style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                        <span className={styles.contactName} style={{ display: 'block', fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>{trabajo.encargado === "Calle 37" ? "Jesus Antonio Dzul" : trabajo.encargado}</span>
                                        <span className={styles.bentoLabel} style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Gerente</span>
                                        <div className={styles.contactActions} style={{ display: 'flex', gap: '10px' }}>
                                            <a href={`tel:${trabajo.telefonoEncargado}`} className={styles.actionIconLink} title="Llamar" style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '10px', display: 'flex' }}>
                                                <HiOutlinePhone size={20} />
                                            </a>
                                            <a
                                                href={`https://wa.me/52${trabajo.telefonoEncargado?.replace(/\D/g, '')}`}
                                                target="_blank" rel="noreferrer" className={styles.actionIconLink}
                                                style={{ background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', padding: '10px', borderRadius: '10px', display: 'flex' }}
                                            >
                                                <HiOutlineChatBubbleLeftRight size={20} />
                                            </a>
                                        </div>
                                    </div>

                                    {trabajo.subgerente && (
                                        <div className={styles.contactBlock} style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                                            <span className={styles.contactName} style={{ display: 'block', fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>{trabajo.subgerente}</span>
                                            <span className={styles.bentoLabel} style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Subgerente</span>
                                            <div className={styles.contactActions} style={{ display: 'flex', gap: '10px' }}>
                                                {trabajo.telefonoSubgerente && trabajo.telefonoSubgerente !== "S/N" && (
                                                    <>
                                                        <a href={`tel:${trabajo.telefonoSubgerente}`} className={styles.actionIconLink} style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '10px', display: 'flex' }}>
                                                            <HiOutlinePhone size={20} />
                                                        </a>
                                                        <a href={`https://wa.me/52${trabajo.telefonoSubgerente.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className={styles.actionIconLink} style={{ background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', padding: '10px', borderRadius: '10px', display: 'flex' }}>
                                                            <HiOutlineChatBubbleLeftRight size={20} />
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ubicación */}
                            <div className={styles.bentoCard} style={{ margin: 0, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div className={styles.cardHeader}>
                                    <div className={`${styles.iconBox} ${styles.bgGreen}`}>
                                        <HiOutlineMapPin size={18} />
                                    </div>
                                    <h3 className={styles.cardTitle}>Ubicación</h3>
                                </div>
                                <div className={styles.addressGrid} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                                    <div className={styles.addressItem}>
                                        <span className={styles.bentoLabel} style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Plaza</span>
                                        <span className={styles.bentoValue} style={{ fontSize: '15px', color: '#1e293b', fontWeight: '700' }}>{trabajo.plaza || "---"}</span>
                                    </div>
                                    <div className={styles.addressItem}>
                                        <span className={styles.bentoLabel} style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Calle</span>
                                        <span className={styles.bentoValue} style={{ fontSize: '15px', color: '#1e293b', fontWeight: '700' }}>{trabajo.calle} #{trabajo.numero}</span>
                                    </div>
                                    <div className={styles.addressItem}>
                                        <span className={styles.bentoLabel} style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Colonia</span>
                                        <span className={styles.bentoValue} style={{ fontSize: '15px', color: '#1e293b', fontWeight: '700' }}>{trabajo.colonia}</span>
                                    </div>
                                    <div className={styles.addressItem}>
                                        <span className={styles.bentoLabel} style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Ciudad</span>
                                        <span className={styles.bentoValue} style={{ fontSize: '15px', color: '#1e293b', fontWeight: '700' }}>{trabajo.ciudad || "Mérida"}</span>
                                    </div>
                                </div>

                                {trabajo.referencias && (
                                    <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '12px', marginTop: '16px', border: '1px solid #dcfce3' }}>
                                        <span className={styles.bentoLabel} style={{ display: 'block', color: '#166534', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Referencias</span>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#14532d', fontWeight: '600', lineHeight: '1.5' }}>{trabajo.referencias}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAdminLevantamientoModalOpen && (
                <LevantamientoModal
                    isOpen={isAdminLevantamientoModalOpen}
                    onClose={() => setIsAdminLevantamientoModalOpen(false)}
                    data={adminLevantamientoData}
                    onSave={() => {}} 
                    isReadOnly={true}
                />
            )}
        </div>
    );
};

export default AdminDetalleTrabajo;

