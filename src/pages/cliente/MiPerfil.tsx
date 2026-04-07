import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PerfilEmpresa.module.css";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { getTrabajadores, updateTrabajador } from "../../services/trabajadoresService";


interface UserProfile {
    nombre: string;
    email: string;
    telefono: string;
    imagenPerfil?: string;
    rfc?: string;
    razonSocial?: string;
    direccionFiscal?: string;
}

const MiPerfil: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = useModal();

    const [formData, setFormData] = useState<UserProfile>({
        nombre: user?.name || "",
        email: "",
        telefono: "",
        rfc: "",
        razonSocial: "",
        direccionFiscal: ""
    });

    const [workerId, setWorkerId] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const profileKey = `profile_${user?.name?.replace(/\s+/g, '') || 'default'}`;

    useEffect(() => {
        const fetchInitialData = async () => {
            let adminData: Partial<UserProfile> = {};

            // 1. Intentar obtener datos desde el Servidor (Prioridad si es técnico)
            if (user?.role === 'tecnico') {
                try {
                    const data = await getTrabajadores();
                    const worker = data.find((w: any) => 
                        w.correo === user.email || w.nombre === user.name || w.user_id === user.id
                    );
                    if (worker) {
                        setWorkerId(worker.id);
                        adminData = {
                            nombre: worker.nombre,
                            email: worker.correo || "",
                            telefono: worker.telefono || "",
                            imagenPerfil: worker.avatar || ""
                        };
                    }
                } catch (err) {
                    console.error("Error fetching worker data:", err);
                }
            }

            // Fallback a localStorage para compatibilidad o datos offline
            const storedWorkers = localStorage.getItem('trabajadores_list');
            if (!adminData.nombre && storedWorkers) {
                const workers = JSON.parse(storedWorkers);
                const worker = workers.find((w: any) => w.nombre === user?.name);
                if (worker) {
                    adminData = {
                        nombre: worker.nombre,
                        email: worker.correo || "",
                        telefono: worker.telefono || "",
                        imagenPerfil: worker.avatar || ""
                    };
                }
            }

            // Cargar datos previos si existen
            const stored = localStorage.getItem(profileKey);
            if (stored) {
                const localData = JSON.parse(stored);
                setFormData({ ...adminData, ...localData });
            } else if (Object.keys(adminData).length > 0) {
                setFormData(prev => ({ ...prev, ...adminData }));
            }
        };

        fetchInitialData();
    }, [profileKey, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, imagenPerfil: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!formData.nombre) {
            showAlert("Campo Requerido", "El nombre es obligatorio", "warning");
            return;
        }

        try {
            // 1. GUARDAR EN EL SERVIDOR (Si es técnico y tenemos su ID)
            if (user?.role === 'tecnico' && workerId) {
                const updateData: any = {
                    nombre: formData.nombre,
                    correo: formData.email,
                    telefono: formData.telefono,
                };

                // Solo enviamos el avatar si es una imagen en base64 (nueva carga)
                if (formData.imagenPerfil && formData.imagenPerfil.startsWith('data:image')) {
                    updateData.avatar = formData.imagenPerfil;
                }

                await updateTrabajador(workerId, updateData);
            }

            // 2. Guardar perfil en storage local para persistencia inmediata
            localStorage.setItem(profileKey, JSON.stringify(formData));

            // También actualizar la lista local de trabajadores (para compatibilidad de vistas legacy)
            const storedWorkers = localStorage.getItem('trabajadores_list');
            if (storedWorkers) {
                const workers = JSON.parse(storedWorkers);
                const updatedWorkers = workers.map((w: any) => {
                    if (w.nombre === user?.name || w.correo === user?.email) {
                        return {
                            ...w,
                            nombre: formData.nombre,
                            correo: formData.email,
                            telefono: formData.telefono,
                            avatar: formData.imagenPerfil
                        };
                    }
                    return w;
                });
                localStorage.setItem('trabajadores_list', JSON.stringify(updatedWorkers));
            }

            showAlert("Éxito", "Perfil actualizado correctamente en el servidor", "success");
            navigate(-1);
        } catch (error) {
            console.error("Error al guardar perfil:", error);
            showAlert("Error al Guardar", "No se pudo sincronizar con el servidor. Verifica tu conexión.", "error");
        }
    };

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.mainCard}>
                <div className={styles.bgShape1}></div>
                <div className={styles.bgShape2}></div>

                <div className={styles.contentWrapper}>
                    {/* HEADER */}
                    <div className={styles.headerContainer}>

                        {/* Hidden Input File */}
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleImageChange}
                        />

                        <div
                            className={styles.profileIcon}
                            onClick={() => fileInputRef.current?.click()}
                            title="Haz clic para cambiar tu foto"
                        >
                            {formData.imagenPerfil ? (
                                <img src={formData.imagenPerfil} alt="Perfil" className={styles.profileImg} />
                            ) : (
                                "👤"
                            )}
                            <div className={styles.editOverlay}>Editar</div>
                        </div>

                        <h1 className={styles.pageTitle}>Mi Perfil</h1>
                    </div>

                    {/* DATOS DEL USUARIO */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Información Personal</h2>
                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>
                                    {user?.role === 'tecnico' ? 'Nombre Completo' : 'Nombre Completo / Empresa Principal'}
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    className={styles.input}
                                    value={formData.nombre}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Correo Electrónico</label>
                                <input
                                    type="email"
                                    name="email"
                                    className={styles.input}
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Teléfono de Contacto</label>
                                <input
                                    type="text"
                                    name="telefono"
                                    className={styles.input}
                                    value={formData.telefono}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* INFORMACION FISCAL - Solo visible para clientes */}
                    {user?.role !== 'tecnico' && (
                        <div className={styles.section}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Información Fiscal (Facturación)</h2>
                                <span style={{ fontSize: '12px', background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: '10px', fontWeight: 'bold' }}>Solo para dueños</span>
                            </div>
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>RFC</label>
                                    <input
                                        type="text"
                                        name="rfc"
                                        placeholder="Ej: ABC123456XYZ"
                                        className={styles.input}
                                        value={formData.rfc}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles.label}>Razón Social</label>
                                    <input
                                        type="text"
                                        name="razonSocial"
                                        placeholder="Nombre Legal de la Empresa"
                                        className={styles.input}
                                        value={formData.razonSocial}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup} style={{ gridColumn: 'span 3' }}>
                                    <label className={styles.label}>Dirección Fiscal Completa</label>
                                    <input
                                        type="text"
                                        name="direccionFiscal"
                                        placeholder="Calle, Número, Colonia, CP, Mérida, Yucatán"
                                        className={styles.input}
                                        value={formData.direccionFiscal}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BOTON GUARDAR */}
                    <div className={styles.footer}>
                        <button className={styles.saveButton} onClick={handleSave}>
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MiPerfil;
