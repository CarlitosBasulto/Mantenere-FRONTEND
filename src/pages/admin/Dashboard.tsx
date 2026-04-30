import React, { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { HiOutlineUsers, HiOutlineBriefcase, HiOutlineDocumentText, HiOutlineClipboardDocumentCheck, HiOutlineCube } from 'react-icons/hi2';

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
        cotizaciones: 0,
        piezas: 0
    });
    const [showPiezasModal, setShowPiezasModal] = useState(false);
    const [piezasFilterSucursal, setPiezasFilterSucursal] = useState('');
    const [piezasFilterTime, setPiezasFilterTime] = useState('');
    const [piezasFilterText, setPiezasFilterText] = useState('');
    const [trendData, setTrendData] = useState<any[]>([]);
    const [statusData, setStatusData] = useState<any[]>([]);
    const [techLoadData, setTechLoadData] = useState<any[]>([]);
    const [serviceTypeData, setServiceTypeData] = useState<any[]>([]);
    const [financialData, setFinancialData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [todosTrabajos, setTodosTrabajos] = useState<any[]>([]);
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
                setTodosTrabajos(t);
                setSucursalesList(n.map((neg: any) => neg.nombre).filter(Boolean));
                
                const cotizacionesCount = t.filter((job: any) => 
                    job.cotizado || 
                    ["Cotización Enviada", "Cotización Aceptada", "Cotización Rechazada"].includes(job.estado)
                ).length;

                let conteoPiezas = 0;
                const processedReports = new Set<string>();

                const processReport = (solucionStr: string) => {
                    if (processedReports.has(solucionStr)) return;
                    processedReports.add(solucionStr);
                    try {
                        const p = JSON.parse(solucionStr);
                        if (Array.isArray(p.refaccionesList) && p.refaccionesList.length > 0) {
                            p.refaccionesList.forEach((r: any) => {
                                conteoPiezas += Number(r.cantidad) || 0;
                            });
                        } else if (p.materiales && p.materiales.trim() !== '') {
                            conteoPiezas += 1;
                        }
                    } catch (e) { }
                };

                s.forEach((sol: any) => {
                    [sol.visita_trabajo, sol.reparacion_trabajo].forEach(tr => {
                        if (tr?.reporte?.solucion) processReport(tr.reporte.solucion);
                    });
                });

                t.forEach((job: any) => {
                    if (job?.reporte?.solucion) processReport(job.reporte.solucion);
                });

                setStats({
                    usuarios: u.length,
                    negocios: n.length,
                    trabajos: t.length,
                    cotizaciones: cotizacionesCount || 0,
                    piezas: conteoPiezas
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

                <div 
                    className={styles.statCard} 
                    style={{ cursor: 'pointer', border: '1px solid #e0e7ff', background: '#f8fafc' }} 
                    onClick={() => setShowPiezasModal(true)}
                >
                    <div className={`${styles.iconBg} ${styles.blue}`} style={{ backgroundColor: '#6366f1' }}>
                        <HiOutlineCube size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <h3>{stats.piezas}</h3>
                        <p>Piezas y Refacciones</p>
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


            {/* MODAL DE PIEZAS Y REFACCIONES */}
            {showPiezasModal && (() => {
                let reportesConPiezas: any[] = [];
                const processedReportsSet = new Set<string>();
                
                const processJobReport = (job: any, negocio: string, equipo: string, solDate: Date) => {
                    if (!job?.reporte?.solucion) return;
                    if (processedReportsSet.has(job.reporte.solucion)) return;
                    processedReportsSet.add(job.reporte.solucion);

                    const fechaSol = solDate.toLocaleDateString();

                    if (piezasFilterSucursal && piezasFilterSucursal !== negocio) return;
                    
                    if (piezasFilterTime) {
                        const monthsLimit = parseInt(piezasFilterTime, 10);
                        const limitDate = new Date();
                        limitDate.setMonth(limitDate.getMonth() - monthsLimit);
                        if (solDate < limitDate) return;
                    }

                    try {
                        const p = JSON.parse(job.reporte.solucion);
                        let listaPiezas: string[] = [];
                        let rowCount = 0;
                        if (Array.isArray(p.refaccionesList) && p.refaccionesList.length > 0) {
                            listaPiezas = p.refaccionesList.map((r: any) => {
                                rowCount += Number(r.cantidad) || 0;
                                return `${r.cantidad}x ${r.pieza}`;
                            });
                        } else if (p.materiales && p.materiales.trim() !== '') {
                            listaPiezas = [p.materiales];
                            rowCount = 1;
                        }

                        if (listaPiezas.length > 0) {
                            reportesConPiezas.push({
                                fecha: fechaSol,
                                fechaRaw: job.created_at || solDate,
                                sucursal: negocio,
                                equipo: equipo,
                                problema: p.reporteTienda || p.descripcion || '—',
                                piezas: listaPiezas,
                                countPiezas: rowCount
                            });
                        }
                    } catch (e) { }
                };

                // Iterar Mantenimientos (Tienen equipo asociado)
                solicitudes.forEach(sol => {
                    const negocio = sol.negocio?.nombre || 'General';
                    const equipo = sol.levantamiento_equipo ? `${sol.levantamiento_equipo.marca} ${sol.levantamiento_equipo.modelo}` : 'N/A';
                    const solDate = new Date(sol.created_at);
                    
                    [sol.visita_trabajo, sol.reparacion_trabajo].forEach(t => {
                        processJobReport(t, negocio, equipo, solDate);
                    });
                });

                // Iterar Trabajos Normales
                todosTrabajos.forEach(job => {
                    const solDate = new Date(job.created_at);
                    const negocio = job.negocio ? (job.negocio.nombrePlaza ? `${job.negocio.nombre} - ${job.negocio.nombrePlaza}` : job.negocio.nombre) : 'General';
                    // Intentar extraer el equipo desde el reporte si existe
                    let equipo = 'N/A';
                    if (job?.reporte?.solucion) {
                        try {
                            const p = JSON.parse(job.reporte.solucion);
                            if (p.equipoInfo && p.equipoInfo.marca) {
                                equipo = `${p.equipoInfo.marca} ${p.equipoInfo.modelo}`;
                            }
                        } catch(e) {}
                    }
                    
                    processJobReport(job, negocio, equipo, solDate);
                });

                const seen = new Set();
                const finalRows: any[] = [];
                reportesConPiezas.forEach(rep => {
                    const key = `${rep.sucursal}-${rep.problema}-${rep.piezas.join(',')}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        finalRows.push(rep);
                    }
                });

                finalRows.sort((a, b) => new Date(b.fechaRaw).getTime() - new Date(a.fechaRaw).getTime());

                let finalRowsFiltradas = finalRows;
                if (piezasFilterText.trim()) {
                    const searchLower = piezasFilterText.toLowerCase();
                    finalRowsFiltradas = finalRows.filter(r => 
                        r.piezas.some((p: string) => p.toLowerCase().includes(searchLower)) ||
                        r.problema.toLowerCase().includes(searchLower) ||
                        r.equipo.toLowerCase().includes(searchLower)
                    );
                }

                let totalFilteredPiezas = 0;
                finalRowsFiltradas.forEach(r => { totalFilteredPiezas += r.countPiezas; });

                return (
                    <div className={styles.piezasModalOverlay}>
                        <div className={styles.piezasModalContent}>
                            <div className={styles.piezasModalHeader}>
                                <h2><HiOutlineCube size={26} color="#6366f1" /> Detalle de Piezas y Refacciones</h2>
                                <button onClick={() => setShowPiezasModal(false)} className={styles.piezasModalClose}>
                                    <span style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: '1' }}>✕</span>
                                </button>
                            </div>
                            
                            <div className={styles.piezasFilterGroup}>
                                <select 
                                    value={piezasFilterSucursal} 
                                    onChange={e => setPiezasFilterSucursal(e.target.value)} 
                                    className={styles.filterSelect}
                                    style={{ flex: '1', minWidth: '150px', maxWidth: '300px' }}
                                >
                                    <option value="">Todas las Sucursales</option>
                                    {Array.from(new Set(sucursalesList)).map(suc => (
                                        <option key={suc} value={suc}>{suc}</option>
                                    ))}
                                </select>

                                <select 
                                    value={piezasFilterTime} 
                                    onChange={e => setPiezasFilterTime(e.target.value)} 
                                    className={styles.filterSelect}
                                    style={{ flex: '1', minWidth: '150px', maxWidth: '200px' }}
                                >
                                    <option value="">Todo el tiempo</option>
                                    <option value="1">Último Mes</option>
                                    <option value="2">Últimos 2 Meses</option>
                                    <option value="6">Últimos 6 Meses</option>
                                </select>

                                <input
                                    type="text"
                                    placeholder="Buscar por pieza, problema o equipo..."
                                    value={piezasFilterText}
                                    onChange={e => setPiezasFilterText(e.target.value)}
                                    className={styles.filterDate}
                                    style={{ flex: '2', minWidth: '220px', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}
                                />

                                <div className={styles.piezasTotalBadge}>
                                    Total de piezas usadas: {totalFilteredPiezas}
                                </div>
                            </div>

                            <div className={styles.piezasTableContainer}>
                                <table className={styles.responsiveTable}>
                                    <thead>
                                        <tr>
                                            <th style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0 }}>FECHA</th>
                                            <th style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0 }}>SUCURSAL</th>
                                            <th style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0 }}>EQUIPO</th>
                                            <th style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0 }}>CAUSA / PROBLEMA</th>
                                            <th style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0 }}>PIEZAS UTILIZADAS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {finalRowsFiltradas.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                                                    No se encontraron consumos de piezas con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        ) : (
                                            finalRowsFiltradas.map((fila, idx) => (
                                                <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ color: '#64748b', fontWeight: 'bold' }}>{fila.fecha}</td>
                                                    <td style={{ color: '#0f172a', fontWeight: 'bold' }}>{fila.sucursal}</td>
                                                    <td style={{ color: '#6366f1', fontWeight: 'bold' }}>{fila.equipo}</td>
                                                    <td>{fila.problema}</td>
                                                    <td style={{ color: '#059669', fontWeight: 'bold' }}>
                                                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                                            {fila.piezas.map((p: string, i: number) => {
                                                                const isMatch = piezasFilterText.trim() && p.toLowerCase().includes(piezasFilterText.toLowerCase());
                                                                return (
                                                                    <li key={i} style={{ marginBottom: '4px', background: isMatch ? '#fef08a' : 'transparent', borderRadius: '4px', padding: isMatch ? '0 4px' : '0' }}>{p}</li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default Dashboard;
