/**
 * Limpia recursivamente cualquier URL que comience con 'blob:' de un objeto o array.
 * Las URLs blob son temporales y no deben persistirse.
 */
export const stripBlobUrls = (data: any): any => {
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map(item => stripBlobUrls(item));
    }

    if (typeof data === 'object') {
        const cleaned: any = {};
        for (const key in data) {
            const value = data[key];
            if (typeof value === 'string' && value.startsWith('blob:')) {
                cleaned[key] = ''; // O eliminar la propiedad: delete cleaned[key]
            } else if (typeof value === 'object') {
                cleaned[key] = stripBlobUrls(value);
            } else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }

    return data;
};

export const saveSafeLocalInfo = (storageKey: string, id: string | number, data: any, showAlert?: any) => {
    try {
        const store = JSON.parse(localStorage.getItem(storageKey) || '{}');
        // Siempre limpiar blobs antes de guardar
        store[id] = stripBlobUrls(data);
        localStorage.setItem(storageKey, JSON.stringify(store));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.message.toLowerCase().includes('quota')) {
            console.warn("Storage quota exceeded. Attempting to save without images.");
            const lightData = stripBlobUrls(JSON.parse(JSON.stringify(data))); // Deep copy + strip
            
            // Eliminar imagen principal
            delete lightData.imagenPerfil;
            
            // Eliminar fotos de equipos
            if (lightData.areas && Array.isArray(lightData.areas)) {
                lightData.areas = lightData.areas.map((area: any) => ({
                    ...area,
                    equipos: area.equipos.map((eq: any) => {
                        const { foto, ...rest } = eq;
                        return rest;
                    })
                }));
            }
            
            try {
                const store = JSON.parse(localStorage.getItem(storageKey) || '{}');
                store[id] = lightData;
                localStorage.setItem(storageKey, JSON.stringify(store));
                if (showAlert) {
                    showAlert("Aviso", "Datos guardados. Las imágenes fueron omitidas por falta de espacio en tu navegador.", "warning");
                }
            } catch (err) {
                console.error("Storage completely full.", err);
            }
        }
    }
};

/**
 * Limpia entradas viejas de reportes o borradores temporales para liberar espacio de localStorage.
 */
export const cleanupReportStorage = (keepJobId?: string | number) => {
    try {
        const keepStr = keepJobId !== undefined && keepJobId !== null ? String(keepJobId) : null;
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (!key) continue;

            // Eliminar borradores temporales (son efímeros)
            if (key.startsWith('report_data_temporal_')) {
                localStorage.removeItem(key);
                continue;
            }

            // Si se especificó keepJobId, remover reportes de otros trabajos
            if (keepStr && key.startsWith('report_data_')) {
                const parts = key.replace('report_data_', '').split('_');
                const workId = parts[0];
                if (workId && workId !== keepStr) {
                    localStorage.removeItem(key);
                }
            }
        }
    } catch (e) {
        console.warn("Error cleaning up storage:", e);
    }
};

/**
 * Guarda de forma segura una clave en localStorage, previniendo errores de QuotaExceededError
 * mediante limpieza automática de claves temporales, supresión de firmas duplicadas pesadas y
 * degradación elegante sin arrojar excepciones fatales que rompan la aplicación.
 */
export const safeLocalStorageSet = (
    key: string,
    value: any,
    currentJobId?: string | number
): boolean => {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    // 1. Intento directo
    try {
        localStorage.setItem(key, valueStr);
        return true;
    } catch (e: any) {
        const isQuota = 
            e?.name === 'QuotaExceededError' || 
            e?.code === 22 || 
            e?.code === 1014 || 
            String(e?.message || '').toLowerCase().includes('quota');

        if (!isQuota) {
            console.warn(`[Storage] No se pudo guardar ${key}:`, e);
            return false;
        }

        // 2. Primer rescate: Limpiar borradores temporales y reportes de otros trabajos
        try {
            cleanupReportStorage(currentJobId);
            localStorage.setItem(key, valueStr);
            return true;
        } catch (_) {
            // 3. Segundo rescate: Aligerar datos del reporte (firmas gigantes y subreportes duplicados pesados)
            try {
                let parsed: any = null;
                try {
                    parsed = JSON.parse(valueStr);
                } catch {
                    parsed = null;
                }

                if (parsed && typeof parsed === 'object') {
                    // Firmas gigantes en base64 (> 15KB)
                    if (parsed.firmaEmpresa && typeof parsed.firmaEmpresa === 'string' && parsed.firmaEmpresa.length > 15000) {
                        parsed.firmaEmpresa = '__PDF_LOADED_IN_STATE__';
                    }

                    // Si tiene subReportes masivos acumulados con imágenes base64 duplicadas
                    if (parsed.subReports && typeof parsed.subReports === 'object') {
                        const trimmedSubReports: Record<string, any> = {};
                        Object.entries(parsed.subReports).forEach(([subK, subV]: [string, any]) => {
                            if (subV && typeof subV === 'object') {
                                trimmedSubReports[subK] = {
                                    ...subV,
                                    // Mantener metadatos pero aligerar arrays masivos para la caché local
                                    firmaEmpresa: undefined
                                };
                            } else {
                                trimmedSubReports[subK] = subV;
                            }
                        });
                        parsed.subReports = trimmedSubReports;
                    }

                    localStorage.setItem(key, JSON.stringify(parsed));
                    return true;
                }
            } catch (innerErr) {
                // 4. Tercer rescate: Eliminar todas las demás claves de reportes en localStorage
                try {
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                        const k = localStorage.key(i);
                        if (k && (k.startsWith('report_data_') || k.startsWith('report_data_temporal_')) && k !== key) {
                            localStorage.removeItem(k);
                        }
                    }

                    let parsed: any = null;
                    try {
                        parsed = JSON.parse(valueStr);
                    } catch {
                        parsed = null;
                    }

                    if (parsed && typeof parsed === 'object') {
                        if (parsed.firmaEmpresa) parsed.firmaEmpresa = '__PDF_LOADED_IN_STATE__';
                        localStorage.setItem(key, JSON.stringify(parsed));
                        return true;
                    }
                } catch (finalErr) {
                    console.warn(`[Storage] Cuota de almacenamiento alcanzada. La clave "${key}" se omitió de la caché local; los datos se conservan en la base de datos.`);
                    return false;
                }
            }
        }
    }
    return false;
};
