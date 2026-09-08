import React from 'react';

interface RejectionModalProps {
    isOpen: boolean;
    rejectionReason: string;
    onReasonChange: (reason: string) => void;
    onSubmit: () => void;
    onClose: () => void;
    /** Clases CSS del módulo principal */
    styles: Record<string, string>;
}

/**
 * Modal que aparece cuando el cliente rechaza una cotización.
 * Captura el motivo del rechazo y lo enviará como mensaje de chat.
 */
const RejectionModal: React.FC<RejectionModalProps> = ({
    isOpen,
    rejectionReason,
    onReasonChange,
    onSubmit,
    onClose,
    styles,
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ width: '400px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>Motivo del Rechazo</h3>
                <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#64748b' }}>
                    Ingresa una contrapropuesta o el motivo por el cual rechazas el precio asignado.
                </p>
                <textarea
                    value={rejectionReason}
                    onChange={(e) => onReasonChange(e.target.value)}
                    placeholder="Escribe aquí tu comentario para iniciar la negociación..."
                    style={{
                        width: '100%', height: '100px', padding: '10px', borderRadius: '8px',
                        border: '1px solid #cbd5e1', marginBottom: '20px', outline: 'none', resize: 'none'
                    }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onSubmit}
                        style={{ padding: '8px 16px', background: '#ef4444', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    >
                        Rechazar y Negociar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RejectionModal;
