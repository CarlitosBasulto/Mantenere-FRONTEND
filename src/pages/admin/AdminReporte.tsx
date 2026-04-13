import React, { useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import styles from './AdminReporte.module.css';
import { createReporte, getReporteByTrabajoId } from '../../services/reportesService';
import { getActividadesByTrabajo } from '../../services/actividadesService';
import { updateEstadoTrabajo, getTrabajo } from '../../services/trabajosService';
import { createNotificacionByRole } from '../../services/notificacionesService';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { 
    HiOutlineCamera, 
    HiOutlinePhoto, 
    HiXMark,
    HiOutlineArrowUpTray 
} from 'react-icons/hi2';
import jsPDF from 'jspdf';

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

    const [reporteTienda, setReporteTienda] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [materiales, setMateriales] = useState('');
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
                        return; 
                    } catch(e) {}
                }

                const temporalData = localStorage.getItem(`report_data_temporal_${id}`);
                if (temporalData) {
                    const parsed = JSON.parse(temporalData);
                    if (parsed.reporteTienda) setReporteTienda(parsed.reporteTienda);
                    if (parsed.descripcion) setDescripcion(parsed.descripcion);
                    if (parsed.materiales) setMateriales(parsed.materiales);
                    if (parsed.observaciones) setObservaciones(parsed.observaciones);
                    if (parsed.imagenes) setImagenes(parsed.imagenes);
                    if (parsed.imagenObservacion) setImagenObservacion(parsed.imagenObservacion);
                    if (parsed.firmaEmpresa) setFirmaEmpresa(parsed.firmaEmpresa);
                    if (parsed.involucraEquipo !== undefined) setInvolucraEquipo(parsed.involucraEquipo);
                    if (parsed.equipoInfo) setEquipoInfo(parsed.equipoInfo);
                }

                // --- NUEVO: Sincronizar desde el Trabajo (Fuente de Verdad de Mantenimiento) ---
                let equipmentFromJob: any = null;
                try {
                    const jobData = await getTrabajo(Number(id));
                    const solicitud = jobData.mantenimiento_solicitud_visita || jobData.mantenimientoSolicitudVisita || jobData.mantenimiento_solicitud_reparacion || jobData.mantenimientoSolicitudReparacion;
                    equipmentFromJob = solicitud ? (solicitud.levantamiento_equipo || solicitud.levantamientoEquipo) : null;
                } catch (err) {
                    console.error("Error al obtener datos del trabajo para el reporte:", err);
                }

                if (!report || !equipoInfo.marca) {
                    // Si el trabajo tiene un equipo vinculado oficialmente, PRIORIDAD #1
                    if (equipmentFromJob) {
                        setInvolucraEquipo(true);
                        setEquipoInfo({
                            tipo: 'Mantenimiento',
                            marca: equipmentFromJob.marca || '',
                            modelo: equipmentFromJob.modelo || '',
                            piezas: '',
                            garantia: ''
                        });
                    } 
                    // Si no, buscar en Actividades (Fallback / Instalaciones) PRIORIDAD #2
                    else {
                        const acts = await getActividadesByTrabajo(Number(id));
                        const serviceMarker = "|||SERVICE_DATA|||";
                        const quoteMarker = "|||QUOTE_DATA|||";
                        
                        const activityWithEquipment = acts.find((a: any) => a.descripcion?.includes(serviceMarker));
                        
                        if (activityWithEquipment) {
                            try {
                                const parts = activityWithEquipment.descripcion.split(serviceMarker);
                                const jsonPart = parts[1].split(quoteMarker)[0].trim();
                                const sData = JSON.parse(jsonPart);
                                
                                setInvolucraEquipo(true);
                                setEquipoInfo({
                                    tipo: activityWithEquipment.tipo || 'Instalación',
                                    marca: sData.marca || '',
                                    modelo: sData.modelo || '',
                                    piezas: sData.piezas || '',
                                    garantia: sData.garantia || ''
                                });

                                if (!descripcion) {
                                    const cleanDesc = parts[0].split(quoteMarker)[0].trim();
                                    if (cleanDesc) setDescripcion(cleanDesc);
                                }
                            } catch (e) {
                                console.error("Error al parsear datos de equipo desde actividades:", e);
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
            // PDF en blanco (doc), escala en milímetros (mm) y formato A4 [210 x 297]
            const doc = new jsPDF();
            const dynamicFolio = reporteId ? `REP-${reporteId.toString().padStart(5, '0')}` : `TRB-${(trabajoId || id || '').toString().padStart(5, '0')}`;

            // --- 1. CABECERA PROFESIONAL ---
            // Dibujamos un rectángulo relleno (F) como barra superior
            doc.setFillColor(30, 41, 59); // Color del menú #1e293b (RGB)
            doc.rect(0, 0, 210, 40, 'F'); // (x, y, ancho, alto, estilo)

            // Título Blanco
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("REPORTE DE SERVICIO", 15, 20);

            // Folio en un recuadro blanco dentro de la barra
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(140, 12, 55, 12, 2, 2, 'F'); // Badge para el Folio
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(12);
            doc.text(`FOLIO: ${dynamicFolio}`, 145, 20);

            // Fecha
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 15, 30);

            // Reestablecer color de texto a negro para el contenido
            doc.setTextColor(0, 0, 0);
            let nextY = 55;

            // --- 2. SECCIÓN: DATOS GENERALES ---
            const drawSectionHeader = (title: string, y: number) => {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text(title, 15, y);
                doc.setDrawColor(230, 230, 230);
                doc.line(15, y + 2, 195, y + 2); // Línea decorativa
                return y + 10;
            };

            nextY = drawSectionHeader("Detalles del Servicio", nextY);
            
            // Cuerpo del Reporte (splitTextToSize permite saltos de línea automáticos)
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Diagnóstico Inicial:", 15, nextY);
            doc.setFont("helvetica", "normal");
            const prepReporte = doc.splitTextToSize(reporteTienda || 'Sin diagnóstico especificado', 180);
            doc.text(prepReporte, 15, nextY + 5);
            nextY += (prepReporte.length * 5) + 12;

            doc.setFont("helvetica", "bold");
            doc.text("Trabajo Realizado:", 15, nextY);
            doc.setFont("helvetica", "normal");
            const prepDesc = doc.splitTextToSize(descripcion || 'Sin descripción del trabajo', 180);
            doc.text(prepDesc, 15, nextY + 5);
            nextY += (prepDesc.length * 5) + 12;

            doc.setFont("helvetica", "bold");
            doc.text("Materiales y Refacciones:", 15, nextY);
            doc.setFont("helvetica", "normal");
            const prepMat = doc.splitTextToSize(materiales || 'No se registraron materiales adicionales', 180);
            doc.text(prepMat, 15, nextY + 5);
            nextY += (prepMat.length * 5) + 15;

            // --- 3. SECCIÓN: EQUIPOS (Si aplica) ---
            if (involucraEquipo) {
                // Si ya no cabe en esta hoja, creamos una nueva
                if (nextY > 240) { doc.addPage(); nextY = 20; }
                
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(15, nextY, 180, 25, 3, 3, 'F'); // Recuadro sombreado
                
                doc.setFont("helvetica", "bold");
                doc.text("EQUIPO INVOLUCRADO:", 20, nextY + 8);
                
                doc.setFontSize(9);
                doc.text(`Tipo: ${equipoInfo.tipo}`, 20, nextY + 16);
                doc.text(`Marca: ${equipoInfo.marca || 'N/A'}`, 70, nextY + 16);
                doc.text(`Modelo: ${equipoInfo.modelo || 'N/A'}`, 120, nextY + 16);
                
                if (equipoInfo.tipo === 'Instalación') {
                    doc.text(`Cantidad: ${equipoInfo.piezas}`, 20, nextY + 21);
                    doc.text(`Garantía: ${equipoInfo.garantia} meses`, 70, nextY + 21);
                }
                nextY += 35;
            }

            // --- 4. SECCIÓN: EVIDENCIA ---
            if (nextY > 180) { doc.addPage(); nextY = 20; }
            nextY = drawSectionHeader("Evidencia Fotográfica", nextY);

            let rowX = 15;
            const imgSize = 55; // Tamaño de cada foto cuadrada (55mm)
            
            if (imagenes.antes || imagenes.durante || imagenes.despues) {
                // Antes
                if (imagenes.antes) {
                    doc.addImage(imagenes.antes, 'JPEG', rowX, nextY, imgSize, imgSize);
                    doc.setFontSize(8);
                    doc.text("ANTES", rowX + (imgSize/2), nextY + imgSize + 5, { align: 'center' });
                    rowX += 65;
                }
                // Durante
                if (imagenes.durante) {
                    doc.addImage(imagenes.durante, 'JPEG', rowX, nextY, imgSize, imgSize);
                    doc.setFontSize(8);
                    doc.text("DURANTE", rowX + (imgSize/2), nextY + imgSize + 5, { align: 'center' });
                    rowX += 65;
                }
                // Después
                if (imagenes.despues) {
                    doc.addImage(imagenes.despues, 'JPEG', rowX, nextY, imgSize, imgSize);
                    doc.setFontSize(8);
                    doc.text("DESPUÉS", rowX + (imgSize/2), nextY + imgSize + 5, { align: 'center' });
                }
                nextY += 75;
            }

            // --- 5. FIRMA DE CONFORMIDAD ---
            if (firmaEmpresa) {
                if (nextY > 230) { doc.addPage(); nextY = 20; }
                
                if (firmaEmpresa.startsWith('data:application/pdf')) {
                    // Si es PDF no podemos dibujarlo directo en jsPDF fácilmente
                    doc.text("[ Firma adjunta en archivo separado ]", 105, nextY + 20, { align: 'center' });
                } else {
                    doc.addImage(firmaEmpresa, 'JPEG', (210/2) - 30, nextY, 60, 40);
                    doc.setDrawColor(200);
                    doc.line(75, nextY + 45, 135, nextY + 45); // Línea de firma
                    doc.setFontSize(10);
                    doc.text("Firma de Conformidad / Sello", 105, nextY + 50, { align: 'center' });
                }
            }

            // Pie de página (Número de página)
            const pages = doc.internal.pages.length;
            for (let j = 1; j < pages; j++) {
                doc.setPage(j);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Página ${j} de ${pages - 1} | Sistema de Gestión Automatizado`, 105, 285, { align: 'center' });
            }

            // Descargar
            doc.save(`${dynamicFolio}_Reporte.pdf`);
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

            // 2. Notificar al Cliente (si existe el user_id del cliente en el trabajo)
            // Nota: En una versión futura, el trabajo debería tener el user_id del cliente asociado.
            // Por ahora, solo notificamos al Administrador que es el flujo principal.

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
                                    <label className={styles.label}>Materiales Utilizados:</label>
                                    <textarea
                                        className={styles.textarea}
                                        style={{ height: '80px' }}
                                        value={materiales}
                                        onChange={(e) => setMateriales(e.target.value)}
                                        placeholder="Ej. 1 Filtro, 2m Cable..."
                                    />
                                </div>
                            </div>

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
                                                            <HiXMark />
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
                                                    <img src={firmaEmpresa} alt="Firma" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    <button 
                                                        className={styles.deletePhotoBtn} 
                                                        onClick={(e) => { e.stopPropagation(); removeFirma(); }}
                                                        style={{ top: '5px', right: '5px' }}
                                                    >
                                                        <HiXMark />
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
