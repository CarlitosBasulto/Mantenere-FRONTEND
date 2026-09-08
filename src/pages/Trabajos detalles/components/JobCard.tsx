import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlinePencil, HiOutlineTrash, HiOutlineChevronRight } from 'react-icons/hi2';
import { isCardSeen, markCardAsSeen } from '../../../utils/seenCards';
import { isAutonomoAdmin } from '../../../utils/roles';
import type { Trabajo } from '../../../types/trabajo.types';

interface JobCardProps {
    trabajo: Trabajo;
    index: number;
    user: any;
    activeSlide: number;
    onSlideChange: (trabajoId: string, newSlide: number) => void;
    onZoomImage: (url: string) => void;
    onEdit: (e: React.MouseEvent, job: Trabajo) => void;
    onDelete: (e: React.MouseEvent, job: Trabajo) => void;
    onAceptarCotizacion: (jobId: number) => void;
    onRechazarCotizacion: (jobId: number) => void;
    parseFotoUrls: (url: any) => string[];
    styles: Record<string, string>;
}

// ─── Helpers de estado/color ────────────────────────────────────────────────

const getBarClass = (job: Trabajo, userRole: string, styles: Record<string, string>): string => {
    const status = (job.estado || '').toLowerCase();
    if (status === 'cancelado') return styles.red;
    if (status === 'finalizado') return styles.green;
    if (status === 'rechazado por técnico' || status === 'rechazado por tecnico') return styles.red;
    if (job.tipo === 'SOS') return styles.red;
    if (status.includes('cotizaci')) {
        if (status.includes('aceptada') || status.includes('aprobada')) return styles.green;
        if (status.includes('rechazada')) return styles.red;
        if (status.includes('enviada')) return styles.blue;
        return styles.orange;
    }
    if (status === 'en espera') {
        const hasTech = job.tecnico && job.tecnico !== 'Sin asignar' && job.tecnico !== 'Sin Asignar';
        return hasTech ? styles.orange : styles.yellow;
    }
    if (status === 'en proceso') return styles.blue;
    if (status === 'solicitud' || status === 'pendiente' || status === 'asignado') {
        const hasTech = job.tecnico && job.tecnico !== 'Sin asignar' && job.tecnico !== 'Sin Asignar';
        return hasTech ? styles.orange : styles.yellow;
    }
    if (status === 'visita asignada' || status === 'reparación asignada' || status === 'reparacion asignada') return styles.orange;
    if (status === 'diagnosticado') return styles.blue;
    if (job.tecnico && job.tecnico !== 'Sin asignar' && job.tecnico !== 'Sin Asignar') {
        return userRole === 'tecnico' ? styles.orange : styles.blue;
    }
    return styles.yellow;
};

const getStatusText = (job: Trabajo, userRole: string): string => {
    const status = (job.estado || '').toLowerCase();
    if (status === 'cancelado') return 'SOLICITUD CANCELADA';
    if (status === 'finalizado') return 'Finalizado';
    if (status === 'rechazado por técnico' || status === 'rechazado por tecnico')
        return userRole === 'tecnico' ? 'RECHAZASTE ESTA ASIGNACIÓN' : 'RECHAZADO POR TÉCNICO';
    if (job.tipo === 'SOS') return '¡ALERTA SOS!';
    if (status.includes('cotizaci')) {
        if (status.includes('aceptada') || status.includes('aprobada')) return 'COTIZACIÓN ACEPTADA';
        if (status.includes('rechazada')) return 'COTIZACIÓN RECHAZADA';
        if (status.includes('enviada')) return 'COTIZACIÓN ENVIADA';
        return 'PROCESO DE COTIZACIÓN';
    }
    if (status === 'en espera') {
        const hasTech = job.tecnico && job.tecnico !== 'Sin asignar' && job.tecnico !== 'Sin Asignar';
        return hasTech ? 'TÉCNICO EN CAMINO' : 'EN ESPERA DE ASIGNACIÓN';
    }
    if (status === 'en proceso') return 'TÉCNICO ACEPTADO';
    if (status === 'visita asignada') return 'VISITA TÉCNICA ASIGNADA';
    if (status === 'diagnosticado') return 'EN PROCESO DE DIAGNÓSTICO';
    if (status === 'reparación asignada' || status === 'reparacion asignada') return 'REPARACIÓN FINAL ASIGNADA';
    if (status === 'solicitud' || status === 'pendiente' || status === 'asignado') {
        const hasTech = job.tecnico && job.tecnico !== 'Sin asignar' && job.tecnico !== 'Sin Asignar';
        return hasTech ? 'SOLICITUD POR ACEPTAR' : 'SOLICITUD';
    }
    if (job.tecnico && job.tecnico !== 'Sin asignar' && job.tecnico !== 'Sin Asignar') {
        return userRole === 'tecnico'
            ? (job.tipo === 'Visita' ? 'ASIGNACIÓN DE VISITA' : 'SE TE ASIGNÓ ESTE TRABAJO 🛠️')
            : 'TÉCNICO ASIGNADO';
    }
    return job.estado || 'Pendiente';
};

const getAccentForStatus = (estado: string) => {
    if (['Solicitud', 'Pendiente'].includes(estado))
        return { grad: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', shadow: 'rgba(245,158,11,0.35)', dot: '🟡' };
    if (['Cotización Enviada', 'Cotización Aceptada'].includes(estado))
        return { grad: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', shadow: 'rgba(59,130,246,0.35)', dot: '🔵' };
    if (['Aceptada', 'Asignado', 'En Espera'].includes(estado))
        return { grad: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.35)', dot: '🟠' };
    if (estado === 'En Proceso')
        return { grad: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16,185,129,0.35)', dot: '🟢' };
    if (['Finalizado', 'Completado'].includes(estado))
        return { grad: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', shadow: 'rgba(139,92,246,0.35)', dot: '🟣' };
    return { grad: 'linear-gradient(135deg, #64748b 0%, #475569 100%)', shadow: 'rgba(100,116,139,0.35)', dot: '⚪' };
};

// ─── Componente principal ────────────────────────────────────────────────────

const JobCard: React.FC<JobCardProps> = ({
    trabajo,
    index,
    user,
    activeSlide,
    onSlideChange,
    onZoomImage,
    onEdit,
    onDelete,
    onAceptarCotizacion,
    onRechazarCotizacion,
    parseFotoUrls,
    styles,
}) => {
    const navigate = useNavigate();
    const userRole = user?.role || 'user';

    const seenAccent = getAccentForStatus(trabajo.estado);
    const barClass = getBarClass(trabajo, userRole, styles);
    const statusText = getStatusText(trabajo, userRole);

    const items = (trabajo as any).jobsInGroup || [trabajo];
    const currentItem = items[activeSlide] || items[0] || trabajo;
    const currentPhotos = parseFotoUrls(currentItem.foto_url);

    const getBasePath = (): string => {
        if (userRole === 'tecnico') return '/tecnico';
        if (userRole === 'cliente') return '/cliente';
        if (isAutonomoAdmin(user?.role)) return '/autonomo';
        if (userRole === 'encargado' || userRole === 'gerente-sucursal') return '/gerente-sucursal';
        return '/menu';
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        markCardAsSeen(userRole, trabajo.id, trabajo.estado);
        const basePath = getBasePath();
        if ((trabajo as any).isMantenimiento) {
            navigate(`${basePath}/mantenimiento-detalle/${(trabajo as any).original_id}`);
        } else {
            navigate(`${basePath}/trabajo-detalle/${currentItem.id}`);
        }
    };

    // Badge de prioridad
    const renderPriorityBadge = (extraClass?: string) => {
        let text = (trabajo as any).prioridad || 'Media';
        let badgeClass = styles.badgeMedia;
        if (trabajo.estado === 'Finalizado') { text = 'Finalizado'; badgeClass = styles.badgeFinalizado; }
        else if (trabajo.estado === 'En Proceso') { text = 'En proceso'; badgeClass = styles.badgeEnProceso; }
        else if ((trabajo as any).prioridad === 'Alta' || trabajo.tipo === 'SOS' || trabajo.isEmergency) { text = 'Alta'; badgeClass = styles.badgeAlta; }
        else if ((trabajo as any).prioridad === 'Baja') { text = 'Baja'; badgeClass = styles.badgeBaja; }
        return (
            <span className={`${styles.statusPriorityBadge} ${badgeClass} ${extraClass || ''}`}>{text}</span>
        );
    };

    return (
        <div
            className={`${styles.jobCard} ${barClass}`}
            style={{ '--index': index } as React.CSSProperties}
            onClick={handleCardClick}
        >
            {/* Barra de estado */}
            <div className={`${styles.statusBar} ${barClass}`}>{statusText}</div>

            {/* Badge "DIAGNÓSTICO LISTO" */}
            {!!trabajo.visitado && (trabajo.estado === 'Solicitud' || trabajo.estado === 'En Espera') && (
                <div style={{
                    position: 'absolute', right: '-10px', top: '10px', background: '#00a699', color: 'white',
                    padding: '6px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: '900',
                    textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(0, 166, 153, 0.4)', zIndex: 20, letterSpacing: '0.5px'
                }}>
                    DIAGNÓSTICO LISTO
                </div>
            )}

            {trabajo.visitado && trabajo.estado === 'Solicitud' && (
                <div className={styles.diagnosisBanner}>
                    <div className={styles.diagnosisIconWrapper}>🛡️</div>
                    <div className={styles.diagnosisTextGroup}>
                        <p className={styles.diagnosisTitle}>AVISO DE DIAGNÓSTICO</p>
                        <p className={styles.diagnosisText}>Diagnóstico listo para ser revisado.</p>
                    </div>
                </div>
            )}

            {/* Cuerpo de la tarjeta */}
            <div className={styles.cardBodyWrapper} style={{ display: 'flex', flexDirection: 'row', gap: '20px', padding: '0 30px', alignItems: 'center', boxSizing: 'border-box', width: '100%' }}>

                {/* Foto / Placeholder */}
                <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {currentPhotos.length > 0 ? (
                        <img
                            src={currentPhotos[0]}
                            alt={`Evidencia ${activeSlide + 1}`}
                            className={styles.carouselImg}
                            style={{ width: '100%', height: '100%', borderRadius: '16px', border: '1.5px solid #e2e8f0', cursor: 'zoom-in' }}
                            onClick={() => onZoomImage(currentPhotos[0])}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: '#f1f5f9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '24px', border: '1.5px solid #e2e8f0' }}>
                            📷
                        </div>
                    )}
                </div>

                {/* Contenido principal */}
                <div className={styles.cardContent} style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
                    <div className={styles.cardLeftDetails} style={{ flex: 1, minWidth: 0 }}>

                        {/* Fechas y badge NUEVO */}
                        <div className={styles.headerRow} style={{ marginBottom: '8px' }}>
                            <div className={styles.dateGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {!isCardSeen(userRole, trabajo.id, trabajo.estado) && (
                                    <span style={{
                                        background: seenAccent.grad, color: '#ffffff', fontSize: '10px', fontWeight: '900',
                                        padding: '3px 8px', borderRadius: '20px', boxShadow: `0 2px 8px ${seenAccent.shadow}`,
                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                        textTransform: 'uppercase', letterSpacing: '0.5px'
                                    }}>
                                        {seenAccent.dot} NUEVO
                                    </span>
                                )}
                                <p className={styles.strikingDate}>
                                    📅 Cita solicitada: {trabajo.fechaAsignada || trabajo.fecha}
                                </p>
                                {(trabajo as any).hora_llegada && (
                                    <p className={styles.strikingDate} style={{ color: '#059669', background: '#ecfdf5', display: 'inline-block', padding: '2px 8px', borderRadius: '8px', fontSize: '12px' }}>
                                        📍 Técnico en sitio (Llegada: {(trabajo as any).hora_llegada})
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className={styles.cardInfo}>
                            <h3 className={styles.jobTitle} style={{ fontSize: '18px', marginBottom: '8px' }}>
                                {currentItem.titulo.split(' - ')[0]}
                            </h3>

                            <div className={styles.descriptionBox} style={{ margin: 0 }}>
                                <p style={{ fontSize: '13px' }}>
                                    {currentItem.descripcion?.replace(/\[Grupo:\s*REQ-\d+\]\s*\n?/, '') || 'Servicio solicitado sin descripción adicional.'}
                                </p>
                            </div>

                            {/* Cotización */}
                            {((['Cotización Enviada', 'Cotización Aceptada', 'Cotización Rechazada', 'Cotización'].includes(trabajo.estado) || trabajo.estado.toLowerCase().includes('cotizaci')) && trabajo.cotizacion) && (
                                <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '10px', marginTop: '10px', border: '1px solid #fcd34d' }} onClick={e => e.stopPropagation()}>
                                    <p style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '5px', fontSize: '13px' }}>
                                        {userRole === 'admin' ? '💰 Cotización Enviada' : '💰 Cotización del Trabajo'}: ${trabajo.cotizacion.costo}
                                    </p>
                                    {userRole === 'cliente' && trabajo.estado === 'Cotización Enviada' && (
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button onClick={() => onAceptarCotizacion(trabajo.id)} style={{ flex: 1, padding: '5px', background: '#22c55e', color: 'white', borderRadius: '5px', border: 'none', fontSize: '12px', cursor: 'pointer' }}>Aceptar</button>
                                            <button onClick={() => onRechazarCotizacion(trabajo.id)} style={{ flex: 1, padding: '5px', background: '#ef4444', color: 'white', borderRadius: '5px', border: 'none', fontSize: '12px', cursor: 'pointer' }}>Rechazar</button>
                                        </div>
                                    )}
                                </div>
                            )}


                        </div>

                        {/* Footer: técnico y acciones */}
                        <div className={styles.footerRow} style={{ marginTop: '15px' }}>
                            <div className={styles.technicianInfo}>
                                {trabajo.tecnico !== 'Sin asignar' ? `👤 ${trabajo.tecnico}` : `🏢 ${trabajo.ubicacion}`}
                            </div>

                            <div className={styles.actionsCard}>
                                {/* Botón cotizar (solo admin, visitado y sin cotización) */}
                                {trabajo.visitado && !trabajo.cotizacion && userRole === 'admin' && trabajo.estado === 'Solicitud' && (
                                    <button
                                        className={styles.btnCotizar}
                                        onClick={e => { e.stopPropagation(); navigate(`/menu/admin-reporte/${trabajo.id}`); }}
                                    >
                                        💰 Cotizar
                                    </button>
                                )}

                                {/* Badge tipo de trabajo */}
                                {trabajo.tipo && (
                                    <span className={styles.jobTypeBadge}>
                                        {trabajo.estado === 'Finalizado' && trabajo.tipo === 'SOS' ? 'Finalizado' : trabajo.tipo}
                                    </span>
                                )}

                                {/* Badge prioridad (solo móvil) */}
                                {renderPriorityBadge(styles.mobileOnlyStatusBadge)}

                                {/* Editar (cliente) */}
                                {userRole === 'cliente' && trabajo.estado !== 'Finalizado' && trabajo.estado !== 'Completado' && (
                                    <button
                                        className={styles.editBtnSmall}
                                        onClick={e => { e.stopPropagation(); onEdit(e, trabajo); }}
                                        title="Editar"
                                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        <HiOutlinePencil size={15} />
                                    </button>
                                )}

                                {/* Eliminar (admin) */}
                                {userRole === 'admin' && (
                                    <div className={styles.actionBtns} onClick={e => e.stopPropagation()}>
                                        <button className={styles.trashBtn} onClick={e => onDelete(e, trabajo)} title="Eliminar"><HiOutlineTrash size={15} /></button>
                                    </div>
                                )}

                                {/* Eliminar (cliente) */}
                                {userRole === 'cliente' && trabajo.estado !== 'Finalizado' && trabajo.estado !== 'Completado' && (
                                    <button className={styles.trashBtn} onClick={e => onDelete(e, trabajo)} title="Eliminar"><HiOutlineTrash size={15} /></button>
                                )}

                                {/* Carousel multi-servicio */}
                                {items.length > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '15px' }} onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => onSlideChange(String(trabajo.id), Math.max(0, activeSlide - 1))}
                                            disabled={activeSlide === 0}
                                            style={{ background: activeSlide === 0 ? '#e2e8f0' : '#f97316', color: activeSlide === 0 ? '#94a3b8' : 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: activeSlide === 0 ? 'not-allowed' : 'pointer', fontSize: '11px' }}
                                        >▲</button>
                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>{activeSlide + 1}/{items.length}</span>
                                        <button
                                            onClick={() => onSlideChange(String(trabajo.id), Math.min(items.length - 1, activeSlide + 1))}
                                            disabled={activeSlide === items.length - 1}
                                            style={{ background: activeSlide === items.length - 1 ? '#e2e8f0' : '#f97316', color: activeSlide === items.length - 1 ? '#94a3b8' : 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: activeSlide === items.length - 1 ? 'not-allowed' : 'pointer', fontSize: '11px' }}
                                        >▼</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Badge prioridad (desktop) */}
                    <div className={styles.cardRightStatus}>
                        {renderPriorityBadge()}
                        <HiOutlineChevronRight className={styles.cardChevron} size={20} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobCard;
