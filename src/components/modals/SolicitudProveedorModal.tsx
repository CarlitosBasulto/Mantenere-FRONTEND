import React, { useState, useRef } from 'react';
import { 
    HiOutlineXMark, 
    HiOutlineBuildingOffice2, 
    HiOutlineUserGroup, 
    HiOutlinePhone, 
    HiOutlineDocumentCheck,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlinePhoto,
    HiOutlineCheckCircle,
    HiOutlineSparkles,
    HiOutlineUser
} from 'react-icons/hi2';
import { solicitarProveedor } from '../../services/proveedorService';
import { useModal } from '../../context/ModalContext';

interface MiembroEscuadron {
    nombre: string;
    telefono: string;
    especialidad: string;
    ineFile: File | null;
    inePreview: string | null;
}

interface SolicitudProveedorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const SolicitudProveedorModal: React.FC<SolicitudProveedorModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const { showAlert } = useModal();
    const [nombreEmpresa, setNombreEmpresa] = useState('');
    const [telefono, setTelefono] = useState('');
    const [ineProveedorFile, setIneProveedorFile] = useState<File | null>(null);
    const [ineProveedorPreview, setIneProveedorPreview] = useState<string | null>(null);

    const [escuadron, setEscuadron] = useState<MiembroEscuadron[]>([
        { nombre: '', telefono: '', especialidad: 'Mantenimiento General', ineFile: null, inePreview: null }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const ineProveedorInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // Manejo de archivo INE del proveedor
    const handleIneProveedorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIneProveedorFile(file);
            setIneProveedorPreview(URL.createObjectURL(file));
        }
    };

    // Agregar miembro al escuadrón
    const handleAddMiembro = () => {
        setEscuadron(prev => [
            ...prev,
            { nombre: '', telefono: '', especialidad: 'Mantenimiento General', ineFile: null, inePreview: null }
        ]);
    };

    // Remover miembro
    const handleRemoveMiembro = (index: number) => {
        setEscuadron(prev => prev.filter((_, i) => i !== index));
    };

    // Actualizar campo de miembro
    const handleUpdateMiembro = (index: number, field: keyof MiembroEscuadron, value: any) => {
        setEscuadron(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // Archivo INE de un miembro del escuadrón
    const handleMiembroIneChange = (index: number, file: File | null) => {
        if (file) {
            handleUpdateMiembro(index, 'ineFile', file);
            handleUpdateMiembro(index, 'inePreview', URL.createObjectURL(file));
        }
    };

    // Enviar solicitud
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nombreEmpresa.trim()) {
            showAlert("Campo Requerido", "Por favor ingresa el nombre de tu empresa o equipo.", "warning");
            return;
        }

        if (!telefono.trim()) {
            showAlert("Campo Requerido", "Por favor ingresa tu teléfono de contacto.", "warning");
            return;
        }

        if (escuadron.length === 0) {
            showAlert("Escuadrón Vacío", "Debes registrar al menos un técnico en tu equipo a cargo.", "warning");
            return;
        }

        for (let i = 0; i < escuadron.length; i++) {
            if (!escuadron[i].nombre.trim()) {
                showAlert("Datos Incompletos", `Por favor ingresa el nombre del técnico #${i + 1} de tu escuadrón.`, "warning");
                return;
            }
        }

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('nombre_empresa', nombreEmpresa);
            formData.append('telefono', telefono);

            if (ineProveedorFile) {
                formData.append('identificacion_proveedor', ineProveedorFile);
            }

            // Preparar JSON de escuadrón
            const escuadronJsonData = escuadron.map(m => ({
                nombre: m.nombre,
                telefono: m.telefono,
                especialidad: m.especialidad
            }));
            formData.append('escuadron', JSON.stringify(escuadronJsonData));

            // Adjuntar archivos de INE de cada miembro
            escuadron.forEach((m, idx) => {
                if (m.ineFile) {
                    formData.append(`escuadron_ine_${idx}`, m.ineFile);
                }
            });

            await solicitarProveedor(formData);
            showAlert("Solicitud Enviada", "¡Tu solicitud para ser Técnico Proveedor fue enviada con éxito! El Administrador la revisará a la brevedad.", "success");
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error enviando solicitud de proveedor:", err);
            const msg = err.response?.data?.message || "No se pudo enviar la solicitud. Inténtalo de nuevo.";
            showAlert("Error al Enviar", msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: '#ffffff',
                width: '100%',
                maxWidth: '780px',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #cbd5e1'
            }} onClick={e => e.stopPropagation()}>

                {/* MODAL HEADER */}
                <div style={{
                    padding: '20px 28px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '12px', borderRadius: '16px', display: 'flex' }}>
                            <HiOutlineBuildingOffice2 size={24} color="#ffffff" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', color: '#ffffff' }}>
                                Solicitar Registro como Técnico Proveedor
                            </h3>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                Registra tu empresa/equipo de técnicos para recibir y despachar visitas
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        title="Cerrar modal"
                        style={{
                            background: '#ef4444',
                            border: '2px solid #ffffff',
                            color: '#ffffff',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: '900',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* FORM CONTENT BODY */}
                <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* PASO 1: DATOS DEL PROVEEDOR */}
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <HiOutlineBuildingOffice2 color="#2563eb" size={18} /> 1. Información del Proveedor / Empresa
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                                    Nombre de la Empresa o Equipo *
                                </label>
                                <input 
                                    type="text"
                                    placeholder="Ej. Servicios Técnicos Rodríguez"
                                    value={nombreEmpresa}
                                    onChange={e => setNombreEmpresa(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                                    Teléfono de Contacto *
                                </label>
                                <input 
                                    type="tel"
                                    placeholder="Ej. 999 123 4567"
                                    value={telefono}
                                    onChange={e => setTelefono(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* FOTO DE INE DEL PROVEEDOR */}
                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                                Identificación Oficial (INE) del Proveedor (Para Veracidad por Admin)
                            </label>
                            <input 
                                type="file"
                                ref={ineProveedorInputRef}
                                accept="image/*"
                                onChange={handleIneProveedorChange}
                                style={{ display: 'none' }}
                            />
                            
                            <div 
                                onClick={() => ineProveedorInputRef.current?.click()}
                                style={{
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    background: '#ffffff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {ineProveedorPreview ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <img src={ineProveedorPreview} alt="INE Preview" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                                        <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>✓ Identificación adjunta (haz clic para cambiar)</span>
                                    </div>
                                ) : (
                                    <>
                                        <HiOutlinePhoto size={22} color="#64748b" />
                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                                            Subir foto de INE o identificación oficial (JPG, PNG)
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PASO 2: MIEMBROS DEL ESCUADRÓN */}
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <HiOutlineUserGroup color="#2563eb" size={18} /> 2. Escuadrón de Técnicos a Cargo ({escuadron.length})
                            </h4>

                            <button
                                type="button"
                                onClick={handleAddMiembro}
                                style={{
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    border: '1px solid #a7f3d0',
                                    padding: '6px 14px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <HiOutlinePlus size={16} /> Agregar Técnico
                            </button>
                        </div>

                        {escuadron.map((m, idx) => (
                            <div key={idx} style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #cbd5e1', marginBottom: '14px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                                        👷 Técnico #{idx + 1}
                                    </span>

                                    {escuadron.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMiembro(idx)}
                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700' }}
                                        >
                                            <HiOutlineTrash size={16} /> Eliminar
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Nombre Completo *</label>
                                        <input 
                                            type="text"
                                            placeholder="Ej. Juan Pérez"
                                            value={m.nombre}
                                            onChange={e => handleUpdateMiembro(idx, 'nombre', e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Teléfono</label>
                                        <input 
                                            type="tel"
                                            placeholder="Ej. 999 555 4433"
                                            value={m.telefono}
                                            onChange={e => handleUpdateMiembro(idx, 'telefono', e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Especialidad</label>
                                        <select 
                                            value={m.especialidad}
                                            onChange={e => handleUpdateMiembro(idx, 'especialidad', e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                                        >
                                            <option value="Mantenimiento General">Mantenimiento General</option>
                                            <option value="Electricidad">Electricidad</option>
                                            <option value="Plomería">Plomería</option>
                                            <option value="Aire Acondicionado">Aire Acondicionado</option>
                                            <option value="Albañilería">Albañilería</option>
                                            <option value="Pintura">Pintura</option>
                                            <option value="Carpintería">Carpintería</option>
                                        </select>
                                    </div>
                                </div>

                                {/* ARCHIVO INE DEL SUB-TÉCNICO */}
                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                                        Foto de INE (Identificación para Veracidad)
                                    </label>
                                    <input 
                                        type="file"
                                        accept="image/*"
                                        id={`miembro_ine_${idx}`}
                                        onChange={e => handleMiembroIneChange(idx, e.target.files?.[0] || null)}
                                        style={{ display: 'none' }}
                                    />
                                    <label 
                                        htmlFor={`miembro_ine_${idx}`}
                                        style={{
                                            border: '1px dashed #94a3b8',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            background: '#f8fafc',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '11px',
                                            color: m.inePreview ? '#059669' : '#64748b',
                                            fontWeight: '600'
                                        }}
                                    >
                                        {m.inePreview ? (
                                            <>
                                                <img src={m.inePreview} alt="INE Subtecnico" style={{ width: '36px', height: '24px', objectFit: 'cover', borderRadius: '4px' }} />
                                                ✓ INE adjunta (clic para cambiar)
                                            </>
                                        ) : (
                                            <>
                                                <HiOutlinePhoto size={16} /> Subir INE del técnico
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* MODAL FOOTER BUTTONS */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                padding: '10px 24px',
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
                            }}
                        >
                            <HiOutlineSparkles size={16} />
                            {isSubmitting ? 'Enviando Solicitud...' : '📤 Enviar Solicitud de Upgrade al Admin'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SolicitudProveedorModal;
