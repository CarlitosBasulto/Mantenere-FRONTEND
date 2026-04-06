import React, { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { HiOutlineUsers, HiOutlineBriefcase, HiOutlineDocumentText, HiOutlineClipboardDocumentCheck } from 'react-icons/hi2';

// Servicios
import { getUsers } from '../../services/usersService';
import { getNegocios } from '../../services/negociosService';
import { getTrabajos } from '../../services/trabajosService';

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState({
        usuarios: 0,
        negocios: 0,
        trabajos: 0,
        cotizaciones: 0
    });
    const [trendData, setTrendData] = useState<any[]>([]);
    const [statusData, setStatusData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [u, n, t] = await Promise.all([
                    getUsers(),
                    getNegocios(),
                    getTrabajos()
                ]);
                
                // 1. Contador General
                const cotizacionesCount = t.filter((job: any) => 
                    job.cotizado || 
                    ["Cotización Enviada", "Cotización Aceptada", "Cotización Rechazada"].includes(job.estado)
                ).length;

                setStats({
                    usuarios: u.length,
                    negocios: n.length,
                    trabajos: t.length,
                    cotizaciones: cotizacionesCount || 0
                });

                // 2. Procesar Datos de Tendencia (Últimos 4 meses)
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const now = new Date();
                const last4Months: { monthIndex: number; year: number; name: string; trabajos: number; registros: number }[] = [];
                for (let i = 3; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    last4Months.push({
                        monthIndex: d.getMonth(),
                        year: d.getFullYear(),
                        name: monthNames[d.getMonth()],
                        trabajos: 0,
                        registros: 0
                    });
                }

                t.forEach((job: any) => {
                    const jobDate = new Date(job.created_at);
                    const monthItem = last4Months.find(m => m.monthIndex === jobDate.getMonth() && m.year === jobDate.getFullYear());
                    if (monthItem) monthItem.trabajos++;
                });

                n.forEach((neg: any) => {
                    const negDate = new Date(neg.created_at);
                    const monthItem = last4Months.find(m => m.monthIndex === negDate.getMonth() && m.year === negDate.getFullYear());
                    if (monthItem) monthItem.registros++;
                });

                setTrendData(last4Months.map(({ name, trabajos, registros }) => ({ name, trabajos, registros })));

                // 3. Procesar Distribución de Estatus
                const counts = {
                    Pendientes: 0,
                    'En Progreso': 0,
                    Finalizados: 0
                };

                t.forEach((job: any) => {
                    if (['Pendiente', 'Solicitud', 'En Espera', 'Cotización Enviada'].includes(job.estado)) {
                        counts.Pendientes++;
                    } else if (['Asignado', 'En Proceso', 'Cotización Aceptada'].includes(job.estado)) {
                        counts['En Progreso']++;
                    } else if (['Finalizado', 'Completado'].includes(job.estado)) {
                        counts.Finalizados++;
                    }
                });

                setStatusData([
                    { name: 'Pendientes', value: counts.Pendientes, color: '#fbbc04' },
                    { name: 'En Progreso', value: counts['En Progreso'], color: '#3b82f6' },
                    { name: 'Finalizados', value: counts.Finalizados, color: '#10b981' },
                ]);

            } catch (error) {
                console.error("Error cargando estadísticas del dashboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className={styles.loading}>Cargando Dashboard...</div>;

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                <h1>Panel de Control</h1>
                <p>Bienvenido al resumen general de Mantenere</p>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.blue}`}>
                        <HiOutlineUsers size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.usuarios}</h3>
                        <p>Usuarios Registrados</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.green}`}>
                        <HiOutlineBriefcase size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.negocios}</h3>
                        <p>Negocios Activos</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.iconBg} ${styles.yellow}`}>
                        <HiOutlineDocumentText size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.trabajos}</h3>
                        <p>Trabajos Totales</p>
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
            </div>

            <div className={styles.chartsGrid}>
                    <div className={styles.chartCard}>
                        <h3>Tendencia de Crecimiento</h3>
                        <div className={styles.chartWrapper}>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorTrabajos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 12}} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="trabajos" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTrabajos)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className={styles.chartCard}>
                        <h3>Distribución de Trabajos</h3>
                        <div className={styles.chartWrapper}>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className={styles.pieLegend}>
                                {statusData.map(item => (
                                    <div key={item.name} className={styles.legendItem}>
                                        <span style={{ backgroundColor: item.color }} />
                                        <p>{item.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                </div>
            </div>
            
            <div className={styles.activityCard}>
                 <h3>Actividad Reciente del Sistema</h3>
                 <p className={styles.empty}>Próximamente: Historial detallado de acciones en tiempo real.</p>
            </div>
        </div>
    );
};

export default Dashboard;
