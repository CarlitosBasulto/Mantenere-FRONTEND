import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMantenimientoSolicitud, asignarMantenimientoVisita, asignarMantenimientoReparacion } from "../../services/mantenimientoService";
import { getTrabajadores } from "../../services/trabajadoresService";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";

import styles from "./MantenimientoDetalle.module.css";
import { FaArrowLeft, FaTools, FaWrench, FaInfoCircle, FaClipboardCheck } from "react-icons/fa";

const MantenimientoDetalle = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = useModal();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tecnicos, setTecnicos] = useState<any[]>([]);

    // Form inputs para asignar técnico
    const [selectedTecnico, setSelectedTecnico] = useState("");
    const [fechaProgramada, setFechaProgramada] = useState("");
    const [horaProgramada, setHoraProgramada] = useState("");

    useEffect(() => {
        const fetchDatos = async () => {
            try {
                if (id) {
                    const sol = await getMantenimientoSolicitud(Number(id));
                    setData(sol);
                }
                const trabs = await getTrabajadores();
                // Filtramos aquellos que están activos (siguiendo la estructura del API)
                setTecnicos(trabs.filter((t: any) => t.estado?.toLowerCase() === 'activo' || t.estado === 'Activo'));
            } catch (err) {
                console.error("Error al obtener detalle o técnicos:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDatos();
    }, [id]);

    const handleAsignarVisita = async () => {
        if (!selectedTecnico || !fechaProgramada || !horaProgramada) {
            showAlert("Error", "Debes seleccionar un técnico, fecha y hora.", "error");
            return;
        }

        try {
            await asignarMantenimientoVisita(Number(id), {
                tecnico_id: Number(selectedTecnico),
                fecha_programada: fechaProgramada,
                hora_programada: horaProgramada,
                admin_id: user?.id || 1,
            });

            showAlert("Visita Asignada", "El técnico ha sido notificado para realizar la visita.", "success");
            const sol = await getMantenimientoSolicitud(Number(id));
            setData(sol);
        } catch (err: any) {
            console.error(err);
            showAlert("Error", err.response?.data?.message || "Hubo un problema al asignar la visita", "error");
        }
    };

    const handleAsignarReparacion = async () => {
        if (!selectedTecnico || !fechaProgramada || !horaProgramada) {
            showAlert("Error", "Debes seleccionar un técnico, fecha y hora.", "error");
            return;
        }

        try {
            await asignarMantenimientoReparacion(Number(id), {
                tecnico_id: Number(selectedTecnico),
                fecha_programada: fechaProgramada,
                hora_programada: horaProgramada,
                admin_id: user?.id || 1,
            });

            showAlert("Reparación Asignada", "El técnico ha sido notificado para realizar la reparación.", "success");
            const sol = await getMantenimientoSolicitud(Number(id));
            setData(sol);
        } catch (err: any) {
            console.error(err);
            showAlert("Error", err.response?.data?.message || "Hubo un problema al asignar la reparación", "error");
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando información...</div>;
    if (!data) return <div style={{ padding: '40px', textAlign: 'center' }}>No se encontró la solicitud.</div>;

    const { equipo, negocio, cliente } = data;

    const getStatusStyle = (status: string) => {
        switch(status) {
            case 'Pendiente': return styles.statusPendiente;
            case 'Visita Asignada': return styles.statusVisitaAsignada;
            case 'Cotización Pendiente': return styles.statusPendiente;
            case 'Cotización Aceptada': return styles.statusCotizacionAceptada;
            case 'Reparación Asignada': return styles.statusReparacionAsignada;
            case 'Completado': return styles.statusCotizacionAceptada;
            default: return styles.statusPendiente;
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageBackgroundShape1}></div>
            <div className={styles.pageBackgroundShape2}></div>

            <div className={styles.contentZIndex}>
                {/* Header Section */}
                <div className={`${styles.headerRow} ${styles.animateSlideUp}`}>
                    <button className={styles.backBtn} onClick={() => navigate(-1)}>
                        <FaArrowLeft /> Regresar
                    </button>
                    <div className={styles.titleArea}>
                        <h1 className={styles.pageTitle}>Detalle de Mantenimiento</h1>
                        <span className={`${styles.statusBadge} ${getStatusStyle(data.estado)}`}>
                            {data.estado}
                        </span>
                    </div>
                </div>

                <div className={`${styles.bentoContainer} ${styles.animateSlideUp} ${styles.delay1}`}>
                    
                    {/* Left Column (Main Content) */}
                    <div className={`${styles.cardGlass} ${styles.colSpan8}`}>
                        <div className={styles.sectionHeader}>
                            <div className={`${styles.sectionIcon} ${styles.iconBlue}`}><FaInfoCircle /></div>
                            <h2 className={styles.sectionTitle}>Información del Problema</h2>
                        </div>

                        {equipo && (
                            <div className={styles.equipmentDisplay}>
                                {equipo.foto ? (
                                    <img src={equipo.foto} alt={equipo.nombre} className={styles.equipmentImage}/>
                                ) : (
                                    <div className={styles.equipmentImage} style={{background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                        <FaTools size={40} color="#cbd5e1" />
                                    </div>
                                )}
                                <div className={styles.equipmentDetails}>
                                    <h3 className={styles.equipmentName}>{equipo.nombre || "Equipo Sin Nombre"}</h3>
                                    <div style={{ marginTop: '10px' }}>
                                        {equipo.marca && <span className={styles.detailPill}>Marca: {equipo.marca}</span>}
                                        {equipo.modelo && <span className={styles.detailPill}>Mod: {equipo.modelo}</span>}
                                        {equipo.serie && <span className={styles.detailPill}>S/N: {equipo.serie}</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '25px' }}>
                            <div className={styles.infoLabel} style={{ marginBottom: '10px' }}>Descripción reportada por el cliente</div>
                            <div className={styles.problemBox}>
                                "{data.descripcion_problema}"
                            </div>
                        </div>

                        <div className={styles.infoGrid} style={{ marginTop: '25px' }}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Negocio / Sucursal</span>
                                <span className={styles.infoValue}>{negocio?.nombre || 'N/A'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Cliente</span>
                                <span className={styles.infoValue}>{cliente?.name || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Actions based on status) */}
                    <div className={`${styles.cardGlass} ${styles.colSpan4} ${styles.animateSlideUp} ${styles.delay2}`}>
                        
                        {data.estado === 'Pendiente' && (
                            <>
                                <div className={styles.sectionHeader}>
                                    <div className={`${styles.sectionIcon} ${styles.iconOrange}`}><FaWrench /></div>
                                    <h2 className={styles.sectionTitle}>Asignar Visita</h2>
                                </div>
                                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '25px', lineHeight: '1.5' }}>
                                    Envía a un técnico para que supervise el equipo y levante una cotización.
                                </p>
                                
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Seleccione al Técnico</label>
                                    <select 
                                        className={styles.formSelect}
                                        value={selectedTecnico} 
                                        onChange={(e) => setSelectedTecnico(e.target.value)}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {tecnicos.map(t => (
                                            <option key={t.id} value={t.user_id}>{t.nombre || t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.rowGrid}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Fecha</label>
                                        <input 
                                            type="date" 
                                            className={styles.formInput}
                                            value={fechaProgramada} 
                                            onChange={(e) => setFechaProgramada(e.target.value)} 
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Hora</label>
                                        <input 
                                            type="time" 
                                            className={styles.formInput}
                                            value={horaProgramada} 
                                            onChange={(e) => setHoraProgramada(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <button className={styles.primaryBtn} onClick={handleAsignarVisita}>
                                    Agendar Visita
                                </button>
                            </>
                        )}

                        {data.estado === 'Cotización Aceptada' && (
                            <>
                                <div className={styles.sectionHeader}>
                                    <div className={`${styles.sectionIcon} ${styles.iconGreen}`}><FaClipboardCheck /></div>
                                    <h2 className={styles.sectionTitle}>Mantenimiento Aprobado</h2>
                                </div>
                                <p style={{ fontSize: '14px', color: '#15803d', marginBottom: '25px', lineHeight: '1.5', background:'#dcfce7', padding:'15px', borderRadius:'12px', border:'1px solid #bbf7d0' }}>
                                    El cliente ha pagado/aprobado la cotización. Asigna a un técnico para el Trabajo de Reparación Final.
                                </p>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Seleccione al Reparador</label>
                                    <select 
                                        className={styles.formSelect}
                                        value={selectedTecnico} 
                                        onChange={(e) => setSelectedTecnico(e.target.value)}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {tecnicos.map(t => (
                                            <option key={t.id} value={t.user_id}>{t.nombre || t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.rowGrid}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Fecha de Reparación</label>
                                        <input 
                                            type="date" 
                                            className={styles.formInput}
                                            value={fechaProgramada} 
                                            onChange={(e) => setFechaProgramada(e.target.value)} 
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Hora (Aprox)</label>
                                        <input 
                                            type="time" 
                                            className={styles.formInput}
                                            value={horaProgramada} 
                                            onChange={(e) => setHoraProgramada(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <button className={`${styles.primaryBtn} ${styles.successBtn}`} onClick={handleAsignarReparacion}>
                                    Agendar Reparación Final
                                </button>
                            </>
                        )}

                        {['Visita Asignada', 'Cotización Pendiente'].includes(data.estado) && (
                            <>
                                <div className={styles.sectionHeader}>
                                    <div className={`${styles.sectionIcon} ${styles.iconPurple}`}><FaWrench /></div>
                                    <h2 className={styles.sectionTitle}>En Progreso</h2>
                                </div>
                                <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 10px' }}>
                                    <div style={{ fontSize:'40px', marginBottom:'15px', opacity:0.5 }}>⏳</div>
                                    El mantenimiento está en progreso. Esperando a que el técnico actualice el diagnóstico o enviando la cotización.
                                </div>
                            </>
                        )}

                        {['Reparación Asignada', 'Completado'].includes(data.estado) && (
                            <>
                                <div className={styles.sectionHeader}>
                                    <div className={`${styles.sectionIcon} ${styles.iconGreen}`}><FaTools /></div>
                                    <h2 className={styles.sectionTitle}>Reparación en Vía</h2>
                                </div>
                                <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 10px' }}>
                                    <div style={{ fontSize:'40px', marginBottom:'15px', opacity:0.5 }}>🔧</div>
                                    El trabajo ya fue agendado al técnico. Puedes revisar el historial o reportes en el detalle del Trabajo correspondiente.
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MantenimientoDetalle;
