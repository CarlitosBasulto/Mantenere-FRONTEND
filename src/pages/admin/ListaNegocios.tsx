import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ListaNegocios.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";
import { getNegocios } from "../../services/negociosService";
import { getTrabajos } from "../../services/trabajosService";

import { HiOutlinePencil } from "react-icons/hi2";
import { FaImage } from "react-icons/fa6";

interface Negocio {
    id: number;
    nombre: string;
    ubicacion: string;
    dueno: string;
    fecha: string;
    estado: string; // Added status field
    imagenPerfil?: string; // Client uploaded picture
    user_id?: number;
}

const ListaNegocios: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [negocios, setNegocios] = useState<Negocio[]>([]);
    const [globalJobs, setGlobalJobs] = useState<any[]>([]);
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getNegocios();
                const mapped = data.map((n: any) => ({
                    ...n,
                    id: n.id,
                    nombre: n.nombre,
                    ubicacion: n.tipo === "W/M" ? `${n.calleAv || ''} Mza ${n.manzana || ''}` : (n.nombrePlaza || n.colonia || "Mérida"),
                    dueno: n.encargado || "Cliente",
                    fecha: new Date(n.created_at).toLocaleDateString('es-MX'),
                    estado: n.estado_aprobacion || "En Espera",
                    user_id: n.user_id,
                    imagenPerfil: n.imagenPerfil
                }));
                setNegocios(mapped);
                
                if (user?.role === 'admin' || user?.role === 'tecnico') {
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
            const hasAssignedJobs = globalJobs.some((j: any) => j.negocio_id === negocio.id && j.trabajador?.user_id === user.id);
            return matchesSearch && hasAssignedJobs;
        }

        return matchesSearch;
    });

    const handleCardClick = (id: number) => {
        const basePath = user?.role === 'cliente' ? '/cliente' : (user?.role === 'tecnico' ? '/tecnico' : '/menu');
        navigate(`${basePath}/trabajo/${id}`);
    };

    const handleEditClick = (e: React.MouseEvent, id: number) => {
        e.stopPropagation(); // Evitar navegar al detalle del trabajo
        if (user?.role === 'cliente') {
            navigate(`/cliente/perfil-empresa?id=${id}`);
        }
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
                        <button
                            className={styles.registrarBtn}
                            style={{ background: '#f44336', fontSize: '12px', padding: '5px 10px' }}
                            onClick={() => {
                                if (window.confirm("¿Seguro que quieres borrar TODOS los datos guardados? Se reiniciará la aplicación.")) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                        >
                            Reset Data
                        </button>
                    </div>
                </div>

                <div className={styles.jobsSection}>
                    {filteredNegocios.map((negocio) => {
                        let hasSOS = false;
                        if (user?.role === 'admin') {
                            hasSOS = globalJobs.some((j: any) => j.negocio_id === negocio.id && j.tipo === 'SOS' && j.estado === 'Solicitud');
                        }

                        return (
                            <div style={{ position: 'relative' }} key={negocio.id}>
                                {hasSOS && (
                                    <div style={{ position: 'absolute', right: '-10px', background: '#f44336', color: 'white', fontWeight: 'bold', padding: '5px 15px', borderRadius: '20px', zIndex: 10, boxShadow: '0 4px 8px rgba(244, 67, 54, 0.4)' }}>
                                        EMERGENCIA SOS
                                    </div>
                                )}
                                <div
                                    className={styles.jobCard}
                                    onClick={() => handleCardClick(negocio.id)}
                                    style={hasSOS ? { border: '2px solid #f44336', backgroundColor: '#fffafa' } : {}}
                                >
                                    <div className={styles.cardContent}>
                                        <div className={styles.cardIcon}>
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
                                            <p className={negocio.estado === 'Finalizado' ? styles.estadoFinalizado : styles.estadoPendiente}>
                                                Estado: {negocio.estado}
                                            </p>
                                        </div>

                                        {user?.role === 'cliente' && (
                                            <button
                                                className={styles.editBtn}
                                                onClick={(e) => handleEditClick(e, negocio.id)}
                                                title="Editar Registro"
                                            >
                                                <HiOutlinePencil size={20} />
                                            </button>
                                        )}

                                        <div className={`${styles.cardIndicator} ${negocio.estado === 'Finalizado' ? styles.blue : ''}`}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className={styles.rightColumn}></div>
        </div>
    );
};

export default ListaNegocios;
