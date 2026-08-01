import React, { useState, useEffect } from 'react';
import { 
    HiOutlineBuildingOffice2, 
    HiOutlineUserGroup, 
    HiOutlinePhone, 
    HiOutlineCheckCircle, 
    HiOutlineXCircle, 
    HiOutlineClock,
    HiOutlineEye,
    HiOutlineSparkles,
    HiOutlineShieldCheck,
    HiOutlineDocumentMagnifyingGlass
} from 'react-icons/hi2';
import { getSolicitudesProveedor, aprobarSolicitudProveedor, rechazarSolicitudProveedor } from '../../services/proveedorService';
import { useModal } from '../../context/ModalContext';

interface MiembroEscuadron {
    nombre: string;
    telefono: string;
    especialidad: string;
    ine_url?: string;
}

interface Solicitud {
    id: number;
    user_id: number;
    nombre_empresa: string;
    telefono: string;
    identificacion_proveedor_url?: string;
    estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
    motivo_rechazo?: string;
    escuadron_json?: MiembroEscuadron[];
    created_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

const AdminSolicitudesProveedores: React.FC = () => {
    const { showAlert } = useModal();
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [isRechazoModalOpen, setIsRechazoModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const [imageZoomUrl, setImageZoomUrl] = useState<string | null>(null);

    const fetchSolicitudes = async () => {
        setIsLoading(true);
        try {
            const data = await getSolicitudesProveedor();
            setSolicitudes(data || []);
        } catch (err) {
            console.error("Error cargando solicitudes de proveedor:", err);
            showAlert("Error", "No se pudieron cargar las solicitudes de proveedor.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSolicitudes();
    }, []);

    const handleAprobar = async (id: number) => {
        if (!window.confirm("¿Confirmas aprobar esta solicitud? El usuario pasará a ser Técnico Proveedor y se registrará su escuadrón.")) return;

        try {
            setIsProcessing(true);
            await aprobarSolicitudProveedor(id);
            showAlert("Solicitud Aprobada", "La solicitud ha sido aprobada correctamente. El técnico ahora es un Técnico Proveedor.", "success");
            setIsDetailModalOpen(false);
            fetchSolicitudes();
        } catch (err: any) {
            console.error("Error al aprobar solicitud:", err);
            showAlert("Error", err.response?.data?.message || "No se pudo aprobar la solicitud.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmRechazar = async () => {
        if (!selectedSolicitud) return;

        try {
            setIsProcessing(true);
            await rechazarSolicitudProveedor(selectedSolicitud.id, motivoRechazo);
            showAlert("Solicitud Rechazada", "La solicitud fue rechazada y se notificó al usuario.", "info");
            setIsRechazoModalOpen(false);
            setIsDetailModalOpen(false);
            setMotivoRechazo('');
            fetchSolicitudes();
        } catch (err: any) {
            console.error("Error al rechazar solicitud:", err);
            showAlert("Error", err.response?.data?.message || "No se pudo rechazar la solicitud.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <HiOutlineBuildingOffice2 color="#2563eb" /> Solicitudes de Técnicos Proveedores
                    </h1>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                        Revisión exclusiva por Admin Normal de verificaciones de veracidad (INEs y plantilla de escuadrón)
                    </p>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlineShieldCheck size={20} color="#2563eb" />
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1d4ed8' }}>
                        {solicitudes.filter(s => s.estado === 'Pendiente').length} Pendientes de Aprobación
                    </span>
                </div>
            </div>

            {/* LISTA DE SOLICITUDES */}
            {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando solicitudes...</div>
            ) : solicitudes.length === 0 ? (
                <div style={{ background: '#ffffff', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <HiOutlineDocumentMagnifyingGlass size={48} color="#94a3b8" />
                    <h3 style={{ margin: '12px 0 4px 0', color: '#1e293b' }}>No hay solicitudes de proveedor</h3>
                    <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Cuando los técnicos soliciten el upgrade, aparecerán en esta lista.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {solicitudes.map(sol => (
                        <div 
                            key={sol.id} 
                            style={{
                                background: '#ffffff',
                                borderRadius: '20px',
                                border: '1px solid #cbd5e1',
                                padding: '20px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '16px'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                                        Solicitud #{sol.id} • {new Date(sol.created_at).toLocaleDateString()}
                                    </span>

                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        background: sol.estado === 'Pendiente' ? '#fffbeb' : sol.estado === 'Aprobado' ? '#ecfdf5' : '#fef2f2',
                                        color: sol.estado === 'Pendiente' ? '#b45309' : sol.estado === 'Aprobado' ? '#047857' : '#b91c1c',
                                        border: `1px solid ${sol.estado === 'Pendiente' ? '#fde68a' : sol.estado === 'Aprobado' ? '#a7f3d0' : '#fecaca'}`
                                    }}>
                                        {sol.estado === 'Pendiente' ? '⏳ Pendiente' : sol.estado === 'Aprobado' ? '✅ Aprobado' : '❌ Rechazado'}
                                    </span>
                                </div>

                                <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                                    🏢 {sol.nombre_empresa}
                                </h3>
                                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569' }}>
                                    <strong>Solicitante:</strong> {sol.user?.name} ({sol.user?.email})
                                </p>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <HiOutlinePhone size={14} /> {sol.telefono}
                                </p>

                                {sol.escuadron_json && (
                                    <div style={{ marginTop: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155' }}>
                                        <HiOutlineUserGroup color="#2563eb" style={{ marginRight: '6px' }} />
                                        <strong>Escuadrón presentado:</strong> {sol.escuadron_json.length} técnicos
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedSolicitud(sol);
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
                                <HiOutlineEye size={16} /> Ver Detalles e INEs
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL DETALLES SOLICITUD */}
            {isDetailModalOpen && selectedSolicitud && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setIsDetailModalOpen(false)}>
                    <div style={{
                        background: '#ffffff',
                        width: '100%',
                        maxWidth: '820px',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                        overflow: 'hidden',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #cbd5e1'
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
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
                                    Revisión de Veracidad: {selectedSolicitud.nombre_empresa}
                                </h3>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                    Solicitante: {selectedSolicitud.user?.name} • Teléfono: {selectedSolicitud.telefono}
                                </span>
                            </div>

                            <button 
                                onClick={() => setIsDetailModalOpen(false)}
                                style={{ background: '#ef4444', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: '900' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* INE PROVEEDOR */}
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                                    🪪 Identificación (INE) del Proveedor Solicitante
                                </h4>
                                {selectedSolicitud.identificacion_proveedor_url ? (
                                    <img 
                                        src={selectedSolicitud.identificacion_proveedor_url} 
                                        alt="INE Proveedor" 
                                        onClick={() => setImageZoomUrl(selectedSolicitud.identificacion_proveedor_url || null)}
                                        style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', background: '#000', borderRadius: '12px', cursor: 'zoom-in' }} 
                                    />
                                ) : (
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sin imagen de INE adjunta.</span>
                                )}
                            </div>

                            {/* PLANTILLA DEL ESCUADRÓN */}
                            <div>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <HiOutlineUserGroup color="#2563eb" size={18} /> Escuadrón de Técnicos ({selectedSolicitud.escuadron_json?.length || 0})
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                                    {selectedSolicitud.escuadron_json?.map((m, idx) => (
                                        <div key={idx} style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                            <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>👷 {m.nombre}</strong>
                                            <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                                                Especialidad: {m.especialidad}
                                            </span>
                                            {m.telefono && <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>📞 {m.telefono}</span>}

                                            {m.ine_url && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>INE Veracidad:</span>
                                                    <img 
                                                        src={m.ine_url} 
                                                        alt={`INE ${m.nombre}`} 
                                                        onClick={() => setImageZoomUrl(m.ine_url || null)}
                                                        style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', cursor: 'zoom-in' }} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ACCIONES DE APROBACIÓN O RECHAZO */}
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                style={{ padding: '10px 18px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Cerrar
                            </button>

                            {selectedSolicitud.estado === 'Pendiente' && (
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => setIsRechazoModalOpen(true)}
                                        disabled={isProcessing}
                                        style={{ padding: '10px 18px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <HiOutlineXCircle size={16} /> Rechazar Solicitud
                                    </button>

                                    <button
                                        onClick={() => handleAprobar(selectedSolicitud.id)}
                                        disabled={isProcessing}
                                        style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                                    >
                                        <HiOutlineCheckCircle size={18} /> Aprobar como Técnico Proveedor
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PARA MOTIVO DE RECHAZO */}
            {isRechazoModalOpen && selectedSolicitud && (
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
                            Especificar Motivo de Rechazo
                        </h3>
                        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748b' }}>
                            Ingresa la razón por la que rechazas la solicitud de {selectedSolicitud.nombre_empresa}:
                        </p>
                        <textarea
                            rows={3}
                            placeholder="Ej. Las imágenes de identificación no son legibles."
                            value={motivoRechazo}
                            onChange={e => setMotivoRechazo(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '16px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setIsRechazoModalOpen(false)} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={handleConfirmRechazar} disabled={isProcessing} style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Confirmar Rechazo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ZOOM DE IMAGEN */}
            {imageZoomUrl && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setImageZoomUrl(null)}>
                    <img src={imageZoomUrl} alt="Zoom INE" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '12px' }} />
                </div>
            )}
        </div>
    );
};

export default AdminSolicitudesProveedores;
