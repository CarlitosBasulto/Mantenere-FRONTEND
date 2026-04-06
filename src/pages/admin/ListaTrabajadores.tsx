import React, { useState, useEffect } from "react";
import styles from "./ListaTrabajadores.module.css";
import menuStyles from "../../components/Menu.module.css";
import { HiOutlineUser, HiX } from 'react-icons/hi';
import { useNavigate } from "react-router-dom";
import { useModal } from "../../context/ModalContext";
import { getTrabajadores, createTrabajador, toggleEstado } from "../../services/trabajadoresService";

interface Trabajador {
    id: number;
    nombre: string;
    fecha: string;
    puesto: string; // Especialidad(es)
    telefono?: string;
    correo?: string;
    contrasena?: string; // Agregado: contraseña
    estado: "Activo" | "Baja";
    avatar?: string;
}

const ListaTrabajadores: React.FC = () => {
    const navigate = useNavigate();
    const { showAlert, showConfirm } = useModal();
    const [trabajadoresData, setTrabajadoresData] = useState<Trabajador[]>([]);
    
    const fetchTrabajadores = async () => {
        try {
            const data = await getTrabajadores();
            
            const mapped: Trabajador[] = data.map((t: any) => ({
                id: t.id,
                nombre: t.nombre,
                fecha: new Date(t.created_at).toLocaleDateString("es-ES"),
                puesto: t.puesto || "General",
                correo: t.correo,
                avatar: t.avatar, // <-- Añadido campo avatar
                estado: t.estado === "Activo" || t.estado?.toLowerCase() === "activo" ? "Activo" : "Baja"
            }));
            
            setTrabajadoresData(mapped);
        } catch (error) {
            console.error("Error cargando trabajadores:", error);
            // Fallback
            const saved = localStorage.getItem('trabajadores_list');
            if (saved) setTrabajadoresData(JSON.parse(saved));
        }
    };

    useEffect(() => {
        fetchTrabajadores();
    }, []);

    const [searchText, setSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState<string[]>(["Activo", "Baja"]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // ESTADOS PARA "NUEVO TRABAJADOR"
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newWorkerName, setNewWorkerName] = useState("");
    const [newWorkerRoles, setNewWorkerRoles] = useState<string[]>([]);
    const [newWorkerPhone, setNewWorkerPhone] = useState("");
    const [newWorkerEmail, setNewWorkerEmail] = useState("");
    const [newWorkerPassword, setNewWorkerPassword] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");

    const [availableRoles, setAvailableRoles] = useState(["General", "Electricista", "Plomero", "Albañil", "Pintor"]);

    const handleRoleToggle = (role: string) => {
        if (newWorkerRoles.includes(role)) {
            setNewWorkerRoles(newWorkerRoles.filter(r => r !== role));
        } else {
            setNewWorkerRoles([...newWorkerRoles, role]);
        }
    };

    const handleAddCategory = () => {
        if (newCategoryName.trim()) {
            const trimmed = newCategoryName.trim();
            if (!availableRoles.includes(trimmed)) {
                setAvailableRoles([...availableRoles, trimmed]);
            }
            if (!newWorkerRoles.includes(trimmed)) {
                setNewWorkerRoles([...newWorkerRoles, trimmed]);
            }
            setNewCategoryName("");
        }
    };

    const handleRemoveCategory = (role: string) => {
        setAvailableRoles(availableRoles.filter(r => r !== role));
        setNewWorkerRoles(newWorkerRoles.filter(r => r !== role));
    };

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

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newWorkerName || !newWorkerEmail || !newWorkerPassword) {
            showAlert("Campos Incompletos", "Rellena nombre, correo y contraseña obligatoriamente.", "warning");
            return;
        }

        try {
            const rolesSeleccionados = newWorkerRoles.length > 0 ? newWorkerRoles.join(", ") : "General";
            await createTrabajador({
                nombre: newWorkerName,
                correo: newWorkerEmail,
                password: newWorkerPassword,
                puesto: rolesSeleccionados,
                telefono: newWorkerPhone || null
            });

            // Refrescar
            await fetchTrabajadores();

            // Reset y cerrar
            setNewWorkerName("");
            setNewWorkerRoles([]);
            setNewWorkerPhone("");
            setNewWorkerEmail("");
            setNewWorkerPassword("");
            setIsAddModalOpen(false);
            showAlert("Éxito", "Trabajador creado exitosamente.", "success");
        } catch (error: any) {
            console.error("Error al crear trabajador:", error);
            if (error.response && error.response.status === 422) {
                const msgs = error.response.data.errors;
                if (msgs) {
                    const errorStr = Object.values(msgs).map((e: any) => e.join(", ")).join("\n");
                    showAlert("Error de Validación", errorStr, "error");
                } else if (error.response.data.message) {
                    showAlert("Error", error.response.data.message, "error");
                } else {
                    showAlert("Validación Fallida", "Revisa que el correo no se repita y la contraseña tenga 6 caracteres.", "warning");
                }
            } else {
                showAlert("Error", "Hubo un error contactando al servidor.", "error");
            }
        }
    };
Line: 97

    const handleDeactivateWorker = async (worker: Trabajador) => {
        showConfirm(
            "Confirmar Baja",
            `¿Estás seguro de dar de baja a ${worker.nombre}?`,
            async () => {
                try {
                    await toggleEstado(worker.id);
                    await fetchTrabajadores();
                    showAlert("Éxito", "Trabajador dado de baja.", "info");
                } catch (error) {
                    console.error(error);
                    showAlert("Error", "Error al dar de baja", "error");
                }
            },
            () => {},
            "Dar de Baja",
            "Cancelar"
        );
    };

    const handleReactivateWorker = async (worker: Trabajador) => {
        showConfirm(
            "Confirmar Reactivación",
            `¿Estás seguro de reactivar a ${worker.nombre}?`,
            async () => {
                try {
                    await toggleEstado(worker.id);
                    await fetchTrabajadores();
                    showAlert("Éxito", "Trabajador reactivado.", "success");
                } catch (error) {
                    console.error(error);
                    showAlert("Error", "Error al reactivar", "error");
                }
            },
            () => {},
            "Reactivar",
            "Cancelar"
        );
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
                                    {worker.avatar ? (
                                        <img 
                                            src={worker.avatar} 
                                            alt={worker.nombre} 
                                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
                                        />
                                    ) : (
                                        <HiOutlineUser size={30} color="#333" />
                                    )}
                                </div>
                                <div className={styles.cardInfo}>
                                    <span className={styles.cardDate}>{worker.fecha}</span>
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
                                                handleDeactivateWorker(worker);
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
                                                handleReactivateWorker(worker);
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
                    <div className={`${styles.modalContent} ${styles.modalWide}`}>
                        <h2 className={styles.modalTitleLarge}>Nuevo Trabajador</h2>
                        <p className={styles.modalSubtitle}>Ingresa los datos para registrar un nuevo integrante al equipo.</p>
                        
                        <form onSubmit={handleAddWorker} className={styles.workerForm}>
                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label>Nombre Completo</label>
                                    <input
                                        type="text"
                                        className={styles.premiumInput}
                                        value={newWorkerName}
                                        onChange={(e) => setNewWorkerName(e.target.value)}
                                        placeholder="Ej. Juan Pérez"
                                        required
                                    />
                                </div>

                                <div className={styles.formField}>
                                    <label>Teléfono</label>
                                    <input
                                        type="tel"
                                        className={styles.premiumInput}
                                        value={newWorkerPhone}
                                        onChange={(e) => setNewWorkerPhone(e.target.value)}
                                        placeholder="Ej. 993 123 4567"
                                    />
                                </div>

                                <div className={styles.formField}>
                                    <label>Correo Electrónico</label>
                                    <input
                                        type="email"
                                        className={styles.premiumInput}
                                        value={newWorkerEmail}
                                        onChange={(e) => setNewWorkerEmail(e.target.value)}
                                        placeholder="Ej. juan@correo.com"
                                        required
                                    />
                                </div>

                                <div className={styles.formField}>
                                    <label>Contraseña</label>
                                    <input
                                        type="text"
                                        className={styles.premiumInput}
                                        value={newWorkerPassword}
                                        onChange={(e) => setNewWorkerPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.specialtySection}>
                                <label className={styles.sectionLabel}>Puesto / Especialidad (Selecciona al menos uno)</label>
                                <div className={styles.rolesGrid}>
                                    {availableRoles.map(role => (
                                        <div key={role} className={styles.roleChipWrapper}>
                                            <label className={styles.roleChip}>
                                                <input
                                                    type="checkbox"
                                                    checked={newWorkerRoles.includes(role)}
                                                    onChange={() => handleRoleToggle(role)}
                                                />
                                                <span className={styles.chipLabel}>{role}</span>
                                            </label>
                                            <button 
                                                type="button" 
                                                className={styles.deleteRoleBtn}
                                                onClick={() => handleRemoveCategory(role)}
                                                title={`Eliminar ${role}`}
                                            >
                                                <HiX size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* AGREGAR NUEVA CATEGORÍA */}
                                <div className={styles.addCategoryWrapper}>
                                    <input 
                                        type="text"
                                        placeholder="Otra especialidad..."
                                        className={styles.addCategoryInput}
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }}}
                                    />
                                    <button 
                                        type="button" 
                                        className={styles.addCategoryBtn}
                                        onClick={handleAddCategory}
                                    >
                                        + Agregar
                                    </button>
                                </div>
                            </div>

                            <div className={styles.modalActionsRow}>
                                <button type="submit" className={styles.saveWorkerBtn}>Guardar Trabajador</button>
                                <button type="button" className={styles.cancelLink} onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


        </div>
    );
};

export default ListaTrabajadores;
