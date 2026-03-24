import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./AdminDetalleTrabajo.module.css";
import { useAuth } from "../../context/AuthContext";
import { getTrabajo, updateEstadoTrabajo } from "../../services/trabajosService";
import { createActividad, getActividadesByTrabajo } from "../../services/actividadesService";
import type { Actividad } from "../../services/actividadesService";

interface Trabajo {
    id: number;
    titulo: string;
    descripcion?: string;
    prioridad: "Alta" | "Media" | "Baja";
    estado: "Pendiente" | "En proceso" | "Completado" | "Finalizado";
    fecha_programada?: string;
    created_at: string;
    trabajador?: {
        nombre: string;
    };
    trabajador_id?: number | null;
    negocio: {
        nombre: string;
        ubicacion: string;
        encargado?: string;
        plaza?: string;
        ciudad?: string;
        calle?: string;
        numero?: string;
        colonia?: string;
        cp?: string;
    };
    reporte?: any; // Futuro uso
}



type TabType = "Datos" | "Trabajo" | "Registro" | "Historial" | "Cotización";

const AdminDetalleTrabajo: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('Datos');

    // Estados para las nuevas actividades reales
    const [actividades, setActividades] = useState<Actividad[]>([]);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [activityType, setActivityType] = useState('Plomería');
    const [activityDesc, setActivityDesc] = useState('');

    useEffect(() => {
        const fetchAll = async () => {
            if (!id) return;
            
            // 1. Obtener Trabajo
            try {
                const data = await getTrabajo(Number(id));
                setTrabajo(data);
            } catch (error) {
                console.error("Error al cargar detalle del trabajo:", error);
                setTrabajo(null);
                return; // Si el trabajo falla, detenemos aquí
            }

            // 2. Obtener Actividades (Separado para no romper lo de arriba)
            try {
                const acts = await getActividadesByTrabajo(Number(id));
                setActividades(acts);
            } catch (error) {
                console.error("Error al cargar las actividades (Historial):", error);
                setActividades([]);
            }
        };

        fetchAll();
    }, [id]);





    if (!trabajo) {
        return <div style={{ padding: "40px" }}>Trabajo no encontrado</div>;
    }

    return (
        <div className={styles.dashboardLayout} style={{ gap: '0', padding: '20px', height: '100%' }}>

            <div className={styles.bgShape1}></div>
            <div className={styles.bgShape2}></div>

            <div className={styles.mainCard}>

                {/* Shapes removed for cleaner look */}

                <div className={styles.contentWrapper}>
                    <button onClick={() => navigate(-1)} className={styles.backButton}>
                        ← Volver
                    </button>

                    <div className={styles.headerContainer}>
                        <div>
                            <h1 className={styles.pageTitle}>
                                {activeTab === 'Trabajo' ? 'tareas por realizar' :
                                    (activeTab === 'Registro' ? 'Registro de Actividad' :
                                        (activeTab === 'Cotización' ? 'Generar Cotización' : 'Datos de la Empresa'))}
                            </h1>
                        </div>
                    </div>

                    <div className={styles.tabsContainer}>
                        {['Datos', 'Registro', 'Historial']
                            .filter(tab => {
                                if (tab === 'Registro') {
                                    if (user?.role === 'admin') return true;
                                    if (user?.role === 'tecnico') return trabajo.estado !== 'Finalizado' && trabajo.estado !== 'Completado';
                                    return false;
                                }
                                return true;
                            })
                            .map((tab) => (
                                <button
                                    key={tab}
                                    className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : styles.inactiveTab}`}
                                    onClick={() => setActiveTab(tab as any)}
                                >
                                    {tab}
                                </button>
                            ))}
                    </div>
                </div>

                <div className={styles.scrollableContent}>

                    {activeTab === 'Datos' && (
                        <div>
                            <div className={styles.infoSectionCard}>
                                <h3 className={styles.sectionTitle}>Informacion general</h3>
                                <div className={styles.infoGrid2}>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Nombre de la sucursal:</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <span className={styles.infoValue}>{trabajo.negocio?.nombre || "No registrado"}</span>
                                        </div>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Prioridad:</span>
                                        <span className={styles.infoValue} style={{ fontWeight: 'bold' }}>{trabajo.prioridad || "Normal"}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Encargado de la empresa:</span>
                                        <span className={styles.infoValue}>{trabajo.negocio?.encargado || "No registrado"}</span>
                                    </div>
                                </div>

                                {(trabajo.fecha_programada) && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
                                        <div style={{ background: '#eef8f1', padding: '6px 14px', borderRadius: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid #c8e6c9' }}>
                                            <span style={{ color: '#137333', fontWeight: 'bold', fontSize: '13px' }}>
                                                📅 {trabajo.fecha_programada}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {trabajo.descripcion && (
                                    <div style={{ marginTop: '20px', padding: '20px', background: '#f5f7fa', borderRadius: '15px', borderLeft: '5px solid #333' }}>
                                        <span className={styles.infoLabel} style={{ display: 'block', marginBottom: '10px', color: '#333' }}>Descripción del problema (Cliente):</span>
                                        <span className={styles.infoValue} style={{ fontSize: '16px', fontStyle: 'italic', color: '#555', lineHeight: '1.5' }}>
                                            "{trabajo.descripcion}"
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.infoSectionCard}>
                                <h3 className={styles.sectionTitle}>Ubicación</h3>
                                <div className={styles.infoGrid2} style={{ gridTemplateColumns: '1fr' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel} style={{ width: '150px' }}>Nombre de la plaza:</span>
                                        <span className={styles.infoValue}>{trabajo.negocio?.plaza || "No registrado"}</span>
                                    </div>
                                </div>

                                <div className={styles.infoGrid2}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Estado:</span>
                                        <span className={styles.infoValue}>Yucatán</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Ciudad:</span>
                                        <span className={styles.infoValue}>{trabajo.negocio?.ciudad || "Merida"}</span>
                                    </div>
                                </div>

                                <div className={styles.infoGrid3}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Calle:</span>
                                        <span className={styles.infoValue}>{trabajo.negocio?.calle || "37"}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Numero:</span>
                                        <span className={styles.infoValue}>{trabajo.negocio?.numero || "Entre 4 y 6"}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Colonia:</span>
                                        <span className={styles.infoValue}>{trabajo.negocio?.colonia || "Altabrisa"}</span>
                                    </div>
                                </div>

                                <div className={styles.infoGrid2} style={{ gridTemplateColumns: '1fr' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Codigo postal:</span>
                                        <span className={styles.infoValue}>{trabajo.negocio?.cp || "97158"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ACCIONES DE ASIGNACIÓN - Solo Admin */}
                            {user?.role === 'admin' && (
                                <div className={styles.actionsContainer}>
                                    {trabajo.estado !== 'Finalizado' && (
                                        <button className={`${styles.actionButton} ${styles.assignButton}`} disabled>
                                            {!trabajo.trabajador ? "Asignar Técnico (Próximamente)" : `Reasignar (Actual: ${trabajo.trabajador.nombre})`}
                                        </button>
                                    )}
                                    <button className={`${styles.actionButton} ${styles.waitButton}`}>
                                        Poner en Espera
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {
                        activeTab === 'Registro' && (
                            <div className={styles.infoSectionCard} style={{ padding: '40px' }}>
                                {/* Botón del Flujo Nuevo / Clásico del Técnico (Modal) */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 className={styles.sectionTitle}>Bitácora de la Visita</h3>
                                    {(trabajo.estado === 'Pendiente' || trabajo.estado === 'En proceso') && (
                                        <button 
                                            onClick={() => setIsActivityModalOpen(true)}
                                            style={{ background: '#f5b041', border: 'none', padding: '10px 20px', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            ➕ Agregar Actividad
                                        </button>
                                    )}
                                </div>

                                {actividades.map(act => (
                                    <div key={act.id} style={{ background: '#f9f9f9', padding: '20px', borderRadius: '15px', marginBottom: '15px', borderLeft: '5px solid #f5b041', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <strong style={{ fontSize: '16px', color: '#333' }}>{act.tipo}</strong>
                                            <span style={{ fontSize: '12px', color: '#999', background: '#eee', padding: '4px 8px', borderRadius: '10px' }}>
                                                {new Date(act.created_at || '').toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, color: '#555', fontSize: '14px', lineHeight: '1.5' }}>{act.descripcion}</p>
                                    </div>
                                ))}

                                {actividades.length === 0 && (
                                    <div style={{ textAlign: 'center', color: '#999', padding: '20px', background: '#f5f5f5', borderRadius: '15px' }}>
                                        No hay actividades registradas en esta visita aún.
                                    </div>
                                )}

                                {/* BOTÓN DE FINALIZAR VISITA PARA EL TÉCNICO */}
                                {(trabajo.estado === 'Pendiente' || trabajo.estado === 'En proceso') && actividades.length > 0 && user?.role === 'tecnico' && (
                                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                        <button 
                                            onClick={async () => {
                                                if(window.confirm("¿Seguro que quieres Confirmar y Enviar este reporte al Administrador? Ya no podrás agregar más actividades a esta visita.")) {
                                                    try {
                                                        await updateEstadoTrabajo(trabajo.id, { estado: "Finalizado" });
                                                        setTrabajo({...trabajo, estado: "Finalizado"});
                                                        alert("Reporte enviado exitosamente.");
                                                    } catch(e) {
                                                        console.error(e);
                                                        alert("Error al enviar el reporte.");
                                                    }
                                                }
                                            }}
                                            style={{ padding: '15px 30px', fontSize: '16px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(76,175,80,0.3)' }}
                                        >
                                            ✅ Confirmar y Enviar Reporte al Administrador
                                        </button>
                                        <p style={{ color: '#888', fontSize: '12px', marginTop: '10px' }}>¡Cuidado! Una vez enviado, la bitácora quedará bloqueada para el administrador.</p>
                                    </div>
                                )}

                                {(trabajo.estado === 'Completado' || trabajo.estado === 'Finalizado') && (
                                    <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                                        🔒 Las actividades de esta visita han sido bloqueadas y enviadas al Administrador.
                                    </div>
                                )}

                                {/* Flujos Secundarios de Remate */}
                                <hr style={{ border: 'none', borderTop: '1px solid #eaeaea', margin: '40px 0' }}/>
                                <p style={{ textAlign: 'center', color: '#777', marginBottom: '20px' }}>Formatos Oficiales</p>
                                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button 
                                        className={styles.actionButton} 
                                        onClick={() => navigate(`/${user?.role === 'cliente' ? 'cliente' : (user?.role === 'tecnico' ? 'tecnico' : 'menu')}/verificacion-tarea/${id}`)} 
                                        style={{ padding: '15px 30px', fontSize: '16px', background: '#3b82f6', color: 'white', borderRadius: '10px' }}
                                    >
                                        📋 CheckList de Equipo
                                    </button>
                                    <button 
                                        className={styles.actionButton} 
                                        onClick={() => navigate(`/${user?.role === 'cliente' ? 'cliente' : (user?.role === 'tecnico' ? 'tecnico' : 'menu')}/reporte-tarea/${id}`)} 
                                        style={{ padding: '15px 30px', fontSize: '16px', background: '#10b981', color: 'white', borderRadius: '10px' }}
                                    >
                                        📝 Generar Cotización Formal
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'Historial' && (
                            <div>
                                <h3 className={styles.sectionTitle}>Historial de Trabajos Realizados</h3>
                                <div className={styles.taskList}>
                                    {actividades.length > 0 ? (
                                        actividades.map(tarea => (
                                            <div
                                                key={tarea.id}
                                                className={styles.completedTaskCard}
                                                style={{ cursor: 'default' }}
                                            >
                                                <div>
                                                    <h3 className={styles.completedTaskTitle}>
                                                        {tarea.tipo}
                                                    </h3>
                                                    <p className={styles.completedTaskDesc}>
                                                        {tarea.descripcion}
                                                    </p>
                                                </div>
                                                <span className={styles.completedBadge} style={{ background: '#e0f2f1', color: '#00897b' }}>
                                                    Completado
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No hay actividades guardadas en este Trabajo.</p>
                                    )}
                                </div>
                            </div>
                        )}
                </div>
            </div>
            {/* MODAL REGISTRO DE ACTIVIDAD (RESTAURADO DEL VIEJO DISEÑO Y ADAPTADO) */}
            {isActivityModalOpen && (
                <div className={styles.modalOverlay} onClick={(e) => {
                    if (e.target === e.currentTarget) setIsActivityModalOpen(false);
                }} style={{ zIndex: 9999 }}>
                    <div className={styles.modalContent} style={{ maxWidth: '500px', width: '90%', padding: '30px', borderRadius: '20px', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Registro de Actividad</h2>
                            <span style={{ color: '#aaa', fontSize: '14px', fontWeight: 'bold' }}>Visita</span>
                        </div>
                        
                        <div style={{ padding: '20px', border: '1px solid #eaeaea', borderRadius: '15px', marginBottom: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Selecciona tarea</label>
                            <select 
                                value={activityType}
                                onChange={e => setActivityType(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', marginBottom: '20px', fontSize: '15px' }}
                            >
                                <option value="Plomería">Plomería</option>
                                <option value="Electricidad">Electricidad</option>
                                <option value="Limpieza">Limpieza</option>
                                <option value="Mantenimiento General">Mantenimiento General</option>
                                <option value="Otro">Otro</option>
                            </select>

                            <textarea 
                                placeholder="Especifica tarea..."
                                value={activityDesc}
                                onChange={e => setActivityDesc(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '120px', resize: 'vertical', fontSize: '15px', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <button 
                                onClick={() => setIsActivityModalOpen(false)}
                                style={{ padding: '12px 25px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={async () => {
                                    if(!activityDesc) { alert('Ingresa la descripción'); return; }
                                    try {
                                        const nA = await createActividad({ trabajo_id: Number(id), tipo: activityType, descripcion: activityDesc });
                                        setActividades([nA, ...actividades]);
                                        setIsActivityModalOpen(false);
                                        setActivityDesc('');
                                    } catch(e: any) { 
                                        console.error(e); 
                                        const errorMsg = e.response?.data?.message || e.message || "Error desconocido";
                                        alert("La API falló al guardar: " + errorMsg); 
                                    }
                                }}
                                style={{ padding: '12px 25px', background: '#ffb300', color: '#fff', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 10px rgba(255,179,0,0.3)' }}
                            >
                                Guardar y enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div >
    );
};

export default AdminDetalleTrabajo;
