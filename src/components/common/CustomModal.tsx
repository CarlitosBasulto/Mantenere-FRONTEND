import React from 'react';
import { useModal } from '../../context/ModalContext';
import styles from './CustomModal.module.css';

const CustomModal: React.FC = () => {
  const { modalOptions, closeModal } = useModal();

  if (!modalOptions) return null;

  const { title, message, type, onConfirm, onCancel, confirmText, cancelText } = modalOptions;

  const getIcon = () => {
    switch (type) {
      case 'confirm':
      case 'warning':
        return (
          <div className={`${styles.iconOuter} ${styles.iconAmber}`}>
            <svg className={styles.iconSvg} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'success':
        return (
          <div className={`${styles.iconOuter} ${styles.iconEmerald}`}>
            <svg className={styles.iconSvg} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className={`${styles.iconOuter} ${styles.iconRose}`}>
            <svg className={styles.iconSvg} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'info':
      default:
        return (
          <div className={`${styles.iconOuter} ${styles.iconBlue}`}>
            <svg className={styles.iconSvg} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => {
      // Allow closing when clicking the overlay (background) directly
      if (e.target === e.currentTarget && !onConfirm) {
        closeModal();
      }
    }}>
      <div className={styles.modalBox}>
        
        {/* Icon Section */}
        <div className={styles.iconContainer}>
          {getIcon()}
        </div>
        
        {/* Text Section */}
        <h3 className={styles.title}>
          {title}
        </h3>
        <p className={styles.message}>
          {message}
        </p>
        
        {/* Actions Section */}
        <div className={styles.actions}>
          {onCancel && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnCancel}`}
              onClick={closeModal}
            >
              {cancelText || 'Cancelar'}
            </button>
          )}
          <button
            type="button"
            className={`${styles.btn} ${type === 'error' ? styles.btnConfirmError : styles.btnConfirmDefault}`}
            onClick={() => {
              if (onConfirm) onConfirm();
              else closeModal();
            }}
          >
            {confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );

};

export default CustomModal;
