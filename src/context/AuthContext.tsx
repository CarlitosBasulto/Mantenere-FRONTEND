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
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            // Normalizar rol al cargar de localStorage
            if (parsed.role) {
                parsed.role = parsed.role.toLowerCase() as UserRole;
            }
            return parsed;
        }
        return null;
    });

    React.useEffect(() => {
        // Marcamos como cargado inmediatamente ya que el localStorage es síncrono
        setLoading(false);
    }, []);

    const login = (userData: User) => {
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
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
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
