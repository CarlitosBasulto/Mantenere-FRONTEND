import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './AdminVerificacionEquipo.module.css';

const AdminVerificacionEquipo: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const handleNext = () => {
        // Navigate to the next step (report filling)
        navigate(`/menu/reporte-tarea/${id}`);
    };

    return (
        <div className={styles.dashboardLayout} style={{ gap: '0', padding: '20px', height: '100%' }}>

            {/* Main Content Card */}
            <div className={styles.mainCard}>

                {/* Background Shapes */}
                <div className={styles.bgShape1}></div>
                <div className={styles.bgShape2}></div>

                <div className={styles.contentWrapper}>

                    {/* Header */}

                    <div className={styles.headerTitle}>
                        <h1 className={styles.titleMain}>Trabajo</h1>
                        <h2 className={styles.titleSecondary}>Trabajo</h2>
                    </div>

                    {/* Job Title and Priority - can be fetched dynamically but kept static for now as per original */}
                    <div className={styles.jobHeader}>
                        <h2 className={styles.jobName}>Verificación de Seguridad</h2>
                        <span className={styles.jobPriority}>
                            Importante
                        </span>
                    </div>

                    <div className={styles.scrollableContent}>

                        <div style={{ background: '#fff9c4', border: '1px solid #fbc02d', borderRadius: '15px', padding: '30px', margin: '20px 0', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
                            <h3 style={{ margin: '0 0 15px 0', color: '#f57f17', fontSize: '24px' }}>Recordatorio de Seguridad</h3>
                            <p style={{ margin: 0, fontSize: '18px', color: '#555', lineHeight: '1.6' }}>
                                Por favor, asegúrate de llevar contigo todo tu <strong>equipo de seguridad adecuado</strong> (casco, guantes, lentes, botas, etc.) y las <strong>herramientas de mano necesarias</strong> antes de iniciar el trabajo. <br /><br />
                                ¡Tu seguridad es lo más importante!
                            </p>
                        </div>

                        {/* Next Button */}
                        <div className={styles.footer} style={{ justifyContent: 'center' }}>
                            <button
                                onClick={handleNext}
                                className={styles.nextButton}
                                style={{ padding: '15px 50px', fontSize: '18px', width: 'auto' }}
                            >
                                Entendido, Continuar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminVerificacionEquipo;
