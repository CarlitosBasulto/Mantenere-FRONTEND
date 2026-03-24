import React, { useEffect, useState, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import styles from "./Menu.module.css";
// Asegúrate de que la ruta al logo sea correcta
import logo from "../assets/imagenes/nuevologo.png";
import { useAuth } from "../context/AuthContext";
import { 
    HiOutlineUser, HiOutlineBell, HiOutlineBriefcase, 
    HiOutlineUsers, HiOutlineDocumentText, HiOutlineClock,
    HiOutlineCurrencyDollar, HiOutlineWrench
} from "react-icons/hi2";


const MenuLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth(); // Usamos el contexto
    const [sidebarOptions, setSidebarOptions] = useState<string[]>([]);
    const [activeOption, setActiveOption] = useState("Negocios");
    const [notificaciones, setNotificaciones] = useState<any[]>([]);
    const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
    const notificacionesRef = useRef<HTMLDivElement>(null);

    // Cargar notificaciones
    const cargarNotificaciones = () => {
        if (user?.role === 'admin') {
            const stored = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
            setNotificaciones(stored);
        } else if (user?.role === 'cliente') {
            const storedClient = JSON.parse(localStorage.getItem('client_notifications') || '[]');
            setNotificaciones(storedClient);
        } else if (user?.role === 'tecnico') {
            const storedTecnico = JSON.parse(localStorage.getItem(`tecnico_notifications_${user.name}`) || '[]');
            setNotificaciones(storedTecnico);
        }
    };

    useEffect(() => {
        cargarNotificaciones();
        window.addEventListener('storage', cargarNotificaciones);
        return () => window.removeEventListener('storage', cargarNotificaciones);
    }, [user]);

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

    const marcarComoLeidas = () => {
        const actualizadas = notificaciones.map(n => ({ ...n, leida: true }));
        setNotificaciones(actualizadas);
        if (user?.role === 'admin') {
            localStorage.setItem('admin_notifications', JSON.stringify(actualizadas));
        } else if (user?.role === 'cliente') {
            localStorage.setItem('client_notifications', JSON.stringify(actualizadas));
        } else if (user?.role === 'tecnico') {
            localStorage.setItem(`tecnico_notifications_${user.name}`, JSON.stringify(actualizadas));
        }
    };

    const unreadCount = notificaciones.filter(n => !n.leida).length;

    // Determinar opciones del sidebar basado en el ROL y la RUTA
    useEffect(() => {
        if (!user) return;

        // Lógica base según el ROL
        let baseOptions: string[] = [];

        if (user.role === 'admin') {
            baseOptions = ["Negocios", "Trabajadores", "Solicitudes", "Trabajos Realizados"];
        } else if (user.role === 'cliente') {
            baseOptions = ["Mis Negocios", "Cotizaciones", "Historial"];
        } else if (user.role === 'tecnico') {
            baseOptions = ["Mis Trabajos", "Nueva Solicitud"];
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
                if (path === "/menu" || path === "/menu/") setActiveOption("Negocios");
                else if (path.includes("trabajadores")) setActiveOption("Trabajadores");
                else if (path.includes("solicitudes")) setActiveOption("Solicitudes");
                else if (path.includes("trabajos-realizados")) setActiveOption("Trabajos Realizados");
            } else if (path.startsWith("/cliente")) {
                if (path === "/cliente" || path === "/cliente/") setActiveOption("Mis Negocios");
                else if (path.includes("cotizaciones")) setActiveOption("Cotizaciones");
                else if (path.includes("historial")) setActiveOption("Historial");
            } else if (path.startsWith("/tecnico")) {
                if (path === "/tecnico" || path === "/tecnico/") setActiveOption("Mis Trabajos");
                else if (path.includes("solicitudes")) setActiveOption("Nueva Solicitud");
            }
        }
    }, [location.pathname, user]);

    const handleNavigation = (option: string) => {
        setActiveOption(option);

        // Mapeo de navegación según opción
        if (option === "Negocios") navigate("/menu");
        if (option === "Trabajadores") navigate("/menu/trabajadores");
        if (option === "Solicitudes") navigate("/menu/solicitudes");
        if (option === "Trabajos Realizados") navigate("/menu/trabajos-realizados");

        if (option === "Mis Negocios") navigate("/cliente");
        if (option === "Cotizaciones") navigate("/cliente/cotizaciones");

        if (option === "Historial") {
            if (user?.role === 'tecnico') navigate("/tecnico/historial");
            else navigate("/cliente/historial");
        }

        if (option === "Mis Trabajos") navigate("/tecnico");
        if (option === "Nueva Solicitud") navigate("/tecnico/solicitudes");

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
            case "Negocios":
            case "Mis Negocios":
                return <HiOutlineBriefcase size={22} />;
            case "Trabajadores":
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
                return <HiOutlineWrench size={22} />;
            default:
                return <HiOutlineDocumentText size={22} />;
        }
    };



    return (
        <div className={styles.container}>

            {/* SIDEBAR IZQUIERDO */}
            <aside className={styles.sidebar}>
                <div className={styles.logoContainer} onClick={() => navigate("/menu")}>
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
                        <h2>
                            {activeOption}
                        </h2>

                        <div className={styles.headerActions}>
                            {/* El botón Agregar fue removido a petición del usuario */}
                            <div className={styles.notificationWrapper} ref={notificacionesRef}>
                                <button
                                    className={styles.iconBtn}
                                    onClick={() => {
                                        setMostrarNotificaciones(!mostrarNotificaciones);
                                        if (!mostrarNotificaciones && unreadCount > 0) marcarComoLeidas();
                                    }}
                                >
                                    <HiOutlineBell size={24} />
                                    {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount}</span>}
                                </button>

                                {mostrarNotificaciones && (
                                    <div className={styles.notificationDropdown}>
                                        <div className={styles.dropdownHeader}>
                                            <h4>Notificaciones</h4>
                                        </div>
                                        <div className={styles.dropdownBody}>
                                            {notificaciones.length > 0 ? (
                                                notificaciones.map(noti => (
                                                    <div key={noti.id} className={`${styles.notificationItem} ${!noti.leida ? styles.notificationUnread : ''}`} onClick={() => {
                                                        if (noti.jobId) {
                                                            if (user?.role === 'admin') navigate(`/menu/trabajo-detalle/${noti.jobId}`);
                                                            else if (user?.role === 'cliente') {
                                                                if ((noti.titulo || noti.title || '').includes('Cotización')) navigate(`/cliente/cotizaciones`);
                                                                else navigate(`/cliente/trabajo-detalle/${noti.jobId}`);
                                                            }
                                                            else if (user?.role === 'tecnico') {
                                                                navigate(`/tecnico/trabajo-detalle/${noti.jobId}`);
                                                            }
                                                        }
                                                        setMostrarNotificaciones(false);
                                                    }}>
                                                        <div className={styles.notificationIcon}>
                                                            {(noti.titulo || noti.title || '').includes('Cotización') ? '📄' : '✅'}
                                                        </div>
                                                        <div className={styles.notificationContent}>
                                                            <div className={styles.notificationTitle}>{noti.titulo || noti.title || 'Alerta'}</div>
                                                            <div className={styles.notificationMessage}>{noti.mensaje || noti.message || ''}</div>
                                                            <div className={styles.notificationTime}>{noti.fecha || noti.date || ''}</div>
                                                        </div>
                                                        {!noti.leida && <div className={styles.notificationDot}></div>}
                                                    </div>
                                                ))
                                            ) : (<div className={styles.noNotifications}>No hay notificaciones recientes.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                className={styles.iconBtn}
                                onClick={() => {
                                    if (user?.role === 'cliente') navigate("/cliente/mi-perfil");
                                    else if (user?.role === 'admin') navigate("/menu/mi-perfil");
                                    else if (user?.role === 'tecnico') navigate("/tecnico/mi-perfil");
                                }}
                            >
                                <HiOutlineUser size={24} />
                            </button>
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
