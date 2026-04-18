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
        doc.rect(0, 0, 210, 35, 'F');
        
        // Logo
        try {
            // Intentamos cargar el logo. 
            // Nota: En un entorno real, si esto falla es mejor tener el logo en base64 hardcodeado.
            doc.addImage(getLogoBase64(), 'PNG', 10, 5, 50, 25); 
        } catch (e) {
            console.error("No se pudo cargar el logo en el PDF", e);
        }

        // Título y Folio
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("REPORTE DE SERVICIO", 70, 18);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`FOLIO: ${dynamicFolio}`, 70, 25);
        doc.text(`FECHA: ${data.fecha}`, 140, 25);

        // Barra dorada de acento
        doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
        doc.rect(0, 35, 210, 2, 'F');

        let nextY = 50;

        // --- 2. SECCIÓN: DATOS GENERALES (Diseño de Rejilla) ---
        const drawSectionTitle = (title: string, y: number) => {
            doc.setFillColor(240, 240, 240);
            doc.rect(15, y, 180, 8, 'F');
            doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(title.toUpperCase(), 20, y + 6);
            return y + 12;
        };

        nextY = drawSectionTitle("Información General", nextY);

        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        
        // Grid vertical para info
        const drawField = (label: string, value: string, x: number, y: number) => {
            doc.setFont("helvetica", "bold");
            doc.text(label, x, y);
            doc.setFont("helvetica", "normal");
            doc.text(value || '---', x + 25, y);
        };

        drawField("Sucursal:", data.sucursal, 20, nextY);
        drawField("Técnico:", data.tecnico, 110, nextY);
        nextY += 7;
        drawField("Encargado:", data.encargado, 20, nextY);
        nextY += 10;

        // --- 3. DETALLES DEL TRABAJO ---
        nextY = drawSectionTitle("Detalles del Servicio", nextY);
        
        const drawTextArea = (label: string, text: string, y: number) => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(label, 20, y);
            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(text || 'Sin información registrada.', 170);
            doc.text(lines, 20, y + 5);
            return y + (lines.length * 5) + 8;
        };

        nextY = drawTextArea("Diagnóstico / Reporte:", data.diagnostico, nextY);
        nextY = drawTextArea("Trabajo Realizado:", data.descripcion, nextY);
        
        // Materiales en formato más limpio
        nextY = drawSectionTitle("Refacciones y Materiales", nextY);
        doc.setFont("helvetica", "normal");
        const matLines = doc.splitTextToSize(data.materiales || 'No se utilizaron refacciones.', 170);
        doc.text(matLines, 20, nextY + 2);
        nextY += (matLines.length * 5) + 10;

        // --- 4. EQUIPO ---
        if (data.equipo) {
            if (nextY > 240) { doc.addPage(); nextY = 20; }
            nextY = drawSectionTitle("Especificaciones del Equipo", nextY);
            
            doc.setDrawColor(navyColor[0], navyColor[1], navyColor[2]);
            doc.rect(15, nextY, 180, 20);
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("TIPO:", 20, nextY + 8);
            doc.text("MARCA:", 70, nextY + 8);
            doc.text("MODELO:", 130, nextY + 8);
            
            doc.setFont("helvetica", "normal");
            doc.text(data.equipo.tipo, 20, nextY + 14);
            doc.text(data.equipo.marca || 'N/A', 70, nextY + 14);
            doc.text(data.equipo.modelo || 'N/A', 130, nextY + 14);
            
            nextY += 30;
        }

        // --- 5. EVIDENCIA ---
        if (nextY > 180) { doc.addPage(); nextY = 20; }
        nextY = drawSectionTitle("Evidencia Fotográfica", nextY);

        const imgSize = 55;
        let currentX = 15;
        const images = [
            { src: data.imagenes.antes, label: 'ANTES' },
            { src: data.imagenes.durante, label: 'DURANTE' },
            { src: data.imagenes.despues, label: 'DESPUÉS' },
            { src: data.imagenes.extra, label: 'ADICIONAL' }
        ].filter(img => !!img.src);

        if (images.length > 0) {
            images.forEach((img) => {
                if (currentX + imgSize > 200) {
                    currentX = 15;
                    nextY += 70;
                    if (nextY > 240) { doc.addPage(); nextY = 20; }
                }
                if (img.src) {
                    const format = img.src.includes('png') ? 'PNG' : 'JPEG';
                    doc.addImage(img.src, format, currentX, nextY, imgSize, imgSize);
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "bold");
                    doc.text(img.label, currentX + (imgSize / 2), nextY + imgSize + 5, { align: 'center' });
                    currentX += 65;
                }
            });
            nextY += 80;
        }

        // --- 6. SECCIÓN DE FIRMAS Y SELLO (Última hoja) ---
        // Aseguramos que haya espacio al final
        if (nextY > 230) { doc.addPage(); nextY = 40; } else { nextY = 240; }

        doc.setDrawColor(200);
        
        // Firma Encargado
        doc.line(20, nextY, 90, nextY);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("NOMBRE Y FIRMA DEL ENCARGADO", 55, nextY + 5, { align: 'center' });
        
        // Sello Sucursal
        doc.rect(120, nextY - 30, 70, 30); // Caja para el sello
        doc.text("SELLO DE LA SUCURSAL", 155, nextY + 5, { align: 'center' });

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

