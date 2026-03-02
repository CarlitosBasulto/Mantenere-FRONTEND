import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./AdminDetalleTrabajo.module.css";
import { useAuth } from "../../context/AuthContext";

// Interfaces
interface Trabajo {
    id: number;
    titulo: string;
    ubicacion: string;
    tecnico: string;
    fecha: string;
    estado: "En Espera" | "Finalizado" | "En Proceso" | "Asignado" | "Solicitud" | "Cotización Enviada" | "Cotización Aceptada" | "Cotización Rechazada";
    tipo?: "Visita" | "Trabajo" | "Nueva Solicitud";
    visitado?: boolean;
    descripcion?: string;
    sucursal?: string;
    encargado?: string;
    plaza?: string;
    ciudad?: string;
    calle?: string;
    numero?: string;
    colonia?: string;
    cp?: string;
    fechaAsignada?: string;
    horaAsignada?: string;
    cotizacion?: {
        costo: string;
        notas: string;
        archivo: string;
        fecha: string;
    };
}

interface SubTarea {
    id: number;
    titulo: string;
    descripcion: string;
    estado: "Completa" | "Pendiente" | "Nueva"; // Added "Nueva"
    tecnicoId?: number;
    tecnicoNombre?: string;
    esCotizacion?: boolean;
    cotizacionMonto?: number;
    cotizacionDetalles?: string;
    cotizacionEstado?: "Pendiente" | "Aprobada" | "Rechazada";
    cotizacionArchivo?: string;
}

interface Tecnico {
    id: number;
    nombre: string;
}

const AdminDetalleTrabajo: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<"Datos" | "Trabajo" | "Registro" | "Historial" | "Cotización">(user?.role === 'cliente' ? "Historial" : "Datos");

    // MOCK DATA
    const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
    const [subTareas, setSubTareas] = useState<SubTarea[]>([]);
    const [isFromNewReq, setIsFromNewReq] = useState(false);

    // ESTADOS COTIZACIÓN
    const [costo, setCosto] = useState("");
    const [notas, setNotas] = useState("");
    const [archivo, setArchivo] = useState<string | null>(null);
    const [nombreArchivo, setNombreArchivo] = useState<string>("");
    const fileInputRef = React.useRef<HTMLInputElement>(null);


    const initialJobs: Trabajo[] = [
        {
            id: 101,
            titulo: "Electricidad - Mc Donals",
            ubicacion: "Centro",
            tecnico: "Pedro Javier",
            fecha: "25/08/2026",
            estado: "Asignado",
            tipo: "Trabajo",
            descripcion: "Revisar cableado en cocina.",
            sucursal: "MC Donas (centro)",
            encargado: "Daniel Eduardo",
            plaza: "Altabrisa",
            ciudad: "Merida",
            calle: "37",
            numero: "Entre 4 y 6",
            colonia: "Altabrisa",
            cp: "97158"
        },
        // ... (otros trabajos)
    ];

    const tecnicosData: Tecnico[] = [
        { id: 1, nombre: "Javier Antonio Medina Medina" },
        { id: 2, nombre: "Carlos Daniel Dzul Vicente" },
        { id: 3, nombre: "Ernesto Eduardo Martin Escalante" },
        { id: 4, nombre: "Pedro Javier" },
    ];

    useEffect(() => {
        // Buscamos el trabajo en todas las listas de negocios persistidas
        let foundJob: Trabajo | null = null;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('trabajos_business_')) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const list: Trabajo[] = JSON.parse(stored);
                    const match = list.find(j => j.id === Number(id));
                    if (match) {
                        foundJob = match;
                        break;
                    }
                }
            }
        }

        if (!foundJob) {
            // Check in new_solicitudes
            const savedSolicitudes = JSON.parse(localStorage.getItem('new_solicitudes') || '[]');
            const match = savedSolicitudes.find((s: any) => s.id === Number(id));
            if (match) {
                // Buscar datos reales de la empresa/negocio
                let enc = "Pendiente", plz = "Pendiente", cd = "Mérida", cal = "Por definir", num = "S/N", ubi = match.sucursal || "Por definir", col = "Por definir", codp = "S/N";
                const storedNegocios = localStorage.getItem('negocios_list');
                let foundBusinessId: number | null = null;
                if (storedNegocios) {
                    const negocios = JSON.parse(storedNegocios);
                    const n = negocios.find((neg: any) => neg.nombre === match.sucursal || neg.nombre === match.nombre);
                    if (n) {
                        enc = n.encargado || "Pendiente";
                        plz = n.nombrePlaza || "Pendiente";
                        cal = n.calle || "Por definir";
                        cd = n.ciudad || "Mérida";
                        num = n.numero || "S/N";
                        ubi = n.nombre || match.sucursal;
                        col = n.colonia || "Por definir";
                        codp = n.cp || "S/N";
                        foundBusinessId = n.id;
                    }
                }

                foundJob = {
                    id: match.id,
                    titulo: match.nombre,
                    ubicacion: ubi,
                    tecnico: "Sin asignar",
                    fecha: match.fecha,
                    estado: 'Solicitud',
                    tipo: 'Visita',
                    descripcion: match.subtitulo,
                    sucursal: ubi,
                    encargado: enc,
                    plaza: plz,
                    ciudad: cd,
                    calle: cal,
                    numero: num,
                    colonia: col,
                    cp: codp,
                    businessId: foundBusinessId // Guardado internamente en caso de usarlo para un enlace directo
                } as any;
                setIsFromNewReq(true);
            }
        }

        if (foundJob) {
            // AUTOFIRMAR Y AUTOCOMPLETAR CON LOS DATOS REALES DE LA EMPRESA SIEMPRE 
            // (por si el dueño editó su sucursal, queremos mostrar la info actual)
            const storedNegocios = localStorage.getItem('negocios_list');
            if (storedNegocios) {
                const negocios = JSON.parse(storedNegocios);
                const n = negocios.find((neg: any) => neg.nombre === foundJob!.sucursal);
                if (n) {
                    foundJob.encargado = n.encargado || foundJob.encargado || "Pendiente";
                    foundJob.plaza = n.nombrePlaza || foundJob.plaza || "Pendiente";
                    foundJob.calle = n.calle || foundJob.calle || "Por definir";
                    foundJob.ciudad = n.ciudad || foundJob.ciudad || "Mérida";
                    foundJob.numero = n.numero || foundJob.numero || "S/N";
                    foundJob.colonia = n.colonia || foundJob.colonia || "Por definir";
                    foundJob.cp = n.cp || foundJob.cp || "S/N";
                    (foundJob as any).estadoGeografico = n.estado || "Yucatán"; // Para diferenciarlo del estado del trabajo
                    (foundJob as any).businessId = n.id;
                }
            }
            setTrabajo(foundJob);
        } else {
            const found = initialJobs.find(j => j.id === Number(id));
            setTrabajo(found || initialJobs[0]);
        }

        // LOCAL STORAGE FOR TASKS
        const storedTasks = localStorage.getItem(`tasks_${id}`);
        if (storedTasks) {
            setSubTareas(JSON.parse(storedTasks));
        } else {
            const initialTasks: SubTarea[] = [
                { id: 1, titulo: "Reparación de techo", descripcion: "Grieta", estado: "Completa" },
                { id: 2, titulo: "Reparación de techo", descripcion: "Grieta", estado: "Pendiente" }
            ];
            setSubTareas(initialTasks);
            localStorage.setItem(`tasks_${id}`, JSON.stringify(initialTasks));
        }
    }, [id]);

    // Save tasks to local storage whenever they change
    const saveTasks = (newTasks: SubTarea[]) => {
        try {
            localStorage.setItem(`tasks_${id}`, JSON.stringify(newTasks));
            setSubTareas(newTasks);
        } catch (error) {
            alert("Error al guardar: Es posible que la imagen o documento adjunto sea demasiado pesado. Intenta subir un archivo más ligero.");
            throw error;
        }
    };

    // MODAL STATES
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTechnicians, setSelectedTechnicians] = useState<number[]>([]);
    const [technicianSearch, setTechnicianSearch] = useState("");
    const [selectedType, setSelectedType] = useState<"Visita" | "Trabajo">("Visita");
    const [selectedHistoryTask, setSelectedHistoryTask] = useState<SubTarea | null>(null);
    const [asignarFecha, setAsignarFecha] = useState("");
    const [asignarHora, setAsignarHora] = useState("");

    const handleTechToggle = (id: number) => {
        if (selectedTechnicians.includes(id)) {
            setSelectedTechnicians(selectedTechnicians.filter(tId => tId !== id));
        } else {
            setSelectedTechnicians([...selectedTechnicians, id]);
        }
    };

    // ADD NEW TASK MODAL STATE
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [newTaskCategory, setNewTaskCategory] = useState("Plomeria"); // Default category
    const [newTaskDescription, setNewTaskDescription] = useState("");
    const [isQuoteIncluded, setIsQuoteIncluded] = useState(false);
    const [newQuoteAmount, setNewQuoteAmount] = useState("");
    const [newQuoteDetails, setNewQuoteDetails] = useState("");
    const [newQuoteFile, setNewQuoteFile] = useState<string | null>(null);
    const [newQuoteFileName, setNewQuoteFileName] = useState("");
    const addFileInputRef = React.useRef<HTMLInputElement>(null);

    const handleNewQuoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setNewQuoteFileName(file.name);
            const reader = new FileReader();
            reader.onload = (event) => {
                setNewQuoteFile(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const filteredTechnicians = tecnicosData.filter(t =>
        t.nombre.toLowerCase().includes(technicianSearch.toLowerCase())
    );

    const handleConfirmAssignment = () => {
        if (trabajo && selectedTechnicians.length > 0) {
            const assignedNames = selectedTechnicians
                .map(id => tecnicosData.find(t => t.id === id)?.nombre)
                .filter(Boolean)
                .join(", ");

            if (assignedNames) {
                const updatedJob = {
                    ...trabajo,
                    tecnico: assignedNames,
                    estado: (trabajo.estado === "Solicitud" ? "Asignado" : trabajo.estado) as any,
                    tipo: selectedType,
                    visitado: trabajo.visitado,
                    fechaAsignada: asignarFecha,
                    horaAsignada: asignarHora
                };
                setTrabajo(updatedJob);

                if (isFromNewReq) {
                    // Remover de new_solicitudes
                    const savedSolicitudes = JSON.parse(localStorage.getItem('new_solicitudes') || '[]');
                    const filtered = savedSolicitudes.filter((s: any) => s.id !== trabajo.id);
                    localStorage.setItem('new_solicitudes', JSON.stringify(filtered));

                    // Agregar a la lista del negocio correcto basado en el nombre de la sucursal principal
                    const negociosList = JSON.parse(localStorage.getItem('negocios_list') || '[]');
                    const targetNegocio = negociosList.find((n: any) => n.nombre === trabajo.sucursal);
                    const businessId = targetNegocio ? targetNegocio.id : 1; // Default a 1 si no se encuentra
                    const defaultBusinessKey = `trabajos_business_${businessId}`;

                    const list = JSON.parse(localStorage.getItem(defaultBusinessKey) || '[]');
                    list.push(updatedJob);
                    localStorage.setItem(defaultBusinessKey, JSON.stringify(list));

                    setIsFromNewReq(false);
                    alert("Solicitud asignada y transferida exitosamente a la base de datos principal.");
                } else {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key?.startsWith('trabajos_business_')) {
                            const stored = localStorage.getItem(key);
                            if (stored) {
                                const list: Trabajo[] = JSON.parse(stored);
                                const jobIndex = list.findIndex(j => j.id === trabajo.id);
                                if (jobIndex !== -1) {
                                    list[jobIndex] = updatedJob;
                                    localStorage.setItem(key, JSON.stringify(list));
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        setIsModalOpen(false);
    };

    const handleAddTask = () => {
        try {
            if (editingTaskId) {
                // EDITING
                const updatedTasks = subTareas.map(t => {
                    if (t.id === editingTaskId) {
                        return { ...t, titulo: newTaskCategory, descripcion: newTaskDescription };
                    }
                    return t;
                });
                saveTasks(updatedTasks);
            } else {
                // ADDING NEW
                const newTask: SubTarea = {
                    id: Date.now(),
                    titulo: newTaskCategory,
                    descripcion: newTaskDescription,
                    estado: "Nueva",
                    tecnicoId: Date.now(), // ID simulado
                    tecnicoNombre: user?.name,
                    esCotizacion: isQuoteIncluded,
                    cotizacionMonto: isQuoteIncluded ? Number(newQuoteAmount) || 0 : undefined,
                    cotizacionDetalles: isQuoteIncluded ? newQuoteDetails : undefined,
                    cotizacionEstado: isQuoteIncluded ? "Pendiente" : undefined,
                    cotizacionArchivo: isQuoteIncluded && newQuoteFile ? newQuoteFile : undefined
                };
                const updatedTasks = [...subTareas, newTask];
                saveTasks(updatedTasks);

                // RECURSIVE JOB CREATION IF TIPO === "Trabajo"
                if (trabajo?.tipo === 'Trabajo') {
                    const newRecursiveJob: Trabajo = {
                        id: Date.now() + Math.floor(Math.random() * 1000), // ensure uniqueness
                        titulo: newTaskCategory,
                        ubicacion: trabajo.ubicacion,
                        tecnico: "Sin asignar",
                        fecha: new Date().toLocaleDateString('es-MX'),
                        estado: "Solicitud",
                        tipo: "Visita",
                        descripcion: newTaskDescription,
                        sucursal: trabajo.sucursal,
                        encargado: trabajo.encargado,
                        plaza: trabajo.plaza,
                        ciudad: trabajo.ciudad,
                        calle: trabajo.calle,
                        numero: trabajo.numero,
                        colonia: trabajo.colonia,
                        cp: trabajo.cp
                    };

                    // Find which business list this current job belongs to in localStorage
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key?.startsWith('trabajos_business_')) {
                            const stored = localStorage.getItem(key);
                            if (stored) {
                                const list: Trabajo[] = JSON.parse(stored);
                                const jobIndex = list.findIndex(j => j.id === trabajo?.id);
                                if (jobIndex !== -1) {
                                    list.push(newRecursiveJob);
                                    localStorage.setItem(key, JSON.stringify(list));
                                    alert("Hallazgo registrado con éxito. Dado que este es un trabajo en ejecución, este reporte se ha generado automáticamente como una nueva 'Solicitud de Visita' para la sucursal.");
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error added task:", error);
            // Si hubo un error (como cuota excedida al guardar la imagen), no cerramos el modal ni borramos los campos
            return;
        }

        setIsAddModalOpen(false);
        setEditingTaskId(null);
        setNewTaskDescription("");
        setIsQuoteIncluded(false);
        setNewQuoteAmount("");
        setNewQuoteDetails("");
        setNewQuoteFile(null);
        setNewQuoteFileName("");
        setActiveTab("Trabajo");
    };

    const handleDeleteTask = (e: React.MouseEvent, taskId: number) => {
        e.stopPropagation();
        if (window.confirm("¿Estás seguro de que deseas eliminar esta tarea?")) {
            const updatedTasks = subTareas.filter(t => t.id !== taskId);
            saveTasks(updatedTasks);
        }
    };

    const openEditModal = (e: React.MouseEvent, tarea: SubTarea) => {
        e.stopPropagation();
        setEditingTaskId(tarea.id);
        setNewTaskCategory(tarea.titulo);
        setNewTaskDescription(tarea.descripcion);
        setIsAddModalOpen(true);
    };

    const handleAceptarCotizacion = () => {
        if (!trabajo) return;
        const updatedJob: Trabajo = { ...trabajo, estado: "Cotización Aceptada" };
        setTrabajo(updatedJob);

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('trabajos_business_')) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const list: Trabajo[] = JSON.parse(stored);
                    const jobIndex = list.findIndex(j => j.id === trabajo.id);
                    if (jobIndex !== -1) {
                        list[jobIndex] = updatedJob;
                        localStorage.setItem(key, JSON.stringify(list));
                        break;
                    }
                }
            }
        }
        alert("Cotización aceptada. El administrador procederá a asignar a un técnico.");
    };

    const handleAprobarCotizacionTecnico = (tarea: SubTarea) => {
        if (!trabajo) return;

        // Update the task status to Approved
        const updatedTasks = subTareas.map(t =>
            t.id === tarea.id ? { ...t, cotizacionEstado: "Aprobada" as any } : t
        );
        saveTasks(updatedTasks);

        // Update the Job with this quotation
        const updatedJob: Trabajo = {
            ...trabajo,
            estado: "Cotización Enviada",
            cotizacion: {
                costo: tarea.cotizacionMonto?.toString() || "0",
                notas: tarea.cotizacionDetalles || "Cotización del técnico " + tarea.tecnicoNombre,
                archivo: tarea.cotizacionArchivo || "",
                fecha: new Date().toLocaleDateString('es-MX')
            }
        };
        setTrabajo(updatedJob);

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('trabajos_business_')) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const list: Trabajo[] = JSON.parse(stored);
                    const jobIndex = list.findIndex(j => j.id === trabajo.id);
                    if (jobIndex !== -1) {
                        list[jobIndex] = updatedJob;
                        localStorage.setItem(key, JSON.stringify(list));
                        break;
                    }
                }
            }
        }
        alert("Cotización de técnico aprobada y enviada como oficial para este trabajo.");
    };

    const handleRechazarCotizacion = () => {
        if (!trabajo) return;
        if (window.confirm("¿Seguro que deseas rechazar la cotización?")) {
            const updatedJob: Trabajo = { ...trabajo, estado: "Cotización Rechazada" };
            setTrabajo(updatedJob);

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('trabajos_business_')) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const list: Trabajo[] = JSON.parse(stored);
                        const jobIndex = list.findIndex(j => j.id === trabajo.id);
                        if (jobIndex !== -1) {
                            list[jobIndex] = updatedJob;
                            localStorage.setItem(key, JSON.stringify(list));
                            break;
                        }
                    }
                }
            }
        }
    };

    const handleFinishVisit = () => {
        if (!trabajo) return;

        const isVisita = trabajo.tipo === "Visita";
        const message = isVisita
            ? "¿Confirmar diagnóstico y enviar al administrador? Ya no podrás editar esta visita."
            : "¿Confirmar finalización del trabajo? Ya no podrás editar este registro.";

        if (window.confirm(message)) {
            const updatedJob: Trabajo = {
                ...trabajo,
                estado: isVisita ? "Solicitud" : "Finalizado",
                tecnico: isVisita ? "Sin asignar" : trabajo.tecnico, // Si es visita se desasigna para el TRABAJO real. Si es trabajo se queda su nombre en el record.
                visitado: isVisita ? true : trabajo.visitado
            };

            setTrabajo(updatedJob);

            // Persistir en la lista del negocio
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('trabajos_business_')) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const list: Trabajo[] = JSON.parse(stored);
                        const jobIndex = list.findIndex(j => j.id === trabajo.id);
                        if (jobIndex !== -1) {
                            list[jobIndex] = updatedJob;
                            localStorage.setItem(key, JSON.stringify(list));
                            break;
                        }
                    }
                }
            }

            navigate(user?.role === 'tecnico' ? '/tecnico' : '/menu');
        }
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNombreArchivo(file.name);
            // Para evitar llenar y romper el localStorage con Base64 (QuotaExceededError), 
            // usamos una URL de objeto temporal o guardamos un string de demostración.
            try {
                const url = URL.createObjectURL(file);
                setArchivo(url);
            } catch (err) {
                setArchivo(`mock_path_for_${file.name}`);
            }
        }
    };

    const handleEnviarCotizacion = () => {
        if (!costo || !archivo || !trabajo) {
            alert("Por favor, ingresa el costo y sube un documento de cotización.");
            return;
        }

        const updatedJob: Trabajo = {
            ...trabajo,
            estado: "Cotización Enviada",
            cotizacion: {
                costo,
                notas,
                archivo,
                fecha: new Date().toLocaleDateString('es-MX')
            }
        };

        setTrabajo(updatedJob);

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('trabajos_business_')) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const list: Trabajo[] = JSON.parse(stored);
                        const jobIndex = list.findIndex(j => j.id === trabajo.id);
                        if (jobIndex !== -1) {
                            list[jobIndex] = updatedJob;
                            localStorage.setItem(key, JSON.stringify(list));
                            break;
                        }
                    }
                }
            }
            alert("Cotización enviada exitosamente al cliente.");
            setActiveTab("Datos");
        } catch (error) {
            console.error("Error al guardar la cotización:", error);
            alert("Hubo un error al guardar la cotización. Es posible que el archivo adjunto sea muy grande para el almacenamiento local demo.");
        }
    };

    if (!trabajo) return <div>Cargando...</div>;

    return (
        <div className={styles.dashboardLayout} style={{ gap: '0', padding: '20px', height: '100%' }}>

            <div className={styles.bgShape1}></div>
            <div className={styles.bgShape2}></div>

            <div className={styles.mainCard}>

                {/* Shapes removed for cleaner look */}

                <div className={styles.contentWrapper}>
                    <button onClick={() => navigate(-1)} className={styles.backButton}>
                        ← Volver
                    </button>

                    <div className={styles.headerContainer}>
                        <div>
                            <h1 className={styles.pageTitle}>
                                {activeTab === 'Trabajo' ? 'tareas por realizar' :
                                    (activeTab === 'Registro' ? 'Registro de Actividad' :
                                        (activeTab === 'Cotización' ? 'Generar Cotización' : 'Datos de la Empresa'))}
                            </h1>
                        </div>
                    </div>

                    <div className={styles.tabsContainer}>
                        {['Datos', 'Trabajo', 'Registro', 'Historial', 'Cotización']
                            .filter(tab => {
                                if (user?.role === 'cliente') {
                                    if (tab === 'Cotización' && trabajo.estado === 'Cotización Enviada' && trabajo.cotizacion) {
                                        return true;
                                    }
                                    return tab === 'Historial' || tab === 'Cotización'; // Siempre mostrar Historial, Cotización si aplica
                                }
                                if (trabajo.estado === "Finalizado") {
                                    return tab === 'Datos' || tab === 'Historial';
                                }
                                if (tab === 'Cotización') {
                                    // Solo Admin y si el trabajo fue visitado y es solicitud o pendiente de cotizar
                                    return user?.role === 'admin' && trabajo.visitado;
                                }
                                return tab !== 'Trabajo' || trabajo?.tipo !== "Visita" || user?.role === 'admin' || user?.role === 'tecnico';
                            })
                            .map((tab) => (
                                <button
                                    key={tab}
                                    className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : styles.inactiveTab}`}
                                    onClick={() => setActiveTab(tab as any)}
                                >
                                    {tab}
                                </button>
                            ))}
                    </div>
                </div>

                <div className={styles.scrollableContent}>

                    {activeTab === 'Datos' && (
                        <div>
                            <div className={styles.infoSectionCard}>
                                <h3 className={styles.sectionTitle}>Informacion general</h3>
                                <div className={styles.infoGrid2}>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Nombre de la sucursal:</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <span className={styles.infoValue}>{trabajo.sucursal || "No registrado"}</span>
                                            {(trabajo as any).businessId && user?.role === 'admin' && (
                                                <button
                                                    onClick={() => navigate(`/menu/trabajo/${(trabajo as any).businessId}`)}
                                                    style={{ background: '#333', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '15px', fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '5px' }}
                                                >
                                                    🔗 Ver trabajos de esta empresa
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Tipo de Servicio:</span>
                                        <span className={styles.infoValue}>{trabajo.tipo || "Por definir"}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Encargado de la empresa:</span>
                                        <span className={styles.infoValue}>{trabajo.encargado || "No registrado"}</span>
                                    </div>
                                </div>

                                {(trabajo.fechaAsignada || trabajo.horaAsignada) && (
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
                                        <div style={{ background: '#eef8f1', padding: '6px 14px', borderRadius: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid #c8e6c9' }}>
                                            {trabajo.fechaAsignada && (
                                                <span style={{ color: '#137333', fontWeight: 'bold', fontSize: '13px' }}>
                                                    📅 {trabajo.fechaAsignada}
                                                </span>
                                            )}
                                            {trabajo.fechaAsignada && trabajo.horaAsignada && (
                                                <span style={{ color: '#137333', fontWeight: 'bold', fontSize: '13px' }}>-</span>
                                            )}
                                            {trabajo.horaAsignada && (
                                                <span style={{ color: '#137333', fontWeight: 'bold', fontSize: '13px' }}>
                                                    ⏰ {trabajo.horaAsignada}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {trabajo.descripcion && (
                                    <div style={{ marginTop: '20px', padding: '20px', background: '#f5f7fa', borderRadius: '15px', borderLeft: '5px solid #333' }}>
                                        <span className={styles.infoLabel} style={{ display: 'block', marginBottom: '10px', color: '#333' }}>Descripción del problema (Cliente):</span>
                                        <span className={styles.infoValue} style={{ fontSize: '16px', fontStyle: 'italic', color: '#555', lineHeight: '1.5' }}>
                                            "{trabajo.descripcion}"
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.infoSectionCard}>
                                <h3 className={styles.sectionTitle}>Ubicación</h3>
                                <div className={styles.infoGrid2} style={{ gridTemplateColumns: '1fr' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel} style={{ width: '150px' }}>Nombre de la plaza:</span>
                                        <span className={styles.infoValue}>{trabajo.plaza || "No registrado"}</span>
                                    </div>
                                </div>

                                <div className={styles.infoGrid2}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Estado:</span>
                                        <span className={styles.infoValue}>{(trabajo as any).estadoGeografico || "Yucatán"}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Ciudad:</span>
                                        <span className={styles.infoValue}>{trabajo.ciudad || "Merida"}</span>
                                    </div>
                                </div>

                                <div className={styles.infoGrid3}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Calle:</span>
                                        <span className={styles.infoValue}>{trabajo.calle || "37"}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Numero:</span>
                                        <span className={styles.infoValue}>{trabajo.numero || "Entre 4 y 6"}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Colonia:</span>
                                        <span className={styles.infoValue}>{trabajo.colonia || "Altabrisa"}</span>
                                    </div>
                                </div>

                                <div className={styles.infoGrid2} style={{ gridTemplateColumns: '1fr' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={styles.infoLabel}>Codigo postal:</span>
                                        <span className={styles.infoValue}>{trabajo.cp || "97158"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ACCIONES DE ASIGNACIÓN - Solo Admin */}
                            {user?.role === 'admin' && (
                                <div className={styles.actionsContainer}>
                                    {trabajo.estado !== 'Finalizado' && (
                                        <>
                                            {/* Logica de Cotizacion vs Asignacion */}
                                            {trabajo.estado === "Cotización Enviada" && (
                                                <div style={{ padding: '10px 20px', background: '#ffe0b2', color: '#e65100', borderRadius: '15px', fontWeight: 'bold' }}>
                                                    ⏳ Esperando respuesta del cliente a la cotización...
                                                </div>
                                            )}

                                            {(trabajo.estado === "Cotización Aceptada" || trabajo.tecnico !== "Sin asignar" || trabajo.estado === "Solicitud") && (
                                                <button
                                                    onClick={() => {
                                                        // Pre-seleccionar "Visita" si es una solicitud
                                                        if (trabajo.estado === "Solicitud") {
                                                            setSelectedType("Visita");
                                                        } else if (trabajo.estado === "Cotización Aceptada") {
                                                            setSelectedType("Trabajo");
                                                        }
                                                        setIsModalOpen(true);
                                                    }}
                                                    className={`${styles.actionButton} ${styles.assignButton}`}
                                                >
                                                    {trabajo.tecnico === "Sin asignar" ? "Asignar Técnico" : "Reasignar / Editar"}
                                                </button>
                                            )}

                                            {trabajo.estado === "Solicitud" && trabajo.visitado && (
                                                <button
                                                    onClick={() => setActiveTab('Cotización')}
                                                    className={`${styles.actionButton} ${styles.assignButton}`}
                                                    style={{ background: '#f9ab0f', color: '#fff', marginLeft: '5px' }}
                                                >
                                                    Realizar Cotización
                                                </button>
                                            )}

                                            {trabajo.estado === "En Espera" && (
                                                <button
                                                    onClick={() => setActiveTab('Cotización')}
                                                    className={`${styles.actionButton} ${styles.assignButton}`}
                                                    style={{ background: '#f9ab0f', color: '#fff' }}
                                                >
                                                    Generar Cotización
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <button className={`${styles.actionButton} ${styles.waitButton}`}>
                                        Poner en Espera
                                    </button>
                                </div>

                            )}
                        </div>
                    )
                    }

                    {
                        activeTab === 'Cotización' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                {/* COLUMNA IZQUIERDA: FORMULARIO O VISTA CLIENTE */}
                                <div style={{ background: '#fff', borderRadius: '20px', padding: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>

                                    {user?.role === 'cliente' ? (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                                                <span style={{ fontSize: '28px' }}>📄</span>
                                                <h2 style={{ margin: 0, color: '#e65100', fontSize: '22px' }}>Cotización Recibida</h2>
                                            </div>

                                            <div style={{ marginBottom: '25px', padding: '20px', background: '#f5f7fa', borderRadius: '15px' }}>
                                                <div style={{ marginBottom: '20px' }}>
                                                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>Costo Estimado:</p>
                                                    <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#333' }}>${trabajo.cotizacion?.costo}</p>
                                                </div>

                                                <div style={{ marginBottom: '20px' }}>
                                                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>Notas del Administrador:</p>
                                                    <p style={{ margin: 0, fontSize: '16px', color: '#444', lineHeight: '1.6' }}>{trabajo.cotizacion?.notas || "Sin notas adicionales."}</p>
                                                </div>

                                                <div>
                                                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666', fontWeight: 'bold' }}>Documento Adjunto:</p>
                                                    <a
                                                        href={trabajo.cotizacion?.archivo}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #ccc', padding: '12px 25px', borderRadius: '25px', color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                                                    >
                                                        📎 Ver Archivo PDF / Imagen
                                                    </a>
                                                </div>
                                            </div>

                                            {trabajo.estado === 'Cotización Enviada' && (
                                                <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                                                    <button
                                                        style={{ flex: 1, background: '#4caf50', color: 'white', border: 'none', padding: '15px', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(76, 175, 80, 0.3)' }}
                                                        onClick={() => handleAceptarCotizacion()}
                                                    >
                                                        ✓ Aceptar Cotización
                                                    </button>
                                                    <button
                                                        style={{ flex: 1, background: '#f44336', color: 'white', border: 'none', padding: '15px', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(244, 67, 54, 0.3)' }}
                                                        onClick={() => handleRechazarCotizacion()}
                                                    >
                                                        ✕ Rechazar
                                                    </button>
                                                </div>
                                            )}
                                            {trabajo.estado === 'Cotización Aceptada' && (
                                                <div style={{ padding: '15px 20px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '15px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #c8e6c9' }}>
                                                    ✓ Has aceptado esta cotización. En espera de asignación de técnico.
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <h3 className={styles.sectionTitle} style={{ marginBottom: '20px' }}>Detalles de Cotización</h3>

                                            <div style={{ background: '#fcfcfc', border: '1px solid #eee', padding: '25px', borderRadius: '20px', marginBottom: '20px' }}>
                                                <div style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>Costo Estimado ($)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Ej: 1500"
                                                        value={costo}
                                                        onChange={(e) => setCosto(e.target.value)}
                                                        style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px' }}
                                                    />
                                                </div>

                                                <div style={{ marginBottom: '20px' }}>
                                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>Notas para el cliente</label>
                                                    <textarea
                                                        placeholder="Detalles sobre los materiales, tiempo estimado, etc."
                                                        value={notas}
                                                        onChange={(e) => setNotas(e.target.value)}
                                                        style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', minHeight: '100px', resize: 'vertical' }}
                                                    ></textarea>
                                                </div>
                                            </div>

                                            <h3 className={styles.sectionTitle} style={{ marginBottom: '20px' }}>Documento Adjunto</h3>

                                            <div style={{ background: '#fcfcfc', border: '1px solid #eee', padding: '25px', borderRadius: '20px', textAlign: 'center' }}>
                                                <input
                                                    type="file"
                                                    accept="image/*, .pdf"
                                                    ref={fileInputRef}
                                                    style={{ display: 'none' }}
                                                    onChange={handleFileChange}
                                                />

                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    style={{ border: '2px dashed #ccc', padding: '30px', borderRadius: '15px', cursor: 'pointer', background: '#fff' }}
                                                >
                                                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
                                                    {archivo ? (
                                                        <span style={{ fontWeight: 'bold', color: '#4caf50' }}>Archivo cargado: {nombreArchivo}</span>
                                                    ) : (
                                                        <span style={{ color: '#888' }}>Haz clic aquí para subir un PDF o imagen</span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleEnviarCotizacion}
                                                style={{ width: '100%', padding: '15px', background: '#f9ab0f', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '18px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' }}
                                            >
                                                Enviar Cotización
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* COLUMNA DERECHA: TAREAS Y COTIZACIONES DEL TÉCNICO */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                                    {/* COTIZACIONES */}
                                    {subTareas.some(t => t.esCotizacion) && (
                                        <div>
                                            <h3 className={styles.sectionTitle} style={{ marginBottom: '20px', color: '#ff9800' }}>⭐ Cotizaciones de Técnicos</h3>
                                            <div className={styles.taskList}>
                                                {subTareas.filter(t => t.esCotizacion).map(tarea => (
                                                    <div
                                                        key={tarea.id}
                                                        style={{ background: '#fff', border: '1px solid #ffd54f', borderRadius: '15px', padding: '20px', marginBottom: '15px', boxShadow: '0 4px 10px rgba(255,152,0,0.1)' }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                                            <div>
                                                                <h4 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#333' }}>Técnico: {tarea.tecnicoNombre || 'Desconocido'}</h4>
                                                                <span style={{ fontSize: '14px', background: '#e0f7fa', color: '#006064', padding: '4px 8px', borderRadius: '10px', fontWeight: 'bold' }}>{tarea.titulo}</span>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>${tarea.cotizacionMonto}</p>
                                                                <span style={{ fontSize: '12px', color: '#888' }}>{tarea.cotizacionEstado}</span>
                                                            </div>
                                                        </div>

                                                        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '10px', fontSize: '14px', color: '#555', marginBottom: '15px', fontStyle: 'italic' }}>
                                                            <strong>Detalles/Materiales:</strong><br />
                                                            {tarea.cotizacionDetalles || "Sin detalles adicionales."}
                                                        </div>

                                                        {tarea.cotizacionArchivo && (
                                                            <div style={{ marginBottom: '15px' }}>
                                                                <a
                                                                    href={tarea.cotizacionArchivo}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #ccc', padding: '8px 15px', borderRadius: '15px', color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}
                                                                >
                                                                    📎 Ver Archivo Adjunto
                                                                </a>
                                                            </div>
                                                        )}

                                                        {tarea.cotizacionEstado === 'Pendiente' && (
                                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                                <button
                                                                    onClick={() => handleAprobarCotizacionTecnico(tarea)}
                                                                    style={{ flex: 1, background: '#4caf50', color: 'white', border: 'none', padding: '10px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}
                                                                >
                                                                    Aprobar
                                                                </button>
                                                            </div>
                                                        )}
                                                        {tarea.cotizacionEstado === 'Aprobada' && (
                                                            <div style={{ padding: '10px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '10px', fontWeight: 'bold', textAlign: 'center', fontSize: '14px' }}>
                                                                ✓ Cotización Aprobada
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* TRABAJOS REGISTRADOS */}
                                    <div>
                                        <h3 className={styles.sectionTitle} style={{ marginBottom: '20px' }}>Actividades Registradas</h3>
                                        <div className={styles.taskList}>
                                            {subTareas.length > 0 ? (
                                                subTareas.map(tarea => (
                                                    <div
                                                        key={tarea.id}
                                                        style={{ background: '#fff', border: '1px solid #eee', borderRadius: '15px', padding: '15px', marginBottom: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}
                                                    >
                                                        <div>
                                                            <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#333' }}>
                                                                {tarea.titulo}
                                                            </h3>
                                                            <p style={{ margin: 0, fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                                                                {tarea.descripcion}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p style={{ color: '#888', fontStyle: 'italic' }}>No hay actividades registradas.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'Trabajo' && (
                            <div>
                                {/* LISTA DE TAREAS / SUBTAREAS */}
                                <div className={styles.taskList}>
                                    {subTareas.map(tarea => (
                                        <div
                                            key={tarea.id}
                                            onClick={() => {
                                                if (trabajo?.tipo === "Visita" && user?.role === 'tecnico') {
                                                    alert("Estás en modo Visita. No puedes realizar los trabajos, solo registrar hallazgos.");
                                                    return;
                                                }
                                                navigate(`/menu/verificacion-tarea/${tarea.id}`);
                                            }}
                                            className={`${styles.taskCard} ${tarea.estado === 'Nueva' ? styles.newTaskCard : styles.defaultTaskCard}`}
                                            style={{ cursor: (trabajo?.tipo === "Visita" && user?.role === 'tecnico') ? 'not-allowed' : 'pointer', opacity: (trabajo?.tipo === "Visita" && user?.role === 'tecnico') ? 0.7 : 1 }}
                                        >
                                            <div>
                                                <h3 className={styles.taskTitle}>
                                                    {tarea.titulo}
                                                </h3>
                                                <p className={styles.taskDesc}>
                                                    {tarea.descripcion}
                                                </p>
                                            </div>

                                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                                                <span
                                                    className={styles.taskStatus}
                                                    style={{
                                                        background: tarea.estado === 'Completa' ? '#ccffcc' : (tarea.estado === 'Nueva' ? '#ffccbc' : '#b3e0ff'),
                                                        color: tarea.estado === 'Completa' ? '#006600' : (tarea.estado === 'Nueva' ? '#bf360c' : '#004080'),
                                                    }}
                                                >
                                                    {tarea.estado}
                                                </span>

                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    {trabajo.tipo !== 'Trabajo' && (
                                                        <>
                                                            <button
                                                                onClick={(e) => openEditModal(e, tarea)}
                                                                style={{ background: '#eee', border: 'none', borderRadius: '5px', padding: '5px 8px', fontSize: '12px', cursor: 'pointer' }}
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteTask(e, tarea.id)}
                                                                style={{ background: '#fee', border: 'none', borderRadius: '5px', padding: '5px 8px', fontSize: '12px', cursor: 'pointer', color: '#f44336' }}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {user?.role === 'tecnico' && (
                                    <div style={{ marginTop: '30px', textAlign: 'center' }}>
                                        <button
                                            onClick={handleFinishVisit}
                                            style={{ background: '#333', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%', maxWidth: '400px' }}
                                        >
                                            Confirmar y Guardar
                                        </button>
                                    </div>
                                )}

                            </div>
                        )
                    }

                    {
                        activeTab === 'Registro' && (
                            <div>
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className={styles.addTaskButton}
                                >
                                    <div className={styles.addTaskIcon}>+</div>
                                    Agregar
                                </button>

                                {user?.role === 'tecnico' && subTareas.length > 0 && (
                                    <div style={{ marginTop: '50px', textAlign: 'center' }}>
                                        <button
                                            onClick={handleFinishVisit}
                                            style={{ background: '#333', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%', maxWidth: '400px' }}
                                        >
                                            Confirmar y Guardar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {
                        activeTab === 'Historial' && (
                            <div>
                                <h3 className={styles.sectionTitle}>Historial de Trabajos Realizados</h3>
                                <div className={styles.taskList}>
                                    {subTareas.filter(t => trabajo.estado === 'Finalizado' || t.estado === 'Completa').length > 0 ? (
                                        subTareas.filter(t => trabajo.estado === 'Finalizado' || t.estado === 'Completa').map(tarea => (
                                            <div
                                                key={tarea.id}
                                                className={styles.completedTaskCard}
                                                onClick={() => setSelectedHistoryTask(tarea)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div>
                                                    <h3 className={styles.completedTaskTitle}>
                                                        {tarea.titulo}
                                                    </h3>
                                                    <p className={styles.completedTaskDesc}>
                                                        {tarea.descripcion}
                                                    </p>
                                                </div>
                                                <span className={styles.completedBadge}>
                                                    Completado
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No hay trabajos en el historial.</p>
                                    )}
                                </div>
                            </div>
                        )}
                </div>
            </div>
            {/* MODAL ASIGNAR TÉCNICO */}
            {
                isModalOpen && (
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
                                    placeholder="Buscar técnico..."
                                    className={styles.searchInput}
                                    value={technicianSearch}
                                    onChange={(e) => setTechnicianSearch(e.target.value)}
                                />
                            </div>

                            <div className={styles.techList}>
                                {filteredTechnicians.map(tech => (
                                    <div key={tech.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '40px', height: '40px', background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                                            <span style={{ fontWeight: 'bold' }}>{tech.nombre}</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedTechnicians.includes(tech.id)}
                                            onChange={() => handleTechToggle(tech.id)}
                                            style={{ width: '20px', height: '20px', accentColor: '#333', cursor: 'pointer' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Fecha Asignada</label>
                                    <input
                                        type="date"
                                        value={asignarFecha}
                                        onChange={(e) => setAsignarFecha(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Hora Estimada</label>
                                    <input
                                        type="time"
                                        value={asignarHora}
                                        onChange={(e) => setAsignarHora(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <button onClick={handleConfirmAssignment} className={styles.applyBtn} disabled={selectedTechnicians.length === 0} style={{ background: selectedTechnicians.length === 0 ? '#ccc' : '#fbbc04', color: selectedTechnicians.length === 0 ? '#666' : '#fff', width: 'auto', padding: '12px 40px', border: 'none', borderRadius: '30px', cursor: selectedTechnicians.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: selectedTechnicians.length === 0 ? 'none' : '0 4px 10px rgba(251, 188, 4, 0.3)' }}>Confirmar</button>
                                <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL AGREGAR TAREA (NUEVO) */}
            {
                isAddModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent} style={{ width: '600px', padding: '40px', borderRadius: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Registro de Actividad</h2>
                                <span style={{ color: '#888', fontWeight: 'bold', fontSize: '20px' }}>Visita</span>
                            </div>

                            <div style={{ border: '2px solid #e0e0e0', borderRadius: '20px', padding: '30px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>Selecciona tarea</label>
                                    <select
                                        value={newTaskCategory}
                                        onChange={(e) => setNewTaskCategory(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', fontWeight: 'bold' }}
                                    >
                                        <option value="Plomeria">Plomeria</option>
                                        <option value="Electricidad">Electricidad</option>
                                        <option value="Albañileria">Albañileria</option>
                                        <option value="Carpinteria">Carpinteria</option>
                                        <option value="Pintura">Pintura</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <textarea
                                        placeholder="Especifica tarea"
                                        value={newTaskDescription}
                                        onChange={(e) => setNewTaskDescription(e.target.value)}
                                        style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', color: '#666', resize: 'none' }}
                                    />
                                </div>

                                {trabajo?.tipo === "Visita" && user?.role === 'tecnico' && (
                                    <div style={{ marginTop: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={isQuoteIncluded}
                                                onChange={(e) => setIsQuoteIncluded(e.target.checked)}
                                                style={{ width: '18px', height: '18px', accentColor: '#FFB800' }}
                                            />
                                            Agregar Cotización para el Administrador
                                        </label>

                                        {isQuoteIncluded && (
                                            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '5px' }}>Monto Estimado ($)</label>
                                                    <input
                                                        type="number"
                                                        value={newQuoteAmount}
                                                        onChange={(e) => setNewQuoteAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '5px' }}>Detalles o materiales necesarios</label>
                                                    <textarea
                                                        value={newQuoteDetails}
                                                        onChange={(e) => setNewQuoteDetails(e.target.value)}
                                                        placeholder="Mano de obra, materiales, refacciones..."
                                                        style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', resize: 'none' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '8px' }}>Adjuntar documento (PDF o Imagen)</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*, .pdf"
                                                        ref={addFileInputRef}
                                                        style={{ display: 'none' }}
                                                        onChange={handleNewQuoteFileChange}
                                                    />
                                                    <button
                                                        onClick={() => addFileInputRef.current?.click()}
                                                        style={{ background: '#fff', border: '1px solid #ccc', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', width: 'fit-content' }}
                                                    >
                                                        📎 {newQuoteFileName || "Seleccionar archivo"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    onClick={() => { setIsAddModalOpen(false); setEditingTaskId(null); setNewTaskDescription(""); setIsQuoteIncluded(false); setNewQuoteAmount(""); setNewQuoteDetails(""); setNewQuoteFile(null); setNewQuoteFileName(""); }}
                                    style={{ background: '#eee', color: '#555', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>

                                <button
                                    onClick={handleAddTask}
                                    style={{ background: '#FFB800', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '30px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    {editingTaskId ? "Actualizar" : "Guardar y enviar"}
                                </button>
                            </div>

                        </div>
                    </div>
                )
            }
            {/* MODAL HISTORIAL DETALLADO */}
            {
                selectedHistoryTask && (
                    <div className={styles.modalOverlay} onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedHistoryTask(null);
                    }}>
                        <div className={styles.modalContent} style={{ maxWidth: '600px', width: '90%', padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
                                <h2 style={{ margin: 0, color: '#333' }}>Detalles del Reporte</h2>
                                <button
                                    onClick={() => setSelectedHistoryTask(null)}
                                    style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: '20px' }}>

                                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', borderLeft: '4px solid #4caf50' }}>
                                    <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32', fontSize: '18px' }}>{selectedHistoryTask.titulo}</h3>
                                    <p style={{ margin: 0, color: '#555', fontSize: '15px', lineHeight: '1.5' }}>{selectedHistoryTask.descripcion}</p>
                                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                        <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '5px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                                            Estado: {selectedHistoryTask.estado}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee' }}>
                                    <h4 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '16px' }}>👤 Información Adicional</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#777', fontSize: '14px' }}>Técnico Encargado:</span>
                                            <span style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>{trabajo.tecnico}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#777', fontSize: '14px' }}>Sucursal:</span>
                                            <span style={{ fontWeight: 'bold', color: '#333', fontSize: '14px' }}>{trabajo.sucursal}</span>
                                        </div>
                                    </div>
                                </div>

                                {trabajo.cotizacion && (
                                    <div style={{ background: '#fff9e6', padding: '20px', borderRadius: '15px', border: '1px solid #ffe0b2' }}>
                                        <h4 style={{ margin: '0 0 15px 0', color: '#e65100', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            💰 Cotización Aprobada
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#777', fontSize: '14px' }}>Costo Final:</span>
                                                <span style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>${trabajo.cotizacion.costo}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: '#777', fontSize: '14px', display: 'block', marginBottom: '5px' }}>Notas de Administración:</span>
                                                <p style={{ margin: 0, color: '#555', fontSize: '14px', fontStyle: 'italic', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ffd54f' }}>
                                                    "{trabajo.cotizacion.notas || "Sin notas adicionales."}"
                                                </p>
                                            </div>
                                            <div style={{ marginTop: '10px' }}>
                                                <a
                                                    href={trabajo.cotizacion.archivo}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ display: 'inline-block', color: '#1976d2', textDecoration: 'none', fontSize: '14px', fontWeight: 'bold' }}
                                                >
                                                    📎 Ver Archivo Adjunto (Original)
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminDetalleTrabajo;
