import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styles from './BusinessPostIts.module.css';
import { useAuth } from '../context/AuthContext';
import { isAutonomoAdmin } from '../utils/roles';

export interface PostItCategory {
    id: 'sos' | 'solicitud' | 'cotizacion' | 'proceso';
    color: 'red' | 'yellow' | 'blue' | 'orange';
    label: string;
    icon: string;
    rotation: number;
    zIndex: number;
    items: any[];
}

interface BusinessPostItsProps {
    jobs: any[];
    negocioId: number;
    negocioNombre?: string;
}

/** Agrupa los trabajos que pertenecen a una misma solicitud multi-servicio [Grupo: REQ-...] */
const groupJobsForPostIts = (rawJobs: any[]): any[] => {
    const getGroupId = (descripcion?: string) => {
        if (!descripcion) return null;
        const match = descripcion.match(/\[Grupo:\s*(REQ-\d+)\]/i);
        return match ? match[1] : null;
    };

    const groupedByReq: { [key: string]: any[] } = {};
    const singleJobsList: any[] = [];

    rawJobs.forEach(job => {
        const grpId = getGroupId(job.descripcion);
        if (grpId) {
            if (!groupedByReq[grpId]) groupedByReq[grpId] = [];
            groupedByReq[grpId].push(job);
        } else {
            singleJobsList.push(job);
        }
    });

    Object.entries(groupedByReq).forEach(([grpId, jobsInGroup]) => {
        jobsInGroup.sort((a, b) => Number(a.id) - Number(b.id));
        const baseJob = { ...jobsInGroup[0] };
        baseJob.isGroupHeader = true;
        baseJob.groupId = grpId;
        baseJob.jobsInGroup = jobsInGroup;
        baseJob.totalJobsInGroup = jobsInGroup.length;

        // Categorías o tipos de servicios presentes en la solicitud
        const serviceTypes = jobsInGroup.map(j => j.titulo?.split(" - ")[0] || j.titulo);
        const uniqueTypes = Array.from(new Set(serviceTypes));
        const suffix = baseJob.titulo?.includes(" - ") ? " - " + baseJob.titulo.split(" - ").slice(1).join(" - ") : "";
        baseJob.titulo = `${uniqueTypes.join(", ")}${suffix}`;

        // Obtener la descripción limpia del primer trabajo o resumen
        const firstCleanDesc = jobsInGroup[0].descripcion?.replace(/\[Grupo:\s*REQ-\d+\]\s*\n?/, "").trim();
        baseJob.summaryDesc = firstCleanDesc || (jobsInGroup.length > 1 ? `Solicitud compuesta por ${jobsInGroup.length} trabajos.` : 'Servicio solicitado.');

        singleJobsList.push(baseJob);
    });

    return singleJobsList;
};

const BusinessPostIts: React.FC<BusinessPostItsProps> = ({ jobs, negocioId, negocioNombre }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeModalCategory, setActiveModalCategory] = useState<PostItCategory | null>(null);

    // 1. Filtrar trabajos por cada categoría según las reglas de negocio
    const rawSosJobs = jobs.filter(j => {
        const isSOS = j.tipo === 'SOS' || j.isEmergency || (j.prioridad === 'Alta' && (j.titulo?.includes('SOS') || j.descripcion?.includes('SOS')));
        const status = (j.estado || '').toLowerCase();
        return isSOS && status !== 'finalizado' && status !== 'eliminado';
    });

    const rawSolicitudJobs = jobs.filter(j => {
        const isSOS = j.tipo === 'SOS' || j.isEmergency || (j.prioridad === 'Alta' && (j.titulo?.includes('SOS') || j.descripcion?.includes('SOS')));
        if (isSOS) return false;
        const status = (j.estado || '').toLowerCase();
        if (status === 'finalizado' || status === 'eliminado' || status.includes('cotizaci')) return false;

        // Si ya tiene técnico asignado o está en proceso, pasa a ser "proceso"
        const hasTechnician = !!(j.trabajador_id || j.trabajador || (j.tecnico && j.tecnico !== 'Sin asignar'));
        if (hasTechnician && (status === 'asignado' || status === 'en proceso' || status === 'en curso')) {
            return false;
        }

        // Se muestra mientras sea nueva solicitud / sin técnico asignado
        const isPendingAssignment = status === 'solicitud' || status === 'pendiente' || status === 'por autorizar' || status === 'nueva solicitud' || (!hasTechnician && status === 'en espera') || !hasTechnician;
        return isPendingAssignment;
    });

    const rawCotizacionJobs = jobs.filter(j => {
        const status = (j.estado || '').toLowerCase();
        if (status === 'finalizado' || status === 'eliminado' || status === 'cotización rechazada' || status === 'cotizacion rechazada') return false;
        return status.includes('cotizaci') || ((j.cotizacion_id || j.cotizacion) && status !== 'cotización aceptada' && status !== 'cotizacion aceptada');
    });

    const rawProcesoJobs = jobs.filter(j => {
        const isSOS = j.tipo === 'SOS' || j.isEmergency;
        if (isSOS) return false;
        const status = (j.estado || '').toLowerCase();
        if (status === 'finalizado' || status === 'eliminado' || status.includes('cotizaci')) return false;
        
        const hasTechnician = !!(j.trabajador_id || j.trabajador || (j.tecnico && j.tecnico !== 'Sin asignar'));
        // Técnico asignado o trabajo en ejecución
        return (hasTechnician && (status === 'asignado' || status === 'en espera')) || status === 'en proceso' || status === 'en curso';
    });

    // Agrupar solicitudes conjuntas para contar 1 solicitud y no N sub-trabajos separados
    const sosJobs = groupJobsForPostIts(rawSosJobs);
    const solicitudJobs = groupJobsForPostIts(rawSolicitudJobs);
    const cotizacionJobs = groupJobsForPostIts(rawCotizacionJobs);
    const procesoJobs = groupJobsForPostIts(rawProcesoJobs);

    // 2. Construir la lista de post-its activos
    const postIts: PostItCategory[] = [];

    if (sosJobs.length > 0) {
        postIts.push({
            id: 'sos',
            color: 'red',
            label: 'Emergencia SOS',
            icon: '🚨',
            rotation: -6,
            zIndex: 14,
            items: sosJobs
        });
    }

    if (solicitudJobs.length > 0) {
        postIts.push({
            id: 'solicitud',
            color: 'yellow',
            label: 'Solicitud Activa',
            icon: '📋',
            rotation: 2,
            zIndex: 12,
            items: solicitudJobs
        });
    }

    if (cotizacionJobs.length > 0) {
        postIts.push({
            id: 'cotizacion',
            color: 'blue',
            label: 'Cotización en Espera',
            icon: '💰',
            rotation: -3,
            zIndex: 10,
            items: cotizacionJobs
        });
    }

    if (procesoJobs.length > 0 && postIts.length < 3) {
        postIts.push({
            id: 'proceso',
            color: 'orange',
            label: 'En Proceso',
            icon: '⚙️',
            rotation: 4,
            zIndex: 8,
            items: procesoJobs
        });
    }

    // Si no hay ninguna nota activa para este negocio, no renderizar nada
    if (postIts.length === 0) return null;

    const getBasePath = (): string => {
        const userRole = user?.role || 'user';
        if (userRole === 'tecnico') return '/tecnico';
        if (userRole === 'cliente') return '/cliente';
        if (isAutonomoAdmin(user?.role)) return '/autonomo';
        if (userRole === 'encargado' || userRole === 'gerente-sucursal') return '/gerente-sucursal';
        return '/menu';
    };

    const handleGoToDetails = (targetTab?: string) => {
        const basePath = getBasePath();
        setActiveModalCategory(null);
        if (targetTab) {
            navigate(`${basePath}/trabajos/${negocioId}?tab=${targetTab}`);
        } else {
            navigate(`${basePath}/trabajos/${negocioId}`);
        }
    };

    const getColorClass = (color: PostItCategory['color']) => {
        switch (color) {
            case 'red': return styles.postItRed;
            case 'yellow': return styles.postItYellow;
            case 'blue': return styles.postItBlue;
            case 'orange': return styles.postItOrange;
            default: return styles.postItYellow;
        }
    };

    const getPopoverColorClass = (color: PostItCategory['color']) => {
        switch (color) {
            case 'red': return styles.popoverNoteRed;
            case 'yellow': return styles.popoverNoteYellow;
            case 'blue': return styles.popoverNoteBlue;
            case 'orange': return styles.popoverNoteOrange;
            default: return styles.popoverNoteYellow;
        }
    };

    return (
        <>
            <div 
                className={styles.postItsContainer} 
                onClick={(e) => e.stopPropagation()}
                title="Haz clic para ver las notas y pendientes de esta sucursal"
            >
                {/* Tachuela / Chincheta 3D decorativa */}
                <div className={styles.pushPin} />

                <div className={styles.notesStack}>
                    {postIts.map((p, idx) => (
                        <div
                            key={p.id}
                            className={`${styles.postIt} ${getColorClass(p.color)}`}
                            style={{
                                transform: `rotate(${p.rotation}deg)`,
                                zIndex: p.zIndex,
                                marginLeft: idx === 0 ? 0 : undefined
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveModalCategory(p);
                            }}
                        >
                            <span className={styles.postItIcon}>{p.icon}</span>
                            <span className={styles.postItBadge}>{p.items.length}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL DETALLADO ESTILO NOTA ADHESIVA */}
            {activeModalCategory && createPortal(
                <div 
                    className={styles.modalBackdrop} 
                    onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalCategory(null);
                    }}
                >
                    <div 
                        className={`${styles.popoverNote} ${getPopoverColorClass(activeModalCategory.color)}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            className={styles.closeButton}
                            onClick={() => setActiveModalCategory(null)}
                            title="Cerrar nota"
                        >
                            ✕
                        </button>

                        <div className={styles.noteHeader}>
                            <span style={{ fontSize: '26px' }}>{activeModalCategory.icon}</span>
                            <div>
                                <h3 className={styles.noteTitle}>{activeModalCategory.label}</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', opacity: 0.85, fontWeight: 500 }}>
                                    {negocioNombre || 'Sucursal'} • {activeModalCategory.items.length} {activeModalCategory.id === 'solicitud' ? (activeModalCategory.items.length === 1 ? 'solicitud activa' : 'solicitudes activas') : (activeModalCategory.items.length === 1 ? 'pendiente' : 'pendientes')}
                                </p>
                            </div>
                        </div>

                        <div className={styles.noteItemsList}>
                            {activeModalCategory.items.map((job: any, index: number) => {
                                const cleanDesc = job.summaryDesc || job.descripcion?.replace(/\[Grupo:\s*REQ-\d+\]\s*\n?/, '') || 'Sin descripción adicional.';
                                const dateStr = job.fechaAsignada || job.fecha || (job.created_at ? new Date(job.created_at).toLocaleDateString('es-MX') : '');
                                return (
                                    <div key={job.id || index} className={styles.noteItem}>
                                        <div className={styles.itemTitle}>
                                            <span>{job.titulo || 'Servicio'}</span>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                {job.totalJobsInGroup && job.totalJobsInGroup > 1 && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        padding: '2px 7px',
                                                        borderRadius: '6px',
                                                        background: '#e0f2fe',
                                                        color: '#0369a1',
                                                        fontWeight: 'bold',
                                                        border: '1px solid #bae6fd'
                                                    }}>
                                                        🔗 {job.totalJobsInGroup} trabajos
                                                    </span>
                                                )}
                                                {job.prioridad && (
                                                    <span style={{ 
                                                        fontSize: '10px', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '6px', 
                                                        background: job.prioridad === 'Alta' ? '#fee2e2' : '#f1f5f9',
                                                        color: job.prioridad === 'Alta' ? '#dc2626' : '#475569',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {job.prioridad}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className={styles.itemDesc}>{cleanDesc}</p>
                                        <div className={styles.itemMeta}>
                                            <span>📅 {dateStr}</span>
                                            <span>Estatus: <strong>{job.estado}</strong></span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button 
                            className={styles.actionButton}
                            onClick={() => {
                                if (activeModalCategory.id === 'cotizacion') {
                                    handleGoToDetails('cotizaciones');
                                } else {
                                    handleGoToDetails();
                                }
                            }}
                        >
                            <span>Ir a los detalles de la sucursal</span>
                            <span>→</span>
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default BusinessPostIts;
