
import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './AdminReporte.module.css';

const AdminReporte: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

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

    const [firmaEmpresa, setFirmaEmpresa] = useState<string | null>(null);

    React.useEffect(() => {
        const savedData = localStorage.getItem(`report_data_temporal_${id}`);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.reporteTienda) setReporteTienda(parsed.reporteTienda);
            if (parsed.descripcion) setDescripcion(parsed.descripcion);
            if (parsed.materiales) setMateriales(parsed.materiales);
            if (parsed.observaciones) setObservaciones(parsed.observaciones);
            if (parsed.imagenes) setImagenes(parsed.imagenes);
            if (parsed.firmaEmpresa) setFirmaEmpresa(parsed.firmaEmpresa);
        }
    }, [id]);



    // Refs for hidden file inputs
    const antesInputRef = useRef<HTMLInputElement>(null);
    const duranteInputRef = useRef<HTMLInputElement>(null);
    const despuesInputRef = useRef<HTMLInputElement>(null);
    const firmaInputRef = useRef<HTMLInputElement>(null);


    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'antes' | 'durante' | 'despues') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagenes(prev => ({ ...prev, [type]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFirmaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFirmaEmpresa(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGuardarInformacion = () => {
        const reportData = {
            id,
            reporteTienda,
            descripcion,
            materiales,
            observaciones,
            imagenes,
            firmaEmpresa,
            fecha: new Date().toLocaleDateString()
        };
        localStorage.setItem(`report_data_temporal_${id}`, JSON.stringify(reportData));
        alert("Información guardada temporalmente.");
    };

    const handleGenerarPDF = async () => {
        alert("Generación de PDF en progreso (Simulación). El backend se encargará del documento real.");
    };

    const handleSave = () => {
        if (!reporteTienda || !descripcion || !firmaEmpresa) {
            alert("Por favor completa los campos principales y asegúrate de agregar la foto de la firma de la empresa.");
            return;
        }

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
                        const storedJobs = localStorage.getItem('negocios_list');
                        if (storedJobs) {
                            const list = JSON.parse(storedJobs);
                            const jobIndex = list.findIndex((j: any) => j.id == jobFoundId); // NOTA: esto sigue estando mal (jobId vs businessId) pero lo restauramos para no romper el flujo existente mientras enfocamos
                            if (jobIndex !== -1) {
                                list[jobIndex].estado = 'Finalizado';
                                localStorage.setItem('negocios_list', JSON.stringify(list));
                            }
                        }
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

        // Save full report data
        const reportData = {
            id,
            jobFoundId,
            reporteTienda,
            descripcion,
            materiales,
            observaciones,
            imagenes,
            firmaEmpresa,
            fecha: new Date().toLocaleDateString()
        };
        localStorage.setItem(`report_data_${id}`, JSON.stringify(reportData));

        // GENERAR NOTIFICACIÓN PARA EL ADMINISTRADOR
        const notificaciones = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
        const nuevaNotificacion = {
            id: Date.now(),
            titulo: 'Trabajo Finalizado',
            mensaje: `El técnico ha completado el reporte para: ${jobTitle}.`,
            fecha: new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            leida: false,
            jobId: jobFoundId
        };
        notificaciones.unshift(nuevaNotificacion);
        localStorage.setItem('admin_notifications', JSON.stringify(notificaciones));

        // GENERAR NOTIFICACIÓN PARA EL CLIENTE (Trabajo / Visita Terminada)
        if (jobFoundId && originalJob) {
            const clientNotifs = JSON.parse(localStorage.getItem('client_notifications') || '[]');
            const esVisita = originalJob.tipo && originalJob.tipo.toLowerCase().includes('visita');

            clientNotifs.unshift({
                id: Date.now() + 1,
                titulo: esVisita ? 'Visita Completada' : 'Trabajo Finalizado',
                mensaje: esVisita
                    ? `El técnico ha terminado la visita para: ${jobTitle}.`
                    : `El técnico ha terminado el trabajo de manera exitosa para: ${jobTitle}.`,
                fecha: new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                leida: false,
                jobId: jobFoundId
            });
            localStorage.setItem('client_notifications', JSON.stringify(clientNotifs));
        }

        window.dispatchEvent(new Event('storage'));

        // Create new request from observations if they exist
        if (observaciones.trim() !== "") {
            if (foundBusinessKey && originalJob) {
                const targetList = JSON.parse(localStorage.getItem(foundBusinessKey) || '[]');
                const newRecursiveJob = {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    titulo: `Supervisión de Reporte: ${jobTitle}`,
                    ubicacion: originalJob.ubicacion,
                    tecnico: "Sin asignar",
                    fecha: new Date().toLocaleDateString('es-MX'),
                    estado: "Solicitud",
                    tipo: "Visita",
                    descripcion: `Hallazgo: ${observaciones}`,
                    sucursal: realSucursal,
                    encargado: originalJob.encargado,
                    plaza: originalJob.plaza,
                    ciudad: originalJob.ciudad,
                    calle: originalJob.calle,
                    numero: originalJob.numero,
                    colonia: originalJob.colonia,
                    cp: originalJob.cp,
                };
                targetList.push(newRecursiveJob);
                localStorage.setItem(foundBusinessKey, JSON.stringify(targetList));
            } else {
                // Fallback de seguridad al listado envímero
                const nuevasSolicitudes = JSON.parse(localStorage.getItem('new_solicitudes') || '[]');
                const nuevaSolicitud = {
                    id: Date.now(),
                    nombre: `Nueva acción: ${jobTitle}`,
                    subtitulo: `Obs: ${observaciones.substring(0, 30)}...`,
                    fecha: new Date().toLocaleDateString(),
                    tipo: "Técnico",
                    sucursal: realSucursal
                };
                nuevasSolicitudes.push(nuevaSolicitud);
                localStorage.setItem('new_solicitudes', JSON.stringify(nuevasSolicitudes));
            }
        }

        alert("Reporte guardado con éxito y tarea completada.");
        if (jobFoundId) {
            navigate(`/menu/trabajo-detalle/${jobFoundId}`);
        } else {
            navigate('/menu');
        }
    };

    return (
        <div className={styles.dashboardLayout} style={{ gap: '0', padding: '20px', height: '100%' }}>

            {/* Hidden file inputs */}
            <input type="file" ref={antesInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'antes')} accept="image/*" />
            <input type="file" ref={duranteInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'durante')} accept="image/*" />
            <input type="file" ref={despuesInputRef} style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'despues')} accept="image/*" />
            <input type="file" ref={firmaInputRef} style={{ display: 'none' }} onChange={handleFirmaChange} accept="image/*" />

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
                                onClick={handleSave}
                                className={styles.saveButton}
                            >
                                Guardar y Enviar
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminReporte;
