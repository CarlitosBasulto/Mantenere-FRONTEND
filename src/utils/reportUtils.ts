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

    // 1. Si existe diccionario subReports acumulado
    if (parsed.subReports && typeof parsed.subReports === 'object') {
        const sr = parsed.subReports;

        // Búsqueda por clave exacta con trabajoId
        if (trabajoId && pIdx && sr[`${trabajoId}_${pIdx}`]) return sr[`${trabajoId}_${pIdx}`];
        if (trabajoId && subId && sr[`${trabajoId}_${subId}`]) return sr[`${trabajoId}_${subId}`];

        // Búsqueda por clave exacta con baseId
        if (baseId && pIdx && sr[`${baseId}_${pIdx}`]) return sr[`${baseId}_${pIdx}`];

        // Búsqueda por subId exacto
        if (subId && sr[subId]) return sr[subId];

        // Búsqueda por clave de índice simple
        if (pIdx && sr[String(pIdx)]) return sr[String(pIdx)];
    }

    // 2. Coincidencia directa de subtareaId
    if (parsed.subtareaId && (parsed.subtareaId === subId || (trabajoId && parsed.subtareaId === `${trabajoId}_${pIdx}`))) {
        return parsed;
    }

    // 3. Fallback solo si es un trabajo simple de 1 solo punto (no sub-puntos)
    if (!pIdx && !subId.includes('_') && (!parsed.subReports || Object.keys(parsed.subReports).length === 0)) {
        return parsed;
    }

    return null;
};
