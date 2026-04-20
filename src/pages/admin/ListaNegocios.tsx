import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ListaNegocios.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { getNegocios } from "../../services/negociosService";
import { getTrabajos } from "../../services/trabajosService";

import { FaImage } from "react-icons/fa6";

interface Negocio {
    id: number;
    nombre: string;
    ubicacion: string;
    dueno: string;
    fecha: string;
    estado: string; 
    status: string; // Internal approval status
    estado_geografico: string; // City or State for display
    imagenPerfil?: string;
    user_id?: number;
}

const ListaNegocios: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { } = useModal();
    const [negocios, setNegocios] = useState<Negocio[]>([]);
    const [globalJobs, setGlobalJobs] = useState<any[]>([]);
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getNegocios();
                const localData = JSON.parse(localStorage.getItem('local_negocios_info') || '{}');
                const mapped = data.map((n: any) => {
                    const localInfo = localData[n.id] || {};
                    return {
                        ...n,
                        id: n.id,
                        nombre: n.nombre,
                        ubicacion: n.tipo === "W/M" ? `${n.calleAv || ''} Mza ${n.manzana || ''}` : (n.nombrePlaza || n.colonia || "Mérida"),
                        dueno: n.encargado || "Cliente",
                        fecha: new Date(n.created_at).toLocaleDateString('es-MX'),
                        status: n.estado_aprobacion || "En Espera", // Mantenemos el estatus interno
                        estado_geografico: localInfo.ciudad || n.ciudad || n.estado || "Mérida", // Prioridad a lo local
                        user_id: n.user_id,
                        imagenPerfil: n.imagenPerfil
                    };
                });
                setNegocios(mapped);
                
                if (user) {
                    const jobsApi = await getTrabajos();
                    setGlobalJobs(jobsApi);
                }
            } catch (error) {
                console.error("Error al cargar negocios o trabajos:", error);
                const stored = localStorage.getItem('negocios_list');
                if (stored) setNegocios(JSON.parse(stored));
            }
        };
        fetchData();
    }, [user]);

    const filteredNegocios = negocios.filter((negocio) => {
        const matchesSearch = negocio.nombre.toLowerCase().includes(searchText.toLowerCase());

        // FILTRO POR ROL: El cliente solo ve lo suyo, el admin ve todo
        if (user?.role === 'cliente') {
            return matchesSearch && (negocio.dueno === user.name || negocio.user_id === user.id);
        }

        // FILTRO POR ROL: El técnico solo ve los negocios donde tiene trabajos asignados
        if (user?.role === 'tecnico') {
            const hasAssignedJobs = globalJobs.some((j: any) => {
                if (j.negocio_id !== negocio.id) return false;
                
                const isMine = j.trabajador_id === user.id || j.trabajador?.user_id === user.id;
                if (!isMine) return false;

                const status = (j.estado || "").toLowerCase();
                // Ocultar si ya fue visitado (En Espera) o si ya finalizó
                const isProcessedVisita = j.tipo === "Visita" && (j.visitado || status === 'en espera');
                const isFinalizado = status === 'finalizado';

                return !isProcessedVisita && !isFinalizado;
            });
            return matchesSearch && hasAssignedJobs;
        }

        return matchesSearch;
    });

    const handleCardClick = (id: number) => {
        const basePath = user?.role === 'cliente' ? '/cliente' : (user?.role === 'tecnico' ? '/tecnico' : '/menu');
        navigate(`${basePath}/trabajo/${id}`);
    };

    const handleEditClick = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (user?.role === 'tecnico') return; // El técnico no debe poder editar ni navegar aquí
        const basePath = user?.role === 'cliente' ? '/cliente' : '/menu';
        navigate(`${basePath}/perfil-empresa?id=${id}`);
    };

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.leftColumn}>
                <div className={styles.searchSection}>
                    <div className={menuStyles.searchCard}>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className={menuStyles.searchInput}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                    <div className={styles.actionButtons}>
                        {user?.role === 'cliente' && (
                            <button
                                className={styles.registrarBtn}
                                onClick={() => navigate("/cliente/perfil-empresa")}
                            >
                                Registrar
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.jobsSection}>
                    {filteredNegocios.map((negocio) => {
                        let hasSOS = false;
                        let hasDiagnosis = false;
                        if (user?.role === 'admin') {
                            hasSOS = globalJobs.some((j: any) => j.negocio_id === negocio.id && j.tipo === 'SOS' && j.estado === 'Solicitud');
                            hasDiagnosis = globalJobs.some((j: any) => j.negocio_id === negocio.id && (j.visitado === 1 || j.visitado === true) && (j.estado === 'Solicitud' || j.estado === 'En Espera'));
                        }

                        return (
                            <div style={{ position: 'relative' }} key={negocio.id}>
                                {hasSOS && (
                                    <div style={{ position: 'absolute', right: '-10px', background: '#f44336', color: 'white', fontWeight: 'bold', padding: '5px 15px', borderRadius: '20px', zIndex: 10, boxShadow: '0 4px 8px rgba(244, 67, 54, 0.4)' }}>
                                        EMERGENCIA SOS
                                    </div>
                                )}
                                {hasDiagnosis && !hasSOS && (
                                    <div style={{ position: 'absolute', right: '-10px', background: '#00a699', color: 'white', fontWeight: 'bold', padding: '5px 15px', borderRadius: '20px', zIndex: 10, boxShadow: '0 4px 8px rgba(0, 166, 153, 0.4)' }}>
                                        DIAGNÓSTICO LISTO
                                    </div>
                                )}
                                <div
                                    className={styles.jobCard}
                                    onClick={() => handleCardClick(negocio.id)}
                                    style={hasSOS ? { border: '2px solid #f44336', backgroundColor: '#fffafa' } : (hasDiagnosis ? { border: '2px solid #00a699', backgroundColor: '#f0fdfc' } : {})}
                                >
                                    <div className={styles.cardContent}>
                                        <div 
                                            className={styles.cardIcon} 
                                            onClick={(e) => handleEditClick(e, negocio.id)}
                                            style={{ cursor: (user?.role === 'cliente' || user?.role === 'admin') ? 'pointer' : 'default' }}
                                            title={(user?.role === 'cliente' || user?.role === 'admin') ? "Editar Perfil" : ""}
                                        >
                                            {negocio.imagenPerfil ? (
                                                <img
                                                    src={negocio.imagenPerfil}
                                                    alt={negocio.nombre}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <FaImage />
                                            )}
                                        </div>
                                        <div className={styles.cardInfo}>
                                            <span className={styles.cardDate}>{negocio.fecha}</span>
                                            <h3>{negocio.nombre}</h3>
                                            <p>Dueño: {negocio.dueno}</p>
                                            <p>Ubicación: {negocio.ubicacion}</p>
                                            <p className={negocio.status === 'Finalizado' ? styles.estadoFinalizado : styles.estadoPendiente}>
                                                Estado: {negocio.estado_geografico}
                                            </p>

                                            {/* ALERTA DE COTIZACIÓN - Solo visible para Admin/Cliente, no para técnico */}
                                            {user?.role !== 'tecnico' && globalJobs.some(j => j.negocio_id === negocio.id && (j.estado || "").toLowerCase().includes("cotizaci")) && (
                                                <div className={styles.quoteBadge} style={{ marginTop: '10px' }}>
                                                    💰 Cotización Recibida
                                                </div>
                                            )}
                                        </div>


                                        <div className={`${styles.cardIndicator} ${negocio.status === 'Finalizado' ? styles.blue : ''}`}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ListaNegocios;
