import React, { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./AdminCotizacion.module.css";
import { HiOutlineArrowLeft, HiOutlineDocumentAdd } from "react-icons/hi";

const AdminCotizacion: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [costo, setCosto] = useState("");
    const [notas, setNotas] = useState("");
    const [archivo, setArchivo] = useState<string | null>(null);
    const [nombreArchivo, setNombreArchivo] = useState<string>("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNombreArchivo(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setArchivo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEnviar = () => {
        if (!costo || !archivo) {
            alert("Por favor, ingresa el costo y sube un documento de cotización.");
            return;
        }

        // Cargar trabajos actuales
        const storedJobs = localStorage.getItem('trabajos_list');
        const jobs = storedJobs ? JSON.parse(storedJobs) : [];

        // Modificar el estado y añadir la cotización al trabajo
        const updatedJobs = jobs.map((job: any) => {
            if (job.id.toString() === id) {
                return {
                    ...job,
                    estado: "Cotización Enviada",
                    cotizacion: {
                        costo,
                        notas,
                        archivo,
                        fecha: new Date().toLocaleDateString('es-MX')
                    }
                };
            }
            return job;
        });

        localStorage.setItem('trabajos_list', JSON.stringify(updatedJobs));

        // GENERAR NOTIFICACIÓN PARA EL CLIENTE (Cotización)
        const clientNotifs = JSON.parse(localStorage.getItem('client_notifications') || '[]');
        clientNotifs.unshift({
            id: Date.now(),
            titulo: 'Cotización Recibida',
            mensaje: `Ya tienes una nueva cotización lista para revisión (Trabajo #${id}).`,
            fecha: new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            leida: false,
            jobId: id
        });
        localStorage.setItem('client_notifications', JSON.stringify(clientNotifs));
        window.dispatchEvent(new Event('storage'));

        alert("Cotización enviada exitosamente al cliente.");
        navigate(`/menu/trabajo-detalle/${id}`);
    };

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.mainCard}>
                <div className={styles.bgShape1}></div>
                <div className={styles.bgShape2}></div>

                <div className={styles.contentWrapper}>
                    {/* ENCABEZADO */}
                    <div className={styles.header}>
                        <button onClick={() => navigate(-1)} className={styles.backButton}>
                            <HiOutlineArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className={styles.pageTitle}>Generar Cotización</h1>
                            <p className={styles.subtitle}>Trabajo #{id}</p>
                        </div>
                    </div>

                    <div className={styles.scrollableContent}>
                        {/* FORMULARIO */}
                        <div className={styles.infoSectionCard}>
                            <h3 className={styles.sectionTitle}>Detalles de Cotización</h3>

                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Costo Estimado ($)</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        placeholder="Ej: 1500"
                                        value={costo}
                                        onChange={(e) => setCosto(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Notas para el cliente</label>
                                <textarea
                                    className={styles.textarea}
                                    placeholder="Detalles sobre los materiales, tiempo estimado, etc."
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        {/* ARCHIVO */}
                        <div className={styles.infoSectionCard}>
                            <h3 className={styles.sectionTitle}>Documento Adjunto</h3>
                            <p className={styles.description}>Sube un PDF o imagen con el desglose completo de la cotización.</p>

                            <input
                                type="file"
                                accept="image/*, .pdf"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />

                            <div
                                className={styles.uploadBox}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <HiOutlineDocumentAdd size={40} className={styles.uploadIcon} />
                                {archivo ? (
                                    <span className={styles.fileName}>Archivo cargado: {nombreArchivo}</span>
                                ) : (
                                    <span className={styles.uploadText}>Haz clic aquí para subir un archivo</span>
                                )}
                            </div>
                        </div>

                        {/* ACCIONES */}
                        <div className={styles.footer}>
                            <button className={styles.sendButton} onClick={handleEnviar}>
                                Enviar Cotización
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCotizacion;
