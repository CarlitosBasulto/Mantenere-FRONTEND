import React, { useState, useEffect } from "react";
import { createTrabajo, getTrabajos, updateEstadoTrabajo, assignTrabajador, updateTrabajo } from "../../services/trabajosService";
import { createMantenimientoSolicitud, getMantenimientoSolicitudes } from "../../services/mantenimientoService";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import menuStyles from "../../components/Menu.module.css";
import styles from "./Trabajodetalles.module.css";
import tableroStyles from "../autonomo/AutonomoTablero.module.css";
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
import { HiX } from "react-icons/hi";
import { Pencil, MoveVertical } from 'lucide-react';
import ChatTrabajo from "../../components/ChatTrabajo";
import { isCardSeen, markCardAsSeen } from "../../utils/seenCards";
import AreaVisualGrid from '../../components/AreaVisualGrid';
import LevantamientoModal from "../../components/LevantamientoModal";
import ReportarProblemaModal from "../../components/ReportarProblemaModal";
import ModalSeleccionEquipo from "../../components/modals/ModalSeleccionEquipo";
import DetalleEquipoModal from "../../components/DetalleEquipoModal";
import HistorialEquipoModal from "../../components/modals/HistorialEquipoModal";
import DetalleReporteModal from "../../components/modals/DetalleReporteModal";
import ModalSeleccionEspacio from '../../components/ModalSeleccionEspacio';
import { HiOutlineBolt, HiOutlinePaperAirplane } from "react-icons/hi2";

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
    const { showAlert, showConfirm, showPrompt } = useModal();
    const [searchParams, setSearchParams] = useSearchParams();
    const isCotizacionesTab = searchParams.get('tab') === 'cotizaciones';
    const isHistorialTab = searchParams.get('tab') === 'historial';
    const isEquiposTab = searchParams.get('tab') === 'equipos';

    const canEdit = user?.role === 'cliente' || user?.role === 'encargado' || user?.role === 'autonomo';

    const [equiposSubTab, setEquiposSubTab] = useState<'registrados' | 'levantamiento'>('registrados');

    // Levantamiento state
    const [isLevantamientoModalOpen, setIsLevantamientoModalOpen] = useState(false);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [reportingEquipment, setReportingEquipment] = useState<any>(null);
    const [activeEquipmentId, setActiveEquipmentId] = useState<string | null>(null);
    
    // Grid Visual states
    const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
    const [isSubAreaModalOpen, setIsSubAreaModalOpen] = useState(false);
    const [activeAreaForSub, setActiveAreaForSub] = useState<string | null>(null);
    const [initialSubAreaId, setInitialSubAreaId] = useState<string | null>(null);

    // Bitacora (Historial) states
    const [bitacoraModalOpen, setBitacoraModalOpen] = useState(false);
    const [equipoSelectionMode, setEquipoSelectionMode] = useState<'bitacora' | 'reporte' | null>(null);
    const [equiposForSelection, setEquiposForSelection] = useState<any[]>([]);
    const [selectedEqForBitacora, setSelectedEqForBitacora] = useState<any>(null);
    const [selectedTrabajoIdForBitacora, setSelectedTrabajoIdForBitacora] = useState<number | null>(null);
    const [reporteModalOpenForBitacora, setReporteModalOpenForBitacora] = useState(false);

    // Obtener nombre del negocio desde localStorage
    const [businessName, setBusinessName] = useState("Cargando...");
    const [businessImage, setBusinessImage] = useState<string | null>(null);
    const [businessAreas, setBusinessAreas] = useState<any[]>([]);

    const [allSolicitudes, setAllSolicitudes] = useState<any[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!id) return;
            try {
                const solicitudesBackend = await getMantenimientoSolicitudes(Number(id));
                const mappedSolicitudes = solicitudesBackend.map((sol: any) => {
                    const mappedReportes: any[] = [];
                    [sol.visita_trabajo, sol.reparacion_trabajo].forEach(t => {
                        if (t?.reporte?.solucion) {
                            try {
                                const parsed = JSON.parse(t.reporte.solucion);
                                if (parsed.descripcion || parsed.reporteTienda) {
                                    mappedReportes.push({
                                        id: t.id,
                                        problema_cliente: parsed.reporteTienda || '—',
                                        trabajo_realizado: parsed.descripcion || '—',
                                        fecha: t.fecha_programada || new Date(t.created_at).toLocaleDateString(),
                                        tecnico: t.trabajador?.nombre || 'Técnico'
                                    });
                                }
                            } catch (e) { }
                        }
                    });
                    return {
                        id: sol.id,
                        levantamiento_equipo_id: sol.levantamiento_equipo_id,
                        descripcion_problema: sol.descripcion_problema,
                        fecha_creacion: new Date(sol.created_at).toLocaleDateString(),
                        reportes: mappedReportes
                    };
                });
                setAllSolicitudes(mappedSolicitudes);
            } catch (err) {
                console.error("Error loading maintenance history:", err);
            }
        };
        fetchHistory();
    }, [id]);

    const persistLevantamiento = async (newLevantamientoData: any[], showNotification: boolean = false) => {
        setBusinessAreas(newLevantamientoData);
        
        try {
            const finalLevantamiento = await Promise.all(newLevantamientoData.map(async (section) => {
                const finalEquipos = await Promise.all(section.equipos.map(async (eq: any) => {
                    let eqFoto = eq.foto;
                    let eqFotoPlaca = eq.fotoPlaca;
                    if (eq.fotoFile) {
                        try { eqFoto = await uploadImage(eq.fotoFile); } catch (ign) { }
                    }
                    if (eq.fotoPlacaFile) {
                        try { eqFotoPlaca = await uploadImage(eq.fotoPlacaFile); } catch (ign) { }
                    }
                    return { ...eq, foto: eqFoto, fotoPlaca: eqFotoPlaca, fotoFile: undefined, fotoPlacaFile: undefined };
                }));
                const cleanSubAreas = (section.subAreas || []).map((sub: any) => ({
                    ...sub,
                    equipos: []
                }));
                return { ...section, subAreas: cleanSubAreas, equipos: finalEquipos };
            }));

            const existing = await getNegocio(Number(id));
            const apiPayload: any = {
                nombre: existing.nombre,
                tipo: existing.tipo,
                encargado: existing.encargado,
                estado: existing.estado,
                ciudad: existing.ciudad,
                calle: existing.calle,
                numero: existing.numero,
                colonia: existing.colonia,
                cp: existing.cp,
                referencia: existing.referencia,
                nombrePlaza: existing.nombrePlaza,
                gerente: existing.gerente,
                telefonoGerente: existing.telefonoGerente,
                subgerente: existing.subgerente,
                telefonoSubgerente: existing.telefonoSubgerente,
                manzana: existing.manzana,
                lote: existing.lote,
                calleAv: existing.calleAv,
                levantamiento: finalLevantamiento,
            };
            if (existing.imagenPerfil) apiPayload.imagenPerfil = existing.imagenPerfil;
            if (existing.imagen_portada) apiPayload.imagen_portada = existing.imagen_portada;

            const updateRes = await updateNegocio(Number(id), apiPayload);
            if (updateRes?.data?.areas) {
                const mergedAreas = updateRes.data.areas.map((serverArea: any) => {
                    const localArea = newLevantamientoData.find(a => 
                        String(a.id) === String(serverArea.id) || a.nombreArea === serverArea.nombreArea
                    );
                    
                    const subAreasMap = new Map<string, any>();
                    
                    if (serverArea.sub_areas_json && Array.isArray(serverArea.sub_areas_json)) {
                        serverArea.sub_areas_json.forEach((sub: any) => {
                            subAreasMap.set(sub.id, { ...sub, equipos: [] });
                        });
                    }

                    if (localArea && localArea.subAreas) {
                        localArea.subAreas.forEach(sub => {
                            if (!subAreasMap.has(sub.id)) {
                                subAreasMap.set(sub.id, { ...sub, equipos: [] });
                            }
                        });
                    }

                    (serverArea.equipos || []).forEach((eq: any) => {
                        const subId = eq.subAreaId || `sub_gen_${serverArea.id}`;
                        const subName = eq.nombreSubArea || 'GENERAL';
                        if (!subAreasMap.has(subId)) {
                            subAreasMap.set(subId, { id: subId, nombreSubArea: subName, equipos: [] });
                        }
                        subAreasMap.get(subId)!.equipos.push(eq);
                    });

                    let finalSubAreas = Array.from(subAreasMap.values());
                    if (finalSubAreas.length === 0) {
                        finalSubAreas = [{ id: `sub_gen_${serverArea.id}`, nombreSubArea: 'GENERAL', equipos: serverArea.equipos || [] }];
                    }

                    return {
                        ...serverArea,
                        subAreas: finalSubAreas
                    };
                });
                
                setBusinessAreas(mergedAreas);
            }
            if (showNotification) {
                showAlert("Éxito", "Levantamiento guardado exitosamente.", "success");
            }
        } catch (error) {
            console.error("Error saving levantamiento:", error);
            showAlert("Error", "No se pudo guardar el levantamiento en el servidor.", "error");
        }
    };

    const handleAddArea = (nombreArea: string) => {
        const newSecId = `sec_${Date.now()}`;
        const newSubId = `sub_${Date.now()}`;
        const newSection: any = {
            id: newSecId,
            nombreArea: nombreArea.trim().toUpperCase(),
            subAreas: [{ id: newSubId, nombreSubArea: 'GENERAL', equipos: [] }],
            equipos: []
        };
        const updated = [...businessAreas, newSection];
        persistLevantamiento(updated);
        setIsAreaModalOpen(false);
    };

    const handleAddSubArea = (nombreSubArea: string) => {
        if (!activeAreaForSub) return;
        const newSubId = `sub_${Date.now()}`;
        const updated = businessAreas.map(sec => {
            if (sec.id === activeAreaForSub) {
                return {
                    ...sec,
                    subAreas: [...(sec.subAreas || []), { id: newSubId, nombreSubArea: nombreSubArea.trim().toUpperCase(), equipos: [] }]
                };
            }
            return sec;
        });
        persistLevantamiento(updated);
        setIsSubAreaModalOpen(false);
    };

    const handleDeleteArea = (areaId: string, nombreArea: string) => {
        showConfirm(
            "¿Eliminar área?",
            `¿Estás seguro de que deseas eliminar el área "${nombreArea}" y todas sus sub-áreas?`,
            () => {
                const updated = businessAreas.filter(s => s.id !== areaId);
                persistLevantamiento(updated);
            },
            () => {},
            "Sí, eliminar",
            "Cancelar"
        );
    };

    const editAreaName = (areaId: string, oldName: string) => {
        showPrompt(
            "Editar Área",
            "Ingresa el nuevo nombre para esta área:",
            oldName,
            (newName) => {
                if (newName && newName.trim()) {
                    const updated = businessAreas.map(sec => 
                        sec.id === areaId ? { ...sec, nombreArea: newName.trim().toUpperCase() } : sec
                    );
                    persistLevantamiento(updated);
                }
            },
            () => {},
            "Guardar Cambios",
            "Cancelar"
        );
    };

    const handleReportarProblemaSubmit = async (descripcion: string) => {
        if (!reportingEquipment || !user?.id || !id) return;
        try {
            await createMantenimientoSolicitud({
                cliente_id: user.id,
                negocio_id: Number(id),
                levantamiento_equipo_id: reportingEquipment.id!,
                descripcion_problema: descripcion
            });

            showAlert("Reporte Enviado", "El problema ha sido reportado exitosamente. El administrador revisará y agendará una visita técnica.", "success");
        } catch (error) {
            console.error(error);
            showAlert("Error", "No se pudo enviar el reporte de mantenimiento. Intenta de nuevo.", "error");
        }
    };
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

    const reloadTrabajosList = async () => {
        try {
            const [data, mantenimientos] = await Promise.all([
                getTrabajos({ negocio_id: Number(id) }),
                getMantenimientoSolicitudes(Number(id))
            ]);

            // Mapear mantenimientos a la estructura de Trabajo
            const mappedMantenimientos = mantenimientos.map((m: any) => {
                let estado = m.estado;
                if (estado === 'Pendiente') estado = 'Solicitud';

                const activeJob = m.reparacion_trabajo || m.visita_trabajo;

                // Formato de fecha consistente DD/MM/YYYY igual que los trabajos normales
                const createdAt = new Date(m.created_at);
                const fechaFormateada = `${String(createdAt.getDate()).padStart(2,'0')}/${String(createdAt.getMonth()+1).padStart(2,'0')}/${createdAt.getFullYear()}`;

                return {
                    id: `m-${m.id}`,
                    original_id: m.id,
                    titulo: `Mantenimiento: ${m.levantamiento_equipo?.nombre || 'Equipo'}`,
                    descripcion: m.descripcion_problema || '',
                    estado: estado,
                    fecha: fechaFormateada,
                    tipo: 'Mantenimiento',
                    isMantenimiento: true,
                    tecnico: activeJob?.trabajador?.nombre || 'Sin asignar',
                    tecnicoUserId: activeJob?.trabajador?.user_id || null,
                    ubicacion: businessName,
                    fechaSolicitud: createdAt.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
                    foto_url: null,
                    hora_llegada: activeJob?.hora_llegada || null
                };
            });

            const mappedTrabajos = data.map((j: any) => {
                const isSOS = j.prioridad === "Alta" || j.titulo?.includes("SOS");
                let displayTipo = "Nueva Solicitud";
                if (isSOS) {
                    displayTipo = "SOS";
                } else if (j.tipo && ["Visita", "Trabajo", "Mantenimiento"].includes(j.tipo)) {
                    displayTipo = j.tipo;
                } else if (j.estado !== "Pendiente" && j.estado !== "Solicitud") {
                    const isTrabajoDefinitivo = ["Cotización Enviada", "Cotización Rechazada", "Cotización Aceptada", "Cotización Aprobada", "En Proceso", "Finalizado"].includes(j.estado) || j.visitado;
                    displayTipo = isTrabajoDefinitivo ? "Trabajo" : "Visita";
                }

                return {
                    id: j.id.toString(),
                    original_id: j.id,
                    titulo: j.titulo,
                    ubicacion: j.negocio ? ((j.negocio.nombrePlaza || j.negocio.nombre_plaza) ? `${j.negocio.nombre} - ${j.negocio.nombrePlaza || j.negocio.nombre_plaza}` : j.negocio.nombre) : businessName,
                    tecnico: j.trabajador?.nombre || "Sin asignar",
                    tecnicoUserId: j.trabajador?.user_id || null,
                    fecha: j.fecha_programada ? (j.fecha_programada.includes('-') ? j.fecha_programada.split('-').reverse().join('/') : j.fecha_programada) : new Date(j.created_at).toLocaleDateString('es-MX'),
                    estado: j.estado === "Pendiente" ? "Solicitud" : j.estado,
                    visitado: Boolean(j.visitado),
                    tipo: displayTipo,
                    descripcion: j.descripcion,
                    isEmergency: isSOS,
                    fechaSolicitud: j.created_at ? new Date(j.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "No registrada",
                    foto_url: j.foto_url,
                    hora_llegada: j.hora_llegada || null
                };
            });
            setTrabajosData([...mappedTrabajos, ...mappedMantenimientos]);
        } catch (error) {
            console.error("Error al obtener trabajos: ", error);
        }
    };

    useEffect(() => {
        if (businessName !== "Cargando...") {
            reloadTrabajosList();
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

    // ESTADOS PARA "SOLICITAR TÉCNICO"
    const [isTechRequestModalOpen, setIsTechRequestModalOpen] = useState(false);
    const [requestRole, setRequestRole] = useState("");

    const handleRequestTechnician = async () => {
        if (!requestRole) {
            showAlert("Atención", "Por favor selecciona el tipo de técnico que necesitas.", "warning");
            return;
        }

        try {
            await createNotificacionByRole({
                role: 'admin',
                titulo: 'Solicitud de Técnico',
                mensaje: `El usuario ${user?.name || 'encargado'} solicita un técnico con especialidad: ${requestRole}.`,
                enlace: '/menu/trabajadores'
            });
            showAlert("Éxito", "Solicitud enviada al administrador principal.", "success");
            setIsTechRequestModalOpen(false);
            setRequestRole("");
        } catch (error) {
            console.error(error);
            showAlert("Error", "No se pudo enviar la solicitud.", "error");
        }
    };

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
    const [activeSummaryTab, setActiveSummaryTab] = useState<string | null>(null);
    const [formServices, setFormServices] = useState<Array<{
        id: string;
        dbId?: number;
        categoria: string;
        customCategoria: string;
        descripcion: string;
        equipoSeleccionado: string;
        fotos: File[];
        fotosPreviewUrls: string[];
        isMinimized: boolean;
    }>>([]);
    const [deletedDbIds, setDeletedDbIds] = useState<number[]>([]);
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

            const matchesSearch = (job.titulo || '').toLowerCase().includes(searchText.toLowerCase()) ||
                (job.tecnico || '').toLowerCase().includes(searchText.toLowerCase());

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

        // Helper para extraer Group ID
        const getGroupId = (descripcion?: string) => {
            if (!descripcion) return null;
            const match = descripcion.match(/\[Grupo:\s*(REQ-\d+)\]/);
            return match ? match[1] : null;
        };

        // AGRUPACIÓN POR GRUPO REQ (para mostrar una sola tarjeta por solicitud)
        const groupedByReq: { [key: string]: Trabajo[] } = {};
        const singleJobsList: Trabajo[] = [];

        filteredJobs.forEach(job => {
            const grpId = getGroupId(job.descripcion);
            if (grpId) {
                if (!groupedByReq[grpId]) {
                    groupedByReq[grpId] = [];
                }
                groupedByReq[grpId].push(job);
            } else {
                singleJobsList.push(job);
            }
        });

        // Convertir cada grupo de REQ en un objeto compuesto
        Object.entries(groupedByReq).forEach(([grpId, jobsInGroup]) => {
            // Ordenar por ID para que el primero sea la base
            jobsInGroup.sort((a, b) => Number(a.id) - Number(b.id));
            const baseJob = { ...jobsInGroup[0] };
            
            baseJob.isGroupHeader = true;
            baseJob.groupId = grpId;
            baseJob.jobsInGroup = jobsInGroup;
            
            // Generar título combinado
            const serviceTypes = jobsInGroup.map(j => {
                const parts = j.titulo.split(' - ');
                return parts[0];
            });
            const uniqueTypes = Array.from(new Set(serviceTypes));
            const suffix = baseJob.titulo.includes(' - ') ? ' - ' + baseJob.titulo.split(' - ').slice(1).join(' - ') : '';
            baseJob.titulo = `${uniqueTypes.join(', ')}${suffix}`;
            
            // Descripción combinada
            baseJob.descripcion = `[Grupo: ${grpId}]\n` + jobsInGroup.map((j, idx) => {
                const cleanDesc = j.descripcion?.replace(/\[Grupo:\s*REQ-\d+\]\s*\n?/, "") || "";
                const svcName = j.titulo.split(' - ')[0];
                return `${idx + 1}. ${svcName}: ${cleanDesc}`;
            }).join('\n');
            
            // Combinar fotos
            const allPhotos: string[] = [];
            jobsInGroup.forEach(j => {
                if (j.foto_url) {
                    const urls = j.foto_url.split(',').map(u => u.trim()).filter(Boolean);
                    allPhotos.push(...urls);
                }
            });
            baseJob.foto_url = allPhotos.join(',');
            
            singleJobsList.push(baseJob);
        });

        // 3. ORDENAMIENTO AUTOMÁTICO: SOS primero, luego Fecha Descendente
        const parseDateForSort = (dateStr: string) => {
            const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
            if (parts.length === 3) {
                const [d, m, y] = parts.map(Number);
                return new Date(y, m - 1, d).getTime();
            }
            return new Date(dateStr).getTime();
        };

        const sortedFilteredJobs = [...singleJobsList].sort((a, b) => {
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
                        const isVisita = selectedType === 'Visita';
                        await createNotificacion({
                            user_id: notifUserId,
                            titulo: isVisita ? '📋 Nueva Visita Asignada' : '🛠️ Nuevo Trabajo Asignado',
                            mensaje: isVisita 
                                ? `Se te ha asignado una nueva visita de evaluación para: ${assignedNames} en la sucursal ${businessName}.`
                                : `Te han asignado un nuevo trabajo: ${assignedNames} en la sucursal ${businessName}.`,
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

    const toggleMinimize = (svcId: string) => {
        setFormServices(prev => prev.map(s => s.id === svcId ? { ...s, isMinimized: !s.isMinimized } : s));
    };

    const removeServiceForm = (svcId: string, dbId?: number) => {
        setFormServices(prev => prev.filter(s => s.id !== svcId));
        if (dbId) {
            setDeletedDbIds(prev => [...prev, dbId]);
        }
    };

    const updateFormService = (svcId: string, key: string, value: any) => {
        setFormServices(prev => prev.map(s => s.id === svcId ? { ...s, [key]: value } : s));
    };

    const handleAddFormPhoto = (svcId: string, filesList: FileList | null) => {
        if (!filesList) return;
        const files = Array.from(filesList);
        const newUrls = files.map(file => URL.createObjectURL(file));

        setFormServices(prev => prev.map(s => {
            if (s.id === svcId) {
                return {
                    ...s,
                    fotos: [...s.fotos, ...files],
                    fotosPreviewUrls: [...s.fotosPreviewUrls, ...newUrls]
                };
            }
            return s;
        }));
    };

    const removeFormPhoto = (svcId: string, photoIdx: number) => {
        setFormServices(prev => prev.map(s => {
            if (s.id === svcId) {
                const urlToRevoke = s.fotosPreviewUrls[photoIdx];
                if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
                    URL.revokeObjectURL(urlToRevoke);
                }
                return {
                    ...s,
                    fotos: s.fotos.filter((_, idx) => idx !== photoIdx),
                    fotosPreviewUrls: s.fotosPreviewUrls.filter((_, idx) => idx !== photoIdx)
                };
            }
            return s;
        }));
    };

    const addMoreServiceForm = () => {
        if (formServices.length >= 10) {
            showAlert("Límite Alcanzado", "Puedes agregar un máximo de 10 servicios en una sola solicitud.", "warning");
            return;
        }
        setFormServices(prev => [
            ...prev,
            {
                id: "svc-" + Date.now(),
                categoria: "Electricidad",
                customCategoria: "",
                descripcion: "",
                equipoSeleccionado: "",
                fotos: [] as File[],
                fotosPreviewUrls: [] as string[],
                isMinimized: false
            }
        ]);
    };

    const handleConfirmRequest = async () => {
        // Validate description of all forms
        const invalidIndex = formServices.findIndex(s => !s.descripcion.trim());
        if (invalidIndex !== -1) {
            showAlert("Campo Requerido", `Por favor detalla la descripción del problema para el Servicio #${invalidIndex + 1}.`, "error");
            return;
        }

        // Validate that each service has at least one photo (new upload or existing)
        const invalidPhotoIndex = formServices.findIndex(s => s.fotos.length === 0 && s.fotosPreviewUrls.length === 0);
        if (invalidPhotoIndex !== -1) {
            showAlert("Foto Requerida", `Por favor adjunta al menos una foto para el Servicio #${invalidPhotoIndex + 1}.`, "error");
            return;
        }

        if (isEditingRequest && editingRequestId !== null) {
            // Edit Group Request
            try {
                // Determine original group ID or create a new one
                const originalJob = trabajosData.find(t => t.id === editingRequestId);
                const groupMatch = originalJob?.descripcion?.match(/\[Grupo:\s*(REQ-\d+)\]/);
                let finalGroupId = groupMatch ? groupMatch[1] : null;

                if (!finalGroupId && formServices.length > 1) {
                    finalGroupId = "REQ-" + Date.now();
                }

                // 1. Delete removed database records
                for (const delId of deletedDbIds) {
                    try {
                        await deleteTrabajo(delId);
                    } catch (e) {
                        console.error("Error deleting job in group edit:", e);
                    }
                }

                const isEmergency = isSOSRequest;

                // 2. Iterate and update existing / create new services
                for (const svc of formServices) {
                    const finalCat = svc.categoria === "Otro" && svc.customCategoria.trim() !== ""
                        ? svc.customCategoria.trim()
                        : svc.categoria;

                    const descWithGroup = finalGroupId ? `[Grupo: ${finalGroupId}]\n${svc.descripcion}` : svc.descripcion;

                    if (svc.dbId) {
                        // Update existing request
                        const updatedPayload = {
                            titulo: isEmergency
                                ? `🚨 SOS: ${finalCat} - ${businessName}`
                                : `${finalCat} - ${newRequestData.cliente || businessName}`,
                            descripcion: descWithGroup,
                            fecha_programada: newRequestData.fecha || null
                        };
                        await updateTrabajo(svc.dbId, updatedPayload);
                    } else {
                        // Create newly added request inside edit mode
                        const newJobPayload = {
                            titulo: isEmergency
                                ? `🚨 SOS: ${finalCat} - ${businessName}`
                                : `${finalCat} - ${newRequestData.cliente || businessName}`,
                            descripcion: descWithGroup,
                            prioridad: isEmergency ? "Alta" : "Media",
                            tipo: isEmergency ? "SOS" : "Nueva Solicitud",
                            negocio_id: Number(id),
                            fecha_programada: newRequestData.fecha || null,
                            trabajador_id: null
                        };
                        await createTrabajo(newJobPayload);
                    }
                }

                showAlert("Éxito", "Solicitud editada exitosamente.", "success");
                reloadTrabajosList();
            } catch (error) {
                console.error("Error al actualizar el grupo de solicitudes:", error);
                showAlert("Error", "No se pudo actualizar alguna de las solicitudes.", "error");
            }

            setIsRequestModalOpen(false);
            setIsEditingRequest(false);
            setIsSOSRequest(false);
            setFotosSOS([]);
            setFotosPreviewUrls([]);
            setEditingRequestId(null);
            setFormServices([]);
            setDeletedDbIds([]);
        } else {
            // Create New Request Group
            try {
                // Generate a unique group ID if there are multiple services
                let finalGroupId: string | null = null;
                if (formServices.length > 1) {
                    finalGroupId = "REQ-" + Date.now();
                }

                const isEmergency = isSOSRequest;

                for (const svc of formServices) {
                    const finalCat = svc.categoria === "Otro" && svc.customCategoria.trim() !== ""
                        ? svc.customCategoria.trim()
                        : svc.categoria;

                    const descWithGroup = finalGroupId ? `[Grupo: ${finalGroupId}]\n${svc.descripcion}` : svc.descripcion;

                    if (svc.categoria === 'Mantenimiento' && svc.equipoSeleccionado) {
                        // Flujo especializado de mantenimiento
                        await createMantenimientoSolicitud({
                            cliente_id: user?.id || 1,
                            negocio_id: Number(id),
                            levantamiento_equipo_id: svc.equipoSeleccionado,
                            descripcion_problema: svc.descripcion || "Mantenimiento general programado"
                        });
                        continue;
                    }

                    let dbJob;
                    if (svc.fotos.length > 0) {
                        const formData = new FormData();
                        formData.append('titulo', isEmergency
                            ? `🚨 SOS: ${finalCat} - ${businessName}`
                            : `${finalCat} - ${newRequestData.cliente || businessName}`
                        );
                        formData.append('descripcion', descWithGroup);
                        formData.append('prioridad', isEmergency ? 'Alta' : 'Media');
                        formData.append('tipo', isEmergency ? 'SOS' : 'Nueva Solicitud');
                        formData.append('negocio_id', id || '');
                        if (newRequestData.fecha) {
                            formData.append('fecha_programada', newRequestData.fecha);
                        }
                        svc.fotos.forEach((file) => {
                            formData.append('fotos[]', file);
                        });

                        dbJob = await createTrabajo(formData);
                    } else {
                        const newJobPayload = {
                            titulo: isEmergency
                                ? `🚨 SOS: ${finalCat} - ${businessName}`
                                : `${finalCat} - ${newRequestData.cliente || businessName}`,
                            descripcion: descWithGroup,
                            prioridad: isEmergency ? "Alta" : "Media",
                            tipo: isEmergency ? "SOS" : "Nueva Solicitud",
                            negocio_id: Number(id),
                            fecha_programada: newRequestData.fecha || null,
                            trabajador_id: null
                        };

                        dbJob = await createTrabajo(newJobPayload);
                    }
                }

                showAlert(
                    isEmergency ? "🚨 ¡Emergencias Enviadas!" : "✅ ¡Solicitudes Enviadas!",
                    isEmergency
                        ? "Tus alertas SOS han sido enviadas al administrador. Nos pondremos en contacto contigo a la brevedad posible."
                        : "Tus solicitudes han sido enviadas exitosamente al administrador.",
                    "success"
                );
                reloadTrabajosList();
            } catch (error: any) {
                console.error("Error creating request group:", error);
                showAlert("Error", "No se pudo crear alguna de las solicitudes.", "error");
            }

            setIsRequestModalOpen(false);
            setIsEditingRequest(false);
            setIsSOSRequest(false);
            setFotosSOS([]);
            setFotosPreviewUrls([]);
            setEditingRequestId(null);
            setFormServices([]);
            setDeletedDbIds([]);
        }
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
        setFormServices([
            {
                id: "svc-" + Date.now(),
                categoria: "Electricidad",
                customCategoria: "",
                descripcion: "",
                equipoSeleccionado: "",
                fotos: [] as File[],
                fotosPreviewUrls: [] as string[],
                isMinimized: false
            }
        ]);
        setIsSOSRequest(true);
        setIsEditingRequest(false);
        setIsRequestModalOpen(true);
    };

    const handleDeleteRequest = (e: React.MouseEvent, job: Trabajo) => {
        e.stopPropagation();
        
        const getGroupId = (descripcion?: string) => {
            if (!descripcion) return null;
            const match = descripcion.match(/\[Grupo:\s*(REQ-\d+)\]/);
            return match ? match[1] : null;
        };
        
        const grpId = getGroupId(job.descripcion);
        const title = grpId ? "Borrar Grupo de Solicitudes" : "Borrar Solicitud";
        const message = grpId 
            ? "¿Estás seguro de que deseas borrar este grupo de solicitudes? Se eliminarán todos los servicios de la solicitud." 
            : "¿Estás seguro de que deseas borrar esta solicitud?";

        showConfirm(
            title,
            message,
            async () => {
                try {
                    if (grpId) {
                        const groupJobs = trabajosData.filter(t => {
                            const tGrpId = getGroupId(t.descripcion);
                            return tGrpId === grpId;
                        });
                        for (const gJob of groupJobs) {
                            await deleteTrabajo(Number(gJob.original_id || gJob.id));
                        }
                        const updated = trabajosData.filter(t => {
                            const tGrpId = getGroupId(t.descripcion);
                            return tGrpId !== grpId;
                        });
                        saveJobs(updated);
                    } else {
                        await deleteTrabajo(Number(job.original_id || job.id));
                        const updated = trabajosData.filter(t => t.id !== job.id);
                        saveJobs(updated);
                    }
                    showAlert("Éxito", grpId ? "Grupo de solicitudes borrado exitosamente." : "Solicitud borrada exitosamente.", "success");
                } catch (error) {
                    console.error("Error al borrar solicitud:", error);
                    showAlert("Error", "No se pudo borrar la solicitud.", "error");
                }
            }
        );
    };

    const handleOpenEditRequest = (e: React.MouseEvent, job: Trabajo) => {
        e.stopPropagation();

        // 1. Detectar si pertenece a un grupo
        const match = job.descripcion?.match(/\[Grupo:\s*(REQ-\d+)\]/);
        const groupId = match ? match[1] : null;

        let jobsToEdit = [job];
        if (groupId) {
            jobsToEdit = trabajosData.filter(t => t.descripcion?.includes(`[Grupo: ${groupId}]`));
        }

        // 2. Mapear a formServices
        const mapped = jobsToEdit.map(t => {
            const cleanDesc = t.descripcion?.replace(/\[Grupo:\s*REQ-\d+\]\s*\n?/, "") || "";
            
            // Deducir categoría y customCategoria
            let cleanTitle = t.titulo || "";
            cleanTitle = cleanTitle.replace("🚨 SOS: ", "");
            const parts = cleanTitle.split(' - ');
            let cat = parts.length > 0 ? parts[0] : "Electricidad";
            let custom = "";

            if (!["Electricidad", "Plomeria", "Albañileria", "Limpieza", "Instalación", "Mantenimiento"].includes(cat)) {
                custom = cat;
                cat = "Otro";
            }

            return {
                id: "svc-edit-" + t.id,
                dbId: t.id,
                categoria: cat,
                customCategoria: custom,
                descripcion: cleanDesc,
                equipoSeleccionado: "",
                fotos: [] as File[],
                fotosPreviewUrls: parseFotoUrls(t.foto_url),
                isMinimized: false
            };
        });

        setFormServices(mapped);
        setDeletedDbIds([]);

        // Set basic newRequestData (especially date)
        setNewRequestData({
            categoria: mapped[0].categoria,
            cliente: businessName,
            fecha: job.fecha ? (job.fecha.includes('/') ? job.fecha.split('/').reverse().join('-') : job.fecha) : new Date().toISOString().split('T')[0],
            descripcion: mapped[0].descripcion,
            equipoSeleccionado: "",
            trabajador_id: ""
        });

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

    const getBarClass = (job: Trabajo): string => {
        const status = (job.estado || "").toLowerCase();
        if (status === "cancelado") return styles.red;
        if (status === "finalizado") return styles.green;
        if (status === "rechazado por técnico" || status === "rechazado por tecnico") return styles.red;
        if (job.tipo === "SOS") return styles.red;
        if (status.includes("cotizaci")) {
            if (status.includes("aceptada") || status.includes("aprobada")) return styles.green;
            if (status.includes("rechazada")) return styles.red;
            if (status.includes("enviada")) return styles.blue;
            return styles.orange;
        }
        if (status === "en espera") {
            const hasTech = job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar";
            return hasTech ? styles.orange : styles.yellow;
        }
        if (status === "en proceso") return styles.blue;
        if (status === "solicitud" || status === "pendiente" || status === "asignado") {
            const hasTech = job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar";
            return hasTech ? styles.orange : styles.yellow;
        }
        if (status === "visita asignada" || status === "reparación asignada" || status === "reparacion asignada") return styles.orange;
        if (status === "diagnosticado") return styles.blue;
        
        if (job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar") {
            return user?.role === 'tecnico' ? styles.orange : styles.blue;
        }
        return styles.yellow;
    };

    const renderStatusBar = (job: Trabajo) => {
        const status = (job.estado || "").toLowerCase();
        const barClass = getBarClass(job);
        let text: string = job.estado || "Pendiente";

        if (status === "cancelado") {
            text = "SOLICITUD CANCELADA";
        } else if (status === "finalizado") {
            text = "Finalizado";
        } else if (status === "rechazado por técnico" || status === "rechazado por tecnico") {
            text = user?.role === 'tecnico' ? "RECHAZASTE ESTA ASIGNACIÓN" : "RECHAZADO POR TÉCNICO";
        } else if (job.tipo === "SOS") {
            text = "¡ALERTA SOS!";
        } else if (status.includes("cotizaci")) {
            if (status.includes("aceptada") || status.includes("aprobada")) {
                text = "COTIZACIÓN ACEPTADA";
            } else if (status.includes("rechazada")) {
                text = "COTIZACIÓN RECHAZADA";
            } else if (status.includes("enviada")) {
                text = "COTIZACIÓN ENVIADA";
            } else {
                text = "PROCESO DE COTIZACIÓN";
            }
        } else if (status === "en espera") {
            const hasTech = job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar";
            text = hasTech ? "TÉCNICO EN CAMINO" : "EN ESPERA DE ASIGNACIÓN";
        } else if (status === "en proceso") {
            text = "TÉCNICO ACEPTADO";
        } else if (status === "visita asignada") {
            text = "VISITA TÉCNICA ASIGNADA";
        } else if (status === "diagnosticado") {
            text = "EN PROCESO DE DIAGNÓSTICO";
        } else if (status === "reparación asignada" || status === "reparacion asignada") {
            text = "REPARACIÓN FINAL ASIGNADA";
        } else if (status === "solicitud" || status === "pendiente" || status === "asignado") {
            const hasTech = job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar";
            text = hasTech ? "SOLICITUD POR ACEPTAR" : "SOLICITUD";
        } else if (job.tecnico && job.tecnico !== "Sin asignar" && job.tecnico !== "Sin Asignar") {
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
            <div className={styles.dashboardLayout}>
                <div className={styles.mainContainer} style={{ minHeight: '80vh', boxSizing: 'border-box' }}>
                    
                    {/* HEADER / BANNER PREMIUM */}
                    <div className={styles.premiumHeader} style={{ marginBottom: '25px' }}>
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
                                        <span className={styles.bannerLabel}>HISTORIAL DE LA SUCURSAL</span>
                                        <h1 className={styles.bannerTitle}>{businessName}</h1>
                                        {businessDetails && (
                                            <p className={styles.bannerStats} style={{ margin: '4px 0 0 0' }}>
                                                📍 {getBusinessAddress()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.simpleHeader} style={{ position: 'relative' }}>
                                <span className={styles.bannerLabel} style={{ color: '#d14d13', display: 'block', marginBottom: '5px' }}>HISTORIAL DE LA SUCURSAL</span>
                                <h1 className={styles.businessTitle}>{businessName}</h1>
                                {businessDetails && (
                                    <p className={styles.businessSubtitle} style={{ margin: '8px 0 0 0', color: '#64748b' }}>
                                        📍 {getBusinessAddress()}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                        <Historial businessId={Number(id)} />
                    </div>
                </div>
            </div>
        );
    }

    if (isCotizacionesTab) {
        return (
            <div className={styles.dashboardLayout}>
                <div className={styles.mainContainer} style={{ minHeight: '80vh', boxSizing: 'border-box' }}>
                    
                    {/* HEADER / BANNER PREMIUM */}
                    <div className={styles.premiumHeader} style={{ marginBottom: '25px' }}>
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
                                        <span className={styles.bannerLabel}>COTIZACIONES DE LA SUCURSAL</span>
                                        <h1 className={styles.bannerTitle}>{businessName}</h1>
                                        {businessDetails && (
                                            <p className={styles.bannerStats} style={{ margin: '4px 0 0 0' }}>
                                                📍 {getBusinessAddress()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.simpleHeader} style={{ position: 'relative' }}>
                                <span className={styles.bannerLabel} style={{ color: '#d14d13', display: 'block', marginBottom: '5px' }}>COTIZACIONES DE LA SUCURSAL</span>
                                <h1 className={styles.businessTitle}>{businessName}</h1>
                                {businessDetails && (
                                    <p className={styles.businessSubtitle} style={{ margin: '8px 0 0 0', color: '#64748b' }}>
                                        📍 {getBusinessAddress()}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                        <Cotizaciones businessId={Number(id)} />
                    </div>
                </div>
            </div>
        );
    }

    if (isEquiposTab) {
        return (
            <div className={styles.dashboardLayout}>
                <div className={styles.mainContainer} style={{ minHeight: '80vh', boxSizing: 'border-box' }}>
                    
                    {/* HEADER / BANNER PREMIUM */}
                    <div className={styles.premiumHeader} style={{ marginBottom: '25px' }}>
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
                                        <span className={styles.bannerLabel}>EQUIPOS EN LA SUCURSAL</span>
                                        <h1 className={styles.bannerTitle}>{businessName}</h1>
                                        {businessDetails && (
                                            <p className={styles.bannerStats} style={{ margin: '4px 0 0 0' }}>
                                                📍 {getBusinessAddress()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.simpleHeader} style={{ position: 'relative' }}>
                                <span className={styles.bannerLabel} style={{ color: '#d14d13', display: 'block', marginBottom: '5px' }}>EQUIPOS EN LA SUCURSAL</span>
                                <h1 className={styles.businessTitle}>{businessName}</h1>
                                {businessDetails && (
                                    <p className={styles.businessSubtitle} style={{ margin: '8px 0 0 0', color: '#64748b' }}>
                                        📍 {getBusinessAddress()}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sub-tabs Selector */}
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '25px' }}>
                        <button
                            onClick={() => setEquiposSubTab('registrados')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: 'none',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                background: equiposSubTab === 'registrados' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#e2e8f0',
                                color: equiposSubTab === 'registrados' ? 'white' : '#475569',
                                boxShadow: equiposSubTab === 'registrados' ? '0 4px 12px rgba(249, 115, 22, 0.25)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            📋 Inventario de Equipos
                        </button>
                        <button
                            onClick={() => setEquiposSubTab('levantamiento')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: 'none',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                background: equiposSubTab === 'levantamiento' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#e2e8f0',
                                color: equiposSubTab === 'levantamiento' ? 'white' : '#475569',
                                boxShadow: equiposSubTab === 'levantamiento' ? '0 4px 12px rgba(249, 115, 22, 0.25)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            🛠️ Levantamiento por Áreas
                        </button>
                    </div>

                    {equiposSubTab === 'registrados' ? (
                        <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                            <EquiposNegocio
                                businessId={Number(id)}
                                onViewReport={handleOpenReportDetail}
                            />
                        </div>
                    ) : (
                        <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                            <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                                    <div>
                                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                                            <HiOutlineBolt size={20} style={{ color: '#f59e0b' }} /> Levantamientos por Áreas y Sub-áreas
                                        </h2>
                                        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                                            Estructura de áreas, sub-áreas y catálogo de equipos de la sucursal.
                                        </p>
                                    </div>
                                    {canEdit && (
                                        <button
                                            onClick={() => { setActiveSectionId(null); setIsLevantamientoModalOpen(true); }}
                                            type="button"
                                            style={{
                                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                                color: 'white',
                                                padding: '10px 18px',
                                                borderRadius: '12px',
                                                border: 'none',
                                                fontWeight: 'bold',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
                                            }}
                                        >
                                            <HiOutlineBolt size={16} /> Iniciar levantamiento
                                        </button>
                                    )}
                                </div>

                                <div className={styles.levantamientoPreview}>
                                    {businessAreas.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                            {businessAreas.map((seccion: any) => (
                                                <AreaVisualGrid 
                                                    key={seccion.id}
                                                    seccion={seccion}
                                                    canEdit={canEdit}
                                                    onEditArea={() => editAreaName(seccion.id, seccion.nombreArea)}
                                                    onDeleteArea={() => handleDeleteArea(seccion.id, seccion.nombreArea)}
                                                    onAddSubArea={() => {
                                                        setActiveAreaForSub(seccion.id);
                                                        setIsSubAreaModalOpen(true);
                                                    }}
                                                    onViewInventory={(subAreaId) => {
                                                        const subArea = seccion.subAreas?.find((s: any) => s.id === subAreaId);
                                                        if (subArea && subArea.equipos && subArea.equipos.length > 0) {
                                                            setActiveSectionId(seccion.id);
                                                            setInitialSubAreaId(subAreaId);
                                                            setSelectedEquipment(subArea.equipos as any);
                                                        } else {
                                                            setActiveSectionId(seccion.id);
                                                            setInitialSubAreaId(subAreaId);
                                                            setIsLevantamientoModalOpen(true);
                                                        }
                                                    }}
                                                    onVerBitacora={(subAreaId) => {
                                                        const subArea = seccion.subAreas?.find((s: any) => s.id === subAreaId);
                                                        if (!subArea || !subArea.equipos || subArea.equipos.length === 0) return;
                                                        if (subArea.equipos.length === 1) {
                                                            setSelectedEqForBitacora(subArea.equipos[0] as any);
                                                            setBitacoraModalOpen(true);
                                                        } else {
                                                            setEquiposForSelection(subArea.equipos as any);
                                                            setEquipoSelectionMode('bitacora');
                                                        }
                                                    }}
                                                    onReportarProblema={(subAreaId) => {
                                                        const subArea = seccion.subAreas?.find((s: any) => s.id === subAreaId);
                                                        if (!subArea || !subArea.equipos || subArea.equipos.length === 0) return;
                                                        if (subArea.equipos.length === 1) {
                                                            setReportingEquipment(subArea.equipos[0] as any);
                                                        } else {
                                                            setEquiposForSelection(subArea.equipos as any);
                                                            setEquipoSelectionMode('reporte');
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '30px' }}>
                                            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Aún no se ha realizado el levantamiento de áreas y equipos de esta sucursal.</p>
                                        </div>
                                    )}
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

                    {/* MODALS LEVANTAMIENTO */}
                    <LevantamientoModal
                        isOpen={isLevantamientoModalOpen}
                        onClose={() => {
                            setIsLevantamientoModalOpen(false);
                            setActiveEquipmentId(null);
                            setInitialSubAreaId(null);
                        }}
                        data={businessAreas}
                        initialSectionId={activeSectionId}
                        initialEquipmentId={activeEquipmentId}
                        initialSubAreaId={initialSubAreaId}
                        onSave={(newData) => persistLevantamiento(newData)}
                        isReadOnly={!canEdit}
                    />

                    <ReportarProblemaModal 
                        isOpen={!!reportingEquipment}
                        onClose={() => setReportingEquipment(null)}
                        equipment={reportingEquipment}
                        negocioId={id || ''}
                        onSubmit={handleReportarProblemaSubmit}
                    />

                    <ModalSeleccionEquipo
                        isOpen={equipoSelectionMode !== null}
                        onClose={() => {
                            setEquipoSelectionMode(null);
                            setEquiposForSelection([]);
                        }}
                        equipos={equiposForSelection}
                        title={equipoSelectionMode === 'bitacora' ? 'Seleccionar Equipo para Bitácora' : 'Seleccionar Equipo para Reportar'}
                        onSelect={(equipo) => {
                            if (equipoSelectionMode === 'bitacora') {
                                setSelectedEqForBitacora(equipo);
                                setBitacoraModalOpen(true);
                            } else if (equipoSelectionMode === 'reporte') {
                                setReportingEquipment(equipo);
                            }
                            setEquipoSelectionMode(null);
                            setEquiposForSelection([]);
                        }}
                    />

                    <DetalleEquipoModal
                        isOpen={!!selectedEquipment}
                        onClose={() => setSelectedEquipment(null)}
                        equipment={selectedEquipment}
                        onEdit={canEdit ? () => {
                            setActiveSectionId(selectedSectionId);
                            setIsLevantamientoModalOpen(true);
                        } : undefined}
                        onVerHistorial={() => {
                            setSelectedEqForBitacora(selectedEquipment);
                            setBitacoraModalOpen(true);
                        }}
                    />

                    <HistorialEquipoModal 
                        isOpen={bitacoraModalOpen}
                        onClose={() => setBitacoraModalOpen(false)}
                        equipo={selectedEqForBitacora}
                        historial={selectedEqForBitacora ? allSolicitudes.filter(sol => String(sol.levantamiento_equipo_id) === String(selectedEqForBitacora.id)) : []}
                        onViewReport={(trabajoId) => {
                            setSelectedTrabajoIdForBitacora(trabajoId);
                            setReporteModalOpenForBitacora(true);
                        }}
                    />

                    {selectedTrabajoIdForBitacora && (
                        <DetalleReporteModal 
                            isOpen={reporteModalOpenForBitacora}
                            onClose={() => setReporteModalOpenForBitacora(false)}
                            trabajoId={selectedTrabajoIdForBitacora}
                        />
                    )}

                    <ModalSeleccionEspacio
                        isOpen={isAreaModalOpen || isSubAreaModalOpen}
                        onClose={() => {
                            setIsAreaModalOpen(false);
                            setIsSubAreaModalOpen(false);
                            setActiveAreaForSub(null);
                        }}
                        title={isAreaModalOpen ? "Agregar Nueva Área" : "Agregar Nueva Sub-área"}
                        placeholder={isAreaModalOpen ? "Ej: COCINA, COMEDOR, AZOTEA" : "Ej: REFRIGERACIÓN, ESTUFAS"}
                        onSubmit={isAreaModalOpen ? handleAddArea : handleAddSubArea}
                    />
                </div>
            </div>
        );
    }

    const flatJobs = sortedDates.flatMap(date => groupedJobs[date]);

    const jobsListContent = flatJobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
            No se encontraron trabajos para este filtro.
        </div>
    ) : (
        flatJobs.map((trabajo, index) => {
                    const userRole = user?.role || 'user';
                    const getAccentForStatus = (estado: string) => {
                        if (['Solicitud', 'Pendiente'].includes(estado))
                            return { grad: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', shadow: 'rgba(245,158,11,0.35)', dot: '🟡' };
                        if (['Cotización Enviada', 'Cotización Aceptada'].includes(estado))
                            return { grad: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', shadow: 'rgba(59,130,246,0.35)', dot: '🔵' };
                        if (['Aceptada', 'Asignado', 'En Espera'].includes(estado))
                            return { grad: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.35)', dot: '🟠' };
                        if (estado === 'En Proceso')
                            return { grad: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16,185,129,0.35)', dot: '🟢' };
                        if (['Finalizado', 'Completado'].includes(estado))
                            return { grad: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', shadow: 'rgba(139,92,246,0.35)', dot: '🟣' };
                        // default fallback
                        return { grad: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', shadow: 'rgba(100,116,139,0.35)', dot: '⚪' };
                    };

                    const seenAccent = getAccentForStatus(trabajo.estado);

                    return (
                            <div
                                key={trabajo.id}
                                className={`${styles.jobCard} ${getBarClass(trabajo)}`}
                                style={{ '--index': index } as React.CSSProperties}
                                onClick={(e) => {
                                    if (!(e.target as HTMLElement).closest('button')) {
                                        markCardAsSeen(userRole, trabajo.id, trabajo.estado);
                                        const basePath = user?.role === 'tecnico' ? '/tecnico' : (user?.role === 'cliente' ? '/cliente' : (['autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '') ? '/autonomo' : (user?.role === 'encargado' ? '/encargado' : '/menu')));
                                        if (trabajo.isMantenimiento) {
                                            navigate(`${basePath}/mantenimiento-detalle/${trabajo.original_id}`);
                                        } else {
                                            navigate(`${basePath}/trabajo-detalle/${trabajo.id}`);
                                        }
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
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className={styles.cardContent}>
                                        <div className={styles.cardLeftDetails}>
                                            {/* FILA SUPERIOR: FECHA Y MENU */}
                                            <div className={styles.headerRow}>
                                                <div className={styles.dateGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    {!isCardSeen(userRole, trabajo.id, trabajo.estado) && (
                                                        <span style={{
                                                            background: seenAccent.grad,
                                                            color: '#ffffff',
                                                            fontSize: '10px',
                                                            fontWeight: '900',
                                                            padding: '3px 8px',
                                                            borderRadius: '20px',
                                                            boxShadow: `0 2px 8px ${seenAccent.shadow}`,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '3px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            {seenAccent.dot} NUEVO
                                                        </span>
                                                    )}
                                                    <p className={styles.strikingDate}>
                                                        📅 Cita solicitada: {trabajo.fechaAsignada || trabajo.fecha}
                                                    </p>
                                                {trabajo.hora_llegada && (
                                                    <p className={styles.strikingDate} style={{ color: '#059669', marginTop: '4px', background: '#ecfdf5', display: 'inline-block', padding: '2px 8px', borderRadius: '8px' }}>
                                                        📍 Técnico en sitio (Llegada: {trabajo.hora_llegada})
                                                    </p>
                                                )}
                                            </div>
                                            {/* ACCIONES - Solo Admin o Cliente en la parte derecha del header */}
                                            {user?.role === 'cliente' && trabajo.estado !== 'Finalizado' && trabajo.estado !== 'Completado' && (
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
                                                {user?.role === 'cliente' && trabajo.estado !== 'Finalizado' && trabajo.estado !== 'Completado' && (
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
                                                            onClick={(e) => handleDeleteRequest(e, trabajo)}
                                                            title="Eliminar"
                                                        >
                                                            <HiOutlineTrash size={15} />
                                                        </button>
                                                    </div>
                                                )}
                                                {/* Botones de cliente */}
                                                {user?.role === 'cliente' && trabajo.estado !== 'Finalizado' && trabajo.estado !== 'Completado' && (
                                                    <button
                                                        className={styles.trashBtn}
                                                        onClick={(e) => handleDeleteRequest(e, trabajo)}
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
                })
    );

    const renderSummaryGrid = () => {
        const colPendientes = flatJobs.filter(t => ['En Espera', 'Asignado', 'Pendiente'].includes(t.estado));
        const colProceso = flatJobs.filter(t => t.estado === 'En Proceso');
        const colFinalizadas = flatJobs.filter(t => ['Finalizado', 'Completado'].includes(t.estado));
        const colSolicitudes = flatJobs.filter(t => t.estado === 'Solicitud');

        const renderMiniCard = (trabajo: any) => {
            return (
                <div key={trabajo.id} style={{ padding: '12px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', marginBottom: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.15s, box-shadow 0.15s' }} 
                    onClick={() => {
                        const basePath = user?.role === 'tecnico' ? '/tecnico' : (user?.role === 'cliente' ? '/cliente' : (['autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '') ? '/autonomo' : (user?.role === 'encargado' ? '/encargado' : '/menu')));
                        if (trabajo.isMantenimiento) {
                            navigate(`${basePath}/mantenimiento-detalle/${trabajo.original_id}`);
                        } else {
                            navigate(`${basePath}/trabajo-detalle/${trabajo.id}`);
                        }
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                    }}
                >
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>#{trabajo.id} - {trabajo.titulo}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{trabajo.fecha}</div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>{trabajo.prioridad || 'Media'}</span>
                        <span style={{ fontSize: '10px', background: '#fffbeb', padding: '2px 6px', borderRadius: '4px', color: '#b45309', fontWeight: 600 }}>{trabajo.estado}</span>
                    </div>
                </div>
            );
        };

        if (activeSummaryTab) {
            let items: any[] = [];
            let badgeBg = '#f59e0b';
            if (activeSummaryTab === 'Pendientes') {
                items = colPendientes;
                badgeBg = '#f59e0b';
            } else if (activeSummaryTab === 'En Proceso') {
                items = colProceso;
                badgeBg = '#10b981';
            } else if (activeSummaryTab === 'Finalizados') {
                items = colFinalizadas;
                badgeBg = '#8b5cf6';
            } else if (activeSummaryTab === 'Solicitudes') {
                items = colSolicitudes;
                badgeBg = '#3b82f6';
            }

            return (
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                        <button
                            onClick={() => setActiveSummaryTab(null)}
                            style={{
                                background: '#f1f5f9',
                                border: 'none',
                                color: '#475569',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        >
                            ← Volver
                        </button>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: badgeBg,
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '12px'
                        }}>
                            {activeSummaryTab} ({items.length})
                        </span>
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: '320px', paddingRight: '4px' }}>
                        {items.map(renderMiniCard)}
                        {items.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                                No hay trabajos en esta sección.
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        const SummarySquare = ({ title, count, gradient, border, textColor, onClick }: any) => {
            const [hovered, setHovered] = useState(false);
            return (
                <div
                    onClick={onClick}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    style={{
                        background: gradient,
                        border: border,
                        color: textColor,
                        cursor: 'pointer',
                        borderRadius: '16px',
                        padding: '18px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: hovered ? 'translateY(-3px)' : 'none',
                        boxShadow: hovered 
                            ? '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)' 
                            : '0 2px 4px rgba(0, 0, 0, 0.02)',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1, marginBottom: '6px' }}>{count}</div>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>{title}</div>
                </div>
            );
        };

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', width: '100%' }}>
                <SummarySquare 
                    title="Solicitudes" 
                    count={colSolicitudes.length} 
                    gradient="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" 
                    border="1px solid #bfdbfe" 
                    textColor="#1d4ed8" 
                    onClick={() => setActiveSummaryTab('Solicitudes')} 
                />
                <SummarySquare 
                    title="Pendientes" 
                    count={colPendientes.length} 
                    gradient="linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" 
                    border="1px solid #fde68a" 
                    textColor="#b45309" 
                    onClick={() => setActiveSummaryTab('Pendientes')} 
                />
                <SummarySquare 
                    title="En Proceso" 
                    count={colProceso.length} 
                    gradient="linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" 
                    border="1px solid #a7f3d0" 
                    textColor="#047857" 
                    onClick={() => setActiveSummaryTab('En Proceso')} 
                />
                <SummarySquare 
                    title="Finalizados" 
                    count={colFinalizadas.length} 
                    gradient="linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)" 
                    border="1px solid #ddd6fe" 
                    textColor="#6d28d9" 
                    onClick={() => setActiveSummaryTab('Finalizados')} 
                />
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

                    {/* LOS BOTONES DE ACCIÓN AHORA ESTÁN ABAJO, ASÍ QUE ESTE CONTENEDOR QUEDA VACÍO O SE ELIMINA */}
                </div>

                {/* ESTRUCTURA DE CONTENIDO */}
                {!isCotizacionesTab && !isHistorialTab && !isEquiposTab ? (
                    <div className={styles.dashboardGrid}>
                        {/* COLUMNA IZQUIERDA: PESTAÑAS Y TRABAJOS */}
                        <div className={styles.leftColumn}>
                            {/* BOTONES DE ACCIÓN (MOVIDOS AQUÍ) */}
                            <div className={styles.tabBarWrapper} style={{ justifyContent: 'flex-start', margin: '0 0 20px 0' }}>
                                {(() => {
                                    const roleStr = (typeof user?.role === 'string' ? user.role : (user?.role?.name || '')).toLowerCase();
                                    const isEncargado = roleStr === 'encargado' || roleStr.includes('encargado') || roleStr.includes('subgerente') || roleStr.includes('gerente');
                                    const isCliente = roleStr === 'cliente';
                                    const isAdmin = roleStr === 'admin' || roleStr === 'root' || roleStr === 'sub-admin';
                                    const isAutonomo = roleStr.includes('autonomo');
                                    const isTecnico = roleStr.includes('tecnico');

                                    const canSeeActions = isCliente || isAdmin || isEncargado || isAutonomo || isTecnico;
                                    const canSeeSOS = isCliente || isEncargado || isAutonomo || isAdmin;
                                    const canSeeSolicitud = isCliente || isEncargado || isAutonomo || isAdmin;
                                    const canSeeEquipos = isAdmin || isCliente || isEncargado || isAutonomo;

                                    if (!canSeeActions) return null;

                                    return (
                                        <div className={styles.actionButtonsGroup}>
                                            {/* Botón SOS */}
                                            {canSeeSOS && (
                                                <button
                                                    className={styles.sosBtn}
                                                    onClick={handleSOSRequest}
                                                    translate="no"
                                                >
                                                    🚨 SOS
                                                </button>
                                            )}

                                            {/* Botón Solicitud */}
                                            {canSeeSolicitud && (
                                                <button
                                                    className={styles.newRequestBtn}
                                                    onClick={() => {
                                                        setIsSOSRequest(false);
                                                        setIsEditingRequest(false);
                                                        setEditingRequestId(null);
                                                        setNewRequestData({
                                                            categoria: "Electricidad",
                                                            cliente: businessName,
                                                            fecha: new Date().toISOString().split('T')[0],
                                                            descripcion: "",
                                                            equipoSeleccionado: "",
                                                            trabajador_id: ""
                                                        });
                                                        setFormServices([
                                                            {
                                                                id: "svc-" + Date.now(),
                                                                categoria: "Electricidad",
                                                                customCategoria: "",
                                                                descripcion: "",
                                                                equipoSeleccionado: "",
                                                                fotos: [],
                                                                fotosPreviewUrls: [],
                                                                isMinimized: false
                                                            }
                                                        ]);
                                                        setFotosSOS([]);
                                                        setFotosPreviewUrls([]);
                                                        setIsRequestModalOpen(true);
                                                    }}
                                                >
                                                    <HiOutlineClipboardDocument size={18} />
                                                    Solicitud
                                                </button>
                                            )}

                                            {/* Botón Equipos */}
                                            {canSeeEquipos && (
                                                <button
                                                    className={styles.equiposBtn}
                                                    onClick={() => setSearchParams({ tab: 'equipos' })}
                                                >
                                                    <HiOutlineArchiveBox size={18} />
                                                    Equipos
                                                </button>
                                            )}

                                            {/* Botón Ver Historial */}
                                            {isTecnico && (
                                                <button
                                                    className={styles.historialBtn}
                                                    onClick={() => setSearchParams({ tab: 'historial' })}
                                                >
                                                    <HiOutlineClock size={20} />
                                                    Ver Historial
                                                </button>
                                            )}
                                        </div>
                                    );
                                })()}
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
                                            .slice(0, 10);

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
                                                        if (job.isMantenimiento) {
                                                            navigate(`${basePath}/mantenimiento-detalle/${job.original_id}`);
                                                        } else {
                                                            navigate(`${basePath}/trabajo-detalle/${job.id}`);
                                                        }
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
                                                    min={new Date().toISOString().split('T')[0]}
                                                    value={asig.fechaAsignada}
                                                    onChange={(e) => handleUpdateAssignmentDate(asig.tecnicoId, 'fechaAsignada', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <select
                                                    value={asig.horaAsignada}
                                                    onChange={(e) => handleUpdateAssignmentDate(asig.tecnicoId, 'horaAsignada', e.target.value)}
                                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                                >
                                                    <option value="">-- Hora --</option>
                                                    {[
                                                        { val: '07:00', lbl: '07:00 AM' },
                                                        { val: '07:30', lbl: '07:30 AM' },
                                                        { val: '08:00', lbl: '08:00 AM' },
                                                        { val: '08:30', lbl: '08:30 AM' },
                                                        { val: '09:00', lbl: '09:00 AM' },
                                                        { val: '09:30', lbl: '09:30 AM' },
                                                        { val: '10:00', lbl: '10:00 AM' },
                                                        { val: '10:30', lbl: '10:30 AM' },
                                                        { val: '11:00', lbl: '11:00 AM' },
                                                        { val: '11:30', lbl: '11:30 AM' },
                                                        { val: '12:00', lbl: '12:00 PM' },
                                                        { val: '12:30', lbl: '12:30 PM' },
                                                        { val: '13:00', lbl: '01:00 PM' },
                                                        { val: '13:30', lbl: '01:30 PM' },
                                                        { val: '14:00', lbl: '02:00 PM' },
                                                        { val: '14:30', lbl: '02:30 PM' },
                                                        { val: '15:00', lbl: '03:00 PM' },
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
                        
                        {/* CAMPOS COMUNES AL GRUPO */}
                        <div className={styles.formGroup} style={{ marginBottom: '15px' }}>
                            <div className={styles.formGridRow}>
                                <div className={styles.formField}>
                                    <label className={styles.formLabel}>Sucursal / Cliente</label>
                                    <input
                                        type="text"
                                        className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
                                        placeholder="Ej: Pokémon Center"
                                        value={newRequestData.cliente}
                                        onChange={(e) => setNewRequestData({ ...newRequestData, cliente: e.target.value })}
                                        disabled={isEditingRequest}
                                    />
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
                        </div>

                        {/* CONTENEDOR SCROLLABLE PARA FORMULARIOS */}
                        <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '6px', marginBottom: '20px' }}>
                            {formServices.map((svc, index) => {
                                return (
                                    <div key={svc.id} style={{ marginBottom: '20px', padding: '18px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                                        {/* Form Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: svc.isMinimized ? '0' : '15px', borderBottom: svc.isMinimized ? 'none' : '1px solid #e2e8f0', paddingBottom: svc.isMinimized ? '0' : '10px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                🛠️ SERVICIO #{index + 1} {svc.isMinimized ? `— ${svc.categoria}` : ''}
                                            </span>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleMinimize(svc.id)}
                                                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                                >
                                                    {svc.isMinimized ? 'Expandir ↙' : 'Minimizar ↗'}
                                                </button>
                                                {formServices.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeServiceForm(svc.id, svc.dbId)}
                                                        style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#ef4444', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    >
                                                        Eliminar 🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Form Fields */}
                                        {!svc.isMinimized && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <label className={styles.formLabel} style={{ marginBottom: '6px' }}>Categoría del Servicio</label>
                                                    <select
                                                        className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
                                                        value={svc.categoria}
                                                        onChange={(e) => updateFormService(svc.id, 'categoria', e.target.value)}
                                                        style={{ margin: 0 }}
                                                    >
                                                        <option>Electricidad</option>
                                                        <option>Plomeria</option>
                                                        <option>Albañileria</option>
                                                        <option>Limpieza</option>
                                                        <option>Instalación</option>
                                                        <option>Mantenimiento</option>
                                                        <option value="Otro">Otro (Especificar)</option>
                                                    </select>
                                                    {svc.categoria === "Otro" && (
                                                        <input
                                                            type="text"
                                                            className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
                                                            style={{ marginTop: '10px' }}
                                                            placeholder="Escribe la categoría..."
                                                            value={svc.customCategoria}
                                                            onChange={(e) => updateFormService(svc.id, 'customCategoria', e.target.value)}
                                                        />
                                                    )}
                                                </div>

                                                {svc.categoria === 'Mantenimiento' && businessAreas.length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <label className={styles.formLabel} style={{ marginBottom: '6px' }}>Equipo a mantener</label>
                                                        <select
                                                            className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
                                                            value={svc.equipoSeleccionado}
                                                            onChange={(e) => updateFormService(svc.id, 'equipoSeleccionado', e.target.value)}
                                                            style={{ margin: 0 }}
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
                                                )}

                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <label className={styles.formLabel} style={{ marginBottom: '6px' }}>Descripción del problema</label>
                                                    <textarea
                                                        className={`${styles.newServiceTextArea} ${isSOSRequest ? styles.newServiceTextAreaSos : ''}`}
                                                        placeholder="Detalla lo que sucede o los requerimientos del servicio..."
                                                        value={svc.descripcion}
                                                        onChange={(e) => updateFormService(svc.id, 'descripcion', e.target.value)}
                                                        style={{ margin: 0, minHeight: '90px' }}
                                                    />
                                                </div>

                                                {/* Adjuntar fotos */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label className={styles.formLabel}>Adjuntar fotos (Obligatorio)</label>
                                                    
                                                    {svc.fotosPreviewUrls.length > 0 && (
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                                                            {svc.fotosPreviewUrls.map((url, fIdx) => (
                                                                <div key={url} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                                                    <img src={url} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeFormPhoto(svc.id, fIdx)}
                                                                        style={{
                                                                            position: 'absolute',
                                                                            top: '2px',
                                                                            right: '2px',
                                                                            background: 'rgba(15, 23, 42, 0.7)',
                                                                            border: 'none',
                                                                            color: 'white',
                                                                            borderRadius: '50%',
                                                                            width: '16px',
                                                                            height: '16px',
                                                                            fontSize: '9px',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <label className={`${styles.uploadContainer} ${isSOSRequest ? styles.uploadContainerSos : ''}`} style={{ flex: 1, position: 'relative', cursor: 'pointer', padding: '12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '12px' }}>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                capture="environment"
                                                                multiple
                                                                onChange={(e) => handleAddFormPhoto(svc.id, e.target.files)}
                                                                style={{ display: 'none' }}
                                                            />
                                                            📸 Tomar Foto
                                                        </label>

                                                        <label className={`${styles.uploadContainer} ${isSOSRequest ? styles.uploadContainerSos : ''}`} style={{ flex: 1, position: 'relative', cursor: 'pointer', padding: '12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '12px' }}>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                onChange={(e) => handleAddFormPhoto(svc.id, e.target.files)}
                                                                style={{ display: 'none' }}
                                                            />
                                                            🖼️ Abrir Galería
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* BOTÓN AGREGAR OTRO SERVICIO DENTRO DEL SCROLL */}
                            {formServices.length < 10 && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px', marginBottom: '15px' }}>
                                    <button
                                        type="button"
                                        onClick={addMoreServiceForm}
                                        style={{
                                            background: 'none',
                                            border: '2px dashed #f26522',
                                            color: '#f26522',
                                            padding: '10px 20px',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#fff7ed';
                                            e.currentTarget.style.transform = 'scale(1.02)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'none';
                                            e.currentTarget.style.transform = 'none';
                                        }}
                                    >
                                        ➕ Agregar más servicio ({formServices.length}/10)
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={styles.requestModalActions}>
                            <button
                                onClick={() => {
                                    setIsRequestModalOpen(false);
                                    setIsSOSRequest(false);
                                    setIsEditingRequest(false);
                                    setEditingRequestId(null);
                                    setNewRequestData({
                                        categoria: "Electricidad",
                                        cliente: businessName,
                                        fecha: new Date().toISOString().split('T')[0],
                                        descripcion: "",
                                        equipoSeleccionado: "",
                                        trabajador_id: ""
                                    });
                                    setFotosSOS([]);
                                    setFotosPreviewUrls([]);
                                    setFormServices([]);
                                    setDeletedDbIds([]);
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
            
            {/* MODAL SOLICITAR TÉCNICO */}
            {isTechRequestModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ maxWidth: '400px', background: 'white', borderRadius: '12px', padding: '20px' }}>
                        <div className={styles.modalHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Solicitar Técnico</h2>
                            <button 
                                onClick={() => setIsTechRequestModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <HiX size={24} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p style={{ color: '#475569', marginBottom: '15px', fontSize: '14px' }}>
                                ¿Qué tipo de técnico necesitas? Enviaremos tu solicitud al administrador general.
                            </p>
                            <select 
                                className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
                                value={requestRole} 
                                onChange={(e) => setRequestRole(e.target.value)}
                                style={{ width: '100%', marginBottom: '20px' }}
                            >
                                <option value="">Selecciona una opción...</option>
                                {[
                                    "Plomero", "Electricista", "Albañil", "Pintor", "Jardinero",
                                    "Limpieza", "Técnico HVAC", "Herrero", "Carpintero"
                                ].map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                            
                            <div className={styles.formActions} style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button 
                                    onClick={() => setIsTechRequestModalOpen(false)}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleRequestTechnician}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#f26522', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Solicitar
                                </button>
                            </div>
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
