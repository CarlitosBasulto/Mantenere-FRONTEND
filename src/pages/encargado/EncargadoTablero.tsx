import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../autonomo/AutonomoTablero.module.css';
import { getTrabajos } from '../../services/trabajosService';
import { getUsers } from '../../services/usersService';
import { getActividadesByTrabajo } from '../../services/actividadesService';
import { HiOutlineBuildingOffice, HiOutlineUser, HiOutlineClock, HiOutlineBriefcase, HiOutlineCheckCircle, HiArrowPath } from 'react-icons/hi2';
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
    negocio_id?: number;
    negocio?: {
        nombre: string;
    };
    trabajador?: {
        nombre: string;
    };
    // Extra fields fetched
    subgerenteName?: string;
    horaLlegada?: string;
    hora_llegada?: string;
    latitud_llegada?: string;
    longitud_llegada?: string;
}

const EncargadoTablero: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchData = async (isSilent = false) => {
        if (!user || !user.negocio_id) return;

        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            // 1. Fetch trabajos and users
            const [trabajosData, usersData] = await Promise.all([
                getTrabajos(),
                getUsers()
            ]);

            // Filter jobs by current user's negocio_id
            const misTrabajos = trabajosData.filter((t: any) => t.negocio_id === user.negocio_id);

            // 2. Map subgerentes
            const subgerentesMap = new Map<number, string>();
            usersData.forEach((u: any) => {
                if (u.role?.name === 'admin-autonomo') {
                    subgerentesMap.set(u.id, u.name);
                }
            });

            // hora_llegada is now natively provided in the 'hora_llegada' column of Trabajo
            let processedJobs: Trabajo[] = misTrabajos.map((t: any) => ({
                ...t,
                subgerenteName: t.admin_autonomo_id ? (subgerentesMap.get(t.admin_autonomo_id) || 'Asignado') : 'Sin Asignar'
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
    const colCotizaciones = trabajos.filter(t => ['Cotización Enviada', 'Cotización Aceptada'].includes(t.estado));
    const colEnEspera = trabajos.filter(t => ['Aceptada', 'Asignado', 'En Espera'].includes(t.estado));
    const colProceso = trabajos.filter(t => t.estado === 'En Proceso');
    const colFinalizadas = trabajos.filter(t => ['Finalizado', 'Completado'].includes(t.estado));

    const renderCard = (t: Trabajo) => (
        <div key={t.id} className={styles.card} onClick={() => navigate(`/encargado/trabajo-detalle/${t.id}`)}>
            <div className={styles.cardHeader}>
                <span className={styles.jobId}>#{t.id}</span>
                <span className={`${styles.priorityBadge} ${t.prioridad === 'Alta' ? styles.priorityAlta : (t.prioridad === 'Media' ? styles.priorityMedia : styles.priorityBaja)}`}>
                    {t.prioridad}
                </span>
            </div>
            
            <h4 className={styles.cardTitle}>{t.titulo}</h4>
            
            {t.hora_llegada && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' }}>
                        ⏰ Llegó: {t.hora_llegada}
                    </div>
                    {t.latitud_llegada && (
                        <div style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px' }} title="Ubicación registrada">
                            📍 GPS
                        </div>
                    )}
                </div>
            )}
            
            <div className={styles.infoRow}>
                <HiOutlineBuildingOffice size={16} />
                <span className={styles.strongText}>{t.negocio?.nombre || 'Sin sucursal'}</span>
            </div>
            
            {t.subgerenteName && t.subgerenteName !== 'Sin Asignar' && (
                <div className={styles.infoRow}>
                    <HiOutlineBriefcase size={16} />
                    <span className={styles.subText}>{t.subgerenteName}</span>
                </div>
            )}
            
            <div className={styles.infoRow}>
                <HiOutlineUser size={16} />
                <span className={styles.subText}>{t.trabajador?.nombre || 'Sin asignar'}</span>
            </div>
            
            {t.fecha_programada && (
                <div className={styles.infoRow}>
                    <HiOutlineClock size={16} />
                    <span className={styles.subText}>{new Date(t.fecha_programada).toLocaleDateString()}</span>
                </div>
            )}
            
            <div className={styles.cardFooter}>
                <span className={`${styles.typeBadge} ${t.tipo === 'Visita' ? styles.typeVisita : styles.typeTrabajo}`}>
                    {t.tipo}
                </span>
                <span className={styles.dateText}>{new Date(t.created_at).toLocaleDateString()}</span>
            </div>
        </div>
    );

    return (
        <div className={styles.tableroContainer}>
            <div className={styles.header}>
                <div>
                    <h1>Tablero de Operaciones</h1>
                    <p>Monitorea y gestiona los trabajos en tu sucursal</p>
                </div>
                
                <div className={styles.actionsGroup}>
                    <div className={styles.lastUpdated}>
                        <HiOutlineCheckCircle size={16} color="#10b981"/>
                        <span>Actualizado {lastUpdated.toLocaleTimeString()}</span>
                    </div>
                    <button 
                        className={styles.refreshBtn} 
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                    >
                        <HiArrowPath size={18} className={refreshing ? styles.spin : ''} />
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            <div className={styles.board}>
                {/* Columna Pendientes */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colYellow}`}>
                        <h3>Solicitudes / Pendientes</h3>
                        <span className={styles.countBadge}>{colSolicitudes.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colSolicitudes.map(renderCard)}
                        {colSolicitudes.length === 0 && <div className={styles.emptyState}>No hay trabajos pendientes</div>}
                    </div>
                </div>

                {/* Columna Cotizaciones */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colBlue}`}>
                        <h3>Cotizaciones</h3>
                        <span className={styles.countBadge}>{colCotizaciones.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colCotizaciones.map(renderCard)}
                        {colCotizaciones.length === 0 && <div className={styles.emptyState}>No hay cotizaciones activas</div>}
                    </div>
                </div>

                {/* Columna En Espera (Visitas/Técnico Aceptado) */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colOrange}`}>
                        <h3>Técnico en Camino / Visita</h3>
                        <span className={styles.countBadge}>{colEnEspera.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colEnEspera.map(renderCard)}
                        {colEnEspera.length === 0 && <div className={styles.emptyState}>No hay técnicos en espera</div>}
                    </div>
                </div>

                {/* Columna En Proceso */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colGreen}`}>
                        <h3>En Proceso</h3>
                        <span className={styles.countBadge}>{colProceso.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colProceso.map(renderCard)}
                        {colProceso.length === 0 && <div className={styles.emptyState}>No hay trabajos en proceso</div>}
                    </div>
                </div>

                {/* Columna Finalizados */}
                <div className={styles.column}>
                    <div className={`${styles.columnHeader} ${styles.colPurple}`}>
                        <h3>Finalizados</h3>
                        <span className={styles.countBadge}>{colFinalizadas.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {colFinalizadas.map(renderCard)}
                        {colFinalizadas.length === 0 && <div className={styles.emptyState}>No hay trabajos finalizados</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EncargadoTablero;
