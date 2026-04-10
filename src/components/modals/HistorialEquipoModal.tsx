import React from 'react';
import CustomModal from '../common/CustomModal';
import { HiOutlineCalendarDays, HiOutlineWrenchScrewdriver, HiOutlineCheckCircle } from "react-icons/hi2";

interface HistorialEquipoModalProps {
    isOpen: boolean;
    onClose: () => void;
    equipo: any;
    historial: any[];
}

const HistorialEquipoModal: React.FC<HistorialEquipoModalProps> = ({ isOpen, onClose, equipo, historial }) => {
    if (!equipo) return null;

    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title={`Historial: ${equipo.nombre} - ${equipo.marca}`}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
                {equipo.foto && (
                    <img 
                        src={equipo.foto} 
                        alt={equipo.nombre} 
                        style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '15px', border: '2px solid #e2e8f0' }} 
                    />
                )}
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: '22px', color: '#1e293b' }}>
                        {equipo.marca} {equipo.modelo}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>Serie</span>
                            <p style={{ margin: 0, fontWeight: '500', color: '#334155' }}>{equipo.serie}</p>
                        </div>
                        <div>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>Año Fab. / Uso</span>
                            <p style={{ margin: 0, fontWeight: '500', color: '#334155' }}>
                                {equipo.anioFabricacion} / {equipo.anioUso}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <h4 style={{ fontSize: '18px', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px' }}>
                Intervenciones y Reportes
            </h4>

            {historial.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '15px' }}>
                    <p style={{ color: '#64748b', margin: 0 }}>Este equipo no tiene historial de mantenimiento o reparaciones reportadas.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {historial.map((req, idx) => (
                        <div key={idx} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '15px', background: '#ffffff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <HiOutlineCalendarDays /> {new Date(req.created_at).toLocaleDateString()}
                                </span>
                                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: '#eff6ff', color: '#2563eb' }}>
                                    {req.estado}
                                </span>
                            </div>
                            
                            <p style={{ fontSize: '15px', color: '#1e293b', margin: '0 0 15px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <HiOutlineWrenchScrewdriver style={{ marginTop: '3px', flexShrink: 0, color: '#f59e0b' }} />
                                "{req.descripcion_problema}"
                            </p>
                            
                            {(req.visitas && req.visitas.length > 0) && (
                                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginTop: '10px' }}>
                                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>VISITAS DE TÉCNICOS:</p>
                                    {req.visitas.map((v: any, i: number) => (
                                        <div key={i} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <HiOutlineCheckCircle style={{ color: '#10b981' }} />
                                            {v.tecnico?.name || 'Técnico'} - Solución: {v.reporte_solucion || 'Pendiente'}
                                        </div>
                                    ))}
                                </div>
                            )}

                             {(req.reportes && req.reportes.length > 0) && (
                                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginTop: '10px' }}>
                                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>DIAGNÓSTICOS TÉCNICOS:</p>
                                    {req.reportes.map((rep: any, i: number) => (
                                        <div key={i} style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                                            <p style={{ margin: '0 0 5px' }}><strong>Falla encontrada:</strong> {rep.falla_encontrada}</p>
                                            <p style={{ margin: '0' }}><strong>Solución:</strong> {rep.solucion}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </CustomModal>
    );
};

export default HistorialEquipoModal;
