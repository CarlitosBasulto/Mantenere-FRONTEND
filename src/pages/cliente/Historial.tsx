import React, { useState, useEffect } from "react";
import styles from "./Historial.module.css";
import { useAuth } from "../../context/AuthContext";
import menuStyles from "../../components/Menu.module.css";
import { getTrabajos } from "../../services/trabajosService";
import { getReporteByTrabajoId } from "../../services/reportesService";
import { getActividadesByTrabajo } from "../../services/actividadesService";
import ReporteDetailModal from "../../components/modals/ReporteDetailModal";
import { findMatchingSubReport } from "../../utils/reportUtils";

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

interface HistorialProps {
    businessId?: number;
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

const Historial: React.FC<HistorialProps> = ({ businessId }) => {
    const { user } = useAuth();
    const [rawTareas, setRawTareas] = useState<TareaHistorial[]>([]);
    const [selectedHistoryTask, setSelectedHistoryTask] = useState<TareaHistorial | null>(null);
    const [searchText, setSearchText] = useState("");
    const [reportData, setReportData] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!user) return;

        // 1. Obtener los negocios del cliente actual
        const apiNegociosRaw = localStorage.getItem('negocios_list');
        const negociosIds = new Set<number>();

        if (apiNegociosRaw) {
            try {
                const negocios = JSON.parse(apiNegociosRaw);
                negocios.forEach((n: any) => {
                    if (n.user_id === user.id || n.dueno === user.name) {
                        negociosIds.add(n.id);
                    }
                });
            } catch(e) {}
        }

        const fetchClientHistory = async () => {
            try {
                const apiJobs = await getTrabajos();

                const userFilteredJobs = apiJobs.filter((job: any) => {
                    if (businessId) {
                        return job.negocio_id === businessId;
                    }
                    if (user.role === 'admin' || user.role === 'tecnico' || user.role === 'cliente') {
                        return true;
                    }
                    return negociosIds.has(job.negocio_id) || job.negocio?.user_id === user.id || (user.role === 'encargado' && job.negocio_id === user.negocio_id);
                });

                const isJobFinished = (j: any) => 
                    j.estado === 'Finalizado' || 
                    j.estado === 'Cotización Aceptada' || 
                    j.estado === 'Completado';

                // Detectar todos los grupos [Grupo: REQ-xxxx] que tengan al menos un trabajo finalizado
                const finishedGroupIds = new Set<string>();
                userFilteredJobs.forEach((job: any) => {
                    if (isJobFinished(job)) {
                        const grpId = getGroupId(job.descripcion);
                        if (grpId) finishedGroupIds.add(grpId);
                    }
                });

                // Agrupar trabajos por grupo REQ o procesarlos individualmente
                const groupedByReq: { [grpId: string]: any[] } = {};
                const nonGroupedJobs: any[] = [];

                userFilteredJobs.forEach((job: any) => {
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
                for (const [grpId, jobsInGroup] of Object.entries(groupedByReq)) {
                    jobsInGroup.sort((a, b) => Number(a.id) - Number(b.id));
                    const baseJob = jobsInGroup[0];
                    const finalDate = parseJobDate(baseJob.fecha_programada, baseJob.created_at);
                    const dateFormatted = finalDate.toLocaleDateString('es-MX');
                    const monthYear = getMonthYearString(finalDate);
                    const ubicacion = baseJob.negocio?.ubicacion || baseJob.negocio?.nombre || "Sucursal";
                    const tecnico = baseJob.trabajador?.nombre || baseJob.tecnico || "Sin Asignar";

                    // Consultar si existen actividades de la visita técnica asociadas a este trabajo base o hermanos
                    let acts: any[] = [];
                    try {
                        acts = await getActividadesByTrabajo(baseJob.id);
                        if ((!acts || acts.length === 0) && jobsInGroup.length > 1) {
                            for (const otherJob of jobsInGroup.slice(1)) {
                                const otherActs = await getActividadesByTrabajo(otherJob.id);
                                if (otherActs && otherActs.length > 0) {
                                    acts = otherActs;
                                    break;
                                }
                            }
                        }
                    } catch (_) {}

                    let decomposedFromActs: TareaHistorial[] = [];
                    if (acts && acts.length > 0) {
                        acts.forEach((act: any) => {
                            const rawActDesc = act.descripcion || '';
                            const cleanRaw = cleanDescriptionText(rawActDesc);
                            const regexPoint = /(?:^|\n+)(\d+)\.\s*(?:\[([^\]]+)\]\s*)?([\s\S]*?)(?=(?:\n+\d+\.\s*)|$)/g;
                            const matches = Array.from(cleanRaw.matchAll(regexPoint));

                            if (matches && matches.length > 1) {
                                matches.forEach((m, idx) => {
                                    const pIdx = idx + 1;
                                    const subId = `${act.id}_${pIdx}`;
                                    const subTipo = m[2] ? m[2].trim() : (act.tipo || extractServiceType(baseJob, pIdx, subId));
                                    const subDesc = m[3] ? m[3].trim() : '';
                                    decomposedFromActs.push({
                                        id: subId,
                                        baseId: baseJob.id,
                                        pointIndex: pIdx,
                                        titulo: subTipo.includes('(Punto') ? subTipo : `${subTipo} (Punto ${pIdx})`,
                                        descripcion: subDesc || 'Trabajo completado exitosamente.',
                                        estado: 'Completado',
                                        ubicacion,
                                        fecha: dateFormatted,
                                        monthYear,
                                        tecnico: baseJob.trabajador?.nombre || tecnico,
                                        trabajoId: baseJob.id,
                                        rawJob: baseJob
                                    });
                                });
                            } else {
                                const subId = String(act.id);
                                const subTipo = act.tipo || act.titulo || extractServiceType(baseJob, undefined, subId);
                                decomposedFromActs.push({
                                    id: subId,
                                    baseId: baseJob.id,
                                    pointIndex: decomposedFromActs.length + 1,
                                    titulo: subTipo.includes('(Punto') ? subTipo : `${subTipo} (Punto ${decomposedFromActs.length + 1})`,
                                    descripcion: cleanDescriptionText(act.descripcion || baseJob.descripcion),
                                    estado: 'Completado',
                                    ubicacion,
                                    fecha: dateFormatted,
                                    monthYear,
                                    tecnico: baseJob.trabajador?.nombre || tecnico,
                                    trabajoId: baseJob.id,
                                    rawJob: baseJob
                                });
                            }
                        });
                    }

                    if (decomposedFromActs.length > 0) {
                        allTasks.push(...decomposedFromActs);
                    } else {
                        // Fallback: procesar trabajos individuales del grupo
                        jobsInGroup.forEach((gJob, idx) => {
                            const pIdx = idx + 1;
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
                    }
                }

                // 2. Procesar trabajos individuales (descomponer si tienen múltiples puntos internos)
                nonGroupedJobs.forEach((job: any) => {
                    const decomposed = decomposeJobToHistoryTasks(job);
                    allTasks.push(...decomposed);
                });

                allTasks.sort((a: any, b: any) => {
                    const aNum = typeof a.id === 'number' ? a.id : parseInt(String(a.id).split('_')[0], 10) || 0;
                    const bNum = typeof b.id === 'number' ? b.id : parseInt(String(b.id).split('_')[0], 10) || 0;
                    const aBase = a.baseId || aNum;
                    const bBase = b.baseId || bNum;
                    if (bBase !== aBase) {
                        return bBase - aBase;
                    }
                    const aPoint = a.pointIndex || 0;
                    const bPoint = b.pointIndex || 0;
                    return aPoint - bPoint;
                });

                setRawTareas(allTasks);
            } catch (error) {
                console.error("Error cargando historial de cliente:", error);
            }
        };

        fetchClientHistory();
    }, [user, businessId]);



    // Filtrado
    const filtradas = rawTareas.filter(tarea => {
        const matchesText = tarea.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
            tarea.ubicacion.toLowerCase().includes(searchText.toLowerCase()) ||
            tarea.descripcion.toLowerCase().includes(searchText.toLowerCase());
        return matchesText;
    });

    // Agrupar por empresa/sucursal
    type TareasAgrupadas = { [nombreEmpresa: string]: TareaHistorial[] };
    const tareasAgrupadas: TareasAgrupadas = {};
    filtradas.forEach(tarea => {
        const empresa = tarea.ubicacion || "Otras Sugerencias";
        if (!tareasAgrupadas[empresa]) tareasAgrupadas[empresa] = [];
        tareasAgrupadas[empresa].push(tarea);
    });

    const handleSelectTask = async (tarea: TareaHistorial) => {
        setSelectedHistoryTask(tarea);
        setReportData(null);
        setLoadingReport(true);

        try {
            const subId = String(tarea.id);
            const baseId = tarea.baseId;
            const pIdx = tarea.pointIndex;
            const wId = tarea.trabajoId;

            // 1. Verificar si existe reporte específico de este sub-punto en localStorage (aislado por trabajoId)
            const candidateKeys = [
                wId && pIdx ? `report_data_${wId}_${pIdx}` : '',
                wId && subId ? (subId.startsWith(`${wId}_`) ? `report_data_${subId}` : `report_data_${wId}_${subId}`) : '',
                baseId && pIdx ? `report_data_${baseId}_${pIdx}` : '',
                wId ? `report_data_${wId}` : ''
            ].filter(Boolean);

            for (const k of candidateKeys) {
                const localData = localStorage.getItem(k);
                if (localData) {
                    try {
                        const parsed = JSON.parse(localData);
                        if (parsed && (parsed.imagenes || parsed.descripcion || parsed.reporteTienda)) {
                            setReportData(parsed);
                            setLoadingReport(false);
                            return;
                        }
                    } catch (e) {
                        console.error("Error al parsear reporte local:", e);
                    }
                }
            }

            let matchedReport: any = null;

            // 2. Intentar cargar desde API con el trabajoId
            try {
                const apiReport = await getReporteByTrabajoId(tarea.trabajoId);
                if (apiReport && apiReport.solucion) {
                    const parsed = typeof apiReport.solucion === 'string' ? JSON.parse(apiReport.solucion) : apiReport.solucion;
                    matchedReport = findMatchingSubReport(parsed, { ...tarea, trabajoId: wId });
                }
            } catch (_) {}

            // 3. Si no se encontró y pertenece a un grupo REQ o baseId, buscar en los otros trabajos del grupo
            if (!matchedReport && (tarea.baseId || tarea.rawJob?.descripcion)) {
                const grpId = tarea.rawJob ? getGroupId(tarea.rawJob.descripcion) : null;
                const searchJobIds = new Set<number>();
                if (tarea.baseId && tarea.baseId !== tarea.trabajoId) searchJobIds.add(Number(tarea.baseId));
                if (grpId) {
                    rawTareas.forEach(t => {
                        if (t.trabajoId && t.trabajoId !== tarea.trabajoId && t.rawJob?.descripcion?.includes(`[Grupo: ${grpId}]`)) {
                            searchJobIds.add(Number(t.trabajoId));
                        }
                    });
                }

                for (const jId of searchJobIds) {
                    try {
                        const gReport = await getReporteByTrabajoId(jId);
                        if (gReport && gReport.solucion) {
                            const parsedG = typeof gReport.solucion === 'string' ? JSON.parse(gReport.solucion) : gReport.solucion;
                            const m = findMatchingSubReport(parsedG, tarea);
                            if (m) {
                                matchedReport = m;
                                break;
                            }
                        }
                    } catch (_) {}
                }
            }

            if (matchedReport) {
                const finalReport = {
                    ...matchedReport,
                    id: matchedReport.id || tarea.id,
                    fecha: matchedReport.fecha || tarea.fecha,
                    tecnicoNombre: matchedReport.tecnicoNombre || tarea.tecnico,
                    descripcion: matchedReport.descripcion || tarea.descripcion,
                    reporteTienda: matchedReport.reporteTienda || matchedReport.descripcion || tarea.titulo,
                    imagenes: {
                        antes: matchedReport.imagenes?.antes || null,
                        durante: matchedReport.imagenes?.durante || null,
                        despues: matchedReport.imagenes?.despues || null
                    },
                    firmaEmpresa: matchedReport.firmaEmpresa || null
                };
                setReportData(finalReport);
                setLoadingReport(false);
                return;
            }

            // 4. Fallback: construir reporte limpio con las fotos y datos del sub-punto correspondiente
            const rawJobPhotos = (tarea.rawJob?.foto_url ? (typeof tarea.rawJob.foto_url === 'string' && tarea.rawJob.foto_url.startsWith('[') ? JSON.parse(tarea.rawJob.foto_url) : [tarea.rawJob.foto_url]) : []) as string[];
            const taskPhotos = (tarea.photos && tarea.photos.length > 0) ? tarea.photos : (pIdx && rawJobPhotos[pIdx - 1] ? [rawJobPhotos[pIdx - 1]] : []);

            setReportData({
                descripcion: tarea.descripcion || "Trabajo completado exitosamente.",
                reporteTienda: tarea.titulo || tarea.descripcion || "Trabajo completado exitosamente.",
                fecha: tarea.fecha,
                id: tarea.id,
                tecnicoNombre: tarea.tecnico || "Técnico",
                imagenes: {
                    antes: taskPhotos[0] || null,
                    durante: taskPhotos[1] || null,
                    despues: taskPhotos[2] || null
                },
                imagenesObservacion: taskPhotos.length > 3 ? taskPhotos.slice(3) : []
            });
            setLoadingReport(false);
        } catch (error) {
            console.error("Error al obtener reporte:", error);
            const taskPhotos = tarea.photos || [];
            setReportData({
                descripcion: tarea.descripcion || "Trabajo completado exitosamente.",
                reporteTienda: tarea.titulo || tarea.descripcion || "Trabajo completado exitosamente.",
                fecha: tarea.fecha,
                id: tarea.id,
                tecnicoNombre: tarea.tecnico || "Técnico",
                imagenes: {
                    antes: taskPhotos[0] || null,
                    durante: taskPhotos[1] || null,
                    despues: taskPhotos[2] || null
                },
                imagenesObservacion: taskPhotos.length > 3 ? taskPhotos.slice(3) : []
            });
            setLoadingReport(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}></h1>
            </div>

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
                {Object.keys(tareasAgrupadas).length > 0 ? (
                    Object.keys(tareasAgrupadas).map((empresa) => {
                        const tareasDeEmpresa = tareasAgrupadas[empresa];
                        // Agrupar por mes/año dentro de esta sucursal
                        const groupedByMonth = tareasDeEmpresa.reduce((acc, tarea) => {
                            const key = tarea.monthYear || 'Desconocido';
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(tarea);
                            return acc;
                        }, {} as Record<string, TareaHistorial[]>);

                        return (
                            <div key={empresa} style={{ marginBottom: '40px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px', borderBottom: '2px solid #eaeaea', paddingBottom: '10px' }}>
                                    Sucursal: {empresa}
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {Object.entries(groupedByMonth).map(([monthYear, tareasGroup]) => {
                                        const stateKey = `${empresa}-${monthYear}`;
                                        const isExpanded = expandedMonths[stateKey] !== false; // Default true
                                        return (
                                            <div key={monthYear} style={{ marginBottom: '10px' }}>
                                                <div 
                                                    onClick={() => setExpandedMonths(prev => ({ ...prev, [stateKey]: !isExpanded }))} 
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
                                                            const reportDataRaw = localStorage.getItem(`report_data_${tarea.id}`) || localStorage.getItem(`report_data_temporal_${tarea.id}`);
                                                            const reportData = reportDataRaw ? JSON.parse(reportDataRaw) : null;
                                                            const hasTaskReport = tarea.estado === 'Completa' || tarea.estado === 'Completado' || !!localStorage.getItem(`report_data_${tarea.id}`);
                                                            const isPreReport = !hasTaskReport && !!localStorage.getItem(`report_data_temporal_${tarea.id}`);
                                                            return (
                                                                <div
                                                                    key={`${tarea.id}-${index}`}
                                                                    className={styles.card}
                                                                    onClick={() => handleSelectTask(tarea)}
                                                                    title="Haz clic para ver más detalles"
                                                                    style={{ cursor: 'pointer', marginBottom: '0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
                                                                >
                                                                    <div className={`${styles.cardIndicator} ${styles.borderSuccess}`} style={{ background: isPreReport ? '#ff9800' : (!hasTaskReport ? '#94a3b8' : undefined) }}></div>
                                                                    <div className={styles.cardContent}>
                                                                        <div className={styles.cardIcon} style={{ background: isPreReport ? '#fff3e0' : (!hasTaskReport ? '#f1f5f9' : undefined) }}>
                                                                            <span className={styles.iconHistory} style={{ color: isPreReport ? '#e65100' : (!hasTaskReport ? '#94a3b8' : undefined) }}>📋</span>
                                                                        </div>

                                                                        <div className={styles.cardInfo}>
                                                                            <div className={styles.cardHeader}>
                                                                                <div>
                                                                                    <h3 className={styles.concepto} style={{ marginTop: '0' }}>{tarea.titulo}</h3>
                                                                                </div>
                                                                                <div className={`${styles.statusBadge} ${styles.badgeSuccess}`} style={{ background: isPreReport ? '#fff3e0' : (!hasTaskReport ? '#f1f5f9' : undefined), color: isPreReport ? '#e65100' : (!hasTaskReport ? '#64748b' : undefined) }}>
                                                                                    <span className={styles.statusIcon}>{hasTaskReport ? '✓' : (isPreReport ? '⚠️' : '⏳')}</span> {hasTaskReport ? 'Completado' : (isPreReport ? 'Pre-Reporte' : 'Pendiente')}
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {(() => {
                                                                                let descText = tarea.descripcion || '';
                                                                                if (reportData && reportData.descripcion && reportData.descripcion.trim() !== "") {
                                                                                    descText = reportData.descripcion;
                                                                                } else if (reportData && reportData.reporteTienda && reportData.reporteTienda.trim() !== "") {
                                                                                    descText = reportData.reporteTienda;
                                                                                }

                                                                                let notasText = "";
                                                                                const parts = descText.split(/Notas de cotizaci[oó]n:\s*-?/i);
                                                                                if (parts.length > 1) {
                                                                                    descText = parts[0].trim();
                                                                                    notasText = parts.slice(1).join('Notas de cotización:').trim();
                                                                                }
                                                                                
                                                                                return (
                                                                                    <div style={{ padding: '0 15px 15px' }}>
                                                                                        {descText && <p className={styles.descripcion} style={{ margin: 0, color: '#475569' }}>{descText}</p>}
                                                                                        {notasText && (
                                                                                            <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '13px', color: '#475569', border: '1px solid #e2e8f0' }}>
                                                                                                <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b', fontSize: '12px', textTransform: 'uppercase' }}>📝 Notas de cotización</strong>
                                                                                                <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                                    {notasText.split(/(?=\s-\s)|(?=^-)/).map(s => s.replace(/^-/, '').trim()).filter(s => s.length > 0).map((nota, i) => (
                                                                                                        <li key={i}>{nota}</li>
                                                                                                    ))}
                                                                                                </ul>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })()}

                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '30px', border: '1px solid #eee' }}>
                        <p style={{ color: '#666', fontSize: '16px' }}>No hay labores o diagnósticos finalizados en el historial.</p>
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

export default Historial;

