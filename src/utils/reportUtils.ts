export interface SubReportTarget {
    id?: string | number;
    baseId?: string | number;
    trabajoId?: string | number;
    pointIndex?: number;
    titulo?: string;
    descripcion?: string;
}

/**
 * Busca de forma precisa el reporte de un sub-punto/tarea dentro del objeto de reporte
 * evitando la repetición o contaminación de imágenes y datos de otros trabajos o puntos.
 */
export const findMatchingSubReport = (parsed: any, target: SubReportTarget): any => {
    if (!parsed) return null;

    const subId = target.id !== undefined && target.id !== null ? String(target.id) : '';
    const baseId = target.baseId !== undefined && target.baseId !== null ? String(target.baseId) : '';
    const trabajoId = target.trabajoId !== undefined && target.trabajoId !== null ? String(target.trabajoId) : '';
    const pIdx = target.pointIndex !== undefined && target.pointIndex !== null
        ? Number(target.pointIndex)
        : (subId.includes('_') ? Number(subId.split('_')[1]) : null);

    const isSubPoint = Boolean((pIdx !== null && pIdx !== undefined && !isNaN(pIdx)) || subId.includes('_'));

    let match: any = null;

    // 1. Si existe diccionario subReports acumulado
    if (parsed.subReports && typeof parsed.subReports === 'object') {
        const sr = parsed.subReports;

        // Búsqueda por clave exacta con trabajoId
        if (trabajoId && pIdx && sr[`${trabajoId}_${pIdx}`]) match = sr[`${trabajoId}_${pIdx}`];
        else if (trabajoId && subId && sr[`${trabajoId}_${subId}`]) match = sr[`${trabajoId}_${subId}`];
        // Búsqueda por clave exacta con baseId
        else if (baseId && pIdx && sr[`${baseId}_${pIdx}`]) match = sr[`${baseId}_${pIdx}`];
        else if (baseId && subId && sr[`${baseId}_${subId}`]) match = sr[`${baseId}_${subId}`];
        // Búsqueda por subId exacto
        else if (subId && sr[subId]) match = sr[subId];
        // Búsqueda por clave de índice simple
        else if (pIdx && sr[String(pIdx)]) match = sr[String(pIdx)];
        // Búsqueda por trabajoId simple SOLO si no es un sub-punto
        else if (!isSubPoint && trabajoId && sr[trabajoId]) match = sr[trabajoId];
    }

    // 2. Coincidencia directa de subtareaId en el objeto raíz
    if (!match && parsed.subtareaId) {
        if (parsed.subtareaId === subId) match = parsed;
        else if (trabajoId && pIdx && parsed.subtareaId === `${trabajoId}_${pIdx}`) match = parsed;
        else if (baseId && pIdx && parsed.subtareaId === `${baseId}_${pIdx}`) match = parsed;
        else if (!isSubPoint && (parsed.subtareaId === trabajoId || parsed.subtareaId === baseId)) match = parsed;
    }

    // 3. Fallback SOLO si NO es un sub-punto y el reporte coincide a nivel de trabajo general
    if (!match && !isSubPoint) {
        // Solo usar parsed si no pertenece explícitamente a otro subId diferente
        if (!parsed.subtareaId || parsed.subtareaId === subId || parsed.subtareaId === trabajoId) {
            match = parsed;
        }
    }

    if (match) {
        // Heredar firmaEmpresa del objeto raíz si el sub-reporte no tiene una propia
        if ((!match.firmaEmpresa || match.firmaEmpresa === '__PDF_LOADED_IN_STATE__') && parsed.firmaEmpresa && parsed.firmaEmpresa !== '__PDF_LOADED_IN_STATE__') {
            match = { ...match, firmaEmpresa: parsed.firmaEmpresa };
        }
        return match;
    }

    return null;
};
