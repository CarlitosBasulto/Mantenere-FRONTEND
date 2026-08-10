import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { HiOutlineChatAlt2, HiOutlineX, HiOutlinePaperAirplane, HiOutlineCurrencyDollar, HiOutlineDocumentText } from 'react-icons/hi';
import styles from './NegotiationChatWidget.module.css';
import echo from '../../services/echo';

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
    inlineMode?: boolean;
    forceOpen?: boolean;
}

const NegotiationChatWidget: React.FC<ChatProps> = ({ trabajoId, currentUser, onViewVisitInfo, inlineMode = false, forceOpen = false }) => {
    const [isOpen, setIsOpen] = useState(inlineMode ? true : false);

    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
        }
    }, [forceOpen]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({ show: false, message: '', type: 'success' });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef(0);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

    const isFetchingRef = useRef(false);

    const fetchMessages = async () => {
        if (!trabajoId || isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get(`${API_URL}/trabajos/${trabajoId}/chat`, {
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
        } finally {
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        if (!trabajoId) return;
        
        // 1. Cargar el historial inicial
        fetchMessages();

        // 2. Escuchar nuevos mensajes en tiempo real por WebSockets (Reverb)
        const channel = echo.private(`trabajo.${trabajoId}`);
        channel.listen('.ChatMessageSent', (e: { chat: Message }) => {
            if (e.chat) {
                setMessages(prev => {
                    if (prev.some(m => m.id === e.chat.id)) return prev;
                    return [...prev, e.chat];
                });
                if (!isOpen) {
                    setUnreadCount(prev => prev + 1);
                }
            }
        });

        return () => {
            channel.stopListening('.ChatMessageSent');
        };
    }, [trabajoId]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setUnreadCount(0);
        }
    }, [messages, isOpen]);

    const scrollToBottom = () => {
        const chatBody = messagesEndRef.current?.parentElement;
        if (chatBody) {
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const payload = {
                message: inputText.trim(),
                is_quote: false,
                quote_amount: null
            };
            await axios.post(`${API_URL}/trabajos/${trabajoId}/chat`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setInputText('');
            fetchMessages();
        } catch (error) {
            console.error("Error sending message:", error);
            setToast({ show: true, message: 'Error al enviar el mensaje.', type: 'error' });
            setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
        }
    };

    return (
        <div className={styles.chatWidgetContainer} style={inlineMode ? { position: 'relative', width: '100%', fontFamily: "'Inter', system-ui, sans-serif", marginTop: '20px', zIndex: 1 } : { position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* FAB Button */}
            {!isOpen && !inlineMode && (
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

            {/* Chat Box */}
            {isOpen && (
                <div className={styles.chatBox} style={inlineMode ? { width: '100%', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' } : { width: '400px' }}>
                    <div className={styles.chatHeader}>
                        <div className={styles.headerInfo}>
                            <div className={styles.avatarCircle}>💬</div>
                            <div>
                                <h4 className={styles.headerTitle}>Chat de Comunicación</h4>
                                <span className={styles.headerSubtitle}>Trabajo #{trabajoId}</span>
                            </div>
                        </div>
                        {!inlineMode && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {onViewVisitInfo && (
                                    <button className={styles.closeBtn} onClick={onViewVisitInfo} title="Ver Información de la Visita">
                                        <HiOutlineDocumentText size={20} />
                                    </button>
                                )}
                                <button className={styles.closeBtn} onClick={() => setIsOpen(false)} title="Cerrar Chat">
                                    <HiOutlineX size={20} />
                                </button>
                            </div>
                        )}
                    </div>

                    {toast.show && (
                        <div style={{ padding: '10px', background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', fontSize: '14px', fontWeight: 'bold', textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                            {toast.message}
                        </div>
                    )}

                    <div className={styles.chatBody} style={inlineMode ? { maxHeight: '350px', minHeight: '200px', background: '#f8fafc' } : {}}>
                        {messages.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>💬</div>
                                <p>Aún no hay mensajes. Comienza la conversación sobre este trabajo.</p>
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isMe = msg.sender_id === currentUser.id;
                                return (
                                    <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.messageMe : styles.messageOther}`}>
                                        <div className={styles.senderName}>
                                            {msg.sender?.name || 'Tú'} <span style={{opacity: 0.7, fontSize: '10px'}}>({msg.sender?.role?.name || 'Usuario'})</span>
                                        </div>
                                        <div className={`${styles.messageBubble} ${isMe ? styles.bubbleMe : styles.bubbleOther}`}>
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
                        <div className={styles.inputRow}>
                            <input 
                                type="text"
                                className={styles.messageInput}
                                placeholder="Escribe un mensaje..."
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            />
                            
                            <button className={styles.sendBtn} onClick={handleSendMessage} title="Enviar Mensaje">
                                <HiOutlinePaperAirplane style={{ width: '24px', height: '24px', transform: 'rotate(90deg)', flexShrink: 0 }} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NegotiationChatWidget;
