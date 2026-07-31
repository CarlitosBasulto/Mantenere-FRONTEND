import React from 'react';
import styles from './DetalleEquipoModal.module.css';
import { 
    HiOutlinePencilSquare,
    HiOutlineCalendarDays,
    HiOutlineHashtag,
    HiOutlineClock,
    HiOutlineTag
} from "react-icons/hi2";
import type { Equipment } from '../pages/cliente/PerfilEmpresa';

interface DetalleEquipoModalProps {
    isOpen: boolean;
    onClose: () => void;
    equipment: Equipment | null;
    onEdit?: () => void;
    onVerHistorial?: () => void;
}

const DetalleEquipoModal: React.FC<DetalleEquipoModalProps> = ({ isOpen, onClose, equipment, onEdit, onVerHistorial }) => {
    React.useEffect(() => {
        if (isOpen && equipment) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, equipment]);

    const [fotoError, setFotoError] = React.useState(false);
    const [placaError, setPlacaError] = React.useState(false);

    React.useEffect(() => {
        setFotoError(false);
        setPlacaError(false);
    }, [equipment]);

    if (!isOpen || !equipment) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.headerInfo}>
                        <div className={styles.categoryBadge}>DETALLE TÉCNICO</div>
                        <h3 className={styles.modalTitle}>{equipment.nombre}</h3>
                        <span className={styles.brandSubtitle}>{equipment.marca} • {equipment.modelo}</span>
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
                            {equipment.foto && !fotoError ? (
                                <img 
                                    src={equipment.foto} 
                                    alt={equipment.nombre} 
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
                            {equipment.fotoPlaca && !placaError ? (
                                <img 
                                    src={equipment.fotoPlaca} 
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
                        {equipment.categoria && (
                            <div className={styles.dataItem}>
                                <div className={styles.iconWrapper}><HiOutlineTag size={18} /></div>
                                <div className={styles.dataLabel}>Categoría</div>
                                <div className={styles.dataValue}>{equipment.categoria.nombre}</div>
                            </div>
                        )}

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineTag size={18} /></div>
                            <div className={styles.dataLabel}>Marca / Modelo</div>
                            <div className={styles.dataValue}>{equipment.marca} - {equipment.modelo}</div>
                        </div>

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineHashtag size={18} /></div>
                            <div className={styles.dataLabel}>Número de Serie</div>
                            <div className={styles.dataValue}>{equipment.serie || 'N/A'}</div>
                        </div>

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineCalendarDays size={18} /></div>
                            <div className={styles.dataLabel}>Año Fabricación</div>
                            <div className={styles.dataValue}>{equipment.anioFabricacion || 'N/A'}</div>
                        </div>

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineClock size={18} /></div>
                            <div className={styles.dataLabel}>Tiempo en Uso</div>
                            <div className={styles.dataValue}>{equipment.anioUso || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    {onVerHistorial && (
                        <button className={styles.historyBtn} onClick={() => { onClose(); onVerHistorial(); }}>
                            📂 Ver Historial
                        </button>
                    )}

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
