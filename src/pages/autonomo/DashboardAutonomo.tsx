import React, { useEffect, useState } from 'react';
import styles from '../admin/Dashboard.module.css';
import {
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    HiOutlineBriefcase, HiOutlineDocumentText,
    HiOutlineClipboardDocumentCheck, HiOutlineUsers
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { getNegocios } from '../../services/negociosService';
import { getTrabajos } from '../../services/trabajosService';
import { getTrabajadores } from '../../services/trabajadoresService';

const DashboardAutonomo: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ negocios: 0, tecnicos: 0, trabajos: 0, cotizaciones: 0 });
    const [statusData, setStatusData] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [techLoadData, setTechLoadData] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [n, t, tec] = await Promise.all([
                    getNegocios(),
                    getTrabajos(),
                    getTrabajadores(),
                ]);

                setStats({
                    negocios: n.length,
                    trabajos: t.length,
                    tecnicos: tec.length,
                    cotizaciones: t.filter((j: any) =>
                        ['Cotización Enviada', 'Cotización Aceptada'].includes(j.estado)
                    ).length,
                });

                // Por estado
                const counts: Record<string, number> = { Pendientes: 0, 'En Progreso': 0, Finalizados: 0 };
                t.forEach((j: any) => {
                    if (['Pendiente', 'Solicitud'].includes(j.estado)) counts.Pendientes++;
                    else if (['Asignado', 'En Proceso'].includes(j.estado)) counts['En Progreso']++;
                    else if (['Finalizado', 'Completado'].includes(j.estado)) counts.Finalizados++;
                });
                setStatusData([
                    { name: 'Pendientes', value: counts.Pendientes, color: '#f26522' },
                    { name: 'En Progreso', value: counts['En Progreso'], color: '#3b82f6' },
                    { name: 'Finalizados', value: counts.Finalizados, color: '#10b981' },
                ]);

                // Tendencia últimos 4 meses
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const now = new Date();
                const last4: any[] = [];
                for (let i = 3; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    last4.push({ monthIndex: d.getMonth(), year: d.getFullYear(), name: monthNames[d.getMonth()], trabajos: 0 });
                }
                t.forEach((j: any) => {
                    const d = new Date(j.created_at);
                    const m = last4.find(x => x.monthIndex === d.getMonth() && x.year === d.getFullYear());
                    if (m) m.trabajos++;
                });
                setTrendData(last4.map(({ name, trabajos }) => ({ name, trabajos })));

                // Carga por técnico
                const techMap: Record<string, number> = {};
                t.forEach((j: any) => {
                    if (j.trabajador?.nombre) {
                        techMap[j.trabajador.nombre] = (techMap[j.trabajador.nombre] || 0) + 1;
                    }
                });
                setTechLoadData(Object.entries(techMap).map(([name, count]) => ({ name, trabajos: count })));

            } catch (e) {
                console.error('Error cargando dashboard autónomo', e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <div className={styles.loading}>Cargando Dashboard...</div>;

    return (
        <div className={styles.dashboardContainer}>
            <header className={styles.header}>
                <h1>¡Bienvenido, {user?.name}! 🏢</h1>
                <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>
                    Panel de Administrador Autónomo — Solo ves y gestionas <strong>tu propio sistema</strong>.
                </p>
            </header>

            {/* STATS */}
            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.borderGreen}`}>
                    <div className={`${styles.iconBg} ${styles.green}`}><HiOutlineBriefcase size={24} /></div>
                    <div className={styles.statInfo}><h3>{stats.negocios}</h3><p>Mis Sucursales</p></div>
                </div>
                <div className={`${styles.statCard} ${styles.borderBlue}`}>
                    <div className={`${styles.iconBg} ${styles.blue}`}><HiOutlineUsers size={24} /></div>
                    <div className={styles.statInfo}><h3>{stats.tecnicos}</h3><p>Mis Técnicos</p></div>
                </div>
                <div className={`${styles.statCard} ${styles.borderYellow}`}>
                    <div className={`${styles.iconBg} ${styles.yellow}`}><HiOutlineDocumentText size={24} /></div>
                    <div className={styles.statInfo}><h3>{stats.trabajos}</h3><p>Mis Trabajos</p></div>
                </div>
                <div className={`${styles.statCard} ${styles.borderPurple}`}>
                    <div className={`${styles.iconBg} ${styles.purple}`}><HiOutlineClipboardDocumentCheck size={24} /></div>
                    <div className={styles.statInfo}><h3>{stats.cotizaciones}</h3><p>Cotizaciones</p></div>
                </div>
            </div>

            {/* CHARTS */}
            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <h3>Tendencia de Trabajos</h3>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorT" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f26522" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f26522" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="trabajos" stroke="#f26522" fillOpacity={1} fill="url(#colorT)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={styles.chartCard}>
                    <h3>Estado de Trabajos</h3>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {techLoadData.length > 0 && (
                    <div className={styles.chartCard}>
                        <h3>Carga por Técnico</h3>
                        <div className={styles.chartWrapper}>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={techLoadData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} width={120} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                    <Bar dataKey="trabajos" fill="#f26522" radius={[0, 10, 10, 0]} barSize={22} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardAutonomo;
