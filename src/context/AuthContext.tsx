import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Tipos de roles disponibles
export type UserRole = 'admin' | 'cliente' | 'tecnico' | null;

interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Por defecto iniciamos como ADMIN para facilitar el desarrollo,
    // pero en producción iniciaría en null (sin sesión).
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
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
                userData = { name: "Pedro Javier", role: 'tecnico' };
                break;
            default:
                return;
        }
        
        setUser(normalizedUser);
        localStorage.setItem("user", JSON.stringify(normalizedUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
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
