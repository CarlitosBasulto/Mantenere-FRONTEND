import React from 'react';
import type { AsignacionTecnico, Tecnico, Trabajo } from '../../../types/trabajo.types';
import menuStyles from '../../../components/Menu.module.css';
import styles from '../Trabajodetalles.module.css';

interface AssignTechnicianModalProps {
    isOpen: boolean;
    selectedJobId: number | null;
    trabajosData: Trabajo[];
    selectedAssignments: AsignacionTecnico[];
    selectedType: 'Visita' | 'Trabajo';
    filteredTechnicians: Tecnico[];
    technicianSearch: string;
    onTechSearch: (text: string) => void;
    onTechToggle: (tech: Tecnico) => void;
    onUpdateDate: (tecnicoId: number, field: 'fechaAsignada' | 'horaAsignada', value: string) => void;
    onTypeChange: (type: 'Visita' | 'Trabajo') => void;
    onConfirm: () => void;
    onClose: () => void;
}

const HOUR_SLOTS = [
    { val: '07:00', lbl: '07:00 AM' }, { val: '07:30', lbl: '07:30 AM' },
    { val: '08:00', lbl: '08:00 AM' }, { val: '08:30', lbl: '08:30 AM' },
    { val: '09:00', lbl: '09:00 AM' }, { val: '09:30', lbl: '09:30 AM' },
    { val: '10:00', lbl: '10:00 AM' }, { val: '10:30', lbl: '10:30 AM' },
    { val: '11:00', lbl: '11:00 AM' }, { val: '11:30', lbl: '11:30 AM' },
    { val: '12:00', lbl: '12:00 PM' }, { val: '12:30', lbl: '12:30 PM' },
    { val: '13:00', lbl: '01:00 PM' }, { val: '13:30', lbl: '01:30 PM' },
    { val: '14:00', lbl: '02:00 PM' }, { val: '14:30', lbl: '02:30 PM' },
    { val: '15:00', lbl: '03:00 PM' }, { val: '15:30', lbl: '03:30 PM' },
    { val: '16:00', lbl: '04:00 PM' }, { val: '16:30', lbl: '04:30 PM' },
    { val: '17:00', lbl: '05:00 PM' }, { val: '17:30', lbl: '05:30 PM' },
    { val: '18:00', lbl: '06:00 PM' }, { val: '18:30', lbl: '06:30 PM' },
    { val: '19:00', lbl: '07:00 PM' }, { val: '19:30', lbl: '07:30 PM' },
    { val: '20:00', lbl: '08:00 PM' },
];

/**
 * Modal de asignación de técnico. Permite seleccionar el tipo de trabajo
 * (Visita/Trabajo), el técnico, y la fecha/hora de asignación.
 */
const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
    isOpen,
    selectedJobId,
    trabajosData,
    selectedAssignments,
    selectedType,
    filteredTechnicians,
    technicianSearch,
    onTechSearch,
    onTechToggle,
    onUpdateDate,
    onTypeChange,
    onConfirm,
    onClose,
}) => {
    if (!isOpen) return null;

    const jobFechaSolicitud = selectedJobId
        ? trabajosData.find(j => j.id === selectedJobId)?.fechaSolicitud
        : null;

    return (
        <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${styles.modalContentWide}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '5px', fontSize: '28px', fontWeight: '800' }}>
                    Asignar Tecnico
                </h2>
                {jobFechaSolicitud && (
                    <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 'bold', marginBottom: '25px', marginTop: 0 }}>
                        📅 Solicitado el: {jobFechaSolicitud}
                    </p>
                )}

                {/* Selector tipo Visita / Trabajo */}
                <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    {(['Visita', 'Trabajo'] as const).map(t => (
                        <label key={t} className={`${styles.radioLabel} ${styles.radioLabelLarge}`}>
                            <input
                                type="radio"
                                name="type"
                                checked={selectedType === t}
                                onChange={() => onTypeChange(t)}
                            />
                            <span>{t}</span>
                        </label>
                    ))}
                </div>

                {/* Buscador de técnicos */}
                <div className={`${menuStyles.searchCard} ${styles.techSearchWrapper}`}>
                    <input
                        type="text"
                        placeholder="Buscar técnico..."
                        className={`${menuStyles.searchInput} ${styles.techSearchInput}`}
                        value={technicianSearch}
                        onChange={(e) => onTechSearch(e.target.value)}
                    />
                </div>

                {/* Lista de técnicos */}
                <div className={styles.techList}>
                    {filteredTechnicians.map(tech => (
                        <div key={tech.id} className={styles.techItem}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className={styles.techAvatar}>👤</div>
                                <span style={{ fontWeight: 'bold' }}>{tech.nombre}</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={selectedAssignments.some(a => a.tecnicoId === tech.id)}
                                onChange={() => onTechToggle(tech)}
                                style={{ width: '20px', height: '20px', accentColor: '#333', cursor: 'pointer' }}
                            />
                        </div>
                    ))}
                </div>

                {/* Fechas/horas por técnico */}
                {selectedAssignments.length > 0 && (
                    <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                        <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#555' }}>
                            Fechas y Horas de Asignación por Técnico
                        </h4>
                        <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '5px' }}>
                            {selectedAssignments.map(asig => (
                                <div key={asig.tecnicoId} style={{
                                    display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center',
                                    background: '#f8f9fa', padding: '10px', borderRadius: '8px', border: '1px solid #eee'
                                }}>
                                    <div style={{ width: '30%', fontWeight: 'bold', fontSize: '13px' }}>
                                        {asig.tecnicoNombre}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="date"
                                            min={new Date().toISOString().split('T')[0]}
                                            value={asig.fechaAsignada}
                                            onChange={(e) => onUpdateDate(asig.tecnicoId, 'fechaAsignada', e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <select
                                            value={asig.horaAsignada}
                                            onChange={(e) => onUpdateDate(asig.tecnicoId, 'horaAsignada', e.target.value)}
                                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                        >
                                            <option value="">-- Hora --</option>
                                            {HOUR_SLOTS.map(slot => (
                                                <option key={slot.val} value={slot.val}>{slot.lbl}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className={styles.modalActions} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={onConfirm}
                        className={styles.applyBtn}
                        style={{
                            background: selectedAssignments.length === 0 ? '#ff5252' : '#f26522',
                            color: '#fff', width: 'auto', padding: '12px 40px', border: 'none',
                            borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}
                    >
                        {selectedAssignments.length === 0 ? 'Dejar Sin Asignar' : 'Confirmar Asignación'}
                    </button>
                    <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
                </div>
            </div>
        </div>
    );
};

export default AssignTechnicianModal;
