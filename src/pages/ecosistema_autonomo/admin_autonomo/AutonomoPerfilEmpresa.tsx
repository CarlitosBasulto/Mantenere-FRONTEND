import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./AutonomoPerfilEmpresa.module.css";
import { useAuth } from "../../../context/AuthContext";
import { useModal } from "../../../context/ModalContext";

import { 
    HiOutlineMapPin, 
    HiOutlineBolt, 
    HiOutlineInformationCircle,
    HiOutlineCamera,
    HiOutlineUserGroup,
    HiOutlineKey,
    HiOutlinePaperAirplane,
    HiOutlineEye,
    HiOutlineEyeSlash,
    HiOutlineExclamationTriangle,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineClipboardDocumentList
} from "react-icons/hi2";

import { createNegocio, updateNegocio, getNegocio, uploadImage } from "../../../services/negociosService";
import { createNotificacionEcosistema } from "../../../services/notificacionesService";
import { asignarEncargadoSucursal, getEncargadoSucursal } from "../../../services/usersService";
import LevantamientoModal from "../../../components/LevantamientoModal";
import DetalleEquipoModal from "../../../components/DetalleEquipoModal";
import ReportarProblemaModal from "../../../components/ReportarProblemaModal";
import HistorialEquipoModal from "../../../components/modals/HistorialEquipoModal";
import DetalleReporteModal from "../../../components/modals/DetalleReporteModal";
import { saveSafeLocalInfo, stripBlobUrls } from "../../../utils/storageHelper";
import { createMantenimientoSolicitud, getMantenimientoSolicitudes } from "../../../services/mantenimientoService";
import { getTrabajos } from "../../../services/trabajosService";
import { getReporteByTrabajoId } from "../../../services/reportesService";

export interface Equipment {
    id?: string;
    nombre: string;
    marca: string;
    modelo: string;
    serie: string;
    anioFabricacion: string;
    anioUso: string;
    foto?: string;
    fotoFile?: File;
    fotoPlaca?: string;
    fotoPlacaFile?: File;
    categoria_id?: number | string | null;
    categoria?: { id: number; nombre: string } | null;
}

export interface LevantamientoSeccion {
    id: string;
    nombreArea: string;
    equipos: Equipment[];
}

export type LevantamientoData = LevantamientoSeccion[];

export interface BusinessData {
    nombreSucursal?: string;
    tipo?: string;
    encargado?: string;
    estado?: string;
    ciudad?: string;
    nombrePlaza?: string;
    gerente?: string;
    apellidosGerente?: string;
    correo?: string;
    telefonoGerente?: string;
    subgerente?: string;
    telefonoSubgerente?: string;
    calle?: string;
    numero?: string;
    colonia?: string;
    referencia?: string;
    manzana?: string;
    lote?: string;
    calleAv?: string;
    cp?: string;
    levantamiento?: LevantamientoData;
    imagenPerfil?: string;
    imagenPerfilFile?: File;
}

const AutonomoPerfilEmpresa: React.FC = () => {
    // ... (logic remains same until return)
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = useModal();
    const canEdit = ['cliente', 'encargado', 'autonomo', 'admin-autonomo', 'gerente-general'].includes(user?.role || '');

    const [formData, setFormData] = useState<BusinessData>({
        nombreSucursal: "",
        tipo: "FC",
        encargado: "",
        estado: "Yucatán",
        ciudad: "Mérida",
        nombrePlaza: "",
        gerente: "",
        apellidosGerente: "",
        correo: "",
        telefonoGerente: "",
        levantamiento: []
    });

    const [isLevantamientoModalOpen, setIsLevantamientoModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'levantamiento'>('info');
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [reportingEquipment, setReportingEquipment] = useState<Equipment | null>(null);
    const [activeEquipmentId, setActiveEquipmentId] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [customTipoValue, setCustomTipoValue] = useState("");

    // Bitacora (Historial) states
    const [bitacoraModalOpen, setBitacoraModalOpen] = useState(false);
    const [selectedEqForBitacora, setSelectedEqForBitacora] = useState<any>(null);
    const [allSolicitudes, setAllSolicitudes] = useState<any[]>([]);
    const [reporteModalOpen, setReporteModalOpen] = useState(false);
    const [selectedTrabajoId, setSelectedTrabajoId] = useState<number | null>(null);

    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    // --- Estado para el encargado de sucursal ---
    const [encargadoForm, setEncargadoForm] = useState({ name: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [encargadoExistente, setEncargadoExistente] = useState<{ name: string; email: string } | null>(null);
    const [encargadoLoading, setEncargadoLoading] = useState(false);

    React.useEffect(() => {
        const fetchNegocio = async () => {
            if (editId) {
                try {
                    const existing = await getNegocio(Number(editId));
                    setIsLevantamientoModalOpen(false);
                    const localData = JSON.parse(localStorage.getItem('local_negocios_info') || '{}');
                    const localInfo = stripBlobUrls(localData[editId] || {});

                    const loadedTipo = existing.tipo || "FC";
                    const standardTipos = ['FC', 'FS', 'MALL', 'W/M'];
                    const isCustom = !standardTipos.includes(loadedTipo);
                    
                    if (isCustom) {
                        setCustomTipoValue(loadedTipo);
                    }

                    const fullGerente = localInfo.gerente || existing.gerente || "";
                    const firstSpaceIndex = fullGerente.indexOf(' ');
                    let fetchedNombre = fullGerente;
                    let fetchedApellidos = "";
                    if (firstSpaceIndex !== -1) {
                        fetchedNombre = fullGerente.substring(0, firstSpaceIndex);
                        fetchedApellidos = fullGerente.substring(firstSpaceIndex + 1);
                    }

                    setFormData(prev => ({
                        ...prev,
                        ...existing,
                        tipo: isCustom ? 'Otro' : loadedTipo,
                        nombreSucursal: existing.nombre,
                        gerente: fetchedNombre,
                        apellidosGerente: fetchedApellidos,
                        correo: existing.correo || "",
                        telefonoGerente: localInfo.telefonoGerente || existing.telefonoGerente || "",
                        nombrePlaza: localInfo.nombrePlaza || existing.nombrePlaza || "",
                        manzana: localInfo.manzana || existing.manzana || "",
                        lote: localInfo.lote || existing.lote || "",
                        calleAv: localInfo.calleAv || existing.calleAv || "",
                        referencia: localInfo.referencia || existing.referencia || "",
                        levantamiento: Array.isArray(localInfo.areas) && localInfo.areas.length > 0
                            ? localInfo.areas
                            : Array.isArray((existing as any).areas) && (existing as any).areas.length > 0
                                ? (existing as any).areas
                                : Array.isArray(existing.levantamiento)
                                    ? existing.levantamiento
                                    : (existing.levantamiento && typeof existing.levantamiento === 'object')
                                        ? [
                                            { id: 'fria', nombreArea: 'Área Fría', equipos: (existing.levantamiento as any).areaFria || [] },
                                            { id: 'caliente', nombreArea: 'Área Caliente', equipos: (existing.levantamiento as any).areaCaliente || [] }
                                        ]
                                        : []
                    }));
                } catch (error) {
                    console.error("Error fetching negocio:", error);
                }
            }
        };
        fetchNegocio();
    }, [editId]);

    // Cargar historial de mantenimientos para la bitácora
    React.useEffect(() => {
        if (!editId) return;
        const fetchHistory = async () => {
            try {
                const businessId = Number(editId);
                // 1. Obtener solicitudes de mantenimiento
                const solicitudesBackend = await getMantenimientoSolicitudes(businessId);
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
                                        materiales: parsed.materiales || '',
                                        refacciones: Array.isArray(parsed.refaccionesList)
                                            ? parsed.refaccionesList.map((r: any) => `${r.cantidad}x ${r.pieza}`).join(' · ')
                                            : ''
                                    });
                                }
                            } catch(e) {}
                        }
                    });
                    return {
                        ...sol,
                        reportes: mappedReportes,
                        actualTrabajoId: sol.reparacion_trabajo?.id || sol.reparacion_trabajo_id || sol.visita_trabajo?.id || sol.visita_trabajo_id
                    };
                });

                // 2. Obtener trabajos genéricos
                const trabajos = await getTrabajos();
                const trabajosGenericos = trabajos.filter((t: any) => t.negocio_id === businessId && t.estado === 'Finalizado');
                const mappedGenericJobs: any[] = [];
                for (const job of trabajosGenericos) {
                    try {
                        const reporte = await getReporteByTrabajoId(job.id);
                        if (reporte && reporte.solucion) {
                            const reportDataRaw = JSON.parse(reporte.solucion);
                            if (reportDataRaw.involucraEquipo && reportDataRaw.equipoInfo && reportDataRaw.equipoInfo.id) {
                                mappedGenericJobs.push({
                                    id: `gen-${job.id}`,
                                    actualTrabajoId: job.id,
                                    levantamiento_equipo_id: reportDataRaw.equipoInfo.id,
                                    descripcion_problema: job.titulo,
                                    estado: job.estado,
                                    created_at: job.created_at,
                                    visitas: [],
                                    reportes: [{ falla_encontrada: reportDataRaw.problema || 'Mantenimiento General', solucion: "Finalizado" }]
                                });
                            }
                        }
                    } catch (e) {}
                }

                setAllSolicitudes([...mappedSolicitudes, ...mappedGenericJobs]);
            } catch (err) {
                console.error("Error cargando historial:", err);
            }
        };
        fetchHistory();
    }, [editId]);

    // Cargar encargado existente cuando hay editId
    React.useEffect(() => {
        if (!editId) return;
        getEncargadoSucursal(Number(editId))
            .then(data => {
                if (data?.encargado) {
                    setEncargadoExistente({ name: data.encargado.name, email: data.encargado.email });
                    setEncargadoForm(prev => ({ ...prev, name: data.encargado.name, email: data.encargado.email }));
                }
            })
            .catch(() => {}); // silencioso si no hay encargado aún
    }, [editId]);

    const handleAsignarEncargado = async () => {
        if (!editId) return;
        if (!encargadoForm.name.trim()) { showAlert('Campo Requerido', 'Ingresa el nombre del encargado', 'warning'); return; }
        if (!encargadoForm.email.trim()) { showAlert('Campo Requerido', 'Ingresa el correo del encargado', 'warning'); return; }
        if (!encargadoForm.password.trim() || encargadoForm.password.length < 8) {
            showAlert('Contraseña inválida', 'La contraseña debe tener al menos 8 caracteres', 'warning'); return;
        }
        try {
            setEncargadoLoading(true);
            await asignarEncargadoSucursal(Number(editId), encargadoForm);
            setEncargadoExistente({ name: encargadoForm.name, email: encargadoForm.email });
            setEncargadoForm(prev => ({ ...prev, password: '' }));
            showAlert('✅ Acceso Asignado', `Se asignó el acceso a ${encargadoForm.email}.`, 'success');
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'No se pudo asignar el acceso. Intenta de nuevo.';
            showAlert('Error', msg, 'error');
        } finally {
            setEncargadoLoading(false);
        }
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!canEdit) return;
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canEdit) return;
        const file = e.target.files?.[0];
        if (file) {
            if (formData.imagenPerfil && formData.imagenPerfil.startsWith('blob:')) {
                URL.revokeObjectURL(formData.imagenPerfil);
            }
            const tempUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, imagenPerfil: tempUrl, imagenPerfilFile: file }));
            setImageError(false); // <--- REINICIAR EL ERROR PARA VER EL PREVIEW
        }
    };

    React.useEffect(() => {
        return () => {
            if (formData.imagenPerfil && formData.imagenPerfil.startsWith('blob:')) {
                URL.revokeObjectURL(formData.imagenPerfil);
            }
        };
    }, [formData.imagenPerfil]);

    const handleSave = async () => {
        if (!formData.nombreSucursal) { showAlert("Campo Requerido", "Por favor ingresa el nombre de la sucursal", "warning"); return; }

        if (formData.tipo !== 'W/M') {
            if ((formData.tipo === 'FS' || formData.tipo === 'Otro') && !formData.calle) { showAlert("Campo Requerido", "Por favor ingresa la calle principal", "warning"); return; }
            if (formData.tipo !== 'FS' && formData.tipo !== 'Otro' && !formData.nombrePlaza) { showAlert("Campo Requerido", "Por favor ingresa el nombre de la plaza", "warning"); return; }
            if (!formData.estado) { showAlert("Campo Requerido", "Por favor ingresa el estado", "warning"); return; }
            if (!formData.ciudad) { showAlert("Campo Requerido", "Por favor ingresa la ciudad", "warning"); return; }
            if (!formData.calle) { showAlert("Campo Requerido", "Por favor ingresa la calle", "warning"); return; }
            if (!formData.numero) { showAlert("Campo Requerido", "Por favor ingresa el número", "warning"); return; }
            if (!formData.colonia) { showAlert("Campo Requerido", "Por favor ingresa la colonia", "warning"); return; }
            if ((formData.tipo === 'FS' || formData.tipo === 'Otro') && !formData.referencia) { showAlert("Campo Requerido", "Por favor ingresa la referencia", "warning"); return; }
        } else {
            if (!formData.calleAv) { showAlert("Campo Requerido", "Por favor ingresa la calle/Av", "warning"); return; }
            if (!formData.manzana) { showAlert("Campo Requerido", "Por favor ingresa la manzana", "warning"); return; }
            if (!formData.lote) { showAlert("Campo Requerido", "Por favor ingresa el lote", "warning"); return; }
        }
        if (!formData.cp) { showAlert("Campo Requerido", "Por favor ingresa el código postal", "warning"); return; }

        try {
            let finalImagenPerfil = formData.imagenPerfil;
            if (formData.imagenPerfilFile) {
                try { finalImagenPerfil = await uploadImage(formData.imagenPerfilFile); } catch (ign) { }
            }
            const finalLevantamiento = await Promise.all((formData.levantamiento || []).map(async (section) => {
                const finalEquipos = await Promise.all(section.equipos.map(async (eq) => {
                    let eqFoto = eq.foto;
                    let eqFotoPlaca = eq.fotoPlaca;
                    
                    if (eq.fotoFile) {
                        try { eqFoto = await uploadImage(eq.fotoFile); } catch (ign) { }
                    }
                    if (eq.fotoPlacaFile) {
                        try { eqFotoPlaca = await uploadImage(eq.fotoPlacaFile); } catch (ign) { }
                    }
                    
                    return { ...eq, foto: eqFoto, fotoPlaca: eqFotoPlaca };
                }));
                return { ...section, equipos: finalEquipos };
            }));
            
            const finalTipo = formData.tipo === 'Otro' ? (customTipoValue || 'Otro') : formData.tipo;

            const combinedGerente = formData.apellidosGerente 
                ? `${formData.gerente || ''} ${formData.apellidosGerente}`.trim() 
                : (formData.gerente || '');

            const apiPayload = {
                nombre: formData.nombreSucursal,
                tipo: finalTipo,
                encargado: formData.encargado || "No Especificado",
                estado: formData.estado,
                ciudad: formData.ciudad,
                calle: formData.calle,
                numero: formData.numero,
                colonia: formData.colonia,
                cp: formData.cp,
                referencia: formData.referencia,
                nombrePlaza: formData.nombrePlaza,
                gerente: combinedGerente,
                correo: formData.correo,
                telefonoGerente: formData.telefonoGerente,
                manzana: formData.manzana,
                lote: formData.lote,
                calleAv: formData.calleAv,
                levantamiento: finalLevantamiento,
                imagenPerfil: finalImagenPerfil
            };
            const fullLocalData = {
                ...apiPayload,
                nombrePlaza: formData.nombrePlaza,
                gerente: combinedGerente,
                correo: formData.correo,
                telefonoGerente: formData.telefonoGerente,
                manzana: formData.manzana,
                lote: formData.lote,
                calleAv: formData.calleAv,
                areas: finalLevantamiento
            };
            if (editId) {
                const updateRes = await updateNegocio(Number(editId), apiPayload);
                if (updateRes?.data?.areas) fullLocalData.areas = updateRes.data.areas;
                saveSafeLocalInfo('local_negocios_info', editId, fullLocalData, showAlert);
                
                // Notificar al admin
                try {
                    const targetAdminId = user?.admin_autonomo_id || user?.id || 0;
                    await createNotificacionEcosistema({
                        admin_autonomo_id: targetAdminId,
                        titulo: '🏢 Actualización de Perfil',
                        mensaje: `El cliente ${user?.name || 'un usuario'} ha actualizado la información de su empresa/sucursal.`,
                        enlace: `/menu/negocios`
                    });
                } catch (notiErr) {
                    console.error("Error notificando al admin de nueva sucursal:", notiErr);
                }

                showAlert("Éxito", "Información actualizada correctamente", "success");
            } else {
                const createPayload = { ...apiPayload, user_id: user?.id };
                const newNegocio = await createNegocio(createPayload);
                if (newNegocio) {
                    const actualId = newNegocio.data?.id || newNegocio.id;
                    if (actualId) {
                        if (apiPayload.levantamiento && apiPayload.levantamiento.length > 0) {
                            try {
                                const finalUpdateRes = await updateNegocio(actualId, apiPayload);
                                if (finalUpdateRes?.data?.areas) fullLocalData.areas = finalUpdateRes.data.areas;
                            } catch (e) { console.error("Error al sincronizar áreas tras creación", e); }
                        }
                        saveSafeLocalInfo('local_negocios_info', actualId, fullLocalData, showAlert);
                    }
                    // Notificar al admin que hay una nueva sucursal
                    try {
                        const targetAdminId = user?.admin_autonomo_id || user?.id || 0;
                        await createNotificacionEcosistema({
                            admin_autonomo_id: targetAdminId,
                            titulo: '🏢 Nueva Sucursal Registrada',
                            mensaje: `El cliente ${user?.name || 'un usuario'} registró una nueva sucursal: "${formData.nombreSucursal}".`,
                            enlace: `/menu/negocios`
                        });
                    } catch (notiErr) {
                        console.error("Error notificando al admin de nueva sucursal:", notiErr);
                    }
                }
                showAlert("Éxito", "Información guardada correctamente", "success");
            }
            if (user?.role === 'encargado') {
                navigate('/encargado');
            } else if (user?.role === 'autonomo') {
                navigate('/autonomo/negocios');
            } else {
                navigate('/cliente');
            }
        } catch (error) {
            console.error("Error saving negocio:", error);
            showAlert("Error", "Hubo un error al guardar en el servidor. Prueba de nuevo.", "error");
        }
    };

    const handleDeleteEquipment = (eqId: string, sectionId: string) => {
        setFormData(prev => {
            const updatedLevantamiento = (prev.levantamiento || []).map(section => {
                if (section.id === sectionId) {
                    return { ...section, equipos: section.equipos.filter(e => e.id !== eqId) };
                }
                return section;
            });
            return { ...prev, levantamiento: updatedLevantamiento };
        });
    };

    const handleReportarProblemaSubmit = async (descripcion: string) => {
        if (!reportingEquipment || !user?.id || !editId) return;
        if (String(reportingEquipment.id).startsWith('temp_')) {
            showAlert("Atención", "Por favor primero guarda el levantamiento de la empresa antes de reportar un problema para un equipo nuevo.", "warning");
            return;
        }
        try {
            await createMantenimientoSolicitud({
                cliente_id: user.id,
                negocio_id: Number(editId),
                levantamiento_equipo_id: reportingEquipment.id!,
                descripcion_problema: descripcion
            });

            // Notificar al administrador en la campaña
            try {
                await createNotificacionByRole({
                    role: 'admin',
                    titulo: '📋 Reporte de Mantenimiento de Equipo',
                    mensaje: `Un cliente reportó un inconveniente con el equipo "${reportingEquipment.nombre}". Revísalo de inmediato.`,
                    enlace: '/menu/mantenimiento'
                });
            } catch (notiErr) {
                console.error("Error notificando al admin", notiErr);
            }

            showAlert("Reporte Enviado", "El problema ha sido reportado exitosamente. El administrador revisará y agendará una visita técnica.", "success");
        } catch (error) {
            console.error(error);
            showAlert("Error", "No se pudo enviar el reporte de mantenimiento. Intenta de nuevo.", "error");
        }
    };

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.mainContainer}>
                
                {/* HEADER SECTION */}
                <header className={styles.pageHeader}>
                    <div className={styles.titleSection}>
                        <h1 className={styles.pageTitle}>
                            {editId ? "Editar Sucursal" : "Nueva Sucursal"}
                        </h1>
                    </div>
                    <p className={styles.pageSubtitle}>
                        Completa los datos de tu negocio para gestionar mantenimientos y equipos.
                    </p>
                </header>

                {/* BUSINESS PROFILE HEADER CARD */}
                <div className={styles.profileHeaderCard}>
                    <div className={styles.profileIconWrapper}>
                        <div className={styles.profileIcon}>
                            {formData.imagenPerfil && !imageError ? (
                                <img 
                                    src={formData.imagenPerfil} 
                                    alt="Logo" 
                                    className={styles.profileImg} 
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                "🏢"
                            )}
                        </div>
                        {canEdit && (
                            <div className={styles.editOverlay} onClick={() => fileInputRef.current?.click()}>
                                <HiOutlineCamera size={20} />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleImageChange}
                        />
                    </div>
                    
                    <div className={styles.businessHeaderInfo}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Nombre de la Sucursal</label>
                            <input
                                type="text"
                                name="nombreSucursal"
                                placeholder="Ej: Mantenere Center Mérida"
                                className={styles.businessNameInput}
                                value={formData.nombreSucursal || ''}
                                onChange={handleChange}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </div>

                {/* TABS CONTAINER */}
                <div className={styles.tabsContainer}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('info')}
                        className={`${styles.tab} ${activeTab === 'info' ? styles.activeTab : ''}`}
                    >
                        Información Detallada
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('levantamiento')}
                        className={`${styles.tab} ${activeTab === 'levantamiento' ? styles.activeTab : ''}`}
                    >
                        Levantamiento de Equipos
                    </button>
                </div>

                {activeTab === 'info' ? (
                    <div className={styles.contentWrapper}>
                        
                        {/* CARD 1: INFORMACIÓN GENERAL */}
                        <div className={styles.infoCard}>
                            <h2 className={styles.sectionTitle}>
                                <HiOutlineInformationCircle /> Información General
                            </h2>
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Tipo de Establecimiento</label>
                                    <select
                                        name="tipo"
                                        className={styles.select}
                                        value={formData.tipo}
                                        onChange={handleChange}
                                        disabled={!canEdit}
                                    >
                                        <option value="FC">FC (Food Court)</option>
                                        <option value="FS">FS (Freestanding)</option>
                                        <option value="MALL">MALL</option>
                                        <option value="W/M">W/M</option>
                                        <option value="Otro">Otro (Especificar)</option>
                                    </select>
                                    {formData.tipo === 'Otro' && (
                                        <input
                                            type="text"
                                            placeholder="Especifica el tipo..."
                                            className={styles.input}
                                            style={{ marginTop: '10px' }}
                                            value={customTipoValue}
                                            onChange={(e) => setCustomTipoValue(e.target.value)}
                                            disabled={!canEdit}
                                        />
                                    )}
                                </div>

                            </div>
                        </div>

                        {/* CARD 2: UBICACIÓN */}
                        <div className={styles.infoCard}>
                            <h2 className={styles.sectionTitle}>
                                <HiOutlineMapPin /> Ubicación y Dirección
                            </h2>
                            
                            <div className={styles.formGrid}>
                                {formData.tipo !== 'W/M' ? (
                                    <>
                                        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                            <label className={styles.label}>
                                                {(formData.tipo === 'FS' || formData.tipo === 'Otro') ? 'Calle Principal / Avenida' : 'Nombre de la Plaza Comercial'}
                                            </label>
                                            <input
                                                type="text"
                                                name={(formData.tipo === 'FS' || formData.tipo === 'Otro') ? 'calle' : 'nombrePlaza'}
                                                className={styles.input}
                                                placeholder={(formData.tipo === 'FS' || formData.tipo === 'Otro') ? 'Ej: Prolongación Montejo' : 'Ej: Plaza Altabrisa'}
                                                value={((formData.tipo === 'FS' || formData.tipo === 'Otro') ? formData.calle : formData.nombrePlaza) || ''}
                                                onChange={handleChange}
                                                disabled={!canEdit}
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Estado</label>
                                            <input type="text" name="estado" className={styles.input} value={formData.estado || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Ciudad / Municipio</label>
                                            <input type="text" name="ciudad" className={styles.input} value={formData.ciudad || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Calle</label>
                                            <input type="text" name="calle" className={styles.input} value={formData.calle || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Número</label>
                                            <input type="text" name="numero" className={styles.input} value={formData.numero || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Colonia / Fraccionamiento</label>
                                            <input type="text" name="colonia" className={styles.input} value={formData.colonia || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        {(formData.tipo === 'FS' || formData.tipo === 'Otro') && (
                                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                                <label className={styles.label}>Referencias adicionales</label>
                                                <input type="text" name="referencia" className={styles.input} placeholder="Ej: Frente al parque principal" value={formData.referencia || ''} onChange={handleChange} disabled={!canEdit} />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Calle o Avenida</label>
                                            <input type="text" name="calleAv" className={styles.input} value={formData.calleAv || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Manzana</label>
                                            <input type="text" name="manzana" className={styles.input} value={formData.manzana || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Lote</label>
                                            <input type="text" name="lote" className={styles.input} value={formData.lote || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                    </>
                                )}
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Código Postal</label>
                                    <input type="text" name="cp" className={styles.input} placeholder="97000" value={formData.cp || ''} onChange={handleChange} disabled={!canEdit} />
                                </div>
                            </div>
                        </div>

                        {/* CARD 3: CONTACTOS Y ACCESO */}
                        <div className={styles.infoCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                                    <HiOutlineUserGroup /> Contactos Operativos
                                </h2>
                                {user?.role === 'gerente-general' && canEdit && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const nameParts = user?.name?.split(' ') || [];
                                            const nombre = nameParts[0] || '';
                                            const apellidos = nameParts.slice(1).join(' ') || '';
                                            setFormData(prev => ({
                                                ...prev,
                                                gerente: nombre,
                                                apellidosGerente: apellidos,
                                                correo: user?.email || prev.correo
                                            }));
                                            showAlert('Datos cargados', 'Se han autocompletado tus datos. No olvides darle a Guardar General.', 'success');
                                        }}
                                        style={{
                                            background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', 
                                            padding: '6px 12px', borderRadius: '6px', fontSize: '13px', 
                                            cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px'
                                        }}
                                    >
                                        ✨ Autocompletar con mis datos
                                    </button>
                                )}
                            </div>
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Nombre(s) del Gerente General</label>
                                    <input type="text" name="gerente" className={styles.input} value={formData.gerente || ''} onChange={handleChange} disabled={!canEdit} placeholder="Ej: Juan Carlos" />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Apellidos del Gerente General</label>
                                    <input type="text" name="apellidosGerente" className={styles.input} value={formData.apellidosGerente || ''} onChange={handleChange} disabled={!canEdit} placeholder="Ej: Pérez Gómez" />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Correo Electrónico</label>
                                    <input type="email" name="correo" className={styles.input} value={formData.correo || ''} onChange={handleChange} disabled={!canEdit} placeholder="Ej: juan.perez@empresa.com" />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>
                                        Número de Teléfono
                                        {formData.telefonoGerente && (
                                            <a 
                                                href={`https://wa.me/${formData.telefonoGerente.replace(/\D/g, '')}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                style={{ marginLeft: '8px', color: '#22c55e', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                title="Abrir chat en WhatsApp"
                                            >
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                                                </svg>
                                            </a>
                                        )}
                                    </label>
                                    <input type="text" name="telefonoGerente" className={styles.input} value={formData.telefonoGerente || ''} onChange={handleChange} disabled={!canEdit} placeholder="Ej: 999 123 4567" />
                                </div>
                            </div>

                            {editId && canEdit && (
                                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: '16px', color: '#334155', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <HiOutlineKey size={20} color="#f59e0b" /> Asignar Acceso al Subgerente
                                    </h3>
                                    
                                    {encargadoExistente && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                                            borderRadius: '10px', padding: '12px 16px',
                                            marginBottom: '18px', fontSize: '14px', color: '#065f46', fontWeight: 500
                                        }}>
                                            <span style={{ fontSize: '18px' }}>✅</span>
                                            <span>Subgerente asignado: <strong>{encargadoExistente.name}</strong> — {encargadoExistente.email}</span>
                                        </div>
                                    )}

                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', lineHeight: '1.6' }}>
                                        Asigna credenciales de acceso exclusivas para esta sucursal. El subgerente podrá iniciar sesión y administrar la sucursal.
                                    </p>

                                    <div className={styles.formGrid}>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Nombre del Subgerente</label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Luis Ramírez"
                                                className={styles.input}
                                                value={encargadoForm.name}
                                                onChange={e => setEncargadoForm(prev => ({ ...prev, name: e.target.value }))}
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Correo de Acceso</label>
                                            <input
                                                type="email"
                                                placeholder="Ej: subgerente@gmail.com"
                                                className={styles.input}
                                                value={encargadoForm.email}
                                                onChange={e => setEncargadoForm(prev => ({ ...prev, email: e.target.value }))}
                                            />
                                        </div>
                                        <div className={styles.inputGroup} style={{ position: 'relative' }}>
                                            <label className={styles.label}>
                                                {encargadoExistente ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                                            </label>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Mínimo 8 caracteres"
                                                className={styles.input}
                                                style={{ paddingRight: '42px' }}
                                                value={encargadoForm.password}
                                                onChange={e => setEncargadoForm(prev => ({ ...prev, password: e.target.value }))}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{
                                                    position: 'absolute', right: '12px', bottom: '12px',
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: '#64748b', display: 'flex', alignItems: 'center'
                                                }}
                                            >
                                                {showPassword ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '20px' }}>
                                        <button
                                            onClick={handleAsignarEncargado}
                                            disabled={encargadoLoading}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                background: encargadoLoading ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                color: 'white', border: 'none', borderRadius: '10px',
                                                padding: '12px 24px', fontWeight: 700, fontSize: '14px',
                                                cursor: encargadoLoading ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(217,119,6,0.3)'
                                            }}
                                        >
                                            <HiOutlinePaperAirplane size={18} />
                                            {encargadoLoading ? 'Guardando...' : encargadoExistente ? 'Actualizar Acceso' : 'Asignar Acceso'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                ) : (
                    <div className={styles.contentWrapper}>
                        {/* SECCIÓN LEVANTAMIENTO PREMIUM */}
                        <div className={styles.infoCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <div>
                                    <h2 className={styles.sectionTitle} style={{ marginBottom: '8px' }}>
                                        <HiOutlineBolt /> Levantamiento Técnico
                                    </h2>
                                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                                        Gestiona el catálogo de equipos de climatización, refrigeración y cocina.
                                    </p>
                                </div>
                                <button
                                    className={styles.levantamientoButton}
                                    onClick={() => { setActiveSectionId(null); setIsLevantamientoModalOpen(true); }}
                                    type="button"
                                >
                                    <HiOutlineBolt size={18} />
                                    {canEdit ? "Gestionar Equipos" : "Ver Catálogo"}
                                </button>
                            </div>

                            <div className={styles.levantamientoPreview}>
                                {(formData.levantamiento?.length || 0) > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                        {formData.levantamiento?.map((seccion) => (
                                            <div key={seccion.id}>
                                                <div className={styles.areaBadge}>
                                                    📂 {seccion.nombreArea}
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {seccion.equipos.length === 0 ? (
                                                        <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No hay equipos registrados en esta área.</span>
                                                    ) : (
                                                        seccion.equipos.map((item, idx) => (
                                                            <div
                                                                key={item.id || idx}
                                                                className={styles.equipoChip}
                                                            >
                                                                <span 
                                                                    className={styles.chipName}
                                                                    onClick={() => {
                                                                        setSelectedEquipment(item);
                                                                        setSelectedSectionId(seccion.id);
                                                                    }}
                                                                >
                                                                    {item.nombre}
                                                                </span>
                                                                <div className={styles.chipActions}>
                                                                    <button onClick={() => { setSelectedEquipment(item); setSelectedSectionId(seccion.id); }} title="Ver Ficha"><HiOutlineEye size={16} color="#2563eb" /></button>
                                                                    <button onClick={() => setReportingEquipment(item)} title="Reportar"><HiOutlineExclamationTriangle size={16} color="#f59e0b" /></button>
                                                                    {canEdit && (
                                                                        <>
                                                                            <button onClick={() => { 
                                                                                setActiveSectionId(seccion.id); 
                                                                                setActiveEquipmentId(item.id!);
                                                                                setIsLevantamientoModalOpen(true); 
                                                                            }} title="Editar"><HiOutlinePencilSquare size={16} color="#64748b" /></button>
                                                                            <button onClick={() => handleDeleteEquipment(item.id!, seccion.id)} title="Borrar" className={styles.deleteBtn}><HiOutlineTrash size={16} color="#ef4444" /></button>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                <button 
                                                                    onClick={() => {
                                                                        setSelectedEqForBitacora(item);
                                                                        setBitacoraModalOpen(true);
                                                                    }} 
                                                                    className={styles.bitacoraBtn}
                                                                >
                                                                    <HiOutlineClipboardDocumentList size={14} />
                                                                    Ver Bitácora
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                        <p style={{ color: '#94a3b8', fontSize: '14px' }}>Aún no has realizado el levantamiento técnico de esta sucursal.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* FLOATING ACTION BUTTONS */}
                {canEdit && (
                    <div className={styles.floatingActions}>
                        <button className={styles.saveButton} onClick={handleSave}>
                            Guardar Cambios
                        </button>
                    </div>
                )}

                {/* MODALS (Functional logic preserved) */}
                <LevantamientoModal
                    isOpen={isLevantamientoModalOpen}
                    onClose={() => {
                        setIsLevantamientoModalOpen(false);
                        setActiveEquipmentId(null);
                    }}
                    data={formData.levantamiento || []}
                    initialSectionId={activeSectionId}
                    initialEquipmentId={activeEquipmentId}
                    onSave={(newData) => setFormData(prev => ({ ...prev, levantamiento: newData }))}
                    isReadOnly={!canEdit}
                />

                <ReportarProblemaModal 
                    isOpen={!!reportingEquipment}
                    onClose={() => setReportingEquipment(null)}
                    equipment={reportingEquipment}
                    negocioId={editId || ''}
                    onSubmit={handleReportarProblemaSubmit}
                />

                <DetalleEquipoModal
                    isOpen={!!selectedEquipment}
                    onClose={() => setSelectedEquipment(null)}
                    equipment={selectedEquipment}
                    onEdit={canEdit ? () => {
                        setActiveSectionId(selectedSectionId);
                        setIsLevantamientoModalOpen(true);
                    } : undefined}
                />

                <HistorialEquipoModal 
                    isOpen={bitacoraModalOpen}
                    onClose={() => setBitacoraModalOpen(false)}
                    equipo={selectedEqForBitacora}
                    historial={selectedEqForBitacora ? allSolicitudes.filter(sol => String(sol.levantamiento_equipo_id) === String(selectedEqForBitacora.id)) : []}
                    onViewReport={(trabajoId) => {
                        setSelectedTrabajoId(trabajoId);
                        setReporteModalOpen(true);
                    }}
                />

                {selectedTrabajoId && (
                    <DetalleReporteModal 
                        isOpen={reporteModalOpen}
                        onClose={() => setReporteModalOpen(false)}
                        trabajoId={selectedTrabajoId}
                    />
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default AutonomoPerfilEmpresa;
