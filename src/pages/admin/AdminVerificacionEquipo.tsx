
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './AdminVerificacionEquipo.module.css';

const AdminVerificacionEquipo: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    // Mock data based on realistic items
    const [handTools, setHandTools] = useState([
        { id: 1, name: 'Pinzas', checked: false },
        { id: 2, name: 'Desarmador', checked: false },
        { id: 3, name: 'Martillo', checked: false },
        { id: 4, name: 'Cinta de medir', checked: false },
        { id: 5, name: 'Pelacables', checked: false },
        { id: 6, name: 'Cúter', checked: false },
        { id: 7, name: 'Llaves ajustables', checked: false },
    ]);

    const [safetyEquipment, setSafetyEquipment] = useState([
        { id: 1, name: 'Casco', checked: false },
        { id: 2, name: 'Guantes de carnaza', checked: false },
        { id: 3, name: 'Lentes de seguridad', checked: false },
        { id: 4, name: 'Botas de trabajo', checked: false },
        { id: 5, name: 'Arnés de seguridad', checked: false },
        { id: 6, name: 'Chaleco reflejante', checked: false },
    ]);

    const toggleHandTool = (toolId: number) => {
        setHandTools(tools => tools.map(t => t.id === toolId ? { ...t, checked: !t.checked } : t));
    };

    const toggleSafetyEquipment = (equipId: number) => {
        setSafetyEquipment(equip => equip.map(e => e.id === equipId ? { ...e, checked: !e.checked } : e));
    };

    const allChecked = handTools.every(t => t.checked) && safetyEquipment.every(e => e.checked);

    const handleNext = () => {
        if (!allChecked) {
            alert("Por favor, marca todas las herramientas y el equipo de seguridad antes de continuar al reporte.");
            return;
        }
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
                    <button onClick={() => navigate(-1)} className={styles.backButton}>
                        ← Volver
                    </button>

                    <div className={styles.headerTitle}>
                        <h1 className={styles.titleMain}>Trabajo</h1>
                        <h2 className={styles.titleSecondary}>Trabajo</h2>
                    </div>

                    {/* Job Title and Priority */}
                    <div className={styles.jobHeader}>
                        <h2 className={styles.jobName}>Reparación de azotea</h2>
                        <span className={styles.jobPriority}>
                            Prioridad: Alta
                        </span>
                    </div>

                    <div className={styles.scrollableContent}>
                        {/* Checklists Container */}
                        <div className={styles.checklistGrid}>
                            {/* Hand Tools Column */}
                            <div className={styles.infoSectionCard}>
                                <h3 className={styles.checklistColumnTitle}>Herramientas de Mano</h3>
                                <div className={styles.checklistItems}>
                                    {handTools.map(item => (
                                        <div
                                            key={item.id}
                                            className={`${styles.checklistItem} ${item.checked ? styles.checklistItemChecked : styles.checklistItemUnchecked}`}
                                            onClick={() => toggleHandTool(item.id)}
                                        >
                                            <div className={`${styles.checkbox} ${item.checked ? styles.checkboxChecked : ''}`}>
                                                {item.checked && '✓'}
                                            </div>
                                            <span className={styles.itemName}>{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Safety Equipment Column */}
                            <div className={styles.infoSectionCard}>
                                <h3 className={styles.checklistColumnTitle}>Equipo de seguridad</h3>
                                <div className={styles.checklistItems}>
                                    {safetyEquipment.map(item => (
                                        <div
                                            key={item.id}
                                            className={`${styles.checklistItem} ${item.checked ? styles.checklistItemChecked : styles.checklistItemUnchecked}`}
                                            onClick={() => toggleSafetyEquipment(item.id)}
                                        >
                                            <div className={`${styles.checkbox} ${item.checked ? styles.checkboxChecked : ''}`}>
                                                {item.checked && '✓'}
                                            </div>
                                            <span className={styles.itemName}>{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Next Button */}
                        <div className={styles.footer}>
                            <button
                                onClick={handleNext}
                                className={`${styles.nextButton} ${!allChecked ? styles.nextButtonDisabled : ''}`}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminVerificacionEquipo;
