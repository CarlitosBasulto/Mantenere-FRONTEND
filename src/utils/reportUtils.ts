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

    let match: any = null;

    // 1. Si existe diccionario subReports acumulado
    if (parsed.subReports && typeof parsed.subReports === 'object') {
        const sr = parsed.subReports;

        // Búsqueda por clave exacta con trabajoId
        if (trabajoId && pIdx && sr[`${trabajoId}_${pIdx}`]) match = sr[`${trabajoId}_${pIdx}`];
        else if (trabajoId && subId && sr[`${trabajoId}_${subId}`]) match = sr[`${trabajoId}_${subId}`];
        // Búsqueda por clave exacta con baseId
        else if (baseId && pIdx && sr[`${baseId}_${pIdx}`]) match = sr[`${baseId}_${pIdx}`];
        // Búsqueda por subId exacto
        else if (subId && sr[subId]) match = sr[subId];
        // Búsqueda por trabajoId simple
        else if (trabajoId && sr[trabajoId]) match = sr[trabajoId];
        // Búsqueda por clave de índice simple
        else if (pIdx && sr[String(pIdx)]) match = sr[String(pIdx)];
    }

    // 2. Coincidencia directa de subtareaId
    if (!match && parsed.subtareaId && (parsed.subtareaId === subId || parsed.subtareaId === trabajoId || (trabajoId && parsed.subtareaId === `${trabajoId}_${pIdx}`))) {
        match = parsed;
    }

    // 3. Si no hubo coincidencia en subReports, usar parsed como fallback si tiene información relevante
    if (!match) {
        if (!pIdx && !subId.includes('_')) {
            match = parsed;
        } else if (parsed.descripcion || parsed.reporteTienda || parsed.imagenes || parsed.firmaEmpresa) {
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
