import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './AuthPage.module.css';
import logoAgente from '../../assets/imagenes/logo-agente-business.png';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { loginUser, registerUser, forgotPassword } from '../../services/authService';
import type { UserRole } from '../../context/AuthContext';
import { Eye, EyeOff, X } from 'lucide-react';
import ReCAPTCHA from "react-google-recaptcha";
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '../../constants/legalConstants';

const AuthPage: React.FC = () => {
    const [isRightPanelActive, setIsRightPanelActive] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [welcomeName, setWelcomeName] = useState("");
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();
    const { showAlert } = useModal();
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    
    // Register states
    const [regName, setRegName] = useState("");
    const [regLastName, setRegLastName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regConfirm, setRegConfirm] = useState("");
    
    // Visibility states
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showRegConfirm, setShowRegConfirm] = useState(false);

    // Legal states
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [legalModal, setLegalModal] = useState<{ open: boolean; title: string; content: string }>({
        open: false,
        title: '',
        content: ''
    });

    useEffect(() => {
        if (location.pathname === '/registro-sesion') {
            setIsRightPanelActive(true);
        } else {
            setIsRightPanelActive(false);
        }
    }, [location.pathname]);

    const handleSignUpClick = () => {
        setIsRightPanelActive(true);
        navigate('/registro-sesion');
    };

    const handleSignInClick = () => {
        setIsRightPanelActive(false);
        navigate('/inicio-sesion');
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await loginUser(loginEmail, loginPassword);
            const user = data.user;
            // Configurar token en axios si AuthContext no lo hace
            localStorage.setItem('token', data.token);

            let roleStr = user.role.toLowerCase();
            // Mapeamos explícitamente el rol "trabajador" de Laravel al rol "tecnico" del Frontend
            if (roleStr === 'trabajador') roleStr = 'tecnico';
            
            let role: UserRole = roleStr as UserRole;
            
            login({ 
                id: user.id, 
                name: user.name, 
                role: role, 
                email: user.email,
                negocio_id: user.negocio_id 
            });
            
            setWelcomeName(user.name);
            setShowWelcomeModal(true);
            setTimeout(() => {
                setShowWelcomeModal(false);
                if (role === 'admin') navigate('/menu');
                else if (role === 'tecnico') navigate('/tecnico');
                else if (role === 'encargado') navigate('/encargado');
                else if (role === 'autonomo' || role === 'gerente-general') navigate('/autonomo');
                else navigate('/cliente');
            }, 5000);
        } catch (error: any) {
            console.error(error);
            showAlert("Error de Inicio de Sesión", "Credenciales inválidas o error de red.", "error");
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (regPassword !== regConfirm) {
            showAlert("Error de Registro", "Las contraseñas no coinciden.", "warning");
            return;
        }
        if (!acceptedTerms || !acceptedPrivacy) {
            showAlert("Aceptación Requerida", "Debes aceptar los términos y el aviso de privacidad para continuar.", "warning");
            return;
        }
        if (!captchaToken) {
            showAlert("Validación Requerida", "Por favor completa el ReCAPTCHA.", "warning");
            return;
        }
        try {
            const fullName = `${regName} ${regLastName}`.trim();
            const data = await registerUser({
                name: fullName || 'Nuevo Cliente',
                email: regEmail,
                password: regPassword,
                password_confirmation: regConfirm
            });
            
            const user = data.user;
            localStorage.setItem('token', data.token);

            let roleStr = user.role.toLowerCase();
            if (roleStr === 'trabajador') roleStr = 'tecnico';
            
            let role: UserRole = roleStr as UserRole;
            
            login({ id: user.id, name: user.name, role: role, email: user.email });
            
            setWelcomeName(user.name);
            setShowWelcomeModal(true);
            setTimeout(() => {
                setShowWelcomeModal(false);
                if (role === 'admin') navigate('/menu');
                else if (role === 'tecnico') navigate('/tecnico');
                else if (role === 'encargado') navigate('/encargado');
                else if (role === 'autonomo') navigate('/autonomo');
                else navigate('/cliente');
            }, 5000);
        } catch (error: any) {
            console.error(error);
            // Extraer mensaje detallado de Laravel si existe (errors object)
            const errorData = error.response?.data;
            let errorMsg = "No se pudo registrar la cuenta. Intente nuevamente.";
            
            if (errorData?.errors) {
                errorMsg = Object.values(errorData.errors).flat().join(' ');
            } else if (errorData?.message) {
                errorMsg = errorData.message;
            }

            showAlert("Error de Registro", errorMsg, "error");
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail) {
            showAlert("Error", "Por favor ingresa tu correo electrónico.", "warning");
            return;
        }
        try {
            const data = await forgotPassword(forgotEmail);
            showAlert("Correo Enviado", data.message || "Revisa tu bandeja de entrada para restablecer tu contraseña.", "success");
            setShowForgotModal(false);
            setForgotEmail("");
        } catch (error: any) {
            console.error(error);
            showAlert("Error", error.response?.data?.message || "No pudimos procesar tu solicitud. Verifica que tu correo esté registrado.", "error");
        }
    };

    return (
        <div className={styles.body}>

            <div className={`${styles.container} ${isRightPanelActive ? styles.rightPanelActive : ''}`} id="container">

                {/* SIGN UP FORM */}
                <div className={`${styles.formContainer} ${styles.signUpContainer}`}>
                    <form className={styles.form} onSubmit={handleRegisterSubmit}>
                        <img src={logoAgente} alt="Agente Business" className={styles.cardLogo} />
                        <h1 className={styles.title}>Crear Cuenta</h1>
                        <span className={styles.span}>Crea una cuenta para tu empresa hoy mismo</span>
                        <input type="text" placeholder="Nombre(s)" className={styles.input} value={regName} onChange={(e) => setRegName(e.target.value)} />
                        <input type="text" placeholder="Apellidos" className={styles.input} value={regLastName} onChange={(e) => setRegLastName(e.target.value)} />
                        <input type="email" placeholder="Correo" className={styles.input} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                        <div className={styles.passwordContainer}>
                            <input type={showRegPassword ? "text" : "password"} placeholder="Contraseña" className={styles.input} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                            <button type="button" className={styles.eyeButton} onClick={() => setShowRegPassword(!showRegPassword)}>
                                {showRegPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <div className={styles.passwordContainer}>
                            <input type={showRegConfirm ? "text" : "password"} placeholder="Confirmar Contraseña" className={styles.input} value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} />
                            <button type="button" className={styles.eyeButton} onClick={() => setShowRegConfirm(!showRegConfirm)}>
                                {showRegConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {/* LEGAL CHECKBOXES */}
                        <div className={styles.legalContainer}>
                            <div className={styles.checkboxGroup}>
                                <input 
                                    type="checkbox" 
                                    id="terms" 
                                    checked={acceptedTerms} 
                                    onChange={(e) => setAcceptedTerms(e.target.checked)} 
                                />
                                <label htmlFor="terms">
                                    Acepto los <span onClick={() => setLegalModal({ open: true, title: 'Términos y Condiciones', content: TERMS_AND_CONDITIONS })}>términos y condiciones de uso</span>
                                </label>
                            </div>
                            <div className={styles.checkboxGroup}>
                                <input 
                                    type="checkbox" 
                                    id="privacy" 
                                    checked={acceptedPrivacy} 
                                    onChange={(e) => setAcceptedPrivacy(e.target.checked)} 
                                />
                                <label htmlFor="privacy">
                                    Acepto el <span onClick={() => setLegalModal({ open: true, title: 'Aviso de Privacidad', content: PRIVACY_POLICY })}>aviso de privacidad</span>
                                </label>
                            </div>
                        </div>

                        {/* RECAPTCHA */}
                        <div className={styles.captchaContainer}>
                            <ReCAPTCHA
                                sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                                onChange={(token) => setCaptchaToken(token)}
                                size="normal"
                            />
                        </div>

                        <button type="submit" className={styles.button}>Registrarse</button>
                        
                        {/* Mobile view switch */}
                        <div className={styles.mobileSwitch}>
                            <span>¿Ya tienes una cuenta?</span>
                            <button type="button" className={styles.switchButton} onClick={handleSignInClick}>
                                Iniciar Sesión
                            </button>
                        </div>
                    </form>
                </div>

                {/* SIGN IN FORM */}
                <div className={`${styles.formContainer} ${styles.signInContainer}`}>
                    <form className={styles.form} onSubmit={handleLoginSubmit}>
                        <img src={logoAgente} alt="Agente Business" className={styles.cardLogo} />
                        <h1 className={styles.title}>Iniciar Sesión</h1>
                        <span className={styles.span}>o usa tu cuenta existente</span>
                        <input
                            type="email"
                            placeholder="Correo"
                            className={styles.input}
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                        />
                        <div className={styles.passwordContainer}>
                            <input type={showLoginPassword ? "text" : "password"} placeholder="Contraseña" className={styles.input} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                            <button type="button" className={styles.eyeButton} onClick={() => setShowLoginPassword(!showLoginPassword)}>
                                {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }} className={styles.link}>¿Olvidaste tu contraseña?</a>
                        <button type="submit" className={styles.button}>Ingresar</button>

                        {/* Mobile view switch */}
                        <div className={styles.mobileSwitch}>
                            <span>¿No tienes una cuenta aún?</span>
                            <button type="button" className={styles.switchButton} onClick={handleSignUpClick}>
                                Registrarse
                            </button>
                        </div>
                    </form>
                </div>

                {/* OVERLAY */}
                <div className={styles.overlayContainer}>
                    <div className={styles.overlay}>
                        <div className={`${styles.overlayPanel} ${styles.overlayLeft}`}>
                            <h1 className={styles.title}>¡Bienvenido de nuevo!</h1>
                            <p className={styles.paragraph}>Para mantenerte conectado con nosotros, por favor inicia sesión con tu información personal</p>
                            <button className={`${styles.button} ${styles.ghost}`} onClick={handleSignInClick}>
                                Iniciar Sesión
                            </button>
                        </div>
                        <div className={`${styles.overlayPanel} ${styles.overlayRight}`}>
                            <h1 className={styles.title}>¡Hola, Amigo!</h1>
                            <p className={styles.paragraph}>Introduce tus datos personales y comienza tu viaje con nosotros</p>
                            <button className={`${styles.button} ${styles.ghost}`} onClick={handleSignUpClick}>
                                Registrarse
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* WELCOME MODAL OVERLAY */}
            {showWelcomeModal && (
                <div className={styles.welcomeModalOverlay}>
                    <div className={styles.welcomeModalContent}>
                        <h2 style={{ color: '#0284c7' }}>¡Bienvenido, {welcomeName}!</h2>
                    </div>
                </div>
            )}

            {/* FORGOT PASSWORD MODAL */}
            {showForgotModal && (
                <div className={styles.welcomeModalOverlay} style={{ zIndex: 1000 }}>
                    <div className={styles.welcomeModalContent} style={{ padding: '40px', maxWidth: '400px', width: '90%' }}>
                        <h2 style={{ color: '#0284c7', marginBottom: '15px' }}>Recuperar Contraseña</h2>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla.</p>
                        <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input 
                                type="email" 
                                placeholder="Correo Electrónico" 
                                className={styles.input} 
                                value={forgotEmail} 
                                onChange={(e) => setForgotEmail(e.target.value)} 
                                style={{ margin: 0 }}
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowForgotModal(false)} className={styles.ghost} style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '20px', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                                <button type="submit" className={styles.button} style={{ flex: 1, margin: 0, padding: '12px' }}>Enviar Enlace</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* LEGAL MODAL */}
            {legalModal.open && (
                <div className={styles.welcomeModalOverlay} style={{ zIndex: 2000 }}>
                    <div className={styles.legalModalContent}>
                        <div className={styles.legalModalHeader}>
                            <h2>{legalModal.title}</h2>
                            <button onClick={() => setLegalModal({ ...legalModal, open: false })} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.legalModalBody}>
                            <pre className={styles.legalText}>{legalModal.content}</pre>
                        </div>
                        <div className={styles.legalModalFooter}>
                            <button onClick={() => setLegalModal({ ...legalModal, open: false })} className={styles.button}>Entendido</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthPage;