import React, { useEffect, useState } from 'react';
import { 
    HiOutlineUserGroup, 
    HiOutlineBriefcase, 
    HiOutlineCurrencyDollar,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineMapPin,
    HiOutlineSparkles,
    HiOutlineGift,
    HiOutlineExclamationTriangle,
    HiOutlineClipboardDocumentList,
    HiOutlineArrowRight
} from 'react-icons/hi2';
import { 
    getMiCuadrilla, 
    crearTecnicoCuadrilla, 
    eliminarTecnicoCuadrilla, 
    getTrabajosRedProVeedor, 
    asignarTrabajoACuadrilla, 
    enviarCotizacionProVeedorAdmin,
    type MiembroCuadrilla,
    type TrabajoRed
} from '../../../services/cuadrillaProveedorService';
import { 
    getMiEstadoPago, 
    type PruebaGratisInfo, 
    type PagoProveedor 
} from '../../../services/pagoProveedorService';
import PagoTransferenciaModal from '../../../components/modals/PagoTransferenciaModal';
import { useAuth } from '../../../context/AuthContext';
import { useModal } from '../../../context/ModalContext';
import { useNavigate } from 'react-router-dom';

const ESPECIALIDADES = [
    "Mantenimiento General",
    "Electricidad",
    "Plomería",
    "Aire Acondicionado",
    "Albañilería",
    "Pintura",
    "Carpintería",
    "Refrigeración",
    "Cerrajería"
];

interface PruebaGratisBannerProps {
    pruebaInfo: PruebaGratisInfo;
    onRenovar: () => void;
}

const PruebaGratisBanner: React.FC<PruebaGratisBannerProps> = React.memo(({ pruebaInfo, onRenovar }) => {
    const [timeLeft, setTimeLeft] = useState<{
        months: number;
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        isExpired: boolean;
    }>(() => {
        if (!pruebaInfo.prueba_fin_at) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false };
        const diff = new Date(pruebaInfo.prueba_fin_at).getTime() - Date.now();
        if (diff <= 0) return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
        const totalSecs = Math.floor(diff / 1000);
        const totalDays = Math.floor(totalSecs / 86400);
        return {
            months: Math.floor(totalDays / 30),
            days: totalDays % 30,
            hours: Math.floor((totalSecs % 86400) / 3600),
            minutes: Math.floor((totalSecs % 3600) / 60),
            seconds: totalSecs % 60,
            isExpired: false
        };
    });

    useEffect(() => {
        if (!pruebaInfo.prueba_fin_at) return;

        const calculateTime = () => {
            const target = new Date(pruebaInfo.prueba_fin_at!).getTime();
            const diff = target - Date.now();

            if (diff <= 0) {
                setTimeLeft({ months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
                return;
            }

            const totalSecs = Math.floor(diff / 1000);
            const totalDays = Math.floor(totalSecs / 86400);
            const months = Math.floor(totalDays / 30);
            const days = totalDays % 30;
            const hours = Math.floor((totalSecs % 86400) / 3600);
            const minutes = Math.floor((totalSecs % 3600) / 60);
            const seconds = totalSecs % 60;

            setTimeLeft({ months, days, hours, minutes, seconds, isExpired: false });
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [pruebaInfo.prueba_fin_at]);

    const boxStyle: React.CSSProperties = {
        background: 'rgba(0, 0, 0, 0.45)',
        padding: '10px 14px',
        borderRadius: '14px',
        textAlign: 'center',
        minWidth: '64px',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        transform: 'translateZ(0)'
    };

    return (
        <div style={{
            background: timeLeft.isExpired 
                ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)' 
                : 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
            borderRadius: '24px',
            padding: '20px 28px',
            color: '#ffffff',
            marginBottom: '24px',
            boxShadow: timeLeft.isExpired
                ? '0 12px 28px -5px rgba(220, 38, 38, 0.4)'
                : '0 12px 28px -5px rgba(5, 150, 105, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            border: timeLeft.isExpired ? '1px solid #ef4444' : '1px solid #10b981'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '280px', flex: '1' }}>
                <div style={{
                    background: timeLeft.isExpired ? '#b91c1c' : '#059669',
                    padding: '14px',
                    borderRadius: '20px',
                    display: 'flex',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
                }}>
                    {timeLeft.isExpired ? (
                        <HiOutlineExclamationTriangle size={32} color="#fecaca" />
                    ) : (
                        <HiOutlineGift size={32} color="#a7f3d0" />
                    )}
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                            background: timeLeft.isExpired ? '#fef2f2' : '#ecfdf5',
                            color: timeLeft.isExpired ? '#991b1b' : '#065f46',
                            fontSize: '11px',
                            fontWeight: '900',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {timeLeft.isExpired ? 'Prueba Finalizada' : '🎁 Cortesía: 6 Meses Gratis'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                            {pruebaInfo.prueba_fin_at ? `Vigente hasta el ${new Date(pruebaInfo.prueba_fin_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}
                        </span>
                    </div>
                    <h3 style={{ margin: '6px 0 0 0', fontSize: '18px', fontWeight: '900', color: '#ffffff' }}>
                        {timeLeft.isExpired 
                            ? 'Tu periodo de prueba gratuita de 6 meses ha concluido' 
                            : 'Tiempo restante de tu membresía de cortesía (6 Meses)'}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: timeLeft.isExpired ? '#fecaca' : '#a7f3d0' }}>
                        {timeLeft.isExpired
                            ? 'Renueva tu suscripción anual por $1,499.00 MXN para conservar tu cuadrilla y recibir trabajos de la RED.'
                            : 'Disfruta de todos los beneficios de Técnico Pro-Veedor sin costo con visto bueno del Administrador General.'}
                    </p>
                </div>
            </div>

            {/* CONTADOR DE TIEMPO EN VIVO */}
            {!timeLeft.isExpired ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={boxStyle}>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#34d399', lineHeight: 1 }}>{timeLeft.months}</div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginTop: '4px' }}>Meses</div>
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: '900', color: '#34d399' }}>:</span>
                    <div style={boxStyle}>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#34d399', lineHeight: 1 }}>{timeLeft.days}</div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginTop: '4px' }}>Días</div>
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: '900', color: '#34d399' }}>:</span>
                    <div style={boxStyle}>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#fef08a', lineHeight: 1 }}>{String(timeLeft.hours).padStart(2, '0')}</div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginTop: '4px' }}>Hrs</div>
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: '900', color: '#fef08a' }}>:</span>
                    <div style={boxStyle}>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#fef08a', lineHeight: 1 }}>{String(timeLeft.minutes).padStart(2, '0')}</div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginTop: '4px' }}>Min</div>
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: '900', color: '#fef08a' }}>:</span>
                    <div style={boxStyle}>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#f87171', lineHeight: 1 }}>{String(timeLeft.seconds).padStart(2, '0')}</div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginTop: '4px' }}>Seg</div>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onRenovar}
                    style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: '#ffffff',
                        padding: '12px 24px',
                        borderRadius: '14px',
                        border: 'none',
                        fontWeight: '900',
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: '0 6px 18px rgba(37, 99, 235, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <HiOutlineSparkles size={18} /> Renovar Membresía ($1,499 MXN)
                </button>
            )}
        </div>
    );
});

const DashboardTecnicoProveedor: React.FC = () => {
    const { user } = useAuth();
    const { showAlert } = useModal();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'trabajos' | 'cuadrilla' | 'cotizaciones'>('trabajos');
    const [trabajos, setTrabajos] = useState<TrabajoRed[]>([]);
    const [cuadrilla, setCuadrilla] = useState<MiembroCuadrilla[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [subFilter, setSubFilter] = useState<'activos' | 'finalizados' | 'todos'>('activos');

    // Modal nuevo técnico
    const [isNewTechModalOpen, setIsNewTechModalOpen] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoCorreo, setNuevoCorreo] = useState('');
    const [nuevoPassword, setNuevoPassword] = useState('');
    const [nuevaEspecialidad, setNuevaEspecialidad] = useState(ESPECIALIDADES[0]);
    const [fotoFile, setFotoFile] = useState<File | null>(null);
    const [isSubmittingTech, setIsSubmittingTech] = useState(false);

    // Modal sub-asignar trabajo a cuadrilla
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedTrabajo, setSelectedTrabajo] = useState<TrabajoRed | null>(null);
    const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
    const [assignTipo, setAssignTipo] = useState<'Visita' | 'Trabajo'>('Visita');
    const [assignFecha, setAssignFecha] = useState('');
    const [assignHora, setAssignHora] = useState('');
    const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

    // Modal cotización al admin
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [quoteTrabajo, setQuoteTrabajo] = useState<TrabajoRed | null>(null);
    const [quoteMonto, setQuoteMonto] = useState('');
    const [quoteConcepto, setQuoteConcepto] = useState('');
    const [quoteNotas, setQuoteNotas] = useState('');
    const [quoteArchivo, setQuoteArchivo] = useState<File | null>(null);
    const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

    // Estado prueba gratis y cuenta regresiva
    const [pruebaInfo, setPruebaInfo] = useState<PruebaGratisInfo | null>(null);
    const [pagoActual, setPagoActual] = useState<PagoProveedor | null>(null);
    const [isRenovarModalOpen, setIsRenovarModalOpen] = useState(false);

    const cargarDatos = async () => {
        setIsLoading(true);
        try {
            const [trabData, cuadData, estadoPagoData] = await Promise.all([
                getTrabajosRedProVeedor().catch(() => []),
                getMiCuadrilla().catch(() => []),
                getMiEstadoPago().catch(() => null)
            ]);
            setTrabajos(trabData || []);
            setCuadrilla(cuadData || []);
            if (estadoPagoData) {
                setPruebaInfo(estadoPagoData.prueba_info);
                setPagoActual(estadoPagoData.ultimo_pago);
            }
        } catch (err) {
            console.error("Error cargando dashboard pro-veedor:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // ── GESTIÓN DE CUADRILLA ─────────────────────────────────────────────
    const handleCrearTecnico = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevoNombre.trim()) {
            showAlert("Campo Requerido", "Por favor ingresa el nombre del técnico.", "warning");
            return;
        }

        try {
            setIsSubmittingTech(true);
            const formData = new FormData();
            formData.append('nombre', nuevoNombre.trim());
            if (nuevoTelefono.trim()) formData.append('telefono', nuevoTelefono.trim());
            if (nuevoCorreo.trim()) formData.append('correo', nuevoCorreo.trim());
            if (nuevoPassword.trim()) formData.append('password', nuevoPassword.trim());
            formData.append('especialidad', nuevaEspecialidad);
            if (fotoFile) formData.append('foto', fotoFile);

            await crearTecnicoCuadrilla(formData);
            showAlert("Técnico Registrado", "El técnico ha sido agregado a tu cuadrilla con rol exclusivo 'Técnico de Cuadrilla'.", "success");
            setIsNewTechModalOpen(false);
            setNuevoNombre('');
            setNuevoTelefono('');
            setNuevoCorreo('');
            setNuevoPassword('');
            setFotoFile(null);
            cargarDatos();
        } catch (err: any) {
            console.error("Error creando técnico:", err);
            showAlert("Error", err.response?.data?.message || "No se pudo registrar al técnico.", "error");
        } finally {
            setIsSubmittingTech(false);
        }
    };

    const handleEliminarTecnico = async (id: number, nombre: string) => {
        if (!window.confirm(`¿Seguro que deseas dar de baja a ${nombre} de tu cuadrilla?`)) return;

        try {
            await eliminarTecnicoCuadrilla(id);
            showAlert("Técnico Eliminado", "Se removió al técnico de tu cuadrilla.", "info");
            cargarDatos();
        } catch (err: any) {
            console.error("Error eliminando técnico:", err);
            showAlert("Error", "No se pudo eliminar al técnico.", "error");
        }
    };

    // ── SUB-ASIGNAR TRABAJO A CUADRILLA ───────────────────────────────────
    const handleOpenAssignModal = (trabajo: TrabajoRed) => {
        setSelectedTrabajo(trabajo);
        setSelectedTechId(cuadrilla[0]?.id || '');
        setAssignTipo(trabajo.tipo === 'Trabajo' ? 'Trabajo' : 'Visita');
        setAssignFecha(trabajo.fecha_programada || new Date().toISOString().split('T')[0]);
        setAssignHora(trabajo.hora_llegada || '09:00');
        setIsAssignModalOpen(true);
    };

    const handleConfirmAssignCuadrilla = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTrabajo || !selectedTechId) return;

        try {
            setIsSubmittingAssign(true);
            await asignarTrabajoACuadrilla(selectedTrabajo.id, {
                tecnico_id: Number(selectedTechId),
                tipo: assignTipo,
                fecha: assignFecha,
                hora: assignHora
            });
            showAlert("Trabajo Despachado", `El trabajo ha sido despachado a tu técnico para ${assignTipo === 'Visita' ? 'Visita de Cotización' : 'Trabajo Directo'}.`, "success");
            setIsAssignModalOpen(false);
            cargarDatos();
        } catch (err: any) {
            console.error("Error asignando a cuadrilla:", err);
            showAlert("Error", err.response?.data?.message || "No se pudo despachar el trabajo.", "error");
        } finally {
            setIsSubmittingAssign(false);
        }
    };

    // ── ENVIAR COTIZACIÓN AL ADMIN GENERAL ────────────────────────────────
    const handleOpenQuoteModal = (trabajo: TrabajoRed) => {
        setQuoteTrabajo(trabajo);
        setQuoteMonto(trabajo.cotizacion ? String(trabajo.cotizacion) : '');
        setQuoteConcepto(`Propuesta de servicio: ${trabajo.titulo}`);
        setQuoteNotas('');
        setQuoteArchivo(null);
        setIsQuoteModalOpen(true);
    };

    const handleSubmitQuote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quoteTrabajo || !quoteMonto) {
            showAlert("Monto Requerido", "Por favor ingresa el monto de la cotización.", "warning");
            return;
        }

        try {
            setIsSubmittingQuote(true);
            const formData = new FormData();
            formData.append('monto', quoteMonto);
            formData.append('concepto', quoteConcepto);
            if (quoteNotas.trim()) formData.append('notas', quoteNotas.trim());
            if (quoteArchivo) formData.append('archivo', quoteArchivo);

            await enviarCotizacionProVeedorAdmin(quoteTrabajo.id, formData);
            showAlert("Cotización Enviada", "La propuesta económica fue enviada exitosamente al Administrador General para su autorización.", "success");
            setIsQuoteModalOpen(false);
            cargarDatos();
        } catch (err: any) {
            console.error("Error enviando cotización:", err);
            showAlert("Error", err.response?.data?.message || "No se pudo enviar la cotización.", "error");
        } finally {
            setIsSubmittingQuote(false);
        }
    };

    // Métricas del mini tablero
    const totalTrabajos = trabajos.length;
    const enEjecucion = trabajos.filter(t => ['En Proceso', 'En Ejecución', 'Asignado'].includes(t.estado)).length;
    const finalizados = trabajos.filter(t => ['Finalizado', 'Completado'].includes(t.estado)).length;
    const porAutorizar = trabajos.filter(t => ['Cotización Enviada', 'Pendiente', 'Solicitud'].includes(t.estado)).length;
    const totalCuadrilla = cuadrilla.length;

    const activeTrabajos = trabajos.filter(t => !['Finalizado', 'Completado', 'Rechazada', 'Cotización Rechazada', 'Cancelado'].includes(t.estado));
    const finalizadosTrabajos = trabajos.filter(t => ['Finalizado', 'Completado'].includes(t.estado));
    const displayedTrabajos = subFilter === 'finalizados' ? finalizadosTrabajos : (subFilter === 'todos' ? trabajos : activeTrabajos);

    return (
        <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            
            {/* BANNER CONTADOR DE PRUEBA GRATUITA (6 MESES) */}
            {pruebaInfo?.es_prueba_gratis && (
                <PruebaGratisBanner 
                    pruebaInfo={pruebaInfo} 
                    onRenovar={() => setIsRenovarModalOpen(true)} 
                />
            )}
            
            {/* HEADER PRO-VEEDOR */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '24px',
                padding: '28px',
                color: '#ffffff',
                marginBottom: '24px',
                boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        padding: '16px',
                        borderRadius: '20px',
                        display: 'flex',
                        boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.4)'
                    }}>
                        <HiOutlineSparkles size={32} color="#ffffff" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.4px' }}>
                                Dashboard Pro-Veedor
                            </h1>
                            <span style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                fontSize: '11px',
                                fontWeight: '900',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                textTransform: 'uppercase'
                            }}>
                                Miembro de la RED
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                            Bienvenido, <strong>{user?.name}</strong> • Gestiona tu cuadrilla, recibe trabajos asignados y envía cotizaciones al Administrador General
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setIsNewTechModalOpen(true)}
                        style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                        }}
                    >
                        <HiOutlinePlus size={18} /> Agregar Técnico a mi Cuadrilla
                    </button>
                </div>
            </div>

            {/* MINI TABLERO KPIS */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '28px'
            }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Trabajos de la RED</span>
                    <h3 style={{ margin: '8px 0 0 0', fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>{totalTrabajos}</h3>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#d97706', textTransform: 'uppercase' }}>Por Autorizar / Cotizar</span>
                    <h3 style={{ margin: '8px 0 0 0', fontSize: '26px', fontWeight: '900', color: '#d97706' }}>{porAutorizar}</h3>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' }}>En Ejecución</span>
                    <h3 style={{ margin: '8px 0 0 0', fontSize: '26px', fontWeight: '900', color: '#2563eb' }}>{enEjecucion}</h3>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', textTransform: 'uppercase' }}>Finalizados</span>
                    <h3 style={{ margin: '8px 0 0 0', fontSize: '26px', fontWeight: '900', color: '#059669' }}>{finalizados}</h3>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' }}>Mi Cuadrilla Activa</span>
                    <h3 style={{ margin: '8px 0 0 0', fontSize: '26px', fontWeight: '900', color: '#7c3aed' }}>{totalCuadrilla} técnicos</h3>
                </div>
            </div>

            {/* PESTAÑAS */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
                <button
                    onClick={() => setActiveTab('trabajos')}
                    style={{
                        padding: '12px 20px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'trabajos' ? '3px solid #2563eb' : '3px solid transparent',
                        color: activeTab === 'trabajos' ? '#2563eb' : '#64748b',
                        fontWeight: '800',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <HiOutlineBriefcase size={18} /> Trabajos de la RED ({activeTrabajos.length})
                </button>

                <button
                    onClick={() => setActiveTab('cuadrilla')}
                    style={{
                        padding: '12px 20px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'cuadrilla' ? '3px solid #2563eb' : '3px solid transparent',
                        color: activeTab === 'cuadrilla' ? '#2563eb' : '#64748b',
                        fontWeight: '800',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <HiOutlineUserGroup size={18} /> Mi Cuadrilla / Escuadrón ({cuadrilla.length})
                </button>
            </div>

            {/* CONTENIDO PESTAÑAS */}
            {isLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Cargando información del tablero...</div>
            ) : activeTab === 'trabajos' ? (
                /* TAB 1: TRABAJOS DE LA RED */
                <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setSubFilter('activos')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid',
                                borderColor: subFilter === 'activos' ? '#2563eb' : '#cbd5e1',
                                background: subFilter === 'activos' ? '#eff6ff' : '#ffffff',
                                color: subFilter === 'activos' ? '#1d4ed8' : '#64748b',
                                fontWeight: '800',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            ⚡ Activos ({activeTrabajos.length})
                        </button>
                        <button
                            onClick={() => setSubFilter('finalizados')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid',
                                borderColor: subFilter === 'finalizados' ? '#059669' : '#cbd5e1',
                                background: subFilter === 'finalizados' ? '#ecfdf5' : '#ffffff',
                                color: subFilter === 'finalizados' ? '#047857' : '#64748b',
                                fontWeight: '800',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            ✓ Finalizados ({finalizadosTrabajos.length})
                        </button>
                        <button
                            onClick={() => setSubFilter('todos')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid',
                                borderColor: subFilter === 'todos' ? '#475569' : '#cbd5e1',
                                background: subFilter === 'todos' ? '#f1f5f9' : '#ffffff',
                                color: subFilter === 'todos' ? '#0f172a' : '#64748b',
                                fontWeight: '800',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            Todos ({trabajos.length})
                        </button>
                    </div>

                    {displayedTrabajos.length === 0 ? (
                        <div style={{ background: '#ffffff', padding: '50px 20px', borderRadius: '20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                            <HiOutlineBriefcase size={44} color="#94a3b8" />
                            <h3 style={{ margin: '14px 0 6px 0', color: '#1e293b' }}>
                                {subFilter === 'activos' ? 'Sin trabajos activos de la RED en este momento' : (subFilter === 'finalizados' ? 'Aún no hay trabajos finalizados' : 'Sin trabajos asignados de la RED aún')}
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                                {subFilter === 'activos' 
                                    ? 'Todos los trabajos asignados se encuentran concluidos o no hay tareas pendientes.' 
                                    : 'Cuando el Administrador General o el Administrador Autónomo te asignen trabajos mediante la opción RED, aparecerán aquí.'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                            {displayedTrabajos.map(t => (
                            <div key={t.id} style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '20px',
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '800', background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '12px' }}>
                                            {t.tipo || 'Trabajo'} • #{t.id}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>
                                            {t.fecha_programada || 'Fecha por definir'}
                                        </span>
                                    </div>

                                    <h3 
                                        onClick={() => navigate(`/tecnico-proveedor/trabajo-detalle/${t.id}?tab=datos`)}
                                        style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', cursor: 'pointer', transition: 'color 0.2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#f26522')}
                                        onMouseLeave={e => (e.currentTarget.style.color = '#0f172a')}
                                    >
                                        {t.titulo}
                                    </h3>

                                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569' }}>
                                        {t.descripcion || 'Sin descripción detallada.'}
                                    </p>

                                    {t.negocio && (
                                        <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <HiOutlineMapPin size={14} color="#3b82f6" /> {t.negocio.nombre} {t.negocio.nombrePlaza ? `(${t.negocio.nombrePlaza})` : ''}
                                        </p>
                                    )}

                                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Técnico a cargo:</span>
                                        <strong style={{ color: '#0f172a' }}>{t.trabajador?.nombre || 'Tú (Sin sub-asignar)'}</strong>
                                    </div>

                                    {t.cotizacion && (
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#059669', fontWeight: '700' }}>
                                            💰 Cotización actual: ${Number(t.cotizacion).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <button
                                        onClick={() => handleOpenAssignModal(t)}
                                        style={{
                                            padding: '10px 12px',
                                            background: '#f1f5f9',
                                            color: '#334155',
                                            border: '1.5px solid #cbd5e1',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#e2e8f0')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#f1f5f9')}
                                    >
                                        <HiOutlineUserGroup size={16} /> Despachar
                                    </button>

                                    <button
                                        onClick={() => navigate(`/tecnico-proveedor/trabajo-detalle/${t.id}?tab=datos`)}
                                        style={{
                                            padding: '10px 12px',
                                            background: 'linear-gradient(135deg, #f26522 0%, #ea580c 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            boxShadow: '0 3px 10px rgba(242, 101, 34, 0.25)',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                                        onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                                    >
                                        <HiOutlineArrowRight size={16} /> {t.tipo === 'Trabajo' ? 'Ir a Trabajo' : 'Ir a Visita'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </div>
            ) : (
                /* TAB 2: MI CUADRILLA */
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                                Técnicos en tu Cuadrilla ({cuadrilla.length})
                            </h3>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                Administra a tus técnicos y despáchales visitas o reparaciones directamente
                            </span>
                        </div>

                        <button
                            onClick={() => setIsNewTechModalOpen(true)}
                            style={{
                                background: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <HiOutlinePlus size={16} /> + Nuevo Técnico
                        </button>
                    </div>

                    {cuadrilla.length === 0 ? (
                        <div style={{ background: '#ffffff', padding: '40px 20px', borderRadius: '20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                            <HiOutlineUserGroup size={44} color="#94a3b8" />
                            <h3 style={{ margin: '12px 0 6px 0', color: '#1e293b' }}>Aún no tienes técnicos en tu cuadrilla</h3>
                            <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px 0' }}>
                                Como Técnico Pro-Veedor puedes registrar tu propio equipo a cargo para delegar trabajos.
                            </p>
                            <button
                                onClick={() => setIsNewTechModalOpen(true)}
                                style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                            >
                                Registrar Primer Técnico
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {cuadrilla.map(m => (
                                <div key={m.id} style={{
                                    background: '#ffffff',
                                    borderRadius: '16px',
                                    border: '1px solid #cbd5e1',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '50%',
                                            background: '#f1f5f9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '18px',
                                            fontWeight: '800',
                                            color: '#2563eb',
                                            overflow: 'hidden'
                                        }}>
                                            {m.avatar ? <img src={m.avatar} alt={m.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👷'}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>{m.nombre}</strong>
                                            <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '700' }}>{m.puesto || 'Mantenimiento General'}</span>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>📞 {m.telefono || 'Sin teléfono'}</span>
                                        <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '8px', fontWeight: '700', fontSize: '11px' }}>
                                            {m.estado || 'Disponible'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                                        <button
                                            onClick={() => handleEliminarTecnico(m.id, m.nombre)}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <HiOutlineTrash size={14} /> Dar de baja
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL NUEVO TÉCNICO A CARGO */}
            {isNewTechModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.82)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                }} onClick={() => setIsNewTechModalOpen(false)}>
                    <div style={{
                        background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '20px',
                        padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 14px 0', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                            👷 Registrar Técnico en tu Cuadrilla
                        </h3>

                        <form onSubmit={handleCrearTecnico} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    Nombre Completo *
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Ej. Juan Pérez"
                                    value={nuevoNombre}
                                    onChange={e => setNuevoNombre(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    Teléfono de Contacto
                                </label>
                                <input 
                                    type="tel" 
                                    placeholder="Ej. 999 555 4433"
                                    value={nuevoTelefono}
                                    onChange={e => setNuevoTelefono(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    Especialidad Principal
                                </label>
                                <select
                                    value={nuevaEspecialidad}
                                    onChange={e => setNuevaEspecialidad(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                                >
                                    {ESPECIALIDADES.map((esp, i) => (
                                        <option key={i} value={esp}>{esp}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <p style={{ margin: 0, fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                                    🔐 Acceso a la App Móvil / Web (Rol: Técnico de Cuadrilla)
                                </p>
                                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                                    Ingresa correo y contraseña para que tu técnico pueda iniciar sesión, ver sus trabajos despachados, formular cotizaciones con el cotizador oficial y generar sus reportes.
                                </p>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                                        Correo Electrónico (Login)
                                    </label>
                                    <input 
                                        type="email"
                                        placeholder="tecnico@ejemplo.com"
                                        value={nuevoCorreo}
                                        onChange={e => setNuevoCorreo(e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                                        Contraseña de Acceso (Mínimo 6 caracteres)
                                    </label>
                                    <input 
                                        type="password"
                                        placeholder="••••••••"
                                        value={nuevoPassword}
                                        onChange={e => setNuevoPassword(e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    Foto / Identificación (Opcional)
                                </label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={e => setFotoFile(e.target.files?.[0] || null)}
                                    style={{ fontSize: '12px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsNewTechModalOpen(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>Cancelar</button>
                                <button type="submit" disabled={isSubmittingTech} style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                                    {isSubmittingTech ? 'Guardando...' : 'Guardar Técnico'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DESPACHAR A CUADRILLA */}
            {isAssignModalOpen && selectedTrabajo && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.82)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                }} onClick={() => setIsAssignModalOpen(false)}>
                    <div style={{
                        background: '#ffffff', width: '100%', maxWidth: '460px', borderRadius: '20px',
                        padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                            Despachar Trabajo a mi Cuadrilla
                        </h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
                            {selectedTrabajo.titulo}
                        </p>

                        <form onSubmit={handleConfirmAssignCuadrilla} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    Seleccionar Miembro de tu Cuadrilla *
                                </label>
                                {cuadrilla.length === 0 ? (
                                    <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '10px', color: '#991b1b', fontSize: '12px' }}>
                                        No tienes técnicos registrados. Regístralos en la pestaña "Mi Cuadrilla".
                                    </div>
                                ) : (
                                    <select
                                        value={selectedTechId}
                                        onChange={e => setSelectedTechId(Number(e.target.value))}
                                        required
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                                    >
                                        {cuadrilla.map(m => (
                                            <option key={m.id} value={m.id}>
                                                👷 {m.nombre} ({m.puesto || 'General'})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                    Tipo de Misión / Despacho *
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div 
                                        onClick={() => setAssignTipo('Visita')}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: assignTipo === 'Visita' ? '2px solid #ea580c' : '1px solid #cbd5e1',
                                            background: assignTipo === 'Visita' ? '#fff7ed' : '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '3px'
                                        }}
                                    >
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: assignTipo === 'Visita' ? '#ea580c' : '#1e293b' }}>
                                            📝 Visita para Cotizar
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                                            Formular presupuesto en sitio con el cotizador oficial
                                        </span>
                                    </div>

                                    <div 
                                        onClick={() => setAssignTipo('Trabajo')}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: assignTipo === 'Trabajo' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                            background: assignTipo === 'Trabajo' ? '#eff6ff' : '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '3px'
                                        }}
                                    >
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: assignTipo === 'Trabajo' ? '#2563eb' : '#1e293b' }}>
                                            🔨 Trabajo Directo
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                                            Ejecución directa del trabajo autorizado
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                        Fecha Programada
                                    </label>
                                    <input 
                                        type="date"
                                        value={assignFecha}
                                        onChange={e => setAssignFecha(e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                        Hora
                                    </label>
                                    <input 
                                        type="time"
                                        value={assignHora}
                                        onChange={e => setAssignHora(e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsAssignModalOpen(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>Cancelar</button>
                                <button type="submit" disabled={isSubmittingAssign || cuadrilla.length === 0} style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                                    {isSubmittingAssign ? 'Asignando...' : 'Confirmar Despacho'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ENVIAR COTIZACIÓN AL ADMIN GENERAL */}
            {isQuoteModalOpen && quoteTrabajo && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.82)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
                }} onClick={() => setIsQuoteModalOpen(false)}>
                    <div style={{
                        background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '20px',
                        padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                            💼 Enviar Cotización al Administrador General
                        </h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
                            Propuesta para el trabajo #{quoteTrabajo.id}: {quoteTrabajo.titulo}
                        </p>

                        <form onSubmit={handleSubmitQuote} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    Monto Total ($ MXN) *
                                </label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    placeholder="Ej. 3500.00"
                                    value={quoteMonto}
                                    onChange={e => setQuoteMonto(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '800' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    Concepto / Resumen de Trabajo
                                </label>
                                <input 
                                    type="text"
                                    value={quoteConcepto}
                                    onChange={e => setQuoteConcepto(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    Desglose / Notas para el Administrador
                                </label>
                                <textarea 
                                    rows={3}
                                    placeholder="Detalla mano de obra, refacciones o materiales incluidos..."
                                    value={quoteNotas}
                                    onChange={e => setQuoteNotas(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                                    Archivo de Cotización o Presupuesto en PDF (Opcional)
                                </label>
                                <input 
                                    type="file"
                                    accept="application/pdf,image/*"
                                    onChange={e => setQuoteArchivo(e.target.files?.[0] || null)}
                                    style={{ fontSize: '12px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsQuoteModalOpen(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>Cancelar</button>
                                <button type="submit" disabled={isSubmittingQuote} style={{ padding: '8px 22px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                                    {isSubmittingQuote ? 'Enviando...' : 'Enviar Cotización'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PARA RENOVAR MEMBRESÍA POR TRANSFERENCIA */}
            <PagoTransferenciaModal
                isOpen={isRenovarModalOpen}
                onClose={() => setIsRenovarModalOpen(false)}
                initialPago={pagoActual}
                initialEsProveedor={pruebaInfo?.prueba_fin_at ? new Date(pruebaInfo.prueba_fin_at).getTime() > Date.now() : true}
                onSuccess={() => {
                    cargarDatos();
                }}
            />
        </div>
    );
};

export default DashboardTecnicoProveedor;
