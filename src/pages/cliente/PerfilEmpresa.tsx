import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./PerfilEmpresa.module.css";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";

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
    // Contactos Operativos
    gerente?: string;
    telefonoGerente?: string;
    subgerente?: string;
    telefonoSubgerente?: string;
}

const PerfilEmpresa: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = useModal();
    const [formData, setFormData] = useState<BusinessData>({
        nombreSucursal: "",
        tipo: "FC",
        encargado: "", // Solicitado: Debe salir vacío por defecto
        estado: "Yucatán",
        ciudad: "Mérida",
        nombrePlaza: "",
        gerente: "",
        telefonoGerente: "",
        subgerente: "",
        telefonoSubgerente: ""
    });

    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    React.useEffect(() => {
        const fetchNegocio = async () => {
            if (editId) {
                try {
                    const existing = await getNegocio(Number(editId));
                    // CARGA LOCAL: Combinar con datos de localStorage para ver campos nuevos
                    const localData = JSON.parse(localStorage.getItem('local_negocios_info') || '{}');
                    const localInfo = localData[editId] || {};
                    
                    setFormData(prev => ({ 
                        ...prev, 
                        ...existing, 
                        nombreSucursal: existing.nombre,
                        // Prioridad a lo local para campos nuevos no soportados por API aún
                        gerente: localInfo.gerente || existing.gerente || "",
                        telefonoGerente: localInfo.telefonoGerente || existing.telefonoGerente || "",
                        subgerente: localInfo.subgerente || existing.subgerente || "",
                        telefonoSubgerente: localInfo.telefonoSubgerente || existing.telefonoSubgerente || "",
                        nombrePlaza: localInfo.nombrePlaza || existing.nombrePlaza || "",
                        manzana: localInfo.manzana || existing.manzana || "",
                        lote: localInfo.lote || existing.lote || "",
                        calleAv: localInfo.calleAv || existing.calleAv || "",
                        referencia: localInfo.referencia || existing.referencia || ""
                    }));
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
        if (!formData.nombreSucursal) {
            showAlert("Campo Requerido", "Por favor ingresa el nombre de la sucursal", "warning");
            return;
        }
        if (!formData.encargado) {
            showAlert("Campo Requerido", `Por favor ingresa el ${formData.tipo === 'FC' ? 'encargado' : 'dueño'} de la empresa`, "warning");
            return;
        }

        if (formData.tipo !== 'W/M') {
            if (formData.tipo === 'FS' && !formData.calle) {
                showAlert("Campo Requerido", "Por favor ingresa la calle principal", "warning");
                return;
            }
            if (formData.tipo !== 'FS' && !formData.nombrePlaza) {
                showAlert("Campo Requerido", "Por favor ingresa el nombre de la plaza", "warning");
                return;
            }
            if (!formData.estado) {
                showAlert("Campo Requerido", "Por favor ingresa el estado", "warning");
                return;
            }
            if (!formData.ciudad) {
                showAlert("Campo Requerido", "Por favor ingresa la ciudad", "warning");
                return;
            }
            if (!formData.calle) {
                showAlert("Campo Requerido", "Por favor ingresa la calle", "warning");
                return;
            }
            if (!formData.numero) {
                showAlert("Campo Requerido", "Por favor ingresa el número", "warning");
                return;
            }
            if (!formData.colonia) {
                showAlert("Campo Requerido", "Por favor ingresa la colonia", "warning");
                return;
            }
            if (formData.tipo === 'FS' && !formData.referencia) {
                showAlert("Campo Requerido", "Por favor ingresa la referencia", "warning");
                return;
            }
        } else {
            if (!formData.calleAv) {
                showAlert("Campo Requerido", "Por favor ingresa la calle/Av", "warning");
                return;
            }
            if (!formData.manzana) {
                showAlert("Campo Requerido", "Por favor ingresa la manzana", "warning");
                return;
            }
            if (!formData.lote) {
                showAlert("Campo Requerido", "Por favor ingresa el lote", "warning");
                return;
            }
        }
        if (!formData.cp) {
            showAlert("Campo Requerido", "Por favor ingresa el código postal", "warning");
            return;
        }

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
                nombrePlaza: formData.nombrePlaza,
                gerente: formData.gerente,
                telefonoGerente: formData.telefonoGerente,
                subgerente: formData.subgerente,
                telefonoSubgerente: formData.telefonoSubgerente
            };

            if (editId) {
                await updateNegocio(Number(editId), payload);
                // PERSISTENCIA LOCAL: Guardar también en localStorage para campos nuevos (gerente, etc)
                const localData = JSON.parse(localStorage.getItem('local_negocios_info') || '{}');
                localData[editId] = payload;
                localStorage.setItem('local_negocios_info', JSON.stringify(localData));

                showAlert("Éxito", "Información actualizada correctamente", "success");
            } else {
                const newNegocio = await createNegocio(payload);
                // PERSISTENCIA LOCAL: Si la API devuelve el nuevo ID, lo guardamos localmente
                if (newNegocio && newNegocio.id) {
                    const localData = JSON.parse(localStorage.getItem('local_negocios_info') || '{}');
                    localData[newNegocio.id] = payload;
                    localStorage.setItem('local_negocios_info', JSON.stringify(localData));
                }

                showAlert("Éxito", "Información guardada correctamente", "success");
            }
            navigate('/cliente');
        } catch (error) {
            console.error("Error saving negocio:", error);
            showAlert("Error", "Hubo un error al guardar la empresa en el servidor.", "error");
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
                                            value={formData.tipo === 'FS' ? formData.calle : formData.nombrePlaza}
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
                                        <input type="text" name="calle" className={styles.input} value={formData.calle} onChange={handleChange} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Numero</label>
                                        <input type="text" name="numero" className={styles.input} value={formData.numero} onChange={handleChange} />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Colonia</label>
                                        <input type="text" name="colonia" className={styles.input} value={formData.colonia} onChange={handleChange} />
                                    </div>
                                </div>

                                {formData.tipo === 'FS' && (
                                    <div className={styles.formGrid}>
                                        <div className={styles.inputGroup} style={{ gridColumn: 'span 3' }}>
                                            <label className={styles.label}>Referencia</label>
                                            <input type="text" name="referencia" className={styles.input} placeholder="Entre calle X y Y" value={formData.referencia} onChange={handleChange} />
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
                                    <input type="text" name="calleAv" className={styles.input} placeholder="Ej: Av. Principal" value={formData.calleAv} onChange={handleChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Manzana</label>
                                    <input type="text" name="manzana" className={styles.input} placeholder="Ej: 45" value={formData.manzana} onChange={handleChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Lote</label>
                                    <input type="text" name="lote" className={styles.input} placeholder="Ej: 12" value={formData.lote} onChange={handleChange} />
                                </div>
                            </div>
                        )}

                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup} style={{ maxWidth: '200px' }}>
                                <label className={styles.label}>Codigo postal</label>
                                <input type="text" name="cp" className={styles.input} placeholder="97000" value={formData.cp} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    {/* CONTACTOS OPERATIVOS */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Contactos operativos (Opcional)</h2>
                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Nombre del Gerente</label>
                                <input
                                    type="text"
                                    name="gerente"
                                    className={styles.input}
                                    placeholder="Ej: Juan Pérez"
                                    value={formData.gerente}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Teléfono Gerente</label>
                                <input
                                    type="text"
                                    name="telefonoGerente"
                                    className={styles.input}
                                    placeholder="Ej: 9991234567"
                                    value={formData.telefonoGerente}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Nombre del Subgerente</label>
                                <input
                                    type="text"
                                    name="subgerente"
                                    className={styles.input}
                                    placeholder="Ej: María López"
                                    value={formData.subgerente}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Teléfono Subgerente</label>
                                <input
                                    type="text"
                                    name="telefonoSubgerente"
                                    className={styles.input}
                                    placeholder="Ej: 9997654321"
                                    value={formData.telefonoSubgerente}
                                    onChange={handleChange}
                                />
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
