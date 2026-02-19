import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Home from '../pages/Home';
import Contacto from '../pages/Contacto/Contacto';
import InicioSesion from '../pages/InicioSesion';
import RegistroSesion from '../pages/RegistroSesion/RegistroSesion';
import Menu from '../pages/Menu/Menu';

const AppRoutes: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/" element={<MainLayout />}>

                    <Route index element={<Home />} />
                    <Route path="contacto" element={<Contacto />} />

                    {/* LOGIN */}
                    <Route path="inicio-sesion" element={<InicioSesion />} />

                    {/* REGISTRO */}
                    <Route path="registro-sesion" element={<RegistroSesion />} />

                    {/* MENU */}
                    <Route path="menu" element={<Menu />} />

                    {/* Ruta no encontrada */}
                    <Route path="*" element={<Navigate to="/" replace />} />

                </Route>

            </Routes>
        </BrowserRouter>
    );
};

export default AppRoutes;
