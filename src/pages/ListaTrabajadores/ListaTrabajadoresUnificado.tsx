import React, { useState, useEffect, useMemo } from "react";
import styles from "./ListaTrabajadoresUnificado.module.css";
import menuStyles from "../../components/Menu.module.css";
import { HiOutlineUser, HiX } from 'react-icons/hi';
import { 
    HiOutlinePhone, 
    HiOutlineMapPin, 
    HiOutlineEnvelope,
    HiOutlineWrench
} from 'react-icons/hi2';
import { useNavigate } from "react-router-dom";
import { useModal } from "../../context/ModalContext";
import { useAuth } from "../../context/AuthContext";

export interface ListaTrabajadoresConfig {
    isAutonomo: boolean;
    basePath: string;
    trabajadoresService: {
        getTrabajadores: () => Promise<any>;
        createTrabajador: (data: any) => Promise<any>;
        toggleEstado: (id: string | number, newEstado: string) => Promise<any>;
    };
}

interface Trabajador {
    id: number;
    nombre: string;
    fecha: string;
    puesto: string;
    telefono?: string;
    correo?: string;
    estado: "Activo" | "Baja";
    avatar?: string;
    direccion?: string;
    rfc?: string;
}

function getRelativeTime(fecha: string): string {
    const parts = fecha.split('/');
    if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const refDate = new Date(y, m, d);
        const now = new Date();
        refDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
        const diffTime = now.getTime() - refDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return "Hoy";
        if (diffDays === 1) return "Hace 1 día";
        return `Hace ${diffDays} días`;
    }
    return "";
}

// ── Subcomponente Modal: Aislado para evitar re-renderizados y cuellos de botella ──
interface ModalNuevoTrabajadorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (workerData: {
        nombre: string;
        telefono: string;
        correo: string;
        password: string;
        tipo: "Interno" | "Externo";
        roles: string[];
    }) => Promise<void>;
}

const ModalNuevoTrabajador: React.FC<ModalNuevoTrabajadorProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [type, setType] = useState<"Interno" | "Externo">("Interno");
    const [roles, setRoles] = useState<string[]>([]);
    const [availableRoles, setAvailableRoles] = useState(["General", "Electricista", "Plomero", "Albañil", "Pintor"]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showAlert } = useModal();

    if (!isOpen) return null;

    const handleRoleToggle = (role: string) => {
        setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    const handleAddCategory = () => {
        const trimmed = newCategoryName.trim();
        if (trimmed) {
            if (!availableRoles.includes(trimmed)) setAvailableRoles(prev => [...prev, trimmed]);
            if (!roles.includes(trimmed)) setRoles(prev => [...prev, trimmed]);
            setNewCategoryName("");
        }
    };

    const handleRemoveCategory = (role: string) => {
        setAvailableRoles(prev => prev.filter(r => r !== role));
        setRoles(prev => prev.filter(r => r !== role));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !email.trim() || !password.trim()) {
            showAlert("Campos Incompletos", "Rellena nombre, correo y contraseña obligatoriamente.", "warning");
            return;
        }

        if (password.length < 6) {
            showAlert("Contraseña Inválida", "La contraseña debe tener un mínimo de 6 caracteres.", "warning");
            return;
        }

        try {
            setIsSubmitting(true);
            await onSave({
                nombre: name.trim(),
                telefono: phone.trim(),
                correo: email.trim(),
                password: password,
                tipo: type,
                roles: roles
            });
            setName("");
            setPhone("");
            setEmail("");
            setPassword("");
            setType("Interno");
            setRoles([]);
            onClose();
        } catch {
            // El error se maneja en onSave
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${styles.modalWide}`}>
                <h2 className={styles.modalTitleLarge}>Nuevo Trabajador</h2>
                <p className={styles.modalSubtitle}>Ingresa los datos para registrar un nuevo integrante al equipo.</p>
                
                <form onSubmit={handleSubmit} className={styles.workerForm}>
                    <div className={styles.formGrid}>
                        <div className={styles.formField}>
                            <label>Nombre Completo</label>
                            <input
                                type="text"
                                className={styles.premiumInput}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej. Juan Pérez"
                                required
                            />
                        </div>

                        <div className={styles.formField}>
                            <label>Teléfono</label>
                            <input
                                type="tel"
                                className={styles.premiumInput}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ej. 993 123 4567"
                            />
                        </div>

                        <div className={styles.formField}>
                            <label>Correo Electrónico</label>
                            <input
                                type="email"
                                className={styles.premiumInput}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Ej. juan@correo.com"
                                required
                            />
                        </div>

                        <div className={styles.formField}>
                            <label>Contraseña</label>
                            <input
                                type="text"
                                className={styles.premiumInput}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                                    checked={type === "Interno"} 
                                    onChange={(e) => setType(e.target.value as "Interno" | "Externo")}
                                />
                                Técnico Interno
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    name="workerType" 
                                    value="Externo" 
                                    checked={type === "Externo"} 
                                    onChange={(e) => setType(e.target.value as "Interno" | "Externo")}
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
                                            checked={roles.includes(role)}
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
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }}}
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
                        <button type="submit" className={styles.saveWorkerBtn} disabled={isSubmitting}>
                            {isSubmitting ? 'Guardando...' : 'Guardar Trabajador'}
                        </button>
                        <button type="button" className={styles.cancelLink} onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Componente Principal Unificado ──
const ListaTrabajadoresUnificado: React.FC<{ config: ListaTrabajadoresConfig }> = ({ config }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert, showConfirm } = useModal();
    const [trabajadoresData, setTrabajadoresData] = useState<Trabajador[]>([]);
    const [flippedCardId, setFlippedCardId] = useState<number | null>(null);

    useEffect(() => {
        const handleGlobalClick = () => setFlippedCardId(null);
        document.addEventListener("click", handleGlobalClick);
        return () => document.removeEventListener("click", handleGlobalClick);
    }, []);
    
    const fetchTrabajadores = async () => {
        try {
            const data = await config.trabajadoresService.getTrabajadores();
            const rawList = Array.isArray(data) ? data : [];

            const mapped: Trabajador[] = rawList.map((t: any) => {
                const avatar = t.avatar || t.user?.avatar || null;
                return {
                    id: t.id,
                    nombre: t.nombre || t.user?.name || "Sin Nombre",
                    fecha: t.created_at ? new Date(t.created_at).toLocaleDateString("es-ES") : "—",
                    puesto: t.puesto || "General",
                    correo: t.correo || t.user?.email || "",
                    telefono: t.telefono || t.user?.telefono || "",
                    avatar: avatar,
                    estado: (t.estado === "Activo" || t.estado?.toLowerCase() === "activo") ? "Activo" : "Baja",
                    direccion: t.direccion,
                    rfc: t.rfc
                };
            });
            
            setTrabajadoresData(mapped);
        } catch (error) {
            console.error("Error cargando trabajadores:", error);
        }
    };

    useEffect(() => {
        fetchTrabajadores();
    }, []);

    const [searchText, setSearchText] = useState("");
    const [filterStatus, setFilterStatus] = useState<string[]>(["Activo", "Baja"]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [tempFilter, setTempFilter] = useState("Activos");

    // FILTRADO CON MEMOIZACIÓN PARA RENDIMIENTO
    const filteredWorkers = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        return trabajadoresData.filter((tr) => {
            const matchesText = !q || tr.nombre.toLowerCase().includes(q) || (tr.puesto && tr.puesto.toLowerCase().includes(q)) || (tr.correo && tr.correo.toLowerCase().includes(q));
            let matchesStatus = true;
            if (filterStatus.length === 1) {
                if (filterStatus.includes("Activo") && tr.estado !== "Activo") matchesStatus = false;
                if (filterStatus.includes("Baja") && tr.estado !== "Baja") matchesStatus = false;
            }
            return matchesText && matchesStatus;
        });
    }, [trabajadoresData, searchText, filterStatus]);

    const handleApplyFilter = () => {
        if (tempFilter === "Activos") setFilterStatus(["Activo"]);
        else setFilterStatus(["Baja"]);
        setIsFilterModalOpen(false);
    };

    const handleSaveWorker = async (workerData: {
        nombre: string;
        telefono: string;
        correo: string;
        password: string;
        tipo: "Interno" | "Externo";
        roles: string[];
    }) => {
        try {
            const rolesSeleccionados = workerData.roles.length > 0 ? workerData.roles.join(", ") : "General";
            const puestoConTipo = `${rolesSeleccionados} - ${workerData.tipo}`;
            
            await config.trabajadoresService.createTrabajador({
                nombre: workerData.nombre,
                correo: workerData.correo,
                password: workerData.password,
                puesto: puestoConTipo,
                telefono: workerData.telefono || null,
                tipo: workerData.tipo
            });

            await fetchTrabajadores();
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
                    showAlert("Validación Fallida", "Revisa que el correo no esté registrado previamente.", "warning");
                }
            } else {
                showAlert("Error", error.response?.data?.message || "Hubo un error contactando al servidor.", "error");
            }
            throw error;
        }
    };

    const handleDeactivateWorker = async (worker: Trabajador) => {
        showConfirm(
            "Confirmar Baja",
            `¿Estás seguro de dar de baja a ${worker.nombre}?`,
            async () => {
                try {
                    await config.trabajadoresService.toggleEstado(worker.id);
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
                    await config.trabajadoresService.toggleEstado(worker.id);
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
                                placeholder="Buscar técnico por nombre, especialidad o correo..."
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

                {/* LISTA DE TRABAJADORES - GRID */}
                <div className={styles.jobsSection}>
                    {filteredWorkers.map((worker) => {
                        const relativeTime = getRelativeTime(worker.fecha);
                        const displayLocation = worker.direccion || 'Mérida, Yucatán';

                        return (
                            <div
                                key={worker.id}
                                className={`${styles.flipCard} ${worker.estado === 'Baja' ? styles.cardBaja : ''} ${flippedCardId === worker.id ? styles.isFlipped : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const isMobile = window.innerWidth <= 768;
                                    if (isMobile) {
                                        if (flippedCardId !== worker.id) {
                                            setFlippedCardId(worker.id);
                                            return;
                                        }
                                    }
                                    navigate(`${config.basePath}/trabajador/${worker.id}`);
                                }}
                            >
                                <div className={styles.flipCardInner}>
                                    {/* FRONT SIDE */}
                                    <div className={styles.flipCardFront}>
                                        <div className={styles.cardCoverWrapper}>
                                            {worker.avatar ? (
                                                <img 
                                                    src={worker.avatar} 
                                                    alt={worker.nombre} 
                                                    className={styles.cardCoverImage}
                                                />
                                            ) : (
                                                <div className={styles.cardCoverPlaceholder}>
                                                    <HiOutlineUser size={48} color="#94a3b8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.cardInfoWrapper}>
                                            <h3 className={styles.cardName} title={worker.nombre}>{worker.nombre}</h3>
                                            {(() => {
                                                const displayPuesto = worker.puesto.replace('- Externo', '').replace('- Interno', '').trim();
                                                return <p className={styles.cardPuesto}>{displayPuesto}</p>;
                                            })()}
                                            <span className={`${styles.statusPill} ${worker.estado === 'Activo' ? styles.active : styles.baja}`} style={{ marginTop: '8px' }}>
                                                <span className={styles.statusDot}></span>
                                                {worker.estado}
                                            </span>
                                        </div>
                                    </div>

                                    {/* BACK SIDE */}
                                    <div className={styles.flipCardBack}>
                                        <div className={styles.cardContentBack}>
                                            {/* DETAILS LIST */}
                                            <div className={styles.detailsList}>
                                                <div className={styles.detailItem} title={worker.correo}>
                                                    <span className={styles.detailIcon}><HiOutlineEnvelope size={14} /></span>
                                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{worker.correo || '—'}</span>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.detailIcon}><HiOutlinePhone size={14} /></span>
                                                    <span>{worker.telefono || '—'}</span>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.detailIcon}><HiOutlineMapPin size={14} /></span>
                                                    <span>{displayLocation}</span>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.detailIcon}><HiOutlineWrench size={14} /></span>
                                                    <span>{worker.puesto.includes('Externo') ? 'Externo' : 'Interno'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
            <ModalNuevoTrabajador 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSave={handleSaveWorker} 
            />

        </div>
    );
};

export default ListaTrabajadoresUnificado;
