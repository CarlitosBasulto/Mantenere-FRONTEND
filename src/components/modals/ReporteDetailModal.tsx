import React, { useState } from "react";
import { 
    HiOutlineClipboardDocumentList, 
    HiOutlinePencilSquare, 
    HiOutlineIdentification, 
    HiOutlineClock, 
    HiOutlineBuildingOffice2, 
    HiOutlineWrench, 
    HiOutlineCurrencyDollar,
    HiOutlineArrowDownTray
} from "react-icons/hi2";
import { createPortal } from "react-dom";
import styles from "./ReporteDetailModal.module.css";
import { generateMaintenanceReportPDF } from "../../utils/pdfGenerator";

const getAvatarForTech = (nombre: string) => {
    if (!nombre || nombre.toLowerCase() === "sin asignar") return null;
    const profileKey = `profile_${nombre.replace(/\s+/g, '')}`;
    const profileData = localStorage.getItem(profileKey);
    if (profileData) {
        try {
            const data = JSON.parse(profileData);
            if (data.imagenPerfil) return data.imagenPerfil;
        } catch(e) {}
    }
    const stored = localStorage.getItem('trabajadores_list');
    if (stored) {
        try {
            const list = JSON.parse(stored);
            const worker = list.find((w: any) => w.nombre === nombre);
            if (worker && worker.avatar) return worker.avatar;
        } catch(e) {}
    }
    const initials = (nombre || 'T').trim().split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'T';
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%230e7490"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="28" font-weight="bold" fill="%23ffffff">${initials}</text></svg>`;
};

interface ReporteDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    trabajo: {
        id: number;
        sucursal?: string;
        tecnico?: string;
        encargado?: string;
        cotizacion?: {
            costo: string;
            notas: string;
            archivo: string;
        };
    };
    task: {
        id: number | string;
        titulo: string;
        fecha?: string;
    };
    reporte: any; // El objeto de reporte final o temporal
    userRole?: string;
    onEdit?: () => void;
}

const ReporteDetailModal: React.FC<ReporteDetailModalProps> = ({ 
    isOpen, 
    onClose, 
    trabajo, 
    task, 
    reporte, 
    userRole,
    onEdit 
}) => {
    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
    const [showCotizacionDetail, setShowCotizacionDetail] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Determinar si es un pre-reporte (falta firma o es local)
    const isPreReport = !reporte?.id && !!reporte; 

    const handleDownloadPDF = async () => {
        if (!reporte) return;
        try {
            await generateMaintenanceReportPDF({
                id: reporte.dbId || reporte.id || task?.id || 'SD',
                fecha: reporte.fecha || new Date().toLocaleDateString(),
                sucursal: trabajo?.sucursal || 'N/A',
                encargado: trabajo?.encargado || 'N/A',
                tecnico: reporte.tecnicoNombre || trabajo?.tecnico || 'N/A',
                tecnicoAvatar: reporte.tecnicoAvatar || getAvatarForTech(reporte.tecnicoNombre || trabajo?.tecnico || ''),
                fechaInicio: reporte.fechaInicio || null,
                diagnostico: reporte.reporteTienda || 'N/A',
                descripcion: reporte.descripcion || 'N/A',
                materiales: reporte.materiales || 'N/A',
                observaciones: reporte.observaciones || 'N/A',
                observacionesList: reporte.observacionesList,
                imagenes: {
                    antes: reporte.imagenes?.antes,
                    durante: reporte.imagenes?.durante,
                    despues: reporte.imagenes?.despues,
                    extra: (reporte.imagenesObservacion && reporte.imagenesObservacion.length > 0)
                        ? reporte.imagenesObservacion
                        : reporte.imagenObservacion
                },
                firmaEmpresa: reporte.firmaEmpresa,
                equipo: reporte.involucraEquipo ? reporte.equipoInfo : (trabajo.cotizacion ? {
                    tipo: 'Servicio',
                    marca: 'N/A',
                    modelo: 'N/A'
                } : null)
            });
        } catch (error) {
            console.error("Error al generar PDF:", error);
        }
    };

    return createPortal(
        <div className={styles.premiumModalOverlay} onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className={styles.premiumModalContent}>
                <div className={styles.premiumModalHeader}>
                    <h2>
                        <HiOutlineClipboardDocumentList size={26} />
                        Detalles del Reporte
                        {isPreReport && <span style={{ color: '#f26522', fontSize: '13px', background: '#fffbeb', padding: '4px 10px', borderRadius: '10px', border: '1px solid #fef3c7', marginLeft: '10px' }}>Pre-Reporte</span>}
                    </h2>
                    <div className={styles.headerActions}>
                        {reporte && (
                            <button
                                className={styles.downloadPdfBtn}
                                onClick={handleDownloadPDF}
                            >
                                <HiOutlineArrowDownTray size={18} />
                                <span>Descargar PDF</span>
                            </button>
                        )}
                        {onEdit && (userRole === 'admin' || userRole === 'tecnico') && (
                            <button className={styles.editReportBtn} onClick={onEdit}>
                                <HiOutlinePencilSquare size={18} />
                                <span>Editar Reporte</span>
                            </button>
                        )}
                        <button onClick={onClose} className={styles.closeHeaderBtn} title="Cerrar">
                            <span style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: 1 }}>✕</span>
                        </button>
                    </div>
                </div>

                <div className={styles.premiumModalBody}>
                    <div className={styles.infoGrid}>
                        <div className={styles.reportDetailCard} style={{ margin: 0 }}>
                            <div className={styles.detailSectionTitle}>
                                <HiOutlineIdentification size={18} />
                                Identificación
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span className={styles.dataLabel}>Folio de Reporte</span>
                                    <span className={styles.folioBadge}>#{reporte?.id || task?.id || 'Cargando...'}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span className={styles.dataLabel}>Estatus</span>
                                    <span style={{ 
                                        fontSize: '11px', 
                                        fontWeight: '800', 
                                        color: isPreReport ? '#b45309' : '#059669',
                                        background: isPreReport ? '#fffbeb' : '#ecfdf5',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        border: `1px solid ${isPreReport ? '#fef3c7' : '#d1fae5'}`
                                    }}>
                                        {isPreReport ? 'PENDIENTE DE FIRMA' : 'FINALIZADO'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.reportDetailCard} style={{ margin: 0 }}>
                            <div className={styles.detailSectionTitle}>
                                <HiOutlineClock size={18} />
                                Cronología
                            </div>
                            <span className={styles.dataLabel}>Fecha de Registro</span>
                            <span className={styles.dataText}>{reporte?.fecha || task?.fecha || 'Cargando...'}</span>
                        </div>
                    </div>

                    <div className={styles.reportDetailCard}>
                        <div className={styles.detailSectionTitle}>
                            <HiOutlineBuildingOffice2 size={18} />
                            Información de Servicio
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className={styles.dataBlock}>
                                <span className={styles.dataLabel}>Sucursal</span>
                                <span className={styles.dataText}>{trabajo?.sucursal || 'N/A'}</span>
                            </div>
                            <div className={styles.dataBlock}>
                                <span className={styles.dataLabel}>Tipo de Trabajo</span>
                                <span className={styles.dataText}>{task?.titulo || 'Cargando...'}</span>
                            </div>
                            <div className={styles.dataBlock}>
                                <span className={styles.dataLabel}>Técnico</span>
                                <span className={styles.dataText}>{trabajo?.tecnico || 'N/A'}</span>
                            </div>
                            <div className={styles.dataBlock}>
                                <span className={styles.dataLabel}>Gerente / Encargado</span>
                                <span className={styles.dataText}>{trabajo?.encargado || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.reportDetailCard}>
                        <div className={styles.detailSectionTitle}>
                            <HiOutlineClipboardDocumentList size={18} />
                            Datos del Reporte
                        </div>
                        
                        <div className={styles.dataBlock}>
                            <span className={styles.dataLabel}>Reporte de Tienda / Hallazgo</span>
                            <div className={styles.dataBox}>{reporte?.reporteTienda || reporte?.descripcion || task?.titulo || 'Diagnóstico de visita completado.'}</div>
                        </div>

                        <div className={styles.dataBlock}>
                            <span className={styles.dataLabel}>Descripción del Trabajo Realizado</span>
                            <div className={styles.dataBox}>{reporte?.descripcion || reporte?.reporteTienda || 'Servicio ejecutado según lo acordado en la cotización.'}</div>
                        </div>

                        <div className={styles.dataBlock}>
                            <span className={styles.dataLabel}>Piezas y Refacciones</span>
                            <div className={styles.dataBox}>
                                {Array.isArray(reporte?.refaccionesList) && reporte.refaccionesList.length > 0 ? (
                                    <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: '1.8' }}>
                                        {reporte.refaccionesList.map((r: any, i: number) => (
                                            <li key={i} style={{ fontSize: '14px' }}>
                                                {r.cantidad}x {r.pieza} {r.costo_estimado ? `($${r.costo_estimado})` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin refacciones registradas.</span>
                                )}
                            </div>
                        </div>

                        <div className={styles.dataBlock}>
                            <span className={styles.dataLabel}>Otros Materiales</span>
                            <div className={styles.dataBox}>{reporte?.materiales || 'No se utilizaron otros materiales.'}</div>
                        </div>

                        <div className={styles.dataBlock}>
                            <span className={styles.dataLabel}>Observaciones Adicionales</span>
                            <div className={styles.dataBox}>{reporte?.observaciones || 'Sin observaciones adicionales.'}</div>
                        </div>
                    </div>

                    {(() => {
                        const allPhotos: { label: string; url: string }[] = [];
                        if (reporte?.imagenes?.antes) allPhotos.push({ label: 'Antes', url: reporte.imagenes.antes });
                        if (reporte?.imagenes?.durante) allPhotos.push({ label: 'Durante', url: reporte.imagenes.durante });
                        if (reporte?.imagenes?.despues) allPhotos.push({ label: 'Después', url: reporte.imagenes.despues });

                        if (Array.isArray(reporte?.imagenes)) {
                            reporte.imagenes.forEach((img: any, i: number) => {
                                const url = typeof img === 'string' ? img : (img?.ruta || img?.url);
                                if (url && !allPhotos.some(p => p.url === url)) allPhotos.push({ label: `Evidencia ${i + 1}`, url });
                            });
                        }
                        if (Array.isArray(reporte?.photos)) {
                            reporte.photos.forEach((img: any, i: number) => {
                                const url = typeof img === 'string' ? img : (img?.ruta || img?.url);
                                if (url && !allPhotos.some(p => p.url === url)) allPhotos.push({ label: `Evidencia ${i + 1}`, url });
                            });
                        }
                        if (reporte?.imagenesObservacion && Array.isArray(reporte.imagenesObservacion)) {
                            reporte.imagenesObservacion.forEach((img: string, idx: number) => {
                                if (img && !allPhotos.some(p => p.url === img)) allPhotos.push({ label: `Extra ${idx + 1}`, url: img });
                            });
                        } else if (reporte?.imagenObservacion) {
                            if (!allPhotos.some(p => p.url === reporte.imagenObservacion)) {
                                allPhotos.push({ label: 'Extra', url: reporte.imagenObservacion });
                            }
                        }

                        if (allPhotos.length === 0) return null;

                        return (
                            <div className={styles.reportDetailCard}>
                                <div className={styles.detailSectionTitle}>
                                    <HiOutlineWrench size={18} />
                                    Evidencia Fotográfica ({allPhotos.length})
                                </div>
                                <div className={styles.evidenceGrid}>
                                    {allPhotos.map((photo, idx) => (
                                        <div key={idx} className={styles.evidenceItem}>
                                            <img
                                                src={photo.url}
                                                alt={photo.label}
                                                className={styles.evidenceThumb}
                                                onClick={() => setSelectedZoomImage(photo.url)}
                                            />
                                            <span className={styles.evidenceLabel}>{photo.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {trabajo?.cotizacion && (
                        <div className={styles.approvedQuoteBox} style={{ cursor: 'pointer' }} onClick={() => setShowCotizacionDetail(!showCotizacionDetail)}>
                            <div className={styles.quoteHeader}>
                                <div className={styles.quoteTitle}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f26522', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <HiOutlineCurrencyDollar size={20} color="white" />
                                    </div>
                                    Cotización Aprobada
                                </div>
                                <div className={styles.quoteAmount} style={{ letterSpacing: 'normal' }}>
                                    {showCotizacionDetail ? `$${trabajo.cotizacion.costo}` : '$$$'}
                                </div>
                            </div>

                            {!showCotizacionDetail && (
                                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '13px', color: '#b45309', fontWeight: 'bold', textDecoration: 'underline' }}>Ver más detalles</span>
                                </div>
                            )}

                            {showCotizacionDetail && (
                                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #fef3c7', paddingTop: '14px' }}>
                                    <div className={styles.dataBlock}>
                                        <span className={styles.dataLabel} style={{ color: '#b45309' }}>Notas Administrativas</span>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#92400e', fontStyle: 'italic', lineHeight: '1.6' }}>
                                            "{trabajo.cotizacion.notas || "Sin notas adicionales."}"
                                        </p>
                                    </div>

                                    {trabajo.cotizacion.archivo &&
                                        typeof trabajo.cotizacion.archivo === 'string' &&
                                        (trabajo.cotizacion.archivo.startsWith('http://') || trabajo.cotizacion.archivo.startsWith('https://')) && (
                                        <a
                                            href={trabajo.cotizacion.archivo}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={styles.quoteDocBtn}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <HiOutlineClipboardDocumentList size={18} />
                                            Ver Documento de Cotización Original
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {reporte?.firmaEmpresa && reporte.firmaEmpresa !== '__PDF_LOADED_IN_STATE__' && (
                        <div className={styles.reportDetailCard} style={{ marginTop: '20px', textAlign: 'center' }}>
                            <span className={styles.dataLabel}>📄 Reporte Firmado y Sellado (Empresa)</span>
                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', marginTop: '10px', border: '1px solid #f1f5f9' }}>
                                {(reporte.firmaEmpresa.startsWith('data:application/pdf') || (reporte.firmaEmpresa.startsWith('http') && reporte.firmaEmpresa.toLowerCase().includes('.pdf'))) ? (
                                    /* PDF: mostrar ícono + botón de descarga/visualización */
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '64px', height: '64px', background: '#fee2e2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                                            📋
                                        </div>
                                        <span style={{ fontSize: '13px', color: '#374151', fontWeight: '600' }}>Reporte PDF con firma y sello</span>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <a
                                                href={reporte.firmaEmpresa}
                                                download={`Reporte_Firmado_${reporte?.id || ''}.pdf`}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f26522', color: '#fff', padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', cursor: 'pointer' }}
                                            >
                                                ⬇️ Descargar PDF
                                            </a>
                                            <button
                                                onClick={() => {
                                                    const win = window.open('', '_blank');
                                                    if (win) {
                                                        win.document.write(`<iframe src="${reporte.firmaEmpresa}" style="width:100%;height:100vh;border:none;"></iframe>`);
                                                        win.document.close();
                                                    }
                                                }}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#3b82f6', color: '#fff', padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                                            >
                                                👁️ Ver PDF
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Imagen: mantener el visor con zoom */
                                    <img
                                        src={reporte.firmaEmpresa}
                                        alt="Reporte Firmado"
                                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', cursor: 'zoom-in', borderRadius: '8px' }}
                                        onClick={() => setSelectedZoomImage(reporte.firmaEmpresa)}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Zoom Interno */}
            {selectedZoomImage && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', cursor: 'zoom-out' }} 
                    onClick={() => setSelectedZoomImage(null)}
                >
                    <img src={selectedZoomImage} alt="Zoom" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }} />
                    <button 
                        style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', lineHeight: '1', paddingBottom: '3px', color: '#64748b' }}
                        onClick={() => setSelectedZoomImage(null)}
                    >
                        &times;
                    </button>
                </div>
            )}
        </div>,
        document.body
    );
};

export default ReporteDetailModal;
