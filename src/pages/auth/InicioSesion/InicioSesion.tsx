import React, { useState } from 'react';
import styles from './InicioSesion.module.css';
import logo from '../../../assets/imagenes/Logo.png';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const InicioSesion: React.FC = () => {
    const navigate = useNavigate();

    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        console.log("Enviando:", {
            email: correo,
            password: password,
        });

        try {
            // 🔥 AQUÍ ESTÁ EL CAMBIO IMPORTANTE
            const response = await api.post('/login', {
                email: correo, // 👈 ahora sí se llama email
                password: password,
            });

            const token = response.data.token;
            const user = response.data.user;

            // Guardar token
            localStorage.setItem('token', token);

            // Redirigir según rol
            if (user.role.name === 'admin') {
                navigate('/menu');
            } else if (user.role.name === 'cliente') {
                navigate('/cliente');
            } else if (user.role.name === 'tecnico') {
                navigate('/tecnico');
            } else {
                navigate('/');
            }

        } catch (err: any) {
            console.error(err);
            setError('Credenciales incorrectas');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <img src={logo} alt="Logo" className={styles.logo} />

                <form className={styles.form} onSubmit={handleSubmit}>
                    <h2 className={styles.title}>¡Bienvenido!</h2>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Correo</label>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder="correo@ejemplo.com"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Contraseña</label>
                        <input
                            type="password"
                            className={styles.input}
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <p style={{ color: 'red', marginBottom: '10px' }}>
                            {error}
                        </p>
                    )}

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