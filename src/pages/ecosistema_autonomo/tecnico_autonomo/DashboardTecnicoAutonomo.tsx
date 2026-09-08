import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DashboardTecnicoAutonomo.module.css';
import { getTrabajos } from '../../../services/trabajosService';
import { getNegocios } from '../../../services/autonomo/negociosService';
import {
    HiOutlineCalendarDays,
    HiOutlineClock,
    HiOutlineDocumentCurrencyDollar,
    HiOutlineExclamationCircle,
    HiOutlineBriefcase,
    HiOutlineMapPin,
    HiOutlineChevronDown
} from 'react-icons/hi2';

const DashboardTecnicoAutonomo: React.FC = () => {
console.log('STYLES:', styles);
    const navigate = useNavigate();
    const [trabajos, setTrabajos] = useState<any[]>([]);
    const [negocios, setNegocios] = useState<any[]>([]);
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [tData, nData] = await Promise.all([getTrabajos(), getNegocios()]);
                setTrabajos(tData);
                setNegocios(nData);
                if (nData.length > 0) {
                    setExpanded({ [nData[0].id]: true });
                }
            } catch(e) {}
            setLoading(false);
        };
        load();
    }, []);

    const toggle = (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    if (loading) return <div style={{padding:'20px'}}>Cargando...</div>;

    return (
        <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', marginBottom: '24px' }}>Mi Tablero de Trabajos</h1>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {negocios.map(negocio => {
                    const isOpen = expanded[negocio.id];
                    const jobs = trabajos.filter(t => t.negocio_id === negocio.id);
                    
                    return (
                        <div key={negocio.id} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div onClick={() => toggle(negocio.id)} style={{ padding: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isOpen ? '#f1f5f9' : '#fff', borderBottom: isOpen ? '1px solid #e2e8f0' : 'none', transition: 'background 0.2s' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <HiOutlineBriefcase color="#3b82f6" /> {negocio.nombre}
                                    </h2>
                                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <HiOutlineMapPin /> {negocio.calle || ''} {negocio.colonia || ''}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <HiOutlineChevronDown size={24} color="#94a3b8" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                                </div>
                            </div>
                            
                            {isOpen && (
                                <div style={{ padding: '24px', background: '#fafaf9' }}>
                                    {/* TABLERO DETALLES */}
                                    <div className={styles.tableroWrapper} style={{ marginBottom: '24px' }}>
                                        <h3 className={styles.tableroTitle}>TABLERO DETALLES</h3>
                                        <div className={styles.tableroGrid}>
                                            <div className={`${styles.tableroCard} ${styles.bgYellow}`}>
                                                <div className={styles.dotYellow}></div>
                                                <div className={styles.tableroCount}>
                                                    {trabajos.filter(t => t.negocio_id === negocio.id && ['Solicitud', 'Pendiente', 'Cotización Enviada'].includes(t.estado) && t.prioridad !== 'Emergencia').length}
                                                </div>
                                                <div className={styles.tableroLabel}>POR AUTORIZAR</div>
                                            </div>
                                            <div className={`${styles.tableroCard} ${styles.bgRed}`}>
                                                <div className={styles.dotRed}></div>
                                                <div className={styles.tableroCount}>
                                                    {trabajos.filter(t => t.negocio_id === negocio.id && t.prioridad === 'Emergencia' && !['Finalizado', 'Completado', 'Rechazada', 'Cotización Rechazada'].includes(t.estado)).length}
                                                </div>
                                                <div className={styles.tableroLabel}>SOS ACTIVO</div>
                                            </div>
                                            <div className={`${styles.tableroCard} ${styles.bgBlue}`}>
                                                <div className={styles.dotBlue}></div>
                                                <div className={styles.tableroCount}>
                                                    {trabajos.filter(t => t.negocio_id === negocio.id && ['En Espera', 'Aceptada', 'Cotización Aceptada'].includes(t.estado) && t.prioridad !== 'Emergencia').length}
                                                </div>
                                                <div className={styles.tableroLabel}>AUTORIZADOS</div>
                                            </div>
                                            <div className={`${styles.tableroCard} ${styles.bgOrange}`}>
                                                <div className={styles.dotOrange}></div>
                                                <div className={styles.tableroCount}>
                                                    {trabajos.filter(t => t.negocio_id === negocio.id && t.estado === 'Asignado' && t.tipo !== 'Trabajo' && t.prioridad !== 'Emergencia').length}
                                                </div>
                                                <div className={styles.tableroLabel}>POR HACER</div>
                                            </div>
                                            <div className={`${styles.tableroCard} ${styles.bgGreen}`}>
                                                <div className={styles.dotGreen}></div>
                                                <div className={styles.tableroCount}>
                                                    {trabajos.filter(t => t.negocio_id === negocio.id && (t.estado === 'En Proceso' || (t.estado === 'Asignado' && t.tipo === 'Trabajo')) && t.prioridad !== 'Emergencia').length}
                                                </div>
                                                <div className={styles.tableroLabel}>EN PROCESO</div>
                                            </div>
                                            <div className={`${styles.tableroCard} ${styles.bgPurple}`}>
                                                <div className={styles.dotPurple}></div>
                                                <div className={styles.tableroCount}>
                                                    {trabajos.filter(t => t.negocio_id === negocio.id && ['Finalizado', 'Completado'].includes(t.estado)).length}
                                                </div>
                                                <div className={styles.tableroLabel}>FINALIZADOS</div>
                                            </div>
                                        </div>
                                    </div>
                                    {jobs.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No hay trabajos en esta sucursal.</div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                            {jobs.filter(t => t.estado !== 'Rechazada').map(t => (
                                                <div key={t.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: t.tipo === 'SOS' ? '#ef4444' : '#3b82f6', background: t.tipo === 'SOS' ? '#fef2f2' : '#eff6ff', padding: '4px 8px', borderRadius: '4px' }}>
                                                            {t.tipo}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: '#64748b' }}>#{t.id}</span>
                                                    </div>
                                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1e293b' }}>{t.titulo}</h3>
                                                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#334155' }}>Problema:</span> {t.descripcion || 'Sin descripción'}
                                                    </p>
                                                    <div style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span>Estado: <strong>{t.estado}</strong></span>
                                                        <span>📅 {t.fecha_programada ? new Date(t.fecha_programada + 'T00:00:00').toLocaleDateString() : 'Por asignar'} {t.horaAsignada ? ` a las ${t.horaAsignada}` : ''}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => navigate(`/tecnico-autonomo/trabajo-detalle/${t.id}`)}
                                                        style={{ width: '100%', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                                                    >
                                                        Ver Detalles
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
export default DashboardTecnicoAutonomo;

