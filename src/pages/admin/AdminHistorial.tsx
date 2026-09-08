import React, { useState, useEffect } from "react";
import styles from "../cliente/Historial.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";
import { getTrabajos } from "../../services/trabajosService";
import { getReporteByTrabajoId } from "../../services/reportesService";
import ReporteDetailModal from "../../components/modals/ReporteDetailModal";
import {
    HiOutlineCheckBadge,
    HiOutlineCheckCircle
} from "react-icons/hi2";

// Interfaz para la Tarea del Historial
interface TareaHistorial {
    id: number | string;
    baseId: number;
    pointIndex?: number;
    titulo: string;
    descripcion: string;
    estado: string;
    ubicacion: string;
    fecha: string;
    tecnico?: string;
    trabajoId: number;
    monthYear?: string;
    rawJob?: any;
}

const parseJobDate = (fechaStr?: string, createdAt?: string): Date => {
    if (fechaStr) {
        if (fechaStr.includes('-')) {
            const parts = fechaStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                return new Date(year, month, day);
            }
        }
        if (fechaStr.includes('/')) {
            const parts = fechaStr.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                return new Date(year, month, day);
            }
        }
        const dateObj = new Date(fechaStr);
        if (!isNaN(dateObj.getTime())) return dateObj;
    }
    if (createdAt) {
        const dateObj = new Date(createdAt);
        if (!isNaN(dateObj.getTime())) return dateObj;
    }
    return new Date();
};

const getMonthYearString = (date: Date): string => {
    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${months[date.getMonth()]} de ${date.getFullYear()}`;
};

const getGroupId = (descripcion?: string): string | null => {
    if (!descripcion) return null;
    const match = descripcion.match(/\[Grupo:\s*(REQ-\d+)\]/i);
    return match ? match[1] : null;
};

const cleanDescriptionText = (desc?: string): string => {
    if (!desc) return "Trabajo completado exitosamente.";
    let cleaned = desc;
    if (cleaned.includes('|||')) {
        cleaned = cleaned.split('|||')[0].trim();
    }
    cleaned = cleaned.replace(/\[Grupo:\s*REQ-\d+\]\s*/gi, '').trim();
    return cleaned || "Trabajo completado exitosamente.";
};

const extractServiceType = (job: any, pointIdx?: number, subId?: string | number): string => {
    // 1. Revisar report_data en localStorage para este sub-punto o trabajo
    if (subId) {
        const local = localStorage.getItem(`report_data_${subId}`) || localStorage.getItem(`report_data_temporal_${subId}`);
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (parsed.tipoServicio) return parsed.tipoServicio;
                if (parsed.tipo) return parsed.tipo;
                if (parsed.equipoInfo?.tipo) return parsed.equipoInfo.tipo;
            } catch(e) {}
        }
    }
    if (job?.id) {
        const local = localStorage.getItem(`report_data_${job.id}`) || localStorage.getItem(`report_data_temporal_${job.id}`);
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (parsed.tipoServicio) return parsed.tipoServicio;
                if (parsed.tipo) return parsed.tipo;
                if (parsed.equipoInfo?.tipo) return parsed.equipoInfo.tipo;
            } catch(e) {}
        }
    }

    // 2. Parsear |||SERVICE_DATA||| de la descripción
    const rawDesc = job?.descripcion || '';
    if (rawDesc.includes('|||SERVICE_DATA|||')) {
        try {
            const parts = rawDesc.split('|||SERVICE_DATA|||');
            const dataStr = parts[1].split('|||')[0].trim();
            const serviceData = JSON.parse(dataStr);
            if (pointIdx !== undefined && serviceData.items && Array.isArray(serviceData.items) && serviceData.items[pointIdx - 1]) {
                const it = serviceData.items[pointIdx - 1];
                const itemTipo = (it.tipo === 'Otro' ? it.customTipo : it.tipo) || it.tipoActividad;
                if (itemTipo) return itemTipo;
            }
            if (serviceData.tipoServicio) return serviceData.tipoServicio;
        } catch (e) {}
    }

    // 3. Revisar objeto serviceData directo
    if (job?.serviceData) {
        if (pointIdx !== undefined && job.serviceData.items && Array.isArray(job.serviceData.items) && job.serviceData.items[pointIdx - 1]) {
            const it = job.serviceData.items[pointIdx - 1];
            const itemTipo = (it.tipo === 'Otro' ? it.customTipo : it.tipo) || it.tipoActividad;
            if (itemTipo) return itemTipo;
        }
        if (job.serviceData.tipoServicio) return job.serviceData.tipoServicio;
    }

    // 4. Revisar etiquetas de puntos: "1. [Electricidad] ..." o "[Plomería] ..."
    if (pointIdx !== undefined) {
        const regexPoint = /(?:^|\n+)(\d+)\.\s*\[([^\]]+)\]/g;
        const matches = Array.from(rawDesc.matchAll(regexPoint));
        if (matches && matches[pointIdx - 1] && matches[pointIdx - 1][2]) {
            return matches[pointIdx - 1][2].trim();
        }
    }
    const singleBracketMatch = rawDesc.match(/\[(Electricidad|Plomer[ií]a|Pintura|Cerrajer[ií]a|Mantenimiento|Albañiler[ií]a|Aire Acondicionado|Herrer[ií]a|Tablaroca|Instalaci[oó]n|Reparaci[oó]n|Diagn[oó]stico|Otro)\]/i);
    if (singleBracketMatch) {
        return singleBracketMatch[1];
    }

    // 5. Extraer del título del trabajo
    if (job?.titulo) {
        const titleFirst = job.titulo.split(' - ')[0].trim();
        if (titleFirst && !titleFirst.toLowerCase().includes('solicitud') && !titleFirst.toLowerCase().includes('requerimiento')) {
            return titleFirst;
        }
    }

    return job?.tipo || 'Servicio';
};

const decomposeJobToHistoryTasks = (job: any): TareaHistorial[] => {
    const finalDate = parseJobDate(job.fecha_programada, job.created_at);
    const dateFormatted = finalDate.toLocaleDateString('es-MX');
    const monthYear = getMonthYearString(finalDate);
    const ubicacion = job.negocio?.ubicacion || job.negocio?.nombre || "Sucursal";
    const tecnico = job.trabajador?.nombre || job.tecnico || "Sin Asignar";

    // 1. Caso: múltiples ítems estructurados en serviceData.items o dentro de |||SERVICE_DATA|||
    let itemsFromDesc: any[] | null = null;
    const rawDesc = job.descripcion || '';
    if (rawDesc.includes('|||SERVICE_DATA|||')) {
        try {
            const parts = rawDesc.split('|||SERVICE_DATA|||');
            const dataStr = parts[1].split('|||')[0].trim();
            const serviceData = JSON.parse(dataStr);
            if (serviceData.items && Array.isArray(serviceData.items) && serviceData.items.length > 1) {
                itemsFromDesc = serviceData.items;
            }
        } catch(e) {}
    }

    const itemsToProcess = (job.serviceData?.items && Array.isArray(job.serviceData.items) && job.serviceData.items.length > 1)
        ? job.serviceData.items
        : itemsFromDesc;

    if (itemsToProcess && itemsToProcess.length > 1) {
        return itemsToProcess.map((item: any, idx: number) => {
            const pIdx = idx + 1;
            const subId = `${job.id}_${pIdx}`;
            const subTipo = (item.tipo === 'Otro' ? item.customTipo : item.tipo) || extractServiceType(job, pIdx, subId);
            const subDesc = cleanDescriptionText(item.descripcion || job.descripcion);
            return {
                id: subId,
                baseId: job.id,
                pointIndex: pIdx,
                titulo: `${subTipo} (Punto ${pIdx})`,
                descripcion: subDesc,
                estado: job.estado || 'Completado',
                ubicacion,
                fecha: dateFormatted,
                monthYear,
                tecnico,
                trabajoId: job.id,
                rawJob: job
            };
        });
    }

    // 2. Caso: actividades registradas
    if (job.actividades && Array.isArray(job.actividades) && job.actividades.length > 1) {
        return job.actividades.map((act: any, idx: number) => {
            const pIdx = idx + 1;
            const subId = act.id ? String(act.id) : `${job.id}_${pIdx}`;
            const subTipo = act.tipo || act.titulo || extractServiceType(job, pIdx, subId);
            const subDesc = cleanDescriptionText(act.descripcion || job.descripcion);
            return {
                id: subId,
                baseId: job.id,
                pointIndex: pIdx,
                titulo: `${subTipo} (Punto ${pIdx})`,
                descripcion: subDesc,
                estado: act.estado || job.estado || 'Completado',
                ubicacion,
                fecha: dateFormatted,
                monthYear,
                tecnico,
                trabajoId: job.id,
                rawJob: job
            };
        });
    }

    // 3. Caso: Puntos numerados en la descripción (ej. "1. [Electricidad] ... \n\n 2. [Plomería] ...")
    const cleanRaw = cleanDescriptionText(rawDesc);
    const regexPoint = /(?:^|\n+)(\d+)\.\s*(?:\[([^\]]+)\]\s*)?([\s\S]*?)(?=(?:\n+\d+\.\s*)|$)/g;
    const matches = Array.from(cleanRaw.matchAll(regexPoint));

    if (matches && matches.length > 1) {
        return matches.map((m, idx) => {
            const pIdx = idx + 1;
            const subId = `${job.id}_${pIdx}`;
            const subTipo = m[2] ? m[2].trim() : extractServiceType(job, pIdx, subId);
            const subDesc = m[3] ? m[3].trim() : '';
            return {
                id: subId,
                baseId: job.id,
                pointIndex: pIdx,
                titulo: subTipo.includes('(Punto') ? subTipo : `${subTipo} (Punto ${pIdx})`,
                descripcion: subDesc || 'Trabajo completado exitosamente.',
                estado: job.estado || 'Completado',
                ubicacion,
                fecha: dateFormatted,
                monthYear,
                tecnico,
                trabajoId: job.id,
                rawJob: job
            };
        });
    }

    // 4. Caso: Múltiples reportes guardados en localStorage para sub-puntos (ej. report_data_21_1, report_data_21_2, etc.)
    const pointsFound: number[] = [];
    for (let p = 1; p <= 10; p++) {
        if (localStorage.getItem(`report_data_${job.id}_${p}`) || localStorage.getItem(`report_data_temporal_${job.id}_${p}`)) {
            pointsFound.push(p);
        }
    }
    if (pointsFound.length > 1) {
        return pointsFound.map((pIdx) => {
            const subId = `${job.id}_${pIdx}`;
            const subTipo = extractServiceType(job, pIdx, subId);
            const savedRaw = localStorage.getItem(`report_data_${subId}`) || localStorage.getItem(`report_data_temporal_${subId}`);
            let subDesc = cleanDescriptionText(job.descripcion);
            if (savedRaw) {
                try {
                    const parsed = JSON.parse(savedRaw);
                    if (parsed.reporteTienda) subDesc = parsed.reporteTienda;
                } catch(e) {}
            }
            return {
                id: subId,
                baseId: job.id,
                pointIndex: pIdx,
                titulo: `${subTipo} (Punto ${pIdx})`,
                descripcion: subDesc,
                estado: job.estado || 'Completado',
                ubicacion,
                fecha: dateFormatted,
                monthYear,
                tecnico,
                trabajoId: job.id,
                rawJob: job
            };
        });
    }

    // Por defecto: 1 solo trabajo
    const singleTipo = extractServiceType(job);
    return [{
        id: job.id,
        baseId: job.id,
        titulo: singleTipo && !job.titulo.startsWith(singleTipo) ? `${singleTipo} - ${job.titulo}` : job.titulo,
        descripcion: cleanDescriptionText(job.descripcion),
        estado: job.estado || 'Completado',
        ubicacion,
        fecha: dateFormatted,
        monthYear,
        tecnico,
        trabajoId: job.id,
        rawJob: job
    }];
};

const AdminHistorial: React.FC = () => {
    const { user } = useAuth();
    const [rawTareas, setRawTareas] = useState<TareaHistorial[]>([]);
    const [selectedHistoryTask, setSelectedHistoryTask] = useState<TareaHistorial | null>(null);
    const [reportData, setReportData] = useState<any>(null);
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            try {
                const apiJobs = await getTrabajos();

                // Filtrar según rol de técnico si aplica
                let baseJobs = apiJobs;
                if (user.role === 'tecnico') {
                    baseJobs = apiJobs.filter((j: any) =>
                        j.trabajador_id === user.id || j.trabajador?.user_id === user.id
                    );
                }

                const isJobFinished = (j: any) => 
                    j.estado === 'Finalizado' || 
                    j.estado === 'Cotización Aceptada' || 
                    j.estado === 'Completado';

                // Detectar todos los grupos [Grupo: REQ-xxxx] que tengan al menos un trabajo finalizado
                const finishedGroupIds = new Set<string>();
                baseJobs.forEach((job: any) => {
                    if (isJobFinished(job)) {
                        const grpId = getGroupId(job.descripcion);
                        if (grpId) finishedGroupIds.add(grpId);
                    }
                });

                // Agrupar trabajos por grupo REQ o procesarlos individualmente
                const groupedByReq: { [grpId: string]: any[] } = {};
                const nonGroupedJobs: any[] = [];

                baseJobs.forEach((job: any) => {
                    const grpId = getGroupId(job.descripcion);
                    if (grpId && (finishedGroupIds.has(grpId) || isJobFinished(job))) {
                        if (!groupedByReq[grpId]) groupedByReq[grpId] = [];
                        groupedByReq[grpId].push(job);
                    } else if (isJobFinished(job)) {
                        nonGroupedJobs.push(job);
                    }
                });

                const allTasks: TareaHistorial[] = [];

                // 1. Procesar grupos [Grupo: REQ-xxxx]
                Object.entries(groupedByReq).forEach(([grpId, jobsInGroup]) => {
                    jobsInGroup.sort((a, b) => Number(a.id) - Number(b.id));
                    const baseJob = jobsInGroup[0];
                    const finalDate = parseJobDate(baseJob.fecha_programada, baseJob.created_at);
                    const dateFormatted = finalDate.toLocaleDateString('es-MX');
                    const monthYear = getMonthYearString(finalDate);
                    const ubicacion = baseJob.negocio?.ubicacion || baseJob.negocio?.nombre || "Sucursal";
                    const tecnico = baseJob.trabajador?.nombre || baseJob.tecnico || "Sin Asignar";

                    jobsInGroup.forEach((gJob, idx) => {
                        const pIdx = idx + 1;
                        // Extraer tipo de servicio preciso (revisando si el trabajo individual o el reporte del punto tiene el tipo elegido en visita)
                        let serviceType = extractServiceType(gJob, pIdx, gJob.id);
                        if (serviceType === 'Servicio' || serviceType === 'Mantenimiento') {
                            const fromBase = extractServiceType(baseJob, pIdx, `${baseJob.id}_${pIdx}`);
                            if (fromBase && fromBase !== 'Servicio') {
                                serviceType = fromBase;
                            }
                        }

                        const cleanDesc = cleanDescriptionText(gJob.descripcion);

                        allTasks.push({
                            id: gJob.id,
                            baseId: baseJob.id,
                            pointIndex: pIdx,
                            titulo: `${serviceType} (Punto ${pIdx})`,
                            descripcion: cleanDesc,
                            estado: 'Completado',
                            ubicacion,
                            fecha: dateFormatted,
                            monthYear,
                            tecnico: gJob.trabajador?.nombre || tecnico,
                            trabajoId: gJob.id,
                            rawJob: gJob
                        });
                    });
                });

                // 2. Procesar trabajos individuales
                nonGroupedJobs.forEach((job: any) => {
                    const decomposed = decomposeJobToHistoryTasks(job);
                    allTasks.push(...decomposed);
                });

                // Ordenar más recientes primero
                allTasks.sort((a: any, b: any) => {
                    const aNum = typeof a.id === 'number' ? a.id : parseInt(String(a.id).split('_')[0], 10) || 0;
                    const bNum = typeof b.id === 'number' ? b.id : parseInt(String(b.id).split('_')[0], 10) || 0;
                    return bNum - aNum;
                });

                setRawTareas(allTasks);
            } catch (error) {
                console.error("Error al obtener el historial de la API", error);
            }
        };

        fetchHistory();
    }, [user]);



    // Filtrado
    const filtradas = rawTareas.filter(tarea => {
        const matchesText = tarea.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
            tarea.ubicacion.toLowerCase().includes(searchText.toLowerCase()) ||
            tarea.descripcion.toLowerCase().includes(searchText.toLowerCase());
        return matchesText;
    });

    const handleSelectTask = async (tarea: TareaHistorial) => {
        setSelectedHistoryTask(tarea);
        setReportData(null);

        try {
            // 1. Verificar si existe reporte específico de este sub-punto en localStorage
            const localData = localStorage.getItem(`report_data_${tarea.id}`) ||
                              localStorage.getItem(`report_data_temporal_${tarea.id}`) ||
                              (tarea.baseId && tarea.pointIndex ? (localStorage.getItem(`report_data_${tarea.baseId}_${tarea.pointIndex}`) || localStorage.getItem(`report_data_temporal_${tarea.baseId}_${tarea.pointIndex}`)) : null);

            if (localData) {
                try {
                    const parsed = JSON.parse(localData);
                    setReportData(parsed);
                    return;
                } catch (e) {
                    console.error("Error al parsear reporte local:", e);
                }
            }

            // 2. Intentar cargar desde API con el trabajoId
            let apiReport = await getReporteByTrabajoId(tarea.trabajoId);

            // Si no tiene reporte propio, intentar con baseId si es un grupo
            if ((!apiReport || !apiReport.solucion) && tarea.baseId && tarea.baseId !== tarea.trabajoId) {
                try {
                    apiReport = await getReporteByTrabajoId(tarea.baseId);
                } catch(e) {}
            }

            if (apiReport && apiReport.solucion) {
                try {
                    const parsed = JSON.parse(apiReport.solucion);
                    setReportData(parsed);
                    return;
                } catch (e) {
                    console.error("Error parseando solución del reporte:", e);
                    setReportData({
                        descripcion: apiReport.descripcion || tarea.descripcion,
                        fecha: apiReport.fecha || tarea.fecha,
                        id: apiReport.id || tarea.id,
                        reporteTienda: apiReport.descripcion || tarea.descripcion
                    });
                    return;
                }
            }

            // 3. Fallback a reporte general del baseId o trabajoId en LocalStorage
            const baseLocal = (tarea.baseId ? (localStorage.getItem(`report_data_${tarea.baseId}`) || localStorage.getItem(`report_data_temporal_${tarea.baseId}`)) : null) ||
                              localStorage.getItem(`report_data_${tarea.trabajoId}`) || 
                              localStorage.getItem(`report_data_temporal_${tarea.trabajoId}`);
            if (baseLocal) {
                try {
                    setReportData(JSON.parse(baseLocal));
                    return;
                } catch (e) {}
            }

            // 4. Fallback final: usar la descripción del trabajo/tarea
            setReportData({
                descripcion: tarea.descripcion || "Trabajo completado exitosamente.",
                reporteTienda: tarea.descripcion || "Trabajo completado exitosamente.",
                fecha: tarea.fecha,
                id: tarea.id,
                tecnicoNombre: tarea.tecnico || "Técnico"
            });
        } catch (error) {
            console.error("Error al obtener reporte:", error);
            setReportData({
                descripcion: tarea.descripcion || "Trabajo completado exitosamente.",
                reporteTienda: tarea.descripcion || "Trabajo completado exitosamente.",
                fecha: tarea.fecha,
                id: tarea.id,
                tecnicoNombre: tarea.tecnico || "Técnico"
            });
        }
    };

    return (
        <div className={styles.container}>
            {/* BUSCADOR */}
            <div className={styles.searchSection}>
                <div className={menuStyles.searchCard}>
                    <input
                        type="text"
                        placeholder="Buscar trabajo, detalle o sucursal..."
                        className={menuStyles.searchInput}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.list}>
                {filtradas.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {(() => {
                            const grouped = filtradas.reduce((acc, tarea) => {
                                const key = tarea.monthYear || 'Desconocido';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(tarea);
                                return acc;
                            }, {} as Record<string, TareaHistorial[]>);

                            return Object.entries(grouped).map(([monthYear, tareasGroup]) => {
                                const isExpanded = expandedMonths[monthYear] !== false; // Default true
                                return (
                                    <div key={monthYear} style={{ marginBottom: '10px' }}>
                                        <div 
                                            onClick={() => setExpandedMonths(prev => ({ ...prev, [monthYear]: !isExpanded }))} 
                                            className={styles.accordionHeader}
                                        >
                                            <div className={styles.accordionLeft}>
                                                <span style={{ fontSize: '22px' }}>{isExpanded ? '📂' : '📁'}</span>
                                                <span style={{ textTransform: 'capitalize' }}>{monthYear}</span>
                                                <span className={styles.accordionCount}>{tareasGroup.length} reporte{tareasGroup.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            <span className={`${styles.accordionArrow} ${isExpanded ? styles.accordionArrowExpanded : ''}`}>▼</span>
                                        </div>
                                        {isExpanded && (
                                            <div className={styles.groupContentList}>
                                                {tareasGroup.map((tarea, index) => {
                                                    return (
                                                        <div
                                                            key={`${tarea.id}-${index}`}
                                                            className={styles.card}
                                                            onClick={() => handleSelectTask(tarea)}
                                                            title="Haz clic para ver más detalles"
                                                        >
                                                            <div className={`${styles.cardIndicator} ${styles.borderSuccess}`}></div>
                                                            <div className={styles.cardContent}>
                                                                <div className={styles.cardIcon}>
                                                                    <HiOutlineCheckBadge className={styles.iconHistory} size={32} />
                                                                </div>

                                                                <div className={styles.cardInfo}>
                                                                    <div className={styles.cardHeader}>
                                                                        <div>
                                                                            <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block', marginBottom: '8px' }}>
                                                                                🏢 {tarea.ubicacion}
                                                                            </span>
                                                                            <h3 className={styles.concepto} style={{ marginTop: '0' }}>{tarea.titulo}</h3>
                                                                        </div>
                                                                        <div className={`${styles.statusBadge} ${styles.badgeSuccess}`}>
                                                                            <HiOutlineCheckCircle className={styles.statusIcon} /> Completado
                                                                        </div>
                                                                    </div>

                                                                    <p className={styles.descripcion}>{tarea.descripcion}</p>

                                                                    <div className={styles.cardFooter}>
                                                                        {tarea.tecnico && tarea.tecnico !== "Sin Asignar" && tarea.tecnico !== "Sin asignar" ? (
                                                                            <span className={styles.tecnicoBadge}>🧑‍🔧 {tarea.tecnico}</span>
                                                                        ) : <span></span>}
                                                                        <span className={styles.fecha}>{tarea.fecha}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '30px', border: '1px solid #eee' }}>
                        <p style={{ color: '#666', fontSize: '16px' }}>No hay labores o diagnósticos finalizados en el historial global.</p>
                    </div>
                )}
            </div>

            {/* MODAL HISTORIAL UNIFICADO */}
            {selectedHistoryTask && (
                <ReporteDetailModal
                    isOpen={!!selectedHistoryTask}
                    onClose={() => {
                        setSelectedHistoryTask(null);
                        setReportData(null);
                    }}
                    trabajo={{
                        id: selectedHistoryTask.trabajoId,
                        sucursal: selectedHistoryTask.ubicacion,
                        tecnico: selectedHistoryTask.tecnico,
                        encargado: selectedHistoryTask.rawJob?.negocio?.dueno || selectedHistoryTask.rawJob?.negocio?.contacto || selectedHistoryTask.rawJob?.usuario?.name || "N/A",
                        cotizacion: selectedHistoryTask.rawJob?.cotizacion
                    }}
                    task={{
                        id: selectedHistoryTask.id,
                        titulo: selectedHistoryTask.titulo,
                        fecha: selectedHistoryTask.fecha
                    }}
                    reporte={reportData}
                    userRole={user?.role}
                />
            )}
        </div>
    );
};

export default AdminHistorial;
