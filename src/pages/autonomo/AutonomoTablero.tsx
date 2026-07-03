import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AutonomoTablero.module.css';
import { getTrabajos } from '../../services/trabajosService';
import { getUsers } from '../../services/usersService';
import { getActividadesByTrabajo } from '../../services/actividadesService';
import { HiOutlineBuildingOffice, HiOutlineUser, HiOutlineClock, HiOutlineBriefcase, HiOutlineCheckCircle, HiArrowPath } from 'react-icons/hi2';

interface Trabajo {
    id: number;
    titulo: string;
    descripcion: string;
    estado: string;
    prioridad: string;
    tipo: string;
    created_at: string;
    fecha_programada?: string;
    admin_autonomo_id?: number;
    negocio?: {
        nombre: string;
    };
    trabajador?: {
        nombre: string;
    };
    // Extra fields fetched
    subgerenteName?: string;
    horaLlegada?: string;
}

const AutonomoTablero: React.FC = () => {
    const navigate = useNavigate();
    const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            // 1. Fetch trabajos and users
            const [trabajosData, usersData] = await Promise.all([
                getTrabajos(),
                getUsers()
            ]);

            // 2. Map subgerentes
            const subgerentesMap = new Map<number, string>();
            usersData.forEach((u: any) => {
                if (u.role?.name === 'admin-autonomo') {
                    subgerentesMap.set(u.id, u.name);
                }
            });

            // 3. Process jobs
            let processedJobs: Trabajo[] = trabajosData.map((t: any) => ({
                ...t,
                subgerenteName: t.admin_autonomo_id ? (subgerentesMap.get(t.admin_autonomo_id) || 'Asignado') : 'Sin Asignar'
            }));

            // 4. Extract "horaLlegada" for jobs in "En Proceso" / "Visita"
            // We fetch the activities for jobs that might have an arrival time.
            const jobsToCheckArrival = processedJobs.filter(t => t.estado === 'En Proceso' && t.tipo === 'Visita');
            
            await Promise.all(jobsToCheckArrival.map(async (job) => {
                try {
                    const acts = await getActividadesByTrabajo(job.id);
                    // Search for arrival time in activities
                    let arrivalTime = null;
                    for (const act of acts) {
                        if (act.descripcion && act.descripcion.includes('|||SERVICE_DATA|||')) {
                            const parts = act.descripcion.split('|||SERVICE_DATA|||');
                            if (parts.length > 1) {
                                try {
                                    // Handle string correctly by replacing newlines or other stuff if needed before parse
                                    let jsonStr = parts[1].split('|||')[0].trim();
                                    const parsed = JSON.parse(jsonStr);
                                    if (parsed.llegadaConfirmada && parsed.horaLlegada) {
                                        arrivalTime = parsed.horaLlegada;
                                    }
                                } catch (e) { }
                            }
                        }
                    }
                    if (arrivalTime) {
                        job.horaLlegada = arrivalTime;
                    }
                } catch (err) {
                    console.error("Error fetching activities for job", job.id);
                }
            }));

            setTrabajos(processedJobs);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Error fetching tablero data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Polling every 15 seconds
        const interval = setInterval(() => {
            fetchData(true);
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '380px' }}>
                <h3 style={{ color: '#64748b' }}>Cargando Tablero...</h3>
            </div>
        );
    }

    // Filter columns
    const colSolicitudes = trabajos.filter(t => ['Solicitud', 'Pendiente'].includes(t.estado));
    const colAceptadas = trabajos.filter(t => ['Aceptada', 'Asignado', 'Cotización Aceptada', 'Cotización Enviada'].includes(t.estado));
    const colVisita = trabajos.filter(t => t.estado === 'En Proceso' && t.tipo === 'Visita');
    const colProceso = trabajos.filter(t => t.estado === 'En Proceso' && t.tipo !== 'Visita');
    const colFinalizadas = trabajos.filter(t => ['Finalizado', 'Completado'].includes(t.estado));

    const renderCard = (t: Trabajo) => (
        <div key={t.id} className={styles.card} onClick={() => navigate(`/autonomo/trabajo-detalle/${t.id}`)}>
            <div className={styles.cardHeader}>
                <span className={styles.jobId}>#{t.id}</span>
                <span className={`${styles.priorityBadge} ${t.prioridad === 'Alta' ? styles.priorityAlta : (t.prioridad === 'Media' ? styles.priorityMedia : styles.priorityBaja)}`}>
                    {t.prioridad}
                </span>
            </div>
            
            <h4 className={styles.cardTitle}>{t.titulo}</h4>
            
            <div className={styles.infoRow}>
                <HiOutlineBuildingOffice size={16} />
                <span className={styles.strongText}>{t.negocio?.nombre || 'Sin sucursal'}</span>
            </div>
            
            {t.subgerenteName && t.subgerenteName !== 'Sin Asignar' && (
                <div className={styles.infoRow}>
                    <HiOutlineUser size={16} />
                    <span>Subgerente: <span className={styles.strongText}>{t.subgerenteName}</span></span>
                </div>
            )}

            {t.trabajador && (
                <div className={styles.infoRow}>
                    <HiOutlineBriefcase size={16} />
                    <span>Técnico: <span className={styles.strongText}>{t.trabajador.nombre}</span></span>
                </div>
            )}

            {t.horaLlegada && (
                <div className={styles.arrivalHighlight}>
                    <HiOutlineCheckCircle size={18} />
                    <span>Llegada confirmada: <span className={styles.strongText}>{t.horaLlegada}</span></span>
                </div>
            )}

            <div className={styles.cardFooter}>
                <span className={styles.dateText}>
                    <HiOutlineClock size={14} />
                    {new Date(t.created_at).toLocaleDateString()}
                </span>
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>{t.tipo}</span>
            </div>
        </div>
    );

    return (
        <div className={styles.tableroContainer}>
            <div className={styles.header}>
                <div>
                    <h1>Tablero de Operaciones</h1>
                    <p>Monitoreo en tiempo real de todas las sucursales</p>
                </div>
                {refreshing && (
                    <div className={styles.refreshBadge}>
                        <HiArrowPath className={styles.spinIcon} /> Actualizando...
                    </div>
                )}
            </div>

            <div className={styles.board}>
                {/* SOLICITUDES */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colSolicitudes}`}>
                        <div className={styles.columnTitle}>Solicitudes</div>
                        <span className={styles.columnBadge}>{colSolicitudes.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colSolicitudes.map(renderCard)}
                    </div>
                </div>

                {/* ACEPTADAS */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colAceptadas}`}>
                        <div className={styles.columnTitle}>Aceptadas</div>
                        <span className={styles.columnBadge}>{colAceptadas.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colAceptadas.map(renderCard)}
                    </div>
                </div>

                {/* EN VISITA */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colVisita}`}>
                        <div className={styles.columnTitle}>En Visita</div>
                        <span className={styles.columnBadge}>{colVisita.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colVisita.map(renderCard)}
                    </div>
                </div>

                {/* EN PROCESO */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colProceso}`}>
                        <div className={styles.columnTitle}>En Proceso</div>
                        <span className={styles.columnBadge}>{colProceso.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colProceso.map(renderCard)}
                    </div>
                </div>

                {/* FINALIZADAS */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colFinalizadas}`}>
                        <div className={styles.columnTitle}>Finalizadas</div>
                        <span className={styles.columnBadge}>{colFinalizadas.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colFinalizadas.map(renderCard)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutonomoTablero;
