import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './AdminPerfilTrabajador.module.css';
import { getTrabajador } from '../../services/trabajadoresService';

interface Trabajador {
    id: number;
    nombre: string;
    fecha: string;
    puesto: string;
    estado: "Activo" | "Baja";
    correo: string; 
    telefono: string;
    ciudad: string;
    avatar?: string;

    trabajosRealizados?: number;
}

const AdminPerfilTrabajador: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [worker, setWorker] = useState<Trabajador | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const fetchWorker = async () => {
            if (!id) return;

            try {
                // Llamar al backend real
                const data = await getTrabajador(Number(id));
                setWorker(data);
            } catch (error) {
                console.error("Error cargando trabajador", error);
                setErrorMsg("No se pudo cargar la información del trabajador.");
            } finally {
                setLoading(false);
            }
        };

        fetchWorker();

    }, [id]);

    if (loading) {
        return (
            <div className={styles.dashboardLayout}>
                <div className={styles.mainCard}>
                    <button onClick={() => navigate(-1)} className={styles.backButton}>
                        ← Volver
                    </button>
                    <p style={{marginTop: '20px'}}>Cargando trabajador...</p>
                </div>
            </div>
        );
    }

    if (errorMsg || !worker) {
        return (
            <div className={styles.dashboardLayout}>
                <div className={styles.mainCard}>
                    <button onClick={() => navigate(-1)} className={styles.backButton}>
                        ← Volver
                    </button>
                    <p style={{marginTop: '20px', color: 'red'}}>{errorMsg || "Trabajador no encontrado"}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.mainCard}>
                <div className={styles.bgShape1}></div>
                <div className={styles.bgShape2}></div>
                <div className={styles.sideDecoration}></div>

                <div className={styles.contentWrapper}>
                    <button onClick={() => navigate(-1)} className={styles.backButton}>← Volver</button>

                    <div className={styles.profileHeader}>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoRow}>
                                <span className={styles.label}>Nombre:</span>
                                <span className={styles.value}>{worker.nombre}</span>
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Correo:</span>
                                <span className={styles.value}>{worker.correo}</span>
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Teléfono:</span>
                                <span className={styles.value}>{worker.telefono}</span>

                                <span className={styles.label} style={{ marginLeft: '40px', width: 'auto' }}>Ciudad:</span>
                                <span className={styles.value}>{worker.ciudad}</span>    
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Estatus:</span>
                                <span className={styles.value} style={{ color: worker.estado === 'Activo' ? '#4CAF50' : '#F44336' }}>
                                    {worker.estado}
                                </span>
                            </div>
                        </div>

                        <div className={styles.avatarContainer}>
                            <div className={styles.avatarCircle}>
                                {worker.avatar ? (
                                    <img src={worker.avatar} alt={worker.nombre} />
                                ) : (
                                    "👤"
                                )}
                                <span className={styles.editLabel}>EDITAR</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.statsSection}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>
                                {worker.trabajosRealizados ?? 0}
                            </span>
                            <span className={styles.statLabel}>Trabajos Realizados</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{worker.fecha}</span>
                            <span className={styles.statLabel}>Fecha de Ingreso</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPerfilTrabajador;
