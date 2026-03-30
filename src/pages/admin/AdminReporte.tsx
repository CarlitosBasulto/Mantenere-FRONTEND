
import React, { useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import styles from './AdminReporte.module.css';
import { createReporte } from '../../services/reportesService';
import { updateEstadoTrabajo } from '../../services/trabajosService';
import { useAuth } from '../../context/AuthContext';
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

    // Form states
    const [reporteTienda, setReporteTienda] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [materiales, setMateriales] = useState('');
    const [observaciones, setObservaciones] = useState('');

    // Evidence images state (Base64)
    const [imagenes, setImagenes] = useState({
        antes: null as string | null,
        durante: null as string | null,
        despues: null as string | null
    });
    const [imagenObservacion, setImagenObservacion] = useState<string | null>(null);

    const [firmaEmpresa, setFirmaEmpresa] = useState<string | null>(null);

    // Modal Confirmation State
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [timerCount, setTimerCount] = useState(3);

    React.useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (isConfirmModalOpen && timerCount > 0) {
            timer = setTimeout(() => {
                setTimerCount(prev => prev - 1);
            }, 1000);
        }
        return () => clearTimeout(timer);
    }, [isConfirmModalOpen, timerCount]);

    React.useEffect(() => {
        // Try to load an already finalized report first for editing
        const finalData = localStorage.getItem(`report_data_${id}`);
        // Fallback to temporal data if the report is not yet finalized
        const temporalData = localStorage.getItem(`report_data_temporal_${id}`);

        const savedData = finalData || temporalData;

        if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.reporteTienda) setReporteTienda(parsed.reporteTienda);
            if (parsed.descripcion) setDescripcion(parsed.descripcion);
            if (parsed.materiales) setMateriales(parsed.materiales);
            if (parsed.observaciones) setObservaciones(parsed.observaciones);
            if (parsed.imagenes) setImagenes(parsed.imagenes);
            if (parsed.imagenObservacion) setImagenObservacion(parsed.imagenObservacion);
            if (parsed.firmaEmpresa) setFirmaEmpresa(parsed.firmaEmpresa);
        }
    }, [id]);



    // Refs for hidden file inputs
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

    const handleGuardarInformacion = async () => {
        if (!trabajoId) {
            alert("Error: No se encontró el ID del trabajo asociado.");
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
            fecha: new Date().toLocaleDateString()
        };
        
        try {
            const dataToSave = {
                trabajo_id: trabajoId,
                descripcion: descripcion || "Reporte generado",
                solucion: JSON.stringify(reportData) // Empaquetamos todo en solucion para el backend
            };
            await createReporte(dataToSave);
            localStorage.setItem(`report_data_temporal_${id}`, JSON.stringify(reportData));
            alert("Información guardada en Base de Datos exitosamente.");
        } catch (error) {
            console.error(error);
            alert("Hubo un error al guardar en Base de Datos. Se guardará temporalmente de forma local.");
            localStorage.setItem(`report_data_temporal_${id}`, JSON.stringify(reportData));
        }
    };

    const handleGenerarPDF = async () => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text("Reporte de Mantenimiento", 105, 15, { align: "center" });

            doc.setFontSize(10);
            doc.text(`ID Tarea: ${id || "N/A"}`, 10, 25);
            doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 10, 32);

            doc.setFont("helvetica", "bold");
            doc.text("Reporte de Tienda / Diagnóstico:", 10, 45);
            doc.setFont("helvetica", "normal");
            const prepReporte = doc.splitTextToSize(reporteTienda || 'Sin especificar', 180);
            doc.text(prepReporte, 10, 52);

            let nextY = 55 + (prepReporte.length * 5); // Dinámico basado en lineas

            doc.setFont("helvetica", "bold");
            doc.text("Descripción del Trabajo y Solución:", 10, nextY);
            doc.setFont("helvetica", "normal");
            const prepDesc = doc.splitTextToSize(descripcion || 'Sin especificar', 180);
            nextY += 7;
            doc.text(prepDesc, 10, nextY);
            
            nextY += (prepDesc.length * 5) + 5;

            doc.setFont("helvetica", "bold");
            doc.text("Materiales Utilizados:", 10, nextY);
            doc.setFont("helvetica", "normal");
            const prepMat = doc.splitTextToSize(materiales || 'Ninguno', 180);
            nextY += 7;
            doc.text(prepMat, 10, nextY);

            nextY += (prepMat.length * 5) + 5;

            doc.setFont("helvetica", "bold");
            doc.text("Observaciones Adicionales:", 10, nextY);
            doc.setFont("helvetica", "normal");
            const prepObs = doc.splitTextToSize(observaciones || 'Ninguna', 180);
            nextY += 7;
            doc.text(prepObs, 10, nextY);

            let currentY = nextY + (prepObs.length * 5) + 15;

            if (currentY > 230) {
                doc.addPage();
                currentY = 20;
            }

            if (imagenes.antes || imagenes.durante || imagenes.despues) {
                doc.setFont("helvetica", "bold");
                doc.text("Evidencia Fotográfica:", 10, currentY);
                currentY += 10;
                
                let x = 15;
                if (imagenes.antes) {
                    doc.text("Antes", x + 15, currentY);
                    doc.addImage(imagenes.antes, 'JPEG', x, currentY + 5, 45, 45);
                    x += 60;
                }
                if (imagenes.durante) {
                    doc.text("Durante", x + 15, currentY);
                    doc.addImage(imagenes.durante, 'JPEG', x, currentY + 5, 45, 45);
                    x += 60;
                }
                if (imagenes.despues) {
                    doc.text("Después", x + 15, currentY);
                    doc.addImage(imagenes.despues, 'JPEG', x, currentY + 5, 45, 45);
                }
                currentY += 65;
            }

            if (imagenObservacion) {
                if (currentY > 180) {
                    doc.addPage();
                    currentY = 20;
                }
                doc.setFont("helvetica", "bold");
                doc.text("Evidencia Adicional (Observaciones):", 10, currentY);
                doc.addImage(imagenObservacion, 'JPEG', 10, currentY + 10, 80, 80);
                currentY += 100;
            }

            if (firmaEmpresa) {
                if (currentY > 230) {
                    doc.addPage();
                    currentY = 20;
                }
                doc.setFont("helvetica", "bold");
                doc.text("Firma de Conformidad de la Empresa:", 10, currentY);
                
                if (firmaEmpresa.startsWith('data:application/pdf')) {
                    doc.setFont("helvetica", "normal");
                    doc.text("[ Documento PDF Adjunto cargado en Base de Datos ]", 10, currentY + 15);
                } else {
                    // Evitamos formato transparente si firma es PNG usando PNG genérico pero como fue comprimida JPEG -> JPEG
                    doc.addImage(firmaEmpresa, 'JPEG', 10, currentY + 5, 60, 40);
                    doc.setDrawColor(0);
                    doc.line(10, currentY + 50, 70, currentY + 50);
                    doc.setFont("helvetica", "normal");
                    doc.text("Sello / Firma Autorizada", 25, currentY + 55);
                }
            }

            doc.save(`Reporte_Mantenimiento_T${id}.pdf`);
        } catch (error) {
            console.error(error);
            alert("Hubo un error al generar el PDF. Asegúrate de que las fotos no sean demasiado grandes o corruptas.");
        }
    };

    const handleOpenConfirm = () => {
        if (!reporteTienda || !descripcion || !firmaEmpresa) {
            alert("Por favor completa los campos principales y asegúrate de agregar la foto de la firma de la empresa.");
            return;
        }
        setTimerCount(3);
        setIsConfirmModalOpen(true);
    };

    const handleSave = async () => {

        // Check if report is already finalized (editing mode)
        const isEditing = !!localStorage.getItem(`report_data_${id}`);

        // Find the task in localStorage and update it
        let jobFoundId: string | null = null;
        let jobTitle = "Tarea Desconocida";

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('tasks_')) {
                const tasks = JSON.parse(localStorage.getItem(key) || '[]');
                const taskIndex = tasks.findIndex((t: any) => t.id == id);

                if (taskIndex !== -1) {
                    tasks[taskIndex].estado = 'Completa';
                    jobTitle = tasks[taskIndex].titulo;
                    localStorage.setItem(key, JSON.stringify(tasks));
                    jobFoundId = key.replace('tasks_', '');

                    // AUTO-SYNC STATUS CHECK
                    const allComplete = tasks.every((t: any) => t.estado === 'Completa');
                    if (allComplete) {
                        try {
                            // Si tuviéramos API para tareas lo haríamos aquí
                        } catch(e) {}
                    }
                    break;
                }
            }
        }

        let realSucursal = "Desconocida";
        let foundBusinessKey = "";
        let originalJob: any = null;

        // Find real sucursal searching for the job
        if (jobFoundId) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('trabajos_business_')) {
                    const jobs = JSON.parse(localStorage.getItem(key) || '[]');
                    const job = jobs.find((j: any) => j.id == jobFoundId);
                    if (job) {
                        realSucursal = job.sucursal;
                        foundBusinessKey = key;
                        originalJob = job;
                        break;
                    }
                }
            }
        }

        // Save full report data locally
        const reportData = {
            id,
            jobFoundId,
            reporteTienda,
            descripcion,
            materiales,
            observaciones,
            imagenes,
            imagenObservacion,
            firmaEmpresa,
            fecha: new Date().toLocaleDateString()
        };
        localStorage.setItem(`report_data_${id}`, JSON.stringify(reportData));
        localStorage.removeItem(`report_data_temporal_${id}`); // Limpiar temporal

        // ✅ ACTUALIZAR EL ESTADO GLOBALY Y DB (ESPERANDO A QUE TERMINE Y CON FALLBACK ID SEGURO)
        const safeTrabajoId = trabajoId || jobFoundId;
        if (safeTrabajoId) {
            try {
                // Ensure sending to backend API correctly
                await updateEstadoTrabajo(Number(safeTrabajoId), { estado: 'Finalizado' });
                console.log("Estado de Trabajo actualizado a Finalizado en BD");
            } catch (e: any) {
                console.error("Error al finalizar en BD", e);
                alert("Atención: Hubo un problema comunicándose con la Base de Datos para definir el trabajo como 'Finalizado'. Informa al administrador. Detalle: " + (e.message || ""));
            }
        }

        // GENERAR NOTIFICACIÓN PARA EL ADMINISTRADOR (Solo si no es edición)
        if (!isEditing) {
            const notificaciones = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
            const nuevaNotificacion = {
                id: Date.now(),
                titulo: 'Trabajo Finalizado ✨',
                mensaje: `El técnico ha cerrado permanentemente y generado reporte para la tarea: ${jobTitle}.`,
                fecha: new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                leida: false,
                enlace: `/menu/trabajo-detalle/${trabajoId || jobFoundId}`
            };
            notificaciones.unshift(nuevaNotificacion);
            localStorage.setItem('admin_notifications', JSON.stringify(notificaciones));
            window.dispatchEvent(new Event('storage'));
        }

        // FINALMENTE, LECTURA REAL Y SEGURA PARA NOTIFICAR AL CLIENTE
        if (safeTrabajoId && !isEditing) {
            try {
                // Sacamos datos del backend fresquitos ahora que localStorage está obsoleto para esta operación
                const { getTrabajo } = await import('../../services/trabajosService');
                const jobFromApi = await getTrabajo(Number(safeTrabajoId));
                const clientNotifs = JSON.parse(localStorage.getItem('client_notifications') || '[]');
                
                const esVisitaStr = String(jobTitle).toLowerCase().includes('visita');
                const esVisitaReal = jobFromApi.tipo && jobFromApi.tipo.toLowerCase() === 'visita';

                clientNotifs.unshift({
                    id: Date.now() + 1,
                    titulo: (esVisitaStr || esVisitaReal) ? 'Visita Completada' : 'Trabajo Finalizado ✨',
                    mensaje: (esVisitaStr || esVisitaReal)
                        ? `El técnico ha concluido la visita de diagnóstico para: ${jobTitle}.`
                        : `El técnico ha terminado el trabajo manera exitosa y el reporte está listo para: ${jobTitle}.`,
                    fecha: new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                    leida: false,
                    jobId: jobFoundId
                });
                localStorage.setItem('client_notifications', JSON.stringify(clientNotifs));
                window.dispatchEvent(new Event('storage'));
            } catch (notifyErr) {
                console.error("Error al generar notificacion de cliente:", notifyErr);
            }
        }
        
        // Final edit save success message
        if (isEditing) {
            alert("Reporte actualizado con éxito.");
        } else {
            alert("Reporte guardado con éxito y tarea completada.");
        }
        
        if (jobFoundId) {
            if (user?.role === 'tecnico') {
                navigate(`/tecnico/trabajo-detalle/${jobFoundId}`, { replace: true });
            } else {
                navigate(`/menu/trabajo-detalle/${jobFoundId}`, { replace: true });
            }
        } else {
            navigate(user?.role === 'tecnico' ? '/tecnico' : '/menu', { replace: true });
        }
    };

    return (
        <div className={styles.dashboardLayout} style={{ gap: '0', padding: '20px', height: '100%' }}>

            {/* Hidden file inputs */}
            <input type="file" ref={antesInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'antes')} accept="image/*" />
            <input type="file" ref={duranteInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'durante')} accept="image/*" />
            <input type="file" ref={despuesInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'despues')} accept="image/*" />
            <input type="file" ref={observacionInputRef} style={{ display: 'none' }} onChange={handleImagenObservacionChange} accept="image/*" />
            <input type="file" ref={firmaInputRef} style={{ display: 'none' }} onChange={handleFirmaChange} accept="image/*,application/pdf" />

            {/* Main Content Card */}
            <div className={styles.mainCard}>

                {/* Background Shapes */}
                <div className={styles.bgShape1}></div>
                <div className={styles.bgShape2}></div>

                <div className={styles.contentWrapper}>

                    <div className={styles.scrollableContent}>
                        {/* Header */}
                        <div className={styles.header}>
                            <h1 className={styles.pageTitle}>Reporte</h1>
                            <div className={styles.metaInfo}>
                                <div>Folio <span className={styles.metaValue}>15676577</span></div>
                                <div>Fecha: <span className={styles.metaValue}>{new Date().toLocaleDateString()}</span></div>
                            </div>
                        </div>

                        {/* Form Fields Card */}
                        <div className={styles.infoSectionCard}>
                            <h3 className={styles.sectionTitle}>Datos del Reporte</h3>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Reporte de tienda:</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={reporteTienda}
                                    onChange={(e) => setReporteTienda(e.target.value)}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Descripción:</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Materiales Utilizados:</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={materiales}
                                    onChange={(e) => setMateriales(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Evidence Section Card */}
                        <div className={styles.infoSectionCard}>
                            <h3 className={styles.sectionTitle}>Evidencia y Observaciones</h3>
                            <div className={styles.evidenceSection}>
                                <label className={styles.label}>Evidencia Fotográfica:</label>
                                <div className={styles.evidenceGrid}>
                                    <div className={styles.evidenceItem} onClick={() => antesInputRef.current?.click()}>
                                        <span className={styles.evidenceLabel}>Antes</span>
                                        <div className={styles.squareBox} style={{ cursor: 'pointer', overflow: 'hidden' }}>
                                            {imagenes.antes ? <img src={imagenes.antes} alt="Antes" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️'}
                                        </div>
                                    </div>
                                    <div className={styles.evidenceItem} onClick={() => duranteInputRef.current?.click()}>
                                        <span className={styles.evidenceLabel}>Durante</span>
                                        <div className={styles.squareBox} style={{ cursor: 'pointer', overflow: 'hidden' }}>
                                            {imagenes.durante ? <img src={imagenes.durante} alt="Durante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️'}
                                        </div>
                                    </div>
                                    <div className={styles.evidenceItem} onClick={() => despuesInputRef.current?.click()}>
                                        <span className={styles.evidenceLabel}>Después</span>
                                        <div className={styles.squareBox} style={{ cursor: 'pointer', overflow: 'hidden' }}>
                                            {imagenes.despues ? <img src={imagenes.despues} alt="Despues" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🖼️'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Observations */}
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Observaciones Adicionales:</label>
                                <textarea
                                    className={styles.textarea}
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                ></textarea>
                                <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '15px', width: '100%', textAlign: 'left' }}>Evidencia Fotográfica:</span>
                                    <div className={styles.evidenceItem} onClick={() => observacionInputRef.current?.click()}>
                                        <div
                                            className={styles.squareBox}
                                            style={{
                                                width: '120px',
                                                height: '120px',
                                                cursor: 'pointer',
                                                overflow: 'hidden',
                                                flexDirection: 'column'
                                            }}
                                        >
                                            {imagenObservacion ? (
                                                <img src={imagenObservacion} alt="Evidencia Observación" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: '28px', marginBottom: '5px' }}>📸</span>
                                                    <span style={{ fontSize: '13px', textAlign: 'center', fontWeight: 'normal', color: 'inherit' }}>Añadir Foto</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {imagenObservacion && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setImagenObservacion(null); }}
                                            style={{ marginTop: '12px', background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                                            Eliminar Foto
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Validation Card */}
                        <div className={styles.infoSectionCard}>
                            <h3 className={styles.sectionTitle}>Validación</h3>
                            <div className={styles.validationSection}>
                                <div className={styles.validationGrid}>
                                    <div className={styles.evidenceItem} onClick={() => firmaInputRef.current?.click()}>
                                        <div className={styles.squareBox} style={{ cursor: 'pointer', overflow: 'hidden', width: '250px', height: '120px', margin: '0 auto', marginBottom: '8px' }}>
                                            {firmaEmpresa ? <img src={firmaEmpresa} alt="Firma Empresa" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal', textAlign: 'center', padding: '10px' }}>📸 Cargar Firma<br /><small>(Obligatorio)</small></span>}
                                        </div>
                                        <span className={styles.signatureLabel}>Validación de servicio<br />(Firma de la Empresa)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
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

            {/* Confirmacion Modal */}
            {isConfirmModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)'
                }}>
                    <div style={{
                        background: 'white', padding: '30px', borderRadius: '20px',
                        width: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}>
                        <h3 style={{ marginBottom: '15px', color: '#333' }}>¿Estás seguro de enviar?</h3>
                        <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
                            Una vez enviado, el reporte no podrá ser editado y se marcará como finalizado.
                        </p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setIsConfirmModalOpen(false)}
                                style={{ flex: 1, background: '#f44336', color: 'white', border: 'none', padding: '12px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    setIsConfirmModalOpen(false);
                                    handleSave();
                                }}
                                disabled={timerCount > 0}
                                style={{
                                    flex: 1,
                                    background: timerCount > 0 ? '#cccccc' : '#4caf50',
                                    color: timerCount > 0 ? '#666666' : 'white',
                                    border: 'none',
                                    padding: '12px',
                                    borderRadius: '25px',
                                    cursor: timerCount > 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'background 0.3s'
                                }}
                            >
                                {timerCount > 0 ? `Finalizar (${timerCount}s)` : 'Confirmar y Finalizar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReporte;
