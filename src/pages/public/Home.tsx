import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
    const navigate = useNavigate();

    return (
        <section className="home">
            <div className="home-overlay"></div>
            <div className="home-content">
                <h1>Bienvenido a Mantenere</h1>

                <p>
                    Soluciones integrales para el mantenimiento y gestión de tus espacios.
                    <br />
                    Calidad y confianza en cada proyecto.
                </p>

                <button
                    className="home-btn"
                    onClick={() => navigate('/inicio-sesion')}
                >
                    Iniciar Sesión
                </button>
            </div>

        </section>
    );
};

export default Home;
