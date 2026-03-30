import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./PerfilEmpresa.module.css";
import { useAuth } from "../../context/AuthContext";
import { createNegocio, updateNegocio, getNegocio } from "../../services/negociosService";


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
        encargado: "", // Solicitado: Debe salir vacío por defecto
        estado: "Yucatán",
        ciudad: "Mérida",
        nombrePlaza: ""
    });

    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    React.useEffect(() => {
        const fetchNegocio = async () => {
            if (editId) {
                try {
                    const existing = await getNegocio(Number(editId));
                    setFormData(prev => ({ ...prev, ...existing, nombreSucursal: existing.nombre }));
                } catch (error) {
                    console.error("Error fetching negocio:", error);
                }
            }
        };
        fetchNegocio();
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

    const handleSave = async () => {
        // Validación básica
        if (!formData.nombreSucursal) return alert("Por favor ingresa el nombre de la sucursal");
        if (!formData.encargado) return alert(`Por favor ingresa el ${formData.tipo === 'FC' ? 'encargado' : 'dueño'} de la empresa`);

        if (formData.tipo !== 'W/M') {
            if (formData.tipo === 'FS' && !formData.calle) return alert("Por favor ingresa la calle principal");
            if (formData.tipo !== 'FS' && !formData.nombrePlaza) return alert("Por favor ingresa el nombre de la plaza");
            if (!formData.estado) return alert("Por favor ingresa el estado");
            if (!formData.ciudad) return alert("Por favor ingresa la ciudad");
            if (!formData.calle) return alert("Por favor ingresa la calle");
            if (!formData.numero) return alert("Por favor ingresa el número");
            if (!formData.colonia) return alert("Por favor ingresa la colonia");
            if (formData.tipo === 'FS' && !formData.referencia) return alert("Por favor ingresa la referencia");
        } else {
            if (!formData.calleAv) return alert("Por favor ingresa la calle/Av");
            if (!formData.manzana) return alert("Por favor ingresa la manzana");
            if (!formData.lote) return alert("Por favor ingresa el lote");
        }
        if (!formData.cp) return alert("Por favor ingresa el código postal");

        try {
            const payload = {
                nombre: formData.nombreSucursal,
                tipo: formData.tipo,
                encargado: formData.encargado,
                user_id: user?.id,
                estado: formData.estado,
                ciudad: formData.ciudad,
                calle: formData.calle,
                numero: formData.numero,
                colonia: formData.colonia,
                cp: formData.cp,
                referencia: formData.referencia,
                manzana: formData.manzana,
                lote: formData.lote,
                calleAv: formData.calleAv,
                imagenPerfil: formData.imagenPerfil,
                nombrePlaza: formData.nombrePlaza
            };

            if (editId) {
                await updateNegocio(Number(editId), payload);
                alert("Informaci?n actualizada correctamente (DB)");
            } else {
                await createNegocio(payload);
                alert("Informaci?n guardada correctamente (DB)");
            }
            navigate('/cliente');
        } catch (error) {
            console.error("Error saving negocio:", error);
            alert("Hubo un error al guardar la empresa en el servidor.");
        }
    };

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.mainCard}>
                <div className={styles.bgShape1}></div>
                <div className={styles.bgShape2}></div>

                <div className={styles.contentWrapper}>
                    {/* HEADER */}
                    <div style={{ position: 'relative', marginBottom: '40px' }}>

                        <div className={styles.headerContainer}>
                            <h1 className={styles.pageTitle}>
                                {editId ? "Editar Sucursal/Negocio" : "Registrar Sucursal/Negocio"}
                            </h1>

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
                        </div>
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
