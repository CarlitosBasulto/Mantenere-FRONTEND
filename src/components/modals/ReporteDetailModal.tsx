import React, { useState } from "react";
import { 
    HiOutlineClipboardDocumentList, 
    HiOutlineXMark, 
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
        id: number;
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
    onEdit 
}) => {
    const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);
    const [showCotizacionDetail, setShowCotizacionDetail] = useState(false);

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
                tecnico: trabajo?.tecnico || 'N/A',
                diagnostico: reporte.reporteTienda || 'N/A',
                descripcion: reporte.descripcion || 'N/A',
                materiales: reporte.materiales || 'N/A',
                observaciones: reporte.observaciones || 'N/A',
                imagenes: {
                    antes: reporte.imagenes?.antes,
                    durante: reporte.imagenes?.durante,
                    despues: reporte.imagenes?.despues,
                    extra: reporte.imagenObservacion
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
                        <HiOutlineClipboardDocumentList size={26} color="#3b82f6" />
                        Detalles del Reporte
                        {isPreReport && <span style={{ color: '#f59e0b', fontSize: '13px', background: '#fffbeb', padding: '4px 10px', borderRadius: '10px', border: '1px solid #fef3c7', marginLeft: '10px' }}>Pre-Reporte</span>}
                    </h2>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {reporte && (
                            <button
                                className={styles.editReportBtn}
                                style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }}
                                onClick={handleDownloadPDF}
                            >
                                <HiOutlineArrowDownTray size={18} />
                                Descargar PDF
                            </button>
                        )}
                        {onEdit && (
                            <button className={styles.editReportBtn} onClick={onEdit}>
                                <HiOutlinePencilSquare size={18} />
                                Editar Reporte
                            </button>
                        )}
                        <button className={styles.closeButtonCircle} onClick={onClose}>
                            <HiOutlineXMark size={22} />
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
                            <div className={styles.dataBox}>{reporte?.reporteTienda || 'Cargando...'}</div>
                        </div>

                        <div className={styles.dataBlock}>
                            <span className={styles.dataLabel}>Descripción del Trabajo Realizado</span>
                            <div className={styles.dataBox}>{reporte?.descripcion || 'Cargando...'}</div>
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

                    {(reporte?.imagenes?.antes || reporte?.imagenes?.durante || reporte?.imagenes?.despues || reporte?.imagenObservacion) && (
                        <div className={styles.reportDetailCard}>
                            <div className={styles.detailSectionTitle}>
                                <HiOutlineWrench size={18} />
                                Evidencia Fotográfica
                            </div>
                            <div className={styles.evidenceGrid}>
                                {reporte.imagenes.antes && (
                                    <div className={styles.evidenceItem}>
                                        <img
                                            src={reporte.imagenes.antes}
                                            alt="Antes"
                                            className={styles.evidenceThumb}
                                            onClick={() => setSelectedZoomImage(reporte.imagenes.antes)}
                                        />
                                        <span className={styles.evidenceLabel}>Antes</span>
                                    </div>
                                )}
                                {reporte.imagenes.durante && (
                                    <div className={styles.evidenceItem}>
                                        <img
                                            src={reporte.imagenes.durante}
                                            alt="Durante"
                                            className={styles.evidenceThumb}
                                            onClick={() => setSelectedZoomImage(reporte.imagenes.durante)}
                                        />
                                        <span className={styles.evidenceLabel}>Durante</span>
                                    </div>
                                )}
                                {reporte.imagenes.despues && (
                                    <div className={styles.evidenceItem}>
                                        <img
                                            src={reporte.imagenes.despues}
                                            alt="Después"
                                            className={styles.evidenceThumb}
                                            onClick={() => setSelectedZoomImage(reporte.imagenes.despues)}
                                        />
                                        <span className={styles.evidenceLabel}>Después</span>
                                    </div>
                                )}
                                {reporte.imagenObservacion && (
                                    <div className={styles.evidenceItem}>
                                        <img
                                            src={reporte.imagenObservacion}
                                            alt="Obs"
                                            className={styles.evidenceThumb}
                                            onClick={() => setSelectedZoomImage(reporte.imagenObservacion)}
                                        />
                                        <span className={styles.evidenceLabel}>Extra</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {trabajo?.cotizacion && (
                        <div className={styles.approvedQuoteBox} style={{ cursor: 'pointer' }} onClick={() => setShowCotizacionDetail(!showCotizacionDetail)}>
                            <div className={styles.quoteHeader}>
                                <div className={styles.quoteTitle}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

                    {reporte?.firmaEmpresa && (
                        <div className={styles.reportDetailCard} style={{ marginTop: '20px', textAlign: 'center' }}>
                            <span className={styles.dataLabel}>Firma de Validación (Cliente)</span>
                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '15px', display: 'inline-block', marginTop: '10px', border: '1px solid #f1f5f9' }}>
                                <img
                                    src={reporte.firmaEmpresa}
                                    alt="Firma"
                                    style={{ height: '70px', objectFit: 'contain', cursor: 'zoom-in' }}
                                    onClick={() => setSelectedZoomImage(reporte.firmaEmpresa)}
                                />
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
                        style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setSelectedZoomImage(null)}
                    >
                        <HiOutlineXMark size={24} />
                    </button>
                </div>
            )}
        </div>,
        document.body
    );
};

export default ReporteDetailModal;
