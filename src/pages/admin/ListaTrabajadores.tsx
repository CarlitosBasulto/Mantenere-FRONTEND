import React, { useState } from "react";
import styles from "../../components/Menu.module.css";

interface Trabajador {
    id: number;
    nombre: string;
    fecha: string;
    puesto: string; // Agregado: Especialidad
    estado: "Activo" | "Baja";
    avatar?: string;
}

const ListaTrabajadores: React.FC = () => {
    // DATOS SIMULADOS
    const [trabajadoresData, setTrabajadoresData] = useState<Trabajador[]>([
        {
            id: 1,
            nombre: "Javier Antonio Medina Medina",
            fecha: "25/08/2026",
            puesto: "Electricista",
            estado: "Activo"
        },
        {
            id: 2,
            nombre: "Carlos Daniel Dzul vicente",
            fecha: "25/08/2026",
            puesto: "Plomero",
            estado: "Baja"
        },
        {
            id: 3,
            nombre: "Ernesto Eduardo Martin Escalante",
            fecha: "25/08/2026",
            puesto: "General",
            estado: "Activo"
        },
    ]);

    const [searchText, setSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState<string[]>(["Activo", "Baja"]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // ESTADOS PARA "NUEVO TRABAJADOR"
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newWorkerName, setNewWorkerName] = useState("");
    const [newWorkerRole, setNewWorkerRole] = useState("General");

    // Estado temporal para el modal de filtro
    const [tempFilter, setTempFilter] = useState("Activos");

    // FILTRADO
    const filteredWorkers = trabajadoresData.filter((tr) => {
        const matchesText = tr.nombre.toLowerCase().includes(searchText.toLowerCase());
        let matchesStatus = true;
        if (filterStatus.length === 1) {
            if (filterStatus.includes("Activo") && tr.estado !== "Activo") matchesStatus = false;
            if (filterStatus.includes("Baja") && tr.estado !== "Baja") matchesStatus = false;
        }
        return matchesText && matchesStatus;
    });

    const handleApplyFilter = () => {
        if (tempFilter === "Activos") setFilterStatus(["Activo"]);
        else setFilterStatus(["Baja"]);
        setIsFilterModalOpen(false);
    };

    const handleAddWorker = (e: React.FormEvent) => {
        e.preventDefault();
        const newId = trabajadoresData.length + 1;
        const today = new Date().toLocaleDateString("es-ES"); // Fecha de hoy

        const newWorker: Trabajador = {
            id: newId,
            nombre: newWorkerName || "Nuevo Trabajador",
            puesto: newWorkerRole,
            fecha: today,
            estado: "Activo"
        };

        setTrabajadoresData([...trabajadoresData, newWorker]);

        // Reset y cerrar
        setNewWorkerName("");
        setNewWorkerRole("General");
        setIsAddModalOpen(false);
    };

    return (
        <div className={styles.dashboardLayout}>
            {/* COLUMNA IZQUIERDA - LISTA */}
            <div className={styles.leftColumn}>

                {/* BUSCADOR Y ACCIONES */}
                <div className={styles.searchSection}>
                    <div className={styles.searchCard}>
                        {/* INPUT BUSQUEDA */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                            <span style={{ position: 'absolute', left: '15px', color: '#888' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className={styles.searchInput}
                                style={{ paddingLeft: '40px', width: '100%' }}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>

                        {/* BOTONES DE ACCION */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {/* BOTON FILTRO */}
                            <button
                                className={styles.filterBtn}
                                onClick={() => setIsFilterModalOpen(true)}
                                title="Filtrar"
                            >
                                <span style={{ fontSize: '18px' }}>⚙️</span>
                            </button>

                            {/* BOTON NUEVO TRABAJADOR */}
                            <button
                                className={styles.primaryBtn}
                                onClick={() => setIsAddModalOpen(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '30px' }}
                            >
                                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span>
                                <span>Nuevo</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* LISTA DE TRABAJADORES */}
                <div className={styles.jobsSection}>
                    {filteredWorkers.map((worker) => (
                        <div key={worker.id} className={styles.jobCard}>
                            <div className={styles.cardContent}>
                                {/* AVATAR */}
                                <div className={styles.cardIcon}>
                                    👤
                                </div>
                                <div className={styles.cardInfo}>
                                    <span className={styles.cardDate}>{worker.fecha}</span>
                                    <h3>{worker.nombre}</h3>
                                    <p style={{ color: '#666', fontSize: '14px', margin: '2px 0' }}>{worker.puesto}</p>
                                    <p style={{ fontWeight: 'bold', color: worker.estado === 'Activo' ? '#4CAF50' : '#F44336' }}>
                                        {worker.estado}
                                    </p>
                                </div>
                                {/* Indicador lateral */}
                                <div className={`${styles.cardIndicator} ${styles.blue}`}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className={styles.rightColumn}></div>

            {/* MODAL DE FILTRO */}
            {isFilterModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Filtro</h3>
                        <div className={styles.filterSection}>
                            <label>Estatus de Empleado</label>
                            <div className={styles.radioGroup}>
                                <label className={styles.radioLabel}>
                                    <input type="radio" checked={tempFilter === "Activos"} onChange={() => setTempFilter("Activos")} />
                                    <span>Activos</span>
                                </label>
                                <label className={styles.radioLabel}>
                                    <input type="radio" checked={tempFilter === "Baja"} onChange={() => setTempFilter("Baja")} />
                                    <span>Baja</span>
                                </label>
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.applyBtn} onClick={handleApplyFilter}>Aplicar Filtro</button>
                            <button className={styles.cancelBtn} onClick={() => setIsFilterModalOpen(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NUEVO TRABAJADOR */}
            {isAddModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ width: '400px' }}>
                        <h3>Nuevo Trabajador</h3>
                        <form onSubmit={handleAddWorker}>
                            <div className={styles.filterSection}>
                                <label>Nombre Completo</label>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    style={{ width: '100%', borderRadius: '8px', padding: '8px' }}
                                    value={newWorkerName}
                                    onChange={(e) => setNewWorkerName(e.target.value)}
                                    placeholder="Ej. Juan Pérez"
                                    required
                                />
                            </div>

                            <div className={styles.filterSection}>
                                <label>Puesto / Especialidad</label>
                                <select
                                    className={styles.searchInput}
                                    style={{ width: '100%', borderRadius: '8px', padding: '8px' }}
                                    value={newWorkerRole}
                                    onChange={(e) => setNewWorkerRole(e.target.value)}
                                >
                                    <option value="General">General</option>
                                    <option value="Electricista">Electricista</option>
                                    <option value="Plomero">Plomero</option>
                                    <option value="Albañil">Albañil</option>
                                    <option value="Pintor">Pintor</option>
                                </select>
                            </div>

                            <div className={styles.modalActions}>
                                <button type="submit" className={styles.applyBtn}>Guardar</button>
                                <button type="button" className={styles.cancelBtn} onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ListaTrabajadores;
