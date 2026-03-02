import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./PerfilEmpresa.module.css";
import { useAuth } from "../../context/AuthContext";

type BusinessType = "FC" | "FS" | "MALL" | "W/M";

interface BusinessData {
    nombreSucursal: string;
    tipo: BusinessType;
    encargado: string;
    // Ubicación estándar (FC/FS)
    nombrePlaza?: string;
    estado?: string;
    ciudad?: string;
    calle?: string;
    numero?: string;
    colonia?: string;
    cp?: string;
    // Campos FS
    referencia?: string;
    // Campos W/M
    manzana?: string;
    lote?: string;
    calleAv?: string;
    // Imagen de Perfil
    imagenPerfil?: string;
}

const PerfilEmpresa: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState<BusinessData>({
        nombreSucursal: "",
        tipo: "FC",
        encargado: user?.name || "",
        estado: "Yucatan",
        ciudad: "Merida",
    });

    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    React.useEffect(() => {
        if (editId) {
            const stored = localStorage.getItem('negocios_list');
            if (stored) {
                const list = JSON.parse(stored);
                // Buscar el negocio con ese ID
                const existing = list.find((item: any) => item.id.toString() === editId);
                if (existing) {
                    setFormData(prev => ({ ...prev, ...existing, nombreSucursal: existing.nombre }));
                }
            }
        }
    }, [editId]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        // Validación básica
        if (!formData.nombreSucursal) {
            alert("Por favor ingresa el nombre de la sucursal");
            return;
        }

        // Obtener lista actual de negocios
        const stored = localStorage.getItem('negocios_list');
        const list = stored ? JSON.parse(stored) : [];

        // Crear nuevo objeto de negocio formateado para ListaNegocios.tsx
        const newBusiness = {
            id: Date.now(),
            nombre: formData.nombreSucursal,
            ubicacion: formData.tipo === "W/M" ? `${formData.calleAv || ''} Mza ${formData.manzana || ''}` : (formData.nombrePlaza || formData.colonia || "Mérida"),
            dueno: user?.name || "Cliente",
            fecha: new Date().toLocaleDateString('es-MX'),
            estado: "En Espera", // Status inicial para el Admin
            ...formData // Guardamos el resto de la info detallada
        };

        const updatedList = editId
            // Si estamos editando, mapeamos y reemplazamos el existente conservando el ID antiguo
            ? list.map((item: any) => item.id.toString() === editId ? { ...newBusiness, id: item.id } : item)
            // Si es nuevo, lo añadimos al final
            : [...list, newBusiness];

        localStorage.setItem('negocios_list', JSON.stringify(updatedList));

        // Notificación para el Administrador si es un nuevo negocio
        if (!editId) {
            const adminNotifs = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
            adminNotifs.unshift({
                id: Date.now() + Math.random(),
                titulo: "Nueva Empresa Registrada",
                mensaje: `El cliente ${user?.name || "Cliente"} ha registrado una nueva empresa: ${formData.nombreSucursal}.`,
                fecha: new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                leida: false,
                type: 'new_business'
            });
            localStorage.setItem('admin_notifications', JSON.stringify(adminNotifs));
            window.dispatchEvent(new Event('storage'));
        }

        alert(editId ? "Información actualizada correctamente" : "Información guardada correctamente");
        navigate('/cliente');
    };

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.mainCard}>
                <div className={styles.bgShape1}></div>
                <div className={styles.bgShape2}></div>

                <div className={styles.contentWrapper}>
                    {/* HEADER */}
                    <div className={styles.headerContainer}>
                        <button onClick={() => navigate(-1)} className={styles.backButton}>
                            ←
                        </button>

                        {/* Hidden Input File */}
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleImageChange}
                        />

                        <div className={styles.profileIcon} title="El logo/imagen añadido será visible en las tarjetas de la lista.">
                            {formData.imagenPerfil ? (
                                <img src={formData.imagenPerfil} alt="Perfil" className={styles.profileImg} />
                            ) : (
                                "🏢"
                            )}
                            <div className={styles.editOverlay} onClick={() => fileInputRef.current?.click()}>Editar</div>
                        </div>

                        <h1 className={styles.pageTitle}>
                            {editId ? "Editar Sucursal/Negocio" : "Registrar Sucursal/Negocio"}
                        </h1>
                    </div>

                    {/* INFORMACION GENERAL */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Información general</h2>
                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Nombre de la sucursal</label>
                                <input
                                    type="text"
                                    name="nombreSucursal"
                                    className={styles.input}
                                    value={formData.nombreSucursal}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Tipo</label>
                                <select
                                    name="tipo"
                                    className={styles.select}
                                    value={formData.tipo}
                                    onChange={handleChange}
                                >
                                    <option value="FC">FC</option>
                                    <option value="FS">FS</option>
                                    <option value="MALL">MALL</option>
                                    <option value="W/M">W/M</option>
                                </select>
                            </div>
                        </div>
                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>
                                    {formData.tipo === 'FC' ? 'Encargado de la empresa' : 'Dueño de la empresa'}
                                </label>
                                <input
                                    type="text"
                                    name="encargado"
                                    className={styles.input}
                                    value={formData.encargado}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* DATOS DE UBICACION DINAMICOS */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Datos de ubicación</h2>

                        {/* CASO FC / FS / MALL */}
                        {formData.tipo !== 'W/M' && (
                            <>
                                <div className={styles.formGrid}>
                                    <div className={styles.inputGroup} style={{ gridColumn: 'span 3' }}>
                                        <label className={styles.label}>
                                            {formData.tipo === 'FS' ? 'Calle principal' : 'Nombre de la plaza'}
                                        </label>
                                        <input
                                            type="text"
                                            name={formData.tipo === 'FS' ? 'calle' : 'nombrePlaza'}
                                            className={styles.input}
                                            placeholder={formData.tipo === 'FS' ? 'Ej: Calle 60' : ''}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGrid}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Estado</label>
                                        <input type="text" name="estado" className={styles.input} value={formData.estado} onChange={handleChange} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Ciudad</label>
                                        <input type="text" name="ciudad" className={styles.input} value={formData.ciudad} onChange={handleChange} />
                                    </div>
                                </div>

                                <div className={styles.formGrid}>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Calle</label>
                                        <input type="text" name="calle" className={styles.input} onChange={handleChange} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Numero</label>
                                        <input type="text" name="numero" className={styles.input} onChange={handleChange} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Colonia</label>
                                        <input type="text" name="colonia" className={styles.input} onChange={handleChange} />
                                    </div>
                                </div>

                                {formData.tipo === 'FS' && (
                                    <div className={styles.formGrid}>
                                        <div className={styles.inputGroup} style={{ gridColumn: 'span 3' }}>
                                            <label className={styles.label}>Referencia</label>
                                            <input type="text" name="referencia" className={styles.input} placeholder="Entre calle X y Y" onChange={handleChange} />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* CASO W/M */}
                        {formData.tipo === 'W/M' && (
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Calle/Av</label>
                                    <input type="text" name="calleAv" className={styles.input} placeholder="Ej: Av. Principal" onChange={handleChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Manzana</label>
                                    <input type="text" name="manzana" className={styles.input} placeholder="Ej: 45" onChange={handleChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Lote</label>
                                    <input type="text" name="lote" className={styles.input} placeholder="Ej: 12" onChange={handleChange} />
                                </div>
                            </div>
                        )}

                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup} style={{ maxWidth: '200px' }}>
                                <label className={styles.label}>Codigo postal</label>
                                <input type="text" name="cp" className={styles.input} placeholder="97000" onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    {/* BOTON GUARDAR */}
                    <div className={styles.footer}>
                        <button className={styles.saveButton} onClick={handleSave}>
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerfilEmpresa;
