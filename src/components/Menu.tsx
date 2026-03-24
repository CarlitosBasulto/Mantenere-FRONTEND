import React, { useEffect, useState, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import styles from "./Menu.module.css";
// Asegúrate de que la ruta al logo sea correcta
import logo from "../assets/imagenes/Logo.png";
import { useAuth } from "../context/AuthContext";
import { HiOutlineUser, HiOutlineBell } from "react-icons/hi2";
import { getNotificacionesUsuario, markAllNotificacionesAsRead } from "../services/notificacionesService";
import type { Notificacion } from "../services/notificacionesService";


const MenuLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, login } = useAuth(); // Usamos el contexto
    const [sidebarOptions, setSidebarOptions] = useState<string[]>([]);
    const [activeOption, setActiveOption] = useState("Negocios");
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
    const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
    const notificacionesRef = useRef<HTMLDivElement>(null);

    // Cargar usuario desde localStorage si el contexto está vacío
    useEffect(() => {
        if (!user) {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                login(JSON.parse(storedUser));
            }
        }
    }, []);


    // Redirigir al panel correcto según el rol
    useEffect(() => {
        console.log("🧭 [Menu.tsx] Verificando redirección inicial. User es:", user?.role, "Ruta actual:", location.pathname);

        if (!user) {
            console.log("🧭 [Menu.tsx] No hay user en context. Saliendo de useEffect.");
            return;
        }

        if (user.role === "admin" && location.pathname === "/") {
            console.log("🧭 [Menu.tsx] Redirigiendo a /menu porque es admin y está en la raíz");
            navigate("/menu");
        }

        if (user.role === "cliente" && location.pathname === "/") {
            console.log("🧭 [Menu.tsx] Redirigiendo a /cliente");
            navigate("/cliente");
        }

        if (user.role === "tecnico" && location.pathname === "/") {
            console.log("🧭 [Menu.tsx] Redirigiendo a /tecnico");
            navigate("/tecnico");
        }

    }, [user]);

    // Cargar notificaciones desde la API
    const cargarNotificaciones = async () => {
        if (!user || user.id === undefined) return;
        try {
            const data = await getNotificacionesUsuario(user.id);
            setNotificaciones(data);
        } catch (error) {
            console.error("Error al obtener notificaciones:", error);
        }
    };

    useEffect(() => {
        cargarNotificaciones();
        // Polling para mantenerlas actualizadas
        const intervalId = setInterval(cargarNotificaciones, 15000); 
        return () => clearInterval(intervalId);
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

    const marcarComoLeidas = async () => {
        if (!user || user.id === undefined) return;
        try {
            await markAllNotificacionesAsRead(user.id);
            setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })));
        } catch (error) {
            console.error("Error al marcar como leídas:", error);
        }
    };

    const unreadCount = notificaciones.filter(n => !n.leido).length;

    // Determinar opciones del sidebar basado en el ROL y la RUTA
    useEffect(() => {
        if (!user) return;

        // Lógica base según el ROL
        let baseOptions: string[] = [];

        if (user.role === 'admin') {
            baseOptions = ["Negocios", "Trabajadores", "Solicitudes"];
        } else if (user.role === 'cliente') {
            baseOptions = ["Mis Negocios", "Cotizaciones"];
        } else if (user.role === 'tecnico') {
            baseOptions = ["Mis Trabajos", "Nueva Solicitud"];
        }

        if (user.role === 'admin' && location.pathname.includes("/menu/trabajo")) {
            setSidebarOptions(["Trabajos", "Cotización"]);
            const params = new URLSearchParams(location.search);
            setActiveOption(params.get('tab') === 'cotizaciones' ? "Cotización" : "Trabajos");
        } else {
            setSidebarOptions(baseOptions);

            // Lógica para mantener activo el botón correcto
            const path = location.pathname;

            if (path.startsWith("/menu")) {
                if (path === "/menu" || path === "/menu/") setActiveOption("Negocios");
                else if (path.includes("trabajadores")) setActiveOption("Trabajadores");
                else if (path.includes("solicitudes")) setActiveOption("Solicitudes");
            } else if (path.startsWith("/cliente")) {
                if (path === "/cliente" || path === "/cliente/") setActiveOption("Mis Negocios");
                else if (path.includes("cotizaciones")) setActiveOption("Cotizaciones");
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

        if (option === "Mis Negocios") navigate("/cliente");
        if (option === "Cotizaciones") navigate("/cliente/cotizaciones");
        if (option === "Mis Trabajos") navigate("/tecnico");
        if (option === "Nueva Solicitud") navigate("/tecnico/solicitudes");

        // Lógica para Admin dentro de una sucursal
        if (option === "Trabajos" && location.pathname.includes("/menu/trabajo/")) {
            navigate(location.pathname);
        }
        if (option === "Cotización" && location.pathname.includes("/menu/trabajo/")) {
            navigate(location.pathname + "?tab=cotizaciones");
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
                            {option}
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
                                                    <div key={noti.id} className={`${styles.notificationItem} ${!noti.leido ? styles.notificationUnread : ''}`} onClick={() => {
                                                        // En un futuro, si la notificacion trajera una URL o un entity_id, navegaríamos allí.
                                                        setMostrarNotificaciones(false);
                                                    }}>
                                                        <div className={styles.notificationIcon}>
                                                            {noti.mensaje.includes('Cotización') ? '📄' : '✅'}
                                                        </div>
                                                        <div className={styles.notificationContent}>
                                                            <div className={styles.notificationTitle}>Aviso del Sistema</div>
                                                            <div className={styles.notificationMessage}>{noti.mensaje}</div>
                                                            <div className={styles.notificationTime}>{new Date(noti.created_at).toLocaleString()}</div>
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
                            <button
                            
                                className={styles.iconBtn}
                                onClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("user");
                                    navigate("/inicio-sesion");
                                }}
                            >
                                Salir
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
