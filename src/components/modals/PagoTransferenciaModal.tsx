import React, { useState, useEffect, useRef } from 'react';
import { 
    HiOutlineBuildingOffice2, 
    HiOutlineDocumentCheck,
    HiOutlineClipboardDocumentCheck,
    HiOutlineSparkles,
    HiOutlinePhoto,
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineArrowTopRightOnSquare
} from 'react-icons/hi2';
import { 
    getDatosBancariosMantenere, 
    registrarPagoTransferencia, 
    getMiEstadoPago,
    type DatosBancarios,
    type PagoProveedor 
} from '../../services/pagoProveedorService';
import { useModal } from '../../context/ModalContext';
import { useNavigate } from 'react-router-dom';

interface PagoTransferenciaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialPago?: PagoProveedor | null;
    initialEsProveedor?: boolean;
}

const DEFAULT_DATOS_BANCARIOS: DatosBancarios = {
    banco: 'BBVA México',
    titular: 'Mantenere Servicios S.A. de C.V.',
    clabe: '012180015678901234',
    numero_cuenta: '1567890123',
    monto_sugerido: 1499.00,
    moneda: 'MXN',
    concepto_referencia: 'PROV-MEMBRESIA',
    instrucciones: 'Realiza tu transferencia por el monto de membresía ($1,499.00 MXN) usando tu número de ID como concepto.'
};

const BANCOS_MEXICO = [
    "BBVA México",
    "Santander",
    "Banorte",
    "Citibanamex",
    "Scotiabank",
    "HSBC",
    "Banco Azteca",
    "Inbursa",
    "STP (Sistema de Transferencias y Pagos)",
    "Mercado Pago",
    "Nu México",
    "BanCoppel",
    "Otro Banco"
];

const PagoTransferenciaModal: React.FC<PagoTransferenciaModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    initialPago,
    initialEsProveedor
}) => {
    const { showAlert } = useModal();
    const navigate = useNavigate();

    const [datosBancarios, setDatosBancarios] = useState<DatosBancarios>(DEFAULT_DATOS_BANCARIOS);
    const [pagoActual, setPagoActual] = useState<PagoProveedor | null>(initialPago || null);
    const [esProveedorActivo, setEsProveedorActivo] = useState(initialEsProveedor || false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiado, setCopiado] = useState(false);
    const [modoReenvio, setModoReenvio] = useState(false);

    // Campos del formulario
    const [nombreEmpresa, setNombreEmpresa] = useState(initialPago?.nombre_empresa || '');
    const [telefono, setTelefono] = useState(initialPago?.telefono || '');
    const [bancoOrigen, setBancoOrigen] = useState(BANCOS_MEXICO[0]);
    const [folioReferencia, setFolioReferencia] = useState('');
    const [monto, setMonto] = useState('1499.00');
    const [fechaTransferencia, setFechaTransferencia] = useState(new Date().toISOString().split('T')[0]);
    const [notas, setNotas] = useState('');
    const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
    const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cargar o refrescar datos bancarios y estado actual de pago en segundo plano sin congelar UI
    useEffect(() => {
        if (!isOpen) return;

        if (initialPago) {
            setPagoActual(initialPago);
            if (initialPago.nombre_empresa) setNombreEmpresa(initialPago.nombre_empresa);
            if (initialPago.telefono) setTelefono(initialPago.telefono);
        }
        if (typeof initialEsProveedor === 'boolean') {
            setEsProveedorActivo(initialEsProveedor);
        }

        let isMounted = true;
        const cargarInfo = async () => {
            try {
                const [bancData, estadoData] = await Promise.all([
                    getDatosBancariosMantenere().catch(() => null),
                    getMiEstadoPago().catch(() => null)
                ]);

                if (!isMounted) return;
                if (bancData) setDatosBancarios(bancData);
                if (estadoData) {
                    if (estadoData.pago) {
                        setPagoActual(estadoData.pago);
                        if (!nombreEmpresa && estadoData.pago.nombre_empresa) setNombreEmpresa(estadoData.pago.nombre_empresa);
                        if (!telefono && estadoData.pago.telefono) setTelefono(estadoData.pago.telefono);
                    }
                    if (typeof estadoData.es_proveedor === 'boolean') {
                        setEsProveedorActivo(estadoData.es_proveedor);
                    }
                }
            } catch (err) {
                console.error("Error cargando datos de pago:", err);
            }
        };

        cargarInfo();
        return () => { isMounted = false; };
    }, [isOpen, initialPago, initialEsProveedor]);

    if (!isOpen) return null;

    const handleCopiarClabe = () => {
        if (datosBancarios?.clabe) {
            navigator.clipboard.writeText(datosBancarios.clabe);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 15 * 1024 * 1024) {
                showAlert("Archivo muy pesado", "El comprobante no debe superar los 15MB.", "warning");
                return;
            }
            setComprobanteFile(file);
            if (file.type.startsWith('image/')) {
                setComprobantePreview(URL.createObjectURL(file));
            } else {
                setComprobantePreview(null);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nombreEmpresa.trim()) {
            showAlert("Campo Requerido", "Por favor ingresa el nombre de tu empresa o equipo.", "warning");
            return;
        }

        if (!telefono.trim()) {
            showAlert("Campo Requerido", "Por favor ingresa tu teléfono de contacto.", "warning");
            return;
        }

        if (!folioReferencia.trim()) {
            showAlert("Campo Requerido", "Por favor ingresa el folio o clave de rastreo de tu transferencia.", "warning");
            return;
        }

        if (!comprobanteFile) {
            showAlert("Comprobante Requerido", "Debes adjuntar la imagen o PDF del comprobante de transferencia bancaria.", "warning");
            return;
        }

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('nombre_empresa', nombreEmpresa.trim());
            formData.append('telefono', telefono.trim());
            formData.append('banco_origen', bancoOrigen);
            formData.append('folio_referencia', folioReferencia.trim());
            formData.append('monto', monto);
            formData.append('fecha_transferencia', fechaTransferencia);
            formData.append('comprobante', comprobanteFile);
            if (notas.trim()) formData.append('notas', notas.trim());

            const res = await registrarPagoTransferencia(formData);
            showAlert("Comprobante Enviado", "¡Tu comprobante fue enviado con éxito! El Administrador General lo revisará a la brevedad para activar tu rol de Técnico Pro-Veedor.", "success");
            setPagoActual(res.pago);
            setModoReenvio(false);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error("Error registrando pago:", err);
            const msg = err.response?.data?.message || "No se pudo registrar el comprobante. Por favor verifica tus datos.";
            showAlert("Error al Enviar", msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.82)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }} onClick={onClose}>
            <div style={{
                background: '#ffffff',
                width: '100%',
                maxWidth: '780px',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #cbd5e1'
            }} onClick={e => e.stopPropagation()}>

                {/* MODAL HEADER */}
                <div style={{
                    padding: '20px 28px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            padding: '12px',
                            borderRadius: '16px',
                            display: 'flex',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
                        }}>
                            <HiOutlineSparkles size={24} color="#ffffff" />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.3px' }}>
                                    Membresía Técnico Pro-Veedor
                                </h3>
                                <span style={{
                                    background: '#fef3c7',
                                    color: '#b45309',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    textTransform: 'uppercase'
                                }}>
                                    Premium
                                </span>
                            </div>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                Pago por transferencia bancaria con aprobación por el Administrador General
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        title="Cerrar modal"
                        style={{
                            background: '#ef4444',
                            border: '2px solid #ffffff',
                            color: '#ffffff',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: '900',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* MODAL BODY */}
                <div style={{ overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {isLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                            Cargando información bancaria...
                        </div>
                    ) : esProveedorActivo ? (
                        /* ESTADO 1: YA ES PRO-VEEDOR ACTIVO */
                        <div style={{
                            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                            border: '2px solid #a7f3d0',
                            borderRadius: '20px',
                            padding: '28px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                background: '#10b981',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px auto',
                                boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)'
                            }}>
                                <HiOutlineCheckCircle size={36} color="#ffffff" />
                            </div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '900', color: '#065f46' }}>
                                ¡Felicidades, eres Técnico Pro-Veedor!
                            </h3>
                            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#047857', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                                Ya tienes activado el rango premium en la <strong>RED</strong>. Tienes tu propio Dashboard Pro-Veedor, puedes crear tu cuadrilla de técnicos y enviar cotizaciones directas al Administrador General.
                            </p>
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate('/tecnico-proveedor/dashboard');
                                }}
                                style={{
                                    padding: '12px 28px',
                                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '14px',
                                    fontSize: '14px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <HiOutlineArrowTopRightOnSquare size={18} /> Ir a mi Dashboard Pro-Veedor
                            </button>
                        </div>
                    ) : pagoActual && pagoActual.estado === 'Pendiente' && !modoReenvio ? (
                        /* ESTADO 2: PAGO EN REVISIÓN */
                        <div style={{
                            background: '#fffbeb',
                            border: '2px solid #fde68a',
                            borderRadius: '20px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#f59e0b', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                                    <HiOutlineClock size={24} color="#ffffff" />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#92400e' }}>
                                        Comprobante en Revisión por el Administrador General
                                    </h4>
                                    <span style={{ fontSize: '12px', color: '#b45309' }}>
                                        Folio: {pagoActual.folio_referencia} • Registrado el {new Date(pagoActual.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <p style={{ margin: 0, fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>
                                Hemos recibido tu comprobante de transferencia bancaria por <strong>${Number(pagoActual.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong> ({pagoActual.banco_origen}). En cuanto el Administrador General lo valide, se activará tu rango de <strong>Técnico Pro-Veedor</strong> y aparecerás en la opción <strong>RED</strong>.
                            </p>

                            {pagoActual.comprobante_url && (
                                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #fcd34d' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#92400e', display: 'block', marginBottom: '6px' }}>
                                        Comprobante adjunto:
                                    </span>
                                    <a 
                                        href={pagoActual.comprobante_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'underline', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <HiOutlineDocumentCheck size={16} /> Ver comprobante enviado
                                    </a>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setModoReenvio(true)}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid #d97706',
                                        color: '#b45309',
                                        padding: '6px 14px',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ¿Te equivocaste? Reenviar nuevo comprobante
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ESTADO 3: FORMULARIO DE PAGO POR TRANSFERENCIA */
                        <>
                            {/* ALERTA SI FUE RECHAZADO PREVIAMENTE */}
                            {pagoActual && pagoActual.estado === 'Rechazado' && !modoReenvio && (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '2px solid #fecaca',
                                    borderRadius: '16px',
                                    padding: '16px 20px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                }}>
                                    <HiOutlineXCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <div>
                                        <strong style={{ color: '#991b1b', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                                            Comprobante previo no aprobado
                                        </strong>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#b91c1c' }}>
                                            <strong>Motivo indicado por el Administrador:</strong> {pagoActual.motivo_rechazo || 'Comprobante no válido o ilegible.'}
                                        </p>
                                        <span style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '6px', display: 'block' }}>
                                            Por favor verifica los datos y sube tu comprobante correcto a continuación.
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* TARJETA 1: DATOS BANCARIOS OFICIALES */}
                            <div style={{
                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                borderRadius: '20px',
                                padding: '22px 24px',
                                color: '#ffffff',
                                border: '1px solid #334155',
                                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: '#f59e0b' }}>
                                        💳 Cuenta Oficial para Transferencia
                                    </span>
                                    <span style={{ background: '#3b82f6', color: '#ffffff', fontSize: '11px', fontWeight: '900', padding: '3px 10px', borderRadius: '20px' }}>
                                        SPEI
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>Banco Destino</span>
                                        <strong style={{ fontSize: '15px', color: '#ffffff' }}>{datosBancarios?.banco || 'BBVA México'}</strong>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>Monto de Membresía</span>
                                        <strong style={{ fontSize: '15px', color: '#34d399' }}>${Number(datosBancarios?.monto_sugerido || 1499).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>Beneficiario / Titular</span>
                                        <strong style={{ fontSize: '13px', color: '#ffffff' }}>{datosBancarios?.titular || 'Mantenere Servicios S.A. de C.V.'}</strong>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '600' }}>Concepto Sugerido</span>
                                        <strong style={{ fontSize: '13px', color: '#e2e8f0' }}>Membresía Pro-Veedor</strong>
                                    </div>
                                </div>

                                {/* CLABE CON BOTÓN DE COPIADO */}
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '1px solid rgba(255, 255, 255, 0.12)'
                                }}>
                                    <div>
                                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>
                                            CLABE Interbancaria (18 dígitos)
                                        </span>
                                        <span style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '1.5px', color: '#ffffff', fontFamily: 'monospace' }}>
                                            {datosBancarios?.clabe || '012180015678901234'}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCopiarClabe}
                                        style={{
                                            background: copiado ? '#10b981' : '#3b82f6',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '8px 14px',
                                            borderRadius: '10px',
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <HiOutlineClipboardDocumentCheck size={16} />
                                        {copiado ? '¡Copiado!' : 'Copiar CLABE'}
                                    </button>
                                </div>
                            </div>

                            {/* FORMULARIO DE CAPTURA DEL COMPROBANTE */}
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <HiOutlineBuildingOffice2 color="#2563eb" size={18} /> Datos de tu Empresa y Transferencia
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                            Nombre de tu Empresa o Equipo Pro-Veedor *
                                        </label>
                                        <input 
                                            type="text"
                                            placeholder="Ej. Multiservicios Rodríguez"
                                            value={nombreEmpresa}
                                            onChange={e => setNombreEmpresa(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                            Teléfono de Contacto Directo *
                                        </label>
                                        <input 
                                            type="tel"
                                            placeholder="Ej. 999 123 4567"
                                            value={telefono}
                                            onChange={e => setTelefono(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                            Banco de Origen *
                                        </label>
                                        <select
                                            value={bancoOrigen}
                                            onChange={e => setBancoOrigen(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', outline: 'none' }}
                                        >
                                            {BANCOS_MEXICO.map((banco, i) => (
                                                <option key={i} value={banco}>{banco}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                            Folio / Clave de Rastreo *
                                        </label>
                                        <input 
                                            type="text"
                                            placeholder="Ej. 2026091100123"
                                            value={folioReferencia}
                                            onChange={e => setFolioReferencia(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                            Fecha de Transferencia *
                                        </label>
                                        <input 
                                            type="date"
                                            value={fechaTransferencia}
                                            onChange={e => setFechaTransferencia(e.target.value)}
                                            required
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* SUBIDA DEL COMPROBANTE */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                        Comprobante de Transferencia (Foto, Captura o PDF) *
                                    </label>
                                    <input 
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*,application/pdf"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />

                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            border: '2px dashed #94a3b8',
                                            borderRadius: '14px',
                                            padding: '16px',
                                            background: '#f8fafc',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '12px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {comprobantePreview ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <img src={comprobantePreview} alt="Preview Comprobante" style={{ width: '60px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />
                                                <div>
                                                    <span style={{ fontSize: '13px', color: '#059669', fontWeight: '800', display: 'block' }}>
                                                        ✓ Comprobante seleccionado
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                        Haz clic aquí si deseas cambiar el archivo
                                                    </span>
                                                </div>
                                            </div>
                                        ) : comprobanteFile ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <HiOutlineDocumentCheck size={24} color="#059669" />
                                                <div>
                                                    <span style={{ fontSize: '13px', color: '#059669', fontWeight: '800', display: 'block' }}>
                                                        ✓ Archivo adjunto: {comprobanteFile.name}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>Haz clic para cambiar</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <HiOutlinePhoto size={28} color="#64748b" />
                                                <div style={{ textAlign: 'left' }}>
                                                    <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block' }}>
                                                        Subir comprobante de transferencia
                                                    </strong>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                        Formatos soportados: JPG, PNG, PDF (Máx. 15MB)
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                        Notas o Comentarios Adicionales (Opcional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Ej. Transferencia efectuada desde cuenta personal a nombre de..."
                                        value={notas}
                                        onChange={e => setNotas(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                                    />
                                </div>

                                {/* BOTONES DE ACCIÓN */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        style={{ padding: '10px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        style={{
                                            padding: '11px 26px',
                                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                                            opacity: isSubmitting ? 0.7 : 1
                                        }}
                                    >
                                        <HiOutlineSparkles size={16} />
                                        {isSubmitting ? 'Enviando Comprobante...' : '📤 Enviar Comprobante al Admin'}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PagoTransferenciaModal;
