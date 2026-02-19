import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Tipos de roles disponibles
export type UserRole = 'admin' | 'cliente' | 'tecnico' | null;

interface User {
    name: string;
    role: UserRole;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    login: (role: UserRole) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Por defecto iniciamos como ADMIN para facilitar el desarrollo,
    // pero en producción iniciaría en null (sin sesión).
    const [user, setUser] = useState<User | null>({
        name: "Administrador",
        role: "admin"
    });

    const login = (role: UserRole) => {
        // En una app real, aquí harías la petición al backend.
        // Simulamos usuarios según el rol elegido.
        let userData: User;

        switch (role) {
            case 'admin':
                userData = { name: "Juan Admin", role: 'admin' };
                break;
            case 'cliente':
                userData = { name: "Cliente Mc Donalds", role: 'cliente' };
                break;
            case 'tecnico':
                userData = { name: "Técnico Pedro", role: 'tecnico' };
                break;
            default:
                return;
        }
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth debe ser usado dentro de un AuthProvider");
    }
    return context;
};
