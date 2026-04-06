import React, { useEffect, useState } from 'react';
import { getTrabajos } from '../../services/trabajosService';
import { getReporteByTrabajoId } from '../../services/reportesService';
import { getActividadesByTrabajo } from '../../services/actividadesService';
import { 
    HiOutlineWrenchScrewdriver, 
    HiOutlineUser, 
    HiOutlineCalendarDays, 
    HiOutlineCube, 
    HiOutlineShieldCheck,
    HiOutlineClock
} from "react-icons/hi2";

interface EquiposNegocioProps {
    businessId: number;
}

const EquiposNegocio: React.FC<EquiposNegocioProps> = ({ businessId }) => {
    const [equipos, setEquipos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEquipos = async () => {
            setLoading(true);
            try {
                const trabajos = await getTrabajos();
                const trabajosSucursal = trabajos.filter((t: any) => t.negocio_id === businessId && t.estado === 'Finalizado');

                const equiposEncontrados: any[] = [];

                for (const job of trabajosSucursal) {
                    // --- ESTRATEGIA DE RESCATE DE TÉCNICO ---
                    // 1. Técnico actual del trabajo
                    // 2. Último técnico asignado en el array de asignaciones
                    // 3. Fallback: "Sin asignar"
                    let techLabel = "Desconocido";
                    if (job.trabajador && job.trabajador.nombre) {
                        techLabel = job.trabajador.nombre;
                    } else if (job.asignaciones && job.asignaciones.length > 0) {
                        // Tomamos el último técnico asignado históricamente
                        techLabel = job.asignaciones[job.asignaciones.length - 1].tecnicoNombre || "Desconocido";
                    }

                    // -- A. Buscar en el reporte final --
                    try {
                        const reporte = await getReporteByTrabajoId(job.id);
                        if (reporte && reporte.solucion) {
                            const reportDataRaw = JSON.parse(reporte.solucion);
                            if (reportDataRaw.involucraEquipo && reportDataRaw.equipoInfo) {
                                equiposEncontrados.push({
                                    ...reportDataRaw.equipoInfo,
                                    reporteId: reportDataRaw.id || job.id,
                                    tecnico: techLabel, 
                                    fechaInstalacion: reportDataRaw.fecha || new Date(job.created_at).toLocaleDateString(),
                                    tituloTrabajo: job.titulo
                                });
                            }
                        }
                    } catch (e) {}

                    // -- B. Buscar en actividades individuales --
                    try {
                        const acts = await getActividadesByTrabajo(job.id);
                        acts.forEach((act: any) => {
                            if (act.equipo) {
                                // Prioridad: Técnico de la actividad > Rescate (techLabel)
                                const activityTech = act.trabajador ? act.trabajador.nombre : techLabel;
                                
                                equiposEncontrados.push({
                                    ...act.equipo,
                                    reporteId: act.id,
                                    tecnico: activityTech,
                                    fechaInstalacion: new Date(act.created_at || job.created_at).toLocaleDateString(),
                                    tituloTrabajo: `${job.titulo} (${act.tipo})`
                                });
                            }
                        });
                    } catch (e) {
                        console.error("Error fetching activities for equipment list", e);
                    }
                }
                
                setEquipos(equiposEncontrados);
            } catch (error) {
                console.error("Error fetching equipos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEquipos();
    }, [businessId]);

    // Función auxiliar para calcular vencimiento
    const calcularVencimiento = (fechaInst: string, mesesGar: string) => {
        try {
            const parts = fechaInst.includes('/') ? fechaInst.split('/') : fechaInst.split('-');
            const dateInst = parts.length === 3 
                ? new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])) 
                : new Date(fechaInst);
            
            if (isNaN(dateInst.getTime())) return null;
            
            dateInst.setMonth(dateInst.getMonth() + parseInt(mesesGar));
            return dateInst.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch { return null; }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0' }}>
                <div className="loader-premium"></div>
                <p style={{ marginTop: '20px', color: '#64748b', fontWeight: '500', letterSpacing: '0.5px' }}>Sincronizando inventario de equipos...</p>
                <style>{`
                    .loader-premium {
                        width: 48px;
                        height: 48px;
                        border: 5px solid #f1f5f9;
                        border-bottom-color: #fbbf24;
                        border-radius: 50%;
                        display: inline-block;
                        box-sizing: border-box;
                        animation: rotation 1s linear infinite;
                    }
                    @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (equipos.length === 0) {
        return (
            <div style={{ padding: '80px 40px', textAlign: 'center', background: '#fff', borderRadius: '30px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '60px', marginBottom: '20px' }}>🌫️</div>
                <h3 style={{ color: '#1e293b', fontSize: '22px', fontWeight: 'bold' }}>Sin equipos registrados</h3>
                <p style={{ color: '#64748b', maxWidth: '400px', margin: '15px auto 0', lineHeight: '1.6' }}>
                    Aún no hay registros de instalaciones o mantenimientos detallados para esta sucursal.
                </p>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '25px', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'grid', gap: '25px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {equipos.map((equipo, idx) => {
                    const vencimiento = equipo.tipo === 'Instalación' && equipo.garantia 
                        ? calcularVencimiento(equipo.fechaInstalacion, equipo.garantia)
                        : null;

                    return (
                        <div key={idx} style={{ 
                            background: '#ffffff', 
                            border: '1px solid #f1f5f9', 
                            borderRadius: '24px', 
                            padding: '24px',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.03)',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '18px',
                            cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 20px 45px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.03)';
                        }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b', textTransform: 'capitalize' }}>
                                        {equipo.marca}
                                    </h4>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                                        Modelo: {equipo.modelo}
                                    </p>
                                </div>
                                <span style={{ 
                                    padding: '6px 14px', 
                                    borderRadius: '12px', 
                                    fontSize: '11px', 
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    background: equipo.tipo === 'Instalación' ? '#eff6ff' : '#fffbeb',
                                    color: equipo.tipo === 'Instalación' ? '#2563eb' : '#d97706',
                                    border: `1px solid ${equipo.tipo === 'Instalación' ? '#dbeafe' : '#fef3c7'}`
                                }}>
                                    {equipo.tipo}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <HiOutlineWrenchScrewdriver style={{ color: '#94a3b8', fontSize: '18px' }} />
                                    <div style={{ fontSize: '13px', color: '#334155' }}>
                                        <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>TAREA</span>
                                        <span style={{ fontWeight: '600' }}>{equipo.tituloTrabajo}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <HiOutlineUser style={{ color: '#94a3b8', fontSize: '18px' }} />
                                    <div style={{ fontSize: '13px', color: '#334155' }}>
                                        <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>TÉCNICO RESPONSABLE</span>
                                        <span style={{ fontWeight: '600' }}>{equipo.tecnico}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <HiOutlineCalendarDays style={{ color: '#94a3b8', fontSize: '18px' }} />
                                    <div style={{ fontSize: '13px', color: '#334155' }}>
                                        <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600' }}>FECHA DE ACTIVIDAD</span>
                                        <span style={{ fontWeight: '600' }}>{equipo.fechaInstalacion}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {equipo.tipo === 'Instalación' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ padding: '12px', border: '1px solid #f1f5f9', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <HiOutlineCube style={{ color: '#3b82f6', fontSize: '16px' }} />
                                        <div style={{ fontSize: '12px' }}>
                                            <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>CANTIDAD</span>
                                            <span style={{ fontWeight: '700', color: '#1e293b' }}>{equipo.piezas} pz</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '12px', border: '1px solid #f1f5f9', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <HiOutlineShieldCheck style={{ color: '#10b981', fontSize: '16px' }} />
                                        <div style={{ fontSize: '12px' }}>
                                            <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>GARANTÍA</span>
                                            <span style={{ fontWeight: '700', color: '#1e293b' }}>{equipo.garantia} Meses</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {vencimiento && (
                                <div style={{ 
                                    marginTop: 'auto',
                                    padding: '12px 16px', 
                                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                                    borderRadius: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: '1px solid #bbfc0420'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <HiOutlineClock style={{ color: '#16a34a', fontSize: '18px' }} />
                                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>Vencimiento de Garantía</span>
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#15803d' }}>{vencimiento}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default EquiposNegocio;
