import { useState, useEffect } from "react";
import styles from "./ListaUsuarios.module.css";
import { useNavigate } from "react-router-dom";
import { HiOutlineUser, HiOutlineEnvelope, HiOutlineFingerPrint, HiOutlineUsers, HiOutlinePencil, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineKey, HiCheck, HiXMark, HiOutlineEye, HiOutlinePlus } from 'react-icons/hi2';
import { getUsers, updateUser } from "../../services/usersService";
import { createAdminAutonomo } from "../../services/adminAutonomoService";
import { useModal } from "../../context/ModalContext";
import { useAuth } from "../../context/AuthContext";

interface User {
    id: number;
    name: string;
    email: string;
    role: any;
    created_at: string;
    status: string;
    active?: number | boolean;
    telefono?: string;
    avatar?: string;
}

export default function ListaUsuarios() {
    const { showAlert, showConfirm } = useModal();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [filterRole, setFilterRole] = useState("Todos");
    const [flippedCardId, setFlippedCardId] = useState<number | null>(null);

    useEffect(() => {
        const handleGlobalClick = () => setFlippedCardId(null);
        document.addEventListener("click", handleGlobalClick);
        return () => document.removeEventListener("click", handleGlobalClick);
    }, []);

    // Estados para edición
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editEmail, setEditEmail] = useState("");

    // Estados para resetear contraseña
    const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState("");

    // ── Modal crear Admin Autónomo ──────────────────────────────────────────
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPass, setNewPass] = useState("");
    const [creatingAutonomo, setCreatingAutonomo] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await getUsers();

            const storedWorkers = localStorage.getItem('trabajadores_list');
            const localList = storedWorkers ? JSON.parse(storedWorkers) : [];

            const userArray = Array.isArray(data) ? data : [];
            const mapped = userArray.map(u => {
                let localAvatar = u.avatar;
                if (!localAvatar) {
                    const localWorker = localList.find((w: any) => w.nombre === u.name || w.correo === u.email);
                    if (localWorker && localWorker.avatar) {
                        localAvatar = localWorker.avatar;
                    } else {
                        const profileKey = `profile_${u.name?.replace(/\s+/g, '') || 'default'}`;
                        const profileData = localStorage.getItem(profileKey);
                        if (profileData) {
                            try { localAvatar = JSON.parse(profileData).imagenPerfil || null; } catch (e) {}
                        }
                    }
                }
                return { ...u, avatar: localAvatar };
            });

            setUsers(mapped);
        } catch (error) {
            console.error("Error cargando usuarios:", error);
            showAlert("Error", "No se pudieron cargar los usuarios.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const getRoleName = (role: any) => {
        let name = "Usuario";
        if (role) {
            if (typeof role === 'string') name = role;
            else if (typeof role === 'object' && role.name) name = role.name;
        }
        
        if (name.toLowerCase() === 'encargado') return 'Encargado de Sucursal';
        if (name.toLowerCase() === 'gerente-general') return 'Encargado';
        return name;
    };

    const handleEditStart = (user: User) => {
        setEditingUserId(user.id);
        setEditEmail(user.email);
    };

    const handleSaveEmail = async (userId: number) => {
        try {
            await updateUser(userId, { email: editEmail });
            setUsers(users.map(u => u.id === userId ? { ...u, email: editEmail } : u));
            setEditingUserId(null);
            showAlert("Éxito", "Correo actualizado correctamente.", "success");
        } catch (error: any) {
            let errorMsg = "No se pudo actualizar el correo.";
            if (error.response?.data?.errors?.email) errorMsg = error.response.data.errors.email[0];
            else if (error.response?.data?.message) errorMsg = error.response.data.message;
            showAlert("Error", errorMsg, "error");
        }
    };

    const handlePasswordResetStart = (user: User) => {
        setResetPasswordUserId(user.id);
        setNewPassword("");
    };

    const handleSavePassword = async () => {
        if (!resetPasswordUserId) return;
        if (newPassword.length < 6) { showAlert("Atención", "La contraseña debe tener al menos 6 caracteres.", "warning"); return; }
        try {
            await updateUser(resetPasswordUserId, { password: newPassword });
            setResetPasswordUserId(null);
            setNewPassword("");
            showAlert("Éxito", "Contraseña cambiada correctamente.", "success");
        } catch (error: any) {
            showAlert("Error", error.response?.data?.message || "No se pudo cambiar la contraseña.", "error");
        }
    };

    const handleToggleBlock = (user: User) => {
        const isBlocked = !user.active || user.active === 0;
        showConfirm(
            `¿Confirmar ${isBlocked ? 'desbloquear' : 'bloquear'}?`,
            `¿Estás seguro de que deseas ${isBlocked ? 'desbloquear' : 'bloquear'} a ${user.name}?`,
            async () => {
                try {
                    const newActive = isBlocked ? 1 : 0;
                    await updateUser(user.id, { active: newActive });
                    setUsers(users.map(u => u.id === user.id ? { ...u, active: newActive } : u));
                    showAlert("Éxito", `Usuario ${isBlocked ? 'desbloqueado' : 'bloqueado'} con éxito.`, "success");
                } catch {
                    showAlert("Error", "No se pudo cambiar el estado del usuario.", "error");
                }
            }
        );
    };

    // ── Crear Admin Autónomo ────────────────────────────────────────────────
    const handleCreateAutonomo = async () => {
        if (!newName || !newEmail || !newPass) {
            showAlert("Campos requeridos", "Completa nombre, correo y contraseña.", "warning");
            return;
        }
        if (newPass.length < 6) {
            showAlert("Contraseña corta", "La contraseña debe tener al menos 6 caracteres.", "warning");
            return;
        }
        setCreatingAutonomo(true);
        try {
            // Obtener el role_id del rol admin-autonomo de la BD
            // El ID es 7 según la migración, pero lo buscamos dinámicamente del listado de usuarios si ya hay uno
            // Por seguridad, enviamos el nombre del rol y el backend lo valida por su hierarchy_level
            await createAdminAutonomo({
                name: newName,
                email: newEmail,
                password: newPass,
                role_id: 7, // ID del rol admin-autonomo según migración
            });
            showAlert("¡Admin Autónomo creado!", `${newName} ya puede iniciar sesión. Su panel estará en /autonomo.`, "success");
            setShowCreateModal(false);
            setNewName(""); setNewEmail(""); setNewPass("");
            fetchUsers();
        } catch (error: any) {
            const msg = error.response?.data?.message || "No se pudo crear el Admin Autónomo.";
            showAlert("Error", msg, "error");
        } finally {
            setCreatingAutonomo(false);
        }
    };

    const isAutonomo = (u: User) => {
        const role = getRoleName(u.role).toLowerCase();
        return role === 'admin-autonomo' || role === 'autonomo';
    };

    const filteredUsers = users.filter(u => {
        const roleName = getRoleName(u.role);

        if ((u.name || "").toLowerCase() === "root" || (u.email || "").toLowerCase().includes("root@") || u.id === 1) return false;

        // Ocultar al Admin Autónomo si el usuario logueado es Encargado (gerente-general) o Encargado de Sucursal
        if ((user?.role === 'gerente-general' || user?.role === 'encargado') && isAutonomo(u)) {
            return false;
        }

        const matchesSearch =
            (u.name || "").toLowerCase().includes(searchText.toLowerCase()) ||
            (u.email || "").toLowerCase().includes(searchText.toLowerCase());

        const matchesRole =
            filterRole === "Todos" ||
            roleName.toLowerCase() === filterRole.toLowerCase() ||
            (filterRole === "Trabajador" && (roleName.toLowerCase() === "trabajador" || roleName.toLowerCase() === "tecnico")) ||
            (filterRole === "Técnico" && roleName.toLowerCase() === "tecnico") ||
            (filterRole === "Trabajador" && roleName.toLowerCase() === "trabajador") ||
            (filterRole === "EncargadoSucursal" && roleName.toLowerCase() === "encargado de sucursal") ||
            (filterRole === "Encargado" && roleName.toLowerCase() === "encargado") ||
            (filterRole === "Cliente" && roleName.toLowerCase() === "cliente");

        return matchesSearch && matchesRole;
    });

    return (
        <div className={styles.container}>
            {/* BUSCADOR Y FILTROS */}
            <div className={styles.topActions}>
                <div className={styles.searchCard}>
                    <HiOutlineUsers className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o correo..."
                        className={styles.searchInput}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>

                <div className={styles.filterWrapper}>
                    <select className={styles.roleSelect} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                        <option value="Todos">Todos los roles</option>
                        <option value="Cliente">Clientes</option>
                        <option value="Trabajador">Trabajadores</option>
                        {user?.role === 'admin' && (
                            <>
                                <option value="Admin">Administradores</option>
                                <option value="AdminAutonomo">Admin Autónomo</option>
                                <option value="Encargado">Encargados (G. Generales)</option>
                                <option value="EncargadoSucursal">Encargados de Sucursal</option>
                            </>
                        )}
                        {(user?.role === 'autonomo' || user?.role === 'gerente-general' || user?.role === 'admin-autonomo') && (
                            <>
                                <option value="Encargado">Encargados (G. Generales)</option>
                                <option value="EncargadoSucursal">Encargados de Sucursal</option>
                            </>
                        )}
                    </select>
                </div>

                {/* BOTÓN CREAR ADMIN AUTÓNOMO */}
                {user?.role === 'admin' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 18px', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg, #f26522, #e05510)',
                            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                            whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(242,101,34,0.3)'
                        }}
                    >
                        <HiOutlinePlus size={18} /> Admin Autónomo
                    </button>
                )}
            </div>

            {/* LISTA */}
            <div className={styles.listGrid}>
                {loading ? (
                    <div className={styles.loading}>Cargando usuarios...</div>
                ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => {
                        const isAutonomoUser = isAutonomo(u);
                        return (
                            <div
                                key={u.id}
                                className={`${styles.flipCard} ${(!u.active || u.active === 0) ? styles.cardBlocked : ''} ${isAutonomoUser ? styles.cardAutonomo : ''} ${flippedCardId === u.id ? styles.isFlipped : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const isMobile = window.innerWidth <= 768;
                                    if (isMobile) {
                                        if (flippedCardId !== u.id) {
                                            setFlippedCardId(u.id);
                                        } else {
                                            setFlippedCardId(null);
                                        }
                                    }
                                }}
                            >
                                <div className={styles.flipCardInner}>
                                    {/* FRONT SIDE */}
                                    <div className={styles.flipCardFront}>
                                        <div className={styles.cardCoverWrapper}>
                                            {u.avatar ? (
                                                <img 
                                                    src={u.avatar} 
                                                    alt={u.name} 
                                                    className={styles.cardCoverImage}
                                                />
                                            ) : (
                                                <div className={styles.cardCoverPlaceholder}>
                                                    <HiOutlineUser size={48} color="#94a3b8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.cardInfoWrapper}>
                                            <h3 className={styles.cardName} title={u.name}>{u.name}</h3>
                                            <span className={styles.roleBadge}
                                                style={isAutonomoUser ? { background: '#fff0e8', color: '#f26522', fontWeight: 800 } : {}}>
                                                {isAutonomoUser ? '🏢 Admin Autónomo' : getRoleName(u.role)}
                                            </span>
                                            <span className={`${styles.statusPill} ${(u.active && u.active !== 0) ? styles.active : styles.blocked}`} style={{ marginTop: '8px' }}>
                                                <span className={styles.statusDot}></span>
                                                {(u.active && u.active !== 0) ? 'ACTIVO' : 'BLOQUEADO'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* BACK SIDE */}
                                    <div className={styles.flipCardBack}>
                                        <div className={styles.cardContentBack}>
                                            <div className={styles.detailsList}>
                                                <div className={styles.detailItem} title={u.email} onClick={(e) => e.stopPropagation()}>
                                                    <span className={styles.detailIcon}><HiOutlineEnvelope size={14} /></span>
                                                    {editingUserId === u.id ? (
                                                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                                            <input className={styles.editInput} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                                            <button className={styles.saveBtn} onClick={() => handleSaveEmail(u.id)} style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><HiCheck /></button>
                                                            <button className={styles.cancelBtn} onClick={() => setEditingUserId(null)} style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><HiXMark /></button>
                                                        </div>
                                                    ) : <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.email}</span>}
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.detailIcon}><HiOutlineFingerPrint size={14} /></span>
                                                    <span>ID: {u.id}</span>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    <span className={styles.detailIcon}><HiOutlineUsers size={14} /></span>
                                                    <span style={{ fontSize: '12px' }}>Registrado: {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</span>
                                                </div>
                                            </div>

                                            <div className={styles.actionButtonsBack} onClick={(e) => e.stopPropagation()}>
                                                {(!isAutonomoUser || user?.role !== 'gerente-general') && (
                                                    <>
                                                        <button className={`${styles.iconBtn} ${styles.editBtn}`} title="Editar Correo" onClick={() => handleEditStart(u)}>
                                                            <HiOutlinePencil size={18} />
                                                        </button>
                                                        <button className={`${styles.iconBtn}`} title="Cambiar Contraseña" onClick={() => handlePasswordResetStart(u)} style={{ color: '#eab308' }}>
                                                            <HiOutlineKey size={18} />
                                                        </button>
                                                        <button className={`${styles.iconBtn} ${(!u.active || u.active === 0) ? styles.unblockBtn : styles.blockBtn}`} title={(!u.active || u.active === 0) ? "Desbloquear" : "Bloquear"} onClick={() => handleToggleBlock(u)}>
                                                            {(!u.active || u.active === 0) ? <HiOutlineLockOpen size={18} /> : <HiOutlineLockClosed size={18} />}
                                                        </button>
                                                    </>
                                                )}
                                                {isAutonomoUser && (
                                                    <button
                                                        className={styles.iconBtn}
                                                        title="Ver su sistema"
                                                        onClick={() => navigate(`/menu/admin-autonomo/${u.id}`)}
                                                        style={{ color: '#f26522' }}
                                                    >
                                                        <HiOutlineEye size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className={styles.noResults}>No se encontraron usuarios.</div>
                )}
            </div>

            {/* Modal de Cambio de Contraseña */}
            {resetPasswordUserId && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Cambiar Contraseña</h3>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>Ingresa la nueva contraseña para este usuario.</p>
                        <input type="password" placeholder="Nueva contraseña (mínimo 6 caracteres)" className={styles.modalInput} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        <div className={styles.modalFooter}>
                            <button className={styles.btnSecondary} onClick={() => setResetPasswordUserId(null)}>Cancelar</button>
                            <button className={styles.btnPrimary} onClick={handleSavePassword}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL CREAR ADMIN AUTÓNOMO ── */}
            {showCreateModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ maxWidth: 460 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <h3 style={{ margin: 0, color: '#f26522', fontSize: 18 }}>🏢 Crear Admin Autónomo</h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <HiXMark size={22} />
                            </button>
                        </div>
                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>
                            El Admin Autónomo tendrá su propio sistema completo — sucursales, técnicos, trabajos y cotizaciones completamente independientes.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Nombre completo</label>
                                <input className={styles.modalInput} placeholder="Ej: Juan Rodríguez" value={newName} onChange={e => setNewName(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Correo electrónico</label>
                                <input type="email" className={styles.modalInput} placeholder="correo@empresa.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Contraseña inicial</label>
                                <input type="password" className={styles.modalInput} placeholder="Mínimo 6 caracteres" value={newPass} onChange={e => setNewPass(e.target.value)} />
                            </div>
                        </div>
                        <div className={styles.modalFooter} style={{ marginTop: 20 }}>
                            <button className={styles.btnSecondary} onClick={() => setShowCreateModal(false)} disabled={creatingAutonomo}>Cancelar</button>
                            <button
                                className={styles.btnPrimary}
                                onClick={handleCreateAutonomo}
                                disabled={creatingAutonomo}
                                style={{ background: 'linear-gradient(135deg, #f26522, #e05510)', border: 'none' }}
                            >
                                {creatingAutonomo ? 'Creando...' : 'Crear Admin Autónomo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
