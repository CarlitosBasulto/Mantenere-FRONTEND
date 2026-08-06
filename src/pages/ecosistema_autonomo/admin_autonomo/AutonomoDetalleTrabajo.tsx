// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./AutonomoDetalleTrabajo.module.css";
import historialStyles from "../../cliente/Historial.module.css";
import { useAuth } from "../../../context/AuthContext";
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
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineDocumentText,
    HiOutlineArrowLeft
} from "react-icons/hi2";
import ReporteDetailModal from "../../../components/modals/ReporteDetailModal";
import { getTrabajo, updateEstadoTrabajo, assignTrabajador, updateTrabajo, getTrabajos } from "../../../services/trabajosService";
import { createActividad, getActividadesByTrabajo, deleteActividad, updateActividad } from "../../../services/actividadesService";
import { getTrabajadores } from "../../../services/trabajadoresService";
import { saveCotizacion, updateCotizacion, deleteCotizacion, updateCotizacionStatus, getCotizacionesByTrabajoId, type Cotizacion } from "../../../services/cotizacionesService";
import { createNotificacion, createNotificacionEcosistema, createNotificacionNegocio, createNotificacionByRole } from "../../../services/notificacionesService";
import { getReporteByTrabajoId } from "../../../services/reportesService";
import { useModal } from "../../../context/ModalContext";
import { getNegocio } from "../../../services/negociosService";
import LevantamientoModal from "../../../components/LevantamientoModal";
import CotizacionPDFPreview from "../../../components/modals/CotizacionPDFPreview";
import ReportePDFPreview from "../../../components/modals/ReportePDFPreview";
import ChatTrabajo from "../../../components/ChatTrabajo";
import NegotiationChatWidget from "../../../components/chat/NegotiationChatWidget";
import UbicacionMapaModal from "../../../components/modals/UbicacionMapaModal";


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
    tipo?: "Visita" | "Trabajo" | "Nueva Solicitud" | "SOS";
    visitado?: boolean;
    latitud_llegada?: string;
    longitud_llegada?: string;
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
    foto_url?: string;
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
    refacciones?: { pieza: string, cantidad: number, costo_estimado?: string }[];
}

interface Tecnico {
    id: number;
    nombre: string;
    user_id?: number;
}

const getAvatarForTech = (nombre: string) => {
    if (!nombre || nombre.toLowerCase() === "sin asignar") return null;
    const profileKey = `profile_${nombre.replace(/\s+/g, '')}`;
    const profileData = localStorage.getItem(profileKey);
    if (profileData) {
        try {
            const data = JSON.parse(profileData);
            if (data.imagenPerfil) return data.imagenPerfil;
        } catch(e) {}
    }
    const stored = localStorage.getItem('trabajadores_list');
    if (stored) {
        try {
            const list = JSON.parse(stored);
            const worker = list.find((w: any) => w.nombre === nombre);
            if (worker && worker.avatar) return worker.avatar;
        } catch(e) {}
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=0e7490&color=fff&bold=true`;
};

const parseMaterials = (text: string) => {
    if (!text) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const items: { material: string; cantidad: string; precio: string }[] = [];

    lines.forEach(line => {
        let cleanLine = line.replace(/^[\-\*\u2022\s]+/, '').trim();
        if (!cleanLine) return;

        let materialPart = cleanLine;
        let pricePart = '';

        const parts = cleanLine.split(/\s+-\s+/);
        if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1].trim();
            if (lastPart.startsWith('$') || lastPart.includes('$') || !isNaN(Number(lastPart.replace(/[^0-9\.]/g, '')))) {
                pricePart = lastPart;
                materialPart = parts.slice(0, -1).join(' - ').trim();
            }
        }

        let materialName = materialPart;
        let quantity = '';

        const qtyMatch = materialPart.match(/\(([^)]+)\)$/);
        if (qtyMatch) {
            quantity = qtyMatch[1].trim();
            materialName = materialPart.substring(0, qtyMatch.index).trim();
        } else {
            const qtyPrefixMatch = materialPart.match(/^(\d+)\s*x\s+/i);
            if (qtyPrefixMatch) {
                quantity = qtyPrefixMatch[1];
                materialName = materialPart.substring(qtyPrefixMatch[0].length).trim();
            }
        }

        items.push({
            material: materialName || 'Material sin nombre',
            cantidad: quantity || '1',
            precio: pricePart || ''
        });
    });

    if (items.length === 0 && text.trim()) {
        return [{
            material: text.trim(),
            cantidad: '1',
            precio: ''
        }];
    }

    return items;
};

const AutonomoDetalleTrabajo: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { showAlert, showConfirm, showPrompt } = useModal();

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
    const [showZoomModal, setShowZoomModal] = useState<boolean>(false);
    const [showMapModal, setShowMapModal] = useState<boolean>(false);
    
    // Modal PDF Preview
    const [showPDFPreview, setShowPDFPreview] = useState<boolean>(false);

    // MOCK DATA
    const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
    const [groupedJobs, setGroupedJobs] = useState<any[]>([]);
    const [subTareas, setSubTareas] = useState<SubTarea[]>([]);
    const [reporteFinal, setReporteFinal] = useState<any>(null);
    // const [isFromNewReq, setIsFromNewReq] = useState(false);
    
    // Historial Tab State
    const [expandedHistoryMonths, setExpandedHistoryMonths] = useState<Record<string, boolean>>({});

    // MODAL DE SEGURIDAD
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [selectedTaskForReport, setSelectedTaskForReport] = useState<SubTarea | null>(null);

    // MODAL DATOS SUCURSAL
    const [isSucursalModalOpen, setIsSucursalModalOpen] = useState(false);

    // ESTADOS Y HANDLERS PARA MAPA GPS Y CONFIRMAR LLEGADA
    const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
    const [tecnicoGpsCoords, setTecnicoGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [llegadaConfirmadaAt, setLlegadaConfirmadaAt] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            const savedGps = localStorage.getItem(`gps_llegada_${id}`);
            if (savedGps) {
                try {
                    const parsed = JSON.parse(savedGps);
                    setTecnicoGpsCoords(parsed.coords);
                    setLlegadaConfirmadaAt(parsed.at);
                } catch (e) {}
            }
        }
    }, [id]);

    const handleConfirmLlegadaGps = (coords: { lat: number; lng: number }) => {
        setTecnicoGpsCoords(coords);
        const nowIso = new Date().toISOString();
        setLlegadaConfirmadaAt(nowIso);
        if (id) {
            localStorage.setItem(`gps_llegada_${id}`, JSON.stringify({
                coords,
                at: nowIso
            }));
        }
        showAlert("Llegada Confirmada", "¡Has confirmado exitosamente tu llegada a la sucursal en el GPS!", "success");
    };

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
    const [adminQuoteMaterials, setAdminQuoteMaterials] = useState<{ material: string; piezas: string; precio: string }[]>([]);
    const [adminManoObra, setAdminManoObra] = useState("0");
    const [previewQuote, setPreviewQuote] = useState<any | null>(null);

    // Historial de Cotizaciones (Evidencia)
    const [quoteHistory, setQuoteHistory] = useState<any[]>(() => {
        if (id) {
            const saved = localStorage.getItem(`quote_history_${id}`);
            if (saved) {
                try { return JSON.parse(saved); } catch (e) {}
            }
        }
        return [];
    });
    const [showHistoryDropdown, setShowHistoryDropdown] = useState<boolean>(false);

    const parseQuoteMaterials = (description: string) => {
        if (!description) return { materials: [], manoObra: 0, notes: "" };
        const lines = description.split('\n');
        const parsedMaterials: any[] = [];
        const notesLines: string[] = [];
        let parsedManoObra = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ')) {
                if (trimmed.toUpperCase().includes("MANO DE OBRA")) {
                    const match = trimmed.match(/-\s+.*?-\s*\$(.+)$/i);
                    if (match) {
                        parsedManoObra = parseFloat(match[1].replace(/,/g, '')) || 0;
                    }
                    continue;
                }
                const match = trimmed.match(/^-\s+(.+?)\s*\((.*?)\)(?:\s*-\s*\$(.+?))?$/);
                if (match) {
                    parsedMaterials.push({
                        material: match[1].trim(),
                        piezas: match[2].trim(),
                        precio: match[3] ? match[3].trim().replace(/,/g, '') : ""
                    });
                } else {
                    parsedMaterials.push({
                        material: trimmed.substring(2).trim(),
                        piezas: "",
                        precio: ""
                    });
                }
            } else {
                notesLines.push(line);
            }
        }
        let notesText = notesLines.join('\n').trim();
        return { materials: parsedMaterials, manoObra: parsedManoObra, notes: notesText };
    };

    useEffect(() => {
        const matsTotal = adminQuoteMaterials.reduce((acc, m) => acc + ((parseFloat(m.precio) || 0) * (parseFloat(m.piezas) || 1)), 0);
        const manoObraVal = parseFloat(adminManoObra) || 0;
        setCosto(String(manoObraVal + matsTotal));
    }, [adminManoObra, adminQuoteMaterials]);
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
    const [rejectionMode, setRejectionMode] = useState<'cotizacion' | 'solicitud'>('cotizacion');

    useEffect(() => {
        const fetchTecnicos = async () => {
            try {
                const data = await getTrabajadores();
                // Filtramos activos si es que hay un campo estado activo (opcional) o tomamos todos
                const techList = data.filter((t: any) => t.estado?.toLowerCase() === 'activo' || t.estado === 'Activo');
                setTecnicosData(techList.map((t: any) => ({
                    id: t.id,
                    nombre: t.nombre,
                    user_id: t.user_id ?? t.userId ?? null
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
                    latitud_llegada: data.latitud_llegada,
                    longitud_llegada: data.longitud_llegada,
                    referencias: data.negocio?.referencias || "Por definir",
                    fechaSolicitud: data.created_at ? new Date(data.created_at).toLocaleDateString('es-MX') : "No registrada",
                    businessId: data.negocio_id || data.negocio?.id,
                    clienteUserId: data.negocio?.user_id || null,
                    foto_url: data.foto_url || null
                };
                
                // Autofill Marca and Modelo if there is a linked MantenimientoSolicitud
                const solicitud = data.mantenimiento_solicitud_visita ||  data.mantenimientoSolicitudVisita || data.mantenimiento_solicitud_reparacion || data.mantenimientoSolicitudReparacion;
                const equipo = solicitud ? (solicitud.levantamiento_equipo || solicitud.levantamientoEquipo) : null;
                
                if (equipo) {
                    setServiceMarca(equipo.marca || equipo.nombre || "");
                    setServiceModelo(equipo.modelo || "");
                    setServiceEquipoId(equipo.id);
                } else if (data.descripcion && typeof data.descripcion === 'string' && data.descripcion.includes('[Equipo:')) {
                    const match = data.descripcion.match(/\[Equipo:\s*(.+?)\]/);
                    if (match && match[1]) {
                        const equipoNombre = match[1].trim();
                        let cleanName = equipoNombre.replace(/\(.*?\)/g, '').trim();
                        let parts = cleanName.split(' ');
                        if (parts.length >= 3) {
                            setServiceMarca([parts[0], parts[1]].join(' '));
                            setServiceModelo(parts.slice(2).join(' '));
                        } else {
                            setServiceMarca(equipoNombre);
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

                // FETCH GROUPED JOBS IF APPLICABLE
                const groupMatch = mappedJob.descripcion?.match(/\[Grupo:\s*(REQ-\d+)\]/);
                const groupId = groupMatch ? groupMatch[1] : null;

                if (groupId && mappedJob.negocio_id) {
                    try {
                        const allJobs = await getTrabajos({ negocio_id: Number(mappedJob.negocio_id) });
                        const groupJobs = allJobs.filter((t: any) => t.descripcion?.includes(`[Grupo: ${groupId}]`));
                        setGroupedJobs(groupJobs);
                    } catch (err) {
                        console.error("Error fetching grouped jobs:", err);
                        setGroupedJobs([]);
                    }
                } else {
                    setGroupedJobs([]);
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
                    let qData = null;

                    const quoteMarker = "|||QUOTE_DATA|||";
                    const serviceMarker = "|||SERVICE_DATA|||";
                    const techMarker = "|||TECH_NAME|||";
                    const photosMarker = "|||PHOTOS_DATA|||";

                    let authorName = currentTech !== "Sin Asignar" ? currentTech : (user?.name || "Sin Asignar");
                    if (finalDesc.includes(techMarker)) {
                        const tParts = finalDesc.split(techMarker);
                        try {
                            authorName = tParts[1].split('\n')[0].split('|||')[0].trim();
                        } catch(e) {}
                    }

                    // Limpiamos la descripción mostrada de todos los marcadores técnicos
                    const cleanDesc = finalDesc
                        .split(serviceMarker)[0]
                        .split(quoteMarker)[0]
                        .split(techMarker)[0]
                        .split(photosMarker)[0]
                        .trim();

                    let displayDesc = cleanDesc;

                    if (finalDesc.includes(serviceMarker)) {
                        const parts = finalDesc.split(serviceMarker);
                        try {
                            // Limpiamos cualquier marcador que venga después del JSON del servicio
                            const jsonContent = parts[1].split(quoteMarker)[0].split(techMarker)[0].split(photosMarker)[0].trim();
                            sData = JSON.parse(jsonContent);
                        } catch (e) { }
                    }

                    if (finalDesc.includes(quoteMarker)) {
                        const parts = finalDesc.split(quoteMarker);
                        try {
                            // Limpiamos cualquier marcador que venga después del JSON de la cotización
                            const jsonContent = parts[1].split(serviceMarker)[0].split(techMarker)[0].split(photosMarker)[0].trim();
                            if (jsonContent.startsWith('{')) {
                                qData = JSON.parse(jsonContent);
                                if (qData.monto) parsedMonto = qData.monto;
                                if (qData.detalles) displayDesc += "\n\nNotas de cotización:\n" + qData.detalles;
                            } else {
                                // Plain text fallback
                                const firstHyphen = jsonContent.indexOf(" - ");
                                if (firstHyphen !== -1) {
                                    const possibleMonto = jsonContent.substring(0, firstHyphen).trim();
                                    if (!isNaN(Number(possibleMonto.replace('$', '')))) {
                                        parsedMonto = possibleMonto;
                                        const detailsText = jsonContent.substring(firstHyphen + 3).trim();
                                        qData = { monto: possibleMonto, detalles: detailsText };
                                    } else {
                                        qData = { monto: "", detalles: jsonContent };
                                    }
                                } else {
                                    qData = { monto: "", detalles: jsonContent };
                                }
                                if (qData.detalles) displayDesc += "\n\nNotas de cotización:\n" + qData.detalles;
                            }
                        } catch (e) { }
                    }

                    let photosList: string[] = [];
                    if (finalDesc.includes(photosMarker)) {
                        const parts = finalDesc.split(photosMarker);
                        try {
                            const jsonContent = parts[1].split(serviceMarker)[0].split(quoteMarker)[0].split(techMarker)[0].trim();
                            photosList = JSON.parse(jsonContent);
                        } catch (e) {}
                    }

                    return {
                        id: act.id,
                        titulo: act.tipo,
                        descripcion: displayDesc,
                        cleanDescripcion: cleanDesc,
                        rawDescripcion: finalDesc,
                        estado: "Nueva",
                        tecnicoNombre: authorName,
                        esCotizacion: esCot,
                        cotizacionMonto: parsedMonto,
                        cotizacionDetalles: displayDesc,
                        cotizacionArchivo: "",
                        cotizacionEstado: "Sugerencia de Técnico",
                        serviceData: sData,
                        hasQuote: finalDesc.includes(quoteMarker),
                        quoteData: qData,
                        refacciones: act.refacciones,
                        photos: photosList
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

                        // Recuperar historial de cotizaciones desde el campo descripcion del backend
                        const HISTORY_MARKER = '|||QUOTE_HISTORY|||';
                        let backendHistory: any[] = [];
                        for (const cot of cotizs) {
                            if (cot.descripcion && cot.descripcion.includes(HISTORY_MARKER)) {
                                try {
                                    const historyJson = cot.descripcion.split(HISTORY_MARKER)[1].trim();
                                    const parsed = JSON.parse(historyJson);
                                    if (Array.isArray(parsed)) {
                                        backendHistory = parsed;
                                        break;
                                    }
                                } catch (e) { /* ignore */ }
                            }
                        }
                        if (backendHistory.length > 0) {
                            setQuoteHistory(backendHistory);
                            localStorage.setItem(`quote_history_${id}`, JSON.stringify(backendHistory));
                        }
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

    // Detectar SOS por tipo O por título (compat con solicitudes creadas antes del fix)
    const isSOS = trabajo?.tipo === "SOS" || trabajo?.titulo?.includes("SOS");

    // Auto-seleccionar "Trabajo" si es SOS al abrir el modal
    const handleOpenAssignModal = () => {
        if (isSOS) {
            setSelectedType("Trabajo");
        } else {
            setSelectedType("Visita");
        }
        
        if (trabajo?.trabajador_id && !selectedTechnicians.includes(trabajo.trabajador_id)) {
            setSelectedTechnicians([trabajo.trabajador_id]);
        }
        
        if (!asignarFecha) {
            setAsignarFecha(new Date().toISOString().split('T')[0]);
        }
        if (!asignarHora) {
            setAsignarHora("09:00");
        }
        
        setIsModalOpen(true);
    };
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
    const [showActivityPDFPreview, setShowActivityPDFPreview] = useState(false);
    const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
    const [activityPDFData, setActivityPDFData] = useState<any>(null);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [newTaskDescription, setNewTaskDescription] = useState("");
    const [taskItems, setTaskItems] = useState<{ id: string; descripcion: string; foto: string }[]>([
        { id: '1', descripcion: '', foto: '' }
    ]);
    const [isQuoteIncluded, setIsQuoteIncluded] = useState(false);
    const [newQuoteAmount, setNewQuoteAmount] = useState("");
    const [newQuoteMaterials, setNewQuoteMaterials] = useState<{material: string, piezas: string, precio?: string}[]>([]);
    const [newQuoteDetails, setNewQuoteDetails] = useState("");
    const [newQuoteFileName, setNewQuoteFileName] = useState("");

    // SERVICE TYPE FIELDS (NEW)
    const [activeServiceType, setActiveServiceType] = useState<any>("Mantenimiento");
    const [customServiceType, setCustomServiceType] = useState("");
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

    const handleAceptarSolicitudPreasignada = async (tecnicoSugeridoName?: string | null) => {
        if (!trabajo) return;
        try {
            const techName = tecnicoSugeridoName || (trabajo.tecnico && trabajo.tecnico !== 'Sin asignar' && trabajo.tecnico !== 'Sin Asignar' ? trabajo.tecnico : null);
            let techId = null;
            let techUserId = null;
            
            if (techName) {
                const tech = tecnicosData.find(t => t.nombre.toLowerCase() === techName.toLowerCase());
                if (tech) {
                    techId = tech.id;
                    techUserId = tech.user_id;
                }
            }

            if (techId) {
                await assignTrabajador(trabajo.id, techId);
            }
            
            await updateEstadoTrabajo(trabajo.id, { estado: "Asignado" });
            
            setTrabajo((prev: any) => ({ 
                ...prev, 
                estado: "Asignado", 
                tecnico: techName || prev.tecnico,
                trabajador_id: techId || prev.trabajador_id
            }));
            
            // Notificar al técnico si es posible
            if (techUserId) {
                try {
                    await createNotificacion({
                        user_id: techUserId,
                        titulo: 'Nuevo Trabajo Asignado',
                        mensaje: `Se ha confirmado tu asignación al trabajo: ${trabajo.titulo || 'Mantenimiento'} en ${trabajo.sucursal || 'la sucursal'}.`,
                        enlace: `/tecnico/trabajo-detalle/${trabajo.id}`
                    });
                } catch (err) { console.error("Error notificando al técnico:", err); }
            }
            
            setShowZoomModal(false);
            showAlert('Solicitud Aceptada', 'La solicitud ha sido aprobada y el técnico ha sido asignado y notificado.', 'success');
        } catch (error) {
            console.error("Error aceptando solicitud preasignada:", error);
            showAlert('Error', 'Hubo un problema al aceptar la solicitud.', 'error');
        }
    };

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

                    const needsStateUpdate = trabajo.estado === "Pendiente" || trabajo.estado === "Solicitud" || trabajo.estado === "Cotización Aceptada" || trabajo.estado === "Cotización Aprobada" || trabajo.estado === "En Espera";
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

                    // Notificaciones al técnico (backend + localStorage fallback)
                    const esSOS = trabajo.tipo === "SOS" || trabajo.titulo?.includes("SOS");
                    const isVisita = selectedType === "Visita";
                    const notifTitulo = esSOS
                        ? '🚨 Trabajo de Emergencia SOS'
                        : (isVisita ? '📋 Nueva Visita Asignada' : '🛠️ Nuevo Trabajo Asignado');
                    const notifMensaje = esSOS
                        ? `⚠️ EMERGENCIA: Se te ha asignado un trabajo urgente en ${trabajo.sucursal}. Atender de inmediato: "${trabajo.titulo}".`
                        : (isVisita
                            ? `Se te ha asignado una nueva visita de evaluación para: ${trabajo.titulo} en ${trabajo.sucursal}.`
                            : `Te han asignado un nuevo trabajo: ${trabajo.titulo} en ${trabajo.sucursal}.`);

                    for (const id of selectedTechnicians) {
                        const tech = tecnicosData.find(t => t.id === id);
                        if (!tech) continue;

                        // 1. Notificación backend (la que aparece en el panel del técnico)
                        if (tech.user_id) {
                            try {
                                await createNotificacion({
                                    user_id: tech.user_id,
                                    titulo: notifTitulo,
                                    mensaje: notifMensaje,
                                    enlace: `/tecnico/trabajo-detalle/${trabajo.id}`
                                });
                            } catch (notiErr) {
                                console.error("Error enviando notificación al técnico:", notiErr);
                            }
                        }

                        // 2. localStorage como fallback visual inmediato
                        const techKey = `tecnico_notifications_${tech.nombre}`;
                        const techNotifs = JSON.parse(localStorage.getItem(techKey) || '[]');
                        techNotifs.unshift({
                            id: Date.now() + Math.random(),
                            titulo: notifTitulo,
                            mensaje: notifMensaje,
                            fecha: new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                            leida: false,
                            jobId: trabajo.id
                        });
                        localStorage.setItem(techKey, JSON.stringify(techNotifs));
                    }
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

    const handleAceptarAsignacion = async () => {
        try {
            await updateEstadoTrabajo(trabajo.id, { estado: "En Espera" });
            setTrabajo((prev: any) => prev ? { ...prev, estado: "En Espera" } : prev);
            showAlert("Trabajo Aceptado", "Has aceptado la asignación. Ahora puedes iniciar el trabajo o visita cuando llegues.", "success");
        } catch (error) {
            console.error("Error aceptando asignación:", error);
            showAlert("Error", "No se pudo aceptar la asignación.", "error");
        }
    };

    const handleRechazarAsignacion = async () => {
        showPrompt(
            "Rechazar Asignación",
            "Por favor, ingresa el motivo del rechazo:",
            "",
            async (motivo) => {
                if (!motivo) return;

                try {
                    const newState = (trabajo.tipo === "SOS" || trabajo.tipo === "Nueva Solicitud") ? "Solicitud" : "Cotización Aceptada";
                    await updateEstadoTrabajo(trabajo.id, { estado: newState, tecnico: "Sin asignar" });
                    
                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
                    const token = localStorage.getItem('token');
                    const chatMessage = `❌ ASIGNACIÓN RECHAZADA\nMotivo: ${motivo}`;
                    await fetch(`${API_URL}/trabajos/${trabajo.id}/chat`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: chatMessage })
                    });

                    setTrabajo((prev: any) => prev ? { ...prev, estado: newState, tecnico: "Sin asignar" } : prev);
                    showAlert("Trabajo Rechazado", "Has rechazado el trabajo y se ha notificado al administrador.", "info");
                } catch (error) {
                    console.error("Error rechazando asignación:", error);
                    showAlert("Error", "No se pudo rechazar la asignación.", "error");
                }
            },
            () => {},
            "Rechazar Trabajo",
            "Cancelar"
        );
    };

    const handleEmpezarTrabajoTipo = async (tipo: 'Visita' | 'Trabajo') => {
        try {
            const isVisita = tipo === 'Visita';
            const nuevoTitulo = trabajo.titulo ? trabajo.titulo.replace("(Visita)", "").replace("(Reparación)", "").trim() + (isVisita ? " (Visita)" : " (Reparación)") : (isVisita ? "Nueva Visita" : "Nueva Reparación");
            
            await updateEstadoTrabajo(trabajo.id, { estado: "En Proceso", visitado: !isVisita });
            await updateTrabajo(trabajo.id, { tipo, titulo: nuevoTitulo });

            setTrabajo((prev: any) => prev ? { ...prev, estado: "En Proceso", tipo, titulo: nuevoTitulo, visitado: !isVisita } : prev);
            setActiveTab(isVisita ? 'Registro' : 'Trabajo');
            showAlert("Actividad Iniciada", `Has iniciado como ${tipo}. Ahora puedes agregar registros.`, "success");
        } catch (error) {
            console.error("Error iniciando trabajo:", error);
            showAlert("Error", "No se pudo iniciar la actividad.", "error");
        }
    };

    const handleGeneratePreview = () => {
        const refaccionesList = refacciones.map(r => ({
            pieza: r.pieza,
            cantidad: Number(r.cantidad) || 1,
            costo_estimado: r.costo_estimado ? String(r.costo_estimado) : ''
        })).concat(
            isQuoteIncluded ? quoteMateriales.map(m => ({
                pieza: m.nombre,
                cantidad: m.cantidad ? Number(m.cantidad) || 1 : 1,
                costo_estimado: m.precio ? String(m.precio) : ''
            })) : []
        );

        const combinedMateriales = isQuoteIncluded ? quoteComentarios : '';

        const preparedData = {
            id: trabajo?.id || 'SD',
            folio: `COT-${trabajo?.id?.toString().padStart(5, '0')}`,
            sucursal: trabajo?.sucursal || '---',
            encargado: trabajo?.encargado || '---',
            tecnico: user?.name || trabajo?.tecnico || 'Técnico',
            isVisita: !trabajo?.visitado,
            reporteTienda: activeServiceType === 'Otro' ? (customServiceType || 'Otro') : activeServiceType,
            descripcion: newTaskDescription,
            materiales: combinedMateriales,
            refaccionesList: refaccionesList,
            observaciones: '',
            imagenes: {
                antes: activityPhotos[0] || null,
                durante: activityPhotos[1] || null,
                despues: activityPhotos[2] || null
            },
            imagenObservacion: activityPhotos[3] || null,
            imagenesObservacion: activityPhotos[3] ? [activityPhotos[3]] : [],
            firmaEmpresa: null,
            involucraEquipo: !!serviceMarca || !!serviceModelo,
            equipoInfo: (serviceMarca || serviceModelo) ? {
                tipo: activeServiceType,
                marca: serviceMarca || 'N/A',
                modelo: serviceModelo || 'N/A',
                piezas: servicePieza || 'N/A',
                garantia: serviceGarantia || 'N/A'
            } : null,
            fecha: new Date().toLocaleDateString('es-MX')
        };

        setActivityPDFData(preparedData);
        setShowActivityPDFPreview(true);
    };

    const handleAddTask = async (generatePDF = false) => {
        try {
            const activeItems = taskItems.filter(t => t.descripcion.trim() || t.foto);
            const combinedDesc = activeItems.length > 0
                ? activeItems.map((item, idx) => activeItems.length > 1 ? `${idx + 1}. ${item.descripcion.trim()}` : item.descripcion.trim()).filter(Boolean).join('\n\n')
                : newTaskDescription;
            const combinedPhotos = activeItems.map(t => t.foto).filter(Boolean);

            let desc = combinedDesc;

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
                const materialsText = newQuoteMaterials.filter(m => m.material.trim()).map(m => `- ${m.material} (${m.piezas})${m.precio ? ` - $${m.precio}` : ''}`).join('\n');
                const combinedDetails = materialsText ? `${materialsText}\n\n${newQuoteDetails}` : newQuoteDetails;
                const quotePayload = { 
                    monto: newQuoteAmount, 
                    detalles: combinedDetails,
                    materials: newQuoteMaterials.filter(m => m.material.trim())
                };
                desc += ` \n|||QUOTE_DATA||| ${JSON.stringify(quotePayload)}`;
            }

            const techNamePayload = user?.name || "Sin Asignar";
            desc += ` \n|||TECH_NAME||| ${techNamePayload}`;

            if (combinedPhotos.length > 0) {
                desc += ` \n|||PHOTOS_DATA||| ${JSON.stringify(combinedPhotos)}`;
            }

            const payloadRefacciones = refacciones
                .filter(r => r.pieza && r.pieza.trim() !== '')
                .map(r => ({
                    pieza: r.pieza.trim(),
                    cantidad: Number(r.cantidad),
                    costo_estimado: r.costo_estimado ? Number(r.costo_estimado) : undefined,
                    levantamiento_equipo_id: serviceEquipoId || undefined
                }));

            const body = {
                trabajo_id: Number(id),
                tipo: activeServiceType === 'Otro' ? (customServiceType || 'Otro') : activeServiceType,
                descripcion: desc,
                refacciones: payloadRefacciones
            };

            if (editingTaskId) {
                await updateActividad(editingTaskId, body);
            } else {
                await createActividad(body);
            }
                const acts = await getActividadesByTrabajo(Number(id));
                const mappedSubTareas = acts.map((act: any) => {
                    let finalDesc = act.descripcion || "";
                    let parsedMonto = "Por Evaluar";
                    let esCot = true;
                    let sData = null;
                    let qData = null;

                    const quoteMarker = "|||QUOTE_DATA|||";
                    const serviceMarker = "|||SERVICE_DATA|||";
                    const techMarker = "|||TECH_NAME|||";
                    const photosMarker = "|||PHOTOS_DATA|||";

                    // Limpiamos la descripción mostrada de todos los marcadores técnicos
                    const cleanDesc = finalDesc
                        .split(serviceMarker)[0]
                        .split(quoteMarker)[0]
                        .split(techMarker)[0]
                        .split(photosMarker)[0]
                        .trim();

                    let displayDesc = cleanDesc;

                    if (finalDesc.includes(serviceMarker)) {
                        const parts = finalDesc.split(serviceMarker);
                        try {
                            sData = JSON.parse(parts[1].split(quoteMarker)[0].split(techMarker)[0].split(photosMarker)[0].trim());
                        } catch (e) { }
                    }

                    if (finalDesc.includes(quoteMarker)) {
                        const parts = finalDesc.split(quoteMarker);
                        try {
                            const jsonContent = parts[1].split(serviceMarker)[0].split(techMarker)[0].split(photosMarker)[0].trim();
                            if (jsonContent.startsWith('{')) {
                                qData = JSON.parse(jsonContent);
                                if (qData.monto) parsedMonto = qData.monto;
                                if (qData.detalles) displayDesc += "\n\nNotas de cotización:\n" + qData.detalles;
                            } else {
                                // Plain text fallback
                                const firstHyphen = jsonContent.indexOf(" - ");
                                if (firstHyphen !== -1) {
                                    const possibleMonto = jsonContent.substring(0, firstHyphen).trim();
                                    if (!isNaN(Number(possibleMonto.replace('$', '')))) {
                                        parsedMonto = possibleMonto;
                                        const detailsText = jsonContent.substring(firstHyphen + 3).trim();
                                        qData = { monto: possibleMonto, detalles: detailsText };
                                    } else {
                                        qData = { monto: "", detalles: jsonContent };
                                    }
                                } else {
                                    qData = { monto: "", detalles: jsonContent };
                                }
                                if (qData.detalles) displayDesc += "\n\nNotas de cotización:\n" + qData.detalles;
                            }
                        } catch (e) { }
                    }

                    let photosList: string[] = [];
                    if (finalDesc.includes(photosMarker)) {
                        const parts = finalDesc.split(photosMarker);
                        try {
                            const jsonContent = parts[1].split(serviceMarker)[0].split(quoteMarker)[0].split(techMarker)[0].trim();
                            photosList = JSON.parse(jsonContent);
                        } catch (e) {}
                    }

                    return {
                        id: act.id,
                        titulo: act.tipo,
                        descripcion: displayDesc,
                        cleanDescripcion: cleanDesc,
                        estado: "Nueva",
                        tecnicoNombre: user?.name,
                        esCotizacion: esCot,
                        cotizacionMonto: parsedMonto,
                        cotizacionDetalles: displayDesc,
                        cotizacionArchivo: "",
                        cotizacionEstado: "Sugerencia de Técnico",
                        serviceData: sData,
                        hasQuote: finalDesc.includes(quoteMarker),
                        quoteData: qData,
                        refacciones: act.refacciones,
                        photos: photosList
                    };
                });
                setSubTareas(mappedSubTareas as any);
                if (generatePDF) {
                    const refaccionesList = refacciones.map(r => ({
                        pieza: r.pieza,
                        cantidad: Number(r.cantidad) || 1,
                        costo_estimado: r.costo_estimado ? String(r.costo_estimado) : ''
                    })).concat(
                        isQuoteIncluded ? newQuoteMaterials.map(m => ({
                            pieza: m.material,
                            cantidad: m.piezas ? Number(m.piezas) || 1 : 1,
                            costo_estimado: m.precio ? String(m.precio) : ''
                        })) : []
                    );

                    if (isQuoteIncluded && newQuoteAmount && parseFloat(newQuoteAmount) > 0) {
                        refaccionesList.push({
                            pieza: "MANO DE OBRA / SERVICIO TÉCNICO",
                            cantidad: 1,
                            costo_estimado: String(newQuoteAmount)
                        });
                    }

                    const combinedMateriales = isQuoteIncluded ? newQuoteDetails : '';

                    const activeItems = taskItems.filter(t => t.descripcion.trim() || t.foto);
                    const combinedDescText = activeItems.length > 0
                        ? activeItems.map((item, idx) => activeItems.length > 1 ? `${idx + 1}. ${item.descripcion.trim()}` : item.descripcion.trim()).filter(Boolean).join('\n\n')
                        : newTaskDescription;

                    const preparedData = {
                        id: trabajo?.id || 'SD',
                        folio: `TRB-${trabajo?.id?.toString().padStart(5, '0')}`,
                        sucursal: trabajo?.sucursal || '---',
                        encargado: trabajo?.encargado || '---',
                        tecnico: user?.name || trabajo?.tecnico || 'Técnico',
                        isVisita: trabajo?.tipo === 'Visita' || trabajo?.originalTipo === 'Visita',
                        reporteTienda: activeServiceType === 'Otro' ? (customServiceType || 'Otro') : activeServiceType,
                        descripcion: combinedDescText,
                        materiales: combinedMateriales,
                        refaccionesList: refaccionesList,
                        observaciones: '',
                        observacionesList: activeItems.map((item, index) => ({
                            id: String(index + 1),
                            texto: item.descripcion,
                            imagenes: item.foto ? [item.foto] : []
                        })),
                        imagenes: {
                            antes: activeItems[0]?.foto || null,
                            durante: activeItems[1]?.foto || null,
                            despues: activeItems[2]?.foto || null
                        },
                        imagenObservacion: activeItems[3]?.foto || null,
                        imagenesObservacion: activeItems[3]?.foto ? [activeItems[3].foto] : [],
                        firmaEmpresa: null,
                        involucraEquipo: !!serviceMarca || !!serviceModelo,
                        equipoInfo: (serviceMarca || serviceModelo) ? {
                            tipo: activeServiceType,
                            marca: serviceMarca || 'N/A',
                            modelo: serviceModelo || 'N/A',
                            piezas: servicePieza || 'N/A',
                            garantia: serviceGarantia || 'N/A'
                        } : null,
                        fecha: new Date().toLocaleDateString('es-MX')
                    };

                    setActivityPDFData(preparedData);
                    setShowActivityPDFPreview(true);
                }
                showAlert(
                    'Actividad Registrada',
                    'La actividad ha sido guardada y sincronizada correctamente.',
                    'success'
                );
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
        setNewQuoteMaterials([]);
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
                        let esCot = true;
                        let sData = null;
                        let qData = null;

                        const quoteMarker = "|||QUOTE_DATA|||";
                        const serviceMarker = "|||SERVICE_DATA|||";
                        const techMarker = "|||TECH_NAME|||";
                        const photosMarker = "|||PHOTOS_DATA|||";

                        // Limpiamos la descripción mostrada de todos los marcadores técnicos
                        const cleanDesc = finalDesc
                            .split(serviceMarker)[0]
                            .split(quoteMarker)[0]
                            .split(techMarker)[0]
                            .split(photosMarker)[0]
                            .trim();

                        let displayDesc = cleanDesc;

                        if (finalDesc.includes(serviceMarker)) {
                            const parts = finalDesc.split(serviceMarker);
                            try {
                                sData = JSON.parse(parts[1].split(quoteMarker)[0].split(techMarker)[0].split(photosMarker)[0].trim());
                            } catch (e) { }
                        }

                        if (finalDesc.includes(quoteMarker)) {
                            const parts = finalDesc.split(quoteMarker);
                            try {
                                const jsonContent = parts[1].split(serviceMarker)[0].split(techMarker)[0].split(photosMarker)[0].trim();
                                if (jsonContent.startsWith('{')) {
                                    qData = JSON.parse(jsonContent);
                                    if (qData.monto) parsedMonto = qData.monto;
                                    if (qData.detalles) displayDesc += "\n\nNotas de cotización:\n" + qData.detalles;
                                } else {
                                    // Plain text fallback
                                    const firstHyphen = jsonContent.indexOf(" - ");
                                    if (firstHyphen !== -1) {
                                        const possibleMonto = jsonContent.substring(0, firstHyphen).trim();
                                        if (!isNaN(Number(possibleMonto.replace('$', '')))) {
                                            parsedMonto = possibleMonto;
                                            const detailsText = jsonContent.substring(firstHyphen + 3).trim();
                                            qData = { monto: possibleMonto, detalles: detailsText };
                                        } else {
                                            qData = { monto: "", detalles: jsonContent };
                                        }
                                    } else {
                                        qData = { monto: "", detalles: jsonContent };
                                    }
                                    if (qData.detalles) displayDesc += "\n\nNotas de cotización:\n" + qData.detalles;
                                }
                            } catch (e) { }
                        }

                        let photosList: string[] = [];
                        if (finalDesc.includes(photosMarker)) {
                            const parts = finalDesc.split(photosMarker);
                            try {
                                const jsonContent = parts[1].split(serviceMarker)[0].split(quoteMarker)[0].split(techMarker)[0].trim();
                                photosList = JSON.parse(jsonContent);
                            } catch (e) {}
                        }

                        return {
                            id: act.id,
                            titulo: act.tipo,
                            descripcion: displayDesc,
                            cleanDescripcion: cleanDesc,
                            rawDescripcion: finalDesc,
                            estado: "Nueva",
                            tecnicoNombre: user?.name,
                            esCotizacion: esCot,
                            cotizacionMonto: parsedMonto,
                            cotizacionDetalles: displayDesc,
                            cotizacionArchivo: "",
                            cotizacionEstado: "Sugerencia de Técnico",
                            serviceData: sData,
                            hasQuote: finalDesc.includes(quoteMarker),
                            quoteData: qData,
                            refacciones: act.refacciones,
                            photos: photosList
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
        
        // 1. Descripción limpia
        setNewTaskDescription(tarea.cleanDescripcion || tarea.descripcion);
        
        // 2. Tipo de Actividad
        if (tarea.serviceData?.tipoServicio) {
            setActiveServiceType(tarea.serviceData.tipoServicio);
        } else {
            const standardCategories = ['Mantenimiento', 'Instalacion', 'Plomeria', 'Electricidad', 'Albañileria', 'Carpinteria', 'Pintura'];
            if (standardCategories.includes(tarea.titulo)) {
                setActiveServiceType(tarea.titulo);
            } else {
                setActiveServiceType('Otro');
                setCustomServiceType(tarea.titulo);
            }
        }
        
        // 3. Marca / Modelo / Pieza / Garantía
        setServiceMarca(tarea.serviceData?.marca || "");
        setServiceModelo(tarea.serviceData?.modelo || "");
        setServicePieza(tarea.serviceData?.pieza || "");
        setServiceGarantia(tarea.serviceData?.garantia || "");
        
        // 4. Refacciones
        setRefacciones(tarea.refacciones || []);
        
        // 5. Cotización
        if (tarea.hasQuote) {
            setIsQuoteIncluded(true);
            setNewQuoteAmount(tarea.cotizacionMonto && tarea.cotizacionMonto !== "Por Evaluar" ? String(tarea.cotizacionMonto) : "");
            
            let currentQuoteData = tarea.quoteData;
            if (!currentQuoteData && (tarea as any).rawDescripcion) {
                const rawDesc = (tarea as any).rawDescripcion || "";
                const quoteMarker = "|||QUOTE_DATA|||";
                if (rawDesc.includes(quoteMarker)) {
                    const parts = rawDesc.split(quoteMarker);
                    const serviceMarker = "|||SERVICE_DATA|||";
                    const techMarker = "|||TECH_NAME|||";
                    const photosMarker = "|||PHOTOS_DATA|||";
                    const jsonContent = parts[1].split(serviceMarker)[0].split(techMarker)[0].split(photosMarker)[0].trim();
                    try {
                        if (jsonContent.startsWith('{')) {
                            currentQuoteData = JSON.parse(jsonContent);
                        } else {
                            // Plain text format fallback
                            const firstHyphen = jsonContent.indexOf(" - ");
                            if (firstHyphen !== -1) {
                                const possibleMonto = jsonContent.substring(0, firstHyphen).trim();
                                if (!isNaN(Number(possibleMonto.replace('$', '')))) {
                                    currentQuoteData = { monto: possibleMonto, detalles: jsonContent.substring(firstHyphen + 3).trim() };
                                } else {
                                    currentQuoteData = { monto: "", detalles: jsonContent };
                                }
                            } else {
                                currentQuoteData = { monto: "", detalles: jsonContent };
                            }
                        }
                    } catch (e) {
                        currentQuoteData = { detalles: jsonContent };
                    }
                }
            }

            if (currentQuoteData) {
                if (currentQuoteData.materials) {
                    setNewQuoteMaterials(currentQuoteData.materials);
                    // Filter out any lines starting with "- " from details to avoid duplicating materials in the text box
                    const rawDetails = currentQuoteData.detalles || "";
                    const cleanDetailsLines = rawDetails.split('\n').filter(line => !line.trim().startsWith('- '));
                    setNewQuoteDetails(cleanDetailsLines.join('\n').trim());
                } else {
                    const parsedMaterials: any[] = [];
                    const detailLines: string[] = [];
                    const lines = (currentQuoteData.detalles || "").split('\n');
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('- ')) {
                            const raw = trimmed.substring(2);
                            const priceMatch = raw.match(/(.+)\s*\(([^)]+)\)\s*-\s*\$(.+)/);
                            const normalMatch = raw.match(/(.+)\s*\(([^)]+)\)/);
                            if (priceMatch) {
                                parsedMaterials.push({
                                    material: priceMatch[1].trim(),
                                    piezas: priceMatch[2].trim(),
                                    precio: priceMatch[3].trim()
                                });
                            } else if (normalMatch) {
                                parsedMaterials.push({
                                    material: normalMatch[1].trim(),
                                    piezas: normalMatch[2].trim(),
                                    precio: ""
                                });
                            } else {
                                parsedMaterials.push({
                                    material: raw,
                                    piezas: "1",
                                    precio: ""
                                });
                            }
                        } else {
                            if (trimmed) detailLines.push(line);
                        }
                    }
                    setNewQuoteMaterials(parsedMaterials);
                    setNewQuoteDetails(detailLines.join('\n').trim());
                }
            } else {
                setNewQuoteMaterials([]);
                setNewQuoteDetails("");
            }
        } else {
            setIsQuoteIncluded(false);
            setNewQuoteAmount("");
            setNewQuoteMaterials([]);
            setNewQuoteDetails("");
        }
        
        // 6. Fotos y tareas de la actividad
        const photosList = tarea.photos || [];
        
        const cleanDescText = tarea.cleanDescripcion || tarea.descripcion || '';
        const descParts = cleanDescText.split('\n\n');
        const items = [];
        const maxLen = Math.max(descParts.length, photosList.length);
        for (let i = 0; i < Math.min(maxLen, 3); i++) {
            const raw = descParts[i] || '';
            const cleaned = raw.replace(/^\d+\.\s*/, '');
            items.push({
                id: String(i + 1),
                descripcion: cleaned,
                foto: photosList[i] || ''
            });
        }
        setTaskItems(items.length > 0 ? items : [{ id: '1', descripcion: cleanDescText, foto: '' }]);
        
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
                        const updatedJob = {
                            ...trabajo,
                            estado: "En Espera" as any,
                            visitado: true
                        };
                        setTrabajo(updatedJob);

                        // Notificar al Admin via BD
                        try {
                            if (trabajo.clienteUserId) {
                                await createNotificacion({
                                    user_id: trabajo.clienteUserId,
                                    titulo: '📍 Visita Finalizada',
                                    mensaje: `El técnico ${user?.name || 'Sistema'} ha concluido la visita en ${trabajo.sucursal || 'la sucursal'}. Ya puede enviar cotización al cliente.`,
                                    enlace: `/menu/trabajo-detalle/${trabajo.id}`
                                });
                            }
                            const targetAdminId = user?.admin_autonomo_id || user?.id || 0;
                            await createNotificacionEcosistema({
                                admin_autonomo_id: targetAdminId,
                                titulo: 'Visita Finalizada 📍',
                                mensaje: `El técnico ${user?.name || 'Sistema'} ha concluido la visita en ${trabajo.sucursal || 'la sucursal'}. Ya puedes enviar cotización al cliente.`,
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
                            if (trabajo.clienteUserId) {
                                await createNotificacion({
                                    user_id: trabajo.clienteUserId,
                                    titulo: '✅ Trabajo Finalizado',
                                    mensaje: `El técnico ${user?.name || 'Sistema'} finalizó el trabajo en ${trabajo.sucursal || 'la sucursal'}. El reporte ya está disponible.`,
                                    enlace: `/menu/trabajo-detalle/${trabajo.id}`
                                });
                            }
                            const targetAdminId = user?.admin_autonomo_id || user?.id || 0;
                            await createNotificacionEcosistema({
                                admin_autonomo_id: targetAdminId,
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

    const handleEnviarCotizacion = async (action: 'send' | 'accept_and_assign' = 'send') => {
        if (!costo || !trabajo) {
            showAlert('Campos Incompletos', 'Por favor, ingresa el monto de la cotización.', 'info');
            return;
        }
        try {
            const newState = action === 'accept_and_assign' ? "Cotización Aceptada" : "Cotización Enviada";
            await updateEstadoTrabajo(trabajo.id, { estado: newState });
            setTrabajo((prev: any) => prev ? { ...prev, estado: newState } : prev);
            
            const formData = new FormData();
            formData.append('trabajo_id', trabajo.id.toString());
            formData.append('monto', costo);
            formData.append('descripcion', notas);
            formData.append('estado', action === 'accept_and_assign' ? "Aprobada" : "Pendiente");

            const savedCotiz = await saveCotizacion(formData as any);
            setCotizaciones(prev => [...prev, savedCotiz]);

            // RESET FIELDS
            setCosto(""); setNotas(""); setArchivoFile(null); setNombreArchivo("");
            setShowAddQuoteForm(false);

            if (action === 'accept_and_assign') {
                showAlert('Cotización Aceptada', `La propuesta fue guardada. Por favor asigna un técnico a continuación.`, 'success');
                handleOpenAssignModal();
            } else {
                // Enviar propuesta al chat
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
                const token = localStorage.getItem('token');
                try {
                    const chatMessage = `PROPUESTA DE PRECIO: $${costo}\nNotas: ${notas || "Ninguna"}`;
                    await fetch(`${API_URL}/trabajos/${trabajo.id}/chat`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ message: chatMessage })
                    });
                } catch (err) {
                    console.error("Error enviando propuesta al chat:", err);
                }

                // Notificar al técnico
                const tecnicoUserId = (trabajo as any).tecnicoUserId || (trabajo as any).trabajador?.user_id || (trabajo as any).trabajador_id;
                if (tecnicoUserId) {
                    try {
                        await createNotificacion({
                            user_id: tecnicoUserId,
                            titulo: '📄 Nueva Propuesta de Precio',
                            mensaje: `El administrador ha ajustado el precio para el trabajo en "${trabajo.sucursal || 'la sucursal'}". Revisa la propuesta.`,
                            enlace: `/tecnico/trabajo-detalle/${trabajo.id}`
                        });
                    } catch (err) {
                        console.error("Error enviando notificación al técnico:", err);
                    }
                }

                showAlert('Propuesta Enviada', `La propuesta fue enviada al técnico para su revisión.`, 'success');
            }
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
                const targetAdminId = user?.admin_autonomo_id || user?.id || 0;
                await createNotificacionEcosistema({
                    admin_autonomo_id: targetAdminId,
                    titulo: '✅ Cotización Aprobada',
                    mensaje: `El cliente ha aprobado la cotización para ${trabajo.sucursal || 'la sucursal'}. ¡Es hora de iniciar el trabajo!`,
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
        setRejectionMode("cotizacion");
        setShowRejectionModal(true);
    };

    const handleAdminRechazarSolicitud = () => {
        setRejectionReason("");
        setRejectionMode("solicitud");
        setShowZoomModal(false); // Cerramos el modal de zoom si estaba abierto
        setShowRejectionModal(true);
    };

    const handleSubmitRejection = async () => {
        if (!rejectionReason.trim() || !trabajo) {
            showAlert('Atención', 'Por favor ingresa un motivo para el rechazo.', 'warning');
            return;
        }

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const token = localStorage.getItem('token');

            if (rejectionMode === "cotizacion") {
                if (!quoteToReject) return;
                // 1. Actualizar estado de la cotización individual
                await updateCotizacionStatus(quoteToReject, "Rechazada");
                
                // 2. Notificar al administrador con el motivo
                await createNotificacionByRole({
                    role: 'admin',
                    titulo: '🚫 Cotización Rechazada',
                    mensaje: `El cliente ha rechazado una opción de presupuesto para "${trabajo.sucursal || 'Servicio'}". Motivo: ${rejectionReason}`,
                    enlace: `/menu/trabajo-detalle/${trabajo.id}?tab=cotizacion`
                });

                // 2.5 Enviar el motivo de rechazo al chat automáticamente
                try {
                    await fetch(`${API_URL}/trabajos/${trabajo.id}/chat`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: `MOTIVO DE RECHAZO: ${rejectionReason}` })
                    });
                } catch (err) { console.error("Error al enviar mensaje de chat:", err); }

                // 3. Actualizar estado local
                setCotizaciones(prev => prev.map(c => c.id === quoteToReject ? { ...c, estado: "Rechazada" as const } : c));
                
                setShowRejectionModal(false);
                setRejectionReason("");
                setQuoteToReject(null);
                showAlert('Enviado', 'Se ha notificado al administrador sobre el rechazo y tu motivo.', 'info');
            } else if (rejectionMode === "solicitud") {
                // RECHAZO DE LA SOLICITUD COMPLETA (Por el admin/gerente)
                // 1. Cambiar estado del trabajo a "Cancelado"
                await updateEstadoTrabajo(trabajo.id, { estado: "Cancelado" });
                setTrabajo(prev => prev ? { ...prev, estado: "Cancelado" } : prev);

                // 2. Notificar al creador de la solicitud (cliente / subgerente)
                if (trabajo.cliente_id) {
                    await createNotificacion({
                        user_id: trabajo.cliente_id,
                        titulo: '🚫 Solicitud Rechazada',
                        mensaje: `Tu solicitud para "${trabajo.sucursal || 'Servicio'}" ha sido rechazada por el administrador. Motivo: ${rejectionReason}`,
                        enlace: `/cliente/trabajo-detalle/${trabajo.id}`
                    });
                }

                // 3. Mandar el comentario de rechazo al chat del trabajo
                try {
                    await fetch(`${API_URL}/trabajos/${trabajo.id}/chat`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: `SOLICITUD RECHAZADA. MOTIVO: ${rejectionReason}` })
                    });
                } catch (err) { console.error("Error al enviar mensaje de chat:", err); }

                setShowRejectionModal(false);
                setRejectionReason("");
                showAlert('Solicitud Rechazada', 'La solicitud ha sido cancelada y el creador ha sido notificado.', 'info');
            }
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
            if (t.includes('mantenimiento')) return <HiOutlineCog6Tooth size={24} style={{ color: '#f26522' }} />;
            if (t.includes('instalacion')) return <HiOutlineBuildingOffice2 size={24} style={{ color: '#6366f1' }} />;
            if (t.includes('electricidad')) return <HiOutlineBolt size={24} style={{ color: '#fbbf24' }} />;
            if (t.includes('plomeria')) return <HiOutlineWrench size={24} style={{ color: '#0ea5e9' }} />;
            if (t.includes('albañil')) return <HiOutlineSquare3Stack3D size={24} style={{ color: '#f26522' }} />;
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
                    const refaccionesList = (tarea.refacciones || []).map(r => ({
                        pieza: r.pieza,
                        bold: true,
                        cantidad: Number(r.cantidad) || 1,
                        costo_estimado: r.costo_estimado ? String(r.costo_estimado) : ''
                    })).concat(
                        tarea.hasQuote && tarea.quoteData?.materials ? tarea.quoteData.materials.map((m: any) => ({
                            pieza: m.material,
                            cantidad: m.piezas ? Number(m.piezas) || 1 : 1,
                            costo_estimado: m.precio ? String(m.precio) : ''
                        })) : []
                    );

                    if (tarea.hasQuote && tarea.quoteData?.monto && parseFloat(tarea.quoteData.monto) > 0) {
                        refaccionesList.push({
                            pieza: "MANO DE OBRA / SERVICIO TÉCNICO",
                            cantidad: 1,
                            costo_estimado: String(tarea.quoteData.monto)
                        });
                    }

                    const combinedMateriales = tarea.hasQuote ? (tarea.quoteData?.detalles || '') : '';

                    const preparedData = {
                        id: tarea.id || 'SD',
                        reporteTienda: tarea.titulo,
                        descripcion: tarea.cleanDescripcion || tarea.descripcion,
                        materiales: combinedMateriales,
                        refaccionesList: refaccionesList,
                        observaciones: '',
                        imagenes: {
                            antes: tarea.photos?.[0] || null,
                            durante: tarea.photos?.[1] || null,
                            despues: tarea.photos?.[2] || null
                        },
                        imagenObservacion: tarea.photos?.[3] || null,
                        firmaEmpresa: null,
                        involucraEquipo: !!tarea.serviceData?.marca || !!tarea.serviceData?.modelo,
                        equipoInfo: (tarea.serviceData?.marca || tarea.serviceData?.modelo) ? {
                            tipo: tarea.serviceData.tipoServicio || tarea.titulo,
                            marca: tarea.serviceData.marca || 'N/A',
                            modelo: tarea.serviceData.modelo || 'N/A',
                            piezas: tarea.serviceData.pieza || 'N/A',
                            garantia: tarea.serviceData.garantia || 'N/A'
                        } : null,
                        fecha: new Date().toLocaleDateString('es-MX'),
                        isVisita: trabajo?.tipo === 'Visita' || trabajo?.originalTipo === 'Visita' || !!tarea.hasQuote || (trabajo?.estado !== 'Finalizado' && trabajo?.estado !== 'En Proceso')
                    };

                    setActivityPDFData(preparedData);
                    setShowActivityPDFPreview(true);
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
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>Tarea: {tarea.id}</span>
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
                    {(() => {
                        const descText = tarea.descripcion || '';
                        const parts = descText.split(/Notas de cotizaci[óo]n:\s*-?/i);
                        const mainDesc = parts[0].trim();
                        const materialsText = parts.length > 1 ? parts.slice(1).join('Notas de cotización:').trim() : '';

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
                                {mainDesc && (
                                    <p className={styles.taskDesc} style={{ color: '#475569', fontSize: '15px', margin: 0, fontWeight: 'normal', lineHeight: '1.6' }}>
                                        {mainDesc}
                                    </p>
                                )}
                                {materialsText && (() => {
                                    const parsedItems = parseMaterials(materialsText);
                                    return (
                                        <div style={{
                                            background: '#ffffff',
                                            borderRadius: '16px',
                                            border: '1.5px solid #f1f5f9',
                                            boxShadow: '0 4px 20px -2px rgba(148, 163, 184, 0.08)',
                                            overflow: 'hidden',
                                            marginTop: '8px'
                                        }}>
                                            <div style={{
                                                background: 'linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%)',
                                                padding: '14px 20px',
                                                borderBottom: '1.5px solid #e2e8f0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{
                                                        background: '#e0f2fe',
                                                        color: '#0284c7',
                                                        padding: '6px',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <HiOutlineClipboardDocumentList size={16} />
                                                    </div>
                                                    <span style={{
                                                        fontSize: '13px',
                                                        fontWeight: '700',
                                                        color: '#1e293b',
                                                        letterSpacing: '0.3px',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        Materiales Solicitados
                                                    </span>
                                                </div>
                                                <span style={{
                                                    background: '#f1f5f9',
                                                    color: '#475569',
                                                    padding: '2px 8px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    {parsedItems.length} {parsedItems.length === 1 ? 'ítem' : 'ítems'}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                {parsedItems.map((item, index) => (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '14px 20px',
                                                            borderBottom: index < parsedItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                            background: index % 2 === 0 ? '#ffffff' : '#fcfdfe',
                                                            gap: '12px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                                            <div style={{
                                                                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                                                                color: '#ffffff',
                                                                minWidth: '26px',
                                                                height: '26px',
                                                                borderRadius: '8px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '11px',
                                                                fontWeight: '800',
                                                                boxShadow: '0 2px 8px rgba(14, 165, 233, 0.15)',
                                                                padding: '0 4px'
                                                            }}>
                                                                {item.cantidad}
                                                            </div>
                                                            <span style={{
                                                                fontSize: '14px',
                                                                fontWeight: '600',
                                                                color: '#334155',
                                                                lineHeight: '1.4'
                                                            }}>
                                                                {item.material}
                                                            </span>
                                                        </div>

                                                        {item.precio && (
                                                            <div style={{
                                                                background: '#ecfdf5',
                                                                color: '#065f46',
                                                                padding: '6px 12px',
                                                                borderRadius: '10px',
                                                                fontSize: '13px',
                                                                fontWeight: '700',
                                                                border: '1.5px solid #d1fae5',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}>
                                                                <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: '600' }}>Costo:</span>
                                                                <span>{item.precio}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })()}

                    {/* BOTÓN DE ACCIÓN PARA TÉCNICO */}
                    {isInteractive && tarea.estado !== 'Completa' && user?.role === 'tecnico' && (
                        <div style={{ marginTop: '10px' }}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
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
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(30,41,59,0.15)'
                                }}
                            >
                                📋 Realizar Reporte del Trabajo
                            </button>
                        </div>
                    )}

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

                {/* Técnico que realizó la actividad */}
                <div style={{ 
                    marginTop: 'auto', 
                    paddingTop: '15px', 
                    borderTop: '1.5px solid #f1f5f9', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            overflow: 'hidden', 
                            background: '#f8fafc', 
                            border: '1.5px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {getAvatarForTech((tarea.tecnicoNombre && tarea.tecnicoNombre !== "Sin Asignar") ? tarea.tecnicoNombre : '') ? (
                                <img 
                                    src={getAvatarForTech((tarea.tecnicoNombre && tarea.tecnicoNombre !== "Sin Asignar") ? tarea.tecnicoNombre : '') || undefined} 
                                    alt="Tech" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                            ) : (
                                <HiOutlineUser size={14} color="#64748b" />
                            )}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                            {(tarea.tecnicoNombre && tarea.tecnicoNombre !== "Sin Asignar") ? tarea.tecnicoNombre : "Técnico (Registro Antiguo)"}
                        </span>
                    </div>

                    {tarea.refacciones && tarea.refacciones.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                            <HiOutlineWrench size={12} />
                            <span>{tarea.refacciones.length} piezas</span>
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

                <div className={styles.scrollableContent}>
                    <div className={styles.contentWrapper}>

                    <div className={styles.headerContainer}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <button 
                                onClick={() => navigate(-1)} 
                                style={{ 
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
                                    padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', 
                                    borderRadius: '8px', color: '#334155', fontWeight: '600' 
                                }}
                                title="Volver atrás"
                            >
                                <HiOutlineArrowLeft size={20} />
                                Regresar
                            </button>
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
                            if (estado === "Finalizado") return 5;
                            if (estado.includes("Cotización")) return 3;
                            
                            if (["En Proceso", "En Espera", "Asignado"].includes(estado)) {
                                if (trabajo.tipo === "Visita") {
                                    if (trabajo.visitado && estado === "En Espera") return 3; // Finished visit, waiting for quote
                                    return 2;
                                }
                                return 4; // Trabajo or SOS
                            }
                            return 1;
                        };
                        const currentStep = getStepIndex(trabajo.estado);
                        return (
                            <div style={{ 
                                padding: '12px 15px', 
                                background: '#fff', 
                                borderRadius: '12px', 
                                marginBottom: '10px', 
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                border: '1px solid #f0f0f0',
                                overflowX: 'auto',
                                WebkitOverflowScrolling: 'touch',
                                gap: '8px',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}>
                                {[
                                    { id: 1, label: "Solicitud", icon: "📋" },
                                    { id: 2, label: "Visita", icon: "📍" },
                                    { id: 3, label: "Cotización", icon: "💲" },
                                    { id: 4, label: "En Proceso", icon: "🛠️" },
                                    { id: 5, label: "Finalizado", icon: "✅" }
                                ].map((step, index, arr) => {
                                    const isActive = currentStep === step.id;
                                    const isCompleted = currentStep > step.id;

                                    return (
                                        <React.Fragment key={step.id}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, width: '80px', flexShrink: 0 }}>
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '50%',
                                                    background: isCompleted ? '#1e293b' : (isActive ? '#f26522' : '#f8fafc'),
                                                    color: isCompleted || isActive ? '#fff' : '#94a3b8',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    transition: 'all 0.5s ease',
                                                    animation: isActive ? 'pulseTracker 2s infinite' : 'none',
                                                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                                    boxShadow: isCompleted ? '0 2px 6px rgba(30, 41, 59, 0.3)' : (isActive ? '0 4px 12px rgba(242, 101, 34, 0.3)' : 'none'),
                                                    border: !isCompleted && !isActive ? '1.5px solid #cbd5e1' : 'none'
                                                }}>
                                                    {isCompleted ? '✓' : step.id}
                                                </div>
                                                <span style={{
                                                    marginTop: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: isCompleted || isActive ? '700' : '500',
                                                    color: isCompleted ? '#1e293b' : (isActive ? '#f26522' : '#94a3b8'),
                                                    textAlign: 'center',
                                                    transition: 'all 0.3s ease'
                                                }}>
                                                    {step.label}
                                                </span>
                                            </div>

                                            {index < arr.length - 1 && (
                                                <div style={{ flex: '1 0 20px', minWidth: '15px', height: '4px', background: '#e2e8f0', borderRadius: '2px', position: 'relative', margin: '0 8px', bottom: '8px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        height: '100%',
                                                        background: '#1e293b',
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
                                // Encargado never sees Registro tab
                                if (user?.role === 'encargado' && tabName === 'Registro') return false;

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
                                    if (user?.role === 'tecnico') {
                                        return false;
                                    }
                                    return user?.role === 'admin' || user?.role === 'autonomo';
                                }
                                if (tabName === 'Registro') {
                                    const cotizacionYaEnviada = ['Cotización Enviada', 'Cotización Rechazada', 'Cotización Aceptada', 'Cotización Aprobada'].includes(trabajo?.estado) || cotizaciones.length > 0 || subTareas.some(t => t.esCotizacion);
                                    if (cotizacionYaEnviada) return false;
                                    return trabajo.tipo === 'Visita';
                                }
                                if (tabName === 'Trabajo') {
                                    return trabajo.tipo === 'Trabajo' || trabajo.tipo === 'SOS';
                                }
                                return true;
                            })
                            .map((tabName) => (
                                <button
                                    key={tabName}
                                    className={`${styles.tabButton} ${activeTab === tabName ? styles.activeTab : styles.inactiveTab}`}
                                    onClick={() => setActiveTab(tabName as any)}
                                    title={tabName}
                                    style={{
                                        position: 'relative',
                                        ...(tabName === 'Cotización' && activeTab !== 'Cotización' && [
                                            'Cotización Enviada',
                                            'Cotización Aceptada',
                                        ].includes(trabajo?.estado) ? {
                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                            color: '#fff',
                                            border: '2px solid #d97706',
                                            boxShadow: '0 4px 14px rgba(245,158,11,0.4)',
                                            fontWeight: '800',
                                        } : {})
                                    }}
                                >
                                    <span className={styles.tabIcon}>
                                        {tabName === 'Datos' ? <HiOutlineBuildingOffice2 size={22} /> :
                                            tabName === 'Trabajo' ? <HiOutlineWrench size={22} /> :
                                                tabName === 'Registro' ? <HiOutlineClipboardDocumentList size={22} /> :
                                                    tabName === 'Historial' ? <HiOutlineClock size={22} /> :
                                                        tabName === 'Cotización' ? <HiOutlineCurrencyDollar size={22} /> : <HiOutlineInformationCircle size={22} />}
                                    </span>
                                    <span className={styles.tabText}>{tabName === 'Datos' ? 'Trabajos' : tabName}</span>

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
                    {activeTab === 'Datos' && (
                        <div className={styles.bentoGrid}>
                            {/* Card 1: Información General (8/12) */}
                            <div className={`${styles.bentoCard} ${styles.colSpan8} ${styles.sucursalCard}`}>
                                <div 
                                    className={styles.cardHeader} 
                                    onClick={() => setIsSucursalModalOpen(true)} 
                                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                    title="Ver detalles de contacto y ubicación"
                                >
                                    <div className={`${styles.iconBox} ${styles.bgBlue}`}>
                                        <HiOutlineBuildingOffice2 size={20} />
                                    </div>
                                    <h3 className={styles.cardTitle} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Sucursal</h3>
                                </div>
                                <div className={styles.bentoContent}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                                        <div>
                                            <span className={styles.bentoLabel}>Nombre</span>
                                            <span className={styles.bentoValue} style={{ fontSize: '20px' }}>{trabajo.sucursal || "No registrado"}</span>
                                            <span className={styles.badge} style={{ marginTop: '5px' }}>{trabajo.tipo || "Trabajo"}</span>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', justifyContent: 'center' }}>
                                            {trabajo.latitud_llegada &&
                                            !['Cotización Enviada', 'Cotización Aceptada', 'En Proceso', 'Finalizado', 'Completado'].includes(trabajo.estado) && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setShowMapModal(true); }}
                                                    style={{ padding: '6px 12px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#d1fae5'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = '#ecfdf5'; }}
                                                >
                                                    📍 Ver Llegada
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {(() => {
                                        if (groupedJobs.length > 0) {
                                            return (
                                                <div 
                                                    className={styles.descriptionBox}
                                                    onClick={() => setShowZoomModal(true)}
                                                    style={{ cursor: 'pointer', transition: 'transform 0.2s', background: '#fffbeb', border: '1px solid #fde68a', marginTop: '16px', padding: '16px', borderRadius: '12px', width: '100%' }}
                                                    title="Ver detalles del problema"
                                                >
                                                    <span className={styles.bentoLabel} style={{ color: '#b45309', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>
                                                        📋 Servicios en esta Solicitud ({groupedJobs.length})
                                                    </span>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {groupedJobs.map((groupJob, idx) => {
                                                            const cleanDesc = groupJob.descripcion?.replace(/\[Grupo:\s*REQ-\d+\]\s*\n?/, "") || "";
                                                            const photos = parseFotoUrls(groupJob.foto_url);
                                                            return (
                                                                <div key={groupJob.id} style={{ padding: '12px', background: '#ffffff', borderRadius: '10px', border: '1px solid #fde68a' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #fef3c7', paddingBottom: '4px' }}>
                                                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#78350f' }}>
                                                                            🛠️ #{idx + 1}: {groupJob.titulo}
                                                                        </span>
                                                                        <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px' }}>
                                                                            ID: {groupJob.id}
                                                                        </span>
                                                                    </div>
                                                                    <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#451a03', fontWeight: '600' }}>
                                                                        "{cleanDesc || "Sin descripción."}"
                                                                    </p>
                                                                    {photos.length > 0 && (
                                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                                                            {photos.map((url, pIdx) => (
                                                                                <img
                                                                                    key={pIdx}
                                                                                    src={url}
                                                                                    alt={`Evidencia ${idx + 1}-${pIdx + 1}`}
                                                                                    style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #fcd34d' }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const problemText = trabajo.descripcion || trabajo.descripcion_problema || (trabajo as any).detalles || (trabajo as any).observaciones || (trabajo as any).problema || "";
                                        if (!problemText && !trabajo.foto_url) return null;

                                        let desc = problemText;
                                        let tecnicoSugerido = null;
                                        const match = desc.match(/^\[Técnico sugerido:\s*([^\]]+)\]\s*/i);
                                        if (match) {
                                            tecnicoSugerido = match[1];
                                            desc = desc.substring(match[0].length).trim();
                                        }

                                        return (
                                            <div 
                                                className={styles.descriptionBox}
                                                onClick={() => setShowZoomModal(true)}
                                                style={{ cursor: 'pointer', transition: 'transform 0.2s', background: '#fffbeb', border: '1px solid #fde68a', marginTop: '16px', padding: '16px', borderRadius: '12px' }}
                                                title="Ver detalles del problema"
                                            >
                                                {problemText && (
                                                    <>
                                                        <span className={styles.bentoLabel} style={{ marginBottom: '6px', color: '#b45309', fontWeight: '800', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                                                            📝 Problema Especificado por Encargado
                                                        </span>
                                                        {tecnicoSugerido && (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>
                                                                <span style={{ fontSize: '14px' }}>👷</span> Técnico sugerido: {tecnicoSugerido}
                                                            </div>
                                                        )}
                                                        <p className={styles.descriptionQuote} style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600', lineHeight: '1.5', margin: 0 }}>
                                                            "{desc}"
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Card 1.5: Equipo en Mantenimiento (12/12) */}
                            {((trabajo as any).mantenimiento_solicitud_visita?.levantamiento_equipo || (trabajo as any).mantenimiento_solicitud_reparacion?.levantamiento_equipo) && (
                                <div className={`${styles.bentoCard} ${styles.equipoCard}`} style={{ gridColumn: 'span 12', border: '1.5px solid #a7f3d0', background: 'linear-gradient(to right, #f8fafc, #ecfdf5)' }}>
                                    <div className={styles.cardHeader} style={{ marginBottom: '10px' }}>
                                        <div className={`${styles.iconBox}`} style={{ background: '#059669', color: 'white' }}>
                                            <HiOutlineClipboardDocument size={20} />
                                        </div>
                                        <h3 className={styles.cardTitle} style={{ color: '#065f46' }}>Equipo a Intervenir</h3>
                                    </div>
                                    <div className={styles.bentoContent} style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {((trabajo as any).mantenimiento_solicitud_visita?.levantamiento_equipo?.foto_url || (trabajo as any).mantenimiento_solicitud_reparacion?.levantamiento_equipo?.foto_url) && (
                                            <img 
                                                src={((trabajo as any).mantenimiento_solicitud_visita?.levantamiento_equipo?.foto_url || (trabajo as any).mantenimiento_solicitud_reparacion?.levantamiento_equipo?.foto_url)} 
                                                alt="Equipo" 
                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                                                onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(((trabajo as any).mantenimiento_solicitud_visita?.levantamiento_equipo?.foto_url || (trabajo as any).mantenimiento_solicitud_reparacion?.levantamiento_equipo?.foto_url)); setShowZoomModal(true); }}
                                            />
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                                                {((trabajo as any).mantenimiento_solicitud_visita?.levantamiento_equipo?.nombre || (trabajo as any).mantenimiento_solicitud_reparacion?.levantamiento_equipo?.nombre)}
                                            </span>
                                            <span style={{ fontSize: '13px', color: '#475569' }}>
                                                <strong>Marca:</strong> {((trabajo as any).mantenimiento_solicitud_visita?.levantamiento_equipo?.marca || (trabajo as any).mantenimiento_solicitud_reparacion?.levantamiento_equipo?.marca || 'N/A')} | 
                                                <strong> Modelo:</strong> {((trabajo as any).mantenimiento_solicitud_visita?.levantamiento_equipo?.modelo || (trabajo as any).mantenimiento_solicitud_reparacion?.levantamiento_equipo?.modelo || 'N/A')}
                                            </span>
                                            {((trabajo as any).mantenimiento_solicitud_visita?.levantamiento_equipo?.serie || (trabajo as any).mantenimiento_solicitud_reparacion?.levantamiento_equipo?.serie) && (
                                                <span style={{ fontSize: '12px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                                                    S/N: {((trabajo as any).mantenimiento_solicitud_visita?.levantamiento_equipo?.serie || (trabajo as any).mantenimiento_solicitud_reparacion?.levantamiento_equipo?.serie)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Card 2: Estado Actual (4/12) */}
                            <div className={`${styles.bentoCard} ${styles.colSpan4} ${styles.estadoCard}`}>
                                <div className={styles.cardHeader}>
                                    <div className={`${styles.iconBox} ${styles.bgOrange}`}>
                                        <HiOutlineClock size={18} />
                                    </div>
                                    <h3 className={styles.cardTitle}>Estado</h3>
                                </div>
                                <div className={styles.bentoContent} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '12px' }}>
                                    <span className={styles.bentoValue} style={{ color: '#d97706', fontSize: '16px', textAlign: 'center' }}>
                                        {trabajo.estado}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                                        Actividad: {trabajo.fecha}
                                    </span>

                                    {/* BOTÓN ACCIÓN — lógica diferente para SOS vs Normal */}
                                    {(['admin', 'autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '')) && trabajo.estado !== 'Finalizado' && trabajo.estado !== 'Asignado' && trabajo.estado !== 'En Proceso' && (
                                        isSOS ? (
                                            // FLUJO SOS:
                                            // - Si está en Solicitud: primero debe crear cotización
                                            // - Si cotización fue aceptada: asignar técnico directo a Trabajo
                                            trabajo.estado === 'Solicitud' || trabajo.estado === 'Cotización Enviada' ? (
                                                <button
                                                    onClick={() => setActiveTab('Cotización')}
                                                    style={{
                                                        marginTop: '8px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        background: 'linear-gradient(135deg, #d14d13 0%, #f26522 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '10px 20px',
                                                        borderRadius: '25px',
                                                        fontSize: '13px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
                                                        whiteSpace: 'nowrap',
                                                        width: '100%',
                                                        justifyContent: 'center'
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                                                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                                                >
                                                    {trabajo.estado === 'Cotización Enviada' ? '📄 Ver Cotización' : '💰 Crear Cotización (SOS)'}
                                                </button>
                                            ) : (trabajo.estado === 'Cotización Aceptada' || trabajo.estado === 'Cotización Aprobada') ? (
                                                (() => {
                                                    const match = (trabajo.descripcion || "").match(/^\[Técnico sugerido:\s*([^\]]+)\]\s*/i);
                                                    const tecnicoSugeridoName = match ? match[1] : null;
                                                    const isPreassigned = tecnicoSugeridoName || (trabajo.tecnico && trabajo.tecnico !== 'Sin asignar' && trabajo.tecnico !== 'Sin Asignar');
                                                    return (
                                                        <button
                                                            onClick={() => {
                                                                if (isPreassigned) {
                                                                    handleAceptarSolicitudPreasignada(tecnicoSugeridoName);
                                                                } else {
                                                                    handleOpenAssignModal();
                                                                }
                                                            }}
                                                            style={{
                                                                marginTop: '8px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '10px 20px',
                                                                borderRadius: '25px',
                                                                fontSize: '13px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
                                                                whiteSpace: 'nowrap',
                                                                width: '100%',
                                                                justifyContent: 'center'
                                                            }}
                                                            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                                                            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                                                        >
                                                            {isPreassigned ? `🚨 Confirmar y Aceptar (${tecnicoSugeridoName || trabajo.tecnico})` : '🚨 Asignar Técnico (Emergencia)'}
                                                        </button>
                                                    );
                                                })()
                                            ) : null
                                        ) : (
                                            (trabajo.estado === 'En Espera' || trabajo.estado === 'Cotización Aceptada' || trabajo.estado === 'Cotización Aprobada') ? (
                                                (() => {
                                                    const isAssigned = (trabajo.tecnico && trabajo.tecnico !== 'Sin asignar' && trabajo.tecnico !== 'Sin Asignar');
                                                    if (isAssigned) {
                                                        return (
                                                            <div style={{ marginTop: '12px', padding: '10px 15px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                <span style={{ fontSize: '16px' }}>👤</span> Técnico: {trabajo.tecnico}
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    const match = (trabajo.descripcion || "").match(/^\[Técnico sugerido:\s*([^\]]+)\]\s*/i);
                                                    const tecnicoSugeridoName = match ? match[1] : null;
                                                    
                                                    return (
                                                        <button
                                                            onClick={() => {
                                                                if (tecnicoSugeridoName) {
                                                                    handleAceptarSolicitudPreasignada(tecnicoSugeridoName);
                                                                } else {
                                                                    handleOpenAssignModal();
                                                                }
                                                            }}
                                                            style={{
                                                                marginTop: '8px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '10px 20px',
                                                                borderRadius: '25px',
                                                                fontSize: '13px',
                                                                fontWeight: '700',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
                                                                whiteSpace: 'nowrap',
                                                                width: '100%',
                                                                justifyContent: 'center'
                                                            }}
                                                            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                                                            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                                                        >
                                                            {match ? `✅ Confirmar Sugerido` : '👤 Asignar Técnico'}
                                                        </button>
                                                    );
                                                })()
                                            ) : null
                                        )
                                    )}

                                    {/* BOTONES PARA TÉCNICO: Aceptar, Rechazar, Empezar */}
                                    {user?.role === 'tecnico' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '12px' }}>
                                            {trabajo.estado === 'Asignado' && (
                                                <>
                                                    <button onClick={handleAceptarAsignacion} style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)', transition: 'all 0.2s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 6px 16px rgba(16,185,129,0.35)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.25)')}>
                                                        <span>✅</span> Aceptar Trabajo
                                                    </button>
                                                    <button onClick={handleRechazarAsignacion} style={{ padding: '12px 20px', background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                                                        <span>❌</span> Rechazar
                                                    </button>
                                                </>
                                            )}
                                            {(trabajo.estado === 'En Espera' || trabajo.estado === 'Cotización Enviada' || trabajo.estado === 'Cotización Aceptada' || trabajo.estado === 'Cotización Aprobada') && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                                    {trabajo.tipo === 'Visita' ? (
                                                        <button onClick={() => handleEmpezarTrabajoTipo('Visita')} style={{ padding: '12px 10px', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,41,59,0.2)', transition: 'all 0.2s ease' }} onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>📍 Iniciar Visita</button>
                                                    ) : (
                                                        <button onClick={() => handleEmpezarTrabajoTipo('Trabajo')} style={{ padding: '12px 10px', background: 'linear-gradient(135deg, #f26522 0%, #d14d13 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(242,101,34,0.25)', transition: 'all 0.2s ease' }} onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>🛠️ Iniciar Trabajo</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* CONTACTS AND LOCATION CARDS WERE MOVED TO MODAL */}
                            {/* Card 5: Acciones adicionales (12/12) — Cotización */}
                            {(user?.role === 'admin' || user?.role === 'autonomo') && (
                                <div className={`${styles.colSpan12}`} style={{ marginTop: '5px' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {/* Para solicitudes NORMALES: mostrar "Crear Cotización" tras la visita */}
                                        {!isSOS && (trabajo.estado === "Solicitud" && trabajo.visitado || trabajo.estado === "En Espera") && (
                                            <button
                                                onClick={() => setActiveTab('Cotización')}
                                                className={styles.actionButton}
                                                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', background: '#f26522', color: '#fff', position: 'relative' }}
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
                                            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #f26522, #d14d13)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(242, 101, 34, 0.2)' }}>
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
                                                                <p className={styles.notesText} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{cotiz.descripcion}</p>
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                            {cotiz.archivo && (
                                                                 <button 
                                                                    onClick={() => setPreviewQuote(cotiz)}
                                                                    className={styles.attachmentLink}
                                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                                                                 >
                                                                     <div className={styles.pdfIconBox}>
                                                                         <HiOutlineDocumentText size={20} color="white" />
                                                                     </div>
                                                                     <span>Descargar Presupuesto Detallado.pdf</span>
                                                                 </button>
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {/* SECCIÓN SUPERIOR: Reporte del Técnico */}
                                        {subTareas.length > 0 && (
                                            <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '2px solid #fef3c7' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '2px solid #fef3c7' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: '20px' }}>🔧</span>
                                                    </div>
                                                    <div>
                                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>Reporte del Técnico</h3>
                                                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Información enviada por el técnico para elaborar la cotización</p>
                                                    </div>
                                                    <span style={{ marginLeft: 'auto', background: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', border: '1px solid #fde68a' }}>
                                                        {subTareas.length} actividad{subTareas.length !== 1 ? 'es' : ''}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {subTareas.map(tarea => renderTaskCard(tarea, false))}
                                                </div>
                                            </div>
                                        )}
                                        <div className={styles.infoGrid2} style={{ gap: '30px' }}>
                                        {/* IZQUIERDA: lista de cotizaciones y formulario */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                                                            const displayEstado = (trabajo?.estado === 'Cotización Aceptada') ? 'Aprobada' : (cotiz.estado || 'Pendiente');
                                                            const displayEstadoText = (trabajo?.estado === 'Cotización Aceptada') ? 'Aceptada' : (cotiz.estado || 'Pendiente');
                                                            return (
                                                                <div key={cotiz.id} style={{ background: '#fafafa', border: '1.5px solid #f1f5f9', borderRadius: '18px', padding: '18px' }}>
                                                                    {isEditing ? (
                                                                        /* FORMULARIO INLINE DE EDICIÓN */
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Editando Opción {idx + 1}</p>
                                                                            <div style={{ position: 'relative' }}>
                                                                                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: '900', color: '#f26522', fontSize: '16px' }}>$</span>
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
                                                                                <button onClick={handleUpdateCotizacion} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #f26522, #d14d13)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }}>💾 Guardar cambios</button>
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
                                                                                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', background: estadoBadge[displayEstado], color: estadoText[displayEstado] }}>
                                                                                    {displayEstadoText}
                                                                                </span>
                                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                                    <button onClick={() => { setCosto(cotiz.monto?.toString() || ''); setNotas(cotiz.descripcion || ''); setShowPDFPreview(true); }} style={{ padding: '7px 12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><HiOutlineDocumentText size={16} /> Preview PDF</button>
                                                                                    {trabajo?.estado !== 'Cotización Aceptada' && trabajo?.estado !== 'Asignado' && <button onClick={() => handleEditarCotizacion(cotiz)} style={{ padding: '7px 12px', borderRadius: '10px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#475569' }}>✏️ Editar</button>}
                                                                                    {trabajo?.estado !== 'Cotización Aceptada' && trabajo?.estado !== 'Asignado' && <button onClick={() => handleEliminarCotizacion(cotiz.id!)} style={{ padding: '7px 12px', borderRadius: '10px', background: '#fef2f2', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>🗑️</button>}
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

                                            {/* BOTÓN DE ASIGNACIÓN CUANDO SE ACEPTA LA COTIZACIÓN */}
                                            {(trabajo?.estado === 'Cotización Aceptada' || trabajo?.estado === 'Cotización Aprobada') && (
                                                <button onClick={handleOpenAssignModal}
                                                    style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                                                    <span style={{ fontSize: '18px' }}>✅</span> Asignar Trabajo al Técnico
                                                </button>
                                            )}

                                            {/* BOTÓN PARA DESPLEGAR NUEVA COTIZACIÓN */}
                                            {trabajo?.estado !== 'Cotización Enviada' && trabajo?.estado !== 'Cotización Aceptada' && trabajo?.estado !== 'Cotización Rechazada' && trabajo?.estado !== 'Asignado' && (
                                                !showAddQuoteForm ? (
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
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #f26522, #d14d13)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <HiOutlineCurrencyDollar size={20} color="white" />
                                                        </div>
                                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
                                                            {cotizaciones.length === 0 ? 'Nueva Cotización' : `Configurando Opción ${cotizaciones.length + 1}`}
                                                        </h3>
                                                    </div>

                                                    <div style={{ marginBottom: '16px' }}>
                                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Mano de Obra ($)</label>
                                                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                                                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: '900', color: '#f26522' }}>$</span>
                                                            <input type="number" placeholder="Mano de obra..." value={adminManoObra} onChange={e => setAdminManoObra(e.target.value)}
                                                                style={{ width: '100%', padding: '13px 16px 13px 36px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '17px', fontWeight: '700', color: '#1e293b', boxSizing: 'border-box' }} />
                                                        </div>

                                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Materiales y Piezas</label>
                                                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '14px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
                                                            {adminQuoteMaterials.map((mat, i) => (
                                                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', paddingBottom: '15px', borderBottom: i < adminQuoteMaterials.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                                                    <input
                                                                        placeholder="Material / Refacción"
                                                                        value={mat.material}
                                                                        onChange={(e) => {
                                                                            const newM = [...adminQuoteMaterials];
                                                                            newM[i].material = e.target.value;
                                                                            setAdminQuoteMaterials(newM);
                                                                        }}
                                                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                                    />
                                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                                        <input
                                                                            type="number"
                                                                            placeholder="Piezas"
                                                                            value={mat.piezas}
                                                                            onChange={(e) => {
                                                                                const newM = [...adminQuoteMaterials];
                                                                                newM[i].piezas = e.target.value;
                                                                                setAdminQuoteMaterials(newM);
                                                                            }}
                                                                            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                                        />
                                                                        <input
                                                                            type="number"
                                                                            placeholder="Precio ($)"
                                                                            value={mat.precio}
                                                                            onChange={(e) => {
                                                                                const newM = [...adminQuoteMaterials];
                                                                                newM[i].precio = e.target.value;
                                                                                setAdminQuoteMaterials(newM);
                                                                            }}
                                                                            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                                        />
                                                                        <button
                                                                            onClick={() => setAdminQuoteMaterials(adminQuoteMaterials.filter((_, idx) => idx !== i))}
                                                                            style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => setAdminQuoteMaterials([...adminQuoteMaterials, { material: '', piezas: '', precio: '' }])}
                                                                style={{ background: 'transparent', color: '#f26522', border: '1px dashed #f26522', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', width: '100%' }}
                                                            >
                                                                + Añadir material o refacción
                                                            </button>
                                                        </div>

                                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Monto Total ($)</label>
                                                        <div style={{ position: 'relative' }}>
                                                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', fontWeight: '900', color: '#f26522' }}>$</span>
                                                            <input type="number" value={costo} readOnly
                                                                style={{ width: '100%', padding: '13px 16px 13px 36px', borderRadius: '14px', border: '2px solid #cbd5e1', background: '#f1f5f9', fontSize: '17px', fontWeight: '700', color: '#1e293b', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                                                        </div>
                                                    </div>

                                                    <div style={{ marginBottom: '16px' }}>
                                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Notas para el técnico</label>
                                                        <textarea placeholder="Ej: Incluye mano de obra y materiales..." value={notas} onChange={e => setNotas(e.target.value)}
                                                            style={{ width: '100%', padding: '13px 16px', borderRadius: '14px', border: '2px solid #e2e8f0', fontSize: '14px', color: '#475569', minHeight: '90px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: '1.6', marginBottom: '16px' }} />
                                                        
                                                        <button 
                                                            onClick={() => setShowPDFPreview(true)}
                                                            style={{ width: '100%', padding: '12px', background: '#f8fafc', border: '2px solid #e2e8f0', color: '#1e293b', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                                                        >
                                                            <HiOutlineDocumentText size={18} color="#ef4444" /> Generar Preview PDF
                                                        </button>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {trabajo?.estado !== 'Cotización Aceptada' && (
                                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                                <button onClick={() => handleEnviarCotizacion('send')}
                                                                    style={{ flex: 2, padding: '15.5px', background: 'linear-gradient(135deg, #f26522, #d14d13)', color: '#fff', border: 'none', borderRadius: '15px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(242,101,34,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                    <span>Enviar Propuesta al Técnico</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                        
                                                        {(trabajo?.estado === 'Cotización Aceptada' || trabajo?.estado === 'Cotización Aprobada') && (
                                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                                <button onClick={() => handleEnviarCotizacion('accept_and_assign')}
                                                                    style={{ flex: 2, padding: '15.5px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '15px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                    <span>Aceptar Cotización y Asignar Trabajo</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                        
                                                        <button onClick={() => setShowAddQuoteForm(false)}
                                                            style={{ width: '100%', padding: '15px', background: '#f8fafc', border: '2px solid #e2e8f0', color: '#64748b', borderRadius: '15px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* DERECHA: actividades del técnico */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {subTareas.some(t => t.esCotizacion) && (
                                                <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #f8fafc' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f26522' }} />
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
                                                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            {getAvatarForTech(tarea.tecnicoNombre || '') ? (
                                                                                <img src={getAvatarForTech(tarea.tecnicoNombre || '') || undefined} alt="Tech" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                            ) : (
                                                                                <HiOutlineUser size={16} color="#64748b" />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{tarea.tecnicoNombre || 'Técnico'}</p>
                                                                            <span style={{ display: 'inline-block', fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', marginTop: '2px' }}>{tarea.titulo}</span>
                                                                        </div>
                                                                    </div>
                                                                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: tarea.cotizacionMonto === 'Por Evaluar' ? '#94a3b8' : '#f26522' }}>
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

                                            {/* CHAT DE NEGOCIACIÓN EMBEBIDO EN LA CARD */}
                                            {trabajo && user?.role !== 'cliente' && (
                                                <div style={{ marginTop: '0', paddingTop: '0' }}>
                                                    <NegotiationChatWidget 
                                                        trabajoId={trabajo.id} 
                                                        currentUser={user} 
                                                        inlineMode={true}
                                                    />
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                    </div>
                                )}
                            </div>
                        )
                    }

            {/* VISTA CHAT DE NEGOCIACIÓN */}
            {activeTab === 'Cotización' && (cotizaciones.some(c => c.estado === 'Rechazada') || trabajo.estado === 'Cotización Enviada' || trabajo.estado === 'Cotización Rechazada' || trabajo.estado === 'Cotización Aceptada') && (
                <div style={{ marginTop: '24px', animation: 'fadeIn 0.5s ease-out' }}>
                    <ChatTrabajo trabajoId={trabajo.id} adminAutonomoId={trabajo.clienteUserId} />
                </div>
            )}

                    {
                        activeTab === 'Trabajo' && (
                            <div>
                                {/* Para SOS: misma experiencia que Trabajo normal pero con tarea sintética del problema reportado */}
                                {trabajo.tipo !== 'Visita' && isSOS && (
                                    <div>
                                        {/* Si no hay subtareas: mostrar el problema como tarea clickeable (igual que flujo normal de Trabajo) */}
                                        {subTareas.length === 0 && trabajo.estado !== 'Finalizado' && (() => {
                                            // Crear SubTarea sintética a partir del problema reportado
                                            const tareaVirtual: SubTarea = {
                                                id: trabajo.id * -1, // ID negativo para distinguirla
                                                titulo: trabajo.titulo || 'Emergencia SOS',
                                                descripcion: trabajo.descripcion || 'Sin descripción',
                                                estado: 'Nueva',
                                                esCotizacion: false
                                            };
                                            return renderTaskCard(tareaVirtual, true);
                                        })()}

                                        {/* Actividades ya registradas */}
                                        {subTareas.length > 0 && (
                                            <div className={styles.taskList}>
                                                {subTareas.map(tarea => renderTaskCard(tarea, true))}
                                            </div>
                                        )}

                                        {/* Botón finalizar cuando ya hay reporte */}
                                        {(user?.role === 'tecnico' || user?.role === 'admin') && subTareas.length > 0 && trabajo.estado !== 'Finalizado' && (
                                            <div style={{ marginTop: '30px', textAlign: 'center' }}>
                                                <button
                                                    onClick={handleFinishVisit}
                                                    style={{ background: '#333', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%', maxWidth: '400px' }}
                                                >
                                                    ✅ Confirmar y Finalizar Trabajo
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Para trabajo normal (no SOS, no Visita): solo muestra la lista existente */}
                                {trabajo.tipo !== 'Visita' && !isSOS && (
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
                                {(user?.role === 'tecnico' || user?.role === 'admin') && trabajo.tipo === 'Visita' && !trabajo.visitado && trabajo.estado === 'En Proceso' && (
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

                                {user?.role === 'tecnico' && subTareas.length > 0 && (
                                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                                        {trabajo?.estado === 'Cotización Enviada' || trabajo?.visitado ? (
                                            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '16px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', fontWeight: '800', fontSize: '14px', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)' }}>
                                                <span style={{ fontSize: '20px' }}>✓</span> Información Enviada al Encargado de Sucursal
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowSendConfirmModal(true)}
                                                style={{
                                                    width: '100%',
                                                    maxWidth: '400px',
                                                    padding: '16px 28px',
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '16px',
                                                    fontSize: '15px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '10px',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                            >
                                                🚀 Enviar al Encargado de Sucursal
                                            </button>
                                        )}
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
                                    {(() => {
                                        const tasksToShow = [...subTareas.filter(t => trabajo.estado === 'Finalizado' || t.estado === 'Completa' || ((user?.role === 'admin' || user?.role === 'tecnico') && !!localStorage.getItem(`report_data_temporal_${t.id}`)))];
                                        
                                        // Para SOS Finalizado sin subtareas, agregar la tarea virtual al historial
                                        if (isSOS && trabajo.estado === 'Finalizado' && subTareas.length === 0) {
                                            tasksToShow.push({
                                                id: trabajo.id * -1,
                                                titulo: trabajo.titulo || 'Emergencia SOS',
                                                descripcion: trabajo.descripcion || 'Servicio de emergencia finalizado',
                                                estado: 'Completa',
                                                esCotizacion: false
                                            });
                                        }

                                        if (tasksToShow.length > 0) {
                                            const grouped = tasksToShow.reduce((acc, tarea) => {
                                                const reportDataRaw = localStorage.getItem(`report_data_${tarea.id}`);
                                                const reportData = reportDataRaw ? JSON.parse(reportDataRaw) : null;
                                                // Intentar obtener fecha del reporte (ej. "12/06/2026"), o de fecha_programada, o created_at
                                                let dateObj = new Date();
                                                if (reportData?.fecha) {
                                                    const parts = reportData.fecha.split('/');
                                                    if (parts.length === 3) dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
                                                } else if (trabajo.fecha_programada) {
                                                    dateObj = new Date(`${trabajo.fecha_programada}T00:00:00`);
                                                } else if (trabajo.created_at) {
                                                    dateObj = new Date(trabajo.created_at);
                                                }
                                                const isInvalid = isNaN(dateObj.getTime());
                                                const finalDate = isInvalid ? new Date() : dateObj;
                                                const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
                                                const monthYear = capitalize(finalDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' }));
                                                
                                                if (!acc[monthYear]) acc[monthYear] = [];
                                                acc[monthYear].push(tarea);
                                                return acc;
                                            }, {} as Record<string, typeof tasksToShow>);

                                            return Object.entries(grouped).map(([monthYear, tareasGroup]) => {
                                                const isExpanded = expandedHistoryMonths[monthYear] !== false; // Default true
                                                return (
                                                    <div key={monthYear} style={{ marginBottom: '10px' }}>
                                                        <div onClick={() => setExpandedHistoryMonths(prev => ({ ...prev, [monthYear]: !isExpanded }))} style={{ cursor: 'pointer', background: '#f8fafc', padding: '15px 20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '18px', color: '#1e293b', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px', border: '1px solid #e2e8f0', transition: 'all 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <span style={{ fontSize: '24px' }}>{isExpanded ? '📂' : '📁'}</span>
                                                                <span style={{ textTransform: 'capitalize' }}>{monthYear}</span>
                                                                <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '13px', padding: '2px 10px', borderRadius: '20px' }}>{tareasGroup.length} reporte{tareasGroup.length !== 1 ? 's' : ''}</span>
                                                            </div>
                                                            <span style={{ color: '#94a3b8', fontSize: '14px', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                                                        </div>
                                                        {isExpanded && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingLeft: '15px', borderLeft: '2px solid #e2e8f0', marginLeft: '10px' }}>
                                                                {tareasGroup.map(tarea => {
                                                                    const isPreReport = tarea.estado !== 'Completa' && !!localStorage.getItem(`report_data_temporal_${tarea.id}`);
                                                                    return (
                                                                        <div
                                                                            key={tarea.id}
                                                                            className={historialStyles.card}
                                                                            onClick={() => setSelectedHistoryTask(tarea)}
                                                                            style={{ cursor: 'pointer', marginBottom: '0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
                                                                        >
                                                                            <div className={`${historialStyles.cardIndicator} ${historialStyles.borderSuccess}`} style={{ background: isPreReport ? '#ff9800' : undefined }}></div>
                                                                            <div className={historialStyles.cardContent}>
                                                                                <div className={historialStyles.cardIcon} style={{ background: isPreReport ? '#fff3e0' : undefined }}>
                                                                                    <span className={historialStyles.iconHistory} style={{ color: isPreReport ? '#e65100' : undefined }}>📋</span>
                                                                                </div>
                                                                                <div className={historialStyles.cardInfo}>
                                                                                    <div className={historialStyles.cardHeader}>
                                                                                        <div>
                                                                                            <h3 className={historialStyles.concepto} style={{ marginTop: '0' }}>{tarea.titulo}</h3>
                                                                                        </div>
                                                                                        <div className={`${historialStyles.statusBadge} ${historialStyles.badgeSuccess}`} style={{ background: isPreReport ? '#fff3e0' : undefined, color: isPreReport ? '#e65100' : undefined }}>
                                                                                            <span className={historialStyles.statusIcon}>{isPreReport ? '⚠️' : '✓'}</span> {isPreReport ? 'Pre-Reporte' : 'Completado'}
                                                                                        </div>
                                                                                    </div>
                                                                                    {(() => {
                                                                                        let descText = tarea.descripcion || '';
                                                                                        let notasText = "";
                                                                                        const parts = descText.split(/Notas de cotizaci[oó]n:\s*-?/i);
                                                                                        if (parts.length > 1) {
                                                                                            descText = parts[0].trim();
                                                                                            notasText = parts.slice(1).join('Notas de cotización:').trim();
                                                                                        }
                                                                                        
                                                                                        return (
                                                                                            <div style={{ padding: '0 15px 15px' }}>
                                                                                                {descText && <p className={historialStyles.descripcion} style={{ margin: 0, color: '#475569' }}>{descText}</p>}
                                                                                                {notasText && (
                                                                                                    <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '13px', color: '#475569', border: '1px solid #e2e8f0' }}>
                                                                                                        <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b', fontSize: '12px', textTransform: 'uppercase' }}>📝 Notas de cotización</strong>
                                                                                                        <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                                            {notasText.split(/(?=\s-\s)|(?=^-)/).map(s => s.replace(/^-/, '').trim()).filter(s => s.length > 0).map((nota, i) => (
                                                                                                                <li key={i}>{nota}</li>
                                                                                                            ))}
                                                                                                        </ul>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        }
                                        return <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No hay trabajos en el historial.</p>
                                    })()}
                                </div>
                            </div>
                        )}
                </div>
            </div>
            {/* MODAL ASIGNAR TÉCNICO */}
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

                            {/* BANNER SOS o selector de tipo según corresponda */}
                            {isSOS ? (
                                <div style={{
                                    background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                                    border: '2px solid #fca5a5',
                                    borderRadius: '14px',
                                    padding: '14px 18px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <span style={{ fontSize: '28px' }}>🚨</span>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: '800', color: '#dc2626', fontSize: '15px' }}>Emergencia SOS</p>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#991b1b' }}>Se asignará directamente como <strong>Trabajo</strong> sin pasar por visita.</p>
                                    </div>
                                </div>
                            ) : (
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
                            )}

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

                            <div style={{ marginTop: '20px', background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    {/* FECHA */}
                                    <div style={{ flex: '1 1 200px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>📅 Fecha Asignada</label>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setAsignarFecha(new Date().toISOString().split('T')[0])}
                                                    style={{
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        padding: '2px 7px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        background: asignarFecha === new Date().toISOString().split('T')[0] ? '#f26522' : '#fff',
                                                        color: asignarFecha === new Date().toISOString().split('T')[0] ? '#fff' : '#475569',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Hoy
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const tom = new Date();
                                                        tom.setDate(tom.getDate() + 1);
                                                        setAsignarFecha(tom.toISOString().split('T')[0]);
                                                    }}
                                                    style={{
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        padding: '2px 7px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        background: '#fff',
                                                        color: '#475569',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Mañana
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="date"
                                            min={new Date().toISOString().split('T')[0]}
                                            value={asignarFecha}
                                            onChange={(e) => setAsignarFecha(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#0f172a',
                                                background: '#fff',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    {/* HORA */}
                                    <div style={{ flex: '1 1 200px' }}>
                                        <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
                                            🕒 Hora Estimada
                                        </label>
                                        <select
                                            value={asignarHora}
                                            onChange={(e) => setAsignarHora(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: '1.5px solid #cbd5e1',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#0f172a',
                                                background: '#fff',
                                                outline: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">-- Seleccionar Hora --</option>
                                            {[
                                                { val: '07:00', lbl: '07:00 AM' },
                                                { val: '07:30', lbl: '07:30 AM' },
                                                { val: '08:00', lbl: '08:00 AM' },
                                                { val: '08:30', lbl: '08:30 AM' },
                                                { val: '09:00', lbl: '09:00 AM (Mañana)' },
                                                { val: '09:30', lbl: '09:30 AM' },
                                                { val: '10:00', lbl: '10:00 AM' },
                                                { val: '10:30', lbl: '10:30 AM' },
                                                { val: '11:00', lbl: '11:00 AM' },
                                                { val: '11:30', lbl: '11:30 AM' },
                                                { val: '12:00', lbl: '12:00 PM (Mediodía)' },
                                                { val: '12:30', lbl: '12:30 PM' },
                                                { val: '13:00', lbl: '01:00 PM' },
                                                { val: '13:30', lbl: '01:30 PM' },
                                                { val: '14:00', lbl: '02:00 PM' },
                                                { val: '14:30', lbl: '02:30 PM' },
                                                { val: '15:00', lbl: '03:00 PM (Tarde)' },
                                                { val: '15:30', lbl: '03:30 PM' },
                                                { val: '16:00', lbl: '04:00 PM' },
                                                { val: '16:30', lbl: '04:30 PM' },
                                                { val: '17:00', lbl: '05:00 PM' },
                                                { val: '17:30', lbl: '05:30 PM' },
                                                { val: '18:00', lbl: '06:00 PM' },
                                                { val: '18:30', lbl: '06:30 PM' },
                                                { val: '19:00', lbl: '07:00 PM' },
                                                { val: '19:30', lbl: '07:30 PM' },
                                                { val: '20:00', lbl: '08:00 PM' }
                                            ].map(slot => (
                                                <option key={slot.val} value={slot.val}>{slot.lbl}</option>
                                            ))}
                                        </select>
                                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                            {['09:00', '11:00', '13:00', '15:00', '17:00'].map(hVal => {
                                                const labels: Record<string, string> = {
                                                    '09:00': '9 AM',
                                                    '11:00': '11 AM',
                                                    '13:00': '1 PM',
                                                    '15:00': '3 PM',
                                                    '17:00': '5 PM'
                                                };
                                                const isSel = asignarHora === hVal;
                                                return (
                                                    <button
                                                        key={hVal}
                                                        type="button"
                                                        onClick={() => setAsignarHora(hVal)}
                                                        style={{
                                                            fontSize: '11px',
                                                            fontWeight: '700',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            border: isSel ? '1px solid #f26522' : '1px solid #cbd5e1',
                                                            background: isSel ? '#fff3ed' : '#fff',
                                                            color: isSel ? '#f26522' : '#64748b',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {labels[hVal]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <button onClick={handleConfirmAssignment} className={styles.applyBtn} disabled={selectedTechnicians.length === 0} style={{ background: selectedTechnicians.length === 0 ? '#ccc' : '#f26522', color: selectedTechnicians.length === 0 ? '#666' : '#fff', width: 'auto', padding: '12px 40px', border: 'none', borderRadius: '30px', cursor: selectedTechnicians.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: selectedTechnicians.length === 0 ? 'none' : '0 4px 10px rgba(251, 188, 4, 0.3)' }}>Confirmar</button>
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
                                            { id: 'Otro', icon: <HiOutlineDocumentText size={20} />, label: 'Otro (Especificar)' },
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
                                    {activeServiceType === 'Otro' && (
                                        <div style={{ marginTop: '15px' }}>
                                            <input
                                                type="text"
                                                placeholder="Especificar tipo de actividad..."
                                                value={customServiceType}
                                                onChange={(e) => setCustomServiceType(e.target.value)}
                                                style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #ccc', fontSize: '14px' }}
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </div>

                                {(activeServiceType === 'Mantenimiento' || activeServiceType === 'Instalacion' || activeServiceType === 'Otro') && (
                                    <div className={styles.serviceFieldGrid}>
                                        <div className={styles.serviceInputGroup}>
                                            <label className={styles.serviceLabel}>Marca / Nombre del Equipo</label>
                                            <input
                                                className={styles.serviceInput}
                                                value={serviceMarca}
                                                onChange={(e) => setServiceMarca(e.target.value)}
                                                placeholder="Ej. Daikin, York..."
                                                disabled={!!serviceEquipoId && !!serviceMarca && serviceMarca !== "S/N"}
                                                style={{ background: (!!serviceEquipoId && !!serviceMarca && serviceMarca !== "S/N") ? '#f1f5f9' : 'white', cursor: (!!serviceEquipoId && !!serviceMarca && serviceMarca !== "S/N") ? 'not-allowed' : 'text' }}
                                            />
                                        </div>
                                        <div className={styles.serviceInputGroup}>
                                            <label className={styles.serviceLabel}>Modelo</label>
                                            <input
                                                className={styles.serviceInput}
                                                value={serviceModelo}
                                                onChange={(e) => setServiceModelo(e.target.value)}
                                                placeholder="Ej. R-410A..."
                                                disabled={!!serviceEquipoId && !!serviceModelo && serviceModelo !== "S/N"}
                                                style={{ background: (!!serviceEquipoId && !!serviceModelo && serviceModelo !== "S/N") ? '#f1f5f9' : 'white', cursor: (!!serviceEquipoId && !!serviceModelo && serviceModelo !== "S/N") ? 'not-allowed' : 'text' }}
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



                                 {/* DETALLES DE LA ACTIVIDAD Y EVIDENCIAS (HASTA 3 BLOQUES) */}
                                 <div style={{ marginBottom: '25px' }}>
                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                         <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                                             Detalles de la Visita y Evidencias ({taskItems.length}/3)
                                         </label>
                                         {taskItems.length < 3 && (
                                             <button
                                                 type="button"
                                                 onClick={() => setTaskItems([...taskItems, { id: String(Date.now()), descripcion: '', foto: '' }])}
                                                 style={{
                                                     background: '#fff3ed',
                                                     color: '#f26522',
                                                     border: '1px solid #ffcca8',
                                                     padding: '5px 12px',
                                                     borderRadius: '8px',
                                                     fontSize: '12px',
                                                     fontWeight: '800',
                                                     cursor: 'pointer',
                                                     display: 'flex',
                                                     alignItems: 'center',
                                                     gap: '4px'
                                                 }}
                                             >
                                                 + Añadir otra evidencia ({taskItems.length}/3)
                                             </button>
                                         )}
                                     </div>

                                     <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                         {taskItems.map((item, index) => (
                                             <div
                                                 key={item.id || index}
                                                 style={{
                                                     background: '#f8fafc',
                                                     border: '1.5px solid #e2e8f0',
                                                     borderRadius: '14px',
                                                     padding: '16px',
                                                     position: 'relative'
                                                 }}
                                             >
                                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                     <span style={{ fontSize: '12px', fontWeight: '800', color: '#f26522', textTransform: 'uppercase' }}>
                                                         Punto de Revisión / Evidencia {index + 1}
                                                     </span>
                                                     {taskItems.length > 1 && (
                                                         <button
                                                             type="button"
                                                             onClick={() => setTaskItems(taskItems.filter((_, i) => i !== index))}
                                                             style={{
                                                                 background: '#fef2f2',
                                                                 color: '#ef4444',
                                                                 border: '1px solid #fecaca',
                                                                 borderRadius: '6px',
                                                                 padding: '3px 8px',
                                                                 fontSize: '11px',
                                                                 fontWeight: '700',
                                                                 cursor: 'pointer'
                                                             }}
                                                         >
                                                             🗑️ Eliminar
                                                         </button>
                                                     )}
                                                 </div>

                                                 <textarea
                                                     placeholder={`Describe el detalle o trabajo realizado (Punto ${index + 1})...`}
                                                     value={item.descripcion}
                                                     onChange={(e) => {
                                                         const val = e.target.value;
                                                         setTaskItems(prev => prev.map((it, i) => i === index ? { ...it, descripcion: val } : it));
                                                     }}
                                                     style={{
                                                         width: '100%',
                                                         height: '75px',
                                                         padding: '10px 12px',
                                                         borderRadius: '10px',
                                                         border: '1px solid #cbd5e1',
                                                         fontSize: '14px',
                                                         color: '#0f172a',
                                                         resize: 'none',
                                                         marginBottom: '12px',
                                                         outline: 'none',
                                                         boxSizing: 'border-box'
                                                     }}
                                                 />

                                                 {/* FOTO PARA ESTE PUNTO */}
                                                 <div>
                                                     <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                                                         Foto de evidencia (Punto {index + 1})
                                                     </label>
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                         {item.foto ? (
                                                             <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                                                                 <img
                                                                     src={item.foto}
                                                                     alt={`Foto Tarea ${index + 1}`}
                                                                     style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}
                                                                 />
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => setTaskItems(prev => prev.map((it, i) => i === index ? { ...it, foto: '' } : it))}
                                                                     style={{
                                                                         position: 'absolute',
                                                                         top: '-6px',
                                                                         right: '-6px',
                                                                         background: '#ef4444',
                                                                         color: 'white',
                                                                         border: 'none',
                                                                         borderRadius: '50%',
                                                                         width: '20px',
                                                                         height: '20px',
                                                                         display: 'flex',
                                                                         alignItems: 'center',
                                                                         justifyContent: 'center',
                                                                         fontSize: '11px',
                                                                         fontWeight: 'bold',
                                                                         cursor: 'pointer'
                                                                     }}
                                                                     title="Eliminar foto"
                                                                 >
                                                                     ✕
                                                                 </button>
                                                             </div>
                                                         ) : (
                                                             <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                 {/* OPCIÓN 1: ABRIR CÁMARA */}
                                                                 <input
                                                                     type="file"
                                                                     accept="image/*"
                                                                     capture="environment"
                                                                     id={`autonomo-camera-uploader-${index}`}
                                                                     style={{ display: 'none' }}
                                                                     onChange={(e) => {
                                                                         if (e.target.files && e.target.files[0]) {
                                                                             compressImage(e.target.files[0], (base64) => {
                                                                                 setTaskItems(prev => prev.map((it, i) => i === index ? { ...it, foto: base64 } : it));
                                                                             });
                                                                         }
                                                                     }}
                                                                 />
                                                                 <label
                                                                     htmlFor={`autonomo-camera-uploader-${index}`}
                                                                     style={{
                                                                         padding: '8px 12px',
                                                                         borderRadius: '8px',
                                                                         border: '1.5px solid #f26522',
                                                                         background: '#fff3ed',
                                                                         color: '#f26522',
                                                                         fontSize: '12px',
                                                                         fontWeight: '700',
                                                                         cursor: 'pointer',
                                                                         display: 'inline-flex',
                                                                         alignItems: 'center',
                                                                         gap: '5px'
                                                                     }}
                                                                 >
                                                                     📸 Abrir Cámara
                                                                 </label>

                                                                 {/* OPCIÓN 2: ELEGIR DE GALERÍA */}
                                                                 <input
                                                                     type="file"
                                                                     accept="image/*"
                                                                     id={`autonomo-gallery-uploader-${index}`}
                                                                     style={{ display: 'none' }}
                                                                     onChange={(e) => {
                                                                         if (e.target.files && e.target.files[0]) {
                                                                             compressImage(e.target.files[0], (base64) => {
                                                                                 setTaskItems(prev => prev.map((it, i) => i === index ? { ...it, foto: base64 } : it));
                                                                             });
                                                                         }
                                                                     }}
                                                                 />
                                                                 <label
                                                                     htmlFor={`autonomo-gallery-uploader-${index}`}
                                                                     style={{
                                                                         padding: '8px 12px',
                                                                         borderRadius: '8px',
                                                                         border: '1.5px solid #cbd5e1',
                                                                         background: '#fff',
                                                                         color: '#475569',
                                                                         fontSize: '12px',
                                                                         fontWeight: '700',
                                                                         cursor: 'pointer',
                                                                         display: 'inline-flex',
                                                                         alignItems: 'center',
                                                                         gap: '5px'
                                                                     }}
                                                                 >
                                                                     🖼️ Galería
                                                                 </label>
                                                             </div>
                                                         )}
                                                     </div>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </div>

                                { (
                                    <div style={{ marginTop: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={isQuoteIncluded}
                                                onChange={(e) => setIsQuoteIncluded(e.target.checked)}
                                                style={{ width: '18px', height: '18px', accentColor: '#f26522' }}
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
                                                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '5px' }}>Materiales y Piezas Necesarias</label>
                                                    {newQuoteMaterials.map((mat, i) => (
                                                        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                                            <input
                                                                placeholder="Material / Refacción"
                                                                value={mat.material}
                                                                onChange={(e) => {
                                                                    const newM = [...newQuoteMaterials];
                                                                    newM[i].material = e.target.value;
                                                                    setNewQuoteMaterials(newM);
                                                                }}
                                                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Piezas (ej. 2, 1 metro)"
                                                                value={mat.piezas}
                                                                onChange={(e) => {
                                                                    const newM = [...newQuoteMaterials];
                                                                    newM[i].piezas = e.target.value;
                                                                    setNewQuoteMaterials(newM);
                                                                }}
                                                                style={{ width: '150px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                            />
                                                            <input
                                                                type="number"
                                                                placeholder="Precio ($)"
                                                                value={mat.precio || ""}
                                                                onChange={(e) => {
                                                                    const newM = [...newQuoteMaterials];
                                                                    newM[i].precio = e.target.value;
                                                                    setNewQuoteMaterials(newM);
                                                                }}
                                                                style={{ width: '110px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                            />
                                                            <button
                                                                onClick={() => setNewQuoteMaterials(newQuoteMaterials.filter((_, idx) => idx !== i))}
                                                                style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                                            >
                                                                X
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => setNewQuoteMaterials([...newQuoteMaterials, { material: '', piezas: '', precio: '' }])}
                                                        style={{ background: 'transparent', color: '#f26522', border: '1px dashed #f26522', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', width: '100%', marginBottom: '15px' }}
                                                    >
                                                        + Añadir material o refacción
                                                    </button>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '5px' }}>Detalles o notas adicionales</label>
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

                            <div className={styles.modalActionsContainer}>
                                {!editingTaskId && (
                                    <button
                                        onClick={handleGeneratePreview}
                                        className={styles.btnSavePdf}
                                    >
                                        Previsualizar PDF
                                    </button>
                                )}
                                <button
                                    onClick={() => handleAddTask(false)}
                                    className={styles.btnSaveSend}
                                >
                                    {editingTaskId ? "Actualizar" : "Guardar"}
                                </button>
                                <button
                                    onClick={() => { 
                                        setIsAddModalOpen(false); 
                                        setEditingTaskId(null); 
                                        setNewTaskDescription(""); 
                                        setCustomServiceType("");
                                        setIsQuoteIncluded(false); 
                                        setNewQuoteAmount(""); 
                                        setNewQuoteMaterials([]);
                                        setNewQuoteDetails(""); 
                                        setNewQuoteFileName(""); 
                                        setServiceMarca("");
                                        setServiceModelo("");
                                        setServicePieza("");
                                        setServiceGarantia("");
                                        setRefacciones([]);
                                    }}
                                    className={styles.btnCancel}
                                >
                                    Cancelar
                                </button>
                            </div>

                        </div>
                    </div>
                )
            }
            {trabajo && selectedHistoryTask && (
                <ReporteDetailModal
                    isOpen={!!selectedHistoryTask}
                    onClose={() => setSelectedHistoryTask(null)}
                    trabajo={trabajo as any}
                    task={selectedHistoryTask}
                    reporte={reporteFinal || (() => {
                        const fallbackReportDataRaw = localStorage.getItem(`report_data_${trabajo?.id}`);
                        const temporalReportDataRaw = localStorage.getItem(`report_data_temporal_${trabajo?.id}`);
                        return fallbackReportDataRaw ? JSON.parse(fallbackReportDataRaw) : (temporalReportDataRaw ? JSON.parse(temporalReportDataRaw) : null);
                    })()}
                    userRole={user?.role ?? undefined}
                    onEdit={() => {
                        const baseRoute = user?.role === 'tecnico' ? '/tecnico' : (['autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '') ? '/autonomo' : '/menu');
                        navigate(`${baseRoute}/reporte-tarea/${trabajo?.id}`, { state: { trabajoId: trabajo?.id, actividadId: (selectedHistoryTask as any).id } });
                    }}
                />
            )}

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
                                        const baseRoute = user?.role === 'tecnico' ? '/tecnico' : (['autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '') ? '/autonomo' : '/menu');
                                        navigate(`${baseRoute}/reporte-tarea/${trabajo.id}`, { state: { trabajoId: trabajo.id, actividadId: selectedTaskForReport.id } });
                                    }
                                }}
                                style={{ padding: '12px 30px', borderRadius: '30px', border: 'none', background: '#f26522', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 10px rgba(251, 188, 4, 0.3)' }}
                            >
                                Entendido, Continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* PROBLEM DETAILS / IMAGE ZOOM MODAL */}
            {showZoomModal && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: '20px',
                        backdropFilter: 'blur(8px)'
                    }}
                    onClick={() => setShowZoomModal(false)}
                >
                    <div 
                        style={{ 
                            position: 'relative', width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', 
                            background: '#ffffff', padding: '40px', borderRadius: '24px', overflowY: 'auto',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowZoomModal(false)}
                            style={{ position: 'absolute', top: '20px', right: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', transition: 'all 0.2s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
                        >
                            ✕
                        </button>
                        
                        <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '28px' }}>📄</span> Detalles de la Solicitud
                            </h2>
                        </div>
                        
                        {groupedJobs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px', width: '100%' }}>
                                <span style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                                    Servicios en esta Solicitud ({groupedJobs.length})
                                </span>
                                {groupedJobs.map((groupJob, idx) => {
                                    const cleanDesc = groupJob.descripcion?.replace(/\[Grupo:\s*REQ-\d+\]\s*\n?/, "") || "";
                                    const photos = parseFotoUrls(groupJob.foto_url);
                                    return (
                                        <div key={groupJob.id} style={{ padding: '20px', background: '#f8fafc', borderRadius: '18px', border: '1px solid #cbd5e1' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                                                    🛠️ SERVICIO #{idx + 1}: {groupJob.titulo}
                                                </span>
                                                <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                                                    ID: {groupJob.id}
                                                </span>
                                            </div>
                                            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                                                "{cleanDesc || "Sin descripción."}"
                                            </p>
                                            {photos.length > 0 && (
                                                <div>
                                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                                                        Fotos de Evidencia ({photos.length})
                                                    </span>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                                                        {photos.map((url, pIdx) => (
                                                            <div key={pIdx} style={{ position: 'relative', paddingTop: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                                                <img src={url} alt={`Evidencia ${idx+1}-${pIdx+1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <>
                                {trabajo?.descripcion && (
                                    <div style={{ width: '100%', marginBottom: '30px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                            <HiOutlineSquare3Stack3D size={16} /> Problema Reportado
                                        </span>
                                        <div style={{ background: '#f8fafc', borderLeft: '4px solid #3b82f6', padding: '24px', borderRadius: '0 16px 16px 0', border: '1px solid #e2e8f0', borderLeftWidth: '4px' }}>
                                            {(() => {
                                                let desc = trabajo.descripcion || "";
                                                let tecnicoSugerido = null;
                                                const match = desc.match(/^\[Técnico sugerido:\s*([^\]]+)\]\s*/i);
                                                if (match) {
                                                    tecnicoSugerido = match[1];
                                                    desc = desc.substring(match[0].length).trim();
                                                }
                                                return (
                                                    <>
                                                        {tecnicoSugerido && (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', color: '#0369a1', padding: '6px 14px', borderRadius: '16px', fontSize: '14px', fontWeight: '700', marginBottom: '16px', border: '1px solid #bae6fd' }}>
                                                                <span style={{ fontSize: '16px' }}>👷</span> Técnico sugerido: {tecnicoSugerido}
                                                            </div>
                                                        )}
                                                        <p style={{ fontSize: '17px', color: '#334155', margin: 0, lineHeight: '1.7', fontStyle: 'italic' }}>
                                                            "{desc}"
                                                        </p>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                                
                                {trabajo?.foto_url && (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
                                            📸 Evidencia(s) Adjunta(s)
                                        </span>
                                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', width: '100%' }}>
                                            {(() => {
                                                let fotos: string[] = [];
                                                try {
                                                    if (typeof trabajo.foto_url === 'string' && trabajo.foto_url.trim().startsWith('[')) {
                                                        fotos = JSON.parse(trabajo.foto_url);
                                                    } else if (trabajo.foto_url) {
                                                        fotos = [trabajo.foto_url];
                                                    }
                                                } catch(e) {
                                                    if (typeof trabajo.foto_url === 'string') fotos = [trabajo.foto_url];
                                                }
                                                return Array.isArray(fotos) ? fotos.map((f, i) => (
                                                    <div key={i} style={{ flex: '1 1 min(100%, 300px)', display: 'flex', justifyContent: 'center' }}>
                                                        <img
                                                            src={f}
                                                            alt={`Zoomed Evidence ${i+1}`}
                                                            style={{ width: '100%', maxHeight: '40vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
                                                        />
                                                    </div>
                                                )) : null;
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Botón de Acción para Admin/Gerente dentro del Modal */}
                        {(['admin', 'autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '')) && (trabajo?.estado === 'Solicitud' || trabajo?.estado === 'Pendiente') && (
                            <div style={{ width: '100%', marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                {(() => {
                                    const match = (trabajo?.descripcion || "").match(/^\[Técnico sugerido:\s*([^\]]+)\]\s*/i);
                                    const tecnicoSugeridoName = match ? match[1] : null;
                                    return (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await updateEstadoTrabajo(trabajo.id, { estado: "En Espera" });
                                                    setTrabajo(prev => prev ? { ...prev, estado: "En Espera" } : prev);
                                                    setShowZoomModal(false);
                                                } catch (error: any) {
                                                    console.error("Error accepting job:", error);
                                                }
                                            }}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                                color: 'white',
                                                border: '1px solid #1d4ed8',
                                                padding: '16px 36px',
                                                borderRadius: '30px',
                                                fontSize: '16px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.5), inset 0 1px 1px rgba(255,255,255,0.2)'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 25px -5px rgba(59, 130, 246, 0.6), inset 0 1px 1px rgba(255,255,255,0.2)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(59, 130, 246, 0.5), inset 0 1px 1px rgba(255,255,255,0.2)'; }}
                                        >
                                            {tecnicoSugeridoName ? `✅ Aceptar Solicitud (Sugerido: ${tecnicoSugeridoName})` : '✅ Aceptar Solicitud'}
                                        </button>
                                    );
                                })()}

                                <button
                                    onClick={handleAdminRechazarSolicitud}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        background: '#fff',
                                        color: '#ef4444',
                                        border: '2px solid #fecaca',
                                        padding: '16px 36px',
                                        borderRadius: '30px',
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(239, 68, 68, 0.2)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                                >
                                    ❌ Rechazar Solicitud
                                </button>
                            </div>
                        )}
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
                                <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className={`${styles.iconBox} ${styles.bgGreen}`}>
                                            <HiOutlineMapPin size={18} />
                                        </div>
                                        <h3 className={styles.cardTitle}>Ubicación</h3>
                                    </div>
                                    <button
                                        onClick={() => setIsGpsModalOpen(true)}
                                        style={{
                                            padding: '7px 14px',
                                            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: '0 3px 10px rgba(37, 99, 235, 0.25)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        🗺️ Ver Mapa GPS
                                    </button>
                                </div>
                                <div className={styles.addressGrid} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, marginTop: '12px' }}>
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

                                {/* BOTÓN TÉCNICO CONFIRMAR LLEGADA */}
                                <button
                                    onClick={() => {
                                        if (!navigator.geolocation) {
                                            showAlert("GPS No Disponible", "Tu navegador no soporta geolocalización.", "error");
                                            return;
                                        }
                                        navigator.geolocation.getCurrentPosition(
                                            (pos) => {
                                                handleConfirmLlegadaGps({
                                                    lat: pos.coords.latitude,
                                                    lng: pos.coords.longitude
                                                });
                                                setIsGpsModalOpen(true);
                                            },
                                            (err) => {
                                                showAlert("Permiso GPS", "Por favor permite el acceso a tu ubicación para confirmar llegada.", "warning");
                                            },
                                            { enableHighAccuracy: true }
                                        );
                                    }}
                                    style={{
                                        marginTop: '16px',
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: tecnicoGpsCoords ? '#ecfdf5' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: tecnicoGpsCoords ? '#047857' : '#ffffff',
                                        border: tecnicoGpsCoords ? '1px solid #a7f3d0' : 'none',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: tecnicoGpsCoords ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.25)'
                                    }}
                                >
                                    {tecnicoGpsCoords ? '✓ Llegada Confirmada en GPS (Ver en Mapa)' : '📍 Confirmar Llegada a Sucursal (GPS)'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL MAPA GPS */}
            {isGpsModalOpen && trabajo && (
                <UbicacionMapaModal
                    isOpen={isGpsModalOpen}
                    onClose={() => setIsGpsModalOpen(false)}
                    sucursalName={trabajo.sucursal || trabajo.negocio?.nombre || 'Sucursal'}
                    direccion={{
                        calle: trabajo.calle,
                        numero: trabajo.numero,
                        colonia: trabajo.colonia,
                        ciudad: trabajo.ciudad,
                        estado: trabajo.estado_republica || trabajo.estado,
                        plaza: trabajo.plaza
                    }}
                    tecnicoName={trabajo.tecnico || 'Técnico de Servicio'}
                    tecnicoCoords={tecnicoGpsCoords}
                    llegadaConfirmadaAt={llegadaConfirmadaAt}
                    onConfirmLlegada={handleConfirmLlegadaGps}
                    userRole={user?.role || 'autonomo'}
                />
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

            {/* PDF PREVIEW MODAL */}
            {showPDFPreview && trabajo && (
                <CotizacionPDFPreview 
                    trabajo={trabajo} 
                    subTareas={subTareas} 
                    costo={costo} 
                    notas={notas} 
                    materials={adminQuoteMaterials}
                    manoObra={adminManoObra}
                    onClose={() => setShowPDFPreview(false)} 
                />
            )}

            {previewQuote && trabajo && (() => {
                const { materials, manoObra, notes } = parseQuoteMaterials(previewQuote.descripcion || "");
                return (
                    <CotizacionPDFPreview 
                        trabajo={trabajo} 
                        subTareas={subTareas} 
                        costo={previewQuote.monto} 
                        notas={notes} 
                        materials={materials}
                        manoObra={manoObra}
                        onClose={() => setPreviewQuote(null)} 
                    />
                );
            })()}

            {/* ACTIVITY PDF PREVIEW MODAL */}
            {showActivityPDFPreview && activityPDFData && (
                <ReportePDFPreview
                    trabajo={trabajo}
                    isVisita={trabajo?.tipo === 'Visita' || trabajo?.originalTipo === 'Visita' || activityPDFData.isVisita || (trabajo?.estado !== 'Finalizado' && trabajo?.estado !== 'En Proceso')}
                    reporteData={activityPDFData}
                    onClose={() => {
                        setShowActivityPDFPreview(false);
                        setActivityPDFData(null);
                    }}
                />
            )}
            {/* MODAL DE CONFIRMACIÓN DE ENVÍO A ENCARGADO */}
            {showSendConfirmModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', maxWidth: '460px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '32px' }}>
                            🚀
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>¿Enviar al Encargado de Sucursal?</h3>
                        <p style={{ margin: '0 0 25px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                            ¿Estás seguro de que deseas enviar la información? Una vez enviada al Encargado de Sucursal, la información se mandará y no se podrán realizar más cambios ni ediciones.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowSendConfirmModal(false)}
                                style={{ flex: 1, padding: '13px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '14px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    setShowSendConfirmModal(false);
                                    try {
                                        await updateEstadoTrabajo(Number(id), { estado: 'Cotización Enviada', visitado: true });
                                        setTrabajo((prev: any) => prev ? { ...prev, estado: 'Cotización Enviada', visitado: true } : prev);

                                        const techName = user?.name || 'Técnico';
                                        const sucursalName = trabajo?.sucursal || trabajo?.negocio?.nombre || 'tu sucursal';

                                        // Notificar al Encargado de Sucursal
                                        if (trabajo?.negocio_id) {
                                            try {
                                                await createNotificacionNegocio({
                                                    negocio_id: trabajo.negocio_id,
                                                    titulo: '📍 Visita Finalizada',
                                                    mensaje: `El técnico ${techName} ha concluido la visita en tu sucursal.`,
                                                    enlace: `/encargado/resumen`
                                                });
                                            } catch (notiErr) {
                                                console.error("Error notificando al Encargado:", notiErr);
                                            }
                                        }

                                        // Notificar al Admin General
                                        try {
                                            await createNotificacionByRole({
                                                role: 'admin',
                                                titulo: '📍 Visita Finalizada',
                                                mensaje: `El técnico ${techName} ha concluido la visita en ${sucursalName}.`,
                                                enlace: `/menu/trabajo-detalle/${id}`
                                            });
                                        } catch (notiErr) {
                                            console.error("Error notificando al Admin:", notiErr);
                                        }

                                        // Notificar al Admin Autónomo / Subgerente
                                        if (trabajo?.admin_autonomo_id) {
                                            try {
                                                await createNotificacion({
                                                    user_id: trabajo.admin_autonomo_id,
                                                    titulo: '📍 Visita Finalizada',
                                                    mensaje: `El técnico ${techName} ha concluido la visita en la sucursal ${sucursalName}.`,
                                                    enlace: `/autonomo/trabajo-detalle/${id}`
                                                });
                                            } catch (notiErr) {
                                                console.error("Error notificando al Admin Autónomo:", notiErr);
                                            }
                                        }

                                        showAlert('Información Enviada', 'La información ha sido enviada al Encargado de Sucursal correctamente.', 'success');
                                    } catch (err: any) {
                                        showAlert('Error', err?.message || 'No se pudo enviar la información', 'error');
                                    }
                                }}
                                style={{ flex: 1.5, padding: '13px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                            >
                                Sí, Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMapModal && trabajo && trabajo.latitud_llegada && trabajo.longitud_llegada && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.2s ease' }} onClick={() => setShowMapModal(false)}>
                    <div style={{ background: '#fff', borderRadius: '24px', width: '90%', maxWidth: '800px', height: '80%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '24px' }}>📍</span> Ubicación de Llegada del Técnico
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>Confirmada en el sitio del cliente</p>
                            </div>
                            <button onClick={() => setShowMapModal(false)} style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#cbd5e1'; }} onMouseLeave={e => { e.currentTarget.style.background = '#e2e8f0'; }}>
                                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1 }}>✕</span>
                            </button>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                style={{ border: 0 }}
                                src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${trabajo.latitud_llegada},${trabajo.longitud_llegada}&zoom=17`}
                                allowFullScreen
                            ></iframe>
                        </div>
                        <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button onClick={() => setShowMapModal(false)} style={{ padding: '10px 20px', borderRadius: '10px', background: '#f1f5f9', color: '#334155', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar Mapa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutonomoDetalleTrabajo;

