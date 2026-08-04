import React, { useState, useEffect } from 'react';
import styles from './DetalleEquipoModal.module.css';
import { 
    HiOutlinePencilSquare,
    HiOutlineCalendarDays,
    HiOutlineHashtag,
    HiOutlineClock,
    HiOutlineTag,
    HiOutlineArrowLeft,
    HiOutlineArrowRight
} from "react-icons/hi2";
import type { Equipment } from '../pages/cliente/PerfilEmpresa';

interface DetalleEquipoModalProps {
    isOpen: boolean;
    onClose: () => void;
    equipment: Equipment | Equipment[] | null;
    onEdit?: () => void;
    onVerHistorial?: () => void;
}

const DetalleEquipoModal: React.FC<DetalleEquipoModalProps> = ({ isOpen, onClose, equipment, onEdit, onVerHistorial }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const equipmentList = React.useMemo(() => {
        if (!equipment) return [];
        return Array.isArray(equipment) ? equipment : [equipment];
    }, [equipment]);

    useEffect(() => {
        if (isOpen && equipmentList.length > 0) {
            document.body.style.overflow = 'hidden';
            setCurrentIndex(0); // Reset index when opened
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, equipmentList.length]);

    const [fotoError, setFotoError] = useState(false);
    const [placaError, setPlacaError] = useState(false);

    useEffect(() => {
        setFotoError(false);
        setPlacaError(false);
    }, [currentIndex, equipmentList]);

    if (!isOpen || equipmentList.length === 0) return null;

    const currentEq = equipmentList[currentIndex];

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.headerInfo}>
                        <div className={styles.categoryBadge}>DETALLE TÉCNICO</div>
                        <h3 className={styles.modalTitle}>{currentEq.nombre}</h3>
                        <span className={styles.brandSubtitle}>{currentEq.marca} • {currentEq.modelo}</span>
                    </div>
                    <button className={styles.closeButton} onClick={onClose} title="Cerrar">
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'inherit' }}>✕</span>
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* PHOTO SECTION */}
                    <div className={styles.photosGrid}>
                        <div className={styles.photoContainer}>
                            <span className={styles.photoLabel}>VISTA GENERAL</span>
                            {currentEq.foto && !fotoError ? (
                                <img 
                                    src={currentEq.foto} 
                                    alt={currentEq.nombre} 
                                    className={styles.mainPhoto} 
                                    onError={() => setFotoError(true)}
                                />
                            ) : (
                                <div className={styles.noPhoto}>
                                    <span>Sin foto de evidencia</span>
                                </div>
                            )}
                        </div>

                        <div className={styles.photoContainer}>
                            <span className={styles.photoLabel}>PLACA DE DATOS</span>
                            {currentEq.fotoPlaca && !placaError ? (
                                <img 
                                    src={currentEq.fotoPlaca} 
                                    alt="Placa" 
                                    className={styles.mainPhoto} 
                                    onError={() => setPlacaError(true)}
                                />
                            ) : (
                                <div className={styles.noPhoto}>
                                    <span>Sin foto de placa</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DATA GRID */}
                    <div className={styles.dataGrid}>
                        {currentEq.categoria && (
                            <div className={styles.dataItem}>
                                <div className={styles.iconWrapper}><HiOutlineTag size={18} /></div>
                                <div className={styles.dataLabel}>Categoría</div>
                                <div className={styles.dataValue}>{currentEq.categoria.nombre}</div>
                            </div>
                        )}

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineTag size={18} /></div>
                            <div className={styles.dataLabel}>Marca / Modelo</div>
                            <div className={styles.dataValue}>{currentEq.marca} - {currentEq.modelo}</div>
                        </div>

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineHashtag size={18} /></div>
                            <div className={styles.dataLabel}>Número de Serie</div>
                            <div className={styles.dataValue}>{currentEq.serie || 'N/A'}</div>
                        </div>

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineCalendarDays size={18} /></div>
                            <div className={styles.dataLabel}>Año Fabricación</div>
                            <div className={styles.dataValue}>{currentEq.anioFabricacion || 'N/A'}</div>
                        </div>

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineClock size={18} /></div>
                            <div className={styles.dataLabel}>Tiempo en Uso</div>
                            <div className={styles.dataValue}>{currentEq.anioUso || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                {equipmentList.length > 1 && (
                    <div className={styles.carouselControls}>
                        <button 
                            className={styles.carouselBtn} 
                            onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : equipmentList.length - 1)}
                        >
                            <HiOutlineArrowLeft size={16} /> ANTERIOR
                        </button>
                        <span className={styles.carouselIndicator}>
                            EQUIPO {currentIndex + 1} DE {equipmentList.length}
                        </span>
                        <button 
                            className={styles.carouselBtn} 
                            onClick={() => setCurrentIndex(prev => prev < equipmentList.length - 1 ? prev + 1 : 0)}
                        >
                            SIGUIENTE <HiOutlineArrowRight size={16} />
                        </button>
                    </div>
                )}

                <div className={styles.modalFooter}>
                    {onEdit && (
                        <button className={styles.editBtn} onClick={() => { onEdit(); onClose(); }}>
                            <HiOutlinePencilSquare size={18} /> EDITAR INFORMACIÓN
                        </button>
                    )}

                    <button className={styles.closeBtn} onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DetalleEquipoModal;
