import React, { useEffect, useState } from 'react';
import styles from './DashboardCliente.module.css';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
    HiOutlineBriefcase, 
    HiOutlineDocumentText, 
    HiOutlineClipboardDocumentCheck, 
    HiOutlineUserGroup,
    HiOutlineComputerDesktop
} from 'react-icons/hi2';

import { useAuth } from '../../context/AuthContext';
import { getNegocios } from '../../services/negociosService';
import { getTrabajos } from '../../services/trabajosService';
import { getEncargadoSucursal } from '../../services/usersService';

const DashboardCliente: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        sucursales: 0,
        cotizaciones: 0,
        trabajos: 0,
        equiposRegistrados: 0
    });
    
    const [trabajosPorMes, setTrabajosPorMes] = useState<any[]>([]);
    const [estadoTrabajos, setEstadoTrabajos] = useState<any[]>([]);
    const [tecnicosRecientes, setTecnicosRecientes] = useState<any[]>([]);
    const [encargadosList, setEncargadosList] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            
            try {
                // Fetch basic data
                const [negociosAll, trabajosAll] = await Promise.all([
                    getNegocios(),
                    getTrabajos()
                ]);

                // 1. Filtrar negocios del cliente
                const misNegocios = negociosAll.filter((neg: any) => 
                    neg.dueno === user.name || neg.user_id === user.id
                );
                const misNegociosIds = misNegocios.map((n: any) => n.id);

                // 2. Filtrar trabajos de los negocios del cliente
                const misTrabajos = trabajosAll.filter((job: any) => 
                    misNegociosIds.includes(job.negocio_id)
                );

                // 3. Obtener encargados reales por sucursal
                const encargadosPromises = misNegocios.map(async (neg: any) => {
                    let encargadoNombre = 'Sin Asignar';
                    try {
                        const encargadoRes = await getEncargadoSucursal(neg.id);
                        if (encargadoRes?.encargado?.name) {
                            encargadoNombre = encargadoRes.encargado.name;
                        }
                    } catch (e) {
                        // Si no hay encargado asignado, la API suele devolver 404
                    }
                    return {
                        sucursal: neg.nombre,
                        encargado: encargadoNombre
                    };
                });
                
                const encargados = await Promise.all(encargadosPromises);
                setEncargadosList(encargados);

                // 4. Estadísticas base
                const cotizacionesTotales = misTrabajos.filter((job: any) => 
                    job.cotizado || ["Cotización Enviada", "Cotización Aceptada", "Cotización Rechazada"].includes(job.estado)
                ).length;

                // 5. Contar equipos registrados
                let totalEquipos = 0;
                const eqPorSucursal: Record<string, number> = {};
                
                misNegocios.forEach((neg: any) => {
                    let count = 0;
                    if (neg.areas && Array.isArray(neg.areas)) {
                        neg.areas.forEach((area: any) => {
                            if (area.equipos && Array.isArray(area.equipos)) {
                                count += area.equipos.length;
                            }
                        });
                    }
                    totalEquipos += count;
                    eqPorSucursal[neg.nombre] = count;
                });

                setStats({
                    sucursales: misNegocios.length,
                    cotizaciones: cotizacionesTotales,
                    trabajos: misTrabajos.length,
                    equiposRegistrados: totalEquipos
                });

                // 6. Trabajos / Cotizaciones por Mes (Últimos 6 meses)
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const now = new Date();
                const last6Months: { monthIndex: number; year: number; name: string; trabajos: number; cotizaciones: number }[] = [];
                
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    last6Months.push({
                        monthIndex: d.getMonth(),
                        year: d.getFullYear(),
                        name: monthNames[d.getMonth()],
                        trabajos: 0,
                        cotizaciones: 0
                    });
                }

                misTrabajos.forEach((job: any) => {
                    const jobDate = new Date(job.created_at);
                    const monthItem = last6Months.find(m => m.monthIndex === jobDate.getMonth() && m.year === jobDate.getFullYear());
                    
                    if (monthItem) {
                        monthItem.trabajos++;
                        if (job.cotizado || ["Cotización Enviada", "Cotización Aceptada", "Cotización Rechazada"].includes(job.estado)) {
                            monthItem.cotizaciones++;
                        }
                    }
                });
                setTrabajosPorMes(last6Months.map(({ name, trabajos, cotizaciones }) => ({ name, Trabajos: trabajos, Cotizaciones: cotizaciones })));

                // 7. Estado de Trabajos
                const counts = { Pendientes: 0, 'En Progreso': 0, Finalizados: 0 };
                misTrabajos.forEach((job: any) => {
                    if (['Pendiente', 'Solicitud', 'En Espera', 'Cotización Enviada'].includes(job.estado)) {
                        counts.Pendientes++;
                    } else if (['Asignado', 'En Proceso', 'Cotización Aceptada'].includes(job.estado)) {
                        counts['En Progreso']++;
                    } else if (['Finalizado', 'Completado'].includes(job.estado)) {
                        counts.Finalizados++;
                    }
                });

                setEstadoTrabajos([
                    { name: 'Pendientes', value: counts.Pendientes, color: '#fbbc04' },
                    { name: 'En Progreso', value: counts['En Progreso'], color: '#3b82f6' },
                    { name: 'Finalizados', value: counts.Finalizados, color: '#10b981' },
                ]);

                // 8. Técnicos Recientes que han visitado las sucursales
                const techMap: Record<string, { sucursal: string, fecha: string }> = {};
                
                // Ordenar para tener los más recientes primero
                const sortedTrabajos = [...misTrabajos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                sortedTrabajos.forEach((job: any) => {
                    if (job.trabajador?.nombre && !techMap[job.trabajador.nombre]) {
                        techMap[job.trabajador.nombre] = {
                            sucursal: job.negocio?.nombre || 'General',
                            fecha: new Date(job.created_at).toLocaleDateString()
                        };
                    }
                });
                
                setTecnicosRecientes(Object.entries(techMap).slice(0, 5).map(([nombre, data]) => ({
                    nombre,
                    ...data
                })));

            } catch (error) {
                console.error("Error al cargar el dashboard de cliente", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    if (loading) return <div className={styles.loading}>Cargando Resumen...</div>;

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                <h1>Resumen Ejecutivo</h1>
                <p>Monitorea el estado de tus sucursales y solicitudes</p>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.blue}`}>
                        <HiOutlineBriefcase size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.sucursales}</h3>
                        <p>Mis Sucursales</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.purple}`}>
                        <HiOutlineClipboardDocumentCheck size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.cotizaciones}</h3>
                        <p>Cotizaciones Recibidas</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.yellow}`}>
                        <HiOutlineDocumentText size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.trabajos}</h3>
                        <p>Intervenciones (Historial)</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.green}`}>
                        <HiOutlineComputerDesktop size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.equiposRegistrados}</h3>
                        <p>Equipos Levantados</p>
                    </div>
                </div>
            </div>

            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <h3>Actividad de Mantenimiento (6 Meses)</h3>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trabajosPorMes}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend iconType="circle" />
                                <Bar dataKey="Trabajos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Cotizaciones" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={styles.chartCard}>
                    <h3>Estado de mis Solicitudes</h3>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={estadoTrabajos} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {estadoTrabajos.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className={styles.chartsGrid}>
                <div className={styles.listCard}>
                    <h3>Técnicos Recientes en Mis Sucursales</h3>
                    {tecnicosRecientes.length > 0 ? (
                        tecnicosRecientes.map((tech, idx) => (
                            <div key={idx} className={styles.listItem}>
                                <div>
                                    <div className={styles.itemMain}>{tech.nombre}</div>
                                    <div className={styles.itemSub}>Visitó: {tech.sucursal}</div>
                                </div>
                                <span className={styles.badge}>{tech.fecha}</span>
                            </div>
                        ))
                    ) : (
                        <p style={{color: '#64748b'}}>Aún no hay visitas de técnicos registradas.</p>
                    )}
                </div>

                <div className={styles.listCard}>
                    <h3>Encargados por Sucursal</h3>
                    {encargadosList.length > 0 ? (
                        encargadosList.map((enc, idx) => (
                            <div key={idx} className={styles.listItem}>
                                <div>
                                    <div className={styles.itemMain}>{enc.sucursal}</div>
                                    <div className={styles.itemSub} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <HiOutlineUserGroup /> {enc.encargado}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{color: '#64748b'}}>No tienes sucursales registradas.</p>
                    )}
                </div>
            </div>
            
        </div>
    );
};

export default DashboardCliente;
