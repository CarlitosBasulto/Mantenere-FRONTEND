import React from 'react';
import styles from './AreaVisualGrid.module.css';
import { HiOutlinePencil, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi2';
import type { LevantamientoSeccion } from '../pages/cliente/PerfilEmpresa';
import { useModal } from '../context/ModalContext';

interface AreaVisualGridProps {
    seccion: LevantamientoSeccion;
    onEditArea: () => void;
    onDeleteArea: () => void;
    onAddSubArea: () => void;
    onViewInventory: (subAreaId: string) => void;
    canEdit: boolean;
}

const AreaVisualGrid: React.FC<AreaVisualGridProps> = ({
    seccion,
    onEditArea,
    onDeleteArea,
    onAddSubArea,
    onViewInventory,
    canEdit
}) => {
    const subAreas = seccion.subAreas && seccion.subAreas.length > 0 
        ? seccion.subAreas 
        : [{ id: `sub_gen_${seccion.id}`, nombreSubArea: 'GENERAL', equipos: seccion.equipos || [] }];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h2 className={styles.areaName}>{seccion.nombreArea}</h2>
                    {canEdit && (
                        <>
                            <button className={styles.iconBtn} onClick={onEditArea} title="Editar Nombre">
                                <HiOutlinePencil size={18} />
                            </button>
                            <button className={styles.iconBtn} onClick={onDeleteArea} title="Eliminar Área">
                                <HiOutlineTrash size={18} />
                            </button>
                        </>
                    )}
                </div>
                <div className={styles.headerRight}>
                    {subAreas.length} {subAreas.length === 1 ? 'ÁREA' : 'ÁREAS'}
                </div>
            </div>

            <div className={styles.gridContainer}>
                {subAreas.map((sub) => {
                    // Try to find a representative image for the sub-area from its equipment
                    const equipmentWithPhoto = sub.equipos.find(e => e.foto && e.foto.startsWith('http'));
                    const bgImage = equipmentWithPhoto ? equipmentWithPhoto.foto : null;
                    const inventoryCount = sub.equipos.length;

                    return (
                        <div key={sub.id} className={styles.card} onClick={() => onViewInventory(sub.id)}>
                            {bgImage ? (
                                <img src={bgImage} alt={sub.nombreSubArea} className={styles.cardBg} />
                            ) : (
                                <div className={styles.cardBg} style={{ backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#334155', fontSize: '48px', fontWeight: '900' }}>AS</span>
                                </div>
                            )}
                            <div className={styles.cardOverlay} />
                            <div className={styles.cardContent}>
                                <h3 className={styles.subAreaName}>{sub.nombreSubArea}</h3>
                                <button 
                                    className={styles.inventoryBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onViewInventory(sub.id);
                                    }}
                                >
                                    VER INVENTARIO ({inventoryCount})
                                </button>
                            </div>
                        </div>
                    );
                })}

                {canEdit && (
                    <div className={styles.addCard} onClick={onAddSubArea}>
                        <div className={styles.addIcon}><HiOutlinePlus /></div>
                        <div className={styles.addText}>AÑADIR ESPACIO</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AreaVisualGrid;
