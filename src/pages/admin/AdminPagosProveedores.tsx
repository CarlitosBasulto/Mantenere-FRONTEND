import React, { useState, useEffect } from 'react';
import { 
    HiOutlineBuildingOffice2, 
    HiOutlineCurrencyDollar,
    HiOutlineCheckCircle, 
    HiOutlineXCircle, 
    HiOutlineClock,
    HiOutlineEye,
    HiOutlineSparkles,
    HiOutlineShieldCheck,
    HiOutlineDocumentMagnifyingGlass,
    HiOutlineCalendar,
    HiOutlinePhone,
    HiOutlineArrowDownTray,
    HiOutlineGift,
    HiOutlineXMark
} from 'react-icons/hi2';
import { 
    getPagosAdmin, 
    aprobarPagoAdmin, 
    rechazarPagoAdmin, 
    type PagoProveedor 
} from '../../services/pagoProveedorService';
import { useModal } from '../../context/ModalContext';

const AdminPagosProveedores: React.FC = () => {
    const { showAlert, showConfirm } = useModal();
    const [pagos, setPagos] = useState<PagoProveedor[]>([]);
    const [filtroEstado, setFiltroEstado] = useState<string>('Todos');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Modal de detalle / inspección
    const [selectedPago, setSelectedPago] = useState<PagoProveedor | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Modal de rechazo
    const [isRechazoModalOpen, setIsRechazoModalOpen] = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState('');

    // Zoom de comprobante
    const [zoomUrl, setZoomUrl] = useState<string | null>(null);

    const fetchPagos = async () => {
        setIsLoading(true);
        try {
            const data = await getPagosAdmin(filtroEstado);
            setPagos(data || []);
        } catch (err) {
            console.error("Error cargando pagos:", err);
            showAlert("Error", "No se pudieron cargar los comprobantes de pago.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPagos();
    }, [filtroEstado]);

    const handleAprobar = (id: number) => {
        const pago = pagos.find(p => p.id === id) || selectedPago;
        const confirmTitle = pago?.es_prueba_gratis
            ? "Activar Prueba Gratuita (6 Meses)"
            : "Aprobar Comprobante de Pago";
        const confirmMsg = pago?.es_prueba_gratis
            ? `¿Confirmas dar el VISTO BUENO a esta prueba gratuita de 6 meses? El técnico ${pago?.user?.name || ''} será activado como 'Técnico Pro-Veedor' por 180 días en la RED.`
            : "¿Confirmas la validación y aprobación de este comprobante? El técnico será activado como 'Técnico Pro-Veedor' y aparecerá en la RED.";

        showConfirm(
            confirmTitle,
            confirmMsg,
            async () => {
                try {
                    setIsProcessing(true);
                    await aprobarPagoAdmin(id);
                    showAlert(
                        pago?.es_prueba_gratis ? "Prueba Gratis Activada" : "Pago Aprobado",
                        pago?.es_prueba_gratis 
                            ? "Visto bueno otorgado. La prueba de 6 meses ha sido activada exitosamente." 
                            : "El pago fue aprobado exitosamente. El usuario ahora es Técnico Pro-Veedor en la RED.",
                        "success"
                    );
                    setIsDetailModalOpen(false);
                    fetchPagos();
                } catch (err: any) {
                    console.error("Error al aprobar:", err);
                    showAlert("Error", err.response?.data?.message || "No se pudo aprobar la solicitud.", "error");
                } finally {
                    setIsProcessing(false);
                }
            },
            undefined,
            pago?.es_prueba_gratis ? "Dar Visto Bueno" : "Aprobar Pago",
            "Cancelar"
        );
    };

    const handleConfirmRechazar = async () => {
        if (!selectedPago) return;
        if (!motivoRechazo.trim()) {
            showAlert("Campo Requerido", "Por favor ingresa el motivo del rechazo del comprobante.", "warning");
            return;
        }

        try {
            setIsProcessing(true);
            await rechazarPagoAdmin(selectedPago.id, motivoRechazo.trim());
            showAlert("Comprobante Rechazado", "El comprobante fue rechazado y se notificó al técnico para su corrección.", "info");
            setIsRechazoModalOpen(false);
            setIsDetailModalOpen(false);
            setMotivoRechazo('');
            fetchPagos();
        } catch (err: any) {
            console.error("Error al rechazar pago:", err);
            showAlert("Error", err.response?.data?.message || "No se pudo rechazar el comprobante.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const pendientesCount = pagos.filter(p => p.estado === 'Pendiente').length;

    return (
        <div style={{ padding: '28px', maxWidth: '1250px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <HiOutlineCurrencyDollar color="#2563eb" size={28} /> Pagos por Transferencia (Técnicos Pro-Veedores)
                    </h1>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                        Validación de comprobantes de pago por transferencia para activación de membresías de la <strong>RED</strong>
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <HiOutlineShieldCheck size={20} color="#2563eb" />
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#1d4ed8' }}>
                            {pendientesCount} {pendientesCount === 1 ? 'Pendiente' : 'Pendientes'} de Validación
                        </span>
                    </div>
                </div>
            </div>

            {/* BARRA DE FILTROS */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {(['Todos', 'Pendiente', 'Aprobado', 'Rechazado'] as const).map(estado => (
                    <button
                        key={estado}
                        onClick={() => setFiltroEstado(estado)}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '12px',
                            border: '1px solid',
                            borderColor: filtroEstado === estado ? '#2563eb' : '#e2e8f0',
                            background: filtroEstado === estado ? '#2563eb' : '#ffffff',
                            color: filtroEstado === estado ? '#ffffff' : '#475569',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {estado === 'Todos' ? 'Todos los Pagos' : estado === 'Pendiente' ? '⏳ Pendientes' : estado === 'Aprobado' ? '✅ Aprobados' : '❌ Rechazados'}
                    </button>
                ))}
            </div>

            {/* LISTADO DE PAGOS */}
            {isLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                    Cargando lista de pagos...
                </div>
            ) : pagos.length === 0 ? (
                <div style={{ background: '#ffffff', padding: '50px 20px', borderRadius: '20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <HiOutlineDocumentMagnifyingGlass size={48} color="#94a3b8" />
                    <h3 style={{ margin: '14px 0 6px 0', color: '#1e293b', fontSize: '18px', fontWeight: '800' }}>
                        No se encontraron transferencias
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                        Cuando los técnicos transfieran y suban sus comprobantes, aparecerán aquí para tu aprobación.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                    {pagos.map(p => (
                        <div 
                            key={p.id}
                            style={{
                                background: '#ffffff',
                                borderRadius: '20px',
                                border: '1px solid #cbd5e1',
                                padding: '20px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '16px',
                                transition: 'transform 0.2s'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                                            Folio: {p.referencia || p.folio_referencia} • {new Date(p.created_at).toLocaleDateString()}
                                        </span>
                                        {p.es_prueba_gratis && (
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '999px',
                                                fontSize: '10px',
                                                fontWeight: '900',
                                                background: '#ecfdf5',
                                                color: '#065f46',
                                                border: '1px solid #a7f3d0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px'
                                            }}>
                                                <HiOutlineGift size={12} /> 6 Meses Gratis
                                            </span>
                                        )}
                                    </div>

                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        background: p.estado === 'Pendiente' ? '#fffbeb' : p.estado === 'Aprobado' ? '#ecfdf5' : '#fef2f2',
                                        color: p.estado === 'Pendiente' ? '#b45309' : p.estado === 'Aprobado' ? '#047857' : '#b91c1c',
                                        border: `1px solid ${p.estado === 'Pendiente' ? '#fde68a' : p.estado === 'Aprobado' ? '#a7f3d0' : '#fecaca'}`
                                    }}>
                                        {p.estado === 'Pendiente' ? '⏳ Pendiente' : p.estado === 'Aprobado' ? '✅ Aprobado' : '❌ Rechazado'}
                                    </span>
                                </div>

                                <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                                    🏢 {p.nombre_empresa}
                                </h3>

                                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569' }}>
                                    <strong>Técnico:</strong> {p.user?.name} ({p.user?.email})
                                </p>

                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                    {p.es_prueba_gratis ? (
                                        <>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block' }}>Modalidad</span>
                                                <strong style={{ color: '#059669' }}>🎁 Prueba Cortesía</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block' }}>Costo</span>
                                                <strong style={{ color: '#059669', fontSize: '14px' }}>GRATIS ($0.00)</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block' }}>Vigencia</span>
                                                <span style={{ color: '#334155', fontWeight: '600' }}>180 días (6 meses)</span>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block' }}>Teléfono</span>
                                                <span style={{ color: '#334155', fontWeight: '600' }}>{p.telefono}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block' }}>Banco Origen</span>
                                                <strong style={{ color: '#1e293b' }}>{p.banco_origen}</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block' }}>Monto Pagado</span>
                                                <strong style={{ color: '#059669', fontSize: '14px' }}>${Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block' }}>Fecha Transf.</span>
                                                <span style={{ color: '#334155', fontWeight: '600' }}>{p.fecha_transferencia ? new Date(p.fecha_transferencia + 'T00:00:00').toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block' }}>Teléfono</span>
                                                <span style={{ color: '#334155', fontWeight: '600' }}>{p.telefono}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {p.motivo_rechazo && (
                                    <div style={{ marginTop: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#991b1b' }}>
                                        <strong>Motivo rechazo:</strong> {p.motivo_rechazo}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedPago(p);
                                    setIsDetailModalOpen(true);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <HiOutlineEye size={16} /> Ver Comprobante y Validar
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL DETALLE E INSPECCIÓN DE COMPROBANTE */}
            {isDetailModalOpen && selectedPago && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.82)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setIsDetailModalOpen(false)}>
                    <div style={{
                        background: '#ffffff',
                        width: '100%',
                        maxWidth: '780px',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
                        overflow: 'hidden',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #cbd5e1',
                        transform: 'translateZ(0)'
                    }} onClick={e => e.stopPropagation()}>

                        <div style={{
                            padding: '20px 24px',
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#ffffff' }}>
                                    {selectedPago.es_prueba_gratis ? '🎁 Solicitud de Prueba Gratis (6 Meses): ' : 'Inspección de Pago: '}
                                    {selectedPago.nombre_empresa}
                                </h3>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                    Solicitante: {selectedPago.user?.name} ({selectedPago.user?.email}) • Folio: {selectedPago.referencia || selectedPago.folio_referencia}
                                </span>
                            </div>

                            <button 
                                onClick={() => setIsDetailModalOpen(false)}
                                style={{
                                    background: '#ef4444',
                                    border: 'none',
                                    color: '#ffffff',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    flexShrink: 0
                                }}
                                aria-label="Cerrar modal"
                            >
                                <HiOutlineXMark size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div style={{
                            padding: '24px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '18px',
                            overscrollBehavior: 'contain',
                            WebkitOverflowScrolling: 'touch',
                            transform: 'translateZ(0)'
                        }}>
                            {/* CALLOUT PRUEBA GRATIS */}
                            {selectedPago.es_prueba_gratis && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                                    padding: '16px 20px',
                                    borderRadius: '16px',
                                    border: '1px solid #047857',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px'
                                }}>
                                    <div style={{ background: '#059669', padding: '10px', borderRadius: '14px', display: 'flex' }}>
                                        <HiOutlineGift size={24} color="#a7f3d0" />
                                    </div>
                                    <div>
                                        <strong style={{ fontSize: '14px', display: 'block', color: '#a7f3d0' }}>
                                            Beneficio de Cortesía: 6 Meses Gratis
                                        </strong>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#e2e8f0', lineHeight: '1.4' }}>
                                            Esta solicitud no requiere pago bancario. Como Administrador General debes otorgar tu <strong>visto bueno</strong> para activar su membresía de Técnico Pro-Veedor por 180 días.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* DATOS DE LA SOLICITUD / TRANSFERENCIA */}
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', fontSize: '13px' }}>
                                {selectedPago.es_prueba_gratis ? (
                                    <>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>MODALIDAD</span>
                                            <strong style={{ color: '#059669' }}>🎁 Prueba Cortesía</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>MONTO</span>
                                            <strong style={{ color: '#059669', fontSize: '15px' }}>GRATIS ($0.00 MXN)</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>FOLIO SOLICITUD</span>
                                            <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedPago.referencia || selectedPago.folio_referencia}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>DURACIÓN</span>
                                            <span style={{ color: '#1e293b', fontWeight: '600' }}>180 días (6 Meses)</span>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>TELÉFONO</span>
                                            <span style={{ color: '#1e293b', fontWeight: '600' }}>{selectedPago.telefono}</span>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>ESTADO</span>
                                            <span style={{ fontWeight: '800', color: selectedPago.estado === 'Aprobado' ? '#059669' : selectedPago.estado === 'Pendiente' ? '#b45309' : '#dc2626' }}>
                                                {selectedPago.estado}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>BANCO ORIGEN</span>
                                            <strong style={{ color: '#0f172a' }}>{selectedPago.banco_origen}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>MONTO TRANSFERIDO</span>
                                            <strong style={{ color: '#059669', fontSize: '15px' }}>${Number(selectedPago.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>FOLIO / RASTREO</span>
                                            <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedPago.folio_referencia}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>FECHA TRANSFERENCIA</span>
                                            <span style={{ color: '#1e293b', fontWeight: '600' }}>{selectedPago.fecha_transferencia}</span>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>TELÉFONO</span>
                                            <span style={{ color: '#1e293b', fontWeight: '600' }}>{selectedPago.telefono}</span>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b', fontSize: '11px', display: 'block', fontWeight: '700' }}>ESTADO</span>
                                            <span style={{ fontWeight: '800', color: selectedPago.estado === 'Aprobado' ? '#059669' : selectedPago.estado === 'Pendiente' ? '#b45309' : '#dc2626' }}>
                                                {selectedPago.estado}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {selectedPago.notas && (
                                <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '12px', fontSize: '12px', color: '#475569' }}>
                                    <strong>Notas del solicitante:</strong> {selectedPago.notas}
                                </div>
                            )}

                            {/* COMPROBANTE O PANEL DE PRUEBA */}
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                {selectedPago.es_prueba_gratis ? (
                                    <div style={{ padding: '24px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed #059669' }}>
                                        <div style={{ width: '56px', height: '56px', background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                                            <HiOutlineGift size={32} color="#059669" />
                                        </div>
                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>
                                            Solicitud de Prueba Gratuita Registrada en Línea
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
                                            No se requiere comprobante bancario. Al dar el visto bueno, el sistema activará automáticamente el rango de Técnico Pro-Veedor con vigencia de 180 días.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                                                📸 Comprobante de Transferencia (Voucher)
                                            </h4>

                                            {selectedPago.comprobante_url && (
                                                <a 
                                                    href={selectedPago.comprobante_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    style={{ fontSize: '12px', color: '#2563eb', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <HiOutlineArrowDownTray size={14} /> Abrir archivo original
                                                </a>
                                            )}
                                        </div>

                                        {selectedPago.comprobante_url ? (
                                            selectedPago.comprobante_url.toLowerCase().endsWith('.pdf') ? (
                                                <div style={{ padding: '30px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                                    <HiOutlineDocumentMagnifyingGlass size={40} color="#2563eb" />
                                                    <p style={{ margin: '8px 0 12px 0', fontSize: '13px', color: '#475569' }}>El comprobante fue adjuntado en formato PDF.</p>
                                                    <a 
                                                        href={selectedPago.comprobante_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        style={{ padding: '8px 18px', background: '#2563eb', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '12px' }}
                                                    >
                                                        Visualizar PDF
                                                    </a>
                                                </div>
                                            ) : (
                                                <img 
                                                    src={selectedPago.comprobante_url} 
                                                    alt="Comprobante" 
                                                    onClick={() => setZoomUrl(selectedPago.comprobante_url || null)}
                                                    style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', background: '#000000', borderRadius: '12px', cursor: 'zoom-in' }}
                                                />
                                            )
                                        ) : (
                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sin comprobante adjunto.</span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ACCIONES DE APROBAR / RECHAZAR */}
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                style={{ padding: '10px 18px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cerrar
                            </button>

                            {selectedPago.estado === 'Pendiente' && (
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setIsRechazoModalOpen(true)}
                                        disabled={isProcessing}
                                        style={{ padding: '10px 18px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <HiOutlineXCircle size={16} /> Rechazar Solicitud
                                    </button>

                                    <button
                                        onClick={() => handleAprobar(selectedPago.id)}
                                        disabled={isProcessing}
                                        style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                                    >
                                        {selectedPago.es_prueba_gratis ? (
                                            <>
                                                <HiOutlineGift size={18} /> Dar Visto Bueno y Activar 6 Meses Gratis
                                            </>
                                        ) : (
                                            <>
                                                <HiOutlineCheckCircle size={18} /> Aprobar Pago y Activar Pro-Veedor
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL RECHAZO */}
            {isRechazoModalOpen && selectedPago && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                            Motivo del Rechazo de Transferencia
                        </h3>
                        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748b' }}>
                            Indica por qué rechazas el comprobante de <strong>{selectedPago.nombre_empresa}</strong> (el técnico recibirá esta razón):
                        </p>
                        <textarea
                            rows={3}
                            placeholder="Ej. El folio de transferencia no concuerda o la imagen del comprobante es ilegible."
                            value={motivoRechazo}
                            onChange={e => setMotivoRechazo(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '16px', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setIsRechazoModalOpen(false)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={handleConfirmRechazar} disabled={isProcessing} style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Confirmar Rechazo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ZOOM DE COMPROBANTE */}
            {zoomUrl && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setZoomUrl(null)}>
                    <img src={zoomUrl} alt="Zoom Comprobante" style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain', borderRadius: '12px' }} />
                </div>
            )}
        </div>
    );
};

export default AdminPagosProveedores;
