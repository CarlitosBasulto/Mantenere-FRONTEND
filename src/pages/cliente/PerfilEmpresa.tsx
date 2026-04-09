import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./PerfilEmpresa.module.css";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";

import { createNegocio, updateNegocio, getNegocio, uploadImage } from "../../services/negociosService";
import LevantamientoModal from "../../components/LevantamientoModal";
import DetalleEquipoModal from "../../components/DetalleEquipoModal";
import { saveSafeLocalInfo, stripBlobUrls } from "../../utils/storageHelper";


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
    imagenPerfilFile?: File;
    // Contactos Operativos
    gerente?: string;
    telefonoGerente?: string;
    subgerente?: string;
    telefonoSubgerente?: string;
    // Levantamiento Técnico
    levantamiento?: LevantamientoData;
}

export interface Equipment {
    id?: string;
    nombre: string;
    marca: string;
    modelo: string;
    serie: string;
    anioFabricacion: string;
    anioUso: string;
    foto?: string;
    fotoFile?: File;
}

export interface LevantamientoSeccion {
    id: string;
    nombreArea: string;
    equipos: Equipment[];
}

export type LevantamientoData = LevantamientoSeccion[];

const PerfilEmpresa: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = useModal();
    const canEdit = user?.role === 'cliente';
    
    // Debug log to identify why canEdit might be true for an admin
    console.log("PERFIL_EMPRESA - User:", user?.name, "Role:", user?.role, "CanEdit:", canEdit);

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
        telefonoSubgerente: "",
        levantamiento: []
    });

    const [isLevantamientoModalOpen, setIsLevantamientoModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'levantamiento'>('info');
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    React.useEffect(() => {
        const fetchNegocio = async () => {
            if (editId) {
                try {
                    const existing = await getNegocio(Number(editId));
                    // Asegurar que el modal esté cerrado al cargar datos
                    setIsLevantamientoModalOpen(false);
                    // CARGA LOCAL: Combinar con datos de localStorage para ver campos nuevos
                    const localData = JSON.parse(localStorage.getItem('local_negocios_info') || '{}');
                    const localInfo = stripBlobUrls(localData[editId] || {});

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
                        referencia: localInfo.referencia || existing.referencia || "",
                        // Ajustar datos del levantamiento: priorizar datos locales 'areas'
                        levantamiento: Array.isArray(localInfo.areas) && localInfo.areas.length > 0
                            ? localInfo.areas
                            : Array.isArray((existing as any).areas) && (existing as any).areas.length > 0
                                ? (existing as any).areas
                                : Array.isArray(existing.levantamiento)
                                    ? existing.levantamiento
                                    : (existing.levantamiento && typeof existing.levantamiento === 'object')
                                        ? [
                                            { id: 'fria', nombreArea: 'Área Fría', equipos: (existing.levantamiento as any).areaFria || [] },
                                            { id: 'caliente', nombreArea: 'Área Caliente', equipos: (existing.levantamiento as any).areaCaliente || [] }
                                        ]
                                        : []
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
        if (!canEdit) return; // Prevent any state change if not authorized
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canEdit) return;
        const file = e.target.files?.[0];
        if (file) {
            // Revocar URL anterior si existía para evitar fugas de memoria
            if (formData.imagenPerfil && formData.imagenPerfil.startsWith('blob:')) {
                URL.revokeObjectURL(formData.imagenPerfil);
            }
            const tempUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, imagenPerfil: tempUrl, imagenPerfilFile: file }));
        }
    };

    // Cleanup de blobs al desmontar componente
    React.useEffect(() => {
        return () => {
            if (formData.imagenPerfil && formData.imagenPerfil.startsWith('blob:')) {
                URL.revokeObjectURL(formData.imagenPerfil);
            }
        };
    }, [formData.imagenPerfil]);

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
            // PROCESAR SUBIDA DE IMÁGENES FÍSICAS (Portada de negocio y Máquinas)
            let finalImagenPerfil = formData.imagenPerfil;
            if (formData.imagenPerfilFile) {
                try {
                    finalImagenPerfil = await uploadImage(formData.imagenPerfilFile);
                } catch (ign) { }
            }

            const finalLevantamiento = await Promise.all((formData.levantamiento || []).map(async (section) => {
                const finalEquipos = await Promise.all(section.equipos.map(async (eq) => {
                    let eqFoto = eq.foto;
                    if (eq.fotoFile) {
                        try {
                            eqFoto = await uploadImage(eq.fotoFile);
                        } catch (ign) { }
                    }
                    return {
                        id: eq.id,
                        nombre: eq.nombre,
                        marca: eq.marca,
                        modelo: eq.modelo,
                        serie: eq.serie,
                        anioFabricacion: eq.anioFabricacion,
                        anioUso: eq.anioUso,
                        foto: eqFoto
                    };
                }));
                return { ...section, equipos: finalEquipos };
            }));

            // 1. Datos que el servidor acepta (Estándar)
            // Ya no genera Error 500 porque imagenPerfil (y fotos) ahora son URLs cortas
            const apiPayload = {
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
                levantamiento: finalLevantamiento,
                imagenPerfil: finalImagenPerfil
            };

            // 2. Todos los datos para persistencia local
            const fullLocalData = {
                ...apiPayload,
                nombrePlaza: formData.nombrePlaza,
                gerente: formData.gerente,
                telefonoGerente: formData.telefonoGerente,
                subgerente: formData.subgerente,
                telefonoSubgerente: formData.telefonoSubgerente,
                manzana: formData.manzana,
                lote: formData.lote,
                calleAv: formData.calleAv,
                areas: finalLevantamiento
            };

            if (editId) {
                // Actualizar en servidor (Solo campos seguros)
                await updateNegocio(Number(editId), apiPayload);

                // Guardar TODO localmente para que se vea reflejado de inmediato (Seguro contra Cuota)
                saveSafeLocalInfo('local_negocios_info', editId, fullLocalData, showAlert);

                showAlert("Éxito", "Información actualizada correctamente", "success");
            } else {
                // Crear en servidor
                const newNegocio = await createNegocio(apiPayload);

                if (newNegocio) {
                    const actualId = newNegocio.data?.id || newNegocio.id;
                    if (actualId) {
                        // WORKAROUND: El backend tiene la lógica de guardar áreas en `update` pero no en `store`.
                        // Forzamos una actualización inmediatamente después de crear para que guarde las áreas en la BD.
                        if (apiPayload.levantamiento && apiPayload.levantamiento.length > 0) {
                            try {
                                await updateNegocio(actualId, apiPayload);
                            } catch (e) {
                                console.error("Error al sincronizar áreas tras creación", e);
                            }
                        }

                        saveSafeLocalInfo('local_negocios_info', actualId, fullLocalData, showAlert);
                    }
                }

                showAlert("Éxito", "Información guardada correctamente", "success");
            }
            navigate('/cliente');
        } catch (error) {
            console.error("Error saving negocio:", error);
            showAlert("Error", "Hubo un error al guardar en el servidor. Prueba de nuevo.", "error");
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h1 className={styles.pageTitle}>
                                    {editId ? "Editar Sucursal/Negocio" : "Registrar Sucursal/Negocio"}
                                </h1>
                            </div>

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
                                {canEdit && (
                                    <div className={styles.editOverlay} onClick={() => fileInputRef.current?.click()}>
                                        Editar
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className={styles.tabsContainer}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('info')}
                            className={`${styles.tab} ${activeTab === 'info' ? styles.activeTab : ''}`}
                        >
                            Información de la empresa
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('levantamiento')}
                            className={`${styles.tab} ${activeTab === 'levantamiento' ? styles.activeTab : ''}`}
                        >
                            Levantamiento Técnico
                        </button>
                    </div>

                    {activeTab === 'info' && (
                        <>
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
                                            value={formData.nombreSucursal || ''}
                                            onChange={handleChange}
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Tipo</label>
                                        <select
                                            name="tipo"
                                            className={styles.select}
                                            value={formData.tipo}
                                            onChange={handleChange}
                                            disabled={!canEdit}
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
                                            value={formData.encargado || ''}
                                            onChange={handleChange}
                                            disabled={!canEdit}
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
                                                    value={(formData.tipo === 'FS' ? formData.calle : formData.nombrePlaza) || ''}
                                                    onChange={handleChange}
                                                    disabled={!canEdit}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.formGrid}>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Estado</label>
                                                <input type="text" name="estado" className={styles.input} value={formData.estado || ''} onChange={handleChange} disabled={!canEdit} />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Ciudad</label>
                                                <input type="text" name="ciudad" className={styles.input} value={formData.ciudad || ''} onChange={handleChange} disabled={!canEdit} />
                                            </div>
                                        </div>

                                        <div className={styles.formGrid}>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Calle</label>
                                                <input type="text" name="calle" className={styles.input} value={formData.calle || ''} onChange={handleChange} disabled={!canEdit} />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Numero</label>
                                                <input type="text" name="numero" className={styles.input} value={formData.numero || ''} onChange={handleChange} disabled={!canEdit} />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>Colonia</label>
                                                <input type="text" name="colonia" className={styles.input} value={formData.colonia || ''} onChange={handleChange} disabled={!canEdit} />
                                            </div>
                                        </div>

                                        {formData.tipo === 'FS' && (
                                            <div className={styles.formGrid}>
                                                <div className={styles.inputGroup} style={{ gridColumn: 'span 3' }}>
                                                    <label className={styles.label}>Referencia</label>
                                                    <input type="text" name="referencia" className={styles.input} placeholder="Entre calle X y Y" value={formData.referencia || ''} onChange={handleChange} disabled={!canEdit} />
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
                                            <input type="text" name="calleAv" className={styles.input} placeholder="Ej: Av. Principal" value={formData.calleAv || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Manzana</label>
                                            <input type="text" name="manzana" className={styles.input} placeholder="Ej: 45" value={formData.manzana || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Lote</label>
                                            <input type="text" name="lote" className={styles.input} placeholder="Ej: 12" value={formData.lote || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                    </div>
                                )}

                                <div className={styles.formGrid}>
                                    <div className={styles.inputGroup} style={{ maxWidth: '200px' }}>
                                        <label className={styles.label}>Codigo postal</label>
                                        <input type="text" name="cp" className={styles.input} placeholder="97000" value={formData.cp || ''} onChange={handleChange} disabled={!canEdit} />
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
                                            value={formData.gerente || ''}
                                            onChange={handleChange}
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Teléfono Gerente</label>
                                        <input
                                            type="text"
                                            name="telefonoGerente"
                                            className={styles.input}
                                            placeholder="Ej: 9991234567"
                                            value={formData.telefonoGerente || ''}
                                            onChange={handleChange}
                                            disabled={!canEdit}
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
                                            value={formData.subgerente || ''}
                                            onChange={handleChange}
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Teléfono Subgerente</label>
                                        <input
                                            type="text"
                                            name="telefonoSubgerente"
                                            className={styles.input}
                                            placeholder="Ej: 9997654321"
                                            value={formData.telefonoSubgerente || ''}
                                            onChange={handleChange}
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* SECCION LEVANTAMIENTO */}
                    {activeTab === 'levantamiento' && (
                        <div className={styles.section} style={{ padding: '30px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '30px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 className={styles.sectionTitle} style={{ marginBottom: '8px' }}>Levantamiento Técnico</h2>
                                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                                        Registra los equipos de tu sucursal organizados por áreas personalizadas.
                                    </p>
                                </div>
                                <button
                                    className={styles.levantamientoButton}
                                    onClick={() => { setActiveSectionId(null); setIsLevantamientoModalOpen(true); }}
                                    type="button"
                                >
                                    {(formData.levantamiento?.length || 0) > 0 ? (canEdit ? "Gestionar Levantamiento" : "Ver Levantamiento") : "Iniciar Levantamiento"}
                                </button>
                            </div>

                            {/* DETALLES DEL LEVANTAMIENTO DINÁMICO */}
                            {(formData.levantamiento?.length || 0) > 0 && (
                                <div style={{ marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                    {formData.levantamiento?.map((seccion) => (
                                        <div key={seccion.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    📂 {seccion.nombreArea}
                                                </span>
                                                <span style={{ height: '1px', flex: 1, background: '#f1f5f9' }}></span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {seccion.equipos.length === 0 ? (
                                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Sin equipos en esta área</span>
                                                ) : (
                                                    seccion.equipos.map((item, idx) => (
                                                        <div
                                                            key={item.id || idx}
                                                            onClick={() => {
                                                                setSelectedEquipment(item);
                                                                setSelectedSectionId(seccion.id);
                                                            }}
                                                            style={{
                                                                padding: '8px 16px',
                                                                background: 'white',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '12px',
                                                                fontSize: '13px',
                                                                color: '#1e293b',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.borderColor = '#3b82f6';
                                                                e.currentTarget.style.transform = 'translateY(-1.5px)';
                                                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                                                            }}
                                                            title={`${item.nombre} - ${item.marca} (${item.modelo})`}
                                                        >
                                                            {item.nombre || item.marca}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* BOTON GUARDAR */}
                    {canEdit && (
                        <div className={styles.footer}>
                            <button className={styles.saveButton} onClick={handleSave}>
                                Guardar
                            </button>
                        </div>
                    )}

                    {/* MODAL LEVANTAMIENTO */}
                    <LevantamientoModal
                        isOpen={isLevantamientoModalOpen}
                        onClose={() => setIsLevantamientoModalOpen(false)}
                        data={formData.levantamiento || []}
                        initialSectionId={activeSectionId}
                        onSave={(newData) => {
                            setFormData(prev => ({ ...prev, levantamiento: newData }));
                        }}
                        isReadOnly={!canEdit}
                    />

                    {/* MODAL DETALLE EQUIPO */}
                    <DetalleEquipoModal
                        isOpen={!!selectedEquipment}
                        onClose={() => setSelectedEquipment(null)}
                        equipment={selectedEquipment}
                        onEdit={canEdit ? () => {
                            setActiveSectionId(selectedSectionId);
                            setIsLevantamientoModalOpen(true);
                        } : undefined}
                    />
                </div>
            </div>
        </div>
    );
};

export default PerfilEmpresa;
