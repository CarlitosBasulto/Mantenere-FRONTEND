import React, { useState, useEffect } from 'react';
import { HiOutlineHome } from 'react-icons/hi2';
import styles from './ModalSeleccionEspacio.module.css';

interface ModalSeleccionEspacioProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (nombre: string) => void;
    title: string;
    subtitle: string;
    predefinedOptions: string[];
}

const ModalSeleccionEspacio: React.FC<ModalSeleccionEspacioProps> = ({
    isOpen,
    onClose,
    onAdd,
    title,
    subtitle,
    predefinedOptions
}) => {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [customValue, setCustomValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedOption(null);
            setCustomValue('');
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelect = (opt: string) => {
        if (opt === 'OTRO') {
            setSelectedOption('OTRO');
        } else {
            setSelectedOption(opt);
            setCustomValue('');
        }
    };

    const handleAdd = () => {
        if (selectedOption === 'OTRO') {
            if (customValue.trim()) {
                onAdd(customValue.trim().toUpperCase());
            }
        } else if (selectedOption) {
            onAdd(selectedOption);
        }
    };

    const isAddDisabled = !selectedOption || (selectedOption === 'OTRO' && !customValue.trim());

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <HiOutlineHome size={28} className={styles.headerIcon} />
                    <h3 className={styles.title}>{title}</h3>
                </div>
                
                <div className={styles.body}>
                    <p className={styles.subtitle}>{subtitle}</p>
                    
                    <div className={styles.grid}>
                        {predefinedOptions.map(opt => (
                            <button 
                                key={opt}
                                className={`${styles.pillBtn} ${selectedOption === opt ? styles.selected : ''}`}
                                onClick={() => handleSelect(opt)}
                            >
                                {opt}
                            </button>
                        ))}
                        <button 
                            className={`${styles.pillBtn} ${selectedOption === 'OTRO' ? styles.selected : ''}`}
                            onClick={() => handleSelect('OTRO')}
                        >
                            + OTRO
                        </button>
                    </div>

                    {selectedOption === 'OTRO' && (
                        <div className={styles.customInputWrapper}>
                            <input 
                                type="text"
                                className={styles.customInput}
                                placeholder="Escribe el nombre del espacio..."
                                value={customValue}
                                onChange={(e) => setCustomValue(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button className={styles.cancelBtn} onClick={onClose}>
                            Cancelar
                        </button>
                        <button 
                            className={styles.addBtn} 
                            onClick={handleAdd}
                            disabled={isAddDisabled}
                        >
                            Agregar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalSeleccionEspacio;
