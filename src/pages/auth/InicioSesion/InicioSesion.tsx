import React from 'react';
import styles from './InicioSesion.module.css';
import logo from '../../../assets/imagenes/Logo.png';
import { Link } from 'react-router-dom';

const InicioSesion: React.FC = () => {
    return (
        <div className={styles.container}>

            {/* TARJETA */}

            <div className={styles.card}>
                <img src={logo} alt="Logo" className={styles.logo} />


                <form className={styles.form}>
                    <h2 className={styles.title}>¡Bienvenido!</h2>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Empresa</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Nombre de la empresa"
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

                    <Link to="/registro-sesion" className={styles.textButton}>
                        ¿No tienes una cuenta? Regístrate
                    </Link>

                    <button type="submit" className={styles.button}>
                        Iniciar Sesión
                    </button>



                </form>
            </div>

        </div>
    );
};

export default InicioSesion;
