import React, { useEffect, useState } from 'react';
import styles from '../cliente/DashboardCliente.module.css'; // Reutilizamos estilos
import { 
    Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
    HiOutlineDocumentText, 
    HiOutlineClipboardDocumentCheck, 
    HiOutlineUserGroup,
    HiOutlineComputerDesktop
} from 'react-icons/hi2';

import { useAuth } from '../../context/AuthContext';
import { getNegocio } from '../../services/negociosService';
import { getTrabajos } from '../../services/trabajosService';

const DashboardEncargado: React.FC = () => {
    const { user } = useAuth();
    
    const [stats, setStats] = useState({
        equiposRegistrados: 0,
        cotizaciones: 0,
        trabajos: 0
    });
    
    const [estadoCotizaciones, setEstadoCotizaciones] = useState<any[]>([]);
    const [tecnicosRecientes, setTecnicosRecientes] = useState<any[]>([]);
    const [trabajosRecientes, setTrabajosRecientes] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user || !user.negocio_id) return;
            
            try {
                // Fetch sucursal actual y trabajos
                const [miSucursal, trabajosAll] = await Promise.all([
                    getNegocio(user.negocio_id),
                    getTrabajos()
                ]);

                // Filtrar trabajos de MI sucursal
                const misTrabajos = trabajosAll.filter((job: any) => 
                    job.negocio_id === user.negocio_id
                );

                // 1. Contar equipos registrados en mi sucursal
                let totalEquipos = 0;
                if (miSucursal.areas && Array.isArray(miSucursal.areas)) {
                    miSucursal.areas.forEach((area: any) => {
                        if (area.equipos && Array.isArray(area.equipos)) {
                            totalEquipos += area.equipos.length;
                        }
                    });
                }
                
                // 2. Estadísticas base
                const misCotizaciones = misTrabajos.filter((job: any) => 
                    job.cotizado || ["Cotización Enviada", "Cotización Aceptada", "Cotización Rechazada"].includes(job.estado)
                );

                setStats({
                    cotizaciones: misCotizaciones.length,
                    trabajos: misTrabajos.length,
                    equiposRegistrados: totalEquipos
                });

                // 3. Estado de Cotizaciones (Aceptadas vs Pendientes/Rechazadas)
                const counts = { Aceptadas: 0, Pendientes: 0, Rechazadas: 0 };
                misCotizaciones.forEach((job: any) => {
                    if (['Cotización Aceptada', 'En Proceso', 'Finalizado', 'Completado'].includes(job.estado)) {
                        counts.Aceptadas++;
                    } else if (['Cotización Rechazada'].includes(job.estado)) {
                        counts.Rechazadas++;
                    } else {
                        counts.Pendientes++;
                    }
                });

                setEstadoCotizaciones([
                    { name: 'Pendientes', value: counts.Pendientes, color: '#f26522' },
                    { name: 'Aceptadas', value: counts.Aceptadas, color: '#10b981' },
                    { name: 'Rechazadas', value: counts.Rechazadas, color: '#ef4444' },
                ]);

                // 4. Técnicos Recientes
                const techMap: Record<string, string> = {};
                const sortedTrabajos = [...misTrabajos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                sortedTrabajos.forEach((job: any) => {
                    if (job.trabajador?.nombre && !techMap[job.trabajador.nombre]) {
                        techMap[job.trabajador.nombre] = new Date(job.created_at).toLocaleDateString();
                    }
                });
                
                setTecnicosRecientes(Object.entries(techMap).slice(0, 5).map(([nombre, fecha]) => ({
                    nombre,
                    fecha
                })));

                // 5. Trabajos (Títulos y problemas recientes)
                setTrabajosRecientes(sortedTrabajos.slice(0, 10).map((job: any) => ({
                    titulo: job.titulo || 'Servicio de Mantenimiento',
                    problema: job.descripcion || 'Sin descripción',
                    fecha: new Date(job.created_at).toLocaleDateString(),
                    estado: job.estado
                })));

            } catch (error) {
                console.error("Error al cargar el dashboard de encargado", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (loading) return <div className={styles.loading}>Cargando Resumen de Sucursal...</div>;

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                <h1>Panel de Sucursal</h1>
                <p>Monitorea el estado y los trabajos de tu sucursal asignada</p>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.green}`}>
                        <HiOutlineComputerDesktop size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.equiposRegistrados}</h3>
                        <p>Equipos Levantados</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.purple}`}>
                        <HiOutlineClipboardDocumentCheck size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.cotizaciones}</h3>
                        <p>Cotizaciones</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.yellow}`}>
                        <HiOutlineDocumentText size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.trabajos}</h3>
                        <p>Intervenciones Totales</p>
                    </div>
                </div>
            </div>

            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <h3>Estado de Cotizaciones</h3>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={estadoCotizaciones} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {estadoCotizaciones.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={styles.listCard}>
                    <h3>Técnicos que visitaron la sucursal</h3>
                    {tecnicosRecientes.length > 0 ? (
                        tecnicosRecientes.map((tech, idx) => (
                            <div key={idx} className={styles.listItem}>
                                <div>
                                    <div className={styles.itemMain} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HiOutlineUserGroup /> {tech.nombre}</div>
                                </div>
                                <span className={styles.badge}>{tech.fecha}</span>
                            </div>
                        ))
                    ) : (
                        <p style={{color: '#64748b'}}>Aún no hay visitas de técnicos registradas.</p>
                    )}
                </div>
            </div>

            <div className={styles.chartsGrid} style={{ gridTemplateColumns: '1fr' }}>
                <div className={styles.listCard}>
                    <h3>Últimos Problemas Reportados (Trabajos)</h3>
                    {trabajosRecientes.length > 0 ? (
                        trabajosRecientes.map((job, idx) => (
                            <div key={idx} className={styles.listItem} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <div className={styles.itemMain}>{job.titulo}</div>
                                    <span className={styles.badge} style={{ background: '#e0e7ff', color: '#4f46e5' }}>{job.fecha}</span>
                                </div>
                                <div className={styles.itemSub} style={{ marginTop: '0' }}>{job.problema}</div>
                                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Estado: {job.estado}</div>
                            </div>
                        ))
                    ) : (
                        <p style={{color: '#64748b'}}>No se han registrado trabajos en esta sucursal.</p>
                    )}
                </div>
            </div>
            
        </div>
    );
};

export default DashboardEncargado;
