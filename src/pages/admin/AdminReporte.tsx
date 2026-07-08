import React, { useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import styles from './AdminReporte.module.css';
import { createReporte, getReporteByTrabajoId } from '../../services/reportesService';
import { getActividadesByTrabajo } from '../../services/actividadesService';
import { updateEstadoTrabajo, getTrabajo } from '../../services/trabajosService';
import { createNotificacionByRole, createNotificacion, createNotificacionNegocio } from '../../services/notificacionesService';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { 
    HiOutlineCamera, 
    HiOutlinePhoto, 
    HiXMark,
    HiOutlineArrowUpTray,
    HiOutlinePlus
} from 'react-icons/hi2';
import { generateMaintenanceReportPDF } from '../../utils/pdfGenerator';
import ReportePDFPreview from '../../components/modals/ReportePDFPreview';

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

const AdminReporte: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const trabajoId = location.state?.trabajoId;
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();

    const [trabajoBase, setTrabajoBase] = useState<any>(null);
    const [reporteTienda, setReporteTienda] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [materiales, setMateriales] = useState('');
    const [refaccionesList, setRefaccionesList] = useState<{pieza: string, cantidad: number, costo_estimado: string}[]>([]);
    const [observaciones, setObservaciones] = useState('');

    const [imagenes, setImagenes] = useState({
        antes: null as string | null,
        durante: null as string | null,
        despues: null as string | null
    });
    const [imagenesObservacion, setImagenesObservacion] = useState<string[]>([]);
    const [observacionesList, setObservacionesList] = useState<{ id: string; texto: string; imagenes: string[] }[]>([]);
    const [activeUploadBlockId, setActiveUploadBlockId] = useState<string | null>(null);
    const [showObservacionesInput, setShowObservacionesInput] = useState(false);
    const [firmaEmpresa, setFirmaEmpresa] = useState<string | null>(null);
    const [reporteId, setReporteId] = useState<number | null>(null);
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [involucraEquipo, setInvolucraEquipo] = useState(false);
    const [showEquiposSection, setShowEquiposSection] = useState(false);
    const [equipoInfo, setEquipoInfo] = useState({
        tipo: 'Instalación',
        marca: '',
        modelo: '',
        piezas: '',
        garantia: ''
    });

    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
    const [showReportePreview, setShowReportePreview] = useState(false);

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
            if (typeof url === 'string' && (url.includes('127.0.0.1') || url.includes('localhost'))) {
                const parts = url.split('/storage/');
                if (parts.length === 2) {
                    return `${baseUrl}/storage/${parts[1]}`;
                }
            }
            return url;
        });
    };

    React.useEffect(() => {
        const loadReportData = async () => {
            let initFechaInicio = '';
            setFechaInicio('');
            // --- RESET: Limpiar estados previos para evitar fugas entre reportes ---
            setReporteTienda('');
            setDescripcion('');
            setMateriales('');
            setRefaccionesList([]);
            setObservaciones('');
            setImagenes({ antes: null, durante: null, despues: null });
            setImagenesObservacion([]);
            setObservacionesList([]);
            setShowObservacionesInput(false);
            setFirmaEmpresa(null);
            setReporteId(null);
            setInvolucraEquipo(false);
            setEquipoInfo({
                tipo: 'Instalación',
                marca: '',
                modelo: '',
                piezas: '',
                garantia: ''
            });

            try {
                const report = await getReporteByTrabajoId(Number(id));
                if (report) {
                    setReporteId(report.id || null);
                    try {
                        const parsed = JSON.parse(report.solucion);
                        if (parsed.fechaInicio) initFechaInicio = parsed.fechaInicio;
                        if (parsed.reporteTienda) setReporteTienda(parsed.reporteTienda);
                        if (parsed.descripcion) setDescripcion(parsed.descripcion);
                        if (parsed.materiales) setMateriales(parsed.materiales);
                        if (parsed.observaciones) setObservaciones(parsed.observaciones);
                        if (parsed.imagenes) setImagenes(parsed.imagenes);
                        if (parsed.imagenesObservacion) {
                            setImagenesObservacion(parsed.imagenesObservacion);
                        } else if (parsed.imagenObservacion) {
                            setImagenesObservacion([parsed.imagenObservacion]);
                        } else {
                            setImagenesObservacion([]);
                        }

                        let loadedObsList: { id: string; texto: string; imagenes: string[] }[] = [];
                        if (parsed.observacionesList) {
                            loadedObsList = parsed.observacionesList;
                        } else if (parsed.observaciones || parsed.imagenObservacion || (parsed.imagenesObservacion && parsed.imagenesObservacion.length > 0)) {
                            loadedObsList = [{
                                id: Date.now().toString(),
                                texto: parsed.observaciones || '',
                                imagenes: parsed.imagenesObservacion || (parsed.imagenObservacion ? [parsed.imagenObservacion] : [])
                            }];
                        }
                        setObservacionesList(loadedObsList);

                        if (loadedObsList.length > 0 || parsed.observaciones || parsed.imagenObservacion || (parsed.imagenesObservacion && parsed.imagenesObservacion.length > 0)) {
                            setShowObservacionesInput(true);
                        }
                        if (parsed.firmaEmpresa) setFirmaEmpresa(parsed.firmaEmpresa);
                        if (parsed.involucraEquipo !== undefined) setInvolucraEquipo(parsed.involucraEquipo);
                        if (parsed.equipoInfo) setEquipoInfo(parsed.equipoInfo);
                        if (parsed.refaccionesList) setRefaccionesList(parsed.refaccionesList);
                    } catch(e) {}
                }

                // If no report or fields are still empty, try temporal storage
                const temporalData = localStorage.getItem(`report_data_temporal_${id}`);
                if (temporalData) {
                    const parsed = JSON.parse(temporalData);
                    if (parsed.fechaInicio) initFechaInicio = initFechaInicio || parsed.fechaInicio || '';
                    setReporteTienda(prev => prev || parsed.reporteTienda || '');
                    setDescripcion(prev => prev || parsed.descripcion || '');
                    setMateriales(prev => prev || parsed.materiales || '');
                    setObservaciones(prev => prev || parsed.observaciones || '');
                    setImagenes(prev => ({
                        antes: prev.antes || parsed.imagenes?.antes || null,
                        durante: prev.durante || parsed.imagenes?.durante || null,
                        despues: prev.despues || parsed.imagenes?.despues || null
                    }));
                    if (parsed.imagenesObservacion) {
                        setImagenesObservacion(parsed.imagenesObservacion);
                    } else if (parsed.imagenObservacion) {
                        setImagenesObservacion([parsed.imagenObservacion]);
                    }

                    let loadedObsList: { id: string; texto: string; imagenes: string[] }[] = [];
                    if (parsed.observacionesList) {
                        loadedObsList = parsed.observacionesList;
                    } else if (parsed.observaciones || parsed.imagenObservacion || (parsed.imagenesObservacion && parsed.imagenesObservacion.length > 0)) {
                        loadedObsList = [{
                            id: Date.now().toString(),
                            texto: parsed.observaciones || '',
                            imagenes: parsed.imagenesObservacion || (parsed.imagenObservacion ? [parsed.imagenObservacion] : [])
                        }];
                    }
                    setObservacionesList(loadedObsList);

                    if (loadedObsList.length > 0 || parsed.observaciones || parsed.imagenObservacion || (parsed.imagenesObservacion && parsed.imagenesObservacion.length > 0)) {
                        setShowObservacionesInput(true);
                    }
                    setFirmaEmpresa(prev => prev || parsed.firmaEmpresa || null);
                    setInvolucraEquipo(prev => prev || (parsed.involucraEquipo !== undefined ? parsed.involucraEquipo : false));
                    if (parsed.equipoInfo) {
                        setEquipoInfo(prev => ({
                            tipo: prev.marca ? prev.tipo : (parsed.equipoInfo.tipo || 'Instalación'),
                            marca: prev.marca || parsed.equipoInfo.marca || '',
                            modelo: prev.modelo || parsed.equipoInfo.modelo || '',
                            piezas: prev.piezas || parsed.equipoInfo.piezas || '',
                            garantia: prev.garantia || parsed.equipoInfo.garantia || ''
                        }));
                    }
                    if (parsed.refaccionesList && refaccionesList.length === 0) setRefaccionesList(parsed.refaccionesList);
                }

                // --- NUEVO: Sincronizar desde el Trabajo (Fuente de Verdad de Mantenimiento) ---
                let equipmentFromJob: any = null;
                try {
                    const jobData = await getTrabajo(Number(id));
                    setTrabajoBase(jobData);
                    let desc = jobData.descripcion || '';
                    desc = desc.replace(/^.*Problema reportado:\s*/i, '');
                    setReporteTienda(desc);
                    const solicitud = jobData.mantenimiento_solicitud_visita || jobData.mantenimientoSolicitudVisita || jobData.mantenimiento_solicitud_reparacion || jobData.mantenimientoSolicitudReparacion;
                    equipmentFromJob = solicitud ? (solicitud.levantamiento_equipo || solicitud.levantamientoEquipo) : null;
                } catch (err) {
                    console.error("Error al obtener datos del trabajo para el reporte:", err);
                }

                // --- Sincronización desde Actividades (Enriquecer campos vacíos) ---
                if (!equipoInfo.marca || !descripcion || refaccionesList.length === 0) {
                    const acts = await getActividadesByTrabajo(Number(id));
                    const serviceMarker = "|||SERVICE_DATA|||";
                    const quoteMarker = "|||QUOTE_DATA|||";
                    const techMarker = "|||TECH_NAME|||";
                    
                    let newRefList: {pieza: string, cantidad: number, costo_estimado: string}[] = [];
                    let concatenatedDesc = "";

                    acts.forEach((a: any) => {
                        // Agregamos refacciones detectadas en actividades
                        if (a.refacciones && a.refacciones.length > 0) {
                            a.refacciones.forEach((r: any) => {
                                newRefList.push({
                                    pieza: r.pieza,
                                    cantidad: r.cantidad,
                                    costo_estimado: String(r.costo_estimado || "")
                                });
                            });
                        }
                        // Construimos descripción a partir de actividades
                        const rawDesc = a.descripcion || "";
                        const cleanDesc = rawDesc.split(serviceMarker)[0].split(quoteMarker)[0].split(techMarker)[0].trim();
                        if (cleanDesc) {
                            concatenatedDesc += (concatenatedDesc ? "\n" : "") + cleanDesc;
                        }
                    });
                    
                    // Solo aplicamos el autollenado si el campo actual está vacío
                    setRefaccionesList(prev => prev.length === 0 ? newRefList : prev);
                    setDescripcion(prev => prev || concatenatedDesc);

                    // Determinar si existe alguna actividad de tipo Mantenimiento o Instalación
                    const hasEquipoActivity = acts.some((a: any) =>
                        a.tipo === 'Mantenimiento' || a.tipo === 'Instalacion' || a.tipo === 'Instalación'
                    );
                    setShowEquiposSection(hasEquipoActivity);

                    // Si aún no tenemos equipo, lo buscamos en el Job o en Actividades
                    if (!equipoInfo.marca) {
                        if (equipmentFromJob) {
                            setInvolucraEquipo(true);
                            setEquipoInfo(prev => ({
                                ...prev,
                                tipo: 'Mantenimiento',
                                marca: equipmentFromJob.marca || '',
                                modelo: equipmentFromJob.modelo || ''
                            }));
                        } else {
                            const activityWithEquipment = acts.find((a: any) =>
                                (a.tipo === 'Mantenimiento' || a.tipo === 'Instalacion' || a.tipo === 'Instalación')
                                && a.descripcion?.includes(serviceMarker)
                            );
                            if (activityWithEquipment) {
                                try {
                                    const parts = activityWithEquipment.descripcion.split(serviceMarker);
                                    const jsonContent = parts[1].split(quoteMarker)[0].split(techMarker)[0].trim();
                                    const sData = JSON.parse(jsonContent);
                                    setInvolucraEquipo(true);
                                    setEquipoInfo(prev => ({
                                        ...prev,
                                        tipo: activityWithEquipment.tipo === 'Mantenimiento' ? 'Mantenimiento' : 'Instalación',
                                        marca: sData.marca || '',
                                        modelo: sData.modelo || '',
                                        piezas: prev.piezas || newRefList.map(r => `- ${r.cantidad}x ${r.pieza}`).join(", ") || sData.piezas || '',
                                        garantia: sData.garantia || ''
                                    }));
                                } catch (e) {}
                            }
                        }
                    }
                }

                if (!initFechaInicio) {
                    initFechaInicio = new Date().toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                }
                setFechaInicio(initFechaInicio);

            } catch (err) {
                console.error("Error cargando reporte inicial:", err);
            }
        };

        loadReportData();
    }, [id]);

    const handleEquipoInfoChange = (field: string, value: string) => {
        setEquipoInfo(prev => ({ ...prev, [field]: value }));
    };

    const antesInputRef = useRef<HTMLInputElement>(null);
    const duranteInputRef = useRef<HTMLInputElement>(null);
    const despuesInputRef = useRef<HTMLInputElement>(null);
    const observacionInputRef = useRef<HTMLInputElement>(null);
    const firmaInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'antes' | 'durante' | 'despues') => {
        const file = e.target.files?.[0];
        if (file) {
            compressImage(file, (base64) => {
                setImagenes(prev => ({ ...prev, [type]: base64 }));
            });
        }
    };

    const addObservacionBlock = () => {
        setObservacionesList(prev => [...prev, { id: Date.now().toString() + '-' + Math.random().toString(), texto: '', imagenes: [] }]);
    };

    const removeObservacionBlock = (id: string) => {
        setObservacionesList(prev => prev.filter(o => o.id !== id));
    };

    const handleObservacionTextChange = (id: string, text: string) => {
        setObservacionesList(prev => prev.map(o => o.id === id ? { ...o, texto: text } : o));
    };

    const triggerObservacionImageUpload = (id: string) => {
        setActiveUploadBlockId(id);
        observacionInputRef.current?.click();
    };

    const handleImagenObservacionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && activeUploadBlockId) {
            Array.from(files).forEach((file) => {
                compressImage(file, (base64) => {
                    setObservacionesList(prev => prev.map(o => o.id === activeUploadBlockId ? { ...o, imagenes: [...o.imagenes, base64] } : o));
                });
            });
        }
        e.target.value = '';
    };

    const removeObservacionBlockImage = (blockId: string, imageIndex: number) => {
        setObservacionesList(prev => prev.map(o => o.id === blockId ? { ...o, imagenes: o.imagenes.filter((_, idx) => idx !== imageIndex) } : o));
    };

    const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type === "application/pdf") {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setFirmaEmpresa(ev.target?.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                compressImage(file, (base64) => {
                    setFirmaEmpresa(base64);
                });
            }
        }
    };

    const removeImage = (type: 'antes' | 'durante' | 'despues') => {
        setImagenes(prev => ({ ...prev, [type]: null }));
    };

    const removeFirma = () => {
        setFirmaEmpresa(null);
    };

    const handleGuardarInformacion = async (showSuccessAlert = true) => {
        const safeId = trabajoId || id;
        if (!safeId) {
            showAlert("Error", "No se encontró el ID del trabajo asociado.", "error");
            return;
        }

        const compiledObservaciones = observacionesList.map(o => o.texto).filter(Boolean).join('\n\n');
        const compiledImagenesObservacion = observacionesList.reduce((acc, o) => [...acc, ...o.imagenes], [] as string[]);

        const reportData = {
            id,
            reporteTienda,
            descripcion,
            materiales,
            refaccionesList,
            observaciones: compiledObservaciones,
            imagenes,
            imagenObservacion: compiledImagenesObservacion[0] || null,
            imagenesObservacion: compiledImagenesObservacion,
            observacionesList,
            firmaEmpresa,
            involucraEquipo,
            equipoInfo: involucraEquipo ? equipoInfo : null,
            fecha: new Date().toLocaleDateString(),
            tecnicoNombre: trabajoBase?.trabajador?.nombre || user?.name || trabajoBase?.tecnico || 'Técnico',
            tecnicoAvatar: user?.avatar || null,
            fechaInicio: fechaInicio || new Date().toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
            isVisita: trabajoBase?.tipo === 'Visita' || trabajoBase?.originalTipo === 'Visita'
        };
        
        try {
            const dataToSave = {
                trabajo_id: Number(safeId),
                descripcion: descripcion || "Reporte generado",
                solucion: JSON.stringify(reportData) 
            };
            await createReporte(dataToSave);
            if (showSuccessAlert) {
                showAlert("Éxito", "Información guardada en Base de Datos exitosamente.", "success");
            }
        } catch (error) {
            console.error(error);
            showAlert("Error", "Hubo un error al guardar en la Base de Datos.", "error");
        }
    };

    const handleGuardarYPrevisualizar = async () => {
        await handleGuardarInformacion(false);
        setShowReportePreview(true);
    };

    const handleGenerarPDF = async () => {
        try {
            const dynamicFolio = reporteId ? `REP-${reporteId.toString().padStart(5, '0')}` : `TRB-${(trabajoId || id || '').toString().padStart(5, '0')}`;
            
            // Compilamos los materiales combinando el widget dinámico y el texto extra
            const widgetMateriales = refaccionesList.length > 0 
                ? refaccionesList.map(r => `- ${r.cantidad || 1}x ${r.pieza} ${r.costo_estimado ? `($${r.costo_estimado})` : ''}`).join('\n')
                : '';
            const combinedMateriales = [widgetMateriales, materiales].filter(Boolean).join('\n\n');

            const compiledObservaciones = observacionesList.map(o => o.texto).filter(Boolean).join('\n\n');
            const compiledImagenesObservacion = observacionesList.reduce((acc, o) => [...acc, ...o.imagenes], [] as string[]);

            await generateMaintenanceReportPDF({
                id: reporteId || id || trabajoId || 0,
                folio: dynamicFolio,
                fecha: new Date().toLocaleDateString('es-MX'),
                sucursal: trabajoBase?.negocio?.nombre || '---',
                encargado: trabajoBase?.negocio?.encargado || '---',
                tecnico: trabajoBase?.trabajador?.nombre || user?.name || trabajoBase?.tecnico || 'Técnico',
                tecnicoAvatar: user?.avatar || null,
                fechaInicio: fechaInicio || null,
                diagnostico: reporteTienda,
                descripcion,
                materiales: combinedMateriales,
                observaciones: compiledObservaciones,
                observacionesList: observacionesList,
                imagenes: {
                    antes: imagenes.antes,
                    durante: imagenes.durante,
                    despues: imagenes.despues,
                    extra: compiledImagenesObservacion
                },
                firmaEmpresa,
                equipo: involucraEquipo ? equipoInfo : null,
                refaccionesList: refaccionesList,
                isVisita: trabajoBase?.tipo === 'Visita' || trabajoBase?.originalTipo === 'Visita'
            });
        } catch (error) {
            console.error(error);
            showAlert("Error PDF", "Hubo un error al generar el PDF. Revisa las imágenes.", "error");
        }
    };

    const handleOpenConfirm = () => {
        if (!reporteTienda || !descripcion || !firmaEmpresa) {
            showAlert("Campos Incompletos", "Por favor completa los campos principales y asegúrate de agregar la foto de la firma de la empresa.", "warning");
            return;
        }
        
        showConfirm(
            "Finalizar Reporte",
            "¿Estás seguro de enviar? Una vez enviado, el reporte no podrá ser editado y se marcará como finalizado.",
            () => handleSave(),
            () => {},
            "Confirmar y Finalizar",
            "Cancelar"
        );
    };

    const handleSave = async () => {
        const safeTrabajoId = trabajoId || id;
        if (!safeTrabajoId) return;

        const jobTitle = `Trabajo #${safeTrabajoId}`;
        localStorage.removeItem(`report_data_temporal_${id}`);

        try {
            await updateEstadoTrabajo(Number(safeTrabajoId), { estado: 'Finalizado' });

            // ELIMINADO: Ya no desasignamos al técnico al finalizar. 
            // Queremos mantener el registro de quién hizo el trabajo en el historial.

            // --- PERSISTENCIA DE NOTIFICACIONES EN BD ---
            // 1. Notificar a los Admins
            try {
                await createNotificacionByRole({
                    role: 'admin',
                    titulo: 'Trabajo Finalizado ✨',
                    mensaje: `El técnico ha generado reporte para: ${jobTitle}.`,
                    enlace: `/menu/trabajo-detalle/${safeTrabajoId}`
                });
            } catch (notiErr) {
                console.error("Error al notificar admins en BD:", notiErr);
            }

            // 2. Notificar al Cliente a través del negocio asociado al trabajo y al admin autonomo
            try {
                const jobData = await getTrabajo(Number(safeTrabajoId));
                const clienteUserId = jobData?.negocio?.user_id;
                
                if (clienteUserId) {
                    await createNotificacion({
                        user_id: clienteUserId,
                        titulo: '¡Tu trabajo ha sido completado! ✅',
                        mensaje: `El servicio "${jobData.titulo || jobTitle}" ha sido finalizado. Puedes revisar el reporte en tu historial.`,
                        enlace: `/cliente/historial`
                    });
                }
                
                // Notificar al admin autonomo (subgerente) específico de la sucursal
                if (jobData?.admin_autonomo_id) {
                    await createNotificacion({
                        user_id: jobData.admin_autonomo_id,
                        titulo: 'Reporte de Visita/Trabajo Recibido 📋',
                        mensaje: `El técnico ha generado y enviado el reporte para la sucursal: ${jobData.sucursal || 'Tu sucursal'}.`,
                        enlace: `/autonomo/trabajo-detalle/${safeTrabajoId}`
                    });
                }

                // Notificar a todos los encargados de la sucursal
                if (jobData?.negocio_id) {
                    await createNotificacionNegocio({
                        negocio_id: jobData.negocio_id,
                        titulo: 'Reporte de Visita/Trabajo Recibido 📋',
                        mensaje: `El técnico ha generado y enviado el reporte para tu sucursal.`,
                        enlace: `/encargado/resumen`
                    });
                }
            } catch (clienteNotiErr) {
                console.error("Error al notificar al cliente/subgerente en BD:", clienteNotiErr);
            }

            showAlert("Éxito", "Reporte guardado con éxito en la Base de Datos.", "success");

            const basePath = user?.role === 'tecnico' ? '/tecnico' : (['autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '') ? '/autonomo' : '/menu');
            const targetPath = `${basePath}/trabajo-detalle/${safeTrabajoId}`;
            navigate(targetPath, { replace: true });

        } catch (error: any) {
            console.error("Error al finalizar reporte en DB:", error);
            showAlert("Error de Servidor", "No se pudo sincronizar la finalización con la base de datos: " + (error.response?.data?.message || error.message), "error");
        }
    };

    return (
        <div className={styles.dashboardLayout} style={{ gap: '0', padding: '20px', height: '100%' }}>

            <input type="file" ref={antesInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'antes')} accept="image/*" capture="environment" />
            <input type="file" ref={duranteInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'durante')} accept="image/*" capture="environment" />
            <input type="file" ref={despuesInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'despues')} accept="image/*" capture="environment" />
            <input type="file" ref={observacionInputRef} style={{ display: 'none' }} onChange={handleImagenObservacionChange} accept="image/*" multiple />
            <input type="file" ref={firmaInputRef} style={{ display: 'none' }} onChange={handleFirmaChange} accept="image/*,application/pdf" />

            <div className={styles.mainCard}>
                <div className={styles.bgShape1}></div>
                <div className={styles.bgShape2}></div>

                <div className={styles.contentWrapper}>
                    <div className={styles.scrollableContent}>
                        <div className={styles.header}>
                            <h1 className={styles.pageTitle}>Reporte de Servicio</h1>
                            <div className={styles.metaInfo}>
                                <div className={styles.folioBadge}>
                                    FOLIO: {reporteId ? `REP-${reporteId.toString().padStart(5, '0')}` : `TRB-${(trabajoId || id || '').toString().padStart(5, '0')}`}
                                </div>
                                <div className={styles.metaValue}>Fecha: {new Date().toLocaleDateString()}</div>
                            </div>
                        </div>

                        <div className={styles.mainGrid}>
                            {/* COLUMNA IZQUIERDA: Datos del Reporte */}
                            <div className={`${styles.infoSectionCard} ${styles.reportCol}`}>
                                <h3 className={styles.sectionTitle}>Datos del Reporte</h3>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Reporte de tienda / Diagnóstico:</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={reporteTienda}
                                        readOnly={true}
                                        style={{ backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                                        placeholder="No se proporcionó un diagnóstico inicial de la tienda."
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Descripción del Trabajo:</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                        placeholder="Ej. Se realizó cambio de capacitor..."
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Materiales Extras o Imprevistos:</label>
                                    {refaccionesList.map((ref, i) => (
                                        <div key={i} className={styles.refaccionRow}>
                                            <input
                                                placeholder="Material / Refacción"
                                                value={ref.pieza}
                                                onChange={(e) => {
                                                    const newR = [...refaccionesList];
                                                    newR[i].pieza = e.target.value;
                                                    setRefaccionesList(newR);
                                                }}
                                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Cant."
                                                value={ref.cantidad || ""}
                                                onChange={(e) => {
                                                    const newR = [...refaccionesList];
                                                    newR[i].cantidad = Number(e.target.value);
                                                    setRefaccionesList(newR);
                                                }}
                                                style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Precio ($)"
                                                value={ref.costo_estimado || ""}
                                                onChange={(e) => {
                                                    const newR = [...refaccionesList];
                                                    newR[i].costo_estimado = e.target.value;
                                                    setRefaccionesList(newR);
                                                }}
                                                style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                            />
 
                                            <button
                                                onClick={() => setRefaccionesList(refaccionesList.filter((_, idx) => idx !== i))}
                                                style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setRefaccionesList([...refaccionesList, { pieza: '', cantidad: 1, costo_estimado: '' }])}
                                        className={styles.addRefaccionBtn}
                                    >
                                        + Agregar Material Extra/Imprevisto
                                    </button>

                                    <label className={styles.label}>Otros Materiales o Consumibles Libres:</label>
                                    <textarea
                                        className={styles.textarea}
                                        style={{ height: '80px' }}
                                        value={materiales}
                                        onChange={(e) => setMateriales(e.target.value)}
                                        placeholder="Ej. Cinta adhesiva, solventes, alambre extra..."
                                    />
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: Información de la Solicitud + Equipos Involucrados */}
                            <div className={styles.sideCol}>
                                {/* DETALLES DE LA SOLICITUD DEL CLIENTE */}
                                {trabajoBase && (
                                    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '20px' }}>📋</span> Información de la Solicitud del Cliente
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Servicio que Solicitó</span>
                                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>{trabajoBase.titulo || trabajoBase.tipo || 'Servicio de Mantenimiento'}</span>
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Técnico Asignado</span>
                                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#f26522' }}>{trabajoBase.trabajador?.nombre || trabajoBase.tecnico || 'Sin Asignar'}</span>
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Detalles / Notas del Registro</span>
                                                <p style={{ fontSize: '13px', color: '#475569', margin: 0, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                                    "{trabajoBase.descripcion || 'Sin descripción adicional.'}"
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', borderTop: '1px solid #f1f5f9', marginTop: '15px', paddingTop: '15px' }}>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Ubicación / Dirección</span>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block' }}>
                                                    {trabajoBase.negocio?.nombrePlaza || trabajoBase.negocio?.nombre_plaza ? `Plaza: ${trabajoBase.negocio.nombrePlaza || trabajoBase.negocio.nombre_plaza}` : ''}
                                                </span>
                                                <span style={{ fontSize: '13px', color: '#475569', display: 'block', marginTop: '2px' }}>
                                                    {[
                                                        trabajoBase.negocio?.calle && `Calle ${trabajoBase.negocio.calle}`,
                                                        trabajoBase.negocio?.numero && `#${trabajoBase.negocio.numero}`,
                                                        trabajoBase.negocio?.colonia && `Col. ${trabajoBase.negocio.colonia}`,
                                                        trabajoBase.negocio?.ciudad && trabajoBase.negocio.ciudad,
                                                        trabajoBase.negocio?.cp && `C.P. ${trabajoBase.negocio.cp}`
                                                    ].filter(Boolean).join(', ') || 'No registrada'}
                                                </span>
                                                {trabajoBase.negocio?.referencias && (
                                                    <span style={{ display: 'inline-block', fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', marginTop: '6px', border: '1px solid #d1fae5' }}>
                                                        <strong>Ref:</strong> {trabajoBase.negocio.referencias}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Contactos de la Empresa</span>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                                                    <div>
                                                        <strong>Gerente:</strong> {trabajoBase.negocio?.encargado || 'No registrado'}
                                                        {trabajoBase.negocio?.telefono && (
                                                            <span style={{ color: '#f26522', display: 'block', fontWeight: '600' }}>📞 {trabajoBase.negocio.telefono}</span>
                                                        )}
                                                    </div>
                                                    {trabajoBase.negocio?.subgerente && (
                                                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                                                            <strong>Subgerente:</strong> {trabajoBase.negocio.subgerente}
                                                            {trabajoBase.negocio.telefonoSubgerente && (
                                                                <span style={{ color: '#f26522', display: 'block', fontWeight: '600' }}>📞 {trabajoBase.negocio.telefonoSubgerente}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Fotos Adjuntas por el Cliente</span>
                                                {parseFotoUrls(trabajoBase.foto_url).length > 0 ? (
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {parseFotoUrls(trabajoBase.foto_url).map((url, idx) => (
                                                            <img 
                                                                key={idx}
                                                                src={url} 
                                                                alt={`Evidencia Cliente ${idx + 1}`} 
                                                                onClick={() => setSelectedZoomImage(url)}
                                                                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.15s ease' }} 
                                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Sin fotos adjuntas.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showEquiposSection && (
                                    <div className={styles.infoSectionCard}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 className={styles.sectionTitle}>Equipos Involucrados</h3>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={involucraEquipo} 
                                                    onChange={(e) => setInvolucraEquipo(e.target.checked)} 
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                                Registrar un equipo
                                            </label>
                                        </div>

                                        {involucraEquipo && (
                                            <div style={{ marginTop: '5px' }}>
                                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleEquipoInfoChange('tipo', 'Instalación')}
                                                        style={{ 
                                                            flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 'bold', border: 'none', fontSize: '13px',
                                                            background: equipoInfo.tipo === 'Instalación' ? '#1e293b' : '#f1f5f9',
                                                            color: equipoInfo.tipo === 'Instalación' ? 'white' : '#64748b'
                                                        }}
                                                    >
                                                        Instalación
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleEquipoInfoChange('tipo', 'Mantenimiento')}
                                                        style={{ 
                                                            flex: 1, padding: '8px', borderRadius: '8px', fontWeight: 'bold', border: 'none', fontSize: '13px',
                                                            background: equipoInfo.tipo === 'Mantenimiento' ? '#1e293b' : '#f1f5f9',
                                                            color: equipoInfo.tipo === 'Mantenimiento' ? 'white' : '#64748b'
                                                        }}
                                                    >
                                                        Mantenimiento
                                                    </button>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                    <div className={styles.inputGroup}>
                                                        <label className={styles.label}>Marca:</label>
                                                        <input
                                                            type="text"
                                                            className={styles.input}
                                                            value={equipoInfo.marca}
                                                            onChange={(e) => handleEquipoInfoChange('marca', e.target.value)}
                                                            placeholder="Samsung..."
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label className={styles.label}>Modelo:</label>
                                                        <input
                                                            type="text"
                                                            className={styles.input}
                                                            value={equipoInfo.modelo}
                                                            onChange={(e) => handleEquipoInfoChange('modelo', e.target.value)}
                                                            placeholder="AR12..."
                                                        />
                                                    </div>
                                                </div>

                                                {equipoInfo.tipo === 'Instalación' && (
                                                    <div style={{ display: 'flex', gap: '15px' }}>
                                                        <div className={styles.inputGroup} style={{ flex: 1 }}>
                                                            <label className={styles.label}>Piezas:</label>
                                                            <input
                                                                type="number"
                                                                className={styles.input}
                                                                value={equipoInfo.piezas}
                                                                onChange={(e) => handleEquipoInfoChange('piezas', e.target.value)}
                                                                min="1"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup} style={{ flex: 1 }}>
                                                            <label className={styles.label}>Garantía (Meses):</label>
                                                            <input
                                                                type="number"
                                                                className={styles.input}
                                                                value={equipoInfo.garantia}
                                                                onChange={(e) => handleEquipoInfoChange('garantia', e.target.value)}
                                                                placeholder="12"
                                                                min="0"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {!involucraEquipo && (
                                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', fontSize: '13px' }}>
                                                No se ha registrado información de equipos en este reporte.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.infoSectionCard}>
                            <h3 className={styles.sectionTitle}>Evidencia y Observaciones</h3>
                            <div className={styles.evidenceSubGrid}>
                                <div className={styles.evidenceSection}>
                                    <label className={styles.label}>Fotografías de Respaldo:</label>
                                    <div className={styles.evidenceGrid}>
                                        <div className={styles.evidenceItem}>
                                            <span className={styles.evidenceLabel}>Antes</span>
                                            <div className={styles.squareBox} onClick={() => antesInputRef.current?.click()}>
                                                {imagenes.antes ? (
                                                    <>
                                                        <img src={imagenes.antes} alt="Antes" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                                                        <button 
                                                            className={styles.deletePhotoBtn} 
                                                            onClick={(e) => { e.stopPropagation(); removeImage('antes'); }}
                                                            title="Eliminar foto"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className={styles.uploadPlaceholder}>
                                                        <HiOutlineCamera />
                                                        <span className={styles.uploadText}>Cargar</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.evidenceItem}>
                                            <span className={styles.evidenceLabel}>Durante</span>
                                            <div className={styles.squareBox} onClick={() => duranteInputRef.current?.click()}>
                                                {imagenes.durante ? (
                                                    <>
                                                        <img src={imagenes.durante} alt="Durante" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                                                        <button 
                                                            className={styles.deletePhotoBtn} 
                                                            onClick={(e) => { e.stopPropagation(); removeImage('durante'); }}
                                                            title="Eliminar foto"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className={styles.uploadPlaceholder}>
                                                        <HiOutlineCamera />
                                                        <span className={styles.uploadText}>Cargar</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.evidenceItem}>
                                            <span className={styles.evidenceLabel}>Después</span>
                                            <div className={styles.squareBox} onClick={() => despuesInputRef.current?.click()}>
                                                {imagenes.despues ? (
                                                    <>
                                                        <img src={imagenes.despues} alt="Despues" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                                                        <button 
                                                            className={styles.deletePhotoBtn} 
                                                            onClick={(e) => { e.stopPropagation(); removeImage('despues'); }}
                                                            title="Eliminar foto"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className={styles.uploadPlaceholder}>
                                                        <HiOutlineCamera />
                                                        <span className={styles.uploadText}>Cargar</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {!showObservacionesInput || observacionesList.length === 0 ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowObservacionesInput(true);
                                                addObservacionBlock();
                                            }}
                                            className={styles.addObservacionBtn}
                                        >
                                            <HiOutlinePlus size={18} /> Agregar Observaciones Adicionales / Fotos Extra
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label className={styles.label} style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Observaciones Adicionales ({observacionesList.length})</label>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const hasContent = observacionesList.some(o => o.texto.trim() || o.imagenes.length > 0);
                                                    if (!hasContent) {
                                                        setShowObservacionesInput(false);
                                                        setObservacionesList([]);
                                                    } else {
                                                        showConfirm(
                                                            "Quitar Todas las Observaciones",
                                                            "Hay observaciones registradas. Si ocultas esta sección se borrará toda esa información. ¿Deseas continuar?",
                                                            () => {
                                                                setObservacionesList([]);
                                                                setShowObservacionesInput(false);
                                                            },
                                                            () => {}
                                                        );
                                                    }
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                ✕ Quitar Sección
                                            </button>
                                        </div>

                                        {observacionesList.map((block, idx) => (
                                            <div 
                                                key={block.id} 
                                                style={{ 
                                                    background: '#f8fafc', 
                                                    border: '1px solid #e2e8f0', 
                                                    borderRadius: '16px', 
                                                    padding: '20px', 
                                                    display: 'flex', 
                                                    flexDirection: 'column', 
                                                    gap: '15px' 
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>📝 Observación #{idx + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (block.texto.trim() || block.imagenes.length > 0) {
                                                                showConfirm(
                                                                    "Quitar Observación",
                                                                    "¿Estás seguro de que deseas eliminar esta observación? Se perderán el texto y fotos correspondientes.",
                                                                    () => removeObservacionBlock(block.id),
                                                                    () => {}
                                                                );
                                                            } else {
                                                                removeObservacionBlock(block.id);
                                                            }
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}
                                                    >
                                                        ✕ Eliminar
                                                    </button>
                                                </div>

                                                <textarea
                                                    className={styles.textarea}
                                                    style={{ height: '80px', width: '100%', resize: 'vertical' }}
                                                    value={block.texto}
                                                    onChange={(e) => handleObservacionTextChange(block.id, e.target.value)}
                                                    placeholder="Notas u observaciones específicas de este hallazgo..."
                                                ></textarea>

                                                <div>
                                                    <label className={styles.label} style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Fotos de esta Observación:</label>
                                                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                        {block.imagenes.map((img, imgIdx) => (
                                                            <div key={imgIdx} className={styles.evidenceItem} style={{ margin: 0 }}>
                                                                <span className={styles.evidenceLabel}>Foto {imgIdx + 1}</span>
                                                                <div className={styles.squareBox} style={{ width: '80px', height: '80px', position: 'relative' }}>
                                                                    <img src={img} alt={`Extra ${imgIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                                                    <button 
                                                                        type="button"
                                                                        className={styles.deletePhotoBtn} 
                                                                        onClick={(e) => { e.stopPropagation(); removeObservacionBlockImage(block.id, imgIdx); }}
                                                                        title="Eliminar foto"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className={styles.evidenceItem} style={{ margin: 0 }}>
                                                            <span className={styles.evidenceLabel}>Agregar</span>
                                                            <div 
                                                                className={styles.squareBox} 
                                                                onClick={() => triggerObservacionImageUpload(block.id)} 
                                                                style={{ width: '80px', height: '80px', border: '2px dashed #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <HiOutlineCamera size={22} style={{ color: '#94a3b8' }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                                            <button
                                                type="button"
                                                onClick={addObservacionBlock}
                                                style={{
                                                    background: '#e0f2fe',
                                                    color: '#0369a1',
                                                    border: '1.5px dashed #7dd3fc',
                                                    padding: '10px 20px',
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: 'bold',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#bae6fd';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#e0f2fe';
                                                }}
                                            >
                                                <HiOutlinePlus size={16} /> Agregar Otra Observación
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.infoSectionCard}>
                            <h3 className={styles.sectionTitle}>Validación Final</h3>
                            <div className={styles.validationSection}>
                                <div className={styles.validationGrid}>
                                    <div className={styles.evidenceItem}>
                                        <div className={styles.squareBox} onClick={() => firmaInputRef.current?.click()} style={{ width: '300px', height: '120px', margin: '0 auto' }}>
                                            {firmaEmpresa ? (
                                                <>
                                                    {firmaEmpresa.startsWith('data:application/pdf') ? (
                                                        <div style={{ textAlign: 'center', color: '#64748b', padding: '10px' }}>
                                                            <div style={{ fontSize: '32px', marginBottom: '6px' }}>📄</div>
                                                            <div style={{ fontSize: '12px', fontWeight: '600', wordBreak: 'break-all', maxWidth: '200px' }}>Firma/Sello cargado (PDF)</div>
                                                        </div>
                                                    ) : (
                                                        <img src={firmaEmpresa} alt="Firma" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    )}
                                                    <button 
                                                        className={styles.deletePhotoBtn} 
                                                        onClick={(e) => { e.stopPropagation(); removeFirma(); }}
                                                        style={{ top: '5px', right: '5px' }}
                                                    >
                                                        ✕
                                                    </button>
                                                </>
                                            ) : (
                                                <div style={{ textAlign: 'center', color: '#64748b' }}>
                                                    <HiOutlineArrowUpTray style={{ fontSize: '28px', marginBottom: '8px' }} />
                                                    <div style={{ fontSize: '13px', fontWeight: '600' }}>Cargar Firma de Conformidad</div>
                                                    <div style={{ fontSize: '11px', opacity: 0.7 }}>(Obligatorio para finalizar)</div>
                                                </div>
                                            )}
                                        </div>
                                        <span className={styles.signatureLabel} style={{ marginTop: '10px', display: 'block', fontSize: '12px', color: '#64748b' }}>Sello o Firma Autorizada de la Empresa</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.footer}>
                            <button
                                onClick={() => handleGuardarInformacion(true)}
                                className={`${styles.saveButton} ${styles.secondaryBtn}`}
                            >
                                Guardar Información
                            </button>
                            <button
                                onClick={handleGuardarYPrevisualizar}
                                className={`${styles.saveButton} ${styles.pdfBtn}`}
                            >
                                Guardar y Previsualizar PDF
                            </button>
                            <button
                                onClick={handleOpenConfirm}
                                className={styles.saveButton}
                            >
                                Finalizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PREVISUALIZACION DEL PDF GENERADO */}
            {showReportePreview && (() => {
                const compiledObservaciones = observacionesList.map(o => o.texto).filter(Boolean).join('\n\n');
                const compiledImagenesObservacion = observacionesList.reduce((acc, o) => [...acc, ...o.imagenes], [] as string[]);
                return (
                    <ReportePDFPreview
                        trabajo={trabajoBase}
                        isVisita={trabajoBase?.tipo === 'Visita' || trabajoBase?.originalTipo === 'Visita'}
                        reporteData={{
                            id: id || 0,
                            reporteTienda,
                            descripcion,
                            materiales,
                            refaccionesList,
                            observaciones: compiledObservaciones,
                            observacionesList: observacionesList,
                            imagenes,
                            imagenObservacion: compiledImagenesObservacion[0] || null,
                            imagenesObservacion: compiledImagenesObservacion,
                            firmaEmpresa,
                            involucraEquipo,
                            equipoInfo: involucraEquipo ? equipoInfo : null,
                            fecha: new Date().toLocaleDateString('es-MX'),
                            tecnicoNombre: trabajoBase?.trabajador?.nombre || user?.name || trabajoBase?.tecnico || 'Técnico',
                            tecnicoAvatar: user?.avatar || null,
                            fechaInicio: fechaInicio || null
                        }}
                        onClose={() => setShowReportePreview(false)}
                    />
                );
            })()}

            {/* ZOOM MODAL DE IMÁGENES */}
            {selectedZoomImage && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0, 0, 0, 0.85)', zIndex: 10001, display: 'flex',
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
        </div>
    );
};

export default AdminReporte;
