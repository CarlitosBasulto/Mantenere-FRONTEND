export const saveSafeLocalInfo = (storageKey: string, id: string | number, data: any, showAlert?: any) => {
    try {
        const store = JSON.parse(localStorage.getItem(storageKey) || '{}');
        store[id] = data;
        localStorage.setItem(storageKey, JSON.stringify(store));
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.message.toLowerCase().includes('quota')) {
            console.warn("Storage quota exceeded. Attempting to save without images.");
            const lightData = JSON.parse(JSON.stringify(data)); // Deep copy
            
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
                // Al llegar al límite absoluto, tal vez debamos limpiar datos viejos, pero por ahora...
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
