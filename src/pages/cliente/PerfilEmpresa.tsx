import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./PerfilEmpresa.module.css";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";

import { 
    HiOutlineMapPin, 
    HiOutlineBolt, 
    HiOutlineInformationCircle,
    HiOutlineCamera,
    HiOutlineUserGroup,
    HiOutlineChevronLeft
} from "react-icons/hi2";

import { createNegocio, updateNegocio, getNegocio, uploadImage } from "../../services/negociosService";
import { createNotificacionByRole } from "../../services/notificacionesService";
import LevantamientoModal from "../../components/LevantamientoModal";
import DetalleEquipoModal from "../../components/DetalleEquipoModal";
import ReportarProblemaModal from "../../components/ReportarProblemaModal";
import { saveSafeLocalInfo, stripBlobUrls } from "../../utils/storageHelper";
import { createMantenimientoSolicitud } from "../../services/mantenimientoService";

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

export interface BusinessData {
    nombreSucursal?: string;
    tipo?: string;
    encargado?: string;
    estado?: string;
    ciudad?: string;
    nombrePlaza?: string;
    gerente?: string;
    telefonoGerente?: string;
    subgerente?: string;
    telefonoSubgerente?: string;
    calle?: string;
    numero?: string;
    colonia?: string;
    referencia?: string;
    manzana?: string;
    lote?: string;
    calleAv?: string;
    cp?: string;
    levantamiento?: LevantamientoData;
    imagenPerfil?: string;
    imagenPerfilFile?: File;
}

const PerfilEmpresa: React.FC = () => {
    // ... (logic remains same until return)
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = useModal();
    const canEdit = user?.role === 'cliente' || user?.role === 'admin';

    const [formData, setFormData] = useState<BusinessData>({
        nombreSucursal: "",
        tipo: "FC",
        encargado: "",
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
    const [reportingEquipment, setReportingEquipment] = useState<Equipment | null>(null);
    const [imageError, setImageError] = useState(false);

    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    React.useEffect(() => {
        const fetchNegocio = async () => {
            if (editId) {
                try {
                    const existing = await getNegocio(Number(editId));
                    setIsLevantamientoModalOpen(false);
                    const localData = JSON.parse(localStorage.getItem('local_negocios_info') || '{}');
                    const localInfo = stripBlobUrls(localData[editId] || {});

                    setFormData(prev => ({
                        ...prev,
                        ...existing,
                        nombreSucursal: existing.nombre,
                        gerente: localInfo.gerente || existing.gerente || "",
                        telefonoGerente: localInfo.telefonoGerente || existing.telefonoGerente || "",
                        subgerente: localInfo.subgerente || existing.subgerente || "",
                        telefonoSubgerente: localInfo.telefonoSubgerente || existing.telefonoSubgerente || "",
                        nombrePlaza: localInfo.nombrePlaza || existing.nombrePlaza || "",
                        manzana: localInfo.manzana || existing.manzana || "",
                        lote: localInfo.lote || existing.lote || "",
                        calleAv: localInfo.calleAv || existing.calleAv || "",
                        referencia: localInfo.referencia || existing.referencia || "",
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
        if (!canEdit) return;
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canEdit) return;
        const file = e.target.files?.[0];
        if (file) {
            if (formData.imagenPerfil && formData.imagenPerfil.startsWith('blob:')) {
                URL.revokeObjectURL(formData.imagenPerfil);
            }
            const tempUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, imagenPerfil: tempUrl, imagenPerfilFile: file }));
        }
    };

    React.useEffect(() => {
        return () => {
            if (formData.imagenPerfil && formData.imagenPerfil.startsWith('blob:')) {
                URL.revokeObjectURL(formData.imagenPerfil);
            }
        };
    }, [formData.imagenPerfil]);

    const handleSave = async () => {
        if (!formData.nombreSucursal) { showAlert("Campo Requerido", "Por favor ingresa el nombre de la sucursal", "warning"); return; }
        if (!formData.encargado) { showAlert("Campo Requerido", `Por favor ingresa el ${formData.tipo === 'FC' ? 'encargado' : 'dueño'} de la empresa`, "warning"); return; }
        if (formData.tipo !== 'W/M') {
            if (formData.tipo === 'FS' && !formData.calle) { showAlert("Campo Requerido", "Por favor ingresa la calle principal", "warning"); return; }
            if (formData.tipo !== 'FS' && !formData.nombrePlaza) { showAlert("Campo Requerido", "Por favor ingresa el nombre de la plaza", "warning"); return; }
            if (!formData.estado) { showAlert("Campo Requerido", "Por favor ingresa el estado", "warning"); return; }
            if (!formData.ciudad) { showAlert("Campo Requerido", "Por favor ingresa la ciudad", "warning"); return; }
            if (!formData.calle) { showAlert("Campo Requerido", "Por favor ingresa la calle", "warning"); return; }
            if (!formData.numero) { showAlert("Campo Requerido", "Por favor ingresa el número", "warning"); return; }
            if (!formData.colonia) { showAlert("Campo Requerido", "Por favor ingresa la colonia", "warning"); return; }
            if (formData.tipo === 'FS' && !formData.referencia) { showAlert("Campo Requerido", "Por favor ingresa la referencia", "warning"); return; }
        } else {
            if (!formData.calleAv) { showAlert("Campo Requerido", "Por favor ingresa la calle/Av", "warning"); return; }
            if (!formData.manzana) { showAlert("Campo Requerido", "Por favor ingresa la manzana", "warning"); return; }
            if (!formData.lote) { showAlert("Campo Requerido", "Por favor ingresa el lote", "warning"); return; }
        }
        if (!formData.cp) { showAlert("Campo Requerido", "Por favor ingresa el código postal", "warning"); return; }

        try {
            let finalImagenPerfil = formData.imagenPerfil;
            if (formData.imagenPerfilFile) {
                try { finalImagenPerfil = await uploadImage(formData.imagenPerfilFile); } catch (ign) { }
            }
            const finalLevantamiento = await Promise.all((formData.levantamiento || []).map(async (section) => {
                const finalEquipos = await Promise.all(section.equipos.map(async (eq) => {
                    let eqFoto = eq.foto;
                    if (eq.fotoFile) {
                        try { eqFoto = await uploadImage(eq.fotoFile); } catch (ign) { }
                    }
                    return { ...eq, foto: eqFoto };
                }));
                return { ...section, equipos: finalEquipos };
            }));
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
                nombrePlaza: formData.nombrePlaza,
                gerente: formData.gerente,
                telefonoGerente: formData.telefonoGerente,
                subgerente: formData.subgerente,
                telefonoSubgerente: formData.telefonoSubgerente,
                manzana: formData.manzana,
                lote: formData.lote,
                calleAv: formData.calleAv,
                levantamiento: finalLevantamiento,
                imagenPerfil: finalImagenPerfil
            };
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
                const updateRes = await updateNegocio(Number(editId), apiPayload);
                if (updateRes?.data?.areas) fullLocalData.areas = updateRes.data.areas;
                saveSafeLocalInfo('local_negocios_info', editId, fullLocalData, showAlert);
                showAlert("Éxito", "Información actualizada correctamente", "success");
            } else {
                const newNegocio = await createNegocio(apiPayload);
                if (newNegocio) {
                    const actualId = newNegocio.data?.id || newNegocio.id;
                    if (actualId) {
                        if (apiPayload.levantamiento && apiPayload.levantamiento.length > 0) {
                            try {
                                const finalUpdateRes = await updateNegocio(actualId, apiPayload);
                                if (finalUpdateRes?.data?.areas) fullLocalData.areas = finalUpdateRes.data.areas;
                            } catch (e) { console.error("Error al sincronizar áreas tras creación", e); }
                        }
                        saveSafeLocalInfo('local_negocios_info', actualId, fullLocalData, showAlert);
                    }
                    // Notificar al admin que hay una nueva sucursal
                    try {
                        await createNotificacionByRole({
                            role: 'admin',
                            titulo: '🏢 Nueva Sucursal Registrada',
                            mensaje: `El cliente ${user?.name || 'un usuario'} registró una nueva sucursal: "${formData.nombreSucursal}".`,
                            enlace: `/menu/negocios`
                        });
                    } catch (notiErr) {
                        console.error("Error notificando al admin de nueva sucursal:", notiErr);
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

    const handleReportarProblemaSubmit = async (descripcion: string) => {
        if (!reportingEquipment || !user?.id || !editId) return;
        if (String(reportingEquipment.id).startsWith('temp_')) {
            showAlert("Atención", "Por favor primero guarda el levantamiento de la empresa antes de reportar un problema para un equipo nuevo.", "warning");
            return;
        }
        try {
            await createMantenimientoSolicitud({
                cliente_id: user.id,
                negocio_id: Number(editId),
                levantamiento_equipo_id: reportingEquipment.id!,
                descripcion_problema: descripcion
            });

            // Notificar al administrador en la campaña
            try {
                await createNotificacionByRole({
                    role: 'admin',
                    titulo: '📋 Reporte de Mantenimiento de Equipo',
                    mensaje: `Un cliente reportó un inconveniente con el equipo "${reportingEquipment.nombre}". Revísalo de inmediato.`,
                    enlace: '/menu/mantenimiento'
                });
            } catch (notiErr) {
                console.error("Error notificando al admin", notiErr);
            }

            showAlert("Reporte Enviado", "El problema ha sido reportado exitosamente. El administrador revisará y agendará una visita técnica.", "success");
        } catch (error) {
            console.error(error);
            showAlert("Error", "No se pudo enviar el reporte de mantenimiento. Intenta de nuevo.", "error");
        }
    };

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.mainContainer}>
                
                {/* HEADER SECTION */}
                <header className={styles.pageHeader}>
                    <div className={styles.titleSection}>
                        <h1 className={styles.pageTitle}>
                            {editId ? "Editar Sucursal" : "Nueva Sucursal"}
                        </h1>
                        <button 
                            className={styles.tab} 
                            onClick={() => {
                                if (user?.role === 'admin') {
                                    navigate('/menu/negocios');
                                } else if (user?.role === 'tecnico') {
                                    navigate('/tecnico');
                                } else {
                                    navigate('/cliente');
                                }
                            }}
                        >
                           <HiOutlineChevronLeft size={20} /> Volver
                        </button>
                    </div>
                    <p className={styles.pageSubtitle}>
                        Completa los datos de tu negocio para gestionar mantenimientos y equipos.
                    </p>
                </header>

                {/* BUSINESS PROFILE HEADER CARD */}
                <div className={styles.profileHeaderCard}>
                    <div className={styles.profileIconWrapper}>
                        <div className={styles.profileIcon}>
                            {formData.imagenPerfil && !imageError ? (
                                <img 
                                    src={formData.imagenPerfil} 
                                    alt="Logo" 
                                    className={styles.profileImg} 
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                "🏢"
                            )}
                        </div>
                        {canEdit && (
                            <div className={styles.editOverlay} onClick={() => fileInputRef.current?.click()}>
                                <HiOutlineCamera size={20} />
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleImageChange}
                        />
                    </div>
                    
                    <div className={styles.businessHeaderInfo}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Nombre de la Sucursal</label>
                            <input
                                type="text"
                                name="nombreSucursal"
                                placeholder="Ej: Mantenere Center Mérida"
                                className={styles.businessNameInput}
                                value={formData.nombreSucursal || ''}
                                onChange={handleChange}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </div>

                {/* TABS CONTAINER */}
                <div className={styles.tabsContainer}>
                    <button
                        type="button"
                        onClick={() => setActiveTab('info')}
                        className={`${styles.tab} ${activeTab === 'info' ? styles.activeTab : ''}`}
                    >
                        Información Detallada
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('levantamiento')}
                        className={`${styles.tab} ${activeTab === 'levantamiento' ? styles.activeTab : ''}`}
                    >
                        Levantamiento de Equipos
                    </button>
                </div>

                {activeTab === 'info' ? (
                    <div className={styles.contentWrapper}>
                        
                        {/* CARD 1: INFORMACIÓN GENERAL */}
                        <div className={styles.infoCard}>
                            <h2 className={styles.sectionTitle}>
                                <HiOutlineInformationCircle /> Información General
                            </h2>
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Tipo de Establecimiento</label>
                                    <select
                                        name="tipo"
                                        className={styles.select}
                                        value={formData.tipo}
                                        onChange={handleChange}
                                        disabled={!canEdit}
                                    >
                                        <option value="FC">FC (Food Court)</option>
                                        <option value="FS">FS (Freestanding)</option>
                                        <option value="MALL">MALL</option>
                                        <option value="W/M">W/M</option>
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>
                                        {formData.tipo === 'FC' ? 'Encargado Directo' : 'Dueño de la Empresa'}
                                    </label>
                                    <input
                                        type="text"
                                        name="encargado"
                                        placeholder="Nombre completo"
                                        className={styles.input}
                                        value={formData.encargado || ''}
                                        onChange={handleChange}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CARD 2: UBICACIÓN */}
                        <div className={styles.infoCard}>
                            <h2 className={styles.sectionTitle}>
                                <HiOutlineMapPin /> Ubicación y Dirección
                            </h2>
                            
                            <div className={styles.formGrid}>
                                {formData.tipo !== 'W/M' ? (
                                    <>
                                        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                            <label className={styles.label}>
                                                {formData.tipo === 'FS' ? 'Calle Principal / Avenida' : 'Nombre de la Plaza Comercial'}
                                            </label>
                                            <input
                                                type="text"
                                                name={formData.tipo === 'FS' ? 'calle' : 'nombrePlaza'}
                                                className={styles.input}
                                                placeholder={formData.tipo === 'FS' ? 'Ej: Prolongación Montejo' : 'Ej: Plaza Altabrisa'}
                                                value={(formData.tipo === 'FS' ? formData.calle : formData.nombrePlaza) || ''}
                                                onChange={handleChange}
                                                disabled={!canEdit}
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Estado</label>
                                            <input type="text" name="estado" className={styles.input} value={formData.estado || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Ciudad / Municipio</label>
                                            <input type="text" name="ciudad" className={styles.input} value={formData.ciudad || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Calle</label>
                                            <input type="text" name="calle" className={styles.input} value={formData.calle || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Número</label>
                                            <input type="text" name="numero" className={styles.input} value={formData.numero || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Colonia / Fraccionamiento</label>
                                            <input type="text" name="colonia" className={styles.input} value={formData.colonia || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        {formData.tipo === 'FS' && (
                                            <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                                                <label className={styles.label}>Referencias adicionales</label>
                                                <input type="text" name="referencia" className={styles.input} placeholder="Ej: Frente al parque principal" value={formData.referencia || ''} onChange={handleChange} disabled={!canEdit} />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Calle o Avenida</label>
                                            <input type="text" name="calleAv" className={styles.input} value={formData.calleAv || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Manzana</label>
                                            <input type="text" name="manzana" className={styles.input} value={formData.manzana || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Lote</label>
                                            <input type="text" name="lote" className={styles.input} value={formData.lote || ''} onChange={handleChange} disabled={!canEdit} />
                                        </div>
                                    </>
                                )}
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Código Postal</label>
                                    <input type="text" name="cp" className={styles.input} placeholder="97000" value={formData.cp || ''} onChange={handleChange} disabled={!canEdit} />
                                </div>
                            </div>
                        </div>

                        {/* CARD 3: CONTACTOS */}
                        <div className={styles.infoCard}>
                            <h2 className={styles.sectionTitle}>
                                <HiOutlineUserGroup /> Contactos Operativos
                            </h2>
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Gerente de Sucursal</label>
                                    <input type="text" name="gerente" className={styles.input} value={formData.gerente || ''} onChange={handleChange} disabled={!canEdit} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Teléfono Gerente</label>
                                    <input type="text" name="telefonoGerente" className={styles.input} value={formData.telefonoGerente || ''} onChange={handleChange} disabled={!canEdit} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Subgerente / Encargado 2</label>
                                    <input type="text" name="subgerente" className={styles.input} value={formData.subgerente || ''} onChange={handleChange} disabled={!canEdit} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Teléfono Subgerente</label>
                                    <input type="text" name="telefonoSubgerente" className={styles.input} value={formData.telefonoSubgerente || ''} onChange={handleChange} disabled={!canEdit} />
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className={styles.contentWrapper}>
                        {/* SECCIÓN LEVANTAMIENTO PREMIUM */}
                        <div className={styles.infoCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <div>
                                    <h2 className={styles.sectionTitle} style={{ marginBottom: '8px' }}>
                                        <HiOutlineBolt /> Levantamiento Técnico
                                    </h2>
                                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                                        Gestiona el catálogo de equipos de climatización, refrigeración y cocina.
                                    </p>
                                </div>
                                <button
                                    className={styles.levantamientoButton}
                                    onClick={() => { setActiveSectionId(null); setIsLevantamientoModalOpen(true); }}
                                    type="button"
                                >
                                    <HiOutlineBolt size={18} />
                                    {canEdit ? "Gestionar Equipos" : "Ver Catálogo"}
                                </button>
                            </div>

                            <div className={styles.levantamientoPreview}>
                                {(formData.levantamiento?.length || 0) > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                        {formData.levantamiento?.map((seccion) => (
                                            <div key={seccion.id}>
                                                <div className={styles.areaBadge}>
                                                    📂 {seccion.nombreArea}
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {seccion.equipos.length === 0 ? (
                                                        <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No hay equipos registrados en esta área.</span>
                                                    ) : (
                                                        seccion.equipos.map((item, idx) => (
                                                            <div
                                                                key={item.id || idx}
                                                                className={styles.equipoChip}
                                                                onClick={() => {
                                                                    setSelectedEquipment(item);
                                                                    setSelectedSectionId(seccion.id);
                                                                }}
                                                            >
                                                                {item.nombre}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                        <p style={{ color: '#94a3b8', fontSize: '14px' }}>Aún no has realizado el levantamiento técnico de esta sucursal.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* FLOATING ACTION BUTTONS */}
                {canEdit && (
                    <div className={styles.floatingActions}>
                        <button className={styles.saveButton} onClick={handleSave}>
                            Guardar Cambios
                        </button>
                    </div>
                )}

                {/* MODALS (Functional logic preserved) */}
                <LevantamientoModal
                    isOpen={isLevantamientoModalOpen}
                    onClose={() => setIsLevantamientoModalOpen(false)}
                    data={formData.levantamiento || []}
                    initialSectionId={activeSectionId}
                    onSave={(newData) => setFormData(prev => ({ ...prev, levantamiento: newData }))}
                    isReadOnly={!canEdit}
                    onReportMaintenance={(eq) => setReportingEquipment(eq)}
                />

                <ReportarProblemaModal 
                    isOpen={!!reportingEquipment}
                    onClose={() => setReportingEquipment(null)}
                    equipment={reportingEquipment}
                    negocioId={editId || ''}
                    onSubmit={handleReportarProblemaSubmit}
                />

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

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default PerfilEmpresa;
