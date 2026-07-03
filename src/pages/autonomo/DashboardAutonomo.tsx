import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AutonomoTablero from './AutonomoTablero';
import styles from './DashboardAutonomo.module.css';

const DashboardAutonomo: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className={styles.wrapper}>
            <header className={styles.welcomeHeader}>
                <h1>¡Bienvenido, {user?.name}! 🏢</h1>
                <p>Panel de Administrador Autónomo — Solo ves y gestionas <strong>tu propio sistema</strong>.</p>
            </header>
            <AutonomoTablero />
        </div>
    );
};

export default DashboardAutonomo;
