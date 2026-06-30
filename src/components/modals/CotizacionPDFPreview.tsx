import React, { useRef, useState } from 'react';
import { HiOutlineXMark, HiOutlinePrinter, HiOutlineArrowDownTray } from 'react-icons/hi2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function CotizacionPDFPreview({ trabajo, subTareas, costo, notas, materials = [], manoObra = 0, onClose }: any) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleDownload = async () => {
        if (!pdfRef.current) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(pdfRef.current, { scale: 2 }); // Higher quality scale
            const imgData = canvas.toDataURL('image/png');
            
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
                    <HiOutlineArrowDownTray size={20} /> {isGenerating ? 'GENERANDO...' : 'GUARDAR (DESCARGAR)'}
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
                        background: '#fff', width: '100%', minHeight: '1131px',
                        padding: '50px', boxSizing: 'border-box', position: 'relative',
                        fontFamily: 'Arial, sans-serif'
                    }}
                >
                    {/* Header Banner */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '15px 30px', margin: '-50px -50px 30px -50px', color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ color: '#f59e0b', fontWeight: '900', fontSize: '22px', borderRight: '1px solid #475569', paddingRight: '10px', marginRight: '10px', lineHeight: 1.1 }}>
                                    AGENTE<br/>BUSINESS.
                                </div>
                                <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '600', maxWidth: '80px', lineHeight: 1.2 }}>
                                    MANTENIMIENTO INFRAESTRUCTURA
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'white' }}>
                                COTIZACIÓN DE SERVICIO
                            </h2>
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>FECHA: {new Date().toLocaleDateString('es-MX')}</span>
                        </div>
                    </div>

                    <div style={{ borderBottom: '3px solid #c99b21', margin: '-30px -50px 25px -50px' }} />

                    {/* Grid info section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>Información General</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
                                <div><strong>Sucursal:</strong> {trabajo?.sucursal || trabajo?.negocio?.nombre || 'N/A'}</div>
                                <div><strong>Encargado:</strong> {trabajo?.encargado || trabajo?.cliente || trabajo?.negocio?.encargado || 'Cliente General'}</div>
                            </div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>Detalles del Servicio</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
                                <div><strong>Diagnóstico / Visita:</strong> {trabajo?.titulo || 'Servicio de Mantenimiento'}</div>
                                {(() => {
                                    const llegadaTask = subTareas?.find((t: any) => t.serviceData?.horaLlegada);
                                    if (llegadaTask) {
                                        return <div><strong>Hora de Llegada:</strong> {llegadaTask.serviceData.horaLlegada}</div>;
                                    }
                                    return null;
                                })()}
                                <div><strong>Trabajo a Realizar:</strong> {trabajo?.descripcion || 'Sin descripción registrada.'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Table Heading */}
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>
                        MATERIALES Y REFACCIONES COTIZADOS
                    </h4>

                    {/* Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', marginBottom: '15px' }}>
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
                            {materials.length > 0 ? (
                                <>
                                    {materials.map((m: any, idx: number) => {
                                        const qty = parseFloat(m.piezas) || 1;
                                        const price = parseFloat(m.precio) || 0;
                                        const total = qty * price;
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                                <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{idx + 1}</td>
                                                <td style={{ padding: '8px 12px', textTransform: 'uppercase' }}>{m.material}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>{qty}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>${price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })}
                                    {parseFloat(manoObra) > 0 && (
                                        <tr style={{ borderBottom: '1px solid #e2e8f0', background: materials.length % 2 === 0 ? '#f8fafc' : '#fff' }}>
                                            <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{materials.length + 1}</td>
                                            <td style={{ padding: '8px 12px', textTransform: 'uppercase' }}>MANO DE OBRA / SERVICIO TÉCNICO</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>1</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>${parseFloat(manoObra).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>${parseFloat(manoObra).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    )}
                                </>
                            ) : (
                                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>1</td>
                                    <td style={{ padding: '8px 12px', textTransform: 'uppercase' }}>{trabajo?.titulo || 'SERVICIO DE MANTENIMIENTO INTEGRAL'}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>1</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Totals Section */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                        <div style={{ width: '220px', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '11px' }}>
                                <div style={{ width: '55%', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', color: '#475569' }}>SUBTOTAL</div>
                                <div style={{ width: '45%', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#1e293b' }}>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1', background: '#fff', fontSize: '11px' }}>
                                <div style={{ width: '55%', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', color: '#475569' }}>IVA (16%)</div>
                                <div style={{ width: '45%', padding: '6px 8px', textAlign: 'right', color: '#475569' }}>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div style={{ display: 'flex', background: '#1e293b', color: '#fff', fontSize: '12px' }}>
                                <div style={{ width: '55%', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right' }}>TOTAL</div>
                                <div style={{ width: '45%', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                    </div>

                    {/* Detalles o notas adicionales */}
                    {notas && (
                        <div style={{ marginTop: '30px' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>
                                DETALLES O NOTAS ADICIONALES
                            </h4>
                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', minHeight: '60px', whiteSpace: 'pre-wrap' }}>
                                {notas}
                            </div>
                        </div>
                    )}

                    {/* Footer decoration */}
                    <div style={{ position: 'absolute', bottom: '40px', left: '50px', right: '50px', borderTop: '1px solid #e2e8f0', paddingTop: '15px', fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                        Este documento es una cotización preliminar y está sujeta a cambios y aprobación final.
                    </div>
                </div>
            </div>
        </div>
    );
}
