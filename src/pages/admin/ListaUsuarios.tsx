import { useState, useEffect } from "react";
import styles from "./ListaUsuarios.module.css";
import { HiOutlineUser, HiOutlineEnvelope, HiOutlineFingerPrint, HiOutlineUsers, HiOutlinePencil, HiOutlineLockClosed, HiOutlineLockOpen, HiCheck, HiXMark } from 'react-icons/hi2';
import { getUsers, updateUser } from "../../services/usersService";
import { useModal } from "../../context/ModalContext";

interface User {
    id: number;
    name: string;
    email: string;
    role: any;
    created_at: string;
    status: string; // "active" or "blocked"
    telefono?: string;
    avatar?: string;
}

export default function ListaUsuarios() {
    const { showAlert, showConfirm } = useModal();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [filterRole, setFilterRole] = useState("Todos");

    // Estados para edición
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editEmail, setEditEmail] = useState("");

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await getUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error cargando usuarios:", error);
            showAlert("Error", "No se pudieron cargar los usuarios.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const getRoleName = (role: any) => {
        if (!role) return "Usuario";
        if (typeof role === 'string') return role;
        if (typeof role === 'object' && role.name) return role.name;
        return "Usuario";
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
        } catch (error) {
            console.error("Error al actualizar email:", error);
            showAlert("Error", "No se pudo actualizar el correo.", "error");
        }
    };

    const handleToggleBlock = (user: User) => {
        const isBlocked = user.status === 'blocked';
        const action = isBlocked ? 'desbloquear' : 'bloquear';
        
        showConfirm(
            `¿Confirmar ${action}?`,
            `¿Estás seguro de que deseas ${action} a ${user.name}?`,
            async () => {
                try {
                    const newStatus = isBlocked ? 'active' : 'blocked';
                    await updateUser(user.id, { status: newStatus });
                    setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
                    showAlert("Éxito", `Usuario ${isBlocked ? 'desbloqueado' : 'bloqueado'} con éxito.`, "success");
                } catch (error) {
                    console.error("Error al cambiar estado:", error);
                    showAlert("Error", "No se pudo cambiar el estado del usuario.", "error");
                }
            }
        );
    };

    const filteredUsers = users.filter(u => {
        const roleName = getRoleName(u.role);
        
        // 1. Excluir al Root (por nombre o por ID 1 que suele ser el inicial)
        if (
            (u.name || "").toLowerCase() === "root" || 
            (u.email || "").toLowerCase().includes("root@") ||
            u.id === 1
        ) {
            return false;
        }

        // 2. Filtro por buscador
        const matchesSearch = 
            (u.name || "").toLowerCase().includes(searchText.toLowerCase()) || 
            (u.email || "").toLowerCase().includes(searchText.toLowerCase());

        // 3. Filtro por selector de Rol
        const matchesRole = 
            filterRole === "Todos" || 
            roleName.toLowerCase() === filterRole.toLowerCase() ||
            (filterRole === "Técnico" && roleName.toLowerCase() === "tecnico") ||
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
                    <select 
                        className={styles.roleSelect}
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                    >
                        <option value="Todos">Todos los roles</option>
                        <option value="Cliente">Clientes</option>
                        <option value="Tecnico">Técnicos</option>
                        <option value="Admin">Administradores</option>
                    </select>
                </div>
            </div>

            {/* LISTA */}
            <div className={styles.listGrid}>
                {loading ? (
                    <div className={styles.loading}>Cargando usuarios...</div>
                ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                        <div key={u.id} className={`${styles.userCard} ${u.status === 'blocked' ? styles.blocked : ''}`}>
                            <div className={styles.cardHeader}>
                                <div className={styles.avatar}>
                                    {u.avatar ? (
                                        <img 
                                            src={u.avatar} 
                                            alt={u.name} 
                                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                                        />
                                    ) : (
                                        <HiOutlineUser size={24} />
                                    )}
                                </div>
                                <div className={styles.mainInfo}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3>{u.name}</h3>
                                        <div className={styles.actionButtons}>
                                            <button 
                                                className={`${styles.iconBtn} ${styles.editBtn}`} 
                                                title="Editar Correo"
                                                onClick={() => handleEditStart(u)}
                                            >
                                                <HiOutlinePencil size={18} />
                                            </button>
                                            <button 
                                                className={`${styles.iconBtn} ${u.status === 'blocked' ? styles.unblockBtn : styles.blockBtn}`}
                                                title={u.status === 'blocked' ? "Desbloquear" : "Bloquear"}
                                                onClick={() => handleToggleBlock(u)}
                                            >
                                                {u.status === 'blocked' ? <HiOutlineLockOpen size={18} /> : <HiOutlineLockClosed size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                                        {u.status && (
                                            <span className={`${styles.statusLabel} ${u.status === 'active' ? styles.statusActive : styles.statusBlocked}`}>
                                                {u.status === 'active' ? 'ACTIVO' : 'BLOQUEADO'}
                                            </span>
                                        )}
                                        <span className={styles.roleBadge}>{getRoleName(u.role)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={styles.cardBody}>
                                <div className={styles.infoRow}>
                                    <HiOutlineEnvelope className={styles.icon} />
                                    {editingUserId === u.id ? (
                                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                            <input 
                                                className={styles.editInput}
                                                value={editEmail}
                                                onChange={(e) => setEditEmail(e.target.value)}
                                            />
                                            <button className={styles.saveBtn} onClick={() => handleSaveEmail(u.id)}><HiCheck /></button>
                                            <button className={styles.cancelBtn} onClick={() => setEditingUserId(null)}><HiXMark /></button>
                                        </div>
                                    ) : (
                                        <span>{u.email}</span>
                                    )}
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
        </div>
    );
}
