import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RegistroSesion.module.css';
import logo from '../../../assets/imagenes/Logo.png';

const RegistroSesion: React.FC = () => {
    const navigate = useNavigate();

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        // Aquí iría la lógica de registro (API call)
        console.log('Registrando usuario...');
        // Redirigir al inicio de sesión
        navigate('/inicio-sesion');
    };

    return (
        <div className={styles.container}>

            {/* TARJETA */}

            <div className={styles.card}>
                <img src={logo} alt="Logo" className={styles.logo} />

                <form className={styles.form} onSubmit={handleRegister}>
                    <h2 className={styles.title}>¡Registrate!</h2>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Nombre de la empresa</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Nombre"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Correo</label>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder="correo@ejemplo.com"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Contraseña</label>
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="Contraseña"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Confirmar Contraseña</label>
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="Confirmar Contraseña"
                        />
                    </div>


                    <button type="submit" className={styles.button}>
                        Registrarse
                    </button>

                </form>
            </div>

        </div>
    );
};

export default RegistroSesion;
