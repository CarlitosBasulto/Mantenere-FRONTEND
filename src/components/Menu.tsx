import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import styles from "./Menu.module.css";
// Asegúrate de que la ruta al logo sea correcta
import logo from "../assets/imagenes/Logo.png";
import { useAuth } from "../context/AuthContext";

const MenuLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, login } = useAuth(); // Usamos el contexto
    const [sidebarOptions, setSidebarOptions] = useState<string[]>([]);
    const [activeOption, setActiveOption] = useState("Negocios");

    // Determinar opciones del sidebar basado en el ROL y la RUTA
    useEffect(() => {
        if (!user) return;

        // Lógica base según el ROL
        let baseOptions: string[] = [];

        if (user.role === 'admin') {
            baseOptions = ["Negocios", "Trabajadores", "Solicitudes"];
        } else if (user.role === 'cliente') {
            baseOptions = ["Mis Solicitudes", "Nueva Solicitud"];
        } else if (user.role === 'tecnico') {
            baseOptions = ["Mis Trabajos", "Nueva Solicitud"];
        }

        if (user.role === 'admin' && location.pathname.includes("/menu/trabajo")) {
            setSidebarOptions(["Trabajos", "Cotización"]);
            setActiveOption("Trabajos");
        } else {
            setSidebarOptions(baseOptions);

            // Lógica para mantener activo el botón correcto
            const path = location.pathname;

            if (path.startsWith("/menu")) {
                if (path === "/menu" || path === "/menu/") setActiveOption("Negocios");
                else if (path.includes("trabajadores")) setActiveOption("Trabajadores");
                else if (path.includes("solicitudes")) setActiveOption("Solicitudes");
            } else if (path.startsWith("/cliente")) {
                if (path === "/cliente" || path === "/cliente/") setActiveOption("Mis Solicitudes");
            } else if (path.startsWith("/tecnico")) {
                if (path === "/tecnico" || path === "/tecnico/") setActiveOption("Mis Trabajos");
            }
        }
    }, [location.pathname, user]);

    const handleNavigation = (option: string) => {
        setActiveOption(option);

        // Mapeo de navegación según opción
        if (option === "Negocios") navigate("/menu");
        if (option === "Trabajadores") navigate("/menu/trabajadores");
        if (option === "Solicitudes") navigate("/menu/solicitudes");

        if (option === "Mis Solicitudes") navigate("/cliente");
        if (option === "Mis Trabajos") navigate("/tecnico");
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
                {/* HEADER SUPERIOR */}
                <header className={styles.header}>
                    <h2>
                        {activeOption}
                    </h2>

                    <div className={styles.headerActions}>
                        {/* Botón condicional podría ir aquí */}
                        <button className={styles.primaryBtn}>
                            {user?.role === 'cliente' ? "Crear Solicitud" : "Agregar"}
                        </button>
                        <button className={styles.iconBtn}>🔔</button>
                        <button className={styles.iconBtn}>👤</button>
                    </div>
                </header>

                {/* CONTENIDO (Aquí se renderizan las vistas) */}
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MenuLayout;
