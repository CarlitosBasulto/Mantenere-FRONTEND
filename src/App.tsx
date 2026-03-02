import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AdminLayout from "./layouts/AdminLayout";
import ClienteLayout from "./layouts/ClienteLayout";
import TecnicoLayout from "./layouts/TecnicoLayout";

// PUBLIC
import Home from "./pages/public/Home";
import AuthPage from "./pages/auth/AuthPage"; // Import AuthPage

// ADMIN VIEWS
import ListaNegocios from "./pages/admin/ListaNegocios";
import ListaTrabajadores from "./pages/admin/ListaTrabajadores";
import ListaSolicitudes from "./pages/admin/ListaSolicitudes";
import TrabajoDetalle from "./pages/Trabajos detalles/Trabajodetalles";
import AdminDetalleTrabajo from "./pages/admin/AdminDetalleTrabajo";
import AdminVerificacionEquipo from "./pages/admin/AdminVerificacionEquipo";
import AdminReporte from "./pages/admin/AdminReporte";
import AdminCotizacion from "./pages/admin/AdminCotizacion";
import AdminPerfilTrabajador from "./pages/admin/AdminPerfilTrabajador";
import PerfilEmpresa from "./pages/cliente/PerfilEmpresa";
import MiPerfil from "./pages/cliente/MiPerfil";
import Cotizaciones from "./pages/cliente/Cotizaciones";


function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* PUBLIC ROUTES */}
                    <Route path="/" element={<Home />} />

                    {/* AUTH (Sliding Page) */}
                    <Route path="/inicio-sesion" element={<AuthPage />} />
                    <Route path="/registro-sesion" element={<AuthPage />} />

                    {/* ADMIN ROUTES */}
                    <Route path="/menu" element={<AdminLayout />}>
                        <Route index element={<ListaNegocios />} />
                        <Route path="trabajadores" element={<ListaTrabajadores />} />
                        <Route path="trabajador/:id" element={<AdminPerfilTrabajador />} />
                        <Route path="solicitudes" element={<ListaSolicitudes />} />
                        <Route path="trabajo/:id" element={<TrabajoDetalle />} />
                        <Route path="trabajo-detalle/:id" element={<AdminDetalleTrabajo />} />
                        <Route path="cotizacion/:id" element={<AdminCotizacion />} />
                        <Route path="verificacion-tarea/:id" element={<AdminVerificacionEquipo />} />
                        <Route path="reporte-tarea/:id" element={<AdminReporte />} />
                        <Route path="mi-perfil" element={<MiPerfil />} />
                    </Route>

                    {/* CLIENTE ROUTES */}
                    <Route path="/cliente" element={<ClienteLayout />}>
                        <Route index element={<ListaNegocios />} />
                        <Route path="perfil-empresa" element={<PerfilEmpresa />} />
                        <Route path="mi-perfil" element={<MiPerfil />} />
                        <Route path="cotizaciones" element={<Cotizaciones />} />
                        <Route path="trabajo/:id" element={<TrabajoDetalle />} />
                        <Route path="trabajo-detalle/:id" element={<AdminDetalleTrabajo />} />
                    </Route>

                    {/* TECNICO ROUTES */}
                    <Route path="/tecnico" element={<TecnicoLayout />}>
                        <Route index element={<ListaNegocios />} />
                        <Route path="solicitudes" element={<ListaSolicitudes />} />
                        <Route path="mi-perfil" element={<MiPerfil />} />
                        <Route path="trabajo/:id" element={<TrabajoDetalle />} />
                        <Route path="trabajo-detalle/:id" element={<AdminDetalleTrabajo />} />
                    </Route>

                    {/* FALLBACK */}
                    <Route path="*" element={<Home />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
