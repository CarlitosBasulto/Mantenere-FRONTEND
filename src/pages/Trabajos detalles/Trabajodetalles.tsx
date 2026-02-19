import React, { useState } from "react";
import { useParams } from "react-router-dom";
import styles from "../../components/Menu.module.css";

interface Trabajo {
    id: number;
    titulo: string;
    ubicacion: string;
    tecnico: string;
    fecha: string; // Formato DD/MM/YYYY
    estado: "En Espera" | "Finalizado" | "En Proceso" | "Asignado" | "Solicitud";
    tipo?: "Visita" | "Trabajo";
}

interface Tecnico {
    id: number;
    nombre: string;
    avatar?: string;
}

const TrabajoDetalle: React.FC = () => {
    const { id } = useParams();

    // DATOS SIMULADOS - TRABAJOS
    const [trabajosData, setTrabajosData] = useState<Trabajo[]>([
        {
            id: 101,
            titulo: "Electricidad - Mc Donals",
            ubicacion: "Mc Donals",
            tecnico: "Sin asignar",
            fecha: "25/08/2026",
            estado: "En Espera"
        },
        {
            id: 102,
            titulo: "Plomeria - Mc Donals",
            ubicacion: "Mc Donals",
            tecnico: "Jesus Antonio",
            fecha: "25/08/2026",
            estado: "Asignado",
            tipo: "Trabajo"
        },
        {
            id: 104,
            titulo: "Mantenimiento General",
            ubicacion: "Mc Donals",
            tecnico: "Carlos Dzul",
            fecha: "10/06/2026",
            estado: "Finalizado",
            tipo: "Visita"
        },
        {
            id: 103,
            titulo: "Pintor - Mc Donals",
            ubicacion: "Mc Donals",
            tecnico: "Pedro Javier",
            fecha: "20/05/2026",
            estado: "Finalizado",
            tipo: "Trabajo"
        }
    ]);

    // DATOS SIMULADOS - TECNICOS
    const tecnicosData: Tecnico[] = [
        { id: 1, nombre: "Javier Antonio Medina Medina" },
        { id: 2, nombre: "Carlos Daniel Dzul Vicente" },
        { id: 3, nombre: "Ernesto Eduardo Martin Escalante" },
        { id: 4, nombre: "Pedro Javier" },
    ];

    // ESTADOS
    const [searchText, setSearchText] = useState("");

    // Modal Asignación
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
    const [technicianSearch, setTechnicianSearch] = useState("");
    const [selectedType, setSelectedType] = useState<"Visita" | "Trabajo">("Visita");

    // Modal Filtro
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("Todos");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // --- LÓGICA DE FILTRADO Y AGRUPACIÓN (SOLO PARA TAB TRABAJO) ---
    const getGroupedJobs = () => {
        const groups: { [key: string]: Trabajo[] } = {};

        // Filtrar
        const filteredJobs = trabajosData.filter(job => {
            // Buscador Texto
            const matchesSearch = job.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
                job.tecnico.toLowerCase().includes(searchText.toLowerCase());

            // Filtro Estatus
            let matchesStatus = true;
            if (filterStatus !== "Todos") {
                if (filterStatus === "Completadas" && job.estado !== "Finalizado") matchesStatus = false;
                if (filterStatus === "En espera" && job.estado !== "En Espera") matchesStatus = false;
                if (filterStatus === "Asignados" && job.estado !== "Asignado") matchesStatus = false;
                if (filterStatus === "Sin asignar" && job.tecnico !== "Sin asignar") matchesStatus = false;
            }

            return matchesSearch && matchesStatus;
        });

        // Agrupar
        filteredJobs.forEach(job => {
            const dateKey = job.fecha;
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(job);
        });
        return groups;
    };

    const groupedJobs = getGroupedJobs();
    const sortedDates = Object.keys(groupedJobs).sort((a, b) => {
        const [da, ma, ya] = a.split('/').map(Number);
        const [db, mb, yb] = b.split('/').map(Number);
        return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
    });

    // --- HANDLERS ---
    const openAssignmentModal = (jobId: number) => {
        setSelectedJobId(jobId);
        setSelectedTechnicianId(null);
        setTechnicianSearch("");
        setSelectedType("Visita"); // Reset tipo por defecto
        setIsModalOpen(true);
    };

    const handleConfirmAssignment = () => {
        if (selectedJobId && selectedTechnicianId) {
            const tech = tecnicosData.find(t => t.id === selectedTechnicianId);
            if (tech) {
                setTrabajosData(prev => prev.map(job => {
                    if (job.id === selectedJobId) {
                        return {
                            ...job,
                            tecnico: tech.nombre,
                            estado: "Asignado",
                            tipo: selectedType // Guardamos el tipo seleccionado
                        };
                    }
                    return job;
                }));
            }
        }
        setIsModalOpen(false);
    };

    const filteredTechnicians = tecnicosData.filter(t =>
        t.nombre.toLowerCase().includes(technicianSearch.toLowerCase())
    );

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.leftColumn}>

                {/* HEADER / TITULO */}
                <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#000', margin: 0 }}>
                        Lista de trabajos
                    </h2>
                </div>

                {/* BUSCADOR */}
                <div className={styles.searchSection} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className={styles.searchCard} style={{ margin: 0, flex: 1, gap: '15px', background: '#f5f5f5', border: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', color: '#666' }}>🔍</div>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className={styles.searchInput}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none' }}
                        />
                    </div>
                    {/* BOTON FILTRO */}
                    <button
                        className={styles.filterBtn}
                        onClick={() => setIsFilterModalOpen(true)}
                        style={{ background: '#9ca3af', color: 'white', border: 'none', marginLeft: '10px' }}
                    >
                        ⚙️
                    </button>
                </div>

                {/* LISTA DE TRABAJOS */}
                <div className={styles.jobsSection} style={{ marginTop: '20px' }}>
                    {sortedDates.map(date => (
                        <div key={date}>
                            {groupedJobs[date].map(trabajo => (
                                <div key={trabajo.id} className={styles.jobCard} style={{ marginBottom: '15px' }}>
                                    <div className={styles.cardContent}>

                                        {/* ICONO */}
                                        <div className={styles.cardIconStatus}>
                                            {trabajo.estado === "Finalizado" ? "✅" : "🕒"}
                                        </div>

                                        {/* INFO */}
                                        <div className={styles.cardInfo}>
                                            <span className={styles.cardDate}>{trabajo.fecha}</span>
                                            <h3>{trabajo.titulo}</h3>
                                            <p>Tecnico: <span style={{ fontWeight: 'bold' }}>{trabajo.tecnico}</span></p>
                                            {/* Mostrar Tipo si existe */}
                                            {trabajo.tipo && (
                                                <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                                                    Tipo: <span style={{
                                                        background: '#f0f0f0', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold'
                                                    }}>{trabajo.tipo}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* ACCIONES */}
                                        <div className={styles.cardAction} style={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'flex-end' }}>

                                            {trabajo.tecnico === "Sin asignar" ? (
                                                <>
                                                    <button
                                                        className={styles.statusBtn}
                                                        style={{ background: '#e0e0e0', color: '#333', borderRadius: '20px', padding: '5px 15px', fontSize: '12px' }}
                                                        onClick={() => openAssignmentModal(trabajo.id)}
                                                    >
                                                        Asignar
                                                    </button>
                                                    <button
                                                        className={styles.statusBtn}
                                                        style={{ background: '#d4ebf9', color: '#007bff', borderRadius: '20px', padding: '5px 15px', fontSize: '12px' }}
                                                    >
                                                        En espera
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    {trabajo.estado !== 'Finalizado' && (
                                                        <button
                                                            className={styles.statusBtn}
                                                            style={{ background: '#e0e0e0', color: '#333', borderRadius: '20px', padding: '5px 15px', fontSize: '12px' }}
                                                            onClick={() => openAssignmentModal(trabajo.id)}
                                                        >
                                                            Editar
                                                        </button>
                                                    )}

                                                    <button
                                                        className={styles.statusBtn}
                                                        style={{
                                                            background: trabajo.estado === 'Finalizado' ? '#dfffd6' : '#d4ebf9',
                                                            color: trabajo.estado === 'Finalizado' ? '#2e7d32' : '#007bff',
                                                            borderRadius: '20px', padding: '5px 15px', fontSize: '12px'
                                                        }}
                                                    >
                                                        {trabajo.estado}
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* INDICADOR ESTADO LATERAL */}
                                        <div className={`${styles.cardIndicator} ${trabajo.estado === 'Finalizado' ? styles.green : styles.blue
                                            }`} style={{ right: 0, left: 'auto', borderRadius: '0 20px 20px 0', width: '50px' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

            </div>

            <div className={styles.rightColumn}></div>

            {/* MODAL ASIGNAR TÉCNICO */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ width: '500px' }}>
                        <h3 style={{ textAlign: 'center' }}>Asignar Tecnico</h3>

                        {/* SELECCION TIPO DE TRABAJO */}
                        <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="type"
                                    checked={selectedType === "Visita"}
                                    onChange={() => setSelectedType("Visita")}
                                />
                                <span style={{ fontSize: '16px' }}>Visita</span>
                            </label>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="type"
                                    checked={selectedType === "Trabajo"}
                                    onChange={() => setSelectedType("Trabajo")}
                                />
                                <span style={{ fontSize: '16px' }}>Trabajo</span>
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
                            <button onClick={handleConfirmAssignment} className={styles.applyBtn} disabled={!selectedTechnicianId} style={{ background: '#99e699', color: '#1a4d1a', width: 'auto', padding: '10px 30px' }}>Confirmar Tecnico Asignado</button>
                            <div style={{ marginTop: '10px' }}>
                                <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* MODAL FILTRO */}
            {isFilterModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ width: '400px', padding: '30px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>Filtro</h2>

                        {/* SECCION ESTATUS */}
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Estatus de estado</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                {['Completadas', 'En espera', 'Asignados', 'Sin asignar'].map(status => (
                                    <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #333',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {filterStatus === status && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#333' }}></div>}
                                        </div>
                                        {/* Input oculto para accesibilidad */}
                                        <input type="radio" name="filterStatus" value={status} checked={filterStatus === status} onChange={() => setFilterStatus(status)} style={{ display: 'none' }} />
                                        <span>{status}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* SECCION FECHAS */}
                        <div style={{ marginBottom: '30px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Rango de Fechas</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ position: 'relative' }}>
                                    <input type="date" className={styles.searchInput} style={{ width: '100%', borderRadius: '10px' }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input type="date" className={styles.searchInput} style={{ width: '100%', borderRadius: '10px' }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* BOTONES */}
                        <div style={{ textAlign: 'center' }}>
                            <button className={styles.applyBtn} style={{ background: '#99e699', color: '#1a4d1a', width: '100%', borderRadius: '25px', padding: '12px' }} onClick={() => setIsFilterModalOpen(false)}>
                                Aplicar Filtro
                            </button>
                            <button className={styles.cancelBtn} style={{ marginTop: '15px' }} onClick={() => setIsFilterModalOpen(false)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TrabajoDetalle;
