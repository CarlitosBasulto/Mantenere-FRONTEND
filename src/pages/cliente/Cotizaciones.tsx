import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./Cotizaciones.module.css";
import { HiOutlineDocumentText, HiOutlineCheckCircle, HiOutlineXCircle } from "react-icons/hi2";
import { useAuth } from "../../context/AuthContext";
import menuStyles from "../../components/Menu.module.css";
import { getTrabajos } from "../../services/trabajosService";
import { getCotizacionByTrabajoId } from "../../services/cotizacionesService";
import { getNegocios } from "../../services/negociosService";

// Interfaz para el Trabajo con Cotización
interface TrabajoCotizado {
    id: number | string;
    baseId?: number;
    pointIndex?: number;
    totalPoints?: number;
    isSOS?: boolean;
    titulo: string;
    ubicacion: string;
    fecha: string;
    estado: string;
    descripcion?: string;
    cotizacion?: {
        id?: number;
        costo: string;
        notas: string;
        archivo: string;
        fecha: string;
    };
    rawJob?: any;
}

interface CotizacionesProps {
    businessId?: number;
}

const isJobSOS = (job: any): boolean => {
    return job?.prioridad === 'Alta' || job?.titulo?.includes('SOS') || job?.descripcion?.includes('SOS') || job?.tipo === 'SOS';
};

const formatCotizacionTitle = (tipo: string, pointIdx?: number, isSOS?: boolean): string => {
    const cleanTipo = (tipo || 'Servicio')
        .replace(/^🚨\s*SOS:\s*/i, '')
        .replace(/^SOS:\s*/i, '')
        .replace(/\s*\(Punto\s*\d+\)/i, '')
        .replace(/\s*\(Trabajo\s*\d+\)/i, '')
        .trim() || 'Servicio';
    
    const taskSuffix = pointIdx ? `(Trabajo ${pointIdx})` : '';
    if (isSOS) {
        return `🚨 SOS: ${cleanTipo} ${taskSuffix}`.trim();
    }
    return `${cleanTipo} ${taskSuffix}`.trim();
};

const getGroupId = (descripcion?: string, titulo?: string, createdAt?: string, negocioId?: number): string | null => {
    if (descripcion) {
        const match = descripcion.match(/\[Grupo:\s*([^\]]+)\]/i);
        if (match) return match[1];
    }
    if (titulo) {
        const pointMatch = titulo.match(/^(.*?)\s*\(Punto\s*(\d+)\)/i);
        if (pointMatch) {
            const cleanTitle = pointMatch[1].trim();
            const dateKey = createdAt ? createdAt.substring(0, 10) : 'nodate';
            return `TITLE_${negocioId || 0}_${dateKey}_${cleanTitle}`;
        }
    }
    return null;
};

const cleanDescriptionText = (desc?: string): string => {
    if (!desc) return "Sin descripción.";
    let cleaned = desc;
    if (cleaned.includes('|||')) {
        cleaned = cleaned.split('|||')[0].trim();
    }
    cleaned = cleaned.replace(/\[Grupo:\s*[^\]]+\]\s*/gi, '').trim();
    return cleaned || "Sin descripción.";
};

const getBusinessFullName = (negocio?: any): string => {
    if (!negocio) return '';
    const name = negocio.nombre || '';
    const plaza = negocio.nombrePlaza || negocio.nombre_plaza || '';
    if (name && plaza) return `${name} - ${plaza}`;
    if (name) return name;
    if (plaza) return plaza;
    return '';
};

const extractServiceType = (job: any, pointIdx?: number, subId?: string | number): string => {
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
    const rawDesc = job?.descripcion || '';
    if (rawDesc.includes('|||SERVICE_DATA|||')) {
        try {
            const parts = rawDesc.split('|||SERVICE_DATA|||');
            const dataStr = parts[1].split('|||')[0].trim();
            const serviceData = JSON.parse(dataStr);
            if (pointIdx !== undefined && serviceData.items && Array.isArray(serviceData.items) && serviceData.items[pointIdx - 1]) {
                const it = serviceData.items[pointIdx - 1];
                const itemTipo = (it.tipo === 'Otro' ? itemTipoCustom(it) : it.tipo) || it.tipoActividad;
                if (itemTipo) return itemTipo;
            }
            if (serviceData.tipoServicio) return serviceData.tipoServicio;
        } catch (e) {}
    }
    if (job?.titulo) {
        const titleFirst = job.titulo.split(' - ')[0].trim();
        if (titleFirst && !titleFirst.toLowerCase().includes('solicitud') && !titleFirst.toLowerCase().includes('requerimiento')) {
            return titleFirst;
        }
    }
    return job?.tipo || 'Servicio';
};

const itemTipoCustom = (it: any) => it.customTipo || it.tipo;

const parseJobDate = (fechaStr?: string, createdAt?: string): string => {
    if (fechaStr) {
        if (fechaStr.includes('-')) {
            const parts = fechaStr.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const d = new Date(year, month, day);
                if (!isNaN(d.getTime())) return d.toLocaleDateString('es-MX');
            }
        }
        if (fechaStr.includes('/')) {
            return fechaStr;
        }
        const dateObj = new Date(fechaStr);
        if (!isNaN(dateObj.getTime())) return dateObj.toLocaleDateString('es-MX');
    }
    if (createdAt) {
        const dateObj = new Date(createdAt);
        if (!isNaN(dateObj.getTime())) return dateObj.toLocaleDateString('es-MX');
    }
    return new Date().toLocaleDateString('es-MX');
};

const decomposeJobToCotizaciones = (job: any, baseQuoteData?: any): TrabajoCotizado[] => {
    const dateFormatted = parseJobDate(job.fecha_programada, job.created_at);
    const ubicacion = getBusinessFullName(job.negocio) || job.negocio?.ubicacion || job.negocio?.nombre || "Sucursal";
    const isSOS = isJobSOS(job);
    const rawDesc = job.descripcion || '';

    // 1. Caso: múltiples ítems estructurados en serviceData.items o dentro de |||SERVICE_DATA|||
    let itemsFromDesc: any[] | null = null;
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
        const total = itemsToProcess.length;
        return itemsToProcess.map((item: any, idx: number) => {
            const pIdx = idx + 1;
            const subId = `${job.id}_${pIdx}`;
            const subTipo = (item.tipo === 'Otro' ? item.customTipo : item.tipo) || extractServiceType(job, pIdx, subId);
            const subDesc = cleanDescriptionText(item.descripcion || job.descripcion);
            return {
                id: subId,
                baseId: job.id,
                pointIndex: pIdx,
                totalPoints: total,
                isSOS,
                titulo: formatCotizacionTitle(subTipo, pIdx, isSOS),
                descripcion: subDesc,
                estado: job.estado || "Cotización Enviada",
                ubicacion,
                fecha: dateFormatted,
                cotizacion: baseQuoteData || job.cotizacion,
                rawJob: job
            };
        });
    }

    // 2. Caso: Puntos numerados en la descripción (ej. "1. [Electricidad] ... \n\n 2. [Plomería] ...")
    const cleanRaw = cleanDescriptionText(rawDesc);
    const regexPoint = /(?:^|\n+)(\d+)\.\s*(?:\[([^\]]+)\]\s*)?([\s\S]*?)(?=(?:\n+\d+\.\s*)|$)/g;
    const matches = Array.from(cleanRaw.matchAll(regexPoint));

    if (matches && matches.length > 1) {
        const total = matches.length;
        return matches.map((m, idx) => {
            const pIdx = idx + 1;
            const subId = `${job.id}_${pIdx}`;
            const subTipo = m[2] ? m[2].trim() : extractServiceType(job, pIdx, subId);
            const subDesc = m[3] ? m[3].trim() : '';
            return {
                id: subId,
                baseId: job.id,
                pointIndex: pIdx,
                totalPoints: total,
                isSOS,
                titulo: formatCotizacionTitle(subTipo, pIdx, isSOS),
                descripcion: subDesc || 'Sin descripción.',
                estado: job.estado || "Cotización Enviada",
                ubicacion,
                fecha: dateFormatted,
                cotizacion: baseQuoteData || job.cotizacion,
                rawJob: job
            };
        });
    }

    // Por defecto: 1 solo trabajo
    const singleTipo = extractServiceType(job);
    return [{
        id: job.id,
        baseId: job.id,
        pointIndex: 1,
        totalPoints: 1,
        isSOS,
        titulo: formatCotizacionTitle(singleTipo || job.titulo, undefined, isSOS),
        descripcion: cleanDescriptionText(job.descripcion),
        estado: job.estado || "Cotización Enviada",
        ubicacion,
        fecha: dateFormatted,
        cotizacion: baseQuoteData || job.cotizacion,
        rawJob: job
    }];
};

const Cotizaciones: React.FC<CotizacionesProps> = ({ businessId }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [rawCotizaciones, setRawCotizaciones] = useState<TrabajoCotizado[]>([]);

    const [searchText, setSearchText] = useState("");
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("Todas");
    const [tempFilter, setTempFilter] = useState("Todas");

    useEffect(() => {
        if (!user) return;

        const fetchCotizaciones = async () => {
            try {
                // 1. Obtener los negocios del cliente actual
                const negociosIds = new Set<number>();
                const apiNegociosRaw = localStorage.getItem('negocios_list');
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

                try {
                    const apiNegocios = await getNegocios();
                    if (Array.isArray(apiNegocios)) {
                        apiNegocios.forEach((n: any) => {
                            if (n.user_id === user.id || n.dueno === user.name) {
                                negociosIds.add(n.id);
                            }
                        });
                    }
                } catch (e) {}

                const apiJobs = await getTrabajos();
                if (!Array.isArray(apiJobs)) return;

                // Filtrar según permisos del cliente o negocio
                const userFilteredJobs = apiJobs.filter((job: any) => {
                    if (businessId && job.negocio_id !== businessId) return false;
                    if (user.role === 'admin' || user.role === 'cliente') return true;
                    return negociosIds.has(job.negocio_id) || 
                           job.negocio?.user_id === user.id || 
                           job.negocio?.dueno === user.name ||
                           (user.role === 'encargado' && job.negocio_id === user.negocio_id);
                });

                // Detectar grupos [Grupo: REQ-xxxx]
                const groupedByReq: { [grpId: string]: any[] } = {};
                const nonGroupedJobs: any[] = [];

                userFilteredJobs.forEach((job: any) => {
                    const grpId = getGroupId(job.descripcion, job.titulo, job.created_at, job.negocio_id);
                    if (grpId) {
                        if (!groupedByReq[grpId]) groupedByReq[grpId] = [];
                        groupedByReq[grpId].push(job);
                    } else {
                        nonGroupedJobs.push(job);
                    }
                });

                const allCotizados: TrabajoCotizado[] = [];

                // 1. Procesar grupos [Grupo: REQ-xxxx] o Puntos agrupados
                for (const [, jobsInGroup] of Object.entries(groupedByReq)) {
                    if (!jobsInGroup || jobsInGroup.length === 0) continue;
                    jobsInGroup.sort((a, b) => Number(a.id) - Number(b.id));
                    const baseJob = jobsInGroup[0];

                    // Revisar si algún trabajo del grupo tiene estado de cotización / finalizado
                    const groupHasQuote = jobsInGroup.some(j => 
                        j.cotizacion || 
                        ["Cotización Enviada", "Cotización Aceptada", "Cotización Aprobada", "Cotización Rechazada", "Asignado", "En Proceso", "Finalizado", "Completado"].includes(j.estado) ||
                        j.descripcion?.includes('|||QUOTE_DATA|||') ||
                        localStorage.getItem(`quote_history_${j.id}`)
                    );

                    if (groupHasQuote) {
                        // Buscar datos de cotización base (revisando baseJob o cualquiera en el grupo)
                        let baseQuoteData = baseJob.cotizacion;
                        if (!baseQuoteData) {
                            for (const gJob of jobsInGroup) {
                                const savedHistory = localStorage.getItem(`quote_history_${gJob.id}`);
                                if (savedHistory) {
                                    try {
                                        const historyArr = JSON.parse(savedHistory);
                                        if (historyArr && historyArr.length > 0) {
                                            const lastH = historyArr[historyArr.length - 1];
                                            baseQuoteData = {
                                                id: lastH.id || gJob.id,
                                                costo: lastH.costo || lastH.monto || "0",
                                                notas: lastH.notas || lastH.descripcion || "",
                                                archivo: lastH.archivo || "",
                                                fecha: lastH.fecha || parseJobDate(gJob.fecha_programada, gJob.created_at)
                                            };
                                            break;
                                        }
                                    } catch(e) {}
                                }
                            }
                        }

                        if (!baseQuoteData) {
                            try {
                                const coti = await getCotizacionByTrabajoId(baseJob.id);
                                if (coti && coti.length > 0) {
                                    const mainCoti = coti[0];
                                    baseQuoteData = {
                                        id: mainCoti.id,
                                        costo: mainCoti.monto,
                                        notas: mainCoti.descripcion,
                                        archivo: mainCoti.archivo,
                                        fecha: mainCoti.updated_at ? parseJobDate(mainCoti.updated_at) : parseJobDate(baseJob.fecha_programada, baseJob.created_at)
                                    };
                                }
                            } catch(e) {}
                        }

                        if (!baseQuoteData && baseJob.descripcion?.includes('|||QUOTE_DATA|||')) {
                            try {
                                const parts = baseJob.descripcion.split('|||QUOTE_DATA|||');
                                const quoteData = JSON.parse(parts[1].split('|||')[0].trim());
                                const totalCosto = (quoteData.conceptos || []).reduce((acc: number, c: any) => acc + (parseFloat(c.costo) || 0), 0);
                                baseQuoteData = {
                                    id: baseJob.id,
                                    costo: totalCosto > 0 ? String(totalCosto) : "0",
                                    notas: quoteData.comentarios || (quoteData.conceptos || []).map((c: any) => c.descripcion).join(', '),
                                    archivo: "",
                                    fecha: parseJobDate(baseJob.fecha_programada, baseJob.created_at)
                                };
                            } catch(e) {}
                        }

                        // Sincronizar estado del grupo: si alguno está aceptado/finalizado, todos lo están
                        const isFinalizedOrAccepted = jobsInGroup.some(j => ["Finalizado", "Completado", "Cotización Aceptada", "Cotización Aprobada"].includes(j.estado));
                        const groupEstado = isFinalizedOrAccepted ? "Finalizado" : baseJob.estado;

                        const isSOSGroup = jobsInGroup.some(isJobSOS);
                        const businessFull = getBusinessFullName(baseJob.negocio);
                        const total = jobsInGroup.length;

                        jobsInGroup.forEach((gJob, idx) => {
                            const pIdx = idx + 1;
                            const isSingleSOS = isSOSGroup || isJobSOS(gJob);
                            let serviceType = extractServiceType(gJob, pIdx, gJob.id);
                            if (serviceType === 'Servicio' || serviceType === 'Mantenimiento') {
                                const fromBase = extractServiceType(baseJob, pIdx, `${baseJob.id}_${pIdx}`);
                                if (fromBase && fromBase !== 'Servicio') {
                                    serviceType = fromBase;
                                }
                            }

                            const cleanDesc = cleanDescriptionText(gJob.descripcion);

                            allCotizados.push({
                                id: gJob.id,
                                baseId: baseJob.id,
                                pointIndex: pIdx,
                                totalPoints: total,
                                isSOS: isSingleSOS,
                                titulo: formatCotizacionTitle(serviceType, pIdx, isSingleSOS),
                                ubicacion: businessFull || gJob.negocio?.ubicacion || gJob.negocio?.nombre || "Sucursal",
                                fecha: parseJobDate(gJob.fecha_programada, gJob.created_at),
                                estado: gJob.estado || groupEstado || "Cotización Enviada",
                                descripcion: cleanDesc,
                                cotizacion: baseQuoteData || gJob.cotizacion,
                                rawJob: gJob
                            });
                        });
                    }
                }

                // 2. Procesar trabajos individuales no agrupados
                for (const job of nonGroupedJobs) {
                    const isCotizado = job.cotizacion || 
                        ["Cotización Enviada", "Cotización Aceptada", "Cotización Aprobada", "Cotización Rechazada", "Asignado", "En Proceso", "Finalizado", "Completado"].includes(job.estado) ||
                        job.descripcion?.includes('|||QUOTE_DATA|||') ||
                        localStorage.getItem(`quote_history_${job.id}`);

                    if (isCotizado) {
                        let cotizacionData = job.cotizacion;
                        if (!cotizacionData) {
                            const savedHistory = localStorage.getItem(`quote_history_${job.id}`);
                            if (savedHistory) {
                                try {
                                    const historyArr = JSON.parse(savedHistory);
                                    if (historyArr && historyArr.length > 0) {
                                        const lastH = historyArr[historyArr.length - 1];
                                        cotizacionData = {
                                            id: lastH.id || job.id,
                                            costo: lastH.costo || lastH.monto || "0",
                                            notas: lastH.notas || lastH.descripcion || "",
                                            archivo: lastH.archivo || "",
                                            fecha: lastH.fecha || parseJobDate(job.fecha_programada, job.created_at)
                                        };
                                    }
                                } catch(e) {}
                            }
                        }

                        if (!cotizacionData) {
                            try {
                                const coti = await getCotizacionByTrabajoId(job.id);
                                if (coti && coti.length > 0) {
                                    const mainCoti = coti[0];
                                    cotizacionData = {
                                        id: mainCoti.id,
                                        costo: mainCoti.monto,
                                        notas: mainCoti.descripcion,
                                        archivo: mainCoti.archivo,
                                        fecha: mainCoti.updated_at ? parseJobDate(mainCoti.updated_at) : parseJobDate(job.fecha_programada, job.created_at)
                                    };
                                }
                            } catch (e) {}
                        }

                        if (!cotizacionData && job.descripcion?.includes('|||QUOTE_DATA|||')) {
                            try {
                                const parts = job.descripcion.split('|||QUOTE_DATA|||');
                                const quoteData = JSON.parse(parts[1].split('|||')[0].trim());
                                const totalCosto = (quoteData.conceptos || []).reduce((acc: number, c: any) => acc + (parseFloat(c.costo) || 0), 0);
                                cotizacionData = {
                                    id: job.id,
                                    costo: totalCosto > 0 ? String(totalCosto) : "0",
                                    notas: quoteData.comentarios || (quoteData.conceptos || []).map((c: any) => c.descripcion).join(', '),
                                    archivo: "",
                                    fecha: parseJobDate(job.fecha_programada, job.created_at)
                                };
                            } catch(e) {}
                        }

                        const decomposed = decomposeJobToCotizaciones(job, cotizacionData);
                        allCotizados.push(...decomposed);
                    }
                }

                allCotizados.sort((a, b) => Number(b.id) - Number(a.id));
                setRawCotizaciones(allCotizados);
            } catch (error) {
                console.error("Error cargando cotizaciones:", error);
            }
        };

        fetchCotizaciones();
    }, [user, businessId]);


    // Lógica de Filtrado Reactiva (en vivo)
    const filtradas = rawCotizaciones.filter(coti => {
        const matchesText = (coti.titulo || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (coti.ubicacion || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (coti.descripcion || '').toLowerCase().includes(searchText.toLowerCase());

        let matchesStatus = true;
        if (filterStatus !== "Todas") {
            const isPagadaFinalizada = ["Cotización Aceptada", "Cotización Aprobada", "Asignado", "En Proceso", "Finalizado", "Completado"].includes(coti.estado);

            if (filterStatus === "Aceptadas" && !isPagadaFinalizada) matchesStatus = false;
            if (filterStatus === "Rechazadas" && coti.estado !== "Cotización Rechazada") matchesStatus = false;
            if (filterStatus === "Pendientes" && coti.estado !== "Cotización Enviada") matchesStatus = false;
        }
        return matchesText && matchesStatus;
    });

    // Agrupar por empresa (luego de filtrar)
    type CotizacionesAgrupadas = { [nombreEmpresa: string]: TrabajoCotizado[] };
    const cotizacionesAgrupadas: CotizacionesAgrupadas = {};
    filtradas.forEach(coti => {
        const empresa = coti.ubicacion || "Otras Sugerencias";
        if (!cotizacionesAgrupadas[empresa]) cotizacionesAgrupadas[empresa] = [];
        cotizacionesAgrupadas[empresa].push(coti);
    });

    const handleApplyFilter = () => {
        setFilterStatus(tempFilter);
        setIsFilterModalOpen(false);
    };

    // Helper para determinar la ruta base
    const getBasePath = () => {
        if (location.pathname.startsWith('/menu') || location.pathname.startsWith('/admin') || user?.role === 'admin') return '/menu';
        if (location.pathname.startsWith('/gerente-sucursal') || location.pathname.startsWith('/encargado') || user?.role === 'gerente-sucursal' || user?.role === 'encargado') return '/gerente-sucursal';
        if (location.pathname.startsWith('/autonomo') || user?.role === 'autonomo' || user?.role === 'admin-autonomo' || user?.role === 'administrador-general') return '/autonomo';
        if (location.pathname.startsWith('/tecnico-autonomo') || user?.role === 'tecnico-autonomo') return '/tecnico-autonomo';
        if (location.pathname.startsWith('/tecnico') || user?.role === 'tecnico' || user?.role === 'tecnico-normal') return '/tecnico';
        return '/cliente';
    };

    // Calcular estatus visual basado en el estado del trabajo
    const getEstatusInfo = (estado: string) => {
        if (["Cotización Aceptada", "Cotización Aprobada", "Asignado", "En Proceso"].includes(estado)) return { text: "Aceptada", cssClass: styles.badgeAccepted, borderClass: styles.borderAccepted };
        if (estado === "Finalizado" || estado === "Completado") return { text: "Finalizada", cssClass: styles.badgeAccepted, borderClass: styles.borderAccepted };
        if (estado === "Cotización Rechazada") return { text: "Rechazada", cssClass: styles.badgeRejected, borderClass: styles.borderRejected };
        return { text: "Pendiente", cssClass: styles.badgePending, borderClass: styles.borderPending };
    };

    return (
        <div className={styles.container}>
            {/* BUSCADOR Y FILTRO */}
            <div className={styles.searchSection}>
                <div className={menuStyles.searchCard}>
                    <input
                        type="text"
                        placeholder="Buscar cotización, detalle o sucursal..."
                        className={menuStyles.searchInput}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                    <button
                        className={menuStyles.filterBtn}
                        onClick={() => { setTempFilter(filterStatus); setIsFilterModalOpen(true); }}
                        title="Filtrar cotizaciones"
                    >
                        <span style={{ fontSize: '18px' }}>⚙️</span>
                    </button>
                </div>
            </div>

            <div className={styles.list}>
                {Object.keys(cotizacionesAgrupadas).length > 0 ? (
                    Object.keys(cotizacionesAgrupadas).map((empresa) => (
                        <div key={empresa} style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '20px', borderBottom: '2px solid #eaeaea', paddingBottom: '10px' }}>
                                Sucursal: {empresa}
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {cotizacionesAgrupadas[empresa].map((cotizacion) => {
                                    const estatusInfo = getEstatusInfo(cotizacion.estado);
                                    const basePath = getBasePath();
                                    const isAccepted = estatusInfo.text === "Aceptada" || estatusInfo.text === "Finalizada";

                                    return (
                                        <div 
                                            key={cotizacion.id} 
                                            className={styles.card}
                                            onClick={() => navigate(`${basePath}/trabajo-detalle/${cotizacion.baseId || cotizacion.id}?tab=cotizacion`)}
                                            style={{ cursor: 'pointer', marginBottom: '0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}
                                        >
                                            <div className={`${styles.cardIndicator} ${estatusInfo.borderClass}`}></div>
                                            <div className={styles.cardContent}>
                                                <div className={styles.cardIcon} style={{ background: isAccepted ? '#e8f5e9' : (estatusInfo.text === 'Rechazada' ? '#fee2e2' : '#fef3c7') }}>
                                                    <span className={styles.iconDoc} style={{ color: isAccepted ? '#2e7d32' : (estatusInfo.text === 'Rechazada' ? '#c62828' : '#b45309') }}>
                                                        📋
                                                    </span>
                                                </div>

                                                <div className={styles.cardInfo}>
                                                    <div className={styles.cardHeader}>
                                                        <div>
                                                            <h3 className={styles.concepto} style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                <span>{cotizacion.titulo}</span>
                                                            </h3>
                                                            {((cotizacion.totalPoints && cotizacion.totalPoints > 1) || cotizacion.isSOS) && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                                    {cotizacion.isSOS ? (
                                                                        <span style={{
                                                                            fontSize: '11px',
                                                                            background: '#fff1f2',
                                                                            color: '#e11d48',
                                                                            border: '1px solid #fecdd3',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '12px',
                                                                            fontWeight: '700',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px'
                                                                        }}>
                                                                            🚨 Solicitud SOS {cotizacion.totalPoints && cotizacion.totalPoints > 1 ? `• Trabajo ${cotizacion.pointIndex || 1} de ${cotizacion.totalPoints}` : ''}
                                                                        </span>
                                                                    ) : (cotizacion.totalPoints && cotizacion.totalPoints > 1 ? (
                                                                        <span style={{
                                                                            fontSize: '11px',
                                                                            background: '#eff6ff',
                                                                            color: '#1d4ed8',
                                                                            border: '1px solid #bfdbfe',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '12px',
                                                                            fontWeight: '700',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px'
                                                                        }}>
                                                                            🔗 Solicitud Conjunta • Trabajo {cotizacion.pointIndex || 1} de {cotizacion.totalPoints}
                                                                        </span>
                                                                    ) : null)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={`${styles.statusBadge} ${estatusInfo.cssClass}`}>
                                                            <span className={styles.statusIcon}>
                                                                {isAccepted ? '✓' : (estatusInfo.text === "Rechazada" ? '✗' : '⏳')}
                                                            </span>
                                                            {estatusInfo.text}
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: '4px' }}>
                                                        {cotizacion.descripcion && (
                                                            <p className={styles.descripcion} style={{ margin: 0, color: '#64748b' }}>
                                                                {cotizacion.descripcion}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '30px', border: '1px solid #eee' }}>
                        <p style={{ color: '#666', fontSize: '16px' }}>No tienes cotizaciones registradas por el momento.</p>
                    </div>
                )}
            </div>

            {/* MODAL DE FILTRO */}
            {isFilterModalOpen && (
                <div className={menuStyles.modalOverlay}>
                    <div className={menuStyles.modalContent}>
                        <h3 className={menuStyles.modalTitle}>Filtrar Cotizaciones</h3>

                        <div className={menuStyles.filterSection}>
                            <span className={menuStyles.filterSubtitle}>Estatus</span>
                            <div className={menuStyles.radioGroup}>
                                {["Todas", "Pendientes", "Aceptadas", "Rechazadas"].map(status => (
                                    <label key={status} className={menuStyles.radioLabel}>
                                        <input
                                            type="radio"
                                            name="status"
                                            checked={tempFilter === status}
                                            onChange={() => setTempFilter(status)}
                                        />
                                        <span>{status}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className={menuStyles.modalActions}>
                            <button className={menuStyles.applyBtn} onClick={handleApplyFilter}>Aplicar Filtro</button>
                            <button className={menuStyles.cancelBtn} onClick={() => setIsFilterModalOpen(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cotizaciones;
