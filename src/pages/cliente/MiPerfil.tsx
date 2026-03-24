import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PerfilEmpresa.module.css";
import { useAuth } from "../../context/AuthContext";

interface UserProfile {
    nombre: string;
    email: string;
    telefono: string;
    imagenPerfil?: string;
}

const MiPerfil: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [formData, setFormData] = useState<UserProfile>({
        nombre: user?.name || "",
        email: "",
        telefono: "",
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const profileKey = `profile_${user?.name?.replace(/\s+/g, '') || 'default'}`;

    useEffect(() => {
        let adminData: Partial<UserProfile> = {};

        // Buscar si existe en trabajadores_list (registro del admin)
        const storedWorkers = localStorage.getItem('trabajadores_list');
        if (storedWorkers) {
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
    }, [profileKey, user?.name]);

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

    const handleSave = () => {
        if (!formData.nombre) {
            alert("El nombre es obligatorio");
            return;
        }

        try {
            // Guardar perfil en storage
            localStorage.setItem(profileKey, JSON.stringify(formData));

            // También actualizar la base de datos de trabajadores (para que el admin vea la foto/datos)
            const storedWorkers = localStorage.getItem('trabajadores_list');
            if (storedWorkers) {
                const workers = JSON.parse(storedWorkers);
                const updatedWorkers = workers.map((w: any) => {
                    if (w.nombre === user?.name) {
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

            alert("Perfil actualizado correctamente");
            navigate(-1); // Regresar a la pantalla anterior
        } catch (error) {
            console.error("Error al guardar perfil:", error);
            alert("Error al guardar: La imagen podría ser muy pesada para el almacenamiento local. Intenta con una más pequeña.");
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
                                <label className={styles.label}>Nombre Completo / Empresa Principal</label>
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
