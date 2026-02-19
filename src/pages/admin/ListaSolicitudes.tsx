import React, { useState } from "react";
import styles from "../../components/Menu.module.css";

interface Solicitud {
    id: number;
    nombre: string;
    subtitulo: string; // Dueño o Técnico
    fecha: string;
    tipo: "Dueño" | "Técnico";
}

const ListaSolicitudes: React.FC = () => {
    // DATOS SIMULADOS
    const solicitudesData: Solicitud[] = [
        {
            id: 1,
            nombre: "Mc Donals (Centro)",
            subtitulo: "Dueño: David",
            fecha: "25/08/2026",
            tipo: "Dueño"
        },
        {
            id: 2,
            nombre: "Reparación AA",
            subtitulo: "Técnico: Juan Pérez",
            fecha: "26/08/2026",
            tipo: "Técnico"
        },
        {
            id: 3,
            nombre: "Mantenimiento General",
            subtitulo: "Dueño: Angel",
            fecha: "25/08/2026",
            tipo: "Dueño"
        },
    ];

    const [searchText, setSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState<string[]>(["Dueño", "Técnico"]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Estado temporal para el modal
    const [tempFilter, setTempFilter] = useState("Dueño");

    // FILTRADO
    const filteredRequests = solicitudesData.filter((req) => {
        const matchesText = req.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
            req.subtitulo.toLowerCase().includes(searchText.toLowerCase());

        let matchesStatus = true;
        if (filterStatus.length === 1) {
            if (filterStatus.includes("Dueño") && req.tipo !== "Dueño") matchesStatus = false;
            if (filterStatus.includes("Técnico") && req.tipo !== "Técnico") matchesStatus = false;
        }

        return matchesText && matchesStatus;
    });

    const handleApplyFilter = () => {
        if (tempFilter === "Dueño") {
            setFilterStatus(["Dueño"]);
        } else {
            setFilterStatus(["Técnico"]);
        }
        setIsFilterModalOpen(false);
    };

    return (
        <div className={styles.dashboardLayout}>
            {/* COLUMNA IZQUIERDA - LISTA */}
            <div className={styles.leftColumn}>

                {/* BUSCADOR Y FILTRO */}
                <div className={styles.searchSection}>
                    <div className={styles.searchCard}>
                        {/* INPUT BUSQUEDA */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                            <span style={{ position: 'absolute', left: '15px', color: '#888' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className={styles.searchInput}
                                style={{ paddingLeft: '40px' }}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>

                        {/* BOTON FILTRO */}
                        <button
                            className={styles.filterBtn}
                            onClick={() => setIsFilterModalOpen(true)}
                        >
                            <span style={{ fontSize: '18px' }}>⚙️</span>
                        </button>
                    </div>
                </div>

                {/* LISTA DE SOLICITUDES */}
                <div className={styles.jobsSection}>
                    {filteredRequests.map((req) => (
                        <div key={req.id} className={styles.jobCard}>
                            <div className={styles.cardContent}>
                                {/* ICONO (Placeholder de imagen) */}
                                <div className={styles.cardIcon}>
                                    🖼️
                                </div>
                                <div className={styles.cardInfo}>
                                    <span className={styles.cardDate}>{req.fecha}</span>
                                    <h3>{req.nombre}</h3>
                                    <p>{req.subtitulo}</p>
                                </div>
                                {/* Indicador lateral AMARILLO */}
                                <div className={`${styles.cardIndicator} ${styles.yellow}`}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className={styles.rightColumn}>
            </div>

            {/* MODAL DE FILTRO */}
            {isFilterModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Filtro</h3>

                        <div className={styles.filterSection}>
                            {/* <label>Filtrar por</label> */}

                            <div className={styles.radioGroup}>
                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={tempFilter === "Dueño"}
                                        onChange={() => setTempFilter("Dueño")}
                                    />
                                    <span>Dueño</span>
                                </label>

                                <label className={styles.radioLabel}>
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={tempFilter === "Técnico"}
                                        onChange={() => setTempFilter("Técnico")}
                                    />
                                    <span>Técnico</span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.applyBtn}
                                onClick={handleApplyFilter}
                            >
                                Aplicar Filtro
                            </button>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setIsFilterModalOpen(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ListaSolicitudes;
