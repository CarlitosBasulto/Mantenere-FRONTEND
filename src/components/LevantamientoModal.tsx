import React, { useState, useEffect } from 'react';
import styles from './LevantamientoModal.module.css';
import { 
    HiOutlineXMark, 
    HiOutlinePlus, 
    HiOutlineTrash,
    HiOutlinePencilSquare,
    HiOutlineFolderPlus,
    HiOutlineChevronRight,
    HiOutlineArchiveBox,
    HiOutlineCheckCircle,
    HiOutlineCamera,
    HiOutlinePhoto,
    HiOutlineEye
} from "react-icons/hi2";
import type { Equipment, LevantamientoData, LevantamientoSeccion } from '../pages/cliente/PerfilEmpresa';
import DetalleEquipoModal from './DetalleEquipoModal';
import { useModal } from '../context/ModalContext';

interface LevantamientoModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: LevantamientoData;
    initialSectionId?: string | null;
    onSave: (newData: LevantamientoData) => void;
    isReadOnly?: boolean;
}

const LevantamientoModal: React.FC<LevantamientoModalProps> = ({ isOpen, onClose, data, initialSectionId, onSave, isReadOnly = false }) => {
    const { showConfirm } = useModal();
    const [sections, setSections] = useState<LevantamientoData>([]);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    
    const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
    const [viewingEquipment, setViewingEquipment] = useState<Equipment | null>(null);
    const [equipmentForm, setEquipmentForm] = useState<Equipment>({
        nombre: '',
        marca: '',
        modelo: '',
        serie: '',
        anioFabricacion: '',
        anioUso: '',
        foto: ''
    });

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const resetEquipmentForm = () => {
        setEquipmentForm({
            nombre: '',
            marca: '',
            modelo: '',
            serie: '',
            anioFabricacion: '',
            anioUso: '',
            foto: ''
        });
        setEditingEquipment(null);
    };

    const handleAddSection = () => {
        if (!newSectionName.trim()) return;
        const newSection: LevantamientoSeccion = {
            id: `temp_${Date.now()}`,
            nombreArea: newSectionName.trim(),
            equipos: []
        };
        const updated = [...sections, newSection];
        setSections(updated);
        setActiveSectionId(newSection.id);
        setNewSectionName('');
        setIsAddingSection(false);
    };

    const handleDeleteSection = (id: string, nombreArea: string) => {
        showConfirm(
            "¿Eliminar área?",
            `¿Estás seguro de que deseas eliminar el área "${nombreArea}" y todos sus equipos?`,
            () => {
                const updated = sections.filter(s => s.id !== id);
                setSections(updated);
                if (activeSectionId === id) {
                    setActiveSectionId(updated.length > 0 ? updated[0].id : null);
                }
            },
            () => {},
            "Sí, eliminar",
            "Cancelar"
        );
    };

    const handleAddOrUpdateEquipment = () => {
        if (!activeSectionId || !equipmentForm.nombre || !equipmentForm.marca) return;

        const updatedSections = sections.map((section: LevantamientoSeccion) => {
            if (section.id === activeSectionId) {
                let updatedEquipos;
                if (editingEquipment) {
                    updatedEquipos = section.equipos.map((e: Equipment) => e.id === editingEquipment.id ? { ...equipmentForm, id: e.id } : e);
                } else {
                    updatedEquipos = [...section.equipos, { ...equipmentForm, id: `temp_${Date.now()}` }];
                }
                return { ...section, equipos: updatedEquipos };
            }
            return section;
        });

        setSections(updatedSections);
        resetEquipmentForm();
    };

    useEffect(() => {
        if (isOpen) {
            setSections([...data]);
            setActiveSectionId(initialSectionId || (data.length > 0 ? data[0].id : null));
        }
    }, [isOpen, data, initialSectionId]);

    // Reset form when switching sections to prevent "data leakage"
    useEffect(() => {
        resetEquipmentForm();
    }, [activeSectionId]);

    const startEditEquipment = (eq: Equipment) => {
        setEditingEquipment(eq);
        setEquipmentForm({ ...eq });
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const tempUrl = URL.createObjectURL(file);
            setEquipmentForm(prev => ({ ...prev, foto: tempUrl, fotoFile: file }));
        }
    };

    const deleteEquipment = (eqId: string) => {
        const updatedSections = sections.map((section: LevantamientoSeccion) => {
            if (section.id === activeSectionId) {
                return { ...section, equipos: section.equipos.filter((e: Equipment) => e.id !== eqId) };
            }
            return section;
        });
        setSections(updatedSections);
    };

    const handleFinalSave = () => {
        onSave(sections);
        onClose();
    };

    const activeSection = sections.find(s => s.id === activeSectionId);

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
                <div className={styles.modalHeader}>
                    <div>
                        <h3 className={styles.modalTitle}>Levantamiento Técnico de Equipo</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Gestiona las áreas y el inventario detallado de la empresa.</p>
                    </div>
                    <button 
                        className={styles.closeButton} 
                        onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            onClose(); 
                        }} 
                        title="Cerrar"
                        type="button"
                    >
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>✕</span>
                    </button>
                </div>

                <div className={styles.modalSplitBody}>
                    {/* SIDEBAR: SECCIONES */}
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <span>ÁREAS / APARTADOS</span>
                             {!isReadOnly && (
                                <button onClick={() => setIsAddingSection(true)} className={styles.miniAddBtn} title="Agregar Área">
                                    <HiOutlinePlus size={16} color="#ffffff" />
                                </button>
                             )}
                        </div>
                        
                        {isAddingSection && (
                            <div className={styles.newSectionInput}>
                                <input 
                                    autoFocus
                                    placeholder="Nombre del área..."
                                    value={newSectionName}
                                    onChange={e => setNewSectionName(e.target.value.toUpperCase())}
                                    onKeyDown={e => e.key === 'Enter' && handleAddSection()}
                                />
                                <div className={styles.inputActions}>
                                    <button onClick={handleAddSection} title="Confirmar"><HiOutlineCheckCircle size={20} color="#10b981" /></button>
                                    <button onClick={() => setIsAddingSection(false)} title="Cancelar"><HiOutlineXMark size={20} color="#ef4444" /></button>
                                </div>
                            </div>
                        )}

                        <div className={styles.sectionsList}>
                            {sections.map((s: LevantamientoSeccion) => (
                                <div 
                                    key={s.id} 
                                    className={`${styles.sectionItem} ${activeSectionId === s.id ? styles.sectionItemActive : ''}`}
                                    onClick={() => {
                                        if (activeSectionId !== s.id) {
                                            setActiveSectionId(s.id);
                                            resetEquipmentForm();
                                        }
                                    }}
                                >
                                    <span className={styles.sectionName}>{s.nombreArea}</span>
                                    <div className={styles.sectionActions}>
                                        {!isReadOnly && (
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSection(s.id, s.nombreArea); }} className={styles.secDeleteBtn} title="Borrar Área">
                                                <HiOutlineTrash size={16} color="#94a3b8" />
                                            </button>
                                        )}
                                        <HiOutlineChevronRight className={styles.chevron} size={14} color="#cbd5e1" />
                                    </div>
                                </div>
                            ))}
                            {sections.length === 0 && !isAddingSection && (
                                <div className={styles.sidebarEmpty}>
                                    <p>No hay áreas creadas.</p>
                                    <button onClick={() => setIsAddingSection(true)}>Crear primera área</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MAIN: EQUIPOS */}
                    <div className={styles.mainContent}>
                        {activeSection ? (
                            <>
                                <div className={styles.contentHeader}>
                                    <h4>Equipos en: <span style={{ color: '#2563eb' }}>{activeSection.nombreArea}</span></h4>
                                    <span className={styles.badge}>{activeSection.equipos.length} equipos</span>
                                </div>

                                {/* LISTA DE EQUIPOS */}
                                <div className={styles.scrollArea}>
                                    {activeSection.equipos.length === 0 ? (
                                        <div className={styles.emptyContent}>
                                            <HiOutlineArchiveBox size={40} />
                                            <p>No hay equipos registrados en esta área.</p>
                                        </div>
                                    ) : (
                                        <div className={styles.gridEquipos}>
                                            {activeSection.equipos.map((eq: Equipment) => (
                                                <div key={eq.id} className={styles.eqCard}>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                        {eq.foto && <img src={eq.foto} alt="Eq" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />}
                                                        <div className={styles.eqInfo}>
                                                            <strong>{eq.nombre}</strong>
                                                            <span>{eq.marca} • {eq.modelo}</span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.eqActions}>
                                                        <button onClick={() => setViewingEquipment(eq)} title="Ver Ficha Técncia"><HiOutlineEye size={18} color="#2563eb" /></button>
                                                        {!isReadOnly && (
                                                            <>
                                                                <button onClick={() => startEditEquipment(eq)} title="Editar"><HiOutlinePencilSquare size={18} color="#64748b" /></button>
                                                                <button onClick={() => deleteEquipment(eq.id!)} className={styles.btnDanger} title="Borrar"><HiOutlineTrash size={18} color="#64748b" /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* FORMULARIO EQUIPO */}
                                {!isReadOnly && (
                                    <div className={styles.eqFormContainer}>
                                    <h5>{editingEquipment ? 'Editar Equipo' : 'Nuevo Equipo'}</h5>
                                    <div className={styles.eqFormGrid}>
                                        <div className={styles.inputGroup}>
                                            <label>Nombre del Equipo</label>
                                            <input 
                                                value={equipmentForm.nombre || ''}
                                                onChange={e => setEquipmentForm({...equipmentForm, nombre: e.target.value.toUpperCase()})}
                                                placeholder="EJ: ESTUFA 4 QUEMADORES"
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Marca</label>
                                            <input 
                                                value={equipmentForm.marca || ''}
                                                onChange={e => setEquipmentForm({...equipmentForm, marca: e.target.value.toUpperCase()})}
                                                placeholder="EJ: CORIAT"
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Modelo</label>
                                            <input 
                                                value={equipmentForm.modelo || ''}
                                                onChange={e => setEquipmentForm({...equipmentForm, modelo: e.target.value.toUpperCase()})}
                                                placeholder="EJ: MASTER 4"
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Número de Serie</label>
                                            <input 
                                                value={equipmentForm.serie || ''}
                                                onChange={e => setEquipmentForm({...equipmentForm, serie: e.target.value.toUpperCase()})}
                                                placeholder="EJ: SN-45892"
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Año Fabricación</label>
                                            <input 
                                                value={equipmentForm.anioFabricacion || ''}
                                                onChange={e => setEquipmentForm({...equipmentForm, anioFabricacion: e.target.value.toUpperCase()})}
                                                placeholder="EJ: 2020"
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Años en uso</label>
                                            <input 
                                                value={equipmentForm.anioUso || ''}
                                                onChange={e => setEquipmentForm({...equipmentForm, anioUso: e.target.value.toUpperCase()})}
                                                placeholder="EJ: 4 AÑOS"
                                            />
                                        </div>
                                        <div className={styles.inputGroup} style={{ gridColumn: 'span 3' }}>
                                            <label>Foto / Evidencia</label>
                                            <div className={styles.photoUploadWrapper}>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    ref={fileInputRef} 
                                                    style={{ display: 'none' }} 
                                                    onChange={handlePhotoChange} 
                                                />
                                                <button className={styles.photoBtn} onClick={() => fileInputRef.current?.click()}>
                                                    {equipmentForm.foto ? <HiOutlinePhoto size={20} color="#475569" /> : <HiOutlineCamera size={20} color="#475569" />}
                                                    {equipmentForm.foto ? 'CAMBIAR FOTO' : 'SUBIR EVIDENCIA'}
                                                </button>
                                                {equipmentForm.foto && (
                                                    <div className={styles.photoPreview}>
                                                        <img src={equipmentForm.foto} alt="Preview" />
                                                        <button onClick={() => setEquipmentForm(prev => ({ ...prev, foto: '', fotoFile: undefined }))} className={styles.removePhoto} title="Quitar">
                                                            <HiOutlineXMark size={18} color="#ffffff" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.formFooter}>
                                        {editingEquipment && <button onClick={resetEquipmentForm} className={styles.btnCancel}>Cancelar</button>}
                                        <button 
                                            onClick={handleAddOrUpdateEquipment} 
                                            className={styles.btnAddEq}
                                            disabled={!equipmentForm.nombre || !equipmentForm.marca}
                                        >
                                            {editingEquipment ? 'Actualizar Equipo' : 'Agregar Equipo'}
                                        </button>
                                    </div>
                                    </div>
                                )}
                            </>
                        ) : (
                             <div className={styles.selectPrompt}>
                                <HiOutlineFolderPlus size={60} color="#cbd5e1" />
                                <h3>SELECCIONA O CREA UN ÁREA</h3>
                                <p>Crea apartados para organizar los equipos de la empresa por zonas.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    {!isReadOnly ? (
                        <button className={styles.primaryBtn} onClick={handleFinalSave}>
                            Guardar Levantamiento Completo
                        </button>
                    ) : (
                        <button className={styles.primaryBtn} onClick={onClose} style={{ background: '#3b82f6' }}>
                            Cerrar Vista
                        </button>
                    )}
                </div>
                <DetalleEquipoModal 
                    isOpen={!!viewingEquipment}
                    onClose={() => setViewingEquipment(null)}
                    equipment={viewingEquipment}
                    onEdit={!isReadOnly ? () => {
                        if (viewingEquipment) {
                            startEditEquipment(viewingEquipment);
                            setViewingEquipment(null);
                        }
                    } : undefined}
                />
            </div>
        </div>
    );
};

export default LevantamientoModal;
