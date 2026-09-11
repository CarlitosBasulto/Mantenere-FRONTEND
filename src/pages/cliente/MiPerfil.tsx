import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import { isAutonomoAdmin } from "../../utils/roles";
import { getTrabajadores, updateTrabajador } from "../../services/trabajadoresService";
import { getUserById, updateUser } from "../../services/usersService";
import { getNegocios } from "../../services/negociosService";
import { HiOutlineCamera, HiOutlineUser, HiOutlineEye, HiOutlineEyeSlash, HiOutlinePhoto, HiXMark, HiOutlineBuildingOffice2, HiOutlineSparkles, HiOutlineGift, HiOutlineClock, HiOutlineExclamationTriangle } from "react-icons/hi2";
import api from "../../services/api";
import SolicitudProveedorModal from "../../components/modals/SolicitudProveedorModal";
import PagoTransferenciaModal from "../../components/modals/PagoTransferenciaModal";
import SolicitudPruebaGratisModal from "../../components/modals/SolicitudPruebaGratisModal";
import { getMiSolicitudProveedor } from "../../services/proveedorService";
import { getMiEstadoPago, type PruebaGratisInfo } from "../../services/pagoProveedorService";

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
    const [misNegocios, setMisNegocios] = useState<any[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);
    const [solicitudProveedor, setSolicitudProveedor] = useState<any>(null);
    const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
    const [isPruebaModalOpen, setIsPruebaModalOpen] = useState(false);
    const [pagoActual, setPagoActual] = useState<any>(null);
    const [esProveedorActivo, setEsProveedorActivo] = useState(false);
    const [pruebaInfo, setPruebaInfo] = useState<PruebaGratisInfo | null>(null);

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const profileKey = `profile_${user?.name?.replace(/\s+/g, '') || 'default'}`;

    const cargarEstadoPago = async () => {
        try {
            const data = await getMiEstadoPago();
            setPagoActual(data.ultimo_pago || data.pago);
            setEsProveedorActivo(data.es_proveedor);
            setPruebaInfo(data.prueba_info);
        } catch (e) {}
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            let adminData: Partial<UserProfile> = {};

            if (user?.role === 'tecnico' || user?.role === 'tecnico-autonomo' || user?.role === 'tecnico-proveedor' || user?.role === 'tecnico-cuadrilla') {
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
                cargarEstadoPago();
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
            if ((user?.role === 'tecnico' || user?.role === 'tecnico-autonomo' || user?.role === 'tecnico-proveedor' || user?.role === 'tecnico-cuadrilla') && workerId) {
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

    const isTechRole = user?.role === 'tecnico' || user?.role === 'tecnico-normal' || user?.role === 'tecnico-autonomo' || user?.role === 'tecnico-proveedor' || user?.role === 'tecnico-cuadrilla';
    const handleSubmit = handleSave;

    const getRoleLabel = (role?: string) => {
        switch(role) {
            case 'admin':
            case 'administrador-general':
                return 'Administrador';
            case 'autonomo':
            case 'admin-autonomo':
                return 'Admin Autónomo';
            case 'tecnico':
            case 'tecnico-normal':
                return 'Técnico';
            case 'tecnico-autonomo':
                return 'Técnico Autónomo';
            case 'tecnico-proveedor':
                return 'Técnico Pro-Veedor';
            case 'tecnico-cuadrilla':
                return 'Técnico Cuadrilla';
            case 'encargado':
            case 'gerente-sucursal':
                return 'Sub gerente';
            case 'cliente':
                return 'Cliente';
            default:
                return role || 'Usuario';
        }
    };

    const handleSucursalClick = (id: number) => {
        const basePath = user?.role === 'cliente' ? '/cliente' : (isTechRole ? '/tecnico' : (user?.role === 'encargado' ? '/encargado' : (isAutonomoAdmin(user?.role) ? '/autonomo' : '/menu')));
        navigate(`${basePath}/trabajo/${id}`);
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
                                width: '110px', height: '110px', borderRadius: '50%',
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
                                    <HiOutlineUser size={48} color="#94a3b8" />
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
                                        <HiOutlineCamera size={24} />
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
                                {getRoleLabel(user?.role)}
                            </p>
                            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                                Toca la foto para editarla
                            </p>
                        </div>
                    </div>

                    {/* BOTÓN GUARDAR */}
                    <button
                        type="button"
                        onClick={handleSave}
                        style={{
                            marginTop: '20px',
                            width: '100%',
                            padding: '12px',
                            background: 'linear-gradient(135deg, #f26522 0%, #ea580c 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            boxShadow: '0 8px 18px rgba(242,101,34,0.3)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(242,101,34,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 18px rgba(242,101,34,0.3)'; }}
                    >
                        Guardar Cambios
                    </button>

                    {/* TARJETA / BANNER: ¿QUIERES SER TÉCNICO PRO-VEEDOR? */}
                    {isTechRole && (
                        <div style={{
                            marginTop: '20px',
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            borderRadius: '20px',
                            padding: '20px',
                            color: '#ffffff',
                            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
                            border: '1px solid #334155'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <div style={{ background: '#f59e0b', padding: '6px', borderRadius: '10px', display: 'flex' }}>
                                    <HiOutlineSparkles size={18} color="#ffffff" />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#ffffff' }}>
                                        ¿Quieres ser Técnico Pro-Veedor?
                                    </h4>
                                    <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '800', textTransform: 'uppercase' }}>
                                        Membresía Premium • Red
                                    </span>
                                </div>
                            </div>

                            {esProveedorActivo || user?.role === 'tecnico-proveedor' ? (
                                <div style={{ marginTop: '10px' }}>
                                    {pruebaInfo?.es_prueba_gratis ? (
                                        <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', color: '#6ee7b7', padding: '12px 14px', borderRadius: '14px', border: '1px solid #047857', marginBottom: '12px', boxShadow: '0 4px 12px rgba(6, 78, 59, 0.3)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '13px', color: '#a7f3d0' }}>
                                                <HiOutlineGift size={18} color="#34d399" />
                                                <span>¡Prueba Gratuita de 6 Meses Activa!</span>
                                            </div>
                                            <div style={{ marginTop: '6px', fontSize: '11px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <HiOutlineClock size={15} color="#fbbf24" />
                                                <span>Te quedan: <strong style={{ color: '#fef08a' }}>{pruebaInfo.tiempo_restante_texto || `${pruebaInfo.dias_restantes} días`}</strong></span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ background: '#064e3b', color: '#6ee7b7', padding: '10px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', border: '1px solid #047857', marginBottom: '10px' }}>
                                            🌟 ¡Eres Técnico Pro-Veedor Activo!
                                        </div>
                                    )}
                                    <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#94a3b8' }}>
                                        Tienes acceso a tu Dashboard Pro-Veedor, puedes crear tu cuadrilla de técnicos y recibir asignaciones de la RED.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/tecnico-proveedor/dashboard')}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                        }}
                                    >
                                        Ir a mi Dashboard Pro-Veedor
                                    </button>
                                </div>
                            ) : pruebaInfo?.ha_expirado ? (
                                /* PRUEBA DE 6 MESES EXPIRADA -> MOSTRAR DATOS BANCARIOS ORIGINALES */
                                <div style={{ marginTop: '10px' }}>
                                    <div style={{ background: '#451a03', color: '#fdba74', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', border: '1px solid #9a3412', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <HiOutlineExclamationTriangle size={18} color="#f97316" />
                                            <span>Tu periodo de prueba de 6 meses ha finalizado</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#fed7aa', fontWeight: '500' }}>
                                            Para reactivar tu rango de Técnico Pro-Veedor y conservar tu cuadrilla, realiza tu pago por transferencia bancaria.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPagoModalOpen(true)}
                                        style={{
                                            width: '100%',
                                            padding: '11px',
                                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                                        }}
                                    >
                                        <HiOutlineSparkles size={16} /> Ver Datos Bancarios y Subir Comprobante ($1,499 MXN)
                                    </button>
                                </div>
                            ) : pagoActual?.estado === 'Pendiente' ? (
                                <div style={{ marginTop: '10px' }}>
                                    <div style={{ background: '#78350f', color: '#fde68a', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', border: '1px solid #b45309', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <HiOutlineClock size={16} color="#fbbf24" />
                                            <span>
                                                {pagoActual?.es_prueba_gratis
                                                    ? 'Solicitud de Prueba Gratis (6 Meses) en revisión'
                                                    : 'Comprobante de transferencia en revisión'}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#fef08a', fontWeight: '500' }}>
                                            El Administrador General validará tu solicitud para dar su visto bueno y activar tu acceso.
                                        </p>
                                    </div>
                                    {!pagoActual?.es_prueba_gratis && (
                                        <button
                                            type="button"
                                            onClick={() => setIsPagoModalOpen(true)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                background: '#334155',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Ver estado del comprobante
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ marginTop: '10px' }}>
                                    {pagoActual?.estado === 'Rechazado' && (
                                        <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '8px 10px', borderRadius: '8px', fontSize: '11px', marginBottom: '10px' }}>
                                            ⚠️ Solicitud previa rechazada. Motivo: {pagoActual.motivo_rechazo || 'Verifica tus datos.'}
                                        </div>
                                    )}

                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #059669', borderRadius: '10px', padding: '8px 10px', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <HiOutlineGift size={15} /> ¡Cortesía: 6 Meses Gratis para ti!
                                        </span>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '10.5px', color: '#94a3b8', lineHeight: '1.3' }}>
                                            Sin costo alguno. Administra tu propia cuadrilla a cargo, usa tu Dashboard Pro-Veedor y cotiza directamente a los administradores.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsPruebaModalOpen(true)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                                            transition: 'transform 0.2s ease'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <HiOutlineGift size={18} /> Iniciar Prueba Gratis (6 Meses)
                                    </button>

                                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            onClick={() => setIsPagoModalOpen(true)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#64748b',
                                                fontSize: '10.5px',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                padding: '4px'
                                            }}
                                        >
                                            ¿Prefieres pago directo por transferencia? Ver datos bancarios
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* ── COLUMNA DERECHA: Formularios ── */}
                <div className="perfil-right-column">

                    {/* TARJETA UNIFICADA DE INFORMACIÓN */}
                    <div className="perfil-card">
                        {/* DATOS DE CONTACTO */}
                        <p style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                            📋 Datos de contacto
                        </p>
                        <div className="perfil-grid" style={{ marginBottom: user?.role !== 'tecnico' ? '16px' : '0' }}>
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
                                        {showPassword ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <Label>Teléfono de Contacto</Label>
                                <Input name="telefono" value={formData.telefono} onChange={handleChange} />
                            </div>
                        </div>

                        {/* DATOS FISCALES (solo si no es técnico) */}
                        {user?.role !== 'tecnico' && (
                            <>
                                <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', margin: '20px 0' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                        🧾 Información Fiscal (Facturación)
                                    </p>
                                    <span style={{ fontSize: '10px', background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: '8px', fontWeight: 'bold' }}>
                                        Solo dueños
                                    </span>
                                </div>
                                <div className="perfil-grid">
                                    <div>
                                        <Label>RFC</Label>
                                        <Input name="rfc" placeholder="Ej: ABC123456XYZ" value={formData.rfc} onChange={handleChange} />
                                    </div>
                                    <div>
                                        <Label>Razón Social</Label>
                                        <Input name="razonSocial" placeholder="Nombre Legal de la Empresa" value={formData.razonSocial} onChange={handleChange} />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <Label>Dirección Fiscal Completa</Label>
                                        <Input name="direccionFiscal" placeholder="Calle, Número, Colonia, CP, Mérida, Yucatán" value={formData.direccionFiscal} onChange={handleChange} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                </div>
            </div>

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
                    padding: 24px 20px 120px 20px;
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                    box-sizing: border-box;
                }
                .perfil-flex-container {
                    max-width: 100%;
                    margin: 0 auto;
                    display: flex;
                    gap: 24px;
                    align-items: stretch;
                }
                .perfil-left-column {
                    width: 250px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 16px;
                    box-sizing: border-box;
                }
                .perfil-right-column {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    min-width: 0;
                    box-sizing: border-box;
                }
                .perfil-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .perfil-card {
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 24px 28px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    border: 2.5px solid #cbd5e1;
                    box-sizing: border-box;
                }
                .perfil-avatar-card {
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 24px 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                    border: 2.5px solid #cbd5e1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    text-align: center;
                    box-sizing: border-box;
                }
                .perfil-sucursales-container {
                    max-width: 100%;
                    margin: 28px auto 0;
                    width: 100%;
                }
                .perfil-sucursales-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin: 0 0 12px;
                }
                .perfil-sucursales-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 20px;
                }
                .perfil-sucursal-card-new {
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 16px 20px;
                    border: 2.5px solid #cbd5e1;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
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
                    gap: 10px;
                }
                .perfil-sucursal-card-new .card-header h3 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 800;
                    color: #0f172a;
                    line-height: 1.3;
                }
                .perfil-sucursal-card-new .type-badge {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 6px;
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
                    font-size: 11px;
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
                    font-size: 10px;
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
                        padding: 12px 10px 120px 10px;
                    }
                    .perfil-flex-container {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 16px;
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
                }
                `}
            </style>

            <SolicitudProveedorModal
                isOpen={isProveedorModalOpen}
                onClose={() => setIsProveedorModalOpen(false)}
                onSuccess={() => {
                    if (user?.role === 'tecnico') {
                        getMiSolicitudProveedor().then(data => setSolicitudProveedor(data)).catch(() => {});
                    }
                }}
            />

            <PagoTransferenciaModal
                isOpen={isPagoModalOpen}
                onClose={() => setIsPagoModalOpen(false)}
                initialPago={pagoActual}
                initialEsProveedor={esProveedorActivo}
                onSuccess={() => {
                    cargarEstadoPago();
                }}
            />

            <SolicitudPruebaGratisModal
                isOpen={isPruebaModalOpen}
                onClose={() => setIsPruebaModalOpen(false)}
                initialNombre={user?.name || ''}
                initialTelefono={formData.telefono || ''}
                onSuccess={() => {
                    cargarEstadoPago();
                }}
            />
        </div>
    );
};

// ─── Sub-componentes reutilizables ───────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
        {children}
    </label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        style={{
            width: '100%', boxSizing: 'border-box', padding: '12px 16px',
            background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '12px',
            fontSize: '14px', color: '#1e293b', fontWeight: '500', outline: 'none',
            transition: 'border-color 0.2s ease',
            ...props.style
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#fff'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; if (props.disabled) e.currentTarget.style.background = '#f5f5f5'; }}
    />
);

export default MiPerfil;
