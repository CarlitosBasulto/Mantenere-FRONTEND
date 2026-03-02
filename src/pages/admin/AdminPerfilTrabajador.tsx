import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './AdminPerfilTrabajador.module.css';

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
}

const AdminPerfilTrabajador: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [worker, setWorker] = useState<Trabajador | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('trabajadores_list');
        if (saved) {
            const list: Trabajador[] = JSON.parse(saved);
            const found = list.find(t => t.id === Number(id));
            setWorker(found || null);
        }
    }, [id]);

    if (!worker) {
        return (
            <div className={styles.dashboardLayout}>
                <div className={styles.mainCard}>
                    <button onClick={() => navigate(-1)} className={styles.backButton}>← Volver</button>
                    <p>Trabajador no encontrado.</p>
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

                                <span className={styles.label} style={{ marginLeft: '40px', width: 'auto' }}>Estado:</span>
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
                                👤
                                <span className={styles.editLabel}>EDITAR</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.statsSection}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>15</span>
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
