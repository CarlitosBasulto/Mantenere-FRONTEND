import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useModal } from "../../../context/ModalContext";
import { isAutonomoAdmin } from "../../../utils/roles";
import { getTrabajadores, updateTrabajador } from "../../../services/trabajadoresService";
import { getUserById, updateUser } from "../../../services/usersService";
import { getNegocios } from "../../../services/negociosService";
import { HiOutlineCamera, HiOutlineUser, HiOutlineEye, HiOutlineEyeSlash, HiOutlinePhoto, HiXMark } from "react-icons/hi2";
import api from "../../../services/api";
import { getGerenteGeneral, asignarGerenteGeneral } from "../../../services/adminAutonomoService";

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
    cv_url?: string;
}

const MiPerfil: React.FC = () => {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    const { showAlert, showConfirm } = useModal();

    const [formData, setFormData] = useState<UserProfile>({
        nombre: user?.name || "",
        email: "",
        password: "",
        telefono: "",
        rfc: "",
        razonSocial: "",
        direccionFiscal: "",
        empresa: "",
        cv_url: ""
    });

    const [gerenteData, setGerenteData] = useState({
        nombre: "",
        apellidos: "",
        email: "",
        password: ""
    });

    const cvInputRef = useRef<HTMLInputElement>(null);

    const [workerId, setWorkerId] = useState<number | null>(null);
    const [misNegocios, setMisNegocios] = useState<any[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [hasGerente, setHasGerente] = useState(false);

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
                            imagenPerfil: userData.avatar || "",
                            cv_url: userData.cv_url || ""
                        };
                        try {
                            const negocios = await getNegocios();
                            const myNegocios = negocios.filter((n: any) => {
                                const isOwner = Number(n.user_id) === Number(user.id) || 
                                                (n.encargado && user.name && n.encargado === user.name) ||
                                                (n.dueno && user.name && n.dueno === user.name);
                                const isEncargado = user.role === 'encargado' && Number(n.id) === Number(user.negocio_id);
                                return isOwner || isEncargado;
                            });
                            if (myNegocios.length > 0) adminData.empresa = myNegocios[0].nombre;
                            setMisNegocios(myNegocios);
                        } catch (err) {
                            console.error("Error fetching negocios in MiPerfil:", err);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching user data:", err);
                }

                if (user.role === 'autonomo') {
                    try {
                        const gerenteRes = await getGerenteGeneral();
                        if (gerenteRes.gerente) {
                            const nameParts = gerenteRes.gerente.name.split(' ');
                            const nombre = nameParts[0] || '';
                            const apellidos = nameParts.slice(1).join(' ') || '';
                            setGerenteData({
                                nombre: nombre,
                                apellidos: apellidos,
                                email: gerenteRes.gerente.email,
                                password: ""
                            });
                            setHasGerente(true);
                        }
                    } catch (err) {
                        console.error("Error fetching gerente general:", err);
                    }
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

    const handleGerenteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setGerenteData(prev => ({ ...prev, [name]: value }));
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
                    const newAvatar = response.data.url;
                    setFormData(prev => ({ ...prev, imagenPerfil: newAvatar }));
                    
                    // Auto-guardar en la base de datos
                    if (user?.id) {
                        try {
                            await updateUser(user.id, { avatar: newAvatar });
                            login({ ...user, avatar: newAvatar });
                        } catch (e) {
                            console.error("Error auto-guardando avatar:", e);
                        }
                    }
                    
                    showAlert("Éxito", "Foto subida y guardada correctamente", "success");
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
                if (formData.cv_url) userUpdateData.cv_url = formData.cv_url;

                await updateUser(user.id, userUpdateData);
                login({ 
                    ...user, 
                    name: userUpdateData.name || user.name, 
                    avatar: userUpdateData.avatar || user.avatar,
                    cv_url: userUpdateData.cv_url || user.cv_url
                });
                showAlert("Éxito", "Perfil actualizado correctamente.", "success");
            }
            localStorage.setItem(profileKey, JSON.stringify(formData));
            navigate(-1);
        } catch (error) {
            console.error(error);
            showAlert("Error", "No se pudo actualizar el perfil", "error");
        }
    };

    const handleGuardarGerente = () => {
        if (!gerenteData.nombre.trim() || !gerenteData.apellidos.trim() || !gerenteData.email.trim()) {
            showAlert("Campos Incompletos", "Por favor llena nombre, apellidos y correo del gerente.", "warning");
            return;
        }
        if (gerenteData.password && gerenteData.password.length < 8) {
            showAlert("Contraseña Corta", "La contraseña del gerente debe tener al menos 8 caracteres.", "warning");
            return;
        }

        showConfirm(
            "Asignar Gerente",
            "¿Estás seguro de que deseas guardar los datos de este encargado?",
            async () => {
                try {
                    const fullGerenteName = `${gerenteData.nombre.trim()} ${gerenteData.apellidos.trim()}`;
                    await asignarGerenteGeneral({
                        name: fullGerenteName,
                        email: gerenteData.email,
                        password: gerenteData.password || 'Mantenere123.' 
                    });
                    setHasGerente(true);
                    showAlert("Éxito", "Encargado asignado correctamente.", "success");
                } catch (error) {
                    console.error(error);
                    showAlert("Error", "Ocurrió un error al asignar el gerente. Puede que el correo ya esté en uso.", "error");
                }
            }
        );
    };

    const handleSucursalClick = (id: number) => {
        const basePath = user?.role === 'cliente' ? '/cliente' : (user?.role === 'tecnico' ? '/tecnico' : (user?.role === 'encargado' ? '/encargado' : (isAutonomoAdmin(user?.role) ? '/autonomo' : '/menu')));
        navigate(`${basePath}/trabajo/${id}`);
    };

    const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            showAlert("Error", "Por favor selecciona un archivo PDF.", "error");
            return;
        }

        setIsUploading(true);
        try {
            const form = new FormData();
            form.append("foto", file);

            const response = await api.post('/upload-imagen', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data && response.data.url) {
                const uploadedUrl = response.data.url;
                setFormData(prev => ({ ...prev, cv_url: uploadedUrl }));
                
                // Auto-guardar en base de datos si el usuario existe
                if (user?.id) {
                    try {
                        await updateUser(user.id, { cv_url: uploadedUrl });
                        login({ ...user, cv_url: uploadedUrl });
                    } catch (e) {
                        console.error("Error auto-guardando CV:", e);
                    }
                }
                
                showAlert("Éxito", "Currículum subido y actualizado correctamente.", "success");
            }
        } catch (error) {
            console.error("Error al subir CV:", error);
            showAlert("Error", "No se pudo subir el archivo.", "error");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="perfil-outer-container">
            <div className="perfil-flex-container">

                {/* ── COLUMNA IZQUIERDA: Avatar + Botón ── */}
                <div className="perfil-left-column">

                    {/* TARJETA DE AVATAR */}
                    <div className="perfil-avatar-card">
                        {/* Avatar clicable */}
                        <div
                            onClick={() => setShowPhotoModal(true)}
                            title="Toca para cambiar tu foto"
                            style={{
                                position: 'relative', cursor: isUploading ? 'wait' : 'pointer',
                                width: '120px', height: '120px', borderRadius: '50%',
                                overflow: 'hidden',
                                border: '4px solid #fff', boxShadow: '0 6px 18px rgba(0,0,0,0.12)'
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
                            {formData.imagenPerfil
                                ? <img src={formData.imagenPerfil} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isUploading ? 0.5 : 1 }} />
                                : <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isUploading ? 0.5 : 1 }}>
                                    <HiOutlineUser size={52} color="#94a3b8" />
                                </div>
                            }
                            {/* Overlay de cámara */}
                            <div className="cam-overlay" style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.45)',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: '4px',
                                opacity: isUploading ? 1 : 0, transition: 'opacity 0.2s ease', color: 'white',
                                borderRadius: '50%'
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
                            <input type="file" accept="image/*" capture="user" ref={cameraInputRef}
                                style={{ display: 'none' }} onChange={handleImageSelection} />
                            <input type="file" accept="image/*" ref={galleryInputRef}
                                style={{ display: 'none' }} onChange={handleImageSelection} />
                        </div>

                        <div>
                            <h1 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '800', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '210px' }}>
                                {formData.nombre || 'Mi Perfil'}
                            </h1>
                            <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#f26522', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {user?.role === 'admin' ? 'Administrador' : user?.role === 'tecnico' ? 'Técnico' : user?.role === 'encargado' ? 'Encargado de Sucursal' : (user?.role === 'autonomo' || user?.role === 'admin-autonomo') ? 'Admin Autónomo' : user?.role === 'gerente-general' ? 'Encargado' : 'Cliente'}
                            </p>
                            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                                Toca la foto para editarla
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── COLUMNA DERECHA: Formularios ── */}
                <div className="perfil-right-column">

                    {/* DATOS DE CONTACTO */}
                    <div className="perfil-card">
                        <p style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 20px' }}>
                            📋 Datos de contacto
                        </p>
                        <div className="perfil-grid">

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
                                            position: 'absolute', right: '12px', background: 'transparent',
                                            border: 'none', cursor: 'pointer', color: '#64748b',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
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

                    {/* CARGA DE CURRÍCULUM (Solo Autonomo) */}
                    {user?.role === 'autonomo' && (
                        <div className="perfil-card" style={{ marginTop: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <p style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                    📄 Currículum Corporativo (PDF)
                                </p>
                            </div>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                                Sube el CV de la empresa. Este archivo estará disponible en el menú lateral para clientes, gerentes y técnicos.
                            </p>
                            
                            <input
                                type="file"
                                accept="application/pdf"
                                ref={cvInputRef}
                                style={{ display: "none" }}
                                onChange={handleCvUpload}
                            />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button
                                    onClick={() => cvInputRef.current?.click()}
                                    disabled={isUploading}
                                    style={{
                                        padding: '10px 20px', background: '#f26522', color: '#fff',
                                        border: 'none', borderRadius: '10px', fontSize: '14px',
                                        fontWeight: '600', cursor: isUploading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
                                        opacity: isUploading ? 0.7 : 1
                                    }}
                                >
                                    {isUploading ? 'Subiendo...' : 'Subir Archivo PDF'}
                                </button>
                                
                                {formData.cv_url && (
                                    <a href={formData.cv_url} target="_blank" rel="noreferrer" style={{ fontSize: '14px', color: '#f26522', textDecoration: 'underline' }}>
                                        Ver Archivo Actual
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* DATOS FISCALES (solo clientes o admin-autonomo) */}
            {(user?.role === 'cliente' || user?.role === 'autonomo') && (
                <div className="perfil-fiscal-container">
                    <div className="perfil-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <p style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                🧾 Información Fiscal (Facturación)
                            </p>
                            <span style={{ fontSize: '11px', background: '#e3f2fd', color: '#1565c0', padding: '3px 10px', borderRadius: '10px', fontWeight: 'bold' }}>
                                Solo dueños
                            </span>
                        </div>
                        <div className="perfil-grid">
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
                </div>
            )}

            {/* GERENTE GENERAL (solo admin-autonomo) */}
            {user?.role === 'autonomo' && (
                <div className="perfil-fiscal-container">
                    <div className="perfil-card" style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <p style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                👨‍💼 Encargado (Mano Derecha) {hasGerente && <span style={{ color: '#16a34a', marginLeft: '5px' }}>✓ Asignado</span>}
                            </p>
                            <span style={{ fontSize: '11px', background: '#e3f2fd', color: '#1565c0', padding: '3px 10px', borderRadius: '10px', fontWeight: 'bold' }}>
                                Acceso total
                            </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                            Asigna un gerente que tendrá los mismos permisos que tú para gestionar sucursales, técnicos y trabajos, pero no podrá ver ni modificar tu información fiscal ni tu perfil.
                        </p>
                        <div className="perfil-grid">
                            <div>
                                <Label>Nombre(s)</Label>
                                <Input name="nombre" placeholder="Nombre(s) del gerente" value={gerenteData.nombre} onChange={handleGerenteChange} />
                            </div>
                            <div>
                                <Label>Apellidos</Label>
                                <Input name="apellidos" placeholder="Apellidos del gerente" value={gerenteData.apellidos} onChange={handleGerenteChange} />
                            </div>
                            <div>
                                <Label>Correo Electrónico</Label>
                                <Input name="email" type="email" placeholder="correo@ejemplo.com" value={gerenteData.email} onChange={handleGerenteChange} />
                            </div>
                            <div>
                                <Label>Contraseña</Label>
                                <Input name="password" type="password" placeholder="Opcional (Mín. 8 caracteres)" value={gerenteData.password} onChange={handleGerenteChange} />
                            </div>
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleGuardarGerente}
                                style={{
                                    padding: '12px 24px', background: '#e0e7ff', color: '#4f46e5',
                                    border: 'none', borderRadius: '12px', fontSize: '14px',
                                    fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#c7d2fe'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#e0e7ff'; }}
                            >
                                {hasGerente ? 'Actualizar Gerente' : 'Asignar Gerente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MIS SUCURSALES (en cuadrícula responsiva a lo ancho) */}
            {misNegocios.length > 0 && (
                <div className="perfil-sucursales-container">
                    <p className="perfil-sucursales-title">
                        🏢 Mis Sucursales
                    </p>
                    <div className="perfil-sucursales-grid">
                        {misNegocios.map((neg: any) => {
                            const ubicacion = neg.tipo === 'W/M'
                                ? [neg.calleAv, neg.manzana ? `Mza ${neg.manzana}` : '', neg.lote ? `Lote ${neg.lote}` : ''].filter(Boolean).join(', ')
                                : [neg.tipo !== 'FS' && neg.nombrePlaza ? `${neg.nombrePlaza}` : '', neg.calle, neg.numero ? `#${neg.numero}` : '', neg.colonia].filter(Boolean).join(', ');
                            const estadoCiudad = [neg.ciudad, neg.estado].filter(Boolean).join(', ');
                            return (
                                <div 
                                    key={neg.id} 
                                    className="perfil-sucursal-card-new"
                                    onClick={() => handleSucursalClick(neg.id)}
                                >
                                    <div className="card-header">
                                        <h3>{neg.nombre}</h3>
                                        <span className={`type-badge badge-${neg.tipo?.toLowerCase()}`}>
                                            {neg.tipo}
                                        </span>
                                    </div>
                                    <div className="card-body">
                                        {ubicacion && (
                                            <p className="address-line">
                                                <span className="pin-icon">📍</span> {ubicacion}
                                            </p>
                                        )}
                                        {estadoCiudad && (
                                            <p className="city-line">
                                                {estadoCiudad}{neg.cp ? ` · CP ${neg.cp}` : ''}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* BOTÓN GUARDAR GENERAL (AL FINAL) */}
            <div style={{ maxWidth: '1100px', margin: '32px auto 0', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSave}
                    style={{
                        width: '100%', maxWidth: '300px', padding: '16px', background: 'linear-gradient(135deg, #f26522, #ff8c42)',
                        color: 'white', border: 'none', borderRadius: '18px', fontSize: '15px',
                        fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 18px rgba(242,101,34,0.3)',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(242,101,34,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 18px rgba(242,101,34,0.3)'; }}
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
                .perfil-outer-container {
                    padding: 24px 30px;
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                }
                .perfil-flex-container {
                    max-width: 1100px;
                    margin: 0 auto;
                    display: flex;
                    gap: 24px;
                    align-items: flex-start;
                }
                .perfil-left-column {
                    width: 260px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .perfil-right-column {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    min-width: 0;
                }
                .perfil-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .perfil-fiscal-container {
                    max-width: 1100px;
                    margin: 24px auto 0;
                    width: 100%;
                }
                .perfil-card {
                    background: #ffffff;
                    border-radius: 24px;
                    padding: 28px 30px;
                    box-shadow: 0 6px 20px rgba(0,0,0,0.04);
                    border: 1.5px solid #cbd5e1;
                }
                .perfil-avatar-card {
                    background: #ffffff;
                    border-radius: 24px;
                    padding: 28px 24px;
                    box-shadow: 0 6px 20px rgba(0,0,0,0.06);
                    border: 1.5px solid #cbd5e1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    text-align: center;
                }
                .perfil-sucursales-container {
                    max-width: 1100px;
                    margin: 32px auto 0;
                    width: 100%;
                }
                .perfil-sucursales-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin: 0 0 16px;
                }
                .perfil-sucursales-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 20px;
                }
                .perfil-sucursal-card-new {
                    background: #ffffff;
                    border-radius: 20px;
                    padding: 20px 24px;
                    border: 1.5px solid #cbd5e1;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    text-align: left;
                }
                .perfil-sucursal-card-new:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
                    border-color: #f26522;
                }
                .perfil-sucursal-card-new .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 12px;
                }
                .perfil-sucursal-card-new .card-header h3 {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.3;
                }
                .perfil-sucursal-card-new .type-badge {
                    font-size: 11px;
                    font-weight: 700;
                    padding: 3px 10px;
                    border-radius: 8px;
                    flex-shrink: 0;
                    text-transform: uppercase;
                }
                .perfil-sucursal-card-new .badge-fs {
                    background: rgba(59,130,246,0.1);
                    color: #3b82f6;
                }
                .perfil-sucursal-card-new .badge-fc {
                    background: rgba(242,101,34,0.1);
                    color: #f26522;
                }
                .perfil-sucursal-card-new .badge-wm {
                    background: rgba(16,185,129,0.1);
                    color: #10b981;
                }
                .perfil-sucursal-card-new .badge-other {
                    background: rgba(139,92,246,0.1);
                    color: #8b5cf6;
                }
                .perfil-sucursal-card-new .card-body {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .perfil-sucursal-card-new .address-line {
                    margin: 0;
                    font-size: 12px;
                    color: #475569;
                    line-height: 1.4;
                    font-weight: 500;
                }
                .perfil-sucursal-card-new .pin-icon {
                    margin-right: 4px;
                    display: inline-block;
                }
                .perfil-sucursal-card-new .city-line {
                    margin: 0;
                    font-size: 11px;
                    color: #94a3b8;
                    font-weight: 600;
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @media (max-width: 768px) {
                    .perfil-outer-container {
                        padding: 16px 12px 100px 12px;
                    }
                    .perfil-flex-container {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 20px;
                    }
                    .perfil-left-column {
                        width: 100% !important;
                    }
                    .perfil-right-column {
                        width: 100% !important;
                    }
                    .perfil-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .perfil-grid > div {
                        grid-column: span 1 !important;
                    }
                    .perfil-fiscal-container {
                        margin: 20px auto 0;
                        width: 100%;
                    }
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
            background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '14px',
            fontSize: '14px', color: '#1e293b', fontWeight: '500', outline: 'none',
            transition: 'border-color 0.2s ease',
            ...props.style
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; if (props.disabled) e.currentTarget.style.background = '#f5f5f5'; }}
    />
);

export default MiPerfil;
