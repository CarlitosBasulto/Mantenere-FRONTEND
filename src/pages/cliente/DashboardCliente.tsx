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
    HiOutlineComputerDesktop,
    HiOutlineTag,
    HiOutlineHashtag,
    HiOutlineCalendarDays,
    HiOutlineClock
} from 'react-icons/hi2';

import { useAuth } from '../../context/AuthContext';
import { getNegocios } from '../../services/negociosService';
import { getTrabajos } from '../../services/trabajosService';
import { getMantenimientoSolicitudes } from '../../services/mantenimientoService';
import { getEncargadoSucursal } from '../../services/usersService';
import { HiOutlineCube } from 'react-icons/hi';

const DashboardCliente: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        sucursales: 0,
        cotizaciones: 0,
        trabajos: 0,
        equiposRegistrados: 0,
        piezas: 0
    });
    
    const [trabajosPorMes, setTrabajosPorMes] = useState<any[]>([]);
    const [estadoTrabajos, setEstadoTrabajos] = useState<any[]>([]);
    const [tecnicosRecientes, setTecnicosRecientes] = useState<any[]>([]);
    const [encargadosList, setEncargadosList] = useState<any[]>([]);
    const [misTrabajosState, setMisTrabajosState] = useState<any[]>([]);
    
    // Estados para Piezas y Refacciones
    const [misSolicitudesMantenimiento, setMisSolicitudesMantenimiento] = useState<any[]>([]);
    const [showPiezasModal, setShowPiezasModal] = useState(false);
    const [piezasFilterSucursal, setPiezasFilterSucursal] = useState<string>('');
    const [piezasFilterTime, setPiezasFilterTime] = useState<string>('');
    const [piezasFilterText, setPiezasFilterText] = useState<string>('');
    const [sucursalesList, setSucursalesList] = useState<string[]>([]);

    // Estados para Equipos Levantados Modal
    const [misNegociosState, setMisNegociosState] = useState<any[]>([]);
    const [showEquiposModal, setShowEquiposModal] = useState(false);
    const [equiposFilterSucursal, setEquiposFilterSucursal] = useState<string>('');
    const [equiposFilterText, setEquiposFilterText] = useState<string>('');

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            
            try {
                // Fetch basic data
                const [negociosAll, trabajosAll, mantenimientosAll] = await Promise.all([
                    getNegocios(),
                    getTrabajos(),
                    getMantenimientoSolicitudes()
                ]);

                // 1. Filtrar negocios del cliente
                const misNegocios = negociosAll.filter((neg: any) => 
                    neg.dueno === user.name || neg.user_id === user.id
                );
                const misNegociosIds = misNegocios.map((n: any) => n.id);
                setMisNegociosState(misNegocios);

                // 2. Filtrar trabajos de los negocios del cliente
                const misTrabajos = trabajosAll.filter((job: any) => 
                    misNegociosIds.includes(job.negocio_id)
                );
                setMisTrabajosState(misTrabajos);

                // 2.5 Filtrar solicitudes de mantenimiento
                const misSolicitudes = mantenimientosAll.filter((sol: any) =>
                    misNegociosIds.includes(sol.negocio_id)
                );
                setMisSolicitudesMantenimiento(misSolicitudes);
                setSucursalesList(misNegocios.map((n: any) => n.nombre));

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

                // Calcular total de piezas
                let totalPiezasUsed = 0;
                const countPiezas = (reporteJson: string) => {
                    try {
                        const p = JSON.parse(reporteJson);
                        if (Array.isArray(p.refaccionesList) && p.refaccionesList.length > 0) {
                            p.refaccionesList.forEach((r: any) => { totalPiezasUsed += Number(r.cantidad) || 0; });
                        } else if (p.materiales && p.materiales.trim() !== '') {
                            totalPiezasUsed += 1;
                        }
                    } catch(e) {}
                };
                
                misTrabajos.forEach((job: any) => {
                    if (job.reporte?.solucion) countPiezas(job.reporte.solucion);
                });
                misSolicitudes.forEach((sol: any) => {
                    if (sol.visita_trabajo?.reporte?.solucion) countPiezas(sol.visita_trabajo.reporte.solucion);
                    if (sol.reparacion_trabajo?.reporte?.solucion) countPiezas(sol.reparacion_trabajo.reporte.solucion);
                });

                setStats({
                    sucursales: misNegocios.length,
                    cotizaciones: cotizacionesTotales,
                    trabajos: misTrabajos.length,
                    equiposRegistrados: totalEquipos,
                    piezas: totalPiezasUsed
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

                <div 
                    className={styles.statCard}
                    style={{ cursor: 'pointer', border: '1px solid #bbf7d0' }}
                    onClick={() => setShowEquiposModal(true)}
                >
                    <div className={`${styles.iconBg} ${styles.green}`}>
                        <HiOutlineComputerDesktop size={24} color="#10b981" />
                    </div>
                    <div className={styles.statInfo}>
                        <h3 style={{ color: '#059669' }}>{stats.equiposRegistrados}</h3>
                        <p style={{ color: '#059669', fontWeight: 600 }}>Equipos Levantados &rarr;</p>
                    </div>
                </div>

                <div 
                    className={styles.statCard} 
                    style={{ cursor: 'pointer', border: '1px solid #c7d2fe' }}
                    onClick={() => setShowPiezasModal(true)}
                >
                    <div className={`${styles.iconBg} ${styles.blue}`}>
                        <HiOutlineCube size={24} color="#6366f1" />
                    </div>
                    <div className={styles.statInfo}>
                        <h3 style={{ color: '#4f46e5' }}>{stats.piezas}</h3>
                        <p style={{ color: '#4f46e5', fontWeight: 600 }}>Piezas / Refacciones &rarr;</p>
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

                misSolicitudesMantenimiento.forEach((sol: any) => {
                    const negocio = sol.negocio?.nombre || 'General';
                    const equipo = sol.levantamiento_equipo ? `${sol.levantamiento_equipo.marca} ${sol.levantamiento_equipo.modelo}` : 'N/A';
                    const solDate = new Date(sol.created_at);
                    
                    [sol.visita_trabajo, sol.reparacion_trabajo].forEach(t => {
                        if (t) processJobReport(t, negocio, equipo, solDate);
                    });
                });

                misTrabajosState.forEach((job: any) => {
                    const solDate = new Date(job.created_at);
                    const negocio = job.negocio ? (job.negocio.nombrePlaza ? `${job.negocio.nombre} - ${job.negocio.nombrePlaza}` : job.negocio.nombre) : 'General';
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
                                <h2><HiOutlineCube size={26} color="#6366f1" /> Mis Piezas y Refacciones</h2>
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
                                    <option value="">Todas mis Sucursales</option>
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

            {showEquiposModal && (() => {
                let allEquipos: any[] = [];
                misNegociosState.forEach(neg => {
                    if (neg.areas && Array.isArray(neg.areas)) {
                        neg.areas.forEach((area: any) => {
                            if (area.equipos && Array.isArray(area.equipos)) {
                                area.equipos.forEach((eq: any) => {
                                    allEquipos.push({
                                        sucursal: neg.nombre,
                                        area: area.nombre,
                                        marca: eq.marca,
                                        modelo: eq.modelo,
                                        numero_serie: eq.numero_serie,
                                        anio_fabricacion: eq.anio_fabricacion || 'N/A',
                                        capacidad: eq.capacidad || 'N/A',
                                        voltaje: eq.voltaje || 'N/A',
                                        fases: eq.fases || 'N/A',
                                        fecha_instalacion: eq.fecha_instalacion || 'N/A',
                                        imagen: eq.imagen_path
                                    });
                                });
                            }
                        });
                    }
                });

                let filteredEquipos = allEquipos;
                if (equiposFilterSucursal) {
                    filteredEquipos = filteredEquipos.filter(eq => eq.sucursal === equiposFilterSucursal);
                }
                if (equiposFilterText.trim()) {
                    const searchLower = equiposFilterText.toLowerCase();
                    filteredEquipos = filteredEquipos.filter(eq => 
                        (eq.marca && eq.marca.toLowerCase().includes(searchLower)) ||
                        (eq.modelo && eq.modelo.toLowerCase().includes(searchLower)) ||
                        (eq.numero_serie && eq.numero_serie.toLowerCase().includes(searchLower))
                    );
                }

                return (
                    <div className={styles.piezasModalOverlay}>
                        <div className={styles.piezasModalContent}>
                            <div className={styles.piezasModalHeader}>
                                <h2><HiOutlineComputerDesktop size={26} color="#10b981" /> Mis Equipos Levantados</h2>
                                <button onClick={() => setShowEquiposModal(false)} className={styles.piezasModalClose}>
                                    <span style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: '1' }}>✕</span>
                                </button>
                            </div>

                            <div className={styles.piezasFilterGroup}>
                                <select 
                                    value={equiposFilterSucursal} 
                                    onChange={e => setEquiposFilterSucursal(e.target.value)} 
                                    className={styles.filterSelect}
                                    style={{ flex: '1', minWidth: '150px', maxWidth: '300px' }}
                                >
                                    <option value="">Todas mis Sucursales</option>
                                    {Array.from(new Set(sucursalesList)).map(suc => (
                                        <option key={suc} value={suc}>{suc}</option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    placeholder="Buscar por marca, modelo o serie..."
                                    value={equiposFilterText}
                                    onChange={e => setEquiposFilterText(e.target.value)}
                                    className={styles.filterDate}
                                    style={{ flex: '2', minWidth: '220px', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}
                                />

                                <div className={styles.piezasTotalBadge} style={{ background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0' }}>
                                    Total de equipos: {filteredEquipos.length}
                                </div>
                            </div>

                            <div className={styles.piezasTableContainer} style={{ padding: '20px', background: '#f8fafc' }}>
                                {filteredEquipos.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                                        No se encontraron equipos registrados con los filtros seleccionados.
                                    </div>
                                ) : (
                                    <div className={styles.equiposGridList}>
                                        {filteredEquipos.map((eq, idx) => (
                                            <div key={idx} className={styles.equipoDetalleCard}>
                                                <div className={styles.equipoCardHeader}>
                                                    <div>
                                                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{eq.marca} {eq.modelo}</h3>
                                                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Área: {eq.area}</p>
                                                    </div>
                                                    <div className={styles.equipoCardSucursal}>
                                                        {eq.sucursal}
                                                    </div>
                                                </div>

                                                <div className={styles.equipoPhotoContainer}>
                                                    {eq.imagen ? (
                                                        <img 
                                                            src={`https://mantenere-backend-production.up.railway.app/storage/${eq.imagen}`} 
                                                            alt="Equipo" 
                                                            className={styles.equipoMainPhoto}
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className={styles.equipoNoPhoto}>Sin foto de evidencia</div>
                                                    )}
                                                </div>

                                                <div className={styles.equipoDataGrid}>
                                                    <div className={styles.equipoDataItem}>
                                                        <HiOutlineTag size={18} color="#3b82f6" style={{ marginBottom: '4px' }} />
                                                        <div className={styles.equipoDataLabel}>Marca / Modelo</div>
                                                        <div className={styles.equipoDataValue}>{eq.marca} - {eq.modelo}</div>
                                                    </div>

                                                    <div className={styles.equipoDataItem}>
                                                        <HiOutlineHashtag size={18} color="#3b82f6" style={{ marginBottom: '4px' }} />
                                                        <div className={styles.equipoDataLabel}>Número de Serie</div>
                                                        <div className={styles.equipoDataValue}>{eq.numero_serie || 'N/A'}</div>
                                                    </div>

                                                    <div className={styles.equipoDataItem}>
                                                        <HiOutlineCalendarDays size={18} color="#3b82f6" style={{ marginBottom: '4px' }} />
                                                        <div className={styles.equipoDataLabel}>Año Fabricación</div>
                                                        <div className={styles.equipoDataValue}>{eq.anio_fabricacion || 'N/A'}</div>
                                                    </div>

                                                    <div className={styles.equipoDataItem}>
                                                        <HiOutlineClock size={18} color="#3b82f6" style={{ marginBottom: '4px' }} />
                                                        <div className={styles.equipoDataLabel}>Capacidad / Voltaje</div>
                                                        <div className={styles.equipoDataValue}>
                                                            {eq.capacidad !== 'N/A' ? eq.capacidad : ''} {eq.voltaje !== 'N/A' ? `| ${eq.voltaje}` : ''}
                                                            {eq.capacidad === 'N/A' && eq.voltaje === 'N/A' ? 'N/A' : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default DashboardCliente;
