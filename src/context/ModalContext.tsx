import React, { createContext, useContext, useState, useCallback } from 'react';

type ModalType = 'alert' | 'confirm' | 'success' | 'error' | 'warning' | 'info' | 'prompt';

interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
}

interface ModalContextType {
  showAlert: (title: string, message: string, type?: ModalType) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
  showPrompt: (
    title: string,
    message: string,
    defaultValue: string,
    onConfirm: (value: string) => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
  closeModal: () => void;
  modalOptions: ModalOptions | null;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);

  const showAlert = useCallback((title: string, message: string, type: ModalType = 'alert') => {
    setModalOptions({ title, message, type, confirmText: 'Aceptar' });
  }, []);

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      confirmText: string = 'Aceptar',
      cancelText: string = 'Cancelar'
    ) => {
      setModalOptions({
        title,
        message,
        type: 'confirm',
        onConfirm: () => {
          onConfirm();
          setModalOptions(null);
        },
        onCancel: () => {
          if (onCancel) onCancel();
          setModalOptions(null);
        },
        confirmText,
        cancelText,
      });
    },
    []
  );

  const showPrompt = useCallback(
    (
      title: string,
      message: string,
      defaultValue: string,
      onConfirm: (value: string) => void,
      onCancel?: () => void,
      confirmText: string = 'Aceptar',
      cancelText: string = 'Cancelar'
    ) => {
      setModalOptions({
        title,
        message,
        type: 'prompt',
        defaultValue,
        onConfirm: (val?: string) => {
          if (val !== undefined) onConfirm(val);
          setModalOptions(null);
        },
        onCancel: () => {
          if (onCancel) onCancel();
          setModalOptions(null);
        },
        confirmText,
        cancelText,
      });
    },
    []
  );

  const closeModal = useCallback(() => {
    setModalOptions(null);
  }, []);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt, closeModal, modalOptions }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
