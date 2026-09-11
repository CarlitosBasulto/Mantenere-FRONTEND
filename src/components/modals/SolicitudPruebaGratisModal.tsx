import React, { useState } from 'react';
import { 
    HiOutlineSparkles, 
    HiOutlineBuildingOffice2, 
    HiOutlinePhone, 
    HiOutlineDocumentText, 
    HiOutlineShieldCheck,
    HiOutlineGift,
    HiOutlineUserGroup,
    HiOutlineCalculator,
    HiOutlineXMark
} from 'react-icons/hi2';
import { solicitarPruebaGratis } from '../../services/pagoProveedorService';
import { useModal } from '../../context/ModalContext';

interface SolicitudPruebaGratisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialNombre?: string;
    initialTelefono?: string;
}

const SolicitudPruebaGratisModal: React.FC<SolicitudPruebaGratisModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    initialNombre = '',
    initialTelefono = '',
}) => {
    const { showAlert } = useModal();

    const [nombreEmpresa, setNombreEmpresa] = useState(initialNombre);
    const [telefono, setTelefono] = useState(initialTelefono);
    const [notas, setNotas] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nombreEmpresa.trim()) {
            showAlert('Nombre Requerido', 'Por favor ingresa el nombre de tu empresa o negocio.', 'warning');
            return;
        }

        if (!telefono.trim() || telefono.length < 8) {
            showAlert('Teléfono Inválido', 'Por favor ingresa un teléfono o WhatsApp de contacto válido.', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await solicitarPruebaGratis({
                nombre_empresa: nombreEmpresa.trim(),
                telefono: telefono.trim(),
                notas: notas.trim() || undefined,
            });

            showAlert(
                '¡Solicitud Enviada!',
                res.message || 'Tu solicitud de prueba de 6 meses fue enviada. El Administrador General la revisará para dar su visto bueno.',
                'success'
            );

            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Hubo un error al enviar tu solicitud. Intenta nuevamente.';
            showAlert('Error', msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div 
            style={{
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
                padding: '16px',
                fontFamily: 'Inter, sans-serif'
            }}
            onClick={onClose}
        >
            <div 
                style={{
                    background: '#ffffff',
                    width: '100%',
                    maxWidth: '620px',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                    overflow: 'hidden',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #cbd5e1'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER CON GRADIENTE PREMIUM */}
                <div style={{
                    position: 'relative',
                    background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
                    padding: '24px 28px',
                    color: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    boxShadow: '0 4px 20px rgba(6, 78, 59, 0.25)'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#fef08a',
                                color: '#854d0e',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '900',
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
                            }}>
                                <HiOutlineGift size={15} /> 6 MESES GRATIS
                            </span>
                            <span style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Cortesía Mantenere
                            </span>
                        </div>

                        <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.4px' }}>
                            Prueba Técnico Pro-Veedor
                        </h2>
                        <p style={{ margin: 0, fontSize: '12.5px', color: '#d1fae5', lineHeight: '1.4' }}>
                            Acceso total sin costo por 180 días con el visto bueno del Administrador General.
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        title="Cerrar modal"
                        style={{
                            background: '#ef4444',
                            border: '2px solid #ffffff',
                            color: '#ffffff',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontWeight: '900',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                            transition: 'transform 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        ✕
                    </button>
                </div>

                {/* CONTENIDO SCROLLABLE */}
                <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* TARJETAS DE BENEFICIOS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        <div style={{
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '16px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{ background: '#059669', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                                <HiOutlineUserGroup size={22} color="#ffffff" />
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: '900', color: '#064e3b' }}>
                                    Cuadrilla Propia
                                </h4>
                                <p style={{ margin: 0, fontSize: '11px', color: '#047857' }}>
                                    Crea y administra a tus técnicos a cargo.
                                </p>
                            </div>
                        </div>

                        <div style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '16px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{ background: '#16a34a', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                                <HiOutlineCalculator size={22} color="#ffffff" />
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: '900', color: '#14532d' }}>
                                    Cotizaciones Directas
                                </h4>
                                <p style={{ margin: 0, fontSize: '11px', color: '#15803d' }}>
                                    Envía presupuestos al Administrador General.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* VISTO BUENO CALLOUT */}
                    <div style={{
                        background: '#fffbeb',
                        border: '1.5px solid #fde68a',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                    }}>
                        <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '10px', display: 'flex', marginTop: '2px' }}>
                            <HiOutlineShieldCheck size={22} color="#d97706" />
                        </div>
                        <div style={{ fontSize: '12px', color: '#92400e', lineHeight: '1.45' }}>
                            <strong style={{ display: 'block', fontSize: '12.5px', color: '#78350f', marginBottom: '2px', fontWeight: '900' }}>
                                Visto Bueno Requerido:
                            </strong>
                            Esta prueba de 6 meses es <strong>100% gratuita</strong>. Al enviar el formulario, el <strong>Administrador General</strong> validará tu perfil para autorizar y activar tu membresía.
                        </div>
                    </div>

                    {/* FORMULARIO */}
                    <form id="form-solicitud-prueba" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Nombre de tu Empresa o Negocio *
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', color: '#94a3b8' }}>
                                    <HiOutlineBuildingOffice2 size={18} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={nombreEmpresa}
                                    onChange={(e) => setNombreEmpresa(e.target.value)}
                                    placeholder="Ej. Climas y Mantenimientos del Norte"
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '12px 14px 12px 38px',
                                        background: '#f8fafc',
                                        border: '1.5px solid #cbd5e1',
                                        borderRadius: '12px',
                                        fontSize: '13.5px',
                                        color: '#1e293b',
                                        fontWeight: '600',
                                        outline: 'none',
                                        transition: 'border-color 0.2s ease, background 0.2s ease'
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.background = '#ffffff'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Teléfono / WhatsApp de Contacto *
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', color: '#94a3b8' }}>
                                    <HiOutlinePhone size={18} />
                                </div>
                                <input
                                    type="tel"
                                    required
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    placeholder="Ej. 81 1234 5678"
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '12px 14px 12px 38px',
                                        background: '#f8fafc',
                                        border: '1.5px solid #cbd5e1',
                                        borderRadius: '12px',
                                        fontSize: '13.5px',
                                        color: '#1e293b',
                                        fontWeight: '600',
                                        outline: 'none',
                                        transition: 'border-color 0.2s ease, background 0.2s ease'
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.background = '#ffffff'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Notas o Servicios Principales (Opcional)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <textarea
                                    rows={3}
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                    placeholder="Cuéntanos brevemente sobre las especialidades de tu equipo o servicios que brindan..."
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '10px 14px',
                                        background: '#f8fafc',
                                        border: '1.5px solid #cbd5e1',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        color: '#1e293b',
                                        fontWeight: '500',
                                        outline: 'none',
                                        resize: 'none',
                                        fontFamily: 'inherit',
                                        transition: 'border-color 0.2s ease, background 0.2s ease'
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.background = '#ffffff'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* FOOTER CON BOTONES DE ACCIÓN */}
                <div style={{
                    padding: '16px 28px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            padding: '11px 20px',
                            background: '#e2e8f0',
                            color: '#475569',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s ease'
                        }}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        form="form-solicitud-prueba"
                        disabled={isSubmitting}
                        style={{
                            padding: '12px 26px',
                            background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '13.5px',
                            fontWeight: '900',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 6px 18px rgba(5, 150, 105, 0.4)',
                            opacity: isSubmitting ? 0.7 : 1,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isSubmitting ? (
                            <span>Enviando solicitud...</span>
                        ) : (
                            <>
                                <HiOutlineGift size={18} />
                                <span>Solicitar Prueba Gratis (6 Meses)</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SolicitudPruebaGratisModal;
