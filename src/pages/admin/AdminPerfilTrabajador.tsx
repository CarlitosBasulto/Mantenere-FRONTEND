import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import styles from './AdminPerfilTrabajador.module.css';
import { useModal } from '../../context/ModalContext';
import { HiOutlineCamera, HiOutlinePhoto, HiXMark } from 'react-icons/hi2';
import api from '../../services/api';

interface Trabajador {
    id: number;
    nombre: string;
    fecha: string;
    puesto: string;
    estado: "Activo" | "Baja";
    correo: string;
    telefono: string;
    ciudad: string;
    avatar?: string;
    trabajos_count?: number;
}

import { getTrabajador, updateTrabajador } from '../../services/trabajadoresService';

const AdminPerfilTrabajador: React.FC = () => {
    const { id } = useParams();
    const { showAlert } = useModal();
    const [worker, setWorker] = useState<Trabajador | null>(null);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchWorker = async () => {
            try {
                const data = await getTrabajador(Number(id));
                setWorker({
                    id: data.id,
                    nombre: data.nombre,
                    fecha: new Date(data.created_at).toLocaleDateString("es-ES"),
                    puesto: data.puesto || "General",
                    estado: data.estado === "Activo" || data.estado?.toLowerCase() === "activo" ? "Activo" : "Baja",
                    correo: data.correo || "",
                    telefono: data.telefono || "",
                    ciudad: data.estado_prov || "Mérida, Yucatán",
                    avatar: data.avatar || "",
                    trabajos_count: data.trabajos_count || 0
                });
            } catch (error) {
                console.error("Error fetching worker from API:", error);
                // Fallback a localStorage
                const saved = localStorage.getItem('trabajadores_list');
                if (saved) {
                    const list: Trabajador[] = JSON.parse(saved);
                    const found = list.find(t => t.id === Number(id));
                    setWorker(found || null);
                }
            }
        };
        fetchWorker();
    }, [id]);

    const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<string> => {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = Math.min(1, maxWidth / img.width);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = ev.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && worker) {
            setIsUploading(true);
            setShowPhotoModal(false);
            try {
                const compressedBase64 = await compressImage(file, 800, 0.8);
                const res = await fetch(compressedBase64);
                const blob = await res.blob();
                const compressedFile = new File([blob], file.name || 'foto_perfil.jpg', { type: 'image/jpeg' });
                
                const form = new FormData();
                form.append("foto", compressedFile);
                
                const response = await api.post('/upload-imagen', form, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                if (response.data && response.data.url) {
                    const newAvatar = response.data.url;
                    await updateTrabajador(worker.id, { avatar: newAvatar });
                    setWorker(prev => prev ? { ...prev, avatar: newAvatar } : prev);
                    showAlert("Éxito", "Foto actualizada correctamente", "success");
                }
            } catch (error) {
                console.error("Error subiendo imagen:", error);
                showAlert("Error", "No se pudo actualizar la foto de perfil", "error");
            } finally {
                setIsUploading(false);
            }
        }
    };

    if (!worker) {
        return (
            <div className={styles.dashboardLayout}>
                <div className={styles.mainCard}>
                    <p>Trabajador no encontrado.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.dashboardLayout}>
            <div className={styles.mainCard}>
                <div className={styles.bgShape1}></div>
                <div className={styles.bgShape2}></div>
                <div className={styles.sideDecoration}></div>

                <div className={styles.contentWrapper}>

                    <div className={styles.profileHeader}>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoRow}>
                                <span className={styles.label}>Nombre:</span>
                                <span className={styles.value}>{worker.nombre}</span>
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Correo:</span>
                                <span className={styles.value}>{worker.correo}</span>
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Teléfono:</span>
                                <span className={styles.value}>{worker.telefono}</span>
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Estado:</span>
                                <span className={styles.value}>{worker.ciudad}</span>
                            </div>

                            <div className={styles.infoRow}>
                                <span className={styles.label}>Estatus:</span>
                                <span className={styles.value} style={{ color: worker.estado === 'Activo' ? '#4CAF50' : '#F44336' }}>
                                    {worker.estado}
                                </span>
                            </div>
                        </div>

                        <div className={styles.avatarContainer}>
                            <div 
                                className={styles.avatarCircle} 
                                onClick={() => setShowPhotoModal(true)}
                                style={{ 
                                    overflow: 'hidden', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', position: 'relative',
                                    cursor: isUploading ? 'wait' : 'pointer'
                                }}
                            >
                                {worker.avatar ? (
                                    <img 
                                        src={worker.avatar} 
                                        alt={worker.nombre} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isUploading ? 0.5 : 1 }} 
                                    />
                                ) : (
                                    <span style={{ opacity: isUploading ? 0.5 : 1 }}>👤</span>
                                )}
                                
                                {isUploading ? (
                                    <div style={{ position: 'absolute', background: 'rgba(0,0,0,0.5)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>
                                        CARGANDO
                                    </div>
                                ) : (
                                    <span className={styles.editLabel}>EDITAR</span>
                                )}
                            </div>
                            
                            {/* Inputs Ocultos */}
                            <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                ref={cameraInputRef}
                                style={{ display: 'none' }}
                                onChange={handleImageSelection}
                            />
                            <input
                                type="file"
                                accept="image/*"
                                ref={galleryInputRef}
                                style={{ display: 'none' }}
                                onChange={handleImageSelection}
                            />
                        </div>
                    </div>

                    <div className={styles.statsSection}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{worker.trabajos_count || 0}</span>
                            <span className={styles.statLabel}>Trabajos Realizados</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{worker.fecha}</span>
                            <span className={styles.statLabel}>Fecha de Ingreso</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Selección de Foto */}
            {showPhotoModal && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px',
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setShowPhotoModal(false)}>
                    
                    <div style={{
                        background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '24px',
                        padding: '24px', paddingBottom: '32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} onClick={e => e.stopPropagation()}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Actualizar Foto</h3>
                            <button onClick={() => setShowPhotoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <HiXMark size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={() => cameraInputRef.current?.click()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
                                    fontSize: '15px', fontWeight: '700', color: '#1e293b', cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                            >
                                <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                                    <HiOutlineCamera size={22} />
                                </div>
                                Tomar Fotografía
                            </button>

                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
                                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px',
                                    fontSize: '15px', fontWeight: '700', color: '#1e293b', cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                            >
                                <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                                    <HiOutlinePhoto size={22} />
                                </div>
                                Subir de la Galería
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>
                {`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};

export default AdminPerfilTrabajador;
