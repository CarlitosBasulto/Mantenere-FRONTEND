import React, { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { HiOutlineUsers, HiOutlineBriefcase, HiOutlineDocumentText, HiOutlineClipboardDocumentCheck, HiOutlineWrenchScrewdriver } from 'react-icons/hi2';

// Servicios
import { getUsers } from '../../services/usersService';
import { getNegocios } from '../../services/negociosService';
import { getTrabajos } from '../../services/trabajosService';
import { getCotizacionesByTrabajoId } from '../../services/cotizacionesService';
import { getMantenimientoSolicitudes } from '../../services/mantenimientoService';
import { useAuth } from '../../context/AuthContext';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        usuarios: 0,
        negocios: 0,
        trabajos: 0,
        cotizaciones: 0
    });
    const [trendData, setTrendData] = useState<any[]>([]);
    const [statusData, setStatusData] = useState<any[]>([]);
    const [techLoadData, setTechLoadData] = useState<any[]>([]);
    const [serviceTypeData, setServiceTypeData] = useState<any[]>([]);
    const [financialData, setFinancialData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [filterSucursal, setFilterSucursal] = useState('');
    const [filterEquipo, setFilterEquipo] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({
        sucursal: '',
        equipo: '',
        dateFrom: '',
        dateTo: ''
    });
    const [sucursalesList, setSucursalesList] = useState<string[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [u, n, t, s] = await Promise.all([
                    getUsers(),
                    getNegocios(),
                    getTrabajos(),
                    getMantenimientoSolicitudes()
                ]);
                
                setSolicitudes(s);
                setSucursalesList(n.map((neg: any) => neg.nombre).filter(Boolean));
                
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

                const counts = { Pendientes: 0, 'En Progreso': 0, Finalizados: 0 };
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
                
                const techMap: Record<string, number> = {};
                t.forEach((job: any) => {
                    if (job.trabajador?.nombre) {
                        const name = job.trabajador.nombre;
                        techMap[name] = (techMap[name] || 0) + 1;
                    }
                });
                setTechLoadData(Object.entries(techMap).map(([name, count]) => ({ name, trabajos: count })));

                const typeMap: Record<string, number> = { 'Mantenimiento': 0, 'Reparación': 0, 'Otros': 0 };
                t.forEach((job: any) => {
                    const desc = (job.titulo + job.descripcion || "").toLowerCase();
                    if (desc.includes('mantenimiento')) typeMap['Mantenimiento']++;
                    else if (desc.includes('reparación') || desc.includes('sos')) typeMap['Reparación']++;
                    else typeMap['Otros']++;
                });
                setServiceTypeData([
                    { name: 'Mantenimiento', value: typeMap['Mantenimiento'], color: '#6366f1' },
                    { name: 'Reparación', value: typeMap['Reparación'], color: '#ef4444' },
                    { name: 'Otros', value: typeMap['Otros'], color: '#94a3b8' }
                ]);

                const relevantJobs = t.filter((job: any) => {
                    const jobDate = new Date(job.created_at);
                    return last4Months.some(m => jobDate.getMonth() === m.monthIndex && jobDate.getFullYear() === m.year);
                });

                const quoteResults = await Promise.all(
                    relevantJobs.map(async (job: any) => {
                        try {
                            const quotes = await getCotizacionesByTrabajoId(job.id);
                            if (quotes && quotes.length > 0) {
                                const topQuote = quotes.find(q => q.estado === 'Aprobada') || quotes[0];
                                return { id: job.id, monto: Number(topQuote.monto || 0) };
                            }
                        } catch (e) { }
                        return { id: job.id, monto: 0 };
                    })
                );

                const quoteMap: Record<number, number> = {};
                quoteResults.forEach(res => {
                    quoteMap[res.id] = res.monto;
                });

                const finData = last4Months.map(m => {
                    let totalPendiente = 0;
                    let totalAceptado = 0;
                    t.forEach((job: any) => {
                        const jobDate = new Date(job.created_at);
                        if (jobDate.getMonth() === m.monthIndex && jobDate.getFullYear() === m.year) {
                            const monto = quoteMap[job.id] || 0;
                            if (job.estado === 'Cotización Aceptada' || job.estado === 'Finalizado' || job.estado === 'Logrado (Confirmado)') {
                                totalAceptado += monto;
                            } else {
                                totalPendiente += monto;
                            }
                        }
                    });
                    return { name: m.name, "Venta en Espera": totalPendiente, "Logrado (Confirmado)": totalAceptado };
                });
                setFinancialData(finData);

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
                <h1>¡Bienvenido, {user?.name}!</h1>
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
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
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
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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

                <div className={`${styles.chartCard} ${styles.bitacoraSection}`}>
                    <h3>Carga de Trabajo por Técnico</h3>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={techLoadData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 700}} width={120} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="trabajos" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={styles.chartCard}>
                    <h3>Proyeccción Financiera ($)</h3>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={financialData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend iconType="circle" />
                                <Bar dataKey="Logrado (Confirmado)" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Venta en Espera" stackId="a" fill="#d97706" radius={[10, 10, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={styles.chartCard}>
                    <h3>Composición de Servicio</h3>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={serviceTypeData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value">
                                    {serviceTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            <div className={styles.activityCard}>
                 <h3>Actividad Reciente del Sistema</h3>
                 <p className={styles.empty}>Próximamente: Historial detallado de acciones en tiempo real.</p>
            </div>

            {/* TABLA DE REPORTES TÉCNICOS DE EQUIPOS */}
            <div className={`${styles.chartCard} ${styles.bitacoraSection}`}>
                <div className={styles.bitacoraHeader}>
                    <h3>
                        <HiOutlineWrenchScrewdriver size={22} color="#3b82f6" /> 
                        Bitácora de Equipos
                    </h3>
                    
                    <div className={styles.filterGroup}>
                        <select value={filterSucursal} onChange={e => setFilterSucursal(e.target.value)} className={styles.filterSelect}>
                            <option value="">Todas las Sucursales</option>
                            {Array.from(new Set(sucursalesList)).map(suc => (
                                <option key={suc} value={suc}>{suc}</option>
                            ))}
                        </select>
                        <select value={filterEquipo} onChange={e => setFilterEquipo(e.target.value)} className={styles.filterSelect}>
                            <option value="">Todos los Equipos</option>
                            {Array.from(new Set(solicitudes.map(s => s.levantamiento_equipo ? `${s.levantamiento_equipo.marca} ${s.levantamiento_equipo.modelo}` : null).filter(Boolean))).map(eq => (
                                <option key={eq as string} value={eq as string}>{eq as string}</option>
                            ))}
                        </select>
                        <div className={styles.dateInputGroup}>
                            <span>DESDE:</span>
                            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={styles.filterDate} />
                        </div>
                        <div className={styles.dateInputGroup}>
                            <span>HASTA:</span>
                            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={styles.filterDate} />
                        </div>
                        <button
                            onClick={() => {
                                setAppliedFilters({ sucursal: filterSucursal, equipo: filterEquipo, dateFrom: filterDateFrom, dateTo: filterDateTo });
                            }}
                            className={styles.filterButton}
                        >
                            Buscar
                        </button>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.responsiveTable}>
                        <thead>
                            <tr>
                                <th>FECHA</th>
                                <th>SUCURSAL</th>
                                <th>EQUIPO</th>
                                <th>PROBLEMA REPORTADO</th>
                                <th>TRABAJO REALIZADO</th>
                                <th>PIEZAS / MATERIALES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                let filas: any[] = [];
                                solicitudes.forEach(sol => {
                                    const negocio = sol.negocio?.nombre || 'General';
                                    const equipo = sol.levantamiento_equipo ? `${sol.levantamiento_equipo.marca} ${sol.levantamiento_equipo.modelo}` : 'N/A';
                                    
                                    const solDateObj = new Date(sol.created_at);
                                    const yyyy = solDateObj.getFullYear();
                                    const mm = String(solDateObj.getMonth() + 1).padStart(2, '0');
                                    const dd = String(solDateObj.getDate()).padStart(2, '0');
                                    const solDateFormatted = `${yyyy}-${mm}-${dd}`;

                                    if (appliedFilters.dateFrom && solDateFormatted < appliedFilters.dateFrom) return;
                                    if (appliedFilters.dateTo && solDateFormatted > appliedFilters.dateTo) return;
                                    if (appliedFilters.sucursal && appliedFilters.sucursal !== negocio) return;
                                    if (appliedFilters.equipo && appliedFilters.equipo !== equipo) return;

                                    let reportesInternos: any[] = [];
                                    [sol.visita_trabajo, sol.reparacion_trabajo].forEach(t => {
                                        if (t?.reporte?.solucion) {
                                            try {
                                                const p = JSON.parse(t.reporte.solucion);
                                                if (p.descripcion || p.reporteTienda) {
                                                    reportesInternos.push({
                                                        fecha: solDateObj.toLocaleDateString(),
                                                        fechaRaw: sol.created_at,
                                                        problema: p.reporteTienda || '—',
                                                        trabajo: p.descripcion || '—',
                                                        piezas: Array.isArray(p.refaccionesList) && p.refaccionesList.length > 0
                                                            ? p.refaccionesList.map((r: any) => `${r.cantidad}x ${r.pieza}`).join(' · ')
                                                            : (p.materiales && p.materiales.trim() !== '' ? p.materiales : '—')
                                                    });
                                                }
                                            } catch (e) { }
                                        }
                                    });

                                    const seen = new Set();
                                    reportesInternos.forEach(rep => {
                                        const key = `${rep.problema}-${rep.trabajo}`;
                                        if (!seen.has(key)) {
                                            seen.add(key);
                                            filas.push({ sucursal: negocio, equipo: equipo, ...rep });
                                        }
                                    });
                                });

                                filas.sort((a, b) => new Date(b.fechaRaw).getTime() - new Date(a.fechaRaw).getTime());

                                if (filas.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>
                                                No se encontraron reportes técnicos formales con los filtros actuales.
                                            </td>
                                        </tr>
                                    );
                                }

                                return filas.map((fila, idx) => (
                                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ fontWeight: 'bold', color: '#475569' }}>{fila.fecha}</td>
                                        <td style={{ fontWeight: '800', color: '#0f172a' }}>{fila.sucursal}</td>
                                        <td style={{ fontWeight: '800', color: '#3b82f6' }}>{fila.equipo}</td>
                                        <td style={{ lineHeight: '1.4' }}>{fila.problema}</td>
                                        <td style={{ lineHeight: '1.4' }}>{fila.trabajo}</td>
                                        <td style={{ fontWeight: '600', color: '#059669', lineHeight: '1.4' }}>{fila.piezas}</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
