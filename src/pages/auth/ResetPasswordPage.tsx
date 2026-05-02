import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { resetPassword } from '../../services/authService';
import logoAgente from '../../assets/imagenes/logo-agente-business.png';
import { Eye, EyeOff } from 'lucide-react';
import styles from './AuthPage.module.css';

const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const location = useLocation();
    const navigate = useNavigate();
    const { showAlert } = useModal();

    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token || !email) {
            showAlert("Error", "El enlace de recuperación es inválido.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showAlert("Error", "Las contraseñas no coinciden.", "warning");
            return;
        }

        if (password.length < 6) {
            showAlert("Contraseña corta", "La contraseña debe tener al menos 6 caracteres.", "warning");
            return;
        }

        try {
            await resetPassword({
                email,
                token,
                password,
                password_confirmation: confirmPassword
            });
            showAlert("¡Éxito!", "Tu contraseña ha sido restablecida correctamente. Ahora puedes iniciar sesión.", "success");
            navigate('/inicio-sesion');
        } catch (error: any) {
            console.error(error);
            showAlert("Error", error.response?.data?.message || "No se pudo restablecer la contraseña. El enlace puede haber expirado.", "error");
        }
    };

    if (!token || !email) {
        return (
            <div className={styles.body} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 14px 28px rgba(0,0,0,0.25)' }}>
                    <h2 style={{ color: '#e11d48' }}>Enlace Inválido</h2>
                    <p style={{ color: '#64748b', marginTop: '15px' }}>El enlace de recuperación de contraseña no es válido o está incompleto.</p>
                    <button onClick={() => navigate('/inicio-sesion')} className={styles.button} style={{ marginTop: '20px' }}>Volver al Inicio</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.body}>
            <div className={styles.logoContainer}>
                <img src={logoAgente} alt="Agente Business" className={styles.externalLogo} />
            </div>

            <div className={`${styles.container}`} style={{ maxWidth: '450px', minHeight: '500px' }}>
                <div className={styles.formContainer} style={{ width: '100%', left: 0, opacity: 1, zIndex: 2 }}>
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <h1 className={styles.title}>Nueva Contraseña</h1>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
                            Ingresa tu nueva contraseña para la cuenta:<br/>
                            <strong>{email}</strong>
                        </p>
                        
                        <div className={styles.passwordContainer}>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Nueva Contraseña" 
                                className={styles.input} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                            />
                            <button type="button" className={styles.eyeButton} onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        <div className={styles.passwordContainer}>
                            <input 
                                type={showConfirm ? "text" : "password"} 
                                placeholder="Confirmar Contraseña" 
                                className={styles.input} 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                            />
                            <button type="button" className={styles.eyeButton} onClick={() => setShowConfirm(!showConfirm)}>
                                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        <button type="submit" className={styles.button}>Guardar Contraseña</button>
                        <button type="button" onClick={() => navigate('/inicio-sesion')} className={styles.ghost} style={{ marginTop: '15px', color: '#64748b', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
