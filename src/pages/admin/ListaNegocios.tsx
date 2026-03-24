import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ListaNegocios.module.css";
import menuStyles from "../../components/Menu.module.css";
import { useAuth } from "../../context/AuthContext";
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
}

const ListaNegocios: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [negocios, setNegocios] = useState<Negocio[]>([]);
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        const stored = localStorage.getItem('negocios_list');
        const mockData: Negocio[] = [];

        if (stored) {
            const list = JSON.parse(stored);
            // Evitar duplicados del mock inicial si ya están en storage
            const filteredMock = mockData.filter(m => !list.some((l: any) => l.id === m.id));
            setNegocios([...list, ...filteredMock]);
        } else {
            setNegocios(mockData);
            localStorage.setItem('negocios_list', JSON.stringify(mockData));
        }
    }, []);

    const filteredNegocios = negocios.filter((negocio) => {
        const matchesSearch = negocio.nombre.toLowerCase().includes(searchText.toLowerCase());

        // FILTRO POR ROL: El cliente solo ve lo suyo, el admin ve todo
        if (user?.role === 'cliente') {
            return matchesSearch && negocio.dueno === user.name;
        }

        // FILTRO POR ROL: El técnico solo ve los negocios donde tiene trabajos asignados
        if (user?.role === 'tecnico') {
            // Buscamos dinámicamente en qué negocios tiene trabajos el técnico
            let hasJobsInThisBusiness = false;

            // 1. Verificar en datos persistidos
            const storedJobs = localStorage.getItem(`trabajos_business_${negocio.id}`);
            if (storedJobs) {
                const jobs = JSON.parse(storedJobs);
                if (jobs.some((j: any) => j.tecnico === user.name)) {
                    hasJobsInThisBusiness = true;
                }
            }

            // 2. Si no hay persistidos, verificar en los IDs de demo por defecto (para que no salga vacio al inicio)
            const defaultDemoIds = [1, 3];
            if (!hasJobsInThisBusiness && defaultDemoIds.includes(negocio.id)) {
                hasJobsInThisBusiness = true;
            }

            return matchesSearch && hasJobsInThisBusiness;
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
                            const storedJobs = localStorage.getItem(`trabajos_business_${negocio.id}`);
                            if (storedJobs) {
                                const jobs = JSON.parse(storedJobs);
                                hasSOS = jobs.some((j: any) => j.tipo === 'SOS' && j.estado === 'Solicitud');
                            }
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
