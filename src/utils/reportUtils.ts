export interface SubReportTarget {
    id?: string | number;
    baseId?: string | number;
    pointIndex?: number;
    titulo?: string;
    descripcion?: string;
}

/**
 * Busca de forma precisa el reporte de un sub-punto/tarea dentro del objeto de reporte
 * evitando la repetición o contaminación de imágenes y datos de otros puntos.
 */
export const findMatchingSubReport = (parsed: any, target: SubReportTarget): any => {
    if (!parsed) return null;

    const subId = target.id !== undefined && target.id !== null ? String(target.id) : '';
    const baseId = target.baseId !== undefined && target.baseId !== null ? String(target.baseId) : '';
    const pIdx = target.pointIndex !== undefined && target.pointIndex !== null
        ? Number(target.pointIndex)
        : (subId.includes('_') ? Number(subId.split('_')[1]) : null);
    const targetTitle = (target.titulo || '').toLowerCase();

    // 1. Si existe diccionario subReports acumulado
    if (parsed.subReports && typeof parsed.subReports === 'object') {
        const sr = parsed.subReports;

        // Búsqueda por clave exacta
        if (subId && sr[subId]) return sr[subId];
        if (baseId && pIdx && sr[`${baseId}_${pIdx}`]) return sr[`${baseId}_${pIdx}`];
        if (pIdx && sr[String(pIdx)]) return sr[String(pIdx)];

        // Búsqueda por sufijo de índice de punto (ej. '24_1' o '8_1' para pIdx === 1)
        if (pIdx) {
            const keyBySuffix = Object.keys(sr).find(k => k === String(pIdx) || k.endsWith(`_${pIdx}`));
            if (keyBySuffix && sr[keyBySuffix]) return sr[keyBySuffix];
        }

        // Búsqueda por coincidencia semántica de categoría / título
        if (targetTitle) {
            const keywords = ['electric', 'plomer', 'albañil', 'pintur', 'carpinter', 'mantenimiento', 'instalaci', 'aire', 'clima', 'herreria', 'cerrajer'];
            const matchedKeyword = keywords.find(kw => targetTitle.includes(kw));
            if (matchedKeyword) {
                const keyByKeyword = Object.keys(sr).find(k => {
                    const obj = sr[k];
                    const objTitle = (obj?.reporteTienda || obj?.descripcion || '').toLowerCase();
                    return objTitle.includes(matchedKeyword);
                });
                if (keyByKeyword && sr[keyByKeyword]) return sr[keyByKeyword];
            }
        }
    }

    // 2. Coincidencia directa de subtareaId
    if (parsed.subtareaId && (parsed.subtareaId === subId || (pIdx && String(parsed.subtareaId).endsWith(`_${pIdx}`)))) {
        return parsed;
    }

    // 2.1 Coincidencia semántica de reporte directo si coincide la categoría o palabra clave
    if (targetTitle) {
        const keywords = ['electric', 'plomer', 'albañil', 'pintur', 'carpinter', 'mantenimiento', 'instalaci', 'aire', 'clima', 'herreria', 'cerrajer'];
        const matchedKeyword = keywords.find(kw => targetTitle.includes(kw));
        if (matchedKeyword) {
            const parsedText = `${parsed.reporteTienda || ''} ${parsed.descripcion || ''} ${parsed.tipo || ''} ${parsed.subtareaId || ''}`.toLowerCase();
            if (parsedText.includes(matchedKeyword)) {
                return parsed;
            }
        }
    }

    // 3. Fallback solo si es un trabajo simple de 1 solo punto (no sub-puntos)
    if (!pIdx && !subId.includes('_') && (!parsed.subReports || Object.keys(parsed.subReports).length <= 1)) {
        return parsed;
    }

    return null;
};
