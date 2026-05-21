import React, { useState, useEffect } from 'react';
import styles from './EquipoAdminDrawer.module.css';
import {
    HiOutlineXMark,
    HiOutlinePencilSquare,
    HiOutlineCheck,
    HiOutlineClipboardDocumentList,
    HiOutlineWrenchScrewdriver,
    HiOutlineCheckCircle,
    HiOutlineCalendarDays,
    HiOutlineTag
} from 'react-icons/hi2';
import ReporteDetailModal from '../modals/ReporteDetailModal';
import { categoriasService } from '../../services/categoriasService';
import type { CategoriaEquipo } from '../../services/categoriasService';
import { updateEquipo, getEquipoHistorial } from '../../services/negociosService';
import type { AdminEquipment } from '../../types/adminEquipment';
import { getConsumoReporte } from '../../services/mantenimientoService';

interface EquipoAdminDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    equipment: AdminEquipment | null;
    onSaved: () => void;
}

type DrawerTab = 'info' | 'bitacora';

const EquipoAdminDrawer: React.FC<EquipoAdminDrawerProps> = ({ isOpen, onClose, equipment, onSaved }) => {
    const [activeTab, setActiveTab] = useState<DrawerTab>('info');
    const [categorias, setCategorias] = useState<CategoriaEquipo[]>([]);
    const [historial, setHistorial] = useState<any[]>([]);
    const [refaccionesBitacora, setRefaccionesBitacora] = useState<any[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);

    // Modal state for full report details
    const [selectedReportForModal, setSelectedReportForModal] = useState<any>(null);
    const [savedOk, setSavedOk] = useState(false);

    // Form state for Info tab
    const [form, setForm] = useState({
        nombre: '',
        marca: '',
        modelo: '',
        serie: '',
        anioFabricacion: '',
        anioUso: '',
        categoria_id: '' as string | number,
    });

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Initialize form when equipment changes
    useEffect(() => {
        if (equipment) {
            setForm({
                nombre: equipment.nombre || '',
                marca: equipment.marca || '',
                modelo: equipment.modelo || '',
                serie: equipment.serie || '',
                anioFabricacion: equipment.anioFabricacion || '',
                anioUso: equipment.anioUso || '',
                categoria_id: equipment.categoria_id ?? '',
            });
            setActiveTab('info');
            setSavedOk(false);
            setHistorial([]);
            setRefaccionesBitacora([]);
        }
    }, [equipment]);


    useEffect(() => {
        categoriasService.getCategorias().then(setCategorias).catch(console.error);
    }, []);

    // Load bitácora when tab changes: solicitudes linked by equipo_id + consumo records
    useEffect(() => {
        if (activeTab === 'bitacora' && equipment?.id) {
            setLoadingHistorial(true);
            Promise.all([
                getEquipoHistorial(equipment.id).catch(() => ({ solicitudes: [] })),
                getConsumoReporte().catch(() => [])
            ]).then(([histData, allConsumos]) => {
                setHistorial((histData as any).solicitudes || []);
                setRefaccionesBitacora((allConsumos as any[]).filter(c => c.equipo_id === equipment.id || c.equipo?.id === equipment.id));
            }).finally(() => setLoadingHistorial(false));
        }
    }, [activeTab, equipment]);



    const handleSaveInfo = async () => {
        if (!equipment) return;
        setSavingInfo(true);
        try {
            await updateEquipo(equipment.id, {
                nombre: form.nombre.toUpperCase(),
                marca: form.marca.toUpperCase(),
                modelo: form.modelo.toUpperCase(),
                serie: form.serie || undefined,
                anioFabricacion: form.anioFabricacion || undefined,
                anioUso: form.anioUso || undefined,
                categoria_id: form.categoria_id !== '' ? Number(form.categoria_id) : null,
            });
            setSavedOk(true);
            onSaved();
            setTimeout(() => setSavedOk(false), 3000);
        } catch (err) {
            console.error(err);
            alert('Error al guardar los cambios. Inténtalo de nuevo.');
        } finally {
            setSavingInfo(false);
        }
    };

    if (!isOpen || !equipment) return null;

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
                {/* Header */}
                <div className={styles.drawerHeader}>
                    <div className={styles.headerEquipoInfo}>
                        {equipment.foto ? (
                            <img src={equipment.foto} alt="" className={styles.headerThumb} />
                        ) : (
                            <div className={styles.headerNoThumb}>⚙️</div>
                        )}
                        <div>
                            <div className={styles.headerLocation}>{equipment.sucursalNombre} · {equipment.areaNombre}</div>
                            <h2 className={styles.headerTitle}>{equipment.nombre}</h2>
                            <div className={styles.headerSub}>{equipment.marca} {equipment.modelo}</div>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} title="Cerrar">
                        <HiOutlineXMark size={22} />
                    </button>
                </div>

                {/* Tabs — only 2 */}
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab === 'info' ? styles.tabActive : ''}`} onClick={() => setActiveTab('info')}>
                        <HiOutlinePencilSquare size={16} /> Información
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'bitacora' ? styles.tabActive : ''}`} onClick={() => setActiveTab('bitacora')}>
                        <HiOutlineClipboardDocumentList size={16} /> Bitácora
                    </button>
                </div>

                {/* Body */}
                <div className={styles.drawerBody}>

                    {/* ─── TAB INFO ─── */}
                    {activeTab === 'info' && (
                        <div className={styles.infoSection}>


                            <div className={styles.sectionTitle} style={{ marginTop: '24px' }}>
                                <HiOutlineWrenchScrewdriver size={18} color="#3b82f6" />
                                Datos del Equipo
                            </div>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>Nombre del Equipo</label>
                                    <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value.toUpperCase() }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Marca</label>
                                    <input value={form.marca} onChange={e => setForm(p => ({ ...p, marca: e.target.value.toUpperCase() }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Modelo</label>
                                    <input value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value.toUpperCase() }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Número de Serie</label>
                                    <input value={form.serie} onChange={e => setForm(p => ({ ...p, serie: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Año Fabricación</label>
                                    <input value={form.anioFabricacion} onChange={e => setForm(p => ({ ...p, anioFabricacion: e.target.value }))} placeholder="Ej: 2018" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Años en Uso</label>
                                    <input value={form.anioUso} onChange={e => setForm(p => ({ ...p, anioUso: e.target.value }))} placeholder="Ej: 6" />
                                </div>
                            </div>

                            <div className={styles.sectionTitle}>
                                <HiOutlineTag size={18} color="#3b82f6" />
                                Categoría del Equipo
                            </div>
                            <div className={styles.formGroup}>
                                <label>Selecciona una categoría (opcional)</label>
                                <select 
                                    value={form.categoria_id} 
                                    onChange={e => setForm(p => ({ ...p, categoria_id: e.target.value }))}
                                >
                                    <option value="">-- Sin categoría --</option>
                                    {categorias.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {savedOk && (
                                <div className={styles.successBanner}>
                                    <HiOutlineCheckCircle size={20} /> Cambios guardados correctamente
                                </div>
                            )}

                            <button
                                className={styles.saveBtn}
                                onClick={handleSaveInfo}
                                disabled={savingInfo}
                            >
                                {savingInfo ? 'Guardando...' : (<><HiOutlineCheck size={18} /> Guardar Cambios</>)}
                            </button>
                        </div>
                    )}

                    {/* ─── TAB BITÁCORA ─── */}
                    {activeTab === 'bitacora' && (
                        <div className={styles.bitacoraSection}>

                            {loadingHistorial ? (
                                <div className={styles.loadingState}>
                                    <div className={styles.spinner} />
                                    <p>Cargando bitácora...</p>
                                </div>
                            ) : (historial.length === 0 && refaccionesBitacora.length === 0) ? (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyIcon}>📋</div>
                                    <p>No hay actividad registrada para este equipo.</p>
                                    <span>Los reportes de mantenimiento y refacciones vinculadas a este equipo aparecerán aquí.</span>
                                </div>
                            ) : (
                                <div className={styles.bitacoraList}>

                                    {/* Solicitudes de mantenimiento vinculadas */}
                                    {historial.map((sol: any) => {
                                        const reporte = sol.reporte || sol.actividad_reporte || sol.visitaTrabajo?.reporte || sol.reparacionTrabajo?.reporte;

                                        return (
                                            <div key={`sol-${sol.id}`} className={styles.bitacoraCard}>
                                                <div className={styles.bitacoraCardHeader}>
                                                    <div className={styles.bitacoraDate}>
                                                        <HiOutlineCalendarDays size={16} color="#94a3b8" />
                                                        {new Date(sol.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    <span className={`${styles.estadoBadge} ${sol.estado?.includes('Final') ? styles.estadoFinalizado : styles.estadoPendiente}`}>
                                                        {sol.estado}
                                                    </span>
                                                </div>
                                                <p className={styles.bitacoraProblema}>"{sol.descripcion_problema}"</p>
                                                <button 
                                                    className={styles.toggleBtn} 
                                                    onClick={() => {
                                                        const isReparacion = sol.estado?.includes('Reparación') || sol.estado?.includes('Final');
                                                        setSelectedReportForModal({
                                                            trabajo_id: isReparacion ? sol.reparacion_trabajo_id : sol.visita_trabajo_id,
                                                            tecnico: isReparacion ? sol.reparacionTrabajo?.trabajador?.nombre : sol.visitaTrabajo?.trabajador?.nombre,
                                                            solicitud_id: sol.id,
                                                            titulo: `Mantenimiento (${isReparacion ? 'Reparación' : 'Visita'}): ${equipment?.nombre}`,
                                                            fecha: new Date(sol.created_at).toLocaleDateString(),
                                                            reporte: reporte
                                                        });
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                                                >
                                                    <HiOutlineClipboardDocumentList size={18} />
                                                    Ver detalles completos del reporte
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {/* Refacciones/consumos registrados directamente */}
                                    {refaccionesBitacora.length > 0 && (
                                        <div className={styles.refaccionesHistorialSection}>
                                            <div className={styles.sectionTitle} style={{ marginBottom: '12px' }}>
                                                <span style={{ fontSize: '13px' }}>🔩 Refacciones & Consumos Registrados</span>
                                            </div>
                                            {refaccionesBitacora.map((con: any) => (
                                                <div key={`con-${con.id}`} className={styles.consumoRow} style={{ flexWrap: 'wrap' }}>
                                                    <div className={styles.consumoRowLeft} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span className={styles.consumoPieza}>{con.pieza}</span>
                                                        <span className={styles.consumoQty}>×{con.cantidad}</span>
                                                    </div>
                                                    <div className={styles.consumoRowLeft} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span className={styles.consumoFecha}>
                                                            {new Date(con.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            {con.actividad?.trabajador?.nombre && ` · ${con.actividad.trabajador.nombre}`}
                                                        </span>
                                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                            {con.costo_estimado && (
                                                                <span className={styles.consumoCosto}>${Number(con.costo_estimado).toFixed(2)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {selectedReportForModal && (
                <ReporteDetailModal
                    isOpen={!!selectedReportForModal}
                    onClose={() => setSelectedReportForModal(null)}
                    trabajo={{
                        id: selectedReportForModal.trabajo_id,
                        sucursal: equipment?.sucursalNombre || 'N/A',
                        tecnico: selectedReportForModal.tecnico || 'N/A',
                        encargado: 'N/A'
                    }}
                    task={{
                        id: selectedReportForModal.solicitud_id,
                        titulo: selectedReportForModal.titulo,
                        fecha: selectedReportForModal.fecha
                    }}
                    reporte={selectedReportForModal.reporte}
                />
            )}
        </>
    );
};

export default EquipoAdminDrawer;
