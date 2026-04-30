import React, { useEffect, useState, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import styles from "./Menu.module.css";
// Asegúrate de que la ruta al logo sea correcta
import logo from "../assets/imagenes/logo-agente-business.png";
import { useAuth } from "../context/AuthContext";
import { 
    HiOutlineUser, HiOutlineBell, HiOutlineBriefcase, 
    HiOutlineUsers, HiOutlineDocumentText, HiOutlineClock,
    HiOutlineCurrencyDollar, HiOutlineWrench, HiOutlineSquares2X2,
    HiCheckBadge, HiOutlineChevronLeft
} from "react-icons/hi2";
import { LuHardHat } from "react-icons/lu";
import { 
    getNotificaciones, 
    markNotificacionAsRead, 
    markAllNotificacionesAsRead 
} from "../services/notificacionesService";
import type { Notificacion } from "../services/notificacionesService";


const MenuLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading, logout } = useAuth(); // Usamos el contexto
    const [sidebarOptions, setSidebarOptions] = useState<string[]>([]);
    const [activeOption, setActiveOption] = useState("");
    const [notificaciones, setNotificaciones] = useState<any[]>([]);
    const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
    const [mostrarPerfil, setMostrarPerfil] = useState(false);
    const notificacionesRef = useRef<HTMLDivElement>(null);
    const perfilRef = useRef<HTMLDivElement>(null);

    // Cerrar menús al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificacionesRef.current && !notificacionesRef.current.contains(event.target as Node)) {
                setMostrarNotificaciones(false);
            }
            if (perfilRef.current && !perfilRef.current.contains(event.target as Node)) {
                setMostrarPerfil(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Obtener ruta base según el rol
    const getBaseRoute = () => {
        if (!user) return "/";
        const role = user.role;
        if (role === 'admin') return "/menu";
        if (role === 'cliente') return "/cliente";
        if (role === 'tecnico') return "/tecnico";
        return "/";
    };

    // Cargar notificaciones
    const cargarNotificaciones = async () => {
        if (!user?.id) return;
        try {
            const data = await getNotificaciones(user.id);
            setNotificaciones(data);
        } catch (error) {
            console.error("Error cargando notificaciones de la BD:", error);
            // Fallback silencioso
        }
    };

    useEffect(() => {
        cargarNotificaciones();
        // Polling suave cada 30 segundos para nuevas notificaciones
        const interval = setInterval(cargarNotificaciones, 30000);
        return () => clearInterval(interval);
    }, [user?.id]);

    // Cerrar click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificacionesRef.current && !notificacionesRef.current.contains(event.target as Node)) {
                setMostrarNotificaciones(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const marcarUnaComoLeida = async (id: number) => {
        try {
            await markNotificacionAsRead(id);
            setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
        } catch (error) {
            console.error("Error al marcar como leída:", error);
        }
    };

    const marcarTodasComoLeidas = async () => {
        if (!user?.id) return;
        try {
            await markAllNotificacionesAsRead(user.id);
            setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })));
        } catch (error) {
            console.error("Error al marcar todas como leídas:", error);
        }
    };

    const unreadCount = notificaciones.filter(n => !n.leido).length;

    // Determinar opciones del sidebar basado en el ROL y la RUTA
    useEffect(() => {
        if (!user) return;

        // Lógica base según el ROL
        let baseOptions: string[] = [];

        if (user.role === 'admin') {
            baseOptions = ["Dashboard", "Negocios", "Trabajadores", "Usuarios", "Solicitudes", "Reportes Mantenimiento", "Trabajos Realizados"];
        } else if (user.role === 'cliente') {
            baseOptions = ["Mis Negocios", "Cotizaciones", "Historial"];
        } else if (user.role === 'tecnico') {
            baseOptions = ["Mis Trabajos", "Nueva Solicitud", "Historial de Trabajo"];
        }

        if (user.role === 'admin' && location.pathname.includes("/menu/trabajo/")) {
            setSidebarOptions(["Trabajos", "Cotización", "Historial"]);
            const params = new URLSearchParams(location.search);
            const tab = params.get('tab');
            setActiveOption(tab === 'cotizaciones' ? "Cotización" : (tab === 'historial' ? "Historial" : "Trabajos"));
        } else {
            setSidebarOptions(baseOptions);

            // Lógica para mantener activo el botón correcto
            const path = location.pathname;

            if (path.startsWith("/menu")) {
                if (path === "/menu" || path === "/menu/") setActiveOption("Dashboard");
                else if (path.includes("dashboard")) setActiveOption("Dashboard");
                else if (path.includes("trabajadores")) setActiveOption("Trabajadores");
                else if (path.includes("usuarios")) setActiveOption("Usuarios");
                else if (path.includes("solicitudes")) setActiveOption("Solicitudes");
                else if (path.includes("mantenimiento")) setActiveOption("Reportes Mantenimiento");
                else if (path.includes("trabajos-realizados")) setActiveOption("Trabajos Realizados");
                else setActiveOption("Negocios");
            } else if (path.startsWith("/cliente")) {
                if (path === "/cliente" || path === "/cliente/") setActiveOption("Mis Negocios");
                else if (path.includes("cotizaciones")) setActiveOption("Cotizaciones");
                else if (path.includes("historial")) setActiveOption("Historial");
            } else if (path.startsWith("/tecnico")) {
                if (path === "/tecnico" || path === "/tecnico/") setActiveOption("Mis Trabajos");
                else if (path.includes("solicitudes")) setActiveOption("Nueva Solicitud");
                else if (path.includes("historial")) setActiveOption("Historial de Trabajo");
            }
        }
    }, [location.pathname, user]);

    const handleNavigation = (option: string) => {
        setActiveOption(option);

        if (option === "Dashboard") navigate("/menu/dashboard");
        // Mapeo de navegación según opción
        if (option === "Negocios") navigate("/menu/negocios");
        if (option === "Trabajadores") navigate("/menu/trabajadores");
        if (option === "Usuarios") navigate("/menu/usuarios");
        if (option === "Solicitudes") navigate("/menu/solicitudes");
        if (option === "Reportes Mantenimiento") navigate("/menu/mantenimiento");
        if (option === "Trabajos Realizados") navigate("/menu/trabajos-realizados");

        if (option === "Mis Negocios") navigate("/cliente");
        if (option === "Cotizaciones") navigate("/cliente/cotizaciones");

        if (option === "Historial") {
            if (user?.role === 'tecnico') navigate("/tecnico/historial");
            else navigate("/cliente/historial");
        }

        if (option === "Mis Trabajos") navigate("/tecnico");
        if (option === "Nueva Solicitud") navigate("/tecnico/solicitudes");
        if (option === "Historial de Trabajo") navigate("/tecnico/historial");

        // Lógica para Admin dentro de una sucursal
        if (option === "Trabajos" && location.pathname.includes("/menu/trabajo/")) {
            navigate(location.pathname);
        }
        if (option === "Cotización" && location.pathname.includes("/menu/trabajo/")) {
            navigate(location.pathname + "?tab=cotizaciones");
        }
        if (option === "Historial" && location.pathname.includes("/menu/trabajo/")) {
            navigate(location.pathname + "?tab=historial");
        }
    };

    const getIconForOption = (option: string) => {
        switch (option) {
            case "Dashboard":
                return <HiOutlineSquares2X2 size={22} />;
            case "Negocios":
            case "Mis Negocios":
                return <HiOutlineBriefcase size={22} />;
            case "Trabajadores":
                return <LuHardHat size={22} />;
            case "Usuarios":
                return <HiOutlineUsers size={22} />;
            case "Solicitudes":
            case "Nueva Solicitud":
                return <HiOutlineDocumentText size={22} />;
            case "Trabajos Realizados":
            case "Historial":
                return <HiOutlineClock size={22} />;
            case "Cotizaciones":
            case "Cotización":
                return <HiOutlineCurrencyDollar size={22} />;
            case "Trabajos":
            case "Mis Trabajos":
            case "Reportes Mantenimiento":
                return <HiOutlineWrench size={22} />;
            default:
                return <HiOutlineDocumentText size={22} />;
        }
    };



    if (loading) return null;

    return (
        <div className={styles.container}>

            {/* SIDEBAR IZQUIERDO */}
            <aside className={styles.sidebar}>
                <div className={styles.logoContainer} onClick={() => navigate(getBaseRoute())}>
                    <img src={logo} alt="Logo" className={styles.logo} />
                </div>

                <nav className={styles.menu}>
                    {sidebarOptions.map((option) => (
                        <button
                            key={option}
                            className={`${styles.menuItem} ${activeOption === option ? styles.active : ""}`}
                            onClick={() => handleNavigation(option)}
                        >
                            <span className={styles.menuIcon}>{getIconForOption(option)}</span>
                            <span className={styles.menuText}>{option}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* AREA DERECHA */}
            <div className={styles.mainArea}>
                {/* HEADER SUPERIOR - Ocultar en detalle, verif tarea y reporte */}
                {!location.pathname.includes("/trabajo-detalle") && !location.pathname.includes("/verificacion-tarea") && !location.pathname.includes("/reporte-tarea") && (
                    <header className={styles.header}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {location.pathname !== getBaseRoute() && location.pathname !== getBaseRoute() + "/dashboard" && location.pathname !== getBaseRoute() + "/" && (
                                <button 
                                    onClick={() => navigate(-1)} 
                                    style={{ background: '#f1f5f9', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', transition: 'all 0.2s' }}
                                    title="Retroceder"
                                >
                                    <HiOutlineChevronLeft size={20} strokeWidth={2.5} />
                                </button>
                            )}
                            <h2 style={{ margin: 0 }}>
                                {activeOption}
                            </h2>
                        </div>

                        <div className={styles.headerActions}>
                            {/* El botón Agregar fue removido a petición del usuario */}
                            <div className={styles.notificationWrapper} ref={notificacionesRef}>
                                <button
                                    className={styles.iconBtn}
                                    onClick={() => {
                                        setMostrarNotificaciones(!mostrarNotificaciones);
                                    }}
                                >
                                    <HiOutlineBell size={24} />
                                    {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount}</span>}
                                </button>

                                {mostrarNotificaciones && (
                                    <div className={styles.notificationDropdown}>
                                        <div className={styles.dropdownHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4>Notificaciones</h4>
                                            {unreadCount > 0 && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); marcarTodasComoLeidas(); }}
                                                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <HiCheckBadge /> Leer todas
                                                </button>
                                            )}
                                        </div>
                                        <div className={styles.dropdownBody}>
                                            {notificaciones.length > 0 ? (
                                                notificaciones.map((noti: Notificacion) => (
                                                    <div key={noti.id} className={`${styles.notificationItem} ${!noti.leido ? styles.notificationUnread : ''}`} onClick={() => {
                                                        if (noti.enlace) {
                                                            marcarUnaComoLeida(noti.id);
                                                            navigate(noti.enlace);
                                                        }
                                                        setMostrarNotificaciones(false);
                                                    }}>
                                                        <div className={styles.notificationIcon}>
                                                            {(() => {
                                                                const t = (noti.titulo || '').toLowerCase();
                                                                if (t.includes('sos') || t.includes('emergencia')) return '🚨';
                                                                if (t.includes('sucursal') || t.includes('negocio')) return '🏢';
                                                                if (t.includes('visita') && t.includes('finaliz')) return '🔍';
                                                                if (t.includes('finalizado') || t.includes('reporte')) return '✅';
                                                                if (t.includes('cotizaci')) return '📄';
                                                                if (t.includes('trabajo') && t.includes('asign')) return '🛠️';
                                                                if (t.includes('solicitud')) return '📋';
                                                                return '🔔';
                                                            })()}
                                                        </div>
                                                        <div className={styles.notificationContent}>
                                                            <div className={styles.notificationTitle}>{noti.titulo}</div>
                                                            <div className={styles.notificationMessage}>{noti.mensaje}</div>
                                                            <div className={styles.notificationTime}>
                                                                {new Date(noti.created_at).toLocaleDateString()} {new Date(noti.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        {!noti.leido && <div className={styles.notificationDot}></div>}
                                                    </div>
                                                ))
                                            ) : (<div className={styles.noNotifications}>No hay notificaciones recientes.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={styles.perfilWrapper} ref={perfilRef}>
                                <button
                                    className={styles.iconBtn}
                                    onClick={() => setMostrarPerfil(!mostrarPerfil)}
                                >
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Perfil" className={styles.topbarAvatar} />
                                    ) : (
                                        <HiOutlineUser size={24} />
                                    )}
                                </button>

                                {mostrarPerfil && (
                                    <div className={styles.perfilDropdown}>
                                        <div className={styles.perfilHeader}>
                                            <p className={styles.userName}>{user?.name}</p>
                                            <p className={styles.userRole}>{user?.role}</p>
                                        </div>
                                        <div className={styles.dropdownDivider} />
                                        <button 
                                            className={styles.dropdownItem}
                                            onClick={() => {
                                                setMostrarPerfil(false);
                                                if (user?.role === 'cliente') navigate("/cliente/mi-perfil");
                                                else if (user?.role === 'admin') navigate("/menu/mi-perfil");
                                                else if (user?.role === 'tecnico') navigate("/tecnico/mi-perfil");
                                            }}
                                        >
                                            Ver Perfil
                                        </button>
                                        <button 
                                            className={`${styles.dropdownItem} ${styles.logoutItem}`}
                                            onClick={() => {
                                                setMostrarPerfil(false);
                                                logout();
                                                navigate("/inicio-sesion");
                                            }}
                                        >
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>
                )}

                {/* CONTENIDO (Aquí se renderizan las vistas) */}
                <main className={styles.content} style={(location.pathname.includes("/trabajo-detalle") || location.pathname.includes("/verificacion-tarea") || location.pathname.includes("/reporte-tarea")) ? { padding: 0 } : {}}>
                    <Outlet />
                </main>
            </div>
        </div >
    );
};

export default MenuLayout;
