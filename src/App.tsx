import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AdminLayout from "./layouts/AdminLayout";
import ClienteLayout from "./layouts/ClienteLayout";
import TecnicoLayout from "./layouts/TecnicoLayout";
import { ModalProvider } from "./context/ModalContext";
import CustomModal from "./components/common/CustomModal";
import ProtectedRoute from "./components/ProtectedRoute";


// PUBLIC
import Home from "./pages/public/Home";
import AuthPage from "./pages/auth/AuthPage"; // Import AuthPage
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// ADMIN VIEWS
import Dashboard from "./pages/admin/Dashboard";
import ListaNegocios from "./pages/admin/ListaNegocios";
import ListaTrabajadores from "./pages/admin/ListaTrabajadores";
import ListaSolicitudes from "./pages/admin/ListaSolicitudes";
import TrabajoDetalle from "./pages/Trabajos detalles/Trabajodetalles";
import AdminDetalleTrabajo from "./pages/admin/AdminDetalleTrabajo";
import AutonomoDetalleTrabajo from "./pages/ecosistema_autonomo/admin_autonomo/AutonomoDetalleTrabajo";
import AutonomoListaNegocios from "./pages/ecosistema_autonomo/admin_autonomo/AutonomoListaNegocios";
import AutonomoListaTrabajadores from "./pages/ecosistema_autonomo/admin_autonomo/AutonomoListaTrabajadores";
import AutonomoPerfilEmpresa from "./pages/ecosistema_autonomo/admin_autonomo/AutonomoPerfilEmpresa";
import AdminVerificacionEquipo from "./pages/admin/AdminVerificacionEquipo";
import AdminReporte from "./pages/admin/AdminReporte";
import AdminCotizacion from "./pages/admin/AdminCotizacion";
import AdminPerfilTrabajador from "./pages/admin/AdminPerfilTrabajador";
import PerfilEmpresa from "./pages/cliente/PerfilEmpresa";
import MiPerfil from "./pages/cliente/MiPerfil";
import AutonomoMiPerfil from "./pages/ecosistema_autonomo/admin_autonomo/AutonomoMiPerfil";
import Cotizaciones from "./pages/cliente/Cotizaciones";
import Historial from "./pages/cliente/Historial";
import AdminHistorial from "./pages/admin/AdminHistorial";
import ListaUsuarios from "./pages/admin/ListaUsuarios";
import ListaMantenimiento from "./pages/admin/ListaMantenimiento";
import MantenimientoDetalle from "./pages/admin/MantenimientoDetalle";
import InventarioGeneral from "./pages/admin/InventarioGeneral";
import EncargadoLayout from "./layouts/EncargadoLayout";
import AutonomoLayout from "./layouts/AutonomoLayout";
import DashboardCliente from "./pages/cliente/DashboardCliente";
import DashboardEncargado from "./pages/encargado/DashboardEncargado";
import DashboardAutonomo from "./pages/autonomo/DashboardAutonomo";
import AutonomoTablero from "./pages/autonomo/AutonomoTablero";
import DetalleAdminAutonomo from "./pages/admin/DetalleAdminAutonomo";
import DashboardTecnico from "./pages/tecnico/DashboardTecnico";

function App() {
    return (
        <ModalProvider>
            <AuthProvider>
                <BrowserRouter>
                    <CustomModal />
                    <Routes>
                        {/* PUBLIC ROUTES */}
                        <Route path="/" element={<Home />} />

                        {/* AUTH (Sliding Page) */}
                        <Route path="/inicio-sesion" element={<AuthPage />} />
                        <Route path="/registro-sesion" element={<AuthPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />

                        {/* ADMIN ROUTES */}
                        <Route path="/menu" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<ListaNegocios />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="negocios" element={<ListaNegocios />} />
                            <Route path="inventario-general" element={<InventarioGeneral />} />
                            <Route path="trabajadores" element={<ListaTrabajadores />} />
                            <Route path="usuarios" element={<ListaUsuarios />} />
                            <Route path="trabajos-realizados" element={<AdminHistorial />} />
                            <Route path="trabajador/:id" element={<AdminPerfilTrabajador />} />
                            <Route path="solicitudes" element={<ListaSolicitudes />} />
                            <Route path="mantenimiento" element={<ListaMantenimiento />} />
                            <Route path="mantenimiento-detalle/:id" element={<MantenimientoDetalle />} />
                            <Route path="trabajo/:id" element={<TrabajoDetalle />} />
                            <Route path="trabajo-detalle/:id" element={<AdminDetalleTrabajo />} />
                            <Route path="cotizacion/:id" element={<AdminCotizacion />} />
                            <Route path="verificacion-tarea/:id" element={<AdminVerificacionEquipo />} />
                            <Route path="reporte-tarea/:id" element={<AdminReporte />} />
                            <Route path="mi-perfil" element={<MiPerfil />} />
                            <Route path="perfil-empresa" element={<PerfilEmpresa />} />
                            <Route path="admin-autonomo/:id" element={<DetalleAdminAutonomo />} />
                        </Route>

                        {/* CLIENTE ROUTES */}
                        <Route path="/cliente" element={
                            <ProtectedRoute allowedRoles={['cliente']}>
                                <ClienteLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<ListaNegocios />} />
                            <Route path="resumen" element={<DashboardCliente />} />
                            <Route path="negocios" element={<ListaNegocios />} />
                            <Route path="perfil-empresa" element={<PerfilEmpresa />} />
                            <Route path="mi-perfil" element={<MiPerfil />} />
                            <Route path="cotizaciones" element={<Cotizaciones />} />
                            <Route path="historial" element={<Historial />} />
                            <Route path="trabajo/:id" element={<TrabajoDetalle />} />
                            <Route path="trabajo-detalle/:id" element={<AdminDetalleTrabajo />} />
                        </Route>

                        {/* TECNICO ROUTES */}
                        <Route path="/tecnico" element={
                            <ProtectedRoute allowedRoles={['tecnico']}>
                                <TecnicoLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<DashboardTecnico />} />
                            <Route path="solicitudes" element={<ListaSolicitudes />} />
                            <Route path="mi-perfil" element={<MiPerfil />} />
                            <Route path="historial" element={<AdminHistorial />} />
                            <Route path="trabajo/:id" element={<TrabajoDetalle />} />
                            <Route path="trabajo-detalle/:id" element={<AdminDetalleTrabajo />} />
                            <Route path="reporte-tarea/:id" element={<AdminReporte />} />
                        </Route>

                        {/* ENCARGADO ROUTES */}
                        <Route path="/encargado" element={
                            <ProtectedRoute allowedRoles={['encargado']}>
                                <EncargadoLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<DashboardEncargado />} />
                            <Route path="resumen" element={<DashboardEncargado />} />
                            <Route path="negocios" element={<ListaNegocios />} />
                            <Route path="sucursal" element={<PerfilEmpresa />} />
                            <Route path="mi-perfil" element={<MiPerfil />} />
                            <Route path="cotizaciones" element={<Cotizaciones />} />
                            <Route path="historial" element={<Historial />} />
                            <Route path="trabajo/:id" element={<TrabajoDetalle />} />
                            <Route path="trabajo-detalle/:id" element={<AdminDetalleTrabajo />} />
                        </Route>

                        {/* ADMIN AUTÓNOMO ROUTES */}
                        <Route path="/autonomo" element={
                            <ProtectedRoute allowedRoles={['autonomo', 'gerente-general', 'admin-autonomo']}>
                                <AutonomoLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<DashboardAutonomo />} />
                            <Route path="dashboard" element={<DashboardAutonomo />} />
                            <Route path="negocios" element={<AutonomoListaNegocios />} />
                            <Route path="trabajadores" element={<AutonomoListaTrabajadores />} />
                            <Route path="trabajador/:id" element={<AdminPerfilTrabajador />} />
                            <Route path="usuarios" element={<ListaUsuarios />} />
                            <Route path="solicitudes" element={<ListaSolicitudes />} />
                            <Route path="historial" element={<AdminHistorial />} />
                            <Route path="trabajo/:id" element={<TrabajoDetalle />} />
                            <Route path="trabajo-detalle/:id" element={<AutonomoDetalleTrabajo />} />
                            <Route path="cotizacion/:id" element={<AdminCotizacion />} />
                            <Route path="reporte-tarea/:id" element={<AdminReporte />} />
                            <Route path="mi-perfil" element={<AutonomoMiPerfil />} />
                            <Route path="perfil-empresa" element={<AutonomoPerfilEmpresa />} />
                        </Route>

                        {/* FALLBACK */}
                        <Route path="*" element={<Home />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ModalProvider>
    );
}

export default App;
