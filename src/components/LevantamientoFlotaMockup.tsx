import React, { useState } from 'react';
import styles from './LevantamientoFlotaMockup.module.css';
import { HiOutlinePlus, HiOutlineTruck, HiOutlineCamera, HiOutlineTrash } from 'react-icons/hi2';

const LevantamientoFlotaMockup: React.FC = () => {
    const [activeArea, setActiveArea] = useState<string>('motor');

    const maintenanceAreas = [
        { id: 'motor', label: 'Motor' },
        { id: 'transmision', label: 'Transmisión' },
        { id: 'suspension', label: 'Suspensión/Frenos' },
        { id: 'electrico', label: 'Eléctrico/Interiores' },
        { id: 'equipo', label: 'Equipo Adicional' },
    ];

    return (
        <div className={styles.mockupContainer}>
            {/* WATERMARK */}
            <div className={styles.watermarkOverlay}>
                <span className={styles.watermarkText}>PRÓXIMAMENTE</span>
            </div>

            {/* SECCIÓN 1: ROLES ASIGNADOS */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Roles del Vehículo</h2>
                <div className={styles.grid3}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Admin de Taller</label>
                        <select className={styles.select}>
                            <option>Juan Pérez</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Operador Vehicular</label>
                        <select className={styles.select}>
                            <option>Luis Martínez</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Mecánico Asignado</label>
                        <select className={styles.select}>
                            <option>Taller Externo ABC (Proveedor)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: LOGÍSTICA */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Estado de Logística</h2>
                <div className={styles.logisticsCard}>
                    <div className={styles.logisticsIcon}>
                        <HiOutlineTruck />
                    </div>
                    <div className={styles.logisticsInfo}>
                        <h4>Mantenimiento Programado</h4>
                        <p>El operador envió su ubicación. Logística ha programado el servicio para el próximo Lunes a las 09:00 AM.</p>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 3: REGISTRO DE LLANTAS */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Números de Serie de Llantas</h2>
                <div className={styles.grid3}>
                    {[1, 2, 3, 4, 5].map((num) => (
                        <div key={num} className={styles.formGroup}>
                            <label className={styles.label}>Llanta {num}</label>
                            <input type="text" className={styles.input} placeholder={`Serie Llanta ${num}`} value={`SERIE-${num}X99`} />
                        </div>
                    ))}
                    <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
                        <button className={styles.addBtn}>
                            <HiOutlinePlus /> Agregar más
                        </button>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 4: MANTENIMIENTO Y COLISIÓN */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Áreas de Mantenimiento</h2>
                
                {/* Tabs de Áreas */}
                <div className={styles.areaTabs}>
                    {maintenanceAreas.map(area => (
                        <div 
                            key={area.id} 
                            className={`${styles.areaTab} ${activeArea === area.id ? styles.areaTabActive : ''}`}
                            onClick={() => setActiveArea(area.id)}
                        >
                            {area.label}
                        </div>
                    ))}
                    <div 
                        className={`${styles.areaTab} ${styles.areaTabCollision} ${activeArea === 'colision' ? styles.areaTabActive : ''}`}
                        onClick={() => setActiveArea('colision')}
                    >
                        Colisión
                    </div>
                </div>

                {/* Contenido Dinámico según área */}
                {activeArea === 'colision' ? (
                    <div className={styles.collisionBox}>
                        <div className={styles.grid2}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Reporte de piezas dañadas</label>
                                <textarea className={styles.textarea} placeholder="Ej: Fascia delantera rota, faro izquierdo estrellado..."></textarea>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Reporte de piezas nuevas</label>
                                <textarea className={styles.textarea} placeholder="Ej: Reemplazo de fascia original, faro LED nuevo..."></textarea>
                            </div>
                        </div>
                        <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                            <label className={styles.label}>Historial de Colisiones (Registros previos)</label>
                            <div className={styles.input} style={{ minHeight: '60px', opacity: 0.6 }}>No hay colisiones anteriores registradas.</div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.grid2}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Características / Explicación del Trabajo</label>
                            <textarea className={styles.textarea} placeholder="Describe el mantenimiento realizado en esta área..."></textarea>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Evidencia de Kilometraje</label>
                            <div className={`${styles.photoUploadBox} ${styles.required}`}>
                                <HiOutlineCamera size={32} />
                                <span>Tomar foto con el carro abierto (Requerido)</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SECCIÓN 5: BAJA DEL VEHÍCULO */}
            <div className={styles.section} style={{ marginBottom: 0, marginTop: '40px', borderTop: '2px dashed #f1f5f9', paddingTop: '20px' }}>
                <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                    <button className={styles.dangerBtn}>
                        <HiOutlineTrash /> Vender / Dar de baja
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px' }}>
                        Toda la información se guardará en el archivo histórico y el vehículo se eliminará de la base activa.
                    </p>
                </div>
            </div>

        </div>
    );
};

export default LevantamientoFlotaMockup;
