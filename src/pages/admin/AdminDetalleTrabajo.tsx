// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./AdminDetalleTrabajo.module.css";
import historialStyles from "../cliente/Historial.module.css";
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
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineDocumentText,
    HiOutlineArrowLeft
} from "react-icons/hi2";
import ReporteDetailModal from "../../components/modals/ReporteDetailModal";
import { getTrabajo, updateEstadoTrabajo, assignTrabajador, updateTrabajo } from "../../services/trabajosService";
import { createActividad, getActividadesByTrabajo, deleteActividad, updateActividad } from "../../services/actividadesService";
import { getTrabajadores } from "../../services/trabajadoresService";
import { saveCotizacion, updateCotizacion, deleteCotizacion, updateCotizacionStatus, getCotizacionesByTrabajoId, type Cotizacion } from "../../services/cotizacionesService";
import { createNotificacionByRole, createNotificacion, createNotificacionNegocio, createNotificacionEcosistema } from "../../services/notificacionesService";
import { getReporteByTrabajoId } from "../../services/reportesService";
import { useModal } from "../../context/ModalContext";
import { getNegocio } from "../../services/negociosService";
import LevantamientoModal from "../../components/LevantamientoModal";
import CotizacionPDFPreview from "../../components/modals/CotizacionPDFPreview";
import ReportePDFPreview from "../../components/modals/ReportePDFPreview";
import ChatTrabajo from "../../components/ChatTrabajo";
import NegotiationChatWidget from "../../components/chat/NegotiationChatWidget";
import { generateMaintenanceReportPDF } from "../../utils/pdfGenerator";


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
    originalTipo?: "Visita" | "Trabajo" | "Nueva Solicitud" | "SOS";
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
    clienteNombre?: string;
    clienteEmail?: string;
    clienteTelefono?: string;
    foto_url?: string;
    fecha_programada?: string;
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
    cotizacionEstado?: "Pendiente" | "Aprobada" | "Rechazada" | "Sugerencia de Técnico";
    cotizacionArchivo?: string;
    serviceData?: {
        marca: string;
        modelo: string;
        pieza?: string;
        garantia?: string;
    };
    refacciones?: { pieza: string, cantidad: number, costo_estimado?: string }[];
    quoteData?: { conceptos?: any[]; materiales?: any[]; comentarios?: string; monto?: string; detalles?: string };
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

const AdminDetalleTrabajo: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();

    // Permitir abrir la pestaña de cotización directamente vía URL
    const searchParams = new URLSearchParams(location.search);
    const rawTabParam = (searchParams.get('tab') || '').toLowerCase();
    const initialTab = (rawTabParam === 'cotizacion' || rawTabParam === 'cotización') ? 'Cotización' : 
                       (rawTabParam === 'historial') ? 'Historial' : 
                       (rawTabParam === 'registro') ? 'Registro' : 
                       (rawTabParam === 'trabajo') ? 'Trabajo' : 'Datos';
    const [activeTab, setActiveTab] = useState<"Datos" | "Trabajo" | "Registro" | "Historial" | "Cotización">(initialTab);

    // MOCK DATA
    const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
    const [latestChatQuote, setLatestChatQuote] = useState<any>(null);
    const [subTareas, setSubTareas] = useState<SubTarea[]>([]);
    const [reporteFinal, setReporteFinal] = useState<any>(null);
    const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);

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

    useEffect(() => {
        if (id) {
            const saved = localStorage.getItem(`quote_history_${id}`);
            if (saved) {
                try { setQuoteHistory(JSON.parse(saved)); } catch (e) {}
            }
        }
    }, [id]);

    // Sincronizar pestaña activa solo al cambiar parámetro de URL (Deep Linking)
    useEffect(() => {
        const tabParam = (new URLSearchParams(location.search).get('tab') || '').toLowerCase();
        if (tabParam === 'cotizacion' || tabParam === 'cotización') {
            setActiveTab('Cotización');
        } else if (tabParam === 'historial') {
            setActiveTab('Historial');
        } else if (tabParam === 'registro') {
            setActiveTab('Registro');
        } else if (tabParam === 'trabajo') {
            setActiveTab('Trabajo');
        } else if (tabParam === 'datos') {
            setActiveTab('Datos');
        }
    }, [location.search]);

    // Modal Imagen Full-Screen
    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [rejectionMode, setRejectionMode] = useState<"solicitud" | "cotizacion">("cotizacion");

    // Modal Hora Llegada
    const [showHoraLlegadaModal, setShowHoraLlegadaModal] = useState(false);

    // Helper to parse multiple photos
    const parseFotoUrls = (fotoUrl: any): string[] => {
        if (!fotoUrl) return [];
        let urls: string[] = [];
        if (typeof fotoUrl === 'string') {
            if (fotoUrl.trim().startsWith('[')) {
                try {
                    const parsed = JSON.parse(fotoUrl);
                    if (Array.isArray(parsed)) urls = parsed;
                } catch (e) {
                    console.error("Error parsing foto_url JSON:", e);
                }
            } else {
                urls = [fotoUrl];
            }
        } else if (Array.isArray(fotoUrl)) {
            urls = fotoUrl;
        }

        const baseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8085/api').replace(/\/api\/?$/, '');
        return urls.map(url => {
            if (typeof url === 'string') {
                if (url.includes('127.0.0.1') || url.includes('localhost')) {
                    const parts = url.split('/storage/');
                    if (parts.length === 2) {
                        return `${baseUrl}/storage/${parts[1]}`;
                    }
                } else if (url.startsWith('/storage/')) {
                    return `${baseUrl}${url}`;
                } else if (url.startsWith('storage/')) {
                    return `${baseUrl}/${url}`;
                }
            }
            return url;
        });
    };
    
    // Modal PDF Preview
    const [showPDFPreview, setShowPDFPreview] = useState<boolean>(false);
    // const [isFromNewReq, setIsFromNewReq] = useState(false);
    
    // Historial Tab State
    const [expandedHistoryMonths, setExpandedHistoryMonths] = useState<Record<string, boolean>>({});

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
    const [adminQuoteMaterials, setAdminQuoteMaterials] = useState<{ material: string; piezas: string; precio: string }[]>([]);
    const [adminManoObra, setAdminManoObra] = useState("0");
    const [previewQuote, setPreviewQuote] = useState<any | null>(null);

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
                const calculatedTipo = (() => {
                    if (data.tipo === "SOS") return "SOS";
                    if (data.tipo === "Trabajo") return "Trabajo";
                    if (data.tipo === "Visita") {
                        if (["Cotización Aceptada", "Cotización Aprobada", "Finalizado"].includes(data.estado)) {
                            return "Trabajo";
                        }
                        if (data.estado === "En Proceso") {
                            return data.visitado ? "Trabajo" : "Visita";
                        }
                        return "Visita";
                    }
                    return (["Cotización Aceptada", "Cotización Aprobada", "Finalizado"].includes(data.estado) || data.visitado || (data.estado === "En Proceso" && data.visitado)) ? "Trabajo" : "Visita";
                })();

                const mappedJob = {
                    id: data.id,
                    titulo: data.titulo || (data as any).descripcion?.substring(0, 20) || "Servicio",
                    ubicacion: data.negocio?.ubicacion || "Por definir",
                    tecnico: currentTech,
                    fecha: data.fecha_programada || new Date(data.created_at).toLocaleDateString('es-MX'),
                    estado: (data.estado === "Pendiente" ? "Solicitud" : data.estado) as any,
                    tipo: calculatedTipo,
                    originalTipo: data.tipo || calculatedTipo,
                    visitado: data.visitado,
                    descripcion: data.descripcion,
                    latitud_llegada: data.latitud_llegada,
                    longitud_llegada: data.longitud_llegada,
                    hora_llegada: data.hora_llegada,
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
                    fechaSolicitud: data.created_at
                        ? new Date(data.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                        : "No registrada",
                    fecha_programada: data.fecha_programada || null,
                    businessId: data.negocio_id || data.negocio?.id,
                    negocio_id: data.negocio_id || data.negocio?.id,
                    admin_autonomo_id: data.admin_autonomo_id || data.negocio?.admin_autonomo_id,
                    clienteUserId: data.negocio?.user_id || null,
                    clienteNombre: data.negocio?.user?.name || "",
                    clienteEmail: data.negocio?.user?.email || "",
                    clienteTelefono: data.negocio?.user?.telefono || "",
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

                // FETCH CHATS TO CHECK FOR LATEST QUOTE
                try {
                    const token = localStorage.getItem('token');
                    if (token) {
                        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8085/api';
                        const chatRes = await fetch(`${API_URL}/trabajos/${id}/chat`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (chatRes.ok) {
                            const chatData = await chatRes.json();
                            const lastQuote = chatData.reverse().find((msg: any) => msg.is_quote);
                            if (lastQuote) {
                                setLatestChatQuote(lastQuote);
                            }
                        }
                    }
                } catch (chatErr) {
                    console.error("Error fetching chats for quote check:", chatErr);
                }

                setTrabajo(mappedJob as any);
            } catch (error) {
                console.error("No se pudo hallar el trabajo en servidor:", error);
                setTrabajo(null);
            }
        };

        if (id) {
            fetchAll();
        }
    }, [id]);

    const handleQuoteAction = async (action: 'accept' | 'reject', reason?: string) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8085/api';
            const res = await fetch(`${API_URL}/trabajos/${id}/quote-action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action, reason })
            });

            if (res.ok) {
                const data = await res.json();
                setTrabajo(data.trabajo);
                setLatestChatQuote(null); // Clear the quote notification
                setShowRejectionModal(false);
                setRejectionReason("");
                
                // If accepted, maybe switch tab to Trabajo
                if (action === 'accept') {
                    setActiveTab('Trabajo');
                }
            } else {
                console.error("Error updating quote action");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    useEffect(() => {
        const fetchActividades = async () => {
            if (!id) return;
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

                    let authorName = (trabajo?.tecnico && trabajo.tecnico !== "Sin Asignar") ? trabajo.tecnico : (user?.name || "Sin Asignar");
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
                        } catch (e) {
                        }
                    }

                    if (finalDesc.includes(quoteMarker)) {
                        const parts = finalDesc.split(quoteMarker);
                        try {
                            // Limpiamos cualquier marcador que venga después del JSON de la cotización
                            const jsonContent = parts[1].split(serviceMarker)[0].split(techMarker)[0].split(photosMarker)[0].trim();
                            if (jsonContent.startsWith('{')) {
                                qData = JSON.parse(jsonContent);
                                // New format: {conceptos, materiales, comentarios}
                                if (qData.conceptos || qData.materiales) {
                                    let totalMonto = 0;
                                    if (qData.conceptos) {
                                        for (const c of qData.conceptos) {
                                            totalMonto += (Number(c.cantidad) || 1) * (Number(c.precio) || 0);
                                        }
                                    }
                                    if (qData.materiales) {
                                        for (const m of qData.materiales) {
                                            totalMonto += (Number(m.cantidad) || 1) * (Number(m.precio) || 0);
                                        }
                                    }
                                    if (totalMonto > 0) parsedMonto = totalMonto.toString();
                                    if (qData.comentarios) displayDesc += "\n\nNotas de cotización:\n" + qData.comentarios;
                                } else {
                                    // Legacy format: {monto, detalles}
                                    if (qData.monto) parsedMonto = qData.monto;
                                    if (qData.detalles) displayDesc += "\n\nNotas de cotización:\n" + qData.detalles;
                                }
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

                    // Build refacciones from QUOTE_DATA if DB refacciones are empty
                    let finalRefacciones = act.refacciones && act.refacciones.length > 0 ? act.refacciones : [];
                    if (finalRefacciones.length === 0 && qData && (qData.conceptos || qData.materiales)) {
                        const syntheticRefacciones: any[] = [];
                        if (qData.conceptos) {
                            for (const c of qData.conceptos) {
                                if (c.descripcion && c.descripcion.trim()) {
                                    syntheticRefacciones.push({
                                        pieza: c.descripcion.trim(),
                                        cantidad: Number(c.cantidad) || 1,
                                        costo_estimado: ((Number(c.cantidad) || 1) * (Number(c.precio) || 0)).toString()
                                    });
                                }
                            }
                        }
                        if (qData.materiales) {
                            for (const m of qData.materiales) {
                                if (m.nombre && m.nombre.trim()) {
                                    syntheticRefacciones.push({
                                        pieza: m.nombre.trim() + ' (material)',
                                        cantidad: Number(m.cantidad) || 1,
                                        costo_estimado: ((Number(m.cantidad) || 1) * (Number(m.precio) || 0)).toString()
                                    });
                                }
                            }
                        }
                        finalRefacciones = syntheticRefacciones;
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
                        refacciones: finalRefacciones,
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
                            // Sincronizar también localStorage como caché local
                            localStorage.setItem(`quote_history_${id}`, JSON.stringify(backendHistory));
                        }
                    }
                } catch (e) { console.log('Sin cotizaciones previas'); }

            } catch (error) {
                console.error("Error al cargar historial desde Laravel:", error);
            }
        };
        fetchActividades();
    }, [id]);


    // MODAL STATES
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTechnicians, setSelectedTechnicians] = useState<number[]>([]);
    const [technicianSearch, setTechnicianSearch] = useState("");
    const [isTechRequestModalOpen, setIsTechRequestModalOpen] = useState(false);
    const [requestRole, setRequestRole] = useState("");
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

    const handleTechRequest = async () => {
        if (!requestRole) {
            showAlert("Atención", "Por favor selecciona el tipo de técnico que necesitas.", "warning");
            return;
        }

        try {
            await createNotificacionByRole({
                role: 'admin',
                titulo: '🚀 Solicitud de Técnico',
                mensaje: `El usuario ${user?.name || 'Autónomo'} requiere la creación de un nuevo perfil para: ${requestRole}.`,
                enlace: '/menu/trabajadores'
            });
            showAlert("Éxito", "Solicitud enviada al administrador principal.", "success");
            setIsTechRequestModalOpen(false);
            setRequestRole("");
        } catch (error) {
            showAlert("Error", "Hubo un problema enviando la solicitud.", "error");
        }
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
    const [showCotizacionPreview, setShowCotizacionPreview] = useState(false);
    const [cotizacionPreviewData, setCotizacionPreviewData] = useState<any>(null);
    const [activityPDFData, setActivityPDFData] = useState<any>(null);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [newTaskDescription, setNewTaskDescription] = useState("");
    const [isQuoteIncluded, setIsQuoteIncluded] = useState(false);
    const [quoteConceptos, setQuoteConceptos] = useState<{descripcion: string, cantidad: string, precio: string}[]>([]);
    const [quoteMateriales, setQuoteMateriales] = useState<{nombre: string, cantidad: string, precio: string}[]>([]);
    const [quoteComentarios, setQuoteComentarios] = useState("");
    const [activityPhotos, setActivityPhotos] = useState<string[]>([]);
    const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
    const [taskItems, setTaskItems] = useState<{ id: string; descripcion: string; foto: string }[]>([
        { id: '1', descripcion: '', foto: '' }
    ]);

    // SERVICE TYPE FIELDS (NEW)
    const [activeServiceType, setActiveServiceType] = useState<any>("Mantenimiento");
    const [customServiceType, setCustomServiceType] = useState("");
    const [serviceMarca, setServiceMarca] = useState("");
    const [serviceModelo, setServiceModelo] = useState("");
    const [serviceEquipoId, setServiceEquipoId] = useState<number | null>(null);
    const [servicePieza, setServicePieza] = useState("");
    const [serviceGarantia, setServiceGarantia] = useState("");
    const [refacciones, setRefacciones] = useState<{pieza: string, cantidad: number, costo_estimado?: string}[]>([]);
    const [confirmacionLlegada, setConfirmacionLlegada] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [latitudLlegada, setLatitudLlegada] = useState<string | null>(null);
    const [longitudLlegada, setLongitudLlegada] = useState<string | null>(null);
    const [showMapModal, setShowMapModal] = useState(false);
    const [horaLlegada, setHoraLlegada] = useState("");

    // REASSIGNMENT / CAMBIO DE PROVEEDOR STATES
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignReason, setReassignReason] = useState("");
    const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);

    const handleReassignSubmit = async () => {
        if (!reassignReason.trim()) {
            showAlert("Atención", "Por favor ingresa el motivo del cambio de técnico.", "warning");
            return;
        }
        setIsSubmittingReassign(true);
        try {
            if (trabajo?.id) {
                await updateTrabajo(trabajo.id, {
                    trabajador_id: null,
                    tecnico: 'Sin asignar',
                    estado: 'Reasignación Solicitada',
                    motivo_reasignacion: reassignReason
                });

                try {
                    await createNotificacionByRole({
                        role: 'admin',
                        titulo: '🚨 Solicitud de Cambio de Técnico',
                        mensaje: `El usuario ${user?.name || 'Encargado'} ha solicitado cambiar de técnico para la sucursal ${trabajo.sucursal || ''}. Motivo: ${reassignReason}`,
                        enlace: `/menu/trabajo-detalle/${trabajo.id}`
                    });
                } catch (e) {}

                localStorage.setItem(`reassign_reason_${trabajo.id}`, reassignReason);

                setTrabajo(prev => prev ? {
                    ...prev,
                    trabajador_id: null,
                    tecnico: 'Sin asignar',
                    estado: 'Reasignación Solicitada',
                    motivo_reasignacion: reassignReason
                } : prev);

                showAlert("Solicitud Enviada", "Se ha retirado la asignación al técnico. Ahora puedes seleccionar un nuevo técnico.", "success");
                setIsReassignModalOpen(false);
                setReassignReason("");
            }
        } catch (error) {
            showAlert("Error", "Hubo un problema al procesar la solicitud de reasignación.", "error");
        } finally {
            setIsSubmittingReassign(false);
        }
    };

    // EXECUTION DATE & TIME STATES (TÉCNICO - MÁXIMO 1 MODIFICACIÓN)
    const [isEditingExecutionTime, setIsEditingExecutionTime] = useState(false);
    const [execFecha, setExecFecha] = useState("");
    const [execHora, setExecHora] = useState("");
    const [isSavingExecTime, setIsSavingExecTime] = useState(false);
    const [execModCount, setExecModCount] = useState<number>(0);

    useEffect(() => {
        if (trabajo?.id) {
            const savedCount = localStorage.getItem(`exec_time_mod_count_${trabajo.id}`);
            if (savedCount !== null) {
                setExecModCount(Number(savedCount));
            }
        }
    }, [trabajo?.id]);

    const handleSaveExecutionTime = async () => {
        if (!execFecha) {
            showAlert("Atención", "Por favor selecciona la fecha de ejecución.", "warning");
            return;
        }
        setIsSavingExecTime(true);
        try {
            if (trabajo?.id) {
                await updateTrabajo(trabajo.id, {
                    fecha_programada: execFecha,
                    horaAsignada: execHora || '09:00'
                });

                const newCount = execModCount + 1;
                localStorage.setItem(`exec_time_mod_count_${trabajo.id}`, newCount.toString());
                setExecModCount(newCount);

                try {
                    await createNotificacionByRole({
                        role: 'encargado',
                        titulo: '📅 Fecha de Ejecución Confirmada',
                        mensaje: `El técnico ${user?.name || ''} ha confirmado la fecha de ejecución para el ${execFecha} a las ${execHora || '09:00'} en ${trabajo?.sucursal || ''}.`,
                        enlace: `/encargado/trabajo-detalle/${trabajo.id}`
                    });
                    await createNotificacionByRole({
                        role: 'admin',
                        titulo: '📅 Fecha de Ejecución Confirmada',
                        mensaje: `El técnico ${user?.name || ''} ha confirmado la fecha de ejecución para el ${execFecha} a las ${execHora || '09:00'} en ${trabajo?.sucursal || ''}.`,
                        enlace: `/menu/trabajo-detalle/${trabajo.id}`
                    });
                } catch (e) {}

                setTrabajo(prev => prev ? {
                    ...prev,
                    fecha_programada: execFecha,
                    horaAsignada: execHora || '09:00',
                    hora_programada: execHora || '09:00'
                } : prev);

                setIsEditingExecutionTime(false);
                showAlert(
                    "Horario Confirmado", 
                    newCount >= 2 
                        ? "Has utilizado tu única modificación permitida. La fecha y hora han quedado confirmadas de manera definitiva." 
                        : "Has guardado la fecha y hora de ejecución del trabajo.", 
                    "success"
                );
            }
        } catch (error) {
            showAlert("Error", "No se pudo guardar la fecha y hora de ejecución.", "error");
        } finally {
            setIsSavingExecTime(false);
        }
    };


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

    const compressImage = (file: File, callback: (compressedBase64: string) => void) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                callback(dataUrl);
            };
            if (e.target?.result) {
                img.src = e.target.result as string;
            }
        };
        reader.readAsDataURL(file);
    };

    const handleActivityPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            files.forEach((file) => {
                compressImage(file, (base64) => {
                    setActivityPhotos(prev => [...prev, base64]);
                });
            });
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
                        originalTipo: selectedType,
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
        if (!trabajo) return;
        try {
            await updateEstadoTrabajo(trabajo.id, { estado: "En Espera" });
            setTrabajo((prev: any) => prev ? { ...prev, estado: "En Espera" } : prev);
            showAlert("Trabajo Aceptado", "Has aceptado la asignación. Ahora puedes iniciar el trabajo o visita cuando llegues.", "success");
            setShowZoomModal(false);
        } catch (error) {
            console.error("Error aceptando asignación:", error);
            showAlert("Error", "No se pudo aceptar la asignación.", "error");
        }
    };

    const handleConfirmHoraLlegada = async () => {
        if (!horaLlegada) {
            showAlert("Atención", "Debes indicar una hora estimada de llegada.", "warning");
            return;
        }
        
        try {
            await updateEstadoTrabajo(trabajo.id, { estado: "En Espera", hora_llegada: horaLlegada });
            setTrabajo((prev: any) => prev ? { ...prev, estado: "En Espera", hora_llegada: horaLlegada } : prev);
            
            // Notificar al encargado y admin autonomo
            if (trabajo.negocio_id) {
                const negocioRes = await getNegocio(trabajo.negocio_id);
                const negocioData = negocioRes.data || negocioRes;
                if (negocioData) {
                    try {
                        await createNotificacionNegocio({
                            negocio_id: trabajo.negocio_id,
                            titulo: 'Técnico en camino',
                            mensaje: `El técnico ha aceptado la solicitud y estima llegar a las ${horaLlegada}.`,
                        });
                    } catch (e) { console.error("Error notificando encargado:", e); }
                    
                    if (negocioData.admin_autonomo_id) {
                        try {
                            await createNotificacionEcosistema({
                                admin_autonomo_id: negocioData.admin_autonomo_id,
                                titulo: 'Técnico en camino',
                                mensaje: `El técnico ha aceptado la solicitud para ${negocioData.nombre} y estima llegar a las ${horaLlegada}.`,
                                tipo: 'Info'
                            });
                        } catch (e) { console.error("Error notificando autonomo:", e); }
                    }
                }
            }
            
            setShowHoraLlegadaModal(false);
            showAlert("Trabajo Aceptado", `Has aceptado la asignación. Llegada estimada a las ${horaLlegada}.`, "success");
        } catch (error) {
            console.error("Error aceptando asignación:", error);
            showAlert("Error", "No se pudo aceptar la asignación.", "error");
        }
    };
    const handleRechazarAsignacion = () => {
        setRejectionMode("solicitud");
        setRejectionReason("");
        setShowRejectionModal(true);
    };


    const handleEmpezarTrabajoTipo = async (tipo: 'Visita' | 'Trabajo') => {
        try {
            const isVisita = tipo === 'Visita';
            const nuevoTitulo = trabajo.titulo ? trabajo.titulo.replace("(Visita)", "").replace("(Reparación)", "").trim() + (isVisita ? " (Visita)" : " (Reparación)") : (isVisita ? "Nueva Visita" : "Nueva Reparación");
            
            await updateEstadoTrabajo(trabajo.id, { estado: "En Proceso", visitado: !isVisita });
            await updateTrabajo(trabajo.id, { tipo, titulo: nuevoTitulo });

            setTrabajo((prev: any) => prev ? { ...prev, estado: "En Proceso", tipo, originalTipo: prev.originalTipo || tipo, titulo: nuevoTitulo, visitado: !isVisita } : prev);
            setActiveTab(isVisita ? 'Registro' : 'Trabajo');
            showAlert("Actividad Iniciada", `Has iniciado como ${tipo}. Ahora puedes agregar registros.`, "success");
        } catch (error) {
            console.error("Error iniciando trabajo:", error);
            showAlert("Error", "No se pudo iniciar la actividad.", "error");
        }
    };
    const handleGeneratePreview = () => {
        const activeItems = taskItems.filter(t => t.descripcion.trim() || t.foto);
        const combinedDescText = activeItems.length > 0
            ? activeItems.map((item, idx) => activeItems.length > 1 ? `${idx + 1}. ${item.descripcion.trim()}` : item.descripcion.trim()).filter(Boolean).join('\n\n')
            : newTaskDescription;

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
                antes: activeItems[0]?.foto || activityPhotos[0] || null,
                durante: activeItems[1]?.foto || activityPhotos[1] || null,
                despues: activeItems[2]?.foto || activityPhotos[2] || null
            },
            imagenObservacion: activeItems[3]?.foto || activityPhotos[3] || null,
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
                garantia: activeServiceType === 'Instalacion' ? serviceGarantia : '',
                llegadaConfirmada: confirmacionLlegada,
                horaLlegada: horaLlegada
            };
            desc += ` \n|||SERVICE_DATA||| ${JSON.stringify(serviceData)}`;

            if (isQuoteIncluded) {
                const quotePayload = { 
                    conceptos: quoteConceptos.filter(c => c.descripcion.trim()),
                    materiales: quoteMateriales.filter(m => m.nombre.trim()),
                    comentarios: quoteComentarios
                };
                desc += ` \n|||QUOTE_DATA||| ${JSON.stringify(quotePayload)}`;
            }

            const techNamePayload = user?.name || "Sin Asignar";
            desc += ` \n|||TECH_NAME||| ${techNamePayload}`;

            const finalPhotos = combinedPhotos.length > 0 ? combinedPhotos : activityPhotos;
            if (finalPhotos.length > 0) {
                desc += ` \n|||PHOTOS_DATA||| ${JSON.stringify(finalPhotos)}`;
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
                refacciones: payloadRefacciones,
                estado: 'Completa'
            };

            if (editingTaskId) {
                await updateActividad(editingTaskId, body);
            } else {
                await createActividad(body);
            }

            if (isQuoteIncluded) {
                await updateEstadoTrabajo(Number(id), { estado: 'Cotización Enviada' });
                // Actualizar estado local si es necesario
                setTrabajo((prev: any) => prev ? { ...prev, estado: 'Cotización Enviada' } : prev);
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
                if (generatePDF) {
                    // Conceptos de servicio (Mano de obra / servicios)
                    const conceptosPDF = isQuoteIncluded ? quoteConceptos
                        .filter(c => c.descripcion && c.descripcion.trim())
                        .map(c => ({
                            pieza: c.descripcion,
                            cantidad: Number(c.cantidad) || 1,
                            costo_estimado: c.precio ? String(c.precio) : '0'
                        })) : [];

                    // Materiales físicos
                    const materialesPDF = isQuoteIncluded ? quoteMateriales
                        .filter(m => m.nombre && m.nombre.trim())
                        .map(m => ({
                            pieza: m.nombre,
                            cantidad: Number(m.cantidad) || 1,
                            costo_estimado: m.precio ? String(m.precio) : '0'
                        })) : [];

                    // Refacciones adicionales del técnico
                    const refaccionesBase = refacciones.map(r => ({
                        pieza: r.pieza,
                        cantidad: Number(r.cantidad) || 1,
                        costo_estimado: r.costo_estimado ? String(r.costo_estimado) : '0'
                    }));

                    // Combinar todos: conceptos + materiales + refacciones
                    const refaccionesList = [...conceptosPDF, ...materialesPDF, ...refaccionesBase];


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
                    
                    try {
                        await generateMaintenanceReportPDF(preparedData);
                    } catch (err) {
                        console.error("Error generando PDF:", err);
                    }
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
        setQuoteConceptos([]);
        setQuoteMateriales([]);
        setQuoteComentarios("");
        setActivityPhotos([]);
        // Reset service fields
        setServiceMarca("");
        setServiceModelo("");
        setServicePieza("");
        setServiceGarantia("");
        setRefacciones([]);
        
        if (isQuoteIncluded || trabajo?.estado !== 'En Proceso') {
            setActiveTab("Trabajo");
        } else {
            setActiveTab("Registro");
        }
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
                    const techMarker = "|||TECH_NAME|||";
                    const photosMarker = "|||PHOTOS_DATA|||";

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
        
        // 4. Llegada Confirmada
        setConfirmacionLlegada(tarea.serviceData?.llegadaConfirmada || false);
        setHoraLlegada(tarea.serviceData?.horaLlegada || "");
        
        // 5. Refacciones
        setRefacciones(tarea.refacciones || []);
        
        // 5. Cotización
        if (tarea.hasQuote) {
            setIsQuoteIncluded(true);
            
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
                if (currentQuoteData.conceptos) {
                    setQuoteConceptos(currentQuoteData.conceptos);
                    setQuoteMateriales(currentQuoteData.materiales || []);
                    setQuoteComentarios(currentQuoteData.comentarios || "");
                } else if (currentQuoteData.materials) {
                    // Fallback for old data
                    const oldMaterials = currentQuoteData.materials;
                    setQuoteMateriales(oldMaterials.map((m: any) => ({ nombre: m.material, cantidad: m.piezas, precio: m.precio || "" })));
                    setQuoteComentarios(currentQuoteData.detalles || "");
                    setQuoteConceptos([{ descripcion: "Cotización anterior", cantidad: "1", precio: String(currentQuoteData.monto || "") }]);
                } else {
                    setQuoteConceptos([{ descripcion: "Cotización manual", cantidad: "1", precio: String(currentQuoteData.monto || "") }]);
                    setQuoteComentarios(currentQuoteData.detalles || "");
                }
            } else {
                setQuoteConceptos([]);
                setQuoteMateriales([]);
                setQuoteComentarios("");
            }
        } else {
            setIsQuoteIncluded(false);
            setQuoteConceptos([]);
            setQuoteMateriales([]);
            setQuoteComentarios("");
        }
        
        // 6. Fotos y tareas de la actividad
        const photosList = tarea.photos || [];
        setActivityPhotos(photosList);
        
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
                            await createNotificacionByRole({
                                role: 'admin',
                                titulo: '📍 Visita Finalizada',
                                mensaje: `El técnico ${user?.name || 'Sistema'} ha concluido la visita en ${trabajo.sucursal || 'la sucursal'}. Ya puede enviar cotización al cliente.`,
                                enlace: `/menu/trabajo-detalle/${trabajo.id}`
                            });
                            
                            // Notificar al admin autonomo (subgerente) específico de la sucursal
                            if (trabajo.admin_autonomo_id) {
                                await createNotificacion({
                                    user_id: trabajo.admin_autonomo_id,
                                    titulo: '📍 Visita Finalizada',
                                    mensaje: `El técnico ${user?.name || 'Sistema'} ha concluido la visita en la sucursal: ${trabajo.sucursal || 'Tu sucursal'}.`,
                                    enlace: `/autonomo/trabajo-detalle/${trabajo.id}`
                                });
                            }
                            
                            // Notificar a todos los encargados de la sucursal (ej. Diego Basulto)
                            if (trabajo.negocio_id) {
                                await createNotificacionNegocio({
                                    negocio_id: trabajo.negocio_id,
                                    titulo: '📍 Visita Finalizada',
                                    mensaje: `El técnico ${user?.name || 'Sistema'} ha concluido la visita en tu sucursal.`,
                                    enlace: `/encargado/resumen`
                                });
                            }
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

            // Autogenerar y subir PDF de la cotización/visita si el admin no cargó un archivo manual
            let pdfFile: File | null = archivoFile;
            if (!pdfFile) {
                try {
                    const dynamicFolio = `COT-${trabajo.id.toString().padStart(5, '0')}`;
                    if (reporteFinal) {
                        const widgetMateriales = reporteFinal.refaccionesList?.length > 0 
                            ? reporteFinal.refaccionesList.map((r: any) => `- ${r.cantidad || 1}x ${r.pieza} ${r.costo_estimado ? `($${r.costo_estimado})` : ''}`).join('\n')
                            : '';
                        const combinedMateriales = [widgetMateriales, reporteFinal.materiales].filter(Boolean).join('\n\n');
                        const techName = reporteFinal.tecnicoNombre || trabajo.tecnico || trabajo.trabajador?.nombre || 'Técnico';
                        
                        pdfFile = await generateMaintenanceReportPDF({
                            id: trabajo.id,
                            folio: dynamicFolio,
                            fecha: new Date().toLocaleDateString('es-MX'),
                            sucursal: trabajo.sucursal || '---',
                            encargado: trabajo.encargado || '---',
                            tecnico: techName,
                            tecnicoAvatar: reporteFinal.tecnicoAvatar || null,
                            fechaInicio: reporteFinal.fechaInicio || null,
                            diagnostico: reporteFinal.reporteTienda || '',
                            descripcion: reporteFinal.descripcion || '',
                            materiales: combinedMateriales,
                            observaciones: reporteFinal.observaciones || '',
                            observacionesList: reporteFinal.observacionesList || [],
                            imagenes: {
                                antes: reporteFinal.imagenes?.antes || null,
                                durante: reporteFinal.imagenes?.durante || null,
                                despues: reporteFinal.imagenes?.despues || null,
                                extra: reporteFinal.imagenesObservacion || null
                            },
                            firmaEmpresa: reporteFinal.firmaEmpresa || null,
                            equipo: reporteFinal.involucraEquipo ? reporteFinal.equipoInfo : null,
                            refaccionesList: reporteFinal.refaccionesList || [],
                            isVisita: trabajo.tipo === 'Visita' || trabajo.originalTipo === 'Visita'
                        }, true) as any;
                    } else {
                        pdfFile = await generateMaintenanceReportPDF({
                            id: trabajo.id,
                            folio: dynamicFolio,
                            fecha: new Date().toLocaleDateString('es-MX'),
                            sucursal: trabajo.sucursal || '---',
                            encargado: trabajo.encargado || '---',
                            tecnico: trabajo.tecnico || 'Técnico',
                            diagnostico: trabajo.descripcion || 'Servicio solicitado.',
                            descripcion: notas || 'Mantenimiento preventivo/correctivo.',
                            materiales: '',
                            observaciones: '',
                            imagenes: {},
                            isVisita: true,
                            refaccionesList: []
                        }, true) as any;
                    }
                } catch (e) {
                    console.error("Error autogenerando PDF para cotizacion:", e);
                }
            }

            if (pdfFile) {
                formData.append('archivo', pdfFile);
            }

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
            // Notificar al Admin y al Técnico
            try {
                await createNotificacionByRole({
                    role: 'admin',
                    titulo: '📄 Cotización Aceptada',
                    mensaje: `El cliente/encargado aceptó la propuesta de presupuesto para "${trabajo.sucursal || 'la sucursal'}".`,
                    enlace: `/menu/trabajo-detalle/${trabajo.id}`
                });

                await createNotificacionByRole({
                    role: 'tecnico',
                    titulo: '🎉 Cotización Aceptada',
                    mensaje: `El cliente/encargado ha aceptado la propuesta de cotización para la sucursal "${trabajo.sucursal || ''}". Se te ha asignado como trabajo.`,
                    enlace: `/tecnico/trabajo-detalle/${trabajo.id}`
                });

                if (trabajo.trabajador_id) {
                    await createNotificacion({
                        user_id: trabajo.trabajador_id,
                        titulo: '🎉 Cotización Aceptada',
                        mensaje: `¡Se ha aceptado tu propuesta de cotización para la sucursal "${trabajo.sucursal || ''}"! El trabajo te ha sido asignado.`,
                        enlace: `/tecnico/trabajo-detalle/${trabajo.id}`
                    });
                }
            } catch (notiErr) {
                console.error("Error enviando notificación de cotización aceptada:", notiErr);
            }
            showAlert('Cotización Aceptada', 'Propuesta aceptada. Se ha notificado al técnico asignado.', 'success');
        } catch (error: any) {
            showAlert('Error', error.response?.data?.message || error.message, 'error');
        }
    };

    const handleClienteRechazarCotizacion = (cotizId: number) => {
        setQuoteToReject(cotizId);
        setRejectionReason("");
        setShowRejectionModal(true);
    };

    const handleTecnicoRechazarAsignacion = () => {
        setRejectionReason("");
        setRejectionMode("solicitud");
        setShowRejectionModal(true);
    };

    const handleSubmitRejection = async () => {
        if (!rejectionReason.trim() || !trabajo) {
            showAlert('Atención', 'Por favor ingresa un motivo para el rechazo.', 'warning');
            return;
        }

        try {
            if (rejectionMode === "solicitud") {
                const newState = (trabajo.tipo === "SOS" || trabajo.tipo === "Nueva Solicitud") ? "Solicitud" : "Cotización Aceptada";
                await updateEstadoTrabajo(trabajo.id, { estado: newState, tecnico: "Sin asignar" });
                
                await createNotificacionByRole({
                    role: 'admin',
                    titulo: '🚫 Asignación Rechazada',
                    mensaje: `El técnico ha rechazado el trabajo en "${trabajo.sucursal || 'Servicio'}". Motivo: ${rejectionReason}`,
                    enlace: `/menu/trabajo-detalle/${trabajo.id}`
                });

                if ((trabajo as any).clienteUserId) {
                    await createNotificacion({
                        user_id: (trabajo as any).clienteUserId,
                        titulo: '🚫 Técnico no disponible',
                        mensaje: `El técnico asignado no podrá atender la solicitud por el momento. Se asignará uno nuevo pronto.`,
                        enlace: `/encargado/trabajo-detalle/${trabajo.id}`
                    });
                }

                // Enviar al chat
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
                const token = localStorage.getItem('token');
                try {
                    await fetch(`${API_URL}/trabajos/${trabajo.id}/chat`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ message: `❌ ASIGNACIÓN RECHAZADA\nMotivo: ${rejectionReason}` })
                    });
                } catch (e) { console.error(e); }

                setTrabajo((prev: any) => prev ? { ...prev, estado: newState, tecnico: "Sin asignar" } : prev);
                setShowRejectionModal(false);
                setShowZoomModal(false); // Cierra también el de zoom si estaba abierto
                showAlert("Trabajo Rechazado", "Has rechazado el trabajo y se ha notificado al administrador.", "info");
                return;
            }

            // If the user is a technician rejecting a chat quote
            if (user?.role === 'tecnico' && rejectionMode === "cotizacion" && !quoteToReject) {
                await handleQuoteAction('reject', rejectionReason);
                return;
            }

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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            const token = localStorage.getItem('token');
            try {
                await fetch(`${API_URL}/trabajos/${trabajo.id}/chat`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: `MOTIVO DE RECHAZO: ${rejectionReason}` })
                });
            } catch (err) {
                console.error("Error al enviar mensaje de chat automático:", err);
            }

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

    const getMergedRefacciones = (tarea: SubTarea, refaccionesSource: any[]) => {
        let mergedRefaccionesList: any[] = [];
        if (tarea.quoteData?.conceptos || tarea.quoteData?.materiales) {
            if (tarea.quoteData.conceptos) {
                mergedRefaccionesList.push(...tarea.quoteData.conceptos.map((c: any) => ({
                    pieza: c.descripcion,
                    cantidad: c.cantidad || 1,
                    costo_estimado: c.precio || 0
                })));
            }
            if (tarea.quoteData.materiales) {
                mergedRefaccionesList.push(...tarea.quoteData.materiales.map((m: any) => ({
                    pieza: m.nombre || m.material,
                    cantidad: m.cantidad || 1,
                    costo_estimado: m.precio || 0
                })));
            }
        } else {
            mergedRefaccionesList = refaccionesSource || [];
        }
        return mergedRefaccionesList;
    };

    const renderTaskCard = (tarea: SubTarea, isInteractive: boolean = true) => {
        const taskReportRaw = localStorage.getItem(`report_data_${tarea.id}`) || localStorage.getItem(`report_data_temporal_${tarea.id}`);
        const taskReport = taskReportRaw ? JSON.parse(taskReportRaw) : null;

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
                        id: taskReport?.dbId || taskReport?.id || tarea.id || 'SD',
                        reporteTienda: taskReport?.reporteTienda || tarea.titulo,
                        descripcion: taskReport?.descripcion || tarea.cleanDescripcion || tarea.descripcion,
                        materiales: taskReport?.materiales || combinedMateriales,
                        refaccionesList: taskReport?.refaccionesList || refaccionesList,
                        observaciones: taskReport?.observaciones || '',
                        imagenes: taskReport?.imagenes || {
                            antes: tarea.photos?.[0] || null,
                            durante: tarea.photos?.[1] || null,
                            despues: tarea.photos?.[2] || null
                        },
                        imagenObservacion: taskReport?.imagenObservacion || tarea.photos?.[3] || null,
                        imagenesObservacion: taskReport?.imagenesObservacion || (taskReport?.imagenObservacion ? [taskReport.imagenObservacion] : (tarea.photos?.[3] ? [tarea.photos[3]] : [])),
                        firmaEmpresa: taskReport?.firmaEmpresa || null,
                        involucraEquipo: taskReport ? !!taskReport.involucraEquipo : (!!tarea.serviceData?.marca || !!tarea.serviceData?.modelo),
                        equipoInfo: taskReport ? taskReport.equipoInfo : ((tarea.serviceData?.marca || tarea.serviceData?.modelo) ? {
                            tipo: tarea.serviceData.tipoServicio || tarea.titulo,
                            marca: tarea.serviceData.marca || 'N/A',
                            modelo: tarea.serviceData.modelo || 'N/A',
                            piezas: tarea.serviceData.pieza || 'N/A',
                            garantia: tarea.serviceData.garantia || 'N/A'
                        } : null),
                        fecha: taskReport?.fecha || new Date().toLocaleDateString('es-MX'),
                        isVisita: trabajo?.tipo === 'Visita' || trabajo?.originalTipo === 'Visita' || !!tarea.hasQuote || !!taskReport?.isVisita || (trabajo?.estado !== 'Finalizado' && trabajo?.estado !== 'En Proceso')
                    };

                    setActivityPDFData(preparedData);
                    setShowActivityPDFPreview(true);
                }}
                className={`${styles.taskCard} ${tarea.estado === 'Nueva' ? styles.newTaskCard : styles.defaultTaskCard}`}
                style={{
                    cursor: taskReport ? 'pointer' : ((isInteractive && !canEdit) || (isInteractive && !isVisita) || (!isInteractive && activeTab === 'Cotización') ? 'pointer' : (isInteractive ? 'not-allowed' : 'default')),
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

                    {taskReport && (taskReport.imagenes?.antes || taskReport.imagenes?.durante || taskReport.imagenes?.despues || taskReport.imagenObservacion || (taskReport.imagenesObservacion && taskReport.imagenesObservacion.length > 0)) && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '10px' }}>
                            {taskReport.imagenes?.antes && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <img 
                                        src={taskReport.imagenes.antes} 
                                        alt="Antes" 
                                        onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(taskReport.imagenes.antes); }}
                                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.15s ease' }} 
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                    />
                                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Antes</span>
                                </div>
                            )}
                            {taskReport.imagenes?.durante && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <img 
                                        src={taskReport.imagenes.durante} 
                                        alt="Durante" 
                                        onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(taskReport.imagenes.durante); }}
                                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.15s ease' }} 
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                    />
                                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Durante</span>
                                </div>
                            )}
                            {taskReport.imagenes?.despues && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <img 
                                        src={taskReport.imagenes.despues} 
                                        alt="Después" 
                                        onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(taskReport.imagenes.despues); }}
                                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.15s ease' }} 
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                    />
                                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Después</span>
                                </div>
                            )}
                            {taskReport.imagenesObservacion && taskReport.imagenesObservacion.length > 0 ? (
                                taskReport.imagenesObservacion.map((img: string, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <img 
                                            src={img} 
                                            alt={`Extra ${idx + 1}`} 
                                            onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(img); }}
                                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.15s ease' }} 
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                        />
                                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Extra {idx + 1}</span>
                                    </div>
                                ))
                            ) : (
                                taskReport.imagenObservacion && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <img 
                                            src={taskReport.imagenObservacion} 
                                            alt="Extra" 
                                            onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(taskReport.imagenObservacion); }}
                                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.15s ease' }} 
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                        />
                                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Extra</span>
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {tarea.photos && tarea.photos.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '10px' }}>
                            {tarea.photos.map((url, idx) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <img 
                                        src={url} 
                                        alt={`Foto Actividad ${idx + 1}`} 
                                        onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(url); }}
                                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.15s ease' }} 
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                    />
                                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b' }}>Evidencia {idx + 1}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* BOTÓN DE ACCIÓN PARA TÉCNICO */}
                    {isInteractive && tarea.estado !== 'Completa' && user?.role === 'tecnico' && Boolean(trabajo?.visitado) && (
                        <div style={{ marginTop: '10px' }}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
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
                                📋 Iniciar Reporte de Trabajo
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

                <div className={styles.contentWrapper}>

                    <div className={styles.headerContainer}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div 
                                onClick={() => navigate(-1)} 
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '5px' }}
                                title="Volver atrás"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#1e293b" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                            </div>
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
                            if (estado === "Finalizado" || estado === "Completado") return 6;
                            if (estado === "En Proceso") {
                                // If they clicked "Iniciar Trabajo" (visitado is true), it's execution (5).
                                // If they clicked "Iniciar Visita" (visitado is false), it's still the visit phase (3).
                                return trabajo.visitado ? 5 : 3;
                            }
                            if (estado.includes("Cotización") || estado.includes("Cotizacion") || estado === "Pendiente de Cotizar") return 4;
                            if (subTareas.some(t => t.cotizacionEstado === 'Aprobada') || cotizaciones.some(c => c.estado === 'Aprobada') || estado === 'Cotización Aceptada' || estado === 'Cotización Aprobada') return 5;
                            if (trabajo.latitud_llegada && trabajo.longitud_llegada) return 3;
                            if (estado === "En Espera" || estado === "Asignado") return 2;
                            return 1; // Solicitud, Pendiente
                        };
                        const currentStep = getStepIndex(trabajo.estado);
                        const steps = [
                            { id: 1, label: "Solicitud", icon: "📋" },
                            { id: 2, label: "En Proceso", icon: "🤝" },
                            { id: 3, label: "Visita", icon: "📍" },
                            { id: 4, label: "Cotización", icon: "💲" },
                            { id: 5, label: "En Ejecución", icon: "🛠️" },
                            { id: 6, label: "Finalizado", icon: "✅" }
                        ];

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
                                {steps.map((step, index, arr) => {
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
                                    return tabName === 'Datos' || tabName === 'Historial' || tabName === 'Cotización';
                                }
                                if (trabajo.estado === "Finalizado") {
                                    return tabName === 'Datos' || tabName === 'Historial';
                                }
                                if (tabName === 'Cotización') {
                                    return true;
                                }
                                if (tabName === 'Registro') {
                                    const cotizacionYaEnviada = ['Cotización Enviada', 'Cotización Rechazada', 'Cotización Aceptada', 'Cotización Aprobada'].includes(trabajo?.estado) || cotizaciones.length > 0 || subTareas.some(t => t.esCotizacion);
                                    if (cotizacionYaEnviada) return false;
                                    return trabajo.tipo === 'Visita';
                                }
                                if (tabName === 'Trabajo') {
                                    return trabajo.tipo === 'Trabajo' || trabajo.tipo === 'SOS' || (trabajo.tipo === 'Visita' && trabajo.visitado);
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
                                    <span className={styles.tabText}>{tabName === 'Datos' ? 'Datos' : tabName}</span>

                                    {/* INDICADOR DE NOTIFICACIÓN (ROJO) PARA COTIZACIÓN PENDIENTE */}
                                    {tabName === 'Cotización' && (
                                        (trabajo?.visitado && cotizaciones.length === 0 && user?.role === 'admin') ||
                                        (user?.role === 'cliente' && cotizaciones.some(c => c.estado === 'Pendiente')) ||
                                        (user?.role === 'tecnico' && (trabajo?.estado === 'Cotización Rechazada' || (latestChatQuote && trabajo?.estado !== 'Trabajo' && trabajo?.estado !== 'Finalizado'))) ||
                                        (user?.role !== 'tecnico' && user?.role !== 'cliente' && trabajo?.estado === 'Cotización Enviada')
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
                            {/* BANNER 1: CONFIRMACIÓN DE FECHA Y HORA DE EJECUCIÓN (COTIZACIÓN ACEPTADA) */}
                            {['Cotización Aceptada', 'Cotización Aprobada', 'En Ejecución', 'En Proceso'].includes(trabajo.estado) && (
                                <div style={{
                                    gridColumn: 'span 12',
                                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                    border: '2px solid #10b981',
                                    borderRadius: '20px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.12)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ background: '#10b981', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                                                ✓
                                            </div>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#065f46' }}>
                                                    Cotización Aceptada — Confirmación de Ejecución de Trabajo
                                                </h4>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#047857' }}>
                                                    El trabajo ha sido confirmado para su ejecución por el técnico asignado.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {isEditingExecutionTime ? (
                                        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '14px', border: '1.5px solid #10b981', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    📅 Definir / Confirmar Horario de Ejecución
                                                </h4>
                                                <span style={{ fontSize: '11px', color: '#64748b' }}>Ingresa el día y la hora en que realizarás el trabajo.</span>
                                            </div>

                                            {/* AVISO DE ÚLTIMA MODIFICACIÓN PERMITIDA */}
                                            {execModCount > 0 && (
                                                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '18px' }}>⚠️</span>
                                                    <div>
                                                        <strong style={{ fontSize: '12px', color: '#92400e', display: 'block' }}>¡ÚLTIMA MODIFICACIÓN PERMITIDA!</strong>
                                                        <span style={{ fontSize: '11px', color: '#b45309' }}>
                                                            Solo dispones de esta modificación para corregir la fecha y hora de ejecución. Por favor verifica atentamente que los datos ingresados sean correctos antes de confirmar.
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Fecha de Ejecución *</label>
                                                    <input 
                                                        type="date" 
                                                        value={execFecha} 
                                                        onChange={e => setExecFecha(e.target.value)}
                                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc', fontWeight: '600', color: '#0f172a' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Hora Confirmada *</label>
                                                    <input 
                                                        type="time" 
                                                        value={execHora} 
                                                        onChange={e => setExecHora(e.target.value)}
                                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#f8fafc', fontWeight: '600', color: '#0f172a' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                                <button
                                                    onClick={() => setIsEditingExecutionTime(false)}
                                                    style={{ padding: '9px 16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSaveExecutionTime}
                                                    disabled={isSavingExecTime}
                                                    style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 3px 10px rgba(16, 185, 129, 0.25)', opacity: isSavingExecTime ? 0.7 : 1 }}
                                                >
                                                    {isSavingExecTime ? 'Guardando...' : '✓ Guardar y Confirmar Horario'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '24px', background: 'white', padding: '14px 18px', borderRadius: '14px', border: '1px solid #a7f3d0', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <div>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>📅 Fecha de Ejecución</span>
                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                                        {trabajo.fecha_programada ? (trabajo.fecha_programada.includes('-') ? trabajo.fecha_programada.split('-').reverse().join('/') : trabajo.fecha_programada) : trabajo.fecha}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>⏰ Hora Confirmada</span>
                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                                        {trabajo.horaAsignada || trabajo.hora_programada || '09:00 AM'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>👷 Técnico Asignado</span>
                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>
                                                        {trabajo.tecnico || 'Técnico de Servicio'}
                                                    </span>
                                                </div>
                                            </div>
                                            {user?.role === 'tecnico' && (
                                                execModCount >= 2 ? (
                                                    <span style={{ padding: '6px 12px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        🔒 Horario Definitivo Confirmado
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setExecFecha(trabajo.fecha_programada || new Date().toISOString().split('T')[0]);
                                                            setExecHora(trabajo.horaAsignada || trabajo.hora_programada || '09:00');
                                                            setIsEditingExecutionTime(true);
                                                        }}
                                                        style={{ padding: '8px 14px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#d1fae5'}
                                                        onMouseLeave={e => e.currentTarget.style.background = '#ecfdf5'}
                                                    >
                                                        ✏️ Modificar / Confirmar Horario {execModCount > 0 ? '(1 cambio restante)' : ''}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* BANNER 2: REASIGNACIÓN DE TÉCNICO SOLICITADA */}
                            {(trabajo.estado === 'Reasignación Solicitada' || trabajo.motivo_reasignacion || localStorage.getItem(`reassign_reason_${trabajo.id}`)) && (
                                <div style={{
                                    gridColumn: 'span 12',
                                    background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                                    border: '2px solid #f43f5e',
                                    borderRadius: '20px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    boxShadow: '0 4px 16px rgba(244, 63, 94, 0.12)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ background: '#f43f5e', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                                                🚨
                                            </div>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#9f1239' }}>
                                                    Cambio de Técnico / Proveedor Solicitado
                                                </h4>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#be123c' }}>
                                                    Se ha retirado la asignación al técnico anterior. Se requiere asignar un nuevo proveedor.
                                                </p>
                                            </div>
                                        </div>
                                        {(user?.role === 'encargado' || user?.role === 'admin' || user?.role === 'autonomo' || user?.role === 'cliente') && (
                                            <button
                                                onClick={handleOpenAssignModal}
                                                style={{
                                                    padding: '10px 18px',
                                                    background: 'linear-gradient(135deg, #e11d48, #be123c)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    fontSize: '13px',
                                                    fontWeight: '800',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    boxShadow: '0 3px 10px rgba(225, 29, 72, 0.25)'
                                                }}
                                            >
                                                👤 Reasignar a Nuevo Técnico
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ background: 'white', padding: '12px 18px', borderRadius: '14px', border: '1px solid #fecdd3' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#9f1239', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>💬 Motivo de la Solicitud</span>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>
                                            "{trabajo.motivo_reasignacion || localStorage.getItem(`reassign_reason_${trabajo.id}`)}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Card 1: Información General (8/12) */}
                            <div className={`${styles.bentoCard} ${styles.colSpan8}`}>
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
                                             <span style={{ fontSize: '13px', color: '#059669', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                 📅 Cita solicitada: {trabajo.fecha_programada ? (trabajo.fecha_programada.includes('-') ? trabajo.fecha_programada.split('-').reverse().join('/') : trabajo.fecha_programada) : trabajo.fecha}
                                             </span>
                                             {trabajo.latitud_llegada && user?.role !== 'tecnico' &&
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

                                    {(trabajo.descripcion || parseFotoUrls(trabajo.foto_url).length > 0) && (
                                        <div 
                                            className={styles.descriptionBox}
                                            style={{ cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
                                            title="Haz clic para ver más detalles"
                                            onClick={() => setShowZoomModal(true)}
                                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.05)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                        >
                                            <div style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.5 }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                </svg>
                                            </div>
                                            {trabajo.descripcion && (
                                                <>
                                                    <span className={styles.bentoLabel} style={{ marginBottom: '4px', color: '#334155' }}>Problema Reportado</span>
                                                    <p className={styles.descriptionQuote}>"{trabajo.descripcion}"</p>
                                                </>
                                            )}
                                            {parseFotoUrls(trabajo.foto_url).length > 0 && (
                                                <div style={{ marginTop: '10px' }}>
                                                    <span className={styles.bentoLabel} style={{ marginBottom: '6px', color: '#334155', display: 'block' }}>Fotos Adjuntas ({parseFotoUrls(trabajo.foto_url).length}):</span>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {parseFotoUrls(trabajo.foto_url).map((url, idx) => (
                                                            <img 
                                                                key={idx}
                                                                src={url} 
                                                                alt={`Evidencia ${idx + 1}`} 
                                                                onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(url); }}
                                                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.15s ease' }} 
                                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card 2: Estado Actual (4/12) */}
                            <div className={`${styles.bentoCard} ${styles.colSpan4}`}>
                                <div className={styles.cardHeader}>
                                    <div className={`${styles.iconBox} ${trabajo.estado === 'En Espera' ? styles.bgBlue : styles.bgOrange}`}>
                                        <HiOutlineClock size={18} />
                                    </div>
                                    <h3 className={styles.cardTitle}>Estado</h3>
                                </div>
                                <div className={styles.bentoContent} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '12px' }}>
                                    <span className={styles.bentoValue} style={{ color: trabajo.estado === 'En Espera' ? '#2563eb' : '#d97706', fontSize: '16px', textAlign: 'center' }}>
                                        {trabajo.estado === 'Asignado' && trabajo.tecnico && trabajo.tecnico !== "Sin asignar" 
                                            ? `Asignado a: ${trabajo.tecnico}` 
                                            : trabajo.estado === 'En Espera' && trabajo.tecnico && trabajo.tecnico !== "Sin asignar"
                                                ? `Aceptado por: ${trabajo.tecnico}`
                                                : trabajo.estado}
                                    </span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                                        Actividad: {trabajo.fecha}
                                    </span>

                                    {/* ALERTA Y BOTÓN DE RE-COTIZAR PARA EL TÉCNICO EN LA PESTAÑA DATOS */}
                                    {user?.role === 'tecnico' && trabajo.estado === 'Cotización Rechazada' && (
                                        <div style={{ marginTop: '12px', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a', textAlign: 'center' }}>
                                                <span style={{ color: '#b45309', fontSize: '12px', fontWeight: 'bold' }}>El encargado ha solicitado modificar la cotización.</span>
                                            </div>
                                            {(() => {
                                                const quoteTask = subTareas.find(t => t.quoteData) || subTareas[subTareas.length - 1];
                                                return quoteTask ? (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); openEditModal(e, quoteTask); }}
                                                        style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}
                                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                                    >
                                                        ✏️ Abrir Formulario de Cotización
                                                    </button>
                                                ) : null;
                                            })()}
                                        </div>
                                    )}

                                    {/* BOTÓN ACCIÓN — lógica diferente para SOS vs Normal */}
                                    {(user?.role === 'admin' || user?.role === 'autonomo') && trabajo.estado !== 'Finalizado' && (
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
                                            ) : (trabajo.estado === 'Cotización Aceptada' || trabajo.estado === 'Cotización Aprobada' || trabajo.estado === 'Asignado' || trabajo.estado === 'En Proceso') ? (
                                                <button
                                                    onClick={handleOpenAssignModal}
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
                                                    {trabajo.tecnico && trabajo.tecnico !== 'Sin asignar' && trabajo.tecnico !== 'Sin Asignar' ? `🚨 Técnico: ${trabajo.tecnico}` : '🚨 Asignar Técnico (Emergencia)'}
                                                </button>
                                            ) : null
                                        ) : (
                                            // FLUJO NORMAL: botón asignar siempre visible
                                            <button
                                                onClick={handleOpenAssignModal}
                                                style={{
                                                    marginTop: '8px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '10px 20px',
                                                    borderRadius: '25px',
                                                    fontSize: '13px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                                    whiteSpace: 'nowrap',
                                                    width: '100%',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                                                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                                            >
                                                {trabajo.tecnico && trabajo.tecnico !== 'Sin asignar' && trabajo.tecnico !== 'Sin Asignar' ? `👤 Técnico: ${trabajo.tecnico}` : '👤 Asignar Técnico'}
                                            </button>
                                        )
                                    )}

                                    {/* BOTONES PARA TÉCNICO: Aceptar, Rechazar, Empezar */}
                                    {user?.role === 'tecnico' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '12px' }}>
                                            {/* Una vez en espera (aceptado), puede iniciar Visita o Trabajo según el tipo */}
                                            {trabajo.estado === 'En Espera' && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                                    {trabajo.tipo === 'Visita' && !trabajo.visitado ? (
                                                        <button onClick={() => handleEmpezarTrabajoTipo('Visita')} style={{ padding: '12px 10px', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,41,59,0.2)', transition: 'all 0.2s ease' }} onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>📍 Iniciar Visita</button>
                                                    ) : (
                                                        <button onClick={() => handleEmpezarTrabajoTipo('Trabajo')} style={{ padding: '12px 10px', background: 'linear-gradient(135deg, #f26522 0%, #d14d13 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(242,101,34,0.25)', transition: 'all 0.2s ease' }} onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>🛠️ Iniciar Trabajo</button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Si la cotización fue aceptada, ahora debe iniciar el trabajo */}
                                            {(trabajo.estado === 'Cotización Aceptada' || trabajo.estado === 'Cotización Aprobada') && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                                    <button onClick={() => handleEmpezarTrabajoTipo('Trabajo')} style={{ padding: '12px 10px', background: 'linear-gradient(135deg, #f26522 0%, #d14d13 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(242,101,34,0.25)', transition: 'all 0.2s ease' }} onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>🛠️ Iniciar Trabajo</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>


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

                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
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
                                                            
                                                            {reporteFinal && (
                                                                <button 
                                                                    onClick={() => {
                                                                        setActivityPDFData(reporteFinal);
                                                                        setShowActivityPDFPreview(true);
                                                                    }}
                                                                    className={styles.attachmentLink}
                                                                    style={{ border: 'none', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', width: 'auto' }}
                                                                >
                                                                    <div className={styles.pdfIconBox} style={{ background: '#f26522' }}>
                                                                        <HiOutlineDocumentText size={20} color="white" />
                                                                    </div>
                                                                    <span style={{ color: '#1e293b', fontWeight: 'bold' }}>Ver Reporte de Visita / Cotización y Fotos</span>
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
                                {user?.role !== 'cliente' && (() => {
                                    const actualReporte = reporteFinal || (() => {
                                        const fallbackReportDataRaw = localStorage.getItem(`report_data_${trabajo?.id}`);
                                        const temporalReportDataRaw = localStorage.getItem(`report_data_temporal_${trabajo?.id}`);
                                        try {
                                            return fallbackReportDataRaw ? JSON.parse(fallbackReportDataRaw) : (temporalReportDataRaw ? JSON.parse(temporalReportDataRaw) : null);
                                        } catch (e) {
                                            return null;
                                        }
                                    })();

                                    const canEditCotizacion = user?.role === 'admin' || user?.role === 'autonomo' || user?.role === 'admin-autonomo' || user?.role === 'gerente-general';
                                    const showLeftColumn = cotizaciones.length > 0 || canEditCotizacion;

                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: showLeftColumn ? '1.1fr 0.9fr' : '1fr', gap: '30px', alignItems: 'start' }}>
                                            
                                            {/* COLUMNA IZQUIERDA: lista de cotizaciones y formulario */}
                                            {showLeftColumn && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                    {cotizaciones.length === 0 && !canEditCotizacion && (
                                                    <>
                                                        {user?.role === 'tecnico' && latestChatQuote && trabajo?.estado !== 'Trabajo' && trabajo?.estado !== 'Finalizado' ? (
                                                            <div style={{ background: '#fff', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '2px solid #fde68a' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                                                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <span style={{ fontSize: '24px' }}>💸</span>
                                                                    </div>
                                                                    <div>
                                                                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#92400e' }}>Propuesta de Monto Recibida</h3>
                                                                        <p style={{ margin: 0, color: '#b45309', fontSize: '13px', fontWeight: '600' }}>El administrador ha enviado una propuesta de pago para este trabajo.</p>
                                                                    </div>
                                                                </div>

                                                                <div style={{ background: '#fafafa', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#475569' }}>Monto Ofrecido:</span>
                                                                    <span style={{ fontSize: '28px', fontWeight: '900', color: '#10b981' }}>${latestChatQuote.quote_amount}</span>
                                                                </div>

                                                                <div style={{ display: 'flex', gap: '15px' }}>
                                                                    <button
                                                                        onClick={() => {
                                                                            setRejectionMode("cotizacion");
                                                                            setShowRejectionModal(true);
                                                                        }}
                                                                        style={{ flex: 1, padding: '14px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '14px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                                                    >
                                                                        <HiOutlineXCircle size={20} /> Rechazar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleQuoteAction('accept')}
                                                                        style={{ flex: 1.5, padding: '14px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                                                                    >
                                                                        <HiOutlineCheckCircle size={20} /> Aceptar y Comenzar Trabajo
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ background: '#fff', borderRadius: '24px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                                                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                                                    <HiOutlineDocumentText size={30} color="#94a3b8" />
                                                                </div>
                                                                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>Aún no hay propuestas oficiales</h3>
                                                                <p style={{ margin: 0, color: '#64748b', fontSize: '14px', maxWidth: '80%' }}>El Administrador o Técnico aún no han generado una cotización oficial para este trabajo. Puedes utilizar el chat flotante para comenzar a negociar los precios.</p>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {cotizaciones.length > 0 && (
                                                    <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #f8fafc' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>Cotizaciones Enviadas</h3>
                                                            <span style={{ background: '#ecfdf5', color: '#065f46', fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
                                                                {cotizaciones.length} cotizacion{cotizaciones.length !== 1 ? 'es' : ''}
                                                            </span>
                                                            {canEditCotizacion && (
                                                                <button
                                                                    onClick={() => { setShowAddQuoteForm(true); setCosto(''); setNotas(''); }}
                                                                    style={{ marginLeft: 'auto', padding: '7px 14px', background: 'linear-gradient(135deg, #f26522, #d14d13)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(242,101,34,0.3)', whiteSpace: 'nowrap' }}
                                                                >
                                                                    <HiOutlineCurrencyDollar size={14} /> + Agregar otra
                                                                </button>
                                                            )}
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
                                                                                        {canEditCotizacion && (
                                                                                            <>
                                                                                                <button onClick={() => handleEditarCotizacion(cotiz)} style={{ padding: '7px 12px', borderRadius: '10px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#475569' }}>✏️ Editar</button>
                                                                                                <button onClick={() => handleEliminarCotizacion(cotiz.id!)} style={{ padding: '7px 12px', borderRadius: '10px', background: '#fef2f2', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>🗑️</button>
                                                                                            </>
                                                                                        )}
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
                                                {(trabajo?.estado === 'Cotización Aceptada' || trabajo?.estado === 'Cotización Aprobada') && canEditCotizacion && (
                                                    <button onClick={handleOpenAssignModal}
                                                        style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                                                        <span style={{ fontSize: '18px' }}>✅</span> Asignar Trabajo al Técnico
                                                    </button>
                                                )}

                                                {/* BOTÓN PARA NUEVA COTIZACIÓN */}
                                                {!showAddQuoteForm ? (
                                                    canEditCotizacion && (
                                                        <button
                                                            onClick={() => setShowAddQuoteForm(true)}
                                                            style={{ width: '100%', padding: '20px', background: '#fff', border: '2px dashed #cbd5e1', borderRadius: '20px', color: '#64748b', fontSize: '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#1e293b'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                                                        >
                                                            <HiOutlineDocumentAdd size={24} color="#f26522" />
                                                            Elaborar Propuesta
                                                        </button>
                                                    )
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
                                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Notas para el cliente</label>
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
                                                            <button onClick={() => handleEnviarCotizacion('send')}
                                                                style={{ width: '100%', padding: '15.5px', background: 'linear-gradient(135deg, #f26522, #d14d13)', color: '#fff', border: 'none', borderRadius: '15px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(242,101,34,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                <span>Enviar Cotización al Cliente</span>
                                                            </button>

                                                            {(trabajo?.estado === 'Cotización Aceptada' || trabajo?.estado === 'Cotización Aprobada') && (
                                                                <button onClick={() => handleEnviarCotizacion('accept_and_assign')}
                                                                    style={{ width: '100%', padding: '15.5px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '15px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                    <span>Aceptar Cotización y Asignar Trabajo</span>
                                                                </button>
                                                            )}

                                                            <button onClick={() => setShowAddQuoteForm(false)}
                                                                style={{ width: '100%', padding: '15px', background: '#f8fafc', border: '2px solid #e2e8f0', color: '#64748b', borderRadius: '15px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            )}


                                            {/* COLUMNA DERECHA: Reporte, sugerencias y PDF del técnico */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                {/* Card 1: Reporte del Técnico se eliminó de la pestaña de cotización para evitar duplicidad e información amontonada */}

                                                {/* Card 2: Evidencia Fotográfica */}
                                                {actualReporte && (actualReporte.imagenes?.antes || actualReporte.imagenes?.durante || actualReporte.imagenes?.despues || actualReporte.imagenObservacion || (actualReporte.imagenesObservacion && actualReporte.imagenesObservacion.length > 0)) && (
                                                    <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                                            <span style={{ fontSize: '18px' }}>📷</span>
                                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>Evidencia Fotográfica</h3>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
                                                            {actualReporte.imagenes?.antes && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                                    <img src={actualReporte.imagenes.antes} alt="Antes" onClick={() => setSelectedZoomImage(actualReporte.imagenes.antes)} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'} />
                                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>Antes</span>
                                                                </div>
                                                            )}
                                                            {actualReporte.imagenes?.durante && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                                    <img src={actualReporte.imagenes.durante} alt="Durante" onClick={() => setSelectedZoomImage(actualReporte.imagenes.durante)} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'} />
                                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>Durante</span>
                                                                </div>
                                                            )}
                                                            {actualReporte.imagenes?.despues && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                                    <img src={actualReporte.imagenes.despues} alt="Después" onClick={() => setSelectedZoomImage(actualReporte.imagenes.despues)} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'} />
                                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>Después</span>
                                                                </div>
                                                            )}
                                                            {actualReporte.imagenesObservacion && actualReporte.imagenesObservacion.length > 0 ? (
                                                                actualReporte.imagenesObservacion.map((img: string, idx: number) => (
                                                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                                        <img src={img} alt={`Extra ${idx + 1}`} onClick={() => setSelectedZoomImage(img)} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'} />
                                                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>Extra {idx + 1}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                actualReporte.imagenObservacion && (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                                        <img src={actualReporte.imagenObservacion} alt="Extra" onClick={() => setSelectedZoomImage(actualReporte.imagenObservacion)} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'} />
                                                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>Extra</span>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Card 3: Sugerencias de Monto y Descargar PDF */}
                                                {(subTareas.some(t => t.esCotizacion) || actualReporte) && (
                                                    <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #fde68a' }}>
                                                        {subTareas.some(t => t.esCotizacion) && (
                                                            <div style={{ marginBottom: actualReporte ? '20px' : '0' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f26522' }} />
                                                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>Sugerencias de monto del técnico</span>
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                    {subTareas.filter(t => t.esCotizacion).map(tarea => {
                                                                        let refaccionesSource = tarea.refacciones;
                                                                        if (!refaccionesSource || refaccionesSource.length === 0) {
                                                                            const trRaw = localStorage.getItem(`report_data_${tarea.id}`);
                                                                            if (trRaw) {
                                                                                try {
                                                                                    const tr = JSON.parse(trRaw);
                                                                                    if (tr && tr.refaccionesList) {
                                                                                        refaccionesSource = tr.refaccionesList;
                                                                                    }
                                                                                } catch (e) {}
                                                                            }
                                                                        }
                                                                        const hasRefacciones = refaccionesSource && refaccionesSource.length > 0;
                                                                        const totalMontoRefacciones = hasRefacciones ? refaccionesSource!.reduce((sum: any, r: any) => sum + (Number(r.costo_estimado) || 0), 0) : 0;
                                                                        
                                                                        let calculatedTotal = 0;
                                                                        let hasCalculatedTotal = false;

                                                                        if (tarea.quoteData?.conceptos || tarea.quoteData?.materiales) {
                                                                            if (tarea.quoteData.conceptos) {
                                                                                calculatedTotal += tarea.quoteData.conceptos.reduce((sum: number, c: any) => sum + (Number(c.cantidad || 1) * Number(c.precio || 0)), 0);
                                                                                hasCalculatedTotal = true;
                                                                            }
                                                                            if (tarea.quoteData.materiales) {
                                                                                calculatedTotal += tarea.quoteData.materiales.reduce((sum: number, m: any) => sum + (Number(m.cantidad || 1) * Number(m.precio || 0)), 0);
                                                                                hasCalculatedTotal = true;
                                                                            }
                                                                        } else if (hasRefacciones) {
                                                                            calculatedTotal = totalMontoRefacciones;
                                                                            hasCalculatedTotal = true;
                                                                        }

                                                                        const showMonto = hasCalculatedTotal ? calculatedTotal.toLocaleString('es-MX') : (tarea.cotizacionMonto === 'Por Evaluar' ? 'Sin monto' : tarea.cotizacionMonto);

                                                                        return (
                                                                        <div key={tarea.id} style={{ background: '#fafafa', border: '1.5px solid #f1f5f9', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                                        {getAvatarForTech(tarea.tecnicoNombre || '') ? (
                                                                                            <img src={getAvatarForTech(tarea.tecnicoNombre || '') || undefined} alt="Tech" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                                        ) : (
                                                                                            <HiOutlineUser size={15} color="#64748b" />
                                                                                        )}
                                                                                    </div>
                                                                                    <div>
                                                                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{tarea.tecnicoNombre || 'Técnico'}</p>
                                                                                        <span style={{ display: 'inline-block', fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', marginTop: '2px' }}>{tarea.titulo}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {tarea.quoteData?.conceptos && tarea.quoteData.conceptos.length > 0 && (
                                                                                <div style={{ marginTop: '15px' }}>
                                                                                    <h4 style={{ color: '#d97706', fontSize: '15px', fontWeight: '800', borderBottom: '1px solid #d97706', paddingBottom: '5px', marginBottom: '15px', textTransform: 'uppercase' }}>1. Conceptos de Servicio</h4>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                                        {tarea.quoteData.conceptos.map((c: any, idx: number) => (
                                                                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                                                                                                    {c.descripcion}
                                                                                                </div>
                                                                                                <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#475569' }}>
                                                                                                    <div><strong>Cant:</strong> {c.cantidad || 1}</div>
                                                                                                    <div><strong>Precio:</strong> {c.precio ? `$${Number(c.precio).toLocaleString('es-MX')}` : '---'}</div>
                                                                                                    <div style={{ marginLeft: 'auto', fontWeight: 'bold', color: '#0f172a' }}>
                                                                                                        Importe: ${(Number(c.cantidad || 1) * Number(c.precio || 0)).toLocaleString('es-MX')}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {tarea.quoteData?.materiales && tarea.quoteData.materiales.length > 0 && (
                                                                                <div style={{ marginTop: '15px' }}>
                                                                                    <h4 style={{ color: '#d97706', fontSize: '15px', fontWeight: '800', borderBottom: '1px solid #d97706', paddingBottom: '5px', marginBottom: '15px', textTransform: 'uppercase' }}>2. Materiales</h4>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                                        {tarea.quoteData.materiales.map((m: any, idx: number) => (
                                                                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                                                                                                    {m.nombre}
                                                                                                </div>
                                                                                                <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#475569' }}>
                                                                                                    <div><strong>Cant:</strong> {m.cantidad || 1}</div>
                                                                                                    <div><strong>Precio:</strong> {m.precio ? `$${Number(m.precio).toLocaleString('es-MX')}` : '---'}</div>
                                                                                                    <div style={{ marginLeft: 'auto', fontWeight: 'bold', color: '#0f172a' }}>
                                                                                                        Importe: ${(Number(m.cantidad || 1) * Number(m.precio || 0)).toLocaleString('es-MX')}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Mostrar refacciones SOLO si NO es una cotización (para evitar 2 veces, ya que Cotización usa Materiales y Conceptos) */}
                                                                            {hasRefacciones && (!tarea.quoteData?.materiales || tarea.quoteData.materiales.length === 0) && (
                                                                                <div style={{ marginTop: '15px' }}>
                                                                                    <h4 style={{ color: '#64748b', fontSize: '14px', fontWeight: '800', borderBottom: '1px solid #cbd5e1', paddingBottom: '5px', marginBottom: '15px', textTransform: 'uppercase' }}>Detalle de Refacciones</h4>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                                        {refaccionesSource!.map((ref: any, idx: number) => (
                                                                                            <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', flex: 1 }}>{ref.pieza}</div>
                                                                                                <div style={{ fontSize: '12px', color: '#64748b' }}>Cant: {ref.cantidad || 1}</div>
                                                                                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>{ref.costo_estimado ? `$${Number(ref.costo_estimado).toLocaleString('es-MX')}` : '---'}</div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Comentarios del técnico */}
                                                                            {tarea.quoteData?.comentarios && (
                                                                                <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '10px 12px', border: '1px solid #fde68a', marginTop: '4px' }}>
                                                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Comentarios del Técnico</span>
                                                                                    <p style={{ margin: 0, fontSize: '13px', color: '#78350f' }}>{tarea.quoteData.comentarios}</p>
                                                                                </div>
                                                                            )}

                                                                            {/* MONTO TOTAL */}
                                                                            {showMonto !== 'Sin monto' && (
                                                                                <div style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)', border: '2px solid #f59e0b', borderRadius: '14px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>💰 Monto Total</span>
                                                                                    <span style={{ fontSize: '22px', fontWeight: '900', color: '#f26522' }}>${showMonto}</span>
                                                                                </div>
                                                                            )}

                                                                            {/* CHAT DE NEGOCIACIÓN EMBEBIDO EN LA CARD */}
                                                                            {trabajo && user?.role !== 'cliente' && (
                                                                                <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '2px dashed #e2e8f0' }}>
                                                                                    <NegotiationChatWidget 
                                                                                        trabajoId={trabajo.id} 
                                                                                        currentUser={user} 
                                                                                        inlineMode={true}
                                                                                    />
                                                                                </div>
                                                                            )}

                                                                            {/* Action buttons: PDF + Accept/Reject */}
                                                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                                                                {/* Download PDF */}
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setCotizacionPreviewData({
                                                                                            id: trabajo?.id || 'N/A',
                                                                                            fecha: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
                                                                                            sucursal: trabajo?.sucursal || 'N/A',
                                                                                            encargado: trabajo?.encargado || 'N/A',
                                                                                            tecnicoNombre: tarea.tecnicoNombre || trabajo?.tecnico || 'N/A',
                                                                                            tecnicoAvatar: getAvatarForTech(tarea.tecnicoNombre || trabajo?.tecnico || ''),
                                                                                            reporteTienda: tarea.descripcion || 'N/A',
                                                                                            descripcion: tarea.descripcion || 'N/A',
                                                                                            materiales: getMergedRefacciones(tarea, refaccionesSource || []).map((r: any) => `${r.cantidad || 1}x ${r.pieza}`).join(', ') || 'N/A',
                                                                                            observaciones: tarea.quoteData?.comentarios || 'Sin observaciones',
                                                                                            imagenes: {},
                                                                                            refaccionesList: getMergedRefacciones(tarea, refaccionesSource || []),
                                                                                            isVisita: true,
                                                                                            involucraEquipo: false,
                                                                                            equipoInfo: null,
                                                                                            firmaEmpresa: null,
                                                                                        });
                                                                                        setShowCotizacionPreview(true);
                                                                                    }}
                                                                                    style={{ flex: 1, padding: '10px 14px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                                                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                                                                >
                                                                                    <HiOutlineDocumentText size={14} /> Descargar PDF
                                                                                </button>

                                                                                {/* Accept/Reject only for encargado/cliente/admin */}
                                                                                {(user?.role === 'encargado' || user?.role === 'cliente' || user?.role === 'admin' || user?.role === 'autonomo') && tarea.cotizacionEstado !== 'Aprobada' && tarea.cotizacionEstado !== 'Rechazada' && (
                                                                                    <>
                                                                                        <button
                                                                                            onClick={async () => {
                                                                                                try {
                                                                                                    const targetTechName = tarea.tecnicoNombre || trabajo?.tecnico || subTareas[0]?.tecnicoNombre || 'Técnico';
                                                                                                    
                                                                                                    await updateTrabajo(trabajo!.id, {
                                                                                                        estado: 'Cotización Aceptada',
                                                                                                        tecnico: targetTechName
                                                                                                    });
                                                                                                    await updateEstadoTrabajo(trabajo!.id, { estado: 'Cotización Aceptada' });

                                                                                                     // Notificar al técnico
                                                                                                     try {
                                                                                                         await createNotificacionByRole({
                                                                                                             role: 'tecnico',
                                                                                                             titulo: '🎉 Cotización Aceptada',
                                                                                                             mensaje: `El encargado de la sucursal ${trabajo?.sucursal || ''} ha aceptado tu cotización. Se te ha asignado este trabajo para su ejecución.`,
                                                                                                             enlace: `/tecnico/trabajo-detalle/${trabajo!.id}`
                                                                                                         });

                                                                                                         if (trabajo?.trabajador_id) {
                                                                                                             await createNotificacion({
                                                                                                                 user_id: trabajo.trabajador_id,
                                                                                                                 titulo: '🎉 Cotización Aceptada',
                                                                                                                 mensaje: `¡Se ha aceptado tu cotización para la sucursal ${trabajo?.sucursal || ''}! Se te ha asignado oficialmente el trabajo.`,
                                                                                                                 enlace: `/tecnico/trabajo-detalle/${trabajo!.id}`
                                                                                                             });
                                                                                                         }
                                                                                                     } catch (notiErr) {
                                                                                                         console.error("Error enviando notificación al técnico:", notiErr);
                                                                                                     }

                                                                                                    setSubTareas(prev => prev.map(t => t.id === tarea.id ? { ...t, cotizacionEstado: 'Aprobada' as any } : t));
                                                                                                    setTrabajo(prev => prev ? {
                                                                                                        ...prev,
                                                                                                        estado: 'Cotización Aceptada',
                                                                                                        tecnico: targetTechName
                                                                                                    } : prev);

                                                                                                    if (activeTab === 'Registro') {
                                                                                                        setActiveTab('Datos');
                                                                                                    }

                                                                                                    showAlert('Cotización Aceptada', `Has aceptado la cotización de ${targetTechName} por $${showMonto}. Se ha asignado automáticamente al técnico y verificado la fecha de ejecución.`, 'success');
                                                                                                } catch (error) {
                                                                                                    showAlert('Error', 'Hubo un problema al actualizar el estado del trabajo.', 'error');
                                                                                                }
                                                                                            }}
                                                                                            style={{ flex: 1, padding: '10px 14px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                                                                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                                                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                                                                        >
                                                                                            ✓ Aceptar
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={async () => {
                                                                                                try {
                                                                                                    const currentEvidence = {
                                                                                                        id: Date.now(),
                                                                                                        version: quoteHistory.length + 1,
                                                                                                        fecha: new Date().toLocaleString('es-MX'),
                                                                                                        tecnicoNombre: tarea.tecnicoNombre || trabajo?.tecnico || 'Técnico',
                                                                                                        quoteData: tarea.quoteData || null,
                                                                                                        refacciones: tarea.refacciones || null,
                                                                                                        comentarios: tarea.cotizacionNotas || '',
                                                                                                        monto: showMonto
                                                                                                    };
                                                                                                    const updatedHistory = [currentEvidence, ...quoteHistory];
                                                                                                    setQuoteHistory(updatedHistory);
                                                                                                    if (trabajo?.id) {
                                                                                                        // Guardar en localStorage como caché local
                                                                                                        localStorage.setItem(`quote_history_${trabajo.id}`, JSON.stringify(updatedHistory));
                                                                                                        // Guardar en backend (en el campo descripcion de la cotización más reciente)
                                                                                                        const HISTORY_MARKER = '|||QUOTE_HISTORY|||';
                                                                                                        const historyPayload = JSON.stringify(updatedHistory);
                                                                                                        const cotizacionActual = cotizaciones.length > 0 ? cotizaciones[0] : null;
                                                                                                        if (cotizacionActual?.id) {
                                                                                                            try {
                                                                                                                // Limpiar descripcion anterior de marcadores de historial y agregar el nuevo
                                                                                                                const baseDesc = (cotizacionActual.descripcion || '').split(HISTORY_MARKER)[0].trimEnd();
                                                                                                                await updateCotizacion(cotizacionActual.id, {
                                                                                                                    descripcion: `${baseDesc}\n${HISTORY_MARKER} ${historyPayload}`,
                                                                                                                    monto: cotizacionActual.monto
                                                                                                                });
                                                                                                            } catch (saveErr) {
                                                                                                                console.warn('No se pudo guardar historial en backend, solo en localStorage', saveErr);
                                                                                                            }
                                                                                                        }
                                                                                                    }

                                                                                                    await updateEstadoTrabajo(trabajo!.id, { estado: 'Cotización Rechazada' });
                                                                                                    setSubTareas(prev => prev.map(t => t.id === tarea.id ? { ...t, cotizacionEstado: 'Rechazada' as any } : t));
                                                                                                    setTrabajo(prev => prev ? { ...prev, estado: 'Cotización Rechazada' } : prev);
                                                                                                    showAlert('Re-Cotización Solicitada', `Has devuelto la cotización a ${tarea.tecnicoNombre || 'el técnico'} para que la modifique.`, 'warning');
                                                                                                } catch (error) {
                                                                                                    showAlert('Error', 'Hubo un problema al actualizar el estado.', 'error');
                                                                                                }
                                                                                            }}
                                                                                            style={{ padding: '10px 14px', background: '#fff', color: '#f59e0b', border: '1.5px solid #fcd34d', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                                                                            onMouseEnter={e => { e.currentTarget.style.background = '#fef3c7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                                                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'none'; }}
                                                                                        >
                                                                                            🔁 Re Cotizar
                                                                                        </button>
                                                                                    </>
                                                                                )}
                                                                            </div>

                                                                            {/* Status badge if already accepted/rejected */}
                                                                            {(tarea.cotizacionEstado === 'Aprobada' || tarea.cotizacionEstado === 'Rechazada') && (
                                                                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                                                                                    <span style={{
                                                                                        padding: '6px 16px',
                                                                                        borderRadius: '20px',
                                                                                        fontSize: '12px',
                                                                                        fontWeight: '800',
                                                                                        background: tarea.cotizacionEstado === 'Aprobada' ? '#dcfce7' : '#fef2f2',
                                                                                        color: tarea.cotizacionEstado === 'Aprobada' ? '#166534' : '#991b1b',
                                                                                        border: `1px solid ${tarea.cotizacionEstado === 'Aprobada' ? '#86efac' : '#fca5a5'}`
                                                                                    }}>
                                                                                        {tarea.cotizacionEstado === 'Aprobada' ? '✓ Cotización Aceptada' : '✕ Cotización Rechazada'}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )})}
                                                                </div>

                                                                {/* PESTAÑA DESPLEGABLE DE EVIDENCIA DE COTIZACIONES ANTERIORES */}
                                                                {quoteHistory.length > 0 && (
                                                                    <div style={{ marginTop: '20px', borderTop: '2px dashed #e2e8f0', paddingTop: '16px' }}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowHistoryDropdown(prev => !prev)}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '12px 18px',
                                                                                background: 'linear-gradient(135deg, #fff8f0 0%, #fef3c7 100%)',
                                                                                border: '1.5px solid #fcd34d',
                                                                                borderRadius: '14px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'space-between',
                                                                                cursor: 'pointer',
                                                                                transition: 'all 0.2s ease',
                                                                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.12)'
                                                                            }}
                                                                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                <span style={{ fontSize: '18px' }}>📜</span>
                                                                                <div style={{ textAlign: 'left' }}>
                                                                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#92400e', display: 'block' }}>
                                                                                        Evidencia de Cotizaciones Anteriores (Historial)
                                                                                    </span>
                                                                                    <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '600' }}>
                                                                                        {quoteHistory.length} {quoteHistory.length === 1 ? 'versión previa guardada' : 'versiones previas guardadas'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                <span style={{ background: '#d97706', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px' }}>
                                                                                    {showHistoryDropdown ? '▲ Ocultar' : '▼ Ver Evidencia'}
                                                                                </span>
                                                                            </div>
                                                                        </button>

                                                                        {showHistoryDropdown && (
                                                                            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                                                {quoteHistory.map((item: any, idx: number) => (
                                                                                    <div 
                                                                                        key={item.id || idx} 
                                                                                        style={{ 
                                                                                            background: '#fafafa', 
                                                                                            border: '1.5px solid #fde68a', 
                                                                                            borderRadius: '14px', 
                                                                                            padding: '16px', 
                                                                                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
                                                                                        }}
                                                                                    >
                                                                                        {/* Header of evidence card */}
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fef3c7', paddingBottom: '10px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                                                                            <div>
                                                                                                <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', display: 'inline-block', marginBottom: '4px' }}>
                                                                                                    📋 Cotización Versión {item.version || (quoteHistory.length - idx)} (Evidencia)
                                                                                                </span>
                                                                                                <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                                                                                                    Técnico: {item.tecnicoNombre} • <span style={{ color: '#94a3b8' }}>{item.fecha}</span>
                                                                                                </p>
                                                                                            </div>
                                                                                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', padding: '4px 12px', borderRadius: '12px' }}>
                                                                                                🚫 Re-cotización Solicitada
                                                                                            </span>
                                                                                        </div>

                                                                                        {/* Conceptos */}
                                                                                        {item.quoteData?.conceptos && item.quoteData.conceptos.length > 0 && (
                                                                                            <div style={{ marginBottom: '12px' }}>
                                                                                                <h4 style={{ color: '#d97706', fontSize: '13px', fontWeight: '800', borderBottom: '1px solid #fde68a', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>1. Conceptos de Servicio</h4>
                                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                                                    {item.quoteData.conceptos.map((c: any, cIdx: number) => (
                                                                                                        <div key={cIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155' }}>
                                                                                                            <span>{c.descripcion} (x{c.cantidad || 1})</span>
                                                                                                            <strong style={{ color: '#0f172a' }}>${(Number(c.cantidad || 1) * Number(c.precio || 0)).toLocaleString('es-MX')}</strong>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Materiales */}
                                                                                        {item.quoteData?.materiales && item.quoteData.materiales.length > 0 && (
                                                                                            <div style={{ marginBottom: '12px' }}>
                                                                                                <h4 style={{ color: '#d97706', fontSize: '13px', fontWeight: '800', borderBottom: '1px solid #fde68a', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>2. Materiales</h4>
                                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                                                    {item.quoteData.materiales.map((m: any, mIdx: number) => (
                                                                                                        <div key={mIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155' }}>
                                                                                                            <span>{m.nombre} (x{m.cantidad || 1})</span>
                                                                                                            <strong style={{ color: '#0f172a' }}>${(Number(m.cantidad || 1) * Number(m.precio || 0)).toLocaleString('es-MX')}</strong>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Refacciones if present */}
                                                                                        {item.refacciones && item.refacciones.length > 0 && (!item.quoteData?.materiales || item.quoteData.materiales.length === 0) && (
                                                                                            <div style={{ marginBottom: '12px' }}>
                                                                                                <h4 style={{ color: '#64748b', fontSize: '13px', fontWeight: '800', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>Detalle de Refacciones</h4>
                                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                                                    {item.refacciones.map((r: any, rIdx: number) => (
                                                                                                        <div key={rIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155' }}>
                                                                                                            <span>{r.pieza} (x{r.cantidad || 1})</span>
                                                                                                            <strong style={{ color: '#0f172a' }}>{r.costo_estimado ? `$${Number(r.costo_estimado).toLocaleString('es-MX')}` : '---'}</strong>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Comentarios */}
                                                                                        {item.comentarios && (
                                                                                            <div style={{ background: '#fffbeb', borderRadius: '8px', padding: '8px 12px', border: '1px solid #fde68a', marginBottom: '10px' }}>
                                                                                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Comentarios del Técnico</span>
                                                                                                <p style={{ margin: 0, fontSize: '12px', color: '#78350f' }}>{item.comentarios}</p>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Monto Total Evidencia */}
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #f59e0b' }}>
                                                                                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase' }}>💰 Monto Total (Evidencia)</span>
                                                                                            <span style={{ fontSize: '18px', fontWeight: '900', color: '#f26522' }}>${item.monto}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {actualReporte && (
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        let updatedRefacciones: any[] = [];
                                                                        subTareas.forEach((st: any) => {
                                                                            if (st.quoteData?.conceptos && st.quoteData.conceptos.length > 0) {
                                                                                st.quoteData.conceptos.forEach((c: any) => {
                                                                                    updatedRefacciones.push({
                                                                                        pieza: c.descripcion,
                                                                                        cantidad: Number(c.cantidad || 1),
                                                                                        costo_estimado: Number(c.precio || 0).toString()
                                                                                    });
                                                                                });
                                                                            }
                                                                            if (st.quoteData?.materiales && st.quoteData.materiales.length > 0) {
                                                                                st.quoteData.materiales.forEach((m: any) => {
                                                                                    updatedRefacciones.push({
                                                                                        pieza: m.nombre,
                                                                                        cantidad: Number(m.cantidad || 1),
                                                                                        costo_estimado: Number(m.precio || 0).toString()
                                                                                    });
                                                                                });
                                                                            }
                                                                            if (updatedRefacciones.length === 0 && st.refacciones && st.refacciones.length > 0) {
                                                                                st.refacciones.forEach((r: any) => {
                                                                                    updatedRefacciones.push({
                                                                                        pieza: r.pieza,
                                                                                        cantidad: r.cantidad || 1,
                                                                                        costo_estimado: r.costo_estimado
                                                                                    });
                                                                                });
                                                                            }
                                                                        });
                                                                        if (updatedRefacciones.length === 0 && actualReporte?.refaccionesList) {
                                                                            updatedRefacciones = actualReporte.refaccionesList;
                                                                        }

                                                                        await generateMaintenanceReportPDF({
                                                                            id: actualReporte.dbId || actualReporte.id || trabajo?.id || 'SD',
                                                                            fecha: actualReporte.fecha || new Date().toLocaleDateString(),
                                                                            sucursal: trabajo?.sucursal || 'N/A',
                                                                            encargado: trabajo?.encargado || 'N/A',
                                                                            tecnico: actualReporte.tecnicoNombre || trabajo?.tecnico || subTareas[0]?.tecnicoNombre || 'N/A',
                                                                            tecnicoAvatar: actualReporte.tecnicoAvatar || getAvatarForTech(actualReporte.tecnicoNombre || trabajo?.tecnico || subTareas[0]?.tecnicoNombre || ''),
                                                                            fechaInicio: actualReporte.fechaInicio || null,
                                                                            diagnostico: actualReporte.reporteTienda || 'N/A',
                                                                            descripcion: actualReporte.descripcion || 'N/A',
                                                                            materiales: actualReporte.materiales || 'N/A',
                                                                            observaciones: actualReporte.observaciones || 'N/A',
                                                                            observacionesList: actualReporte.observacionesList,
                                                                            imagenes: {
                                                                                antes: actualReporte.imagenes?.antes,
                                                                                durante: actualReporte.imagenes?.durante,
                                                                                despues: actualReporte.imagenes?.despues,
                                                                                extra: (actualReporte.imagenesObservacion && actualReporte.imagenesObservacion.length > 0)
                                                                                    ? actualReporte.imagenesObservacion
                                                                                    : actualReporte.imagenObservacion
                                                                            },
                                                                            firmaEmpresa: actualReporte.firmaEmpresa,
                                                                            equipo: actualReporte.involucraEquipo ? actualReporte.equipoInfo : (trabajo?.cotizacion ? {
                                                                                tipo: 'Servicio',
                                                                                marca: 'N/A',
                                                                                modelo: 'N/A'
                                                                            } : null),
                                                                            refaccionesList: updatedRefacciones,
                                                                            isVisita: true
                                                                        });
                                                                    } catch (err) {
                                                                        console.error("Error al descargar PDF del técnico:", err);
                                                                    }
                                                                }}
                                                                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
                                                            >
                                                                <HiOutlineDocumentText size={18} /> Descargar PDF del Técnico
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* BOTÓN DE ENVIAR AL ENCARGADO DE SUCURSAL PARA EL TÉCNICO */}
                                {user?.role === 'tecnico' && subTareas.length > 0 && (
                                    <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                                        {(['Cotización Enviada', 'Cotización Rechazada', 'Cotización Aceptada', 'Cotización Aprobada', 'Trabajo', 'Finalizado'].includes(trabajo?.estado || '') || trabajo?.visitado || subTareas.some(t => t.esCotizacion) || cotizaciones.length > 0) ? (
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

            {/* El Chat de Negociación ha sido eliminado por solicitud */}
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
                                        {(user?.role === 'tecnico' || user?.role === 'admin') && subTareas.length > 0 && subTareas.every(t => t.estado === 'Completa') && trabajo.estado !== 'Finalizado' && (
                                            <div style={{ marginTop: '30px', textAlign: 'center' }}>
                                                <button
                                                    onClick={handleFinishVisit}
                                                    style={{ background: '#333', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%', maxWidth: '400px' }}
                                                >
                                                    ✅ {trabajo.tipo === 'Visita' ? 'Enviar reporte de visita a Encargados' : 'Confirmar y Finalizar Trabajo'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Para trabajo normal (no SOS): solo muestra la lista existente */}
                                {!isSOS && (
                                    <div className={styles.taskList}>
                                        {subTareas.map(tarea => renderTaskCard(tarea, true))}
                                    </div>
                                )}
                                
                                {/* Si no hay subtareas en un trabajo normal o Visita, y el estado es En Proceso, 
                                    podemos mostrar la tarea virtual para que inicien el trabajo. */}
                                {subTareas.length === 0 && !isSOS && trabajo.estado !== 'Finalizado' && (() => {
                                    const tareaVirtual: SubTarea = {
                                        id: trabajo.id * -1,
                                        titulo: trabajo.titulo || 'Trabajo general',
                                        descripcion: trabajo.descripcion || 'Sin descripción',
                                        estado: 'Nueva',
                                        esCotizacion: false
                                    };
                                    return renderTaskCard(tareaVirtual, true);
                                })()}
                                
                                {/* Botón finalizar cuando ya hay reporte (aplica para no-SOS también) */}
                                {(user?.role === 'tecnico' || user?.role === 'admin') && subTareas.length > 0 && subTareas.every(t => t.estado === 'Completa') && trabajo.estado !== 'Finalizado' && !isSOS && (
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
                                {subTareas.length > 0 && (
                                    <div className={styles.taskList}>
                                        {subTareas.map(tarea => renderTaskCard(tarea, true))}
                                    </div>
                                )}

                                {/* BOTÓN DE ENVIAR AL ENCARGADO DE SUCURSAL PARA EL TÉCNICO */}
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
                            <h3 style={{ textAlign: 'center', marginBottom: '8px' }}>Asignar Tecnico</h3>

                            <p style={{ textAlign: 'center', color: '#059669', fontSize: '12px', fontWeight: 'bold', marginBottom: '25px', marginTop: 0 }}>
                                📅 Cita solicitada: {trabajo?.fecha_programada ? (trabajo.fecha_programada.includes('-') ? trabajo.fecha_programada.split('-').reverse().join('/') : trabajo.fecha_programada) : trabajo?.fecha}
                            </p>

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

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '14px' }}>Técnicos Disponibles</span>
                                <span 
                                    style={{ color: '#f26522', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                                    onClick={() => setIsTechRequestModalOpen(true)}
                                >
                                    ¿Necesitas técnicos?
                                </span>
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
            {/* MODAL SOLICITAR TÉCNICO */}
            {isTechRequestModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ maxWidth: '400px', background: 'white', borderRadius: '12px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Solicitar Técnico</h2>
                            <button 
                                onClick={() => setIsTechRequestModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>
                        <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
                            ¿Qué tipo de técnico necesitas? Enviaremos tu solicitud al administrador general.
                        </p>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Tipo de Técnico</label>
                            <input 
                                type="text"
                                placeholder="Ej: Plomero, Electricista..."
                                value={requestRole}
                                onChange={(e) => setRequestRole(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                            />
                        </div>

                        <div className={styles.formActions} style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setIsTechRequestModalOpen(false)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleTechRequest}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#f26522', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Enviar Solicitud
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL AGREGAR TAREA (NUEVO) */}
            {
                isAddModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent} style={{ width: isQuoteIncluded ? '800px' : '600px', maxWidth: '96vw', boxSizing: 'border-box', padding: '40px', borderRadius: '30px', maxHeight: '90vh', overflowY: 'auto', transition: 'width 0.3s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Registro de Actividad</h2>
                                <span style={{ color: '#888', fontWeight: 'bold', fontSize: '20px' }}>Visita</span>
                            </div>

                            {/* INFORMACION DE LA SOLICITUD DEL CLIENTE */}
                            {trabajo && (
                                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '20px', marginBottom: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>📋</span> Información de la Solicitud
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Servicio solicitado</span>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>{trabajo.titulo || trabajo.tipo || 'Servicio de Mantenimiento'}</span>
                                        </div>
                                        {trabajo.descripcion && (
                                            <div>
                                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Detalles / Notas del Cliente</span>
                                                <p style={{ fontSize: '12px', color: '#475569', margin: 0, whiteSpace: 'pre-wrap', fontStyle: 'italic', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                                    "{trabajo.descripcion}"
                                                </p>
                                            </div>
                                        )}
                                        {parseFotoUrls(trabajo.foto_url).length > 0 && (
                                            <div style={{ marginTop: '5px' }}>
                                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                                                    Fotos de Evidencia ({parseFotoUrls(trabajo.foto_url).length})
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {parseFotoUrls(trabajo.foto_url).map((url, idx) => (
                                                        <img 
                                                            key={idx}
                                                            src={url} 
                                                            alt={`Evidencia Solicitud ${idx + 1}`} 
                                                            onClick={() => setSelectedZoomImage(url)}
                                                            style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'transform 0.15s ease' }} 
                                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CONFIRMACIÓN DE LLEGADA AL SITIO */}
                            <div style={{ background: confirmacionLlegada ? '#ecfdf5' : '#fff', border: `2px solid ${confirmacionLlegada ? '#10b981' : '#e2e8f0'}`, borderRadius: '18px', padding: '20px', marginBottom: '25px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: confirmacionLlegada ? '0 4px 12px rgba(16, 185, 129, 0.1)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div 
                                        onClick={async () => {
                                            if (!confirmacionLlegada && !isLocating) {
                                                setIsLocating(true);
                                                
                                                const onSuccess = async (position: GeolocationPosition) => {
                                                    const lat = position.coords.latitude.toString();
                                                    const lng = position.coords.longitude.toString();
                                                    
                                                    setLatitudLlegada(lat);
                                                    setLongitudLlegada(lng);
                                                    
                                                    setConfirmacionLlegada(true);
                                                    setIsLocating(false);
                                                    
                                                    const now = new Date();
                                                    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString();
                                                    setHoraLlegada(timeString);
                                                    
                                                    try {
                                                        // Guardar de inmediato en la base de datos la ubicación
                                                        if (trabajo) {
                                                            localStorage.setItem(`gps_llegada_${trabajo.id}`, JSON.stringify({
                                                                coords: { lat: parseFloat(lat), lng: parseFloat(lng) },
                                                                at: now.toISOString()
                                                            }));

                                                            await updateEstadoTrabajo(trabajo.id, { 
                                                                estado: 'En Espera', // O el estado que corresponda, pero 'En Espera' si es llegada
                                                                hora_llegada: timeString,
                                                                latitud_llegada: lat,
                                                                longitud_llegada: lng
                                                            });
                                                        }

                                                        // Notificar al admin y admin autonomo
                                                        await createNotificacionByRole({
                                                            role: 'admin',
                                                            titulo: '📍 Técnico en sitio',
                                                            mensaje: `El técnico ${user?.name || 'Sistema'} ha confirmado su llegada a ${trabajo?.negocio?.nombre || 'la sucursal'} a las ${timeString}.`,
                                                            enlace: `/menu/trabajo-detalle/${trabajo?.id}`
                                                        });
                                                        
                                                        // Notificar al encargado y admin autonomo
                                                        if (trabajo?.negocio_id) {
                                                            const negocioRes = await getNegocio(trabajo.negocio_id);
                                                            const negocioData = negocioRes.data || negocioRes;
                                                            if (negocioData) {
                                                                try {
                                                                    await createNotificacionNegocio({
                                                                        negocio_id: trabajo.negocio_id,
                                                                        titulo: '📍 Técnico en sitio',
                                                                        mensaje: `El técnico ${user?.name || 'Sistema'} ha llegado a su sucursal a las ${timeString}.`,
                                                                    });
                                                                } catch (e) { console.error("Error notificando encargado:", e); }
                                                                
                                                                if (negocioData.admin_autonomo_id) {
                                                                    try {
                                                                        await createNotificacionEcosistema({
                                                                            admin_autonomo_id: negocioData.admin_autonomo_id,
                                                                            titulo: '📍 Técnico en sitio',
                                                                            mensaje: `El técnico ${user?.name || 'Sistema'} ha llegado a la sucursal ${negocioData.nombre} a las ${timeString}.`,
                                                                        });
                                                                    } catch (e) { console.error("Error notificando autonomo:", e); }
                                                                }
                                                            }
                                                        }
                                                    } catch (err) {
                                                        console.error("Error al notificar llegada:", err);
                                                    }
                                                };

                                                const onError = (error: GeolocationPositionError) => {
                                                    setIsLocating(false);
                                                    alert("No se pudo obtener tu ubicación. Por favor, asegúrate de haber dado los permisos en tu navegador/celular.");
                                                    console.error("Geolocation error:", error);
                                                };

                                                if (navigator.geolocation) {
                                                    navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
                                                } else {
                                                    setIsLocating(false);
                                                    alert("La geolocalización no es soportada por este navegador.");
                                                }
                                            }
                                        }}
                                        style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${confirmacionLlegada ? '#10b981' : (isLocating ? '#3b82f6' : '#cbd5e1')}`, background: confirmacionLlegada ? '#10b981' : (isLocating ? '#eff6ff' : '#f8fafc'), display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: (confirmacionLlegada || isLocating) ? 'default' : 'pointer', transition: 'all 0.2s ease' }}
                                    >
                                        {confirmacionLlegada && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 'bold', color: confirmacionLlegada ? '#065f46' : (isLocating ? '#1d4ed8' : '#334155') }}>
                                            Confirmación de Llegada
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '12px', color: confirmacionLlegada ? '#047857' : (isLocating ? '#2563eb' : '#64748b') }}>
                                            {isLocating ? '📍 Obteniendo ubicación GPS...' : (confirmacionLlegada ? `Llegada confirmada a las ${horaLlegada}` : 'Marca esta casilla al llegar al domicilio del cliente.')}
                                        </p>
                                    </div>
                                </div>
                                {confirmacionLlegada && (
                                    <div style={{ background: '#d1fae5', padding: '8px 12px', borderRadius: '10px', color: '#065f46', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📍 En sitio
                                    </div>
                                )}
                            </div>

                            <div style={{ border: '2px solid #e0e0e0', borderRadius: '20px', padding: '30px', opacity: confirmacionLlegada ? 1 : 0.5, pointerEvents: confirmacionLlegada ? 'auto' : 'none', transition: 'opacity 0.3s ease' }}>
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

                                {activeServiceType === 'Mantenimiento' && (
                                    <div style={{ marginTop: '20px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '10px' }}>Refacciones y Piezas (Historial de Equipo)</h4>
                                        {refacciones.map((ref, i) => (
                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                                {/* Fila 1: Nombre de la pieza */}
                                                <input
                                                    placeholder="Nombre de la pieza"
                                                    value={ref.pieza}
                                                    onChange={(e) => {
                                                        const newR = [...refacciones];
                                                        newR[i].pieza = e.target.value;
                                                        setRefacciones(newR);
                                                    }}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                />
                                                {/* Fila 2: Cantidad + Precio + Eliminar */}
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <input
                                                        type="number"
                                                        placeholder="Cant."
                                                        value={ref.cantidad}
                                                        onChange={(e) => {
                                                            const newR = [...refacciones];
                                                            newR[i].cantidad = Number(e.target.value);
                                                            setRefacciones(newR);
                                                        }}
                                                        style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', minWidth: 0 }}
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="$"
                                                        value={ref.costo_estimado || ""}
                                                        onChange={(e) => {
                                                            const newR = [...refacciones];
                                                            newR[i].costo_estimado = e.target.value;
                                                            setRefacciones(newR);
                                                        }}
                                                        style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', minWidth: 0 }}
                                                    />
                                                    <button
                                                        onClick={() => setRefacciones(refacciones.filter((_, idx) => idx !== i))}
                                                        style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '7px 13px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setRefacciones([...refacciones, { pieza: '', cantidad: 1 }])}
                                            style={{ background: 'transparent', color: '#f26522', border: '1px dashed #f26522', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', width: '100%', marginTop: '5px' }}
                                        >
                                            + Agregar Pieza/Refacción
                                        </button>
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
                                                                     id={`task-camera-uploader-${index}`}
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
                                                                     htmlFor={`task-camera-uploader-${index}`}
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
                                                                     id={`task-gallery-uploader-${index}`}
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
                                                                     htmlFor={`task-gallery-uploader-${index}`}
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
                                            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                {/* 1. CONCEPTOS DE SERVICIO */}
                                                <div>
                                                    <h4 style={{ color: '#d97706', fontSize: '15px', fontWeight: '800', borderBottom: '1px solid #d97706', paddingBottom: '5px', marginBottom: '15px', textTransform: 'uppercase' }}>1. Conceptos de Servicio</h4>
                                                    <div style={{ background: '#fff', borderRadius: '10px', padding: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                        {quoteConceptos.map((concepto, i) => (
                                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', display: 'block' }}>Descripción del Servicio</label>
                                                                    <input
                                                                        placeholder="Ej. Cambio de carbones a máquina..."
                                                                        value={concepto.descripcion}
                                                                        onChange={(e) => {
                                                                            const newC = [...quoteConceptos];
                                                                            newC[i].descripcion = e.target.value;
                                                                            setQuoteConceptos(newC);
                                                                        }}
                                                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                                    />
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', display: 'block' }}>Cant.</label>
                                                                        <input
                                                                            type="number"
                                                                            placeholder="1"
                                                                            value={concepto.cantidad}
                                                                            onChange={(e) => {
                                                                                const newC = [...quoteConceptos];
                                                                                newC[i].cantidad = e.target.value;
                                                                                setQuoteConceptos(newC);
                                                                            }}
                                                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                                        />
                                                                    </div>
                                                                    <div style={{ flex: 1 }}>
                                                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', display: 'block' }}>Precio U. ($)</label>
                                                                        <input
                                                                            type="number"
                                                                            placeholder="0.00"
                                                                            value={concepto.precio}
                                                                            onChange={(e) => {
                                                                                const newC = [...quoteConceptos];
                                                                                newC[i].precio = e.target.value;
                                                                                setQuoteConceptos(newC);
                                                                            }}
                                                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setQuoteConceptos(quoteConceptos.filter((_, idx) => idx !== i))}
                                                                        style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', width: '40px', height: '40px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                        title="Eliminar Concepto"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => setQuoteConceptos([...quoteConceptos, { descripcion: '', cantidad: '1', precio: '' }])}
                                                            style={{ background: '#f1f5f9', color: '#475569', border: '1px dashed #cbd5e1', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', width: '100%', boxSizing: 'border-box', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                                        >
                                                            + AGREGAR CONCEPTO
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 2. MATERIALES */}
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #d97706', paddingBottom: '5px', marginBottom: '15px', gap: '10px' }}>
                                                        <h4 style={{ color: '#d97706', fontSize: '15px', fontWeight: '800', margin: 0, textTransform: 'uppercase' }}>2. Materiales</h4>
                                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', background: '#fffbeb', padding: '2px 8px', borderRadius: '12px', border: '1px solid #fde68a' }}>(Opcional)</span>
                                                    </div>
                                                    <div style={{ background: '#fff', borderRadius: '10px', padding: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                        {quoteMateriales.map((mat, i) => (
                                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', display: 'block' }}>Nombre del Material</label>
                                                                    <input
                                                                        placeholder="Ej. Carbones..."
                                                                        value={mat.nombre}
                                                                        onChange={(e) => {
                                                                            const newM = [...quoteMateriales];
                                                                            newM[i].nombre = e.target.value;
                                                                            setQuoteMateriales(newM);
                                                                        }}
                                                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                                    />
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', display: 'block' }}>Cant.</label>
                                                                        <input
                                                                            type="number"
                                                                            placeholder="1"
                                                                            value={mat.cantidad}
                                                                            onChange={(e) => {
                                                                                const newM = [...quoteMateriales];
                                                                                newM[i].cantidad = e.target.value;
                                                                                setQuoteMateriales(newM);
                                                                            }}
                                                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                                        />
                                                                    </div>
                                                                    <div style={{ flex: 1 }}>
                                                                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px', display: 'block' }}>Costo U. ($)</label>
                                                                        <input
                                                                            type="number"
                                                                            placeholder="0.00"
                                                                            value={mat.precio}
                                                                            onChange={(e) => {
                                                                                const newM = [...quoteMateriales];
                                                                                newM[i].precio = e.target.value;
                                                                                setQuoteMateriales(newM);
                                                                            }}
                                                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setQuoteMateriales(quoteMateriales.filter((_, idx) => idx !== i))}
                                                                        style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', width: '40px', height: '40px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                        title="Eliminar Material"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => setQuoteMateriales([...quoteMateriales, { nombre: '', cantidad: '1', precio: '' }])}
                                                            style={{ background: '#f1f5f9', color: '#475569', border: '1px dashed #cbd5e1', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', width: '100%', boxSizing: 'border-box', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                                        >
                                                            + AGREGAR MATERIAL
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* COMENTARIOS INTERNOS */}
                                                <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '15px', border: '1px solid #fde68a' }}>
                                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#b45309', marginBottom: '8px' }}>COMENTARIOS INTERNOS (Solo Admin/Técnico):</label>
                                                    <textarea
                                                        value={quoteComentarios}
                                                        onChange={(e) => setQuoteComentarios(e.target.value)}
                                                        placeholder="Notas que el cliente NO verá..."
                                                        style={{ width: '100%', height: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #fcd34d', resize: 'none', background: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
                                                    />
                                                </div>

                                                {/* SUBTOTAL SUMMARY */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                                                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#64748b' }}>Subtotal (Servicios + Materiales):</span>
                                                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                                                        ${(
                                                            quoteConceptos.reduce((sum, c) => sum + (parseFloat(c.precio) || 0) * (parseFloat(c.cantidad) || 1), 0) +
                                                            quoteMateriales.reduce((sum, m) => sum + (parseFloat(m.precio) || 0) * (parseFloat(m.cantidad) || 1), 0)
                                                        ).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className={styles.modalActionsContainer}>
                                <button
                                    onClick={handleGeneratePreview}
                                    className={styles.btnSavePdf}
                                >
                                    Previsualizar PDF
                                </button>
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
                                        setQuoteConceptos([]); 
                                        setQuoteMateriales([]);
                                        setQuoteComentarios(""); 
                                        setNewQuoteFileName(""); 
                                        setActivityPhotos([]);
                                        setServiceMarca("");
                                        setServiceModelo("");
                                        setServicePieza("");
                                        setServiceGarantia("");
                                        setRefacciones([]);
                                        setConfirmacionLlegada(false);
                                        setHoraLlegada("");
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
                            style={{ position: 'absolute', top: '15px', right: '15px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }}
                        >
                            ✕
                        </button>
                        
                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '20px', width: '100%', textAlign: 'left' }}>Detalles de la Evidencia</h2>
                        
                        {trabajo?.descripcion && (
                            <div style={{ width: '100%', marginBottom: '24px' }}>
                                <span style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Problema Reportado</span>
                                <p style={{ fontSize: '18px', color: '#334155', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', margin: 0, lineHeight: '1.6' }}>"{trabajo.descripcion}"</p>
                            </div>
                        )}
                        
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', alignSelf: 'flex-start' }}>Foto Adjunta</span>
                            <img
                                src={selectedZoomImage}
                                alt="Zoomed Evidence"
                                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                            />
                        </div>
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
                                    {trabajo.clienteNombre && (
                                        <div className={styles.contactBlock} style={{ background: '#fffbeb', padding: '16px', borderRadius: '14px', border: '1px solid #fde68a' }}>
                                            <span className={styles.contactName} style={{ display: 'block', fontSize: '15px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>
                                                {trabajo.clienteNombre}
                                            </span>
                                            <span className={styles.bentoLabel} style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#d97706', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                Cliente Solicitante
                                            </span>
                                            {trabajo.clienteEmail && (
                                                <span style={{ display: 'block', fontSize: '13px', color: '#475569', marginBottom: '12px', fontWeight: '600' }}>
                                                    ✉️ {trabajo.clienteEmail}
                                                </span>
                                            )}
                                            {trabajo.clienteTelefono && (
                                                <div className={styles.contactActions} style={{ display: 'flex', gap: '10px' }}>
                                                    <a href={`tel:${trabajo.clienteTelefono}`} className={styles.actionIconLink} title="Llamar" style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '10px', display: 'flex' }}>
                                                        <HiOutlinePhone size={20} />
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/52${trabajo.clienteTelefono.replace(/\D/g, '')}`}
                                                        target="_blank" rel="noreferrer" className={styles.actionIconLink}
                                                        style={{ background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', padding: '10px', borderRadius: '10px', display: 'flex' }}
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <HiOutlineChatBubbleLeftRight size={20} />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}

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

            {/* MODAL: DETALLES DEL PROBLEMA REPORTADO (Zoom y Botones de Aceptar/Rechazar) */}
            {showZoomModal && trabajo && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '35px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <button onClick={() => setShowZoomModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s', zIndex: 10 }} onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
                                <HiOutlineXMark size={24} strokeWidth={2.5} style={{ stroke: 'currentColor' }} />
                            </span>
                        </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                            <div style={{ background: '#fff1f2', padding: '10px', borderRadius: '12px', color: '#e11d48' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Detalles del Problema</h2>
                        </div>

                        {trabajo.descripcion && (
                            <div style={{ marginBottom: '25px' }}>
                                <span style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Descripción Reportada</span>
                                <p style={{ fontSize: '16px', color: '#334155', lineHeight: '1.6', margin: 0, padding: '16px', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>"{trabajo.descripcion}"</p>
                            </div>
                        )}

                        {parseFotoUrls(trabajo.foto_url).length > 0 && (
                            <div style={{ marginBottom: '30px' }}>
                                <span style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Fotos de Evidencia ({parseFotoUrls(trabajo.foto_url).length})</span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                                    {parseFotoUrls(trabajo.foto_url).map((url, idx) => (
                                        <div key={idx} style={{ position: 'relative', paddingTop: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'zoom-in' }} onClick={(e) => { e.stopPropagation(); setSelectedZoomImage(url); }}>
                                            <img src={url} alt={`Evidencia ${idx+1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* BOTONES PARA TÉCNICO: Aceptar, Rechazar dentro del modal */}
                        {user?.role === 'tecnico' && ['Asignado', 'Solicitud', 'Pendiente'].includes(trabajo?.estado || '') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '20px' }}>
                                <button 
                                    onClick={handleAceptarAsignacion} 
                                    style={{ padding: '14px 20px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)', transition: 'all 0.2s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                >
                                    ✅ Aceptar Asignación
                                </button>
                                <button 
                                    onClick={() => { setShowZoomModal(false); handleRechazarAsignacion(); }} 
                                    style={{ padding: '14px 20px', background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                >
                                    ❌ Rechazar Asignación
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL HORA ESTIMADA DE LLEGADA (TÉCNICO) */}
            {showHoraLlegadaModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '35px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <h2 style={{ margin: '0 0 15px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a', textAlign: 'center' }}>Hora de Llegada</h2>
                        <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', marginBottom: '25px' }}>Por favor indica a qué hora estimas llegar a la sucursal para que el encargado esté enterado.</p>
                        
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Hora Estimada (ej. 14:30)</label>
                            <input 
                                type="time" 
                                value={horaLlegada} 
                                onChange={e => setHoraLlegada(e.target.value)} 
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '16px', color: '#0f172a', outline: 'none', background: '#f8fafc' }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setShowHoraLlegadaModal(false)}
                                style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmHoraLlegada}
                                style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE MOTIVO DE RECHAZO */}
            {showRejectionModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 100000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#1e293b' }}>
                            {rejectionMode === "solicitud" ? "Rechazar Asignación" : "Rechazar Cotización"}
                        </h3>
                        <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#64748b' }}>
                            {rejectionMode === "solicitud" ? "Por favor, indica el motivo por el cual no puedes tomar este trabajo. Se notificará al gerente general." : "Por favor, indica el motivo del rechazo. El administrador será notificado."}
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Motivo del rechazo..."
                            style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', marginBottom: '20px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowRejectionModal(false)} style={{ padding: '8px 16px', border: 'none', background: '#f1f5f9', color: '#64748b', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                            <button onClick={handleSubmitRejection} style={{ padding: '8px 16px', border: 'none', background: '#ef4444', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Confirmar Rechazo</button>
                        </div>
                    </div>
                </div>
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
                    isVisita={trabajo?.tipo === 'Visita' || trabajo?.originalTipo === 'Visita' || activityPDFData.isVisita}
                    reporteData={activityPDFData}
                    onClose={() => {
                        setShowActivityPDFPreview(false);
                        setActivityPDFData(null);
                    }}
                />
            )}

            {/* WIDGET CHAT DE NEGOCIACIÓN PARA COTIZACIÓN ELIMINADO */}

            {/* MODAL UBICACIÓN GOOGLE MAPS */}
            {showMapModal && trabajo && trabajo.latitud_llegada && trabajo.longitud_llegada && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '800px', height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div style={{ padding: '20px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: '#d1fae5', padding: '8px', borderRadius: '10px', color: '#059669' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Ubicación de Llegada</h2>
                                    <span style={{ fontSize: '13px', color: '#64748b' }}>Técnico: {trabajo.tecnico && trabajo.tecnico !== 'Sin asignar' ? trabajo.tecnico : 'Desconocido'}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowMapModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                                <HiOutlineXMark size={24} strokeWidth={2.5} style={{ stroke: 'currentColor' }} />
                            </button>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <iframe 
                                width="100%" 
                                height="100%" 
                                style={{ border: 0 }} 
                                loading="lazy" 
                                allowFullScreen 
                                src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${trabajo.latitud_llegada},${trabajo.longitud_llegada}&zoom=17`}
                            ></iframe>
                        </div>
                        <div style={{ padding: '15px 25px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowMapModal(false)} style={{ padding: '10px 20px', borderRadius: '10px', background: '#f1f5f9', color: '#334155', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Cerrar Mapa</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PREVISUALIZACION DEL PDF COTIZACION */}
            {showCotizacionPreview && cotizacionPreviewData && (
                <ReportePDFPreview
                    trabajo={trabajo}
                    isVisita={true}
                    reporteData={cotizacionPreviewData}
                    onClose={() => setShowCotizacionPreview(false)}
                    onSendToAdminAutonomo={async () => {
                        try {
                            const pdfFile = await generateMaintenanceReportPDF(cotizacionPreviewData);
                            
                            // Calculate total amount from the preview data (cantidad × precio_unitario)
                            const totalAmount = (cotizacionPreviewData.refaccionesList || []).reduce((acc: number, ref: any) => {
                                const qty = Number(ref.cantidad || 1);
                                const unitPrice = parseFloat(ref.costo_estimado) || 0;
                                return acc + (qty * unitPrice);
                            }, 0);
                            
                            const formData = new FormData();
                            formData.append('trabajo_id', trabajo?.id.toString() || '');
                            formData.append('monto', totalAmount.toString());
                            formData.append('descripcion', 'Cotización generada a partir de sugerencia del técnico.');
                            if (pdfFile) {
                                formData.append('archivo', pdfFile);
                            }
                            
                            const savedCotiz = await saveCotizacion(formData as any);
                            setCotizaciones(prev => [...prev, savedCotiz]);
                            
                            if (trabajo?.admin_autonomo_id) {
                                await createNotificacionEcosistema({
                                    admin_autonomo_id: trabajo.admin_autonomo_id,
                                    titulo: '📄 Nueva Cotización',
                                    mensaje: `Se ha enviado una cotización sugerida para la sucursal ${trabajo.sucursal}.`,
                                });
                            }
                            
                            showAlert('Cotización Enviada', 'Se ha guardado la cotización y notificado al Admin Autónomo.', 'success');
                            setShowCotizacionPreview(false);
                        } catch (error) {
                            console.error("Error al enviar al admin autonomo:", error);
                            showAlert('Error', 'Hubo un problema al guardar la cotización.', 'error');
                        }
                    }}
                />
            )}

            {/* MODAL SOLICITAR CAMBIO DE PROVEEDOR / REASIGNAR */}
            {isReassignModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(15, 23, 42, 0.5)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '480px',
                        padding: '30px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                                🚨
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                                    Solicitar Cambio de Proveedor
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                    Retirar asignación a {trabajo?.tecnico || 'técnico actual'} y registrar motivo
                                </p>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Motivo / Comentarios del Cambio *
                            </label>
                            <textarea
                                rows={4}
                                value={reassignReason}
                                onChange={e => setReassignReason(e.target.value)}
                                placeholder="Describe los motivos por los cuales solicitas cambiar de técnico o proveedor..."
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #cbd5e1',
                                    fontSize: '14px',
                                    outline: 'none',
                                    resize: 'none',
                                    background: '#f8fafc',
                                    color: '#0f172a'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => { setIsReassignModalOpen(false); setReassignReason(""); }}
                                disabled={isSubmittingReassign}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReassignSubmit}
                                disabled={isSubmittingReassign}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
                                    opacity: isSubmittingReassign ? 0.7 : 1
                                }}
                            >
                                {isSubmittingReassign ? 'Procesando...' : 'Confirmar Cambio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDetalleTrabajo;

