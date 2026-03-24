import React, { useState } from 'react';
import styles from './InicioSesion.module.css';
import logo from '../../../assets/imagenes/Logo.png';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const InicioSesion: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth(); // 👈 Usar contexto global de autenticación

    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    console.log("COMPONENTE LOGIN CARGADO");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 🧹 LIMPIEZA PREVIA: Borrar cualquier sesión vieja antes de intentar este nuevo login
        localStorage.removeItem('token');
        localStorage.removeItem('user');

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

            // Mapear el `role_id` numérico al `role` en texto para que el frontend (Context, ProtectedRoute, Menu) funcione correctamente.
            // O si el backend ya envía un texto en user.role, lo forzamos a minúsculas.
            if (user.role) {
                user.role = user.role.toLowerCase();
            } else if (user.role_id === 1) {
                user.role = 'admin';
            } else if (user.role_id === 2) {
                user.role = 'cliente';
            } else if (user.role_id === 3) {
                user.role = 'tecnico';
            }

            // Actualizar contexto global y localStorage
            login(user); // 👈 Dispara la actualización global en React
            localStorage.setItem('token', token);


            // Redirigir según el rol textual (admin, cliente, tecnico)
            if (user.role === 'admin') { 
                navigate('/menu');
            } else if (user.role === 'cliente') { 
                navigate('/cliente');
            } else if (user.role === 'tecnico') { 
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

                <form
                    className={styles.form}
                    onSubmit={(e) => {
                        console.log("FORMULARIO ENVIADO");
                        handleSubmit(e);
                    }}
                >
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