import React, { useState } from 'react';
import { createPortal } from "react-dom";
import { HiOutlineCalendarDays, HiOutlineWrenchScrewdriver, HiOutlineCheckCircle, HiXMark, HiChevronDown, HiChevronUp, HiOutlineClipboardDocumentList } from "react-icons/hi2";

interface HistorialEquipoModalProps {
    isOpen: boolean;
    onClose: () => void;
    equipo: any;
    historial: any[];
    onViewReport?: (trabajoId: number) => void;
}

const HistorialEquipoModal: React.FC<HistorialEquipoModalProps> = ({ isOpen, onClose, equipo, historial, onViewReport }) => {
    const [expandedIds, setExpandedIds] = useState<number[]>([]);

    if (!isOpen || !equipo) return null;

    const toggleExpand = (index: number) => {
        setExpandedIds(prev =>
            prev.includes(index) ? prev.filter(id => id !== index) : [...prev, index]
        );
    };

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: '#fff', borderRadius: '24px', maxWidth: '700px', width: '100%',
                maxHeight: '85vh', overflowY: 'auto', position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', padding: '35px'
            }} onClick={e => e.stopPropagation()}>

                <button onClick={onClose} style={{
                    position: 'absolute', top: '25px', right: '25px', background: '#f1f5f9', border: 'none',
                    width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s ease'
                }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                >
                    <HiXMark size={20} />
                </button>

                <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', marginBottom: '30px' }}>
                    {equipo.foto && (
                        <img
                            src={equipo.foto}
                            alt={equipo.nombre}
                            style={{ width: '130px', height: '130px', objectFit: 'cover', borderRadius: '20px', border: '2px solid #e2e8f0' }}
                        />
                    )}
                    <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
                            {equipo.nombre}
                        </span>
                        <h3 style={{ margin: '0 0 15px', fontSize: '26px', color: '#0f172a', fontWeight: '800', lineHeight: '1.2' }}>
                            {equipo.marca} {equipo.modelo}
                        </h3>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ background: '#f8fafc', padding: '10px 15px', borderRadius: '12px', flex: 1, border: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>NÚM. DE SERIE</span>
                                <p style={{ margin: 0, fontWeight: '700', color: '#334155', fontSize: '14px' }}>{equipo.serie}</p>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px 15px', borderRadius: '12px', flex: 1, border: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>FABRICACIÓN / USO</span>
                                <p style={{ margin: 0, fontWeight: '700', color: '#334155', fontSize: '14px' }}>
                                    {equipo.anioFabricacion} <span style={{ color: '#cbd5e1' }}>/</span> {equipo.anioUso}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '2px solid #f8fafc', paddingTop: '30px' }}>
                    <h4 style={{ fontSize: '18px', color: '#0f172a', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        Historial de Intervenciones
                        <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                            {historial.length}
                        </span>
                    </h4>

                    {historial.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
                            <h4 style={{ margin: '0 0 5px', color: '#334155', fontSize: '16px' }}>Sin reportes registrados</h4>
                            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Este equipo no cuenta con historial técnico ni reparaciones previas registradas.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {historial.map((req, idx) => {
                                const isExpanded = expandedIds.includes(idx);

                                // Extraer reportes en tiempo real del JSON anidado por si el mapping superior falló
                                let finalReports = [...(req.reportes || [])];
                                [req.visita_trabajo, req.reparacion_trabajo].forEach(t => {
                                    if (t?.reporte?.solucion) {
                                        try {
                                            const p = JSON.parse(t.reporte.solucion);
                                            if (p.descripcion || p.reporteTienda || p.observaciones) {
                                                finalReports.push({
                                                    falla_encontrada: p.descripcion || p.reporteTienda || 'Problema',
                                                    solucion: p.observaciones || p.reporteTienda || 'Finalizado'
                                                });
                                            }
                                        } catch (e) { }
                                    }
                                });

                                return (
                                    <div key={idx}
                                        onClick={() => toggleExpand(idx)}
                                        style={{
                                            padding: '24px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '20px',
                                            background: '#ffffff',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: isExpanded ? '0 10px 25px -5px rgba(0,0,0,0.05)' : 'none'
                                        }}>
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: req.estado === 'Finalizado' || req.estado?.includes('Aceptada') ? '#10b981' : '#3b82f6' }}></div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <HiOutlineCalendarDays style={{ color: '#94a3b8' }} /> {new Date(req.created_at).toLocaleDateString()}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{
                                                    padding: '6px 14px', borderRadius: '30px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
                                                    background: req.estado === 'Finalizado' || req.estado?.includes('Aceptada') ? '#ecfdf5' : '#eff6ff',
                                                    color: req.estado === 'Finalizado' || req.estado?.includes('Aceptada') ? '#059669' : '#2563eb',
                                                    border: `1px solid ${req.estado === 'Finalizado' || req.estado?.includes('Aceptada') ? '#a7f3d0' : '#bfdbfe'}`
                                                }}>
                                                    {req.estado}
                                                </span>
                                                {isExpanded ? <HiChevronUp size={20} color="#94a3b8" /> : <HiChevronDown size={20} color="#94a3b8" />}
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '15px', color: '#1e293b', margin: '0', display: 'flex', alignItems: 'flex-start', gap: '10px', lineHeight: '1.5' }}>
                                            <HiOutlineWrenchScrewdriver style={{ marginTop: '3px', flexShrink: 0, color: '#f59e0b', fontSize: '18px' }} />
                                            <div>
                                                <span style={{ fontWeight: '800', color: '#64748b', fontSize: '11px', display: 'block', marginBottom: '2px' }}>REPORTE DEL CLIENTE</span>
                                                <span style={{ fontWeight: '500' }}>"{req.descripcion_problema}"</span>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed #e2e8f0', animation: 'fadeIn 0.3s ease-out' }}>

                                                {/* Detalle Técnico */}
                                                {!finalReports.length && (!req.visitas || req.visitas.length === 0) ? (
                                                    <div style={{ textAlign: 'center', padding: '15px', background: '#f8fafc', borderRadius: '12px' }}>
                                                        <span style={{ color: '#64748b', fontSize: '13px' }}>Aún no hay reportes técnicos finalizados para esta intervención.</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {(req.visitas && req.visitas.length > 0) && (
                                                            <div style={{ marginBottom: finalReports.length > 0 ? '15px' : '0' }}>
                                                                <p style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.5px' }}>INTERVENCIONES TÉCNICAS:</p>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {req.visitas.map((v: any, i: number) => (
                                                                        <div key={i} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '10px' }}>
                                                                            <HiOutlineCheckCircle style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                                                                            <div>
                                                                                <strong style={{ color: '#1e293b' }}>{v.tecnico?.name || 'Técnico'}</strong>
                                                                                <p style={{ margin: '4px 0 0', lineHeight: '1.4' }}>{v.reporte_solucion || 'Revisión técnica en proceso.'}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(finalReports.length > 0) && (
                                                            <div>
                                                                <p style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.5px' }}>REPORTE TÉCNICO FORMAL:</p>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {finalReports.map((rep: any, i: number) => (
                                                                        <div key={i} 
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                const targetId = rep.id || req.actualTrabajoId;
                                                                                if (targetId) {
                                                                                    onViewReport(targetId);
                                                                                }
                                                                            }}
                                                                            style={{ fontSize: '13px', color: '#475569', background: '#f0fdf4', padding: '15px', borderRadius: '12px', border: '1px solid #bbf7d0', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                                                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#22c55e'}
                                                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#bbf7d0'}
                                                                        >
                                                                            <p style={{ margin: '0 0 8px', display: 'flex', gap: '8px' }}>
                                                                                <strong style={{ color: '#166534', minWidth: '80px', flexShrink: 0 }}>Hallazgo:</strong>
                                                                                <span style={{ color: '#14532d' }}>{rep.falla_encontrada}</span>
                                                                            </p>
                                                                            <p style={{ margin: '0', display: 'flex', gap: '8px' }}>
                                                                                <strong style={{ color: '#166534', minWidth: '80px', flexShrink: 0 }}>Solución:</strong>
                                                                                <span style={{ color: '#14532d' }}>{rep.solucion}</span>
                                                                            </p>
                                                                            <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#10b981', fontSize: '10px', fontWeight: 'bold' }}>VER DETALLE →</div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* BOTÓN PARA ABRIR EL MODAL DE DETALLES */}
                                                                {onViewReport && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            const targetId = req.actualTrabajoId || (finalReports[finalReports.length - 1]?.id);
                                                                            if (targetId) {
                                                                                onViewReport(targetId);
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            marginTop: '15px',
                                                                            padding: '12px',
                                                                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '12px',
                                                                            fontWeight: '800',
                                                                            fontSize: '13px',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            gap: '8px',
                                                                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                                                        }}
                                                                    >
                                                                        <HiOutlineClipboardDocumentList size={18} />
                                                                        Ver Reporte Detallado y PDF
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default HistorialEquipoModal;;;
