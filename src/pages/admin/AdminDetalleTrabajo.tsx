import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "../../components/Menu.module.css";

// Reusing interfaces (in a real app these should be in a types file)
interface Trabajo {
    id: number;
    titulo: string;
    ubicacion: string;
    tecnico: string;
    fecha: string; // Formato DD/MM/YYYY
    estado: "En Espera" | "Finalizado" | "En Proceso" | "Asignado" | "Solicitud";
    tipo?: "Visita" | "Trabajo";
    descripcion?: string; // Nuevo campo para detalle
}

interface Tecnico {
    id: number;
    nombre: string;
    avatar?: string;
}

const AdminDetalleTrabajo: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // MOCK DATA - Should fetch based on ID
    // Simulating finding the job from the previous list
    const [trabajo, setTrabajo] = useState<Trabajo | null>(null);

    // Mock Database
    const initialJobs: Trabajo[] = [
        {
            id: 101,
            titulo: "Electricidad - Mc Donals",
            ubicacion: "Mc Donals",
            tecnico: "Sin asignar",
            fecha: "25/08/2026",
            estado: "En Espera",
            descripcion: "Revisar cableado en cocina."
        },
        {
            id: 102,
            titulo: "Plomeria - Mc Donals",
            ubicacion: "Mc Donals",
            tecnico: "Jesus Antonio",
            fecha: "25/08/2026",
            estado: "Asignado",
            tipo: "Trabajo",
            descripcion: "Fuga en baño de clientes."
        },
        {
            id: 104,
            titulo: "Mantenimiento General",
            ubicacion: "Mc Donals",
            tecnico: "Carlos Dzul",
            fecha: "10/06/2026",
            estado: "Finalizado",
            tipo: "Visita",
            descripcion: "Mantenimiento preventivo mensual."
        },
        {
            id: 103,
            titulo: "Pintor - Mc Donals",
            ubicacion: "Mc Donals",
            tecnico: "Pedro Javier",
            fecha: "20/05/2026",
            estado: "Finalizado",
            tipo: "Trabajo",
            descripcion: "Pintar fachada exterior."
        }
    ];

    const tecnicosData: Tecnico[] = [
        { id: 1, nombre: "Javier Antonio Medina Medina" },
        { id: 2, nombre: "Carlos Daniel Dzul Vicente" },
        { id: 3, nombre: "Ernesto Eduardo Martin Escalante" },
        { id: 4, nombre: "Pedro Javier" },
    ];

    useEffect(() => {
        if (id) {
            const found = initialJobs.find(j => j.id === Number(id));
            if (found) {
                setTrabajo(found);
            }
        }
    }, [id]);

    // STATES FOR MODAL
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
    const [technicianSearch, setTechnicianSearch] = useState("");
    const [selectedType, setSelectedType] = useState<"Visita" | "Trabajo">("Visita");

    // HANDLERS
    const handleConfirmAssignment = () => {
        if (trabajo && selectedTechnicianId) {
            const tech = tecnicosData.find(t => t.id === selectedTechnicianId);
            if (tech) {
                setTrabajo({
                    ...trabajo,
                    tecnico: tech.nombre,
                    estado: "Asignado",
                    tipo: selectedType
                });
            }
        }
        setIsModalOpen(false);
    };

    const filteredTechnicians = tecnicosData.filter(t =>
        t.nombre.toLowerCase().includes(technicianSearch.toLowerCase())
    );

    if (!trabajo) return <div>Cargando...</div>;

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.leftColumn}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', fontSize: '16px' }}>
                    ← Volver
                </button>

                <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>

                    {/* ENCABEZADO */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{trabajo.titulo}</h2>
                            <p style={{ color: '#666' }}>Fecha: {trabajo.fecha}</p>
                        </div>
                        <div style={{
                            padding: '5px 15px',
                            borderRadius: '20px',
                            background: trabajo.estado === 'Finalizado' ? '#dfffd6' : '#d4ebf9',
                            color: trabajo.estado === 'Finalizado' ? '#2e7d32' : '#007bff',
                            fontWeight: 'bold'
                        }}>
                            {trabajo.estado}
                        </div>
                    </div>

                    {/* DETALLES */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                        <div>
                            <h4 style={{ color: '#888', marginBottom: '5px' }}>Ubicación</h4>
                            <p style={{ fontWeight: 'bold' }}>{trabajo.ubicacion}</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#888', marginBottom: '5px' }}>Técnico Asignado</h4>
                            <p style={{ fontWeight: 'bold' }}>{trabajo.tecnico}</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#888', marginBottom: '5px' }}>Descripción</h4>
                            <p style={{ fontWeight: 'bold' }}>{trabajo.descripcion || "Sin descripción"}</p>
                        </div>
                        {trabajo.tipo && (
                            <div>
                                <h4 style={{ color: '#888', marginBottom: '5px' }}>Tipo</h4>
                                <p style={{ fontWeight: 'bold' }}>{trabajo.tipo}</p>
                            </div>
                        )}
                    </div>

                    {/* ACCIONES */}
                    <div style={{ display: 'flex', gap: '15px' }}>
                        {trabajo.tecnico === "Sin asignar" ? (
                            <button
                                className={styles.statusBtn}
                                style={{ background: '#333', color: 'white', padding: '10px 20px', width: 'auto' }}
                                onClick={() => setIsModalOpen(true)}
                            >
                                Asignar Técnico
                            </button>
                        ) : (
                            <>
                                {trabajo.estado !== 'Finalizado' && (
                                    <button
                                        className={styles.statusBtn}
                                        style={{ background: '#333', color: 'white', padding: '10px 20px', width: 'auto' }}
                                        onClick={() => setIsModalOpen(true)}
                                    >
                                        Reasignar / Editar
                                    </button>
                                )}
                            </>
                        )}

                        {/* BOTÓN EN ESPERA SOLO SI ESTÁ ASIGNADO O SIN ASIGNAR */}
                        {(trabajo.estado !== 'Finalizado') && (
                            <button
                                className={styles.statusBtn}
                                style={{ background: '#f5f5f5', color: '#666', padding: '10px 20px', width: 'auto' }}
                            >
                                Poner en Espera
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.rightColumn}>
                {/* Espacio para chat o historial futuro */}
            </div>

            {/* MODAL (Reutilizado) */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ width: '500px' }}>
                        <h3 style={{ textAlign: 'center' }}>Asignar Tecnico</h3>

                        <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                            <label className={styles.radioLabel}>
                                <input type="radio" name="type" checked={selectedType === "Visita"} onChange={() => setSelectedType("Visita")} />
                                <span>Visita</span>
                            </label>
                            <label className={styles.radioLabel}>
                                <input type="radio" name="type" checked={selectedType === "Trabajo"} onChange={() => setSelectedType("Trabajo")} />
                                <span>Trabajo</span>
                            </label>
                        </div>

                        <div className={styles.searchCard} style={{ marginTop: '0', marginBottom: '20px', padding: '0' }}>
                            <input
                                type="text"
                                placeholder="🔍 Buscar técnico..."
                                className={styles.searchInput}
                                value={technicianSearch}
                                onChange={(e) => setTechnicianSearch(e.target.value)}
                                style={{ width: '100%', background: '#f5f5f5' }}
                            />
                        </div>

                        <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {filteredTechnicians.map(tech => (
                                <div key={tech.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '40px', height: '40px', background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                                        <span style={{ fontWeight: 'bold' }}>{tech.nombre}</span>
                                    </div>
                                    <input type="radio" name="selectedTech" checked={selectedTechnicianId === tech.id} onChange={() => setSelectedTechnicianId(tech.id)} style={{ width: '20px', height: '20px', accentColor: '#333' }} />
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <button onClick={handleConfirmAssignment} className={styles.applyBtn} disabled={!selectedTechnicianId} style={{ background: '#99e699', color: '#1a4d1a', width: 'auto', padding: '10px 30px' }}>Confirmar</button>
                            <div style={{ marginTop: '10px' }}>
                                <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDetalleTrabajo;
