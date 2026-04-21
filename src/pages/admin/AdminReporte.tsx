import React, { useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import styles from './AdminReporte.module.css';
import { createReporte, getReporteByTrabajoId } from '../../services/reportesService';
import { getActividadesByTrabajo } from '../../services/actividadesService';
import { updateEstadoTrabajo, getTrabajo } from '../../services/trabajosService';
import { createNotificacionByRole, createNotificacion } from '../../services/notificacionesService';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { 
    HiOutlineCamera, 
    HiOutlinePhoto, 
    HiXMark,
    HiOutlineArrowUpTray,
    HiOutlineArrowDownTray
} from 'react-icons/hi2';
import { generateMaintenanceReportPDF } from '../../utils/pdfGenerator';

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
    const [imagenObservacion, setImagenObservacion] = useState<string | null>(null);
    const [firmaEmpresa, setFirmaEmpresa] = useState<string | null>(null);
    const [reporteId, setReporteId] = useState<number | null>(null);

    const [involucraEquipo, setInvolucraEquipo] = useState(false);
    const [showEquiposSection, setShowEquiposSection] = useState(false);
    const [equipoInfo, setEquipoInfo] = useState({
        tipo: 'Instalación',
        marca: '',
        modelo: '',
        piezas: '',
        garantia: ''
    });

    React.useEffect(() => {
        const loadReportData = async () => {
            // --- RESET: Limpiar estados previos para evitar fugas entre reportes ---
            setReporteTienda('');
            setDescripcion('');
            setMateriales('');
            setRefaccionesList([]);
            setObservaciones('');
            setImagenes({ antes: null, durante: null, despues: null });
            setImagenObservacion(null);
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
                        if (parsed.reporteTienda) setReporteTienda(parsed.reporteTienda);
                        if (parsed.descripcion) setDescripcion(parsed.descripcion);
                        if (parsed.materiales) setMateriales(parsed.materiales);
                        if (parsed.observaciones) setObservaciones(parsed.observaciones);
                        if (parsed.imagenes) setImagenes(parsed.imagenes);
                        if (parsed.imagenObservacion) setImagenObservacion(parsed.imagenObservacion);
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
                    setReporteTienda(prev => prev || parsed.reporteTienda || '');
                    setDescripcion(prev => prev || parsed.descripcion || '');
                    setMateriales(prev => prev || parsed.materiales || '');
                    setObservaciones(prev => prev || parsed.observaciones || '');
                    setImagenes(prev => ({
                        antes: prev.antes || parsed.imagenes?.antes || null,
                        durante: prev.durante || parsed.imagenes?.durante || null,
                        despues: prev.despues || parsed.imagenes?.despues || null
                    }));
                    setImagenObservacion(prev => prev || parsed.imagenObservacion || null);
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
                    setReporteTienda(prev => prev || concatenatedDesc);

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

    const handleImagenObservacionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            compressImage(file, (base64) => {
                setImagenObservacion(base64);
            });
        }
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

    const removeImagenObservacion = () => {
        setImagenObservacion(null);
    };

    const removeFirma = () => {
        setFirmaEmpresa(null);
    };

    const handleGuardarInformacion = async () => {
        const safeId = trabajoId || id;
        if (!safeId) {
            showAlert("Error", "No se encontró el ID del trabajo asociado.", "error");
            return;
        }

        const reportData = {
            id,
            reporteTienda,
            descripcion,
            materiales,
            refaccionesList,
            observaciones,
            imagenes,
            imagenObservacion,
            firmaEmpresa,
            involucraEquipo,
            equipoInfo: involucraEquipo ? equipoInfo : null,
            fecha: new Date().toLocaleDateString()
        };
        
        try {
            const dataToSave = {
                trabajo_id: Number(safeId),
                descripcion: descripcion || "Reporte generado",
                solucion: JSON.stringify(reportData) 
            };
            await createReporte(dataToSave);
            showAlert("Éxito", "Información guardada en Base de Datos exitosamente.", "success");
        } catch (error) {
            console.error(error);
            showAlert("Error", "Hubo un error al guardar en la Base de Datos.", "error");
        }
    };

    const handleGenerarPDF = async () => {
        try {
            const dynamicFolio = reporteId ? `REP-${reporteId.toString().padStart(5, '0')}` : `TRB-${(trabajoId || id || '').toString().padStart(5, '0')}`;
            
            // Compilamos los materiales combinando el widget dinámico y el texto extra
            const widgetMateriales = refaccionesList.length > 0 
                ? refaccionesList.map(r => `- ${r.cantidad || 1}x ${r.pieza} ${r.costo_estimado ? `($${r.costo_estimado})` : ''}`).join('\n')
                : '';
            const combinedMateriales = [widgetMateriales, materiales].filter(Boolean).join('\n\n');

            await generateMaintenanceReportPDF({
                id: reporteId || id || trabajoId || 0,
                folio: dynamicFolio,
                fecha: new Date().toLocaleDateString('es-MX'),
                sucursal: trabajoBase?.negocio?.nombre || '---',
                encargado: trabajoBase?.negocio?.encargado || '---',
                tecnico: user?.name || 'Técnico',
                diagnostico: reporteTienda,
                descripcion,
                materiales: combinedMateriales,
                observaciones,
                imagenes: {
                    antes: imagenes.antes,
                    durante: imagenes.durante,
                    despues: imagenes.despues,
                    extra: imagenObservacion
                },
                firmaEmpresa,
                equipo: involucraEquipo ? equipoInfo : null
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

            // 2. Notificar al Cliente a través del negocio asociado al trabajo
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
            } catch (clienteNotiErr) {
                console.error("Error al notificar al cliente en BD:", clienteNotiErr);
            }

            showAlert("Éxito", "Reporte guardado con éxito en la Base de Datos.", "success");

            const targetPath = user?.role === 'tecnico' ? `/tecnico/trabajo-detalle/${safeTrabajoId}` : `/menu/trabajo-detalle/${safeTrabajoId}`;
            navigate(targetPath, { replace: true });

        } catch (error: any) {
            console.error("Error al finalizar reporte en DB:", error);
            showAlert("Error de Servidor", "No se pudo sincronizar la finalización con la base de datos: " + (error.response?.data?.message || error.message), "error");
        }
    };

    return (
        <div className={styles.dashboardLayout} style={{ gap: '0', padding: '20px', height: '100%' }}>

            <input type="file" ref={antesInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'antes')} accept="image/*" />
            <input type="file" ref={duranteInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'durante')} accept="image/*" />
            <input type="file" ref={despuesInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'despues')} accept="image/*" />
            <input type="file" ref={observacionInputRef} style={{ display: 'none' }} onChange={handleImagenObservacionChange} accept="image/*" />
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
                            <div className={styles.infoSectionCard}>
                                <h3 className={styles.sectionTitle}>Datos del Reporte</h3>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Reporte de tienda / Diagnóstico:</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={reporteTienda}
                                        onChange={(e) => setReporteTienda(e.target.value)}
                                        placeholder="Ej. Falla en compresor..."
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
                                    <label className={styles.label}>Piezas y Refacciones Registradas:</label>
                                    {refaccionesList.map((ref, i) => (
                                        <div key={i} className={styles.refaccionRow}>
                                            <input
                                                placeholder="Nombre de la pieza"
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
                                                style={{ width: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
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
                                        style={{ background: '#f8fafc', color: '#0ea5e9', border: '2px dashed #bae6fd', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', width: '100%', marginTop: '5px', marginBottom: '15px' }}
                                    >
                                        + Agregar Nueva Pieza/Refacción
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
                                                ) : <HiOutlinePhoto />}
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
                                                            <HiXMark />
                                                        </button>
                                                    </>
                                                ) : <HiOutlinePhoto />}
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
                                                            <HiXMark />
                                                        </button>
                                                    </>
                                                ) : <HiOutlinePhoto />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.inputGroup} style={{ marginBottom: 0 }}>
                                    <label className={styles.label}>Observaciones Adicionales:</label>
                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <textarea
                                            className={styles.textarea}
                                            style={{ flex: 1, height: '90px' }}
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                            placeholder="Notas internas u observaciones para el cliente..."
                                        ></textarea>
                                        
                                        <div className={styles.evidenceItem}>
                                            <span className={styles.evidenceLabel}>Foto Extra</span>
                                            <div className={styles.squareBox} onClick={() => observacionInputRef.current?.click()} style={{ width: '90px', height: '90px' }}>
                                                {imagenObservacion ? (
                                                    <>
                                                        <img src={imagenObservacion} alt="Obs" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                                                        <button 
                                                            className={styles.deletePhotoBtn} 
                                                            onClick={(e) => { e.stopPropagation(); removeImagenObservacion(); }}
                                                            title="Eliminar foto"
                                                        >
                                                            <HiXMark />
                                                        </button>
                                                    </>
                                                ) : <HiOutlineCamera />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                                onClick={handleGuardarInformacion}
                                className={`${styles.saveButton} ${styles.secondaryBtn}`}
                            >
                                Guardar Información
                            </button>
                            <button
                                onClick={handleGenerarPDF}
                                className={`${styles.saveButton} ${styles.pdfBtn}`}
                            >
                                Generar PDF
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
        </div>
    );
};

export default AdminReporte;
