import React from 'react';
import styles from './DetalleEquipoModal.module.css';
import { 
    HiOutlineXMark, 
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
}

const DetalleEquipoModal: React.FC<DetalleEquipoModalProps> = ({ isOpen, onClose, equipment, onEdit }) => {
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
                    <button className={styles.closeButton} onClick={onClose}>
                        <HiOutlineXMark size={22} color="#1e293b" />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* PHOTO SECTION */}
                    <div className={styles.photoContainer}>
                        {equipment.foto ? (
                            <img src={equipment.foto} alt={equipment.nombre} className={styles.mainPhoto} />
                        ) : (
                            <div className={styles.noPhoto}>
                                <span>Sin foto de evidencia</span>
                            </div>
                        )}
                    </div>

                    {/* DATA GRID */}
                    <div className={styles.dataGrid}>
                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineTag size={18} color="#3b82f6" /></div>
                            <div className={styles.dataLabel}>Marca / Modelo</div>
                            <div className={styles.dataValue}>{equipment.marca} - {equipment.modelo}</div>
                        </div>

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineHashtag size={18} color="#3b82f6" /></div>
                            <div className={styles.dataLabel}>Número de Serie</div>
                            <div className={styles.dataValue}>{equipment.serie || 'N/A'}</div>
                        </div>

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineCalendarDays size={18} color="#3b82f6" /></div>
                            <div className={styles.dataLabel}>Año Fabricación</div>
                            <div className={styles.dataValue}>{equipment.anioFabricacion || 'N/A'}</div>
                        </div>

                        <div className={styles.dataItem}>
                            <div className={styles.iconWrapper}><HiOutlineClock size={18} color="#3b82f6" /></div>
                            <div className={styles.dataLabel}>Tiempo en Uso</div>
                            <div className={styles.dataValue}>{equipment.anioUso || 'N/A'}</div>
                        </div>
                    </div>
                </div>

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
