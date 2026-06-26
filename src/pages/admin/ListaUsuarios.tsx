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
        
        if (name.toLowerCase() === 'encargado') return 'Sub-Gerente';
        if (name.toLowerCase() === 'gerente-general') return 'Gerente General';
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
        const isBlocked = user.status === 'blocked';
        showConfirm(
            `¿Confirmar ${isBlocked ? 'desbloquear' : 'bloquear'}?`,
            `¿Estás seguro de que deseas ${isBlocked ? 'desbloquear' : 'bloquear'} a ${user.name}?`,
            async () => {
                try {
                    const newStatus = isBlocked ? 'active' : 'blocked';
                    await updateUser(user.id, { status: newStatus });
                    setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
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

    const filteredUsers = users.filter(u => {
        const roleName = getRoleName(u.role);

        if ((u.name || "").toLowerCase() === "root" || (u.email || "").toLowerCase().includes("root@") || u.id === 1) return false;

        const matchesSearch =
            (u.name || "").toLowerCase().includes(searchText.toLowerCase()) ||
            (u.email || "").toLowerCase().includes(searchText.toLowerCase());

        const matchesRole =
            filterRole === "Todos" ||
            roleName.toLowerCase() === filterRole.toLowerCase() ||
            (filterRole === "Trabajador" && (roleName.toLowerCase() === "trabajador" || roleName.toLowerCase() === "tecnico")) ||
            (filterRole === "Cliente" && roleName.toLowerCase() === "cliente") ||
            (filterRole === "Admin" && roleName.toLowerCase() === "admin") ||
            (filterRole === "AdminAutonomo" && roleName.toLowerCase() === "admin-autonomo") ||
            (filterRole === "GerenteGeneral" && roleName.toLowerCase() === "gerente general") ||
            (filterRole === "SubGerente" && roleName.toLowerCase() === "sub-gerente");

        return matchesSearch && matchesRole;
    });

    const isAutonomo = (u: User) => getRoleName(u.role).toLowerCase() === 'admin-autonomo';

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
                            </>
                        )}
                        {(user?.role === 'admin-autonomo' || user?.role === 'gerente-general') && (
                            <>
                                <option value="GerenteGeneral">Gerentes Generales</option>
                                <option value="SubGerente">Sub-Gerentes</option>
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
                    filteredUsers.map((u) => (
                        <div key={u.id} className={`${styles.userCard} ${u.status === 'blocked' ? styles.blocked : ''}`}
                            style={isAutonomo(u) ? { borderTop: '3px solid #f26522', background: '#fffaf7' } : {}}>
                            <div className={styles.cardHeader}>
                                <div className={styles.avatar}>
                                    {u.avatar ? (
                                        <img src={u.avatar} alt={u.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <HiOutlineUser size={24} />
                                    )}
                                </div>
                                <div className={styles.mainInfo}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3>{u.name}</h3>
                                        <div className={styles.actionButtons}>
                                            <button className={`${styles.iconBtn} ${styles.editBtn}`} title="Editar Correo" onClick={() => handleEditStart(u)}>
                                                <HiOutlinePencil size={18} />
                                            </button>
                                            <button className={`${styles.iconBtn}`} title="Cambiar Contraseña" onClick={() => handlePasswordResetStart(u)} style={{ color: '#eab308' }}>
                                                <HiOutlineKey size={18} />
                                            </button>
                                            <button className={`${styles.iconBtn} ${u.status === 'blocked' ? styles.unblockBtn : styles.blockBtn}`} title={u.status === 'blocked' ? "Desbloquear" : "Bloquear"} onClick={() => handleToggleBlock(u)}>
                                                {u.status === 'blocked' ? <HiOutlineLockOpen size={18} /> : <HiOutlineLockClosed size={18} />}
                                            </button>
                                            {/* 👁 VER SISTEMA — solo para Admin Autónomo */}
                                            {isAutonomo(u) && (
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
                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px', gap: 6 }}>
                                        {u.status && (
                                            <span className={`${styles.statusLabel} ${u.status === 'active' ? styles.statusActive : styles.statusBlocked}`}>
                                                {u.status === 'active' ? 'ACTIVO' : 'BLOQUEADO'}
                                            </span>
                                        )}
                                        <span className={styles.roleBadge}
                                            style={isAutonomo(u) ? { background: '#fff0e8', color: '#f26522', fontWeight: 800 } : {}}>
                                            {isAutonomo(u) ? '🏢 Admin Autónomo' : getRoleName(u.role)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.infoRow}>
                                    <HiOutlineEnvelope className={styles.icon} />
                                    {editingUserId === u.id ? (
                                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                            <input className={styles.editInput} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                                            <button className={styles.saveBtn} onClick={() => handleSaveEmail(u.id)}><HiCheck /></button>
                                            <button className={styles.cancelBtn} onClick={() => setEditingUserId(null)}><HiXMark /></button>
                                        </div>
                                    ) : <span>{u.email}</span>}
                                </div>
                                <div className={styles.infoRow}>
                                    <HiOutlineFingerPrint className={styles.icon} />
                                    <span>ID: {u.id}</span>
                                </div>
                            </div>

                            <div className={styles.cardFooter}>
                                <span>Registrado: {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                    ))
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
