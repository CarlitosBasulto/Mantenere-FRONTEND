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

    const login = (userData: User) => {
        // Garantizar que el rol siempre se guarde en minúsculas en todo el sistema
        const normalizedUser = { ...userData };
        if (normalizedUser.role) {
            normalizedUser.role = (normalizedUser.role as string).toLowerCase() as UserRole;
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
