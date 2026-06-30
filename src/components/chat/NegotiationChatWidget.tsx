import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { HiOutlineChatAlt2, HiOutlineX, HiOutlinePaperAirplane, HiOutlineCurrencyDollar, HiOutlineDocumentText } from 'react-icons/hi';
import styles from './NegotiationChatWidget.module.css';

interface Message {
    id: number;
    trabajo_id: number;
    sender_id: number;
    message: string;
    is_quote: boolean;
    quote_amount: string | null;
    created_at: string;
    sender: {
        id: number;
        name: string;
        role_id: number;
        role?: {
            id: number;
            name: string;
        };
    };
}

interface ChatProps {
    trabajoId: number;
    currentUser: any; // User object from AuthContext
    onViewVisitInfo?: () => void;
}

const NegotiationChatWidget: React.FC<ChatProps> = ({ trabajoId, currentUser, onViewVisitInfo }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [quoteMode, setQuoteMode] = useState(false);
    const [quoteAmount, setQuoteAmount] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({ show: false, message: '', type: 'success' });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef(0);

    const canProposeQuote = currentUser?.role === 'admin' || currentUser?.role === 'admin-autonomo' || currentUser?.role === 'gerente-general' || currentUser?.role === 'encargado';

    const fetchMessages = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://127.0.0.1:8085/api/trabajos/${trabajoId}/chat`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;
            setMessages(data);
            
            if (data.length > prevMessagesLength.current) {
                if (!isOpen) {
                    setUnreadCount(prev => prev + (data.length - prevMessagesLength.current));
                }
                prevMessagesLength.current = data.length;
            }
        } catch (error) {
            console.error("Error fetching chats:", error);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Polling every 3 seconds
        return () => clearInterval(interval);
    }, [trabajoId, isOpen]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setUnreadCount(0);
        }
    }, [messages, isOpen]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() && !quoteMode) return;
        if (quoteMode && !quoteAmount) return;

        try {
            const token = localStorage.getItem('token');
            const payload = {
                message: inputText.trim() || 'Propuesta enviada',
                is_quote: quoteMode,
                quote_amount: quoteMode ? parseFloat(quoteAmount) : null
            };
            await axios.post(`http://127.0.0.1:8085/api/trabajos/${trabajoId}/chat`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setInputText('');
            setQuoteAmount('');
            setQuoteMode(false);
            fetchMessages();
        } catch (error) {
            console.error("Error sending message:", error);
            setToast({ show: true, message: 'Error al enviar el mensaje.', type: 'error' });
            setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
        }
    };
    const handleSendWithAction = async (action: 'aceptar' | 'rechazar') => {
        try {
            const token = localStorage.getItem('token');
            const prefix = action === 'aceptar' ? "ACEPTADA: " : "RECHAZADA: ";
            const textContent = inputText.trim() ? inputText.trim() : (action === 'aceptar' ? 'Propuesta aceptada' : 'Propuesta rechazada');
            
            await axios.post(`http://127.0.0.1:8085/api/trabajos/${trabajoId}/chat`, {
                message: prefix + textContent,
                is_quote: false,
                quote_amount: null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newState = action === 'aceptar' ? "Cotización Aceptada" : "Cotización Rechazada";
            await axios.put(`http://127.0.0.1:8085/api/trabajos/${trabajoId}`, {
                estado: newState
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Notifications
            try {
                await axios.post(`http://127.0.0.1:8085/api/notificaciones/role`, {
                    role: 'admin',
                    titulo: 'Respuesta del Técnico',
                    mensaje: `El técnico ha ${action === 'aceptar' ? 'ACEPTADO' : 'RECHAZADO'} la propuesta del trabajo #${trabajoId}.`,
                    enlace: `/menu/trabajo-detalle/${trabajoId}`
                }, { headers: { Authorization: `Bearer ${token}` } });
                
                await axios.post(`http://127.0.0.1:8085/api/notificaciones/role`, {
                    role: 'autonomo',
                    titulo: 'Respuesta del Técnico',
                    mensaje: `El técnico ha ${action === 'aceptar' ? 'ACEPTADO' : 'RECHAZADO'} la propuesta del trabajo #${trabajoId}.`,
                    enlace: `/autonomo/trabajo-detalle/${trabajoId}`
                }, { headers: { Authorization: `Bearer ${token}` } });
            } catch (notiErr) {
                console.error("Error al enviar notificación", notiErr);
            }

            setInputText('');
            setToast({ show: true, message: action === 'aceptar' ? 'Propuesta aceptada' : 'Propuesta rechazada', type: 'success' });
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error("Error sending action message:", error);
            setToast({ show: true, message: 'Error al enviar la respuesta.', type: 'error' });
            setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
        }
    };

    return (
        <div className={styles.chatWidgetContainer} style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* FAB Button */}
            {!isOpen && (
                <button 
                    className={styles.fabButton}
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #f26522, #d14d13)',
                        color: 'white', border: 'none', boxShadow: '0 8px 24px rgba(242, 101, 34, 0.4)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                    }}
                >
                    <HiOutlineChatAlt2 size={32} />
                    {unreadCount > 0 && (
                        <span className={styles.badge} style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 800, width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Modal */}
            {isOpen && (
                <div className={styles.chatModal} style={{ width: '400px' }}>
                    <div className={styles.chatHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className={styles.headerIcon}>
                                <HiOutlineChatAlt2 size={20} color="#f26522" />
                            </div>
                            <div>
                                <h3 className={styles.headerTitle}>Negociación de Cotización</h3>
                                <p className={styles.headerSubtitle}>Técnico, Subgerente y Administrador</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {onViewVisitInfo && (
                                <button className={styles.closeBtn} onClick={onViewVisitInfo} title="Ver Información de la Visita">
                                    <HiOutlineDocumentText size={20} />
                                </button>
                            )}
                            <button className={styles.closeBtn} onClick={() => setIsOpen(false)} title="Cerrar Chat">
                                <HiOutlineX size={20} />
                            </button>
                        </div>
                    </div>

                    {toast.show && (
                        <div style={{ padding: '10px', background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', fontSize: '14px', fontWeight: 'bold', textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                            {toast.message}
                        </div>
                    )}

                    <div className={styles.chatBody}>
                        {messages.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>💬</div>
                                <p>Aún no hay mensajes. Comienza a negociar el presupuesto del trabajo.</p>
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isMe = msg.sender_id === currentUser.id;
                                const isQuote = msg.is_quote;
                                return (
                                    <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.messageMe : styles.messageOther}`}>
                                        <div className={styles.senderName}>
                                            {msg.sender?.name || 'Tú'} <span style={{opacity: 0.7, fontSize: '10px'}}>({msg.sender?.role?.name || 'Usuario'})</span>
                                        </div>
                                        <div className={`${styles.messageBubble} ${isMe ? styles.bubbleMe : styles.bubbleOther} ${isQuote ? styles.bubbleQuote : ''}`}>
                                            {!!isQuote && (
                                                <div className={styles.quoteBadge}>
                                                    <HiOutlineCurrencyDollar size={16} /> PROPUESTA DE MONTO
                                                </div>
                                            )}
                                            {!!isQuote && msg.quote_amount ? (
                                                <div className={styles.quoteAmountDisplay}>
                                                    ${Number(msg.quote_amount).toLocaleString('es-MX')}
                                                </div>
                                            ) : null}
                                            <div className={styles.messageText}>
                                                {msg.message}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.chatFooter}>
                        {quoteMode && canProposeQuote && (
                            <div className={styles.quoteInputArea} style={{ padding: '8px', background: '#fff7ed', borderRadius: '16px', border: '2px solid #fdba74', marginBottom: '12px', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>
                                <span className={styles.quoteIcon} style={{ fontSize: '20px', fontWeight: '900', color: '#f97316', paddingLeft: '8px', flexShrink: 0 }}>$</span>
                                <input 
                                    type="number" 
                                    className={styles.quoteInput}
                                    placeholder="Mano de obra..."
                                    value={quoteAmount}
                                    onChange={e => setQuoteAmount(e.target.value)}
                                    autoFocus
                                    style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', padding: '8px 12px', flex: 1, minWidth: '0' }}
                                />
                                <button className={styles.cancelQuoteBtn} onClick={() => setQuoteMode(false)} style={{ padding: '6px 10px', fontWeight: '800', borderRadius: '10px', flexShrink: 0, fontSize: '11px', textTransform: 'uppercase', background: '#ffedd5', border: '1px solid #fdba74' }}>
                                    Cancelar
                                </button>
                            </div>
                        )}

                        <div className={styles.inputRow}>
                            <input 
                                type="text"
                                className={styles.messageInput}
                                placeholder={quoteMode ? "Mensaje opcional..." : "Escribe un mensaje..."}
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            />
                            
                            {!quoteMode && canProposeQuote && (
                                <button 
                                    className={styles.proposeBtn}
                                    title="Proponer Monto"
                                    onClick={() => setQuoteMode(true)}
                                >
                                    <HiOutlineCurrencyDollar style={{ width: '24px', height: '24px', flexShrink: 0 }} />
                                </button>
                            )}
                            {currentUser?.role === 'tecnico' ? (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => handleSendWithAction('aceptar')} 
                                        style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                                    >
                                        Aceptar
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handleSendWithAction('rechazar')}
                                        style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                                    >
                                        Rechazar
                                    </button>
                                </div>
                            ) : (
                                <button className={styles.sendBtn} onClick={handleSendMessage}>
                                    <HiOutlinePaperAirplane style={{ width: '24px', height: '24px', transform: 'rotate(90deg)', flexShrink: 0 }} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NegotiationChatWidget;
