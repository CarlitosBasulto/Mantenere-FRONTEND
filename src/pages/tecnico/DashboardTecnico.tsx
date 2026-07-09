import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DashboardTecnico.module.css';
import { getTrabajos } from '../../services/trabajosService';
import { getUsers } from '../../services/usersService';
import { HiOutlineUser, HiOutlineClock, HiArrowPath } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';

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
}

const DashboardTecnico: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);


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

            // 3. Process and filter jobs for this technician
            let processedJobs: Trabajo[] = trabajosData
                .filter((t: any) => {
                    // Only keep jobs assigned to this technician
                    return t.trabajador?.user_id === user?.id || t.trabajador_id === user?.id;
                })
                .map((t: any) => ({
                    ...t,
                    subgerenteName: t.admin_autonomo_id ? (subgerentesMap.get(t.admin_autonomo_id) || 'Asignado') : 'Sin Asignar'
                }));

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
    
    // 2. Asignaciones de visitas (En proceso + Visita, or maybe Aceptada/Asignada + Visita)
    // Assuming "En Proceso" or "Asignado" means the tech is working on it or about to.
    const colVisita = trabajos.filter(t => ['En Proceso', 'Asignado', 'Aceptada', 'En Espera'].includes(t.estado) && t.tipo === 'Visita');
    
    // 3. Asignaciones de trabajo (En proceso + not Visita)
    const colProceso = trabajos.filter(t => ['En Proceso', 'Asignado', 'Aceptada', 'En Espera'].includes(t.estado) && t.tipo !== 'Visita');
    
    // 4. Trabajos finalizados
    const colFinalizadas = trabajos.filter(t => ['Finalizado', 'Completado'].includes(t.estado));

    const renderCard = (t: Trabajo) => (
        <div key={t.id} className={styles.card} onClick={() => navigate(`/tecnico/trabajo-detalle/${t.id}`)}>
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
                        {colSolicitudes.map(renderCard)}
                    </div>
                </div>

                {/* ASIGNACIONES DE VISITAS */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colVisita}`}>
                        <div className={styles.columnTitle}>Asignaciones de Visitas</div>
                        <span className={styles.columnBadge}>{colVisita.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colVisita.map(renderCard)}
                    </div>
                </div>

                {/* ASIGNACIONES DE TRABAJO */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colProceso}`}>
                        <div className={styles.columnTitle}>Asignaciones de Trabajo</div>
                        <span className={styles.columnBadge}>{colProceso.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colProceso.map(renderCard)}
                    </div>
                </div>

                {/* FINALIZADAS */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colFinalizadas}`}>
                        <div className={styles.columnTitle}>Trabajos Finalizados</div>
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

export default DashboardTecnico;
