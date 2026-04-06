
import React, { useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import styles from './AdminReporte.module.css';
import { createReporte, getReporteByTrabajoId } from '../../services/reportesService';
import { updateEstadoTrabajo } from '../../services/trabajosService';
import { createNotificacionByRole } from '../../services/notificacionesService';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
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
            try {
                const report = await getReporteByTrabajoId(Number(id));
                if (report) {
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

            let nextY = 55 + (prepReporte.length * 5); 

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

            nextY += (prepObs.length * 5) + 10;

            // --- NUEVA SECCIÓN: EQUIPOS INVOLUCRADOS ---
            if (involucraEquipo) {
                if (nextY > 260) { doc.addPage(); nextY = 20; }
                
                doc.setFillColor(245, 245, 245);
                doc.rect(10, nextY, 190, 35, 'F');
                
                doc.setFont("helvetica", "bold");
                doc.text("Equipos Involucrados:", 15, nextY + 8);
                
                doc.setFontSize(9);
                doc.text(`Tipo: ${equipoInfo.tipo}`, 15, nextY + 15);
                doc.text(`Marca: ${equipoInfo.marca || 'N/A'}`, 15, nextY + 22);
                doc.text(`Modelo: ${equipoInfo.modelo || 'N/A'}`, 15, nextY + 29);
                
                if (equipoInfo.tipo === 'Instalación') {
                    doc.text(`Piezas: ${equipoInfo.piezas || '1'}`, 90, nextY + 15);
                    doc.text(`Garantía: ${equipoInfo.garantia || '0'} meses`, 90, nextY + 22);
                }
                
                doc.setFontSize(10);
                nextY += 45;
            }

            let currentY = nextY + 5;

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
            showAlert("Error PDF", "Hubo un error al generar el PDF. Asegúrate de que las fotos no sean demasiado grandes o corruptas.", "error");
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
                            <h1 className={styles.pageTitle}>Reporte</h1>
                            <div className={styles.metaInfo}>
                                <div>Folio <span className={styles.metaValue}>15676577</span></div>
                                <div>Fecha: <span className={styles.metaValue}>{new Date().toLocaleDateString()}</span></div>
                            </div>
                        </div>

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
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                        <button 
                                            type="button"
                                            onClick={() => handleEquipoInfoChange('tipo', 'Instalación')}
                                            style={{ 
                                                flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 'bold', border: 'none',
                                                background: equipoInfo.tipo === 'Instalación' ? '#1976d2' : '#e0e0e0',
                                                color: equipoInfo.tipo === 'Instalación' ? 'white' : '#333'
                                            }}
                                        >
                                            Instalación
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleEquipoInfoChange('tipo', 'Mantenimiento')}
                                            style={{ 
                                                flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 'bold', border: 'none',
                                                background: equipoInfo.tipo === 'Mantenimiento' ? '#1976d2' : '#e0e0e0',
                                                color: equipoInfo.tipo === 'Mantenimiento' ? 'white' : '#333'
                                            }}
                                        >
                                            Mantenimiento
                                        </button>
                                    </div>

                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Marca:</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={equipoInfo.marca}
                                            onChange={(e) => handleEquipoInfoChange('marca', e.target.value)}
                                            placeholder="Ej. Samsung, Truper..."
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Modelo / Detalles:</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={equipoInfo.modelo}
                                            onChange={(e) => handleEquipoInfoChange('modelo', e.target.value)}
                                        />
                                    </div>

                                    {equipoInfo.tipo === 'Instalación' && (
                                        <div style={{ display: 'flex', gap: '15px' }}>
                                            <div className={styles.inputGroup} style={{ flex: 1 }}>
                                                <label className={styles.label}>No. de Piezas/Instalados:</label>
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
                                                    placeholder="Ej. 12"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

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
