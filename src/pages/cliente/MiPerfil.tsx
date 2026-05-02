import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { getTrabajadores, updateTrabajador } from "../../services/trabajadoresService";
import { getUserById, updateUser } from "../../services/usersService";
import { getNegocios } from "../../services/negociosService";
import { HiOutlineCamera, HiOutlineUser, HiOutlineEye, HiOutlineEyeSlash, HiOutlinePhoto, HiXMark } from "react-icons/hi2";
import api from "../../services/api";

interface UserProfile {
    nombre: string;
    email: string;
    telefono: string;
    password?: string;
    imagenPerfil?: string;
    rfc?: string;
    razonSocial?: string;
    direccionFiscal?: string;
    empresa?: string;
}

const MiPerfil: React.FC = () => {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    const { showAlert } = useModal();

    const [formData, setFormData] = useState<UserProfile>({
        nombre: user?.name || "",
        email: "",
        password: "",
        telefono: "",
        rfc: "",
        razonSocial: "",
        direccionFiscal: "",
        empresa: ""
    });

    const [workerId, setWorkerId] = useState<number | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const profileKey = `profile_${user?.name?.replace(/\s+/g, '') || 'default'}`;

    useEffect(() => {
        const fetchInitialData = async () => {
            let adminData: Partial<UserProfile> = {};

            if (user?.role === 'tecnico') {
                try {
                    const data = await getTrabajadores();
                    const worker = data.find((w: any) =>
                        w.correo === user.email || w.nombre === user.name || w.user_id === user.id
                    );
                    if (worker) {
                        setWorkerId(worker.id);
                        adminData = {
                            nombre: worker.nombre,
                            email: worker.correo || "",
                            telefono: worker.telefono || "",
                            imagenPerfil: worker.avatar || ""
                        };
                    }
                } catch (err) {
                    console.error("Error fetching worker data:", err);
                }
            } else if (user?.id) {
                try {
                    const userData = await getUserById(user.id);
                    if (userData) {
                        adminData = {
                            nombre: userData.name,
                            email: userData.email,
                            telefono: userData.telefono || "",
                            rfc: userData.rfc || "",
                            razonSocial: userData.razon_social || "",
                            direccionFiscal: userData.direccion_fiscal || "",
                            imagenPerfil: userData.avatar || ""
                        };
                        try {
                            const negocios = await getNegocios();
                            const myNegocios = negocios.filter((n: any) => Number(n.user_id) === Number(user.id));
                            if (myNegocios.length > 0) adminData.empresa = myNegocios[0].nombre;
                        } catch (err) { /* sin negocios */ }
                    }
                } catch (err) {
                    console.error("Error fetching user data:", err);
                }
            }

            const storedWorkers = localStorage.getItem('trabajadores_list');
            if (!adminData.nombre && storedWorkers) {
                const workers = JSON.parse(storedWorkers);
                const worker = workers.find((w: any) => w.nombre === user?.name);
                if (worker) {
                    adminData = {
                        nombre: worker.nombre,
                        email: worker.correo || "",
                        telefono: worker.telefono || "",
                        imagenPerfil: worker.avatar || ""
                    };
                }
            }

            const stored = localStorage.getItem(profileKey);
            if (stored) {
                const localData = JSON.parse(stored);
                setFormData({ ...adminData, ...localData, empresa: adminData.empresa || localData.empresa || "" });
            } else if (Object.keys(adminData).length > 0) {
                setFormData(prev => ({ ...prev, ...adminData }));
            }
        };

        fetchInitialData();
    }, [profileKey, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Comprime la imagen antes de guardarla para no saturar la DB
    const compressImage = (file: File, maxWidth = 400, quality = 0.75): Promise<string> => {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = Math.min(1, maxWidth / img.width);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = ev.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            setShowPhotoModal(false);
            try {
                // Comprimir la imagen antes de subirla
                const compressedBase64 = await compressImage(file, 800, 0.8);
                
                // Convertir base64 a File real para enviarlo
                const res = await fetch(compressedBase64);
                const blob = await res.blob();
                const compressedFile = new File([blob], file.name || 'foto_perfil.jpg', { type: 'image/jpeg' });
                
                const form = new FormData();
                form.append("foto", compressedFile);
                
                const response = await api.post('/upload-imagen', form, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                if (response.data && response.data.url) {
                    setFormData(prev => ({ ...prev, imagenPerfil: response.data.url }));
                    showAlert("Éxito", "Foto subida correctamente", "success");
                }
            } catch (error) {
                console.error("Error subiendo imagen:", error);
                showAlert("Error", "No se pudo subir la imagen al servidor", "error");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSave = async () => {
        if (!formData.nombre) {
            showAlert("Campo Requerido", "El nombre es obligatorio", "warning");
            return;
        }

        if (formData.password && formData.password.trim() !== '') {
            if (formData.password.length < 6) {
                showAlert("Contraseña Corta", "La contraseña debe tener al menos 6 caracteres", "warning");
                return;
            }
        }

        try {
            if (user?.role === 'tecnico' && workerId) {
                const updateData: any = {
                    nombre: formData.nombre,
                    correo: formData.email,
                    telefono: formData.telefono,
                };
                if (formData.imagenPerfil) updateData.avatar = formData.imagenPerfil;
                await updateTrabajador(workerId, updateData);
            }

            if (user?.id) {
                const userUpdateData: any = {
                    name: formData.nombre || user.name,
                    email: formData.email || user.email,
                };
                if (formData.password && formData.password.trim() !== '') {
                    userUpdateData.password = formData.password;
                }
                if (formData.telefono) userUpdateData.telefono = formData.telefono;
                if (formData.rfc) userUpdateData.rfc = formData.rfc;
                if (formData.razonSocial) userUpdateData.razon_social = formData.razonSocial;
                if (formData.direccionFiscal) userUpdateData.direccion_fiscal = formData.direccionFiscal;
                if (formData.imagenPerfil) userUpdateData.avatar = formData.imagenPerfil;

                await updateUser(user.id, userUpdateData);
                login({ ...user, name: userUpdateData.name || user.name, avatar: userUpdateData.avatar || user.avatar });
            }

            localStorage.setItem(profileKey, JSON.stringify(formData));
            showAlert("Éxito", "Perfil actualizado correctamente", "success");
            navigate(-1);
        } catch (error) {
            console.error("Error al guardar perfil:", error);
            showAlert("Error al Guardar", "No se pudo sincronizar con el servidor. Verifica tu conexión.", "error");
        }
    };

    return (
        <div style={{ padding: '30px', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>

                {/* ── HEADER ── */}
                <div style={{
                    background: '#ffffff', borderRadius: '28px', padding: '36px 40px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
                    marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '28px'
                }}>
                    {/* Avatar clicable con overlay de cámara */}
                    <div
                        onClick={() => setShowPhotoModal(true)}
                        title="Toca para cambiar tu foto"
                        style={{
                            position: 'relative', flexShrink: 0, cursor: isUploading ? 'wait' : 'pointer',
                            width: '110px', height: '110px', borderRadius: '24px',
                            overflow: 'hidden',
                            border: '3px solid #fff', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={e => {
                            if (isUploading) return;
                            const overlay = e.currentTarget.querySelector('.cam-overlay') as HTMLElement;
                            if (overlay) overlay.style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                            const overlay = e.currentTarget.querySelector('.cam-overlay') as HTMLElement;
                            if (overlay) overlay.style.opacity = '0';
                        }}
                    >
                        {/* Imagen o ícono */}
                        {formData.imagenPerfil
                            ? <img src={formData.imagenPerfil} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isUploading ? 0.5 : 1 }} />
                            : <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isUploading ? 0.5 : 1 }}>
                                <HiOutlineUser size={52} color="#94a3b8" />
                              </div>
                        }

                        {/* Overlay oscuro con ícono de cámara */}
                        <div className="cam-overlay" style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '4px',
                            opacity: isUploading ? 1 : 0, transition: 'opacity 0.2s ease', color: 'white'
                        }}>
                            {isUploading ? (
                                <span style={{ fontSize: '11px', fontWeight: '700' }}>SUBIENDO...</span>
                            ) : (
                                <>
                                    <HiOutlineCamera size={26} />
                                    <span style={{ fontSize: '10px', fontWeight: '700' }}>CAMBIAR</span>
                                </>
                            )}
                        </div>

                        {/* Inputs Ocultos */}
                        <input
                            type="file"
                            accept="image/*"
                            capture="user"
                            ref={cameraInputRef}
                            style={{ display: 'none' }}
                            onChange={handleImageSelection}
                        />
                        <input
                            type="file"
                            accept="image/*"
                            ref={galleryInputRef}
                            style={{ display: 'none' }}
                            onChange={handleImageSelection}
                        />
                    </div>

                    <div>
                        <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>
                            Mi Perfil
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Información Personal
                        </p>
                        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                            Toca la cámara 📷 para cambiar tu foto
                        </p>
                    </div>
                </div>

                {/* ── DATOS PERSONALES ── */}
                <div style={{
                    background: '#ffffff', borderRadius: '24px', padding: '32px 36px',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginBottom: '20px'
                }}>
                    <p style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 22px' }}>
                        📋 Datos de contacto
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>

                        <div style={{ gridColumn: user?.role === 'tecnico' ? 'span 2' : 'span 1' }}>
                            <Label>Nombre Completo</Label>
                            <Input name="nombre" value={formData.nombre} onChange={handleChange} />
                        </div>

                        {user?.role !== 'tecnico' && (
                            <div title="Se llena automáticamente con tu primer negocio">
                                <Label>Empresa Principal</Label>
                                <Input name="empresa" value={formData.empresa} onChange={handleChange} disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} placeholder="Sin sucursales aún" />
                            </div>
                        )}

                        <div>
                            <Label>Correo Electrónico</Label>
                            <Input type="email" name="email" value={formData.email} onChange={handleChange} />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Label>Contraseña (Opcional)</Label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Input 
                                    type={showPassword ? "text" : "password"} 
                                    name="password" 
                                    value={formData.password || ''} 
                                    onChange={handleChange} 
                                    placeholder="••••••••"
                                    style={{ paddingRight: '40px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0
                                    }}
                                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showPassword ? <HiOutlineEyeSlash size={20} /> : <HiOutlineEye size={20} />}
                                </button>
                            </div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <Label>Teléfono de Contacto</Label>
                            <Input name="telefono" value={formData.telefono} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                {/* ── DATOS FISCALES (solo clientes) ── */}
                {user?.role !== 'tecnico' && (
                    <div style={{
                        background: '#ffffff', borderRadius: '24px', padding: '32px 36px',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
                            <p style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                🧾 Información Fiscal (Facturación)
                            </p>
                            <span style={{ fontSize: '11px', background: '#e3f2fd', color: '#1565c0', padding: '3px 10px', borderRadius: '10px', fontWeight: 'bold' }}>
                                Solo dueños
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                            <div>
                                <Label>RFC</Label>
                                <Input name="rfc" placeholder="Ej: ABC123456XYZ" value={formData.rfc} onChange={handleChange} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <Label>Razón Social</Label>
                                <Input name="razonSocial" placeholder="Nombre Legal de la Empresa" value={formData.razonSocial} onChange={handleChange} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <Label>Dirección Fiscal Completa</Label>
                                <Input name="direccionFiscal" placeholder="Calle, Número, Colonia, CP, Mérida, Yucatán" value={formData.direccionFiscal} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── BOTÓN GUARDAR ── */}
                <button
                    onClick={handleSave}
                    style={{
                        width: '100%', padding: '18px', background: 'linear-gradient(135deg, #f9ab0f, #f59e0b)',
                        color: 'white', border: 'none', borderRadius: '20px', fontSize: '16px',
                        fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 20px rgba(249,171,15,0.3)',
                        transition: 'all 0.3s ease', marginBottom: '40px'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(249,171,15,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(249,171,15,0.3)'; }}
                >
                    Guardar Cambios
                </button>
            </div>

            {/* Modal de Selección de Foto */}
            {showPhotoModal && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px',
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setShowPhotoModal(false)}>
                    
                    <div style={{
                        background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '24px',
                        padding: '24px', paddingBottom: '32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} onClick={e => e.stopPropagation()}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Actualizar Foto</h3>
                            <button onClick={() => setShowPhotoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <HiXMark size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
                                    fontSize: '15px', fontWeight: '700', color: '#1e293b', cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                            >
                                <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                                    <HiOutlineCamera size={22} />
                                </div>
                                Tomar Fotografía
                            </button>

                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
                                    fontSize: '15px', fontWeight: '700', color: '#1e293b', cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                            >
                                <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                                    <HiOutlinePhoto size={22} />
                                </div>
                                Subir de la Galería
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>
                {`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};

// ─── Sub-componentes reutilizables ───────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>
        {children}
    </label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        style={{
            width: '100%', boxSizing: 'border-box', padding: '13px 16px',
            background: '#f8fafc', border: '1.5px solid #f1f5f9', borderRadius: '14px',
            fontSize: '14px', color: '#1e293b', fontWeight: '500', outline: 'none',
            transition: 'border-color 0.2s ease',
            ...props.style
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#f8fafc'; if (props.disabled) e.currentTarget.style.background = '#f5f5f5'; }}
    />
);

export default MiPerfil;
