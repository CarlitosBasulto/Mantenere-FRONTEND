import React, { useRef, useState } from 'react';
import { HiOutlineXMark, HiOutlinePrinter, HiOutlineArrowDownTray } from 'react-icons/hi2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function CotizacionPDFPreview({ trabajo, subTareas, costo, notas, onClose }: any) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        if (!pdfRef.current) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(pdfRef.current, { scale: 1 });
            const imgData = canvas.toDataURL('image/png');
            
            // Calculate PDF dimensions (A4 format)
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Cotizacion_${trabajo?.id || 'Nuevo'}.pdf`);
        } catch (error) {
            console.error('Error generating preview:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Calculate totals
    const totalAmount = parseFloat(costo) || 0;
    const subtotal = totalAmount / 1.16;
    const iva = totalAmount - subtotal;

    // Get tech info
    const mainTask = subTareas?.[0] || {};
    const techName = mainTask.tecnicoNombre || 'Asignado por admin';

    // Parse materials from tech report
    const descText = mainTask.descripcion || '';
    const parts = descText.split(/Notas de cotizaci[óo]n:\s*-?/i);
    const techMaterialsText = parts.length > 1 ? parts.slice(1).join('Notas de cotización:').trim() : '';

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', flexDirection: 'column',
            alignItems: 'center', padding: '20px', backdropFilter: 'blur(5px)', overflowY: 'auto'
        }}>
            {/* Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', width: '100%', maxWidth: '800px', marginBottom: '20px' }}>
                <button onClick={onClose} style={{ padding: '10px 20px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlineXMark size={20} /> REGRESAR
                </button>
                <button onClick={handleDownload} disabled={isGenerating} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlineArrowDownTray size={20} /> {isGenerating ? 'GENERANDO...' : 'GUARDAR (DESCARGAR PC)'}
                </button>
                <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlinePrinter size={20} /> IMPRIMIR
                </button>
            </div>

            {/* A4 PDF Canvas Container with shadow */}
            <div style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: '800px', flexShrink: 0, marginBottom: '40px' }}>
                <div 
                    ref={pdfRef}
                    style={{
                        background: '#fff', width: '100%', minHeight: '1131px', // A4 ratio approx
                        padding: '60px', boxSizing: 'border-box', position: 'relative'
                    }}
                >
                {/* PDF Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Fake Logo */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ color: '#f26522', fontWeight: '900', fontSize: '28px', borderRight: '2px solid #ccc', paddingRight: '10px', marginRight: '10px' }}>
                                AGENTE<br/>BUSINESS.
                            </div>
                            <div style={{ fontSize: '10px', color: '#666', fontWeight: '600', maxWidth: '100px' }}>
                                MANTENIMIENTO DE INFRAESTRUCTURA
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', fontWeight: '600', color: '#dc2626' }}>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <span>ATENCION A:</span>
                                <span style={{ color: '#333', fontWeight: '800' }}>{trabajo?.encargado || trabajo?.cliente || 'Cliente General'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <span>SUCURSAL:</span>
                                <span style={{ color: '#333', fontWeight: '800' }}>{trabajo?.sucursal || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <span>LOCACION:</span>
                                <span style={{ color: '#333', fontWeight: '800' }}>{trabajo?.ciudad ? `${trabajo.ciudad}, ${trabajo.estado || ''}` : 'N/A'}</span>
                            </div>
                        </div>

                        <div style={{ background: '#1e293b', color: '#ef4444', padding: '10px 15px', borderRadius: '4px', textAlign: 'center', minWidth: '90px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '5px' }}>FECHA DE<br/>COTIZACIÓN</div>
                            <div style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>{new Date().toISOString().split('T')[0]}</div>
                        </div>
                        
                        <div style={{ background: '#1e293b', color: '#fff', padding: '10px 15px', borderRadius: '4px', textAlign: 'center', minWidth: '90px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '5px' }}>TÉCNICO<br/>ASIGNADO</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>{techName}</div>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '4px solid #ef4444', borderBottom: '1px solid #ccc', marginBottom: '30px', marginTop: '-10px' }} />

                {/* Table Header */}
                <div style={{ display: 'flex', background: '#111827', color: '#fff', padding: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                    <div style={{ width: '5%', textAlign: 'center' }}>NO</div>
                    <div style={{ width: '45%' }}>CONCEPTO</div>
                    <div style={{ width: '10%', textAlign: 'center' }}>CANT</div>
                    <div style={{ width: '10%', textAlign: 'center' }}>U/S</div>
                    <div style={{ width: '15%', textAlign: 'right' }}>PRECIO/U</div>
                    <div style={{ width: '15%', textAlign: 'right' }}>PRECIO</div>
                </div>

                {/* Table Row (Only 1 consolidated row since admin inputs just the total) */}
                <div style={{ display: 'flex', padding: '12px 10px', borderBottom: '1px solid #e5e7eb', fontSize: '12px', color: '#374151' }}>
                    <div style={{ width: '5%', textAlign: 'center' }}>1</div>
                    <div style={{ width: '45%', fontWeight: '600', textTransform: 'uppercase' }}>{trabajo?.titulo || 'SERVICIO DE MANTENIMIENTO INTEGRAL'}</div>
                    <div style={{ width: '10%', textAlign: 'center' }}>1</div>
                    <div style={{ width: '10%', textAlign: 'center' }}>SRV</div>
                    <div style={{ width: '15%', textAlign: 'right' }}>${subtotal.toFixed(2)}</div>
                    <div style={{ width: '15%', textAlign: 'right' }}>${subtotal.toFixed(2)}</div>
                </div>

                {/* Blank space filler for table visual */}
                <div style={{ display: 'flex', padding: '12px 10px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', minHeight: '100px' }}></div>

                {/* Totals Section */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0' }}>
                    <div style={{ width: '30%' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f3f4f6' }}>
                            <div style={{ width: '50%', padding: '8px 10px', fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>SUBTOTAL</div>
                            <div style={{ width: '50%', padding: '8px 10px', textAlign: 'right', fontSize: '12px', background: '#ef4444', color: '#fff', fontWeight: 'bold' }}>${subtotal.toFixed(2)}</div>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                            <div style={{ width: '50%', padding: '8px 10px', fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>IVA</div>
                            <div style={{ width: '50%', padding: '8px 10px', textAlign: 'right', fontSize: '12px' }}>${iva.toFixed(2)}</div>
                        </div>
                        <div style={{ display: 'flex', background: '#111827', color: '#fff' }}>
                            <div style={{ width: '50%', padding: '8px 10px', fontWeight: 'bold', fontSize: '11px', textAlign: 'right' }}>TOTAL</div>
                            <div style={{ width: '50%', padding: '8px 10px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>${totalAmount.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                {/* Especificaciones */}
                <div style={{ marginTop: '40px' }}>
                    <h4 style={{ color: '#ef4444', fontSize: '14px', fontWeight: '800', marginBottom: '15px' }}>ESPECIFICACIONES</h4>
                    
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                        <p style={{ margin: '0 0 10px 0' }}>
                            Cotización realizada por el Técnico: <strong>{techName}</strong><br/>
                            En la sucursal: <strong>{trabajo?.sucursal || 'N/A'}</strong><br/>
                            A nombre del Cliente: <strong>{trabajo?.encargado || 'Cliente General'}</strong>
                        </p>

                        {notas && (
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                                <strong style={{ color: '#1e293b' }}>Notas Adicionales:</strong>
                                <p style={{ margin: '5px 0 0 0', whiteSpace: 'pre-wrap' }}>{notas}</p>
                            </div>
                        )}

                        {techMaterialsText && (
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                                <strong style={{ color: '#1e293b' }}>Materiales Sugeridos en Reporte Técnico:</strong>
                                <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                                    {techMaterialsText.split('-').map((item: string, index: number) => {
                                        const cleanItem = item.trim();
                                        if (!cleanItem) return null;
                                        return <li key={index}>{cleanItem}</li>;
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer decorations */}
                <div style={{ position: 'absolute', bottom: '60px', left: '60px', right: '60px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                    Este documento es una cotización preliminar y está sujeta a cambios y aprobación final.
                </div>
                </div>
            </div>
        </div>
    );
}
