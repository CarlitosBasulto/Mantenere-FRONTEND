import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getAdminAutonomoDashboard,
    getAdminAutonomoNegocios,
    getAdminAutonomoTrabajadores,
    getAdminAutonomoTrabajos,
    toggleBloqueoAdminAutonomo,
} from '../../services/adminAutonomoService';
import {
    HiOutlineArrowLeft, HiOutlineBriefcase, HiOutlineDocumentText,
    HiOutlineUsers, HiOutlineLockClosed, HiOutlineLockOpen
} from 'react-icons/hi2';
import { useModal } from '../../context/ModalContext';

type Tab = 'negocios' | 'tecnicos' | 'trabajos';

const estadoColor: Record<string, string> = {
    Pendiente: '#f59e0b',
    Asignado: '#3b82f6',
    'En Proceso': '#8b5cf6',
    Finalizado: '#10b981',
    Completado: '#10b981',
    Cancelado: '#ef4444',
};

export default function DetalleAdminAutonomo() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useModal();
    const adminId = Number(id);

    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>('negocios');
    const [tabData, setTabData] = useState<any[]>([]);
    const [tabLoading, setTabLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getAdminAutonomoDashboard(adminId);
                setDashboard(data);
            } catch {
                showAlert('Error', 'No se pudo cargar la información.', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [adminId]);

    useEffect(() => {
        const loadTab = async () => {
            setTabLoading(true);
            try {
                if (activeTab === 'negocios') setTabData(await getAdminAutonomoNegocios(adminId));
                else if (activeTab === 'tecnicos') setTabData(await getAdminAutonomoTrabajadores(adminId));
                else if (activeTab === 'trabajos') setTabData(await getAdminAutonomoTrabajos(adminId));
            } catch {
                setTabData([]);
            } finally {
                setTabLoading(false);
            }
        };
        loadTab();
    }, [activeTab, adminId]);

    const handleBloquear = () => {
        const accion = dashboard?.admin?.active ? 'bloquear' : 'desbloquear';
        showConfirm(
            `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} Admin Autónomo?`,
            `¿Confirmas que deseas ${accion} a ${dashboard?.admin?.name}?`,
            async () => {
                try {
                    await toggleBloqueoAdminAutonomo(adminId);
                    setDashboard((prev: any) => ({
                        ...prev,
                        admin: { ...prev.admin, active: prev.admin.active ? 0 : 1 }
                    }));
                    showAlert('Listo', `Admin Autónomo ${accion}do correctamente.`, 'success');
                } catch {
                    showAlert('Error', 'No se pudo cambiar el estado.', 'error');
                }
            }
        );
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: 18, color: '#64748b' }}>
            Cargando información...
        </div>
    );

    const admin = dashboard?.admin;
    const stats = dashboard?.stats;

    return (
        <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 14 }}
                >
                    <HiOutlineArrowLeft size={20} /> Volver
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
                        {admin?.name}
                        <span style={{
                            marginLeft: 12, fontSize: 11, fontWeight: 700, padding: '2px 10px',
                            borderRadius: 20, background: admin?.active ? '#dcfce7' : '#fee2e2',
                            color: admin?.active ? '#16a34a' : '#dc2626'
                        }}>
                            {admin?.active ? 'ACTIVO' : 'BLOQUEADO'}
                        </span>
                    </h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{admin?.email} — Admin Autónomo</p>
                </div>
                <button
                    onClick={handleBloquear}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                        borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                        background: admin?.active ? '#fee2e2' : '#dcfce7',
                        color: admin?.active ? '#dc2626' : '#16a34a'
                    }}
                >
                    {admin?.active ? <HiOutlineLockClosed size={18} /> : <HiOutlineLockOpen size={18} />}
                    {admin?.active ? 'Bloquear' : 'Desbloquear'}
                </button>
            </div>

            {/* STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Sucursales', value: stats?.negocios, icon: <HiOutlineBriefcase size={22} />, color: '#10b981', bg: '#dcfce7' },
                    { label: 'Técnicos', value: stats?.tecnicos, icon: <HiOutlineUsers size={22} />, color: '#3b82f6', bg: '#dbeafe' },
                    { label: 'Trabajos', value: stats?.trabajos, icon: <HiOutlineDocumentText size={22} />, color: '#f59e0b', bg: '#fef3c7' },
                ].map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                        <div style={{ background: s.bg, color: s.color, borderRadius: 12, padding: 10, display: 'flex' }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{s.value ?? 0}</div>
                            <div style={{ fontSize: 13, color: '#64748b' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* TABS */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                    {(['negocios', 'tecnicos', 'trabajos'] as Tab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            flex: 1, padding: '14px 0', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                            background: activeTab === tab ? '#f8fafc' : '#fff',
                            color: activeTab === tab ? '#f26522' : '#64748b',
                            borderBottom: activeTab === tab ? '2px solid #f26522' : '2px solid transparent',
                            textTransform: 'capitalize', transition: 'all 0.2s'
                        }}>
                            {tab === 'negocios' ? '🏢 Sucursales' : tab === 'tecnicos' ? '👷 Técnicos' : '📋 Trabajos'}
                        </button>
                    ))}
                </div>

                <div style={{ padding: 24 }}>
                    {tabLoading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Cargando...</div>
                    ) : tabData.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontStyle: 'italic' }}>
                            Sin registros aún.
                        </div>
                    ) : activeTab === 'negocios' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                            {tabData.map((n: any) => (
                                <div key={n.id} style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{n.nombre}</div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{n.tipo} · {n.gerente || 'Sin gerente'}</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{n.areas?.length ?? 0} área(s) · {n.areas?.reduce((a: number, ar: any) => a + (ar.equipos?.length ?? 0), 0)} equipo(s)</div>
                                </div>
                            ))}
                        </div>
                    ) : activeTab === 'tecnicos' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                            {tabData.map((t: any) => (
                                <div key={t.id} style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontWeight: 700, fontSize: 18 }}>
                                        {t.nombre?.charAt(0) ?? '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{t.nombre}</div>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>{t.puesto}</div>
                                        <div style={{ fontSize: 11, marginTop: 2, color: t.estado === 'Activo' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{t.estado}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Título</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Sucursal</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Estado</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Técnico</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tabData.map((j: any) => (
                                    <tr key={j.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{j.titulo}</td>
                                        <td style={{ padding: '12px 16px', color: '#475569' }}>{j.negocio?.nombre ?? '—'}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                                background: (estadoColor[j.estado] || '#94a3b8') + '20',
                                                color: estadoColor[j.estado] || '#94a3b8'
                                            }}>{j.estado}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: '#475569' }}>{j.trabajador?.nombre ?? '—'}</td>
                                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12 }}>
                                            {j.created_at ? new Date(j.created_at).toLocaleDateString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
