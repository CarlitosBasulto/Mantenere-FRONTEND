import React, { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./AdminCotizacion.module.css";
import { useModal } from "../../context/ModalContext";
import { HiOutlineDocumentAdd } from "react-icons/hi";
import { updateEstadoTrabajo } from "../../services/trabajosService";
import { saveCotizacion } from "../../services/cotizacionesService";

const AdminCotizacion: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useModal();

    const [costo, setCosto] = useState("");
    const [notas, setNotas] = useState("");
    const [archivo, setArchivo] = useState<string | null>(null);
    const [nombreArchivo, setNombreArchivo] = useState<string>("");

    const [archivoFile, setArchivoFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNombreArchivo(file.name);
            setArchivoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setArchivo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEnviar = async () => {
        if (!costo || !archivo || !id) {
            showAlert("Campos Incompletos", "Por favor, ingresa el costo y sube un documento de cotización.", "warning");
            return;
        }

        try {
            // 1. Actualizar estado del trabajo en base de datos
            await updateEstadoTrabajo(Number(id), { estado: "Cotización Enviada" });

            // 2. Guardar cotización en base de datos
            let formData;
            if (archivoFile) {
                formData = new FormData();
                formData.append('trabajo_id', id);
                formData.append('monto', costo);
                formData.append('descripcion', notas);
                formData.append('estado', "Pendiente");
                formData.append('archivo', archivoFile);
            }

            const payload = formData || {
                trabajo_id: Number(id),
                monto: Number(costo),
                descripcion: notas,
                archivo: archivo, // Base64 fallback if for some reason file is not present
                estado: "Pendiente"
            };

            await saveCotizacion(payload as any);

            // 3. Notificación local (fallback UX)
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

            showAlert("Éxito", "Cotización enviada exitosamente al cliente.", "success");
            navigate(`/menu/trabajo-detalle/${id}`);
        } catch (error: any) {
            console.error("Error al enviar cotización:", error);
            showAlert("Error de Servidor", "No se pudo guardar la cotización en la base de datos: " + (error.response?.data?.message || error.message), "error");
        }
    };
Line: 68

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.mainCard}>
                <div className={styles.bgShape1}></div>
                <div className={styles.bgShape2}></div>

                <div className={styles.contentWrapper}>
                    {/* ENCABEZADO */}
                    <div className={styles.header}>
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
