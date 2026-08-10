// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { HiOutlinePaperAirplane, HiOutlineUserCircle } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { createNotificacionByRole, createNotificacion } from '../services/notificacionesService';

interface ChatMessage {
    id: number;
    trabajo_id: number;
    sender_id: number;
    message: string;
    created_at: string;
    sender: {
        id: number;
        name: string;
        role_id: number;
        role: {
            id: number;
            name: string;
        }
    }
}

interface ChatTrabajoProps {
    trabajoId: number;
    adminAutonomoId?: number;
    onCancelRequest?: () => void;
    onConfirmRequest?: () => void;
    showActions?: boolean; // Solo para Admin AutÃ³nomo
    onNewMessage?: () => void;
}

const ChatTrabajo: React.FC<ChatTrabajoProps> = ({ trabajoId, adminAutonomoId, onCancelRequest, onConfirmRequest, showActions, onNewMessage }) => {
    const { user } = useAuth();
    const token = localStorage.getItem("token");
    const { showAlert, showConfirm } = useModal();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    const isFetchingRef = useRef(false);

    const fetchMessages = async () => {
        if (!trabajoId || isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const res = await fetch(`${API_URL}/trabajos/${trabajoId}/chat`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                
                if (data.length > messages.length && messages.length > 0) {
                    if (onNewMessage) onNewMessage();
                }
                
                setMessages(data);
            }
        } catch (error) {
            console.error("Error fetching chat:", error);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        if (!trabajoId) return;
        fetchMessages();
        const interval = setInterval(() => {
            if (!document.hidden) {
                fetchMessages();
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [trabajoId]);

    useEffect(() => {
        // messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const res = await fetch(`${API_URL}/trabajos/${trabajoId}/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: newMessage })
            });

            if (res.ok) {
                const chat = await res.json();
                setMessages(prev => [...prev, chat]);
                setNewMessage('');
            } else {
                showAlert('Error', 'No se pudo enviar el mensaje', 'error');
            }
        } catch (error) {
            showAlert('Error', 'Problema de conexiÃ³n', 'error');
        }
    };

    const handleSendWithAction = async (e: React.MouseEvent, action: 'aceptar' | 'rechazar') => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const prefix = action === 'aceptar' ? "ACEPTADA: " : "RECHAZADA: ";
            const res = await fetch(`${API_URL}/trabajos/${trabajoId}/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: prefix + newMessage })
            });

            if (res.ok) {
                const chat = await res.json();
                setMessages(prev => [...prev, chat]);
                setNewMessage('');

                const newState = action === 'aceptar' ? "CotizaciÃ³n Aceptada" : "CotizaciÃ³n Rechazada";
                await fetch(`${API_URL}/trabajos/${trabajoId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ estado: newState })
                });

                try {
                    await createNotificacionByRole({
                        role: 'admin',
                        titulo: 'Respuesta del TÃ©cnico',
                        mensaje: `El tÃ©cnico ha ${action === 'aceptar' ? 'ACEPTADO' : 'RECHAZADO'} la propuesta del trabajo #${trabajoId}.`,
                        enlace: `/menu/trabajo-detalle/${trabajoId}`
                    });
                    
                    if (adminAutonomoId) {
                        await createNotificacion({
                            user_id: adminAutonomoId,
                            titulo: 'Respuesta del TÃ©cnico',
                            mensaje: `El tÃ©cnico ha ${action === 'aceptar' ? 'ACEPTADO' : 'RECHAZADO'} la propuesta del trabajo #${trabajoId}.`,
                            enlace: `/autonomo/trabajo-detalle/${trabajoId}`
                        });
                    } else {
                        // Fallback si no hay adminAutonomoId, aunque podrÃ­a fallar en el backend si el rol no existe
                        await createNotificacionByRole({
                            role: 'autonomo',
                            titulo: 'Respuesta del TÃ©cnico',
                            mensaje: `El tÃ©cnico ha ${action === 'aceptar' ? 'ACEPTADO' : 'RECHAZADO'} la propuesta del trabajo #${trabajoId}.`,
                            enlace: `/autonomo/trabajo-detalle/${trabajoId}`
                        });
                    }
                } catch (notiErr) {
                    console.error("Error al enviar notificaciÃ³n", notiErr);
                }

                showAlert('Ã‰xito', action === 'aceptar' ? 'Propuesta aceptada' : 'Propuesta rechazada', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showAlert('Error', 'No se pudo enviar el mensaje', 'error');
            }
        } catch (error) {
            showAlert('Error', 'Problema de conexiÃ³n', 'error');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '300px', background: '#fff', borderRadius: '15px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>ðŸ’¬ Chat de NegociaciÃ³n</h3>
                
                {showActions && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={() => {
                                showConfirm('Cancelar Solicitud', 'Â¿EstÃ¡s seguro de cancelar esta solicitud? Se notificarÃ¡ al encargado.', onCancelRequest!);
                            }}
                            style={{ padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Cancelar Solicitud
                        </button>
                        <button 
                            onClick={() => {
                                showConfirm('Confirmar Solicitud', 'Â¿EstÃ¡s seguro de confirmar y proceder con el trabajo?', onConfirmRequest!);
                            }}
                            style={{ padding: '6px 12px', background: '#ecfccb', color: '#65a30d', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Confirmar Solicitud
                        </button>
                    </div>
                )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: '#fcfcfc' }}>
                {isLoading ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>Cargando mensajes...</p>
                ) : messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>No hay mensajes aÃºn. Â¡Inicia la conversaciÃ³n!</p>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                            <div key={idx} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '10px', alignItems: 'flex-end' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isMe ? '#fed7aa' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <HiOutlineUserCircle size={20} color={isMe ? "#ea580c" : "#64748b"} />
                                </div>
                                <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                                        {msg.sender?.name || 'Usuario'} <span style={{ fontWeight: 'normal', color: '#94a3b8' }}>({msg.sender?.role?.name || 'Rol'})</span>
                                    </span>
                                    <div style={{ 
                                        padding: '10px 14px', 
                                        background: isMe ? '#f26522' : '#ffffff', 
                                        color: isMe ? '#fff' : '#334155', 
                                        borderRadius: '15px', 
                                        borderBottomRightRadius: isMe ? '4px' : '15px',
                                        borderBottomLeftRadius: !isMe ? '4px' : '15px',
                                        border: isMe ? 'none' : '1px solid #e2e8f0',
                                        fontSize: '14px',
                                        lineHeight: '1.4'
                                    }}>
                                        {msg.message}
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '4px' }}>
                                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: '15px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase()) ? "Esperando respuesta de la contraparte..." : "Escribe un mensaje..."}
                    disabled={((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase())}
                    style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', backgroundColor: ((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase()) ? '#f1f5f9' : '#fff' }}
                />
                {user?.role === 'tecnico' ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                            type="button" 
                            onClick={(e) => handleSendWithAction(e, 'aceptar')} 
                            disabled={!newMessage.trim() || ((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase())} 
                            style={{ background: (!newMessage.trim() || ((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase())) ? '#e2e8f0' : '#10b981', color: '#fff', border: 'none', borderRadius: '15px', padding: '0 15px', cursor: (!newMessage.trim() || ((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase())) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                        >
                            Aceptar
                        </button>
                        <button 
                            type="button" 
                            onClick={(e) => handleSendWithAction(e, 'rechazar')} 
                            disabled={!newMessage.trim() || ((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase())} 
                            style={{ background: (!newMessage.trim() || ((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase())) ? '#e2e8f0' : '#ef4444', color: '#fff', border: 'none', borderRadius: '15px', padding: '0 15px', cursor: (!newMessage.trim() || ((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase())) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                        >
                            Rechazar
                        </button>
                    </div>
                ) : (
                    <button type="submit" disabled={((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase()) || !newMessage.trim()} style={{ background: 'transparent', color: (!((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase()) && newMessage.trim()) ? '#f26522' : '#cbd5e1', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!((user?.role === 'autonomo' || user?.role === 'encargado' || user?.role === 'tecnico') && messages.length > 0 && ['autonomo', 'encargado', 'tecnico'].includes(messages[messages.length - 1].sender.role.name.toLowerCase()) && user?.role === messages[messages.length - 1].sender.role.name.toLowerCase()) && newMessage.trim()) ? 'pointer' : 'not-allowed', transition: 'color 0.3s', padding: '0 10px' }}>
                          <HiOutlinePaperAirplane size={26} style={{ transform: 'rotate(0deg)' }} />
                    </button>
                )}
            </form>
        </div>
    );
};

export default ChatTrabajo;
