import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ListaNegocios.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";
import { HiOutlinePencil } from "react-icons/hi2";
import { FaImage } from "react-icons/fa6";
import { getNegocios } from "../../services/negociosService";
import { getTrabajos } from "../../services/trabajosService";

interface Negocio {
    id: number;
    nombre: string;
    ubicacion: string;
    dueno: string;
    fecha: string;
    estado: string; // Added status field
    imagenPerfil?: string; // Client uploaded picture
}

const ListaNegocios: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [negocios, setNegocios] = useState<Negocio[]>([]);
    const [searchText, setSearchText] = useState("");

    const [techBusinessIds, setTechBusinessIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Si es técnico, trae los trabajos para sacar a qué negocios tiene que ir
                if (user?.role === 'tecnico') {
                    const jobs = await getTrabajos();
                    // Buscar los trabajos donde el técnico actual está asignado.
                    // Podemos validar por user_id directo o también por el nombre.
                    const myJobs = jobs.filter((j: any) => j.trabajador?.nombre === user.name || j.trabajador_id === user.id);
                    const businessIds = new Set(myJobs.map((j: any) => j.negocio_id));
                    setTechBusinessIds(businessIds as Set<number>);
                }

                const data = await getNegocios();
                const mappedData = data.map((n: any) => ({
                    id: n.id,
                    nombre: n.nombre,
                    ubicacion: n.tipo === "W/M" ? `${n.calleAv || ''} Mza ${n.manzana || ''}` : (n.nombrePlaza || n.colonia || "Mérida"),
                    dueno: n.encargado || "Cliente",
                    fecha: n.created_at ? new Date(n.created_at).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX'),
                    estado: n.estado_aprobacion || "En Espera",
                    imagenPerfil: n.imagenPerfil,
                    user_id: n.user_id
                }));
                // Ordenar los mas nuevos primero
                setNegocios(mappedData.reverse());
            } catch (error) {
                console.error("Error al obtener negocios y trabajos:", error);
            }
        };

        fetchAll();
    }, [user]);

    const filteredNegocios = negocios.filter((negocio) => {
        const matchesSearch = negocio.nombre.toLowerCase().includes(searchText.toLowerCase());

        // FILTRO POR ROL: El cliente solo ve lo suyo, el admin ve todo
        if (user?.role === 'cliente') {
            return matchesSearch && ((negocio as any).user_id === user.id || negocio.dueno === user.name);
        }

        // FILTRO POR ROL: El técnico solo ve los negocios donde tiene trabajos asignados según la DB
        if (user?.role === 'tecnico') {
            return matchesSearch && techBusinessIds.has(negocio.id);
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
                    <div style={{ display: 'flex', gap: '10px' }}>
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
                    {filteredNegocios.map((negocio) => (
                        <div
                            key={negocio.id}
                            className={styles.jobCard}
                            onClick={() => handleCardClick(negocio.id)}
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
                    ))}
                </div>
            </div>
            <div className={styles.rightColumn}></div>
        </div>
    );
};

export default ListaNegocios;
