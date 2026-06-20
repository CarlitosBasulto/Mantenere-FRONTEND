import React, { useRef, useState } from 'react';
import { HiOutlineXMark, HiOutlinePrinter, HiOutlineArrowDownTray, HiOutlinePhoto } from 'react-icons/hi2';
import { generateMaintenanceReportPDF } from '../../utils/pdfGenerator';

interface ReportePDFPreviewProps {
    trabajo: any;
    reporteData: {
        id: number | string;
        reporteTienda: string;
        descripcion: string;
        materiales: string;
        refaccionesList: { pieza: string; cantidad: number; costo_estimado: string }[];
        observaciones: string;
        imagenes: {
            antes: string | null;
            durante: string | null;
            despues: string | null;
        };
        imagenObservacion: string | null;
        firmaEmpresa: string | null;
        involucraEquipo: boolean;
        equipoInfo: {
            tipo: string;
            marca: string;
            modelo: string;
            piezas?: string;
            garantia?: string;
        } | null;
        fecha: string;
    };
    onClose: () => void;
}

export default function ReportePDFPreview({ trabajo, reporteData, onClose }: ReportePDFPreviewProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [customLogo, setCustomLogo] = useState<string | null>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setCustomLogo(ev.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDownload = async () => {
        try {
            const dynamicFolio = `TRB-${(trabajo?.id || '').toString().padStart(5, '0')}`;
            
            // Compilamos los materiales combinando el widget dinámico y el texto extra
            const widgetMateriales = reporteData.refaccionesList.length > 0 
                ? reporteData.refaccionesList.map(r => `- ${r.cantidad || 1}x ${r.pieza} ${r.costo_estimado ? `($${r.costo_estimado})` : ''}`).join('\n')
                : '';
            const combinedMateriales = [widgetMateriales, reporteData.materiales].filter(Boolean).join('\n\n');

            await generateMaintenanceReportPDF({
                id: trabajo?.id || 0,
                folio: dynamicFolio,
                fecha: reporteData.fecha || new Date().toLocaleDateString('es-MX'),
                sucursal: trabajo?.negocio?.nombre || trabajo?.sucursal || '---',
                encargado: trabajo?.negocio?.encargado || trabajo?.encargado || '---',
                tecnico: trabajo?.tecnico || 'Técnico',
                diagnostico: reporteData.reporteTienda,
                descripcion: reporteData.descripcion,
                materiales: combinedMateriales,
                observaciones: reporteData.observaciones,
                imagenes: {
                    antes: reporteData.imagenes.antes,
                    durante: reporteData.imagenes.durante,
                    despues: reporteData.imagenes.despues,
                    extra: reporteData.imagenObservacion
                },
                firmaEmpresa: reporteData.firmaEmpresa,
                equipo: reporteData.involucraEquipo ? reporteData.equipoInfo : null,
                logoBase64: customLogo
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '20px', backdropFilter: 'blur(5px)', overflowY: 'auto'
        }}>
            {/* Styles for clean A4 print preview */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-reporte-pdf, #print-reporte-pdf * {
                        visibility: visible;
                    }
                    #print-reporte-pdf {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        box-shadow: none;
                        background: #fff !important;
                    }
                }
            `}</style>

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleLogoUpload} 
                accept="image/*" 
                style={{ display: 'none' }} 
            />

            {/* Header Actions */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '15px', width: '100%', maxWidth: '800px', marginBottom: '20px' }}>
                <button onClick={onClose} style={{ padding: '10px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlineXMark size={20} /> REGRESAR
                </button>
                <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlinePhoto size={20} /> AGREGAR LOGO
                </button>
                <button onClick={handleDownload} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlineArrowDownTray size={20} /> DESCARGAR PDF
                </button>
                <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlinePrinter size={20} /> IMPRIMIR
                </button>
            </div>

            {/* A4 Report sheet */}
            <div id="print-reporte-pdf" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: '800px', flexShrink: 0, marginBottom: '40px', background: '#fff', padding: '50px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
                
                {/* Header Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '15px 30px', margin: '-50px -50px 30px -50px', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {customLogo ? (
                            <img src={customLogo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '120px', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ color: '#f59e0b', fontWeight: '900', fontSize: '22px', borderRight: '1px solid #475569', paddingRight: '10px', marginRight: '10px', lineHeight: 1.1 }}>
                                    AGENTE<br/>BUSINESS.
                                </div>
                                <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '600', maxWidth: '80px', lineHeight: 1.2 }}>
                                    MANTENIMIENTO INFRAESTRUCTURA
                                </div>
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'white' }}>REPORTE DE SERVICIO</h2>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>FECHA: {reporteData.fecha}</span>
                    </div>
                </div>

                <div style={{ borderBottom: '3px solid #c99b21', margin: '-30px -50px 25px -50px' }} />

                {/* Grid info section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>Información General</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
                            <div><strong>Sucursal:</strong> {trabajo?.negocio?.nombre || trabajo?.sucursal || '---'}</div>
                            <div><strong>Encargado:</strong> {trabajo?.negocio?.encargado || trabajo?.encargado || '---'}</div>
                            <div><strong>Técnico:</strong> {trabajo?.tecnico || '---'}</div>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>Detalles del Servicio</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
                            <div><strong>Diagnóstico / Reporte:</strong> {reporteData.reporteTienda || 'Sin diagnóstico registrado.'}</div>
                            <div><strong>Trabajo Realizado:</strong> {reporteData.descripcion || 'Sin descripción de trabajo.'}</div>
                        </div>
                    </div>
                </div>

                {/* Refacciones y Piezas Table */}
                <div style={{ marginBottom: '25px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>Refacciones y Materiales Utilizados</h4>
                    {reporteData.refaccionesList.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#1e293b', color: 'white' }}>
                                    <th style={{ padding: '8px 12px', width: '50px' }}>NO</th>
                                    <th style={{ padding: '8px 12px' }}>CONCEPTO</th>
                                    <th style={{ padding: '8px 12px', width: '70px', textAlign: 'center' }}>CANT</th>
                                    <th style={{ padding: '8px 12px', width: '100px', textAlign: 'right' }}>PRECIO/U</th>
                                    <th style={{ padding: '8px 12px', width: '100px', textAlign: 'right' }}>PRECIO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reporteData.refaccionesList.map((ref, idx) => {
                                    const qty = ref.cantidad || 1;
                                    const price = parseFloat(ref.costo_estimado) || 0;
                                    const total = qty * price;
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                            <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{idx + 1}</td>
                                            <td style={{ padding: '8px 12px', textTransform: 'uppercase' }}>{ref.pieza}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>{qty}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{price > 0 ? `$${price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'N/A'}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{total > 0 ? `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'N/A'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                            No se registraron refacciones.
                        </div>
                    )}
                </div>

                {/* Otros materiales */}
                {reporteData.materiales && (
                    <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>Otros Materiales o Consumibles</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#475569', whiteSpace: 'pre-wrap' }}>{reporteData.materiales}</p>
                    </div>
                )}

                {/* Especificaciones del equipo */}
                {reporteData.involucraEquipo && reporteData.equipoInfo && (
                    <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>Especificaciones del Equipo</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '12px', color: '#475569' }}>
                            <div><strong>Tipo:</strong> {reporteData.equipoInfo.tipo}</div>
                            <div><strong>Marca:</strong> {reporteData.equipoInfo.marca}</div>
                            <div><strong>Modelo:</strong> {reporteData.equipoInfo.modelo}</div>
                        </div>
                    </div>
                )}

                {/* Observaciones */}
                <div style={{ marginBottom: '25px', background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>Observaciones Finales</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', whiteSpace: 'pre-wrap' }}>{reporteData.observaciones || 'Sin observaciones adicionales.'}</p>
                </div>

                {/* Firmas / Validación */}
                <div style={{ marginTop: '40px', borderTop: '1px solid #cbd5e1', paddingTop: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '11px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', textAlign: 'center' }}>Validación y Conformidad</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: '20px' }}>
                        <div style={{ textAlign: 'center', width: '200px' }}>
                            <div style={{ borderBottom: '1px solid #475569', height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '5px' }}>
                                {reporteData.firmaEmpresa && !reporteData.firmaEmpresa.startsWith('data:application/pdf') && (
                                    <img src={reporteData.firmaEmpresa} alt="Firma" style={{ maxHeight: '55px', maxWidth: '180px', objectFit: 'contain' }} />
                                )}
                            </div>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginTop: '6px' }}>FIRMA ENCARGADO / SUCURSAL</span>
                        </div>
                        <div style={{ border: '1px solid #cbd5e1', width: '150px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '10px' }}>
                            SELLO SUCURSAL
                        </div>
                    </div>
                </div>

                {/* Fotografías Testigo (Asegurado en una página separada o debajo) */}
                <div style={{ marginTop: '60px', borderTop: '2px solid #e2e8f0', paddingTop: '30px' }}>
                    <h4 style={{ margin: '0 0 20px 0', fontSize: '12px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', textAlign: 'center' }}>Testigos Fotográficos</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px', justifyContent: 'center' }}>
                        {reporteData.imagenes.antes && (
                            <div style={{ textAlign: 'center' }}>
                                <img src={reporteData.imagenes.antes} alt="Antes" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block', marginTop: '5px' }}>ANTES</span>
                            </div>
                        )}
                        {reporteData.imagenes.durante && (
                            <div style={{ textAlign: 'center' }}>
                                <img src={reporteData.imagenes.durante} alt="Durante" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block', marginTop: '5px' }}>DURANTE</span>
                            </div>
                        )}
                        {reporteData.imagenes.despues && (
                            <div style={{ textAlign: 'center' }}>
                                <img src={reporteData.imagenes.despues} alt="Después" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block', marginTop: '5px' }}>DESPUÉS</span>
                            </div>
                        )}
                        {reporteData.imagenObservacion && (
                            <div style={{ textAlign: 'center' }}>
                                <img src={reporteData.imagenObservacion} alt="Extra" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block', marginTop: '5px' }}>EXTRA</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
