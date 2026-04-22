import React, { useState } from 'react';
import styles from './LevantamientoModal.module.css'; // Podemos reusar algunos estilos
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import type { Equipment } from '../pages/cliente/PerfilEmpresa';

interface ReportarProblemaModalProps {
    isOpen: boolean;
    onClose: () => void;
    equipment: Equipment | null;
    negocioId: string | number;
    onSubmit: (descripcion: string) => Promise<void>;
}

const ReportarProblemaModal: React.FC<ReportarProblemaModalProps> = ({ 
    isOpen, 
    onClose, 
    equipment, 
    onSubmit 
}) => {
    const [descripcion, setDescripcion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !equipment) return null;

    const handleSubmit = async () => {
        if (!descripcion.trim()) return;
        setIsSubmitting(true);
        try {
            await onSubmit(descripcion);
            setDescripcion('');
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className={styles.modalHeader} style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <HiOutlineExclamationTriangle size={24} color="#d97706" />
                        <div>
                            <h3 className={styles.modalTitle} style={{ color: '#92400e' }}>Reportar Problema</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#b45309' }}>Solicitar mantenimiento para equipo</p>
                        </div>
                    </div>
                    <button className={styles.closeButton} onClick={onClose} type="button">
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#92400e' }}>✕</span>
                    </button>
                </div>

                <div className={styles.modalSplitBody} style={{ display: 'block', padding: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {equipment.foto ? (
                            <img src={equipment.foto} alt="Eq" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '10px', color: '#64748b' }}>Sin foto</span>
                            </div>
                        )}
                        <div>
                            <h4 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{equipment.nombre}</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Marca: {equipment.marca} • Modelo: {equipment.modelo}</p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Serie: {equipment.serie || 'N/A'}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                            Describe la falla o el problema que presenta el equipo:
                        </label>
                        <textarea 
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Ej. El motor hace un ruido extraño y no enfría correctamente..."
                            rows={5}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '14px',
                                resize: 'vertical'
                            }}
                        />
                    </div>
                </div>

                <div className={styles.modalFooter} style={{ justifyContent: 'flex-end', gap: '10px' }}>
                    <button 
                        onClick={onClose} 
                        style={{ padding: '10px 20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: '600' }}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button 
                        className={styles.primaryBtn} 
                        onClick={handleSubmit} 
                        disabled={!descripcion.trim() || isSubmitting}
                        style={{ background: !descripcion.trim() || isSubmitting ? '#94a3b8' : '#eab308' }}
                    >
                        {isSubmitting ? 'Enviando...' : 'Enviar Reporte al Admin'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportarProblemaModal;
