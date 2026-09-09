import React, { useState, useEffect } from "react";
import styles from "../../pages/Trabajos detalles/Trabajodetalles.module.css";
import { compressImage } from "../../utils/imageCompression";
import { useModal } from "../../context/ModalContext";

export type ServiceForm = {
    id: string;
    dbId?: number;
    categoria: string;
    customCategoria: string;
    descripcion: string;
    equipoSeleccionado: string;
    fotos: File[];
    fotosPreviewUrls: string[];
    isMinimized: boolean;
};

interface NuevoServicioModalProps {
    isOpen: boolean;
    isSOSRequest: boolean;
    isEditingRequest: boolean;
    initialData: { cliente: string; fecha: string };
    initialServices: ServiceForm[];
    businessAreas: any[];
    onClose: () => void;
    onConfirm: (data: { cliente: string; fecha: string }, services: ServiceForm[], deletedDbIds: number[]) => void;
}

const NuevoServicioModal: React.FC<NuevoServicioModalProps> = ({
    isOpen,
    isSOSRequest,
    isEditingRequest,
    initialData,
    initialServices,
    businessAreas,
    onClose,
    onConfirm
}) => {
    const { showAlert } = useModal();
    const [newRequestData, setNewRequestData] = useState(initialData);
    const [formServices, setFormServices] = useState<ServiceForm[]>(initialServices);
    const [deletedDbIds, setDeletedDbIds] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen) {
            setNewRequestData(initialData);
            setFormServices(initialServices.length > 0 ? initialServices : [{
                id: "svc-" + Date.now(),
                categoria: "Electricidad",
                customCategoria: "",
                descripcion: "",
                equipoSeleccionado: "",
                fotos: [],
                fotosPreviewUrls: [],
                isMinimized: false
            }]);
            setDeletedDbIds([]);
        }
    }, [isOpen, initialData, initialServices]);

    if (!isOpen) return null;

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

    const handleAddFormPhoto = async (svcId: string, filesList: FileList | null) => {
        if (!filesList) return;
        const files = Array.from(filesList);
        
        try {
            const compressedFiles = await Promise.all(files.map(f => compressImage(f, 1200, 1200, 0.6)));
            const newUrls = compressedFiles.map(file => URL.createObjectURL(file));

            setFormServices(prev => prev.map(s => {
                if (s.id === svcId) {
                    return {
                        ...s,
                        fotos: [...s.fotos, ...compressedFiles],
                        fotosPreviewUrls: [...s.fotosPreviewUrls, ...newUrls]
                    };
                }
                return s;
            }));
        } catch (error) {
            console.error("Error compressing images:", error);
            showAlert("Error", "Ocurrió un error al procesar las imágenes.", "error");
        }
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
                fotos: [],
                fotosPreviewUrls: [],
                isMinimized: false
            }
        ]);
    };

    const handleSubmit = () => {
        const invalidIndex = formServices.findIndex(s => !s.descripcion.trim());
        if (invalidIndex !== -1) {
            showAlert("Campo Requerido", `Por favor detalla la descripción del problema para el Servicio #${invalidIndex + 1}.`, "error");
            return;
        }
        onConfirm(newRequestData, formServices, deletedDbIds);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContentMedium}>
                <h2 className={styles.modalTitle} style={isSOSRequest ? { color: '#e11d48' } : {}}>
                    {isSOSRequest ? "🚨 Nueva Emergencia SOS" : (isEditingRequest ? "Editar Solicitud" : "Nuevo Servicio")}
                </h2>
                
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

                <div className={styles.modalScrollArea}>
                    {formServices.map((svc, index) => (
                        <div key={svc.id} className={styles.serviceCardItem}>
                            <div className={`${styles.serviceHeaderRow} ${svc.isMinimized ? styles.serviceHeaderRowMinimized : ''}`}>
                                <span className={styles.serviceHeaderTitle}>
                                    🛠️ SERVICIO #{index + 1} {svc.isMinimized ? `— ${svc.categoria}` : ''}
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => toggleMinimize(svc.id)}
                                        className={styles.serviceHeaderBtn}
                                    >
                                        {svc.isMinimized ? 'Expandir ↙' : 'Minimizar ↗'}
                                    </button>
                                    {formServices.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeServiceForm(svc.id, svc.dbId)}
                                            className={styles.serviceDeleteBtn}
                                        >
                                            Eliminar 🗑️
                                        </button>
                                    )}
                                </div>
                            </div>

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

                                    {svc.categoria === 'Mantenimiento' && businessAreas && businessAreas.length > 0 && (
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
                                            style={{ margin: 0 }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label className={styles.formLabel}>Adjuntar fotos</label>
                                        
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
                    ))}

                    {formServices.length < 10 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', marginBottom: '10px' }}>
                            <button
                                type="button"
                                onClick={addMoreServiceForm}
                                className={styles.addMoreServiceBtn}
                            >
                                ➕ Agregar más servicio ({formServices.length}/10)
                            </button>
                        </div>
                    )}
                </div>

                <div className={styles.requestModalActions}>
                    <button onClick={onClose} className={styles.cancelBtnLarge}>Cancelar</button>
                    <button onClick={handleSubmit} className={`${styles.confirmBtnLarge} ${isSOSRequest ? styles.confirmBtnLargeSos : ''}`}>
                        {isSOSRequest ? "Confirmar Emergencia" : "Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NuevoServicioModal;
