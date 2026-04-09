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
