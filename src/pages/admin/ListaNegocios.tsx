import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../components/Menu.module.css";

interface Negocio {
    id: number;
    nombre: string;
    ubicacion: string;
    dueno: string;
    fecha: string;
}

const ListaNegocios: React.FC = () => {
    const navigate = useNavigate();

    // DATOS SIMULADOS DE NEGOCIOS
    const negociosData: Negocio[] = [
        {
            id: 1,
            nombre: "Mc Donalds (Centro)",
            ubicacion: "Centro",
            dueno: "Jesus",
            fecha: "15/02/2025"
        },
        {
            id: 2,
            nombre: "Mc Donalds (Altabrisa)",
            ubicacion: "Altabrisa",
            dueno: "David",
            fecha: "15/02/2025"
        },
        {
            id: 3,
            nombre: "Mc Donalds (Galería)",
            ubicacion: "Galería",
            dueno: "Angel",
            fecha: "15/02/2025"
        },
    ];

    const [searchText, setSearchText] = useState("");

    const filteredNegocios = negociosData.filter((negocio) =>
        negocio.nombre.toLowerCase().includes(searchText.toLowerCase())
    );

    const handleCardClick = (id: number) => {
        // Navegar a la vista de detalles del trabajo/negocio
        navigate(`/menu/trabajo/${id}`);
    };

    return (
        <div className={styles.dashboardLayout}>
            {/* COLUMNA IZQUIERDA - LISTA */}
            <div className={styles.leftColumn}>

                {/* BUSCADOR */}
                <div className={styles.searchSection}>
                    <div className={styles.searchCard}>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className={styles.searchInput}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                        <button className={styles.filterBtn}>⚙️</button>
                    </div>
                </div>

                {/* LISTA DE TARJETAS */}
                <div className={styles.jobsSection}>
                    {filteredNegocios.map((negocio) => (
                        <div
                            key={negocio.id}
                            className={styles.jobCard}
                            onClick={() => handleCardClick(negocio.id)}
                            style={{ cursor: "pointer" }}
                        >
                            <div className={styles.cardContent}>
                                {/* Icono o Imagen Placeholder */}
                                <div className={styles.cardIcon}>
                                    🖼️
                                </div>
                                <div className={styles.cardInfo}>
                                    <span className={styles.cardDate}>{negocio.fecha}</span>
                                    <h3>{negocio.nombre}</h3>
                                    <p>Dueño: {negocio.dueno}</p>
                                </div>
                                {/* Indicador lateral (opcional, simulando el diseño) */}
                                <div className={styles.cardIndicator}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUMNA DERECHA - PODRÍA SER UN RESUMEN O ESTAR VACÍA */}
            <div className={styles.rightColumn}>
                {/* Espacio para contenido extra si es necesario, o dejar vacío para que el CSS maneje el ancho */}
            </div>
        </div>
    );
};

export default ListaNegocios;
