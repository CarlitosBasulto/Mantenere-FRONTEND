import jsPDF from 'jspdf';

interface PDFReportData {
    id: number | string;
    folio?: string;
    fecha: string;
    sucursal: string;
    encargado: string;
    tecnico: string;
    diagnostico: string;
    descripcion: string;
    materiales: string;
    observaciones: string;
    imagenes: {
        antes?: string | null;
        durante?: string | null;
        despues?: string | null;
        extra?: string | null;
    };
    firmaEmpresa?: string | null;
    equipo?: {
        tipo: string;
        marca: string;
        modelo: string;
        piezas?: string;
        garantia?: string;
    } | null;
}

// Función auxiliar para cargar imagen y retornar base64 (opcional, jsPDF puede manejar URLs si el server lo permite)
const getLogoBase64 = (): string => {
    // Por ahora usamos una ruta relativa o podemos inyectar un base64 si es necesario.
    // Usaremos la ruta que encontramos en el proyecto.
    return "/src/assets/imagenes/logo-agente-business.png";
};

export const generateMaintenanceReportPDF = async (data: PDFReportData) => {
    try {
        const doc = new jsPDF();
        const dynamicFolio = data.folio || `REP-${data.id.toString().padStart(5, '0')}`;
        const goldColor = [201, 155, 33]; // Dorado aproximado del logo
        const navyColor = [30, 41, 59]; // Navy slate

        // --- 1. CABECERA ---
        // Barra superior decorativa
        doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
        doc.rect(0, 0, 210, 26, 'F');

        // Logo
        try {
            doc.addImage(getLogoBase64(), 'PNG', 10, 3, 42, 20);
        } catch (e) {
            console.error("No se pudo cargar el logo en el PDF", e);
        }

        // Título y Folio
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("REPORTE DE SERVICIO", 65, 12);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`FOLIO: ${dynamicFolio}`, 65, 19);
        doc.text(`FECHA: ${data.fecha}`, 130, 19);

        // Barra dorada de acento
        doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
        doc.rect(0, 26, 210, 2, 'F');

        let nextY = 35;

        // --- 2. SECCIÓN: DATOS GENERALES (Diseño de Rejilla) ---
        const drawSectionTitle = (title: string, y: number) => {
            doc.setFillColor(240, 240, 240);
            doc.rect(15, y, 180, 5, 'F');
            doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text(title.toUpperCase(), 20, y + 4);
            return y + 7;
        };

        nextY = drawSectionTitle("Información General", nextY);

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);

        const drawField = (label: string, value: string, x: number, y: number) => {
            doc.setFont("helvetica", "bold");
            doc.text(label, x, y);
            doc.setFont("helvetica", "normal");
            doc.text(value || '---', x + 20, y);
        };

        drawField("Sucursal:", data.sucursal, 20, nextY);
        drawField("Técnico:", data.tecnico, 110, nextY);
        nextY += 6;
        drawField("Encargado:", data.encargado, 20, nextY);
        nextY += 8;

        // --- 3. DETALLES DEL TRABAJO ---
        nextY = drawSectionTitle("Detalles del Servicio", nextY);

        const drawTextArea = (label: string, text: string, y: number) => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text(label, 20, y);
            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(text || 'Sin información registrada.', 170);
            doc.text(lines, 20, y + 4);
            return y + (lines.length * 3.5) + 5;
        };

        nextY = drawTextArea("Diagnóstico / Reporte:", data.diagnostico, nextY);
        nextY = drawTextArea("Trabajo Realizado:", data.descripcion, nextY);

        // Materiales
        nextY = drawSectionTitle("Refacciones y Materiales", nextY);
        doc.setFont("helvetica", "normal");
        if (!data.materiales) {
            doc.text("No se utilizaron refacciones.", 20, nextY + 3);
            nextY += 12;
        } else {
            const matItems = data.materiales.split('\n').map(item => item.trim()).filter(item => item !== '');
            if (matItems.length === 1 && matItems[0].length > 50) {
                // Not a list but a paragraph
                const matLines = doc.splitTextToSize(matItems[0], 170);
                doc.text(matLines, 20, nextY + 3);
                nextY += (matLines.length * 3.5) + 5;
            } else {
                // List of items in columns
                const maxPerCol = 4;
                const colWidth = 60;
                let currentX = 20;
                let currentY = nextY + 3;
                let itemsInCol = 0;

                matItems.forEach(item => {
                    const shortItem = item.length > 35 ? item.substring(0, 32) + '...' : item;
                    doc.text(shortItem, currentX, currentY);
                    currentY += 4;
                    itemsInCol++;

                    if (itemsInCol >= maxPerCol) {
                        currentX += colWidth;
                        currentY = nextY + 3;
                        itemsInCol = 0;
                    }
                });

                const rows = Math.min(matItems.length, maxPerCol);
                nextY += (rows * 3.5) + 4;
            }
        }

        // --- 4. EQUIPO ---
        if (data.equipo) {
            if (nextY > 190) { doc.addPage(); nextY = 20; }
            nextY = drawSectionTitle("Especificaciones del Equipo", nextY);

            doc.setDrawColor(navyColor[0], navyColor[1], navyColor[2]);
            doc.rect(15, nextY, 180, 16);

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("TIPO:", 20, nextY + 6);
            doc.text("MARCA:", 70, nextY + 6);
            doc.text("MODELO:", 130, nextY + 6);

            doc.setFont("helvetica", "normal");
            doc.text(data.equipo.tipo, 20, nextY + 11);
            doc.text(data.equipo.marca || 'N/A', 70, nextY + 11);
            doc.text(data.equipo.modelo || 'N/A', 130, nextY + 11);

            nextY += 24;
        }

        // --- 5. OBSERVACIONES FINALES (Ahora en la Hoja 1) ---
        if (nextY > 200) { doc.addPage(); nextY = 20; }
        nextY = drawSectionTitle("Observaciones Finales", nextY);
        const obsLines = doc.splitTextToSize(data.observaciones || 'Sin observaciones adicionales.', 170);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(obsLines, 20, nextY + 3);
        nextY += (obsLines.length * 4) + 10;

        // --- SECCIÓN EVALUACIÓN (EXCLUSIVO TIENDA) ---
        // Asegurarnos de que cabe en la primera hoja antes de la firma (si supera 165 se pasa a hoja 2)
        if (nextY > 165) { doc.addPage(); nextY = 20; }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
        doc.text("Nota: Para el caso de cambio de refacciones, es necesario agregar una memoria fotográfica donde se logre percibir el cambio.", 15, nextY);
        nextY += 6;

        nextY = drawSectionTitle("Exclusivo Tienda", nextY);

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("CALIFICACIÓN AL TÉCNICO Y A SU TRABAJO EN ESCALA DEL 1 AL 10", 15, nextY + 2);

        doc.text("CALIFICACIÓN A LA EMPRESA", 115, nextY + 2);
        nextY += 6;

        doc.setFont("helvetica", "normal");

        // Left Column (Tecnico)
        const leftColX = 15;
        const lineStartX = 55;
        const lineEndX = 95;

        let leftY = nextY;
        const drawRatingField = (label: string, y: number) => {
            doc.text(label, leftColX, y);
            doc.line(lineStartX, y, lineEndX, y);
            return y + 5;
        };

        leftY = drawRatingField("Presentacion", leftY);
        leftY = drawRatingField("Trato del tecnico", leftY);
        leftY = drawRatingField("Disponibilidad", leftY);
        leftY = drawRatingField("Trabajo Realizado", leftY);
        leftY = drawRatingField("Limpieza del trabajo", leftY);

        // Right Column (Empresa)
        const rightColX = 115;
        let rightY = nextY;

        doc.text("Tiempo de respuesta", rightColX, rightY);
        doc.text("CALIFICACION", rightColX + 45, rightY);
        doc.line(rightColX + 68, rightY, rightColX + 75, rightY);
        rightY += 6;

        doc.text("Has visto mejoras con respecto al mantenimiento", rightColX, rightY);
        rightY += 5;
        doc.rect(rightColX + 5, rightY - 4, 8, 4);
        doc.text("SI", rightColX + 7, rightY - 0.5);
        doc.rect(rightColX + 25, rightY - 4, 8, 4);
        doc.text("NO", rightColX + 26, rightY - 0.5);
        doc.text("CALIFICACION", rightColX + 45, rightY);
        doc.line(rightColX + 68, rightY, rightColX + 75, rightY);
        rightY += 6;

        doc.text("Estas satisfecho con tu proveedor", rightColX, rightY);
        rightY += 5;
        doc.rect(rightColX + 5, rightY - 4, 8, 4);
        doc.text("SI", rightColX + 7, rightY - 0.5);
        doc.rect(rightColX + 25, rightY - 4, 8, 4);
        doc.text("NO", rightColX + 26, rightY - 0.5);
        doc.text("CALIFICACION", rightColX + 45, rightY);
        doc.line(rightColX + 68, rightY, rightColX + 75, rightY);

        nextY = Math.max(leftY, rightY) + 3;

        // Consejo
        doc.setFont("helvetica", "bold");
        doc.text("CONSEJO HACIA EL PROVEEDOR PARA SER MAS EFICIENTE:", 15, nextY);
        nextY += 5;
        doc.setDrawColor(0);

        // Dibujar exactamente 4 líneas para el consejo
        for (let i = 0; i < 4; i++) {
            doc.line(15, nextY, 195, nextY);
            nextY += 6;
        }


        // --- 6. VALIDACIÓN Y CONFORMIDAD (Fija al fondo de la hoja) ---
        let sigY = 240;
        if (nextY > 232) {
            doc.addPage();
            sigY = 240; // Asegurar que siempre esté en la misma posición en la nueva hoja
        }

        doc.setFillColor(240, 240, 240);
        doc.rect(15, sigY - 8, 180, 7, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
        doc.text("VALIDACIÓN Y CONFORMIDAD", 20, sigY - 3);

        doc.setDrawColor(180);
        doc.setTextColor(80, 80, 80);

        // Firma encargado
        doc.line(20, sigY + 22, 90, sigY + 22);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("NOMBRE Y FIRMA DEL ENCARGADO", 55, sigY + 28, { align: 'center' });

        // Sello sucursal
        doc.rect(115, sigY, 75, 30);
        doc.text("SELLO DE LA SUCURSAL", 152, sigY + 37, { align: 'center' });

        // Imagen de firma si existe
        if (data.firmaEmpresa && !data.firmaEmpresa.startsWith('data:application/pdf')) {
            try {
                doc.addImage(data.firmaEmpresa, 'JPEG', 115, sigY, 75, 30);
            } catch (e) {
                try { doc.addImage(data.firmaEmpresa, 'PNG', 115, sigY, 75, 30); } catch (e2) { }
            }
        }

        // --- 7. PÁGINA 2: EVIDENCIA Y OBSERVACIONES ---
        doc.addPage();
        nextY = 25;

        nextY = drawSectionTitle("Evidencia Fotográfica del Servicio", nextY);

        const imgSize = 42; // Tamaño más parejo y de menor altura
        let currentX = 18;
        const mainImages = [
            { src: data.imagenes.antes, label: 'ANTES' },
            { src: data.imagenes.durante, label: 'DURANTE' },
            { src: data.imagenes.despues, label: 'DESPUÉS' },
            { src: data.imagenes.extra, label: 'EXTRA / OTRAS' }
        ].filter(img => !!img.src);

        // Centrado dinámico si hay menos de 4 fotos (4 * 42 = 168 px, nos sobran ~42 de margen usable. 210 total)
        // Para calcular centro exacto de la tira
        const totalRowWidth = (mainImages.length * imgSize) + ((mainImages.length - 1) * 6);
        currentX = (210 - totalRowWidth) / 2;

        if (mainImages.length > 0) {
            mainImages.forEach((img) => {
                if (img.src) {
                    const format = img.src.includes('png') ? 'PNG' : 'JPEG';
                    try {
                        doc.addImage(img.src, format, currentX, nextY, imgSize, imgSize);
                    } catch (e) { }
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text(img.label, currentX + (imgSize / 2), nextY + imgSize + 5, { align: 'center' });
                    currentX += imgSize + 6;
                }
            });
            nextY += imgSize + 15;
        }



        // Pie de página
        const pages = doc.internal.pages.length;
        for (let j = 1; j < pages; j++) {
            doc.setPage(j);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Mantenere - Reporte de Servicio Digital | Página ${j} de ${pages - 1}`, 105, 290, { align: 'center' });
        }

        doc.save(`${dynamicFolio}_Reporte.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    }
};

