import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AdminLayout from "./layouts/AdminLayout";
import ClienteLayout from "./layouts/ClienteLayout";
import TecnicoLayout from "./layouts/TecnicoLayout";

// PUBLIC
import Home from "./pages/public/Home";
import InicioSesion from "./pages/auth/InicioSesion/InicioSesion";
import RegistroSesion from "./pages/auth/RegistroSesion/RegistroSesion";

// ADMIN VIEWS
import ListaNegocios from "./pages/admin/ListaNegocios";
import ListaTrabajadores from "./pages/admin/ListaTrabajadores";
import ListaSolicitudes from "./pages/admin/ListaSolicitudes";
import TrabajoDetalle from "./pages/Trabajos detalles/Trabajodetalles";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* PUBLIC ROUTES */}
                    <Route path="/" element={<Home />} />
                    <Route path="/inicio-sesion" element={<InicioSesion />} />
                    <Route path="/registro-sesion" element={<RegistroSesion />} />

                    {/* ADMIN ROUTES */}
                    <Route path="/menu" element={<AdminLayout />}>
                        <Route index element={<ListaNegocios />} />
                        <Route path="trabajadores" element={<ListaTrabajadores />} />
                        <Route path="solicitudes" element={<ListaSolicitudes />} />
                        <Route path="trabajo/:id" element={<TrabajoDetalle />} />
                    </Route>

                    {/* CLIENTE ROUTES (Placeholder for now, reusing Admin views or creating new ones) */}
                    {/* En el futuro se pueden crear vistas específicas en src/pages/cliente */}
                    <Route path="/cliente" element={<ClienteLayout />}>
                        <Route index element={<ListaSolicitudes />} /> {/* Ejemplo reusando vista */}
                    </Route>

                    {/* TECNICO ROUTES */}
                    <Route path="/tecnico" element={<TecnicoLayout />}>
                        <Route index element={<ListaNegocios />} /> {/* Ejemplo reusando vista */}
                    </Route>

                    {/* FALLBACK */}
                    <Route path="*" element={<Home />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
