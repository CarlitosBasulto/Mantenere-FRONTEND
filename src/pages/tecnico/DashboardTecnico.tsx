import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DashboardTecnico.module.css';
import { getTrabajos } from '../../services/trabajosService';
import { getUsers } from '../../services/usersService';
import { HiOutlineUser, HiOutlineClock, HiArrowPath, HiOutlineBuildingOffice } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { isCardSeen, markCardAsSeen } from '../../utils/seenCards';

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
    trabajador_id?: number;
    negocio?: {
        nombre: string;
    };
    trabajador?: {
        user_id: number;
        nombre: string;
    };
    // Extra fields fetched
    subgerenteName?: string;
    horaLlegada?: string;
    hora_llegada?: string;
}

const DashboardTecnico: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());


    const fetchData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            // 1. Fetch trabajos and users
            const [trabajosData, usersData] = await Promise.all([
                getTrabajos(),
                getUsers()
            ]);

            // 2. Map subgerentes / encargados
            const subgerentesMap = new Map<number, string>();
            usersData.forEach((u: any) => {
                if (u.role?.name === 'admin-autonomo' || u.role?.name === 'encargado' || u.role?.name === 'subgerente') {
                    subgerentesMap.set(u.id, u.name);
                }
            });

            // 3. Process and filter jobs for this technician
            let processedJobs: Trabajo[] = trabajosData
                .filter((t: any) => {
                    const isUserMatch = 
                        t.trabajador?.user_id === user?.id || 
                        t.trabajador_id === user?.id ||
                        t.trabajador_id === (user as any)?.trabajador?.id ||
                        t.trabajador?.id === (user as any)?.trabajador?.id ||
                        (t.tecnico && user?.name && t.tecnico.toLowerCase() === user.name.toLowerCase());
                    return isUserMatch;
                })
                .map((t: any) => {
                    const encName = t.encargado || t.negocio?.encargado || (t.admin_autonomo_id ? subgerentesMap.get(t.admin_autonomo_id) : null);
                    return {
                        ...t,
                        subgerenteName: (encName && encName !== 'Asignado') ? encName : (t.encargado || t.negocio?.encargado || '')
                    };
                });

            // 4. hora_llegada is natively present in the 'hora_llegada' column

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
    }, [user]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '380px' }}>
                <h3 style={{ color: '#64748b' }}>Cargando Tablero...</h3>
            </div>
        );
    }

    // Filter columns as per request:
    // 1. Solicitudes pendientes
    const colSolicitudes = trabajos.filter(t => ['Solicitud', 'Pendiente'].includes(t.estado));
    
    // 2. Asignaciones de visitas (Visitas pendientes de evaluación/cotización)
    const colVisita = trabajos.filter(t => 
        ['En Proceso', 'Asignado', 'Aceptada', 'En Espera', 'Cotización Enviada', 'Cotización Rechazada'].includes(t.estado) && 
        t.tipo === 'Visita' && 
        !['Cotización Aceptada', 'Cotización Aprobada', 'En Ejecución'].includes(t.estado)
    );
    
    // 3. Asignaciones de trabajo (Cotización Aceptada, En Ejecución, Trabajos Aceptados)
    const colProceso = trabajos.filter(t => 
        ['Cotización Aceptada', 'Cotización Aprobada', 'En Ejecución', 'En Proceso', 'Asignado', 'Aceptada', 'En Espera'].includes(t.estado) && 
        (t.tipo !== 'Visita' || ['Cotización Aceptada', 'Cotización Aprobada', 'En Ejecución'].includes(t.estado))
    );
    
    // 4. Trabajos finalizados
    const colFinalizadas = trabajos.filter(t => ['Finalizado', 'Completado'].includes(t.estado));

    // Column accent colors
    const COL_COLORS = {
        yellow:  { grad: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', shadow: 'rgba(245,158,11,0.35)', dot: '🟡' },
        orange:  { grad: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.35)', dot: '🟠' },
        green:   { grad: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16,185,129,0.35)', dot: '🟢' },
        purple:  { grad: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', shadow: 'rgba(139,92,246,0.35)', dot: '🟣' },
    };

    const renderCard = (t: Trabajo, colKey: keyof typeof COL_COLORS = 'yellow') => {
        const problemaReportado = t.descripcion_problema || (t as any).descripcion || (t as any).problema || (t as any).reporteTienda || '';
        const userRole = user?.role || 'tecnico';
        const isSeen = isCardSeen(userRole, t.id, t.estado);
        const accent = COL_COLORS[colKey];

        const handleCardClick = () => {
            markCardAsSeen(userRole, t.id, t.estado);
            navigate(`/tecnico/trabajo-detalle/${t.id}`);
        };

        return (
            <div key={t.id} className={styles.card} onClick={handleCardClick}>
                <div className={styles.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={styles.jobId}>#{t.id}</span>
                        {!isSeen && (
                            <span style={{
                                background: accent.grad,
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: '900',
                                padding: '3px 8px',
                                borderRadius: '20px',
                                boxShadow: `0 2px 8px ${accent.shadow}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {accent.dot} NUEVO
                            </span>
                        )}
                    </div>
                    <span className={`${styles.priorityBadge} ${t.prioridad === 'Alta' ? styles.priorityAlta : (t.prioridad === 'Media' ? styles.priorityMedia : styles.priorityBaja)}`}>
                        {t.prioridad}
                    </span>
                </div>
                
                <h4 className={styles.cardTitle}>{t.titulo}</h4>
                
                <div className={styles.infoRow}>
                    <HiOutlineBuildingOffice size={16} />
                    <span className={styles.strongText}>{t.negocio?.nombre || 'Sin sucursal'}</span>
                </div>

                {problemaReportado && problemaReportado !== '—' && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', marginTop: '6px', marginBottom: '6px', fontSize: '12px', color: '#334155' }}>
                        <span style={{ fontWeight: '800', color: '#f26522', display: 'block', marginBottom: '2px', fontSize: '11px', textTransform: 'uppercase' }}>📝 Problema Reportado:</span>
                        "{problemaReportado}"
                    </div>
                )}
                
                {t.subgerenteName && t.subgerenteName !== 'Sin Asignar' && t.subgerenteName !== 'Asignado' && (
                    <div className={styles.infoRow}>
                        <HiOutlineUser size={16} />
                        <span>Encargado: <span className={styles.strongText}>{t.subgerenteName}</span></span>
                    </div>
                )}

                {t.hora_llegada && (
                    <div style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', display: 'inline-block' }}>
                        ⏰ Llegada confirmada: {t.hora_llegada}
                    </div>
                )}

                <div className={styles.cardFooter}>
                    <div className={styles.dateText}>
                        <HiOutlineClock size={14} />
                        {new Date(t.created_at).toLocaleDateString()}
                    </div>
                    <span style={{ fontWeight: '600', color: '#0ea5e9' }}>
                        {t.tipo === 'Visita' ? 'Visita' : 'Trabajo'}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.tableroContainer}>
            <div className={styles.header}>
                <div>
                    <h1>Mi Tablero de Trabajos</h1>
                    <p>Monitoreo de mis solicitudes y tareas asignadas</p>
                </div>
                {refreshing && (
                    <div className={styles.refreshBadge}>
                        <HiArrowPath className={styles.spinIcon} /> Actualizando...
                    </div>
                )}
            </div>

            <div className={styles.board}>
                {/* SOLICITUDES PENDIENTES */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colSolicitudes}`}>
                        <div className={styles.columnTitle}>Solicitudes Pendientes</div>
                        <span className={styles.columnBadge}>{colSolicitudes.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colSolicitudes.map(t => renderCard(t, 'yellow'))}
                    </div>
                </div>

                {/* ASIGNACIONES DE VISITAS */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colVisita}`}>
                        <div className={styles.columnTitle}>Asignaciones de Visitas</div>
                        <span className={styles.columnBadge}>{colVisita.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colVisita.map(t => renderCard(t, 'orange'))}
                    </div>
                </div>

                {/* ASIGNACIONES DE TRABAJO */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colProceso}`}>
                        <div className={styles.columnTitle}>Asignaciones de Trabajo</div>
                        <span className={styles.columnBadge}>{colProceso.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colProceso.map(t => renderCard(t, 'green'))}
                    </div>
                </div>

                {/* FINALIZADAS */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colFinalizadas}`}>
                        <div className={styles.columnTitle}>Trabajos Finalizados</div>
                        <span className={styles.columnBadge}>{colFinalizadas.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colFinalizadas.map(t => renderCard(t, 'purple'))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardTecnico;
