import React, { useState, useEffect } from "react";
import styles from "./ListaTrabajadores.module.css";
import menuStyles from "../../components/Menu.module.css";
import { HiOutlineUser } from 'react-icons/hi';
import { useNavigate } from "react-router-dom";

interface Trabajador {
    id: number;
    nombre: string;
    fecha: string;
    puesto: string; // Especialidad(es)
    telefono?: string;
    correo?: string;
    contrasena?: string; // Agregado: contraseña
    estado: "Activo" | "Baja";
    created_at?: string;
    avatar?: string;
}

const ListaTrabajadores: React.FC = () => {
    const navigate = useNavigate();
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
        }
    ]);

    // CARGAR DESDE LOCALSTORAGE AL INICIAR
    useEffect(() => {
        const saved = localStorage.getItem('trabajadores_list');
        if (saved) {
            setTrabajadoresData(JSON.parse(saved));
        } else {
            localStorage.setItem('trabajadores_list', JSON.stringify(trabajadoresData));
        }
    }, []);

    // GUARDAR EN LOCALSTORAGE CUANDO CAMBIE
    useEffect(() => {
        localStorage.setItem('trabajadores_list', JSON.stringify(trabajadoresData));
    }, [trabajadoresData]);

    const [searchText, setSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState<string[]>(["Activo", "Baja"]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // ESTADOS PARA "NUEVO TRABAJADOR"
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newWorkerName, setNewWorkerName] = useState("");
    const [newWorkerRoles, setNewWorkerRoles] = useState<string[]>([]);
    const [customRole, setCustomRole] = useState("");
    const [newWorkerPhone, setNewWorkerPhone] = useState("");
    const [newWorkerEmail, setNewWorkerEmail] = useState("");
    const [newWorkerPassword, setNewWorkerPassword] = useState("");

    const availableRoles = ["General", "Electricista", "Plomero", "Albañil", "Pintor", "Otros"];

    const handleRoleToggle = (role: string) => {
        if (newWorkerRoles.includes(role)) {
            setNewWorkerRoles(newWorkerRoles.filter(r => r !== role));
        } else {
            setNewWorkerRoles([...newWorkerRoles, role]);
        }
    };

    // Estado temporal para el modal de filtro
    const [tempFilter, setTempFilter] = useState("Activos");

    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
    const [workerToManage, setWorkerToManage] = useState<Trabajador | null>(null);

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

        if (newWorkerRoles.length === 0) {
            alert("Por favor selecciona al menos un puesto.");
            return;
        }

        const newId = trabajadoresData.length + 1;
        const today = new Date().toLocaleDateString("es-ES"); // Fecha de hoy

        // Construir string de puestos
        let finalRoles = newWorkerRoles.filter(r => r !== "Otros");
        if (newWorkerRoles.includes("Otros") && customRole.trim() !== "") {
            finalRoles.push(customRole.trim());
        }

        const puestoString = finalRoles.join(", ");

        const newWorker: Trabajador = {
            id: newId,
            nombre: newWorkerName || "Nuevo Trabajador",
            puesto: puestoString || "General",
            telefono: newWorkerPhone,
            correo: newWorkerEmail,
            contrasena: newWorkerPassword,
            fecha: today,
            estado: "Activo"
        };

        try {

            const created = await createTrabajador(newWorker);

            setTrabajadoresData(prev => [...prev, created]);

            setIsAddModalOpen(false);

            setNewWorkerName("");
            setNewWorkerPhone("");
            setNewWorkerEmail("");
            setNewWorkerPassword("");
            setNewWorkerRoles([]);
            setCustomRole("");

        } catch (error) {

            console.error("Error creando trabajador", error);

        }

    };

    const handleDeactivateWorker = async () => {

        if (!workerToManage) return;

        try {

            const updated = await toggleEstado(workerToManage.id);
            console.log("Respuesta de la API al DAR DE BAJA:", updated);

            setTrabajadoresData(prev =>
                prev.map(t =>
                    t.id === workerToManage.id
                        ? { ...t, estado: updated.estado }
                        : t
                )
            );

            setIsDeactivateModalOpen(false);
            setWorkerToManage(null);

        } catch (error: any) {
            console.error("Error al dar de baja. Detalles del backend:", error.response?.data || error.message);
        }

    };

    const handleReactivateWorker = async () => {

        if (!workerToManage) return;

        try {

            const updated = await toggleEstado(workerToManage.id);

            setTrabajadoresData(prev =>
                prev.map(t =>
                    t.id === workerToManage.id
                        ? { ...t, estado: updated.estado }
                        : t
                )
            );

            setIsReactivateModalOpen(false);
            setWorkerToManage(null);

        } catch (error) {

            console.error("Error reactivando trabajador", error);

        }

        // Reset y cerrar
        setNewWorkerName("");
        setNewWorkerRoles([]);
        setCustomRole("");
        setNewWorkerPhone("");
        setNewWorkerEmail("");
        setNewWorkerPassword("");
        setIsAddModalOpen(false);
    };

    const handleDeactivateWorker = () => {
        if (workerToManage) {
            const updatedList = trabajadoresData.map(t =>
                t.id === workerToManage.id ? { ...t, estado: "Baja" as const } : t
            );
            setTrabajadoresData(updatedList);
            setIsDeactivateModalOpen(false);
            setWorkerToManage(null);
        }
    };

    const handleReactivateWorker = () => {
        if (workerToManage) {
            const updatedList = trabajadoresData.map(t =>
                t.id === workerToManage.id ? { ...t, estado: "Activo" as const } : t
            );
            setTrabajadoresData(updatedList);
            setIsReactivateModalOpen(false);
            setWorkerToManage(null);
        }
    };

    return (
        <div className={styles.dashboardLayout}>
            {/* COLUMNA IZQUIERDA - LISTA */}
            <div className={styles.leftColumn}>

                {/* BUSCADOR Y ACCIONES */}
                <div className={styles.searchSection}>
                    <div className={menuStyles.searchCard}>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className={menuStyles.searchInput}
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

                {/* LISTA DE TRABAJADORES */}
                <div className={styles.jobsSection}>
                    {filteredWorkers.map((worker) => (
                        <div
                            key={worker.id}
                            className={styles.jobCard}
                            onClick={() => navigate(`/menu/trabajador/${worker.id}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.cardContent}>
                                {/* AVATAR */}
                                <div className={styles.cardIcon}>
                                    <HiOutlineUser size={30} color="#333" />
                                </div>
                                <div className={styles.cardInfo}>
                                    <span className={styles.cardDate}>
                                        {worker.created_at
                                            ? new Date(worker.created_at).toLocaleDateString("es-MX")
                                            : "Sin fecha"}
                                    </span>
                                    <h3>{worker.nombre}</h3>
                                    <p style={{ color: '#666', fontSize: '14px', margin: '2px 0' }}>{worker.puesto}</p>
                                    <p style={{ fontWeight: 'bold', color: worker.estado === 'Activo' ? '#4CAF50' : '#F44336' }}>
                                        {worker.estado}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px', zIndex: 10 }}>
                                    {worker.estado === "Activo" && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setWorkerToManage(worker);
                                                setIsDeactivateModalOpen(true);
                                            }}
                                            style={{
                                                background: '#fee2e2',
                                                color: '#dc2626',
                                                border: 'none',
                                                padding: '5px 12px',
                                                borderRadius: '15px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Dar de Baja
                                        </button>
                                    )}
                                    {worker.estado === "Baja" && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setWorkerToManage(worker);
                                                setIsReactivateModalOpen(true);
                                            }}
                                            style={{
                                                background: '#dcfce7',
                                                color: '#16a34a',
                                                border: 'none',
                                                padding: '5px 12px',
                                                borderRadius: '15px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Activar
                                        </button>
                                    )}
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
                    <div className={styles.modalContent} style={{ width: '400px' }}>
                        <h3 style={{ textAlign: 'center', marginBottom: '25px', fontWeight: 'bold' }}>Filtro</h3>

                        <div className={styles.filterSection}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '15px' }}>Estatus de empleado</label>
                            <div className={styles.radioGrid}>
                                <label className={styles.radioBox}>
                                    <input type="radio" checked={tempFilter === "Activos"} onChange={() => setTempFilter("Activos")} />
                                    <span>Activos</span>
                                </label>
                                <label className={styles.radioBox}>
                                    <input type="radio" checked={tempFilter === "Baja"} onChange={() => setTempFilter("Baja")} />
                                    <span>Baja</span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.filterSection}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '15px' }}>Rango de Fechas</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <input type="date" className={styles.dateInput} placeholder="dd/mm/aaaa" />
                                <input type="date" className={styles.dateInput} placeholder="dd/mm/aaaa" />
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
                            <div className={styles.filterSection} style={{ marginBottom: '15px' }}>
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

                            <div className={styles.filterSection} style={{ marginBottom: '15px' }}>
                                <label>Teléfono</label>
                                <input
                                    type="tel"
                                    className={styles.searchInput}
                                    style={{ width: '100%', borderRadius: '8px', padding: '8px' }}
                                    value={newWorkerPhone}
                                    onChange={(e) => setNewWorkerPhone(e.target.value)}
                                    placeholder="Ej. 993 123 4567"
                                />
                            </div>

                            <div className={styles.filterSection} style={{ marginBottom: '15px' }}>
                                <label>Correo Electrónico</label>
                                <input
                                    type="email"
                                    className={styles.searchInput}
                                    style={{ width: '100%', borderRadius: '8px', padding: '8px' }}
                                    value={newWorkerEmail}
                                    onChange={(e) => setNewWorkerEmail(e.target.value)}
                                    placeholder="Ej. juan@correo.com"
                                />
                            </div>

                            <div className={styles.filterSection} style={{ marginBottom: '15px' }}>
                                <label>Contraseña</label>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    style={{ width: '100%', borderRadius: '8px', padding: '8px' }}
                                    value={newWorkerPassword}
                                    onChange={(e) => setNewWorkerPassword(e.target.value)}
                                    placeholder="Ingrese una contraseña"
                                    required
                                />
                            </div>

                            <div className={styles.filterSection} style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '8px' }}>Puesto / Especialidad (Selecciona al menos uno)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {availableRoles.map(role => (
                                        <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={newWorkerRoles.includes(role)}
                                                onChange={() => handleRoleToggle(role)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            {role}
                                        </label>
                                    ))}
                                </div>

                                {newWorkerRoles.includes("Otros") && (
                                    <div style={{ marginTop: '10px' }}>
                                        <label style={{ fontSize: '13px', color: '#555' }}>Especificar otro puesto:</label>
                                        <input
                                            type="text"
                                            className={styles.searchInput}
                                            style={{ width: '100%', borderRadius: '8px', padding: '8px', marginTop: '5px' }}
                                            value={customRole}
                                            onChange={(e) => setCustomRole(e.target.value)}
                                            placeholder="Ej. Técnico en refrigeración"
                                            required={newWorkerRoles.includes("Otros")}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className={styles.modalActions}>
                                <button type="submit" className={styles.applyBtn}>Guardar</button>
                                <button type="button" className={styles.cancelBtn} onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeactivateModalOpen && workerToManage && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Confirmar Baja</h3>
                        <div style={{ padding: '20px 0', textAlign: 'center' }}>¿Estás seguro de dar de baja a <b>{workerToManage.nombre}</b>?</div>
                        <div className={styles.modalActions}>
                            <button className={styles.applyBtn} style={{ background: '#fca5a5', color: '#7f1d1d' }} onClick={handleDeactivateWorker}>Dar de Baja</button>
                            <button className={styles.cancelBtn} onClick={() => setIsDeactivateModalOpen(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {isReactivateModalOpen && workerToManage && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Confirmar Reactivación</h3>
                        <div style={{ padding: '20px 0', textAlign: 'center' }}>¿Estás seguro de reactivar a <b>{workerToManage.nombre}</b>?</div>
                        <div className={styles.modalActions}>
                            <button className={styles.applyBtn} onClick={handleReactivateWorker}>Reactivar</button>
                            <button className={styles.cancelBtn} onClick={() => setIsReactivateModalOpen(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ListaTrabajadores;
