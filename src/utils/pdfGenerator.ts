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
            doc.rect(15, y, 180, 7, 'F');
            doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(title.toUpperCase(), 20, y + 5);
            return y + 11;
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
            doc.setFontSize(9);
            doc.text(label, 20, y);
            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(text || 'Sin información registrada.', 170);
            doc.text(lines, 20, y + 5);
            return y + (lines.length * 4) + 8;
        };

        nextY = drawTextArea("Diagnóstico / Reporte:", data.diagnostico, nextY);
        nextY = drawTextArea("Trabajo Realizado:", data.descripcion, nextY);
        
        // Materiales
        nextY = drawSectionTitle("Refacciones y Materiales", nextY);
        doc.setFont("helvetica", "normal");
        const matLines = doc.splitTextToSize(data.materiales || 'No se utilizaron refacciones.', 170);
        doc.text(matLines, 20, nextY + 3);
        nextY += (matLines.length * 4) + 8;

        // --- 4. EQUIPO ---
        if (data.equipo) {
            if (nextY > 210) { doc.addPage(); nextY = 20; }
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

        // --- 5. VALIDACIÓN Y CONFORMIDAD (Ahora en la Hoja 1) ---
        const sigY = 230; // Posición fija al fondo de la hoja 1

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
                try { doc.addImage(data.firmaEmpresa, 'PNG', 115, sigY, 75, 30); } catch (e2) {}
            }
        }

        // --- 6. PÁGINA 2: EVIDENCIA Y OBSERVACIONES ---
        doc.addPage();
        nextY = 25;
        
        nextY = drawSectionTitle("Evidencia Fotográfica del Servicio", nextY);

        const imgSize = 52;
        let currentX = 20;
        const mainImages = [
            { src: data.imagenes.antes, label: 'ANTES' },
            { src: data.imagenes.durante, label: 'DURANTE' },
            { src: data.imagenes.despues, label: 'DESPUÉS' }
        ].filter(img => !!img.src);

        if (mainImages.length > 0) {
            mainImages.forEach((img) => {
                if (currentX + imgSize > 200) {
                    currentX = 20;
                    nextY += imgSize + 15;
                    if (nextY > 240) { doc.addPage(); nextY = 25; }
                }
                if (img.src) {
                    const format = img.src.includes('png') ? 'PNG' : 'JPEG';
                    doc.addImage(img.src, format, currentX, nextY, imgSize, imgSize);
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text(img.label, currentX + (imgSize / 2), nextY + imgSize + 5, { align: 'center' });
                    currentX += imgSize + 8;
                }
            });
            nextY += imgSize + 15;
        }

        // Fotografía adicional si existe
        if (data.imagenes.extra) {
            if (nextY > 200) { doc.addPage(); nextY = 25; }
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("FOTOGRAFÍA ADICIONAL / OBSERVACIONES VISUALES:", 20, nextY);
            nextY += 5;
            const extraImgSize = 75;
            try {
                const format = data.imagenes.extra.includes('png') ? 'PNG' : 'JPEG';
                doc.addImage(data.imagenes.extra, format, 20, nextY, extraImgSize, extraImgSize);
                nextY += extraImgSize + 10;
            } catch (e) {}
        }

        // Observaciones finales
        if (nextY > 240) { doc.addPage(); nextY = 25; }
        nextY = drawSectionTitle("Observaciones Finales", nextY);
        
        const obsLines = doc.splitTextToSize(data.observaciones || 'Sin observaciones adicionales.', 170);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(obsLines, 20, nextY + 3);
        nextY += (obsLines.length * 4) + 10;



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

