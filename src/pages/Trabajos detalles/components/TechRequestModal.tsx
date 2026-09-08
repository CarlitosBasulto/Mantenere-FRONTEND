import React from 'react';
import { HiX } from 'react-icons/hi';

interface TechRequestModalProps {
    isOpen: boolean;
    requestRole: string;
    isSOSRequest: boolean;
    onRoleChange: (role: string) => void;
    onConfirm: () => void;
    onClose: () => void;
    /** Clases CSS del módulo principal para reutilizar estilos */
    styles: Record<string, string>;
}

const TECH_ROLES = [
    'Plomero', 'Electricista', 'Albañil', 'Pintor', 'Jardinero',
    'Limpieza', 'Técnico HVAC', 'Herrero', 'Carpintero'
];

/**
 * Modal para que el encargado/autónomo solicite un técnico al admin principal.
 */
const TechRequestModal: React.FC<TechRequestModalProps> = ({
    isOpen,
    requestRole,
    isSOSRequest,
    onRoleChange,
    onConfirm,
    onClose,
    styles,
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '400px', background: 'white', borderRadius: '12px', padding: '20px' }}>
                <div className={styles.modalHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Solicitar Técnico</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                        <HiX size={24} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <p style={{ color: '#475569', marginBottom: '15px', fontSize: '14px' }}>
                        ¿Qué tipo de técnico necesitas? Enviaremos tu solicitud al administrador general.
                    </p>
                    <select
                        className={`${styles.newServiceInput} ${isSOSRequest ? styles.newServiceInputSos : ''}`}
                        value={requestRole}
                        onChange={(e) => onRoleChange(e.target.value)}
                        style={{ width: '100%', marginBottom: '20px' }}
                    >
                        <option value="">Selecciona una opción...</option>
                        {TECH_ROLES.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>

                    <div className={styles.formActions} style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onClose}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#f26522', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Solicitar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TechRequestModal;
