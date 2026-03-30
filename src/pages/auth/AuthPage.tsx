import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './AuthPage.module.css';
import { useAuth } from '../../context/AuthContext';
import { loginUser } from '../../services/authService';
import type { UserRole } from '../../context/AuthContext';

const AuthPage: React.FC = () => {
    const [isRightPanelActive, setIsRightPanelActive] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    
    // Register states
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regConfirm, setRegConfirm] = useState("");

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
            
            if (role === 'admin') navigate('/menu');
            else if (role === 'tecnico') navigate('/tecnico');
            else navigate('/cliente');
        } catch (error: any) {
            console.error(error);
            alert("Credenciales inválidas o error de red");
        }
    };

    const handleRegisterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (regPassword !== regConfirm) return alert("Las contraseñas no coinciden");
        login({ id: 100, name: regName || 'Nuevo Cliente', role: 'cliente', email: regEmail });
        navigate('/cliente');
    };

    return (
        <div className={styles.body}>

            {/* --- LOGO FUERA DE LA CARD --- */}
            <div className={styles.logoContainer}>
                <img src="src/assets/imagenes/logo.png" alt="logo" className={styles.externalLogo} />
            </div>

            <div className={`${styles.container} ${isRightPanelActive ? styles.rightPanelActive : ''}`} id="container">

                {/* SIGN UP FORM */}
                <div className={`${styles.formContainer} ${styles.signUpContainer}`}>
                    <form className={styles.form} onSubmit={handleRegisterSubmit}>
                        <h1 className={styles.title}>Crear Cuenta</h1>
                        <div className={styles.socialContainer}></div>
                        <span className={styles.span}>Crea una cuenta para tu empresa hoy mismo</span>
                        <input type="text" placeholder="Nombre completo" className={styles.input} value={regName} onChange={(e) => setRegName(e.target.value)} />
                        <input type="email" placeholder="Correo" className={styles.input} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                        <input type="password" placeholder="Contraseña" className={styles.input} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                        <input type="password" placeholder="Confirmar Contraseña" className={styles.input} value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} />
                        <button type="submit" className={styles.button}>Registrarse</button>
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
                        <input type="password" placeholder="Contraseña" className={styles.input} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                        <a href="#" className={styles.link}>¿Olvidaste tu contraseña?</a>
                        <button type="submit" className={styles.button}>Ingresar</button>
                        <div style={{ marginTop: '10px', fontSize: '11px', color: '#666', background: '#f0f0f0', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Perfiles de Prueba:</p>
                            <p style={{ margin: 0 }}>Admin: <code>admin@test.com</code></p>
                            <p style={{ margin: 0 }}>Técnico: <code>pedro@tecnico.com</code></p>
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
        </div>
    );
};

export default AuthPage;