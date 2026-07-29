import React, { useState, useEffect } from 'react';
import styles from './InventarioGeneral.module.css';
import { 
    HiOutlineArchiveBox, 
    HiOutlinePlus, 
    HiOutlineTrash,
    HiOutlineArrowDownTray,
    HiOutlineTag,
    HiOutlineBuildingOffice2,
    HiOutlineWrenchScrewdriver,
    HiOutlineMagnifyingGlass
} from "react-icons/hi2";
import { getNegocios, updateEquipo } from '../../services/negociosService';
import { categoriasService } from '../../services/categoriasService';
import type { CategoriaEquipo } from '../../services/categoriasService';
import { getConsumoReporte } from '../../services/mantenimientoService';
import EquipoAdminDrawer from '../../components/admin/EquipoAdminDrawer';
import type { AdminEquipment } from '../../types/adminEquipment';

const InventarioGeneral: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'equipos' | 'categorias' | 'consumos'>('equipos');
    const [negocios, setNegocios] = useState<any[]>([]);
    const [categorias, setCategorias] = useState<CategoriaEquipo[]>([]);
    const [consumos, setConsumos] = useState<any[]>([]);
    
    // Filters & Inputs
    const [selectedNegocio, setSelectedNegocio] = useState<string>('all');
    const [selectedCategoria, setSelectedCategoria] = useState<string>('all');
    const [searchText, setSearchText] = useState<string>('');
    const [newCategoryName, setNewCategoryName] = useState<string>('');
    
    // UI states
    const [loading, setLoading] = useState<boolean>(true);
    const [submittingCat, setSubmittingCat] = useState<boolean>(false);
    const [selectedEquipment, setSelectedEquipment] = useState<AdminEquipment | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

    // Fetch initial data
    const loadAllData = async () => {
        setLoading(true);
        try {
            const [negociosData, catsData, consumosData] = await Promise.all([
                getNegocios(),
                categoriasService.getCategorias(),
                getConsumoReporte()
            ]);
            setNegocios(negociosData || []);
            setCategorias(catsData || []);
            setConsumos(consumosData || []);
        } catch (error) {
            console.error("Error al cargar los datos del inventario:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // Get flat equipment list for easier filtering and rendering
    const getFlatEquipos = (): AdminEquipment[] => {
        const flat: AdminEquipment[] = [];
        negocios.forEach((neg) => {
            const areas = neg.areas || [];
            areas.forEach((area: any) => {
                const equipos = area.equipos || [];
                equipos.forEach((eq: any) => {
                    flat.push({
                        ...eq,
                        sucursalId: neg.id,
                        sucursalNombre: neg.nombre,
                        areaId: area.id,
                        areaNombre: area.nombreArea,
                        categoriaNombre: eq.categoria?.nombre || 'SIN CATEGORÍA'
                    });
                });
            });
        });
        return flat;
    };

    const flatEquipos = getFlatEquipos();

    // Filter flat equipment list
    const filteredEquipos = flatEquipos.filter((eq) => {
        const matchesNegocio = selectedNegocio === 'all' || eq.sucursalId === Number(selectedNegocio);
        const matchesCategoria = selectedCategoria === 'all' || 
            (selectedCategoria === 'null' ? !eq.categoria_id : eq.categoria_id === Number(selectedCategoria));
        const matchesSearch = searchText === '' || 
            eq.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
            eq.marca.toLowerCase().includes(searchText.toLowerCase()) ||
            eq.modelo.toLowerCase().includes(searchText.toLowerCase()) ||
            (eq.serie && eq.serie.toLowerCase().includes(searchText.toLowerCase()));

        return matchesNegocio && matchesCategoria && matchesSearch;
    });

    // Filter consumption report list
    const filteredConsumos = consumos.filter((con) => {
        const eq = con.equipo;
        const matchesNegocio = selectedNegocio === 'all' || (eq?.area?.negocio_id === Number(selectedNegocio));
        const matchesCategoria = selectedCategoria === 'all' || 
            (selectedCategoria === 'null' ? !con.categoria_id : con.categoria_id === Number(selectedCategoria));
        const matchesSearch = searchText === '' || 
            con.pieza.toLowerCase().includes(searchText.toLowerCase()) ||
            (eq?.nombre && eq.nombre.toLowerCase().includes(searchText.toLowerCase()));

        return matchesNegocio && matchesCategoria && matchesSearch;
    });

    // Add new category handler
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setSubmittingCat(true);
        try {
            const newCat = await categoriasService.createCategoria(newCategoryName);
            setCategorias((prev) => [...prev, newCat]);
            setNewCategoryName('');
        } catch (error) {
            console.error("Error al crear categoría:", error);
            alert("No se pudo crear la categoría. Verifique que no exista una con el mismo nombre.");
        } finally {
            setSubmittingCat(false);
        }
    };

    // Delete category handler
    const handleDeleteCategory = async (id: number) => {
        // Verificar si hay equipos o piezas usando esta categoría
        const equiposCount = flatEquipos.filter(eq => eq.categoria_id === id).length;
        const piezasCount = consumos.filter(con => con.categoria_id === id).length;
        
        if (equiposCount > 0 || piezasCount > 0) {
            alert(`No se puede eliminar la categoría porque está asociada a ${equiposCount} equipo(s) y ${piezasCount} pieza(s). Reasigne los elementos primero.`);
            return;
        }

        if (!confirm("¿Está seguro de que desea eliminar esta categoría permanentemente?")) return;

        try {
            await categoriasService.deleteCategoria(id);
            setCategorias((prev) => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error("Error al eliminar categoría:", error);
            alert("Error al eliminar la categoría del servidor.");
        }
    };



    // CSV Exports
    const exportEquiposCSV = () => {
        let csvContent = "\ufeff";
        csvContent += "ID,Nombre,Marca,Modelo,Serie,Año Fabricación,Tiempo de Uso,Sucursal,Área,Categoría\n";
        filteredEquipos.forEach((eq) => {
            csvContent += `"${eq.id}","${eq.nombre}","${eq.marca}","${eq.modelo}","${eq.serie || ''}","${eq.anioFabricacion || ''}","${eq.anioUso || ''}","${eq.sucursalNombre}","${eq.areaNombre}","${eq.categoriaNombre}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "inventario_equipos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportConsumosCSV = () => {
        let csvContent = "\ufeff";
        csvContent += "ID Consumo,Refacción,Cantidad,Costo Estimado,Equipo,Sucursal,Área,Categoría,Técnico,Fecha\n";
        filteredConsumos.forEach((con) => {
            csvContent += `"${con.id}","${con.pieza}","${con.cantidad}","${con.costo_estimado || ''}","${con.equipo?.nombre || ''}","${con.equipo?.area?.negocio?.nombre || ''}","${con.equipo?.area?.nombreArea || ''}","${con.categoria?.nombre || ''}","${con.actividad?.trabajador?.nombre || 'N/A'}","${new Date(con.created_at).toLocaleDateString()}"\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "consumo_refacciones.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRowClick = (eq: AdminEquipment) => {
        setSelectedEquipment(eq);
        setIsDetailOpen(true);
    };

    const handleUpdateConsumoCategoria = async (consumoId: number, categoriaId: string) => {
        if (!categoriaId) return;
        try {
            await categoriasService.updateConsumoCategoria(consumoId, Number(categoriaId));
            
            // Auto-assign the category to the parent equipment
            const consumo = consumos.find(c => c.id === consumoId);
            const equipoId = consumo?.equipo?.id || consumo?.equipo_id;
            
            if (equipoId) {
                await updateEquipo(equipoId, { categoria_id: Number(categoriaId) });
                // Update local state in negocios so the Equipos tab refreshes automatically
                setNegocios(prev => prev.map(neg => ({
                    ...neg,
                    areas: neg.areas?.map((area: any) => ({
                        ...area,
                        equipos: area.equipos?.map((e: any) => 
                            e.id === equipoId 
                                ? { ...e, categoria_id: Number(categoriaId), categoria: categorias.find(c => c.id === Number(categoriaId)) }
                                : e
                        )
                    }))
                })));
            }

            // Update local state for consumos
            setConsumos(prev => prev.map(c => 
                c.id === consumoId 
                    ? { ...c, categoria_id: Number(categoriaId), categoria: categorias.find(cat => cat.id === Number(categoriaId)) }
                    : c
            ));
        } catch (error) {
            alert('Error al asignar la categoría a la refacción/equipo.');
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className="loader-mantenere"></div>
                <p>Cargando información del inventario técnico...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* TABS */}
            <div className={styles.tabsHeader}>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'equipos' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('equipos')}
                >
                    <HiOutlineArchiveBox size={18} />
                    Inventario de Equipos
                </button>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'categorias' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('categorias')}
                >
                    <HiOutlineTag size={18} />
                    Categorías de Equipos
                </button>
                <button 
                    className={`${styles.tabBtn} ${activeTab === 'consumos' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('consumos')}
                >
                    <HiOutlineWrenchScrewdriver size={18} />
                    Seguimiento de Consumo
                </button>
            </div>

            {/* FILTROS (Solo visibles en pestaña 1 y 3) */}
            {activeTab !== 'categorias' && (
                <div className={styles.filtersSection}>
                    <div className={styles.filtersGrid}>
                        <div className={styles.filterGroup}>
                            <label><HiOutlineBuildingOffice2 size={14} /> Sucursal</label>
                            <select 
                                value={selectedNegocio}
                                onChange={(e) => setSelectedNegocio(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="all">Todas las sucursales</option>
                                {negocios.map((neg) => (
                                    <option key={neg.id} value={neg.id}>{neg.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label><HiOutlineTag size={14} /> Categoría</label>
                            <select 
                                value={selectedCategoria}
                                onChange={(e) => setSelectedCategoria(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="all">Todas las categorías</option>
                                <option value="null">Sin Categoría</option>
                                {categorias.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label><HiOutlineMagnifyingGlass size={14} /> Buscar</label>
                            <div className={styles.searchWrapper}>
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nombre, marca..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className={styles.filterInput}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.actionsRow}>
                        {activeTab === 'equipos' ? (
                            <button className={styles.exportBtn} onClick={exportEquiposCSV}>
                                <HiOutlineArrowDownTray size={16} /> Exportar CSV
                            </button>
                        ) : (
                            <button className={styles.exportBtn} onClick={exportConsumosCSV}>
                                <HiOutlineArrowDownTray size={16} /> Exportar CSV
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: EQUIPOS */}
            {activeTab === 'equipos' && (
                <div className={styles.tableCard}>
                    <div className={styles.tableResponsive}>
                        <table className={styles.inventarioTable}>
                            <thead>
                                <tr>
                                    <th>Equipo</th>
                                    <th>Categoría</th>
                                    <th>Marca / Modelo</th>
                                    <th>Número de Serie</th>
                                    <th>Ubicación</th>
                                    <th>Años Uso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEquipos.length > 0 ? (
                                    filteredEquipos.map((eq) => (
                                        <tr key={eq.id} onClick={() => handleRowClick(eq)} className={styles.clickableRow}>
                                            <td>
                                                <div className={styles.equipInfoCell}>
                                                    {eq.foto ? (
                                                        <img src={eq.foto} alt="" className={styles.rowThumb} />
                                                    ) : (
                                                        <div className={styles.rowNoThumb}>⚙️</div>
                                                    )}
                                                    <div>
                                                        <span className={styles.equipName}>{eq.nombre}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.catBadge} ${eq.categoria_id ? styles.catBadgeActive : styles.catBadgeNone}`}>
                                                    {eq.categoriaNombre}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={styles.normalText}>{eq.marca}</span>
                                                <span className={styles.subtext}>{eq.modelo}</span>
                                            </td>
                                            <td>
                                                <span className={styles.monoText}>{eq.serie || 'N/A'}</span>
                                            </td>
                                            <td>
                                                <span className={styles.normalText}>{eq.sucursalNombre}</span>
                                                <span className={styles.subtext}>{eq.areaNombre}</span>
                                            </td>
                                            <td>
                                                <span className={styles.normalText}>{eq.anioUso || 'N/A'}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className={styles.emptyStateCell}>
                                            No se encontraron equipos registrados que coincidan con los filtros.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: CATEGORÍAS */}
            {activeTab === 'categorias' && (
                <div className={styles.categoriesLayout}>
                    <div className={styles.leftCol}>
                        <div className={styles.formCard}>
                            <h3>Nueva Categoría</h3>
                            <form onSubmit={handleAddCategory} className={styles.catForm}>
                                <div className={styles.inputField}>
                                    <label>Nombre de Categoría</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej. REFRIGERADORES, ESTUFAS"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className={styles.submitBtn} disabled={submittingCat}>
                                    <HiOutlinePlus size={16} /> 
                                    {submittingCat ? 'Guardando...' : 'Crear Categoría'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className={styles.rightCol}>
                        <div className={styles.tableCard}>
                            <h3>Categorías Registradas</h3>
                            <div className={styles.tableResponsive}>
                                <table className={styles.inventarioTable}>
                                    <thead>
                                        <tr>
                                            <th>Categoría</th>
                                            <th>Equipos</th>
                                            <th>Piezas</th>
                                            <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categorias.length > 0 ? (
                                            categorias.map((cat) => {
                                                const piezasAsociadas = consumos.filter(con => con.categoria_id === cat.id);
                                                
                                                // Un equipo está asociado si tiene la categoría directamente OR si tiene piezas con esta categoría
                                                const eqIdsFromPiezas = new Set(piezasAsociadas.map(p => p.equipo?.id).filter(Boolean));
                                                const equiposAsociados = flatEquipos.filter(eq => 
                                                    eq.categoria_id === cat.id || eqIdsFromPiezas.has(eq.id)
                                                );
                                                
                                                const eqCount = equiposAsociados.length;
                                                const pzCount = piezasAsociadas.length;
                                                return (
                                                    <tr key={cat.id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <HiOutlineTag size={16} color="#64748b" />
                                                                <span className={styles.catName}>{cat.nombre}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <span className={styles.badgeCount} style={{ width: 'fit-content' }}>{eqCount} equipo(s)</span>
                                                                {equiposAsociados.length > 0 && (
                                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                        {equiposAsociados.map(eq => `${eq.nombre} · ${eq.marca || 'Sin marca'}`).join(', ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <span className={styles.badgeCount} style={{ background: '#e0f2fe', color: '#0284c7', width: 'fit-content' }}>{pzCount} pieza(s)</span>
                                                                {piezasAsociadas.length > 0 && (
                                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                        {Array.from(new Set(piezasAsociadas.map(p => p.pieza))).join(', ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button 
                                                                className={styles.deleteBtn}
                                                                onClick={() => handleDeleteCategory(cat.id)}
                                                                title="Eliminar categoría"
                                                            >
                                                                <HiOutlineTrash size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className={styles.emptyStateCell}>
                                                    No hay categorías de equipos registradas en el sistema.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: CONSUMOS */}
            {activeTab === 'consumos' && (
                <div className={styles.tableCard}>
                    <div className={styles.tableResponsive}>
                        <table className={styles.inventarioTable}>
                            <thead>
                                <tr>
                                    <th>Pieza / Refacción</th>
                                    <th>Cantidad</th>
                                    <th>Equipo Destino</th>
                                    <th>Categoría</th>
                                    <th>Sucursal / Área</th>
                                    <th>Técnico</th>
                                    <th>Fecha</th>
                                    <th>Costo Est.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredConsumos.length > 0 ? (
                                    filteredConsumos.map((con) => (
                                        <tr key={con.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className={styles.partIcon}>🔩</div>
                                                    <span className={styles.partName}>{con.pieza}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={styles.badgeQty}>x{con.cantidad}</span>
                                            </td>
                                            <td>
                                                <span className={styles.normalText}>{con.equipo?.nombre || 'N/A'}</span>
                                            </td>
                                            <td>
                                                <select
                                                    className={styles.filterSelect}
                                                    style={{ padding: '6px 10px', fontSize: '12px' }}
                                                    value={con.categoria_id || ''}
                                                    onChange={(e) => handleUpdateConsumoCategoria(con.id, e.target.value)}
                                                >
                                                    <option value="">+ Asignar</option>
                                                    {categorias.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <span className={styles.normalText}>{con.equipo?.area?.negocio?.nombre || 'N/A'}</span>
                                                <span className={styles.subtext}>{con.equipo?.area?.nombreArea || 'N/A'}</span>
                                            </td>
                                            <td>
                                                <span className={styles.normalText}>{con.actividad?.trabajador?.nombre || 'N/A'}</span>
                                            </td>
                                            <td>
                                                <span className={styles.normalText}>{new Date(con.created_at).toLocaleDateString()}</span>
                                            </td>
                                            <td>
                                                <span className={styles.costText}>
                                                    {con.costo_estimado ? `$${Number(con.costo_estimado).toFixed(2)}` : 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className={styles.emptyStateCell}>
                                            No se encontraron consumos registrados que coincidan con los filtros.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ADMIN EQUIPMENT DRAWER */}
            <EquipoAdminDrawer
                isOpen={isDetailOpen}
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelectedEquipment(null);
                }}
                equipment={selectedEquipment}
                onSaved={loadAllData}
            />
        </div>
    );
};

export default InventarioGeneral;
