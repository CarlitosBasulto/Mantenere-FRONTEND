import React, { useState, useEffect } from "react";
import styles from "./ListaTrabajadores.module.css";
import menuStyles from "../../components/Menu.module.css";
import { HiOutlineUser, HiX } from 'react-icons/hi';
import { useNavigate } from "react-router-dom";
import { useModal } from "../../context/ModalContext";
import { useAuth } from "../../context/AuthContext";
import { getTrabajadores, createTrabajador, toggleEstado } from "../../services/trabajadoresService";
import { createNotificacionByRole } from "../../services/notificacionesService";

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
    const { user } = useAuth(); // Agregado useAuth para saber el rol
    const { showAlert, showConfirm } = useModal();
    const [trabajadoresData, setTrabajadoresData] = useState<Trabajador[]>([]);
    
    const fetchTrabajadores = async () => {
        try {
            const data = await getTrabajadores();
            
            const stored = localStorage.getItem('trabajadores_list');
            const localList = stored ? JSON.parse(stored) : [];

            const mapped: Trabajador[] = data.map((t: any) => {
                let localAvatar = t.avatar;
                if (!localAvatar) {
                    const localWorker = localList.find((w: any) => w.nombre === t.nombre || w.correo === t.correo);
                    if (localWorker && localWorker.avatar) {
                        localAvatar = localWorker.avatar;
                    } else {
                        // Check profile key directly just in case
                        const profileKey = `profile_${t.nombre?.replace(/\s+/g, '') || 'default'}`;
                        const profileData = localStorage.getItem(profileKey);
                        if (profileData) {
                            localAvatar = JSON.parse(profileData).imagenPerfil;
                        }
                    }
                }

                return {
                    id: t.id,
                    nombre: t.nombre,
                    fecha: new Date(t.created_at).toLocaleDateString("es-ES"),
                    puesto: t.puesto || "General",
                    correo: t.correo,
                    avatar: localAvatar, // Usa el local si la API falló en guardarlo
                    estado: t.estado === "Activo" || t.estado?.toLowerCase() === "activo" ? "Activo" : "Baja"
                };
            });
            
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
    const [newWorkerType, setNewWorkerType] = useState<"Interno" | "Externo">("Interno");
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

    // ESTADOS PARA "SOLICITAR TÉCNICO"
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestRole, setRequestRole] = useState("");

    const handleRequestTechnician = async () => {
        if (!requestRole) {
            showAlert("Atención", "Por favor selecciona el tipo de técnico que necesitas.", "warning");
            return;
        }

        try {
            await createNotificacionByRole({
                role: 'admin-autonomo', // Enviaremos solicitud a los autónomos
                titulo: 'Solicitud de Técnico',
                mensaje: `El administrador general solicita un técnico con especialidad: ${requestRole}.`,
                enlace: '/autonomo/trabajadores'
            });
            showAlert("Éxito", "Solicitud enviada a los administradores autónomos.", "success");
            setIsRequestModalOpen(false);
            setRequestRole("");
        } catch (error) {
            console.error(error);
            showAlert("Error", "No se pudo enviar la solicitud.", "error");
        }
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
            const puestoConTipo = `${rolesSeleccionados} - ${newWorkerType}`;
            await createTrabajador({
                nombre: newWorkerName,
                correo: newWorkerEmail,
                password: newWorkerPassword,
                puesto: puestoConTipo,
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
            setNewWorkerType("Interno");
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
                    <div className={styles.searchBarContainer}>
                        <div className={menuStyles.searchCard}>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className={menuStyles.searchInput}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>

                        {/* BOTON FILTRO */}
                        <button
                            className={styles.filterBtn}
                            onClick={() => setIsFilterModalOpen(true)}
                            title="Filtrar"
                        >
                            <span style={{ fontSize: '18px' }}>⚙️</span>
                        </button>
                    </div>

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

                {/* LISTA DE TRABAJADORES - GRID 3 COLUMNAS */}
                <div className={styles.jobsSection}>
                    {filteredWorkers.map((worker) => (
                        <div
                            key={worker.id}
                            className={styles.jobCard}
                            onClick={() => {
                                if (user?.role === 'autonomo') {
                                    navigate(`/autonomo/trabajador/${worker.id}`);
                                } else {
                                    navigate(`/menu/trabajador/${worker.id}`);
                                }
                            }}
                        >
                            {/* Barra de color superior */}
                            <div className={`${styles.cardIndicator} ${styles.orange}`}></div>

                            <div className={styles.cardContent}>
                                {/* AVATAR */}
                                <div className={styles.cardIcon}>
                                    {worker.avatar ? (
                                        <img 
                                            src={worker.avatar} 
                                            alt={worker.nombre} 
                                            style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover' }} 
                                        />
                                    ) : (
                                        <HiOutlineUser size={36} color="#555" />
                                    )}
                                </div>

                                {/* INFO */}
                                <div className={styles.cardInfo}>
                                    <h3>{worker.nombre}</h3>
                                    {(() => {
                                        const isExterno = worker.puesto.includes('- Externo');
                                        const isInterno = worker.puesto.includes('- Interno');
                                        const displayPuesto = worker.puesto.replace('- Externo', '').replace('- Interno', '').trim();
                                        return (
                                            <>
                                                <p>{displayPuesto}</p>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: worker.estado === 'Activo' ? '#16a34a' : '#dc2626' }}>
                                                        {worker.estado}
                                                    </span>
                                                    {(isExterno || isInterno) && (
                                                        <span style={{ 
                                                            fontSize: '11px', 
                                                            fontWeight: 'bold', 
                                                            padding: '2px 7px', 
                                                            borderRadius: '10px', 
                                                            background: isExterno ? '#fef3c7' : '#e0e7ff', 
                                                            color: isExterno ? '#d97706' : '#4338ca' 
                                                        }}>
                                                            {isExterno ? 'Externo' : 'Interno'}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={styles.cardDate}>{worker.fecha}</span>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* BOTÓN ACCIÓN */}
                                <div style={{ marginTop: '4px', zIndex: 10 }}>
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
                                                padding: '6px 16px',
                                                borderRadius: '15px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
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
                                                padding: '6px 16px',
                                                borderRadius: '15px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Activar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>



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

                            <div className={styles.typeSection} style={{ marginBottom: '20px', marginTop: '10px' }}>
                                <label className={styles.sectionLabel} style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#334155', fontWeight: '600' }}>Tipo de Técnico</label>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="workerType" 
                                            value="Interno" 
                                            checked={newWorkerType === "Interno"} 
                                            onChange={(e) => setNewWorkerType(e.target.value as "Interno" | "Externo")}
                                        />
                                        Técnico Interno
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            name="workerType" 
                                            value="Externo" 
                                            checked={newWorkerType === "Externo"} 
                                            onChange={(e) => setNewWorkerType(e.target.value as "Interno" | "Externo")}
                                        />
                                        Técnico Externo
                                    </label>
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

            {/* BOTÓN FLOTANTE SOLICITAR TÉCNICO */}
            <button 
                className={styles.floatingRequestBtn}
                onClick={() => setIsRequestModalOpen(true)}
            >
                ¿Necesitas técnicos?
            </button>

            {/* MODAL DE SOLICITAR TÉCNICO */}
            {isRequestModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
                        <div className={styles.modalHeader}>
                            <h2>Solicitar Técnico</h2>
                            <button className={styles.closeBtn} onClick={() => setIsRequestModalOpen(false)}>
                                <HiX size={24} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p style={{ color: '#475569', marginBottom: '15px', fontSize: '14px' }}>
                                ¿Qué tipo de técnico necesitas? Enviaremos tu solicitud a los administradores autónomos.
                            </p>
                            <select 
                                className={styles.inputField} 
                                value={requestRole} 
                                onChange={(e) => setRequestRole(e.target.value)}
                            >
                                <option value="">Selecciona una opción...</option>
                                <option value="General">General</option>
                                <option value="Albañil">Albañil</option>
                                <option value="Plomero">Plomero</option>
                                <option value="Electricista">Electricista</option>
                                <option value="Pintor">Pintor</option>
                                <option value="Jardinero">Jardinero</option>
                                <option value="Aire Acondicionado">Aire Acondicionado</option>
                                <option value="Cerrajería">Cerrajería</option>
                            </select>
                            
                            <div className={styles.formActions} style={{ marginTop: '20px' }}>
                                <button className={styles.cancelBtn} onClick={() => setIsRequestModalOpen(false)}>Cancelar</button>
                                <button className={styles.submitBtn} onClick={handleRequestTechnician}>Solicitar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ListaTrabajadores;
