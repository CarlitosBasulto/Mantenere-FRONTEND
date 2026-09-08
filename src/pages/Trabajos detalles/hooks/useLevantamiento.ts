import { getNegocio, updateNegocio, uploadImage } from '../../../services/negociosService';
import { useModal } from '../../../context/ModalContext';

/**
 * Hook que centraliza el CRUD del levantamiento de áreas y sub-áreas.
 * Recibe businessAreas y setBusinessAreas desde el componente padre
 * (el estado vive en el padre porque también lo necesitan otros componentes
 * como NuevoServicioModal para seleccionar equipo de mantenimiento).
 */
export const useLevantamiento = (
    id: string | undefined,
    businessAreas: any[],
    setBusinessAreas: React.Dispatch<React.SetStateAction<any[]>>
) => {
    const { showAlert, showConfirm, showPrompt } = useModal();

    /**
     * Persiste el estado del levantamiento en el servidor.
     * Sube imágenes pendientes, luego hace PUT al negocio con el JSON de áreas.
     * @param newLevantamientoData - Array de secciones actualizado
     * @param showNotification     - Si true, muestra alert de éxito al terminar
     */
    const persistLevantamiento = async (newLevantamientoData: any[], showNotification: boolean = false) => {
        setBusinessAreas(newLevantamientoData);

        try {
            // Subir imágenes pendientes de equipos
            const finalLevantamiento = await Promise.all(
                newLevantamientoData.map(async (section) => {
                    const finalEquipos = await Promise.all(
                        section.equipos.map(async (eq: any) => {
                            let eqFoto = eq.foto;
                            let eqFotoPlaca = eq.fotoPlaca;
                            if (eq.fotoFile) {
                                try { eqFoto = await uploadImage(eq.fotoFile); } catch (ign) { /* ignorar */ }
                            }
                            if (eq.fotoPlacaFile) {
                                try { eqFotoPlaca = await uploadImage(eq.fotoPlacaFile); } catch (ign) { /* ignorar */ }
                            }
                            return { ...eq, foto: eqFoto, fotoPlaca: eqFotoPlaca, fotoFile: undefined, fotoPlacaFile: undefined };
                        })
                    );
                    const cleanSubAreas = (section.subAreas || []).map((sub: any) => ({
                        ...sub,
                        equipos: []
                    }));
                    return { ...section, subAreas: cleanSubAreas, equipos: finalEquipos };
                })
            );

            const existing = await getNegocio(Number(id));
            const apiPayload: any = {
                nombre: existing.nombre,
                tipo: existing.tipo,
                encargado: existing.encargado,
                estado: existing.estado,
                ciudad: existing.ciudad,
                calle: existing.calle,
                numero: existing.numero,
                colonia: existing.colonia,
                cp: existing.cp,
                referencia: existing.referencia,
                nombrePlaza: existing.nombrePlaza,
                gerente: existing.gerente,
                telefonoGerente: existing.telefonoGerente,
                subgerente: existing.subgerente,
                telefonoSubgerente: existing.telefonoSubgerente,
                manzana: existing.manzana,
                lote: existing.lote,
                calleAv: existing.calleAv,
                levantamiento: finalLevantamiento,
            };
            if (existing.imagenPerfil) apiPayload.imagenPerfil = existing.imagenPerfil;
            if (existing.imagen_portada) apiPayload.imagen_portada = existing.imagen_portada;

            const updateRes = await updateNegocio(Number(id), apiPayload);

            if (updateRes?.data?.areas) {
                const mergedAreas = updateRes.data.areas.map((serverArea: any) => {
                    const localArea = newLevantamientoData.find(
                        a => String(a.id) === String(serverArea.id) || a.nombreArea === serverArea.nombreArea
                    );

                    const subAreasMap = new Map<string, any>();

                    if (serverArea.sub_areas_json && Array.isArray(serverArea.sub_areas_json)) {
                        serverArea.sub_areas_json.forEach((sub: any) => {
                            subAreasMap.set(sub.id, { ...sub, equipos: [] });
                        });
                    }

                    if (localArea?.subAreas) {
                        localArea.subAreas.forEach((sub: any) => {
                            if (!subAreasMap.has(sub.id)) {
                                subAreasMap.set(sub.id, { ...sub, equipos: [] });
                            }
                        });
                    }

                    (serverArea.equipos || []).forEach((eq: any) => {
                        const subId = eq.subAreaId || `sub_gen_${serverArea.id}`;
                        const subName = eq.nombreSubArea || 'GENERAL';
                        if (!subAreasMap.has(subId)) {
                            subAreasMap.set(subId, { id: subId, nombreSubArea: subName, equipos: [] });
                        }
                        subAreasMap.get(subId)!.equipos.push(eq);
                    });

                    let finalSubAreas = Array.from(subAreasMap.values());
                    if (finalSubAreas.length === 0) {
                        finalSubAreas = [{ id: `sub_gen_${serverArea.id}`, nombreSubArea: 'GENERAL', equipos: serverArea.equipos || [] }];
                    }

                    return { ...serverArea, subAreas: finalSubAreas };
                });

                setBusinessAreas(mergedAreas);
            }

            if (showNotification) {
                showAlert('Éxito', 'Levantamiento guardado exitosamente.', 'success');
            }
        } catch (error) {
            console.error('Error saving levantamiento:', error);
            showAlert('Error', 'No se pudo guardar el levantamiento en el servidor.', 'error');
        }
    };

    /** Agrega un área nueva con su sub-área GENERAL por defecto */
    const handleAddArea = (nombreArea: string) => {
        const newSecId = `sec_${Date.now()}`;
        const newSubId = `sub_${Date.now()}`;
        const newSection: any = {
            id: newSecId,
            nombreArea: nombreArea.trim().toUpperCase(),
            subAreas: [{ id: newSubId, nombreSubArea: 'GENERAL', equipos: [] }],
            equipos: []
        };
        persistLevantamiento([...businessAreas, newSection]);
    };

    /** Agrega una sub-área dentro de un área existente */
    const handleAddSubArea = (nombreSubArea: string, activeAreaForSub: string | null) => {
        if (!activeAreaForSub) return;
        const newSubId = `sub_${Date.now()}`;
        const updated = businessAreas.map(sec => {
            if (sec.id === activeAreaForSub) {
                return {
                    ...sec,
                    subAreas: [
                        ...(sec.subAreas || []),
                        { id: newSubId, nombreSubArea: nombreSubArea.trim().toUpperCase(), equipos: [] }
                    ]
                };
            }
            return sec;
        });
        persistLevantamiento(updated);
    };

    /** Elimina un área y todas sus sub-áreas (con confirmación) */
    const handleDeleteArea = (areaId: string, nombreArea: string) => {
        showConfirm(
            '¿Eliminar área?',
            `¿Estás seguro de que deseas eliminar el área "${nombreArea}" y todas sus sub-áreas?`,
            () => {
                const updated = businessAreas.filter(s => s.id !== areaId);
                persistLevantamiento(updated);
            },
            () => {},
            'Sí, eliminar',
            'Cancelar'
        );
    };

    /** Renombra un área (con prompt de confirmación) */
    const editAreaName = (areaId: string, oldName: string) => {
        showPrompt(
            'Editar Área',
            'Ingresa el nuevo nombre para esta área:',
            oldName,
            (newName) => {
                if (newName?.trim()) {
                    const updated = businessAreas.map(sec =>
                        sec.id === areaId ? { ...sec, nombreArea: newName.trim().toUpperCase() } : sec
                    );
                    persistLevantamiento(updated);
                }
            },
            () => {},
            'Guardar Cambios',
            'Cancelar'
        );
    };

    return {
        persistLevantamiento,
        handleAddArea,
        handleAddSubArea,
        handleDeleteArea,
        editAreaName,
    };
};
