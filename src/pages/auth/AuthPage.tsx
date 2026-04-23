import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './AuthPage.module.css';
import logoAgente from '../../assets/imagenes/logo-agente-business.png';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { loginUser, registerUser } from '../../services/authService';
import type { UserRole } from '../../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const AuthPage: React.FC = () => {
    const [isRightPanelActive, setIsRightPanelActive] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [welcomeName, setWelcomeName] = useState("");
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
            
            login({ id: user.id, name: user.name, role: role, email: user.email });
            
            setWelcomeName(user.name);
            setShowWelcomeModal(true);
            setTimeout(() => {
                setShowWelcomeModal(false);
                if (role === 'admin') navigate('/menu');
                else if (role === 'tecnico') navigate('/tecnico');
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
                else navigate('/cliente');
            }, 5000);
        } catch (error: any) {
            console.error(error);
            showAlert("Error de Registro", error.response?.data?.message || "No se pudo registrar la cuenta. Intente nuevamente.", "error");
        }
    };

    return (
        <div className={styles.body}>

            {/* --- LOGO FUERA DE LA CARD --- */}
            <div className={styles.logoContainer}>
                <img src={logoAgente} alt="Agente Business" className={styles.externalLogo} />
            </div>

            <div className={`${styles.container} ${isRightPanelActive ? styles.rightPanelActive : ''}`} id="container">

                {/* SIGN UP FORM */}
                <div className={`${styles.formContainer} ${styles.signUpContainer}`}>
                    <form className={styles.form} onSubmit={handleRegisterSubmit}>
                        <h1 className={styles.title}>Crear Cuenta</h1>
                        <div className={styles.socialContainer}></div>
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
                        <h1 className={styles.title}>Iniciar Sesión</h1>
                        <div className={styles.socialContainer}></div>
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
                        <a href="#" className={styles.link}>¿Olvidaste tu contraseña?</a>
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
        </div>
    );
};

export default AuthPage;