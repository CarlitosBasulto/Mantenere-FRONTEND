import React from 'react';
import { HiOutlineWrenchScrewdriver } from 'react-icons/hi2';
import type { Equipment } from '../../pages/cliente/PerfilEmpresa';

interface ModalSeleccionEquipoProps {
    isOpen: boolean;
    onClose: () => void;
    equipos: Equipment[];
    onSelect: (equipo: Equipment) => void;
    title: string;
}

const ModalSeleccionEquipo: React.FC<ModalSeleccionEquipoProps> = ({
    isOpen,
    onClose,
    equipos,
    onSelect,
    title
}) => {
    if (!isOpen) return null;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={headerStyle}>
                    <HiOutlineWrenchScrewdriver size={24} style={{ color: '#f26522' }} />
                    <h3 style={titleStyle}>{title}</h3>
                </div>
                <p style={subtitleStyle}>Selecciona el equipo para continuar:</p>
                <div style={gridStyle}>
                    {equipos.map(eq => (
                        <button key={eq.id} style={cardStyle} onClick={() => { onSelect(eq); onClose(); }}>
                            {eq.foto ? (
                                <img src={eq.foto} alt={eq.nombre} style={imgStyle} />
                            ) : (
                                <div style={noImgStyle}>Sin foto</div>
                            )}
                            <div style={cardContentStyle}>
                                <div style={eqNameStyle}>{eq.nombre}</div>
                                <div style={eqSubStyle}>{eq.marca} • {eq.modelo}</div>
                            </div>
                        </button>
                    ))}
                </div>
                <button style={closeBtnStyle} onClick={onClose}>Cancelar</button>
            </div>
        </div>
    );
};

export default ModalSeleccionEquipo;

// Inline styles for simplicity and self-containment
const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
};
const modalStyle: React.CSSProperties = {
    background: '#fff', width: '90%', maxWidth: '500px',
    borderRadius: '24px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
};
const headerStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'
};
const titleStyle: React.CSSProperties = {
    fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0
};
const subtitleStyle: React.CSSProperties = {
    color: '#64748b', fontSize: '14px', marginBottom: '20px'
};
const gridStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto'
};
const cardStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px',
    border: '1px solid #e2e8f0', borderRadius: '16px', background: '#f8fafc',
    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%'
};
const imgStyle: React.CSSProperties = {
    width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover'
};
const noImgStyle: React.CSSProperties = {
    width: '60px', height: '60px', borderRadius: '8px', background: '#e2e8f0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#94a3b8', fontSize: '12px', fontWeight: 600
};
const cardContentStyle: React.CSSProperties = {
    flex: 1
};
const eqNameStyle: React.CSSProperties = {
    fontWeight: 700, color: '#0f172a', fontSize: '15px'
};
const eqSubStyle: React.CSSProperties = {
    color: '#64748b', fontSize: '13px'
};
const closeBtnStyle: React.CSSProperties = {
    marginTop: '24px', width: '100%', padding: '12px',
    background: '#f1f5f9', color: '#475569', border: 'none',
    borderRadius: '12px', fontWeight: 700, cursor: 'pointer'
};
