
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './AdminVerificacionEquipo.module.css';
import { getChecklistByTrabajoId, saveChecklist } from '../../services/checklistService';

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

    // Obtener desde backend o localStorage si ya fue manipulado
    React.useEffect(() => {
        const fetchChecklist = async () => {
            if (!id) return;
            try {
                const data = await getChecklistByTrabajoId(Number(id));
                // Verificamos si hay data guardada en SQL
                if (data && data.herramientas.length > 0 && data.seguridad.length > 0) {
                    setHandTools(data.herramientas.map((h, i) => ({ id: i + 1, name: h.nombre || h.name || '', checked: !!Number(h.checked) })));
                    setSafetyEquipment(data.seguridad.map((s, i) => ({ id: i + 1, name: s.nombre || s.name || '', checked: !!Number(s.checked) })));
                } else {
                    // Fallback a memoria temporal
                    const stored = localStorage.getItem(`checklist_${id}`);
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if(parsed.handTools) setHandTools(parsed.handTools);
                        if(parsed.safetyEquipment) setSafetyEquipment(parsed.safetyEquipment);
                    }
                }
            } catch (error) {
                console.error("Error obteniendo checklist", error);
            }
        };
        fetchChecklist();
    }, [id]);

    const toggleHandTool = (toolId: number) => {
        setHandTools(tools => tools.map(t => t.id === toolId ? { ...t, checked: !t.checked } : t));
    };

    const toggleSafetyEquipment = (equipId: number) => {
        setSafetyEquipment(equip => equip.map(e => e.id === equipId ? { ...e, checked: !e.checked } : e));
    };

    const allChecked = handTools.every(t => t.checked) && safetyEquipment.every(e => e.checked);

    const handleNext = async () => {

        if (!allChecked) {
            alert("Por favor, marca todas las herramientas y el equipo de seguridad antes de continuar.");
            return;
        }

        // Guardar en Backend
        if (id) {
            try {
                await saveChecklist({
                    trabajo_id: Number(id),
                    herramientas: handTools.map(t => ({ nombre: t.name, checked: t.checked })) as any[],
                    seguridad: safetyEquipment.map(s => ({ nombre: s.name, checked: s.checked })) as any[]
                });
            } catch (error) {
                console.error("Error guardando checklist en SQL:", error);
                alert("Error de red al guardar. Se procederá localmente.");
            }
        }

        // Guardar respaldo local
        const checklistData = {
            handTools,
            safetyEquipment
        };
        localStorage.setItem(`checklist_${id}`, JSON.stringify(checklistData));

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
